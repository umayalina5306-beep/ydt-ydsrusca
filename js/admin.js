// ============================================================
//  YÖNETİM PANELİ  (yalnızca is_admin = true kullanıcılar)
//  - Kullanıcıları listele, ara
//  - Premium / Ücretsiz yap
//  Güvenlik: Supabase RLS kuralları (admin-rls.sql) gerekli.
// ============================================================
let _adminUsers = [];

async function openAdmin() {
  const gate = document.getElementById("admin-gate");
  const content = document.getElementById("admin-content");
  if (!gate || !content) return;
  if (!currentUser || !(currentProfile && currentProfile.is_admin)) {
    gate.style.display = "block";
    content.style.display = "none";
    return;
  }
  gate.style.display = "none";
  content.style.display = "block";
  await loadAdminUsers();   // genel bakış sayıları için
  adminNav("overview");
}

function adminNav(view) {
  document.querySelectorAll(".admin-view").forEach(v => { v.style.display = "none"; });
  const el = document.getElementById("av-" + view);
  if (el) el.style.display = "block";
  document.querySelectorAll("#page-admin .psb-item").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("asb-" + view);
  if (btn) btn.classList.add("active");
  if (view === "overview") { renderAdminStats(); if (typeof renderVisitsMini === "function") renderVisitsMini(); }
  if (view === "users") loadAdminUsers();
  if (view === "content" && typeof adminContentInit === "function") adminContentInit();
  if (view === "notify" && typeof anTargetChange === "function") anTargetChange();
  if (view === "support" && typeof adminLoadTickets === "function") { adminTicketView = { mode: "list", ticketId: null, userId: null }; adminLoadTickets(); }
  if (view === "mail" && typeof adminLoadMail === "function") adminLoadMail();
  if (view === "questions" && typeof adminQuestionStats === "function") adminQuestionStats();
  if (view === "pquest" && typeof adminPquestInit === "function") adminPquestInit();
  if (view === "videos" && typeof adminVideosInit === "function") adminVideosInit();
  if (view === "visits") { if (typeof renderVisitsFull === "function") renderVisitsFull(); if (typeof renderSeoCheck === "function") renderSeoCheck(); }
  if (view === "settings" && typeof adminSettingsInit === "function") adminSettingsInit();
  if (view === "backup" && typeof renderBackupView === "function") renderBackupView();
  if (view === "errors" && typeof adminLoadErrors === "function") adminLoadErrors();
}

async function loadAdminUsers() {
  const box = document.getElementById("admin-users");
  box.innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("id, email, display_name, plan, is_admin, level, streak_count, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    _adminUsers = data || [];
    renderAdminStats();
    renderAdminUsers(_adminUsers);
  } catch (e) {
    _logDev("Kullanıcılar yüklenemedi:", e);
    box.innerHTML = '<div class="admin-loading">Kullanıcılar yüklenemedi. (admin-rls.sql kurallarını çalıştırdın mı?)</div>';
  }
}

function renderAdminStats() {
  const total = _adminUsers.length;
  const premium = _adminUsers.filter(u => u.plan === "premium").length;
  const admins = _adminUsers.filter(u => u.is_admin).length;
  document.getElementById("admin-stats").innerHTML =
    `<div class="admin-stat"><div class="admin-stat-num">${total}</div><div class="admin-stat-lbl">Kullanıcı</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${premium}</div><div class="admin-stat-lbl">Premium</div></div>` +
    `<div class="admin-stat"><div class="admin-stat-num">${admins}</div><div class="admin-stat-lbl">Yönetici</div></div>`;
}

function renderAdminUsers(list) {
  const box = document.getElementById("admin-users");
  if (!list.length) { box.innerHTML = '<div class="admin-loading">Kullanıcı bulunamadı.</div>'; return; }
  box.innerHTML = list.map(u => {
    const ad = u.display_name || (u.email || "").split("@")[0];
    const isPrem = u.plan === "premium";
    const tarih = u.created_at ? new Date(u.created_at).toLocaleDateString("tr-TR") : "";
    const planBadge = u.is_admin
      ? '<span class="plan-badge plan-admin">Yönetici</span>'
      : `<span class="plan-badge ${isPrem ? "plan-premium" : "plan-free"}">${isPrem ? "Premium" : "Ücretsiz"}</span>`;
    const btn = u.is_admin
      ? ''
      : `<button class="admin-toggle ${isPrem ? "is-prem" : ""}" onclick="togglePremium('${u.id}', '${u.plan}')">${isPrem ? "Ücretsiz yap" : "Premium yap"}</button>`;
    return `<div class="admin-user">
      <div class="admin-user-info">
        <div class="admin-user-name">${ad} ${planBadge}</div>
        <div class="admin-user-meta">${u.email || ""} · ${u.level || "seviye yok"} · ${tarih}</div>
        <div class="admin-user-acts">
          <button class="mail-act" onclick="adminUserDetail('${u.id}')">🔍 Detay</button>
          <button class="mail-act" onclick="adminUserNotify('${u.id}', '${(u.display_name||'').replace(/'/g,'')}')">🔔 Bildirim</button>
          <button class="mail-act" onclick="adminUserResetPw('${u.email||''}')">🔑 Şifre Sıfırlama Maili</button>
          <button class="mail-act" onclick="adminUserChangeEmail('${u.id}', '${u.email||''}')">📧 E-posta Değiştir</button>
        </div>
        <div id="udet-${u.id}" class="udet-box" style="display:none;"></div>
      </div>
      ${btn}
    </div>`;
  }).join("");
}

function filterAdminUsers(q) {
  q = (q || "").trim().toLowerCase();
  if (!q) { renderAdminUsers(_adminUsers); return; }
  const f = _adminUsers.filter(u =>
    (u.email || "").toLowerCase().includes(q) ||
    (u.display_name || "").toLowerCase().includes(q)
  );
  renderAdminUsers(f);
}

async function togglePremium(userId, currentPlan) {
  const yeni = currentPlan === "premium" ? "free" : "premium";
  try {
    const { error } = await sb.from("profiles").update({ plan: yeni }).eq("id", userId);
    if (error) throw error;
    const u = _adminUsers.find(x => x.id === userId);
    if (u) u.plan = yeni;
    renderAdminStats();
    const search = document.getElementById("admin-search");
    filterAdminUsers(search ? search.value : "");
  } catch (e) {
    _logDev("Plan değiştirilemedi:", e);
    if (typeof window.uiAlert === "function") window.uiAlert("Plan değiştirilemedi. Yönetici yetkisi ve SQL kuralları gerekli.", "Hata"); else alert("Plan değiştirilemedi.");
  }
}
