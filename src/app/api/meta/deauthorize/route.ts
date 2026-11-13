import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { purgeUserWhatsAppData, findSupabaseUserIdByMetaUserId } from "@/utils/data-deletion";
import { createClient } from "@/utils/supabase/server";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSignature, payload] = signedRequest.split(".", 2);

  if (!encodedSignature || !payload) {
    throw new Error("Invalid signed_request format");
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest();

  const providedSignature = decodeBase64Url(encodedSignature);

  if (
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignature)
  ) {
    throw new Error("Invalid signed_request signature");
  }

  const parsedPayload = JSON.parse(decodeBase64Url(payload).toString("utf-8")) as {
    user_id?: string;
    algorithm?: string;
    issued_at?: number;
  };

  return parsedPayload;
}

async function resolveCurrentSupabaseUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function extractSignedRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (request.method === "GET") {
    return request.nextUrl.searchParams.get("signed_request");
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    const value = formData.get("signed_request");
    return typeof value === "string" ? value : null;
  }

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    return typeof body?.signed_request === "string" ? body.signed_request : null;
  }

  const bodyText = await request.text().catch(() => "");

  if (!bodyText) {
    return null;
  }

  const searchParams = new URLSearchParams(bodyText);
  return searchParams.get("signed_request");
}

async function handleDeauthorize(request: NextRequest) {
  const currentUserId = await resolveCurrentSupabaseUserId();
  const signedRequest = await extractSignedRequest(request);
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  let metaUserId: string | null = null;

  if (signedRequest && appSecret) {
    try {
      const payload = parseSignedRequest(signedRequest, appSecret);
      metaUserId = payload.user_id ?? null;
    } catch (error) {
      console.warn("[Suscripta] Could not validate Meta signed_request:", error);
    }
  }

  const mappedUserId =
    currentUserId ?? (metaUserId ? await findSupabaseUserIdByMetaUserId(metaUserId) : null);

  if (!mappedUserId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "No linked user was found for this deauthorization callback. If you are testing this manually, sign in first and try again.",
        meta_user_id: metaUserId,
      },
      { status: 202 }
    );
  }

  const result = await purgeUserWhatsAppData(mappedUserId);

  return NextResponse.json({
    success: true,
    confirmation_code: crypto.randomUUID(),
    meta_user_id: metaUserId,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleDeauthorize(request);
  } catch (error) {
    console.error("[Suscripta] Deauthorize GET failed:", error);
    return NextResponse.json({ error: "Failed to process deauthorization callback." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDeauthorize(request);
  } catch (error) {
    console.error("[Suscripta] Deauthorize POST failed:", error);
    return NextResponse.json({ error: "Failed to process deauthorization callback." }, { status: 500 });
  }
}
