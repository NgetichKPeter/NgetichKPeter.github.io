import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPue9vKS_mPD8J-6P5TOQlSyWn1tN5kFc",
  authDomain: "ngetichtech.firebaseapp.com",
  projectId: "ngetichtech",
  storageBucket: "ngetichtech.firebasestorage.app",
  messagingSenderId: "593996404705",
  appId: "1:593996404705:web:9907d2d9ba5e31cc54e4a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;

// --- LOGIN ---
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  if (!email || !password) {
    errorEl.textContent = "Enter your email and password.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errorEl.textContent = "Wrong email or password. Try again.";
  }
};

// Allow Enter key to login from password field
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("loginBtn").click();
});

// --- LOGOUT ---
document.getElementById("logoutBtn").onclick = () => signOut(auth);

// --- AUTH STATE ---
onAuthStateChanged(auth, (user) => {
  const loginBox = document.getElementById("loginBox");
  const dash = document.getElementById("dash");

  if (user) {
    loginBox.style.display = "none";
    dash.style.display = "block";
    const emailEl = document.getElementById("userEmail");
    if (emailEl) emailEl.textContent = user.email;
    loadAdmin();
  } else {
    loginBox.style.display = "block";
    dash.style.display = "none";
  }
});

// --- SAVE / UPDATE POST ---
document.getElementById("saveBtn").onclick = async () => {
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value;
  const type = document.getElementById("type").value;
  const excerpt = document.getElementById("excerpt").value.trim();
  const mediaUrl = document.getElementById("mediaUrl").value.trim();
  const content = document.getElementById("content").value;

  if (!title) {
    alert("Add a title first.");
    return;
  }

  const btn = document.getElementById("saveBtn");
  btn.textContent = "Publishing...";
  btn.disabled = true;

  try {
    const data = {
      title,
      category,
      type,
      excerpt,
      mediaUrl,
      content,
      isPublished: true,
      createdAt: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, "posts", editingId), data);
      editingId = null;
      document.getElementById("formTitle").textContent = "New Post";
    } else {
      await addDoc(collection(db, "posts"), data);
    }

    // Clear form
    ["title", "excerpt", "mediaUrl", "content"].forEach(id => {
      document.getElementById(id).value = "";
    });

    loadAdmin();
  } catch (e) {
    alert("Could not publish. Check your Firebase rules and internet, then try again.");
    console.error(e);
  }

  btn.textContent = "Publish Post";
  btn.disabled = false;
};

// --- CLEAR FORM ---
document.getElementById("clearBtn").onclick = () => {
  editingId = null;
  ["title", "excerpt", "mediaUrl", "content"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("formTitle").textContent = "New Post";
};

// --- LOAD ADMIN DATA ---
async function loadAdmin() {
  // Posts
  try {
    const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    window._posts = Object.fromEntries(posts.map(p => [p.id, p]));

    const postList = document.getElementById("postList");
    if (!posts.length) {
      postList.innerHTML = "No posts yet. Create your first one above.";
    } else {
      postList.innerHTML = posts.map(p => `
        <div class="post-row">
          <div>
            <b>${escapeHtml(p.title)}</b><br>
            <small>${escapeHtml(p.category)} &middot; ${escapeHtml(p.type)} &middot; ${p.createdAt?.toDate ? p.createdAt.toDate().toDateString().slice(4) : ""}</small>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="btn-edit" onclick="editPost('${p.id}')">Edit</button>
            <button class="btn-danger" onclick="delPost('${p.id}')">Delete</button>
          </div>
        </div>
      `).join("");
    }
  } catch (e) {
    document.getElementById("postList").innerHTML = "Could not load posts. Check Firestore rules.";
    console.error(e);
  }

  // Comments
  try {
    const csnap = await getDocs(query(collection(db, "comments"), orderBy("createdAt", "desc")));
    const commentList = document.getElementById("commentList");
    if (csnap.empty) {
      commentList.innerHTML = "No comments yet.";
    } else {
      commentList.innerHTML = csnap.docs.map(d => {
        const c = d.data();
        return `
          <div class="post-row">
            <div>
              <b>${escapeHtml(c.visitorName || "Visitor")}</b> <small>&middot; ${c.createdAt?.toDate ? c.createdAt.toDate().toDateString().slice(4) : ""}</small><br>
              <span style="font-size:14px;color:#444">${escapeHtml((c.body || "").slice(0, 120))}</span>
            </div>
            <button class="btn-danger" onclick="delComment('${d.id}')">Delete</button>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    document.getElementById("commentList").innerHTML = "Could not load comments.";
    console.error(e);
  }
}

// --- EDIT POST ---
window.editPost = (id) => {
  const p = window._posts[id];
  if (!p) return;
  editingId = id;
  document.getElementById("title").value = p.title || "";
  document.getElementById("category").value = p.category || "Code";
  document.getElementById("type").value = p.type || "text";
  document.getElementById("excerpt").value = p.excerpt || "";
  document.getElementById("mediaUrl").value = p.mediaUrl || "";
  document.getElementById("content").value = p.content || "";
  document.getElementById("formTitle").textContent = "Editing: " + p.title;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// --- DELETE POST ---
window.delPost = async (id) => {
  if (confirm("Delete this post? This cannot be undone.")) {
    await deleteDoc(doc(db, "posts", id));
    loadAdmin();
  }
};

// --- DELETE COMMENT ---
window.delComment = async (id) => {
  if (confirm("Delete this comment?")) {
    await deleteDoc(doc(db, "comments", id));
    loadAdmin();
  }
};

// --- Helper: prevent HTML injection in admin list ---
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}