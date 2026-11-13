'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        FB: {
            init: (options: object) => void;
            login: (callback: (response: FBLoginResponse) => void, options: object) => void;
        };
        fbAsyncInit: () => void;
    }
}

interface FBLoginResponse {
    authResponse?: {
        code?: string;
    };
    status: string;
}

interface EmbeddedSignupData {
    data?: {
        waba_id?: string;
        phone_number_id?: string;
    };
    type?: string;
}

interface PendingSignupState {
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
}

export interface EmbeddedSignupDebugState {
    sdkLoaded: boolean;
    launchStarted: boolean;
    authCodeReceived: boolean;
    wabaIdReceived: boolean;
    phoneNumberIdReceived: boolean;
    exchangeRequested: boolean;
    exchangeCompleted: boolean;
    lastError: string | null;
    codePreview: string | null;
    wabaId: string | null;
    phoneNumberId: string | null;
    lastBackendStatus: number | null;
    lastBackendMessage: string | null;
    backendRedirectUriUsed: string | null;
    backendAppIdUsed: string | null;
    frontendRedirectUriUsed: string | null;
    frontendConfigIdUsed: string | null;
    frontendAppIdUsed: string | null;
}

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const FACEBOOK_CONFIG_ID = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID;
const EMBEDDED_SIGNUP_SESSION_KEY = 'suscripta_embedded_signup';

interface EmbeddedSignupButtonProps {
    onSuccess?: (wabaId: string, phoneNumberId: string) => void;
    onError?: (error: string) => void;
    onDebugChange?: (debug: EmbeddedSignupDebugState) => void;
}

const INITIAL_DEBUG_STATE: EmbeddedSignupDebugState = {
    sdkLoaded: false,
    launchStarted: false,
    authCodeReceived: false,
    wabaIdReceived: false,
    phoneNumberIdReceived: false,
    exchangeRequested: false,
    exchangeCompleted: false,
    lastError: null,
    codePreview: null,
    wabaId: null,
    phoneNumberId: null,
    lastBackendStatus: null,
    lastBackendMessage: null,
    backendRedirectUriUsed: null,
    backendAppIdUsed: null,
    frontendRedirectUriUsed: null,
    frontendConfigIdUsed: FACEBOOK_CONFIG_ID ?? null,
    frontendAppIdUsed: FACEBOOK_APP_ID ?? null,
};

export function EmbeddedSignupButton({ onSuccess, onError, onDebugChange }: EmbeddedSignupButtonProps) {
    const [sdkLoaded, setSdkLoaded] = useState(() => typeof window !== 'undefined' && !!window.FB);
    const [isLoading, setIsLoading] = useState(false);
    const [, setDebugState] = useState<EmbeddedSignupDebugState>({
        ...INITIAL_DEBUG_STATE,
        sdkLoaded: typeof window !== 'undefined' && !!window.FB,
    });

    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onDebugChangeRef = useRef(onDebugChange);
    const pendingSignupRef = useRef<PendingSignupState>({});
    const exchangeInFlightRef = useRef(false);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        onDebugChangeRef.current = onDebugChange;
    }, [onDebugChange]);

    const updateDebugState = useCallback((patch: Partial<EmbeddedSignupDebugState>) => {
        setDebugState((current) => {
            const next = { ...current, ...patch };
            onDebugChangeRef.current?.(next);
            return next;
        });
    }, []);

    const exchangeCodeForConnection = useCallback(async (payload: Required<PendingSignupState>) => {
        if (exchangeInFlightRef.current) {
            return;
        }

        exchangeInFlightRef.current = true;
        updateDebugState({
            exchangeRequested: true,
            lastError: null,
            lastBackendStatus: null,
            lastBackendMessage: null,
        });

        try {
            const response = await fetch('/api/whatsapp/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: payload.code,
                    waba_id: payload.wabaId,
                    phone_number_id: payload.phoneNumberId,
                }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                updateDebugState({
                    lastBackendStatus: response.status,
                    lastBackendMessage: result.error ?? 'Unknown Meta token exchange error.',
                    backendRedirectUriUsed: result.debug?.redirect_uri_used ?? null,
                    backendAppIdUsed: result.debug?.app_id_used ?? null,
                });
                throw new Error(result.error ?? 'Unknown Meta token exchange error.');
            }

            sessionStorage.setItem(
                EMBEDDED_SIGNUP_SESSION_KEY,
                JSON.stringify({
                    ...payload,
                    exchangedAt: new Date().toISOString(),
                })
            );

            updateDebugState({
                exchangeCompleted: true,
                lastBackendStatus: response.status,
                lastBackendMessage: result.message ?? 'Connection saved successfully.',
                backendRedirectUriUsed: result.debug?.redirect_uri_used ?? null,
                backendAppIdUsed: result.debug?.app_id_used ?? null,
            });

            onSuccessRef.current?.(payload.wabaId, payload.phoneNumberId);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'The business number was linked in Meta, but Suscripta could not save the connection.';

            updateDebugState({
                lastError: message,
            });
            onErrorRef.current?.(message);
        } finally {
            exchangeInFlightRef.current = false;
            setIsLoading(false);
        }
    }, [updateDebugState]);

    const flushPendingSignup = useCallback(() => {
        const { code, wabaId, phoneNumberId } = pendingSignupRef.current;

        if (!code || !wabaId || !phoneNumberId) {
            return;
        }

        void exchangeCodeForConnection({
            code,
            wabaId,
            phoneNumberId,
        });
    }, [exchangeCodeForConnection]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.facebook.com') {
                return;
            }

            try {
                const data: EmbeddedSignupData = JSON.parse(event.data);

                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    const wabaId = data.data?.waba_id ?? '';
                    const phoneNumberId = data.data?.phone_number_id ?? '';

                    if (wabaId && phoneNumberId) {
                        pendingSignupRef.current = {
                            ...pendingSignupRef.current,
                            wabaId,
                            phoneNumberId,
                        };

                        updateDebugState({
                            wabaIdReceived: true,
                            phoneNumberIdReceived: true,
                            wabaId,
                            phoneNumberId,
                        });

                        sessionStorage.setItem(
                            EMBEDDED_SIGNUP_SESSION_KEY,
                            JSON.stringify({
                                ...pendingSignupRef.current,
                                capturedAt: new Date().toISOString(),
                            })
                        );

                        flushPendingSignup();
                    }
                }
            } catch {
                // Ignore non-JSON messages coming from the popup.
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [flushPendingSignup, updateDebugState]);

    useEffect(() => {
        if (!FACEBOOK_APP_ID) {
            const message = 'NEXT_PUBLIC_FACEBOOK_APP_ID is not configured. Embedded Signup will not work.';
            console.warn(`[Suscripta] ${message}`);
            updateDebugState({ lastError: message });
            return;
        }

        if (!FACEBOOK_CONFIG_ID) {
            const message = 'NEXT_PUBLIC_FACEBOOK_CONFIG_ID is not configured. Embedded Signup will not work.';
            console.warn(`[Suscripta] ${message}`);
            updateDebugState({ lastError: message });
            return;
        }

        if (window.FB) {
            updateDebugState({ sdkLoaded: true });
            return;
        }

        if (document.getElementById('facebook-jssdk')) {
            const interval = setInterval(() => {
                if (window.FB) {
                    setSdkLoaded(true);
                    updateDebugState({ sdkLoaded: true });
                    clearInterval(interval);
                }
            }, 100);

            return () => clearInterval(interval);
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FACEBOOK_APP_ID,
                autoLogAppEvents: true,
                xfbml: true,
                version: process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? 'v27.0',
            });
            setSdkLoaded(true);
            updateDebugState({ sdkLoaded: true });
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            const message = 'Could not load the Facebook SDK. Check your network connection and try again.';
            updateDebugState({ lastError: message });
            onErrorRef.current?.(message);
        };
        document.body.appendChild(script);
    }, [updateDebugState]);

    const launchEmbeddedSignup = useCallback(() => {
        if (!FACEBOOK_APP_ID) {
            const message = 'Missing configuration: NEXT_PUBLIC_FACEBOOK_APP_ID is not defined.';
            updateDebugState({ lastError: message });
            onErrorRef.current?.(message);
            return;
        }

        if (!FACEBOOK_CONFIG_ID) {
            const message = 'Missing configuration: NEXT_PUBLIC_FACEBOOK_CONFIG_ID is not defined.';
            updateDebugState({ lastError: message });
            onErrorRef.current?.(message);
            return;
        }

        if (!sdkLoaded || !window.FB) {
            const message = 'The Facebook SDK is still loading. Wait a moment and try again.';
            updateDebugState({ lastError: message });
            onErrorRef.current?.(message);
            return;
        }

        pendingSignupRef.current = {};
        updateDebugState({
            ...INITIAL_DEBUG_STATE,
            sdkLoaded: true,
            launchStarted: true,
            frontendRedirectUriUsed: null,
            frontendConfigIdUsed: FACEBOOK_CONFIG_ID ?? null,
            frontendAppIdUsed: FACEBOOK_APP_ID ?? null,
        });
        setIsLoading(true);

        window.FB.login(
            (response: FBLoginResponse) => {
                if (response.authResponse?.code) {
                    pendingSignupRef.current = {
                        ...pendingSignupRef.current,
                        code: response.authResponse.code,
                    };

                    updateDebugState({
                        authCodeReceived: true,
                        codePreview: `${response.authResponse.code.substring(0, 24)}...`,
                    });

                    sessionStorage.setItem(
                        EMBEDDED_SIGNUP_SESSION_KEY,
                        JSON.stringify({
                            ...pendingSignupRef.current,
                            updatedAt: new Date().toISOString(),
                        })
                    );

                    flushPendingSignup();
                } else {
                    setIsLoading(false);

                    const message =
                        response.status === 'unknown' || !response.authResponse
                            ? 'The Meta authorization flow was cancelled.'
                            : 'The business number could not be linked. Verify access in Meta Business Manager.';

                    updateDebugState({ lastError: message });
                    onErrorRef.current?.(message);
                }
            },
            {
                config_id: FACEBOOK_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                },
            }
        );
    }, [flushPendingSignup, sdkLoaded, updateDebugState]);

    const notConfigured = !FACEBOOK_APP_ID || !FACEBOOK_CONFIG_ID;

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                onClick={launchEmbeddedSignup}
                disabled={isLoading || (!sdkLoaded && !notConfigured)}
                className={`flex items-center gap-3 rounded-full px-8 py-4 text-lg font-semibold transition-all
          ${notConfigured
                        ? 'cursor-not-allowed bg-zinc-700 text-zinc-400'
                        : isLoading || !sdkLoaded
                            ? 'cursor-wait bg-emerald-700 text-black/60'
                            : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-1 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                    }`}
            >
                {isLoading ? (
                    <>
                        <svg className="h-5 w-5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving connection...
                    </>
                ) : !sdkLoaded && !notConfigured ? (
                    <>
                        <svg className="h-5 w-5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading SDK...
                    </>
                ) : (
                    <>
                        <svg className="h-6 w-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        Connect with Meta
                    </>
                )}
            </button>

            {notConfigured && (
                <div className="max-w-sm rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-400">
                    Configure <code className="font-mono">NEXT_PUBLIC_FACEBOOK_APP_ID</code> and <code className="font-mono">NEXT_PUBLIC_FACEBOOK_CONFIG_ID</code> in Vercel before using Embedded Signup.
                </div>
            )}
        </div>
    );
}
