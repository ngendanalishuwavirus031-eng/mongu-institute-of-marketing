// =========================================================================
// Firebase bridge — loads the real Firebase SDK (Auth + Firestore) from
// Google's official CDN and exposes a small, plain-JS API on
// window.FirebaseAPI so the compiled app bundle (bundle.js) can use it
// without needing its own copy of the Firebase SDK bundled in.
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, onSnapshot, query, where, orderBy, serverTimestamp, increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

function segs(path) {
  return path.split("/").filter(Boolean);
}
function docRef(path) {
  return doc(db, ...segs(path));
}
function collRef(path) {
  return collection(db, ...segs(path));
}

async function getUserProfile(uid) {
  const snap = await getDoc(docRef(`users/${uid}`));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

const FirebaseAPI = {
  ready: true,

  // ---------------- AUTH ----------------
  onAuth(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return callback(null);
      const profile = await getUserProfile(user.uid);
      callback(profile);
    });
  },

  async signUp({ email, password, name, role, studentId, staffId, programmeId }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const profile = {
      name, email, role,
      studentId: studentId || null,
      staffId: staffId || null,
      programmeId: programmeId || null,
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef(`users/${uid}`), profile);

    if (role === "student" && programmeId) {
      const progSnap = await getDoc(docRef(`programmes/${programmeId}`));
      const prog = progSnap.exists() ? progSnap.data() : null;
      const generalSnap = await getDoc(docRef("config/fees"));
      const generalTotal = generalSnap.exists()
        ? (generalSnap.data().items || []).reduce((s, f) => s + f.amount, 0)
        : 0;
      const billed = prog ? prog.fee + prog.reg + (prog.admin || 0) + generalTotal : 0;
      await setDoc(docRef(`fees/${uid}`), {
        billed, balance: billed, programmeId, studentName: name, studentId: studentId || null,
      });
    }
    return { uid, ...profile };
  },

  async signIn({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return getUserProfile(cred.user.uid);
  },

  async signOutUser() {
    return signOut(auth);
  },

  async changePassword({ currentPassword, newPassword }) {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in to change your password.");
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    return updatePassword(user, newPassword);
  },

  // ---------------- FIRESTORE: generic ----------------
  subDoc(path, callback) {
    return onSnapshot(docRef(path), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  },

  subCollection(path, callback, opts) {
    let q = collRef(path);
    const clauses = [];
    if (opts && opts.where) clauses.push(where(...opts.where));
    if (opts && opts.orderBy) clauses.push(orderBy(...opts.orderBy));
    if (clauses.length) q = query(collRef(path), ...clauses);
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },

  async getOnce(path, opts) {
    let q = collRef(path);
    const clauses = [];
    if (opts && opts.where) clauses.push(where(...opts.where));
    if (opts && opts.orderBy) clauses.push(orderBy(...opts.orderBy));
    if (clauses.length) q = query(collRef(path), ...clauses);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async setDoc(path, data, merge = true) {
    return setDoc(docRef(path), data, { merge });
  },
  async addDoc(collPath, data) {
    const ref = await addDoc(collRef(collPath), data);
    return ref.id;
  },
  async updateDoc(path, data) {
    return updateDoc(docRef(path), data);
  },
  async deleteDoc(path) {
    return deleteDoc(docRef(path));
  },
  increment(n) {
    return increment(n);
  },
  serverTimestamp() {
    return serverTimestamp();
  },
};

window.FirebaseAPI = FirebaseAPI;
window.dispatchEvent(new Event("firebase-ready"));
