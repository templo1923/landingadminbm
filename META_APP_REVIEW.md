# Meta App Review Resubmission Guide

> The exact recording script and submission text are in `APP_REVIEW_SUBMISSION.md`. Run `supabase_app_review_hardening.sql` before testing the production build.

## Why Meta rejected the app

Meta did not reject the product use case. The rejection reason was incomplete evidence.

The reviewer explicitly said the screencast did not show:

- The full Meta login flow
- A user granting the requested permissions
- The complete in-app experience for the requested permissions

For this app, that means the video must prove both permissions separately:

- `whatsapp_business_management`
  - Connect the business number through Embedded Signup
  - Read business assets from Meta inside the app
  - Show approved templates or phone number profile details loaded from Meta
- `whatsapp_business_messaging`
  - Send a real WhatsApp template message from the connected business number
  - Show the recipient device receiving the message

## Product changes added for resubmission

The app now includes an English review flow at `/dashboard/review` that demonstrates:

- Embedded Signup entry point
- Connected business phone details loaded from Meta
- Approved WhatsApp templates loaded from Meta
- Live template sending from Suscripta

The OAuth callback was also hardened so the WABA ID and Phone Number ID survive the signup redirect.

## Recording script

Record the UI in English.

1. Start on `/dashboard/review`
2. Explain that Suscripta is a SaaS for subscription payment reminders on WhatsApp
3. Click `Connect with Meta`
4. Show the full Meta login flow
5. Show the permission grant and business selection flow
6. Return to Suscripta and show:
   - Connected phone number
   - Phone profile details loaded from Meta
   - Approved templates loaded from Meta
7. In `Send a live reminder`:
   - Enter a real recipient test phone
   - Select an approved template
   - Fill template variables
   - Click `Send test reminder`
8. Show the success state in Suscripta
9. Show the recipient device receiving the WhatsApp message
10. State clearly:
   - `whatsapp_business_management` is used to onboard and read WhatsApp business assets
   - `whatsapp_business_messaging` is used to send approved reminder templates to opted-in subscribers

## Submission notes to paste into App Review

Use case summary:

Suscripta is a SaaS that helps subscription businesses reduce churn by sending payment reminder templates through the merchant's own WhatsApp Business number. Businesses connect their number using Embedded Signup, manage their WhatsApp assets inside Suscripta, and send approved reminder templates to opted-in subscribers.

Permission usage:

- `whatsapp_business_management`
  - Used to connect the business phone number through Embedded Signup
  - Used to read business phone number details and approved WhatsApp templates from Meta so the merchant can manage reminder operations inside Suscripta
- `whatsapp_business_messaging`
  - Used to send approved reminder templates from the connected business phone number to opted-in subscribers

If asked about auth:

This app uses Meta Embedded Signup on the frontend to connect the business account and then exchanges the returned authorization code on the backend to store the business-scoped token securely. The full frontend login and permission grant flow is shown in the screencast.

## Preconditions before recording

- At least one approved template exists in the connected WABA
- The recipient phone is valid and opted in
- The connected phone number is fully registered and can send messages
- The app UI is shown in English during the recording
- The recording includes captions or spoken explanation for each step
