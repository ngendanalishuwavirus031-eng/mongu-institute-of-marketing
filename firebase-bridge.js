// =========================================================================
// Firebase bridge — loads the real Firebase SDK (Auth + Firestore + Storage)
// from Google's official CDN and exposes a small, plain-JS API on
// window.FirebaseAPI so app.js can use it without a build step.
// =========================================================================
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, onSnapshot, query, where, orderBy, serverTimestamp, increment, arrayUnion, arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
  if (!snap.exists()) return null;
  const data = snap.data();
  const role = (data.role || "").toString().trim().toLowerCase();
  return { uid, ...data, role };
}

async function billStudent({ uid, name, studentId, programmeId }) {
  if (!programmeId) return;
  const progSnap = await getDoc(docRef(`programmes/${programmeId}`));
  const prog = progSnap.exists() ? progSnap.data() : null;
  const generalSnap = await getDoc(docRef("config/fees"));
  const generalTotal = generalSnap.exists()
    ? (generalSnap.data().items || []).reduce((s, f) => s + f.amount, 0)
    : 0;
  const billed = prog ? prog.fee + prog.reg + (prog.admin || 0) + generalTotal : 0;
  await setDoc(docRef(`fees/${uid}`), {
    billed, balance: billed, programmeId, studentName: name, studentId: studentId || null, payments: [],
  });
}

const FirebaseAPI = {
  ready: true,

  // ---------------- AUTH ----------------
  onAuth(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return callback(null);
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          window.dispatchEvent(new CustomEvent("firebase-error", { detail: { path: "users/" + user.uid, err: { code: "not-found", message: "Signed in, but no profile document exists for this account in the users collection." } } }));
          return callback(null);
        }
        callback(profile);
      } catch (err) {
        window.dispatchEvent(new CustomEvent("firebase-error", { detail: { path: "users/" + user.uid, err } }));
        callback(null);
      }
    });
  },

  async signUp({ email, password, name, role, studentId, staffId, programmeId }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const profile = {
      name, email, role,
      studentId: studentId || null,
      staffId: staffId || null,
      examNumber: null,
      programmeId: programmeId || null,
      photoURL: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef(`users/${uid}`), profile);
    if (role === "student") await billStudent({ uid, name, studentId, programmeId });
    return { uid, ...profile };
  },

  async signIn({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return getUserProfile(cred.user.uid);
  },

  async signOutUser() {
    return signOut(auth);
  },

  // Lets an Admin create a Lecturer/Student/Admin/Bursar account without
  // being signed out themselves — uses a temporary secondary Firebase app.
  async adminCreateAccount({ email, password, name, role, studentId, staffId, programmeId }) {
    const secondaryApp = initializeApp(window.FIREBASE_CONFIG, "Secondary-" + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = cred.user.uid;
      const profile = {
        name, email, role,
        studentId: studentId || null, staffId: staffId || null, examNumber: null,
        programmeId: programmeId || null, photoURL: null,
        createdAt: serverTimestamp(),
      };
      await setDoc(docRef(`users/${uid}`), profile);
      if (role === "student") await billStudent({ uid, name, studentId, programmeId });
      await signOut(secondaryAuth);
      return { uid, ...profile };
    } finally {
      await deleteApp(secondaryApp);
    }
  },

  // Admin "deletes" a user's access (removes their Firestore profile so the
  // app treats them as gone). Their Auth login record can only be fully
  // removed from the Firebase Console or a backend Admin SDK — deleting the
  // profile here is enough to lock them out of the portal.
  async deleteUserProfile(uid) {
    await deleteDoc(docRef(`users/${uid}`));
  },

  arrayUnion(value) { return arrayUnion(value); },
  arrayRemove(value) { return arrayRemove(value); },

  async changePassword({ currentPassword, newPassword }) {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in to change your password.");
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    return updatePassword(user, newPassword);
  },

  // ---------------- STORAGE ----------------
  // onProgress(percent) is called repeatedly during upload if provided.
  // Fails with a clear error after 40 seconds of no progress, instead of hanging forever.
  uploadFile(path, file, onProgress) {
    return new Promise((resolve, reject) => {
      const r = ref(storage, path);
      const task = uploadBytesResumable(r, file);
      let lastProgressAt = Date.now();
      const watchdog = setInterval(() => {
        if (Date.now() - lastProgressAt > 40000) {
          clearInterval(watchdog);
          task.cancel();
          reject(new Error("Upload stalled — no data moved for 40 seconds. Your device shows 0.00 KB/s, which usually means there's no working internet connection right now. Check your WiFi/mobile data and try again."));
        }
      }, 5000);
      task.on(
        "state_changed",
        (snap) => {
          lastProgressAt = Date.now();
          if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        },
        (err) => { clearInterval(watchdog); reject(err); },
        async () => {
          clearInterval(watchdog);
          try { resolve(await getDownloadURL(r)); } catch (err) { reject(err); }
        }
      );
    });
  },
  async deleteFile(path) {
    try { await deleteObject(ref(storage, path)); } catch (e) { /* ignore if missing */ }
  },

  // ---------------- FIRESTORE: generic ----------------
  subDoc(path, callback) {
    return onSnapshot(
      docRef(path),
      (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => window.dispatchEvent(new CustomEvent("firebase-error", { detail: { path, err } }))
    );
  },

  subCollection(path, callback, opts) {
    let q = collRef(path);
    const clauses = [];
    if (opts && opts.where) clauses.push(where(...opts.where));
    if (opts && opts.orderBy) clauses.push(orderBy(...opts.orderBy));
    if (clauses.length) q = query(collRef(path), ...clauses);
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }))),
      (err) => window.dispatchEvent(new CustomEvent("firebase-error", { detail: { path, err } }))
    );
  },

  async getOnce(path, opts) {
    let q = collRef(path);
    const clauses = [];
    if (opts && opts.where) clauses.push(where(...opts.where));
    if (opts && opts.orderBy) clauses.push(orderBy(...opts.orderBy));
    if (clauses.length) q = query(collRef(path), ...clauses);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
  },

  async setDoc(path, data, merge = true) {
    return setDoc(docRef(path), data, { merge });
  },
  async addDoc(collPath, data) {
    const ref2 = await addDoc(collRef(collPath), data);
    return ref2.id;
  },
  async updateDoc(path, data) {
    return updateDoc(docRef(path), data);
  },
  async deleteDoc(path) {
    return deleteDoc(docRef(path));
  },
  increment(n) { return increment(n); },
  serverTimestamp() { return serverTimestamp(); },
};

window.FirebaseAPI = FirebaseAPI;
window.dispatchEvent(new Event("firebase-ready"));
