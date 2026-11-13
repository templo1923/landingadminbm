import { getWhatsAppWorkspaceBundle } from '@/app/actions/whatsapp';

function getTemplateBody(template: {
    components?: Array<{
        type?: string;
        text?: string;
    }>;
}) {
    return (
        template.components?.find((component) => component.type === 'BODY')?.text ??
        'Template body unavailable.'
    );
}

function templateTone(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === 'approved') {
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    }

    if (normalized.includes('reject')) {
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    }

    return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

export default async function TemplatesPage() {
    const workspace = await getWhatsAppWorkspaceBundle(20);
    const approvedTemplates = workspace.templates.filter(
        (template) => template.status.toUpperCase() === 'APPROVED'
    );
    const pendingTemplates = workspace.templates.filter(
        (template) => template.status.toUpperCase() !== 'APPROVED'
    );

    return (
        <div className="mx-auto w-full max-w-7xl px-8 py-8">
            <div className="mb-8 flex items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Plantillas</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                        Catálogo visual de las plantillas aprobadas en tu WABA, sincronizadas desde Meta.
                    </p>
                </div>

                <div className="grid min-w-[280px] grid-cols-2 gap-3">
                    <div className="card rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Aprobadas</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{approvedTemplates.length}</p>
                    </div>
                    <div className="card rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">En revisión</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{pendingTemplates.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="card rounded-xl border p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Plantillas activas</h2>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                Todas las plantillas sincronizadas desde tu WABA.
                            </p>
                        </div>
                        <div className="rounded-full border border-[var(--card-border)] px-3 py-1 text-xs text-[var(--text-muted)]">
                            {workspace.templates.length} total
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {workspace.templates.length ? (
                            workspace.templates.map((template) => (
                                <article
                                    key={template.id}
                                    className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]"
                                >
                                    <div className="flex items-center justify-between border-b border-[var(--divider)] px-5 py-4">
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-primary)]">{template.name}</h3>
                                            <p className="mt-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                                {template.language} · {template.category ?? 'UTILITY'}
                                            </p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase ${templateTone(template.status)}`}>
                                            {template.status}
                                        </span>
                                    </div>

                                    <div className="px-5 py-5">
                                        <div className="rounded-lg border border-[var(--divider)] bg-[var(--card-hover)] p-4 font-mono text-sm leading-6 text-[var(--text-secondary)]">
                                            {getTemplateBody(template)}
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-[var(--card-border)] bg-[var(--badge-bg)] px-3 py-1 text-xs text-[var(--badge-text)]">
                                                {template.sub_category ?? 'General reminder'}
                                            </span>
                                            {template.components?.some((component) => component.text?.includes('{{')) ? (
                                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-600 dark:text-sky-300">
                                                    Variables dinámicas
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card-hover)] px-6 py-10 text-sm text-[var(--text-muted)] md:col-span-2">
                                Aún no hay plantillas sincronizadas. Crea al menos una desde tu WABA para poblar esta vista.
                            </div>
                        )}
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className="card rounded-xl border p-6">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Plantilla destacada</h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                            La primera aprobada, lista para enviar recordatorios.
                        </p>

                        {approvedTemplates[0] ? (
                            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                                <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                    Lista para enviar
                                </p>
                                <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                                    {approvedTemplates[0].name}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                    {getTemplateBody(approvedTemplates[0])}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-hover)] p-5 text-sm text-[var(--text-muted)]">
                                En cuanto una plantilla quede APPROVED, aparecerá aquí.
                            </div>
                        )}
                    </section>

                    <section className="card rounded-xl border p-6">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Flujo de envío</h2>
                        <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                                1. Selecciona la plantilla aprobada desde la sección Envíos.
                            </div>
                            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                                2. Elige el destinatario e ingresa las variables requeridas.
                            </div>
                            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] px-4 py-3">
                                3. Envía y revisa el estado en la sección Conversaciones.
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}
