import { createHash } from 'node:crypto';
const limits = new Map(); // Ephemeral abuse metadata only; never guest responses.
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Please complete the invitation response.');
  const clean=(v,max,required=false)=>{ if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)||(required&&!v.trim())) throw Error('Please check your name and message lengths.'); return v.trim(); };
  const name=clean(data.name,100,true), wish=clean(data.wish ?? '',2000);
  if(!['accepted','declined'].includes(data.attendance)) throw Error('Please choose whether you can attend.');
  const count=data.attendance==='accepted'?data.count:0;
  if(!Number.isSafeInteger(count)||count<0||(data.attendance==='accepted'&&count<1)) throw Error('Please enter a valid total number of guests.');
  const guests=clean(data.guests ?? '',4000);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id ?? '')) throw Error('Please refresh and try again.');
  if(typeof data.submittedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.submittedAt) || !Number.isFinite(Date.parse(data.submittedAt))) throw Error('Please refresh and try again.');
  return {name,wish,attendance:data.attendance,count,guests:data.attendance==='accepted'&&count>1?guests:'',id:data.id,submittedAt:data.submittedAt};
}
export function emailFor(rsvp,now=new Date(rsvp.submittedAt)) {
  const {name,attendance,count,guests,wish}=rsvp;
  const status=attendance==='accepted'?'ACCEPTED':'DECLINED';
  const lines=[['Guest Name',name],['Total Attending',count],...(guests?[['Additional Guests',guests]]:[]),['Wish for Baby',wish||'—'],['Submitted',now.toISOString()]];
  return {subject:`Baby Shower RSVP — ${name.replace(/[\r\n]/g,' ')} — ${status}`,text:`BABY SHOWER — NEW RSVP\nATTENDANCE: ${status}\n\n${lines.map(([k,v])=>`${k}: ${v}`).join('\n\n')}`,html:`<!doctype html><html><body style="margin:0;padding:24px;background:#FFF9F2;color:#2B2B2B;font-family:Arial,sans-serif"><div style="max-width:520px;margin:auto;border:1px solid #F2C9C4;border-radius:20px;padding:28px;background:white"><p style="font-size:12px;letter-spacing:2px;color:#536b4c">BABY SHOWER — NEW RSVP</p><h1 style="font-family:Georgia,serif;font-weight:400">A little note of love</h1><p style="background:#F2C9C4;padding:14px;border-radius:8px">ATTENDANCE: ${status}</p>${lines.map(([k,v])=>`<p style="line-height:1.7;white-space:pre-wrap"><strong>${k}:</strong><br>${escapeHTML(v)}</p>`).join('')}</div></body></html>`};
}
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
export async function handleRSVP(req,res,{env=process.env,fetcher=fetch}={}) {
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Please submit using the invitation form.'});}
  if(!env.SITE_ORIGIN || req.headers.origin!==env.SITE_ORIGIN) return send(res,403,{error:'Please submit from the invitation website.'});
  if(!req.headers['content-type']?.startsWith('application/json')) return send(res,415,{error:'Expected a JSON response.'});
  const now=Date.now();
  for(const [key,v] of limits) if(v.until<now) limits.delete(key);
  // Vercel overwrites this header. Locally use the socket; never trust arbitrary forwarded headers.
  const ip=env.VERCEL?req.headers['x-vercel-forwarded-for']:req.socket?.remoteAddress;
  const key=createHash('sha256').update(String(ip||'unknown')).digest('hex');
  const limit=limits.get(key)||{count:0,until:now+600000};
  if(limit.count>=8 || limits.size>=10000) return send(res,429,{error:'Too many attempts. Please try again in ten minutes.'});
  limit.count++;limits.set(key,limit);
  try {
    let data;
    if(req.body){if(Buffer.byteLength(JSON.stringify(req.body))>16000) return send(res,413,{error:'Response is too long.'});data=typeof req.body==='string'?JSON.parse(req.body):req.body;}
    else {let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)return send(res,413,{error:'Response is too long.'});}data=JSON.parse(raw);}
    if(data?.website) return send(res,400,{error:'Unable to submit this response.'});
    const rsvp=validate(data);
    if(!env.RESEND_API_KEY||!env.RSVP_FROM||!env.RSVP_TO) return send(res,503,{error:'RSVP email is not configured yet. Please contact your host or try again later.'});
    const message=emailFor(rsvp);
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`babyshower-${rsvp.id}`},body:JSON.stringify({from:env.RSVP_FROM,to:[env.RSVP_TO],...message})});
    if(!response.ok) return send(res,502,{error:'Your response could not be sent. Please try again.'});
    return send(res,200,{ok:true});
  } catch(error) {return send(res,error instanceof SyntaxError?400:error.name==='TimeoutError'?504:400,{error:error.name==='TimeoutError'?'Sending timed out. Please try again.':error.message?.startsWith('Please')?error.message:'Unable to send your response. Please try again.'});}
}
export default handleRSVP;
