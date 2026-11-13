// src/app/dashboard/contacts/ContactsHeaderActions.tsx
'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addManualCustomer } from '@/app/actions/customers';

type ContactExportRow = {
    id?: string;
    phone_number?: string;
    first_name?: string;
    last_name_1?: string;
    last_name_2?: string;
    billing_cycle?: string;
    payment_status?: string;
    is_active?: boolean;
    deleted_at?: string | null;
};

export default function ContactsHeaderActions({ currentTab, rawData }: { currentTab: string, rawData: ContactExportRow[] }) {
    const [isExporting, setIsExporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [mPhone, setMPhone] = useState('');
    const [mName, setMName] = useState('');
    const [mLast, setMLast] = useState('');
    const [mCycle, setMCycle] = useState('monthly');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleExport = () => {
        setIsExporting(true);
        try {
            if (rawData.length === 0) return alert('No hay datos en esta pestaña para exportar.');
            const csvRows = [];
            csvRows.push(['ID', 'Telefono', 'First Name', 'Last Name 1', 'Last Name 2', 'Ciclo', 'Status Pago', 'Activo', 'Archivado'].join(','));
            for (const r of rawData) {
                const vals = [r.id, r.phone_number, r.first_name, r.last_name_1, r.last_name_2, r.billing_cycle, r.payment_status, r.is_active, !!r.deleted_at];
                csvRows.push(vals.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
            }
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clientes_suscripta_${currentTab}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await addManualCustomer({ phoneNumber: mPhone, firstName: mName, lastName1: mLast, billingCycle: mCycle });
        setIsSubmitting(false);
        if (res.ok) {
            setIsModalOpen(false);
            setMPhone(''); setMName(''); setMLast('');
            router.refresh();
        } else {
            alert('Error al guardar: ' + res.error);
        }
    };

    return (
        <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center card border rounded-xl p-4">

                {/* TABS */}
                <div className="flex gap-1 p-1 rounded-lg border border-[var(--card-border)] bg-[var(--card-hover)] overflow-x-auto w-full md:w-auto">
                    {['activos', 'pausados', 'papelera'].map(t => (
                        <Link
                            key={t}
                            href={`?tab=${t}`}
                            className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all whitespace-nowrap ${currentTab === t ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--card-bg)]'}`}
                        >
                            {t}
                        </Link>
                    ))}
                </div>

                <div className="flex w-full md:w-auto items-center justify-end gap-3 mt-4 md:mt-0">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-4 py-2 bg-[var(--badge-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] rounded-lg text-xs font-medium text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Exportar a CSV
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        + Añadir Cliente
                    </button>
                </div>
            </div>

            {/* Modal Añadir Manual */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="card border border-[var(--card-border)] rounded-2xl p-8 max-w-sm w-full relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--badge-bg)] rounded-full p-2 transition-colors">✕</button>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Nuevo Contacto</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1">Teléfono Móvil *</label>
                                <input required type="text" value={mPhone} onChange={e=>setMPhone(e.target.value)} placeholder="+52 555 123 4567" className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-[var(--text-primary)] transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] font-medium ml-1">Nombre (First Name) *</label>
                                <input required type="text" value={mName} onChange={e=>setMName(e.target.value)} placeholder="Ej. Ana" className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-[var(--text-primary)] transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] font-medium ml-1">Apellidos (Opcional)</label>
                                <input type="text" value={mLast} onChange={e=>setMLast(e.target.value)} placeholder="Ej. López" className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-[var(--text-primary)] transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] font-medium ml-1">Ciclo de Facturación</label>
                                <select value={mCycle} onChange={e=>setMCycle(e.target.value)} className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-[var(--text-primary)] transition-colors cursor-pointer">
                                    <option value="weekly">Semanal</option>
                                    <option value="biweekly">Quincenal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="annual">Anual</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50">
                                    {isSubmitting ? 'Guardando...' : 'Agregar Contacto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
