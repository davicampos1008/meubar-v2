const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const money=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
const FREE=['gelo','agua','agua gelada'];
const CATS=['Refrescantes','Fortes','Cítricos','Tropicais','Doces & Frutados','Aperitivos'];
const EMO=['🍋','🥃','🍊','🍹','🍓','🥂'];
const ICAT=['Bebidas','Mixers','Xaropes e doces','Guarnições','Outros'];
const QUICK={'Bebidas':['Gin','Vodka','Rum','Cachaça','Whisky','Tequila','Vermute','Campari','Aperol','Cointreau','Espumante'],
'Mixers':['Água tônica','Água com gás','Ginger beer','Coca-Cola','Suco de abacaxi','Leite de coco'],
'Xaropes e doces':['Açúcar','Xarope de açúcar','Angostura','Grenadine'],'Guarnições':['Limão','Laranja','Hortelã']};
const S={user:null,bars:[],bar:null,items:[],recipes:[],prices:{},orders:[],tab:'recipes',sub:null,filter:'now',cat:'Todas',q:'',icat:'Bebidas',cq:''};
const stock=()=>new Set(S.items.filter(i=>i.in_stock).map(i=>norm(i.name)));
const missing=r=>{const st=stock();return (r.ingredients||[]).filter(i=>!FREE.includes(norm(i.n))&&!st.has(norm(i.n)))};
const tile=r=>`<div class="im c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div>`;
const isCounter=()=>S.bar&&S.bar.kind==='counter';
const vol=r=>(r.ingredients||[]).reduce((s,i)=>{const m=String(i.q).match(/([\d.,]+)\s*(ml|cl)/i);if(!m)return s;const v=parseFloat(m[1].replace(',','.'));return s+(m[2].toLowerCase()==='cl'?v*10:v)},0);
const scale=(q,k)=>String(q).replace(/^[\d.,]+/,n=>String(+(parseFloat(n.replace(',','.'))*k).toFixed(1)).replace('.',','));
const names=os=>[...new Set(os.map(o=>o.client_name))];
const join=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' e '+a[a.length-1];
function beep(){try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.2,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.4);o.start();o.stop(c.currentTime+.4)}catch(e){}}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){S.user=null;return authView()}
  S.user=session.user;
  const [b,r]=await Promise.all([sb.from('bars').select('*').order('created_at'),sb.from('recipes').select('*').order('name')]);
  S.bars=b.data||[];S.recipes=r.data||[];
  S.bar=S.bars.find(x=>x.id===localStorage.getItem('bar'))||S.bars[0]||null;
  if(S.bar)await loadBar();else{S.tab='more';S.sub='bars'}
  render();
}
async function loadBar(){
  const id=S.bar.id;
  const [i,p,o]=await Promise.all([sb.from('bar_items').select('*').eq('bar_id',id).order('name'),sb.from('bar_prices').select('*').eq('bar_id',id),
    sb.from('orders').select('*').eq('bar_id',id).gte('created_at',new Date(Date.now()-864e5).toISOString()).order('created_at')]);
  S.items=i.data||[];S.prices=Object.fromEntries((p.data||[]).map(x=>[x.recipe_id,x.price]));S.orders=o.data||[];
  if(S.ch)sb.removeChannel(S.ch);
  S.ch=sb.channel('o'+id).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'bar_id=eq.'+id},async e=>{
    if(e.eventType==='INSERT')beep();
    const o=await sb.from('orders').select('*').eq('bar_id',id).gte('created_at',new Date(Date.now()-864e5).toISOString()).order('created_at');
    S.orders=o.data||[];
    if(document.querySelector('.ov'))return updBadge();
    if(['queue','cash'].includes(S.tab))render();else updBadge()}).subscribe();
}
const pend=()=>S.orders.filter(o=>o.status==='pending').length;
const updBadge=()=>{const b=$('.bd');if(b){b.textContent=pend();b.style.display=pend()?'':'none'}};
function authView(msg=''){
  app.innerHTML=`<div class="w" style="padding-top:12vh"><h1>Meu Bar</h1><p class="mu" style="margin:8px 0 24px">Receitas, estoque e pedidos do seu bar. Em qualquer celular.</p>
  <label>E-mail</label><input id="em" type="email" autocomplete="email"><label>Senha</label><input id="pw" type="password" autocomplete="current-password" minlength="6">
  <button class="b" id="in">Entrar</button><button class="b g" id="up" style="width:100%;margin-top:8px">Criar conta</button><p class="err" id="er">${esc(msg)}</p></div>`;
  const go=async fn=>{const r=await sb.auth[fn]({email:$('#em').value,password:$('#pw').value});
    if(r.error)return $('#er').textContent=r.error.message;
    if(fn==='signUp'&&!r.data.session)return $('#er').textContent='Conta criada. Confirme o e-mail e entre.';boot()};
  $('#in').onclick=()=>go('signInWithPassword');$('#up').onclick=()=>go('signUp');
}
function render(){
  const T=[['recipes','🍸','Receitas'],['stock','🍾','Estoque'],['queue','🛎️','Fila'],...(isCounter()?[['cash','💵','Caixa']]:[]),['more','⋯','Mais']];
  app.innerHTML=`<div class="w" id="v"></div><nav class="nav">${T.map(t=>`<button class="${S.tab===t[0]?'on':''}" data-t="${t[0]}"><span>${t[1]}</span>${t[2]}${t[0]==='queue'?`<i class="bd" style="${pend()?'':'display:none'}">${pend()}</i>`:''}</button>`).join('')}</nav>`;
  $$('[data-t]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.sub=null;render()});
  if(!S.bar&&S.tab!=='more'){S.tab='more';S.sub='bars'}
  if(S.tab!=='more'&&!S.bar)return;
  ({recipes:recipesView,stock:stockView,queue:queueView,cash:cashView,more:moreView})[S.tab]();
}
function recipesView(){
  const all=S.recipes,now=all.filter(r=>!missing(r).length),one=all.filter(r=>missing(r).length===1);
  let l=S.filter==='now'?now:S.filter==='one'?one:all;
  if(S.cat!=='Todas')l=l.filter(r=>r.category===S.cat);if(S.q)l=l.filter(r=>norm(r.name).includes(norm(S.q)));
  $('#v').innerHTML=`<p class="mu">${esc(S.bar.name)}</p><div class="big">${now.length}</div><h1 style="font-size:1.3rem;margin-bottom:12px">drinks que você faz agora</h1>
  <input id="q" placeholder="Buscar drink" value="${esc(S.q)}">
  <div class="chips">${[['now','Faço agora'],['one','Falta 1'],['all','Todas']].map(f=>`<span class="chip ${S.filter===f[0]?'on':''}" data-f="${f[0]}">${f[1]}</span>`).join('')}</div>
  <div class="chips">${['Todas',...CATS].map(c=>`<span class="chip ${S.cat===c?'on':''}" data-c="${c}">${c}</span>`).join('')}</div>
  <div class="grid">${l.slice(0,120).map(r=>{const m=missing(r);return `<button class="card" data-r="${r.id}">${tile(r)}<div class="t">${esc(r.name)}<br><span class="tag ${m.length?'':'ok'}">${m.length?'falta '+m.length:'pronto'}</span></div></button>`}).join('')||'<p class="mu">Nada por aqui. Adicione itens no Estoque.</p>'}</div>`;
  $('#q').oninput=e=>{S.q=e.target.value;const p=e.target.selectionStart;recipesView();$('#q').focus();$('#q').setSelectionRange(p,p)};
  $$('[data-f]').forEach(c=>c.onclick=()=>{S.filter=c.dataset.f;recipesView()});
  $$('[data-c]').forEach(c=>c.onclick=()=>{S.cat=c.dataset.c;recipesView()});
  $$('[data-r]').forEach(c=>c.onclick=()=>overlay(S.recipes.find(x=>x.id===c.dataset.r),1,null));
}
// Tela de receita (usada no catálogo e na fila). k = multiplicador, lot = lote da fila
function overlay(r,k,lot){
  const st=stock(),o=document.createElement('div');o.className='ov';
  const notes=lot?[...new Set(lot.orders.map(x=>x.note).filter(Boolean))]:[];
  o.innerHTML=`<div class="hero c${Math.max(0,CATS.indexOf(r.category))}" style="${r.image_url?`background-image:url('${esc(r.image_url)}')`:''}">${r.image_url?'':EMO[CATS.indexOf(r.category)]||'🍸'}</div><div class="w">
  <button class="b g" id="x">← Voltar</button><h1 style="margin-top:16px">${k>1?k+'× ':''}${esc(r.name)}</h1>
  <p class="mu">${lot?esc(join(names(lot.orders)))+(lot.sh?' · coqueteleira '+lot.sh+' ml':''):esc(r.category)+' · por @'+esc(r.author_nick)}</p>
  ${notes.length?`<p style="margin-top:10px;color:var(--ac);font-weight:600">Obs: ${esc(notes.join(' / '))}</p>`:''}
  <h2 style="margin:20px 0 10px">Ingredientes</h2>${(r.ingredients||[]).map(i=>{const ok=FREE.includes(norm(i.n))||st.has(norm(i.n));const q=k>1?scale(i.q,k):i.q;return `<div class="ing ${ok?'':'miss'}"><span>${esc(i.n)}</span>${ok?`<b>${esc(q)}</b>`:`<i>${esc(q)} · falta</i>`}</div>`}).join('')}
  <h2 style="margin:20px 0 4px">Como fazer</h2><p class="steps">${esc(r.steps)}</p>${r.story&&!lot?`<h2>História</h2><p class="mu" style="margin-top:6px">${esc(r.story)}</p>`:''}
  ${lot?`<button class="b ok" id="rd" style="position:sticky;bottom:12px">Pronto · chamar ${esc(join(names(lot.orders)))}</button>`:''}</div>`;
  document.body.appendChild(o);$('.ov #x').onclick=()=>o.remove();
  if(lot)$('#rd').onclick=async()=>{
    $('#rd').disabled=true;
    await sb.from('orders').update({status:'ready',ready_at:new Date().toISOString()}).in('id',lot.orders.map(x=>x.id));
    lot.orders.forEach(x=>x.status='ready');
    o.innerHTML=`<div class="call">Chame:<br><span style="color:var(--ok)">${esc(join(names(lot.orders)))}</span></div><div class="w"><button class="b ok" id="ok">Próximo pedido</button></div>`;
    $('.ov #ok').onclick=()=>{o.remove();render()}};
}
// Mescla pedidos iguais e distribui nas coqueteleiras (metade do volume é gelo)
function lots(){
  const by={},cap=Math.max(...S.bar.shakers)/2,out=[];
  S.orders.filter(o=>o.status==='pending').forEach(o=>{
    const r=S.recipes.find(x=>x.id===o.recipe_id);if(!r)return;
    const key=r.shaken?r.id+'|'+norm(o.note||''):o.id;(by[key]=by[key]||{r,units:[]}).units.push(o)});
  Object.values(by).forEach(g=>{
    const v=vol(g.r)||60;let cur=[],ml=0,n=0;
    const flush=()=>{if(cur.length){const sh=g.r.shaken?[...S.bar.shakers].sort((a,b)=>a-b).find(s=>s/2>=ml)||Math.max(...S.bar.shakers):null;out.push({r:g.r,orders:cur,n,ml,sh})}cur=[];ml=0;n=0};
    g.units.forEach(o=>{const add=v*o.qty;if(cur.length&&ml+add>cap)flush();cur.push(o);ml+=add;n+=o.qty});flush()});
  return out.sort((a,b)=>a.orders[0].created_at<b.orders[0].created_at?-1:1);
}
function queueView(){
  const L=lots(),R=S.orders.filter(o=>o.status==='ready');
  $('#v').innerHTML=`<div class="row sp"><h1>Fila</h1><span class="mu">${esc(S.bar.name)}${S.bar.accepting_orders?'':' · pausado'}</span></div>
  ${L.length?`<div class="tks" style="margin-top:18px">${L.map((l,i)=>`<button class="tk" data-l="${i}"><span class="q">${l.n}×</span><span><div class="n">${esc(l.r.name)}</div><div class="p">${esc(join(names(l.orders)))}</div></span><span class="s">${l.sh?'coq. '+l.sh+' ml':'no copo'}</span></button>`).join('')}</div>`
  :'<p class="mu" style="margin-top:24px">Nenhum pedido na fila. Quando alguém pedir pelo QR, aparece aqui.</p>'}
  ${R.length?`<h2 style="margin:28px 0 8px">Prontos, aguardando retirada</h2><div class="list">${R.map(o=>`<div><span><b>${esc(o.client_name)}</b> · ${o.qty}× ${esc((S.recipes.find(r=>r.id===o.recipe_id)||{}).name)}</span><button class="b g" data-e="${o.id}">Entregue</button></div>`).join('')}</div>`:''}`;
  $$('[data-l]').forEach(c=>c.onclick=()=>{const l=L[c.dataset.l];overlay(l.r,l.n,l)});
  $$('[data-e]').forEach(c=>c.onclick=async()=>{await sb.from('orders').update({status:'done'}).eq('id',c.dataset.e);const o=S.orders.find(x=>x.id===c.dataset.e);o.status='done';queueView()});
}
function cashView(){
  const live=S.orders.filter(o=>!o.paid),by={};
  live.forEach(o=>{(by[norm(o.client_name)]=by[norm(o.client_name)]||[]).push(o)});
  const tot=os=>os.reduce((s,o)=>s+o.qty*(o.price||0),0);
  const paid=S.orders.filter(o=>o.paid),rec=tot(paid),rest=tot(live);
  const g=Object.values(by).filter(os=>!S.cq||norm(os[0].client_name).includes(norm(S.cq)));
  $('#v').innerHTML=`<h1>Caixa</h1><div class="row" style="margin:14px 0"><div class="pay" style="flex:1;margin:0"><div class="mu">Recebido</div><div class="tt">${money(rec)}</div></div><div class="pay" style="flex:1;margin:0"><div class="mu">A receber</div><div class="tt" style="color:var(--tx)">${money(rest)}</div></div></div>
  <input id="cq" placeholder="Buscar pelo nome" value="${esc(S.cq)}" style="margin-bottom:14px">
  ${g.map((os,i)=>`<div class="pay"><div class="row sp"><b style="font-size:1.2rem">${esc(os[0].client_name)}</b><span class="tt">${money(tot(os))}</span></div>
  <p class="mu" style="margin:6px 0 10px">${os.map(o=>`${o.qty}× ${esc((S.recipes.find(r=>r.id===o.recipe_id)||{}).name)}${o.status==='pending'?' (preparando)':''}`).join(', ')}</p><button class="b ok" data-p="${i}" style="margin:0">Marcar como pago</button></div>`).join('')||'<p class="mu">Nenhuma conta aberta.</p>'}`;
  $('#cq').oninput=e=>{S.cq=e.target.value;const p=e.target.selectionStart;cashView();$('#cq').focus();$('#cq').setSelectionRange(p,p)};
  $$('[data-p]').forEach(c=>c.onclick=async()=>{const os=g[c.dataset.p];await sb.from('orders').update({paid:true}).in('id',os.map(o=>o.id));os.forEach(o=>o.paid=true);cashView()});
}
function stockView(){
  const have=new Set(S.items.map(i=>norm(i.name))),its=S.items.filter(i=>i.category===S.icat);
  $('#v').innerHTML=`<h1>Estoque</h1><p class="mu">${esc(S.bar.name)}</p>
  <div class="chips">${ICAT.map(c=>`<span class="chip ${S.icat===c?'on':''}" data-i="${c}">${c}</span>`).join('')}</div>
  <div class="row"><input id="ni" placeholder="Adicionar item"><button class="b g" id="add">Adicionar</button></div>
  <div class="chips">${(QUICK[S.icat]||[]).filter(n=>!have.has(norm(n))).map(n=>`<span class="chip" data-a="${esc(n)}">+ ${esc(n)}</span>`).join('')}</div>
  <div class="list">${its.map(i=>`<div><span class="${i.in_stock?'':'off'}">${esc(i.name)}</span><span class="row"><button class="b g" data-t="${i.id}">${i.in_stock?'Acabou':'Tenho'}</button><button class="b g" data-d="${i.id}" aria-label="Apagar">🗑</button></span></div>`).join('')||'<p class="mu" style="padding-top:12px">Toque nos itens acima para adicionar rápido.</p>'}</div>`;
  const re=async()=>{const {data}=await sb.from('bar_items').select('*').eq('bar_id',S.bar.id).order('name');S.items=data||[];stockView()};
  const add=async n=>{n=n.trim();if(!n)return;await sb.from('bar_items').insert({bar_id:S.bar.id,category:S.icat,name:n});re()};
  $('#add').onclick=()=>add($('#ni').value);
  $$('[data-a]').forEach(c=>c.onclick=()=>add(c.dataset.a));$$('[data-i]').forEach(c=>c.onclick=()=>{S.icat=c.dataset.i;stockView()});
  $$('[data-t]').forEach(c=>c.onclick=async()=>{const it=S.items.find(i=>i.id===c.dataset.t);await sb.from('bar_items').update({in_stock:!it.in_stock}).eq('id',it.id);re()});
  $$('[data-d]').forEach(c=>c.onclick=async()=>{await sb.from('bar_items').delete().eq('id',c.dataset.d);re()});
}
function moreView(){
  if(S.sub)return ({create:createView,bars:barsView,qr:qrView,prices:pricesView,shakers:shakersView})[S.sub]();
  const M=[['qr','📱','QR do cardápio','Para convidados ou clientes'],...(isCounter()?[['prices','💰','Preços','Defina o valor de cada drink']]:[]),['shakers','🧴','Coqueteleiras','Tamanhos que você usa'],['create','➕','Criar drink','Receita, foto e história'],['bars','🏠','Meus bares','Trocar ou criar bar']];
  $('#v').innerHTML=`<h1>Mais</h1><p class="mu">${S.bar?esc(S.bar.name):''}</p><div class="list" style="margin-top:10px">
  ${S.bar?`<div><span><b>Receber pedidos</b><br><span class="mu">${S.bar.accepting_orders?'Ligado':'Pausado'}</span></span><button class="b g" id="pz">${S.bar.accepting_orders?'Pausar':'Retomar'}</button></div>`:''}
  ${M.map(m=>`<div data-s="${m[0]}" style="cursor:pointer"><span>${m[1]} <b>${m[2]}</b><br><span class="mu">${m[3]}</span></span><span>›</span></div>`).join('')}</div>`;
  $$('[data-s]').forEach(c=>c.onclick=()=>{S.sub=c.dataset.s;moreView()});
  const pz=$('#pz');if(pz)pz.onclick=async()=>{S.bar.accepting_orders=!S.bar.accepting_orders;await sb.from('bars').update({accepting_orders:S.bar.accepting_orders}).eq('id',S.bar.id);moreView()};
}
const back=()=>`<button class="b g" id="bk" style="margin-bottom:14px">← Voltar</button>`;
const bindBack=()=>{const b=$('#bk');if(b)b.onclick=()=>{S.sub=null;render()}};
function qrView(){
  const url=location.origin+'/menu?bar='+S.bar.id,q=qrcode(0,'M');q.addData(url);q.make();
  $('#v').innerHTML=`${back()}<h1>QR do cardápio</h1><p class="mu" style="margin-top:6px">${S.bar.kind==='home'?'Seus convidados veem os drinks que você consegue fazer e pedem pelo nome.':'Clientes veem os drinks com preço e pedem pelo nome.'}</p>
  <div class="qr">${q.createSvgTag({cellSize:6,margin:0,scalable:true})}</div><p class="mu" style="word-break:break-all;text-align:center">${esc(url)}</p>
  <button class="b" id="cp">Copiar link</button><button class="b g" id="pr" style="width:100%;margin-top:8px">Imprimir</button>`;
  bindBack();$('#cp').onclick=()=>navigator.clipboard.writeText(url).then(()=>toast('Link copiado'));$('#pr').onclick=()=>print();
}
function pricesView(){
  const q=S.pq||'';let l=S.recipes.filter(r=>!q||norm(r.name).includes(norm(q))).slice(0,60);
  $('#v').innerHTML=`${back()}<h1>Preços</h1><p class="mu" style="margin:6px 0 12px">Só aparecem no cardápio os drinks com preço e ingredientes em estoque.</p><input id="pq" placeholder="Buscar drink" value="${esc(q)}">
  <div class="list">${l.map(r=>`<div><span>${esc(r.name)}</span><input type="number" inputmode="decimal" step="0.5" min="0" data-p="${r.id}" value="${S.prices[r.id]??''}" placeholder="R$" style="width:100px"></div>`).join('')}</div>`;
  bindBack();$('#pq').oninput=e=>{S.pq=e.target.value;const p=e.target.selectionStart;pricesView();$('#pq').focus();$('#pq').setSelectionRange(p,p)};
  $$('[data-p]').forEach(i=>i.onchange=async()=>{const id=i.dataset.p,v=parseFloat(i.value.replace(',','.'));
    if(isNaN(v)){await sb.from('bar_prices').delete().match({bar_id:S.bar.id,recipe_id:id});delete S.prices[id]}
    else{await sb.from('bar_prices').upsert({bar_id:S.bar.id,recipe_id:id,price:v});S.prices[id]=v}toast('Preço salvo')});
}
function shakersView(){
  $('#v').innerHTML=`${back()}<h1>Coqueteleiras</h1><p class="mu" style="margin:6px 0">O app junta pedidos iguais e diz qual usar. Metade do volume é gelo.</p>
  <div class="list">${S.bar.shakers.map((s,i)=>`<div><b>${s} ml</b><button class="b g" data-x="${i}">Remover</button></div>`).join('')}</div>
  <label>Nova coqueteleira (ml)</label><div class="row"><input id="ns" type="number" inputmode="numeric" placeholder="500"><button class="b g" id="as">Adicionar</button></div>`;
  bindBack();const sv=async a=>{if(!a.length)return;S.bar.shakers=a;await sb.from('bars').update({shakers:a}).eq('id',S.bar.id);shakersView()};
  $('#as').onclick=()=>{const v=parseInt($('#ns').value);if(v>=100)sv([...S.bar.shakers,v])};
  $$('[data-x]').forEach(c=>c.onclick=()=>sv(S.bar.shakers.filter((_,i)=>i!=c.dataset.x)));
}
function createView(){
  $('#v').innerHTML=`${back()}<h1>Criar drink</h1><label>Nome</label><input id="n"><label>Categoria</label><select id="c">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
  <label>Ingredientes (um por linha, ex: 50 ml Gin)</label><textarea id="i"></textarea><label>Modo de preparo</label><textarea id="s"></textarea>
  <label>História (opcional)</label><textarea id="h"></textarea><label>Foto</label><input id="f" type="file" accept="image/*">
  <label class="row" style="margin-top:16px"><input id="sk" type="checkbox" checked style="width:auto"> Feito na coqueteleira (pode juntar pedidos)</label>
  <button class="b" id="sv">Salvar drink</button><p class="err" id="er"></p>`;bindBack();
  $('#sv').onclick=async()=>{
    const name=$('#n').value.trim(),ing=$('#i').value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^([\d.,\/]+\s*(?:ml|cl|g|dashes?|folhas?|colheres?|fatias?|un)?)\s+(.+)$/i);return m?{q:m[1],n:m[2]}:{q:'',n:l}});
    if(!name||!ing.length)return $('#er').textContent='Informe o nome e ao menos um ingrediente.';
    $('#sv').disabled=true;let url=null;const f=$('#f').files[0];
    if(f){const p=`${S.user.id}/${Date.now()}-${f.name.replace(/[^\w.]/g,'_')}`;const u=await sb.storage.from('recipes').upload(p,f);if(!u.error)url=sb.storage.from('recipes').getPublicUrl(p).data.publicUrl}
    const {error}=await sb.from('recipes').insert({name,category:$('#c').value,ingredients:ing,steps:$('#s').value,story:$('#h').value||null,image_url:url,shaken:$('#sk').checked,author_nick:S.user.email.split('@')[0]});
    if(error){$('#sv').disabled=false;return $('#er').textContent=error.message}
    S.recipes=(await sb.from('recipes').select('*').order('name')).data;S.tab='recipes';S.sub=null;S.filter='all';render();toast('Drink salvo');
  };
}
function barsView(){
  const K={home:'Casa (sem preço)',counter:'Balcão (com preço e caixa)',tables:'Mesas'};
  $('#v').innerHTML=`${S.bar?back():''}<h1>Meus bares</h1><div class="list">${S.bars.map(b=>`<div><span><b>${esc(b.name)}</b><br><span class="mu">${K[b.kind]}</span></span><button class="b g" data-b="${b.id}">${S.bar&&S.bar.id===b.id?'Atual':'Usar'}</button></div>`).join('')}</div>
  <h2 style="margin-top:24px">Novo bar</h2><label>Nome</label><input id="bn" placeholder="Ex: Festa de sábado"><label>Tipo</label><select id="bk2"><option value="home">Casa (sem preço)</option><option value="counter">Balcão (com preço e caixa)</option></select>
  <button class="b" id="nb">Criar bar</button><button class="b g" id="out" style="width:100%;margin-top:28px">Sair (${esc(S.user.email)})</button><p class="err" id="er"></p>`;bindBack();
  $$('[data-b]').forEach(c=>c.onclick=async()=>{S.bar=S.bars.find(b=>b.id===c.dataset.b);localStorage.setItem('bar',S.bar.id);await loadBar();S.sub=null;S.tab='recipes';render()});
  $('#nb').onclick=async()=>{const name=$('#bn').value.trim();if(!name)return $('#er').textContent='Dê um nome ao bar.';
    const {data,error}=await sb.from('bars').insert({name,kind:$('#bk2').value}).select().single();
    if(error)return $('#er').textContent=error.message;S.bars.push(data);S.bar=data;localStorage.setItem('bar',data.id);await loadBar();S.sub=null;S.tab='stock';render()};
  $('#out').onclick=async()=>{await sb.auth.signOut();if(S.ch)sb.removeChannel(S.ch);boot()};
}
boot();
