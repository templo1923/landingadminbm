'use client';

import { useEffect, useMemo, useState } from 'react';
import { getWhatsAppMessageEventStatus, sendWhatsAppTestTemplate } from '@/app/actions/whatsapp';

type ApprovedTemplate = {
    id: string;
    name: string;
    language: string;
    category?: string;
    bodyText: string;
};

type RecentRecipient = {
    phone: string;
    label: string;
};

interface CampaignComposerProps {
    connectedNumber?: string | null;
    approvedTemplates: ApprovedTemplate[];
    recentRecipients: RecentRecipient[];
}

const FINAL_MESSAGE_STATUSES = new Set(['delivered', 'read', 'failed']);

function formatMessageStatusLabel(status: string) {
    const normalized = status.trim().toLowerCase();

    if (!normalized) {
        return 'unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractTemplateVariableCount(bodyText: string) {
    const matches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));

    if (!matches.length) {
        return 0;
    }

    return Math.max(...matches);
}

export function CampaignComposer({
    connectedNumber,
    approvedTemplates,
    recentRecipients,
}: CampaignComposerProps) {
    const initialTemplate = approvedTemplates[0];
    const initialRecipient = recentRecipients[0]?.phone ?? '';
    const [templateName, setTemplateName] = useState(initialTemplate?.name ?? '');
    const [languageCode, setLanguageCode] = useState(initialTemplate?.language ?? 'en_US');
    const [recipientPhone, setRecipientPhone] = useState(initialRecipient);
    const [bodyParameters, setBodyParameters] = useState('Kevin\n3\nhttps://suscripta.co/pay');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

    const selectedTemplate = useMemo(
        () => approvedTemplates.find((template) => template.name === templateName) ?? approvedTemplates[0] ?? null,
        [approvedTemplates, templateName]
    );

    const expectedVariableCount = selectedTemplate
        ? extractTemplateVariableCount(selectedTemplate.bodyText)
        : 0;

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
                        setResult(null);
                    } else {
                        setResult(
                            `Estado final: ${formatMessageStatusLabel(response.event.status)} para ${response.event.recipientPhone ?? 'el destinatario'}. Message ID: ${response.event.messageId}.`
                        );
                        setError(null);
                    }

                    setPendingMessageId(null);
                }
            } catch (pollError) {
                if (!isCancelled) {
                    setError(pollError instanceof Error ? pollError.message : 'No se pudo consultar el estado final del mensaje.');
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
                    setResult((currentMessage) =>
                        currentMessage
                            ? `${currentMessage} El estado final sigue pendiente.`
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
    }, [pendingMessageId]);

    async function handleSend() {
        setIsSending(true);
        setError(null);
        setResult(null);

        try {
            const response = await sendWhatsAppTestTemplate({
                recipientPhone,
                templateName,
                languageCode,
                bodyParameters: bodyParameters.split('\n').map((value) => value.trim()).filter(Boolean),
            });

            if (!response.ok) {
                setError(response.error);
                return;
            }

            setResult(
                `Meta acepto el mensaje para ${response.recipientWaId}. Esperando estado final de entrega... Message ID: ${response.messageId ?? 'unavailable'}.`
            );

            if (response.messageId) {
                setPendingMessageId(response.messageId);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el recordatorio.');
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="card rounded-xl border p-6">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Enviar recordatorio</h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Dispara tu plantilla aprobada directamente desde el dashboard.
                        </p>
                    </div>
                    <div className="card rounded-xl border px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Número emisor</p>
                        <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                            {connectedNumber ?? 'No conectado'}
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Plantilla aprobada</label>
                        <select
                            value={templateName}
                            onChange={(event) => {
                                const nextTemplate = approvedTemplates.find(
                                    (template) => template.name === event.target.value
                                );
                                setTemplateName(event.target.value);
                                setLanguageCode(nextTemplate?.language ?? 'en_US');
                            }}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                        >
                            {approvedTemplates.map((template) => (
                                <option key={template.id} value={template.name}>
                                    {template.name} ({template.language})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Destinatario</label>
                            <input
                                value={recipientPhone}
                                onChange={(event) => setRecipientPhone(event.target.value)}
                                placeholder="+5214621349768"
                                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Idioma</label>
                            <input
                                value={languageCode}
                                onChange={(event) => setLanguageCode(event.target.value)}
                                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                            />
                        </div>
                    </div>

                    {recentRecipients.length ? (
                        <div className="flex flex-wrap gap-2">
                            {recentRecipients.map((recipient) => (
                                <button
                                    key={recipient.phone}
                                    type="button"
                                    onClick={() => setRecipientPhone(recipient.phone)}
                                    className="rounded-full border border-[var(--card-border)] bg-[var(--badge-bg)] px-3 py-1.5 text-xs text-[var(--badge-text)] transition hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                                >
                                    {recipient.label}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Parámetros del cuerpo</label>
                        <textarea
                            value={bodyParameters}
                            onChange={(event) => setBodyParameters(event.target.value)}
                            rows={5}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                        />
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Una variable por línea. La plantilla actual espera {expectedVariableCount} variable(s).
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={isSending || !selectedTemplate}
                        onClick={() => {
                            void handleSend();
                        }}
                        className="w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSending ? 'Enviando por Meta...' : 'Enviar recordatorio ahora'}
                    </button>
                </div>

                {result ? (
                    <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-600 dark:text-sky-300">
                        {result}
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                        {error}
                    </div>
                ) : null}
            </section>

            <aside className="space-y-6">
                <section className="card rounded-xl border p-6">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Vista previa</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Así se verá la plantilla que estás por disparar.
                    </p>

                    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                        <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            {selectedTemplate?.language ?? 'en_US'} · {selectedTemplate?.category ?? 'UTILITY'}
                        </p>
                        <h4 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                            {selectedTemplate?.name ?? 'Sin plantilla'}
                        </h4>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {selectedTemplate?.bodyText ?? 'Selecciona una plantilla aprobada para ver la vista previa.'}
                        </p>
                    </div>
                </section>

                <section className="card rounded-xl border p-6">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Flujo de envío</h3>
                    <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                            1. Selecciona la plantilla aprobada.
                        </div>
                        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                            2. Elige el número de destino.
                        </div>
                        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                            3. Envía y revisa el estado en Conversaciones.
                        </div>
                    </div>
                </section>
            </aside>
        </div>
    );
}
