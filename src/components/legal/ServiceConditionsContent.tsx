import Link from "next/link";

type ServiceConditionsContentProps = {
  backHref?: string;
  backLabel?: string;
};

export default function ServiceConditionsContent({
  backHref = "/",
  backLabel = "Volver al Inicio",
}: ServiceConditionsContentProps) {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <div className="fixed inset-0 z-[-1] bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(255,255,255,0))]" />

      <header className="z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
            <span className="text-lg font-bold leading-none text-black">S</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Suscripta</span>
        </Link>
        <Link href={backHref} className="text-sm text-zinc-400 transition-colors hover:text-white">
          {backLabel}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 py-12">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
          <div className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-8">
            <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              Legal
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Condiciones del Servicio
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
              Estas condiciones regulan el uso de Suscripta como plataforma SaaS para
              integracion con WhatsApp Business, automatizacion de recordatorios y operacion
              de mensajeria transaccional.
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Ultima actualizacion: {new Date().toLocaleDateString("es-MX")}
            </p>
          </div>

          <div className="grid gap-8 text-zinc-300 md:grid-cols-[0.9fr_2.1fr]">
            <aside className="hidden md:block">
              <div className="sticky top-8 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Resumen
                </p>
                <ul className="space-y-3 text-sm leading-6 text-zinc-400">
                  <li>Uso autorizado del servicio</li>
                  <li>Responsabilidades del cliente</li>
                  <li>Politicas de Meta y WhatsApp</li>
                  <li>Suspension, billing y terminacion</li>
                  <li>Privacidad, soporte y contacto</li>
                </ul>
              </div>
            </aside>

            <div className="prose prose-invert prose-emerald max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-strong:text-white prose-li:text-zinc-300">
              <h2>1. Aceptacion del servicio</h2>
              <p>
                Al registrarse, acceder o utilizar Suscripta, el cliente acepta estas
                condiciones del servicio. Si no esta de acuerdo con ellas, no debe utilizar la
                plataforma.
              </p>

              <h2>2. Naturaleza del producto</h2>
              <p>
                Suscripta es una plataforma SaaS que permite a negocios conectar su propio
                numero de WhatsApp Business mediante el flujo oficial de Meta y utilizarlo para
                enviar recordatorios, mensajes transaccionales y automatizaciones permitidas por
                WhatsApp Business Platform.
              </p>
              <p>
                El cliente conserva la titularidad de su cuenta de WhatsApp Business, sus
                activos y su relacion con sus destinatarios. Suscripta actua como capa de
                software e infraestructura para operar esos flujos.
              </p>

              <h2>3. Requisitos para usar la plataforma</h2>
              <ul>
                <li>Contar con una cuenta valida de WhatsApp Business compatible con Meta.</li>
                <li>Proveer informacion veraz durante el onboarding y la configuracion.</li>
                <li>Tener autorizacion para usar el numero y los datos de los destinatarios.</li>
                <li>Cumplir las politicas aplicables de Meta, WhatsApp y las leyes locales.</li>
              </ul>

              <h2>4. Uso permitido</h2>
              <p>El cliente puede usar Suscripta para:</p>
              <ul>
                <li>enviar recordatorios de pago o renovacion,</li>
                <li>operar mensajes transaccionales y notificaciones legitimas,</li>
                <li>gestionar plantillas aprobadas,</li>
                <li>consultar estados de mensajes y actividad conversacional.</li>
              </ul>

              <h2>5. Uso prohibido</h2>
              <p>El cliente no debe usar Suscripta para:</p>
              <ul>
                <li>spam o mensajeria no solicitada,</li>
                <li>suplantacion, fraude o contenido enganoso,</li>
                <li>actividades ilegales o contenido restringido por Meta,</li>
                <li>enviar mensajes sin consentimiento o fuera de las reglas aplicables.</li>
              </ul>

              <h2>6. Integracion con Meta y WhatsApp</h2>
              <p>
                Algunas funciones dependen completamente de Meta y WhatsApp Business Platform,
                incluyendo autenticacion, estados del numero, aprobacion de plantillas, billing,
                elegibilidad del negocio y entrega de mensajes.
              </p>
              <p>
                Suscripta no garantiza que Meta apruebe un numero, una plantilla, permisos de
                aplicacion o un caso de uso. Tampoco garantiza la continuidad del servicio si
                Meta suspende, restringe o modifica sus politicas o APIs.
              </p>

              <h2>7. Responsabilidades del cliente</h2>
              <ul>
                <li>Obtener consentimiento valido de sus destinatarios.</li>
                <li>Mantener actualizada su configuracion operativa y de pago en Meta.</li>
                <li>Usar plantillas aprobadas de forma coherente con su categoria.</li>
                <li>Responder por el contenido y legalidad de los mensajes enviados.</li>
                <li>Respetar las ventanas de mensajeria y restricciones aplicables.</li>
              </ul>

              <h2>8. Billing, pagos y terceros</h2>
              <p>
                El cliente reconoce que algunos cobros, limites y bloqueos operativos pueden
                depender de Meta o de terceros. Si existen problemas de elegibilidad, metodos de
                pago, restricciones del WABA o errores del proveedor, Suscripta hara esfuerzos
                razonables para informar el estado, pero no controla la decision final del
                tercero.
              </p>

              <h2>9. Disponibilidad y cambios</h2>
              <p>
                El servicio puede evolucionar, cambiar de funcionalidades o incorporar nuevas
                restricciones operativas. Suscripta puede modificar estas condiciones y publicar
                una version actualizada en esta misma pagina.
              </p>

              <h2>10. Suspension o terminacion</h2>
              <p>
                Suscripta puede suspender o terminar el acceso al servicio cuando detecte uso
                abusivo, incumplimiento de estas condiciones, violaciones a las politicas de
                Meta, riesgos de seguridad o falta de pago.
              </p>

              <h2>11. Limitacion de responsabilidad</h2>
              <p>
                Suscripta proporciona la plataforma tal cual y segun disponibilidad. No sera
                responsable por perdidas indirectas, lucro cesante, bloqueos del numero,
                rechazos de Meta, interrupciones de terceros o problemas derivados del mal uso
                del servicio por parte del cliente.
              </p>

              <h2>12. Privacidad y datos</h2>
              <p>
                El tratamiento de datos personales y operativos se complementa con la Politica
                de Privacidad publicada por Suscripta. El cliente es responsable de contar con
                bases legales suficientes para usar los datos de sus destinatarios.
              </p>

              <h2>13. Contacto</h2>
              <p>
                Para consultas legales, soporte o solicitudes relacionadas con estas condiciones,
                puede escribir a <a href="mailto:soporte@suscripta.co">soporte@suscripta.co</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full border-t border-white/5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <p>(c) {new Date().getFullYear()} Suscripta Inc.</p>
          <div className="flex gap-5">
            <Link href="/data-deletion" className="transition-colors hover:text-white">
              Eliminacion de Datos
            </Link>
            <Link href="/service-conditions" className="transition-colors hover:text-white">
              Condiciones del Servicio
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
