(() => {
  "use strict";
  const C = window.STUDY_CONFIG, Q = window.QUESTIONNAIRES;
  const params = new URLSearchParams(location.search);
  const DEBUG = params.has("debug");               // developer: no required answers, no watch-to-end
  const TEST = DEBUG || params.has("test");         // tester: skip-video + autofill buttons, data go to TEST_responses.csv
  const META = ["timestamp", "sheet", "participant_id", "session_id", "version", "consent_at", "consent_version",
                "condition", "position", "mode"];
  const app = document.getElementById("app");
  const LS_COUNTER = "arhud_version_counter";

  // ---------- storage helpers (localStorage can throw) ----------
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  const state = { pid: "", sid: "", version: "", order: [], rows: [], source: "", consentAt: "", wide: {} };

  // ======================================================================
  //  DATA: one CSV in the GitHub repo, one row per participant (like Google Forms),
  //  written through the GitHub API after every page. No server, no downloads.
  //  The token is entered once per lab device on ?setup and kept only in that browser:
  //  it is never in the repo (GitHub revokes tokens pushed to public repos).
  // ======================================================================
  const LS_GH = "arhud_github", LS_PENDING = "arhud_pending";
  const gh = () => ({ repo: C.DATA_REPO, branch: C.DATA_BRANCH || "main", ...ls.get(LS_GH, {}) });
  const csvPath = () => (C.DATA_DIR || "data") + "/" + (TEST ? "TEST_responses.csv" : "responses.csv");
  const ready = () => { const g = gh(); return !!(g.token && g.repo); };

  const b64enc = str => { const b = new TextEncoder().encode(str); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0)));

  function parseCSV(text) {
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  const esc = v => { v = v == null ? "" : String(v); return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const toCSV = (header, rows) => [header, ...rows].map(r => r.map(esc).join(",")).join("\n") + "\n";

  async function ghApi(method, body) {
    const g = gh();
    const url = `https://api.github.com/repos/${g.repo}/contents/${csvPath()}` + (method === "GET" ? `?ref=${encodeURIComponent(g.branch)}&t=${Date.now()}` : "");
    const r = await fetch(url, { method, cache: "no-store",
      headers: { Authorization: "Bearer " + g.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
                 ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    return r;
  }
  async function readSheet() {
    const r = await ghApi("GET");
    if (r.status === 404) return { header: [], rows: [], sha: undefined };
    if (!r.ok) throw new Error("GitHub GET " + r.status);
    const j = await r.json();
    const all = parseCSV(b64dec(j.content));
    return { header: all[0] || [], rows: all.slice(1).filter(x => x.length > 1), sha: j.sha };
  }

  // Upsert one participant row (merge: never blank a filled cell). Retries on a concurrent-write conflict.
  async function upsert(w) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { header, rows, sha } = await readSheet();
      const h = header.slice();
      Object.keys(w).forEach(k => { if (!h.includes(k)) h.push(k); });
      const sidCol = h.indexOf("session_id");
      const norm = rows.map(r => h.map((_, i) => r[i] ?? ""));
      let i = norm.findIndex(r => r[sidCol] === w.session_id);
      const merged = h.map((k, j) => (k in w && w[k] !== "" && w[k] != null) ? w[k] : (i >= 0 ? norm[i][j] : ""));
      if (i >= 0 && norm[i][h.indexOf("completed")] === "yes") merged[h.indexOf("completed")] = "yes";
      if (i >= 0) norm[i] = merged; else norm.push(merged);
      const r = await ghApi("PUT", { message: `${TEST ? "test" : "data"}: ${w.participant_id} (${w.last_page || "update"})`,
        branch: gh().branch, content: b64enc(toCSV(h, norm)), ...(sha ? { sha } : {}) });
      if (r.ok) return;
      if (r.status !== 409 && r.status !== 422) throw new Error("GitHub PUT " + r.status);
      await new Promise(res => setTimeout(res, 500 + Math.random() * 1500)); // someone else wrote: re-read and retry
    }
    throw new Error("GitHub: too many conflicts");
  }

  // Latest snapshot per session waits here only until GitHub confirms it, then it is deleted.
  let flushing = false, retryTimer = null;
  const pending = () => ls.get(LS_PENDING, {});
  async function flush() {
    if (flushing || !ready()) return updateStatus();
    flushing = true;
    try {
      for (const [sid, w] of Object.entries(pending())) {
        try { await upsert(w); }
        catch (e) { console.warn("Upload failed, will retry", e); schedule(8000); break; }
        const p = pending(); if (p[sid] && p[sid].last_update === w.last_update) { delete p[sid]; ls.set(LS_PENDING, p); }
      }
    } finally { flushing = false; updateStatus(); }
    if (Object.keys(pending()).length && !retryTimer) schedule(3000);
  }
  function schedule(ms) { clearTimeout(retryTimer); retryTimer = setTimeout(() => { retryTimer = null; flush(); }, ms); }
  function updateStatus() {
    const el = document.getElementById("save-status");
    if (!el) return;
    const n = Object.keys(pending()).length;
    el.textContent = !ready() ? "⚠ This device is not connected to the data repository: answers were NOT saved." :
      n ? "Saving… keep this page open and online." : "All answers saved ✓";
    el.className = "save-status " + (!ready() || n ? "pending" : "ok");
  }

  // ---------- version assignment (A/B alternation from the live rows already in the CSV) ----------
  async function assignVersion() {
    const keys = Object.keys(C.VERSIONS);
    const forced = (params.get("v") || "").toUpperCase();
    if (C.VERSIONS[forced]) return { v: forced, src: "url" };
    if (!TEST && ready()) {
      try {
        const { header, rows } = await readSheet();
        const n = rows.length;
        return { v: keys[n % keys.length], src: "repo #" + (n + 1) };
      } catch (e) { console.warn("Could not read CSV for A/B, using local counter", e); }
    }
    const n = ls.get(LS_COUNTER, 0); ls.set(LS_COUNTER, n + 1);
    return { v: keys[n % keys.length], src: "local #" + (n + 1) };
  }

  // Columns: <cond>_<questionnaire>_<item>, cond = N/A/T (fixed per interface, whatever the order).
  function save(row) {
    const w = state.wide;
    if (!w.session_id) Object.assign(w, {
      started_at: row.timestamp, participant_id: state.pid, session_id: state.sid, version: state.version,
      order: state.order.map(k => C.CONDITIONS[k].code).join("-"), mode: TEST ? "test" : "live",
      consent_at: state.consentAt, consent_version: C.CONSENT.version, completed: "no" });
    w.last_update = row.timestamp;
    const cond = row.condition ? C.CONDITIONS[row.condition].code + "_" : "";
    w.last_page = cond + row.sheet;
    if (cond) w[cond + "position"] = row.position;
    for (const [k, v] of Object.entries(row)) if (!META.includes(k)) w[cond + row.sheet + "_" + k] = v;
    if (row.sheet === "Final") w.completed = "yes";
    const p = pending(); p[state.sid] = { ...w }; ls.set(LS_PENDING, p);
    flush();
  }

  // ---------- device setup (experimenter, once per lab computer) ----------
  function setupScreen() {
    const g = gh();
    const repo = h("input", { type: "text", value: g.repo || "", placeholder: "owner/repo" });
    const branch = h("input", { type: "text", value: g.branch || "main" });
    const token = h("input", { type: "password", value: g.token || "", placeholder: "github_pat_…", autocomplete: "off" });
    const out = h("p", {});
    screen(h("h2", {}, "Device setup (experimenter only)"),
      h("p", {}, "Connect this browser to the repository where responses.csv is written. The token is stored only in this browser, never in the repository."),
      h("label", { class: "field" }, "Data repository", repo),
      h("label", { class: "field" }, "Branch", branch),
      h("label", { class: "field" }, "Fine-grained token (Contents: read and write, this repo only)", token),
      h("div", { class: "row" },
        h("button", { class: "primary", onclick: async () => {
          ls.set(LS_GH, { repo: repo.value.trim(), branch: branch.value.trim() || "main", token: token.value.trim() });
          out.textContent = "Testing…";
          try {
            const r = await fetch(`https://api.github.com/repos/${repo.value.trim()}`, { headers: { Authorization: "Bearer " + token.value.trim() } });
            const j = await r.json();
            out.textContent = r.ok ? (j.permissions && j.permissions.push ? `Connected ✓ (${j.private ? "private" : "PUBLIC: answers will be public!"} repo)` : "Connected, but the token cannot write") : "Failed: " + (j.message || r.status);
          } catch (e) { out.textContent = "Failed: " + e.message; }
        } }, "Save and test"),
        h("button", { onclick: () => { try { localStorage.removeItem(LS_GH); } catch {} out.textContent = "Removed from this browser."; } }, "Disconnect this device"),
        h("button", { onclick: () => { location.href = location.pathname; } }, "Go to study")),
      out);
  }

  function scores(key, vals) {
    if (key === "sus") {
      let s = 0;
      // form coding: 1 = strongly agree … 5 = strongly disagree -> standard coding (1 = strongly disagree) via 6 - raw
      for (let i = 1; i <= 10; i++) { const v = 6 - +vals["sus" + String(i).padStart(2, "0")]; s += i % 2 ? v - 1 : 5 - v; }
      return { sus_score: s * 2.5 };
    }
    if (key === "tlx") {
      const ks = Q.tlx.items.map(i => i.id);
      return { rtlx_1to10: Math.round(ks.reduce((a, k) => a + +vals[k], 0) / ks.length * 100) / 100 };
    }
    return {};
  }

  // ---------- rendering ----------
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    kids.flat().forEach(c => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const screen = (...kids) => { app.replaceChildren(h("section", { class: "card" }, ...kids)); window.scrollTo(0, 0); };
  const progress = (txt) => h("p", { class: "progress" }, txt);

  function renderItem(qKey, q, item, idx) {
    const name = qKey + "__" + item.id;
    const wrap = h("div", { class: "item", "data-name": name });
    if (item.type === "likert") {
      wrap.classList.add("likert");
      wrap.append(h("p", { class: "qtext" }, `${idx + 1}. ${item.text}`));
      const row = h("div", { class: "scale" });
      row.style.gridTemplateColumns = `repeat(${q.scale.length},1fr)`;
      q.scale.forEach((lab, i) => row.append(
        h("label", {}, h("input", { type: "radio", name, value: q.codes ? q.codes[i] : i + 1 }), h("span", {}, lab))));
      wrap.append(row);
    } else if (item.type === "linear") {
      wrap.append(h("p", { class: "qtext" }, item.hint ? [h("strong", {}, item.text), " — ", item.hint] : `${qKey === "anagraphic" ? "" : idx + 1 + ". "}${item.text}`));
      const row = h("div", { class: "linear" }, h("span", { class: "anchor" }, item.lo));
      for (let v = item.min; v <= item.max; v++)
        row.append(h("label", {}, h("span", {}, String(v)), h("input", { type: "radio", name, value: v })));
      row.append(h("span", { class: "anchor" }, item.hi));
      wrap.append(row);
    } else if (item.type === "choice") {
      wrap.append(h("p", { class: "qtext" }, item.text));
      const row = h("div", { class: item.vertical ? "choices vertical" : "choices" });
      item.options.forEach(o => row.append(h("label", {}, h("input", { type: "radio", name, value: o }), " ", o)));
      wrap.append(row);
    } else if (item.type === "rank") {
      wrap.append(h("p", { class: "qtext" }, item.text));
      const keys = Object.keys(C.RANK_LABELS);
      const tbl = h("div", { class: "rank" });
      keys.forEach(k => {
        const sel = h("select", { name: name + "__" + k }, h("option", { value: "" }, "—"),
          ...keys.map((_, i) => h("option", { value: i + 1 }, String(i + 1))));
        tbl.append(h("label", {}, sel, " ", C.RANK_LABELS[k]));
      });
      wrap.append(tbl);
    } else if (item.type === "number") {
      wrap.append(h("p", { class: "qtext" }, item.text),
        h("input", { type: "number", name, min: item.min, max: item.max, inputmode: "numeric" }));
    } else if (item.type === "text") {
      wrap.append(h("p", { class: "qtext" }, item.text), h("textarea", { name, rows: 3 }));
    }
    return wrap;
  }

  function readItem(qKey, item) {
    const name = qKey + "__" + item.id;
    if (item.type === "likert" || item.type === "choice" || item.type === "linear") {
      const c = app.querySelector(`input[name="${name}"]:checked`); return c ? c.value : "";
    }
    if (item.type === "rank") {
      const keys = Object.keys(C.RANK_LABELS);
      const v = keys.map(k => app.querySelector(`[name="${name}__${k}"]`).value);
      if (v.some(x => !x) || new Set(v).size !== v.length) return "";
      return keys.map((k, i) => `${C.CONDITIONS[k].code}:${v[i]}`).join(";");
    }
    const el = app.querySelector(`[name="${name}"]`);
    if (item.type === "number") {
      const v = el.value.trim();
      if (v === "" || isNaN(+v) || (item.min != null && +v < item.min) || (item.max != null && +v > item.max)) return "";
      return v;
    }
    return el.value.trim();
  }

  function questionnaire(qKey, ctx) {
    return new Promise(resolve => {
      const base = Q[qKey], cond = C.CONDITIONS[ctx.condition] || {};
      const q = { ...base, items: base.items.filter(it => !it.interfaceOnly || cond.code !== "N") };
      const items = q.items.map((it, i) => renderItem(qKey, q, it, i));
      const err = h("p", { class: "error", hidden: true }, "Please answer all highlighted items.");
      const next = h("button", { class: "primary", onclick: () => {
        const vals = {}; let missing = null;
        q.items.forEach((it, i) => {
          const v = readItem(qKey, it); vals[it.id] = v;
          const bad = v === "" && !it.optional;
          items[i].classList.toggle("missing", bad);
          if (bad && !missing) missing = items[i];
        });
        if (missing && !DEBUG) { err.hidden = false; missing.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        save({
          timestamp: new Date().toISOString(), sheet: q.sheet, participant_id: state.pid, session_id: state.sid,
          version: state.version, consent_at: state.consentAt, consent_version: C.CONSENT.version, condition: ctx.condition || "", position: ctx.position || "",
          ...vals, ...scores(qKey, vals)
        });
        resolve();
      } }, "Continue");
      const fill = TEST ? h("button", { class: "testbtn", onclick: () => {
        items.forEach(it => {
          const r = it.querySelectorAll("input[type=radio]"); if (r.length) r[Math.floor(Math.random() * r.length)].checked = true;
          const n = it.querySelector("input[type=number]"); if (n) n.value = n.min ? Math.max(+n.min, 30) : 30;
          const t = it.querySelector("textarea"); if (t && !t.value) t.value = "test";
          it.querySelectorAll("select").forEach((s, i) => { s.value = String(i + 1); });
        });
      } }, "Autofill (test)") : null;
      screen(progress(ctx.progress), h("h2", {}, q.title), q.intro ? h("p", { class: "intro" }, q.intro) : null,
        ...items, err, h("div", { class: "row" }, next, fill));
    });
  }

  function playClip(src, label, progressTxt, ctx) {
    return new Promise(resolve => {
      const presses = []; let skipped = false;
      const video = h("video", { src, playsinline: "", preload: "auto", muted: "", controls: C.BLOCK_SEEKING ? false : "" });
      video.muted = true; video.defaultMuted = true; video.volume = 0;   // all clips play without sound
      video.style.transform = `scale(${C.VIDEO_ZOOM || 1})`;
      const rate = C.PLAYBACK_RATE || 1;
      video.defaultPlaybackRate = rate;
      video.addEventListener("loadedmetadata", () => { video.playbackRate = rate; });
      video.addEventListener("play", () => { video.playbackRate = rate; video.muted = true; });
      video.addEventListener("volumechange", () => { if (!video.muted) video.muted = true; });
      const next = h("button", { class: "primary", disabled: C.REQUIRE_FULL_VIEW && !DEBUG ? "" : false,
        onclick: () => { video.pause(); finish(); } }, "Continue");
      const play = h("button", { onclick: () => { video.play(); play.hidden = true; } }, "▶ Play");
      const msg = h("p", { class: "hint" }, "Watch the whole clip. You can continue when it ends.");
      let last = 0;
      if (C.BLOCK_SEEKING) {
        video.addEventListener("timeupdate", () => { if (!video.seeking) last = video.currentTime; });
        video.addEventListener("seeking", () => { if (video.currentTime > last + 0.5) video.currentTime = last; });
      }
      // SPACE / button = "I notice a problem". Logged on the video clock (s, ms precision).
      const flash = h("div", { class: "flash", hidden: true }, "Registered");
      const press = () => {
        if (video.paused || video.ended) return;
        presses.push(Math.round(video.currentTime * 1000) / 1000);
        flash.hidden = false; clearTimeout(flash._t); flash._t = setTimeout(() => { flash.hidden = true; }, 700);
      };
      const onKey = e => { if (e.code === "Space") { e.preventDefault(); press(); } };
      document.addEventListener("keydown", onKey);
      const pbtn = h("button", { class: "takeover", onclick: e => { e.currentTarget.blur(); press(); } }, "Problem (SPACE)");
      const finish = () => {
        document.removeEventListener("keydown", onKey);
        save({ timestamp: new Date().toISOString(), sheet: "Presses", participant_id: state.pid, session_id: state.sid,
          version: state.version, consent_at: state.consentAt, consent_version: C.CONSENT.version,
          condition: ctx.condition, position: ctx.position, clip: src, n_presses: presses.length,
          press_times_s: presses.join(";"), skipped: skipped ? "yes" : "no", playback_rate: rate, clip_duration_s: Math.round((video.duration || 0) * 1000) / 1000 });
        resolve();
      };
      video.addEventListener("ended", () => { next.disabled = false; msg.textContent = "Clip finished."; });
      video.addEventListener("error", () => {
        msg.textContent = `Could not load ${src}. Check the file is in /videos and the name in config.js.`;
        msg.classList.add("error");
      });
      screen(progress(progressTxt), h("h2", {}, label), h("div", { class: "player" }, video, flash),
        h("div", { class: "row" }, play, pbtn, next,
          TEST ? h("button", { class: "testbtn", onclick: () => { video.pause(); skipped = true; finish(); } }, "Skip video (test)") : null), msg);
    });
  }

  function message(title, text, btn = "Continue", note) {
    return new Promise(resolve => screen(h("h2", {}, title),
      note ? h("p", { class: "note" }, note) : null,
      h("p", {}, text),
      h("button", { class: "primary", onclick: resolve }, btn)));
  }

  // ---------- informed consent (GDPR) ----------
  function consent() {
    const K = C.CONSENT;
    return new Promise(resolve => {
      const boxes = K.statements.map(t => h("label", { class: "check" },
        h("input", { type: "checkbox", onchange: () => { err.hidden = true; } }), " ", t));
      const err = h("p", { class: "error", hidden: true }, "Please tick all statements to take part.");
      const sec = (title, body) => [h("h3", {}, title), h("p", {}, body)];
      screen(
        h("h2", {}, "Information sheet and consent"),
        h("div", { class: "consent" },
          ...sec("Study", K.study),
          ...sec("What you will do", K.procedure),
          ...sec("Data collected", K.data),
          ...sec("Data controller and contact", K.controller),
          ...sec("Legal basis and purpose", K.legalBasis),
          ...sec("Storage, processors and retention", K.storage),
          ...sec("Your rights", K.rights)),
        h("div", { class: "checks" }, ...boxes), err,
        h("div", { class: "row" },
          h("button", { class: "primary", onclick: () => {
            if (!boxes.every(b => b.querySelector("input").checked)) { err.hidden = false; return; }
            state.consentAt = new Date().toISOString(); resolve(true);
          } }, "I agree — continue"),
          h("button", { onclick: () => resolve(false) }, "I do not agree")));
    });
  }

  // ---------- flow ----------
  async function run() {
    if (params.has("setup")) return setupScreen();
    flush(); // send anything left from an interrupted session
    if (!ready()) document.body.prepend(h("div", { class: "testbanner warn" }, "This device is not connected to the data repository: open ?setup first"));
    if (TEST) document.body.prepend(h("div", { class: "testbanner" }, "TEST MODE: answers go to data/TEST_responses.csv; the A/B alternation is not affected"));

    await new Promise(resolve => {
      const pid = h("input", { type: "text", placeholder: "e.g. P01", autocomplete: "off" });
      const err = h("p", { class: "error", hidden: true }, "Enter a participant ID.");
      screen(h("h1", {}, "AR HUD — Conceptual Evaluation"),
        h("p", {}, "You will watch three short driving clips. After each clip you will answer a few questionnaires. There are no right or wrong answers."),
        h("label", { class: "field" }, "Participant ID (filled in by the experimenter)", pid), err,
        h("button", { class: "primary", onclick: async e => {
          const v = pid.value.trim();
          if (!v) { err.hidden = false; return; }
          state.pid = v;
          state.sid = v + "_" + Date.now().toString(36);
          resolve();
        } }, "Start"));
    });

    const agreed = await consent();
    if (!agreed) {
      return screen(h("h2", {}, "Thank you"), h("p", {}, "You chose not to take part. No data has been recorded."),
        h("button", { onclick: () => location.reload() }, "Back to start"));
    }
    const a = await assignVersion();
    state.version = a.v; state.source = a.src; state.order = C.VERSIONS[a.v];

    const blocks = state.order.length;
    await questionnaire("anagraphic", { progress: "Before we start" });

    for (let b = 0; b < blocks; b++) {
      const key = state.order[b], cond = C.CONDITIONS[key];
      const ctx = { condition: key, position: b + 1 };
      const tag = `Drive ${b + 1} of ${blocks}`;
      await message(tag, cond.briefing, "Start", C.CLIP_INTRO);
      for (let i = 0; i < cond.clips.length; i++)
        await playClip(cond.clips[i], cond.clips.length > 1 ? `Clip ${i + 1} of ${cond.clips.length}` : "Watch the drive", tag, ctx);
      // Open recall first, while the clip is fresh; then protocol §9 order: TiA → TLX → SUS → ExpSat (no SSQ: no headset)
      await questionnaire("understanding", { ...ctx, progress: tag });
      await questionnaire("tia", { ...ctx, progress: tag });
      await questionnaire("tlx", { ...ctx, progress: tag });
      if (cond.sus) await questionnaire("sus", { ...ctx, progress: tag });
    }
    await questionnaire("final", { progress: "Last questions" });

    screen(h("h2", {}, "Thank you!"), h("p", {}, "The session is complete. Please tell the experimenter you have finished."),
      h("p", { id: "save-status", class: "save-status" }),
      h("details", {}, h("summary", {}, "Experimenter"),
        h("p", {}, `Participant ${state.pid} · version ${state.version} (${state.source}) · order ${state.order.map(k => C.CONDITIONS[k].code).join(" → ")}`),
        h("div", { class: "row" },
          h("button", { onclick: () => location.reload() }, "New participant"))));
    updateStatus();
  }

  // ---------- theme toggle (light / dark; default follows the OS) ----------
  const tbtn = document.getElementById("theme-toggle");
  if (tbtn) tbtn.addEventListener("click", e => {
    e.currentTarget.blur(); // keep SPACE for take-over, not for re-toggling
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("arhud_theme", next); } catch {}
  });

  run();
})();
