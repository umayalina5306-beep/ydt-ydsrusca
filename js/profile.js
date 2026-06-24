// ============================================================
//  PROFİL SAYFASI — Profil Özeti (yeni tasarım)
// ============================================================
async function openProfile() {
  if (!currentUser) { if (typeof openAuth === "function") openAuth("login"); return; }

  const name = (typeof bestName === "function") ? bestName() : (currentUser.email || "");
  const nameEl = document.getElementById("profile-name");
  if (nameEl) nameEl.textContent = name;
  const emailEl = document.getElementById("profile-email");
  if (emailEl) emailEl.textContent = currentUser.email || "";
  const initEl = document.getElementById("profile-initial");
  if (initEl) initEl.textContent = (name || "?").charAt(0).toUpperCase();

  // Plan rozeti
  const badge = document.getElementById("profile-plan");
  if (badge) {
    if (currentProfile && currentProfile.is_admin) { badge.textContent = "Yönetici"; badge.className = "plan-badge plan-admin"; }
    else if (currentProfile && currentProfile.plan === "premium") { badge.textContent = "Premium"; badge.className = "plan-badge plan-premium"; }
    else { badge.textContent = "Ücretsiz"; badge.className = "plan-badge plan-free"; }
  }

  // Üyelik tarihi
  const joined = (currentProfile && currentProfile.created_at) || (currentUser && currentUser.created_at);
  const jEl = document.getElementById("profile-joined");
  if (jEl) jEl.textContent = joined ? new Date(joined).toLocaleDateString("tr-TR") : "—";

  // Çalışma serisi
  const streak = (currentProfile && currentProfile.streak_count) || 0;
  const stEl = document.getElementById("profile-streak"); if (stEl) stEl.textContent = streak;
  const maxEl = document.getElementById("profile-streak-max"); if (maxEl) maxEl.textContent = streak;
  renderStreakDots(streak);

  // Ayarlar adı
  const sn = document.getElementById("settings-name"); if (sn) sn.value = name;

  // İstatistikler (anında: kasa setlerinden; sonra DB ile güncellenir)
  const wEl = document.getElementById("profile-words");
  if (wEl) wEl.textContent = (typeof savedWords !== "undefined" ? savedWords.size : 0);
  const lEl = document.getElementById("profile-learned");
  if (lEl) lEl.textContent = (typeof learnedWords !== "undefined" ? learnedWords.size : 0);
  const tEl = document.getElementById("profile-tests"); if (tEl) tEl.textContent = 0;
  const vEl = document.getElementById("profile-videos"); if (vEl) vEl.textContent = 0;

  renderKasaPreview();
  loadProfileStats();
  profileNav("overview");
}

// Sol menü gezinmesi
function profileNav(view, btn) {
  document.querySelectorAll(".profile-view").forEach(v => v.style.display = "none");
  const target = document.getElementById("pv-" + view);
  if (target) target.style.display = "block";
  document.querySelectorAll(".psb-item").forEach(b => b.classList.remove("active"));
  const map = { overview: "psb-overview", tests: "psb-tests", videos: "psb-videos", settings: "psb-settings" };
  if (btn && btn.classList) btn.classList.add("active");
  else { const el = document.getElementById(map[view]); if (el) el.classList.add("active"); }
  window.scrollTo(0, 0);
}

// Profilden Kelime Kasası'na git (saved / learned sekmesi)
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

// Kelime Kasam önizleme tablosu (ilk 5 kayıtlı kelime)
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
    if (w && typeof w.count === "number") { const e1 = document.getElementById("profile-words"); if (e1) e1.textContent = w.count; }
    if (t && typeof t.count === "number") { const e2 = document.getElementById("profile-tests"); if (e2) e2.textContent = t.count; }
  } catch (e) { console.error("Profil istatistikleri yüklenemedi:", e); }
}

// Ayarlar: görünen adı kaydet
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
    const n1 = document.getElementById("profile-name"); if (n1) n1.textContent = newName;
    const n2 = document.getElementById("profile-initial"); if (n2) n2.textContent = newName.charAt(0).toUpperCase();
    const n3 = document.getElementById("account-name"); if (n3) n3.textContent = newName;
    if (typeof toast === "function") toast("Adın güncellendi.");
  } catch (e) {
    console.error("Ad güncellenemedi:", e);
    if (typeof toast === "function") toast("Ad güncellenemedi. Lütfen tekrar dene.");
  }
}
