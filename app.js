const { useState, useEffect, useMemo, useRef } = React;
const FB = () => window.FirebaseAPI;

const NAVY = "#0F2A4A";
const GOLD = "#C9A227";
const TERMS = ["2026 Term 1", "2026 Term 2", "2026 Term 3"];

function cx(...a) { return a.filter(Boolean).join(" "); }

const ROLE_LABELS = { admin: "Admin", lecturer: "Lecturer", student: "Student", bursar: "Accountant" };
function roleLabel(role) { return ROLE_LABELS[role] || role; }

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function grade(total) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "F";
}

// ---------------------------------------------------------------- Avatar --
function Avatar({ user, size = 40 }) {
  const s = { width: size, height: size };
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" style={s} className="rounded-full object-cover border border-white/20" />;
  }
  return (
    <div style={s} className="rounded-full flex items-center justify-center text-white font-semibold" >
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: GOLD, color: NAVY }}>
        {initials(user?.name) || "?"}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Confirm UI --
function ConfirmModal({ title, body, onYes, onNo }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-2">{title}</h3>
        {body && <p className="text-sm text-gray-600 mb-5">{body}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onNo} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">No</button>
          <button onClick={onYes} className="px-4 py-2 rounded-lg text-white" style={{ background: NAVY }}>Yes</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={cx("bg-white rounded-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2A4A]/30";

// ------------------------------------------------------------- Login ------
function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await FB().signIn({ email: form.email, password: form.password });
    } catch (e2) {
      setErr(e2.message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: NAVY }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <img src="logo.jpg" alt="Mongu Institute of Marketing" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover shadow" />
          <h1 className="font-serif text-xl font-semibold" style={{ color: NAVY }}>Mongu Institute of Marketing</h1>
          <p className="text-xs text-gray-500 mt-1">Student & Staff Portal</p>
        </div>

        <form onSubmit={submit}>
          <Field label="Email">
            <input type="email" required className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <input type="password" required minLength={6} className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
          <button disabled={busy} className="w-full py-2.5 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: NAVY }}>
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>
        <p className="text-[11px] text-gray-400 text-center mt-5">All accounts — student, lecturer, bursar, admin — are created by the Administrator.</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Shell -----
function ProfileModal({ user, onClose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  async function pickPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr("Please choose an image under 2MB."); return; }
    setBusy(true); setErr("");
    try {
      const url = await FB().uploadFile(`profile-photos/${user.uid}`, file);
      await FB().setDoc(`users/${user.uid}`, { photoURL: url });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwErr(""); setPwOk(false);
    if (pwForm.next.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwErr("New passwords don't match."); return; }
    setPwBusy(true);
    try {
      await FB().changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwOk(true);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e2) {
      setPwErr(e2.message.replace("Firebase: ", ""));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <Modal title="My Profile" onClose={onClose}>
      <div className="flex flex-col items-center gap-3 mb-4">
        <Avatar user={user} size={84} />
        <button disabled={busy} onClick={() => fileRef.current.click()} className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
          {busy ? "Uploading…" : "Change photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
      <div className="text-sm space-y-1 border-t pt-4">
        <p><span className="text-gray-500">Name:</span> {user.name}</p>
        <p><span className="text-gray-500">Email:</span> {user.email}</p>
        <p><span className="text-gray-500">Role:</span> {roleLabel(user.role)}</p>
        <p className="font-mono text-[10px] text-gray-400 break-all"><span className="text-gray-500 font-sans">Account ID:</span> {user.uid}</p>
        {user.studentId && <p><span className="text-gray-500">Student No:</span> {user.studentId}</p>}
        {user.examNumber && <p><span className="text-gray-500">Exam No:</span> {user.examNumber}</p>}
      </div>

      <div className="border-t pt-4 mt-4">
        <button onClick={() => setPwOpen((v) => !v)} className="text-sm font-medium" style={{ color: NAVY }}>
          {pwOpen ? "▾" : "▸"} Change password
        </button>
        {pwOpen && (
          <form onSubmit={changePassword} className="mt-3">
            <Field label="Current password"><input type="password" required className={inputCls} value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></Field>
            <Field label="New password"><input type="password" required minLength={6} className={inputCls} value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} /></Field>
            <Field label="Confirm new password"><input type="password" required minLength={6} className={inputCls} value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} /></Field>
            {pwErr && <p className="text-xs text-red-600 mb-2">{pwErr}</p>}
            {pwOk && <p className="text-xs text-green-600 mb-2">Password updated.</p>}
            <button disabled={pwBusy} className="w-full py-2 rounded-lg text-white text-sm font-medium" style={{ background: NAVY }}>{pwBusy ? "Saving…" : "Save new password"}</button>
          </form>
        )}
      </div>
    </Modal>
  );
}

const NAV_ITEMS = {
  admin: [
    ["overview", "Overview"], ["users", "Manage Users"],
    ["programmes", "Programs & Fees"],
    ["fees", "Fees Overview"], ["results", "Results"],
    ["liveclasses", "Online Learning"], ["announcements", "Announcements"],
  ],
  lecturer: [
    ["overview", "My Courses"], ["assignments", "Assignments & Quizzes"],
    ["notes", "Notes"], ["results", "Term Results"],
    ["liveclasses", "Online Learning"], ["announcements", "Announcements"],
  ],
  student: [
    ["overview", "My Courses"], ["work", "Assignments & Quizzes"],
    ["results", "My Results"], ["notes", "Notes"], ["fees", "My Fees"],
    ["liveclasses", "Online Learning"], ["announcements", "Announcements"],
  ],
  bursar: [
    ["fees", "Fees Overview"],
  ],
};

function Shell({ user, page, setPage, children }) {
  const [showProfile, setShowProfile] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS[user.role] || [];

  function pick(key) { setPage(key); setMobileOpen(false); }

  return (
    <div className="min-h-screen flex" style={{ background: "#F6F3EA" }}>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cx(
        "w-64 shrink-0 text-white flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ background: NAVY }}>
        <div className="p-5 border-b border-white/10 flex items-center gap-2.5">
          <img src="logo.jpg" alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          <div>
            <div className="font-serif font-semibold leading-tight">MIM Portal</div>
            <div className="text-[11px] text-white/50">{roleLabel(user.role)} dashboard</div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-5 text-xs text-white/50">
              No menu found for role "{user.role || "(none)"}". Ask the Administrator to check this account's role in the Users list.
            </p>
          )}
          {items.map(([key, label]) => (
            <button key={key} onClick={() => pick(key)}
              className={cx("w-full text-left px-5 py-2.5 text-sm", page === key ? "bg-white/10 border-l-2" : "text-white/70 hover:bg-white/5")}
              style={page === key ? { borderColor: GOLD } : {}}>
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={() => setConfirmOut(true)} className="w-full text-left text-sm text-white/80 hover:text-white">Sign out</button>
          <p className="text-center text-[10px] text-white/25 mt-3">MIM Portal · Build 2026-07-18.8</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-lg" style={{ color: NAVY }}>
              ☰
            </button>
            <div className="font-serif font-medium truncate" style={{ color: NAVY }}>
              {(items.find((i) => i[0] === page) || [, ""])[1]}
            </div>
          </div>
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 shrink-0">
            <Avatar user={user} size={34} />
            <span className="text-sm text-gray-700 hidden sm:inline">{user.name}</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {confirmOut && (
        <ConfirmModal
          title="Sign out?"
          body="You'll need to sign in again to access the portal."
          onNo={() => setConfirmOut(false)}
          onYes={() => FB().signOutUser()}
        />
      )}
    </div>
  );
}

// =============================================================== ADMIN ====
function StatCard({ label, value, icon, accent }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: (accent || GOLD) + "22" }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-serif font-semibold leading-tight" style={{ color: NAVY }}>{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function FeesSummaryCards({ fees }) {
  const totalBilled = fees.reduce((s, f) => s + (f.billed || 0), 0);
  const totalBalance = fees.reduce((s, f) => s + (f.balance || 0), 0);
  const totalCollected = totalBilled - totalBalance;
  const studentsCleared = fees.filter((f) => (f.balance || 0) <= 0).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total billed (K)" value={totalBilled.toLocaleString()} icon="🧾" />
      <StatCard label="Fees collected (K)" value={totalCollected.toLocaleString()} icon="✅" accent="#16a34a" />
      <StatCard label="Outstanding (K)" value={totalBalance.toLocaleString()} icon="⚠️" accent="#dc2626" />
      <StatCard label="Students cleared" value={`${studentsCleared}/${fees.length}`} icon="📋" />
    </div>
  );
}

function AdminOverview({ users, courses, fees, results, assignments, announcements }) {
  const counts = useMemo(() => {
    const c = { admin: 0, lecturer: 0, student: 0, bursar: 0 };
    users.forEach((u) => { if (c[u.role] !== undefined) c[u.role]++; });
    return c;
  }, [users]);
  const quizCount = assignments.filter((a) => a.kind === "quiz").length;
  const assignmentCount = assignments.filter((a) => a.kind === "assignment").length;

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">People</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students" value={counts.student} icon="🎓" />
        <StatCard label="Lecturers" value={counts.lecturer} icon="🧑‍🏫" />
        <StatCard label="Accountants" value={counts.bursar} icon="💼" />
        <StatCard label="Courses" value={courses.length} icon="📚" />
      </div>

      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Fees</p>
      <FeesSummaryCards fees={fees} />

      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Academics</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assignments posted" value={assignmentCount} icon="📝" />
        <StatCard label="Quizzes posted" value={quizCount} icon="❓" />
        <StatCard label="Results entered" value={results.length} icon="📊" />
        <StatCard label="Announcements" value={announcements.length} icon="📣" />
      </div>
    </div>
  );
}

function AdminUsers({ users, programmes }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [delUser, setDelUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", staffId: "", studentId: "", programmeId: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function addUser(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await FB().adminCreateAccount(form);
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "student", staffId: "", studentId: "", programmeId: "" });
    } catch (e2) { setErr(e2.message.replace("Firebase: ", "")); }
    finally { setBusy(false); }
  }

  async function saveExamNumber(u, val) {
    await FB().setDoc(`users/${u.uid}`, { examNumber: val });
  }

  function openEdit(u) {
    setEditUser(u);
    setEditForm({ name: u.name || "", studentId: u.studentId || "", staffId: u.staffId || "", programmeId: u.programmeId || "" });
    setEditErr("");
  }

  async function saveEdit(e) {
    e.preventDefault(); setEditBusy(true); setEditErr("");
    try {
      await FB().setDoc(`users/${editUser.uid}`, {
        name: editForm.name,
        studentId: editUser.role === "student" ? editForm.studentId : editUser.studentId || null,
        programmeId: editUser.role === "student" ? editForm.programmeId : editUser.programmeId || null,
        staffId: editUser.role !== "student" ? editForm.staffId : editUser.staffId || null,
      });
      setEditUser(null);
    } catch (e2) { setEditErr(e2.message); }
    finally { setEditBusy(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{users.length} accounts</p>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>+ Add user</button>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.uid} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{u.name}</div>
                <div className="text-xs text-gray-400 truncate">{u.email}</div>
                <div className="text-xs text-gray-500 mt-0.5">{roleLabel(u.role)}{u.studentId ? ` · ${u.studentId}` : ""}</div>
                <div className="text-[10px] text-gray-300 mt-0.5 font-mono">ID: {u.uid}</div>
              </div>
              <div className="shrink-0 flex gap-3">
                <button onClick={() => openEdit(u)} className="text-xs" style={{ color: NAVY }}>Edit</button>
                <button onClick={() => setDelUser(u)} className="text-red-500 text-xs hover:underline">Delete</button>
              </div>
            </div>
            {u.role === "student" && (
              <div className="mt-2">
                <input defaultValue={u.examNumber || ""} onBlur={(e) => saveExamNumber(u, e.target.value)}
                  placeholder="Set exam number" className="border border-gray-200 rounded px-2 py-1.5 text-xs w-full max-w-[160px]" />
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-400">No accounts yet.</p>}
      </div>

      {showAdd && (
        <Modal title="Add user" onClose={() => setShowAdd(false)}>
          <form onSubmit={addUser}>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option><option value="lecturer">Lecturer</option>
                <option value="bursar">Accountant</option><option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Full name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><input type="email" required className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password"><input required minLength={6} className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            {form.role === "student" && (
              <>
                <Field label="Student number"><input className={inputCls} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></Field>
                <Field label="Programme">
                  <select required className={inputCls} value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}>
                    <option value="">Select…</option>{programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </>
            )}
            {(form.role === "lecturer" || form.role === "bursar" || form.role === "admin") && (
              <Field label="Staff ID"><input className={inputCls} value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} /></Field>
            )}
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <button disabled={busy} className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>{busy ? "Creating…" : "Create account"}</button>
          </form>
        </Modal>
      )}

      {editUser && editForm && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={saveEdit}>
            <Field label="Full name"><input required className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
            {editUser.role === "student" && (
              <>
                <Field label="Student number"><input className={inputCls} value={editForm.studentId} onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })} /></Field>
                <Field label="Programme">
                  <select className={inputCls} value={editForm.programmeId} onChange={(e) => setEditForm({ ...editForm, programmeId: e.target.value })}>
                    <option value="">Select…</option>{programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </>
            )}
            {editUser.role !== "student" && (
              <Field label="Staff ID"><input className={inputCls} value={editForm.staffId} onChange={(e) => setEditForm({ ...editForm, staffId: e.target.value })} /></Field>
            )}
            <p className="text-xs text-gray-400 mb-2">Email and password can't be changed here — the person can change their own password from their Profile.</p>
            {editErr && <p className="text-xs text-red-600 mb-2">{editErr}</p>}
            <button disabled={editBusy} className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>{editBusy ? "Saving…" : "Save changes"}</button>
          </form>
        </Modal>
      )}

      {delUser && (
        <ConfirmModal title={`Remove ${delUser.name}?`} body="They will lose access to the portal immediately."
          onNo={() => setDelUser(null)}
          onYes={async () => { await FB().deleteUserProfile(delUser.uid); setDelUser(null); }} />
      )}
    </div>
  );
}

function ProgramCourses({ programmeId, courses, users }) {
  const [showAdd, setShowAdd] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);
  const [delCourse, setDelCourse] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", lecturerId: "" });
  const [err, setErr] = useState("");
  const lecturers = users.filter((u) => u.role === "lecturer");

  async function addCourse(e) {
    e.preventDefault();
    setErr("");
    try {
      await FB().addDoc("courses", { ...form, programmeId, studentIds: [], createdAt: FB().serverTimestamp() });
      setShowAdd(false); setForm({ name: "", code: "", lecturerId: "" });
    } catch (e2) {
      setErr(e2.message || "Could not create the course. Please try again.");
    }
  }

  async function saveLecturer(courseId, lecturerId) {
    try {
      await FB().updateDoc(`courses/${courseId}`, { lecturerId: lecturerId || null });
    } catch (e2) {
      alert("Could not save: " + (e2 && e2.message ? e2.message : "unknown error"));
    }
    setAssignCourse(null);
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Courses ({courses.length})</p>
        <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>+ Add course</button>
      </div>
      {lecturers.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
          No lecturer accounts exist yet — add one under Manage Users to assign courses.
        </p>
      )}
      <div className="space-y-2">
        {courses.map((c) => {
          const lec = users.find((u) => u.uid === c.lecturerId);
          return (
            <div key={c.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="text-sm font-medium">{c.name} <span className="text-xs text-gray-400">({c.code})</span></div>
                <button onClick={() => setDelCourse(c)} className="shrink-0 text-xs text-red-500">Delete</button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Lecturer: {lec ? lec.name : "Unassigned"} · {(c.studentIds || []).length} students</p>
              <button onClick={() => setAssignCourse(c)} className="mt-1.5 text-xs px-2.5 py-1 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>
                {lec ? "Change lecturer" : "Assign lecturer"}
              </button>
            </div>
          );
        })}
        {courses.length === 0 && <p className="text-xs text-gray-400">No courses under this programme yet.</p>}
      </div>
      {showAdd && (
        <Modal title="Add course" onClose={() => setShowAdd(false)}>
          <form onSubmit={addCourse}>
            <Field label="Course name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Course code"><input required className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Lecturer">
              <select className={inputCls} value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })}>
                <option value="">Unassigned for now</option>{lecturers.map((l) => <option key={l.uid} value={l.uid}>{l.name}</option>)}
              </select>
            </Field>
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <button className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>Create course</button>
          </form>
        </Modal>
      )}
      {assignCourse && (
        <Modal title={`Assign lecturer — ${assignCourse.name}`} onClose={() => setAssignCourse(null)}>
          <Field label="Lecturer">
            <select className={inputCls} defaultValue={assignCourse.lecturerId || ""} onChange={(e) => saveLecturer(assignCourse.id, e.target.value)}>
              <option value="">Unassigned</option>
              {lecturers.map((l) => <option key={l.uid} value={l.uid}>{l.name}</option>)}
            </select>
          </Field>
          {lecturers.length === 0 && <p className="text-xs text-gray-400 mt-1">No lecturer accounts exist yet — add one under Manage Users first.</p>}
        </Modal>
      )}
      {delCourse && (
        <ConfirmModal title={`Delete "${delCourse.name}"?`} body="This removes the course and all its enrollment data."
          onNo={() => setDelCourse(null)}
          onYes={async () => { await FB().deleteDoc(`courses/${delCourse.id}`); setDelCourse(null); }} />
      )}
    </div>
  );
}

const BROCHURE_GENERAL_FEES = [
  { name: "Transport", amount: 500 },
  { name: "Library Fee", amount: 350 },
  { name: "T-Shirt", amount: 210 },
  { name: "Medical Fee", amount: 200 },
  { name: "ID", amount: 150 },
];

function AdminProgrammes({ programmes, courses, users }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editProg, setEditProg] = useState(null);
  const [delProg, setDelProg] = useState(null);
  const [pForm, setPForm] = useState({ name: "", duration: "", entryQualifications: "", fee: "", reg: "", admin: "" });

  const [generalFees, setGeneralFees] = useState(null); // null = loading
  const [gfVersionless, setGfVersionless] = useState(false); // config/fees doc may not exist yet
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ name: "", amount: "" });
  const [gfBusy, setGfBusy] = useState(false);

  useEffect(() => {
    const unsub = FB().subDoc("config/fees", (doc) => {
      setGeneralFees(doc ? (doc.items || []) : []);
      setGfVersionless(!doc);
    });
    return () => unsub && unsub();
  }, []);

  async function saveProgramme(e) {
    e.preventDefault();
    const data = {
      name: pForm.name, duration: pForm.duration, entryQualifications: pForm.entryQualifications,
      fee: Number(pForm.fee) || 0, reg: Number(pForm.reg) || 0, admin: Number(pForm.admin) || 0,
    };
    if (editProg) await FB().updateDoc(`programmes/${editProg.id}`, data);
    else await FB().addDoc("programmes", data);
    setShowAdd(false); setEditProg(null);
    setPForm({ name: "", duration: "", entryQualifications: "", fee: "", reg: "", admin: "" });
  }

  function openEdit(p) {
    setEditProg(p);
    setPForm({ name: p.name || "", duration: p.duration || "", entryQualifications: p.entryQualifications || "", fee: p.fee || "", reg: p.reg || "", admin: p.admin || "" });
    setShowAdd(true);
  }

  async function saveGeneralFees(items) {
    setGfBusy(true);
    try {
      await FB().setDoc("config/fees", { items });
      setGeneralFees(items);
    } finally { setGfBusy(false); }
  }

  async function addFeeItem(e) {
    e.preventDefault();
    const amt = Number(feeForm.amount);
    if (!feeForm.name || !amt) return;
    await saveGeneralFees([...(generalFees || []), { name: feeForm.name, amount: amt }]);
    setFeeForm({ name: "", amount: "" }); setShowAddFee(false);
  }
  async function removeFeeItem(idx) {
    await saveGeneralFees((generalFees || []).filter((_, i) => i !== idx));
  }
  async function loadBrochureDefaults() {
    await saveGeneralFees(BROCHURE_GENERAL_FEES);
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Programmes</p>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{programmes.length} programmes</p>
        <button onClick={() => { setEditProg(null); setPForm({ name: "", duration: "", entryQualifications: "", fee: "", reg: "", admin: "" }); setShowAdd(true); }}
          className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>+ Add programme</button>
      </div>
      <div className="space-y-2 mb-8">
        {programmes.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{p.duration}{p.entryQualifications ? ` · ${p.entryQualifications}` : ""}</div>
              </div>
              <button onClick={() => openEdit(p)} className="shrink-0 text-xs" style={{ color: NAVY }}>Edit</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center border-t pt-3">
              <div><span className="text-gray-400 block">Fee/term</span><span className="font-medium">K{(p.fee || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-400 block">Registration</span><span className="font-medium">K{(p.reg || 0).toLocaleString()}</span></div>
              <div><span className="text-gray-400 block">Admin fee</span><span className="font-medium">K{(p.admin || 0).toLocaleString()}</span></div>
            </div>
            <ProgramCourses programmeId={p.id} courses={courses.filter((c) => c.programmeId === p.id)} users={users} />
          </div>
        ))}
        {programmes.length === 0 && <p className="text-sm text-gray-400">No programmes yet — add your first one above.</p>}
      </div>

      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">General fees (billed to every student)</p>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{generalFees === null ? "Loading…" : `${generalFees.length} items`}</p>
        <div className="flex gap-2">
          {generalFees && generalFees.length === 0 && (
            <button onClick={loadBrochureDefaults} disabled={gfBusy} className="px-3 py-2 rounded-lg text-xs border" style={{ borderColor: NAVY, color: NAVY }}>Load brochure defaults</button>
          )}
          <button onClick={() => setShowAddFee(true)} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>+ Add fee item</button>
        </div>
      </div>
      <div className="space-y-2">
        {(generalFees || []).map((f, idx) => (
          <div key={idx} className="bg-white rounded-xl border p-3 flex justify-between items-center">
            <span className="text-sm">{f.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">K{f.amount.toLocaleString()}</span>
              <button onClick={() => removeFeeItem(idx)} className="text-xs text-red-500">Remove</button>
            </div>
          </div>
        ))}
        {generalFees && generalFees.length === 0 && <p className="text-sm text-gray-400">No general fee items yet — e.g. Transport, Library, T-Shirt, Medical, ID.</p>}
      </div>
      <p className="text-xs text-gray-400 mt-2">Note: these apply to new students at signup. Changing this list won't retroactively change bills already issued.</p>

      {showAdd && (
        <Modal title={editProg ? "Edit programme" : "Add programme"} onClose={() => setShowAdd(false)}>
          <form onSubmit={saveProgramme}>
            <Field label="Programme name"><input required className={inputCls} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></Field>
            <Field label="Duration"><input placeholder="e.g. 3 years Full time" className={inputCls} value={pForm.duration} onChange={(e) => setPForm({ ...pForm, duration: e.target.value })} /></Field>
            <Field label="Entry qualifications"><input placeholder="e.g. 5 Credits including English" className={inputCls} value={pForm.entryQualifications} onChange={(e) => setPForm({ ...pForm, entryQualifications: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Fee/term (K)"><input type="number" className={inputCls} value={pForm.fee} onChange={(e) => setPForm({ ...pForm, fee: e.target.value })} /></Field>
              <Field label="Registration (K)"><input type="number" className={inputCls} value={pForm.reg} onChange={(e) => setPForm({ ...pForm, reg: e.target.value })} /></Field>
              <Field label="Admin fee (K)"><input type="number" className={inputCls} value={pForm.admin} onChange={(e) => setPForm({ ...pForm, admin: e.target.value })} /></Field>
            </div>
            <button className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>{editProg ? "Save changes" : "Create programme"}</button>
          </form>
        </Modal>
      )}

      {showAddFee && (
        <Modal title="Add general fee item" onClose={() => setShowAddFee(false)}>
          <form onSubmit={addFeeItem}>
            <Field label="Fee name"><input required placeholder="e.g. Library Fee" className={inputCls} value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} /></Field>
            <Field label="Amount (K)"><input required type="number" className={inputCls} value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} /></Field>
            <button disabled={gfBusy} className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>{gfBusy ? "Saving…" : "Add item"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function FeesTable({ fees, editable }) {
  const [payUser, setPayUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  async function recordPayment() {
    setErr("");
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    setBusy(true);
    try {
      const updated = [...(payUser.payments || []), { amount: amt, date: new Date().toISOString() }];
      const newBalance = (payUser.balance || 0) - amt;
      await FB().setDoc(`fees/${payUser.id}`, { balance: newBalance, payments: updated });
      setPayUser({ ...payUser, balance: newBalance, payments: updated });
      setAmount("");
    } catch (e2) {
      setErr(e2.message || "Could not save this payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEditedPayment(idx) {
    setErr("");
    const newAmt = Number(editAmount);
    if (!newAmt || newAmt <= 0) { setErr("Enter an amount greater than 0."); return; }
    setBusy(true);
    try {
      const payments = [...(payUser.payments || [])];
      const oldAmt = payments[idx].amount;
      payments[idx] = { ...payments[idx], amount: newAmt };
      const newBalance = (payUser.balance || 0) + oldAmt - newAmt;
      await FB().setDoc(`fees/${payUser.id}`, { balance: newBalance, payments });
      setPayUser({ ...payUser, balance: newBalance, payments });
      setEditIdx(null); setEditAmount("");
    } catch (e2) {
      setErr(e2.message || "Could not update this payment.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePayment(idx) {
    setBusy(true); setErr("");
    try {
      const payments = [...(payUser.payments || [])];
      const removed = payments.splice(idx, 1)[0];
      const newBalance = (payUser.balance || 0) + (removed ? removed.amount : 0);
      await FB().setDoc(`fees/${payUser.id}`, { balance: newBalance, payments });
      setPayUser({ ...payUser, balance: newBalance, payments });
    } catch (e2) {
      setErr(e2.message || "Could not remove this payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {fees.map((f) => (
        <div key={f.id} className="bg-white rounded-xl border p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{f.studentName}</div>
              <div className="text-xs text-gray-400">{f.studentId}</div>
            </div>
            {f.balance > 0
              ? <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Balance due</span>
              : <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Cleared</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div><span className="text-xs text-gray-400 block">Billed</span>K{(f.billed || 0).toLocaleString()}</div>
            <div><span className="text-xs text-gray-400 block">Balance</span>K{(f.balance || 0).toLocaleString()}</div>
          </div>
          {editable && (
            <button onClick={() => { setPayUser(f); setErr(""); setAmount(""); setEditIdx(null); }} className="mt-3 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>
              Manage payments
            </button>
          )}
        </div>
      ))}
      {fees.length === 0 && <p className="text-sm text-gray-400">No fee records yet.</p>}

      {payUser && (
        <Modal title={`Payments — ${payUser.studentName}`} onClose={() => setPayUser(null)} wide>
          <p className="text-xs text-gray-400 mb-2">Payment history</p>
          <div className="border rounded-lg divide-y mb-4 max-h-52 overflow-y-auto">
            {(payUser.payments || []).length === 0 && <p className="p-3 text-xs text-gray-400">No payments recorded yet.</p>}
            {(payUser.payments || []).map((p, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                {editIdx === idx ? (
                  <>
                    <input type="number" autoFocus className={inputCls + " flex-1"} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                    <button disabled={busy} onClick={() => saveEditedPayment(idx)} className="text-xs" style={{ color: NAVY }}>Save</button>
                    <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400">Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="text-sm">K{p.amount.toLocaleString()} <span className="text-xs text-gray-400">— {new Date(p.date).toLocaleDateString()}</span></div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => { setEditIdx(idx); setEditAmount(String(p.amount)); }} className="text-xs" style={{ color: NAVY }}>Edit</button>
                      <button disabled={busy} onClick={() => deletePayment(idx)} className="text-xs text-red-500">Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-2">Add a new payment</p>
          <Field label="Amount (K)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
          <button disabled={busy} onClick={recordPayment} className="w-full py-2.5 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: NAVY }}>{busy ? "Saving…" : "Add payment"}</button>
        </Modal>
      )}
    </div>
  );
}

function FeesPage({ fees }) {
  return (
    <div>
      <FeesSummaryCards fees={fees} />
      <FeesTable fees={fees} editable />
    </div>
  );
}

function ResultsTable({ results, showStudent, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {results.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              {showStudent && <div className="font-medium text-sm truncate">{r.studentName}</div>}
              <div className="text-sm text-gray-600 truncate">{r.courseName}</div>
              <div className="text-xs text-gray-400">{r.term}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-serif font-semibold" style={{ color: NAVY }}>{r.total}</div>
              <div className="text-xs text-gray-400">Grade {r.grade}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center border-t pt-3">
            <div><span className="text-gray-400 block">Assignment</span><span className="font-medium">{r.assignmentScore}</span></div>
            <div><span className="text-gray-400 block">Test</span><span className="font-medium">{r.testScore}</span></div>
            <div><span className="text-gray-400 block">CA /40</span><span className="font-medium">{r.caTotal}</span></div>
            <div><span className="text-gray-400 block">Exam /60</span><span className="font-medium">{r.examScore}</span></div>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-3 mt-2 pt-2 border-t">
              {onEdit && <button onClick={() => onEdit(r)} className="text-xs" style={{ color: NAVY }}>Edit</button>}
              {onDelete && <button onClick={() => onDelete(r)} className="text-xs text-red-500">Delete</button>}
            </div>
          )}
        </div>
      ))}
      {results.length === 0 && <p className="text-sm text-gray-400">No results yet.</p>}
    </div>
  );
}

function AnnouncementsBoard({ announcements, courses, canPost, postScope, currentUser }) {
  const [text, setText] = useState({ title: "", body: "", courseId: "all" });
  async function post(e) {
    e.preventDefault();
    await FB().addDoc("announcements", {
      title: text.title, body: text.body,
      courseId: text.courseId, authorName: currentUser.name, authorRole: currentUser.role,
      createdAt: FB().serverTimestamp(),
    });
    setText({ title: "", body: "", courseId: text.courseId });
  }
  return (
    <div>
      {canPost && (
        <form onSubmit={post} className="bg-white rounded-xl border p-4 mb-4">
          {postScope === "choose" && (
            <Field label="Post to">
              <select className={inputCls} value={text.courseId} onChange={(e) => setText({ ...text, courseId: e.target.value })}>
                <option value="all">Whole school</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Title"><input required className={inputCls} value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} /></Field>
          <Field label="Message"><textarea required rows={3} className={inputCls} value={text.body} onChange={(e) => setText({ ...text, body: e.target.value })} /></Field>
          <button className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>Post announcement</button>
        </form>
      )}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-start">
              <div className="font-serif font-semibold" style={{ color: NAVY }}>{a.title}</div>
              <span className="text-[10px] text-gray-400 capitalize">{a.authorRole}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
            <p className="text-[11px] text-gray-400 mt-2">— {a.authorName}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
      </div>
    </div>
  );
}

function fmtSchedule(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function LecturerLiveClasses({ myCourses, classes }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delClass, setDelClass] = useState(null);
  const [form, setForm] = useState({ courseId: "", title: "", link: "", scheduledAt: "" });
  const [err, setErr] = useState("");

  async function add(e) {
    e.preventDefault();
    setErr("");
    const course = myCourses.find((c) => c.id === form.courseId);
    if (!course) { setErr("Please select a course."); return; }
    try {
      await FB().addDoc("liveclasses", {
        courseId: form.courseId, courseName: course.name, title: form.title, link: form.link,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        createdAt: FB().serverTimestamp(),
      });
      setShowAdd(false); setForm({ courseId: "", title: "", link: "", scheduledAt: "" });
    } catch (e2) {
      setErr(e2.message || "Could not schedule this class.");
    }
  }

  const sorted = [...classes].sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{classes.length} scheduled</p>
        <button onClick={() => setShowAdd(true)} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ Schedule live class</button>
      </div>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm">{c.title}</div>
                <div className="text-xs text-gray-500">{c.courseName}</div>
                {c.scheduledAt && <div className="text-xs text-gray-400 mt-1">{fmtSchedule(c.scheduledAt)}</div>}
              </div>
              <button onClick={() => setDelClass(c)} className="shrink-0 text-xs text-red-500">Delete</button>
            </div>
            <a href={c.link} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>Open link</a>
          </div>
        ))}
        {classes.length === 0 && <p className="text-sm text-gray-400">No live classes scheduled yet.</p>}
      </div>

      {showAdd && (
        <Modal title="Schedule live class" onClose={() => setShowAdd(false)}>
          <form onSubmit={add}>
            <Field label="Course">
              <select required className={inputCls} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Select…</option>{myCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Title"><input required placeholder="e.g. Week 4 Lecture" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Meeting link (Zoom / Google Meet)"><input required type="url" placeholder="https://..." className={inputCls} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
            <Field label="Date & time"><input type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <button className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>Schedule</button>
          </form>
        </Modal>
      )}
      {delClass && (
        <ConfirmModal title={`Cancel "${delClass.title}"?`} onNo={() => setDelClass(null)}
          onYes={async () => { await FB().deleteDoc(`liveclasses/${delClass.id}`); setDelClass(null); }} />
      )}
    </div>
  );
}

function StudentLiveClasses({ classes }) {
  const sorted = [...classes].sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));
  return (
    <div className="space-y-2">
      {sorted.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border p-4">
          <div className="font-medium text-sm">{c.title}</div>
          <div className="text-xs text-gray-500">{c.courseName}</div>
          {c.scheduledAt && <div className="text-xs text-gray-400 mt-1">{fmtSchedule(c.scheduledAt)}</div>}
          <a href={c.link} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>Join class</a>
        </div>
      ))}
      {classes.length === 0 && <p className="text-sm text-gray-400">No live classes scheduled for your courses yet.</p>}
    </div>
  );
}

// ============================================================= LECTURER ===
function CourseDetailModal({ course, role, notes, assignments, liveClasses, results, submissions, allUsers, currentUser, onClose }) {
  const tabs = role === "lecturer"
    ? [["notes", "Notes"], ["assignments", "Assignments & Quizzes"], ["liveclasses", "Online Learning"], ["results", "Results"]]
    : [["notes", "Notes"], ["work", "Assignments & Quizzes"], ["liveclasses", "Online Learning"], ["results", "My Results"]];
  const [tab, setTab] = useState(tabs[0][0]);
  const myCourseArr = [course];

  return (
    <Modal title={course.name} onClose={onClose} wide>
      <div className="flex flex-wrap gap-1.5 mb-4 -mt-1">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cx("text-xs px-3 py-1.5 rounded-full border", tab === key ? "text-white" : "text-gray-600")}
            style={tab === key ? { background: NAVY, borderColor: NAVY } : { borderColor: "#e5e7eb" }}>
            {label}
          </button>
        ))}
      </div>

      {role === "lecturer" && tab === "notes" && <LecturerNotes myCourses={myCourseArr} notes={notes} />}
      {role === "lecturer" && tab === "assignments" && <LecturerAssignments myCourses={myCourseArr} items={assignments} submissions={submissions} />}
      {role === "lecturer" && tab === "liveclasses" && <LecturerLiveClasses myCourses={myCourseArr} classes={liveClasses} />}
      {role === "lecturer" && tab === "results" && <LecturerResults myCourses={myCourseArr} allUsers={allUsers} results={results} />}

      {role === "student" && tab === "notes" && <StudentNotes notes={notes} />}
      {role === "student" && tab === "work" && <StudentWork items={assignments} submissions={submissions} currentUser={currentUser} />}
      {role === "student" && tab === "liveclasses" && <StudentLiveClasses classes={liveClasses} />}
      {role === "student" && tab === "results" && <ResultsTable results={results} />}
    </Modal>
  );
}

function LecturerCourses({ myCourses, allUsers, notes, assignments, liveClasses, results, submissions }) {
  const [manage, setManage] = useState(null); // course being managed
  const [viewCourse, setViewCourse] = useState(null);
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    if (!manage || !search) return [];
    const enrolled = new Set(manage.studentIds || []);
    return allUsers.filter((u) => u.role === "student" && !enrolled.has(u.uid) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) || (u.studentId || "").includes(search) || u.email.toLowerCase().includes(search.toLowerCase())));
  }, [manage, search, allUsers]);

  async function addStudent(u) {
    await FB().updateDoc(`courses/${manage.id}`, { studentIds: FB().arrayUnion(u.uid) });
    setManage({ ...manage, studentIds: [...(manage.studentIds || []), u.uid] });
  }
  async function removeStudent(uid) {
    await FB().updateDoc(`courses/${manage.id}`, { studentIds: FB().arrayRemove(uid) });
    setManage({ ...manage, studentIds: (manage.studentIds || []).filter((id) => id !== uid) });
  }

  return (
    <div>
      {myCourses.length === 0 && <p className="text-sm text-gray-400">No courses assigned to you yet — ask the Admin to assign one.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {myCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="font-serif font-semibold" style={{ color: NAVY }}>{c.name} <span className="text-xs text-gray-400">({c.code})</span></div>
            <p className="text-xs text-gray-500 mt-1 mb-3">{(c.studentIds || []).length} students enrolled</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setViewCourse(c)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>View course</button>
              <button onClick={() => setManage(c)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>Manage students</button>
            </div>
          </div>
        ))}
      </div>

      {manage && (
        <Modal wide title={`Manage students — ${manage.name}`} onClose={() => setManage(null)}>
          <Field label="Find a student by name, email, or student number">
            <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" />
          </Field>
          {search && candidates.length === 0 && (
            <p className="text-xs text-gray-400 mb-4">No matching student found. They may already be enrolled, or check the spelling — ask the Admin to confirm the student's account exists.</p>
          )}
          {candidates.length > 0 && (
            <div className="border rounded-lg divide-y mb-4 max-h-40 overflow-y-auto">
              {candidates.map((u) => (
                <div key={u.uid} className="flex justify-between items-center p-2 text-sm">
                  <span>{u.name} <span className="text-xs text-gray-400">{u.studentId}</span></span>
                  <button onClick={() => addStudent(u)} className="text-xs" style={{ color: NAVY }}>+ Add</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mb-2">Enrolled ({(manage.studentIds || []).length})</p>
          <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
            {(manage.studentIds || []).map((uid) => {
              const u = allUsers.find((x) => x.uid === uid);
              return (
                <div key={uid} className="flex justify-between items-center p-2 text-sm">
                  <span>{u ? u.name : uid}</span>
                  <button onClick={() => removeStudent(uid)} className="text-xs text-red-500">Remove</button>
                </div>
              );
            })}
            {(manage.studentIds || []).length === 0 && <p className="p-2 text-xs text-gray-400">No students yet.</p>}
          </div>
        </Modal>
      )}
      {viewCourse && (
        <CourseDetailModal
          course={viewCourse} role="lecturer"
          notes={notes.filter((n) => n.courseId === viewCourse.id)}
          assignments={assignments.filter((a) => a.courseId === viewCourse.id)}
          liveClasses={liveClasses.filter((c) => c.courseId === viewCourse.id)}
          results={results.filter((r) => r.courseId === viewCourse.id)}
          submissions={submissions.filter((s) => s.courseId === viewCourse.id)}
          allUsers={allUsers}
          onClose={() => setViewCourse(null)}
        />
      )}
    </div>
  );
}

function LecturerAssignments({ myCourses, items, submissions }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [viewSubsFor, setViewSubsFor] = useState(null);
  const [form, setForm] = useState({ courseId: "", kind: "assignment", title: "", description: "", dueDate: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function openAdd() {
    setEditItem(null);
    setForm({ courseId: "", kind: "assignment", title: "", description: "", dueDate: "" });
    setFile(null); setErr("");
    setShowAdd(true);
  }
  function openEdit(a) {
    setEditItem(a);
    setForm({ courseId: a.courseId, kind: a.kind, title: a.title, description: a.description || "", dueDate: a.dueDate || "" });
    setFile(null); setErr("");
    setShowAdd(true);
  }

  async function save(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      let attachment = editItem ? { attachmentURL: editItem.attachmentURL || null, attachmentName: editItem.attachmentName || null } : {};
      if (file) {
        const path = `assignment-files/${form.courseId}/${Date.now()}-${file.name}`;
        const url = await FB().uploadFile(path, file);
        attachment = { attachmentURL: url, attachmentName: file.name };
      }
      if (editItem) {
        await FB().updateDoc(`assignments/${editItem.id}`, { ...form, ...attachment });
      } else {
        await FB().addDoc("assignments", { ...form, ...attachment, createdAt: FB().serverTimestamp() });
      }
      setShowAdd(false);
    } catch (e2) {
      setErr(e2.message || "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{items.length} posted</p>
        <button onClick={openAdd} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ New assignment/quiz</button>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between items-start gap-2">
              <span className="font-serif font-semibold" style={{ color: NAVY }}>{a.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: a.kind === "quiz" ? "#FEF3C7" : "#DBEAFE", color: "#374151" }}>{a.kind}</span>
                <button onClick={() => openEdit(a)} className="text-xs" style={{ color: NAVY }}>Edit</button>
                <button onClick={() => setDelItem(a)} className="text-xs text-red-500">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{a.description}</p>
            {a.dueDate && <p className="text-xs text-gray-400 mt-1">Due {a.dueDate}</p>}
            {a.attachmentURL && (
              <a href={a.attachmentURL} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>
                📄 {a.attachmentName || "Download attachment"}
              </a>
            )}
            <div className="mt-2 pt-2 border-t">
              <button onClick={() => setViewSubsFor(a)} className="text-xs" style={{ color: NAVY }}>
                View submissions ({submissions.filter((s) => s.assignmentId === a.id).length})
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">Nothing posted yet.</p>}
      </div>

      {showAdd && (
        <Modal title={editItem ? "Edit assignment / quiz" : "New assignment / quiz"} onClose={() => setShowAdd(false)}>
          <form onSubmit={save}>
            <Field label="Course">
              <select required className={inputCls} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Select…</option>{myCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="assignment">Assignment</option><option value="quiz">Quiz</option>
              </select>
            </Field>
            <Field label="Title"><input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Instructions"><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <Field label="Attach PDF (question paper, optional)">
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
              {editItem && editItem.attachmentName && !file && <p className="text-xs text-gray-400 mt-1">Current file: {editItem.attachmentName} (choosing a new one replaces it)</p>}
              {file && <p className="text-xs text-green-600 mt-1">Selected: {file.name}</p>}
            </Field>
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <button disabled={busy} className="w-full py-2.5 rounded-lg text-white font-medium">{busy ? "Saving…" : editItem ? "Save changes" : "Post"}</button>
          </form>
        </Modal>
      )}
      {delItem && (
        <ConfirmModal title={`Delete "${delItem.title}"?`} onNo={() => setDelItem(null)}
          onYes={async () => { await FB().deleteDoc(`assignments/${delItem.id}`); setDelItem(null); }} />
      )}
      {viewSubsFor && (
        <Modal title={`Submissions — ${viewSubsFor.title}`} onClose={() => setViewSubsFor(null)}>
          <div className="space-y-2">
            {submissions.filter((s) => s.assignmentId === viewSubsFor.id).map((s) => (
              <div key={s.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.studentName}</div>
                  <div className="text-xs text-gray-400 truncate">{s.fileName}</div>
                </div>
                <a href={s.fileURL} target="_blank" rel="noreferrer" className="text-xs shrink-0" style={{ color: NAVY }}>Download</a>
              </div>
            ))}
            {submissions.filter((s) => s.assignmentId === viewSubsFor.id).length === 0 && (
              <p className="text-sm text-gray-400">No submissions yet.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function LecturerNotes({ myCourses, notes }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ courseId: "", title: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add(e) {
    e.preventDefault();
    setErr("");
    if (!file) { setErr("Please choose a file first — tap \"Choose file\" below and pick a document from your phone."); return; }
    setBusy(true);
    try {
      const path = `notes/${form.courseId}/${Date.now()}-${file.name}`;
      const url = await FB().uploadFile(path, file);
      await FB().addDoc("notes", { ...form, fileURL: url, fileName: file.name, storagePath: path, uploadedAt: FB().serverTimestamp() });
      setShowAdd(false); setForm({ courseId: "", title: "" }); setFile(null);
    } catch (e2) {
      setErr(e2.message || "Upload failed. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{notes.length} uploaded</p>
        <button onClick={() => setShowAdd(true)} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ Upload note</button>
      </div>
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border p-3 flex justify-between items-center">
            <span className="text-sm">{n.title} <span className="text-xs text-gray-400">({n.fileName})</span></span>
            <a href={n.fileURL} target="_blank" rel="noreferrer" className="text-xs" style={{ color: NAVY }}>Download</a>
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-gray-400">No notes uploaded yet.</p>}
      </div>

      {showAdd && (
        <Modal title="Upload note" onClose={() => setShowAdd(false)}>
          <form onSubmit={add}>
            <Field label="Course">
              <select required className={inputCls} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Select…</option>{myCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Title"><input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="File">
              <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              {file && <p className="text-xs text-green-600 mt-1">Selected: {file.name}</p>}
            </Field>
            {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
            <button disabled={busy} className="w-full py-2.5 rounded-lg text-white font-medium" style={{ background: NAVY }}>{busy ? "Uploading…" : "Upload"}</button>
          </form>

        </Modal>
      )}
    </div>
  );
}

function LecturerResults({ myCourses, allUsers, results }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editResult, setEditResult] = useState(null);
  const [delResult, setDelResult] = useState(null);
  const [form, setForm] = useState({ courseId: "", studentUid: "", term: TERMS[0], assignmentScore: "", testScore: "", examScore: "" });
  const students = useMemo(() => {
    const c = myCourses.find((x) => x.id === form.courseId);
    if (!c) return [];
    return (c.studentIds || []).map((uid) => allUsers.find((u) => u.uid === uid)).filter(Boolean);
  }, [form.courseId, myCourses, allUsers]);

  function openAdd() {
    setEditResult(null);
    setForm({ courseId: "", studentUid: "", term: TERMS[0], assignmentScore: "", testScore: "", examScore: "" });
    setShowAdd(true);
  }
  function openEdit(r) {
    setEditResult(r);
    setForm({ courseId: r.courseId, studentUid: r.studentId, term: r.term, assignmentScore: String(r.assignmentScore), testScore: String(r.testScore), examScore: String(r.examScore) });
    setShowAdd(true);
  }

  async function save(e) {
    e.preventDefault();
    const a = Number(form.assignmentScore) || 0;
    const t = Number(form.testScore) || 0;
    const ex = Number(form.examScore) || 0;
    const caTotal = Math.min(a + t, 40);
    const total = Math.min(caTotal + ex, 100);
    const course = myCourses.find((c) => c.id === form.courseId);
    const student = allUsers.find((u) => u.uid === form.studentUid);
    const data = {
      courseId: form.courseId, courseName: course.name,
      studentId: form.studentUid, studentName: student.name, term: form.term,
      assignmentScore: a, testScore: t, examScore: ex, caTotal, total, grade: grade(total),
    };
    if (editResult) await FB().updateDoc(`results/${editResult.id}`, data);
    else await FB().addDoc("results", { ...data, createdAt: FB().serverTimestamp() });
    setShowAdd(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{results.length} results entered</p>
        <button onClick={openAdd} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ Add result</button>
      </div>
      <ResultsTable results={results} showStudent onEdit={openEdit} onDelete={(r) => setDelResult(r)} />

      {showAdd && (
        <Modal title={editResult ? "Edit term result" : "Add term result"} onClose={() => setShowAdd(false)}>
          <form onSubmit={save}>
            <Field label="Course">
              <select required className={inputCls} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, studentUid: "" })}>
                <option value="">Select…</option>{myCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Student">
              <select required className={inputCls} value={form.studentUid} onChange={(e) => setForm({ ...form, studentUid: e.target.value })}>
                <option value="">Select…</option>{students.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Term">
              <select className={inputCls} value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Assignment (/20)"><input type="number" className={inputCls} value={form.assignmentScore} onChange={(e) => setForm({ ...form, assignmentScore: e.target.value })} /></Field>
              <Field label="Test (/20)"><input type="number" className={inputCls} value={form.testScore} onChange={(e) => setForm({ ...form, testScore: e.target.value })} /></Field>
              <Field label="Exam (/60)"><input type="number" className={inputCls} value={form.examScore} onChange={(e) => setForm({ ...form, examScore: e.target.value })} /></Field>
            </div>
            <button className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>{editResult ? "Save changes" : "Save result"}</button>
          </form>
        </Modal>
      )}
      {delResult && (
        <ConfirmModal title={`Delete this result for ${delResult.studentName}?`} onNo={() => setDelResult(null)}
          onYes={async () => { await FB().deleteDoc(`results/${delResult.id}`); setDelResult(null); }} />
      )}
    </div>
  );
}

// ============================================================== STUDENT ===
function StudentCourses({ myCourses, programme, notes, assignments, liveClasses, results, submissions, currentUser }) {
  const [viewCourse, setViewCourse] = useState(null);
  return (
    <div>
      {programme ? (
        <div className="rounded-xl p-4 mb-4 text-white" style={{ background: NAVY }}>
          <p className="text-xs text-white/60">Enrolled Program</p>
          <p className="font-serif text-lg font-semibold">{programme.name}</p>
          {programme.duration && <p className="text-xs text-white/70 mt-0.5">{programme.duration}</p>}
        </div>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          No program on file for your account yet — ask the Admin to set your programme under Manage Users.
        </p>
      )}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Courses in this program</p>
      <div className="grid md:grid-cols-2 gap-4">
        {myCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="font-serif font-semibold" style={{ color: NAVY }}>{c.name} <span className="text-xs text-gray-400">({c.code})</span></div>
            <button onClick={() => setViewCourse(c)} className="mt-2 text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>View course</button>
          </div>
        ))}
        {myCourses.length === 0 && <p className="text-sm text-gray-400">You're not enrolled in any course yet — your lecturer or admin adds you.</p>}
      </div>
      {viewCourse && (
        <CourseDetailModal
          course={viewCourse} role="student"
          notes={notes.filter((n) => n.courseId === viewCourse.id)}
          assignments={assignments.filter((a) => a.courseId === viewCourse.id)}
          liveClasses={liveClasses.filter((c) => c.courseId === viewCourse.id)}
          results={results.filter((r) => r.courseId === viewCourse.id)}
          submissions={submissions.filter((s) => s.courseId === viewCourse.id)}
          currentUser={currentUser}
          onClose={() => setViewCourse(null)}
        />
      )}
    </div>
  );
}

function StudentWork({ items, submissions, currentUser }) {
  const [uploadingFor, setUploadingFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  const mySubmission = (assignmentId) => submissions.find((s) => s.assignmentId === assignmentId && s.studentId === currentUser.uid);

  async function submitAnswer(a, file) {
    if (!file) return;
    setBusyId(a.id); setErr("");
    try {
      const path = `submissions/${a.id}/${currentUser.uid}-${Date.now()}-${file.name}`;
      const url = await FB().uploadFile(path, file);
      const existing = mySubmission(a.id);
      const data = {
        assignmentId: a.id, courseId: a.courseId, studentId: currentUser.uid, studentName: currentUser.name,
        fileURL: url, fileName: file.name, submittedAt: FB().serverTimestamp(),
      };
      if (existing) await FB().updateDoc(`submissions/${existing.id}`, data);
      else await FB().addDoc("submissions", data);
      setUploadingFor(null);
    } catch (e2) {
      setErr(e2.message || "Could not upload your answer. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const sub = mySubmission(a.id);
        return (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between">
              <span className="font-serif font-semibold" style={{ color: NAVY }}>{a.title}</span>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: a.kind === "quiz" ? "#FEF3C7" : "#DBEAFE", color: "#374151" }}>{a.kind}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{a.description}</p>
            {a.dueDate && <p className="text-xs text-gray-400 mt-1">Due {a.dueDate}</p>}
            {a.attachmentURL && (
              <a href={a.attachmentURL} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>
                📄 {a.attachmentName || "Download question paper"}
              </a>
            )}
            <div className="mt-3 pt-3 border-t">
              {sub ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600">Submitted: {sub.fileName}</span>
                  <button onClick={() => setUploadingFor(a.id)} className="text-xs" style={{ color: NAVY }}>Replace answer</button>
                  {uploadingFor === a.id && <input type="file" onChange={(e) => submitAnswer(a, e.target.files[0])} />}
                </div>
              ) : uploadingFor === a.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input type="file" onChange={(e) => submitAnswer(a, e.target.files[0])} />
                  {busyId === a.id && <span className="text-xs text-gray-400">Uploading…</span>}
                </div>
              ) : (
                <button onClick={() => setUploadingFor(a.id)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>Upload your answer</button>
              )}
              {err && uploadingFor === a.id && <p className="text-xs text-red-600 mt-1">{err}</p>}
            </div>
          </div>
        );
      })}
      {items.length === 0 && <p className="text-sm text-gray-400">Nothing posted for your courses yet.</p>}
    </div>
  );
}

function StudentNotes({ notes }) {
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div key={n.id} className="bg-white rounded-xl border p-3 flex justify-between items-center">
          <span className="text-sm">{n.title}</span>
          <a href={n.fileURL} target="_blank" rel="noreferrer" className="text-xs" style={{ color: NAVY }}>Download</a>
        </div>
      ))}
      {notes.length === 0 && <p className="text-sm text-gray-400">No notes shared yet.</p>}
    </div>
  );
}

function StudentFees({ fee }) {
  if (!fee) return <p className="text-sm text-gray-400">No fee record found yet.</p>;
  return (
    <div className="bg-white rounded-xl border p-5 max-w-sm">
      <p className="text-xs text-gray-500">Total billed</p>
      <p className="text-lg font-serif font-semibold mb-3" style={{ color: NAVY }}>K{(fee.billed || 0).toLocaleString()}</p>
      <p className="text-xs text-gray-500">Balance</p>
      <p className="text-lg font-serif font-semibold mb-3" style={{ color: NAVY }}>K{(fee.balance || 0).toLocaleString()}</p>
      {fee.balance > 0
        ? <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600">Balance outstanding</span>
        : <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-600">Fees cleared</span>}
    </div>
  );
}

// =================================================================== APP ==
function Dashboard({ user }) {
  const [page, setPage] = useState(() => (NAV_ITEMS[user.role] && NAV_ITEMS[user.role][0] ? NAV_ITEMS[user.role][0][0] : "overview"));
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [fees, setFees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [results, setResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const unsubs = [
      FB().subCollection("users", setUsers),
      FB().subCollection("courses", setCourses),
      FB().subCollection("programmes", setProgrammes),
      FB().subCollection("assignments", setAssignments),
      FB().subCollection("notes", setNotes),
      FB().subCollection("results", setResults),
      FB().subCollection("announcements", setAnnouncements, { orderBy: ["createdAt", "desc"] }),
      FB().subCollection("liveclasses", setLiveClasses),
      FB().subCollection("submissions", setSubmissions),
    ];
    if (user.role === "admin" || user.role === "bursar" || user.role === "student") unsubs.push(FB().subCollection("fees", setFees));
    return () => unsubs.forEach((u) => u && u());
  }, [user.role]);

  const myCourses = useMemo(() => {
    if (user.role === "lecturer") return courses.filter((c) => c.lecturerId === user.uid);
    if (user.role === "student") return courses.filter((c) => (c.studentIds || []).includes(user.uid));
    return courses;
  }, [courses, user]);

  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);

  let content = null;
  if (user.role === "admin") {
    if (page === "overview") content = <AdminOverview users={users} courses={courses} fees={fees} results={results} assignments={assignments} announcements={announcements} />;
    if (page === "users") content = <AdminUsers users={users} programmes={programmes} />;
    if (page === "programmes") content = <AdminProgrammes programmes={programmes} courses={courses} users={users} />;
    if (page === "fees") content = <FeesPage fees={fees} />;
    if (page === "results") content = <ResultsTable results={results} showStudent />;
    if (page === "liveclasses") content = <StudentLiveClasses classes={liveClasses} />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements} courses={courses} canPost postScope="choose" currentUser={user} />;
  } else if (user.role === "lecturer") {
    if (page === "overview") content = <LecturerCourses myCourses={myCourses} allUsers={users} notes={notes.filter((n) => myCourseIds.has(n.courseId))} assignments={assignments.filter((a) => myCourseIds.has(a.courseId))} liveClasses={liveClasses.filter((c) => myCourseIds.has(c.courseId))} results={results.filter((r) => myCourseIds.has(r.courseId))} submissions={submissions.filter((s) => myCourseIds.has(s.courseId))} />;
    if (page === "assignments") content = <LecturerAssignments myCourses={myCourses} items={assignments.filter((a) => myCourseIds.has(a.courseId))} submissions={submissions.filter((s) => myCourseIds.has(s.courseId))} />;
    if (page === "notes") content = <LecturerNotes myCourses={myCourses} notes={notes.filter((n) => myCourseIds.has(n.courseId))} />;
    if (page === "results") content = <LecturerResults myCourses={myCourses} allUsers={users} results={results.filter((r) => myCourseIds.has(r.courseId))} />;
    if (page === "liveclasses") content = <LecturerLiveClasses myCourses={myCourses} classes={liveClasses.filter((c) => myCourseIds.has(c.courseId))} />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements.filter((a) => a.courseId === "all" || myCourseIds.has(a.courseId))} courses={myCourses} canPost postScope="choose" currentUser={user} />;
  } else if (user.role === "student") {
    const myFee = fees.find((f) => f.id === user.uid) || null;
    if (page === "overview") content = <StudentCourses myCourses={myCourses} programme={programmes.find((p) => p.id === user.programmeId)} notes={notes.filter((n) => myCourseIds.has(n.courseId))} assignments={assignments.filter((a) => myCourseIds.has(a.courseId))} liveClasses={liveClasses.filter((c) => myCourseIds.has(c.courseId))} results={results.filter((r) => r.studentId === user.uid)} submissions={submissions.filter((s) => s.studentId === user.uid)} currentUser={user} />;
    if (page === "work") content = <StudentWork items={assignments.filter((a) => myCourseIds.has(a.courseId))} submissions={submissions.filter((s) => s.studentId === user.uid)} currentUser={user} />;
    if (page === "results") content = <ResultsTable results={results.filter((r) => r.studentId === user.uid)} />;
    if (page === "notes") content = <StudentNotes notes={notes.filter((n) => myCourseIds.has(n.courseId))} />;
    if (page === "fees") content = <StudentFees fee={myFee} />;
    if (page === "liveclasses") content = <StudentLiveClasses classes={liveClasses.filter((c) => myCourseIds.has(c.courseId))} />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements.filter((a) => a.courseId === "all" || myCourseIds.has(a.courseId))} courses={myCourses} canPost={false} currentUser={user} />;
  } else if (user.role === "bursar") {
    if (page === "fees") content = <FeesPage fees={fees} />;
  }

  return <Shell user={user} page={page} setPage={setPage}>{content}</Shell>;
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    let unsub;
    function start() { unsub = FB().onAuth(setUser); }
    if (window.FirebaseAPI) start();
    else window.addEventListener("firebase-ready", start, { once: true });
    return () => unsub && unsub();
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}><p className="text-white/60 text-sm">Loading…</p></div>;
  }
  if (!user) return <LoginScreen />;
  return <Dashboard user={user} />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
