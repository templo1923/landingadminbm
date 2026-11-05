import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest){
  const code = req.nextUrl.searchParams.get('code');
  const APP_ID = process.env.APP_ID || "811281598468466";
  const APP_SECRET = process.env.APP_SECRET || "adc3e9fa8df0abd2f9d0400d96fb9193";
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || `${req.nextUrl.origin}/api/callback`;
  const GRAPH_VERSION = "v20.0";

  if(!code) return NextResponse.json({error:'no code'},{status:400});

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if(!data.access_token){
    return NextResponse.json(data);
  }

  // Listar businesses
  const bizRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/businesses?access_token=${data.access_token}`);
  const bizData = await bizRes.json();

  // Guardar token en cookie para siguientes llamadas (simple)
  const response = NextResponse.json({token: data.access_token, businesses: bizData.data || [], raw: bizData});
  response.cookies.set('user_token', data.access_token, {httpOnly:true, maxAge:3600});
  return response;
}
