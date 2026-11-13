'use server';

import { createClient } from '@/utils/supabase/server';

/*
    ================================================================================
    NOTA DE ARQUITECTURA PARA EL DESARROLLADOR BACKEND:
    ================================================================================
    IMPORTANTE: El motor de envíos de WhatsApp (cron jobs, colas o triggers) 
    SOLO deberá procesar y enviar recordatorios a los clientes cuyo campo 
    `payment_status` se encuentre exclusivamente en los estados:
      - 'pending'
      - 'overdue'

    Cualquier cliente con `payment_status` === 'paid' o 'cancelled' DEBE ser 
    estrictamente excluido del embudo de notificaciones de cobranza.
    ================================================================================
*/

interface CustomerInsertInput {
    phoneNumber: string;
    firstName: string;
    lastName1?: string | null;
    lastName2?: string | null;
    payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
    billingCycle?: string | null;
    nextPaymentDate?: string | null;
}

type CustomerUpsertRow = {
    user_id: string;
    phone_number: string;
    first_name: string;
    last_name_1: string | null;
    last_name_2: string | null;
    deleted_at: string | null;
    is_active: boolean;
    inactive_at: string | null;
    billing_cycle?: string | null;
    next_payment_date?: string | null;
};

export async function uploadCustomersBatch(customers: CustomerInsertInput[], mode: 'append' | 'overwrite' = 'append') {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[Suscripta] Auth Error:', userError);
            return { ok: false, error: `Acceso no autorizado: ${userError?.message || 'Sesión no encontrada'}` };
        }

        if (!customers || customers.length === 0) {
            return { ok: false, error: 'No hay clientes válidos para importar.' };
        }

        // Formatear payload para la base de datos
        const payload = customers.map((c): CustomerUpsertRow => {
            const row: CustomerUpsertRow = {
                user_id: user.id,
                phone_number: c.phoneNumber,
                first_name: c.firstName,
                last_name_1: c.lastName1 || null,
                last_name_2: c.lastName2 || null,
                deleted_at: null, // Resurrección si estaba en papelera
                is_active: true,
                inactive_at: null
            };
            if (c.billingCycle) row.billing_cycle = c.billingCycle;
            if (c.nextPaymentDate) row.next_payment_date = c.nextPaymentDate;
            return row;
        });

        // Aplicar modo 'overwrite' (Soft Delete en cascada antes del upsert)
        if (mode === 'overwrite') {
            const { error: deleteError } = await supabase
                .from('customers')
                .update({ deleted_at: new Date().toISOString(), is_active: false })
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (deleteError) {
                console.error('[Suscripta] Error en sobrescritura:', deleteError);
                return { ok: false, error: 'No se pudieron archivar los clientes actuales.' };
            }
        }

        // Insertar previniendo duplicados exactos (Upsert con conflicto en user_id y phone_number)
        const { error } = await supabase
            .from('customers')
            .upsert(payload, { 
                onConflict: 'user_id,phone_number',
                ignoreDuplicates: false // Actualizará el nombre si el número ya existe
            });

        if (error) {
            console.error('[Suscripta] Error en carga masiva de clientes:', error);
            return { ok: false, error: 'Hubo un error de base de datos al importar: ' + error.message };
        }

        return { ok: true, count: payload.length };
    } catch (error) {
        console.error('[Suscripta] Excepción de carga masiva', error);
        return { ok: false, error: 'Error desconocido durante la importación masiva.' };
    }
}

// Acción de servidor para hacer Toggle de Pago
export async function updateCustomerPaymentStatus(customerId: string, newStatus: 'pending' | 'paid' | 'overdue' | 'cancelled') {
    try {
        const supabase = await createClient();
        
        const { error } = await supabase
            .from('customers')
            .update({ payment_status: newStatus })
            .eq('id', customerId);

        if (error) {
            console.error('[Suscripta] Error actualizando estado de pago:', error);
            return { ok: false, error: error.message };
        }

        return { ok: true };
    } catch (error) {
        console.error('[Suscripta] Excepción actualizando pago', error);
        return { ok: false, error: 'Error desconocido al actualizar pago.' };
    }
}

// Acción de servidor para hacer Inline Edit de Ciclo y Fecha
export async function updateCustomerCycle(customerId: string, billingCycle: string, nextPaymentDate: string | null) {
    try {
        const supabase = await createClient();
        
        const payload: { billing_cycle: string; next_payment_date: string | null } = {
            billing_cycle: billingCycle,
            next_payment_date: null
        };
        payload.next_payment_date = nextPaymentDate || null; // Permite vaciar la fecha enviando null

        const { error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', customerId);

        if (error) {
            console.error('[Suscripta] Error actualizando ciclo:', error);
            return { ok: false, error: error.message };
        }

        return { ok: true };
    } catch (error) {
        console.error('[Suscripta] Excepción actualizando ciclo', error);
        return { ok: false, error: 'Error desconocido al actualizar ciclo de facturación.' };
    }
}

// Backend - Mover a Papelera (Soft Delete)
export async function softDeleteCustomer(customerId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('customers')
            .update({ deleted_at: new Date().toISOString(), is_active: false })
            .eq('id', customerId);
        
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch {
        return { ok: false, error: 'Error al enviar a papelera.' };
    }
}

// Backend - Inactivar / Pausar
export async function toggleCustomerActiveStatus(customerId: string, makeActive: boolean) {
    try {
        const supabase = await createClient();
        const payload = {
            is_active: makeActive,
            inactive_at: makeActive ? null : new Date().toISOString()
        };
        const { error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', customerId);
        
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch {
        return { ok: false, error: 'Error al cambiar estado de actividad.' };
    }
}

// Backend - Añadir Cliente Manual (Unitario)
export async function addManualCustomer(customer: { phoneNumber: string, firstName: string, lastName1?: string, lastName2?: string, billingCycle: string }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('[Suscripta] Manual Add Auth Error:', userError);
            return { ok: false, error: 'Acceso no autorizado: ' + (userError?.message || 'No se encontró sesión activa') };
        }

        const { error } = await supabase
            .from('customers')
            .upsert({
                user_id: user.id,
                phone_number: customer.phoneNumber,
                first_name: customer.firstName,
                last_name_1: customer.lastName1 || null,
                last_name_2: customer.lastName2 || null,
                billing_cycle: customer.billingCycle,
                deleted_at: null,
                is_active: true,
                inactive_at: null
            }, { onConflict: 'user_id,phone_number' });

        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: 'Error añadiendo cliente.' };
    }
}
