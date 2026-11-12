// api/_lib.js — Helpers compartidos: Supabase, auth, Meta Graph, crypto, audit.
// Secrets SOLO en env de Vercel, nunca en frontend.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
function dbClient(){ return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{ persistSession:false } }); }
const db = dbClient();
function G(path){ return `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION||'v21.0'}/${path}`; }
async function graph(url, opts={}){ const r = await fetch(url, opts); const j = await r.json(); if(!r.ok) throw new Error(j.error?.message||`Meta error ${r.status}`); return j; }
function enc(text){ const key = Buffer.from(process.env.TOKEN_ENC_KEY,'base64'); const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); const encData = Buffer.concat([c.update(text,'utf8'), c.final()]); const tag = c.getAuthTag(); return Buffer.concat([iv, tag, encData]).toString('base64'); }
function dec(b64){ const key = Buffer.from(process.env.TOKEN_ENC_KEY,'base64'); const buf = Buffer.from(b64,'base64'); const iv = buf.subarray(0,12); const tag = buf.subarray(12,28); const data = buf.subarray(28); const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag); return Buffer.concat([d.update(data), d.final()]).toString('utf8'); }
async function authUser(req){ const tok = (req.headers.authorization||'').replace('Bearer ',''); if(!tok) return null; const { data } = await db.auth.getUser(tok); return data?.user||null; }
async function ensureOrg(user){ const { data: org } = await db.from('orgs').select('id').eq('owner_user_id', user.id).maybeSingle(); if(org) return org.id; const { data: n } = await db.from('orgs').insert({ owner_user_id: user.id, name: 'WhatKiamber' }).select('id').single(); return n.id; }
async function audit(orgId, actor, action, meta={}){ try{ await db.from('audit_log').insert({ org_id: orgId, actor, action, meta }); }catch(e){ console.error('audit fail', e.message); } }
module.exports = { db, G, graph, enc, dec, authUser, ensureOrg, audit };
