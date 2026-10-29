import { event } from './config.js';
const $=id=>document.getElementById(id);
const text=(id,value)=>$(id).textContent=value;
for(const key of ['parents','arrival','date','time','venue','address','message']) text(key,event[key+'Label']||event[key]);
text('signature',`With love, ${event.parents}`);text('hero-date',event.dateLabel.toUpperCase());
$('directions').href=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue+', '+event.address)}`;
for(const registry of event.registries){const a=document.createElement('a');a.className='registry-link';a.href=registry.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=registry.name;const arrow=document.createElement('span');arrow.textContent='↗';a.append(arrow);$('registry-links').append(a);}
const opening=$('opening');let played=false;try{played=sessionStorage.getItem('invitation-opened')==='yes';sessionStorage.setItem('invitation-opened','yes');}catch{}
const finish=()=>{opening.remove();document.documentElement.classList.add('invitation-ready');};
if(played||matchMedia('(prefers-reduced-motion: reduce)').matches) finish();else{ $('skip').tabIndex=0;$('skip').addEventListener('click',finish);setTimeout(finish,3400); }
if('IntersectionObserver' in window){document.documentElement.classList.add('js');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
const icsEscape=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const utc=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
$('calendar').addEventListener('click',()=>{const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//A Little Celebration//Invitation//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:baby-shower-${event.date}@alittlecelebration`,`DTSTAMP:${utc(new Date())}`,`DTSTART:${utc(event.start)}`,`DTEND:${utc(event.end)}`,`SUMMARY:${icsEscape('Baby Shower — '+event.parents)}`,`LOCATION:${icsEscape(event.venue+', '+event.address)}`,`DESCRIPTION:${icsEscape('Join us to celebrate '+event.parents+' and their little one!')}`,'END:VEVENT','END:VCALENDAR'];const fold=line=>{const parts=[];let part='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>75){parts.push(part);part=' ';size=1;}part+=char;size+=bytes;}parts.push(part);return parts.join('\r\n');};const blob=new Blob([lines.map(fold).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='a-little-celebration.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const form=$('rsvp-form');let pending=false,id=crypto.randomUUID(),fingerprint='',submittedAt=new Date().toISOString();
form.addEventListener('change',()=>{const accepted=form.elements.attendance.value==='accepted';$('attendees').hidden=!accepted;$('count').required=accepted;$('guest-names').hidden=!accepted||Number($('count').value)<=1;});
$('count').addEventListener('input',()=>{$('guest-names').hidden=Number($('count').value)<=1;});
form.addEventListener('submit',async e=>{e.preventDefault();if(pending||!form.reportValidity())return;
const data={name:form.elements.name.value,attendance:form.elements.attendance.value,count:Number($('count').value),guests:$('guests').value,wish:$('wish').value,website:form.elements.website.value};
const next=JSON.stringify(data);if(fingerprint&&fingerprint!==next){id=crypto.randomUUID();submittedAt=new Date().toISOString();}fingerprint=next;data.id=id;data.submittedAt=submittedAt;
pending=true;const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='Sending your little note…';text('form-error','');
try{const res=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok||!result.ok)throw Error(result.error||'Unable to send. Please try again.');form.hidden=true;text('confirmation-title',data.attendance==='accepted'?'We can’t wait to celebrate with you!':'Thank you for sending your love!');$('confirmation').hidden=false;$('confirmation').focus();}
catch(error){text('form-error',error.message||'Please check your connection and try again.');}
finally{pending=false;button.disabled=false;button.innerHTML='Send with love <span>↗</span>';}
});
