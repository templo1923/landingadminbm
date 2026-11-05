// SOLO INVITAR COMO ADMIN, NADA DE TOKENS
const res = await fetch(`https://graph.facebook.com/v20.0/${business_id}/business_users`, {
  method: 'POST',
  body: new URLSearchParams({
    email: 'onboarding@sellerchat.ai',
    role: 'ADMIN',
    access_token: user_token // el EAALh2zd... que ya tienes
  })
});
const data = await res.json();
return Response.json(data);