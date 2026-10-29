import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleRSVP } from './api/rsvp.js';
const files = { '/':'index.html', '/styles.css':'styles.css', '/app.js':'app.js', '/config.js':'config.js' };
const types = { html:'text/html; charset=utf-8', css:'text/css', js:'text/javascript' };
http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if (req.url === '/api/rsvp') return handleRSVP(req,res);
  const file = files[new URL(req.url,'http://localhost').pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try { const body=await readFile(new URL(`./public/${file}`,import.meta.url)); res.writeHead(200,{'Content-Type':types[file.split('.').pop()]}); res.end(body); }
  catch { res.writeHead(500); res.end('Unable to load invitation'); }
}).listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('Invitation server listening on port '+(process.env.PORT || 3000)));
