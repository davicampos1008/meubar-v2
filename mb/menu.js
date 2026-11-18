const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s),app=$('#app'),BAR=new URLSearchParams(location.search).get('bar');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'R$ '+Number(v).toFixed(2).replace('.',',');
const CATS=['Refrescantes','Fortes','Cítricos','Tropicais','Doces & Frutados','Aperitivos'],EMO=['🍋','🥃','🍊','🍹','🍓','🥂'];
const M={bar:null,items:[],cat:'Todas',name:localStorage.getItem('nm')||'',mine:JSON.parse(localStorage.getItem('mine'+BAR)||'[]')};
const tile=r=>`<div class="im c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div>`;
async function load(){
  if(!BAR)return app.innerHTML='<div class="w"><h1>Link inválido</h1><p class="mu">Escaneie o QR do bar novamente.</p></div>';
  const {data,error}=await sb.rpc('get_menu',{p_bar:BAR});
  if(error||!data||!data.bar)return app.innerHTML='<div class="w"><h1>Bar não encontrado</h1><p class="mu">Peça um novo QR para quem está no bar.</p></div>';
  M.bar=data.bar;M.items=data.items;document.title='Cardápio · '+M.bar.name;draw();poll();
}
function draw(){
  const cats=['Todas',...new Set(M.items.map(i=>i.category))],l=M.items.filter(i=>M.cat==='Todas'||i.category===M.cat);
  app.innerHTML=`<div class="w"><p class="mu">Cardápio</p><h1>${esc(M.bar.name)}</h1>
  ${M.bar.open?'':'<p class="err" style="font-size:1rem">Pedidos pausados no momento. Tente de novo em instantes.</p>'}
  <div id="st"></div>
  <label>Seu nome</label><input id="nm" value="${esc(M.name)}" placeholder="Como devemos te chamar?" maxlength="40">
  <div class="chips">${cats.map(c=>`<span class="chip ${M.cat===c?'on':''}" data-c="${c}">${c}</span>`).join('')}</div>
  <div class="grid">${l.map(r=>`<button class="card" data-r="${r.id}">${tile(r)}<div class="t">${esc(r.name)}${r.price!=null?`<br><span class="tag pr">${money(r.price)}</span>`:''}</div></button>`).join('')||'<p class="mu">Nenhum drink disponível agora.</p>'}</div></div>`;
  $('#nm').oninput=e=>{M.name=e.target.value;localStorage.setItem('nm',M.name)};
  document.querySelectorAll('[data-c]').forEach(c=>c.onclick=()=>{M.cat=c.dataset.c;draw()});
  document.querySelectorAll('[data-r]').forEach(c=>c.onclick=()=>detail(M.items.find(i=>i.id===c.dataset.r)));
  status();
}
function detail(r){
  const o=document.createElement('div');o.className='ov';
  o.innerHTML=`<div class="hero c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div><div class="w">
  <button class="b g" id="x">← Voltar</button><h1 style="margin-top:16px">${esc(r.name)}</h1>${r.price!=null?`<p style="font-size:1.4rem;color:var(--ok);font-weight:800">${money(r.price)}</p>`:''}
  <h2 style="margin:18px 0 10px">Ingredientes</h2>${(r.ingredients||[]).map(i=>`<div class="ing"><span>${esc(i.n)}</span><b>${esc(i.q)}</b></div>`).join('')}
  <label>Observação (opcional)</label><input id="nt" maxlength="140" placeholder="Ex: sem açúcar">
  <label>Quantidade</label><select id="qt">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>
  <button class="b" id="go" ${M.bar.open?'':'disabled'}>Pedir${r.price!=null?' · '+money(r.price):''}</button><p class="err" id="er"></p></div>`;
  document.body.appendChild(o);o.querySelector('#x').onclick=()=>o.remove();
  o.querySelector('#go').onclick=async()=>{
    const nm=M.name.trim();if(nm.length<2){o.remove();draw();$('#nm').focus();return $('#st').innerHTML='<p class="err">Digite seu nome antes de pedir.</p>'}
    o.querySelector('#go').disabled=true;
    const {data,error}=await sb.rpc('place_order',{p_bar:BAR,p_name:nm,p_recipe:r.id,p_qty:+o.querySelector('#qt').value,p_note:o.querySelector('#nt').value});
    if(error){o.querySelector('#go').disabled=false;return o.querySelector('#er').textContent=error.message}
    M.mine.push({id:data,name:r.name,qty:+o.querySelector('#qt').value,status:'pending'});localStorage.setItem('mine'+BAR,JSON.stringify(M.mine));
    o.remove();status();toast('Pedido enviado, '+nm+'!')};
}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2400)}
function status(){
  const el=$('#st');if(!el)return;const act=M.mine.filter(o=>o.status!=='done');
  el.innerHTML=act.map(o=>o.status==='ready'?`<div class="pay" style="background:var(--ok);color:#16200a;border:0"><b style="font-size:1.3rem">Pronto! ${o.qty}× ${esc(o.name)}</b><br>Pode retirar no bar, ${esc(M.name)}.</div>`
   :`<div class="pay"><b>${o.qty}× ${esc(o.name)}</b> <span class="mu">· preparando</span></div>`).join('');
}
let prevReady=0;
function poll(){setInterval(async()=>{
  const ids=M.mine.filter(o=>o.status!=='done').map(o=>o.id);if(!ids.length)return;
  const {data}=await sb.rpc('order_status',{p_ids:ids});if(!data)return;
  data.forEach(d=>{const o=M.mine.find(x=>x.id===d.id);if(o)o.status=d.status});
  localStorage.setItem('mine'+BAR,JSON.stringify(M.mine));
  const rd=M.mine.filter(o=>o.status==='ready').length;
  if(rd>prevReady){navigator.vibrate&&navigator.vibrate([200,100,200]);document.title='Seu drink está pronto!'}prevReady=rd;status();
},5000)}
load();
