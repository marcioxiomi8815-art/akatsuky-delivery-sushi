/* Akatsuky Delivery Sushi - versão estável sem módulos ES */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const brl = n => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const RESTAURANT_WHATSAPP = '5519989860770';
  const DEFAULT_MENU = [
    ['Combinados','Combinado Akatsuky','Seleção especial da casa.',59.90],
    ['Combinados','Combinado Sushi','Variedade para compartilhar.',79.90],
    ['Sushi','Uramaki Salmão','8 unidades.',32.90],
    ['Sushi','Hot Roll','8 unidades.',29.90],
    ['Sashimi','Sashimi Salmão','Fatias frescas.',39.90],
    ['Temaki','Temaki Salmão','Salmão e arroz.',28.90],
    ['Bebidas','Refrigerante Lata','Escolha o sabor.',6],
    ['Bebidas','Água','Água mineral.',4]
  ].map((x,i)=>({id:i+1,cat:x[0],name:x[1],desc:x[2],price:x[3]}));

  let menu = [...DEFAULT_MENU], cart = [], cat = 'Todos', db = null;

  function setConnection(text, type='ok') {
    const el=$('connection'); if(!el) return;
    el.className='notice '+type;
    el.textContent=text;
  }

  function renderCats(){
    const cats=['Todos',...new Set(menu.map(x=>x.cat))];
    $('cats').innerHTML=cats.map(x=>`<button class="cat ${x===cat?'on':''}" data-cat="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('');
    document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;renderCats();renderMenu();});
  }
  function renderMenu(){
    const list=menu.filter(x=>cat==='Todos'||x.cat===cat);
    $('menu').innerHTML=list.map(x=>`<article class="card product"><div class="catname">${escapeHtml(x.cat)}</div><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.desc)}</p><div class="price">${brl(x.price)}</div><button class="add" data-add="${x.id}">+ ADICIONAR</button></article>`).join('');
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(Number(b.dataset.add)));
    renderCart();
  }
  function add(id){const x=cart.find(i=>i.id===id);x?x.q++:cart.push({id,q:1});renderCart();}
  function del(id){const x=cart.find(i=>i.id===id);if(x&&x.q>1)x.q--;else cart=cart.filter(i=>i.id!==id);renderCart();}
  function renderCart(){
    const total=cart.reduce((s,i)=>{const x=menu.find(m=>m.id===i.id);return s+(x?x.price*i.q:0)},0);
    $('count').textContent=cart.reduce((s,i)=>s+i.q,0)+' itens'; $('total').textContent=brl(total);
    $('cart').className=cart.length?'':'empty';
    $('cart').innerHTML=cart.length?cart.map(i=>{const x=menu.find(m=>m.id===i.id);return `<div class="cartrow"><span><b>${i.q}x</b> ${escapeHtml(x.name)}</span><b>${brl(x.price*i.q)}</b><button class="remove" data-del="${i.id}">−</button></div>`}).join(''):'Carrinho vazio. Adicione produtos acima.';
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(Number(b.dataset.del)));
  }
  function loadMenu(){
    if(!window.firebase){setConnection('🟠 Firebase ainda não carregou. O cardápio local está disponível.','warn');renderCats();renderMenu();return;}
    try{
      db=firebase.database();
      const menuRef=db.ref('settings/menu');
      menuRef.on('value',snap=>{
        const v=snap.val();
        if(v&&Array.isArray(v.items)&&v.items.length) menu=v.items.map((x,i)=>({...x,id:Number(x.id)||i+1,price:Number(x.price)||0}));
        renderCats();renderMenu();
        setConnection('🟢 Sistema conectado • cardápio e pedidos em tempo real','ok');
      },err=>{console.error(err);renderCats();renderMenu();setConnection('🟠 Cardápio local ativo • Firebase não autorizou a leitura','warn');});
    }catch(e){console.error(e);renderCats();renderMenu();setConnection('🟠 Cardápio local ativo • erro na conexão','warn');}
  }
  async function searchCep(){
    const c=$('cep').value.replace(/\D/g,'');
    if(c.length!==8)return alert('Digite um CEP válido.');
    const btn=$('searchCep');btn.disabled=true;btn.textContent='Consultando...';
    try{const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);const d=await r.json();if(d.erro)throw new Error('notfound');$('street').value=d.logradouro||'';$('neighborhood').value=d.bairro||'';$('city').value=d.localidade||'';$('uf').value=d.uf||'';$('number').focus();}
    catch(e){alert(e.message==='notfound'?'CEP não encontrado.':'Não foi possível consultar o CEP. Preencha o endereço manualmente.');}
    finally{btn.disabled=false;btn.textContent='🔎 Buscar CEP';}
  }
  function openWhatsApp(id,o){
    const itens=o.items.map(x=>`${x.qty}x ${x.name} — ${brl(x.price*x.qty)}`).join('\n'); const c=o.customer;
    const msg=`🍣 *NOVO PEDIDO - AKATSUKY DELIVERY SUSHI*\n\nPedido: #${String(id||'LOCAL').slice(-6)}\nNome: ${c.name}\nCelular: ${c.phone}\n\n*Itens:*\n${itens}\n\n*Total:* ${brl(o.total)}\n*Pagamento:* ${c.payment}\n\n*Endereço:*\n${c.street}, ${c.number}\n${c.neighborhood} - ${c.city}/${c.uf}\nCEP: ${c.cep}${c.notes?`\n\nObs.: ${c.notes}`:''}`;
    window.location.href=`https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }
  async function submitOrder(e){
    e.preventDefault();
    if(!cart.length)return alert('Adicione produtos ao carrinho.');
    const total=cart.reduce((s,i)=>{const x=menu.find(m=>m.id===i.id);return s+x.price*i.q},0);
    const o={createdAt:Date.now(),status:'recebido',customer:{name:$('name').value.trim(),phone:$('phone').value.trim(),cep:$('cep').value,street:$('street').value.trim(),number:$('number').value.trim(),neighborhood:$('neighborhood').value.trim(),city:$('city').value.trim(),uf:$('uf').value.trim().toUpperCase(),payment:$('payment').value,notes:$('notes').value.trim()},items:cart.map(i=>{const x=menu.find(m=>m.id===i.id);return{name:x.name,qty:i.q,price:x.price}}),total};
    let id='LOCAL-'+Date.now();
    try{if(db){const r=await db.ref('orders').push(o);id=r.key;localStorage.setItem('lastOrder',id);showTracking(id);}}
    catch(err){console.error(err);alert('O Firebase não aceitou o pedido. O pedido será aberto no WhatsApp mesmo assim.');}
    openWhatsApp(id,o);cart=[];renderCart();
  }
  function showTracking(id){
    if(!db||!id||id.startsWith('LOCAL-'))return;
    $('tracking').classList.remove('hidden');
    db.ref('orders/'+id).on('value',s=>{const o=s.val();if(!o)return;const steps=['recebido','preparando','saiu para entrega','entregue'],idx=Math.max(0,steps.indexOf(o.status));$('trackingBox').innerHTML=`<p><b>Pedido #${id.slice(-6)}</b> <span class="status">${String(o.status).toUpperCase()}</span></p><p>Total: <b>${brl(o.total)}</b></p><div class="timeline">${steps.map((x,i)=>`<div class="step ${i<=idx?'active':''}">${x.toUpperCase()}</div>`).join('')}</div>`;});
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  window.addEventListener('DOMContentLoaded',()=>{
    $('searchCep').onclick=searchCep;
    $('cep').addEventListener('input',e=>{let c=e.target.value.replace(/\D/g,'').slice(0,8);e.target.value=c.length>5?c.slice(0,5)+'-'+c.slice(5):c;});
    $('orderForm').onsubmit=submitOrder;
    const last=localStorage.getItem('lastOrder'); if(last)showTracking(last);
    renderCats();renderMenu();
    if(window.firebase){try{firebase.initializeApp(window.AKATSUKY_FIREBASE_CONFIG);loadMenu();}catch(e){console.error(e);setConnection('🟠 Cardápio local ativo • configuração Firebase inválida','warn');}}else{setConnection('🟠 Cardápio local ativo • carregando conexão...','warn');setTimeout(loadMenu,1000);}
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.warn);
    let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('install').classList.add('show');});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('install').classList.remove('show');}else alert("No celular, abra o menu do navegador e escolha 'Adicionar à tela inicial'.");};
  });
})();
