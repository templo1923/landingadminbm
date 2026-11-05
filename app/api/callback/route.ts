import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest){
  // Redirige a la página de callback con el code
  const code = req.nextUrl.searchParams.get('code');
  if(!code) return NextResponse.json({error:'no code'});
  // Guardamos en cookie y redirigimos a /callback page que hace el exchange
  const url = new URL('/callback', req.nextUrl.origin);
  url.searchParams.set('code', code);
  return NextResponse.redirect(url);
}
