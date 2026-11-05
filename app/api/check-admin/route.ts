import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest){
  const business_id = req.nextUrl.searchParams.get('business_id') || process.env.BUSINESS_ID || "832691819931306";
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "onboarding@sellerchat.ai").toLowerCase();
  const GRAPH_VERSION = "v20.0";
  const token = req.cookies.get('user_token')?.value;

  if(!token) return NextResponse.json({error:'no token'});

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/business_users?access_token=${token}`);
  const data = await res.json();

  let isAdmin = false;
  if(data.data){
    for(const u of data.data){
      if((u.email||'').toLowerCase() === ADMIN_EMAIL) isAdmin = true;
    }
  }

  const pending = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${business_id}/pending_users?access_token=${token}`);
  const pendingData = await pending.json();

  return NextResponse.json({isAdmin, business_id, admin_email: ADMIN_EMAIL, business_users: data, pending: pendingData});
}
