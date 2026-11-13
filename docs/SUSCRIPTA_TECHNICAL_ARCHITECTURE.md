# Documentacion Tecnica de Suscripta

## Resumen

Suscripta es un SaaS construido con Next.js que permite a un negocio conectar su propio numero de WhatsApp Business mediante Meta Embedded Signup y utilizarlo para enviar recordatorios de pago o renovacion.

El sistema actual combina:

- Next.js App Router para frontend y backend,
- Vercel como runtime y despliegue,
- Supabase como capa de persistencia,
- Meta Graph API y WhatsApp Cloud API como plataforma de mensajeria.

## Stack actual

- Frontend: Next.js + React + TypeScript
- Backend: API routes y server actions en Next.js
- Hosting: Vercel
- Persistencia: Supabase
- Integracion externa: Meta Graph API / WhatsApp Cloud API

## Flujo general de arquitectura

1. El usuario entra a Suscripta.
2. Conecta su cuenta de WhatsApp Business mediante Embedded Signup.
3. Meta devuelve un `authorization code`, `waba_id` y `phone_number_id`.
4. El backend intercambia el `code` por un token utilizable.
5. Suscripta guarda la conexion en Supabase.
6. El dashboard utiliza esa conexion para leer activos reales desde Meta.
7. Suscripta envia plantillas aprobadas o mensajes libres cuando la ventana de 24 horas lo permite.
8. Meta devuelve webhooks con eventos de mensajes y estados.
9. Suscripta guarda esos eventos en Supabase.
10. La UI renderiza conversaciones, plantillas y resultados reales.

## Vercel dentro de la arquitectura

Vercel hospeda:

- la aplicacion Next.js,
- el backend de intercambio de token,
- el webhook de WhatsApp,
- el dashboard del producto.

## Variables de entorno criticas

Variables necesarias en produccion:

- `NEXT_PUBLIC_FACEBOOK_APP_ID`
- `NEXT_PUBLIC_FACEBOOK_CONFIG_ID`
- `FACEBOOK_APP_SECRET`
- `NEXT_PUBLIC_OAUTH_REDIRECT_URI`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Errores tipicos cuando estas variables no estan alineadas:

- fallo al intercambiar el `code`,
- rutas que aparentemente funcionan pero no persisten conexion,
- webhook no verificable,
- numero conectado que no muestra activos reales.

## Supabase dentro del proyecto

Supabase actua como capa de persistencia. No hace el intercambio OAuth por si mismo; ese paso ocurre en el backend de Next.js desplegado en Vercel.

Supabase se usa para guardar:

- conexiones de WhatsApp Business,
- eventos de mensajes,
- estados de entrega,
- mensajes entrantes.

## Tabla `whatsapp_connections`

Proposito:

- guardar la conexion activa entre el usuario del SaaS y su activo de WhatsApp Business.

Campos relevantes:

- `user_id`
- `waba_id`
- `phone_number_id`
- `display_phone_number`
- `verified_name`
- `access_token`
- `is_active`
- timestamps

Flujo tipico:

1. Embedded Signup termina.
2. El backend intercambia el codigo.
3. Se hace `upsert` de la conexion.
4. El dashboard usa esa fila para operar el workspace.

## Tabla `whatsapp_message_events`

Proposito:

- guardar tanto eventos salientes como entrantes.

Campos relevantes:

- `waba_id`
- `phone_number_id`
- `message_id`
- `recipient_phone`
- `template_name`
- `direction`
- `message_text`
- `status`
- `error_code`
- `error_title`
- `error_message`
- `raw_payload`
- `created_at`
- `updated_at`
- `last_event_at`

Notas importantes:

- `direction` permite distinguir `outbound` e `inbound`.
- `message_text` es necesario para mostrar mensajes entrantes en conversaciones.
- esta tabla depende de que el webhook este correctamente configurado.

## Embedded Signup

Componente principal:

- [EmbeddedSignupButton.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/components/EmbeddedSignupButton.tsx)

Responsabilidades:

- cargar el SDK de Meta,
- iniciar Embedded Signup,
- capturar `auth code`,
- capturar `waba_id`,
- capturar `phone_number_id`,
- solicitar al backend el intercambio del codigo.

## Intercambio del login code de Meta

Endpoint principal:

- [route.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/api/whatsapp/exchange-token/route.ts)

Que hace:

- recibe `code`, `waba_id` y `phone_number_id`,
- intercambia el codigo con Meta,
- consulta datos necesarios del numero,
- persiste o actualiza la conexion en Supabase.

Leccion clave del proyecto:

- el problema mas delicado fue el `redirect_uri`,
- el `code` si llegaba, pero Meta lo rechazaba cuando el backend usaba un `redirect_uri` distinto al flujo real del popup,
- no siempre se debe forzar `redirect_uri` durante el exchange si el flujo efectivo del popup no lo utilizo asi.

## Gestion de activos desde Meta

Modulo principal:

- [whatsapp.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/actions/whatsapp.ts)

Que resuelve:

- obtener la conexion activa,
- consultar el perfil del numero,
- leer plantillas reales,
- crear plantillas,
- enviar plantillas,
- enviar mensajes de texto,
- reagrupar datos para el dashboard.

Helpers:

- [whatsapp.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/utils/whatsapp.ts)

Ahi viven tareas como:

- requests a Graph API,
- normalizacion de destinatarios,
- construccion de componentes para plantillas.

## Envio de plantillas

Accion principal:

- `sendWhatsAppTestTemplate`

Que hace:

- usa un numero conectado real,
- arma el payload `type: template`,
- usa nombre e idioma de plantilla aprobada,
- envia parametros del `body`,
- registra el evento inicial como `accepted`.

Detalles operativos importantes:

- para Mexico se contemplan variantes con `52...` y `521...`,
- `accepted` no significa entregado,
- el estado final llega por webhook.

## Envio de mensajes libres

Accion principal:

- `sendWhatsAppTextMessage`

Uso:

- responder dentro de una conversacion real cuando la ventana de 24 horas esta abierta.

Payload:

- `type: text`
- contenido libre

Esta pieza permite que la bandeja de conversaciones no sea solo lectura.

## Webhook de WhatsApp

Ruta principal:

- [route.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/api/whatsapp/webhook/route.ts)

### GET del webhook

Se usa para la verificacion con Meta.

Lee:

- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

Si el token coincide con `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, devuelve el `challenge`.

### POST del webhook

Se usa para guardar eventos reales.

Actualmente procesa:

- `statuses`:
  - `accepted`
  - `delivered`
  - `read`
  - `failed`
- `messages` entrantes:
  - texto libre,
  - `message_text`,
  - `direction = inbound`

Leccion importante:

Inicialmente el webhook solo guardaba statuses, y por eso la bandeja no mostraba mensajes entrantes reales. Eso se corrigio para soportar inbox MVP.

## Conversaciones

Ruta principal:

- [page.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/dashboard/conversations/page.tsx)

Comportamiento actual:

- agrupa eventos por numero,
- muestra primero conversaciones reales,
- refresca periodicamente,
- permite responder con texto,
- mantiene scroll independiente en sidebar y panel de detalle.

Problemas que ya se corrigieron:

- mensajes nuevos que no aparecian sin recargar,
- scroll roto,
- falta de mensajes entrantes reales.

## Plantillas

Ruta principal:

- [page.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/dashboard/templates/page.tsx)

Comportamiento actual:

- carga plantillas reales desde Meta,
- muestra estado, idioma, categoria y contenido cuando existe,
- sirve tanto para demo publica como para validacion del permiso de management.

## Envios

Rutas:

- [page.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/dashboard/campaigns/page.tsx)
- [CampaignComposer.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/components/dashboard/CampaignComposer.tsx)

Comportamiento:

- usa plantillas aprobadas reales,
- permite elegir destinatario,
- permite disparar un reminder real,
- sirve como superficie MVP del producto para demostrar el valor del SaaS.

## Ruta especial para Meta App Review

Ruta:

- [page.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/dashboard/review/page.tsx)

Componente principal:

- [AppReviewConsole.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/components/AppReviewConsole.tsx)

Su proposito es:

- simplificar el flujo de revision,
- demostrar onboarding,
- demostrar lectura de activos,
- demostrar envio de plantilla.

Se mantuvo separada del dashboard principal para que el review no dependa del resto de la app.

## Que se aprendio tecnicamente durante la implementacion

### 1. El problema rara vez esta solo en el codigo

Se presentaron fallas por:

- `App Secret` incorrecto,
- `redirect_uri` inconsistente,
- variables faltantes en Vercel,
- numero no totalmente operativo,
- billing o elegibilidad del WABA,
- app no suscrita al WABA.

### 2. La observabilidad es obligatoria

Sin webhook storage no se puede distinguir entre:

- API acepto el mensaje,
- Meta lo entrego,
- Meta lo fallo,
- o el usuario respondio.

### 3. Supabase y frontend deben evolucionar juntos

Cuando la app empezo a depender de `message_text`, el esquema de Supabase tuvo que actualizarse tambien. Si no, el inbox se rompe o parece vacio aunque el webhook si llegue.

### 4. La conexion local puede quedar obsoleta

Si el numero se elimina directamente desde Meta, la app puede seguir mostrandolo conectado si solo mira Supabase. Por eso se anadio revalidacion contra Meta y desactivacion local cuando el activo ya no existe.

## Estado actual del MVP

### Ya es real

- Embedded Signup
- code exchange
- persistencia de conexion
- lectura real de plantillas
- envio real de plantillas
- envio libre dentro de la ventana de 24 horas
- recepcion y persistencia de webhooks
- conversaciones reales basicas

### Sigue siendo MVP

- contactos mas profundos,
- automatizaciones avanzadas,
- analitica completa,
- multi-tenant mas sofisticado,
- campanas mas complejas que un envio directo.

## Mejoras recomendadas a futuro

- formalizar migraciones SQL en lugar de depender solo de `supabase_setup.sql`,
- endurecer validacion y observabilidad del webhook,
- agregar un modelo real de contactos,
- agregar analitica de entregabilidad,
- agregar colas y reintentos para envios masivos,
- enriquecer permisos y manejo multi-workspace.

## Archivos clave del proyecto

- Signup UI: [EmbeddedSignupButton.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/components/EmbeddedSignupButton.tsx)
- Review console: [AppReviewConsole.tsx](C:/Users/kevin/Documents/Saas%20Suscripta/src/components/AppReviewConsole.tsx)
- Acciones de WhatsApp: [whatsapp.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/actions/whatsapp.ts)
- Exchange token route: [route.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/api/whatsapp/exchange-token/route.ts)
- Webhook route: [route.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/app/api/whatsapp/webhook/route.ts)
- Helpers de Graph API: [whatsapp.ts](C:/Users/kevin/Documents/Saas%20Suscripta/src/utils/whatsapp.ts)
- SQL base: [supabase_setup.sql](C:/Users/kevin/Documents/Saas%20Suscripta/supabase_setup.sql)

## Cierre

La parte dificil de un SaaS de WhatsApp no es solo mandar el request correcto a la API. Lo complejo es mantener consistencia entre:

- configuracion de Meta,
- autenticacion,
- persistencia,
- webhooks,
- verdad del dashboard,
- y experiencia del usuario final.

Suscripta ya tiene la base tecnica suficiente para operar como MVP real y servir tanto para App Review como para demo publica del producto.
