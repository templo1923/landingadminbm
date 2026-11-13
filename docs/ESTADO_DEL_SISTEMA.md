# Estado del Sistema: Suscripta SaaS

## 1. Estructura de Carpetas Principal
El proyecto se encuentra migrado o construido inicialmente sobre el nuevo **App Router** de Next.js (versión `16.1.6`), empleando fuertemente TypeScript. La organización es clara y sigue buenas prácticas:

*   **`src/app/`**: Contiene la lógica enrutada de la aplicación web.
    *   **Rutas de interfaz**: `/dashboard`, `/oauth`, `/privacy`, `/terms`, `/service-conditions`, `/data-deletion`. Posee un flujo legal y de consumo de datos preparado.
    *   **API Routes (`/api`)**: Preparado para la interacción con los servicios de WhatsApp y Meta (`/api/whatsapp/exchange-token`, `/api/whatsapp/webhook`, `/api/meta/deauthorize`).
    *   **Actions (`/actions`)**: Ubicación de Server Actions vinculadas seguramente al envío de mensajes de WhatsApp y manejo de datos.
*   **`src/components/`**: Componentes visuales organizados temáticamente. Destacan los componentes `AppReviewConsole.tsx` y `EmbeddedSignupButton.tsx` (posiblemente vinculados al componente de Embedded Signup de Meta).
*   **`src/utils/`**: Scripts con lógica de soporte transversal y configuraciones pesadas (`supabase/server.ts`, `whatsapp.ts`, `data-deletion.ts`).
*   **`docs/`**: Archivos de especificación inicial (`BLUEPRINT_WHATSAPP_SAAS_TECH_PROVIDER_V1.md` y `SUSCRIPTA_TECHNICAL_ARCHITECTURE.md`).

## 2. Estado Actual de la Integración con Supabase
La arquitectura de Supabase descansa sobre la dupla de `@supabase/ssr` (v^0.9.0) y `@supabase/supabase-js`. 

*   **Cliente SSR Híbrido**: Existe el archivo `src/utils/supabase/server.ts` con instanciación de cookies (`createClient()`) para consultas del usuario final, y un `createAdminClient()` (apoyado en `SUPABASE_SERVICE_ROLE_KEY`) dedicado a operaciones "admin-level" como los Webhooks o intercambios de token que omiten las reglas de RLS (Row Level Security).
*   **Modelo de Datos**: Se adjunta el archivo de migración `supabase_setup.sql` el cual ya define dos tablas estructuralmente vitales:
    *   `whatsapp_connections`: Registra los IDs de WABA, Phone Number ID, Acces Token y estado verificable, enlazándolo (Foreign Key) de inmediato con el ecosistema de `auth.users` mediante borrados modulares en cascada. Emplea correctamente políticas RLS por cada propietario.
    *   `whatsapp_message_events`: Tabla orientada a log de eventos de entrega (status). Registra los Webhooks entrantes de envíos fallidos o entregados para llevar métricas posteriores que verifique la cuenta enviadora.

## 3. Dependencias Clave Detectadas
El proyecto corre sobre dependencias modernas y robustas:
*   **Core**: `next` (16.1.6), `react` & `react-dom` (19.2.3).
*   **Backend & DB**: `@supabase/ssr` (^0.9.0), `@supabase/supabase-js` (^2.98.0).
*   **Estilos CSS**: Implementación limpia con `tailwindcss` (versión ^4, a través de soporte con el componente @tailwindcss/postcss).
*   **Tipado e Identificación**: Fuerte tipado en `TypeScript` y reglas analizadas mediante `eslint`. 
*   **Ambientales**: Uso de la gema `dotenv` dentro de scripts en consola.

## 4. Configuración de Vercel & Variables de Entorno
Al observar la arquitectura, el futuro despliegue en Vercel es altamente viable pero demanda un entorno estricto. Requerirá la inyección de estas variables fundamentales (muchas identificadas actualmente sin presencia de archivo `.env.example` en el repositorio):

*   `NEXT_PUBLIC_SUPABASE_URL`: Endpoint REST API principal.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Para el cliente público anon.
*   `SUPABASE_SERVICE_ROLE_KEY`: Se requiere urgentemente para la ejecución de `createAdminClient()` que saltea RLS.
*   *Y las futuras variables asociadas a Meta y Webhooks (por ejemplo, `META_APP_ID`, `META_APP_SECRET`, verificación de token del Webhook).*

## 5. Posibles Deudas Técnicas / Puntos Ciegos
Tras el análisis, he identificado las siguientes advertencias de desarrollo antes de arrancar con nuevas líneas de código:
1.  **Falta de Plantilla Ambiental**: La ausencia de un archivo `.env.local.example` en la raíz obstaculiza el onboarding de pares. Se sugiere crearlo y documentar las keys esperadas.
2.  **Omisión de Pruebas Unitaria (Testing)**: Ausencia completa de librerías como Jest, Vitest o Playwright dentro de los scripts en `package.json`. Todos los pipelines críticos (ej. Webhooks) carecen de blindaje automatizado anti-regresiones.
3.  **Supresión Silenciosa en Interacciones de Cookies**: En `supabase/server.ts`, los errores relacionados con el seteo de cookies desde un Server Component se "comen" (bloque vacío `try/catch`). Si bien es una respuesta de boilerplate normal (por colisiones con middleware), se debe tener extrema precaución a la hora de invalidar sesiones o actualizar tokens.
4.  **Confirmación del Flujo Multi-Inquilino (Auth de App)**: Aunque la tabla de Supabase relaciona las tablas con un `user_id` de `auth.users`, se debe confirmar más adelante que el inicio de sesión base sobre *Suscripta* no pise los cables de autorización de token de *WhatsApp Embedded Signup*.
