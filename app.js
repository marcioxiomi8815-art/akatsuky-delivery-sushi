const menu=[
 {id:1,cat:"Combinados",name:"Combinado Akatsuky",desc:"Seleção especial da casa.",price:59.90},
 {id:2,cat:"Combinados",name:"Combinado Sushi",desc:"Variedade de sushis para compartilhar.",price:79.90},
 {id:3,cat:"Sashimi",name:"Sashimi Salmão",desc:"Fatias frescas de salmão.",price:39.90},
 {id:4,cat:"Sushi",name:"Uramaki Salmão",desc:"8 unidades.",price:32.90},
 {id:5,cat:"Sushi",name:"Hot Roll",desc:"8 unidades crocantes.",price:29.90},
 {id:6,cat:"Temaki",name:"Temaki Salmão",desc:"Salmão, arroz e ingredientes selecionados.",price:28.90},
 {id:7,cat:"Bebidas",name:"Refrigerante Lata",desc:"Escolha seu sabor.",price:6.00},
 {id:8,cat:"Bebidas",name:"Água",desc:"Água mineral.",price:4.00}
];

let cart=[];
const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const cats=["Todos",...new Set(menu.map(x=>x.cat))];
const catEl=document.getElementById("categories");
const menuEl=document.getElementById("menu");

cats.forEach((c,i)=>{
  const b=document.createElement("button");
  b.className="cat"+(!i?" active":"");
  b.textContent=c;
  b.onclick=()=>{
    document.querySelectorAll(".cat").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    renderMenu(c);
  };
  catEl.appendChild(b);
});

function renderMenu(cat="Todos"){
  menuEl.innerHTML=menu.filter(x=>cat==="Todos"||x.cat===cat)
    .map(x=>`<article class="card"><h3>${x.name}</h3><div class="desc">${x.desc}</div><p class="price">${brl(x.price)}</p><button class="add" onclick="add(${x.id})">+ Adicionar</button></article>`)
    .join("");
}

function add(id){
  const x=cart.find(i=>i.id===id);
  x?x.q++:cart.push({id,q:1});
  renderCart();
}

function change(id,d){
  const x=cart.find(i=>i.id===id);
  if(!x)return;
  x.q+=d;
  if(x.q<=0)cart=cart.filter(i=>i.id!==id);
  renderCart();
}

function renderCart(){
  const el=document.getElementById("cart");
  document.getElementById("cartCount").textContent=`${cart.reduce((s,x)=>s+x.q,0)} itens`;
  if(!cart.length){
    el.className="cart-empty";
    el.textContent="Seu carrinho está vazio.";
    document.getElementById("total").textContent=brl(0);
    return;
  }
  el.className="";
  el.innerHTML=cart.map(i=>{
    const x=menu.find(m=>m.id===i.id);
    return `<div class="cart-item"><div><b>${x.name}</b><br>${brl(x.price)} × ${i.q}</div><div class="qty"><button type="button" onclick="change(${i.id},-1)">−</button> ${i.q} <button type="button" onclick="change(${i.id},1)">+</button></div></div>`;
  }).join("");
  document.getElementById("total").textContent=brl(
    cart.reduce((s,i)=>s+menu.find(m=>m.id===i.id).price*i.q,0)
  );
}

/* CEP: consulta automática no ViaCEP e preenche rua, bairro, cidade e UF. */
const cepInput=document.getElementById("cep");
const cepBtn=document.getElementById("cepBtn");
const cepStatus=document.getElementById("cepStatus");

function cleanCep(v){return v.replace(/\D/g,"").slice(0,8)}
function formatCep(v){
  const d=cleanCep(v);
  return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;
}
function setCepStatus(text,type=""){
  cepStatus.textContent=text;
  cepStatus.className="cep-status"+(type?" "+type:"");
}

let lastCep="";
async function buscarCep(){
  const cep=cleanCep(cepInput.value);
  cepInput.value=formatCep(cep);

  if(cep.length!==8){
    setCepStatus("Digite um CEP com 8 números.","error");
    cepInput.focus();
    return;
  }
  if(cep===lastCep)return;

  setCepStatus("Buscando endereço...");
  cepBtn.disabled=true;

  try{
    const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if(!response.ok)throw new Error("Falha na consulta");
    const data=await response.json();

    if(data.erro){
      setCepStatus("CEP não encontrado. Confira os números.","error");
      return;
    }

    lastCep=cep;
    document.getElementById("street").value=data.logradouro||"";
    document.getElementById("neighborhood").value=data.bairro||"";
    document.getElementById("city").value=data.localidade||"";
    document.getElementById("uf").value=(data.uf||"").toUpperCase();

    setCepStatus("✓ Endereço encontrado. Informe o número e complemento.","ok");
    document.getElementById("number").focus();
  }catch(err){
    setCepStatus("Não foi possível consultar o CEP agora. Tente novamente.","error");
  }finally{
    cepBtn.disabled=false;
  }
}

cepInput.addEventListener("input",()=>{
  cepInput.value=formatCep(cepInput.value);
  if(cleanCep(cepInput.value).length===8)buscarCep();
});
cepBtn.addEventListener("click",buscarCep);

document.getElementById("payment").onchange=e=>
  document.getElementById("changeWrap").classList.toggle("hidden",e.target.value!=="Dinheiro");

document.getElementById("orderForm").onsubmit=e=>{
  e.preventDefault();

  if(!cart.length){
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }
  if(!e.currentTarget.reportValidity())return;

  const items=cart.map(i=>{
    const x=menu.find(m=>m.id===i.id);
    return `${i.q}x ${x.name} - ${brl(x.price*i.q)}`;
  }).join("%0A");

  const total=cart.reduce(
    (s,i)=>s+menu.find(m=>m.id===i.id).price*i.q,0
  );

  const fullAddress=[
    street.value,
    `Nº ${number.value}`,
    neighborhood.value,
    complement.value?`Compl.: ${complement.value}`:"",
    `${city.value} - ${uf.value.toUpperCase()}`,
    `CEP: ${cep.value}`
  ].filter(Boolean).join(", ");

  const msg=`🍣 *NOVO PEDIDO - AKATSUKY DELIVERY SUSHI*%0A%0A${items}%0A%0A💰 *TOTAL: ${brl(total)}*%0A%0A👤 Nome: ${encodeURIComponent(name.value)}%0A📱 WhatsApp: ${encodeURIComponent(phone.value)}%0A📍 Endereço: ${encodeURIComponent(fullAddress)}%0A💳 Pagamento: ${encodeURIComponent(payment.value)}${payment.value==="Dinheiro"&&change.value?`%0A💵 Troco para: ${encodeURIComponent(change.value)}`:""}%0A📝 Observações: ${encodeURIComponent(notes.value||"Nenhuma")}`;

  window.open(`https://wa.me/5519989806770?text=${msg}`,"_blank");
};

renderMenu();
renderCart();

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredPrompt=e;
  installBtn.hidden=false;
});

installBtn.onclick=async()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    installBtn.hidden=true;
  }
};

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
}
