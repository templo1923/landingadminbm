import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import PaymentToggle from './PaymentToggle';
import InlineCycleEditor from './InlineCycleEditor';
import ContactsHeaderActions from './ContactsHeaderActions';
import CustomerRowActions from './CustomerRowActions';

export const dynamic = 'force-dynamic';

export default async function Contacts(props: { searchParams: Promise<{ tab?: string }> }) {
    const searchParams = await props.searchParams;
    const tab = searchParams?.tab || 'activos';

    const supabase = await createClient();
    
    // Obtenemos los clientes construyendo la query dependiente de la pestaña actual
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (tab === 'activos') {
        query = query.eq('is_active', true).is('deleted_at', null);
    } else if (tab === 'pausados') {
        query = query.eq('is_active', false).is('deleted_at', null);
    } else if (tab === 'papelera') {
        query = query.not('deleted_at', 'is', null);
    }

    const { data: contacts, error } = await query;

    // Fallback error UI
    if (error) {
        return (
            <div className="p-10 w-full text-center text-red-400">
                Hubo un error cargando los contactos. {error.message}
            </div>
        );
    }

    return (
        <div className="p-10 max-w-6xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight mb-1 text-[var(--text-primary)]">Base de Clientes</h1>
                    <p className="text-[var(--text-muted)] text-sm">Gestiona tus contactos, descarga métricas o depura tu envase para notificaciones instantáneas.</p>
                </div>
            </div>

            <ContactsHeaderActions currentTab={tab} rawData={contacts || []} />

            <div className="card rounded-xl border overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm text-[var(--text-secondary)]">
                        <thead className="bg-[var(--card-hover)] text-xs uppercase font-semibold tracking-wider text-[var(--text-muted)] border-b border-[var(--divider)]">
                            <tr>
                                <th className="px-6 py-4">Nombre Completo</th>
                                <th className="px-6 py-4">Teléfono (Meta E.164)</th>
                                <th className="px-6 py-4 text-[var(--text-muted)]">Ciclo / Fecha</th>
                                <th className="px-6 py-4 text-emerald-600 dark:text-emerald-400 text-center border-l bg-emerald-500/5 border-[var(--divider)]">Estado de Pago</th>
                                <th className="px-6 py-4 text-right border-l border-[var(--divider)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--divider)]">
                            {contacts && contacts.length > 0 ? (
                                contacts.map((contact) => {
                                    const nombreAgrupado = [contact.first_name, contact.last_name_1, contact.last_name_2].filter(Boolean).join(' ');
                                    const paymentStatus = contact.payment_status || 'pending';

                                    return (
                                        <tr key={contact.id} className="hover:bg-[var(--card-hover)] transition-colors relative group">
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                                                {nombreAgrupado}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[var(--text-muted)]">
                                                {contact.phone_number}
                                            </td>
                                            <td className="px-6 py-3">
                                                <InlineCycleEditor
                                                    customerId={contact.id}
                                                    billingCycle={contact.billing_cycle || 'monthly'}
                                                    nextPaymentDate={contact.next_payment_date}
                                                />
                                            </td>
                                            <td className="px-6 py-4 border-l border-[var(--divider)] align-middle">
                                                <div className="flex justify-center">
                                                    <PaymentToggle
                                                        customerId={contact.id}
                                                        currentStatus={paymentStatus}
                                                        isDisabled={!!contact.deleted_at}
                                                    />
                                                </div>
                                            </td>
                                            <td className="border-l border-[var(--divider)]">
                                                <CustomerRowActions 
                                                    customerId={contact.id}
                                                    isActive={contact.is_active}
                                                    isDeleted={!!contact.deleted_at}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-[var(--badge-bg)] flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-[var(--text-secondary)] font-medium text-lg">Sin base de contactos.</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm mb-6">Aún no existe ningún cliente guardado en tu cuenta. Vincula un archivo de Excel (.xlsx) o CSV.</p>
                                            <Link href="/dashboard/clients" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition-colors uppercase tracking-widest text-xs">
                                                Ir a importar →
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 flex justify-between items-center text-xs text-[var(--text-muted)] border-t border-[var(--divider)]">
                    <span>
                        Mostrando {contacts?.length || 0} cliente(s) en tu cuenta.
                    </span>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-[var(--badge-bg)] rounded-full hover:bg-[var(--card-hover)] transition-colors" disabled>← Anterior</button>
                        <button className="px-4 py-2 bg-[var(--badge-bg)] rounded-full hover:bg-[var(--card-hover)] transition-colors">Siguiente →</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
