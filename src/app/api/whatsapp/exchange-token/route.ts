import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { encryptWhatsAppToken } from '@/utils/whatsapp';

/**
 * POST /api/whatsapp/exchange-token
 *
 * Exchanges the short-lived `code` received from Meta's Embedded Signup
 * for a long-lived customer-scoped WhatsApp System User Token.
 *
 * Meta Graph API endpoint:
 *   POST https://graph.facebook.com/{META_GRAPH_VERSION}/oauth/access_token
 *   Params: client_id, client_secret, code
 *
 * For the popup-based Embedded Signup flow we intentionally do not send
 * redirect_uri in the token exchange. Meta issues the verification code from
 * the JS SDK popup without a frontend redirect target, and sending one here
 * causes a verification-code mismatch.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, waba_id, phone_number_id } = body;

        if (!code) {
            return NextResponse.json({ error: 'Missing required parameter: code' }, { status: 400 });
        }

        if (!waba_id || !phone_number_id) {
            return NextResponse.json(
                {
                    error: 'Missing required WhatsApp asset identifiers. Repeat the Embedded Signup flow so Meta returns the WABA ID and Phone Number ID.',
                },
                { status: 400 }
            );
        }

        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appId || !appSecret) {
            console.error('[Suscripta] Missing env vars:', { appId: !!appId, appSecret: !!appSecret });
            return NextResponse.json(
                { error: 'Server configuration error: missing environment variables.' },
                { status: 500 }
            );
        }

        // Exchange the temporary code for a long-lived access token
        const graphVersion = process.env.META_GRAPH_VERSION ?? 'v27.0';
        const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', appId);
        tokenUrl.searchParams.set('client_secret', appSecret);
        tokenUrl.searchParams.set('code', code);

        const tokenResponse = await fetch(tokenUrl.toString(), { method: 'GET' });
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('[Suscripta] Token exchange failed:', {
                ...tokenData.error,
                redirect_uri_used: null,
                app_id_used: appId,
                code_preview: String(code).substring(0, 24) + '...',
            });
            return NextResponse.json(
                {
                    error: `Meta token exchange failed: ${tokenData.error.message}`,
                    debug: {
                        redirect_uri_used: null,
                        app_id_used: appId,
                    },
                },
                { status: 400 }
            );
        }

        const { access_token, token_type } = tokenData;

        // 3) Additional Step: Fetch the actual phone number string and business name from Meta
        let display_phone_number = null;
        let verified_name = null;
        let meta_user_id: string | null = null;

        try {
            const phoneInfoRes = await fetch(`https://graph.facebook.com/${graphVersion}/${phone_number_id}?access_token=${access_token}`);
            const phoneInfoData = await phoneInfoRes.json();

            if (phoneInfoData && !phoneInfoData.error) {
                display_phone_number = phoneInfoData.display_phone_number;
                verified_name = phoneInfoData.verified_name || null;
            } else {
                console.warn('[Suscripta] Could not fetch phone details:', phoneInfoData.error);
            }
        } catch (phoneErr) {
            console.warn('[Suscripta] Error reaching Graph API for phone details:', phoneErr);
        }

        try {
            const metaUserRes = await fetch(`https://graph.facebook.com/${graphVersion}/me?fields=id&access_token=${access_token}`);
            const metaUserData = await metaUserRes.json();

            if (metaUserData && !metaUserData.error && typeof metaUserData.id === 'string') {
                meta_user_id = metaUserData.id;
            }
        } catch (metaUserErr) {
            console.warn('[Suscripta] Error reaching Graph API for Meta user details:', metaUserErr);
        }

        // Store access_token, waba_id, phone_number_id in Supabase
        const supabaseAdmin = await createAdminClient();
        const supabaseUser = await createClient();

        // Every connection must belong to the authenticated App user.
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'You must be signed in before connecting WhatsApp.' }, { status: 401 });
        }
        const userId = user.id;

        if (userId && meta_user_id) {
            try {
                const authUserResponse = await supabaseAdmin.auth.admin.getUserById(userId);
                const existingMetadata = authUserResponse.data.user?.user_metadata ?? {};

                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        ...existingMetadata,
                        meta_user_id,
                    },
                });
            } catch (metadataErr) {
                console.warn('[Suscripta] Could not persist Meta user ID in auth metadata:', metadataErr);
            }
        }

        // Store only the encrypted token. The service-role client is server-only.
        const { error: dbError } = await supabaseAdmin.from('whatsapp_connections').upsert({
            user_id: userId,
            waba_id: waba_id,
            phone_number_id: phone_number_id,
            display_phone_number: display_phone_number,
            verified_name: verified_name,
            access_token: null,
            access_token_encrypted: encryptWhatsAppToken(access_token),
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'waba_id, phone_number_id'
        });

        if (dbError) {
            console.error('[Suscripta] Database storage failed:', dbError);
            return NextResponse.json(
                { error: `No se pudo guardar la conexión en la base de datos: ${dbError.message || JSON.stringify(dbError)}` },
                { status: 500 }
            );
        }

        console.log('[Suscripta] WhatsApp connection successful and saved to Supabase:', {
            waba_id,
            phone_number_id,
            token_type,
            user_linked: true,
            redirect_uri_used: null,
        });

        return NextResponse.json({
            success: true,
            waba_id,
            phone_number_id,
            token_type,
            debug: {
                redirect_uri_used: null,
                app_id_used: appId,
            },
            // Never return the raw access_token to the client in production!
            // Return only metadata.
            message: 'WhatsApp Business Account connected successfully.',
        });

    } catch (error) {
        console.error('[Suscripta] Unexpected error in token exchange:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
