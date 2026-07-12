const { useState, useEffect, useMemo, useRef } = React;
const FB = () => window.FirebaseAPI;

const NAVY = "#0F2A4A";
const GOLD = "#C9A227";
const TERMS = ["2026 Term 1", "2026 Term 2", "2026 Term 3"];

function cx(...a) { return a.filter(Boolean).join(" "); }

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
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center font-serif font-bold text-xl" style={{ background: GOLD, color: NAVY }}>MIM</div>
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
        <p><span className="text-gray-500">Role:</span> {user.role}</p>
        {user.studentId && <p><span className="text-gray-500">Student No:</span> {user.studentId}</p>}
        {user.examNumber && <p><span className="text-gray-500">Exam No:</span> {user.examNumber}</p>}
      </div>
    </Modal>
  );
}

const NAV_ITEMS = {
  admin: [
    ["overview", "Overview"], ["users", "Manage Users"], ["courses", "Courses"],
    ["fees", "Fees Overview"], ["results", "Results"], ["announcements", "Announcements"],
  ],
  lecturer: [
    ["overview", "My Courses"], ["assignments", "Assignments & Quizzes"],
    ["notes", "Notes"], ["results", "Term Results"], ["announcements", "Announcements"],
  ],
  student: [
    ["overview", "My Courses"], ["work", "Assignments & Quizzes"],
    ["results", "My Results"], ["notes", "Notes"], ["fees", "My Fees"], ["announcements", "Announcements"],
  ],
  bursar: [
    ["fees", "Fees Overview"],
  ],
};

function Shell({ user, page, setPage, children }) {
  const [showProfile, setShowProfile] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const items = NAV_ITEMS[user.role] || [];

  return (
    <div className="min-h-screen flex" style={{ background: "#F6F3EA" }}>
      <aside className="w-60 shrink-0 text-white flex flex-col" style={{ background: NAVY }}>
        <div className="p-5 border-b border-white/10">
          <div className="font-serif font-semibold">MIM Portal</div>
          <div className="text-[11px] text-white/50 capitalize">{user.role} dashboard</div>
        </div>
        <nav className="flex-1 py-3">
          {items.length === 0 && (
            <p className="px-5 text-xs text-white/50">
              No menu found for role "{user.role || "(none)"}". Ask the Administrator to check this account's role in the Users list.
            </p>
          )}
          {items.map(([key, label]) => (
            <button key={key} onClick={() => setPage(key)}
              className={cx("w-full text-left px-5 py-2.5 text-sm", page === key ? "bg-white/10 border-l-2" : "text-white/70 hover:bg-white/5")}
              style={page === key ? { borderColor: GOLD } : {}}>
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={() => setConfirmOut(true)} className="w-full text-left text-sm text-white/80 hover:text-white">Sign out</button>
          <p className="text-center text-[10px] text-white/25 mt-3">MIM Portal</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="font-serif font-medium" style={{ color: NAVY }}>
            {(items.find((i) => i[0] === page) || [, ""])[1]}
          </div>
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-2">
            <Avatar user={user} size={34} />
            <span className="text-sm text-gray-700 hidden sm:inline">{user.name}</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
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
function AdminOverview({ users, courses, fees, results, assignments, announcements }) {
  const counts = useMemo(() => {
    const c = { admin: 0, lecturer: 0, student: 0, bursar: 0 };
    users.forEach((u) => { if (c[u.role] !== undefined) c[u.role]++; });
    return c;
  }, [users]);
  const totalBilled = fees.reduce((s, f) => s + (f.billed || 0), 0);
  const totalBalance = fees.reduce((s, f) => s + (f.balance || 0), 0);
  const totalCollected = totalBilled - totalBalance;
  const studentsCleared = fees.filter((f) => (f.balance || 0) <= 0).length;
  const quizCount = assignments.filter((a) => a.kind === "quiz").length;
  const assignmentCount = assignments.filter((a) => a.kind === "assignment").length;

  const Card = ({ label, value, icon, accent }) => (
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

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">People</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Students" value={counts.student} icon="🎓" />
        <Card label="Lecturers" value={counts.lecturer} icon="🧑‍🏫" />
        <Card label="Bursars" value={counts.bursar} icon="💼" />
        <Card label="Courses" value={courses.length} icon="📚" />
      </div>

      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Fees</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Total billed (K)" value={totalBilled.toLocaleString()} icon="🧾" />
        <Card label="Fees collected (K)" value={totalCollected.toLocaleString()} icon="✅" accent="#16a34a" />
        <Card label="Outstanding (K)" value={totalBalance.toLocaleString()} icon="⚠️" accent="#dc2626" />
        <Card label="Students cleared" value={`${studentsCleared}/${fees.length}`} icon="📋" />
      </div>

      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Academics</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Assignments posted" value={assignmentCount} icon="📝" />
        <Card label="Quizzes posted" value={quizCount} icon="❓" />
        <Card label="Results entered" value={results.length} icon="📊" />
        <Card label="Announcements" value={announcements.length} icon="📣" />
      </div>
    </div>
  );
}

function AdminUsers({ users, programmes }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{users.length} accounts</p>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>+ Add user</button>
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Role</th><th className="text-left p-3">Student No</th><th className="text-left p-3">Exam No</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t">
                <td className="p-3">{u.name}<div className="text-xs text-gray-400">{u.email}</div></td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{u.studentId || "—"}</td>
                <td className="p-3">
                  {u.role === "student" ? (
                    <input defaultValue={u.examNumber || ""} onBlur={(e) => saveExamNumber(u, e.target.value)}
                      placeholder="Set exam no." className="border border-gray-200 rounded px-2 py-1 text-xs w-28" />
                  ) : "—"}
                </td>
                <td className="p-3 text-right"><button onClick={() => setDelUser(u)} className="text-red-500 text-xs hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add user" onClose={() => setShowAdd(false)}>
          <form onSubmit={addUser}>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option><option value="lecturer">Lecturer</option>
                <option value="bursar">Bursar</option><option value="admin">Admin</option>
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

      {delUser && (
        <ConfirmModal title={`Remove ${delUser.name}?`} body="They will lose access to the portal immediately."
          onNo={() => setDelUser(null)}
          onYes={async () => { await FB().deleteUserProfile(delUser.uid); setDelUser(null); }} />
      )}
    </div>
  );
}

function AdminCourses({ courses, users, programmes }) {
  const [showAdd, setShowAdd] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", programmeId: "", lecturerId: "" });
  const lecturers = users.filter((u) => u.role === "lecturer");

  async function addCourse(e) {
    e.preventDefault();
    await FB().addDoc("courses", { ...form, studentIds: [], createdAt: FB().serverTimestamp() });
    setShowAdd(false); setForm({ name: "", code: "", programmeId: "", lecturerId: "" });
  }

  async function saveLecturer(courseId, lecturerId) {
    await FB().updateDoc(`courses/${courseId}`, { lecturerId: lecturerId || null });
    setAssignCourse(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{courses.length} courses</p>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: NAVY }}>+ Add course</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((c) => {
          const lec = users.find((u) => u.uid === c.lecturerId);
          return (
            <div key={c.id} className="bg-white rounded-xl border p-4">
              <div className="font-serif font-semibold" style={{ color: NAVY }}>{c.name} <span className="text-xs text-gray-400">({c.code})</span></div>
              <p className="text-xs text-gray-500 mt-1">Lecturer: {lec ? lec.name : "Unassigned"}</p>
              <p className="text-xs text-gray-500 mb-3">Students enrolled: {(c.studentIds || []).length}</p>
              <button onClick={() => setAssignCourse(c)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>
                {lec ? "Change lecturer" : "Assign lecturer"}
              </button>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <Modal title="Add course" onClose={() => setShowAdd(false)}>
          <form onSubmit={addCourse}>
            <Field label="Course name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Course code"><input required className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Programme">
              <select required className={inputCls} value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}>
                <option value="">Select…</option>{programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Lecturer">
              <select className={inputCls} value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })}>
                <option value="">Unassigned for now</option>{lecturers.map((l) => <option key={l.uid} value={l.uid}>{l.name}</option>)}
              </select>
            </Field>
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

    </div>
  );
}

function FeesTable({ fees, editable }) {
  const [payUser, setPayUser] = useState(null);
  const [amount, setAmount] = useState("");

  async function recordPayment() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await FB().updateDoc(`fees/${payUser.id}`, {
      balance: FB().increment(-amt),
      payments: FB().arrayUnion({ amount: amt, date: new Date().toISOString() }),
    });
    setPayUser(null); setAmount("");
  }

  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr><th className="text-left p-3">Student</th><th className="text-left p-3">Billed</th><th className="text-left p-3">Balance</th><th className="text-left p-3">Status</th>{editable && <th className="p-3"></th>}</tr>
        </thead>
        <tbody>
          {fees.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="p-3">{f.studentName}<div className="text-xs text-gray-400">{f.studentId}</div></td>
              <td className="p-3">K{(f.billed || 0).toLocaleString()}</td>
              <td className="p-3">K{(f.balance || 0).toLocaleString()}</td>
              <td className="p-3">
                {f.balance > 0
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Balance due</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Cleared</span>}
              </td>
              {editable && <td className="p-3 text-right"><button onClick={() => setPayUser(f)} className="text-xs hover:underline" style={{ color: NAVY }}>Record payment</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {payUser && (
        <Modal title={`Record payment — ${payUser.studentName}`} onClose={() => setPayUser(null)}>
          <Field label="Amount (K)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <button onClick={recordPayment} className="w-full py-2.5 rounded-lg text-white font-medium" style={{ background: NAVY }}>Save payment</button>
        </Modal>
      )}
    </div>
  );
}

function ResultsTable({ results, showStudent }) {
  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            {showStudent && <th className="text-left p-3">Student</th>}
            <th className="text-left p-3">Course</th><th className="text-left p-3">Term</th>
            <th className="text-left p-3">Assignment</th><th className="text-left p-3">Test</th>
            <th className="text-left p-3">CA (40)</th><th className="text-left p-3">Exam (60)</th>
            <th className="text-left p-3">Total</th><th className="text-left p-3">Grade</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-t">
              {showStudent && <td className="p-3">{r.studentName}</td>}
              <td className="p-3">{r.courseName}</td>
              <td className="p-3">{r.term}</td>
              <td className="p-3">{r.assignmentScore}</td>
              <td className="p-3">{r.testScore}</td>
              <td className="p-3">{r.caTotal}</td>
              <td className="p-3">{r.examScore}</td>
              <td className="p-3 font-medium">{r.total}</td>
              <td className="p-3">{r.grade}</td>
            </tr>
          ))}
          {results.length === 0 && <tr><td className="p-4 text-gray-400 text-sm" colSpan={9}>No results yet.</td></tr>}
        </tbody>
      </table>
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

// ============================================================= LECTURER ===
function LecturerCourses({ myCourses, allUsers }) {
  const [manage, setManage] = useState(null); // course being managed
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
            <button onClick={() => setManage(c)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: NAVY, color: NAVY }}>Manage students</button>
          </div>
        ))}
      </div>

      {manage && (
        <Modal wide title={`Manage students — ${manage.name}`} onClose={() => setManage(null)}>
          <Field label="Find a student by name, email, or student number">
            <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" />
          </Field>
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
    </div>
  );
}

function LecturerAssignments({ myCourses, items }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ courseId: "", kind: "assignment", title: "", description: "", dueDate: "" });

  async function add(e) {
    e.preventDefault();
    await FB().addDoc("assignments", { ...form, createdAt: FB().serverTimestamp() });
    setShowAdd(false); setForm({ courseId: "", kind: "assignment", title: "", description: "", dueDate: "" });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{items.length} posted</p>
        <button onClick={() => setShowAdd(true)} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ New assignment/quiz</button>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <div className="flex justify-between">
              <span className="font-serif font-semibold" style={{ color: NAVY }}>{a.title}</span>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: a.kind === "quiz" ? "#FEF3C7" : "#DBEAFE", color: "#374151" }}>{a.kind}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{a.description}</p>
            {a.dueDate && <p className="text-xs text-gray-400 mt-1">Due {a.dueDate}</p>}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">Nothing posted yet.</p>}
      </div>

      {showAdd && (
        <Modal title="New assignment / quiz" onClose={() => setShowAdd(false)}>
          <form onSubmit={add}>
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
            <button className="w-full py-2.5 rounded-lg text-white font-medium" style={{ background: NAVY }}>Post</button>
          </form>
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

  async function add(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const path = `notes/${form.courseId}/${Date.now()}-${file.name}`;
      const url = await FB().uploadFile(path, file);
      await FB().addDoc("notes", { ...form, fileURL: url, fileName: file.name, storagePath: path, uploadedAt: FB().serverTimestamp() });
      setShowAdd(false); setForm({ courseId: "", title: "" }); setFile(null);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
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
            <Field label="File"><input required type="file" onChange={(e) => setFile(e.target.files[0])} /></Field>
            <button disabled={busy} className="w-full py-2.5 rounded-lg text-white font-medium" style={{ background: NAVY }}>{busy ? "Uploading…" : "Upload"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function LecturerResults({ myCourses, allUsers, results }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ courseId: "", studentUid: "", term: TERMS[0], assignmentScore: "", testScore: "", examScore: "" });
  const students = useMemo(() => {
    const c = myCourses.find((x) => x.id === form.courseId);
    if (!c) return [];
    return (c.studentIds || []).map((uid) => allUsers.find((u) => u.uid === uid)).filter(Boolean);
  }, [form.courseId, myCourses, allUsers]);

  async function save(e) {
    e.preventDefault();
    const a = Number(form.assignmentScore) || 0;
    const t = Number(form.testScore) || 0;
    const ex = Number(form.examScore) || 0;
    const caTotal = Math.min(a + t, 40);
    const total = Math.min(caTotal + ex, 100);
    const course = myCourses.find((c) => c.id === form.courseId);
    const student = allUsers.find((u) => u.uid === form.studentUid);
    await FB().addDoc("results", {
      courseId: form.courseId, courseName: course.name,
      studentId: form.studentUid, studentName: student.name, term: form.term,
      assignmentScore: a, testScore: t, examScore: ex, caTotal, total, grade: grade(total),
      createdAt: FB().serverTimestamp(),
    });
    setShowAdd(false);
    setForm({ courseId: "", studentUid: "", term: TERMS[0], assignmentScore: "", testScore: "", examScore: "" });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{results.length} results entered</p>
        <button onClick={() => setShowAdd(true)} disabled={myCourses.length === 0} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40" style={{ background: NAVY }}>+ Add result</button>
      </div>
      <ResultsTable results={results} showStudent />

      {showAdd && (
        <Modal title="Add term result" onClose={() => setShowAdd(false)}>
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
            <button className="w-full py-2.5 rounded-lg text-white font-medium mt-1" style={{ background: NAVY }}>Save result</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================== STUDENT ===
function StudentCourses({ myCourses }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {myCourses.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border p-4">
          <div className="font-serif font-semibold" style={{ color: NAVY }}>{c.name} <span className="text-xs text-gray-400">({c.code})</span></div>
        </div>
      ))}
      {myCourses.length === 0 && <p className="text-sm text-gray-400">You're not enrolled in any course yet — your lecturer or admin adds you.</p>}
    </div>
  );
}

function StudentWork({ items }) {
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="bg-white rounded-xl border p-4">
          <div className="flex justify-between">
            <span className="font-serif font-semibold" style={{ color: NAVY }}>{a.title}</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: a.kind === "quiz" ? "#FEF3C7" : "#DBEAFE", color: "#374151" }}>{a.kind}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{a.description}</p>
          {a.dueDate && <p className="text-xs text-gray-400 mt-1">Due {a.dueDate}</p>}
        </div>
      ))}
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
  const [page, setPage] = useState("overview");
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [fees, setFees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [results, setResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const unsubs = [
      FB().subCollection("users", setUsers),
      FB().subCollection("courses", setCourses),
      FB().subCollection("programmes", setProgrammes),
      FB().subCollection("assignments", setAssignments),
      FB().subCollection("notes", setNotes),
      FB().subCollection("results", setResults),
      FB().subCollection("announcements", setAnnouncements, { orderBy: ["createdAt", "desc"] }),
    ];
    if (user.role === "admin" || user.role === "bursar") unsubs.push(FB().subCollection("fees", setFees));
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
    if (page === "courses") content = <AdminCourses courses={courses} users={users} programmes={programmes} />;
    if (page === "fees") content = <FeesTable fees={fees} editable />;
    if (page === "results") content = <ResultsTable results={results} showStudent />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements} courses={courses} canPost postScope="choose" currentUser={user} />;
  } else if (user.role === "lecturer") {
    if (page === "overview") content = <LecturerCourses myCourses={myCourses} allUsers={users} />;
    if (page === "assignments") content = <LecturerAssignments myCourses={myCourses} items={assignments.filter((a) => myCourseIds.has(a.courseId))} />;
    if (page === "notes") content = <LecturerNotes myCourses={myCourses} notes={notes.filter((n) => myCourseIds.has(n.courseId))} />;
    if (page === "results") content = <LecturerResults myCourses={myCourses} allUsers={users} results={results.filter((r) => myCourseIds.has(r.courseId))} />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements.filter((a) => a.courseId === "all" || myCourseIds.has(a.courseId))} courses={myCourses} canPost postScope="choose" currentUser={user} />;
  } else if (user.role === "student") {
    const myFee = fees.find((f) => f.id === user.uid) || null;
    if (page === "overview") content = <StudentCourses myCourses={myCourses} />;
    if (page === "work") content = <StudentWork items={assignments.filter((a) => myCourseIds.has(a.courseId))} />;
    if (page === "results") content = <ResultsTable results={results.filter((r) => r.studentId === user.uid)} />;
    if (page === "notes") content = <StudentNotes notes={notes.filter((n) => myCourseIds.has(n.courseId))} />;
    if (page === "fees") content = <StudentFees fee={myFee} />;
    if (page === "announcements") content = <AnnouncementsBoard announcements={announcements.filter((a) => a.courseId === "all" || myCourseIds.has(a.courseId))} courses={myCourses} canPost={false} currentUser={user} />;
  } else if (user.role === "bursar") {
    if (page === "fees") content = <FeesTable fees={fees} editable />;
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
