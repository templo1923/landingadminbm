'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerPaymentStatus } from '@/app/actions/customers';

interface Props {
    customerId: string;
    currentStatus: string;
    isDisabled?: boolean;
}

export default function PaymentToggle({ customerId, currentStatus, isDisabled }: Props) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleToggle = () => {
        // Por defecto, si hacemos toggle desde pending pasamos a paid, y viceversa
        const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';

        startTransition(async () => {
            const res = await updateCustomerPaymentStatus(customerId, nextStatus as ('pending' | 'paid'));
            if (res.ok) {
                // Forzamos un refresco de la vista del servidor (Next.js App Router)
                router.refresh(); 
            } else {
                alert("Error al actualizar pago: " + res.error);
            }
        });
    };

    const isPaid = currentStatus === 'paid';

    return (
        <div className="flex flex-col items-center gap-1.5">
            <button 
                onClick={handleToggle}
                disabled={isPending || isDisabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent ${isPaid ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white/10 hover:bg-white/20'} ${(isPending || isDisabled) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                title={isDisabled ? "Inactivo" : isPaid ? "Marcar como pendiente" : "Marcar como pagado"}
            >
                <span className="sr-only">Toggle estado de pago</span>
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-1'} shadow-sm`}
                />
            </button>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${isPaid ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {isPaid ? 'Pagado' : 'Pendiente'}
            </span>
        </div>
    );
}
