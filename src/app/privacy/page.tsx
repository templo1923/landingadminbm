import Link from "next/link";

export const metadata = {
    title: "Politica de Privacidad | Suscripta",
    description: "Politica de privacidad y manejo de datos de la plataforma Suscripta en el contexto de WhatsApp.",
};

export default function PrivacyPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans">
            <div className="fixed inset-0 z-[-1] bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(255,255,255,0))]" />

            <header className="z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8">
                <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                        <span className="text-lg font-bold leading-none text-black">S</span>
                    </div>
                    <span className="text-xl font-semibold tracking-tight">Suscripta</span>
                </Link>
                <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">
                    Volver al Inicio
                </Link>
            </header>

            <main className="mx-auto flex-1 w-full max-w-3xl px-6 py-12">
                <h1 className="mb-8 text-4xl font-bold">Politica de Privacidad</h1>
                <div className="prose prose-invert prose-emerald max-w-none text-zinc-300">
                    <p className="mb-8 text-sm text-zinc-500">Ultima actualizacion: {new Date().toLocaleDateString('es-MX')}</p>

                    <h2>1. Introduccion</h2>
                    <p>
                        En Suscripta, el respeto y la proteccion de su privacidad y la de sus clientes es nuestro compromiso principal.
                        Esta politica describe como recopilamos, procesamos y protegemos la informacion relacionada con el envio de recordatorios
                        mediante nuestra integracion con la API de WhatsApp Business Cloud de Meta.
                    </p>

                    <h2>2. Datos que Recopilamos</h2>
                    <p>
                        A traves de la integracion de Meta, Suscripta procesa estrictamente lo siguiente:
                    </p>
                    <ul>
                        <li><strong>Permisos tecnicos:</strong> tokens de acceso para mensajeria, WABA IDs y el estado de la conexion del numero.</li>
                        <li><strong>Datos de recordatorios:</strong> fechas, montos y numeros destino proporcionados por el cliente para el envio del recordatorio.</li>
                    </ul>

                    <h2>3. Privacidad por Diseno</h2>
                    <p>
                        Suscripta opera con un modelo de privilegios minimos. En el modo Coexistence, la herramienta unicamente inicia conversaciones
                        para el envio del recordatorio transaccional asociado a suscripciones.
                    </p>
                    <p>
                        <strong>No leemos, procesamos ni almacenamos</strong> el contenido de las respuestas de los clientes ni conversaciones originadas
                        o continuadas a traves de la aplicacion oficial de WhatsApp Business.
                    </p>

                    <h2>4. Como Usamos la Informacion</h2>
                    <ul>
                        <li>Entregar mensajes automaticos mediante plantillas aprobadas en WhatsApp Manager.</li>
                        <li>Reportar estados de envio dentro del dashboard.</li>
                        <li>Mantener la seguridad de la cuenta y asegurar la conformidad con los lineamientos de Meta.</li>
                        <li>Mejorar el rendimiento del servicio de forma anonima y agregada.</li>
                    </ul>

                    <h2>5. Retencion y Proteccion de Datos</h2>
                    <p>
                        Aseguramos la informacion en repositorios encriptados. Los numeros de telefono y los datos del recordatorio se conservan
                        unicamente el tiempo necesario para la operacion del ciclo de cobro vigente y con propositos legales o contables obligatorios,
                        o hasta que el cliente revoque la suscripcion u ordene la eliminacion de dichos datos.
                    </p>

                    <h2>6. Compartir su Informacion</h2>
                    <p>
                        Suscripta no vende ni transfiere su informacion ni la de sus clientes a terceros para marketing. Compartimos datos
                        estrictamente con proveedores de infraestructura necesarios para operar el servicio, como Meta.
                    </p>

                    <h2>7. Sus Derechos y Contacto</h2>
                    <p>
                        Usted puede revocar la autorizacion de la API de WhatsApp, solicitar la eliminacion de datos o consultar la trazabilidad
                        de la integracion. Para temas de privacidad, escriba a soporte@suscripta.co.
                    </p>
                </div>
            </main>

            <footer className="mt-auto w-full border-t border-white/5">
                <div className="mx-auto flex max-w-3xl justify-between px-6 py-8 text-sm text-zinc-500">
                    <p>(c) {new Date().getFullYear()} Suscripta Inc.</p>
                    <div className="flex gap-4">
                        <Link href="/data-deletion" className="transition-colors hover:text-white">Eliminacion de Datos</Link>
                        <Link href="/service-conditions" className="transition-colors hover:text-white">Condiciones del Servicio</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
