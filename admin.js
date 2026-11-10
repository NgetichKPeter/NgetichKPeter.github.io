import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

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
const auth = getAuth(app);
let editingId = null;

document.getElementById("loginBtn").onclick = async ()=>{
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try{ await signInWithEmailAndPassword(auth, email, password); }
  catch(e){ document.getElementById("loginError").textContent = "Wrong email or password."; }
};
document.getElementById("logoutBtn").onclick = ()=> signOut(auth);
onAuthStateChanged(auth, user=>{
  document.getElementById("loginBox").style.display = user ? "none" : "block";
  document.getElementById("dash").style.display = user ? "block" : "none";
  if(user) loadAdmin();
});
document.getElementById("saveBtn").onclick = async ()=>{
  const data = {
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    excerpt: document.getElementById("excerpt").value.trim(),
    mediaUrl: document.getElementById("mediaUrl").value.trim(),
    content: document.getElementById("content").value,
    isPublished: true, createdAt: serverTimestamp()
  };
  if(!data.title) return alert("Add a title");
  if(editingId){ await updateDoc(doc(db,"posts",editingId), data); editingId=null; document.getElementById("formTitle").textContent="New Post"; }
  else await addDoc(collection(db,"posts"), data);
  ["title","excerpt","mediaUrl","content"].forEach(id=> document.getElementById(id).value="");
  loadAdmin();
};
document.getElementById("clearBtn").onclick = ()=>{ editingId=null; ["title","excerpt","mediaUrl","content"].forEach(id=> document.getElementById(id).value=""); document.getElementById("formTitle").textContent="New Post"; };

async function loadAdmin(){
  const snap = await getDocs(query(collection(db,"posts"), orderBy("createdAt","desc")));
  const posts = snap.docs.map(d=>({id:d.id, ...d.data()}));
  document.getElementById("postList").innerHTML = posts.map(p=> `<div class="post-row"><div><b>${p.title}</b><br><small>${p.category} &middot; ${p.type}</small></div><div><button class="btn-edit" onclick="editPost('${p.id}')">Edit</button> <button class="btn-danger" onclick="delPost('${p.id}')">Delete</button></div></div>`).join("") || "No posts yet.";
  window._posts = Object.fromEntries(posts.map(p=>[p.id,p]));
  const csnap = await getDocs(query(collection(db,"comments"), orderBy("createdAt","desc")));
  document.getElementById("commentList").innerHTML = csnap.docs.map(d=>{ const c=d.data(); return `<div class="post-row"><div><b>${c.visitorName}</b> — ${c.body.slice(0,80)}</div><button class="btn-danger" onclick="delComment('${d.id}')">Delete</button></div>`}).join("") || "No comments yet.";
}
window.editPost = (id)=>{
  const p = window._posts[id]; editingId=id;
  document.getElementById("title").value=p.title; document.getElementById("category").value=p.category;
  document.getElementById("type").value=p.type; document.getElementById("excerpt").value=p.excerpt||"";
  document.getElementById("mediaUrl").value=p.mediaUrl||""; document.getElementById("content").value=p.content||"";
  document.getElementById("formTitle").textContent="Editing: "+p.title; window.scrollTo({top:0, behavior:"smooth"});
};
window.delPost = async (id)=>{ if(confirm("Delete this post?")){ await deleteDoc(doc(db,"posts",id)); loadAdmin(); } };
window.delComment = async (id)=>{ if(confirm("Delete this comment?")){ await deleteDoc(doc(db,"comments",id)); loadAdmin(); } };