import type { Metadata } from "next";

import ServiceConditionsContent from "@/components/legal/ServiceConditionsContent";

export const metadata: Metadata = {
  title: "Condiciones del Servicio | Suscripta",
  description:
    "Condiciones del servicio de Suscripta para el uso de la plataforma SaaS e integracion con WhatsApp Business.",
};

export default function ServiceConditionsPage() {
  return <ServiceConditionsContent />;
}
