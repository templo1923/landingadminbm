import type { Metadata } from "next";
import Link from "next/link";

import DataDeletionRequestForm from "@/components/legal/DataDeletionRequestForm";

export const metadata: Metadata = {
  title: "Eliminacion de Datos | Suscripta",
  description:
    "Instrucciones para solicitar la eliminacion de datos personales y operativos de Suscripta.",
};

export default function DataDeletionPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <div className="fixed inset-0 z-[-1] bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(255,255,255,0))]" />

      <header className="z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-12">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
          <div className="mb-10 max-w-3xl">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              Privacy
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Eliminacion de datos del usuario
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">
              Esta pagina explica como solicitar la eliminacion de los datos asociados a tu
              cuenta en Suscripta. Si deseas que retiremos tu informacion del sistema de forma
              manual, usa el formulario de abajo para notificarnos.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Que datos podemos eliminar</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Dependiendo del estado de tu cuenta, la eliminacion puede incluir datos como:
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-300">
                  <li>datos de conexion de WhatsApp Business,</li>
                  <li>eventos de mensajes y estados de entrega,</li>
                  <li>metadatos operativos vinculados a tu cuenta,</li>
                  <li>desvinculacion de integraciones activas.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">Como funciona el proceso</h2>
                <ol className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
                  <li>1. Nos compartes tu correo registrado en la plataforma.</li>
                  <li>2. Identificamos tu cuenta y verificamos la solicitud.</li>
                  <li>3. Eliminamos o desvinculamos la informacion aplicable.</li>
                  <li>4. Te confirmamos por correo una vez completado el proceso.</li>
                </ol>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">Callback automatico de retirada de autorizacion</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Para configuraciones de Meta Developers, la URL de retirada de autorizacion
                  puede apuntar a <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200">/api/meta/deauthorize</code>.
                  Esa ruta intenta identificar al usuario actual por sesion o por el identificador
                  de Meta vinculado a su cuenta y elimina o desvincula sus datos automaticamente.
                </p>
              </div>
            </section>

            <DataDeletionRequestForm />
          </div>
        </div>
      </main>
    </div>
  );
}
