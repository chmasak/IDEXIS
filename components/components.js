/* components/
   ===================================================================== */
// Placeholder document drawn in SVG. Replace with S.evidence.url (or MATLAB output URL) via imgSrc().
const placeholderDoc=`<svg class="card" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="400" fill="#22211f"/><rect x="24" y="24" width="592" height="352" fill="#2b2925" stroke="#4a463f"/>
<rect x="40" y="112" width="180" height="200" fill="#3a3732"/><circle cx="130" cy="188" r="38" fill="#57524a"/><path d="M60 312c10-60 140-60 140 0z" fill="#57524a"/>
<text x="40" y="70" fill="#b9a47c" font-family="serif" font-size="22" letter-spacing="4">IDENTITY CARD</text>
<g fill="#6e6a62"><rect x="256" y="124" width="200" height="12"/><rect x="256" y="156" width="300" height="12"/><rect x="256" y="188" width="240" height="12"/><rect x="256" y="220" width="280" height="12"/><rect x="256" y="252" width="160" height="12"/><rect x="40" y="336" width="560" height="16"/></g></svg>`;
const imgSrc=()=>S.evidence?`<img alt="Evidence" src="${S.evidence.url}">`:placeholderDoc;
const filters={original:'',enhanced:'contrast(1.25) brightness(1.08)',edge:'grayscale(1) contrast(4) invert(1) brightness(.6)',ela:'saturate(0) contrast(2.4) brightness(.5) sepia(1) hue-rotate(-30deg)',noise:'grayscale(1) contrast(3) brightness(.7) blur(.4px)',fft:'grayscale(1) blur(6px) contrast(2.2) brightness(.8)'};
const regionSvg=(sel)=>`<svg class="ov" viewBox="0 0 100 100" preserveAspectRatio="none">${(S.heat?.regions||[]).map(r=>{const[x,y,w,h]=r.bbox.map(n=>n*100);return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(166,52,70,${.12+r.score*.3})" stroke="#c4586a" stroke-width=".3" ${sel===r.id?'stroke-width=".7"':''}/><text x="${x+1}" y="${y-1.2}" fill="#e6b0b9" font-size="2.6" font-family="IBM Plex Mono">R${r.id}</text>`}).join('')}</svg>`;
const Metric=(m,k)=>`<div><div class="k">${m.label}</div><div class="v ${m.risk?'warn':''}">${pct(m.value)}<span class="k">${m.unit}</span></div><div class="bar"><i class="${m.risk?'warn':''}" style="width:${pct(m.value)}%"></i></div></div>`;
const Stat=(k,v)=>`<div><div class="k">${k}</div><div class="v">${v}</div></div>`;
const Stage=(f,over='')=>`<div class="stage"><div style="position:absolute;inset:0;filter:${filters[f]||''}">${imgSrc()}</div>${over}</div>`;
const Compare=(id,fB,label)=>`<div class="stage cmp" id="${id}"><div style="position:absolute;inset:0">${Stage(fB.f,fB.over)}</div><div class="top" style="clip-path:inset(0 50% 0 0)">${Stage('original')}</div><div class="hd" style="left:50%"></div><span class="cap">Original</span><span class="cap r">${label}</span></div>`;
const Pipeline=()=>`<ul class="steps">${MOCK.steps.map((s,i)=>`<li class="${i<S.step?'done':i===S.step?'run':''}"><span>${s}</span><span class="mono">${i<S.step?'✓':i===S.step?'…':''}</span></li>`).join('')}</ul>
<div class="bar" style="margin-top:20px"><i style="width:${S.step/MOCK.steps.length*100}%"></i></div>`;
function wireCompare(id){const el=document.getElementById(id);if(!el)return;const top=el.querySelector('.top'),hd=el.querySelector('.hd');
  const mv=e=>{const r=el.getBoundingClientRect(),p=Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100));top.style.clipPath=`inset(0 ${100-p}% 0 0)`;hd.style.left=p+'%'};
  el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);mv(e);el.onpointermove=mv};el.onpointerup=()=>el.onpointermove=null}
