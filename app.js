const TABS = [["ringkasan","Ringkasan"],["checklist","Checklist"],["budget","Budget"],["keuangan","Keuangan"],["vendor","Vendor"],["tamu","Tamu"],["referensi","Referensi"],["seserahan","Seserahan"],["harih","Hari-H"],["jurnal","Jurnal"]];
const SES_STATUS = { belum: "Belum dibeli", dibeli: "Sudah dibeli", dihias: "Sudah dihias" };
const RUN_DAYS = ["Lamaran", "Hari-H"];
const J_KINDS = { keputusan: ["Keputusan", "good"], catatan: ["Catatan", ""], bahas: ["Perlu dibahas", "warn"] };
const TEMPLATE = [
  // [tugas, kategori, acuan (L = lamaran, W = nikah), berapa bulan sebelumnya]
  ["Obrolan berdua: visi, budget, 3 prioritas","Fondasi","W",12],
  ["Bicara dengan orang tua: restu, adat, kontribusi biaya","Fondasi","W",12],
  ["Buka tabungan khusus pernikahan","Fondasi","W",12],
  ["Tentukan konsep lamaran dan lokasi","Lamaran","L",2],
  ["Beli cincin","Lamaran","L",2],
  ["Siapkan seserahan (daftar, belanja, hias)","Lamaran","L",1.5],
  ["Pesan katering lamaran","Lamaran","L",1],
  ["Pesan fotografer lamaran","Lamaran","L",1],
  ["Pesan busana keluarga untuk lamaran","Lamaran","L",1],
  ["Kirim undangan lamaran","Lamaran","L",0.5],
  ["Briefing juru bicara dan urutan acara lamaran","Lamaran","L",0.25],
  ["Survei dan booking venue","Venue & vendor","W",11],
  ["Booking Wedding Organizer (jika dipakai)","Venue & vendor","W",10],
  ["Booking katering","Venue & vendor","W",10],
  ["Booking dokumentasi foto dan video","Venue & vendor","W",9],
  ["Booking MUA","Venue & vendor","W",9],
  ["Booking dekorasi","Venue & vendor","W",9],
  ["Pilih MC dan hiburan","Venue & vendor","W",7],
  ["Pesan busana pengantin dan keluarga","Busana","W",7],
  ["Fitting pertama","Busana","W",4],
  ["Fitting kedua","Busana","W",2],
  ["Tes menu katering","Venue & vendor","W",5],
  ["Foto pre-wedding (opsional)","Acara","W",5],
  ["Daftar tamu final","Tamu","W",4],
  ["Desain dan cetak undangan","Tamu","W",3],
  ["Sebar undangan","Tamu","W",2],
  ["Urus dokumen nikah (KUA/gereja/catatan sipil)","Dokumen","W",3],
  ["Kursus atau bimbingan pranikah","Dokumen","W",3],
  ["Pesan seserahan dan mahar","Acara","W",2],
  ["Konfirmasi ulang semua vendor secara tertulis","Venue & vendor","W",1],
  ["Rundown final dan gladi bersih","Acara","W",0.5],
  ["Konfirmasi RSVP dan denah duduk","Tamu","W",0.5],
  ["Packing koper (akad, resepsi, bulan madu)","Acara","W",0.25],
  ["Pelunasan vendor","Venue & vendor","W",0.1],
  ["Update KTP dan KK setelah nikah","Dokumen","W",-1],
  ["Kirim ucapan terima kasih ke tamu dan vendor","Acara","W",-1]
];
const BUDGET_TEMPLATE = ["Venue & katering","Dekorasi","MUA & busana","Foto & video","MC & hiburan","Undangan & souvenir","Seserahan & mahar","Admin & transport","Dana cadangan (10%)"];
const REF_CATS = ["Dekorasi","Busana","MUA","Wedding Organizer","Venue","Katering","Foto & video","Seserahan","Undangan","Lainnya"];
const REF_STATUS = { ide: ["Ide", ""], kandidat: ["Kandidat", "warn"], dipilih: ["Dipilih", "good"], ditolak: ["Ditolak", "bad"] };
const SIDES = { pria: "Keluarga pria", wanita: "Keluarga wanita", teman: "Teman", kolega: "Kolega" };
const PAYERS = { bersama: "Berdua", pria: "CPP (pria)", wanita: "CPW (wanita)", ortupria: "Ortu CPP", ortuwanita: "Ortu CPW" };
const MASUK_PIHAK = { ...PAYERS, lain: "Lainnya" };
const STAT = { belum: ["Belum dikirim", ""], terkirim: ["Terkirim", "warn"], hadir: ["Hadir", "good"], tidak: ["Tidak hadir", "bad"] };

const S = { meta: { lamaran: "", wedding: "", target: 0 }, tasks: [], budget: [], guests: [], refs: [], votes: [], vendors: [], seserahan: [], rundown: [], journal: [], ledger: [], loaded: {} };
let denied = false, dlApi = null, db = null, userApi = null, assetsApi = null, canWrite = true, me = null, state = "loading";
let tab = (location.hash || "").slice(1);
if (!TABS.some(t => t[0] === tab)) tab = "ringkasan";
let refCat = "Semua", refStatus = "semua", pendingRender = false, profOpen = null;
const names = {};

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = n => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n || 0));
const $ = id => document.getElementById(id);
const byOrd = (a, b) => (a.ord || 0) - (b.ord || 0);

function cleanUrl(u) {
  u = (u || "").trim(); if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).href; } catch (e) { return ""; }
}
function dueDate(t) {
  const base = t.ref === "L" ? S.meta.lamaran : S.meta.wedding;
  if (!base) return null;
  const d = new Date(base + "T00:00:00");
  const whole = Math.trunc(t.m), days = Math.round((t.m - whole) * 30);
  d.setMonth(d.getMonth() - whole); d.setDate(d.getDate() - days);
  return d;
}
const fmtDate = d => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysTo = iso => iso ? Math.round((new Date(iso + "T00:00:00") - today()) / 864e5) : null;

/* ---------- penyimpanan bersama ---------- */
async function write(fn) {
  if (!db || !canWrite) return;
  try { await fn(); } catch (e) {
    if (e && e.code === "permission-denied") { denied = true; updateNotice(); }
    else if (e && e.code === "quota_exceeded") flash("Penyimpanan penuh. Hapus beberapa data lama.");
    else flash("Gagal menyimpan. Coba lagi.");
  }
}
const col = n => db.collection(n);
const setMeta = patch => write(() => db.doc("meta/settings").set(patch, { merge: true }));
let toastT, undoFn = null;
function toast(msg, ms, undo) {
  const n = $("toast"); undoFn = undo || null;
  n.innerHTML = "<span></span>" + (undo ? '<button class="linkbtn" id="undo" type="button">Urungkan</button>' : "");
  n.firstChild.textContent = msg; n.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { n.hidden = true; undoFn = null; }, ms);
}
const flash = msg => toast(msg, 4500);
const flashUndo = (msg, fn) => toast(msg, 8000, fn);
function updateNotice() {
  const n = $("notice");
  const msg = denied ? "Akses ke data ditolak. Pastikan aturan Firestore sudah dipublikasikan dan akun ini terdaftar di dalamnya (SETUP.md langkah 5)."
    : state === "nodb" ? "Belum terhubung ke penyimpanan data. Ikuti langkah di SETUP.md."
    : !canWrite ? "Kamu hanya bisa melihat. Minta akses Contributor atau Editor untuk ikut mengisi." : "";
  n.textContent = msg; n.hidden = !msg;
}

const SAFE_ID = /^[A-Za-z0-9_.~:@+-]+$/;
const NUM_FIELDS = ["est", "act", "amount", "price", "dp", "final", "total", "amplop", "n", "m", "ord"];
function cleanDoc(d) {
  const o = { ...d.data(), id: d.id };
  NUM_FIELDS.forEach(k => { if (k in o) o[k] = Number(o[k]) || 0; });
  return o;
}
function subscribe(name, key) {
  col(name).onSnapshot(snap => {
    S[key] = snap.docs.filter(d => SAFE_ID.test(d.id)).map(cleanDoc);
    S.loaded[key] = true; schedule();
  }, e => { S.loaded[key] = true; if (e && e.code === "permission-denied") { denied = true; updateNotice(); } schedule(); });
}
function subscribeMeta() {
  db.doc("meta/settings").onSnapshot(snap => {
    S.meta = { lamaran: "", wedding: "", target: 0, ...(snap.exists ? snap.data() : {}) };
    S.meta.target = Number(S.meta.target) || 0;
    S.loaded.meta = true; schedule();
  }, e => { S.loaded.meta = true; if (e && e.code === "permission-denied") { denied = true; updateNotice(); } schedule(); });
}
let renderTimer;
function schedule() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderCountdown();
    const a = document.activeElement;
    if (a && $("view").contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.type !== "checkbox") { pendingRender = true; return; }
    view();
  }, 80);
}
document.addEventListener("focusout", () => { if (pendingRender) setTimeout(() => { if (pendingRender && !document.activeElement.matches("input,select,textarea")) { pendingRender = false; view(); } }, 50); });

async function init() {
  view();
  try { db = await claude.use("db"); } catch (e) { db = null; }
  if (!db) { state = "nodb"; updateNotice(); view(); return; }
  state = "ready";
  try { userApi = await claude.use("user"); } catch (e) {}
  try { assetsApi = await claude.use("assets"); } catch (e) {}
  try { dlApi = await claude.use("downloads"); } catch (e) {}
  if (userApi) {
    try { me = await userApi.id(); } catch (e) {}
    try { if ((await userApi.can("data.write")) === false) canWrite = false; } catch (e) {}
  }
  updateNotice();
  subscribeMeta();
  subscribe("tasks", "tasks"); subscribe("budget", "budget"); subscribe("guests", "guests"); subscribe("refs", "refs"); subscribe("votes", "votes");
  subscribe("vendors", "vendors"); subscribe("seserahan", "seserahan"); subscribe("rundown", "rundown"); subscribe("journal", "journal"); subscribe("ledger", "ledger");
}

/* ---------- tampilan ---------- */
function renderCountdown() {
  const parts = [], l = daysTo(S.meta.lamaran), w = daysTo(S.meta.wedding), iv = S.meta.invite || {};
  $("ttl").textContent = iv.pria && iv.wanita ? iv.pria + " & " + iv.wanita : "Rencana Nikah";
  if (l !== null && l >= 0) parts.push("Lamaran " + l + " hari lagi");
  if (w !== null && w >= 0) parts.push("Nikah " + w + " hari lagi");
  $("countdown").textContent = parts.join(" · ") || "Isi tanggal di Ringkasan untuk mulai.";
}
function renderTabs() {
  const strip = $("tabs"), left = strip.scrollLeft;
  strip.innerHTML = TABS.map(([k, n]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${n}</button>`).join("");
  strip.scrollLeft = left;
  const on = strip.querySelector('[aria-selected="true"]');
  if (on) { const a = on.getBoundingClientRect(), b = strip.getBoundingClientRect(); if (a.left < b.left || a.right > b.right) strip.scrollLeft += a.left - b.left - (strip.clientWidth - a.width) / 2; }
}
function view() {
  pendingRender = false;
  renderCountdown(); renderTabs();
  $("view").innerHTML = ({ ringkasan: vRingkasan, checklist: vChecklist, budget: vBudget, keuangan: vKeuangan, tamu: vTamu, referensi: vReferensi, vendor: vVendor, seserahan: vSeserahan, harih: vHariH, jurnal: vJurnal })[tab]();
  resolveNames();
}
const dis = () => canWrite && db ? "" : "disabled";
const loading = () => `<p class="empty">Memuat data…</p>`;

function vRingkasan() {
  const done = S.tasks.filter(t => t.done).length, total = S.tasks.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const act = S.budget.reduce((a, b) => a + costOf(b), 0);
  const paid = S.budget.reduce((a, b) => a + paidOf(b), 0);
  const hadir = S.guests.filter(g => g.status === "hadir").reduce((a, g) => a + (+g.n || 0), 0);
  const dues = payDues().slice(0, 3);
  const next = S.tasks.filter(t => !t.done).map(t => ({ t, d: dueDate(t) })).filter(x => x.d).sort((a, b) => a.d - b.d).slice(0, 5);
  return `<div class="stack">
    ${hero()}
    ${profileCard()}
    <div class="card">
      <h2>Progres</h2>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="count">
        <div><b>${done}/${total}</b><span>tugas selesai</span></div>
        <div><b>${S.guests.length}</b><span>undangan · ${hadir} orang konfirmasi hadir${(S.meta.profile || {}).tamu ? " · target " + esc(S.meta.profile.tamu) : ""}</span></div>
        <div><b style="font-size:20px">${rp(paid)}</b><span>sudah dibayar dari ${rp(act)}</span></div>
        <div><b style="font-size:20px">${rp(kas().saldo)}</b><span>saldo kas${kas().biaya ? (kas().selisih >= 0 ? " · dana cukup" : " · dana kurang " + rp(-kas().selisih)) : ""}</span></div>
      </div>
    </div>
    <div class="card">
      <h2>Tugas terdekat</h2>
      ${next.length ? next.map(({ t, d }) => `<div class="task"><div class="body"><div class="t">${esc(t.t)}</div>
        <div class="meta ${d < today() ? "late" : ""}">${d < today() ? "Lewat tenggat · " : ""}${fmtDate(d)}</div></div></div>`).join("")
        : `<p class="empty">Isi tanggal lamaran atau nikah untuk melihat tugas terdekat.</p>`}
    </div>
    ${dues.length ? `<div class="card"><h2>Pembayaran terdekat</h2>${dues.map(x => `<div class="task"><div class="body"><div class="t">${esc(x.v.name)} · ${x.l}</div><div class="meta ${x.d && x.d < today() ? "late" : ""}">${x.d ? (x.d < today() ? "Lewat jatuh tempo · " : "Jatuh tempo ") + fmtDate(x.d) : "Tanggal belum diisi"}</div></div><b class="price">${rp(x.amt)}</b></div>`).join("")}</div>` : ""}
    ${exportCard()}
  </div>`;
}

const likers = id => new Set(S.votes.filter(v => v.ref === id).map(v => v.by));
function profileCard() {
  const iv = S.meta.invite || {}, pf = S.meta.profile || {};
  const f = (label, scope, key, type, ph, val) => `<label>${label}<input type="${type || "text"}" data-${scope}="${key}" value="${esc(val)}" placeholder="${esc(ph || "")}" ${dis()}></label>`;
  const hasNames = !!(iv.pria && iv.wanita), open = profOpen === null ? !hasNames : profOpen;
  return `<details class="card" id="prof" ${open ? "open" : ""}>
    <summary><h2 style="display:inline">Data pernikahan</h2> <span class="meta">${hasNames ? esc(iv.pria + " & " + iv.wanita) : "Isi nama dan tanggal dulu"}</span></summary>
    <div class="row" style="margin-top:12px">
      ${f("Nama mempelai pria", "inv", "pria", "text", "mis. Rafi", iv.pria)}${f("Nama mempelai wanita", "inv", "wanita", "text", "mis. Alya", iv.wanita)}
      <label>Tanggal lamaran<input type="date" id="dl" value="${esc(S.meta.lamaran)}" ${dis()}></label>
      <label>Tanggal nikah<input type="date" id="dw" value="${esc(S.meta.wedding)}" ${dis()}></label>
      ${f("Kota", "pf", "kota", "text", "mis. Bandung", pf.kota)}${f("Tempat acara", "inv", "tempat", "text", "mis. Gedung Melati", iv.tempat)}
      ${f("Adat atau konsep", "pf", "adat", "text", "mis. Adat Sunda, outdoor", pf.adat)}${f("Target jumlah tamu", "pf", "tamu", "number", "mis. 200", pf.tamu)}
    </div>
    <p class="sub">Data ini tampil di bagian atas Ringkasan. Tenggat checklist dihitung dari dua tanggal. Semua perubahan langsung terlihat oleh pasangan.</p></details>`;
}
function hero() {
  const t = today(), w = daysTo(S.meta.wedding), l = daysTo(S.meta.lamaran);
  let big, cap;
  if (w === null) { big = "—"; cap = "Isi tanggal nikah di bawah untuk memulai hitung mundur."; }
  else if (w < 0) { big = "Sah!"; cap = "Selamat menempuh hidup baru."; }
  else if (w === 0) { big = "Hari ini"; cap = "Hari-H tiba. Selamat!"; }
  else { big = w; cap = "hari menuju hari-H · " + fmtDate(new Date(S.meta.wedding + "T00:00:00")) + " · sekitar " + Math.ceil(w / 7) + " minggu"; }
  const open = S.tasks.filter(x => !x.done).map(dueDate).filter(Boolean);
  const late = open.filter(d => d < t).length, soon = open.filter(d => d >= t && d - t <= 7 * 864e5).length;
  const chips = [];
  if (w !== null && w >= 0) chips.push(l !== null && l >= 0 ? "Menuju lamaran · " + l + " hari" : "Menuju hari-H");
  if (late) chips.push(late + " tugas terlambat");
  if (soon) chips.push(soon + " tugas minggu ini");
  const pay = payDues().filter(x => x.d && x.d - t <= 7 * 864e5).length;
  if (pay) chips.push(pay + " pembayaran ≤ 7 hari");
  let track = "";
  if (S.meta.wedding && w >= 0) {
    const W = new Date(S.meta.wedding + "T00:00:00"), L = S.meta.lamaran ? new Date(S.meta.lamaran + "T00:00:00") : null;
    const start = new Date(Math.min(t, L || t)), span = Math.max(1, W - start);
    const pos = d => Math.min(100, Math.max(0, (d - start) / span * 100));
    const stop = (label, p, extra) => `<div class="stop ${extra || ""} ${p < 9 ? "l" : p > 91 ? "r" : ""}" style="left:${p}%"><span>${label}</span></div>`;
    track = `<div class="track" aria-hidden="true"><div class="line"><i style="width:${pos(t)}%"></i></div>${L ? stop("Lamaran", pos(L)) : ""}${stop("Hari ini", pos(t), "up")}${stop("Nikah", 100)}</div>`;
  }
  const iv = S.meta.invite || {}, pf = S.meta.profile || {};
  const who = iv.pria && iv.wanita ? iv.pria + " & " + iv.wanita : "";
  const info = [iv.tempat, pf.kota, pf.adat, pf.tamu ? "sekitar " + pf.tamu + " tamu" : ""].filter(Boolean);
  return `<div class="hero"><div>${who ? `<div class="cap" style="font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">${esc(who)}</div>` : ""}<div class="big">${big}</div><div class="cap">${cap}</div>${info.length ? `<div class="cap" style="opacity:.78;margin-top:4px">${info.map(esc).join(" · ")}</div>` : ""}</div>${chips.length ? `<div class="chips">${chips.map(c => `<span>${c}</span>`).join("")}</div>` : ""}${track}</div>`;
}

function vChecklist() {
  if (state === "ready" && !S.loaded.tasks) return loading();
  const empty = !S.tasks.length ? `<div class="card"><div class="empty"><span>Belum ada tugas.</span>
    <button class="btn" id="tpl" ${dis()}>Pakai template 36 tugas</button></div></div>` : "";
  const cats = [...new Set(S.tasks.map(t => t.cat))];
  const sections = cats.map(c => {
    const items = S.tasks.filter(t => t.cat === c).sort((a, b) => (dueDate(a) || 0) - (dueDate(b) || 0) || b.m - a.m);
    return `<div class="card"><h2>${esc(c)} <span class="meta">${items.filter(t => t.done).length}/${items.length}</span></h2>
      <div>${items.map(t => {
        const d = dueDate(t), late = d && !t.done && d < today();
        return `<div class="task ${t.done ? "done" : ""}">
          <input type="checkbox" data-done="${t.id}" ${t.done ? "checked" : ""} ${dis()} aria-label="Selesai: ${esc(t.t)}">
          <div class="body"><div class="t">${esc(t.t)}</div>
          <div class="meta ${late ? "late" : ""}">${d ? (late ? "Lewat tenggat · " : "Tenggat ") + fmtDate(d) : (t.ref === "L" ? "Sebelum lamaran" : "Sebelum nikah")}</div></div>
          <button class="x" data-del="tasks/${t.id}" ${dis()} aria-label="Hapus tugas">×</button></div>`;
      }).join("")}</div></div>`;
  }).join("");
  return `<div class="stack">${empty}${sections}
    <form class="card" id="addtask">
      <h2>Tambah tugas</h2>
      <div class="row">
        <label style="flex-basis:100%">Tugas<input id="nt" required placeholder="mis. Sewa mobil pengantin" ${dis()}></label>
        <label>Kategori<input id="nc" list="cats" value="Acara" ${dis()}><datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>
        <label>Acuan<select id="nr" ${dis()}><option value="W">Sebelum nikah</option><option value="L">Sebelum lamaran</option></select></label>
        <label>Berapa bulan sebelumnya<input id="nm" type="number" step="0.25" value="1" ${dis()}></label>
        <button class="btn" ${dis()}>Tambah</button>
      </div>
    </form></div>`;
}

function vBudget() {
  if (state === "ready" && !(S.loaded.budget && S.loaded.meta)) return loading();
  const items = [...S.budget].sort(byOrd);
  const est = items.reduce((a, b) => a + (+b.est || 0), 0);
  const act = items.reduce((a, b) => a + costOf(b), 0);
  const paid = items.reduce((a, b) => a + paidOf(b), 0);
  const over = S.meta.target && act > S.meta.target;
  const split = Object.entries(PAYERS).map(([k, n]) => [n, items.filter(b => (b.payer || "bersama") === k).reduce((a, b) => a + costOf(b), 0)]).filter(x => x[1] > 0);
  return `<div class="stack">
    <div class="card">
      <div class="row"><label>Budget maksimal (Rp)<input type="number" id="bt" min="0" value="${S.meta.target || ""}" placeholder="mis. 150000000" ${dis()}></label></div>
      <div class="count">
        <div><b style="font-size:20px">${rp(est)}</b><span>estimasi</span></div>
        <div><b style="font-size:20px" class="${over ? "over" : ""}">${rp(act)}</b><span>biaya${S.meta.target ? " · sisa budget " + rp(S.meta.target - act) : ""}</span></div>
        <div><b style="font-size:20px">${rp(paid)}</b><span>sudah dibayar · belum ${rp(act - paid)}</span></div>
      </div>
    </div>
    ${split.length ? `<div class="card"><h2>Siapa menanggung apa</h2><div class="split">${split.map(([n, v]) => `<div><span>${n}</span><span class="bar"><i style="width:${act ? Math.round(v / act * 100) : 0}%"></i></span><b class="price">${rp(v)}</b></div>`).join("")}</div><p class="sub">Dihitung dari biaya aktual per pos.</p></div>` : ""}
    <div class="card">
      ${items.length ? `<div class="tbl"><table>
      <thead><tr><th>Pos</th><th class="num">Estimasi</th><th class="num">Aktual</th><th class="num">Dibayar</th><th>Ditanggung</th><th></th></tr></thead>
      <tbody>${items.map(b => `<tr>
        <td><input data-b="${b.id}" data-f="name" value="${esc(b.name)}" ${dis()} aria-label="Nama pos"></td>
        <td><input class="num" type="number" min="0" data-b="${b.id}" data-f="est" value="${b.est || ""}" ${dis()} aria-label="Estimasi"></td>
        <td><input class="num" type="number" min="0" data-b="${b.id}" data-f="act" value="${b.act || ""}" placeholder="${linkedOf(b) ? "Otomatis " + linkedOf(b) : ""}" ${dis()} aria-label="Aktual"></td>
        <td class="num" style="padding:4px 8px">${rp(paidOf(b))}</td>
        <td><select data-b="${b.id}" data-f="payer" ${dis()} aria-label="Ditanggung oleh">${Object.entries(PAYERS).map(([k, n]) => `<option value="${k}" ${(b.payer || "bersama") === k ? "selected" : ""}>${n}</option>`).join("")}</select></td>
        <td><button class="x" data-del="budget/${b.id}" ${dis()} aria-label="Hapus pos">×</button></td></tr>`).join("")}</tbody>
      </table></div>` : `<div class="empty"><span>Belum ada pos budget.</span><button class="btn" id="tplb" ${dis()}>Pakai 9 pos standar</button></div>`}
      <div><button class="btn ghost" id="addb" ${dis()}>Tambah pos</button></div>
      <p class="sub">Biaya memakai angka Aktual. Kalau kosong, memakai total kontrak vendor dan harga seserahan yang dikaitkan ke pos ini, lalu Estimasi. Kolom Dibayar terisi otomatis dari catatan uang keluar di tab Keuangan.</p>
    </div>
  </div>`;
}

function vTamu() {
  if (state === "ready" && !S.loaded.guests) return loading();
  const gs = [...S.guests].sort(byOrd);
  const tot = gs.reduce((a, g) => a + (+g.n || 0), 0);
  const hadir = gs.filter(g => g.status === "hadir").reduce((a, g) => a + (+g.n || 0), 0);
  const amplop = gs.reduce((a, g) => a + (+g.amplop || 0), 0);
  const cost = S.budget.reduce((a, b) => a + costOf(b), 0);
  const rows = gs.map(g => `<div class="task g">
    <div class="body"><div class="t">${esc(g.name)} <span class="meta">· ${esc(g.n)} orang · ${SIDES[g.side] || ""}</span></div></div>
    <input class="num" type="number" min="0" data-ga="${g.id}" value="${g.amplop || ""}" placeholder="Amplop (Rp)" ${dis()} aria-label="Amplop dari ${esc(g.name)}" style="width:150px">
    <select data-gs="${g.id}" ${dis()} aria-label="Status ${esc(g.name)}" style="width:auto">${Object.entries(STAT).map(([k, v]) => `<option value="${k}" ${g.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select>
    <button class="x" data-del="guests/${g.id}" ${dis()} aria-label="Hapus tamu">×</button></div>`).join("");
  return `<div class="stack">
    <div class="card"><div class="count">
      <div><b>${tot}</b><span>total orang diundang</span></div>
      <div><b>${hadir}</b><span>konfirmasi hadir</span></div>
      <div><b style="font-size:20px">${rp(amplop)}</b><span>amplop terkumpul${cost ? " · menutup " + Math.round(amplop / cost * 100) + "% biaya" : ""}</span></div></div></div>
    <div class="card"><h2>Daftar tamu</h2>${rows || `<p class="empty">Belum ada tamu. Tambahkan di bawah.</p>`}</div>
    <form class="card" id="addguest"><h2>Tambah tamu</h2><div class="row">
      <label style="flex-basis:100%">Nama<input id="gn" required placeholder="mis. Keluarga Pak Hendra" ${dis()}></label>
      <label>Jumlah orang<input id="gc" type="number" min="1" value="1" ${dis()}></label>
      <label>Dari pihak<select id="gside" ${dis()}>${Object.entries(SIDES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <button class="btn" ${dis()}>Tambah</button></div></form>
  </div>`;
}

function vReferensi() {
  if (state === "ready" && !S.loaded.refs) return loading();
  const all = [...S.refs].sort((a, b) => (b.ord || 0) - (a.ord || 0));
  const list = all.filter(r => (refCat === "Semua" || r.cat === refCat) && (refStatus === "semua" || (refStatus === "cocok" ? likers(r.id).size >= 2 : r.status === refStatus)));
  const cards = list.map(r => {
    const link = cleanUrl(r.url), lk = likers(r.id), both = lk.size >= 2, mine = me && lk.has(me);
    const img = r.img ? `<img src="/_blob/${esc(r.img)}" alt="${esc(r.title)}" loading="lazy">` : "";
    return `<article class="ref">${img}<div class="in">
      <div class="top"><span><span class="pill">${esc(r.cat)}</span> ${both ? `<span class="pill good">Cocok berdua</span>` : ""}</span>
        <button class="x" data-del="refs/${r.id}" ${dis()} aria-label="Hapus referensi">×</button></div>
      <h3>${esc(r.title)}</h3>
      ${r.price ? `<div class="price">${rp(r.price)}</div>` : ""}
      ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Buka tautan</a>` : ""}
      ${r.contact ? `<div class="meta">Kontak: ${esc(r.contact)}</div>` : ""}
      ${r.note ? `<p>${esc(r.note)}</p>` : ""}
      <div class="row" style="align-items:center;justify-content:space-between">
        <select data-rs="${r.id}" ${dis()} aria-label="Status ${esc(r.title)}">${Object.entries(REF_STATUS).map(([k, v]) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select>
        ${r.status === "dipilih" ? (S.vendors.some(v => v.id === "r_" + r.id) ? `<span class="pill good">Sudah di Vendor</span>` : `<button class="btn ghost" data-tovendor="${r.id}" ${dis()}>Jadikan vendor</button>`) : ""}
        <button class="like" data-like="${r.id}" aria-pressed="${!!mine}" ${db && canWrite && me ? "" : "disabled"}>♥ ${lk.size}</button>
        <span class="meta" data-by="${esc(r.by || "")}"></span></div>
    </div></article>`;
  }).join("");
  return `<div class="stack">
    <div class="card">
      <div class="chips" role="group" aria-label="Kategori">${["Semua", ...REF_CATS].map(c => `<button data-rc="${esc(c)}" aria-pressed="${refCat === c}">${esc(c)}</button>`).join("")}</div>
      <div class="chips" role="group" aria-label="Status">${[["semua", "Semua status"], ["cocok", "♥ Cocok berdua"], ...Object.entries(REF_STATUS).map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button data-rst="${k}" aria-pressed="${refStatus === k}">${n}</button>`).join("")}</div>
    </div>
    ${list.length ? `<div class="refs">${cards}</div>` : `<div class="card"><p class="empty">${all.length ? "Tidak ada referensi dengan filter ini." : "Belum ada referensi. Simpan ide dekor, busana, vendor WO atau MUA di bawah."}</p></div>`}
    <form class="card" id="addref">
      <h2>Simpan referensi</h2>
      <div class="row">
        <label style="flex-basis:100%">Nama / judul<input id="rt" required placeholder="mis. Dekor rustic pelaminan bunga kering" ${dis()}></label>
        <label>Kategori<select id="rcat" ${dis()}>${REF_CATS.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
        <label>Status<select id="rst" ${dis()}>${Object.entries(REF_STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></label>
        <label style="flex-basis:100%">Tautan (Instagram, Pinterest, website)<input id="ru" inputmode="url" placeholder="instagram.com/..." ${dis()}></label>
      </div>
      <details><summary>Harga, kontak, catatan, foto</summary>
        <div class="row" style="margin-top:10px">
          <label>Harga (Rp)<input id="rp" type="number" min="0" ${dis()}></label>
          <label>Kontak<input id="rk" placeholder="nama / nomor WA" ${dis()}></label>
          <label style="flex-basis:100%">Catatan<textarea id="rn" placeholder="paket, yang suka, yang kurang" ${dis()}></textarea></label>
          ${assetsApi ? `<label style="flex-basis:100%">Foto<input id="ri" type="file" accept="image/*" ${dis()}></label>` : ""}
        </div>
      </details>
      <div><button class="btn" id="rsub" ${dis()}>Simpan</button></div>
    </form>
  </div>`;
}

/* ---------- vendor, seserahan, hari-H, jurnal, ekspor ---------- */
const val = el => el.type === "checkbox" ? el.checked : el.type === "number" ? (+el.value || 0) : el.value;
const atDay = iso => new Date(iso + "T00:00:00");
function payDues() {
  const out = [];
  S.vendors.forEach(v => [["dp", "DP"], ["final", "Pelunasan"]].forEach(([k, l]) => {
    const amt = +v[k] || 0, ds = v[k + "Date"];
    if (amt > 0 && !v[k + "Paid"]) out.push({ v, l, amt, d: ds ? atDay(ds) : null });
  }));
  return out.sort((a, b) => (a.d ? +a.d : 9e15) - (b.d ? +b.d : 9e15));
}
function payRow(v, k, label) {
  return `<div class="pay"><input type="checkbox" data-v="${v.id}" data-f="${k}Paid" ${v[k + "Paid"] ? "checked" : ""} ${dis()} aria-label="${label} ${esc(v.name)} sudah dibayar">
    <span class="plabel">${label}</span>
    <input type="number" min="0" class="num" data-v="${v.id}" data-f="${k}" value="${v[k] || ""}" placeholder="Rp" ${dis()} aria-label="Jumlah ${label} ${esc(v.name)}">
    <input type="date" data-v="${v.id}" data-f="${k}Date" value="${esc(v[k + "Date"] || "")}" ${dis()} aria-label="Tanggal ${label} ${esc(v.name)}"></div>`;
}
const isoToday = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const paidOf = b => S.ledger.filter(l => l.type === "keluar" && l.budgetId === b.id).reduce((a, l) => a + (+l.amount || 0), 0);
const sesPos = () => S.meta.sesPos === "none" ? "" : (S.meta.sesPos || autoPos("Seserahan"));
const seserahanTotal = b => sesPos() === b.id ? S.seserahan.reduce((a, x) => a + (+x.price || 0), 0) : 0;
const vendorTotal = b => S.vendors.filter(v => v.budgetId === b.id).reduce((a, v) => a + (+v.total || 0), 0);
const linkedOf = b => vendorTotal(b) + seserahanTotal(b);
const actOf = b => (+b.act) || linkedOf(b);
const costOf = b => actOf(b) || (+b.est) || 0;
function kas() {
  const sum = (type, pred) => S.ledger.filter(l => l.type === type && (!pred || pred(l))).reduce((a, l) => a + (+l.amount || 0), 0);
  const amplop = S.guests.reduce((a, g) => a + (+g.amplop || 0), 0);
  const masuk = sum("masuk") + amplop, keluar = sum("keluar"), biaya = S.budget.reduce((a, b) => a + costOf(b), 0);
  const saldo = masuk - keluar, sisa = Math.max(0, biaya - keluar);
  return { masuk, keluar, amplop, biaya, saldo, sisa, selisih: saldo - sisa };
}
function vKeuangan() {
  if (state === "ready" && !(S.loaded.ledger && S.loaded.budget && S.loaded.meta && S.loaded.guests)) return loading();
  const k = kas(), tg = S.meta.targets || {}, items = [...S.budget].sort(byOrd);
  const rows = Object.entries(PAYERS).map(([key, name]) => {
    const got = S.ledger.filter(l => l.type === "masuk" && l.party === key).reduce((a, l) => a + (+l.amount || 0), 0);
    const sug = items.filter(b => (b.payer || "bersama") === key).reduce((a, b) => a + costOf(b), 0);
    const target = +tg[key] > 0 ? +tg[key] : sug, pct = target ? Math.min(100, Math.round(got / target * 100)) : 0, diff = target - got;
    return `<div class="trow"><div class="th"><b>${name}</b><input class="num" type="number" min="0" data-tg="${key}" value="${tg[key] || ""}" placeholder="${sug ? "Saran " + rp(sug) : "Target (Rp)"}" ${dis()} aria-label="Target setoran ${name}"></div>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="meta">Terkumpul ${rp(got)}${target ? " dari " + rp(target) + " · " + (diff > 0 ? "kurang " + rp(diff) : "lebih " + rp(-diff)) : " · target belum diisi"}</div></div>`;
  }).join("");
  const hist = [...S.ledger].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.ord || 0) - (a.ord || 0)).map(l => {
    const inn = l.type === "masuk", label = inn ? (MASUK_PIHAK[l.party] || "") : ((items.find(b => b.id === l.budgetId) || {}).name || "Tanpa pos");
    return `<div class="task"><div class="body"><div class="t">${esc(label)} <span class="pill ${inn ? "good" : "bad"}">${inn ? "Masuk" : "Keluar"}</span></div>
      <div class="meta">${l.date ? fmtDate(atDay(l.date)) : ""}${l.note ? " · " + esc(l.note) : ""} · <span data-by="${esc(l.by || "")}"></span></div></div>
      <b class="${inn ? "amt-in" : "amt-out"}">${inn ? "+" : "-"}${rp(l.amount)}</b>
      <button class="x" data-del="ledger/${l.id}" ${dis()} aria-label="Hapus catatan">×</button></div>`;
  }).join("");
  const tanpaPos = S.ledger.filter(l => l.type === "keluar" && !items.some(b => b.id === l.budgetId)).reduce((a, l) => a + (+l.amount || 0), 0);
  const status = !k.biaya ? "Isi biaya di tab Budget untuk melihat apakah dana cukup." : k.selisih >= 0 ? "Dana cukup untuk sisa tagihan, lebih " + rp(k.selisih) + "." : "Dana kurang " + rp(-k.selisih) + " untuk sisa tagihan.";
  return `<div class="stack">
    <div class="card"><div class="count">
      <div><b style="font-size:20px">${rp(k.masuk)}</b><span>uang masuk${k.amplop ? " · termasuk amplop tamu " + rp(k.amplop) : ""}</span></div>
      <div><b style="font-size:20px">${rp(k.keluar)}</b><span>uang keluar</span></div>
      <div><b style="font-size:20px" class="${k.saldo < 0 ? "over" : ""}">${rp(k.saldo)}</b><span>saldo kas</span></div></div>
      <p class="sub">Sisa tagihan ${rp(k.sisa)} dari total biaya ${rp(k.biaya)}. ${status}${tanpaPos ? " " + rp(tanpaPos) + " uang keluar belum dikaitkan ke pos budget." : ""}</p></div>
    <div class="card"><h2>Setoran per pihak</h2>${rows}
      <p class="sub">Kolom target kosong memakai saran dari biaya di tab Budget yang ditandai ditanggung pihak itu. Isi angka untuk mengganti.</p></div>
    <form class="card" id="addmasuk"><h2>Catat uang masuk</h2><div class="row">
      <label>Tanggal<input id="mtgl" type="date" value="${isoToday()}" required ${dis()}></label>
      <label>Jumlah (Rp)<input id="mjml" type="number" min="1" required ${dis()}></label>
      <label>Dari pihak<select id="mpihak" ${dis()}>${Object.entries(MASUK_PIHAK).map(([key, n]) => `<option value="${key}">${n}</option>`).join("")}</select></label>
      <label>Catatan<input id="mcat" placeholder="opsional" ${dis()}></label>
      <button class="btn" ${dis()}>Simpan</button></div></form>
    <form class="card" id="addkeluar"><h2>Catat uang keluar</h2><div class="row">
      <label>Tanggal<input id="ktgl" type="date" value="${isoToday()}" required ${dis()}></label>
      <label>Jumlah (Rp)<input id="kjml" type="number" min="1" required ${dis()}></label>
      <label>Untuk pos budget<select id="kpos" ${dis()}><option value="">Tanpa pos</option>${items.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join("")}</select></label>
      <label>Catatan<input id="kcat" placeholder="mis. DP katering" ${dis()}></label>
      <button class="btn" ${dis()}>Simpan</button></div></form>
    <div class="card"><h2>Riwayat</h2>${hist || `<p class="empty">Belum ada catatan uang masuk atau keluar.</p>`}</div>
  </div>`;
}

const POS_KEYWORDS = { "Dekorasi": ["dekor"], "Busana": ["busana"], "MUA": ["mua", "busana"], "Wedding Organizer": ["admin", "organizer", "wo"], "Venue": ["venue"], "Katering": ["katering"], "Foto & video": ["foto"], "Seserahan": ["seserahan"], "Undangan": ["undangan"] };
function autoPos(cat) {
  const keys = POS_KEYWORDS[cat] || [];
  const hit = [...S.budget].sort(byOrd).find(b => keys.some(k => b.name.toLowerCase().includes(k)));
  return hit ? hit.id : "";
}
const VENDOR_SYNC = ["dpPaid", "finalPaid", "dp", "final", "dpDate", "finalDate", "budgetId", "name"];
async function syncVendorLedger(id, patch) {
  const base = S.vendors.find(v => v.id === id); if (!base) return;
  const v = { ...base, ...patch };
  for (const [k, label] of [["dp", "DP"], ["final", "Pelunasan"]]) {
    const lid = "v_" + id + "_" + k, amt = +v[k] || 0, ex = S.ledger.find(l => l.id === lid);
    if (v[k + "Paid"] && amt > 0) {
      await db.doc("ledger/" + lid).set({ type: "keluar", budgetId: v.budgetId || "", amount: amt, date: v[k + "Date"] || (ex && ex.date) || isoToday(), note: label + " " + v.name, vendorId: id, kind: k, by: (ex && ex.by) || me || "", ord: (ex && ex.ord) || Date.now() });
    } else if (ex) await db.doc("ledger/" + lid).delete();
  }
}
function vVendor() {
  if (state === "ready" && !(S.loaded.vendors && S.loaded.ledger && S.loaded.budget)) return loading();
  const vs = [...S.vendors].sort(byOrd), t = today(), dues = payDues();
  const unsynced = vs.some(v => ["dp", "final"].some(k => v[k + "Paid"] && +v[k] > 0 && !S.ledger.some(l => l.id === "v_" + v.id + "_" + k)));
  const total = vs.reduce((a, v) => a + (+v.total || 0), 0);
  const paid = vs.reduce((a, v) => a + (v.dpPaid ? +v.dp || 0 : 0) + (v.finalPaid ? +v.final || 0 : 0), 0);
  const dueHtml = dues.length ? dues.map(x => {
    const late = x.d && x.d < t, days = x.d ? Math.round((x.d - t) / 864e5) : null;
    return `<div class="task"><div class="body"><div class="t">${esc(x.v.name)} · ${x.l}</div><div class="meta ${late ? "late" : ""}">${x.d ? (late ? "Lewat jatuh tempo · " : "Jatuh tempo ") + fmtDate(x.d) + (days >= 0 ? " (" + days + " hari lagi)" : "") : "Tanggal belum diisi"}</div></div><b class="price">${rp(x.amt)}</b></div>`;
  }).join("") : `<p class="empty">Tidak ada tagihan yang menunggu.</p>`;
  const cards = vs.map(v => {
    const vp = (v.dpPaid ? +v.dp || 0 : 0) + (v.finalPaid ? +v.final || 0 : 0);
    return `<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2>${esc(v.name)} <span class="pill">${esc(v.cat)}</span></h2>
      <button class="x" data-del="vendors/${v.id}" ${dis()} aria-label="Hapus vendor">×</button></div>
      <div class="row"><label>Total kontrak (Rp)<input type="number" min="0" data-v="${v.id}" data-f="total" value="${v.total || ""}" ${dis()}></label>
      <label>Kontak<input data-v="${v.id}" data-f="contact" value="${esc(v.contact || "")}" placeholder="nama / nomor WA" ${dis()}></label>
      <label>Pos budget<select data-v="${v.id}" data-f="budgetId" ${dis()}><option value="">Tanpa pos</option>${[...S.budget].sort(byOrd).map(b => `<option value="${b.id}" ${v.budgetId === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label></div>
      ${payRow(v, "dp", "DP")}${payRow(v, "final", "Pelunasan")}
      <p class="sub">Terbayar ${rp(vp)}${v.total ? " · sisa " + rp((+v.total || 0) - vp) : ""}</p></div>`;
  }).join("");
  return `<div class="stack">
    <div class="card"><div class="count"><div><b style="font-size:20px">${rp(total)}</b><span>total kontrak</span></div>
      <div><b style="font-size:20px">${rp(paid)}</b><span>sudah dibayar · sisa ${rp(total - paid)}</span></div></div></div>
    ${unsynced ? `<div class="card"><p class="sub">Ada pembayaran yang sudah dicentang tapi belum tercatat di Keuangan.</p><div><button class="btn" id="syncv" ${dis()}>Catat ke Keuangan</button></div></div>` : `<p class="sub">Centang DP atau pelunasan akan otomatis mencatat uang keluar di tab Keuangan. Pilih pos budget agar masuk ke pos yang tepat.</p>`}
    <div class="card"><h2>Jatuh tempo</h2>${dueHtml}</div>
    ${cards}
    <form class="card" id="addvendor"><h2>Tambah vendor</h2><div class="row">
      <label style="flex-basis:100%">Nama vendor<input id="vn" required placeholder="mis. Rias Ayu" ${dis()}></label>
      <label>Jenis<select id="vc" ${dis()}>${REF_CATS.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
      <label>Total kontrak (Rp)<input id="vt" type="number" min="0" ${dis()}></label>
      <button class="btn" ${dis()}>Tambah</button></div></form>
  </div>`;
}
async function syncSeserahanLedger(id, patch, pos) {
  const base = S.seserahan.find(x => x.id === id); if (!base) return;
  const x = { ...base, ...patch }, lid = "s_" + id, ex = S.ledger.find(l => l.id === lid);
  if ((x.status === "dibeli" || x.status === "dihias") && +x.price > 0) {
    await db.doc("ledger/" + lid).set({ type: "keluar", budgetId: pos === undefined ? sesPos() : pos, amount: +x.price, date: (ex && ex.date) || isoToday(), note: "Seserahan: " + x.name, seserahanId: id, sstatus: x.status, by: (ex && ex.by) || me || "", ord: (ex && ex.ord) || Date.now() });
  } else if (ex) await db.doc("ledger/" + lid).delete();
}
function vSeserahan() {
  if (state === "ready" && !(S.loaded.seserahan && S.loaded.budget && S.loaded.meta && S.loaded.ledger)) return loading();
  const it = [...S.seserahan].sort(byOrd);
  const n = s => it.filter(x => x.status === s).length;
  const sum = it.reduce((a, x) => a + (+x.price || 0), 0);
  const rows = it.map(x => `<div class="task g"><div class="body"><div class="t">${esc(x.name)} <span class="pill">${esc(x.kind)}</span></div></div>
    <input class="num" type="number" min="0" data-s="${x.id}" data-f="price" value="${x.price || ""}" placeholder="Harga (Rp)" ${dis()} aria-label="Harga ${esc(x.name)}" style="width:150px">
    <select data-s="${x.id}" data-f="status" ${dis()} aria-label="Status ${esc(x.name)}" style="width:auto">${Object.entries(SES_STATUS).map(([k, l]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <button class="x" data-del="seserahan/${x.id}" ${dis()} aria-label="Hapus">×</button></div>`).join("");
  return `<div class="stack">
    <div class="card"><div class="count"><div><b>${it.length}</b><span>barang · ${n("dibeli")} dibeli · ${n("dihias")} dihias</span></div>
      <div><b style="font-size:20px">${rp(sum)}</b><span>total harga</span></div></div></div>
    <div class="card"><label>Masuk ke pos budget<select id="sespos" ${dis()}>${[...S.budget].sort(byOrd).map(b => `<option value="${b.id}" ${sesPos() === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}<option value="none" ${sesPos() === "" ? "selected" : ""}>Tanpa pos</option></select></label>
      <p class="sub">Total harga seserahan dan mahar masuk ke biaya pos ini di Budget. Tandai Sudah dibeli atau Sudah dihias untuk mencatat uang keluarnya di Keuangan secara otomatis.</p></div>
    <div class="card"><h2>Seserahan dan mahar</h2>${rows || `<p class="empty">Belum ada barang. Mulai dari mahar, perlengkapan ibadah, atau busana.</p>`}</div>
    <form class="card" id="addses"><h2>Tambah barang</h2><div class="row">
      <label style="flex-basis:100%">Nama barang<input id="sn" required placeholder="mis. Set perhiasan, mukena, tas" ${dis()}></label>
      <label>Jenis<select id="sk" ${dis()}><option>Seserahan</option><option>Mahar</option></select></label>
      <label>Harga (Rp)<input id="sp" type="number" min="0" ${dis()}></label>
      <button class="btn" ${dis()}>Tambah</button></div></form>
  </div>`;
}
function vHariH() {
  if (state === "ready" && !S.loaded.rundown) return loading();
  const groups = RUN_DAYS.map(d => {
    const items = S.rundown.filter(r => (r.day || "Hari-H") === d).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return `<div class="card"><h2>${d} ${S.meta[d === "Lamaran" ? "lamaran" : "wedding"] ? `<span class="meta">${fmtDate(atDay(S.meta[d === "Lamaran" ? "lamaran" : "wedding"]))}</span>` : ""}</h2>
      ${items.length ? items.map(r => `<div class="task"><span class="time">${esc(r.time || "--:--")}</span><div class="body"><div class="t">${esc(r.title)}</div>
        <div class="meta">${r.pic ? "PIC: " + esc(r.pic) : ""}${r.pic && r.note ? " · " : ""}${esc(r.note || "")}</div></div>
        <button class="x" data-del="rundown/${r.id}" ${dis()} aria-label="Hapus">×</button></div>`).join("") : `<p class="empty">Belum ada jadwal ${d}.</p>`}</div>`;
  }).join("");
  return `<div class="stack">${groups}
    <form class="card" id="addrun"><h2>Tambah acara</h2><div class="row">
      <label>Hari<select id="rd" ${dis()}>${RUN_DAYS.map(d => `<option>${d}</option>`).join("")}</select></label>
      <label>Jam<input id="rtm" type="time" required ${dis()}></label>
      <label style="flex-basis:100%">Acara<input id="rti" required placeholder="mis. Akad nikah" ${dis()}></label>
      <label>Penanggung jawab<input id="rpic" placeholder="mis. WO, MC, Kak Rina" ${dis()}></label>
      <label>Catatan<input id="rnt" placeholder="opsional" ${dis()}></label>
      <button class="btn" ${dis()}>Tambah</button></div></form>
  </div>`;
}
function vJurnal() {
  if (state === "ready" && !S.loaded.journal) return loading();
  const items = [...S.journal].sort((a, b) => (b.ord || 0) - (a.ord || 0));
  const open = items.filter(j => j.kind === "bahas" && !j.resolved).length;
  const feed = items.map(j => {
    const k = J_KINDS[j.kind] || J_KINDS.catatan, done = j.kind === "bahas" && j.resolved;
    return `<div class="card entry ${done ? "done" : ""}"><div class="row" style="justify-content:space-between;align-items:center">
      <span><span class="pill ${k[1]}">${k[0]}</span> <span class="meta">${new Date(j.ord).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · <span data-by="${esc(j.by || "")}"></span></span></span>
      <button class="x" data-del="journal/${j.id}" ${dis()} aria-label="Hapus catatan">×</button></div>
      <p>${esc(j.text)}</p>
      ${j.kind === "bahas" ? `<label style="flex:none;display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:13px"><input type="checkbox" data-jr="${j.id}" ${j.resolved ? "checked" : ""} ${dis()}> Sudah dibahas</label>` : ""}</div>`;
  }).join("");
  return `<div class="stack">
    <form class="card" id="addjournal"><h2>Jurnal berdua</h2>
      <p class="sub">Tulis keputusan yang sudah disepakati, catatan diskusi, atau hal yang perlu dibahas lagi.${open ? " Ada " + open + " hal yang masih perlu dibahas." : ""}</p>
      <div class="row"><label style="flex-basis:100%">Isi<textarea id="jt" required placeholder="mis. Sepakat pakai adat Jawa untuk akad, resepsi modern" ${dis()}></textarea></label>
      <label>Jenis<select id="jk" ${dis()}>${Object.entries(J_KINDS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></label>
      <button class="btn" ${dis()}>Simpan</button></div></form>
    ${feed || `<div class="card"><p class="empty">Belum ada catatan.</p></div>`}
  </div>`;
}
const csv = rows => "﻿" + rows.map(r => r.map(c => { c = String(c == null ? "" : c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(",")).join("\r\n");
const EXPORTS = {
  checklist: ["Checklist", "checklist-nikah.csv", () => [["Tugas", "Kategori", "Tenggat", "Selesai"], ...S.tasks.map(t => [t.t, t.cat, dueDate(t) ? fmtDate(dueDate(t)) : "", t.done ? "Ya" : "Belum"])]],
  budget: ["Budget", "budget-nikah.csv", () => [["Pos", "Estimasi", "Aktual", "Dibayar", "Ditanggung"], ...[...S.budget].sort(byOrd).map(b => [b.name, b.est || 0, actOf(b), paidOf(b), PAYERS[b.payer || "bersama"]])]],
  keuangan: ["Keuangan", "keuangan-nikah.csv", () => [["Tanggal", "Pihak atau pos", "Catatan", "Masuk", "Keluar"], ...[...S.ledger].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.ord || 0) - (b.ord || 0)).map(l => { const inn = l.type === "masuk"; return [l.date ? fmtDate(atDay(l.date)) : "", inn ? (MASUK_PIHAK[l.party] || "") : ((S.budget.find(b => b.id === l.budgetId) || {}).name || "Tanpa pos"), l.note || "", inn ? (l.amount || 0) : 0, inn ? 0 : (l.amount || 0)]; })]],
  vendor: ["Vendor", "vendor-nikah.csv", () => [["Vendor", "Jenis", "Kontak", "Total", "DP", "Tanggal DP", "DP lunas", "Pelunasan", "Tanggal pelunasan", "Pelunasan lunas"], ...[...S.vendors].sort(byOrd).map(v => [v.name, v.cat, v.contact || "", v.total || 0, v.dp || 0, v.dpDate || "", v.dpPaid ? "Ya" : "Belum", v.final || 0, v.finalDate || "", v.finalPaid ? "Ya" : "Belum"])]],
  tamu: ["Tamu", "daftar-tamu.csv", () => [["Nama", "Jumlah orang", "Pihak", "Status", "Amplop"], ...[...S.guests].sort(byOrd).map(g => [g.name, g.n, SIDES[g.side] || "", (STAT[g.status] || [""])[0], g.amplop || 0])]],
  seserahan: ["Seserahan", "seserahan-mahar.csv", () => [["Barang", "Jenis", "Harga", "Status"], ...[...S.seserahan].sort(byOrd).map(x => [x.name, x.kind, x.price || 0, SES_STATUS[x.status] || ""])]],
  rundown: ["Rundown", "rundown-acara.csv", () => [["Hari", "Jam", "Acara", "PIC", "Catatan"], ...[...S.rundown].sort((a, b) => (a.day || "Hari-H").localeCompare(b.day || "Hari-H") || (a.time || "").localeCompare(b.time || "")).map(r => [r.day || "Hari-H", r.time || "", r.title, r.pic || "", r.note || ""])]]
};
const MONEY = { budget: [1, 2, 3], keuangan: [3, 4], vendor: [3, 4, 7], tamu: [4], seserahan: [2] };
async function buildXlsx(keys) {
  const wb = new ExcelJS.Workbook();
  keys.forEach(k => {
    const ex = EXPORTS[k], money = MONEY[k] || [], data = ex[2](), n = data.length, cols = data[0].length;
    const ws = wb.addWorksheet(ex[0], { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRows(data);
    for (let c = 0; c < cols; c++) {
      const col = ws.getColumn(c + 1);
      const len = Math.max(...data.map(r => String(r[c] == null ? "" : r[c]).length));
      col.width = Math.min(48, Math.max(11, len + 3));
      if (money.includes(c)) col.numFmt = '"Rp" #,##0';
    }
    ws.eachRow((row, i) => row.eachCell(cell => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD3DDCF" } } };
      cell.alignment = { vertical: "middle", wrapText: true, horizontal: money.includes(cell.col - 1) && i > 1 ? "right" : "left" };
    }));
    const head = ws.getRow(1); head.height = 24;
    head.eachCell(cell => { cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F6B52" } }; });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols } };
    ws.pageSetup = { paperSize: 9, orientation: cols >= 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, printTitlesRow: "1:1", margins: { left: 0.5, right: 0.5, top: 0.8, bottom: 0.7, header: 0.3, footer: 0.3 } };
    ws.headerFooter = { oddHeader: "&C&B&A", oddFooter: "&LRencana Nikah&RHalaman &P dari &N" };
    if (money.length && n > 1) {
      const tot = ws.addRow(["Total"]);
      money.forEach(c => { const sum = data.slice(1).reduce((a, r) => a + (+r[c] || 0), 0); const L = ws.getColumn(c + 1).letter; tot.getCell(c + 1).value = { formula: `SUM(${L}2:${L}${n})`, result: sum }; tot.getCell(c + 1).numFmt = '"Rp" #,##0'; });
      tot.eachCell({ includeEmpty: true }, cell => { cell.font = { name: "Calibri", size: 11, bold: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EBDD" } }; });
    }
  });
  return wb.xlsx.writeBuffer();
}
const LIBS = {
  xlsx: ["vendor/exceljs.min.js"],
  pdf: ["vendor/jspdf.umd.min.js", "vendor/jspdf.plugin.autotable.min.js"]
};
const libReady = {};
const loadScript = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load")); document.head.appendChild(s); });
function ensureLib(kind) {
  if (!libReady[kind]) libReady[kind] = LIBS[kind].reduce((p, u) => p.then(() => loadScript(u)), Promise.resolve()).catch(e => { libReady[kind] = null; throw e; });
  return libReady[kind];
}
const pdfText = s => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/≤/g, "<=")
  .replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ]/g, "");
function buildPdf(keys) {
  const { jsPDF } = window.jspdf;
  const inv = S.meta.invite || {};
  const sub = [inv.pria && inv.wanita ? inv.pria + " & " + inv.wanita : "", S.meta.wedding ? "Nikah " + fmtDate(atDay(S.meta.wedding)) : ""].filter(Boolean).join("  |  ");
  let doc = null;
  keys.forEach(k => {
    const ex = EXPORTS[k], money = MONEY[k] || [], data = ex[2](), head = data[0], body = data.slice(1);
    const orient = head.length >= 6 ? "landscape" : "portrait";
    if (!doc) doc = new jsPDF({ unit: "pt", format: "a4", orientation: orient }); else doc.addPage("a4", orient);
    const W = doc.internal.pageSize.getWidth(), M = 40;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(79, 107, 82); doc.text("RENCANA NIKAH", M, 40);
    doc.setFontSize(20); doc.setTextColor(28, 36, 29); doc.text(pdfText(ex[0]), M, 66);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 112, 100);
    doc.text(pdfText([sub, "Dicetak " + fmtDate(new Date())].filter(Boolean).join("  |  ")), M, 84);
    doc.setDrawColor(211, 221, 207); doc.line(M, 94, W - M, 94);
    if (!body.length) { doc.setFontSize(11); doc.text("Belum ada data.", M, 120); return; }
    const cell = (v, c) => money.includes(c) ? rp(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(atDay(v)) : pdfText(v);
    const foot = money.length ? [head.map((_, c) => c === 0 ? "Total" : money.includes(c) ? rp(body.reduce((a, r) => a + (+r[c] || 0), 0)) : "")] : undefined;
    doc.autoTable({
      startY: 106, head: [head.map(pdfText)], body: body.map(r => r.map(cell)), foot, theme: "grid", showHead: "everyPage", showFoot: "lastPage",
      margin: { left: M, right: M, top: 50, bottom: 50 },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6, textColor: [28, 36, 29], lineColor: [211, 221, 207], lineWidth: 0.5, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [79, 107, 82], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [227, 235, 221], textColor: [28, 36, 29], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 242] },
      columnStyles: Object.fromEntries(money.map(c => [c, { halign: "right" }])),
      didParseCell: d => { if (d.section !== "body" && money.includes(d.column.index)) d.cell.styles.halign = "right"; }
    });
  });
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 130, 120);
    doc.text("Rencana Nikah", 40, H - 28); doc.text("Halaman " + p + " dari " + n, W - 40, H - 28, { align: "right" });
  }
  return doc.output("blob");
}
async function exportFile(key) {
  const kind = key === "xlsx" ? "xlsx" : "pdf";
  try { await ensureLib(kind); } catch (e) { flash("Pustaka unduhan gagal dimuat. Periksa koneksi lalu coba lagi."); return; }
  const keys = key === "all" || key === "xlsx" ? Object.keys(EXPORTS) : [key];
  const filename = key === "xlsx" ? "rencana-nikah.xlsx" : key === "all" ? "rencana-nikah.pdf" : EXPORTS[key][1].replace(/\.csv$/, ".pdf");
  try { await dlApi.save({ filename, data: kind === "xlsx" ? new Blob([await buildXlsx(keys)]) : buildPdf(keys) }); }
  catch (x) { if (!x || x.code !== "declined") flash("File tidak bisa disimpan di tampilan ini."); }
}
function exportCard() {
  if (!dlApi) return "";
  return `<div class="card"><h2>Ekspor ke file</h2><p class="sub">Simpan sebagai PDF ukuran A4 yang rapi dan mudah dibaca, siap dicetak atau dikirim ke keluarga.</p>
    <div class="exports">${Object.entries(EXPORTS).map(([k, v]) => `<button class="btn ghost" data-export="${k}">${v[0]}</button>`).join("")}<button class="btn" data-export="all">Semua sekaligus</button><button class="btn ghost" data-export="xlsx">Versi Excel</button></div></div>`;
}

async function resolveNames() {
  const els = [...document.querySelectorAll("[data-by]")];
  const ids = [...new Set(els.map(e => e.dataset.by).filter(Boolean))];
  const need = ids.filter(i => !(i in names));
  if (need.length && userApi && userApi.profiles) {
    try { const ps = await userApi.profiles(need); need.forEach(i => { names[i] = (ps[i] && ps[i].name) || ""; }); } catch (e) {}
  }
  els.forEach(e => { const i = e.dataset.by; if (i) e.textContent = "oleh " + (i === me ? "kamu" : (names[i] || "pasangan")); });
}

async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("gagal")), "image/jpeg", 0.82));
}

/* ---------- aksi ---------- */
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-tab],[data-del],[data-rc],[data-rst],[data-like],[data-export],[data-tovendor],#undo,#syncv,#addb,#tpl,#tplb");
  if (!el) return;
  if (el.dataset.export) {
    exportFile(el.dataset.export);
    return;
  }
  if (el.dataset.tab) { tab = el.dataset.tab; try { history.replaceState(null, "", "#" + tab); } catch (x) {} view(); window.scrollTo(0, 0); }
  else if (el.dataset.like) {
    if (!me) return;
    const vid = el.dataset.like + "__" + me, has = S.votes.some(v => v.id === vid);
    write(() => has ? db.doc("votes/" + vid).delete() : db.doc("votes/" + vid).set({ ref: el.dataset.like, by: me }));
  }
  else if (el.dataset.tovendor) {
    const r = S.refs.find(x => x.id === el.dataset.tovendor); if (!r) return;
    write(async () => { await db.doc("vendors/r_" + r.id).set({ name: r.title, cat: r.cat, contact: r.contact || "", total: +r.price || 0, budgetId: autoPos(r.cat), refId: r.id, ord: Date.now() }); flash("Ditambahkan ke tab Vendor. Lengkapi DP dan pelunasan di sana."); });
  }
  else if (el.dataset.rc) { refCat = el.dataset.rc; view(); }
  else if (el.dataset.rst) { refStatus = el.dataset.rst; view(); }
  else if (el.dataset.del) {
    const [c, id] = el.dataset.del.split("/");
    const item = (S[c] || []).find(x => x.id === id); if (!item) return;
    const strip = o => { const { id: _i, ...rest } = o; return rest; };
    const restore = [[el.dataset.del, strip(item)]];
    const ledgers = c === "vendors" ? S.ledger.filter(l => l.vendorId === id) : c === "seserahan" ? S.ledger.filter(l => l.seserahanId === id) : [];
    const votes = c === "refs" ? S.votes.filter(v => v.ref === id) : [];
    ledgers.forEach(l => restore.push(["ledger/" + l.id, strip(l)]));
    votes.forEach(v => restore.push(["votes/" + v.id, strip(v)]));
    let flag = null;
    if (c === "ledger" && item.vendorId) { const kd = item.kind === "final" ? "final" : "dp"; flag = ["vendors/" + item.vendorId, { [kd + "Paid"]: true }, { [kd + "Paid"]: false }]; }
    if (c === "ledger" && item.seserahanId) flag = ["seserahan/" + item.seserahanId, { status: item.sstatus || "dibeli" }, { status: "belum" }];
    write(async () => {
      await db.doc(el.dataset.del).delete();
      for (const l of ledgers) await db.doc("ledger/" + l.id).delete();
      for (const v of votes) await db.doc("votes/" + v.id).delete();
      if (flag) await db.doc(flag[0]).update(flag[2]).catch(() => {});
    });
    flashUndo("Dihapus.", () => write(async () => {
      for (const [path, data] of restore) await db.doc(path).set(data);
      if (flag) await db.doc(flag[0]).update(flag[1]).catch(() => {});
    }));
  }
  else if (el.id === "undo") { const f = undoFn; undoFn = null; $("toast").hidden = true; if (f) { f(); flash("Dikembalikan."); } }
  else if (el.id === "syncv") write(async () => { for (const v of S.vendors) await syncVendorLedger(v.id, {}); });
  else if (el.id === "addb") write(() => col("budget").doc(uid()).set({ name: "Pos baru", est: 0, act: 0, paid: 0, ord: Date.now() }));
  else if (el.id === "tpl") {
    el.disabled = true; el.textContent = "Menyimpan…";
    await write(async () => { for (let i = 0; i < TEMPLATE.length; i++) { const t = TEMPLATE[i];
      await db.doc("tasks/t" + String(i).padStart(2, "0")).set({ t: t[0], cat: t[1], ref: t[2], m: t[3], done: false, ord: i }); } });
  }
  else if (el.id === "tplb") {
    el.disabled = true; el.textContent = "Menyimpan…";
    await write(async () => { for (let i = 0; i < BUDGET_TEMPLATE.length; i++)
      await db.doc("budget/b" + String(i).padStart(2, "0")).set({ name: BUDGET_TEMPLATE[i], est: 0, act: 0, paid: 0, ord: i }); });
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "dl") setMeta({ lamaran: el.value });
  else if (el.id === "dw") setMeta({ wedding: el.value });
  else if (el.id === "bt") setMeta({ target: +el.value || 0 });
  else if (el.id === "sespos") write(async () => {
    const v = el.value, pos = v === "none" ? "" : v;
    await db.doc("meta/settings").set({ sesPos: v }, { merge: true });
    for (const x of S.seserahan) await syncSeserahanLedger(x.id, {}, pos);
  });
  else if (el.dataset.done) write(() => db.doc("tasks/" + el.dataset.done).update({ done: el.checked }));
  else if (el.dataset.b) write(() => db.doc("budget/" + el.dataset.b).update({ [el.dataset.f]: el.dataset.f === "name" || el.dataset.f === "payer" ? el.value : (+el.value || 0) }));
  else if (el.dataset.ga) write(() => db.doc("guests/" + el.dataset.ga).update({ amplop: +el.value || 0 }));
  else if (el.dataset.gs) write(() => db.doc("guests/" + el.dataset.gs).update({ status: el.value }));
  else if (el.dataset.tg) setMeta({ targets: { [el.dataset.tg]: +el.value || 0 } });
  else if (el.dataset.rs) write(() => db.doc("refs/" + el.dataset.rs).update({ status: el.value }));
  else if (el.dataset.v) {
    const id = el.dataset.v, f = el.dataset.f, value = val(el);
    write(async () => {
      await db.doc("vendors/" + id).update({ [f]: value });
      if (VENDOR_SYNC.includes(f)) await syncVendorLedger(id, { [f]: value });
    });
  }
  else if (el.dataset.s) {
    const id = el.dataset.s, f = el.dataset.f, value = val(el);
    write(async () => { await db.doc("seserahan/" + id).update({ [f]: value }); if (f === "status" || f === "price") await syncSeserahanLedger(id, { [f]: value }); });
  }
  else if (el.dataset.jr) write(() => db.doc("journal/" + el.dataset.jr).update({ resolved: el.checked }));
  else if (el.dataset.pf) setMeta({ profile: { [el.dataset.pf]: el.value.trim() } });
  else if (el.dataset.inv) setMeta({ invite: { [el.dataset.inv]: el.value.trim() } });
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === "addtask") {
    const f = { t: $("nt").value.trim(), cat: $("nc").value.trim() || "Acara", ref: $("nr").value, m: +$("nm").value || 0, done: false, ord: Date.now() };
    e.target.reset(); write(() => col("tasks").doc(uid()).set(f));
  } else if (id === "addguest") {
    const f = { name: $("gn").value.trim(), n: Math.max(1, +$("gc").value || 1), side: $("gside").value, status: "belum", ord: Date.now() };
    e.target.reset(); write(() => col("guests").doc(uid()).set(f));
  } else if (id === "addmasuk") {
    const f = { type: "masuk", party: $("mpihak").value, amount: +$("mjml").value || 0, date: $("mtgl").value || isoToday(), note: $("mcat").value.trim(), by: me || "", ord: Date.now() };
    if (f.amount > 0) { e.target.reset(); write(() => col("ledger").doc(uid()).set(f)); }
  } else if (id === "addkeluar") {
    const f = { type: "keluar", budgetId: $("kpos").value, amount: +$("kjml").value || 0, date: $("ktgl").value || isoToday(), note: $("kcat").value.trim(), by: me || "", ord: Date.now() };
    if (f.amount > 0) { e.target.reset(); write(() => col("ledger").doc(uid()).set(f)); }
  } else if (id === "addvendor") {
    const f = { name: $("vn").value.trim(), cat: $("vc").value, total: +$("vt").value || 0, ord: Date.now() };
    f.budgetId = autoPos(f.cat);
    e.target.reset(); write(() => col("vendors").doc(uid()).set(f));
  } else if (id === "addses") {
    const f = { name: $("sn").value.trim(), kind: $("sk").value, price: +$("sp").value || 0, status: "belum", ord: Date.now() };
    e.target.reset(); write(() => col("seserahan").doc(uid()).set(f));
  } else if (id === "addrun") {
    const f = { day: $("rd").value, time: $("rtm").value, title: $("rti").value.trim(), pic: $("rpic").value.trim(), note: $("rnt").value.trim(), ord: Date.now() };
    e.target.reset(); write(() => col("rundown").doc(uid()).set(f));
  } else if (id === "addjournal") {
    const f = { text: $("jt").value.trim(), kind: $("jk").value, by: me || "", resolved: false, ord: Date.now() };
    e.target.reset(); write(() => col("journal").doc(uid()).set(f));
  } else if (id === "addref") {
    const btn = $("rsub"); btn.disabled = true; btn.textContent = "Menyimpan…";
    const f = { title: $("rt").value.trim(), cat: $("rcat").value, status: $("rst").value, url: cleanUrl($("ru").value),
      price: +$("rp").value || 0, contact: $("rk").value.trim(), note: $("rn").value.trim(), by: me || "", ord: Date.now() };
    const file = $("ri") && $("ri").files[0];
    if (file && assetsApi) {
      try { const up = await assetsApi.upload(await shrink(file)); f.img = up.id; } catch (x) { flash("Foto tidak bisa diunggah. Referensi disimpan tanpa foto."); }
    }
    await write(() => col("refs").doc(uid()).set(f));
    refCat = "Semua"; refStatus = "semua"; view();
  }
});
document.addEventListener("toggle", e => { if (e.target.id === "prof") profOpen = e.target.open; }, true);
init();
