'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { EmbeddedSignupButton } from '@/components/EmbeddedSignupButton';
import {
    createWhatsAppTemplate,
    getWhatsAppMessageEventStatus,
    getWhatsAppReviewBundle,
    sendWhatsAppTestTemplate,
} from '@/app/actions/whatsapp';

interface ReviewConnection {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    status?: string | null;
}

interface ReviewPhoneProfile {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
    name_status?: string;
    platform_type?: string;
    throughput?: {
        level?: string;
    };
}

interface ReviewTemplate {
    id: string;
    name: string;
    status: string;
    language: string;
    category?: string;
    sub_category?: string;
}

interface ReviewBundle {
    connection: ReviewConnection | null;
    phoneProfile: ReviewPhoneProfile | null;
    templates: ReviewTemplate[];
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

const EMPTY_REVIEW_BUNDLE: ReviewBundle = {
    connection: null,
    phoneProfile: null,
    templates: [],
    subscribedApps: [],
    recentMessageEvents: [],
};

const FINAL_MESSAGE_STATUSES = new Set(['delivered', 'read', 'failed']);

function formatMessageStatusLabel(status: string) {
    const normalized = status.trim().toLowerCase();

    if (!normalized) {
        return 'unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function AppReviewConsole() {
    const [bundle, setBundle] = useState<ReviewBundle>(EMPTY_REVIEW_BUNDLE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<string | null>(null);
    const [templateResult, setTemplateResult] = useState<string | null>(null);
    const [recipientPhone, setRecipientPhone] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [languageCode, setLanguageCode] = useState('');
    const [bodyParameters, setBodyParameters] = useState('Kevin\n3\nhttps://suscripta.co/pay');
    const [newTemplateName, setNewTemplateName] = useState('payment_reminder_review');
    const [newTemplateLanguage, setNewTemplateLanguage] = useState('en_US');
    const [newTemplateCategory, setNewTemplateCategory] = useState<'UTILITY' | 'MARKETING' | 'AUTHENTICATION'>('UTILITY');
    const [newTemplateBody, setNewTemplateBody] = useState('Hello {{1}}, this is a payment reminder from Suscripta. Your subscription renews in {{2}} days. Please complete payment here: {{3}} today.');
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const approvedTemplates = useMemo(
        () => bundle.templates.filter((template) => template.status.toUpperCase() === 'APPROVED'),
        [bundle.templates]
    );

    const refreshBundle = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const reviewBundle = await getWhatsAppReviewBundle();
            setBundle(reviewBundle);

            if (reviewBundle.templates.length && !templateName) {
                const firstApproved = reviewBundle.templates.find(
                    (template) => template.status.toUpperCase() === 'APPROVED'
                ) ?? reviewBundle.templates[0];

                setTemplateName(firstApproved.name);
                setLanguageCode(firstApproved.language);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load WhatsApp review data.');
        } finally {
            setIsLoading(false);
        }
    }, [templateName]);

    useEffect(() => {
        void refreshBundle();
    }, [refreshBundle]);

    useEffect(() => {
        if (!pendingMessageId) {
            return;
        }

        let isCancelled = false;
        let attempts = 0;

        const pollMessageStatus = async () => {
            try {
                const response = await getWhatsAppMessageEventStatus(pendingMessageId);

                if (isCancelled || !response.event) {
                    return;
                }

                const latestStatus = response.event.status.toLowerCase();

                if (FINAL_MESSAGE_STATUSES.has(latestStatus)) {
                    if (latestStatus === 'failed') {
                        setError(
                            `Meta accepted the request first, but the final delivery failed${response.event.errorCode ? ` (${response.event.errorCode})` : ''}${response.event.errorMessage ? `: ${response.event.errorMessage}` : '.'}`
                        );
                        setSendResult(null);
                    } else {
                        setSendResult(
                            `Template delivery ${formatMessageStatusLabel(response.event.status)} for ${response.event.recipientPhone ?? 'the recipient'}. Meta message ID: ${response.event.messageId}.`
                        );
                        setError(null);
                    }

                    setPendingMessageId(null);
                    startTransition(() => {
                        void refreshBundle();
                    });
                }
            } catch (pollError) {
                if (!isCancelled) {
                    setError(pollError instanceof Error ? pollError.message : 'Could not refresh the final WhatsApp message status.');
                    setPendingMessageId(null);
                }
            }
        };

        const intervalId = window.setInterval(() => {
            attempts += 1;

            if (attempts > 10) {
                window.clearInterval(intervalId);
                if (!isCancelled) {
                    setPendingMessageId(null);
                    setSendResult((currentMessage) =>
                        currentMessage
                            ? `${currentMessage} The final delivery status is still pending.`
                            : currentMessage
                    );
                }
                return;
            }

            void pollMessageStatus();
        }, 3000);

        void pollMessageStatus();

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
        };
    }, [pendingMessageId, refreshBundle]);

    const handleTemplateChange = (nextTemplateName: string) => {
        setTemplateName(nextTemplateName);

        const selectedTemplate = bundle.templates.find((template) => template.name === nextTemplateName);
        if (selectedTemplate) {
            setLanguageCode(selectedTemplate.language);
        }
    };

    const handleCreateTemplate = async () => {
        setIsCreatingTemplate(true);
        setError(null);
        setTemplateResult(null);

        try {
            const result = await createWhatsAppTemplate({
                name: newTemplateName,
                language: newTemplateLanguage,
                category: newTemplateCategory,
                bodyText: newTemplateBody,
            });

            if (!result.ok) {
                setError(result.error);
                return;
            }

            setTemplateResult(
                `Template ${result.name} submitted to Meta with status ${result.status}. Refresh the template list until it becomes APPROVED.`
            );

            await refreshBundle();
            setTemplateName(result.name);
            setLanguageCode(result.language);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Template creation failed.');
        } finally {
            setIsCreatingTemplate(false);
        }
    };

    const handleSendTestMessage = async () => {
        setIsSending(true);
        setError(null);
        setSendResult(null);

        try {
            const result = await sendWhatsAppTestTemplate({
                recipientPhone,
                templateName,
                languageCode,
                bodyParameters: bodyParameters.split('\n'),
            });

            if (!result.ok) {
                setError(result.error);
                return;
            }

            setSendResult(
                `Template ${result.templateName} was accepted by Meta for ${result.recipientWaId}. Waiting for the final delivery status... Meta message ID: ${result.messageId ?? 'unavailable'}.`
            );

            if (result.messageId) {
                setPendingMessageId(result.messageId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Meta message send failed.');
        } finally {
            setIsSending(false);
        }
    };

    const handleEmbeddedSignupSuccess = () => {
        startTransition(() => {
            void refreshBundle();
        });
    };

    return (
        <div className="p-10 max-w-6xl mx-auto w-full">
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
                    Meta App Review Mode
                </div>
                <h1 className="mt-4 text-4xl font-bold tracking-tight">WhatsApp App Review Console</h1>
                <p className="mt-3 max-w-3xl text-zinc-400">
                    This page is designed for Meta review recordings. It shows the full onboarding flow,
                    reads business assets with <code className="font-mono">whatsapp_business_management</code>,
                    and sends a live reminder template with <code className="font-mono">whatsapp_business_messaging</code>.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="glass-panel rounded-2xl p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">1. Connect a business number</h2>
                            <p className="mt-2 text-sm text-zinc-400">
                                Start here during the screencast. The reviewer should see the Meta login, permission grant,
                                business selection, and phone number linking flow end to end.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                startTransition(() => {
                                    void refreshBundle();
                                });
                            }}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:border-white/20 hover:bg-white/5"
                        >
                            Refresh data
                        </button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
                        <EmbeddedSignupButton
                            onSuccess={handleEmbeddedSignupSuccess}
                            onError={setError}
                        />
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Permission coverage</p>
                            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                                <li><strong>Management:</strong> read connected phone number details and approved templates from Meta.</li>
                                <li><strong>Messaging:</strong> send a real reminder template from the connected phone number.</li>
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Recording note</p>
                            <p className="mt-4 text-sm text-zinc-300">
                                Keep the UI in English while recording, narrate each button,
                                and show the final WhatsApp delivery on the recipient device.
                            </p>
                        </div>
                    </div>

                </section>

                <section className="glass-panel rounded-2xl p-7">
                    <h2 className="text-xl font-semibold">Current connection</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        This section proves the number was linked and the app can read WhatsApp assets from Meta.
                    </p>

                    {isLoading ? (
                        <div className="mt-8 flex flex-col items-center justify-center py-10 text-zinc-400">
                            <svg className="mb-4 h-10 w-10 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading connection data...
                        </div>
                    ) : bundle.connection ? (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                                <p className="text-2xl font-semibold text-white">
                                    {bundle.connection.displayPhoneNumber ?? bundle.phoneProfile?.display_phone_number ?? 'Connected number'}
                                </p>
                                <p className="mt-1 text-sm text-emerald-300">
                                    {bundle.connection.verifiedName ?? bundle.phoneProfile?.verified_name ?? 'Verified business profile'}
                                </p>
                            </div>
                            <div className="grid gap-3 text-sm text-zinc-300">
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <span>Status</span>
                                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase text-emerald-300">
                                        {bundle.connection.status ?? 'active'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <span>Quality rating</span>
                                    <span>{bundle.phoneProfile?.quality_rating ?? 'Unavailable'}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <span>Verification status</span>
                                    <span>{bundle.phoneProfile?.code_verification_status ?? 'Unavailable'}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <span>Throughput level</span>
                                    <span>{bundle.phoneProfile?.throughput?.level ?? 'Unavailable'}</span>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400">
                            No business phone is connected yet. Run the Embedded Signup flow first.
                        </div>
                    )}
                </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                <section className="glass-panel rounded-2xl p-7">
                    <h2 className="text-xl font-semibold">2. Create a reminder template</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        Use this when the connected WABA has no approved template yet. Creating the template submits it to Meta for review.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Template name</label>
                            <input
                                value={newTemplateName}
                                onChange={(event) => setNewTemplateName(event.target.value)}
                                placeholder="payment_reminder_review"
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            />
                            <p className="mt-2 text-xs text-zinc-500">
                                Meta expects lowercase names with underscores. Example: <code className="font-mono">payment_reminder_review_v2</code>.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-zinc-200">Language</label>
                                <input
                                    value={newTemplateLanguage}
                                    onChange={(event) => setNewTemplateLanguage(event.target.value)}
                                    placeholder="en_US"
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-zinc-200">Category</label>
                                <select
                                    value={newTemplateCategory}
                                    onChange={(event) => setNewTemplateCategory(event.target.value as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION')}
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                                >
                                    <option value="UTILITY">UTILITY</option>
                                    <option value="MARKETING">MARKETING</option>
                                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Template body</label>
                            <textarea
                                value={newTemplateBody}
                                onChange={(event) => setNewTemplateBody(event.target.value)}
                                rows={5}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            />
                            <p className="mt-2 text-xs text-zinc-500">
                                Meta-safe rules: use sequential variables like <code className="font-mono">{'{{1}}'}</code>, avoid placing a variable at the very start or end, and do not place variables directly next to each other.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={isCreatingTemplate || !bundle.connection}
                            onClick={() => {
                                void handleCreateTemplate();
                            }}
                            className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-500"
                        >
                            {isCreatingTemplate ? 'Submitting template to Meta...' : 'Create template'}
                        </button>
                    </div>

                    {templateResult && (
                        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                            {templateResult}
                        </div>
                    )}
                </section>

                <section className="glass-panel rounded-2xl p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">3. Read template status</h2>
                            <p className="mt-2 text-sm text-zinc-400">
                                This demonstrates <code className="font-mono">whatsapp_business_management</code> by loading real WhatsApp templates associated with the connected WABA.
                            </p>
                        </div>
                        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                            {bundle.templates.length} templates
                        </div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/40 text-xs uppercase text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Template</th>
                                    <th className="px-4 py-3">Language</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-black/20">
                                {bundle.templates.length ? (
                                    bundle.templates.map((template) => (
                                        <tr key={template.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">{template.name}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {template.category ?? 'UNCATEGORIZED'}
                                                    {template.sub_category ? ` / ${template.sub_category}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300">{template.language}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">
                                                    {template.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="px-4 py-6 text-zinc-400" colSpan={3}>
                                            No templates found yet. Create and approve at least one reminder template in WhatsApp Manager before resubmitting.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="glass-panel rounded-2xl p-7">
                    <h2 className="text-xl font-semibold">4. Send a live reminder</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        This demonstrates <code className="font-mono">whatsapp_business_messaging</code> by sending an approved template to a recipient phone directly from Suscripta.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Recipient phone</label>
                            <input
                                value={recipientPhone}
                                onChange={(event) => setRecipientPhone(event.target.value)}
                                placeholder="+5215512345678"
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            />
                            <p className="mt-2 text-xs text-zinc-500">
                                Use a real WhatsApp recipient in E.164 format. Meta will reject numbers that are not registered on WhatsApp.
                            </p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Approved template</label>
                            <select
                                value={templateName}
                                onChange={(event) => handleTemplateChange(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            >
                                <option value="">Select a template</option>
                                {approvedTemplates.map((template) => (
                                    <option key={template.id} value={template.name}>
                                        {template.name} ({template.language})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Language code</label>
                            <input
                                value={languageCode}
                                onChange={(event) => setLanguageCode(event.target.value)}
                                placeholder="es_MX"
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-200">Body parameters</label>
                            <textarea
                                value={bodyParameters}
                                onChange={(event) => setBodyParameters(event.target.value)}
                                rows={4}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/50"
                            />
                            <p className="mt-2 text-xs text-zinc-500">
                                One variable per line. Leave empty if the template has no variables.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={isSending || !bundle.connection}
                            onClick={() => {
                                void handleSendTestMessage();
                            }}
                            className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-black/50"
                        >
                            {isSending ? 'Sending via Meta...' : 'Send test reminder'}
                        </button>
                    </div>

                    {sendResult && (
                        <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                            {sendResult}
                        </div>
                    )}
                </section>

            </div>

            {error && (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                    {error}
                </div>
            )}
        </div>
    );
}
