import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPue9vKS_mPD8J-6P5TOQlSyWn1tN5kFc",
  authDomain: "ngetichtech.firebaseapp.com",
  projectId: "ngetichtech",
  storageBucket: "ngetichtech.firebasestorage.app",
  messagingSenderId: "593996404705",
  appId: "1:593996404705:web:9907d2d9ba5e31cc54e4a0"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allPosts = [];
let currentFilter = "All";
let currentPostId = null;

const icons = { Code: "CODE / PROJECT", Photography: "PHOTOGRAPHY", Video: "VIDEO", Writing: "WRITING" };

async function loadPosts(){
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isPublished !== false);
  render();
}
function render(){
  const grid = document.getElementById("grid");
  const search = document.getElementById("searchInput").value.toLowerCase();
  let list = allPosts.filter(p => currentFilter==="All" || p.category===currentFilter);
  if(search) list = list.filter(p => (p.title+p.excerpt+p.content).toLowerCase().includes(search));
  if(!list.length){ grid.innerHTML=""; document.getElementById("empty").style.display="block"; return; }
  document.getElementById("empty").style.display="none";
  grid.innerHTML = list.map(p => `
    <article class="card" onclick="openPost('${p.id}')">
      <div class="card-img">${p.mediaUrl ? `<img src="${p.mediaUrl}" />` : `<span class="icon">${icons[p.category]||p.category}</span>`}</div>
      <div class="card-body"><span class="tag">${p.category} &middot; ${p.type||""}</span><h3>${p.title}</h3><p>${p.excerpt||""}</p><div class="card-meta"><span>${p.createdAt?.toDate ? p.createdAt.toDate().toDateString().slice(4) : ""}</span><span>Read & comment &rarr;</span></div></div>
    </article>`).join("");
}
window.openPost = async (id) => {
  currentPostId = id;
  const p = allPosts.find(x=>x.id===id);
  const content = document.getElementById("modalContent");
  let media = "";
  if(p.mediaUrl){
    if(p.mediaUrl.includes("youtube") || p.mediaUrl.includes("youtu.be")) media = `<iframe width="100%" height="360" src="${p.mediaUrl.replace("watch?v=","embed/")}" frameborder="0" allowfullscreen></iframe>`;
    else if(p.type==="photo" || p.mediaUrl.match(/\.(jpg|jpeg|png|webp)/i)) media = `<img src="${p.mediaUrl}" />`;
    else media = `<p><a href="${p.mediaUrl}" target="_blank">View media &rarr;</a></p>`;
  }
  content.innerHTML = `<p class="tag">${p.category}</p><h2 style="font-family:Fraunces,serif;font-size:32px;line-height:1.1">${p.title}</h2><p style="color:#666">${p.excerpt||""}</p>${media}<div style="white-space:pre-wrap;margin-top:16px">${p.type==="code" ? `<pre>${p.content||""}</pre>` : (p.content||"")}</div>`;
  document.getElementById("modal").style.display="block";
  document.body.style.overflow="hidden";
  loadComments(id);
};
async function loadComments(postId){
  const q = query(collection(db, "comments"), where("postId","==",postId), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  const list = document.getElementById("commentsList");
  if(snap.empty){ list.innerHTML="<p style='color:#888;font-size:14px'>No comments yet. Be the first.</p>"; return; }
  list.innerHTML = snap.docs.map(d=>{ const c=d.data(); return `<div class="comment"><b>${c.visitorName}</b> <small>&middot; ${c.createdAt?.toDate ? c.createdAt.toDate().toDateString().slice(4) : ""}</small><p>${c.body}</p></div>`}).join("");
}
document.getElementById("commentForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const name = document.getElementById("visitorName").value.trim();
  const body = document.getElementById("commentBody").value.trim();
  if(!name || !body) return;
  await addDoc(collection(db, "comments"), { postId: currentPostId, visitorName: name, body, createdAt: serverTimestamp() });
  document.getElementById("commentBody").value="";
  loadComments(currentPostId);
});
function closeModal(){ document.getElementById("modal").style.display="none"; document.body.style.overflow="auto"; }
document.getElementById("modalClose").onclick = closeModal;
document.getElementById("modalX").onclick = closeModal;
document.querySelectorAll(".filter-btn").forEach(b=> b.onclick = ()=>{
  document.querySelectorAll(".filter-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); currentFilter = b.dataset.filter; render();
});
document.getElementById("searchInput").addEventListener("input", render);
loadPosts();