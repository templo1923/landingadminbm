import Link from 'next/link';
import { getWhatsAppWorkspaceBundle } from '@/app/actions/whatsapp';
import { createClient } from '@/utils/supabase/server';

function countEventsByStatus(events: Array<{ status: string }>) {
  return events.reduce(
    (acc, event) => {
      const s = event.status.toLowerCase();
      if (s === 'accepted' || s === 'sent') acc.sent += 1;
      if (s === 'delivered' || s === 'read') acc.delivered += 1;
      return acc;
    },
    { sent: 0, delivered: 0 }
  );
}

const DoubleCheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" />
  </svg>
);
const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const AlertIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const UserIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

function getStatusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === 'read' || s === 'delivered') return <DoubleCheckIcon className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === 'accepted' || s === 'sent') return <CheckIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
  if (s === 'failed' || s === 'error') return <AlertIcon className="w-3.5 h-3.5 text-red-500" />;
  return <ClockIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
}

const STATUS_LABEL: Record<string, string> = {
  delivered: 'Entregado',
  read:      'Leído',
  sent:      'Enviado',
  accepted:  'Aceptado',
  failed:    'Fallido',
  error:     'Error',
};

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || 'Hola';

  const workspace = await getWhatsAppWorkspaceBundle(60);
  const approvedTemplates = workspace.templates.filter(
    t => t.status.toUpperCase() === 'APPROVED'
  );
  const liveContacts = new Set(
    workspace.recentMessageEvents
      .map(e => e.recipientPhone?.trim())
      .filter((p): p is string => Boolean(p))
  );
  const metrics = countEventsByStatus(workspace.recentMessageEvents);

  const stats = [
    {
      label: 'Número conectado',
      value: workspace.connection?.displayPhoneNumber ?? '—',
      sub: workspace.connection?.verifiedName ?? 'Sin conexión',
      accent: !!workspace.connection,
    },
    {
      label: 'Plantillas aprobadas',
      value: String(approvedTemplates.length),
      sub: approvedTemplates.length === 1 ? 'Lista para usar' : 'Listas para usar',
      accent: false,
    },
    {
      label: 'Contactos activos',
      value: String(liveContacts.size),
      sub: 'Detectados en eventos',
      accent: false,
    },
    {
      label: 'Entregas confirmadas',
      value: String(metrics.delivered),
      sub: `${metrics.sent} enviados recientemente`,
      accent: false,
    },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            Buenos días, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Aquí tienes el resumen de tu cuenta WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/campaigns"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            Enviar recordatorio
          </Link>
          <Link
            href="/dashboard/conversations"
            className="px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)] text-sm font-medium transition-colors"
          >
            Ver actividad
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className={`card rounded-xl border p-5 ${stat.accent ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}
          >
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              {stat.label}
            </p>
            <p className={`mt-3 text-2xl font-semibold tracking-tight ${stat.accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Activity ── */}
      <div className="grid xl:grid-cols-[1fr_380px] gap-6">

        {/* Recent events */}
        <div className="card rounded-xl border">
          <div className="flex items-center justify-between px-5 py-4 border-b divider">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Actividad reciente</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Últimos eventos de mensajes capturados</p>
            </div>
            <Link
              href="/dashboard/conversations"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Ver todo
            </Link>
          </div>

          <div className="divide-y divide-[var(--divider)]">
            {workspace.recentMessageEvents.slice(0, 6).map(event => {
              const isFailed = event.status.toLowerCase() === 'failed';
              return (
                <div key={event.messageId} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--card-hover)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[var(--badge-bg)] flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isFailed ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                      {event.messageText ?? event.templateName ?? 'Evento de mensaje'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {event.recipientPhone ?? 'Sin teléfono'} · {event.direction ?? 'unknown'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isFailed
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-[var(--badge-bg)] text-[var(--badge-text)]'
                  }`}>
                    {getStatusIcon(event.status)}
                    {STATUS_LABEL[event.status.toLowerCase()] ?? event.status}
                  </span>
                </div>
              );
            })}

            {!workspace.recentMessageEvents.length && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClockIcon className="w-8 h-8 text-[var(--text-muted)] mb-3" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">Sin actividad reciente</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Los envíos y mensajes aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="card rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Acciones rápidas</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: '/dashboard/campaigns',     label: 'Enviar recordatorio',   desc: 'Dispara una plantilla al instante' },
                { href: '/dashboard/contacts',      label: 'Gestionar contactos',   desc: 'Ver, pausar o eliminar contactos' },
                { href: '/dashboard/clients',       label: 'Importar clientes',     desc: 'Carga CSV o Excel masivo' },
                { href: '/dashboard/templates',     label: 'Ver plantillas',        desc: 'Plantillas aprobadas en tu WABA' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--nav-hover-bg)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {action.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] shrink-0 mt-0.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {workspace.connection && (
            <div className="card rounded-xl border p-5 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">WhatsApp conectado</p>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {workspace.connection.displayPhoneNumber}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {workspace.connection.verifiedName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
