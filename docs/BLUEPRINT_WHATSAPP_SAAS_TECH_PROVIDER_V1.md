# Blueprint V1: Validar un SaaS de WhatsApp como Tech Provider

## Objetivo

Esta guia resume el camino practico para validar un SaaS construido sobre WhatsApp Business Platform cuando el producto opera en modo SaaS y cada cliente conecta su propio numero mediante Meta Embedded Signup.

No es teoria. Esta basada en problemas reales que aparecieron al construir Suscripta y en lo que hubo que corregir para dejar el producto listo para App Review.

## Para quien sirve

- Founders construyendo un SaaS sobre WhatsApp Cloud API.
- Agencias que quieren pasar de automatizaciones internas a un producto multi-cliente.
- Equipos que usan Embedded Signup para conectar el numero del negocio del cliente.
- Personas que necesitan aprobar permisos como `whatsapp_business_management` y `whatsapp_business_messaging`.

## Que espera ver Meta en un SaaS real

Meta no revisa solo si tu caso de uso es permitido. Revisa si tu aplicacion demuestra de forma clara:

- quien es el usuario final del producto,
- que cuenta o numero conecta,
- que permisos concede,
- que activos lee tu app desde Meta,
- que mensajes envia tu app,
- y como se ve la experiencia completa dentro del producto.

Si el video, las notas y la experiencia real no coinciden exactamente, lo normal es que la revision sea rechazada aunque el caso de uso si sea valido.

## Patron SaaS recomendado

El patron mas defendible para revision es este:

1. El cliente entra a tu SaaS.
2. Conecta su propia cuenta de WhatsApp Business mediante Meta Embedded Signup.
3. Tu backend intercambia el codigo de autorizacion de forma segura.
4. Persistes `waba_id`, `phone_number_id` y el token necesario para operar.
5. Tu producto lee activos reales desde Meta:
   - perfil del numero,
   - plantillas aprobadas,
   - estado de la conexion,
   - eventos de mensajes.
6. Tu producto envia mensajes reales desde el numero conectado del cliente.
7. Tu sistema recibe webhooks de estados y refleja resultados reales.

Eso es lo que separa un producto SaaS de verdad de una interfaz bonita encima de un par de API calls.

## Lo minimo que debe ser real antes de pedir permisos

Antes de mandar App Review, estas piezas deben funcionar de verdad:

- Embedded Signup completo.
- Intercambio de codigo exitoso.
- Persistencia de la conexion.
- Lectura real de plantillas desde Meta.
- Envio real de una plantilla aprobada.
- Recepcion de estados por webhook.
- UI mostrando activos reales en lugar de puro mock.

Si todavia dependes de Postman, n8n o logs manuales para demostrar el flujo principal, aun no estas listo para revision.

## Errores mas comunes que te van a rechazar

### 1. Video incompleto

El rechazo mas comun es mostrar solo una parte del flujo. El screencast correcto debe incluir:

- login completo de Meta,
- grant de permisos,
- seleccion de negocio,
- seleccion o vinculacion del numero,
- regreso a tu app,
- activos reales cargados en tu app,
- seleccion de plantilla,
- envio real,
- mensaje recibido en el dispositivo destino.

### 2. Notas vagas

Frases como estas ayudan poco:

- "usamos WhatsApp para mandar mensajes"
- "gestionamos activos de WhatsApp"

Meta espera que describas con precision:

- quien conecta la cuenta,
- como la conecta,
- que recupera tu app,
- que envia tu app,
- y por que eso requiere cada permiso.

### 3. Pantallas falsas o demasiado mockeadas

Si la revision entra a tu app y todo parece estatico, la lectura natural del reviewer es que realmente no usas esos permisos como dices.

Las zonas criticas deben ser reales:

- conexion del numero,
- plantillas,
- envios,
- conversaciones o estados de mensajes.

### 4. Entorno roto en produccion

Meta no va a depurar por ti. Cualquier fallo operativo te deja fuera:

- `redirect_uri` inconsistente,
- `App ID` y `App Secret` que no corresponden,
- variables faltantes en Vercel,
- token no persistido,
- webhook no configurado,
- numero aun pendiente o sin registrar,
- problemas de billing o elegibilidad del WABA.

## Recomendacion de arquitectura para pasar revision

### Tener una ruta exclusiva para review

Es util construir una pantalla o ruta especifica para App Review. Su objetivo no es ser la experiencia final del usuario, sino demostrar de forma lineal y clara:

- onboarding,
- lectura de activos,
- envio de mensaje.

Eso reduce muchisimo el riesgo de que el reviewer se pierda o no vea el flujo completo.

### Separar herramientas internas de la superficie de review

Durante la construccion suelen aparecer utilidades como:

- registros manuales del numero,
- suscripcion del app al WABA,
- bloques de debug,
- verificadores de webhook,
- diagnosticos de conexion.

Eso sirve para construir, pero no conviene dejarlo visible en la pantalla del review final.

### Hacer que el producto refleje datos reales

Incluso si algunas secciones siguen en modo MVP, el reviewer debe ver que las zonas criticas ya operan con datos verdaderos:

- conversaciones con eventos reales,
- plantillas reales,
- envios reales,
- estados reales.

## Checklist tecnico antes de grabar

- La app esta desplegada en produccion.
- La ruta de review abre sin 404.
- El App ID, App Secret y Config ID pertenecen a la misma app.
- Embedded Signup completa sin errores.
- La conexion queda guardada correctamente.
- El numero conectado aparece en la UI.
- Existe al menos una plantilla aprobada.
- El webhook de WhatsApp esta verificado.
- El webhook recibe `messages` y `statuses`.
- La app muestra resultados reales de envio o entrega.
- El numero y el WABA estan operativamente listos.

## Checklist funcional antes de mandar App Review

- La interfaz esta en ingles o es claramente entendible para un reviewer angloparlante.
- El video dura poco y va en linea recta.
- El flujo mostrado coincide exactamente con el texto de App Review.
- El permiso `whatsapp_business_management` se demuestra leyendo activos reales.
- El permiso `whatsapp_business_messaging` se demuestra enviando una plantilla real.
- El mensaje final se muestra en el dispositivo destino.
- No aparecen errores internos, bloques de debug ni herramientas de troubleshooting.

## Que aprendimos sobre permisos

### `whatsapp_business_management`

No basta con decir que "gestionas activos". Debes demostrar visualmente que tu app:

- recupera el numero conectado,
- recupera el WABA asociado,
- carga plantillas aprobadas,
- y usa esos datos dentro del flujo del producto.

### `whatsapp_business_messaging`

No basta con mostrar que "puedes mandar mensajes". Debes probar:

- que el numero fue conectado por el negocio,
- que la app selecciona una plantilla aprobada,
- que el mensaje sale desde el numero del negocio,
- y que llega al destinatario final.

## Problemas reales que vale la pena anticipar

### OAuth y Embedded Signup

- El intercambio del `code` puede romperse por `redirect_uri` mal alineado.
- El `code` si puede llegar al backend y aun asi fallar el exchange.
- Si el popup de signup usa un flujo sin `redirect_uri`, no debes forzar uno distinto en el backend.

### Operacion del numero

- Un numero puede verse conectado y aun no estar operativo.
- Puede requerir registro adicional, suscripcion del app al WABA o configuracion en Meta.
- En algunos casos el verdadero bloqueo termina siendo billing o elegibilidad del negocio.

### Webhooks

- "accepted" no significa "delivered".
- Si no guardas webhook statuses, estas ciego.
- Si no guardas mensajes entrantes, tu inbox parece falso.

### Datos locales desfasados

- Si el usuario elimina el numero desde Meta, tu base local puede seguir marcandolo como conectado.
- Debes revalidar la conexion contra Meta y desactivar registros locales si el activo ya no existe.

## Que conviene ensenar en un MVP publico

Para un video de comunidad o una demo publica, este scope es suficiente y creible:

- Inicio
- Conversaciones
- Plantillas
- Envios

`Contactos` puede seguir mas liviano si todavia no forma parte del core del caso de uso.

## Recomendaciones para la grabacion del video

- Usa ingles en UI y narracion o al menos en subtitulos.
- No improvises; sigue un orden claro.
- No muestres tooling interno.
- No te quedes en "accepted"; ensena el mensaje recibido.
- Manten el video en 2 a 4 minutos.

## Orden recomendado del screencast

1. Entra a la ruta de review o a la ruta del producto que demuestre el flujo.
2. Explica brevemente que hace tu SaaS.
3. Ejecuta Embedded Signup completo.
4. Muestra el numero conectado dentro de tu app.
5. Muestra las plantillas reales cargadas desde Meta.
6. Selecciona una plantilla aprobada.
7. Envia un mensaje real.
8. Ensena el mensaje recibido en el telefono destino.

## Consejos para una comunidad que quiere construir algo similar

- No pidas permisos demasiado pronto.
- No dependas de workflows externos como n8n para el flujo core si tu producto promete ser SaaS.
- Lleva el flujo completo dentro de tu producto lo antes posible.
- Construye observabilidad antes de escalar features.
- Separa claramente:
  - onboarding tecnico,
  - superficie de revision,
  - producto final del usuario.

## Regla final

Si tu SaaS demuestra de forma limpia:

- onboarding real,
- gestion real de activos,
- envio real de plantillas,
- y estados reales del mensaje,

ya estas mucho mas cerca de validar como un SaaS estilo Tech Provider frente a Meta.
