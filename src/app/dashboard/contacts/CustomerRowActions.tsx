// src/app/dashboard/contacts/CustomerRowActions.tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { softDeleteCustomer, toggleCustomerActiveStatus } from '@/app/actions/customers';

export default function CustomerRowActions({ customerId, isActive, isDeleted }: { customerId: string, isActive: boolean, isDeleted: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    if (isDeleted) {
        return <span className="text-xs text-red-500/50 italic font-medium px-4">Archivado en Papelera</span>;
    }

    return (
        <div className="flex items-center gap-2 px-6 py-4 justify-end">
            <button 
                onClick={() => {
                    startTransition(async () => {
                        await toggleCustomerActiveStatus(customerId, !isActive);
                        router.refresh();
                    });
                }}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isActive ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                title={isActive ? "Pausar envíos temporalmente" : "Reactivar envíos"}
            >
                {isActive ? 'Pausar' : 'Activar'}
            </button>

            <button 
                onClick={() => {
                   if (confirm('¿Mover este usuario a la papelera? Quedará oculto y no recibirá más notificaciones.')) {
                        startTransition(async () => {
                            await softDeleteCustomer(customerId);
                            router.refresh();
                        });
                   }
                }}
                disabled={isPending}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                title="Mover a papelera (Soft Delete)"
            >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    );
}
