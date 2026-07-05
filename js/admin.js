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
  const _rol = (currentProfile && currentProfile.role) || "user";
  const _girebilir = currentProfile && (currentProfile.is_admin || _rol === "destek");
  if (!currentUser || !_girebilir) {
    gate.style.display = "block";
    content.style.display = "none";
    return;
  }
  gate.style.display = "none";
  content.style.display = "block";
  _applyRoleUI();
  if (_isDestek()) { adminNav("support"); return; }
  await loadAdminUsers();   // genel bakış sayıları için
  adminNav("overview");
}

const DESTEK_VIEWS = ["support", "mail", "assign"];
function _isSuper() { return !!(currentProfile && currentProfile.is_admin); }
function _isDestek() { return !!(currentProfile && !currentProfile.is_admin && currentProfile.role === "destek"); }
function _applyRoleUI() {
  const destek = _isDestek();
  document.querySelectorAll("#page-admin .psb-item").forEach(b => {
    const v = (b.id || "").replace("asb-", "");
    if (destek) b.style.display = DESTEK_VIEWS.includes(v) ? "" : "none";
    else b.style.display = (v === "stafflog" && !_isSuper()) ? "none" : "";
  });
}
function adminNav(view) {
  if (_isDestek() && !DESTEK_VIEWS.includes(view)) view = "support";
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
  if (view === "questions") { if (typeof adminQuestionStats === "function") adminQuestionStats(); if (typeof adminPqlReload === "function") adminPqlReload();  if (typeof plcCfgInit === "function") plcCfgInit(); }
  if (view === "pquest" && typeof adminPquestInit === "function") adminPquestInit();
  if (view === "videos" && typeof adminVideosInit === "function") adminVideosInit();
  if (view === "recs" && typeof adminRecsInit === "function") adminRecsInit();
  if (view === "visits") { if (typeof renderVisitsFull === "function") renderVisitsFull(); if (typeof renderSeoCheck === "function") renderSeoCheck(); }
  if (view === "settings" && typeof adminSettingsInit === "function") adminSettingsInit();
  if (view === "backup" && typeof renderBackupView === "function") renderBackupView();
  if (view === "errors" && typeof adminLoadErrors === "function") adminLoadErrors();
  if (view === "assign" && typeof adminAssignInit === "function") adminAssignInit();
  if (view === "stafflog" && typeof adminStaffLogLoad === "function") adminStaffLogLoad();
}

let _auIstek = 0; // yarış kilidi: yalnız en son isteğin sonucu ekrana yazılır
async function loadAdminUsers() {
  const box = document.getElementById("admin-users");
  box.innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
  const arama = document.getElementById("admin-search");
  if (arama && arama.value) { _logDev("Kullanıcı araması temizlendi (eski değer):", arama.value); arama.value = ""; }
  const benimIstek = ++_auIstek;
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("id, email, display_name, plan, is_admin, role, level, streak_count, created_at, premium_until")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (benimIstek !== _auIstek) { _logDev("Eski kullanıcı isteği yok sayıldı."); return; }
    _adminUsers = data || [];
    _logDev("Kullanıcı listesi yüklendi:", _adminUsers.length, "kişi");
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
  _logDev("Kullanıcı listesi çiziliyor:", (list || []).length, "kişi");
  const box = document.getElementById("admin-users");
  if (!list.length) { box.innerHTML = '<div class="admin-loading">Kullanıcı bulunamadı.</div>'; return; }
  box.innerHTML = list.map(u => {
    const ad = u.display_name || (u.email || "").split("@")[0];
    const isPrem = u.plan === "premium";
    const tarih = u.created_at ? new Date(u.created_at).toLocaleDateString("tr-TR") : "";
    const pUntil = (u.plan === "premium" && u.premium_until) ? " · 👑 " + new Date(u.premium_until).toLocaleDateString("tr-TR") + "'e kadar" : "";
    const ROL_AD = { destek: "🛟 Destek", ogretmen: "👩‍🏫 Öğretmen" };
    const rolBadge = (!u.is_admin && ROL_AD[u.role]) ? ` <span class="plan-badge plan-role">${ROL_AD[u.role]}</span>` : "";
    const planBadge = (u.is_admin
      ? '<span class="plan-badge plan-admin">Yönetici</span>'
      : `<span class="plan-badge ${isPrem ? "plan-premium" : "plan-free"}">${isPrem ? "Premium" : "Ücretsiz"}</span>`) + rolBadge;
    const btn = u.is_admin
      ? ''
      : `<div class="admin-toggle-col">
           <button class="admin-toggle" onclick="adminGiftPremium('${u.id}')">🎁 Premium Tanımla</button>
           ${isPrem ? `<button class="admin-toggle is-prem" onclick="togglePremium('${u.id}', 'premium')">Ücretsiz yap</button>` : ''}
         </div>`;
    return `<div class="admin-user">
      <div class="admin-user-info">
        <div class="admin-user-name">${ad} ${planBadge}</div>
        <div class="admin-user-meta">${u.email || ""} · ${u.level || "seviye yok"} · ${tarih}${pUntil}</div>
        <div class="admin-user-acts">
          <button class="mail-act" onclick="adminUserDetail('${u.id}')">🔍 Detay</button>
          <button class="mail-act" onclick="adminUserNotify('${u.id}', '${(u.display_name||'').replace(/'/g,'')}')">🔔 Bildirim</button>
          <button class="mail-act" onclick="adminUserResetPw('${u.email||''}')">🔑 Şifre Sıfırlama Maili</button>
          <button class="mail-act" onclick="adminUserChangeEmail('${u.id}', '${u.email||''}')">📧 E-posta Değiştir</button>
          ${(_isSuper() && !u.is_admin) ? `<select class="role-select" onchange="adminSetRole('${u.id}', this.value, '${(u.display_name||'').replace(/'/g,'')}')">
            <option value="user" ${(!u.role||u.role==='user')?'selected':''}>Rol: Kullanıcı</option>
            <option value="destek" ${u.role==='destek'?'selected':''}>Rol: Destek</option>
            <option value="ogretmen" ${u.role==='ogretmen'?'selected':''}>Rol: Öğretmen</option>
          </select>` : ''}
        </div>
        <div id="udet-${u.id}" class="udet-box" style="display:none;"></div>
      </div>
      ${btn}
    </div>`;
  }).join("");
}

function filterAdminUsers(q) {
  _logDev("Kullanıcı filtresi tetiklendi:", JSON.stringify(q));
  q = (q || "").trim().toLowerCase();
  if (!q) { renderAdminUsers(_adminUsers); return; }
  const f = _adminUsers.filter(u =>
    (u.email || "").toLowerCase().includes(q) ||
    (u.display_name || "").toLowerCase().includes(q)
  );
  renderAdminUsers(f);
}

async function togglePremium(userId, currentPlan) {
  const isPrem = currentPlan === "premium";
  if (isPrem) {
    if (!(await uiConfirm("Bu kullanıcı ücretsiz plana düşürülsün mü?", "Ücretsiz Yap"))) return;
    try {
      const { error } = await sb.from("profiles").update({ plan: "free", premium_until: null }).eq("id", userId);
      if (error) throw error;
      toast("Kullanıcı ücretsiz plana alındı.");
      loadAdminUsers();
    } catch (e) { uiAlert("İşlem başarısız."); }
    return;
  }
  // Premium yap: otomatik 6 ay (paket sistemi geldiğinde 1/3/6 ay seçenekleri eklenecek)
  const d = new Date(); d.setMonth(d.getMonth() + 6); d.setHours(23, 59, 59, 0);
  if (!(await uiConfirm("Bu kullanıcıya 6 aylık premium tanımlansın mı? (Bitiş: " + d.toLocaleDateString("tr-TR") + " — süre dolunca otomatik olarak ücretsiz plana döner.)", "👑 Premium Yap"))) return;
  try {
    const { error } = await sb.from("profiles").update({ plan: "premium", premium_until: d.toISOString() }).eq("id", userId);
    if (error) throw error;
    toast("👑 6 aylık premium tanımlandı — bitiş: " + d.toLocaleDateString("tr-TR"));
    loadAdminUsers();
  } catch (e) { uiAlert("İşlem başarısız. premium_sure.sql çalıştırıldı mı?"); }
}
