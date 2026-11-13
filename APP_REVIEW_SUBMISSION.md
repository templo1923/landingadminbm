# Meta App Review — entrega de Suscripta

## Alcance

La aplicación solicita Advanced Access para `whatsapp_business_management` y `whatsapp_business_messaging` dentro del flujo de Tech Provider. La aplicación permite que un negocio conecte su propio WhatsApp Business mediante Embedded Signup, consulte activos reales y envíe una plantilla aprobada a un destinatario que dio consentimiento.

## Precondiciones

Antes de grabar, confirma que el negocio está verificado en Meta, que la aplicación tiene privacidad, términos, icono y URLs públicas configuradas, y que el dominio de producción está en Allowed domains y Valid OAuth redirect URIs. `NEXT_PUBLIC_FACEBOOK_APP_ID`, `NEXT_PUBLIC_FACEBOOK_CONFIG_ID`, `FACEBOOK_APP_SECRET` y `META_GRAPH_VERSION` deben pertenecer al mismo entorno. La URL del webhook es `/api/whatsapp/webhook`.

La cuenta de prueba debe tener un número WhatsApp Business operativo, una plantilla aprobada y un teléfono de prueba con WhatsApp instalado. El teléfono destinatario debe haber dado opt-in. La pantalla `/dashboard/review` debe abrir después de iniciar sesión.

## Video 1 — WhatsApp Business Messaging

Duración recomendada: 2–4 minutos.

1. Abrir la aplicación en producción e iniciar sesión.
2. Mostrar brevemente que Suscripta es una aplicación SaaS de recordatorios de pago por WhatsApp.
3. Abrir `App Review` y pulsar `Connect with Meta`.
4. Mostrar completo el login de Meta, la selección del Business Portfolio, la selección o vinculación de la cuenta WhatsApp Business y la concesión de permisos.
5. Regresar a Suscripta y mostrar el número conectado, nombre verificado, WABA/phone number ID y datos reales del perfil.
6. Mostrar una plantilla aprobada cargada desde Meta.
7. Introducir el teléfono de prueba con opt-in, seleccionar la plantilla y pulsar `Send test reminder`.
8. Mostrar el resultado aceptado por Meta y después el mensaje recibido en WhatsApp Web o en el teléfono destinatario.
9. Explicar en pantalla o con subtítulos: `whatsapp_business_messaging` permite enviar la plantilla aprobada desde el número conectado del negocio.

No terminar el video mostrando solo `accepted`; muestra el mensaje recibido o el estado final `delivered`/`read`.

## Video 2 — WhatsApp Business Management

Duración recomendada: 1–3 minutos.

1. Abrir la misma aplicación y la ruta `App Review`.
2. Repetir o mostrar el flujo de Embedded Signup hasta que el número quede conectado.
3. Mostrar en Suscripta el teléfono conectado, WABA ID, Phone Number ID, nombre verificado, estado, quality rating y demás datos que provienen de Graph API.
4. Mostrar la lista de plantillas reales con nombre, idioma, categoría y estado.
5. Crear una plantilla de prueba desde la aplicación o mostrar la plantilla enviada a Meta para aprobación.
6. Explicar: `whatsapp_business_management` se usa para conectar y consultar los activos WhatsApp Business del negocio, incluyendo el número y las plantillas.

## Texto para App Review

Suscripta is a SaaS application for subscription businesses that send payment-reminder templates through the merchant's own WhatsApp Business number. A business connects its number through Meta WhatsApp Embedded Signup. Suscripta then reads the connected phone profile and approved templates from Meta and sends approved reminder templates to opted-in subscribers.

`whatsapp_business_management` is used to onboard the business through Embedded Signup and read the connected WhatsApp Business phone profile, WABA information, and approved message templates inside Suscripta.

`whatsapp_business_messaging` is used to send an approved reminder template from the connected business phone number to an opted-in recipient. The review video shows the Meta login and permission grant, the connected assets in Suscripta, the send action, and the message received by the test recipient.

The authorization code is exchanged server-side. Access tokens are encrypted at rest and are never returned to the browser. The webhook validates Meta's `X-Hub-Signature-256` before persisting delivery events.
