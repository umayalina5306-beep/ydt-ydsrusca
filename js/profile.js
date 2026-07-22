// ============================================================
//  PROFİL SAYFASI — Profil Özeti + Ayarlar (yeni tasarım)
// ============================================================
const AVATAR_SEEDS = [
  "Aneka", "Felix", "Mason", "Luna", "Kai", "Mia", "Leo", "Zoe", "Ezra", "Nova",
  "Ada", "Bruno", "Cleo", "Dora", "Enzo", "Gaia", "Hugo", "Iris", "Jonas", "Kira"
];
let avatarShowAll = false;
function avatarUrl(seed) { return "https://api.dicebear.com/9.x/avataaars/svg?seed=" + encodeURIComponent(seed); }
function _avatarSeed() {
  if (typeof currentProfile !== "undefined" && currentProfile && currentProfile.avatar_seed) return currentProfile.avatar_seed;
  return (typeof localStorage !== "undefined") ? localStorage.getItem("ydt_avatar") : null;
}

function _planBadge(el) {
  if (!el) return;
  if (currentProfile && currentProfile.is_admin) { el.textContent = "Yönetici"; el.className = "plan-badge plan-admin"; }
  else if (currentProfile && currentProfile.plan === "premium") { el.textContent = "Premium"; el.className = "plan-badge plan-premium"; }
  else { el.textContent = "Ücretsiz"; el.className = "plan-badge plan-free"; }
}

// ---- Avatar ----
function applyAvatar() {
  const seed = _avatarSeed();
  const name = (typeof bestName === "function") ? bestName() : ((currentUser && currentUser.email) || "");
  const letter = (name || "?").charAt(0).toUpperCase();
  const level = (typeof currentProfile !== "undefined" && currentProfile && currentProfile.level) ? String(currentProfile.level).toUpperCase() : "";
  const hasLevel = /^(A1|A2|B1|B2|C1)$/.test(level);
  ["profile-initial", "sidebar-avatar", "account-avatar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const inner = seed ? `<img src="${avatarUrl(seed)}" alt="avatar" class="avatar-img">` : letter;
    el.classList.remove("has-lvl-frame", "lvl-A1", "lvl-A2", "lvl-B1", "lvl-B2", "lvl-C1", "lvl-none");
    let badge = "";
    el.classList.add("has-lvl-frame");
    el.classList.add(hasLevel ? ("lvl-" + level) : "lvl-none");
    badge = `<span class="lvl-badge">${hasLevel ? level : "?"}</span>`;
    el.innerHTML = inner + badge;
  });
}

function renderAvatarGrid() {
  const grid = document.getElementById("avatar-grid");
  if (!grid) return;
  const sel = _avatarSeed();
  const list = avatarShowAll ? AVATAR_SEEDS : AVATAR_SEEDS.slice(0, 10);
  grid.innerHTML = list.map(seed =>
    `<button class="avatar-opt ${seed === sel ? "selected" : ""}" onclick="selectAvatar('${seed}')" title="${seed}">
      <img src="${avatarUrl(seed)}" alt="${seed}">
      ${seed === sel ? '<span class="avatar-check">✓</span>' : ""}
    </button>`).join("");
}

async function selectAvatar(seed) {
  try { localStorage.setItem("ydt_avatar", seed); } catch (e) {}
  if (typeof currentProfile !== "undefined" && currentProfile) currentProfile.avatar_seed = seed;
  renderAvatarGrid();
  applyAvatar();
  if (typeof sb !== "undefined" && sb && typeof currentUser !== "undefined" && currentUser) {
    try { await sb.from("profiles").update({ avatar_seed: seed }).eq("id", currentUser.id); }
    catch (e) { /* sessiz: localStorage yedeği var */ }
  }
  if (typeof toast === "function") toast("Avatar seçildi.");
}

function showAllAvatars() {
  avatarShowAll = !avatarShowAll;
  renderAvatarGrid();
}

// ---- Profil ----
async function openProfile() {
  if (!currentUser) { if (typeof openAuth === "function") openAuth("login"); return; }

  const name = (typeof bestName === "function") ? bestName() : (currentUser.email || "");
  const email = currentUser.email || "";

  ["profile-name", "sidebar-name"].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = name; });
  ["profile-email", "sidebar-email"].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = email; });
  _planBadge(document.getElementById("profile-plan"));
  _planBadge(document.getElementById("sidebar-plan"));

  // Premium kartı: premium/admin kullanıcıda gizle
  const prem = document.getElementById("psb-premium");
  if (prem) prem.style.display = (currentProfile && (currentProfile.plan === "premium" || currentProfile.is_admin)) ? "none" : "block";

  // Üyelik tarihi
  const joined = (currentProfile && currentProfile.created_at) || (currentUser && currentUser.created_at);
  const joinedStr = joined ? new Date(joined).toLocaleDateString("tr-TR") : "—";
  const jEl = document.getElementById("profile-joined"); if (jEl) jEl.textContent = joinedStr;

  // Ayarlar form alanları
  const sn = document.getElementById("settings-name"); if (sn) sn.value = name;
  const un = document.getElementById("settings-username"); if (un) un.value = email.split("@")[0];
  const se = document.getElementById("settings-email"); if (se) se.value = email;
  const sj = document.getElementById("settings-joined"); if (sj) sj.value = joinedStr === "—" ? "" : joinedStr;
  const asv = document.getElementById("set-autosave"); if (asv && typeof autoSaveOn === "function") asv.checked = autoSaveOn();

  // Çalışma serisi (aktivite tarihlerinden)
  if (typeof syncTestResultsFromDB === "function") { try { await syncTestResultsFromDB(); } catch (e) {} }
  const streak = (typeof computeStreakFromResults === "function") ? computeStreakFromResults() : 0;
  const longest = (typeof longestStreakFromResults === "function") ? longestStreakFromResults() : streak;
  const stEl = document.getElementById("profile-streak"); if (stEl) stEl.textContent = streak;
  const maxEl = document.getElementById("profile-streak-max"); if (maxEl) maxEl.textContent = longest;
  renderStreakDots(streak);

  // İstatistik kartları (anında)
  const wEl = document.getElementById("profile-words"); if (wEl) wEl.textContent = (typeof savedWords !== "undefined" ? savedWords.size : 0);
  const lEl = document.getElementById("profile-learned"); if (lEl) lEl.textContent = (typeof learnedWords !== "undefined" ? learnedWords.size : 0);
  const tEl = document.getElementById("profile-tests"); if (tEl) tEl.textContent = (typeof getTestResults === "function" ? getTestResults().length : 0);
  const vEl = document.getElementById("profile-videos"); if (vEl) vEl.textContent = 0;

  applyAvatar();
  renderAvatarGrid();
  renderKasaPreview();
  renderBadges();
  if (typeof renderStudyCalendar === "function") renderStudyCalendar();
  if (typeof renderProgressChart === "function") renderProgressChart();
  loadProfileStats();
  profileNav("overview");
}

// Sol menü gezinmesi
function profileNav(view, btn) {
  document.querySelectorAll(".profile-view").forEach(v => v.style.display = "none");
  const target = document.getElementById("pv-" + view);
  if (target) target.style.display = "block";
  if (view === "tests" && typeof renderTestHistory === "function") renderTestHistory();
  if (view === "stats" && typeof renderStatsView === "function") renderStatsView();
  if (view === "analysis" && typeof renderAnalysis === "function") renderAnalysis();
  if (view === "saved" && typeof renderKasaView === "function") renderKasaView("saved");
  if (view === "learned" && typeof renderKasaView === "function") renderKasaView("learned");
  if (view === "overview" && typeof renderStudyCalendar === "function") renderStudyCalendar();
  if (view === "overview" && typeof renderProgressChart === "function") renderProgressChart();
  if (view === "tasks" && typeof renderTasksView === "function") { if (typeof checkTasks === "function") checkTasks(); renderTasksView(); }
  if (view === "support") { if (typeof supportView !== "undefined") supportView = { mode: "list", ticketId: null }; if (typeof renderSupport === "function") renderSupport(); }
  document.querySelectorAll(".psb-item").forEach(b => b.classList.remove("active"));
  const map = { overview: "psb-overview", saved: "psb-saved", learned: "psb-learned", tests: "psb-tests", videos: "psb-videos", stats: "psb-stats", analysis: "psb-analysis", tasks: "psb-tasks", support: "psb-support", settings: "psb-settings" };
  if (btn && btn.classList) btn.classList.add("active");
  else { const el = document.getElementById(map[view]); if (el) el.classList.add("active"); }
  window.scrollTo(0, 0);
}

// Ayarlar sekmeleri
function settingsTab(key, btn) {
  document.querySelectorAll(".st-tab").forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const acc = document.getElementById("stab-account");
  const oth = document.getElementById("stab-other");
  if (key === "account") { if (acc) acc.style.display = "block"; if (oth) oth.style.display = "none"; }
  else {
    if (acc) acc.style.display = "none";
    if (oth) oth.style.display = "block";
    if (key === "Güvenlik" && typeof guvenlikHTML === "function") oth.innerHTML = guvenlikHTML();
    else if (key === "Çalışma Ayarları" && typeof calismaAyarlariHTML === "function") oth.innerHTML = calismaAyarlariHTML();
    else if (key === "Üyelik Yönetimi" && typeof uyelikHTML === "function") oth.innerHTML = uyelikHTML();
    else if (key === "Bildirimler" && typeof bildirimAyarlariHTML === "function") oth.innerHTML = bildirimAyarlariHTML();
    else if (key === "Veri Yönetimi" && typeof veriYonetimiHTML === "function") oth.innerHTML = veriYonetimiHTML();
    else if (key === "Site Ayarları" && typeof siteAyarlariHTML === "function") { oth.innerHTML = siteAyarlariHTML(); if (typeof siteAyarlariInit === "function") setTimeout(siteAyarlariInit, 50); }
    else oth.innerHTML = '<div class="profile-panel"><div class="profile-empty">' + key + ' bölümü yakında eklenecek.</div></div>';
  }
}

/* 🎛️ Site Ayarları sekmesi (ses + video izleme tercihleri) */
function siteAyarlariHTML() {
  return `
  <div class="profile-panel">
    <div class="panel-title">🔊 Seslendirme</div>
    <div class="pq-row2" style="align-items:center;">
      <span style="font-size:.86rem;">Seslendirme sesi:</span>
      <select id="set-voice" class="pq-input pq-level" onchange="localStorage.setItem('ydt_voice', this.value); toast('Ses tercihi kaydedildi.');">
        <option value="auto">Otomatik (en doğal)</option>
        <option value="female">Kadın</option>
        <option value="male">Erkek</option>
      </select>
    </div>
  </div>
  <div class="profile-panel">
    <div class="panel-title">🎬 Video İzleme Tercihleri</div>
    <div class="pq-row2" style="align-items:center;margin-bottom:12px;">
      <span style="font-size:.86rem;">İnteraktif kartlar:</span>
      <select id="set-card-mode" class="pq-input pq-level" onchange="localStorage.setItem('ydt_card_mode', this.value); toast('Kaydedildi.');">
        <option value="pause">Anında duraklat</option>
        <option value="collect">Yanda biriktir (scroll listesi)</option>
      </select>
    </div>
    <label class="cw-check" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="set-strict-mode" onchange="localStorage.setItem('ydt_strict_mode', this.checked?'1':'0'); toast('Kaydedildi.');">
      <span>🚧 Sıkı hoca modu — kontrol noktası soruları doğru cevaplanmadan video ilerlemez</span>
    </label>
  </div>`;
}
function siteAyarlariInit() {
  const v = document.getElementById('set-voice'); if (v) v.value = localStorage.getItem('ydt_voice') || 'auto';
  const cm = document.getElementById('set-card-mode'); if (cm) cm.value = localStorage.getItem('ydt_card_mode') || 'pause';
  const st = document.getElementById('set-strict-mode'); if (st) st.checked = localStorage.getItem('ydt_strict_mode') === '1';
}

// Profilden Kelime Kasası'na git (saved / learned)
function profileGoKasa(status) {
  if (typeof showPage === "function") showPage("words");
  if (typeof showBank === "function") showBank();
  if (status === "learned" && typeof renderBank === "function") {
    bankStatus = "learned"; bankPage = 1;
    const tabs = document.querySelectorAll("#bank-status-tabs .bank-tab");
    tabs.forEach((b, i) => b.classList.toggle("active", i === 1));
    renderBank();
  }
}

function renderStreakDots(streak) {
  const box = document.getElementById("streak-dots");
  if (!box) return;
  let html = "";
  for (let i = 0; i < 7; i++) html += `<span class="streak-dot ${i < streak ? "on" : ""}"></span>`;
  box.innerHTML = html;
}

// Kelime Kasam önizleme (ilk 5)
function renderKasaPreview() {
  const box = document.getElementById("profile-kasa-preview");
  const allBtn = document.getElementById("profile-kasa-all");
  if (!box) return;
  const set = (typeof savedWords !== "undefined") ? savedWords : new Set();
  if (!set.size) {
    box.innerHTML = `<div class="profile-empty">Henüz kayıtlı kelime yok. Kelimeler sayfasından ☆ ile kaydet.</div>`;
    if (allBtn) allBtn.style.display = "none";
    return;
  }
  const items = [];
  set.forEach(ru => { const w = (typeof wordsByRu !== "undefined" && wordsByRu[ru]) || { ru: ru, tr: "", level: "" }; items.push(w); });
  items.sort((a, b) => (a.ru || "").localeCompare(b.ru || "", "ru"));
  const preview = items.slice(0, 5);
  box.innerHTML = preview.map(w => `
    <div class="kasa-prow">
      <span class="kp-ru">${w.ru}</span>
      <span class="kp-tr">${w.tr || ""}</span>
      <span class="kp-lvl">${w.level || ""}</span>
      <span class="kp-star">★</span>
      <button class="kp-speak" onclick="speak('${(w.ru || "").replace(/'/g, "\\'")}')">🔊</button>
    </div>`).join("");
  if (allBtn) { allBtn.style.display = "block"; allBtn.textContent = `Tümünü Gör (${set.size} kelime) →`; }
}

async function loadProfileStats() {
  if (!sb || !currentUser) return;
  try {
    const uid = currentUser.id;
    const [w, t] = await Promise.all([
      sb.from("saved_words").select("id", { count: "exact", head: true }).eq("user_id", uid),
      sb.from("test_results").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    const localTests = (typeof getTestResults === "function") ? getTestResults().length : 0;
    const localSaved = (typeof savedWords !== "undefined") ? savedWords.size : 0;
    if (w && typeof w.count === "number") { const e1 = document.getElementById("profile-words"); if (e1) e1.textContent = Math.max(w.count, localSaved); }
    if (t && typeof t.count === "number") { const e2 = document.getElementById("profile-tests"); if (e2) e2.textContent = Math.max(t.count, localTests); }
    if (typeof renderBadges === "function") renderBadges();
  } catch (e) { _logDev("Profil istatistikleri yüklenemedi:", e); }
}

// Ayarlar: görünen adı kaydet (Bilgileri Kaydet)
async function saveProfileName() {
  const el = document.getElementById("settings-name");
  if (!el) return;
  const newName = (el.value || "").trim();
  if (!newName) { if (typeof toast === "function") toast("Lütfen bir ad gir."); return; }
  if (!sb || !currentUser) return;
  try {
    const { error } = await sb.from("profiles").update({ display_name: newName }).eq("id", currentUser.id);
    if (error) throw error;
    if (currentProfile) currentProfile.display_name = newName;
    ["profile-name", "sidebar-name"].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = newName; });
    const n3 = document.getElementById("account-name"); if (n3) n3.textContent = newName;
    applyAvatar();
    if (typeof toast === "function") toast("Bilgilerin kaydedildi.");
  } catch (e) {
    _logDev("Ad güncellenemedi:", e);
    if (typeof toast === "function") toast("Kaydedilemedi. Lütfen tekrar dene.");
  }
}

// ---- Rozetler ----
const BADGES = [
  { e: "📌", t: "İlk Kelime", d: "1 kelime kaydet", chk: s => s.saved >= 1 },
  { e: "📚", t: "Koleksiyoncu", d: "10 kelime kaydet", chk: s => s.saved >= 10 },
  { e: "🏆", t: "Kelime Avcısı", d: "50 kelime kaydet", chk: s => s.saved >= 50 },
  { e: "💎", t: "Kelime Ustası", d: "100 kelime kaydet", chk: s => s.saved >= 100 },
  { e: "✅", t: "İlk Öğrenme", d: "1 kelime öğren", chk: s => s.learned >= 1 },
  { e: "🎯", t: "Azimli", d: "25 kelime öğren", chk: s => s.learned >= 25 },
  { e: "🌟", t: "Bilge", d: "50 kelime öğren", chk: s => s.learned >= 50 },
  { e: "🧠", t: "Test Çözücü", d: "1 test çöz", chk: s => s.tests >= 1 },
  { e: "📝", t: "Sınav Kurdu", d: "10 test çöz", chk: s => s.tests >= 10 },
  { e: "🎓", t: "Disiplinli", d: "30 test çöz", chk: s => s.tests >= 30 },
  { e: "💯", t: "Kusursuz", d: "Bir testte %100 yap", chk: s => s.bestPct >= 100 },
  { e: "🔥", t: "İstikrarlı", d: "7 gün üst üste çalış", chk: s => s.streak >= 7 },
  { e: "⚡", t: "Azim Şampiyonu", d: "30 gün seri yap", chk: s => s.streak >= 30 },
  { e: "👑", t: "Kelime Kralı", d: "250 kelime kaydet", chk: s => s.saved >= 250 },
  { e: "🧩", t: "Hafıza Uzmanı", d: "100 kelime öğren", chk: s => s.learned >= 100 },
  { e: "🏅", t: "Test Şampiyonu", d: "50 test çöz", chk: s => s.tests >= 50 },
  { e: "🗓️", t: "Kararlı", d: "14 gün üst üste çalış", chk: s => s.streak >= 14 },
  { e: "🔁", t: "Günlük Tekrarcı", d: "7 günlük tekrar yap", chk: s => s.dailyReviews >= 7 },
  { e: "🚀", t: "Maratoncu", d: "100 günlük tekrar yap", chk: s => s.dailyReviews >= 100 }
];

function _getEarnedBadges() { try { return JSON.parse(localStorage.getItem("ydt_badges_earned") || "[]"); } catch (e) { return []; } }
function _saveEarnedBadges(arr) { try { localStorage.setItem("ydt_badges_earned", JSON.stringify(arr)); } catch (e) {} }
function renderBadges() {
  const box = document.getElementById("profile-badges");
  if (!box) return;
  const tEl = document.getElementById("profile-tests");
  const res = (typeof getTestResults === "function") ? getTestResults() : [];
  const bestPct = res.reduce((m, r) => Math.max(m, r.total ? Math.round(r.score / r.total * 100) : 0), 0);
  const streak = (typeof computeStreakFromResults === "function") ? computeStreakFromResults() : 0;
  const dailyReviews = parseInt((typeof localStorage !== "undefined" && localStorage.getItem("ydt_daily_reviews")) || "0", 10) || 0;
  const stats = {
    saved: (typeof savedWords !== "undefined" ? savedWords.size : 0),
    learned: (typeof learnedWords !== "undefined" ? learnedWords.size : 0),
    tests: tEl ? (parseInt(tEl.textContent, 10) || 0) : 0,
    bestPct: bestPct,
    streak: streak,
    dailyReviews: dailyReviews
  };
  // Kazanılanlar = yerel kayıt + HESAPTAKİ (DB) kayıt birleşimi -> cihazlar arası tutarlı
  const local = _getEarnedBadges();
  const fromDb = (typeof currentProfile !== "undefined" && currentProfile && Array.isArray(currentProfile.badges)) ? currentProfile.badges : [];
  const earned = [...new Set([].concat(local, fromDb))];
  let changed = false;
  const newly = [];
  const html = BADGES.map(b => {
    let on = b.chk(stats);
    if (on && earned.indexOf(b.t) === -1) { earned.push(b.t); changed = true; newly.push(b); }
    if (earned.indexOf(b.t) !== -1) on = true; // kazanılan rozet kalıcı (tüm cihazlarda)
    return `<div class="badge ${on ? "on" : "off"}"><div class="badge-ic">${b.e}</div><div class="badge-t">${b.t}</div><div class="badge-d">${b.d}</div></div>`;
  }).join("");
  const localMissing = earned.some(t => local.indexOf(t) === -1);
  if (changed || localMissing) _saveEarnedBadges(earned);
  if (changed) {
    // Hesaba yaz -> başka cihazda tekrar "yeni" sanılmaz, bildirim tekrarlanmaz
    try {
      if (typeof sb !== "undefined" && sb && typeof currentUser !== "undefined" && currentUser) {
        sb.from("profiles").update({ badges: earned }).eq("id", currentUser.id).then(function(){}, function(){});
        if (currentProfile) currentProfile.badges = earned;
      }
    } catch (e) {}
    if (newly.length && newly.length <= 5 && typeof createNotification === "function" && (typeof notifPref !== "function" || notifPref("badges"))) newly.forEach(b => createNotification("🏅 Yeni rozet: " + b.t, b.d, "success"));
  }
  box.innerHTML = html;
}

/* ============================================================
   ANALİZ & ÖNERİLER — kullanıcının verisinden dürüst çıkarımlar
   ============================================================ */
async function renderAnalysis() {
  const box = document.getElementById("analysis-body"); if (!box) return;
  box.innerHTML = '<div class="profile-empty">Analiz hazırlanıyor...</div>';
  try {
    // Test geçmişi (yerel) — en yeni başa
    let tests = (typeof getTestResults === "function") ? getTestResults().slice() : [];
    if (tests.length > 1 && tests[0].date && tests[tests.length - 1].date &&
        new Date(tests[0].date) < new Date(tests[tests.length - 1].date)) tests.reverse();
    const pctOf = t => (t && t.total) ? Math.round((t.score / t.total) * 100) : 0;
    const avgOf = arr => arr.length ? Math.round(arr.reduce((a, t) => a + pctOf(t), 0) / arr.length) : null;
    const last5 = avgOf(tests.slice(0, 5)), prev5 = avgOf(tests.slice(5, 10));

    // Son 7 gün aktivite (hesaptan)
    let act7 = {};
    try {
      const { data } = await sb.from("activity_log").select("kind, amount")
        .eq("user_id", currentUser.id)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000);
      (data || []).forEach(a => { act7[a.kind] = (act7[a.kind] || 0) + (a.amount || 0); });
    } catch (e) {}

    // Seviye geçmişi (sunucudan)
    let levels = [];
    try {
      const { data } = await sb.from("placement_results").select("new_level, pct, created_at")
        .eq("user_id", currentUser.id).order("created_at").limit(50);
      levels = data || [];
    } catch (e) {}

    const level = (currentProfile && currentProfile.level) || null;
    const streak = (currentProfile && currentProfile.streak_count) || 0;
    const savedN = (typeof savedWords !== "undefined" && savedWords) ? (savedWords.length || savedWords.size || 0) : 0;

    // ---- Durum kartı ----
    const stats = `<div class="ana-card"><div class="ana-h">📸 Anlık Durum</div><div class="ana-row">
      <span class="ana-stat">🎚️ Seviye: <b>${level || "belirlenmedi"}</b></span>
      <span class="ana-stat">🔥 Seri: <b>${streak} gün</b></span>
      <span class="ana-stat">📝 Kayıtlı test: <b>${tests.length}</b></span>
      ${last5 !== null ? `<span class="ana-stat">Son 5 test ort.: <b>%${last5}</b></span>` : ""}
      <span class="ana-stat">📦 Kasadaki kelime: <b>${savedN}</b></span>
    </div></div>`;

    // ---- Trend kartı ----
    let trendHtml = "";
    if (last5 !== null && prev5 !== null) {
      const d = last5 - prev5;
      const yon = d > 3 ? "📈 Yükselişte" : (d < -3 ? "📉 Düşüşte" : "➡️ Sabit");
      trendHtml = `<div class="ana-card"><div class="ana-h">${yon}</div>
        Son 5 testinin ortalaması <b>%${last5}</b>, önceki 5 testin <b>%${prev5}</b> idi (${d >= 0 ? "+" : ""}${d} puan).</div>`;
    }

    // ---- Seviye yolculuğu ----
    let lvlHtml = "";
    if (levels.length) {
      lvlHtml = `<div class="ana-card"><div class="ana-h">🎚️ Seviye Yolculuğu</div>` +
        levels.map(l => `<span class="ana-chip">${new Date(l.created_at).toLocaleDateString("tr-TR")} → <b>${_escHtml(l.new_level || "")}</b> (%${l.pct ?? "-"})</span>`).join(" ") + `</div>`;
    }

    // ---- 7 gün aktivite ----
    const AK = { testsDone: "📝 Test", questions: "❓ Soru", wordsLearned: "🧠 Öğrenilen", wordsSaved: "📦 Kaydedilen", dailyReviews: "🔁 Tekrar", pomodoros: "🍅 Pomodoro", videos: "🎬 Video", focusMin: "⏱️ Odak dk" };
    const actKeys = Object.keys(act7);
    const actHtml = `<div class="ana-card"><div class="ana-h">🗓️ Son 7 Gün</div>` +
      (actKeys.length ? `<div class="ana-row">${actKeys.map(k => `<span class="ana-stat">${AK[k] || k}: <b>${act7[k]}</b></span>`).join("")}</div>`
                      : `<div class="err-meta">Bu hafta kayıtlı aktivite yok — bugün küçük bir adımla başlayabilirsin.</div>`) + `</div>`;

    // ---- Konu Analizi (kategori & seviye bazlı zayıflıklar) ----
    let topicHtml = "";
    try {
      const ts = (typeof _topicStats === "function") ? _topicStats() : {};
      const CATL = { isim: "İsimler", fiil: "Fiiller", "sıfat": "Sıfatlar", zarf: "Zarflar", zamir: "Zamirler", edat: "Edatlar", "bağlaç": "Bağlaçlar" };
      const rows = Object.keys(ts)
        .map(k => ({ k, t: ts[k].t, w: ts[k].w, pct: Math.round(ts[k].w / ts[k].t * 100) }))
        .filter(r => r.t >= 5)
        .sort((a, b) => b.pct - a.pct);
      const cats = rows.filter(r => r.k.startsWith("cat:")).slice(0, 4);
      const lvls = rows.filter(r => r.k.startsWith("lvl:")).slice(0, 3);
      const bar = r => {
        const name = r.k.startsWith("cat:") ? (CATL[r.k.slice(4)] || r.k.slice(4)) : (r.k.slice(4) + " seviyesi");
        const cls = r.pct >= 40 ? "no" : (r.pct >= 25 ? "" : "ok");
        return `<div class="ana-topic"><span class="ana-topic-name">${name}</span>
          <div class="ana-topic-track"><div class="ana-topic-fill ${cls}" style="width:${Math.min(100, r.pct)}%"></div></div>
          <span class="ana-topic-val">%${r.pct} hata <i>(${r.w}/${r.t})</i></span></div>`;
      };
      if (rows.length) {
        topicHtml = `<div class="ana-card"><div class="ana-h">🔬 Konu Analizi <span class="err-meta" style="font-weight:400;">(çözdüğün kelime sorularından)</span></div>
          ${cats.length ? `<div class="ana-sub">Kelime türlerine göre hata oranın:</div>` + cats.map(bar).join("") : ""}
          ${lvls.length ? `<div class="ana-sub" style="margin-top:8px;">Seviyelere göre:</div>` + lvls.map(bar).join("") : ""}
        </div>`;
      } else {
        topicHtml = `<div class="ana-card"><div class="ana-h">🔬 Konu Analizi</div><div class="err-meta">Veri birikiyor — birkaç test çözünce hangi kelime türlerinde (isim/fiil/edat...) ve seviyelerde zorlandığını burada göreceksin.</div></div>`;
      }
      // en zayıf konuyu önerilere taşı
      if (cats.length && cats[0].pct >= 30) {
        var _weakCat = CATL[cats[0].k.slice(4)] || cats[0].k.slice(4);
        var _weakCatKey = cats[0].k.slice(4);
      }
    } catch (e) {}

    // ---- Koç mesajı (verilerden sentezlenen kişisel özet) ----
    let coachHtml = "";
    try {
      const ad = (currentProfile && currentProfile.display_name) ? currentProfile.display_name.split(" ")[0] : "";
      const parts = [];
      parts.push(ad ? `Merhaba ${_escHtml(ad)}! 👋` : "Merhaba! 👋");
      if (streak >= 3) parts.push(`${streak} günlük serin harika — zinciri kırma.`);
      else if (streak === 0) parts.push("Bugün küçük bir çalışmayla yeni bir seri başlatmanın tam günü.");
      if (last5 !== null && prev5 !== null) {
        const d = last5 - prev5;
        if (d > 3) parts.push(`Test ortalaman %${prev5}'ten %${last5}'e çıktı; emek karşılığını veriyor. 📈`);
        else if (d < -3) parts.push(`Son testlerde küçük bir düşüş var (%${prev5}→%${last5}); yeni konu yerine birkaç gün tekrara ağırlık ver.`);
        else parts.push(`Ortalaman %${last5} civarında istikrarlı gidiyor.`);
      } else if (last5 !== null) parts.push(`Test ortalaman şu an %${last5}.`);
      if (typeof _weakCat !== "undefined") parts.push(`Verilerine göre en çok <b>${_weakCat}</b> konusunda zorlanıyorsun — bu haftanın odağı o olsun.`);
      if ((act7.dailyReviews || 0) === 0) parts.push("Günlük tekrar bu hafta hiç yapılmamış; 10 dakikalık tekrar bile kalıcılığı ikiye katlar.");
      coachHtml = `<div class="ana-card ana-coach"><div class="ana-h">🧑‍🏫 Koçun Diyor Ki</div><p class="ana-coach-p">${parts.join(" ")}</p></div>`;
    } catch (e) {}

    // ---- Öneriler (kural tabanlı, dürüst) ----
    const recs = [];
    if (!level) recs.push({ t: "🎚️ Önce seviyeni belirle", d: "Sana doğru içerik önerebilmemiz için seviye tespit sınavına gir.", b: "Sınava Gir", fn: "showPage('placement')" });
    if ((act7.dailyReviews || 0) === 0) recs.push({ t: "🔁 Günlük tekrarı aksatma", d: "Bu hafta hiç günlük tekrar yapılmamış; kalıcı öğrenmenin en güçlü aracı bu.", b: "Günlük Tekrara Git", fn: "showPage('review')" });
    if (last5 !== null && last5 < 60) recs.push({ t: "🧠 Temeli sağlamlaştır", d: `Son testlerin ortalaması %${last5}. Yanlış yaptığın kelimeleri kasana ekleyip tekrar etmen puanı hızlı yükseltir.`, b: "Kelime Kasası", fn: "profileNav('saved')" });
    if (last5 !== null && prev5 !== null && (last5 - prev5) < -3) recs.push({ t: "📉 Küçük bir mola sinyali", d: "Son testlerde düşüş var. Yeni kelime eklemek yerine 2-3 gün sadece tekrar yapmak toparlar.", b: "Teste Başla", fn: "showPage('quiz')" });
    if (typeof _weakCatKey !== "undefined") recs.push({ t: "🔬 Zayıf konuya odaklan: " + _weakCat, d: "Kelime sorularındaki hata oranın en çok bu türde. Test kurucudan yalnız bu kategoriyle 15 soruluk test çöz.", b: "Test Kur", fn: "showPage('quiz')" });
    if ((act7.videos || 0) === 0) recs.push({ t: "🎬 Video dersle pekiştir", d: "Bu hafta hiç video izlenmemiş; konu anlatımı + kelime birlikte daha kalıcı.", b: "Videolara Git", fn: "showPage('videos')" });
    if ((act7.wordsLearned || 0) < 20) recs.push({ t: "🎯 Haftalık kelime hedefi", d: `Bu hafta ${act7.wordsLearned || 0} kelime öğrenildi. Hedefi 20+ yapmak YDS için ideal tempo.`, b: "Kelimelere Git", fn: "showPage('words')" });
    if (!recs.length) recs.push({ t: "🏆 Harika gidiyorsun!", d: "Tüm göstergeler yolunda. Kendini gerçek sınav koşullarında dene.", b: "📝 Deneme Sınavı", fn: "startMockExam()" });
    const recHtml = `<div class="ana-card"><div class="ana-h">💡 Sana Özel Öneriler</div>` +
      recs.slice(0, 4).map(r => `<div class="ana-rec"><b>${r.t}</b><div class="err-meta">${r.d}</div><button class="mail-act" onclick="${r.fn}">${r.b} →</button></div>`).join("") + `</div>`;

    box.innerHTML = coachHtml + stats + trendHtml + topicHtml + recHtml + actHtml + lvlHtml;
  } catch (e) {
    box.innerHTML = '<div class="profile-empty">Analiz şu an hazırlanamadı.</div>';
  }
}
