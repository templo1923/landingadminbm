'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWhatsAppWorkspaceBundle, sendWhatsAppTextMessage } from '@/app/actions/whatsapp';

type ConversationEvent = {
    messageId: string;
    direction?: string | null;
    recipientPhone?: string | null;
    templateName?: string | null;
    messageText?: string | null;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    updatedAt?: string | null;
};

type WorkspaceBundle = {
    connection: {
        displayPhoneNumber?: string | null;
    } | null;
    recentMessageEvents: ConversationEvent[];
};

type ConversationThread = {
    id: string;
    title: string;
    phone: string;
    source: 'live' | 'demo';
    lastMessage: string;
    lastStatus: string;
    lastUpdatedAt?: string | null;
    events: ConversationEvent[];
};

const EMPTY_WORKSPACE: WorkspaceBundle = {
    connection: null,
    recentMessageEvents: [],
};

function formatRelativeDate(value?: string | null) {
    if (!value) {
        return 'Ahora';
    }

    const date = new Date(value);
    const deltaMs = Date.now() - date.getTime();
    const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

    if (deltaMinutes < 60) {
        return `Hace ${deltaMinutes} min`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) {
        return `Hace ${deltaHours} h`;
    }

    return date.toLocaleDateString();
}

function formatEventTime(value?: string | null) {
    if (!value) {
        return 'Ahora';
    }

    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildLiveThreads(events: ConversationEvent[]): ConversationThread[] {
    const grouped = new Map<string, ConversationEvent[]>();

    for (const event of events) {
        const phone = event.recipientPhone?.trim();

        if (!phone) {
            continue;
        }

        const current = grouped.get(phone) ?? [];
        current.push(event);
        grouped.set(phone, current);
    }

    return [...grouped.entries()]
        .map(([phone, threadEvents]) => {
            const sortedEvents = [...threadEvents].sort((left, right) => {
                return new Date(left.updatedAt ?? 0).getTime() - new Date(right.updatedAt ?? 0).getTime();
            });
            const latestEvent = sortedEvents[sortedEvents.length - 1];
            const numericPhone = phone.replace(/\D/g, '');

            return {
                id: phone,
                title: numericPhone.length >= 4 ? `Cliente ${numericPhone.slice(-4)}` : 'Cliente real',
                phone,
                source: 'live' as const,
                lastMessage:
                    latestEvent.messageText ??
                    latestEvent.templateName ??
                    'Evento sincronizado desde WhatsApp',
                lastStatus: latestEvent.status,
                lastUpdatedAt: latestEvent.updatedAt,
                events: sortedEvents,
            };
        })
        .sort((left, right) => {
            return new Date(right.lastUpdatedAt ?? 0).getTime() - new Date(left.lastUpdatedAt ?? 0).getTime();
        });
}

function buildDemoThreads(): ConversationThread[] {
    return [
        {
            id: 'demo-1',
            title: 'Fitness Norte',
            phone: '+52 55 1234 5678',
            source: 'demo',
            lastMessage: 'Recordatorio listo para enviarse manana a las 09:00.',
            lastStatus: 'draft',
            lastUpdatedAt: new Date().toISOString(),
            events: [
                {
                    messageId: 'demo-1-a',
                    direction: 'outbound',
                    templateName: 'payment_reminder_review',
                    status: 'draft',
                    updatedAt: new Date().toISOString(),
                },
            ],
        },
        {
            id: 'demo-2',
            title: 'Academia Nova',
            phone: '+52 81 4422 1100',
            source: 'demo',
            lastMessage: 'Campana de renovacion programada para 12 clientes.',
            lastStatus: 'scheduled',
            lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            events: [
                {
                    messageId: 'demo-2-a',
                    direction: 'outbound',
                    templateName: 'payment_reminder_review',
                    status: 'scheduled',
                    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                },
            ],
        },
    ];
}

function statusTone(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === 'read' || normalized === 'delivered') {
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }

    if (normalized === 'failed') {
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    }

    if (normalized === 'received' || normalized === 'accepted') {
        return 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20';
    }

    return 'text-[var(--badge-text)] bg-[var(--badge-bg)] border-[var(--card-border)]';
}

export default function ConversationsPage() {
    const [workspace, setWorkspace] = useState<WorkspaceBundle>(EMPTY_WORKSPACE);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSendingText, setIsSendingText] = useState(false);
    const [draftText, setDraftText] = useState('Hola, te escribo desde Suscripta para continuar la conversacion abierta.');
    const [error, setError] = useState<string | null>(null);

    const refreshWorkspace = useCallback(async (background = false) => {
        if (background) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const nextWorkspace = await getWhatsAppWorkspaceBundle(120);
            setWorkspace({
                connection: nextWorkspace.connection
                    ? { displayPhoneNumber: nextWorkspace.connection.displayPhoneNumber }
                    : null,
                recentMessageEvents: nextWorkspace.recentMessageEvents,
            });
            setError(null);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar la bandeja.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void refreshWorkspace(false);
    }, [refreshWorkspace]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            void refreshWorkspace(true);
        }, 8000);

        return () => window.clearInterval(interval);
    }, [refreshWorkspace]);

    const liveThreads = useMemo(
        () => buildLiveThreads(workspace.recentMessageEvents),
        [workspace.recentMessageEvents]
    );

    const threads = useMemo(
        () => [...liveThreads, ...buildDemoThreads()].slice(0, 8),
        [liveThreads]
    );

    useEffect(() => {
        if (!threads.length) {
            setSelectedThreadId(null);
            return;
        }

        if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
            setSelectedThreadId(threads[0].id);
        }
    }, [selectedThreadId, threads]);

    const activeThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;

    return (
        <div className="mx-auto flex h-full min-h-full w-full max-w-7xl flex-col px-8 py-8 dashboard-page">
            <div className="mb-8 flex items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Conversaciones</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                        Mensajes entrantes y salientes guardados en Supabase, actualizados automáticamente.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="grid min-w-[260px] grid-cols-2 gap-3">
                        <div className="card rounded-xl border p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Hilos activos</p>
                            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{liveThreads.length}</p>
                        </div>
                        <div className="card rounded-xl border p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Número conectado</p>
                            <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
                                {workspace.connection?.displayPhoneNumber ?? 'No conectado'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void refreshWorkspace(true);
                        }}
                        className="rounded-full border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--card-hover)]"
                    >
                        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                    {error}
                </div>
            ) : null}

            <div className="grid min-h-[720px] flex-1 grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <section className="card flex min-h-0 flex-col overflow-hidden rounded-xl border">
                    <div className="border-b border-[var(--divider)] px-5 py-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            Los eventos reales aparecen primero. Se actualiza automáticamente cada 8 segundos.
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="divide-y divide-[var(--divider)]">
                            {isLoading && !threads.length ? (
                                <div className="px-5 py-8 text-sm text-[var(--text-muted)]">Cargando conversaciones...</div>
                            ) : (
                                threads.map((thread) => (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => setSelectedThreadId(thread.id)}
                                        className={`block w-full px-5 py-4 text-left transition ${
                                            activeThread?.id === thread.id
                                                ? 'bg-emerald-500/8 dark:bg-emerald-500/8'
                                                : 'hover:bg-[var(--card-hover)]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-[var(--text-primary)]">{thread.title}</p>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                                            thread.source === 'live'
                                                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                : 'border-[var(--card-border)] bg-[var(--badge-bg)] text-[var(--badge-text)]'
                                                        }`}
                                                    >
                                                        {thread.source === 'live' ? 'real' : 'demo'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-[var(--text-muted)]">{thread.phone}</p>
                                            </div>

                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatRelativeDate(thread.lastUpdatedAt)}
                                            </span>
                                        </div>

                                        <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{thread.lastMessage}</p>
                                        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(thread.lastStatus)}`}>
                                            {thread.lastStatus}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <section className="card flex min-h-0 flex-col overflow-hidden rounded-xl border">
                    {activeThread ? (
                        <>
                            <div className="flex items-center justify-between border-b border-[var(--divider)] px-6 py-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-base font-semibold text-[var(--text-primary)]">{activeThread.title}</h2>
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${
                                                activeThread.source === 'live'
                                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'border-[var(--card-border)] bg-[var(--badge-bg)] text-[var(--badge-text)]'
                                            }`}
                                        >
                                            {activeThread.source === 'live' ? 'Evento real' : 'Demo'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">{activeThread.phone}</p>
                                </div>

                                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3 text-right">
                                    <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Último estado</p>
                                    <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{activeThread.lastStatus}</p>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                                <div className="space-y-4">
                                    {activeThread.events.map((event) => {
                                        const isInbound = event.direction === 'inbound';
                                        const bubbleClass = isInbound
                                            ? 'mr-auto border-[var(--card-border)] bg-[var(--card-hover)]'
                                            : 'ml-auto border-emerald-500/20 bg-emerald-500/5';

                                        return (
                                            <div key={event.messageId} className={`max-w-[78%] rounded-xl border px-4 py-3 ${bubbleClass}`}>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                                        {isInbound ? 'Entrante' : 'Saliente'}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {formatEventTime(event.updatedAt)}
                                                    </span>
                                                </div>

                                                <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                                    {event.messageText ?? event.templateName ?? 'Actividad sincronizada desde WhatsApp'}
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                                    <span className={`rounded-full border px-2.5 py-1 ${statusTone(event.status)}`}>
                                                        {event.status}
                                                    </span>
                                                    {event.errorMessage ? (
                                                        <span className="text-red-500">
                                                            {event.errorCode ? `${event.errorCode}: ` : ''}
                                                            {event.errorMessage}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {activeThread.source === 'live' ? (
                                <div className="border-t border-[var(--divider)] px-6 py-4">
                                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-hover)] p-4">
                                        <div className="mb-3 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">Responder en la ventana abierta</p>
                                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                    Envía texto libre al número activo (ventana de 24h).
                                                </p>
                                            </div>
                                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                                24h window
                                            </span>
                                        </div>

                                        <textarea
                                            value={draftText}
                                            onChange={(event) => setDraftText(event.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                                            placeholder="Escribe un mensaje libre para este chat..."
                                        />

                                        <div className="mt-3 flex items-center justify-between gap-4">
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Destinatario: {activeThread.phone}
                                            </p>
                                            <button
                                                type="button"
                                                disabled={isSendingText || !draftText.trim()}
                                                onClick={async () => {
                                                    setIsSendingText(true);
                                                    try {
                                                        const result = await sendWhatsAppTextMessage({
                                                            recipientPhone: activeThread.phone,
                                                            bodyText: draftText,
                                                        });

                                                        if (!result.ok) {
                                                            setError(result.error);
                                                            return;
                                                        }

                                                        setDraftText('');
                                                        setError(null);
                                                        await refreshWorkspace(true);
                                                    } catch (sendError) {
                                                        setError(
                                                            sendError instanceof Error
                                                                ? sendError.message
                                                                : 'No se pudo enviar el mensaje libre.'
                                                        );
                                                    } finally {
                                                        setIsSendingText(false);
                                                    }
                                                }}
                                                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-black/50"
                                            >
                                                {isSendingText ? 'Enviando...' : 'Enviar mensaje'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center px-10 text-center">
                            <div>
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Aún no hay conversaciones</h2>
                                <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
                                    Conecta un número, envía o recibe un mensaje y esta vista empezará a reflejar la
                                    actividad en tiempo real desde los webhooks de WhatsApp.
                                </p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
