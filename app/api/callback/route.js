import { NextResponse } from 'next/server';
export async function GET(req){
  const code = req.nextUrl.searchParams.get('code');
  if(!code) return NextResponse.json({error:'no code'});
  const url = new URL('/callback', req.nextUrl.origin);
  url.searchParams.set('code', code);
  return NextResponse.redirect(url);
}
