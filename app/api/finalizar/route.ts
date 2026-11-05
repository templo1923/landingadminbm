import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const form = await req.formData();
  const data = {
    business_id: form.get('business_id'),
    phone: form.get('phone'),
    verified_name: form.get('verified_name'),
    callback_url: form.get('callback_url'),
    verify_token: form.get('verify_token'),
    pin: form.get('pin'),
    system_user_id: process.env.SYSTEM_USER_ID || "122096076987112136",
    app_id: process.env.APP_ID || "811281598468466",
    timestamp: new Date().toISOString()
  };
  
  // Aquí guardarías en tu DB (por ahora solo devolvemos)
  return NextResponse.json({
    message: 'Datos guardados, ahora genera token y suscribe app',
    data,
    next_steps: [
      `GET /{business_id}/owned_whatsapp_business_accounts`,
      `POST /${data.system_user_id}/access_tokens con app_id ${data.app_id}`,
      `POST /{WABA_ID}/subscribed_apps override_callback_uri=${data.callback_url}`
    ]
  });
}
