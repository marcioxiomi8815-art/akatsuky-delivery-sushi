(() => {
'use strict';
const $=id=>document.getElementById(id);
let db=null,auth=null,currentUser=null,currentRole=null,unsubOrders=null,unsubMenu=null;
const DEFAULT_MENU=[['Combinados','Combinado Akatsuky','Seleção especial da casa.',59.90],['Combinados','Combinado Sushi','Variedade para compartilhar.',79.90],['Sushi','Uramaki Salmão','8 unidades.',32.90],['Sushi','Hot Roll','8 unidades.',29.90],['Sashimi','Sashimi Salmão','Fatias frescas.',39.90],['Temaki','Temaki Salmão','Salmão e arroz.',28.90],['Bebidas','Refrigerante Lata','Escolha o sabor.',6],['Bebidas','Água','Água mineral.',4]].map((x,i)=>({id:i+1,cat:x[0],name:x[1],desc:x[2],price:x[3]}));
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let allOrders=[],orderSearch='',statusFilter='todos',cashDate=new Date(),lastOrderCount=0,storeOpen=true,currentCash=null;
function pad(n){return String(n).padStart(2,'0')}
function isoDate(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function dateTime(ts){return ts?new Date(ts).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'}
function dateLabel(s){if(!s)return '—';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`}
function conn(t,c){$('connection').className='notice '+c;$('connection').textContent=t}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function paymentKey(v){v=String(v||'').toLowerCase();if(v.includes('crédito')||v.includes('credito'))return 'credito';if(v.includes('débito')||v.includes('debito'))return 'debito';if(v.includes('pix'))return 'pix';return 'dinheiro'}
function ordersForDate(date){const [y,m,d]=date.split('-').map(Number);const start=new Date(y,m-1,d).getTime();const end=start+86400000;return allOrders.filter(([id,o])=>{const t=Number(o.createdAt||0);return t>=start&&t<end})}
function renderOrders(){const q=orderSearch.toLowerCase();const arr=allOrders.filter(([id,o])=>(statusFilter==='todos'||o.status===statusFilter)&&(!q||(`${id} ${o.customer?.name||''} ${o.customer?.phone||''}`).toLowerCase().includes(q)));$('orders').innerHTML=arr.length?arr.map(([id,o])=>card(id,o)).join(''):'<div class="empty">Nenhum pedido encontrado com esses filtros.</div>'}
function card(id,o){const c=o.customer||{},items=(o.items||[]).map(x=>`${x.qty}x ${escapeHtml(x.name)} — ${money(x.price*x.qty)}`).join('<br>');const states=['recebido','preparando','saiu para entrega','entregue'];return `<article class="order"><div class="ordertop"><b>Pedido #${escapeHtml(id.slice(-6))}</b><span class="status">${escapeHtml(o.status||'recebido')}</span></div><h3>${escapeHtml(c.name||'Cliente')}</h3><div class="orderMeta">Recebido em ${dateTime(o.createdAt)}</div><p>📱 ${escapeHtml(c.phone||'')}<br>📍 ${escapeHtml(c.street||'')}, ${escapeHtml(c.number||'')} — ${escapeHtml(c.neighborhood||'')}, ${escapeHtml(c.city||'')}/${escapeHtml(c.uf||'')} — CEP ${escapeHtml(c.cep||'')}<br>💳 ${escapeHtml(c.payment||'')}</p><hr><p>${items}</p><h3>Total: ${money(o.total)}</h3>${c.notes?`<p>📝 ${escapeHtml(c.notes)}</p>`:''}<div class="actions"><button class="printBtn" data-print="${escapeHtml(id)}">🖨️ IMPRIMIR COMANDA</button>${states.map(s=>`<button class="${o.status===s?'active':''}" data-status="${escapeHtml(s)}" data-id="${escapeHtml(id)}">${s.toUpperCase()}</button>`).join('')}</div></article>`}
window.setStatus=(id,status)=>db&&db.ref('orders/'+id).update({status});
function renderMenuEditor(items){const arr=Array.isArray(items)?items:Object.values(items||{});$('menuEditor').innerHTML=`<table class="menu-table"><thead><tr><th>Categoria</th><th>Produto</th><th>Descrição</th><th>Preço</th></tr></thead><tbody>${arr.map((x,i)=>`<tr><td><input data-i="${i}" data-k="cat" value="${escapeHtml(x.cat)}"></td><td><input data-i="${i}" data-k="name" value="${escapeHtml(x.name)}"></td><td><input data-i="${i}" data-k="desc" value="${escapeHtml(x.desc)}"></td><td><input data-i="${i}" data-k="price" type="number" step="0.01" min="0" value="${Number(x.price||0)}"></td></tr>`).join('')}</tbody></table>`;window.currentMenu=arr.map(x=>({...x}))}
async function saveCash(){
  if(!db || !currentUser)return;
  const date=$('cashDate').value||isoDate();
  const orders=ordersForDate(date);
  const existing=(await db.ref('cashClosings/'+date).get()).val();
  if(existing?.finalized)return alert('Este caixa já foi finalizado e está bloqueado.');
  const manual={credito:Number($('cashCredito').value||0),debito:Number($('cashDebito').value||0),dinheiro:Number($('cashDinheiro').value||0),pix:Number($('cashPix').value||0)};
  const adjustments={trocoInicial:Number($('cashTrocoInicial').value||0),suprimento:Number($('cashSuprimento').value||0),sangria:Number($('cashSangria').value||0)};
  const manualTotal=Object.values(manual).reduce((a,b)=>a+b,0);
  const sales=orders.reduce((s,[id,o])=>s+Number(o.total||0),0);
  const expectedCash=orders.reduce((s,[id,o])=>s+(paymentKey(o.customer?.payment)==='dinheiro'?Number(o.total||0):0),0)+adjustments.trocoInicial+adjustments.suprimento-adjustments.sangria;
  const difference=manualTotal-sales;
  const data={date,salesTotal:sales,manualInputs:manual,adjustments,closingTotal:manualTotal,expectedCash,difference,orderCount:orders.length,operator:$('cashOperator').value.trim(),finalized:false,savedAt:Date.now()};
  try{await db.ref('cashClosings/'+date).set(data);currentCash=data;$('cashSaved').textContent=`Caixa de ${dateLabel(date)} salvo em ${new Date().toLocaleString('pt-BR')}.`;renderCashSummary(date,data);await loadCashRange();}
  catch(e){alert('Não foi possível salvar o fechamento. Verifique as permissões do Firebase.')}
}
async function finalizeCash(){
  if(!db || !currentUser)return;
  const date=$('cashDate').value||isoDate();
  const existing=(await db.ref('cashClosings/'+date).get()).val();
  if(existing?.finalized)return alert('Este caixa já foi finalizado.');
  await saveCash();
  const snap=await db.ref('cashClosings/'+date).get(); const v=snap.val(); if(!v)return;
  const finalData={...v,finalized:true,finalizedAt:Date.now(),finalizedBy:currentUser.uid};
  try{await db.ref('cashClosings/'+date).set(finalData);currentCash=finalData;setCashLocked(true,finalData);$('cashSaved').textContent=`CAIXA DE ${dateLabel(date)} FINALIZADO E BLOQUEADO.`;await loadCashRange();}
  catch(e){alert('Não foi possível finalizar o caixa. Verifique as permissões do Firebase.')}
}
function setCashLocked(locked,v){['cashDate','cashOperator','cashCredito','cashDebito','cashDinheiro','cashPix','cashTrocoInicial','cashSuprimento','cashSangria'].forEach(id=>{const el=$(id);if(el)el.disabled=locked});$('saveCash').disabled=locked;$('finalizeCash').disabled=locked;$('finalizeCash').textContent=locked?'🔒 CAIXA BLOQUEADO':'🔒 FINALIZAR E BLOQUEAR CAIXA';if(v?.finalized)$('cashSaved').textContent=`Caixa finalizado por ${v.finalizedBy||v.operator||'—'} em ${dateTime(v.finalizedAt)}.`}
function renderCashSummary(date,saved){const orders=ordersForDate(date),by={credito:0,debito:0,dinheiro:0,pix:0};orders.forEach(([id,o])=>by[paymentKey(o.customer?.payment)]+=Number(o.total||0));const sales=orders.reduce((s,[id,o])=>s+Number(o.total||0),0);const manual={credito:Number($('cashCredito')?.value||0),debito:Number($('cashDebito')?.value||0),dinheiro:Number($('cashDinheiro')?.value||0),pix:Number($('cashPix')?.value||0)};const adjustments=saved?.adjustments||{trocoInicial:Number($('cashTrocoInicial')?.value||0),suprimento:Number($('cashSuprimento')?.value||0),sangria:Number($('cashSangria')?.value||0)};const manualTotal=Object.values(manual).reduce((a,b)=>a+b,0);$('cashSales').textContent=money(sales);$('cashOrders').textContent=orders.length;$('cashCredSales').textContent=money(by.credito);$('cashDebSales').textContent=money(by.debito);$('cashDinSales').textContent=money(by.dinheiro);$('cashPixSales').textContent=money(by.pix);$('cashManualTotal').textContent=money(saved?Number(saved.closingTotal||0):manualTotal);$('cashDifference').textContent=money(saved?Number(saved.difference||0):manualTotal-sales);$('cashExpected').textContent=money(saved?Number(saved.expectedCash||0):(by.dinheiro+adjustments.trocoInicial+adjustments.suprimento-adjustments.sangria));$('cashOpeningLabel').textContent=money(adjustments.trocoInicial);$('cashSupplyLabel').textContent=money(adjustments.suprimento);$('cashWithdrawalLabel').textContent=money(adjustments.sangria);}
async function loadCashDate(date){if(!db)return;const snap=await db.ref('cashClosings/'+date).get();const v=snap.val();$('cashDate').value=date;currentCash=v||null;if(v){$('cashCredito').value=Number(v.manualInputs?.credito||0);$('cashDebito').value=Number(v.manualInputs?.debito||0);$('cashDinheiro').value=Number(v.manualInputs?.dinheiro||0);$('cashPix').value=Number(v.manualInputs?.pix||0);$('cashTrocoInicial').value=Number(v.adjustments?.trocoInicial||0);$('cashSuprimento').value=Number(v.adjustments?.suprimento||0);$('cashSangria').value=Number(v.adjustments?.sangria||0);$('cashOperator').value=v.operator||v.finalizedBy||'';$('cashSaved').textContent=v.finalized?`CAIXA FINALIZADO E BLOQUEADO • ${v.finalizedBy||v.operator||'—'}`:`Fechamento salvo em ${new Date(v.savedAt||0).toLocaleString('pt-BR')}.`;setCashLocked(!!v.finalized,v)}else{['cashCredito','cashDebito','cashDinheiro','cashPix','cashTrocoInicial','cashSuprimento','cashSangria'].forEach(id=>$(id).value='');$('cashOperator').value='';$('cashSaved').textContent='Ainda não existe fechamento salvo para esta data.';setCashLocked(false,null)}renderCashSummary(date,v)}
async function loadCashRange(){if(!db)return;const from=$('cashFrom').value,to=$('cashTo').value;if(!from||!to||from>to)return;const snap=await db.ref('cashClosings').once('value');const rows=[];Object.entries(snap.val()||{}).forEach(([date,v])=>{if(date>=from&&date<=to)rows.push({date,...v})});rows.sort((a,b)=>a.date.localeCompare(b.date));$('cashHistory').innerHTML=rows.length?`<table class="cash-table"><thead><tr><th>Data</th><th>Vendas</th><th>Pedidos</th><th>Crédito</th><th>Débito</th><th>Dinheiro</th><th>PIX</th><th>Fechamento</th><th>Diferença</th><th>Operador</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateLabel(r.date)}</td><td>${money(r.salesTotal)}</td><td>${r.orderCount||0}</td><td>${money(r.manualInputs?.credito)}</td><td>${money(r.manualInputs?.debito)}</td><td>${money(r.manualInputs?.dinheiro)}</td><td>${money(r.manualInputs?.pix)}</td><td><b>${money(r.closingTotal)}</b></td><td>${money(r.difference)}</td><td>${escapeHtml(r.operator||r.finalizedBy||'—')}</td><td>${r.finalized?'🔒 Finalizado':'Aberto'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nenhum fechamento encontrado nesse período.</div>';window.cashRows=rows}
function printCashRange(){const rows=window.cashRows||[];if(!rows.length)return alert('Não há fechamentos no período selecionado.');const total=rows.reduce((s,r)=>s+Number(r.closingTotal||0),0);const html=`<!doctype html><html><head><meta charset="utf-8"><title>Fechamento de Caixa</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 5px}p{color:#555}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:8px;text-align:right}th:first-child,td:first-child{text-align:left}tfoot td{font-weight:bold;background:#eee}</style></head><body><h1>AKATSUKY DELIVERY SUSHI</h1><p>Relatório de caixa: ${dateLabel($('cashFrom').value)} até ${dateLabel($('cashTo').value)}</p><table><thead><tr><th>Data</th><th>Vendas</th><th>Pedidos</th><th>Crédito</th><th>Débito</th><th>Dinheiro</th><th>PIX</th><th>Fechamento</th><th>Diferença</th><th>Operador</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateLabel(r.date)}</td><td>${money(r.salesTotal)}</td><td>${r.orderCount||0}</td><td>${money(r.manualInputs?.credito)}</td><td>${money(r.manualInputs?.debito)}</td><td>${money(r.manualInputs?.dinheiro)}</td><td>${money(r.manualInputs?.pix)}</td><td>${money(r.closingTotal)}</td><td>${money(r.difference)}</td><td>${escapeHtml(r.operator||r.finalizedBy||'—')}</td><td>${r.finalized?'Finalizado':'Aberto'}</td></tr>`).join('')}</tbody><tfoot><tr><td>TOTAL</td><td>${money(rows.reduce((s,r)=>s+Number(r.salesTotal||0),0))}</td><td>${rows.reduce((s,r)=>s+Number(r.orderCount||0),0)}</td><td>${money(rows.reduce((s,r)=>s+Number(r.manualInputs?.credito||0),0))}</td><td>${money(rows.reduce((s,r)=>s+Number(r.manualInputs?.debito||0),0))}</td><td>${money(rows.reduce((s,r)=>s+Number(r.manualInputs?.dinheiro||0),0))}</td><td>${money(rows.reduce((s,r)=>s+Number(r.manualInputs?.pix||0),0))}</td><td>${money(total)}</td></tr></tfoot></table><p>Emitido em ${new Date().toLocaleString('pt-BR')}</p><script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open('','_blank');w.document.write(html);w.document.close()}
function printOrder(id){const pair=allOrders.find(x=>x[0]===id);if(!pair)return;const o=pair[1],c=o.customer||{};const rows=(o.items||[]).map(x=>`<tr><td>${x.qty}x ${escapeHtml(x.name)}</td><td>${money(Number(x.price||0)*Number(x.qty||0))}</td></tr>`).join('');const html=`<!doctype html><html><head><meta charset="utf-8"><title>Comanda #${escapeHtml(id.slice(-6))}</title><style>body{font-family:Arial,sans-serif;width:80mm;margin:0 auto;padding:8px;color:#111;font-size:12px}h2{text-align:center;margin:4px 0}h3{margin:8px 0}hr{border:0;border-top:1px dashed #333}table{width:100%;border-collapse:collapse}td{padding:4px 0}td:last-child{text-align:right}.total{font-size:18px;font-weight:bold;text-align:right}.center{text-align:center}</style></head><body><h2>AKATSUKY DELIVERY SUSHI</h2><div class="center">COMANDA #${escapeHtml(id.slice(-6))}</div><hr><b>Cliente:</b> ${escapeHtml(c.name||'')}<br><b>Telefone:</b> ${escapeHtml(c.phone||'')}<br><b>Pagamento:</b> ${escapeHtml(c.payment||'')}<br><b>Data:</b> ${dateTime(o.createdAt)}<h3>ENDEREÇO</h3>${escapeHtml(c.street||'')}, ${escapeHtml(c.number||'')}<br>${escapeHtml(c.neighborhood||'')} - ${escapeHtml(c.city||'')}/${escapeHtml(c.uf||'')}<br>CEP: ${escapeHtml(c.cep||'')}<hr><h3>PEDIDOS</h3><table>${rows}</table><hr><div class="total">TOTAL: ${money(o.total)}</div>${c.notes?`<hr><b>OBS:</b> ${escapeHtml(c.notes)}`:''}<script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open('','_blank');w.document.write(html);w.document.close()}
async function loadStoreState(){if(!db)return;try{const snap=await db.ref('settings/storeOpen').get();storeOpen=snap.val()!==false;renderStoreToggle()}catch(e){console.error(e)}}
function renderStoreToggle(){const b=$('storeToggle');if(!b)return;b.textContent=storeOpen?'🏪 LOJA ABERTA':'🔴 LOJA FECHADA';b.classList.toggle('closed',!storeOpen)}
async function toggleStore(){if(!db)return;storeOpen=!storeOpen;await db.ref('settings/storeOpen').set(storeOpen);renderStoreToggle();alert(storeOpen?'Loja aberta para receber pedidos.':'Loja fechada. O cliente verá a loja como fechada e não poderá finalizar pedidos.')}
function listen(){if(!db){conn('🔴 Firebase não carregou. Verifique a conexão.','error');return}unsubOrders&&unsubOrders();unsubMenu&&unsubMenu();const ro=db.ref('orders');unsubOrders=ro.on('value',snap=>{const data=snap.val()||{},arr=Object.entries(data).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));if(lastOrderCount&&arr.length>lastOrderCount&&Notification&&Notification.permission==='granted'){new Notification('Novo pedido - Akatsuky Sushi',{body:`Pedido #${arr[0][0].slice(-6)} • ${money(arr[0][1].total)}`})}lastOrderCount=arr.length;$('statOrders').textContent=arr.length;$('statNew').textContent=arr.filter(x=>x[1].status==='recebido').length;$('statTotal').textContent=money(arr.reduce((s,x)=>s+Number(x[1].total||0),0));allOrders=arr;renderOrders();conn('🟢 Firebase conectado • pedidos em tempo real','ok');},err=>{console.error(err);conn('🟠 Firebase conectou, mas as regras não permitem ler os pedidos.','warn')});unsubMenu=db.ref('settings/menu').on('value',snap=>renderMenuEditor(snap.val()?.items||DEFAULT_MENU),err=>console.error(err))}
async function enterCash(){
  if(!currentUser)return alert('Faça login primeiro.');
  if(currentRole!=='admin' && currentRole!=='cashier')return alert('Seu perfil não possui acesso ao caixa.');
  $('cashLogin').classList.add('hidden');$('cashPanel').classList.remove('hidden');
  const today=isoDate();$('cashDate').value=today;$('cashFrom').value=today;$('cashTo').value=today;
  await loadCashDate(today);await loadCashRange();
}
function applyRoleUI(){
  const admin=currentRole==='admin', cashier=currentRole==='cashier', operator=currentRole==='operator';
  $('storeToggle').classList.toggle('hidden',!admin);
  $('openCash').classList.toggle('hidden',!(admin||cashier));
  $('saveMenu').classList.toggle('hidden',!admin);
  const editor=document.querySelector('.menu-editor'); if(editor)editor.classList.toggle('hidden',!admin);
  conn(admin?'🟢 Login autorizado • administrador':cashier?'🟢 Login autorizado • caixa':'🟢 Login autorizado • operador','ok');
}
async function loginWithFirebase(){
  const email=$('loginEmail').value.trim(), password=$('loginPassword').value;
  $('loginError').textContent='';
  if(!email||!password)return alert('Informe e-mail e senha.');
  try{
    const cred=await auth.signInWithEmailAndPassword(email,password);
    const snap=await db.ref('users/'+cred.user.uid+'/role').get(), role=snap.val();
    if(!['admin','cashier','operator'].includes(role)){await auth.signOut();throw new Error('Este usuário não possui uma função autorizada no sistema.');}
    currentUser=cred.user;currentRole=role;$('login').classList.add('hidden');$('dashboard').classList.remove('hidden');applyRoleUI();listen();loadStoreState();
    if('Notification'in window)Notification.requestPermission().catch(()=>{});
  }catch(e){$('loginError').textContent=e.message||'Login não autorizado. Confira e-mail e senha.';}
}
async function handleAuthState(user){
  if(!user){currentUser=null;currentRole=null;return;}
  try{
    const snap=await db.ref('users/'+user.uid+'/role').get(), role=snap.val();
    if(!['admin','cashier','operator'].includes(role)){await auth.signOut();return;}
    currentUser=user;currentRole=role;$('login').classList.add('hidden');$('dashboard').classList.remove('hidden');applyRoleUI();listen();loadStoreState();
  }catch(e){}
}
window.addEventListener('DOMContentLoaded',()=>{
  try{
    if(!window.firebase)throw new Error('firebase');
    firebase.initializeApp(window.AKATSUKY_FIREBASE_CONFIG);db=firebase.database();auth=firebase.auth();
    conn('🟢 Firebase carregado • faça login para continuar','ok');
    $('enter').onclick=loginWithFirebase;
    $('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')loginWithFirebase()});
    $('loginEmail').addEventListener('keydown',e=>{if(e.key==='Enter')$('loginPassword').focus()});
    $('orderSearch').oninput=e=>{orderSearch=e.target.value;renderOrders()};$('statusFilter').onchange=e=>{statusFilter=e.target.value;renderOrders()};
    $('refresh').onclick=listen;$('logout').onclick=()=>auth.signOut();$('storeToggle').onclick=toggleStore;
    $('openCash').onclick=()=>{if(currentRole!=='admin'&&currentRole!=='cashier')return alert('Seu perfil não possui acesso ao caixa.');$('cashLogin').classList.remove('hidden');$('dashboard').classList.add('hidden')};
    $('cashEnter').onclick=enterCash;$('backAdmin').onclick=()=>{$('cashLogin').classList.add('hidden');$('cashPanel').classList.add('hidden');$('dashboard').classList.remove('hidden')};
    $('cashBack').onclick=()=>{$('cashPanel').classList.add('hidden');$('dashboard').classList.remove('hidden')};$('cashLogout').onclick=()=>auth.signOut();
    $('cashDate').onchange=e=>loadCashDate(e.target.value);$('saveCash').onclick=saveCash;$('finalizeCash').onclick=finalizeCash;
    $('cashFrom').onchange=loadCashRange;$('cashTo').onchange=loadCashRange;$('loadRange').onclick=loadCashRange;$('printCash').onclick=printCashRange;
    ['cashCredito','cashDebito','cashDinheiro','cashPix'].forEach(id=>$(id).oninput=()=>renderCashSummary($('cashDate').value));
    document.addEventListener('click',e=>{const b=e.target.closest('[data-status]');if(b)window.setStatus(b.dataset.id,b.dataset.status);const p=e.target.closest('[data-print]');if(p)printOrder(p.dataset.print)});
    $('saveMenu').onclick=async()=>{
      if(currentRole!=='admin')return alert('Acesso permitido somente ao administrador.');
      const arr=window.currentMenu||[];document.querySelectorAll('#menuEditor [data-i]').forEach(el=>{const i=Number(el.dataset.i),k=el.dataset.k;arr[i][k]=k==='price'?Number(el.value):el.value});
      try{await db.ref('settings/menu').set({items:arr,savedAt:Date.now()});alert('Cardápio salvo com sucesso!')}catch(e){alert('Não foi possível salvar. Verifique as regras do Realtime Database.')}
    };
    auth.onAuthStateChanged(handleAuthState);
  }catch(e){conn('🔴 Não foi possível carregar o Firebase.','error')}
});
})();