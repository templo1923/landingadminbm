import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest){
  const business_id = req.nextUrl.searchParams.get('business_id') || process.env.BUSINESS_ID || "832691819931306";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "onboarding@sellerchat.ai";
  const GRAPH_VERSION = "v20.0";
  
  const cookieToken = req.cookies.get('user_token')?.value;
  if(!cookieToken) return NextResponse.json({error:'No user_token, haz login primero'},{status:400});

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/pending_users`;
  const form = new URLSearchParams();
  form.append('email', ADMIN_EMAIL);
  form.append('role', 'ADMIN');
  form.append('access_token', cookieToken);

  const res = await fetch(url, {method:'POST', body: form});
  const data = await res.json();
  return NextResponse.json(data);
}
