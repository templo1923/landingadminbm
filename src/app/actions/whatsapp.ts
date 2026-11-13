'use server';

import { createAdminClient, createClient } from '@/utils/supabase/server';
import {
    buildRecipientPhoneCandidates,
    buildTemplateBodyComponents,
    metaGraphRequest,
    resolveStoredWhatsAppToken,
    sanitizeRecipientPhone,
    type StoredWhatsAppConnection,
    type WhatsAppPhoneProfile,
    type WhatsAppTemplateSummary,
} from '@/utils/whatsapp';

interface ReviewBundle {
    connection: {
        wabaId: string;
        phoneNumberId: string;
        displayPhoneNumber?: string | null;
        verifiedName?: string | null;
        status?: string | null;
    } | null;
    phoneProfile: WhatsAppPhoneProfile | null;
    templates: WhatsAppTemplateSummary[];
    subscribedApps: Array<{
        id?: string;
        name?: string;
        link?: string;
    }>;
    recentMessageEvents: Array<{
        messageId: string;
        direction?: string | null;
        recipientPhone?: string | null;
        templateName?: string | null;
        messageText?: string | null;
        status: string;
        errorCode?: string | null;
        errorMessage?: string | null;
        updatedAt?: string | null;
    }>;
}

interface WorkspaceMessageEvent {
    messageId: string;
    direction?: string | null;
    recipientPhone?: string | null;
    templateName?: string | null;
    messageText?: string | null;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    updatedAt?: string | null;
}

interface WorkspaceBundle {
    connection: {
        wabaId: string;
        phoneNumberId: string;
        displayPhoneNumber?: string | null;
        verifiedName?: string | null;
        status?: string | null;
    } | null;
    phoneProfile: WhatsAppPhoneProfile | null;
    templates: WhatsAppTemplateSummary[];
    recentMessageEvents: WorkspaceMessageEvent[];
}

interface SendTestTemplateInput {
    recipientPhone: string;
    templateName: string;
    languageCode: string;
    bodyParameters?: string[];
}

interface SendTextMessageInput {
    recipientPhone: string;
    bodyText: string;
}

interface MessageEventStatusResult {
    ok: true;
    event: {
        messageId: string;
        status: string;
        direction?: string | null;
        recipientPhone?: string | null;
        templateName?: string | null;
        messageText?: string | null;
        errorCode?: string | null;
        errorMessage?: string | null;
        updatedAt?: string | null;
    } | null;
}

interface CreateTemplateInput {
    name: string;
    language: string;
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
    bodyText: string;
}

interface RegisterPhoneInput {
    cc: string;
    phoneNumber: string;
    cert: string;
    pin: string;
    method: 'sms' | 'voice';
}

function hasValidTemplateLanguage(language: string) {
    return /^[a-z]{2}(?:_[A-Z]{2})?$/.test(language.trim());
}

function buildTemplateBodyExample(bodyText: string) {
    const matches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)];

    if (!matches.length) {
        return undefined;
    }

    const highestIndex = matches.reduce((max, match) => {
        const value = Number(match[1]);
        return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    if (!highestIndex) {
        return undefined;
    }

    const sampleValues = Array.from({ length: highestIndex }, (_, index) => {
        const fallbackExamples = [
            'Kevin',
            '3',
            'https://suscripta.co/pay',
            'March 25',
            '$49.00',
        ];

        return fallbackExamples[index] ?? `sample_${index + 1}`;
    });

    return {
        body_text: [sampleValues],
    };
}

function hasLeadingOrTrailingTemplateVariable(bodyText: string) {
    const trimmed = bodyText.trim();
    return /^\{\{\d+\}\}/.test(trimmed) || /\{\{\d+\}\}$/.test(trimmed);
}

function hasAdjacentTemplateVariables(bodyText: string) {
    return /\}\}\s*\{\{/.test(bodyText);
}

function hasSequentialTemplateVariables(bodyText: string) {
    const indexes = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)]
        .map((match) => Number(match[1]))
        .filter((value) => Number.isFinite(value));

    if (!indexes.length) {
        return true;
    }

    const uniqueIndexes = [...new Set(indexes)].sort((left, right) => left - right);
    return uniqueIndexes.every((value, index) => value === index + 1);
}

function shouldMarkConnectionInactive(message: string) {
    const normalized = message.toLowerCase();

    return (
        normalized.includes('unsupported get request') ||
        normalized.includes('does not exist') ||
        normalized.includes('no longer exists') ||
        normalized.includes('invalid oauth access token') ||
        normalized.includes('session has expired') ||
        normalized.includes('permission error')
    );
}

function buildWhatsAppEventsSchemaErrorMessage(message: string) {
    if (message.toLowerCase().includes('message_text')) {
        return 'The Supabase table whatsapp_message_events is missing the message_text column. Run: ALTER TABLE public.whatsapp_message_events ADD COLUMN IF NOT EXISTS message_text TEXT;';
    }

    return message;
}

async function markConnectionInactive(connectionId?: string) {
    if (!connectionId) {
        return;
    }

    try {
        const supabaseAdmin = await createAdminClient();
        const { error } = await supabaseAdmin
            .from('whatsapp_connections')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', connectionId);

        if (error) {
            console.warn('[Suscripta] Could not mark WhatsApp connection as inactive:', error.message);
        }
    } catch (error) {
        console.warn('[Suscripta] Unexpected error marking WhatsApp connection inactive:', error);
    }
}

async function getStoredConnection(): Promise<StoredWhatsAppConnection | null> {
    const supabaseUser = await createClient();
    const {
        data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
        return null;
    }

    const supabaseAdmin = await createAdminClient();
    const { data } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const connection = (data as StoredWhatsAppConnection | null) ?? null;
    if (!connection) {
        return null;
    }

    return { ...connection, access_token: resolveStoredWhatsAppToken(connection) } as StoredWhatsAppConnection;
}

export async function getWhatsAppConnection() {
    const connection = await getStoredConnection();

    if (!connection) {
        return null;
    }

    return {
        waba_id: connection.waba_id,
        phone_number_id: connection.phone_number_id,
        display_phone_number: connection.display_phone_number ?? null,
        verified_name: connection.verified_name ?? null,
        is_active: connection.is_active ?? true,
    };
}

export async function getWhatsAppReviewBundle(): Promise<ReviewBundle> {
    const connection = await getStoredConnection();

    if (!connection) {
        return {
            connection: null,
            phoneProfile: null,
            templates: [],
            subscribedApps: [],
            recentMessageEvents: [],
        };
    }

    let phoneProfile: WhatsAppPhoneProfile;
    let templatesResponse: { data?: WhatsAppTemplateSummary[] };
    let subscribedAppsResponse: {
        data?: Array<{
            whatsapp_business_api_data?: {
                id?: string;
                name?: string;
                link?: string;
            };
        }>;
    };

    try {
        [phoneProfile, templatesResponse, subscribedAppsResponse] = await Promise.all([
            metaGraphRequest<WhatsAppPhoneProfile>(
                `/${connection.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,platform_type,throughput`,
                connection.access_token
            ),
            metaGraphRequest<{ data?: WhatsAppTemplateSummary[] }>(
                `/${connection.waba_id}/message_templates?fields=id,name,status,language,category,sub_category&limit=50`,
                connection.access_token
            ),
            metaGraphRequest<{
                data?: Array<{
                    whatsapp_business_api_data?: {
                        id?: string;
                        name?: string;
                        link?: string;
                    };
                }>;
            }>(
                `/${connection.waba_id}/subscribed_apps`,
                connection.access_token
            ),
        ]);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Meta validation error.';

        if (shouldMarkConnectionInactive(message)) {
            await markConnectionInactive(connection.id);

            return {
                connection: null,
                phoneProfile: null,
                templates: [],
                subscribedApps: [],
                recentMessageEvents: [],
            };
        }

        throw error;
    }

    const supabaseAdmin = await createAdminClient();
    const { data: recentMessageEventsData, error: recentMessageEventsError } = await supabaseAdmin
        .from('whatsapp_message_events')
        .select('message_id,direction,recipient_phone,template_name,message_text,status,error_code,error_message,updated_at')
        .eq('phone_number_id', connection.phone_number_id)
        .order('updated_at', { ascending: false })
        .limit(10);

    if (recentMessageEventsError) {
        throw new Error(buildWhatsAppEventsSchemaErrorMessage(recentMessageEventsError.message));
    }

    return {
        connection: {
            wabaId: connection.waba_id,
            phoneNumberId: connection.phone_number_id,
            displayPhoneNumber: connection.display_phone_number ?? phoneProfile.display_phone_number ?? null,
            verifiedName: connection.verified_name ?? phoneProfile.verified_name ?? null,
            status: connection.is_active ? 'active' : 'inactive',
        },
        phoneProfile,
        templates: (templatesResponse.data ?? []).sort((left, right) =>
            left.name.localeCompare(right.name)
        ),
        subscribedApps: (subscribedAppsResponse.data ?? [])
            .map((entry) => entry.whatsapp_business_api_data ?? {})
            .filter((entry) => entry.id || entry.name || entry.link),
        recentMessageEvents: (recentMessageEventsData ?? []).map((event) => ({
            messageId: event.message_id,
            direction: event.direction ?? null,
            recipientPhone: event.recipient_phone ?? null,
            templateName: event.template_name ?? null,
            messageText: event.message_text ?? null,
            status: event.status,
            errorCode: event.error_code ?? null,
            errorMessage: event.error_message ?? null,
            updatedAt: event.updated_at ?? null,
        })),
    };
}

export async function getWhatsAppWorkspaceBundle(
    eventLimit = 80
): Promise<WorkspaceBundle> {
    const connection = await getStoredConnection();

    if (!connection) {
        return {
            connection: null,
            phoneProfile: null,
            templates: [],
            recentMessageEvents: [],
        };
    }

    let phoneProfile: WhatsAppPhoneProfile;
    let templatesResponse: { data?: WhatsAppTemplateSummary[] };

    try {
        [phoneProfile, templatesResponse] = await Promise.all([
            metaGraphRequest<WhatsAppPhoneProfile>(
                `/${connection.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,platform_type,throughput`,
                connection.access_token
            ),
            metaGraphRequest<{ data?: WhatsAppTemplateSummary[] }>(
                `/${connection.waba_id}/message_templates?fields=id,name,status,language,category,sub_category,components&limit=100`,
                connection.access_token
            ),
        ]);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Meta validation error.';

        if (shouldMarkConnectionInactive(message)) {
            await markConnectionInactive(connection.id);

            return {
                connection: null,
                phoneProfile: null,
                templates: [],
                recentMessageEvents: [],
            };
        }

        throw error;
    }

    const supabaseAdmin = await createAdminClient();
    const { data: recentMessageEventsData, error: recentMessageEventsError } = await supabaseAdmin
        .from('whatsapp_message_events')
        .select('message_id,direction,recipient_phone,template_name,message_text,status,error_code,error_message,updated_at')
        .eq('phone_number_id', connection.phone_number_id)
        .order('updated_at', { ascending: false })
        .limit(eventLimit);

    if (recentMessageEventsError) {
        throw new Error(buildWhatsAppEventsSchemaErrorMessage(recentMessageEventsError.message));
    }

    return {
        connection: {
            wabaId: connection.waba_id,
            phoneNumberId: connection.phone_number_id,
            displayPhoneNumber: connection.display_phone_number ?? phoneProfile.display_phone_number ?? null,
            verifiedName: connection.verified_name ?? phoneProfile.verified_name ?? null,
            status: connection.is_active ? 'active' : 'inactive',
        },
        phoneProfile,
        templates: (templatesResponse.data ?? []).sort((left, right) =>
            left.name.localeCompare(right.name)
        ),
        recentMessageEvents: (recentMessageEventsData ?? []).map((event) => ({
            messageId: event.message_id,
            direction: event.direction ?? null,
            recipientPhone: event.recipient_phone ?? null,
            templateName: event.template_name ?? null,
            messageText: event.message_text ?? null,
            status: event.status,
            errorCode: event.error_code ?? null,
            errorMessage: event.error_message ?? null,
            updatedAt: event.updated_at ?? null,
        })),
    };
}

export async function getWhatsAppMessageEventStatus(messageId: string): Promise<MessageEventStatusResult> {
    const normalizedMessageId = messageId.trim();

    if (!normalizedMessageId) {
        return {
            ok: true,
            event: null,
        };
    }

    const connection = await getStoredConnection();

    if (!connection) {
        return {
            ok: true,
            event: null,
        };
    }

    const supabaseAdmin = await createAdminClient();
    const { data, error } = await supabaseAdmin
        .from('whatsapp_message_events')
        .select('message_id,status,direction,recipient_phone,template_name,message_text,error_code,error_message,updated_at')
        .eq('phone_number_id', connection.phone_number_id)
        .eq('message_id', normalizedMessageId)
        .maybeSingle();

    if (error) {
        throw new Error(buildWhatsAppEventsSchemaErrorMessage(error.message));
    }

    if (!data) {
        return {
            ok: true,
            event: null,
        };
    }

    return {
        ok: true,
        event: {
            messageId: data.message_id,
            status: data.status,
            direction: data.direction ?? null,
            recipientPhone: data.recipient_phone ?? null,
            templateName: data.template_name ?? null,
            messageText: data.message_text ?? null,
            errorCode: data.error_code ?? null,
            errorMessage: data.error_message ?? null,
            updatedAt: data.updated_at ?? null,
        },
    };
}

async function upsertMessageEvent(event: {
    wabaId?: string | null;
    phoneNumberId?: string | null;
    messageId: string;
    recipientPhone?: string | null;
    templateName?: string | null;
    direction?: string | null;
    messageText?: string | null;
    status: string;
    errorCode?: string | null;
    errorTitle?: string | null;
    errorMessage?: string | null;
    rawPayload?: unknown;
    lastEventAt?: string;
}) {
    try {
        const supabaseAdmin = await createAdminClient();
        const payload: Record<string, unknown> = {
            waba_id: event.wabaId ?? null,
            phone_number_id: event.phoneNumberId ?? null,
            message_id: event.messageId,
            status: event.status,
            last_event_at: event.lastEventAt ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (event.recipientPhone !== undefined) {
            payload.recipient_phone = event.recipientPhone;
        }

        if (event.templateName !== undefined) {
            payload.template_name = event.templateName;
        }

        if (event.direction !== undefined) {
            payload.direction = event.direction;
        }

        if (event.messageText !== undefined) {
            payload.message_text = event.messageText;
        }

        if (event.errorCode !== undefined) {
            payload.error_code = event.errorCode;
        }

        if (event.errorTitle !== undefined) {
            payload.error_title = event.errorTitle;
        }

        if (event.errorMessage !== undefined) {
            payload.error_message = event.errorMessage;
        }

        if (event.rawPayload !== undefined) {
            payload.raw_payload = event.rawPayload;
        }

        const { error } = await supabaseAdmin
            .from('whatsapp_message_events')
            .upsert(payload, { onConflict: 'message_id' });

        if (error) {
            console.warn('[Suscripta] Could not persist WhatsApp message event:', error.message);
        }
    } catch (error) {
        console.warn('[Suscripta] Unexpected error persisting WhatsApp message event:', error);
    }
}

export async function subscribeWhatsAppApp() {
    try {
        const connection = await getStoredConnection();

        if (!connection) {
            return {
                ok: false as const,
                error: 'No active WhatsApp connection found.',
            };
        }

        const result = await metaGraphRequest<{ success?: boolean }>(
            `/${connection.waba_id}/subscribed_apps`,
            connection.access_token,
            {
                method: 'POST',
            }
        );

        return {
            ok: true as const,
            success: result.success ?? true,
            message: 'Meta app subscription enabled for the connected WhatsApp Business Account.',
        };
    } catch (error) {
        return {
            ok: false as const,
            error: error instanceof Error ? error.message : 'Could not subscribe the Meta app to this WABA.',
        };
    }
}

export async function registerWhatsAppPhoneNumber(input: RegisterPhoneInput) {
    try {
        const connection = await getStoredConnection();

        if (!connection) {
            return {
                ok: false as const,
                error: 'No active WhatsApp connection found.',
            };
        }

        const cc = input.cc.replace(/\D/g, '');
        const phoneNumber = input.phoneNumber.replace(/\D/g, '');
        const pin = input.pin.replace(/\D/g, '');
        const cert = input.cert.trim();

        if (!cc) {
            return {
                ok: false as const,
                error: 'Country code is required.',
            };
        }

        if (!phoneNumber) {
            return {
                ok: false as const,
                error: 'Local phone number is required.',
            };
        }

        if (!cert) {
            return {
                ok: false as const,
                error: 'Phone certificate is required.',
            };
        }

        if (!pin || pin.length < 6) {
            return {
                ok: false as const,
                error: 'Enter the 6-digit two-step verification PIN.',
            };
        }

        await metaGraphRequest(
            `/${connection.phone_number_id}/register`,
            connection.access_token,
            {
                method: 'POST',
                body: JSON.stringify({
                    cc,
                    phone_number: phoneNumber,
                    method: input.method,
                    cert,
                    messaging_product: 'whatsapp',
                    pin,
                }),
            }
        );

        return {
            ok: true as const,
            message: 'Phone number registration request sent successfully. Refresh the connection data to verify that the status changes from Pending.',
        };
    } catch (error) {
        return {
            ok: false as const,
            error: error instanceof Error ? error.message : 'Could not register the connected phone number.',
        };
    }
}

export async function sendWhatsAppTestTemplate(input: SendTestTemplateInput) {
    try {
        const connection = await getStoredConnection();

        if (!connection) {
            return {
                ok: false as const,
                error: 'No active WhatsApp connection found.',
            };
        }

        const recipientPhone = sanitizeRecipientPhone(input.recipientPhone);
        const recipientCandidates = buildRecipientPhoneCandidates(input.recipientPhone);

        if (!recipientPhone || !recipientCandidates.length) {
            return {
                ok: false as const,
                error: 'Enter a valid recipient phone in E.164 format.',
            };
        }

        if (!input.templateName.trim()) {
            return {
                ok: false as const,
                error: 'Select an approved WhatsApp template.',
            };
        }

        if (!hasValidTemplateLanguage(input.languageCode)) {
            return {
                ok: false as const,
                error: 'Use a valid Meta language code such as en_US or es_MX.',
            };
        }

        const bodyComponents = buildTemplateBodyComponents(input.bodyParameters ?? []);

        let lastError: Error | null = null;

        for (const candidate of recipientCandidates) {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: candidate,
                type: 'template',
                template: {
                    name: input.templateName,
                    language: {
                        code: input.languageCode,
                    },
                    ...(bodyComponents ? { components: bodyComponents } : {}),
                },
            };

            try {
                const result = await metaGraphRequest<{
                    messages?: Array<{ id: string }>;
                    contacts?: Array<{ wa_id?: string; input?: string }>;
                }>(
                    `/${connection.phone_number_id}/messages`,
                    connection.access_token,
                    {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    }
                );

                const messageId = result.messages?.[0]?.id ?? null;
                const resolvedRecipient = result.contacts?.[0]?.wa_id ?? candidate;

                if (messageId) {
                    await upsertMessageEvent({
                        wabaId: connection.waba_id,
                        phoneNumberId: connection.phone_number_id,
                        messageId,
                        recipientPhone: resolvedRecipient,
                        templateName: input.templateName,
                        direction: 'outbound',
                        status: 'accepted',
                        rawPayload: payload,
                    });
                }

                return {
                    ok: true as const,
                    messageId,
                    recipientWaId: resolvedRecipient,
                    templateName: input.templateName,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Meta message send failed.');
                if (!lastError.message.includes('Account not registered')) {
                    throw lastError;
                }
            }
        }

        throw lastError ?? new Error('Meta message send failed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Meta message send failed.';
        const friendlyMessage = message.includes('Account not registered')
            ? 'The recipient number could not be resolved by Meta, even after trying the supported phone formats for this country. Verify that the destination is a real WhatsApp account, that it can receive WhatsApp messages, and that your current sender environment is allowed to message it.'
            : message;

        return {
            ok: false as const,
            error: friendlyMessage,
        };
    }
}

export async function sendWhatsAppTextMessage(input: SendTextMessageInput) {
    try {
        const connection = await getStoredConnection();

        if (!connection) {
            return {
                ok: false as const,
                error: 'No active WhatsApp connection found.',
            };
        }

        const recipientPhone = sanitizeRecipientPhone(input.recipientPhone);
        const recipientCandidates = buildRecipientPhoneCandidates(input.recipientPhone);
        const bodyText = input.bodyText.trim();

        if (!recipientPhone || !recipientCandidates.length) {
            return {
                ok: false as const,
                error: 'Enter a valid recipient phone in E.164 format.',
            };
        }

        if (!bodyText) {
            return {
                ok: false as const,
                error: 'Write a message before sending.',
            };
        }

        let lastError: Error | null = null;

        for (const candidate of recipientCandidates) {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: candidate,
                type: 'text',
                text: {
                    body: bodyText,
                    preview_url: false,
                },
            };

            try {
                const result = await metaGraphRequest<{
                    messages?: Array<{ id: string }>;
                    contacts?: Array<{ wa_id?: string; input?: string }>;
                }>(
                    `/${connection.phone_number_id}/messages`,
                    connection.access_token,
                    {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    }
                );

                const messageId = result.messages?.[0]?.id ?? null;
                const resolvedRecipient = result.contacts?.[0]?.wa_id ?? candidate;

                if (messageId) {
                    await upsertMessageEvent({
                        wabaId: connection.waba_id,
                        phoneNumberId: connection.phone_number_id,
                        messageId,
                        recipientPhone: resolvedRecipient,
                        direction: 'outbound',
                        messageText: bodyText,
                        status: 'accepted',
                        rawPayload: payload,
                    });
                }

                return {
                    ok: true as const,
                    messageId,
                    recipientWaId: resolvedRecipient,
                    bodyText,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Meta text message send failed.');
                if (!lastError.message.includes('Account not registered')) {
                    throw lastError;
                }
            }
        }

        throw lastError ?? new Error('Meta text message send failed.');
    } catch (error) {
        return {
            ok: false as const,
            error: error instanceof Error ? error.message : 'Meta text message send failed.',
        };
    }
}

export async function createWhatsAppTemplate(input: CreateTemplateInput) {
    try {
        const connection = await getStoredConnection();

        if (!connection) {
            return {
                ok: false as const,
                error: 'No active WhatsApp connection found.',
            };
        }

        const normalizedName = input.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        if (!normalizedName) {
            return {
                ok: false as const,
                error: 'Enter a valid template name using letters, numbers, or underscores.',
            };
        }

        if (!hasValidTemplateLanguage(input.language)) {
            return {
                ok: false as const,
                error: 'Use a valid Meta language code such as en_US or es_MX.',
            };
        }

        if (!input.bodyText.trim()) {
            return {
                ok: false as const,
                error: 'Template body text is required.',
            };
        }

        if (hasLeadingOrTrailingTemplateVariable(input.bodyText)) {
            return {
                ok: false as const,
                error: 'Template variables cannot appear at the very start or end of the message body. Add regular text before the first variable and after the last one.',
            };
        }

        if (hasAdjacentTemplateVariables(input.bodyText)) {
            return {
                ok: false as const,
                error: 'Template variables cannot be adjacent. Add normal text or punctuation between placeholders.',
            };
        }

        if (!hasSequentialTemplateVariables(input.bodyText)) {
            return {
                ok: false as const,
                error: 'Template variables must be sequential and start at {{1}}.',
            };
        }

        const bodyExample = buildTemplateBodyExample(input.bodyText.trim());

        const result = await metaGraphRequest<{
            id?: string;
            status?: string;
            category?: string;
        }>(
            `/${connection.waba_id}/message_templates`,
            connection.access_token,
            {
                method: 'POST',
                body: JSON.stringify({
                    name: normalizedName,
                    language: input.language,
                    category: input.category,
                    allow_category_change: true,
                    components: [
                        {
                            type: 'BODY',
                            text: input.bodyText.trim(),
                            ...(bodyExample ? { example: bodyExample } : {}),
                        },
                    ],
                }),
            }
        );

        return {
            ok: true as const,
            id: result.id ?? null,
            status: result.status ?? 'PENDING',
            category: result.category ?? input.category,
            name: normalizedName,
            language: input.language,
        };
    } catch (error) {
        return {
            ok: false as const,
            error: error instanceof Error ? error.message : 'Template creation failed.',
        };
    }
}

export async function disconnectWhatsApp() {
    const supabaseUser = await createClient();
    const {
        data: { user },
    } = await supabaseUser.auth.getUser();

    const supabaseAdmin = await createAdminClient();

    if (user) {
        await supabaseAdmin
            .from('whatsapp_connections')
            .delete()
            .eq('user_id', user.id);
    } else {
        await supabaseAdmin
            .from('whatsapp_connections')
            .delete()
            .is('user_id', null);
    }

    return { success: true };
}
