import { createAdminClient } from "@/utils/supabase/server";

export interface UserDataDeletionResult {
  userId: string;
  deletedConnectionCount: number;
  deletedMessageEventCount: number;
}

export async function purgeUserWhatsAppData(userId: string): Promise<UserDataDeletionResult> {
  const supabaseAdmin = await createAdminClient();

  const { data: connections, error: connectionsError } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("id, waba_id, phone_number_id")
    .eq("user_id", userId);

  if (connectionsError) {
    throw new Error(`Could not load user WhatsApp connections: ${connectionsError.message}`);
  }

  const phoneNumberIds = (connections ?? [])
    .map((connection) => connection.phone_number_id)
    .filter(Boolean);

  let deletedMessageEventCount = 0;

  if (phoneNumberIds.length > 0) {
    const { data: messageEvents, error: messageEventsLookupError } = await supabaseAdmin
      .from("whatsapp_message_events")
      .select("id")
      .in("phone_number_id", phoneNumberIds);

    if (messageEventsLookupError) {
      throw new Error(
        `Could not load user WhatsApp message events: ${messageEventsLookupError.message}`
      );
    }

    deletedMessageEventCount = messageEvents?.length ?? 0;

    const { error: deleteMessageEventsError } = await supabaseAdmin
      .from("whatsapp_message_events")
      .delete()
      .in("phone_number_id", phoneNumberIds);

    if (deleteMessageEventsError) {
      throw new Error(
        `Could not delete WhatsApp message events: ${deleteMessageEventsError.message}`
      );
    }
  }

  const deletedConnectionCount = connections?.length ?? 0;

  const { error: deleteConnectionsError } = await supabaseAdmin
    .from("whatsapp_connections")
    .delete()
    .eq("user_id", userId);

  if (deleteConnectionsError) {
    throw new Error(`Could not delete WhatsApp connections: ${deleteConnectionsError.message}`);
  }

  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMetadata = authUser.user?.user_metadata ?? {};

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMetadata,
        meta_user_id: null,
        meta_deauthorized_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("[Suscripta] Could not update auth metadata after data deletion:", error);
  }

  return {
    userId,
    deletedConnectionCount,
    deletedMessageEventCount,
  };
}

export async function findSupabaseUserIdByMetaUserId(metaUserId: string) {
  const supabaseAdmin = await createAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Could not search users by Meta ID: ${error.message}`);
    }

    const matchedUser = data.users.find(
      (user) => user.user_metadata?.meta_user_id === metaUserId
    );

    if (matchedUser) {
      return matchedUser.id;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}
