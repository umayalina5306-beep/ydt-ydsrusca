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
  ["profile-initial", "sidebar-avatar", "account-avatar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (seed) el.innerHTML = `<img src="${avatarUrl(seed)}" alt="avatar" class="avatar-img">`;
    else { el.textContent = letter; el.innerHTML = letter; }
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
  if (view === "saved" && typeof renderKasaView === "function") renderKasaView("saved");
  if (view === "learned" && typeof renderKasaView === "function") renderKasaView("learned");
  if (view === "overview" && typeof renderStudyCalendar === "function") renderStudyCalendar();
  if (view === "overview" && typeof renderProgressChart === "function") renderProgressChart();
  document.querySelectorAll(".psb-item").forEach(b => b.classList.remove("active"));
  const map = { overview: "psb-overview", saved: "psb-saved", learned: "psb-learned", tests: "psb-tests", videos: "psb-videos", stats: "psb-stats", settings: "psb-settings" };
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
    if (key === "Veri Yönetimi" && typeof veriYonetimiHTML === "function") {
      oth.innerHTML = veriYonetimiHTML();
    } else {
      oth.innerHTML = '<div class="profile-panel"><div class="profile-empty">' + key + ' bölümü yakında eklenecek.</div></div>';
    }
  }
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
  } catch (e) { console.error("Profil istatistikleri yüklenemedi:", e); }
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
    console.error("Ad güncellenemedi:", e);
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
  const earned = _getEarnedBadges();
  let changed = false;
  const html = BADGES.map(b => {
    let on = b.chk(stats);
    if (on && earned.indexOf(b.t) === -1) { earned.push(b.t); changed = true; }
    if (earned.indexOf(b.t) !== -1) on = true; // kazanılan rozet kalıcı
    return `<div class="badge ${on ? "on" : "off"}"><div class="badge-ic">${b.e}</div><div class="badge-t">${b.t}</div><div class="badge-d">${b.d}</div></div>`;
  }).join("");
  if (changed) _saveEarnedBadges(earned);
  box.innerHTML = html;
}
