import type { Metadata } from "next";

import ServiceConditionsContent from "@/components/legal/ServiceConditionsContent";

export const metadata: Metadata = {
  title: "Terminos y Condiciones | Suscripta",
  description:
    "Terminos y condiciones de uso de la plataforma Suscripta y la integracion con WhatsApp Business.",
};

export default function TermsPage() {
  return (
    <ServiceConditionsContent
      backHref="/service-conditions"
      backLabel="Ir a Condiciones del Servicio"
    />
  );
}
