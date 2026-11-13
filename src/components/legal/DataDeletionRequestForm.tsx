"use client";

import { useState } from "react";

const DATA_DELETION_WEBHOOK_URL =
  "https://nprod.aishiagency.tech/webhook/data-deletion-notification";

export default function DataDeletionRequestForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const hasValidEmail = /\S+@\S+\.\S+/.test(email.trim());

  async function handleSubmit() {
    if (!hasValidEmail || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(DATA_DELETION_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          source: "suscripta-data-deletion-page",
          requested_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with ${response.status}`);
      }

      setFeedback({
        tone: "success",
        message:
          "Tu solicitud fue enviada correctamente. Nuestro equipo revisara el correo registrado para procesar la eliminacion de datos.",
      });
      setEmail("");
    } catch (error) {
      console.error("[Suscripta] Data deletion webhook failed:", error);
      setFeedback({
        tone: "error",
        message:
          "No pudimos enviar tu solicitud en este momento. Intenta de nuevo en unos minutos.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Request deletion
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Solicita la eliminacion manual de tus datos
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Escribe el correo con el que te registraste en Suscripta. Al enviar el formulario,
          notificaremos a nuestro backend operativo para localizar tu cuenta y gestionar la
          eliminacion manual.
        </p>
      </div>

      <label className="mb-3 block text-sm font-medium text-zinc-300" htmlFor="deletion-email">
        Correo registrado en Suscripta
      </label>
      <input
        id="deletion-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="tu-correo@ejemplo.com"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-emerald-400/60 focus:bg-white/[0.06]"
      />

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasValidEmail || isSubmitting}
          className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            hasValidEmail && !isSubmitting
              ? "bg-emerald-500 text-black hover:bg-emerald-400"
              : "cursor-not-allowed bg-zinc-800 text-zinc-500"
          }`}
        >
          {isSubmitting ? "Enviando solicitud..." : "Enviar solicitud"}
        </button>
        <p className="text-xs leading-6 text-zinc-500">
          La solicitud se enviara de forma segura a nuestro flujo interno de procesamiento.
        </p>
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
