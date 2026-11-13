import crypto from 'node:crypto';

const GRAPH_API_VERSION = process.env.META_GRAPH_VERSION ?? 'v27.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface StoredWhatsAppConnection {
    id?: string;
    user_id?: string | null;
    waba_id: string;
    phone_number_id: string;
    display_phone_number?: string | null;
    verified_name?: string | null;
    access_token: string;
    access_token_encrypted?: string | null;
    is_active?: boolean | null;
    created_at?: string;
    updated_at?: string;
}

export interface WhatsAppPhoneProfile {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
    name_status?: string;
    platform_type?: string;
    throughput?: { level?: string };
}

export interface WhatsAppTemplateSummary {
    id: string;
    name: string;
    status: string;
    language: string;
    category?: string;
    sub_category?: string;
    components?: Array<{ type?: string; text?: string; format?: string }>;
}

interface MetaGraphError {
    error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

function getTokenEncryptionKey() {
    const encoded = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encoded) throw new Error('TOKEN_ENCRYPTION_KEY is not configured.');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
    return key;
}

export function encryptWhatsAppToken(token: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
}

export function decryptWhatsAppToken(value: string) {
    const [ivValue, tagValue, ciphertextValue] = value.split('.');
    if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted WhatsApp token.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getTokenEncryptionKey(), Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}

export function resolveStoredWhatsAppToken(connection: StoredWhatsAppConnection) {
    if (connection.access_token_encrypted) return decryptWhatsAppToken(connection.access_token_encrypted);
    if (connection.access_token) return connection.access_token;
    throw new Error('WhatsApp connection has no access token. Reconnect the number.');
}

export function sanitizeRecipientPhone(input: string) {
    return input.replace(/\D/g, '');
}

export function buildRecipientPhoneCandidates(input: string) {
    const sanitized = sanitizeRecipientPhone(input);
    if (!sanitized) return [];
    const candidates = new Set<string>([sanitized]);
    if (sanitized.startsWith('521') && sanitized.length === 13) candidates.add(`52${sanitized.slice(3)}`);
    if (sanitized.startsWith('52') && !sanitized.startsWith('521') && sanitized.length === 12) candidates.add(`521${sanitized.slice(2)}`);
    return [...candidates];
}

export function buildTemplateBodyComponents(rawValues: string[]) {
    const parameters = rawValues.map((value) => value.trim()).filter(Boolean).map((text) => ({ type: 'text' as const, text }));
    if (!parameters.length) return undefined;
    return [{ type: 'body', parameters }];
}

export async function metaGraphRequest<T>(pathWithQuery: string, accessToken: string, init?: RequestInit): Promise<T> {
    const normalizedPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
    const response = await fetch(`${GRAPH_API_BASE_URL}${normalizedPath}`, {
        ...init,
        cache: 'no-store',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    const data = (await response.json()) as T & MetaGraphError;
    if (!response.ok || data.error) throw new Error(data.error?.message ?? `Meta Graph API request failed with status ${response.status}.`);
    return data;
}
