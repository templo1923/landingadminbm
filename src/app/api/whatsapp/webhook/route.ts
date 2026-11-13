import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

interface WebhookStatusError { code?: number | string; title?: string; message?: string }
interface WebhookStatus { id?: string; recipient_id?: string; status?: string; timestamp?: string; errors?: WebhookStatusError[] }
interface WebhookMessage { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string } }
interface WebhookChangeValue {
    metadata?: { display_phone_number?: string; phone_number_id?: string };
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
}
interface WebhookChange { field?: string; value?: WebhookChangeValue }
interface WhatsAppWebhookPayload { entry?: Array<{ id?: string; changes?: WebhookChange[] }> }

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    if (
        searchParams.get('hub.mode') === 'subscribe' &&
        searchParams.get('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
        searchParams.get('hub.challenge')
    ) {
        return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
    }
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 403 });
}

function isValidMetaSignature(rawBody: Buffer, signature: string, appSecret: string) {
    if (!signature.startsWith('sha256=')) return false;
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    const providedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
    try {
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appSecret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 500 });
        const rawBody = Buffer.from(await request.arrayBuffer());
        if (!isValidMetaSignature(rawBody, request.headers.get('x-hub-signature-256') ?? '', appSecret)) {
            return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody.toString('utf8')) as WhatsAppWebhookPayload;
        const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
        const events = changes
            .filter((change) => change.field === 'messages')
            .flatMap((change) => {
                const value = change.value ?? {};
                const metadata = value.metadata ?? {};
                const statusEvents = (value.statuses ?? []).map((status) => {
                    const firstError = status.errors?.[0] ?? null;
                    return {
                        waba_id: null,
                        phone_number_id: metadata.phone_number_id ?? null,
                        message_id: status.id,
                        recipient_phone: status.recipient_id ?? null,
                        direction: 'outbound',
                        status: status.status ?? 'unknown',
                        error_code: firstError?.code ? String(firstError.code) : null,
                        error_title: firstError?.title ?? null,
                        error_message: firstError?.message ?? null,
                        raw_payload: status,
                        last_event_at: status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                });
                const inboundEvents = (value.messages ?? []).map((message) => ({
                    waba_id: null,
                    phone_number_id: metadata.phone_number_id ?? null,
                    message_id: message.id,
                    recipient_phone: message.from ?? null,
                    direction: 'inbound',
                    message_text: message.type === 'text' ? message.text?.body ?? null : null,
                    status: 'received',
                    raw_payload: message,
                    last_event_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }));
                return [...statusEvents, ...inboundEvents];
            })
            .filter((event): event is typeof event & { message_id: string; phone_number_id: string } => Boolean(event.message_id && event.phone_number_id));

        if (events.length) {
            const supabaseAdmin = await createAdminClient();
            const { data: connection } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('user_id')
                .eq('phone_number_id', events[0].phone_number_id)
                .eq('is_active', true)
                .maybeSingle();
            const { error } = await supabaseAdmin
                .from('whatsapp_message_events')
                .upsert(events.map((event) => ({ ...event, user_id: connection?.user_id ?? null })), { onConflict: 'message_id' });
            if (error) console.error('[Suscripta] Could not persist WhatsApp webhook events:', error.message);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[Suscripta] WhatsApp webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
}
