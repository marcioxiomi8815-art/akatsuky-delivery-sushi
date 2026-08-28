import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), db=getDatabase(app);
const $=id=>document.getElementById(id);
const brl=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const menu=[
["Combinados","Combinado Akatsuky","Seleção especial da casa.",59.90],
["Combinados","Combinado Sushi","Variedade para compartilhar.",79.90],
["Sushi","Uramaki Salmão","8 unidades.",32.90],
["Sushi","Hot Roll","8 unidades.",29.90],
["Sashimi","Sashimi Salmão","Fatias frescas.",39.90],
["Temaki","Temaki Salmão","Salmão e arroz.",28.90],
["Bebidas","Refrigerante Lata","Escolha o sabor.",6],
["Bebidas","Água","Água mineral.",4]
].map((x,i)=>({id:i+1,cat:x[0],name:x[1],desc:x[2],price:x[3]}));
let cart=[],cat="Todos";
$("cats").innerHTML=["Todos",...new Set(menu.map(x=>x.cat))].map(x=>`<button class="cat ${x==="Todos"?"on":""}" data-cat="${x}">${x}</button>`).join("");
document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{cat=b.dataset.cat;document.querySelectorAll(".cat").forEach(x=>x.classList.remove("on"));b.classList.add("on");render()});
function render(){ $("menu").innerHTML=menu.filter(x=>cat==="Todos"||x.cat===cat).map(x=>`<article class="card"><h3>${x.name}</h3><p>${x.desc}</p><b>${brl(x.price)}</b><button onclick="add(${x.id})">+ ADICIONAR</button></article>`).join("");renderCart()}
window.add=id=>{let x=cart.find(i=>i.id===id);x?x.q++:cart.push({id,q:1});renderCart()}
window.del=id=>{cart=cart.filter(i=>i.id!==id);renderCart()}
function renderCart(){let total=cart.reduce((s,i)=>s+menu.find(x=>x.id===i.id).price*i.q,0);$("count").textContent=cart.reduce((s,i)=>s+i.q,0)+" itens";$("total").textContent=brl(total);$("cart").innerHTML=cart.length?cart.map(i=>{let x=menu.find(x=>x.id===i.id);return `<div class="cartrow"><span>${i.q}x ${x.name}</span><b>${brl(x.price*i.q)}</b><button onclick="del(${i.id})">×</button></div>`}).join(""):"Carrinho vazio."}
$("searchCep").onclick=async()=>{let c=$("cep").value.replace(/\D/g,"");if(c.length!==8)return alert("Digite um CEP válido.");let r=await fetch(`https://viacep.com.br/ws/${c}/json/`),d=await r.json();if(d.erro)return alert("CEP não encontrado.");$("street").value=d.logradouro||"";$("neighborhood").value=d.bairro||"";$("city").value=d.localidade||"";$("uf").value=d.uf||"";$("number").focus()};
$("cep").addEventListener("input",e=>{let c=e.target.value.replace(/\D/g,"").slice(0,8);e.target.value=c.length>5?c.slice(0,5)+"-"+c.slice(5):c});
$("orderForm").onsubmit=async e=>{e.preventDefault();if(!cart.length)return alert("Adicione produtos ao carrinho.");let total=cart.reduce((s,i)=>s+menu.find(x=>x.id===i.id).price*i.q,0);let order={createdAt:Date.now(),status:"recebido",customer:{name:$("name").value,phone:$("phone").value,cep:$("cep").value,street:$("street").value,number:$("number").value,neighborhood:$("neighborhood").value,city:$("city").value,uf:$("uf").value,payment:$("payment").value,notes:$("notes").value},items:cart.map(i=>{let x=menu.find(x=>x.id===i.id);return {name:x.name,qty:i.q,price:x.price}}),total};let r=await push(ref(db,"orders"),order);localStorage.setItem("lastOrder",r.key);alert("Pedido enviado! Número: "+r.key);cart=[];renderCart();showTracking(r.key)};
function showTracking(id){$("tracking").classList.remove("hidden");onValue(ref(db,"orders/"+id),s=>{let o=s.val();$("trackingBox").innerHTML=`<p><b>Pedido #${id.slice(-6)}</b></p><div class="status">${o.status.toUpperCase()}</div><p>Total: <b>${brl(o.total)}</b></p>`})}
let last=localStorage.getItem("lastOrder");if(last)showTracking(last);render();$("connection").textContent="Sistema pronto para pedidos online.";