import { getWhatsAppWorkspaceBundle } from '@/app/actions/whatsapp';
import { CampaignComposer } from '@/components/dashboard/CampaignComposer';

export default async function CampaignsPage() {
    const workspace = await getWhatsAppWorkspaceBundle(40);
    const approvedTemplates = workspace.templates
        .filter((template) => template.status.toUpperCase() === 'APPROVED')
        .map((template) => ({
            id: template.id,
            name: template.name,
            language: template.language,
            category: template.category,
            bodyText:
                template.components?.find((component) => component.type === 'BODY')?.text ??
                'Template body unavailable.',
        }));

    const recentRecipients = [...new Set(
        workspace.recentMessageEvents
            .map((event) => event.recipientPhone?.trim())
            .filter((phone): phone is string => Boolean(phone))
    )]
        .slice(0, 4)
        .map((phone, index) => ({
            phone,
            label: index === 0 ? `Ultimo destinatario · ${phone}` : phone,
        }));

    return (
        <div className="mx-auto w-full max-w-7xl px-8 py-8">
            <div className="mb-8 flex items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Envíos</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                        Dispara recordatorios usando tus plantillas aprobadas y el número conectado en Meta.
                    </p>
                </div>

                <div className="grid min-w-[300px] grid-cols-2 gap-3">
                    <div className="card rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Plantillas listas</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{approvedTemplates.length}</p>
                    </div>
                    <div className="card rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Número conectado</p>
                        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
                            {workspace.connection?.displayPhoneNumber ?? 'No conectado'}
                        </p>
                    </div>
                </div>
            </div>

            {workspace.connection && approvedTemplates.length ? (
                <CampaignComposer
                    connectedNumber={workspace.connection.displayPhoneNumber}
                    approvedTemplates={approvedTemplates}
                    recentRecipients={recentRecipients}
                />
            ) : (
                <div className="card rounded-xl border border-dashed px-8 py-12 text-center">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Aún no está listo para enviar</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                        Para usar esta pantalla necesitas un número conectado y al menos una plantilla APPROVED en tu
                        WABA. Cuando ambas cosas existan, aquí podrás disparar el recordatorio desde el dashboard.
                    </p>
                </div>
            )}
        </div>
    );
}
