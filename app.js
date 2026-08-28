const RESTAURANT="Akatsuky Delivery Sushi", WHATSAPP="5519989860770";
const original=[
["Combinado Akatsuky","Sushi variado para compartilhar","🍣","Combinados",49.90],
["Combo Salmão","Peças de salmão selecionadas","🍱","Combos",39.90],
["Hot Roll","Hot roll crocante e saboroso","🍤","Hot Roll",29.90],
["Temaki Salmão","Temaki de salmão com cream cheese","🌯","Temaki",24.90],
["Uramaki","Uramaki especial da casa","🍣","Sushi",22.90],
["Sashimi Salmão","Fatias frescas de salmão","🐟","Sashimi",34.90],
["Yakissoba","Yakissoba especial","🍜","Quentes",27.90],
["Guioza","Guioza douradinha","🥟","Entradas",18.90],
["Refrigerante","Lata 350ml","🥤","Bebidas",7.00]
];
let products=JSON.parse(localStorage.akatsukyProducts||"null")||original.map(x=>({name:x[0],desc:x[1],emoji:x[2],cat:x[3],price:x[4]}));
let cart=JSON.parse(localStorage.akatsukyCart||"{}");
const money=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function save(){localStorage.akatsukyProducts=JSON.stringify(products);localStorage.akatsukyCart=JSON.stringify(cart)}
function cats(){let c=["Todos",...new Set(products.map(p=>p.cat))];document.getElementById("categories").innerHTML=c.map((x,i)=>`<button class="${i===0?"active":""}" data-cat="${x}">${x}</button>`).join("");document.querySelectorAll("#categories button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#categories button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render(b.dataset.cat)})}
function render(cat="Todos"){document.getElementById("products").innerHTML=products.filter(p=>cat==="Todos"||p.cat===cat).map((p,i)=>`<article class="card"><div class="photo">${p.emoji}</div><h3>${p.name}</h3><div class="desc">${p.desc}</div><div class="bottom"><span class="price">${money(p.price)}</span><button class="add" onclick="add(${products.indexOf(p)})">+ Adicionar</button></div></article>`).join("")}
function add(i){cart[i]=(cart[i]||0)+1;save();updateCart();toast("Item adicionado ao pedido!")}
function change(i,d){cart[i]+=d;if(cart[i]<=0)delete cart[i];save();updateCart();showCart()}
function total(){return Object.entries(cart).reduce((s,[i,q])=>s+products[i].price*q,0)}
function updateCart(){let n=Object.values(cart).reduce((a,b)=>a+b,0);document.getElementById("cartCount").textContent=n}
function showCart(){let rows=Object.entries(cart);document.getElementById("cartItems").innerHTML=rows.length?rows.map(([i,q])=>`<div class="cartrow"><div><b>${products[i].name}</b><br><small>${money(products[i].price)} cada</small></div><div class="qty"><button onclick="change(${i},-1)">−</button> ${q} <button onclick="change(${i},1)">+</button></div><b>${money(products[i].price*q)}</b></div>`).join(""):`<p class="muted">Seu pedido está vazio.</p>`;document.getElementById("cartTotal").textContent=money(total());document.getElementById("checkoutBtn").disabled=!rows.length}
function openModal(id){document.getElementById(id).classList.remove("hidden")}
function closeModals(){document.querySelectorAll(".modal").forEach(x=>x.classList.add("hidden"))}
document.getElementById("cartFloat").onclick=()=>{showCart();openModal("cartModal")}
document.getElementById("checkoutBtn").onclick=()=>{closeModals();document.getElementById("checkoutTotal").textContent=money(total());openModal("checkoutModal")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeModals);
document.getElementById("payment").onchange=e=>document.getElementById("changeWrap").classList.toggle("hidden",e.target.value!=="Dinheiro");
document.getElementById("checkout").onsubmit=e=>{e.preventDefault();if(!Object.keys(cart).length)return alert("Adicione pelo menos um item.");let lines=Object.entries(cart).map(([i,q])=>`• ${q}x ${products[i].name} — ${money(products[i].price*q)}`).join("\n");let change=document.getElementById("change").value;let msg=`🍣 *NOVO PEDIDO — ${RESTAURANT}*\n\n${lines}\n\n💰 *TOTAL: ${money(total())}*\n\n👤 Cliente: ${document.getElementById("name").value}\n📱 WhatsApp: ${document.getElementById("phone").value}\n📍 Endereço: ${document.getElementById("address").value}\n💳 Pagamento: ${document.getElementById("payment").value}${change?`\n💵 Troco para: R$ ${change}`:""}\n📝 Observações: ${document.getElementById("notes").value||"Nenhuma"}`;window.open("https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(msg),"_blank");}
document.getElementById("adminBtn").onclick=()=>{let p=prompt("Senha administrativa:");if(p==="1234"){renderAdmin();openModal("adminModal")}else if(p!==null)alert("Senha incorreta.")};
function renderAdmin(){document.getElementById("adminList").innerHTML=products.map((p,i)=>`<div class="adminrow"><div><b>${p.name}</b><br><small>${p.cat}</small></div><input type="number" step=".01" value="${p.price}" onchange="products[${i}].price=parseFloat(this.value)||0;save();render();"></div>`).join("")}
document.getElementById("resetData").onclick=()=>{if(confirm("Restaurar os preços originais?")){products=original.map(x=>({name:x[0],desc:x[1],emoji:x[2],cat:x[3],price:x[4]}));save();renderAdmin();render()}}
function toast(t){let x=document.createElement("div");x.textContent=t;x.style="position:fixed;left:50%;bottom:85px;transform:translateX(-50%);background:#24242c;color:#fff;padding:10px 15px;border-radius:10px;z-index:100";document.body.appendChild(x);setTimeout(()=>x.remove(),1500)}
function render(){cats();render("Todos");updateCart()}
render();
let deferred;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;document.getElementById("installBtn").hidden=false});document.getElementById("installBtn").onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null}};
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
