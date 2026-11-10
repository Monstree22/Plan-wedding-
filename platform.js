/* Penghubung antara aplikasi dan Firebase: login, penyimpanan data bersama, dan unduhan file.
   Aplikasi memanggil claude.use("db" | "user" | "downloads"); di sini semuanya dijawab oleh Firebase dan browser. */
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const configured = !!(cfg.apiKey && !/^ISI/.test(cfg.apiKey) && window.firebase);
  const $ = id => document.getElementById(id);
  let auth = null, fs = null, dbPromise = null;

  function box(html) {
    let el = $("auth");
    if (!el) { el = document.createElement("div"); el.id = "auth"; document.body.appendChild(el); }
    el.hidden = false; el.innerHTML = '<div class="box">' + html + "</div>";
    return el;
  }

  // Firebase mewajibkan format email, jadi nama pengguna tanpa "@" diberi domain tetap ini.
  const toEmail = v => { v = v.trim().toLowerCase(); return v.includes("@") ? v : v + "@rencana.nikah"; };

  function showSetup() {
    box('<h1>Rencana Nikah</h1><div class="card"><h2>Belum terhubung</h2><p class="sub">Aplikasi belum tersambung ke Firebase. Isi <b>firebase-config.js</b> mengikuti langkah di <b>SETUP.md</b>, lalu muat ulang halaman ini.</p></div>');
  }

  function showLogin() {
    return new Promise(resolve => {
      const el = box('<h1>Rencana Nikah</h1><form class="card" id="loginform"><h2>Masuk</h2>' +
        '<label>Nama pengguna<input id="lemail" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" required></label>' +
        '<label>Kata sandi<input id="lpass" type="password" autocomplete="current-password" required></label>' +
        '<div class="err" id="lerr" role="alert"></div><button class="btn" id="lbtn">Masuk</button></form>');
      el.querySelector("#loginform").addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("lbtn"); btn.disabled = true; $("lerr").textContent = "";
        try { await auth.signInWithEmailAndPassword(toEmail($("lemail").value), $("lpass").value); resolve(); }
        catch (x) {
          btn.disabled = false;
          $("lerr").textContent = /network/i.test(x.code || "") ? "Tidak ada koneksi internet." : "Nama pengguna atau kata sandi salah.";
        }
      });
    });
  }

  function currentUser() {
    return new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = (async () => {
      if (!configured) { showSetup(); return null; }
      try { firebase.initializeApp(cfg); auth = firebase.auth(); fs = firebase.firestore(); } catch (e) { showSetup(); return null; }
      try { await fs.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
      let u = await currentUser();
      if (!u) { await showLogin(); u = auth.currentUser; }
      const el = $("auth"); if (el) el.hidden = true;
      const out = $("logout");
      if (out) { out.hidden = false; out.onclick = async () => { await auth.signOut(); location.reload(); }; }
      try { await fs.doc("users/" + u.uid).set({ name: u.displayName || (u.email || "").split("@")[0] }); } catch (e) {}
      return fs;
    })();
    return dbPromise;
  }

  const user = {
    id: async () => auth && auth.currentUser ? auth.currentUser.uid : null,
    can: async () => true, canEdit: () => true, isOwner: () => true,
    profiles: async ids => {
      const out = {};
      await Promise.all(ids.map(async i => {
        try { const d = await fs.doc("users/" + i).get(); out[i] = { name: d.exists ? d.data().name : "" }; } catch (e) { out[i] = { name: "" }; }
      }));
      return out;
    }
  };

  const TYPES = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv" };
  const downloads = {
    save: async ({ filename, data }) => {
      const ext = (filename.split(".").pop() || "").toLowerCase();
      const blob = data instanceof Blob && data.type ? data : new Blob([data], { type: TYPES[ext] || "application/octet-stream" });
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  };

  window.claude = {
    use: async name => {
      if (name === "db") return openDb();
      if (name === "user") return user;
      if (name === "downloads") return downloads;
      return null;
    }
  };
})();
