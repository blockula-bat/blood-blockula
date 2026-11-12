// Price, liquidity and volume charts drawn as plain SVG from verified pool history.
import {decode,rebuild} from './history.mjs';
const W=512,TOP=14,BOT=172,NS='http://www.w3.org/2000/svg',DAY=86400000;
const num=(v,d=4)=>v.toLocaleString('en-US',{maximumSignificantDigits:d});
const fang=n=>Number(n)/1e9;
export const when=(ms,full=true)=>new Date(ms).toLocaleString('en-US',full?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{hour:'numeric',minute:'2-digit'});
// Fetches the pool's transaction history once, then only newer pages; rebuilds and checks against live reserves each sync.
export function poolHistory(rpc,program){
 let ops=[],ids=new Set(),scanned=null,running=false,retryAt=0;const h={result:null,error:null};
 h.sync=async(live,height)=>{
  if(running||Date.now()<retryAt||(scanned!==null&&height<=scanned&&h.result))return;running=true;
  try{
   const fresh=[];let before='',done=false;
   for(let i=0;i<200&&!done;i++){
    const r=await fetch(`${rpc}/api/account/${program}/txs?limit=100${before?'&before='+before:''}`,{cache:'no-store'});if(!r.ok)throw Error(`Pool history unavailable (${r.status}).`);const page=await r.json();
    for(const tx of page.txs){if(scanned!==null&&tx.height<=scanned){done=true;break;}fresh.push(tx);}
    if(!page.next)done=true;else before=page.next;
   }
   if(!done)throw Error('Pool history exceeds this reader’s pagination limit.');
   const added=fresh.filter(t=>t.height<=height&&!ids.has(t.id)).reverse();added.forEach(t=>ids.add(t.id));
   ops=ops.concat(added.flatMap(t=>decode(t,program)));
   h.result=rebuild(ops,live,height);h.result.height=height;scanned=height;h.error=null;
  }catch(e){h.error=e.message;h.result=null;ops=[];ids=new Set();scanned=null;retryAt=Date.now()+20000;}
  finally{running=false;}
 };
 return h;
}
// Keep the state immediately before a time window as its baseline, not the launch-day price.
export function chartWindow(points,clock,liveHeight,windowMs=DAY){
 const all=points.map(p=>({...p,t:clock(p.height)}));
 if(!all.length)return {pts:[],t0:clock(liveHeight),t1:clock(liveHeight)+1};
 const t1=Math.max(clock(liveHeight),all.at(-1).t+1),t0=windowMs?Math.max(all[0].t,t1-windowMs):all[0].t;
 const before=all.filter(p=>p.t<t0).at(-1),pts=all.filter(p=>p.t>=t0);
 if(before)pts.unshift({...before,t:t0,vol:0n,method:'start',id:null});
 return {pts,t0,t1};
}
const el=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;return e;};
// Draw `view` ('price'|'liquidity'|'volume'); returns hover handler data.
export function drawChart(svg,view,history,clock,live,liveHeight,windowMs=DAY){
 svg.replaceChildren(el('defs',{}),el('path',{class:'grid',d:'M0 30H512M0 80H512M0 130H512M0 180H512'}));
 svg.firstChild.innerHTML='<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f04455" stop-opacity=".2"/><stop offset="1" stop-color="#f04455" stop-opacity="0"/></linearGradient>';
 const res=history.result;
 if(!res||!live){svg.append(el('text',{x:256,y:100,class:'chart-empty'},history.error?'Pool history unavailable · retrying':'Loading pool history…'));return null;}
 if(!res.points.length){svg.append(el('text',{x:256,y:100,class:'chart-empty'},'No pool activity yet'));return null;}
 const {pts,t0,t1}=chartWindow(res.points,clock,liveHeight,windowMs),x=t=>(t-t0)/(t1-t0)*W;
 const yScale=(lo,hi)=>{if(hi===lo){const pad=Math.max(Math.abs(lo)*.05,1e-12);lo-=pad;hi+=pad;}const pad=(hi-lo)*.12;lo=Math.max(0,lo-pad);hi+=pad;return v=>BOT-(v-lo)/(hi-lo)*(BOT-TOP);};
 if(view==='volume'){
  const span=t1-t0,size=[3e5,9e5,36e5,72e5,144e5,432e5,DAY,7*DAY].find(s=>span/s<=48)||7*DAY,n=Math.ceil(span/size),bars=Array.from({length:n},(_,i)=>({t:t0+i*size,end:Math.min(t1,t0+(i+1)*size),v:0n,swaps:0}));
  for(const p of pts)if(p.vol){const b=bars[Math.min(n-1,Math.floor((p.t-t0)/size))];b.v+=p.vol;b.swaps++;}
  const max=bars.reduce((m,b)=>b.v>m?b.v:m,0n),y=v=>BOT-(max?fang(v)/fang(max):0)*(BOT-TOP-6),bw=W/n;
  for(const b of bars)if(b.v)svg.append(el('rect',{x:x(b.t)+bw*.15,y:y(b.v),width:Math.max(1.5,bw*.7),height:BOT-y(b.v),rx:1.5,class:'chart-bar'}));
  svg.append(el('path',{d:`M0 ${BOT}H${W}`,class:'chart-base'}));
  if(max)svg.append(el('text',{x:522,y:TOP+8,class:'chart-axis'},num(fang(max),3)));svg.append(el('text',{x:522,y:BOT,class:'chart-axis'},'0'));
  return {x,t0,t1,at:t=>{const b=bars[Math.min(n-1,Math.max(0,Math.floor((t-t0)/size)))];return {x:x(b.t)+bw/2,y:y(b.v),text:`${when(b.t)}–${when(b.end,false)} · ${num(fang(b.v),6)} FANG · ${b.swaps} swap${b.swaps===1?'':'s'}`};}};
 }
 const val=p=>view==='price'?Number(p[0])/Number(p[1]):fang(2n*p[0]);
 const series=[...pts.map(p=>({t:p.t,v:val(p.p),p:p.p,method:p.method})),{t:t1,v:val(live),p:live,method:'now'}];
 const vs=series.map(s=>s.v),lo=Math.min(...vs),hi=Math.max(...vs),y=yScale(lo,hi);
 let d=`M${x(series[0].t)} ${y(series[0].v)}`;for(const s of series.slice(1))d+=`H${x(s.t)}V${y(s.v)}`;
 svg.append(el('path',{d:`${d}V${BOT+13}H0Z`,fill:'url(#fade)'}),el('path',{d,class:'chart-line'}),el('circle',{cx:W,cy:y(series.at(-1).v),r:5,class:'chart-dot'}));
 svg.append(el('text',{x:522,y:y(hi)+3,class:'chart-axis'},num(hi)),el('text',{x:522,y:y(lo)+3,class:'chart-axis'},num(lo)));
 const unit=view==='price'?'FANG / BLOOD':'FANG TVL';
 return {x,t0,t1,at:t=>{let s=series[0];for(const c of series)if(c.t<=t)s=c;const extra=view==='liquidity'?` · ${num(fang(s.p[0]),6)} FANG + ${num(fang(s.p[1]),6)} BLOOD`:'';return {x:x(Math.max(t0,Math.min(t,t1))),y:y(s.v),text:`${when(t)} · ${num(s.v,view==='price'?6:7)} ${unit}${extra}`};}};
}
