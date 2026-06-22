// ============================================================
//  PROFİL SAYFASI (kullanıcının kendi verileri)
// ============================================================
async function openProfile() {
  if (!currentUser) { openAuth("login"); return; }

  const name = (typeof bestName === "function") ? bestName() : (currentUser.email || "");
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-email").textContent = currentUser.email || "";
  document.getElementById("profile-initial").textContent = (name || "?").charAt(0).toUpperCase();

  const badge = document.getElementById("profile-plan");
  if (currentProfile && currentProfile.is_admin) { badge.textContent = "Yönetici"; badge.className = "plan-badge plan-admin"; }
  else if (currentProfile && currentProfile.plan === "premium") { badge.textContent = "Premium"; badge.className = "plan-badge plan-premium"; }
  else { badge.textContent = "Ücretsiz"; badge.className = "plan-badge plan-free"; }

  document.getElementById("profile-level").textContent = (currentProfile && currentProfile.level) || "—";
  document.getElementById("profile-streak").textContent = (currentProfile && currentProfile.streak_count) || 0;

  loadProfileStats();
  loadProfileActivity();
}

async function loadProfileStats() {
  if (!sb || !currentUser) return;
  try {
    const uid = currentUser.id;
    const [w, t] = await Promise.all([
      sb.from("saved_words").select("id", { count: "exact", head: true }).eq("user_id", uid),
      sb.from("test_results").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    document.getElementById("profile-words").textContent = (w && w.count) || 0;
    document.getElementById("profile-tests").textContent = (t && t.count) || 0;
  } catch (e) { console.error("Profil istatistikleri yüklenemedi:", e); }
}

async function loadProfileActivity() {
  const box = document.getElementById("profile-activity");
  if (!sb || !currentUser) { box.innerHTML = ""; return; }
  try {
    const { data, error } = await sb
      .from("activity_log")
      .select("type, ref, created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!data || !data.length) {
      box.innerHTML = '<div class="profile-empty">Henüz etkinlik yok. Kelime öğrenip test çözdükçe burada görünecek.</div>';
      return;
    }
    const labels = { word_learned: "📖 Kelime öğrenildi", video_watched: "🎬 Video izlendi", test_completed: "✅ Test çözüldü", study_session: "⏱️ Çalışma" };
    box.innerHTML = data.map(a =>
      `<div class="profile-act"><span>${labels[a.type] || a.type}${a.ref ? " · " + a.ref : ""}</span><span class="profile-act-date">${new Date(a.created_at).toLocaleDateString("tr-TR")}</span></div>`
    ).join("");
  } catch (e) {
    console.error("Etkinlik yüklenemedi:", e);
    box.innerHTML = '<div class="profile-empty">Etkinlik yüklenemedi.</div>';
  }
}
