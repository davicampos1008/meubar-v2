const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s),app=$('#app'),BAR=new URLSearchParams(location.search).get('bar');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'R$ '+Number(v).toFixed(2).replace('.',',');
const CATS=['Refrescantes','Fortes','Cítricos','Tropicais','Doces & Frutados','Aperitivos'],EMO=['🍋','🥃','🍊','🍹','🍓','🥂'];
const today=()=>new Date().toLocaleDateString('sv-SE');
const M={bar:null,items:[],cat:'Todas',name:'',mine:[]};
const save=()=>localStorage.setItem('mine'+BAR,JSON.stringify(M.mine));
const priced=()=>M.bar.kind!=='home';
const cnt=()=>M.mine.reduce((s,o)=>s+o.qty,0),total=()=>M.mine.reduce((s,o)=>s+o.qty*(o.price||0),0);
const tile=r=>`<div class="im c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div>`;
function beep(){try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.6);o.start();o.stop(c.currentTime+.6)}catch(e){}}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2400)}
async function load(){
  if(!BAR)return app.innerHTML=`<div class="gate">${brandMark('big')}<h1 style="margin-top:24px">Link inválido</h1><p class="mu">Escaneie o QR do bar novamente.</p></div>`;
  const {data,error}=await sb.rpc('get_menu',{p_bar:BAR});
  if(error||!data||!data.bar)return app.innerHTML=`<div class="gate">${brandMark('big')}<h1 style="margin-top:24px">Bar não encontrado</h1><p class="mu">Peça um novo QR para quem está no bar.</p></div>`;
  M.bar=data.bar;M.items=data.items;document.title=M.bar.name;
  const nm=localStorage.getItem('nm');M.name=nm&&localStorage.getItem('nmd')===today()?nm:'';
  M.mine=JSON.parse(localStorage.getItem('mine'+BAR)||'[]').filter(o=>o.d===today());
  M.name?draw():gate();poll();
}
// Primeira tela: trava tudo até o cliente dizer o nome (lembrado neste celular durante o dia)
function gate(){
  app.innerHTML=`<div class="gate">${brandMark('big')}<p class="mu" style="margin-top:26px">Bem-vindo ao</p><h1>${esc(M.bar.name)}</h1>
  <p class="mu" style="margin:10px 0 22px">Para fazer seu pedido, diga como devemos te chamar.</p>
  <input id="nm" placeholder="Seu nome" maxlength="40" autocomplete="given-name"><button class="b" id="go">Ver cardápio</button><p class="err" id="er"></p></div>`;
  const go=()=>{const n=$('#nm').value.trim();if(n.length<2)return $('#er').textContent='Digite pelo menos 2 letras.';M.name=n;localStorage.setItem('nm',n);localStorage.setItem('nmd',today());draw()};
  $('#go').onclick=go;$('#nm').onkeydown=e=>{if(e.key==='Enter')go()};setTimeout(()=>$('#nm')&&$('#nm').focus(),100);
}
function draw(){
  const cats=['Todas',...new Set(M.items.map(i=>i.category))],l=M.items.filter(i=>M.cat==='Todas'||i.category===M.cat);
  app.innerHTML=`<div class="top">${brandMark()}<button class="lnk" id="tr">${esc(M.name)} · trocar</button></div><div class="w"><p class="mu">Cardápio</p><h1>${esc(M.bar.name)}</h1>
  ${M.bar.open?'':'<p class="err" style="font-size:1rem">Pedidos pausados no momento. Tente de novo em instantes.</p>'}
  ${cats.length>2?`<div class="chips">${cats.map(c=>`<span class="chip ${M.cat===c?'on':''}" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</div>`:''}
  <div class="grid" style="margin-top:10px">${l.map(r=>`<button class="card" data-r="${r.id}">${tile(r)}<div class="t">${esc(r.name)}${r.price!=null?`<br><span class="tag pr">${money(r.price)}</span>`:''}</div></button>`).join('')||'<p class="mu">Nenhum drink disponível agora.</p>'}</div></div>
  ${M.mine.length?`<button class="cart" id="ct"><span>🍸 ${cnt()} ${cnt()===1?'item pedido':'itens pedidos'}</span>${priced()?`<b>${money(total())}</b>`:''}</button>`:''}`;
  $('#tr').onclick=()=>{localStorage.removeItem('nm');M.name='';gate()};
  document.querySelectorAll('[data-c]').forEach(c=>c.onclick=()=>{M.cat=c.dataset.c;draw()});
  document.querySelectorAll('[data-r]').forEach(c=>c.onclick=()=>detail(M.items.find(i=>i.id===c.dataset.r)));
  if($('#ct'))$('#ct').onclick=myOrders;
}
function detail(r){
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="hero c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div><div class="w">
  <button class="b g" id="x">← Voltar</button><h1 style="margin-top:16px">${esc(r.name)}</h1>${r.price!=null?`<p style="font-size:1.4rem;color:var(--ok);font-weight:700">${money(r.price)}</p>`:''}
  ${r.description?`<p class="desc">${esc(r.description)}</p>`:''}
  <h2 style="margin:22px 0 4px">O que leva</h2><div class="chips" style="flex-wrap:wrap;overflow:visible">${(r.ingredients||[]).map(i=>`<span class="chip st1">${esc(i.n)}</span>`).join('')}</div>
  ${r.story?`<h2 style="margin:18px 0 6px">A história</h2><p class="mu story">${esc(r.story)}</p>`:''}
  <label>Observação (opcional)</label><input id="nt" maxlength="140" placeholder="Ex: sem açúcar, pouco gelo">
  <label>Quantidade</label><select id="qt">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>
  <button class="b" id="go" ${M.bar.open?'':'disabled'}>Pedir${r.price!=null?' · '+money(r.price):''}</button><p class="err" id="er"></p></div>`;
  document.body.appendChild(o);const q=s=>o.querySelector(s);q('#x').onclick=()=>o.remove();
  q('#go').onclick=async()=>{
    q('#go').disabled=true;const qty=+q('#qt').value;
    const {data,error}=await sb.rpc('place_order',{p_bar:BAR,p_name:M.name,p_recipe:r.id,p_qty:qty,p_note:q('#nt').value});
    if(error){q('#go').disabled=false;return q('#er').textContent=error.message}
    M.mine.push({id:data,name:r.name,qty,price:r.price,status:'pending',d:today()});save();o.remove();draw();toast('Pedido enviado, '+M.name+'!')};
}
function myOrders(){
  const L={pending:'Preparando',ready:'Pronto, pode buscar',done:'Entregue'},o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="w"><button class="b g" id="x">← Voltar</button><h1 style="margin:14px 0 4px">Meus pedidos</h1><p class="mu">${esc(M.name)} · hoje</p>
  <div class="list" style="margin-top:10px">${M.mine.map(x=>`<div><span><b>${x.qty}× ${esc(x.name)}</b><br><span class="mu">${L[x.status]||''}</span></span>${priced()&&x.price!=null?`<b>${money(x.qty*x.price)}</b>`:''}</div>`).join('')}</div>
  <div class="pay" style="margin-top:18px"><div class="row sp"><span>Total de itens</span><b>${cnt()}</b></div>${priced()?`<div class="row sp" style="margin-top:6px"><span>Total a pagar</span><span class="tt">${money(total())}</span></div><p class="mu" style="margin-top:8px">O pagamento é feito direto no caixa.</p>`:''}</div></div>`;
  document.body.appendChild(o);o.querySelector('#x').onclick=()=>o.remove();
}
// Alerta em tela cheia quando o drink fica pronto
function alertReady(list){
  beep();navigator.vibrate&&navigator.vibrate([300,120,300,120,300]);document.title='🍸 Seu drink está pronto!';
  const o=document.createElement('div');o.className='ov';o.style.zIndex=30;
  o.innerHTML=`<div class="call">Seu drink está pronto!<br><span style="color:var(--ok)">${esc(M.name)}</span></div><div class="w"><p class="mu" style="text-align:center;margin-bottom:8px">${esc(list.map(x=>x.qty+'× '+x.name).join(', '))}</p><button class="b ok" id="k">Vou buscar no bar</button></div>`;
  document.body.appendChild(o);o.querySelector('#k').onclick=()=>{o.remove();document.title=M.bar.name};
}
function poll(){setInterval(async()=>{
  const ids=M.mine.filter(o=>o.status!=='done').map(o=>o.id);if(!ids.length)return;
  const {data}=await sb.rpc('order_status',{p_ids:ids});if(!data)return;
  data.forEach(d=>{const o=M.mine.find(x=>x.id===d.id);if(o)o.status=d.status});
  const fresh=M.mine.filter(o=>o.status==='ready'&&!o.ack);fresh.forEach(o=>o.ack=true);save();
  if(fresh.length)alertReady(fresh);
  if(!document.querySelector('.ov')&&M.name)draw();
},5000)}
load();

// Registrar PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  });
}

// Pedir permissão de notificação (chame depois do login ou ao abrir a fila)
async function enableNotifications() {
  if (!("Notification" in window)) return;
  const perm = await Notification.requestPermission();
  if (perm === "granted" && navigator.serviceWorker.controller) {
    // Exemplo local (sem servidor de push ainda):
    // new Notification("Meu Bar", { body: "Notificações ativas", icon: "./icons/icon-192.png" });
  }
}