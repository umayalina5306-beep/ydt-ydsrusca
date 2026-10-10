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
  if (view === "support" && typeof loadTicketTemplates === "function" && _tkTpls === null) loadTicketTemplates();
  if (view === "mail" && typeof adminLoadMail === "function") adminLoadMail();
  if (view === "questions") { if (typeof adminQuestionStats === "function") adminQuestionStats(); if (typeof adminPqlReload === "function") adminPqlReload();  if (typeof plcCfgInit === "function") plcCfgInit(); }
  if (view === "pquest" && typeof adminPquestInit === "function") adminPquestInit();
  if (view === "videos" && typeof adminVideosInit === "function") adminVideosInit();
  if (view === "recs" && typeof adminRecsInit === "function") adminRecsInit();
  if (view === "icerik" && typeof icInit === "function") icInit();
  if (view === "visits") { if (typeof renderVisitsFull === "function") renderVisitsFull(); if (typeof renderSeoCheck === "function") renderSeoCheck(); }
  if (view === "settings" && typeof adminSettingsInit === "function") adminSettingsInit();
  if (view === "settings" && typeof adminLoadExamDates === "function") adminLoadExamDates();
  if (view === "kurumlar" && typeof adminKurumLoad === "function") adminKurumLoad();
  if (view === "visits" && typeof adminGscShowLast === "function") adminGscShowLast();
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
    const ROL_AD = { destek: "🛟 Destek", ogretmen: "👩‍🏫 Öğretmen", kurum: "🏫 Kurum Admin" };
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
          <button class="mail-act" onclick="tkResendVerify('${u.email||''}')">✉️ Onay Maili Gönder</button>
          <button class="mail-act" onclick="adminUserChangeEmail('${u.id}', '${u.email||''}')">📧 E-posta Değiştir</button>
          ${(_isSuper() && !u.is_admin) ? `<select class="role-select" onchange="adminSetRole('${u.id}', this.value, '${(u.display_name||'').replace(/'/g,'')}')">
            <option value="user" ${(!u.role||u.role==='user')?'selected':''}>Rol: Kullanıcı</option>
            <option value="destek" ${u.role==='destek'?'selected':''}>Rol: Destek</option>
            <option value="ogretmen" ${u.role==='ogretmen'?'selected':''}>Rol: Öğretmen</option>
            <option value="kurum" ${u.role==='kurum'?'selected':''}>Rol: Kurum Admin</option>
          </select>` : ''}
          ${(_isSuper() && !u.is_admin && !(currentUser && currentUser.id === u.id)) ? `<button class="mail-act red" onclick="adminUserDelete('${u.id}')">🗑️ Kullanıcıyı Sil</button>` : ''}
        </div>
        <div id="udet-${u.id}" class="udet-box" style="display:none;"></div>
      </div>
      ${btn}
    </div>`;
  }).join("");
}

/* Kullanıcıyı kalıcı sil — iki aşamalı onay (uyarı + e-posta yazdırma); asıl silme sunucudaki
   admin_kullanici_sil fonksiyonunda yapılır (yalnız yöneticiler çalıştırabilir, yönetici hesabı silinemez). */
async function adminUserDelete(id) {
  const u = (_adminUsers || []).find(x => x.id === id); if (!u) return;
  if (u.is_admin) { uiAlert('Yönetici hesapları silinemez.'); return; }
  const ad = u.display_name || (u.email || '').split('@')[0] || 'Bu kullanıcı';
  const ilk = await uiConfirm(`${ad}${u.email ? ' (' + u.email + ')' : ''} hesabı ve bu hesaba ait tüm veriler (kelime kasası, test sonuçları, notlar, destek talepleri vb.) kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
    'Kullanıcıyı Sil', { danger: true, confirmText: 'Devam et' });
  if (!ilk) return;
  const beklenen = u.email ? String(u.email).trim().toLowerCase() : 'SİL';
  const yazilan = await uiPrompt(u.email ? 'Son onay: silmek için kullanıcının e-posta adresini aynen yaz.\n' + u.email : 'Son onay: silmek için büyük harflerle SİL yaz.',
    { title: 'Silmeyi onayla', placeholder: u.email ? 'e-posta adresi' : 'SİL' });
  if (yazilan == null) return;
  const ok = u.email ? String(yazilan).trim().toLowerCase() === beklenen : String(yazilan).trim() === 'SİL';
  if (!ok) { uiAlert('Yazdığın eşleşmedi; silme iptal edildi.'); return; }
  try {
    const { error } = await sb.rpc('admin_kullanici_sil', { hedef: id });
    if (error) throw error;
  } catch (e) {
    const m = String((e && e.message) || e || '');
    if (/function|does not exist|could not find/i.test(m)) uiAlert('Silme özelliği henüz kurulmamış. Önce kullanici_silme.sql dosyasını veritabanında çalıştır.');
    else uiAlert('Kullanıcı silinemedi: ' + m);
    return;
  }
  try { if (typeof staffLog === 'function') staffLog('kullanici_sil', null, { email: u.email || '', ad: u.display_name || '' }); } catch (e) {}
  _adminUsers = _adminUsers.filter(x => x.id !== id);
  toast('Kullanıcı silindi.');
  const ara = document.getElementById('admin-search');
  if (typeof filterAdminUsers === 'function') filterAdminUsers(ara ? ara.value : ''); else renderAdminUsers(_adminUsers);
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

/* ============================================================
   BÖLÜM 2 · YÖNETİM PANELİ ARAYÜZÜ (v159, v161'de admin.js'e taşındı)
   - Koyu sol menü (gruplu, katlanır), üst bar (arama, bekleyen işler, hesap)
   - Genel Bakış panosu (gerçek verilerle)
   - İçerik Listesi: tüm içerik türleri tek yerde (ara, filtrele, düzenle, yeni ekle)
   - Yönetim ekranlarındaki emojileri çizgi ikonlara çevirir
   Mevcut yönetim fonksiyonlarını (adminNav, ekAdmEdit, adminVidEdit…) olduğu gibi kullanır.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- İkonlar ---------- */
  const P = {
    ev: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    kullanicilar: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20c0-2.8-1.7-5.1-4.2-6"/>',
    kullanici: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    ogretmen: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v6"/>',
    kurum: '<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M10 21v-5h4v5"/><path d="M9 10h.01M15 10h.01"/>',
    liste: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    agac: '<rect x="3" y="3" width="6" height="5" rx="1.2"/><rect x="15" y="9.5" width="6" height="5" rx="1.2"/><rect x="15" y="16" width="6" height="5" rx="1.2"/><path d="M6 8v10.5h9M6 12h9"/>',
    kitap: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22.5z" transform="translate(0 -1.5)"/><path d="M21 4H13v17h8z" transform="translate(0 -1.5)"/>',
    set: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    not: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8.5 12h7M8.5 16h5"/>',
    kart: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9l5 3-5 3z"/>',
    kelime: '<path d="M4 18l4.5-12h1L14 18"/><path d="M5.6 14h7.2"/><path d="M16 11.5c.6-.9 1.5-1.4 2.6-1.4 1.6 0 2.4 1 2.4 2.5V18"/><path d="M21 15c-3.4 0-5 .6-5 1.9 0 .8.7 1.3 1.7 1.3 1.8 0 3.3-1.2 3.3-3.2"/>',
    soru: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.9"/><path d="M12 17.2h.01"/>',
    paragraf: '<path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h9"/>',
    yildiz: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    bildirim: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    destek: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6 8.5-6"/>',
    ziyaret: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    ayar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    yedek: '<ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v6c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-6"/><path d="M4 11.5v6c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-6"/>',
    log: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    hata: '<path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>',
    ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    arti: '<path d="M12 5v14M5 12h14"/>',
    kalem: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    goz: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    cop: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    kapat: '<path d="M6 6l12 12M18 6L6 18"/>',
    cikis: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    siteye: '<path d="M15 18l-6-6 6-6"/>',
    asagi: '<path d="M6 9l6 6 6-6"/>',
    sag: '<path d="M9 6l6 6-6 6"/>',
    okSag: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    kod: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    takvim: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tac: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    grafik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    onay: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
    carpi: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    bilgi: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    kilit: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    anahtar: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    hediye: '<rect x="3" y="8" width="18" height="4.5" rx="1"/><path d="M5 12.5V21h14v-8.5M12 8v13"/><path d="M12 8C10 4 6.5 4.5 7 7c.3 1.2 2.5 1 5 1zM12 8c2-4 5.5-3.5 5-1-.3 1.2-2.5 1-5 1z"/>',
    hedef: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    etiket: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.2"/>',
    yenile: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    geri: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    yukle: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    indir: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v4h16v-4"/>',
    kaydet: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    klasor: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    paket: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    resim: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 16l-5.5-5.5L5 20"/>',
    ses: '<path d="M4 9.5h4l5-4.5v14l-5-4.5H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mikrofon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    kumsaati: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>',
    bayrak: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    kupa: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
    ampul: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    ates: '<path d="M12 21c4 0 7-2.8 7-6.8 0-4.5-4-6.2-4.5-10.2C11 6 9 9 9.5 11.5 8.2 10.8 7.5 9.5 7.5 8 5.5 9.8 5 12 5 14.2 5 18.2 8 21 12 21z"/>',
    sihir: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    kopya: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    filtre: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    nokta3: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    blog: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13 20h7"/>',
    makale: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>',
    yonetim: '<path d="M12 3l8 3.5v5.5c0 4.6-3.4 8.3-8 9.5-4.6-1.2-8-4.9-8-9.5V6.5z"/><path d="M9 12l2 2 4-4"/>',
    telefon: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
    dunya: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/>',
    kumbara: '<path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3"/>',
    nokta: '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
    el: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 15a1.5 1.5 0 0 1 2.4-1.8L7 14.5V11"/>',
    beyin: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
    toplama: '<path d="M8 4h8M8 20h8M10 4v16M14 4v16"/>',
    surgu: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    yukari2: '<path d="M7 11l5-5 5 5M7 18l5-5 5 5"/>',
    asagi2: '<path d="M7 6l5 5 5-5M7 13l5 5 5-5"/>',
    yukari: '<path d="M6 15l6-6 6 6"/>',
    hazirlik: '<path d="M14.5 6.5l3 3L8 19H5v-3z"/><path d="M12 9l3 3"/><path d="M17 3l4 4"/>'
  };
  const ic = (n, s) => '<svg class="yp-svg" viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.nokta) + '</svg>';
  window.ypIc = ic;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const $ = id => document.getElementById(id);
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  async function bekleKadar(kosul, sure) { const son = Date.now() + (sure || 4000); while (Date.now() < son) { try { if (kosul()) return true; } catch (e) {} await bekle(80); } return false; }
  const gl = (ad) => { try { return (0, eval)(ad); } catch (e) { return undefined; } };   // let/const ile tanımlı global değişkenlere erişim
  function onceKadar(t) {
    if (!t) return '';
    const fark = (Date.now() - new Date(t).getTime()) / 1000;
    if (fark < 60) return 'az önce';
    if (fark < 3600) return Math.floor(fark / 60) + ' dk önce';
    if (fark < 86400) return Math.floor(fark / 3600) + ' saat önce';
    if (fark < 86400 * 30) return Math.floor(fark / 86400) + ' gün önce';
    return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  window.ypOnceKadar = t => onceKadar(t);
  const tarihKisa = t => t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  function lsOku(k, v) { try { const x = localStorage.getItem(k); return x == null ? v : JSON.parse(x); } catch (e) { return v; } }
  function lsYaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- Menü yapısı ---------- */
  // [görünüm, ad, ikon, alt sekme (İçerik Merkezi)]
  const MENU = [
    { g: null, items: [['overview', 'Genel Bakış', 'ev']] },
    { g: 'Kullanıcı Yönetimi', k: 'kul', items: [['users', 'Kullanıcılar', 'kullanicilar'], ['assign', 'Öğretmen Atama', 'ogretmen'], ['kurumlar', 'Kurumlar', 'kurum']] },
    { g: 'İçerik Yönetimi', k: 'ic', items: [['icerikler', 'İçerik Listesi', 'liste'], ['icerik', 'Müfredat ve Konular', 'agac', 'konular'], ['icerik', 'E-Kitap Üniteleri', 'kitap', 'unite'],
      ['icerik', 'Çalışma Setleri', 'set', 'set'], ['icerik', 'Notlar ve Kartlar', 'not', 'ozet'], ['videos', 'Videolar', 'video'],
      ['content', 'Kelimeler', 'kelime'], ['questions', 'Soru Havuzu', 'soru'], ['pquest', 'Paragraf Soruları', 'paragraf'], ['recs', 'Bloglar', 'blog'], ['makaleler', 'Makaleler', 'makale']] },
    { g: 'İletişim ve Destek', k: 'il', items: [['notify', 'Bildirim Gönder', 'bildirim'], ['support', 'Destek Talepleri', 'destek'], ['mail', 'Mail Kutusu', 'mail']] },
    { g: 'Site Yönetimi', k: 'site', items: [['visits', 'Ziyaret ve SEO', 'ziyaret'], ['settings', 'Site Ayarları', 'ayar'], ['backup', 'Yedekleme', 'yedek'], ['stafflog', 'İşlem Kayıtları', 'log'], ['errors', 'Hata Kayıtları', 'hata']] }
  ];
  const BASLIK = {   // sayfa başlıkları (görünümdeki h2/p yerine)
    overview: ['Genel Bakış', 'Platformun güncel durumu ve hızlı erişim.'],
    icerikler: ['İçerik Listesi', 'Tüm içerikler tek yerde: ara, filtrele, düzenle ya da yenisini ekle.'],
    recs: ['Bloglar', 'Blog yazılarını ekle, düzenle ve yayınla.'],
    makaleler: ['Makaleler', 'Rusça makale bölümü burada yönetilecek.']
  };
  const ICTAB_AD = { konular: 'Müfredat ve Konular', unite: 'E-Kitap Üniteleri', set: 'Çalışma Setleri', ozet: 'Notlar ve Kartlar', kartlar: 'Notlar ve Kartlar' };
  const ICTAB_ALT = { konular: 'Modül, ünite, ders ve konu ağacını düzenle; konuları derslere bağla.', unite: 'E-kitap ünitelerini ekle, düzenle ve yayınla.', set: 'Gramer Çalışmaları setlerini ekle, sırala ve yayınla.', ozet: 'Konulara bağlı özet notları ve ünitelerdeki çalışma kartları.', kartlar: 'Konulara bağlı özet notları ve ünitelerdeki çalışma kartları.' };
  const ICTAB_IC = { konular: 'agac', unite: 'kitap', set: 'set', ozet: 'not', kartlar: 'kart' };
  const gorIkon = {}; MENU.forEach(g => g.items.forEach(i => { if (!i[3]) gorIkon[i[0]] = i[2]; }));

  /* ---------- Kabuk ---------- */
  let kuruldu = false;
  const katli = lsOku('yp_katli', {});
  function kabukKur() {
    if (kuruldu) return;
    const sayfa = $('page-admin'), icerik = $('admin-content'); if (!sayfa || !icerik) return;
    const main = icerik.querySelector('.profile-main'), eskiYan = icerik.querySelector('.profile-sidebar');
    if (!main) return;
    kuruldu = true;

    // Sol menü
    const yan = document.createElement('aside');
    yan.id = 'yp-yan';
    let h = '<div class="yp-logo" onclick="ypGit(\'overview\')" role="button" tabindex="0"><span class="yp-logo-ic">' + ic('kitap', 24) + '</span><div><b>YDT-YDS <em>Rusça</em></b><small>Yönetim Paneli</small></div></div><div class="yp-menu" role="navigation" aria-label="Yönetim menüsü">';
    MENU.forEach(g => {
      if (g.g) h += '<div class="yp-grup' + (katli[g.k] ? ' katli' : '') + '" data-k="' + g.k + '"><button type="button" class="yp-grup-b" onclick="ypGrup(\'' + g.k + '\')">' + esc(g.g) + ic('asagi', 14) + '</button><div class="yp-grup-ic">';
      g.items.forEach(([v, ad, ikon, alt]) => {
        h += '<button type="button" class="psb-item yp-it"' + (alt ? '' : ' id="asb-' + v + '"') + ' data-v="' + v + '"' + (alt ? ' data-alt="' + alt + '"' : '') +
          ' onclick="ypGit(\'' + v + '\'' + (alt ? ', \'' + alt + '\'' : '') + ')">' + ic(ikon) + '<span>' + esc(ad) + '</span><i class="yp-rozet" data-r="' + v + (alt ? '-' + alt : '') + '"></i></button>';
      });
      if (g.g) h += '</div></div>';
    });
    h += '</div>';
    yan.innerHTML = h;

    // Üst bar
    const ust = document.createElement('header');
    ust.id = 'yp-ust';
    ust.innerHTML =
      '<button type="button" class="yp-ham" onclick="ypMenuAc()" aria-label="Menü">' + ic('menu', 20) + '</button>' +
      '<div class="yp-ara"><span class="yp-ara-ic">' + ic('ara', 17) + '</span><input id="yp-ara-in" type="search" placeholder="Ara… (sayfa, içerik, kullanıcı)" autocomplete="off" aria-label="Yönetim panelinde ara"><kbd>Ctrl K</kbd><div id="yp-ara-son" class="yp-acilir" role="listbox"></div></div>' +
      '<div class="yp-ust-sag">' +
      '  <button type="button" class="yp-ana" onclick="ypSiteye()" title="Ana sayfaya dön">' + ic('ev', 18) + '<span>Ana sayfa</span></button>' +
      '  <div class="yp-zil-k"><button type="button" class="yp-zil" id="yp-zil" onclick="ypZil(event)" aria-label="Bildirimler" title="Bildirimler">' + ic('bildirim', 20) + '<i id="yp-zil-say"></i></button><div id="yp-zil-p" class="yp-acilir yp-zil-p"></div></div>' +
      '  <div class="yp-hesap-k"><button type="button" class="yp-hesap" onclick="ypHesap(event)"><span class="yp-hesap-av" id="yp-av"></span><span class="yp-hesap-ad"><b id="yp-ad"></b><small id="yp-rol"></small></span>' + ic('asagi', 15) + '</button>' +
      '    <div id="yp-hesap-p" class="yp-acilir yp-hesap-p">' +
      '      <button type="button" onclick="ypKapatHepsi(); showPage(\'profile\')">' + ic('kullanici', 17) + 'Profilim</button>' +
      '      <div class="yp-ayrac"></div><button type="button" class="kirmizi" onclick="ypKapatHepsi(); authLogout()">' + ic('cikis', 17) + 'Çıkış</button>' +
      '    </div></div>' +
      '</div>';

    // Sayfa başlığı
    const bas = document.createElement('div');
    bas.id = 'yp-bas';
    bas.innerHTML = '<span class="yp-bas-ic" id="yp-bas-ic"></span><div class="yp-bas-y"><h2 id="yp-bas-h"></h2><p id="yp-bas-p"></p></div><div class="yp-bas-acts" id="yp-bas-acts"></div>';

    // Yeni görünüm: İçerik Listesi
    const il = document.createElement('div');
    il.id = 'av-icerikler'; il.className = 'admin-view'; il.style.display = 'none';
    il.innerHTML = '<div id="yp-il"></div>';
    main.appendChild(il);

    // Makaleler (yakında)
    const mk = document.createElement('div');
    mk.id = 'av-makaleler'; mk.className = 'admin-view'; mk.style.display = 'none';
    mk.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('makale', 30) + '<b>Makaleler bölümü yakında.</b><span>Rusça makaleler buradan eklenip yönetilecek.</span></div></div>';
    main.appendChild(mk);
    // Özet notları ve çalışma kartları tek sayfa: üstte geçiş
    ['ic-ozet', 'ic-kartlar'].forEach(id => {
      const k = $(id); if (!k) return;
      const g = document.createElement('div'); g.className = 'yp-sekmeler yp-nk';
      g.innerHTML = '<button type="button" class="yp-sekme' + (id === 'ic-ozet' ? ' aktif' : '') + '" onclick="ypGit(\'icerik\', \'ozet\')">' + ic('not', 15) + ' Özet notları</button>' +
        '<button type="button" class="yp-sekme' + (id === 'ic-kartlar' ? ' aktif' : '') + '" onclick="ypGit(\'icerik\', \'kartlar\')">' + ic('kart', 15) + ' Çalışma kartları</button>';
      k.insertBefore(g, k.firstChild);
    });

    // Genel bakış görünümünü panoya çevir
    const ov = $('av-overview');
    if (ov) ov.innerHTML = '<div id="yp-pano"><div class="admin-loading">Yükleniyor...</div></div>';

    if (eskiYan) eskiYan.remove();
    sayfa.insertBefore(ust, sayfa.firstChild);
    sayfa.insertBefore(yan, sayfa.firstChild);
    main.insertBefore(bas, main.firstChild);
    const perde = document.createElement('div'); perde.id = 'yp-perde'; perde.onclick = ypMenuKapat; sayfa.appendChild(perde);

    // Arama
    const ain = $('yp-ara-in');
    ain.addEventListener('input', araCiz);
    ain.addEventListener('focus', () => { icerikYukle(); araCiz(); });
    ain.addEventListener('keydown', araTus);
    hesapDoldur();
  }

  function hesapDoldur() {
    const av = $('account-avatar'), yav = $('yp-av');
    if (av && yav) { const im = av.querySelector('img'); if (im) yav.innerHTML = '<img src="' + esc(im.getAttribute('src')) + '" alt="">'; else { const t = [...av.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('').trim(); yav.textContent = t || (($('account-name') || {}).textContent || '?').trim().charAt(0).toUpperCase(); } }
    const ad = $('account-name'), rol = $('account-plan');
    if ($('yp-ad') && ad) $('yp-ad').textContent = ad.textContent;
    if ($('yp-rol') && rol) $('yp-rol').textContent = rol.textContent;
  }

  /* ---------- Gezinme ---------- */
  let aktifGor = 'overview';
  function ypGit(v, alt) {
    ypMenuKapat(); ypKapatHepsi();
    if (v === 'icerik' && alt) { try { const icS = gl('IC'); if (icS && typeof icS === 'object' && 'tab' in icS) icS.tab = alt; } catch (e) {} }
    if (typeof adminNav === 'function') adminNav(v);
    window.scrollTo({ top: 0 });
  }
  function aktifIsaretle(v) {
    aktifGor = v;
    let alt = null;
    if (v === 'icerik') { const icS = gl('IC'); alt = icS && icS.tab; }
    document.querySelectorAll('#yp-yan .yp-it').forEach(b => {
      const ok = b.dataset.v === v && (!b.dataset.alt || b.dataset.alt === alt || (b.dataset.alt === 'ozet' && alt === 'kartlar'));
      b.classList.toggle('active', ok);
      if (ok) { const g = b.closest('.yp-grup'); if (g && g.classList.contains('katli')) { g.classList.remove('katli'); } }
    });
    // Sayfa başlığı
    const gor = $('av-' + v);
    let baslik = BASLIK[v] ? BASLIK[v][0] : '', alt2 = BASLIK[v] ? BASLIK[v][1] : '', ikon = gorIkon[v] || 'nokta';
    if (gor) {
      const h2 = gor.querySelector(':scope > h2.profile-h2'), p = gor.querySelector(':scope > p.profile-sub');
      if (h2) { if (!BASLIK[v]) baslik = h2.textContent.trim(); h2.classList.add('yp-gizle'); }
      if (p) { if (!BASLIK[v]) alt2 = p.textContent.trim(); p.classList.add('yp-gizle'); }
    }
    if (v === 'icerik' && alt) { baslik = ICTAB_AD[alt] || baslik; alt2 = ICTAB_ALT[alt] || alt2; ikon = ICTAB_IC[alt] || 'agac'; }
    $('yp-bas-h').textContent = baslik.replace(/^İçerik Yönetimi — /, '');
    $('yp-bas-p').textContent = alt2;
    $('yp-bas-ic').innerHTML = ic(ikon, 24);
    const acts = $('yp-bas-acts'); acts.innerHTML = '';
    if (v === 'overview') acts.innerHTML = '<div class="yp-sec"><span>' + ic('takvim', 16) + '</span><select id="yp-aralik" onchange="ypAralik(this.value)" aria-label="Zaman aralığı"><option value="7"' + (aralik === 7 ? ' selected' : '') + '>Son 7 gün</option><option value="30"' + (aralik === 30 ? ' selected' : '') + '>Son 30 gün</option></select></div>' +
      '<button type="button" class="yp-btn" onclick="ypRaporIndir()">' + ic('indir', 16) + 'Rapor indir</button>';
    if (v === 'icerikler') acts.innerHTML = yeniButonu();
    if (v === 'content') acts.innerHTML = '<button type="button" class="yp-btn" id="yp-kel-csv" onclick="ypKelimeIndir(\'csv\')">' + ic('indir', 16) + 'CSV indir</button>' +
      '<button type="button" class="yp-btn ana" id="yp-kel-xlsx" onclick="ypKelimeIndir(\'xlsx\')">' + ic('indir', 16) + 'Excel indir</button>';
    if (window.YS_AKS && typeof window.YS_AKS[v] === 'function') acts.innerHTML = window.YS_AKS[v]();   // sayfaya özel başlık düğmeleri (Bölüm 3)
    if (v === 'icerikler') ilCiz();
    if (v === 'overview') panoCiz();
  }
  function ypGrup(k) {
    const g = document.querySelector('.yp-grup[data-k="' + k + '"]'); if (!g) return;
    g.classList.toggle('katli'); katli[k] = g.classList.contains('katli'); lsYaz('yp_katli', katli);
  }
  function ypMenuAc() { document.body.classList.add('yp-menu-acik'); }
  function ypMenuKapat() { document.body.classList.remove('yp-menu-acik'); }
  function ypSiteye() { ypKapatHepsi(); if (typeof showPage === 'function') showPage('home'); }
  function ypKapatHepsi() { document.querySelectorAll('#page-admin .yp-acilir.acik').forEach(x => x.classList.remove('acik')); }
  function ypHesap(e) { if (e) e.stopPropagation(); const p = $('yp-hesap-p'); const ac = !p.classList.contains('acik'); ypKapatHepsi(); hesapDoldur(); p.classList.toggle('acik', ac); }
  function ypZil(e) { if (e) e.stopPropagation(); const p = $('yp-zil-p'); const ac = !p.classList.contains('acik'); ypKapatHepsi(); if (ac) { bekleyenCiz(p, true); p.classList.add('acik'); } }
  document.addEventListener('mousedown', e => {
    if (!document.body.classList.contains('yp-aktif')) return;
    document.querySelectorAll('#page-admin .yp-acilir.acik').forEach(x => { if (!x.parentElement.contains(e.target)) x.classList.remove('acik'); });
  });
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('yp-aktif')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); const a = $('yp-ara-in'); if (a) { a.focus(); a.select(); } }
    if (e.key === 'Escape') { ypKapatHepsi(); ypMenuKapat(); }
  });

  /* ---------- İçerik dizini (tüm türler) ---------- */
  const TUR = {
    unite: { ad: 'E-Kitap Ünitesi', kisa: 'E-Kitap', ic: 'kitap', renk: 'mavi' },
    set: { ad: 'Çalışma Seti', kisa: 'Çalışma seti', ic: 'set', renk: 'mor' },
    ozet: { ad: 'Özet Notu', kisa: 'Özet notu', ic: 'not', renk: 'camgobegi' },
    video: { ad: 'Video', kisa: 'Video', ic: 'video', renk: 'kirmizi' },
    pq: { ad: 'Paragraf Sorusu', kisa: 'Paragraf', ic: 'paragraf', renk: 'turuncu' },
    soru: { ad: 'Soru (Seviye Havuzu)', kisa: 'Soru', ic: 'soru', renk: 'yesil' },
    oneri: { ad: 'Blog Yazısı', kisa: 'Blog', ic: 'blog', renk: 'altin' },
    kelime: { ad: 'Kelime', kisa: 'Kelime', ic: 'kelime', renk: 'gri' }
  };
  const TUR_SIRA = ['unite', 'set', 'ozet', 'video', 'pq', 'soru', 'oneri', 'kelime'];
  let IX = null, ixYukleniyor = null, kelimeSay = null;

  async function sorgu(tablo, kolonlar, yedek) {
    try {
      let r = await sb.from(tablo).select(kolonlar).limit(2000);
      if (r.error && yedek) r = await sb.from(tablo).select(yedek).limit(2000);
      return r.error ? [] : (r.data || []);
    } catch (e) { return []; }
  }
  function mfAd(ref) {
    if (!ref) return '';
    try { if (typeof vdKat === 'function') { const k = vdKat(ref); if (k && k[1]) return k[1]; } } catch (e) {}
    const p = String(ref).split('.');
    return ['Modül ' + p[0], p[1] ? 'Ünite ' + p[1] : '', p[2] ? 'Ders ' + p[2] : ''].filter(Boolean).join(' › ');
  }
  function icerikYukle(zorla) {
    if (IX && !zorla) return Promise.resolve(IX);
    if (ixYukleniyor && !zorla) return ixYukleniyor;
    ixYukleniyor = (async () => {
      const [un, st, oz, vd, pq, so, on, tp] = await Promise.all([
        sorgu('ek_units', 'id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, kontrol_say, updated_at, toc', 'id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, updated_at, toc'),
        sorgu('gw_sets', 'id, baslik, seviye, konular, kitap_ref, act_say, kontrol_say, yayinda, updated_at', '*'),
        sorgu('ozet_notlar', 'id, baslik, konu, aktif, created_at, updated_at', 'id, baslik, konu, aktif, created_at'),
        sorgu('content_videos', 'id, title, level, mf_ref, active, premium, created_at, descr', '*'),
        sorgu('content_pquestions', 'id, soru, level, konu, active, created_at', '*'),
        sorgu('placement_questions', 'id, question, level, tag, active, created_at', 'id, question, level, tag, created_at'),
        sorgu('content_recs', 'id, title, rtype, level, active, created_at', '*'),
        sorgu('topics', 'kod, ad')
      ]);
      const konuAd = {}; tp.forEach(t => konuAd[t.kod] = t.ad);
      const L = [];
      un.forEach(r => L.push({ tur: 'unite', id: r.id, baslik: r.unite_ad || ('Ünite ' + r.unite_no), alt: 'Modül ' + r.modul_no + ' › Ünite ' + r.unite_no, seviye: r.seviye,
        durum: r.kontrol_say ? 'kontrol' : (r.yayinda ? 'yayinda' : 'taslak'), tarih: r.updated_at, modul: r.modul_no, ders: (r.toc || []).filter(t => t.tur === 'ders').length, kontrol: r.kontrol_say || 0 }));
      st.forEach(r => L.push({ tur: 'set', id: r.id, baslik: r.baslik, alt: (r.konular || []).map(k => konuAd[k] || k).join(', ') || (r.kitap_ref ? 'Kitap ' + r.kitap_ref : ''), seviye: r.seviye,
        durum: r.kontrol_say ? 'kontrol' : (r.yayinda ? 'yayinda' : 'taslak'), tarih: r.updated_at, modul: r.kitap_ref ? parseInt(String(r.kitap_ref).split('.')[0], 10) || null : null, kontrol: r.kontrol_say || 0 }));
      oz.forEach(r => L.push({ tur: 'ozet', id: r.id, baslik: r.baslik, alt: r.konu ? (konuAd[r.konu] || r.konu) : 'Konusuz', durum: r.aktif === false ? 'gizli' : 'yayinda', tarih: r.updated_at || r.created_at,
        ara: String(r.govde || '').replace(/<[^>]+>/g, ' ').slice(0, 300) }));
      vd.forEach(r => L.push({ tur: 'video', id: r.id, baslik: r.title, alt: r.mf_ref ? mfAd(r.mf_ref) : 'Müfredata bağlanmamış', seviye: r.level, durum: r.active === false ? 'silindi' : 'yayinda',
        prem: !!r.premium, tarih: r.created_at, modul: r.mf_ref && /^\d/.test(r.mf_ref) ? parseInt(r.mf_ref, 10) : null, ara: r.descr || '' }));
      pq.forEach(r => L.push({ tur: 'pq', id: r.id, baslik: (r.soru || '').slice(0, 90) || 'Paragraf sorusu', alt: r.konu || '', seviye: r.level, durum: r.active === false ? 'gizli' : 'yayinda', tarih: r.created_at, ara: (r.paragraf || '').slice(0, 300) }));
      so.forEach(r => L.push({ tur: 'soru', id: r.id, baslik: (r.question || '').slice(0, 90) || 'Soru', alt: r.tag || '', seviye: r.level, durum: r.active === false ? 'gizli' : 'yayinda', tarih: r.created_at }));
      on.forEach(r => L.push({ tur: 'oneri', id: r.id, baslik: r.title, alt: ({ film: 'Film', dizi: 'Dizi', anime: 'Anime', kitap: 'Kitap' })[r.rtype] || r.rtype || 'Blog', seviye: r.level, durum: r.active === false ? 'gizli' : 'yayinda', tarih: r.created_at }));
      L.forEach(x => { x.araMetin = (x.baslik + ' ' + (x.alt || '') + ' ' + (x.ara || '') + ' ' + TUR[x.tur].ad).toLocaleLowerCase('tr'); });
      IX = L; ixYukleniyor = null;
      // Kelime sayısı ayrıca gelir; listeyi bekletmez
      sb.from('content_words').select('id', { count: 'exact', head: true }).then(r => { kelimeSay = (r && typeof r.count === 'number') ? r.count : null; if (aktifGor === 'icerikler') ilCiz(); }, () => {});
      if (bekleyenSun) bekleyenHesapla();
      rozetler();
      return L;
    })();
    return ixYukleniyor;
  }
  window.ypIcerikYenile = () => icerikYukle(true).then(() => { if (aktifGor === 'icerikler') ilCiz(); if (aktifGor === 'overview') panoCiz(); });

  /* ---------- Yeni içerik / düzenle yönlendirme ---------- */
  function yeniButonu() {
    return '<div class="yp-yeni-k"><button type="button" class="yp-btn ana" onclick="ypYeniAc(event)">' + ic('arti', 16) + 'Yeni içerik' + ic('asagi', 14) + '</button><div class="yp-acilir yp-yeni-p" id="yp-yeni-p">' +
      TUR_SIRA.map(t => '<button type="button" onclick="ypYeni(\'' + t + '\')"><span class="yp-tur-ic r-' + TUR[t].renk + '">' + ic(TUR[t].ic, 16) + '</span>' + TUR[t].ad + '</button>').join('') + '</div></div>';
  }
  function ypYeniAc(e) { if (e) e.stopPropagation(); const p = $('yp-yeni-p'); if (!p) return; const ac = !p.classList.contains('acik'); ypKapatHepsi(); p.classList.toggle('acik', ac); }
  function odakla(id) { const el = $(id); if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (e) {} }, 350); }
  async function ekListeHazir() { await bekleKadar(() => { const b = $('ek-adm-list'); return b && b.dataset.ypBos !== '1' && b.innerHTML.trim() && !/Yükleniyor/.test(b.textContent) && b.style.display !== 'none'; }, 5000); }
  function ekListeSifirla(t) {   // eski sekmenin listesiyle karışmasın: liste yeniden çizilene kadar bekle
    const b = $('ek-adm-list'); if (b) { b.innerHTML = ''; b.dataset.ypBos = '1'; new MutationObserver((m, o) => { if (b.innerHTML.trim()) { delete b.dataset.ypBos; o.disconnect(); } }).observe(b, { childList: true }); }
    const e = gl('EKA'); if (e && typeof e === 'object') e.mode = t === 'set' ? 'set' : 'unit';
  }
  async function ypYeni(t) {
    ypKapatHepsi();
    if (t === 'unite' || t === 'set') { ekListeSifirla(t); ypGit('icerik', t); await ekListeHazir(); if (typeof ekAdmNew === 'function') ekAdmNew(); odakla('ek-src'); return; }
    if (t === 'ozet') { ypGit('icerik', 'ozet'); await bekleKadar(() => $('oz-baslik') && $('ic-ozet').style.display !== 'none', 4000); if (typeof ozClear === 'function') ozClear(); odakla('oz-baslik'); return; }
    if (t === 'video') { ypGit('videos'); if (typeof adminVidFormClear === 'function') adminVidFormClear(); odakla('cv-title'); return; }
    if (t === 'pq') { ypGit('pquest'); if (typeof adminPqFormClear === 'function') adminPqFormClear(); odakla('cpq-para'); return; }
    if (t === 'soru') { ypGit('questions'); if (typeof pqFormClear === 'function') pqFormClear(); odakla('pq-q'); return; }
    if (t === 'oneri') { ypGit('recs'); if (typeof adminRcFormClear === 'function') adminRcFormClear(); odakla('rc-title'); return; }
    if (t === 'kelime') { ypGit('content'); if (typeof adminWordFormClear === 'function') adminWordFormClear(); odakla('cw-ru'); return; }
  }
  async function ypDuzenle(t, id) {
    const has = (ad) => { const a = gl(ad); return Array.isArray(a) && a.some(r => String(r.id) === String(id)); };
    if (t === 'unite' || t === 'set') { ekListeSifirla(t); ypGit('icerik', t); await ekListeHazir(); if (typeof ekAdmEdit === 'function') ekAdmEdit(id); return; }
    if (t === 'ozet') { ypGit('icerik', 'ozet'); await bekleKadar(() => { const o = gl('OZ'); return o && Array.isArray(o.rows) && o.rows.some(r => String(r.id) === String(id)); }); if (typeof ozEdit === 'function') ozEdit(id); return; }
    if (t === 'video') { ypGit('videos'); await bekleKadar(() => has('_cvRows')); if (typeof adminVidEdit === 'function') adminVidEdit(id); return; }
    if (t === 'pq') { ypGit('pquest'); await bekleKadar(() => has('_cpqRows')); if (typeof adminPqEdit === 'function') adminPqEdit(id); return; }
    if (t === 'soru') { ypGit('questions'); await bekleKadar(() => has('_pqRows')); if (typeof pqEdit === 'function') pqEdit(id); return; }
    if (t === 'oneri') { ypGit('recs'); await bekleKadar(() => has('_rcRows')); if (typeof adminRcEdit === 'function') adminRcEdit(id); return; }
    if (t === 'kelime') { ypGit('content'); await bekleKadar(() => has('_cwRows'), 8000); if (typeof adminWordEdit === 'function') adminWordEdit(id); return; }
  }

  /* ---------- İçerik Listesi ---------- */
  const IL = lsOku('yp_il', { tur: 'hepsi', durum: 'hepsi', seviye: 'hepsi', ara: '', sira: 'yeni' });
  IL.sayfa = 1;
  const IL_BOY = 25;
  const DURUM = { yayinda: ['Yayında', 'yesil'], taslak: ['Taslak', 'sari'], kontrol: ['Kontrol bekliyor', 'turuncu'], gizli: ['Gizli', 'gri'], silindi: ['Silindi', 'gri'] };
  let kelimeSonuc = null, kelimeAraT = null;
  function ilAyarla(k, v) { IL[k] = v; IL.sayfa = 1; lsYaz('yp_il', { tur: IL.tur, durum: IL.durum, seviye: IL.seviye, ara: '', sira: IL.sira }); ilCiz(); }
  window.ypIlAyarla = ilAyarla;
  window.ypIlSayfa = s => { IL.sayfa = s; ilCiz(); const k = $('yp-il'); if (k) k.scrollIntoView({ block: 'start' }); };
  window.ypIlAra = v => {
    IL.ara = v; IL.sayfa = 1; tabloCiz();
    clearTimeout(kelimeAraT);
    const q = v.trim().replace(/[^0-9A-Za-zÀ-ɏЀ-ӿçğıöşüÇĞİÖŞÜ \-]/g, '');
    if ((IL.tur === 'hepsi' || IL.tur === 'kelime') && q.length >= 2) {
      kelimeAraT = setTimeout(async () => {
        try { const { data } = await sb.from('content_words').select('id, ru, tr, level, cat, active').or('ru.ilike.%' + q + '%,tr.ilike.%' + q + '%').limit(40); kelimeSonuc = { q: v, rows: data || [] }; }
        catch (e) { kelimeSonuc = { q: v, rows: [] }; }
        tabloCiz();
      }, 300);
    } else kelimeSonuc = null;
  };
  async function ilCiz() {
    const k = $('yp-il'); if (!k) return;
    if (!IX) { k.innerHTML = '<div class="yp-kart"><div class="admin-loading">İçerikler yükleniyor...</div></div>'; await icerikYukle(); }
    const say = {}; TUR_SIRA.forEach(t => say[t] = IX.filter(x => x.tur === t).length);
    if (kelimeSay != null) say.kelime = kelimeSay;
    const sekme = (v, ad, n) => '<button type="button" class="yp-sekme' + (IL.tur === v ? ' aktif' : '') + '" onclick="ypIlAyarla(\'tur\', \'' + v + '\')">' + ad + (n != null ? ' <span>' + n + '</span>' : '') + '</button>';
    const sec = (k2, ops) => '<select class="yp-sel" onchange="ypIlAyarla(\'' + k2 + '\', this.value)">' + ops.map(o => '<option value="' + o[0] + '"' + (IL[k2] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
    k.innerHTML =
      '<div class="yp-ozet-satir">' + TUR_SIRA.map(t => '<button type="button" class="yp-ozet-k' + (IL.tur === t ? ' aktif' : '') + '" onclick="ypIlAyarla(\'tur\', \'' + (IL.tur === t ? 'hepsi' : t) + '\')"><span class="yp-tur-ic r-' + TUR[t].renk + '">' + ic(TUR[t].ic, 18) + '</span><div><b>' + (say[t] == null ? '—' : say[t].toLocaleString('tr-TR')) + '</b><small>' + TUR[t].kisa + '</small></div></button>').join('') +
      '<button type="button" class="yp-ozet-k" onclick="ypGit(\'makaleler\')" title="Makale bölümü yakında"><span class="yp-tur-ic r-mor">' + ic('makale', 18) + '</span><div><b>0</b><small>Makale</small></div></button></div>' +
      '<div class="yp-kart yp-il-kart">' +
      '<div class="yp-sekmeler">' + sekme('hepsi', 'Tümü', IX.length) + TUR_SIRA.filter(t => t !== 'kelime').map(t => sekme(t, TUR[t].kisa, say[t])).join('') + sekme('kelime', 'Kelimeler', say.kelime) + '</div>' +
      '<div class="yp-filtre"><div class="yp-ara2">' + ic('ara', 16) + '<input type="search" id="yp-il-ara" placeholder="' + (IL.tur === 'kelime' ? 'Rusça ya da Türkçe kelime yaz…' : 'Başlık, konu ya da müfredatta ara…') + '" value="' + esc(IL.ara) + '" oninput="ypIlAra(this.value)" autocomplete="off"></div>' +
      sec('durum', [['hepsi', 'Tüm durumlar'], ['yayinda', 'Yayında'], ['taslak', 'Taslak'], ['kontrol', 'Kontrol bekliyor'], ['gizli', 'Gizli / silinmiş']]) +
      sec('seviye', [['hepsi', 'Tüm seviyeler'], ['A1', 'A1'], ['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1']]) +
      sec('sira', [['yeni', 'En yeni önce'], ['eski', 'En eski önce'], ['ad', 'Ada göre'], ['tur', 'Türe göre']]) +
      '<button type="button" class="yp-ikon-b" title="Listeyi yenile" onclick="ypIcerikYenile()">' + ic('yenile', 17) + '</button></div>' +
      '<div id="yp-il-tablo"></div></div>';
    tabloCiz();
  }
  function filtreli() {
    const q = IL.ara.trim().toLocaleLowerCase('tr');
    let L = IX.filter(x => (IL.tur === 'hepsi' || x.tur === IL.tur) &&
      (IL.durum === 'hepsi' || (IL.durum === 'gizli' ? (x.durum === 'gizli' || x.durum === 'silindi') : x.durum === IL.durum)) &&
      (IL.seviye === 'hepsi' || x.seviye === IL.seviye) && (!q || x.araMetin.includes(q)));
    if (IL.sira === 'ad') L.sort((a, b) => String(a.baslik).localeCompare(String(b.baslik), 'tr'));
    else if (IL.sira === 'tur') L.sort((a, b) => TUR_SIRA.indexOf(a.tur) - TUR_SIRA.indexOf(b.tur) || String(a.baslik).localeCompare(String(b.baslik), 'tr'));
    else L.sort((a, b) => (new Date(b.tarih || 0) - new Date(a.tarih || 0)) * (IL.sira === 'eski' ? -1 : 1));
    return L;
  }
  function satirHTML(x, kisa) {
    const T = TUR[x.tur], D = DURUM[x.durum] || ['—', 'gri'];
    return '<tr><td><span class="yp-tur"><span class="yp-tur-ic r-' + T.renk + '">' + ic(T.ic, 15) + '</span>' + T.kisa + '</span></td>' +
      '<td class="yp-t-bas"><button type="button" class="yp-link" onclick="ypDuzenle(\'' + x.tur + '\', \'' + esc(x.id) + '\')">' + esc(x.baslik) + '</button>' + (x.prem ? '<span class="yp-cip altin">' + ic('tac', 12) + 'Premium</span>' : '') + '</td>' +
      '<td class="yp-t-alt">' + esc(x.alt || '—') + (x.seviye ? ' <span class="yp-sv">' + esc(x.seviye) + '</span>' : '') + '</td>' +
      '<td><span class="yp-durum d-' + D[1] + '">' + D[0] + '</span></td>' +
      (kisa ? '' : '<td class="yp-t-tar" title="' + (x.tarih ? new Date(x.tarih).toLocaleString('tr-TR') : '') + '">' + tarihKisa(x.tarih) + '</td>') +
      '<td class="yp-t-is"><button type="button" class="yp-ikon-b" title="Düzenle" onclick="ypDuzenle(\'' + x.tur + '\', \'' + esc(x.id) + '\')">' + ic('kalem', 16) + '</button></td></tr>';
  }
  function tabloCiz() {
    const k = $('yp-il-tablo'); if (!k || !IX) return;
    if (IL.tur === 'kelime') return kelimeTablo(k);
    const L = filtreli();
    const sayfaS = Math.max(1, Math.ceil(L.length / IL_BOY)); if (IL.sayfa > sayfaS) IL.sayfa = sayfaS;
    const dilim = L.slice((IL.sayfa - 1) * IL_BOY, IL.sayfa * IL_BOY);
    let h = '';
    if (!L.length) h = '<div class="yp-bos">' + ic('ara', 28) + '<b>Eşleşen içerik yok.</b><span>Filtreleri değiştir ya da yeni bir içerik ekle.</span></div>';
    else h = '<div class="yp-tablo-k"><table class="yp-tablo"><thead><tr><th>Tür</th><th>Başlık</th><th>Müfredat / Konu</th><th>Durum</th><th>Güncelleme</th><th></th></tr></thead><tbody>' + dilim.map(x => satirHTML(x)).join('') + '</tbody></table></div>';
    if (L.length) h += '<div class="yp-alt"><span>' + L.length.toLocaleString('tr-TR') + ' içerik' + (sayfaS > 1 ? ' · sayfa ' + IL.sayfa + ' / ' + sayfaS : '') + '</span>' + sayfalayici(sayfaS) + '</div>';
    if (kelimeSonuc && kelimeSonuc.q === IL.ara && kelimeSonuc.rows.length && IL.tur === 'hepsi') h += '<div class="yp-ek-baslik">' + ic('kelime', 16) + 'Kelimelerde bulunanlar</div>' + kelimeTabloHTML(kelimeSonuc.rows);
    k.innerHTML = h;
  }
  function sayfalayici(n) {
    if (n <= 1) return '';
    const s = IL.sayfa; let h = '<div class="yp-sayfalar">';
    h += '<button type="button" ' + (s <= 1 ? 'disabled' : '') + ' onclick="ypIlSayfa(' + (s - 1) + ')" aria-label="Önceki">' + ic('siteye', 15) + '</button>';
    const g = []; for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - s) <= 1) g.push(i);
    let onceki = 0; g.forEach(i => { if (i - onceki > 1) h += '<span>…</span>'; h += '<button type="button" class="' + (i === s ? 'aktif' : '') + '" onclick="ypIlSayfa(' + i + ')">' + i + '</button>'; onceki = i; });
    h += '<button type="button" ' + (s >= n ? 'disabled' : '') + ' onclick="ypIlSayfa(' + (s + 1) + ')" aria-label="Sonraki">' + ic('sag', 15) + '</button></div>';
    return h;
  }
  function kelimeTabloHTML(rows) {
    return '<div class="yp-tablo-k"><table class="yp-tablo"><thead><tr><th>Tür</th><th>Kelime</th><th>Anlamı</th><th>Durum</th><th></th></tr></thead><tbody>' + rows.map(r =>
      '<tr><td><span class="yp-tur"><span class="yp-tur-ic r-gri">' + ic('kelime', 15) + '</span>Kelime</span></td><td class="yp-t-bas"><button type="button" class="yp-link" onclick="ypDuzenle(\'kelime\', \'' + esc(r.id) + '\')">' + esc(r.ru) + '</button></td>' +
      '<td class="yp-t-alt">' + esc(r.tr) + (r.level ? ' <span class="yp-sv">' + esc(r.level) + '</span>' : '') + (r.cat ? ' · ' + esc(r.cat) : '') + '</td>' +
      '<td><span class="yp-durum d-' + (r.active === false ? 'gri">Gizli' : 'yesil">Yayında') + '</span></td>' +
      '<td class="yp-t-is"><button type="button" class="yp-ikon-b" title="Düzenle" onclick="ypDuzenle(\'kelime\', \'' + esc(r.id) + '\')">' + ic('kalem', 16) + '</button></td></tr>').join('') + '</tbody></table></div>';
  }
  function kelimeTablo(k) {
    if (IL.ara.trim().length < 2) { k.innerHTML = '<div class="yp-bos">' + ic('kelime', 28) + '<b>' + (kelimeSay != null ? kelimeSay.toLocaleString('tr-TR') + ' kelime var.' : 'Kelime ara') + '</b><span>Aramak için en az iki harf yaz. Toplu işlemler için <button type="button" class="yp-link" onclick="ypGit(\'content\')">Kelimeler sayfasına</button> geç.</span></div>'; return; }
    if (!kelimeSonuc || kelimeSonuc.q !== IL.ara) { k.innerHTML = '<div class="admin-loading">Aranıyor...</div>'; return; }
    k.innerHTML = kelimeSonuc.rows.length ? kelimeTabloHTML(kelimeSonuc.rows) + '<div class="yp-alt"><span>' + kelimeSonuc.rows.length + ' sonuç (en fazla 40 gösterilir)</span></div>' : '<div class="yp-bos">' + ic('ara', 28) + '<b>Eşleşen kelime yok.</b></div>';
  }

  /* ---------- Genel Bakış panosu ---------- */
  let aralik = lsOku('yp_aralik', 7), ziyaretler = null, ziyaretYuk = null, bekleyen = null, sonSekme = 'hepsi';
  window.ypAralik = v => { aralik = +v; lsYaz('yp_aralik', aralik); panoCiz(); };
  // ziyaretler = { byDay: {gün: sayı}, sayfa: [yol, sayı] | null, konum: [ad, sayı] | null }
  async function ziyaretAl() {
    if (ziyaretler) return ziyaretler;
    if (!ziyaretYuk) ziyaretYuk = (async () => {
      try {   // hızlı yol: özet sunucuda hesaplanır (admin_ziyaret_ozet)
        const { data, error } = await sb.rpc('admin_ziyaret_ozet', { gun: 60 });
        if (!error && data && data.gunluk) { ziyaretler = { byDay: data.gunluk || {}, sayfa: data.sayfa || null, konum: data.konum || null }; return ziyaretler; }
      } catch (e) {}
      let rows = [];
      try { rows = typeof _visitData === 'function' ? await _visitData(30) : []; } catch (e) {}
      const byDay = {}, sy = {}, kn = {};
      rows.forEach(r => { const d = (r.created_at || '').slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; if (r.path) sy[r.path] = (sy[r.path] || 0) + 1; const k = r.city || r.country; if (k) kn[k] = (kn[k] || 0) + 1; });
      const enCok = m => Object.entries(m).sort((a, b) => b[1] - a[1])[0] || null;
      ziyaretler = { byDay, sayfa: enCok(sy), konum: enCok(kn) };
      return ziyaretler;
    })();
    return ziyaretYuk;
  }
  const gunAnahtar = d => d.toISOString().slice(0, 10);
  function gunler(n) { const a = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); a.push(gunAnahtar(d)); } return a; }
  function egri(vals, w, h, renk) {
    if (!vals.length) return '';
    const mx = Math.max(1, ...vals), mn = Math.min(...vals), r = Math.max(1, mx - mn);
    const pts = vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * w, h - 3 - ((v - mn) / r) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return '<svg class="yp-egri" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + renk + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function statKart(ikon, renk, deger, etiket, ekBilgi, egriHTML, tikla) {
    return '<button type="button" class="yp-stat"' + (tikla ? ' onclick="' + tikla + '"' : '') + '><div class="yp-stat-ust"><span class="yp-stat-ic r-' + renk + '">' + ic(ikon, 21) + '</span>' +
      '<div class="yp-stat-s">' + (ekBilgi || '') + (egriHTML || '') + '</div></div><div class="yp-stat-y"><b>' + deger + '</b><small>' + etiket + '</small></div></button>';
  }
  function guzelTavan(mx, n) {
    const ham = mx / n, us = Math.pow(10, Math.floor(Math.log10(ham))), o = ham / us;
    const adim = (o <= 1 ? 1 : o <= 2 ? 2 : o <= 2.5 ? 2.5 : o <= 5 ? 5 : 10) * us;
    return Math.max(n, Math.ceil(adim) * n);
  }
  function cubukGrafik(gunL, byDay) {
    const W = 560, H = 200, solB = 34, altB = 26, ustB = 10;
    const vals = gunL.map(k => byDay[k] || 0), mx = Math.max(4, ...vals);
    const cizgi = 4, tavan = guzelTavan(mx, cizgi);
    const gw = (W - solB - 8) / gunL.length, bw = Math.max(4, Math.min(38, gw * 0.55));
    let s = '<svg class="yp-cubuk" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Günlük ziyaret grafiği">';
    for (let i = 0; i <= cizgi; i++) { const v = Math.round(tavan / cizgi * i), y = H - altB - (H - altB - ustB) * i / cizgi; s += '<line x1="' + solB + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="yp-izgara"/><text x="' + (solB - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="yp-eks">' + v + '</text>'; }
    gunL.forEach((k, i) => {
      const v = byDay[k] || 0, bh = (H - altB - ustB) * v / tavan, x = solB + 4 + gw * i + (gw - bw) / 2, y = H - altB - bh;
      const d = new Date(k + 'T12:00:00'), et = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, bh).toFixed(1) + '" rx="3" class="yp-bar" data-t="' + esc(d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })) + '" data-v="' + v + '"/>';
      if (gunL.length <= 10 || i % Math.ceil(gunL.length / 8) === 0 || i === gunL.length - 1) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" class="yp-eks">' + et + '</text>';
    });
    return s + '</svg><div class="yp-ipucu" id="yp-ipucu"></div>';
  }
  function halka(parcalar, toplam) {
    const R = 52, C = 2 * Math.PI * R; let ofs = 0, s = '<svg viewBox="0 0 140 140" class="yp-halka" role="img" aria-label="Kullanıcı dağılımı"><circle cx="70" cy="70" r="' + R + '" class="yp-halka-z"/>';
    parcalar.forEach(p => { if (!p.n || !toplam) return; const l = C * p.n / toplam; s += '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + p.renk + '" stroke-width="16" stroke-dasharray="' + Math.max(0, l - (parcalar.filter(x => x.n).length > 1 ? 2 : 0)).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-ofs).toFixed(2) + '" transform="rotate(-90 70 70)"/>'; ofs += l; });
    return s + '<text x="70" y="70" text-anchor="middle" class="yp-halka-n">' + toplam + '</text><text x="70" y="89" text-anchor="middle" class="yp-halka-e">Kullanıcı</text></svg>';
  }
  function gruplanmisGrafik(veri, seriler) {
    const W = 520, H = 190, solB = 30, altB = 26, ustB = 8;
    const mods = Object.keys(veri).map(Number).sort((a, b) => a - b);
    if (!mods.length) return '<div class="yp-bos kucuk">Müfredata bağlı içerik henüz yok.</div>';
    const mx = Math.max(2, ...mods.map(m => Math.max(...seriler.map(s => veri[m][s.k] || 0))));
    const tavan = guzelTavan(mx, 4), gw = (W - solB - 6) / mods.length, bw = Math.min(mods.length < 3 ? 26 : 14, (gw * 0.6) / seriler.length);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="yp-cubuk" preserveAspectRatio="none" role="img" aria-label="Modül bazlı içerik sayıları">';
    for (let i = 0; i <= 4; i++) { const v = Math.round(tavan / 4 * i), y = H - altB - (H - altB - ustB) * i / 4; s += '<line x1="' + solB + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="yp-izgara"/><text x="' + (solB - 7) + '" y="' + (y + 4) + '" text-anchor="end" class="yp-eks">' + v + '</text>'; }
    mods.forEach((m, i) => {
      const x0 = solB + 3 + gw * i + (gw - bw * seriler.length) / 2;
      seriler.forEach((sr, j) => { const v = veri[m][sr.k] || 0, bh = (H - altB - ustB) * v / tavan; s += '<rect x="' + (x0 + j * bw).toFixed(1) + '" y="' + (H - altB - bh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(v ? 2 : 0, bh).toFixed(1) + '" rx="2" fill="' + sr.renk + '" class="yp-bar2" data-t="Modül ' + m + ' · ' + sr.ad + '" data-v="' + v + '"/>'; });
      s += '<text x="' + (solB + 3 + gw * i + gw / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" class="yp-eks">Modül ' + m + '</text>';
    });
    return s + '</svg>';
  }
  async function bekleyenAl() {
    const L = [];
    try {
      const { data } = await sb.from('support_tickets').select('id, subject, status, updated_at, user_id').order('updated_at', { ascending: false }).limit(30);
      (data || []).filter(t => t.status === 'open' || t.status === 'pending').forEach(t => {
        const anahtar = 'd:' + t.id + ':' + (t.updated_at || ''), okundu = OKU.d.includes(anahtar);
        L.push({ tur: 'destek', bildirim: true, anahtar, okundu, baslik: 'Destek talebi', alt: t.subject || '(konu yok)', zaman: t.updated_at,
          etiket: okundu ? ['Açık', 'gri'] : (t.status === 'pending' ? ['Beklemede', 'sari'] : ['Yeni', 'kirmizi']), git: "ypGit('support')" });
      });
    } catch (e) {}
    try {
      const gun = new Date(Date.now() - 86400000).toISOString();
      const { data } = await sb.from('error_log').select('id, message, created_at').order('created_at', { ascending: false }).limit(20);
      const son = (data || []).filter(e => e.created_at >= gun && (!OKU.h || e.created_at > OKU.h));
      if (son.length) L.push({ tur: 'hata', bildirim: true, anahtar: 'h:' + son[0].created_at, okundu: false, baslik: son.length + ' yeni hata kaydı', alt: son[0].message || '', zaman: son[0].created_at, etiket: ['Yeni', 'kirmizi'], git: "ypGit('errors')" });
    } catch (e) {}
    bekleyenSun = L;
    return bekleyenHesapla();
  }
  let bekleyenSun = null;   // sunucudan gelen bildirimler (destek, hata)
  function bekleyenHesapla() {
    const L = (bekleyenSun || []).filter(b => !(b.tur === 'hata' && b.okundu));
    (IX || []).filter(x => x.kontrol).forEach(x => L.push({ tur: 'kontrol', baslik: TUR[x.tur].ad + ' kontrol bekliyor', alt: x.baslik + ' · ' + x.kontrol + ' etkinlik', zaman: x.tarih, etiket: ['Kontrol', 'turuncu'], git: "ypDuzenle('" + x.tur + "', '" + x.id + "')" }));
    (IX || []).filter(x => x.tur === 'unite' && x.durum === 'taslak').forEach(x => L.push({ tur: 'taslak', baslik: 'Taslak ünite', alt: x.alt + ' · ' + x.baslik, zaman: x.tarih, etiket: ['Taslak', 'sari'], git: "ypDuzenle('unite', '" + x.id + "')" }));
    bekleyen = L;
    zilGuncelle();
    return L;
  }
  /* Bildirim okundu bilgisi (bu tarayıcıda tutulur): d = görülen destek talepleri, h = en son görülen hata zamanı */
  const OKU = Object.assign({ d: [], h: '' }, lsOku('yp_okundu', {}));
  function okunduYaz() { OKU.d = OKU.d.slice(-300); lsYaz('yp_okundu', OKU); }
  function okunduIsaretle(b) {
    if (!b || !b.bildirim) return;
    if (b.tur === 'destek' && !OKU.d.includes(b.anahtar)) OKU.d.push(b.anahtar);
    if (b.tur === 'hata') OKU.h = b.anahtar.slice(2);
    b.okundu = true; okunduYaz();
  }
  function ypOkundu(i, e) {
    if (e) e.stopPropagation();
    const L = bekleyen || [];
    if (i === 'hepsi') L.filter(b => b.bildirim && !b.okundu).forEach(okunduIsaretle); else okunduIsaretle(L[i]);
    if (L[i] && L[i].tur === 'destek') L[i].etiket = ['Açık', 'gri'];
    bekleyen = L.filter(b => !(b.tur === 'hata' && b.okundu));
    zilGuncelle(); const p = $('yp-zil-p'); if (p && p.classList.contains('acik')) bekleyenCiz(p, true);
    const d = $('yp-bek-l'); if (d) bekleyenCiz(d, false);
  }
  function ypBekGit(i) { const b = (bekleyen || [])[i]; if (!b) return; okunduIsaretle(b); ypKapatHepsi(); zilGuncelle(); (new Function(b.git))(); }
  window.ypOkundu = ypOkundu; window.ypBekGit = ypBekGit;
  function zilGuncelle() {
    const n = (bekleyen || []).filter(b => b.bildirim && !b.okundu).length, z = $('yp-zil-say');
    if (z) { z.textContent = n > 9 ? '9+' : (n || ''); z.classList.toggle('gor', n > 0); }
    rozetler();
  }
  function rozetler() {
    const destek = (bekleyen || []).filter(b => b.tur === 'destek').length;
    const kontrol = (IX || []).filter(x => x.kontrol || (x.tur === 'unite' && x.durum === 'taslak'));
    const yaz = (k, n) => { const el = document.querySelector('.yp-rozet[data-r="' + k + '"]'); if (el) { el.textContent = n || ''; el.classList.toggle('gor', !!n); } };
    yaz('support', destek);
    yaz('icerik-unite', kontrol.filter(x => x.tur === 'unite').length);
    yaz('icerik-set', kontrol.filter(x => x.tur === 'set').length);
  }
  function bekleyenCiz(kutu, acilir) {
    const L = bekleyen;
    if (!L) { kutu.innerHTML = '<div class="admin-loading">Yükleniyor...</div>'; bekleyenAl().then(() => bekleyenCiz(kutu, acilir)); return; }
    const ikonu = { destek: ['destek', 'kirmizi'], hata: ['hata', 'kirmizi'], kontrol: ['bilgi', 'turuncu'], taslak: ['not', 'sari'] };
    const satir = (b) => { const i = L.indexOf(b);
      return '<div class="yp-bek' + (b.okundu ? ' okundu' : '') + '" role="button" tabindex="0" onclick="ypBekGit(' + i + ')"><span class="yp-bek-ic r-' + ikonu[b.tur][1] + '">' + ic(ikonu[b.tur][0], 17) + '</span><div><b>' + esc(b.baslik) + '</b><span>' + esc(b.alt) + '</span><small>' + onceKadar(b.zaman) + '</small></div>' +
        '<div class="yp-bek-sag"><em class="yp-durum d-' + b.etiket[1] + '">' + b.etiket[0] + '</em>' + (acilir && b.bildirim && !b.okundu ? '<button type="button" class="yp-okundu-b" title="Okundu say" aria-label="Okundu say" onclick="ypOkundu(' + i + ', event)">' + ic('onay', 16) + '</button>' : '') + '</div></div>'; };
    if (acilir) {   // zil: yalnız bildirimler (destek talepleri ve hata kayıtları)
      const yeni = L.filter(b => b.bildirim && !b.okundu), eski = L.filter(b => b.bildirim && b.okundu);
      kutu.innerHTML = '<div class="yp-acilir-bas"><span>Bildirimler</span>' + (yeni.length ? '<button type="button" class="yp-link" onclick="ypOkundu(\'hepsi\', event)">Tümünü okundu say</button>' : '') + '</div>' +
        (yeni.length ? yeni.map(satir).join('') : '<div class="yp-bos kucuk">' + ic('onay', 24) + '<span>Yeni bildirim yok.</span></div>') +
        (eski.length ? '<div class="yp-acilir-alt">Görülen, hâlâ açık talepler</div>' + eski.slice(0, 5).map(satir).join('') : '');
      return;
    }
    const liste = L.slice(0, 4);
    kutu.innerHTML = liste.length ? liste.map(satir).join('') : '<div class="yp-bos kucuk">' + ic('onay', 24) + '<span>Bekleyen iş yok.</span></div>';
  }
  let aksiyonlar = null;
  async function aksiyonAl() {
    try { const { data } = await sb.from('action_log').select('action, actor_id, target, created_at').order('created_at', { ascending: false }).limit(10); aksiyonlar = data || []; }
    catch (e) { aksiyonlar = []; }
    return aksiyonlar;
  }
  function aktiviteHesapla() {
    const L = [];
    (IX || []).forEach(x => { if (x.tarih) L.push({ ic: TUR[x.tur].ic, renk: TUR[x.tur].renk, baslik: TUR[x.tur].ad + (x.tur === 'unite' || x.tur === 'set' ? ' güncellendi' : ' eklendi'), alt: x.baslik, zaman: x.tarih, git: "ypDuzenle('" + x.tur + "', '" + x.id + "')" }); });
    const kul = gl('_adminUsers') || [];
    kul.forEach(u => { if (u.created_at) L.push({ ic: 'kullanici', renk: 'yesil', baslik: 'Yeni kullanıcı', alt: u.display_name || (u.email || '').split('@')[0], zaman: u.created_at, git: "ypGit('users')" }); });
    {
      const data = aksiyonlar || [];
      const AD = { rol_degistir: 'Rol değiştirildi', ogrenci_ata: 'Öğrenci atandı', ogrenci_atama_kaldir: 'Öğrenci ataması kaldırıldı', premium_tanim: 'Premium tanımlandı', ticket_mail: 'Talep maili gönderildi', bildirim: 'Bildirim gönderildi', kullanici_sil: 'Kullanıcı silindi' };
      const kim = id => { const u = kul.find(x => x.id === id); return u ? (u.display_name || (u.email || '').split('@')[0]) : ''; };
      data.forEach(r => L.push({ ic: 'log', renk: 'mavi', baslik: AD[r.action] || r.action, alt: [kim(r.actor_id), r.target ? '→ ' + kim(r.target) : ''].filter(Boolean).join(' '), zaman: r.created_at, git: "ypGit('stafflog')" }));
    }
    L.sort((a, b) => new Date(b.zaman) - new Date(a.zaman));
    return L.slice(0, 6);
  }
  window.ypSonSekme = t => { sonSekme = t; sonCiz(); };
  function sonCiz() {
    const k = $('yp-son'); if (!k || !IX) return;
    const L = IX.filter(x => (sonSekme === 'hepsi' || x.tur === sonSekme) && x.tarih).sort((a, b) => new Date(b.tarih) - new Date(a.tarih)).slice(0, 6);
    const sek = [['hepsi', 'Tümü']].concat(TUR_SIRA.filter(t => t !== 'kelime').map(t => [t, TUR[t].kisa]));
    k.innerHTML = '<div class="yp-sekmeler kucuk">' + sek.map(s => '<button type="button" class="yp-sekme' + (sonSekme === s[0] ? ' aktif' : '') + '" onclick="ypSonSekme(\'' + s[0] + '\')">' + s[1] + '</button>').join('') + '</div>' +
      (L.length ? '<div class="yp-tablo-k"><table class="yp-tablo"><thead><tr><th>Tür</th><th>Başlık</th><th>Müfredat / Konu</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' + L.map(x => satirHTML(x)).join('') + '</tbody></table></div>'
        : '<div class="yp-bos kucuk"><span>Bu türde içerik yok.</span></div>');
  }
  let panoT = null;
  function panoCiz() {   // eldeki veriyle hemen çizer; eksik parçalar geldikçe yeniden çizer
    panoYaz();
    const isler = [];
    if (!IX) isler.push(icerikYukle());
    if (!ziyaretler) isler.push(ziyaretAl());
    if (!bekleyenSun) isler.push(bekleyenAl());
    if (!aksiyonlar) isler.push(aksiyonAl());
    isler.forEach(p => Promise.resolve(p).then(() => { clearTimeout(panoT); panoT = setTimeout(() => { if (aktifGor === 'overview') panoYaz(); }, 80); }, () => {}));
  }
  function panoYaz() {
    const k = $('yp-pano'); if (!k) return;
    const yuk = '<div class="yp-yuk"><span></span><span></span><span></span></div>';
    const zv = ziyaretler, aktiviteler = aktiviteHesapla();
    const kul = gl('_adminUsers') || [];
    const top = kul.length, prem = kul.filter(u => u.plan === 'premium' && !u.is_admin).length, adm = kul.filter(u => u.is_admin).length;
    const g = gunler(aralik), g14 = gunler(14);
    const byDay = (zv && zv.byDay) || {};
    const zToplam = g.reduce((a, d) => a + (byDay[d] || 0), 0);
    const oncekiG = []; for (let i = aralik * 2 - 1; i >= aralik; i--) { const d = new Date(); d.setDate(d.getDate() - i); oncekiG.push(gunAnahtar(d)); }
    const zOnceki = oncekiG.reduce((a, d) => a + (byDay[d] || 0), 0);
    const yuzde = (yeni, eski) => eski > 0 ? Math.round((yeni - eski) / eski * 100) : null;
    const zDeg = aralik <= 15 ? yuzde(zToplam, zOnceki) : null;
    const kulGun = {}; kul.forEach(u => { const d = (u.created_at || '').slice(0, 10); kulGun[d] = (kulGun[d] || 0) + 1; });
    const yeniKul = g.reduce((a, d) => a + (kulGun[d] || 0), 0);
    let kum = top - g14.reduce((a, d) => a + (kulGun[d] || 0), 0); const kulEgri = g14.map(d => (kum += (kulGun[d] || 0)));
    const premEgri = g14.map(d => kul.filter(u => u.plan === 'premium' && !u.is_admin && (u.created_at || '').slice(0, 10) <= d).length);
    const degisim = (n, son) => n == null ? '<span class="yp-deg">' + son + '</span>' : '<span class="yp-deg ' + (n > 0 ? 'art' : n < 0 ? 'azl' : '') + '">' + (n > 0 ? '+' : '') + n + '%' + '</span>';
    const sayfaAd = { home: 'Ana Sayfa', words: 'Kelimeler', works: 'Çalışmalar', quiz: 'Testler', grammarworks: 'Gramer Çalışmaları', grammar: 'Gramer', review: 'Tekrar', video: 'Videolar', pricing: 'Fiyatlar', profile: 'Profil', admin: 'Yönetim', placement: 'Seviye Sınavı', learn: 'Eğitim', ekitap: 'E-Kitap' };
    const z30 = gunler(30).reduce((a, d) => a + (byDay[d] || 0), 0), bugun = byDay[gunAnahtar(new Date())] || 0;
    const ustSayfa = zv && zv.sayfa, ustSehir = zv && zv.konum;
    const modVeri = {};
    (IX || []).forEach(x => { if (!x.modul) return; const m = modVeri[x.modul] = modVeri[x.modul] || { unite: 0, ders: 0, video: 0, set: 0 };
      if (x.tur === 'unite') { m.unite++; m.ders += x.ders || 0; } else if (x.tur === 'video') m.video++; else if (x.tur === 'set') m.set++; });
    const seriler = [{ k: 'unite', ad: 'Ünite', renk: '#2563eb' }, { k: 'ders', ad: 'Ders', renk: '#e0b24f' }, { k: 'video', ad: 'Video', renk: '#dc5a5a' }, { k: 'set', ad: 'Çalışma seti', renk: '#8b5cf6' }];
    const hizli = [['unite', 'Yeni e-kitap ünitesi', 'kitap'], ['video', 'Yeni video', 'video'], ['set', 'Yeni çalışma seti', 'set'], ['ozet', 'Yeni özet notu', 'not'], ['kelime', 'Yeni kelime', 'kelime'], ['bildirim', 'Bildirim gönder', 'bildirim']];

    k.innerHTML = '<div class="yp-pano-iz">' +
      '<div class="yp-pano-ana">' +
      '<div class="yp-statlar">' +
      statKart('kullanici', 'mavi', top, 'Toplam kullanıcı', degisim(null, yeniKul ? '+' + yeniKul + ' yeni' : ''), egri(kulEgri, 70, 26, '#3b82f6'), "ypGit('users')") +
      statKart('tac', 'altin', prem, 'Premium üye', '', egri(premEgri, 70, 26, '#d4a43c'), "ypGit('users')") +
      statKart('kullanicilar', 'mavi', adm, 'Yönetici', '', '', "ypGit('users')") +
      statKart('ziyaret', 'kirmizi', zv ? zToplam.toLocaleString('tr-TR') : '…', 'Son ' + aralik + ' gün ziyaret', zv ? degisim(zDeg, '') : '', zv ? egri(g.map(d => byDay[d] || 0), 70, 26, '#16a34a') : '', "ypGit('visits')") +
      '</div>' +
      '<div class="yp-izgara2">' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Son ' + aralik + ' Gün Ziyaret</h3><span class="yp-kart-not">' + (zv ? zToplam.toLocaleString('tr-TR') + ' sayfa görüntüleme' : '') + '</span></div><div class="yp-grafik-k">' + (zv ? cubukGrafik(g, byDay) : yuk) + '</div></section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Kullanıcı Dağılımı</h3></div><div class="yp-dagilim">' +
      halka([{ n: top - prem - adm, renk: '#3b82f6' }, { n: prem, renk: '#e0a93a' }, { n: adm, renk: '#e879b9' }], top) +
      '<ul>' + [['Ücretsiz', top - prem - adm, '#3b82f6'], ['Premium', prem, '#e0a93a'], ['Yönetici', adm, '#e879b9']].map(x => '<li><i style="background:' + x[2] + '"></i><span>' + x[0] + '</span><b>' + x[1] + '</b><small>(%' + (top ? Math.round(x[1] / top * 100) : 0) + ')</small></li>').join('') + '</ul></div></section>' +
      '</div>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('liste', 18) + 'Son Eklenen İçerikler</h3><button type="button" class="yp-link" onclick="ypGit(\'icerikler\')">Tümünü gör' + ic('okSag', 15) + '</button></div><div id="yp-son">' + (IX ? '' : yuk) + '</div></section>' +
      '<div class="yp-izgara2 esit">' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Modül Bazlı İçerik</h3><div class="yp-lejant">' + seriler.map(s => '<span><i style="background:' + s.renk + '"></i>' + s.ad + '</span>').join('') + '</div></div><div class="yp-grafik-k">' + (IX ? gruplanmisGrafik(modVeri, seriler) : yuk) + '</div></section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Site Performansı</h3><span class="yp-kart-not">son 30 gün</span></div>' + (!zv ? yuk : '<div class="yp-perf">') + (!zv ? '' :
      '<div class="yp-perf-k"><span class="yp-stat-ic r-mavi">' + ic('kullanicilar', 20) + '</span><div><b>' + z30.toLocaleString('tr-TR') + '</b><small>Sayfa görüntüleme</small></div>' + egri(gunler(30).map(d => byDay[d] || 0), 64, 24, '#3b82f6') + '</div>' +
      '<div class="yp-perf-k"><span class="yp-stat-ic r-yesil">' + ic('grafik', 20) + '</span><div><b>' + bugun + '</b><small>Bugün</small></div></div>' +
      '<div class="yp-perf-k"><span class="yp-stat-ic r-altin">' + ic('liste', 20) + '</span><div><b class="kucuk">' + esc(ustSayfa ? (sayfaAd[ustSayfa[0]] || ustSayfa[0]) : '—') + '</b><small>En çok bakılan sayfa' + (ustSayfa ? ' · ' + ustSayfa[1] : '') + '</small></div></div>' +
      '<div class="yp-perf-k"><span class="yp-stat-ic r-mor">' + ic('dunya', 20) + '</span><div><b class="kucuk">' + esc(ustSehir ? ustSehir[0] : '—') + '</b><small>En çok gelen konum' + (ustSehir ? ' · ' + ustSehir[1] : '') + '</small></div></div>' +
      '</div>') + '</section></div>' +
      '</div>' +
      '<aside class="yp-pano-yan">' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Hızlı İşlemler</h3></div><div class="yp-hizli">' + hizli.map(h => '<button type="button" onclick="' + (h[0] === 'bildirim' ? "ypGit('notify')" : "ypYeni('" + h[0] + "')") + '">' + ic(h[2], 22) + '<span>' + h[1] + '</span></button>').join('') + '</div></section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Bekleyen İşlemler</h3><button type="button" class="yp-link" onclick="ypGit(\'support\')">Destek</button></div><div id="yp-bek-l"></div></section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>Son Aktiviteler</h3></div><div class="yp-akt">' + (!aksiyonlar && !IX ? yuk : (aktiviteler || []).length ? aktiviteler.map(a =>
        '<button type="button" class="yp-akt-s" onclick="' + a.git + '"><span class="yp-akt-n r-' + a.renk + '">' + ic(a.ic, 15) + '</span><div><b>' + esc(a.baslik) + '</b><span>' + esc(a.alt) + '</span><small>' + onceKadar(a.zaman) + '</small></div></button>').join('') : '<div class="yp-bos kucuk"><span>Henüz aktivite yok.</span></div>') + '</div></section>' +
      '</aside></div>';
    sonCiz();
    const bl = $('yp-bek-l'); if (bl) { if (bekleyen) bekleyenCiz(bl, false); else bl.innerHTML = yuk; }
    ipucuBagla(k);
  }
  function ipucuBagla(k) {
    k.querySelectorAll('.yp-grafik-k').forEach(g => {
      const tip = document.createElement('div'); tip.className = 'yp-ipucu'; g.appendChild(tip);
      g.addEventListener('mousemove', e => {
        const b = e.target.closest('.yp-bar, .yp-bar2');
        if (!b) { tip.classList.remove('gor'); return; }
        const r = g.getBoundingClientRect(), br = b.getBoundingClientRect();
        tip.innerHTML = '<small>' + b.dataset.t + '</small><b>' + b.dataset.v + (b.classList.contains('yp-bar') ? ' ziyaret' : '') + '</b>';
        tip.style.left = (br.left - r.left + br.width / 2) + 'px'; tip.style.top = (br.top - r.top) + 'px'; tip.classList.add('gor');
      });
      g.addEventListener('mouseleave', () => tip.classList.remove('gor'));
    });
  }
  window.ypRaporIndir = async function () {
    await Promise.all([icerikYukle(), ziyaretAl()]);
    const kul = gl('_adminUsers') || [], byDay = (ziyaretler && ziyaretler.byDay) || {};
    const satir = [['Bölüm', 'Ölçüt', 'Değer'], ['Kullanıcılar', 'Toplam', kul.length], ['Kullanıcılar', 'Premium', kul.filter(u => u.plan === 'premium' && !u.is_admin).length], ['Kullanıcılar', 'Yönetici', kul.filter(u => u.is_admin).length]];
    TUR_SIRA.forEach(t => satir.push(['İçerik', TUR[t].ad, t === 'kelime' ? (kelimeSay == null ? '' : kelimeSay) : IX.filter(x => x.tur === t).length]));
    gunler(30).forEach(d => satir.push(['Ziyaret', d, byDay[d] || 0]));
    const csv = '﻿' + satir.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'yonetim-raporu-' + gunAnahtar(new Date()) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- Kelime veritabanını indir (CSV / Excel) ---------- */
  const KEL_ONCE = ['id', 'ru', 'tr', 'level', 'cat', 'cinsiyet', 'tip', 'padej'];
  const KEL_SON = ['premium', 'active', 'created_at', 'updated_at'];
  function kolonlar(rows) {
    const set = new Set(); rows.forEach(r => Object.keys(r).forEach(k => set.add(k)));
    const on = KEL_ONCE.filter(k => set.has(k)), son = KEL_SON.filter(k => set.has(k));
    const orta = [...set].filter(k => !on.includes(k) && !son.includes(k)).sort();
    return on.concat(orta, son);
  }
  const hucre = v => v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
  function csvYap(rows) {
    const k = kolonlar(rows);
    const q = v => { const x = String(hucre(v)); return /[";\r\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    return '\ufeff' + [k.join(';')].concat(rows.map(r => k.map(c => q(r[c])).join(';'))).join('\r\n');
  }
  // Basit .xlsx üretici (dış kütüphane yok): sıkıştırmasız zip + satır içi metin hücreleri
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipYap(dosyalar) {
    const enc = new TextEncoder(), parcalar = [], merkez = []; let ofs = 0;
    dosyalar.forEach(([ad, icerik]) => {
      const a = enc.encode(ad), d = typeof icerik === 'string' ? enc.encode(icerik) : icerik, c = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, a.length, true);
      parcalar.push(new Uint8Array(h.buffer), a, d);
      const m = new DataView(new ArrayBuffer(46));
      m.setUint32(0, 0x02014b50, true); m.setUint16(4, 20, true); m.setUint16(6, 20, true); m.setUint16(8, 0x0800, true);
      m.setUint32(16, c, true); m.setUint32(20, d.length, true); m.setUint32(24, d.length, true); m.setUint16(28, a.length, true); m.setUint32(42, ofs, true);
      merkez.push(new Uint8Array(m.buffer), a);
      ofs += 30 + a.length + d.length;
    });
    const mBoy = merkez.reduce((t, x) => t + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, dosyalar.length, true); e.setUint16(10, dosyalar.length, true); e.setUint32(12, mBoy, true); e.setUint32(16, ofs, true);
    return new Blob(parcalar.concat(merkez, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xe = v => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function sutunAd(i) { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sayfaXml(rows) {
    const k = kolonlar(rows);
    const satir = (vals, n, baslik) => '<row r="' + n + '">' + vals.map((v, i) => {
      const ref = sutunAd(i) + n, x = hucre(v);
      if (x === '') return '';
      if (typeof x === 'number' && isFinite(x)) return '<c r="' + ref + '"' + (baslik ? ' s="1"' : '') + '><v>' + x + '</v></c>';
      if (typeof x === 'boolean') return '<c r="' + ref + '" t="b"><v>' + (x ? 1 : 0) + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + (baslik ? ' s="1"' : '') + '><is><t xml:space="preserve">' + xe(x) + '</t></is></c>';
    }).join('') + '</row>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + k.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c === 'ru' || c === 'tr' ? 28 : c.length > 10 || /ornek|not|aciklama|example/i.test(c) ? 36 : 14) + '" customWidth="1"/>').join('') + '</cols>' +
      '<sheetData>' + satir(k, 1, true) + rows.map((r, i) => satir(k.map(c => r[c]), i + 2)).join('') + '</sheetData>' +
      (rows.length ? '<autoFilter ref="A1:' + sutunAd(k.length - 1) + (rows.length + 1) + '"/>' : '') + '</worksheet>';
  }
  function xlsxYap(sayfalar) {
    const W = 'http://schemas.openxmlformats.org/', d = [];
    d.push(['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="' + W + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sayfalar.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>']);
    d.push(['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + W + 'package/2006/relationships"><Relationship Id="rId1" Type="' + W + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    d.push(['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="' + W + 'spreadsheetml/2006/main" xmlns:r="' + W + 'officeDocument/2006/relationships"><sheets>' +
      sayfalar.map((s, i) => '<sheet name="' + xe(s.ad.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>']);
    d.push(['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + W + 'package/2006/relationships">' +
      sayfalar.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + W + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (sayfalar.length + 1) + '" Type="' + W + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>']);
    d.push(['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="' + W + 'spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']);
    sayfalar.forEach((s, i) => d.push(['xl/worksheets/sheet' + (i + 1) + '.xml', sayfaXml(s.rows)]));
    return zipYap(d);
  }
  function indirBlob(blob, ad) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  async function ypKelimeIndir(tur) {
    const btn = $(tur === 'csv' ? 'yp-kel-csv' : 'yp-kel-xlsx'), eski = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = ic('kumsaati', 16) + 'Hazırlanıyor…'; }
    try {
      if (typeof sbFetchAll !== 'function') throw new Error('yok');
      const kelimeler = await sbFetchAll('content_words', 'ru');
      const tarih = gunAnahtar(new Date());
      if (tur === 'csv') indirBlob(new Blob([csvYap(kelimeler)], { type: 'text/csv;charset=utf-8' }), 'kelimeler-' + tarih + '.csv');
      else {
        const sayfalar = [{ ad: 'Kelimeler', rows: kelimeler }];
        for (const [tablo, ad] of [['content_synonyms', 'Eş anlamlılar'], ['content_antonyms', 'Zıt anlamlılar'], ['content_families', 'Kelime aileleri']]) {
          try { const r = await sbFetchAll(tablo, null); if (r && r.length) sayfalar.push({ ad, rows: r }); } catch (e) {}
        }
        indirBlob(xlsxYap(sayfalar), 'kelimeler-' + tarih + '.xlsx');
      }
      if (typeof toast === 'function') toast(kelimeler.length.toLocaleString('tr-TR') + ' kelime indirildi.');
    } catch (e) {
      if (typeof uiAlert === 'function') uiAlert('Kelimeler indirilemedi. Bağlantını kontrol edip tekrar dene.'); 
    } finally { if (btn) { btn.disabled = false; btn.innerHTML = eski; } }
  }
  window.ypKelimeIndir = ypKelimeIndir;

  /* ---------- Üst bar araması ---------- */
  let araSecili = 0, araSonuc = [];
  function araCiz() {
    const kutu = $('yp-ara-son'), q = ($('yp-ara-in').value || '').trim().toLocaleLowerCase('tr');
    if (!q) { kutu.classList.remove('acik'); return; }
    const S = [];
    MENU.forEach(g => g.items.forEach(([v, ad, ikon, alt]) => { if (ad.toLocaleLowerCase('tr').includes(q)) S.push({ ic: ikon, b: ad, a: 'Sayfa', git: () => ypGit(v, alt) }); }));
    (IX || []).filter(x => x.araMetin.includes(q)).slice(0, 7).forEach(x => S.push({ ic: TUR[x.tur].ic, b: x.baslik, a: TUR[x.tur].ad + (x.alt ? ' · ' + x.alt : ''), git: () => ypDuzenle(x.tur, x.id) }));
    (gl('_adminUsers') || []).filter(u => ((u.display_name || '') + ' ' + (u.email || '')).toLocaleLowerCase('tr').includes(q)).slice(0, 4)
      .forEach(u => S.push({ ic: 'kullanici', b: u.display_name || u.email, a: 'Kullanıcı · ' + (u.email || ''), git: () => { ypGit('users'); setTimeout(() => { const s = $('admin-search'); if (s) { s.value = u.email || u.display_name || ''; if (typeof filterAdminUsers === 'function') filterAdminUsers(s.value); } }, 120); } }));
    araSonuc = S; araSecili = 0;
    kutu.innerHTML = S.length ? S.map((s, i) => '<button type="button" class="yp-ara-s' + (i === 0 ? ' sec' : '') + '" data-i="' + i + '">' + ic(s.ic, 16) + '<div><b>' + esc(s.b) + '</b><small>' + esc(s.a) + '</small></div></button>').join('')
      : '<div class="yp-bos kucuk"><span>' + (IX ? 'Sonuç yok.' : 'İçerikler yükleniyor…') + '</span></div>';
    kutu.querySelectorAll('.yp-ara-s').forEach(b => b.onmousedown = e => { e.preventDefault(); araSec(+b.dataset.i); });
    kutu.classList.add('acik');
  }
  function araSec(i) { const s = araSonuc[i]; if (!s) return; $('yp-ara-in').value = ''; $('yp-ara-son').classList.remove('acik'); $('yp-ara-in').blur(); s.git(); }
  function araTus(e) {
    const kutu = $('yp-ara-son'); if (!kutu.classList.contains('acik')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); araSecili = Math.max(0, Math.min(araSonuc.length - 1, araSecili + (e.key === 'ArrowDown' ? 1 : -1))); kutu.querySelectorAll('.yp-ara-s').forEach((b, i) => b.classList.toggle('sec', i === araSecili)); }
    else if (e.key === 'Enter') { e.preventDefault(); araSec(araSecili); }
    else if (e.key === 'Escape') { kutu.classList.remove('acik'); }
  }

  /* ---------- Emoji → ikon ---------- */
  const EMO = {
    '📊': 'grafik', '📈': 'ziyaret', '📉': 'grafik', '👥': 'kullanicilar', '👤': 'kullanici', '🙋': 'kullanici', '🧑‍🏫': 'ogretmen', '👩‍🏫': 'ogretmen', '🎓': 'ogretmen', '🏫': 'kurum',
    '📚': 'kitap', '📖': 'kitap', '📕': 'kitap', '🔔': 'bildirim', '💬': 'destek', '📨': 'mail', '✉️': 'mail', '📧': 'mail', '📩': 'mail', '📥': 'indir', '📤': 'yukle', '🧩': 'soru', '❓': 'soru',
    '🎬': 'video', '📺': 'video', '⭐': 'yildiz', '🌟': 'yildiz', '⚙️': 'ayar', '🎛️': 'surgu', '🎚️': 'surgu', '💾': 'kaydet', '🧾': 'log', '🛠️': 'hata', '🔧': 'ayar', '🧰': 'ayar',
    '👑': 'tac', '🗑️': 'cop', '✏️': 'kalem', '🖋️': 'kalem', '✍️': 'kalem', '📝': 'not', '📄': 'not', '📜': 'not', '📋': 'liste', '📌': 'pin', '📍': 'pin', '🔗': 'link', '📎': 'link',
    '✅': 'onay', '☑️': 'onay', '✔️': 'onay', '✔': 'onay', '❌': 'carpi', '✖️': 'carpi', '🚫': 'carpi', '⚠️': 'hata', '🚧': 'hata', '🔴': 'nokta', '🟢': 'nokta', '🟡': 'nokta',
    '🔍': 'ara', '🔎': 'ara', '🔬': 'ara', '➕': 'arti', '🔁': 'yenile', '🔄': 'yenile', '↩️': 'geri', '↺': 'yenile', '⬇️': 'indir', '⬆️': 'yukle', '⏫': 'yukari2', '⏬': 'asagi2', '🔼': 'yukari', '🔽': 'asagi',
    '🔊': 'ses', '🎙️': 'mikrofon', '🎤': 'mikrofon', '🎧': 'ses', '🖼️': 'resim', '📸': 'resim', '🎨': 'resim', '📁': 'klasor', '📦': 'paket', '🗓️': 'takvim', '📅': 'takvim', '⏱️': 'saat', '🕐': 'saat', '⏳': 'kumsaati',
    '🔑': 'anahtar', '🔒': 'kilit', '🛡️': 'yonetim', '🎁': 'hediye', '🎯': 'hedef', '🏁': 'bayrak', '🏆': 'kupa', '🥇': 'kupa', '🏅': 'kupa', '🔥': 'ates', '💡': 'ampul', '🧠': 'beyin', '🧹': 'sihir', '🎉': 'sihir',
    '🔤': 'kelime', '🌐': 'dunya', '📱': 'telefon', '💻': 'telefon', '📢': 'bildirim', '🛟': 'destek', '🎫': 'etiket', '🔖': 'etiket', '👁️': 'goz', '🧪': 'hazirlik', '📐': 'liste', '🃏': 'kart', '🆓': 'etiket'
  };
  const SIL = new Set(['👋', '🙂', '🙏', '💙', '🌸', '👍', '👎', '👏', '💪', '🚀', '💯', '💎', '🌿', '❄️', '🌤️', '💤', '⚡', '🎮', '👈', '☕', '🍅', '😊', '🤝']);
  const EMO_RE = /(?:[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Extended_Pictographic})(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}️?)*)/gu;
  const KORU = new Set(['©', '®', '™', '↔', '↕', '‼', '⁉', '▶', '◀', '☰', '★', '☆']);
  const ATLA = 'script, style, textarea, input, select, [contenteditable="true"], [contenteditable=""], .sup-bubble, .sm-body, .oz-row-b, #ek-adm-preview, .ek-on, .ic-k, code, pre, .yp-svg';
  function emojiDegistir(metin) {
    let degisti = false;
    const out = metin.replace(EMO_RE, m => {
      if (KORU.has(m) || KORU.has(m.replace(/️/g, ''))) return m;
      degisti = true;
      const temiz = m.replace(/️/g, '');
      if (/^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(m)) { const kod = String.fromCharCode(...[...m].map(c => c.codePointAt(0) - 0x1F1E6 + 65)); return '\u0000B' + kod + '\u0000'; }
      const ad = EMO[m] || EMO[temiz] || EMO[temiz + '️'];
      if (ad) return '\u0000I' + ad + '\u0000';
      return '';
    });
    return degisti ? out : null;
  }
  function dugumIsle(t) {
    if (!t.nodeValue || !EMO_RE.test(t.nodeValue)) { EMO_RE.lastIndex = 0; return; }
    EMO_RE.lastIndex = 0;
    const p = t.parentElement; if (!p) return;
    if (p.tagName === 'OPTION' || p.tagName === 'OPTGROUP') { const y = emojiDegistir(t.nodeValue); if (y != null) t.nodeValue = y.replace(/\u0000[IB][^\u0000]*\u0000\s?/g, '').replace(/^\s+/, ''); return; }
    if (p.closest(ATLA)) return;
    const y = emojiDegistir(t.nodeValue); if (y == null) return;
    const parca = y.split('\u0000'), frag = document.createDocumentFragment();
    let ikonOnce = false;
    parca.forEach((s, i) => {
      if (i % 2 === 1) {   // tek sıradakiler işaret: I<ikon> ya da B<dil kodu>
        if (s[0] === 'I' && P[s.slice(1)]) { const sp = document.createElement('span'); sp.className = 'yi'; sp.innerHTML = ic(s.slice(1), 16); frag.appendChild(sp); ikonOnce = true; }
        else if (s[0] === 'B') { const sp = document.createElement('span'); sp.className = 'yi-dil'; sp.textContent = s.slice(1); frag.appendChild(sp); ikonOnce = true; }
        return;
      }
      if (!s) return;
      frag.appendChild(document.createTextNode(ikonOnce ? s.replace(/^ /, '') : s)); ikonOnce = false;
    });
    t.parentNode.replaceChild(frag, t);
  }
  function ozellikIsle(el) {
    ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute && el.getAttribute(a); if (v && EMO_RE.test(v)) { EMO_RE.lastIndex = 0; const y = emojiDegistir(v); if (y != null) el.setAttribute(a, y.replace(/\u0000[IB][^\u0000]*\u0000\s?/g, '').trim()); } EMO_RE.lastIndex = 0; });
  }
  function agacIsle(kok) {
    if (!kok) return;
    if (kok.nodeType === 3) return dugumIsle(kok);
    if (kok.nodeType !== 1) return;
    if (kok.closest && kok.closest(ATLA) && !kok.matches('input, textarea')) return;
    ozellikIsle(kok); kok.querySelectorAll && kok.querySelectorAll('[placeholder], [title], [aria-label]').forEach(ozellikIsle);
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT), L = [];
    while (w.nextNode()) L.push(w.currentNode);
    L.forEach(dugumIsle);
  }
  const yonetimAlani = n => { const el = n.nodeType === 1 ? n : n.parentElement; return el && el.closest && el.closest('#page-admin, .ui-modal-overlay, .ui-modal, #app-toast'); };
  const gozcu = new MutationObserver(kayitlar => {
    if (!document.body.classList.contains('yp-aktif')) return;
    kayitlar.forEach(k => {
      if (k.type === 'characterData') { if (yonetimAlani(k.target)) dugumIsle(k.target); return; }
      k.addedNodes.forEach(n => { if (yonetimAlani(n)) agacIsle(n); });
    });
  });

  // Gözcü yalnızca yönetim paneli açıkken çalışır (sitenin geri kalanında boşuna iş yapmasın)
  let gozcuAcik = false;
  function gozcuBasla() { if (!gozcuAcik) { gozcu.observe(document.body, { childList: true, subtree: true, characterData: true }); gozcuAcik = true; } }
  function gozcuDur() { if (gozcuAcik) { gozcu.disconnect(); gozcuAcik = false; } }

  /* ---------- Mevcut fonksiyonlara bağlan ---------- */
  function sar(ad, sonra, once) {
    const eski = window[ad]; if (typeof eski !== 'function') return;
    window[ad] = function () { if (once) once.apply(this, arguments); const r = eski.apply(this, arguments); if (sonra) { if (r && typeof r.then === 'function') r.then(() => sonra.apply(this, arguments)); else sonra.apply(this, arguments); } return r; };
    try { (0, eval)(ad + ' = window.' + ad); } catch (e) {}
  }
  function baglan() {
    sar('openAdmin', function () {
      const c = $('admin-content');
      const izinli = c && c.style.display !== 'none';
      document.body.classList.toggle('yp-aktif', !!izinli);
      if (!izinli) return;
      kabukKur(); hesapDoldur(); gozcuBasla();
      agacIsle($('page-admin'));
      bekleyenAl(); icerikYukle();
    });
    const hazirla = function () { const c = $('admin-content'); if (!kuruldu && c && c.style.display !== 'none') { document.body.classList.add('yp-aktif'); kabukKur(); gozcuBasla(); } };
    sar('adminNav', function (v) { if (!kuruldu) return; aktifIsaretle(v); }, hazirla);
    sar('icTab', null, function (t) { setTimeout(() => { if (aktifGor === 'icerik') aktifIsaretle('icerik'); }, 0); });
    sar('_applyRoleUI', function () {
      document.querySelectorAll('#yp-yan .yp-it[data-alt]').forEach(b => { b.style.display = (typeof _isDestek === 'function' && _isDestek()) ? 'none' : ''; });
      document.querySelectorAll('#yp-yan .yp-grup').forEach(g => { const gor = [...g.querySelectorAll('.yp-it')].some(b => b.style.display !== 'none'); g.style.display = gor ? '' : 'none'; });
    }, hazirla);
    window.renderAdminStats = function () { if (aktifGor === 'overview' && kuruldu) panoCiz(); };
    try { (0, eval)('renderAdminStats = window.renderAdminStats'); } catch (e) {}
    window.renderVisitsMini = function () {};
    try { (0, eval)('renderVisitsMini = window.renderVisitsMini'); } catch (e) {}
    // İçerik kaydedilince dizini tazele
    ['ekAdmSave', 'gwAdmSave', 'ekAdmToggle', 'ekAdmDelete', 'ozSave', 'ozToggle', 'ozDelete', 'adminVidSave', 'adminVidHide', 'adminVidRestore', 'adminPqSave', 'adminPqHide', 'adminPqRestore', 'adminRcSave', 'adminRcHide', 'adminRcRestore', 'adminWordSave']
      .forEach(ad => sar(ad, () => { IX = null; }));
  }
  // admin.js diğer dosyalardan önce yüklenir; bağlama, tüm dosyalar yüklendikten sonra (DOMContentLoaded) yapılır
  if (document.readyState === 'complete') baglan(); else document.addEventListener('DOMContentLoaded', baglan);
  const _sp = setInterval(() => { if (typeof window.showPage === 'function') { clearInterval(_sp); sar('showPage', function (id) { if (id !== 'admin') { document.body.classList.remove('yp-aktif', 'yp-menu-acik'); gozcuDur(); } }); } }, 50);
  setInterval(() => { if (document.body.classList.contains('yp-aktif') && !document.hidden) bekleyenAl(); }, 120000);

  Object.assign(window, { ypGit, ypGrup, ypMenuAc, ypMenuKapat, ypSiteye, ypKapatHepsi, ypHesap, ypZil, ypYeni, ypYeniAc, ypDuzenle });
})();

/* ============================================================
   BÖLÜM 3 · YÖNETİM SAYFALARI (v170 — taslaklara göre yeniden tasarım)
   Her sayfa kendi kutusuna çizilir; veriyi okuyan/yazan eski fonksiyonlar
   (adminClearErrors, adminBackupTable, adminSaveExamDates …) olduğu gibi kullanılır.
   ============================================================ */
(function () {
  'use strict';
  const ic = (n, s) => (typeof window.ypIc === 'function' ? window.ypIc(n, s) : '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const $ = id => document.getElementById(id);
  const gl = ad => { try { return (0, eval)(ad); } catch (e) { return undefined; } };
  const onceKadar = t => (typeof window.ypOnceKadar === 'function' ? window.ypOnceKadar(t) : '');
  const tarih = t => t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const saat = t => t ? new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  const GUN = 86400000;
  window.YS_AKS = window.YS_AKS || {};

  /* ---------- Ortak parçalar ---------- */
  function degisim(yeni, eski, etiket) {
    if (!eski) return yeni ? '<span class="ys-deg art">' + ic('ziyaret', 14) + 'yeni</span><small>' + etiket + '</small>' : '<span class="ys-deg">—</span><small>' + etiket + '</small>';
    const y = Math.round((yeni - eski) / eski * 100);
    return '<span class="ys-deg ' + (y > 0 ? 'art' : y < 0 ? 'azl' : '') + '">' + (y !== 0 ? ic(y > 0 ? 'ziyaret' : 'asagi', 14) : '') + '%' + Math.abs(y) + '</span><small>' + etiket + '</small>';
  }
  function kpi(ikon, renk, etiket, deger, sag) {
    return '<div class="ys-kpi"><span class="ys-kpi-ic r-' + renk + '">' + ic(ikon, 22) + '</span><div class="ys-kpi-y"><small>' + etiket + '</small><b>' + deger + '</b>' + (sag ? '<div class="ys-kpi-s">' + sag + '</div>' : '') + '</div></div>';
  }
  function secim(etiket, deger, secenekler, onchange, genis) {
    return '<label class="ys-sec' + (genis ? ' genis' : '') + '"><span>' + etiket + '</span><select onchange="' + onchange + '">' +
      secenekler.map(o => '<option value="' + esc(o[0]) + '"' + (String(deger) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>';
  }
  function aramaKutusu(id, deger, ph, oninput) {
    return '<div class="ys-ara">' + ic('ara', 17) + '<input type="search" id="' + id + '" value="' + esc(deger) + '" placeholder="' + esc(ph) + '" oninput="' + oninput + '" autocomplete="off"></div>';
  }
  function sayfalama(toplam, sayfa, boy, fnAd, etiket) {
    const n = Math.max(1, Math.ceil(toplam / boy));
    let h = '<div class="ys-alt"><span>Toplam ' + toplam.toLocaleString('tr-TR') + ' ' + etiket + '</span><div class="ys-sayfalar">';
    h += '<button type="button" ' + (sayfa <= 1 ? 'disabled' : '') + ' onclick="' + fnAd + '(' + (sayfa - 1) + ')" aria-label="Önceki">' + ic('siteye', 15) + '</button>';
    const g = []; for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - sayfa) <= 2) g.push(i);
    let once = 0; g.forEach(i => { if (i - once > 1) h += '<span>…</span>'; h += '<button type="button" class="' + (i === sayfa ? 'aktif' : '') + '" onclick="' + fnAd + '(' + i + ')">' + i + '</button>'; once = i; });
    h += '<button type="button" ' + (sayfa >= n ? 'disabled' : '') + ' onclick="' + fnAd + '(' + (sayfa + 1) + ')" aria-label="Sonraki">' + ic('sag', 15) + '</button></div>';
    h += '<label class="ys-boy">Sayfada <select onchange="' + fnAd + '(1, +this.value)">' + [10, 25, 50, 100].map(b => '<option' + (b === boy ? ' selected' : '') + '>' + b + '</option>').join('') + '</select></label></div>';
    return h;
  }
  const zamanSecenek = [['hepsi', 'Tüm zamanlar'], ['1', 'Bugün'], ['7', 'Son 7 gün'], ['30', 'Son 30 gün'], ['90', 'Son 90 gün']];
  const zamanUygun = (t, z) => z === 'hepsi' || (t && (Date.now() - new Date(t).getTime()) < (+z) * GUN);
  let KUL = [];
  const kullanicilar = () => { const a = gl('_adminUsers'); return a && a.length ? a : KUL; };
  async function kisilerHazir() {
    if (kullanicilar().length) return;
    try { const { data } = await sb.from('profiles').select('id, email, display_name, role, is_admin'); KUL = data || []; } catch (e) {}
  }
  const kisiBul = id => kullanicilar().find(u => u.id === id);
  const kisiAd = u => u ? (u.display_name || (u.email || '').split('@')[0]) : '';
  function avatar(u, ad) {
    const harf = String(ad || (u && (u.display_name || u.email)) || '?').trim().charAt(0).toUpperCase() || '?';
    return '<span class="ys-av">' + esc(harf) + '</span>';
  }

  /* ============================================================
     HATA KAYITLARI
     ============================================================ */
  const HT = { rows: [], ara: '', cid: 'hepsi', kay: 'hepsi', zaman: 'hepsi', sayfa: 1, boy: 10, secili: new Set(), yuk: false };
  const CIDDIYET = { kritik: ['Kritik', 'kirmizi', 4], yuksek: ['Yüksek', 'kirmizi', 3], orta: ['Orta', 'turuncu', 2], dusuk: ['Düşük', 'yesil', 1] };
  function hataCoz(e) {
    const tum = (e.message || '') + ' ' + (e.detail || '') + ' ' + (e.source || '');
    const parca = String(e.detail || '').split(' · ');
    const o = { tarayici: '', ip: '', konum: '', href: '', yigin: '' };
    parca.forEach((p, i) => {
      p = p.trim();
      if (/^(Edge|Chrome|Firefox|Safari|\?)\/[A-Za-z?]+$/.test(p)) o.tarayici = p.replace('/', ' / ');
      else if (/^IP /.test(p)) { o.ip = p.slice(3); o.konum = (parca[i + 1] || '').trim(); }
      else if (/^https?:\/\//.test(p) && !o.href) o.href = p;
      else if (i === 0 && !/^IP /.test(p)) o.yigin = p;
    });
    if (o.konum && (/^https?:/.test(o.konum) || /^(Edge|Chrome|Firefox|Safari)/.test(o.konum))) o.konum = '';
    let kaynak = 'diger';
    if (/manuel-test/.test(e.source || '')) kaynak = 'test';
    else if (/chrome-extension:|moz-extension:|safari(-web)?-extension:/i.test(tum)) kaynak = 'eklenti';
    else if (/^auth/i.test(e.source || '') || /Giriş\/kayıt hatası|captcha/i.test(e.message || '')) kaynak = 'auth';
    else if (/failed to fetch|networkerror|load failed|network request|timeout|ERR_/i.test(tum)) kaynak = 'ag';
    else if (/error|exception|cannot read|undefined|is not (a function|defined)|unexpected token|rejection/i.test(tum)) kaynak = 'js';
    let cid = 'orta';
    if (kaynak === 'eklenti' || kaynak === 'test') cid = 'dusuk';
    else if (kaynak === 'auth') cid = /invalid login|şifre hatalı/i.test(e.message) ? 'dusuk' : (/captcha|secret/i.test(e.message) ? 'yuksek' : 'orta');
    else if (kaynak === 'js') cid = /\/js\/[a-z]+\.js/i.test(tum) ? 'kritik' : 'yuksek';
    o.kaynak = kaynak; o.cid = cid;
    return o;
  }
  const KAYNAK_AD = { auth: ['Auth', 'mavi'], js: ['JavaScript', 'altin'], eklenti: ['Eklenti', 'gri'], ag: ['Ağ', 'mor'], test: ['Test', 'gri'], diger: ['Diğer', 'gri'] };
  async function hataYukle() {
    const k = $('ys-hata'); if (!k) return;
    if (!HT.rows.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const [{ data, error }] = await Promise.all([sb.from('error_log').select('*').order('created_at', { ascending: false }).limit(1000), kisilerHazir()]);
      if (error) throw error;
      HT.rows = (data || []).map(e => Object.assign(e, { _c: hataCoz(e) }));
      HT.secili.clear();
      hataCiz();
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('hata', 28) + '<b>Hata kayıtları alınamadı.</b><span>error_log tablosu kurulu mu?</span></div></div>'; }
  }
  function hataFiltre() {
    const q = HT.ara.trim().toLocaleLowerCase('tr');
    return HT.rows.filter(e => (HT.cid === 'hepsi' || e._c.cid === HT.cid) && (HT.kay === 'hepsi' || e._c.kaynak === HT.kay) && zamanUygun(e.created_at, HT.zaman) &&
      (!q || ((e.message || '') + ' ' + (e.detail || '') + ' ' + (e.source || '') + ' ' + (e.url || '') + ' ' + kisiAd(kisiBul(e.user_id)) + ' ' + ((kisiBul(e.user_id) || {}).email || '')).toLocaleLowerCase('tr').includes(q)));
  }
  function hataCiz() {
    const k = $('ys-hata'); if (!k) return;
    const R = HT.rows, simdi = Date.now();
    const ar = (f, a, b) => R.filter(e => { const t = simdi - new Date(e.created_at).getTime(); return f(e) && t >= a * GUN && t < b * GUN; }).length;
    const say = f => [R.filter(f).length, ar(f, 0, 7), ar(f, 7, 14)];
    const top = say(() => true), auth = say(e => e._c.kaynak === 'auth'), js = say(e => e._c.kaynak === 'js'), kr = say(e => e._c.cid === 'kritik');
    const L = hataFiltre();
    const n = Math.max(1, Math.ceil(L.length / HT.boy)); if (HT.sayfa > n) HT.sayfa = n;
    const dilim = L.slice((HT.sayfa - 1) * HT.boy, HT.sayfa * HT.boy);
    const tumSecili = dilim.length && dilim.every(e => HT.secili.has(String(e.id)));
    let h = '<div class="ys-kpiler d4">' +
      kpi('hata', 'kirmizi', 'Toplam hata', top[0], degisim(top[1], top[2], 'önceki 7 güne göre')) +
      kpi('kilit', 'mavi', 'Giriş/kayıt hatası', auth[0], degisim(auth[1], auth[2], 'önceki 7 güne göre')) +
      kpi('kod', 'altin', 'JavaScript hatası', js[0], degisim(js[1], js[2], 'önceki 7 güne göre')) +
      kpi('hata', 'kirmizi', 'Kritik hata', kr[0], degisim(kr[1], kr[2], 'önceki 7 güne göre')) + '</div>';
    h += '<div class="yp-kart ys-liste"><div class="ys-arac">' +
      aramaKutusu('ys-ht-ara', HT.ara, 'Hata mesajında ara… (örn. login, undefined, e-posta)', 'ysHt(\'ara\', this.value)') +
      secim('Ciddiyet', HT.cid, [['hepsi', 'Tüm ciddiyet seviyeleri'], ['kritik', 'Kritik'], ['yuksek', 'Yüksek'], ['orta', 'Orta'], ['dusuk', 'Düşük']], 'ysHt(\'cid\', this.value)') +
      secim('Kaynak', HT.kay, [['hepsi', 'Tüm kaynaklar'], ['auth', 'Giriş/kayıt (Auth)'], ['js', 'JavaScript'], ['ag', 'Ağ / bağlantı'], ['eklenti', 'Tarayıcı eklentisi'], ['test', 'Test'], ['diger', 'Diğer']], 'ysHt(\'kay\', this.value)') +
      secim('Tarih', HT.zaman, zamanSecenek, 'ysHt(\'zaman\', this.value)') + '</div>';
    if (HT.secili.size) h += '<div class="ys-secbar"><b>' + HT.secili.size + ' kayıt seçili</b><button type="button" class="yp-btn kirmizi" onclick="ysHtSilSecili()">' + ic('cop', 16) + 'Seçilenleri sil</button><button type="button" class="yp-link" onclick="ysHtSec(\'temizle\')">Seçimi kaldır</button></div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('onay', 30) + '<b>' + (R.length ? 'Filtreye uyan kayıt yok.' : 'Kayıtlı hata yok.') + '</b></div>';
    else {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo"><thead><tr><th class="ys-cb"><input type="checkbox" ' + (tumSecili ? 'checked' : '') + ' onchange="ysHtSec(\'sayfa\', this.checked)" aria-label="Sayfadakileri seç"></th><th>Hata mesajı</th><th>Ciddiyet</th><th>Kaynak</th><th>Kullanıcı / Cihaz</th><th>URL / Sayfa</th><th>Tarih ve saat</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>';
      dilim.forEach(e => {
        const c = e._c, C = CIDDIYET[c.cid], K = KAYNAK_AD[c.kaynak], u = kisiBul(e.user_id);
        const kim = u ? '<b><a href="javascript:void(0)" class="ys-kisi-a" onclick="adminErrKullanici(\'' + esc(u.email || '') + '\')">' + esc(kisiAd(u)) + '</a></b><small>' + esc(u.email || '') + '</small>' : (e.user_id ? '<b>' + esc(String(e.user_id).slice(0, 8)) + '…</b><small>silinmiş/bilinmeyen hesap</small>' : '<b>Ziyaretçi</b><small>giriş yapmamış</small>');
        const yol = e.url || '/';
        const kaynakSatiri = [c.kaynak === 'js' && e.source ? String(e.source).replace(/^https?:\/\/[^/]+/, '') : (e.source || ''), c.yigin].filter(Boolean).join(' · ');
        h += '<tr><td class="ys-cb"><input type="checkbox" ' + (HT.secili.has(String(e.id)) ? 'checked' : '') + ' onchange="ysHtSec(\'' + esc(e.id) + '\', this.checked)" aria-label="Seç"></td>' +
          '<td class="ys-mesaj"><b>' + esc(e.message || '(boş mesaj)') + '</b>' + (kaynakSatiri ? '<small class="ys-kod">' + esc(kaynakSatiri.slice(0, 160)) + '</small>' : '') + '</td>' +
          '<td><span class="ys-cid d-' + C[1] + '"><i></i>' + C[0] + '</span></td>' +
          '<td><span class="yp-durum r-' + K[1] + '">' + K[0] + '</span></td>' +
          '<td><div class="ys-kim">' + ic('kullanici', 18) + '<div>' + kim + '<small>' + esc([c.tarayici, c.ip ? 'IP ' + c.ip : '', c.konum].filter(Boolean).join(' · ') || '—') + '</small></div></div></td>' +
          '<td class="ys-url"><b>' + esc(yol) + '</b>' + (c.href ? '<a href="' + esc(c.href) + '" target="_blank" rel="noopener">' + esc(c.href.replace(/^https?:\/\//, '').slice(0, 42)) + ic('link', 13) + '</a>' : '') + '</td>' +
          '<td class="ys-tar">' + tarih(e.created_at) + '<small>' + saat(e.created_at) + '</small></td>' +
          '<td class="ys-sag"><button type="button" class="yp-ikon-b sil" title="Sil" aria-label="Sil" onclick="adminErrDelete(\'' + esc(e.id) + '\')">' + ic('cop', 16) + '</button></td></tr>';
      });
      h += '</tbody></table></div>' + sayfalama(L.length, HT.sayfa, HT.boy, 'ysHtSayfa', 'kayıt');
    }
    k.innerHTML = h + '</div>';
  }
  window.ysHt = (a, v) => { HT[a] = v; HT.sayfa = 1; if (a === 'ara') { const p = document.activeElement && document.activeElement.selectionStart; hataCiz(); const i = $('ys-ht-ara'); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (e) {} } } else hataCiz(); };
  window.ysHtSayfa = (s, boy) => { if (boy) HT.boy = boy; HT.sayfa = s; hataCiz(); };
  window.ysHtSec = (id, acik) => {
    if (id === 'temizle') HT.secili.clear();
    else if (id === 'sayfa') { hataFiltre().slice((HT.sayfa - 1) * HT.boy, HT.sayfa * HT.boy).forEach(e => acik ? HT.secili.add(String(e.id)) : HT.secili.delete(String(e.id))); }
    else acik ? HT.secili.add(String(id)) : HT.secili.delete(String(id));
    hataCiz();
  };
  window.ysHtSilSecili = async () => {
    const ids = [...HT.secili]; if (!ids.length) return;
    if (!(await uiConfirm(ids.length + ' hata kaydı silinsin mi?', 'Kayıtları sil', { danger: true }))) return;
    try { const { error } = await sb.from('error_log').delete().in('id', ids); if (error) throw error; toast(ids.length + ' kayıt silindi.'); } catch (e) { uiAlert('Silinemedi.'); }
    hataYukle();
  };
  window.YS_AKS.errors = () => '<button type="button" class="yp-btn" onclick="adminClearErrors()">' + ic('cop', 16) + 'Temizle</button>' +
    '<button type="button" class="yp-btn" onclick="adminErrTest()">' + ic('kalem', 16) + 'Sistemi test et</button>' +
    '<button type="button" class="yp-btn" onclick="adminLoadErrors()">' + ic('yenile', 16) + 'Yenile</button>';

  /* ============================================================
     İŞLEM KAYITLARI
     ============================================================ */
  const IS = { rows: [], kurum: {}, tur: 'hepsi', rol: 'hepsi', zaman: 'hepsi', ara: '', sayfa: 1, boy: 10 };
  const ISLEM = {
    kullanici_sil: ['Kullanıcı silme', 'Kullanıcı hesabı silindi.', 'cop', 'kirmizi'],
    ogrenci_atama_kaldir: ['Atama kaldırma', 'Öğretmen ataması kaldırıldı.', 'carpi', 'kirmizi'],
    ogrenci_ata: ['Öğrenci atama', 'Öğrenci ataması yapıldı.', 'ogretmen', 'altin'],
    rol_degistir: ['Rol değişimi', 'Kullanıcı rolü değiştirildi.', 'ayar', 'gri'],
    premium_tanim: ['Premium tanımlama', 'Premium üyelik tanımlandı.', 'tac', 'altin'],
    deneme_premium: ['Deneme premium', 'Deneme premium süresi verildi.', 'hediye', 'altin'],
    kurum_sil: ['Kurum silme', 'Kurum silindi.', 'kurum', 'mor'],
    kurum_admin_ata: ['Kurum yöneticisi atama', 'Kurum yöneticisi atandı.', 'kullanicilar', 'mavi'],
    ticket_mail: ['Talep maili', 'Destek talebine e-posta gönderildi.', 'mail', 'yesil'],
    talep_durum: ['Talep durumu', 'Destek talebinin durumu değişti.', 'destek', 'mavi'],
    talep_ustlen: ['Talep üstlenme', 'Destek talebi üstlenildi.', 'destek', 'mavi'],
    sablon_ekle: ['Şablon ekleme', 'Yanıt şablonu eklendi.', 'not', 'gri'],
    ogretmen_mail: ['Öğretmen maili', 'E-posta gönderildi.', 'mail', 'yesil'],
    ogretmen_bildirim: ['Öğretmen bildirimi', 'Bildirim gönderildi.', 'bildirim', 'altin'],
    bildirim: ['Bildirim', 'Bildirim gönderildi.', 'bildirim', 'altin'],
    dogrulama_maili_tekrar: ['Doğrulama maili', 'Doğrulama maili yeniden gönderildi.', 'mail', 'yesil'],
    sifre_sifirlama_maili: ['Şifre yenileme maili', 'Şifre yenileme bağlantısı gönderildi.', 'anahtar', 'gri']
  };
  const ROL_AD = { superadmin: ['Yönetici', 'altin'], destek: ['Destek', 'mavi'], ogretmen: ['Öğretmen', 'mavi'], kurum: ['Kurum', 'mor'] };
  const DETAY_AD = { ad: 'Ad', email: 'E-posta', kime: 'Kime', konu: 'Konu', ogretmen: 'Öğretmen', ogrenci: 'Öğrenci', kurum_id: 'Kurum', yeni_rol: 'Yeni rol', eski_rol: 'Eski rol', kullanici: 'Kullanıcı', sure: 'Süre', ticket: 'Talep', durum: 'Durum', baslik: 'Başlık' };
  function detayYaz(d) {
    if (!d || typeof d !== 'object') return d ? esc(String(d)) : '';
    return Object.entries(d).map(([k, v]) => {
      let deger = v;
      if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) { const u = kisiBul(v); deger = u ? kisiAd(u) : (IS.kurum[v] || v.slice(0, 8) + '…'); }
      else if (v && typeof v === 'object') deger = JSON.stringify(v);
      return '<span><em>' + esc(DETAY_AD[k] || k) + ':</em> ' + esc(deger) + '</span>';
    }).join('');
  }
  async function islemYukle() {
    const k = $('ys-islem'); if (!k) return;
    if (!IS.rows.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const [a, ku] = await Promise.all([
        sb.from('action_log').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('kurumlar').select('id, name').then(r => r, () => ({ data: [] })),
        kisilerHazir()
      ]);
      if (a.error) throw a.error;
      IS.rows = a.data || []; IS.kurum = {}; ((ku && ku.data) || []).forEach(x => IS.kurum[x.id] = x.name);
      islemCiz();
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('log', 28) + '<b>İşlem kayıtları okunamadı.</b><span>roller_altyapi.sql çalıştırıldı mı?</span></div></div>'; }
  }
  function islemFiltre() {
    const q = IS.ara.trim().toLocaleLowerCase('tr');
    return IS.rows.filter(r => (IS.tur === 'hepsi' || r.action === IS.tur) && (IS.rol === 'hepsi' || r.actor_role === IS.rol) && zamanUygun(r.created_at, IS.zaman) &&
      (!q || [r.action, (ISLEM[r.action] || [])[0], kisiAd(kisiBul(r.actor_id)), (kisiBul(r.actor_id) || {}).email, kisiAd(kisiBul(r.target)), (kisiBul(r.target) || {}).email, JSON.stringify(r.detail || {}), r.detail && IS.kurum[r.detail.kurum_id]]
        .filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
  }
  function islemCiz() {
    const k = $('ys-islem'); if (!k) return;
    const turler = [...new Set(IS.rows.map(r => r.action))].sort((a, b) => ((ISLEM[a] || [a])[0]).localeCompare((ISLEM[b] || [b])[0], 'tr'));
    const roller = [...new Set(IS.rows.map(r => r.actor_role).filter(Boolean))];
    const L = islemFiltre();
    const n = Math.max(1, Math.ceil(L.length / IS.boy)); if (IS.sayfa > n) IS.sayfa = n;
    const dilim = L.slice((IS.sayfa - 1) * IS.boy, IS.sayfa * IS.boy);
    let h = '<div class="yp-kart ys-liste"><div class="ys-arac">' +
      '<button type="button" class="yp-btn altin" onclick="ysIsYenile()">' + ic('yenile', 17) + 'Yenile</button>' +
      secim('İşlem türü', IS.tur, [['hepsi', 'Tümü']].concat(turler.map(t => [t, (ISLEM[t] || [t])[0]])), 'ysIs(\'tur\', this.value)') +
      secim('Rol', IS.rol, [['hepsi', 'Tümü']].concat(roller.map(r => [r, (ROL_AD[r] || [r])[0]])), 'ysIs(\'rol\', this.value)') +
      secim('Tarih aralığı', IS.zaman, zamanSecenek, 'ysIs(\'zaman\', this.value)') +
      aramaKutusu('ys-is-ara', IS.ara, 'Kullanıcı, e-posta, kurum, işlem ara…', 'ysIs(\'ara\', this.value)') + '</div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('log', 30) + '<b>' + (IS.rows.length ? 'Filtreye uyan kayıt yok.' : 'Henüz işlem kaydı yok.') + '</b></div>';
    else {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo"><thead><tr><th>İşlem</th><th>Kullanıcı</th><th>Hedef / Detay</th><th>Tarih</th><th class="ys-sag"></th></tr></thead><tbody>';
      dilim.forEach(r => {
        const M = ISLEM[r.action] || [r.action, 'İşlem kaydı.', 'log', 'gri'];
        const u = kisiBul(r.actor_id), hd = kisiBul(r.target), d = r.detail || {};
        const R = ROL_AD[r.actor_role] || [r.actor_role || '—', 'gri'];
        let hedef = '', hIkon = 'kullanici';
        if (hd) hedef = esc(kisiAd(hd)) + (hd.email ? ' <small class="ys-ince">(' + esc(hd.email) + ')</small>' : '');
        else if (d.kurum_id && IS.kurum[d.kurum_id]) { hedef = esc(IS.kurum[d.kurum_id]); hIkon = 'kurum'; }
        else if (d.kime) { hedef = esc(d.kime); hIkon = 'mail'; }
        else if (d.email) hedef = esc((d.ad ? d.ad + ' ' : '') + '(' + d.email + ')');
        else if (r.target) hedef = esc(String(r.target).slice(0, 8)) + '…';
        else hedef = '—';
        h += '<tr><td><div class="ys-islem"><span class="ys-islem-ic r-' + M[3] + '">' + ic(M[2], 19) + '</span><div><b>' + esc(M[0]) + '</b><small>' + esc(M[1]) + '</small></div></div></td>' +
          '<td><div class="ys-kim">' + avatar(u) + '<div><b>' + esc(kisiAd(u) || (r.actor_id ? String(r.actor_id).slice(0, 8) + '…' : '—')) + '</b><span class="yp-durum d-' + (R[1] === 'altin' ? 'sari' : 'gri') + '">' + esc(R[0]) + '</span></div></div></td>' +
          '<td><div class="ys-kim">' + ic(hIkon, 18) + '<div><b>' + hedef + '</b><div class="ys-detay">' + detayYaz(d) + '</div></div></div></td>' +
          '<td class="ys-tar">' + tarih(r.created_at) + '<small>' + saat(r.created_at) + '</small></td>' +
          '<td class="ys-sag"><button type="button" class="yp-ikon-b" title="Ayrıntı" aria-label="Ayrıntı" onclick="ysIsDetay(\'' + esc(r.id) + '\')">' + ic('nokta3', 16) + '</button></td></tr>';
      });
      h += '</tbody></table></div>' + sayfalama(L.length, IS.sayfa, IS.boy, 'ysIsSayfa', 'işlem kaydı');
    }
    k.innerHTML = h + '</div>';
  }
  window.ysIs = (a, v) => { IS[a] = v; IS.sayfa = 1; islemCiz(); if (a === 'ara') { const i = $('ys-is-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysIsSayfa = (s, boy) => { if (boy) IS.boy = boy; IS.sayfa = s; islemCiz(); };
  window.ysIsYenile = () => islemYukle();
  window.ysIsDetay = id => {
    const r = IS.rows.find(x => String(x.id) === String(id)); if (!r) return;
    const M = ISLEM[r.action] || [r.action];
    const satir = [['İşlem', M[0]], ['Yapan', kisiAd(kisiBul(r.actor_id)) + ' (' + ((kisiBul(r.actor_id) || {}).email || r.actor_id || '—') + ')'], ['Rol', (ROL_AD[r.actor_role] || [r.actor_role])[0]],
      ['Hedef', r.target ? (kisiAd(kisiBul(r.target)) || r.target) : '—'], ['Tarih', new Date(r.created_at).toLocaleString('tr-TR')], ['Ayrıntı', JSON.stringify(r.detail || {}, null, 1)]];
    uiAlert(satir.map(s => s[0] + ': ' + s[1]).join('\n'), 'İşlem ayrıntısı');
  };

  /* ============================================================
     YEDEKLEME
     ============================================================ */
  function yedekCiz() {
    const k = $('ys-yedek'); if (!k) return;
    const T = gl('BACKUP_TABLES') || [];
    k.innerHTML =
      '<section class="yp-kart ys-blok"><div class="ys-blok-bas">' + ic('yedek', 24) + '<div><h3>Tam yedek</h3><p>Tüm tablolar tek dosyada iner (kullanıcı profilleri, kelimeler, testler, talepler, mailler, sorular…). Düzenli olarak (haftada bir) almanı öneririm.</p></div></div>' +
      '<div class="ys-yedek-satir"><button type="button" class="yp-btn ana buyuk" onclick="adminBackupAll()">' + ic('indir', 19) + 'Tüm veritabanını indir</button>' +
      '<div class="ys-ozellik">' + ic('not', 20) + '<div><b>JSON biçiminde</b><small>Kolay taşınabilir</small></div></div>' +
      '<div class="ys-ozellik">' + ic('yedek', 20) + '<div><b>Tüm tablolar dahil</b><small>' + T.length + ' tablo, tek dosya</small></div></div>' +
      '<div class="ys-ozellik">' + ic('saat', 20) + '<div><b>Yaklaşık boyut</b><small>Birkaç MB (içeriğe göre)</small></div></div></div>' +
      '<div id="backup-status" class="ys-durum-yazi"></div></section>' +
      '<section class="yp-kart ys-blok"><div class="ys-blok-bas">' + ic('liste', 24) + '<div><h3>Tablo bazında indir</h3><p>Yalnızca ihtiyaç duyduğun tabloları ayrı ayrı indirebilirsin. Her tablo JSON olarak iner.</p></div><span class="ys-rozet">' + ic('bilgi', 15) + T.length + ' tablo</span></div>' +
      '<div id="backup-tables" class="ys-tablolar">' + T.map(t => '<button type="button" class="yp-btn" onclick="adminBackupTable(\'' + t + '\')">' + ic('indir', 15) + esc(t) + '</button>').join('') + '</div></section>' +
      '<section class="yp-kart ys-blok"><div class="ys-blok-bas">' + ic('paket', 24) + '<div><h3>Tam kurtarma paketi (kod + kurulum)</h3><p>Tek tıkla: <b>tüm veritabanı</b> + <b>sitenin canlı kod dosyaları</b> + yeniden kurulum rehberi tek zip\'te iner. Siteye bir şey olursa bu paket ve sunucu fonksiyon kodlarıyla her şey yeniden ayağa kaldırılır. Haftada bir almanı öneririm.</p></div></div>' +
      '<div class="ys-yedek-satir"><button type="button" class="yp-btn ana buyuk" onclick="adminRecoveryZip()">' + ic('paket', 19) + 'Kurtarma paketi oluştur ve indir</button>' +
      '<div class="ys-ozellik">' + ic('klasor', 20) + '<div><b>Veritabanı + kod</b><small>Tüm dosyalar tek pakette</small></div></div>' +
      '<div class="ys-ozellik">' + ic('not', 20) + '<div><b>Kurulum rehberi</b><small>Adım adım hazır</small></div></div>' +
      '<div class="ys-ozellik">' + ic('yonetim', 20) + '<div><b>Güvenli ve tam</b><small>Acil durumlar için</small></div></div></div>' +
      '<div id="recovery-status" class="ys-durum-yazi"></div></section>';
  }
  window.YS_AKS.backup = () => '<div class="ys-bilgi-kart">' + ic('yonetim', 22) + '<div><b>Veri güvenliği</b><small>Yedekler yalnızca yönetici hesabıyla, senin tarayıcında oluşturulur ve bilgisayarına iner.</small></div></div>';

  /* ============================================================
     SİTE AYARLARI (alanların kimlikleri korunur; kaydetme fonksiyonları eski)
     ============================================================ */
  function ayarlarCiz() {
    const k = $('ys-ayar'); if (!k || k.dataset.kuruldu) return;
    k.dataset.kuruldu = '1';
    const tarihAlan = (id, ad) => '<label class="ys-alan"><span>' + ad + '</span><div class="ys-tarih">' + ic('takvim', 17) + '<input id="' + id + '" type="date"><button type="button" class="yp-ikon-b" title="Temizle" aria-label="Temizle" onclick="document.getElementById(\'' + id + '\').value=\'\'">' + ic('kapat', 15) + '</button></div></label>';
    k.innerHTML =
      '<section class="yp-kart ys-ayar-k"><span class="ys-ayar-ic">' + ic('mail', 22) + '</span><div class="ys-ayar-g"><h3>Kayıt: izin verilen e-posta uzantıları</h3>' +
      '<p>Yeni üyeler yalnızca bu uzantılardaki adreslerle (onay koduyla) kayıt olabilir; Google ile girişte de geçerlidir. Bir uzantı alt alan adlarını da kapsar; örneğin "edu.tr" yazılırsa tüm üniversite adresleri kabul edilir. Liste boş bırakılırsa kısıtlama kalkar. Mevcut üyeler etkilenmez.</p>' +
      '<div class="ys-ayar-ikili"><textarea id="set-mail-uzanti" class="an-textarea" rows="7" placeholder="gmail.com&#10;hotmail.com&#10;outlook.com"></textarea>' +
      '<div class="ys-not">' + ic('bilgi', 18) + '<div><b>Bilgi</b><span>Her satıra yalnızca bir uzantı yaz.</span><span>Alt alan adları otomatik kabul edilir.</span><span>Liste yalnızca yeni kayıt olacak kullanıcılar için geçerlidir.</span></div></div></div>' +
      '<button type="button" class="yp-btn ana" onclick="adminSaveMailDomains()">' + ic('kaydet', 16) + 'Kaydet</button></div></section>' +
      '<section class="yp-kart ys-ayar-k"><span class="ys-ayar-ic">' + ic('takvim', 22) + '</span><div class="ys-ayar-g"><h3>Sınav tarihleri</h3>' +
      '<p>Girilen tarihler kullanıcılara sağ kenardaki sayaçta kalan gün sayısı olarak gösterilir. Boş bırakılırsa o sınav gösterilmez.</p>' +
      '<div class="ys-uclu">' + tarihAlan('set-ydt-date', 'YDT tarihi') + tarihAlan('set-yds-date', 'YDS tarihi') + tarihAlan('set-eyds-date', 'e-YDS tarihi') + '</div>' +
      '<button type="button" class="yp-btn ana" onclick="adminSaveExamDates()">' + ic('kaydet', 16) + 'Kaydet ve yayınla</button></div></section>' +
      '<section class="yp-kart ys-ayar-k"><span class="ys-ayar-ic">' + ic('bildirim', 22) + '</span><div class="ys-ayar-g"><h3>Duyuru bandı</h3>' +
      '<p>Buraya yazılan metin sitenin en üstünde herkese görünen bir bant olarak yayınlanır. Boş bırakıp kaydedersen bant kalkar.</p>' +
      '<textarea id="set-announce" class="an-textarea" rows="2" maxlength="500" placeholder="Örn: 15 Temmuz\'a kadar premium %20 indirimli!" oninput="document.getElementById(\'ys-duyuru-say\').textContent=this.value.length"></textarea>' +
      '<div class="ys-satir-ara"><button type="button" class="yp-btn ana" onclick="adminSaveAnnouncement()">' + ic('kaydet', 16) + 'Kaydet ve yayınla</button><small><span id="ys-duyuru-say">0</span>/500 karakter</small></div></div></section>' +
      '<section class="yp-kart ys-ayar-k"><span class="ys-ayar-ic">' + ic('hazirlik', 22) + '</span><div class="ys-ayar-g"><h3>Bakım modu</h3>' +
      '<p>Açıkken ziyaretçiler "Bakımdayız" ekranı görür; <b>yöneticiler siteyi normal kullanmaya devam eder</b>. Büyük güncelleme yaparken aç.</p>' +
      '<div class="ys-satir-ara sol"><label class="ys-anahtar"><input type="checkbox" id="set-maint"><i></i><span>Bakım modu açık</span></label><button type="button" class="yp-btn ana" onclick="adminSaveMaintenance()">' + ic('kaydet', 16) + 'Kaydet</button></div></div></section>';
  }

  /* ============================================================
     ZİYARET & SEO
     ============================================================ */
  const ZV = { gun: 30, veri: null, yuk: null, sekme: 'ulke' };
  const SAYFA_AD = { home: 'Ana Sayfa', words: 'Kelimeler', works: 'Çalışmalar', quiz: 'Testler', grammarworks: 'Gramer Çalışmaları', grammar: 'Gramer', review: 'Tekrar', testbuilder: 'Test Oluştur', video: 'Videolar', pricing: 'Fiyatlar', profile: 'Profil', admin: 'Yönetim', placement: 'Seviye Sınavı', learn: 'Eğitim', recs: 'Blog', makaleler: 'Makaleler', watch: 'Video izleme', teacher: 'Öğretmen paneli', kurum: 'Kurum paneli' };
  const KAYNAK_MARKA = [[/google\./, 'Google', '#4285f4', 'G'], [/bing\.com/, 'Bing', '#008373', 'B'], [/yahoo\./, 'Yahoo', '#6001d2', 'Y'], [/yandex\./, 'Yandex', '#fc3f1d', 'Я'],
    [/duckduckgo/, 'DuckDuckGo', '#de5833', 'D'], [/(^|\.)t\.me$|telegram/, 'Telegram', '#229ed9', 'T'], [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/, 'X (Twitter)', '#111', 'X'],
    [/instagram/, 'Instagram', '#d62976', 'I'], [/facebook|fb\.com/, 'Facebook', '#1877f2', 'f'], [/youtube|youtu\.be/, 'YouTube', '#ff0000', '▶'], [/whatsapp|wa\.me/, 'WhatsApp', '#25d366', 'W'],
    [/chatgpt|openai/, 'ChatGPT', '#10a37f', 'C'], [/claude\.ai|anthropic/, 'Claude', '#d97757', 'C']];
  function kaynakAd(host) {
    if (!host || host === '(dogrudan)') return ['Doğrudan / uygulama', '#0d1b2a', 'D'];
    for (const m of KAYNAK_MARKA) if (m[0].test(host)) return [m[1], m[2], m[3]];
    return [host, '#8a8270', host.charAt(0).toUpperCase()];
  }
  async function ziyaretVeri(gun) {
    try {
      const { data, error } = await sb.rpc('admin_ziyaret_detay', { gun });
      if (!error && data && data.gunluk) return data;
    } catch (e) {}
    // Yedek yol: kayıtları çekip tarayıcıda say
    const rows = typeof _visitData === 'function' ? await _visitData(Math.max(gun * 2, 60)) : [];
    const sinir = Date.now() - gun * GUN, gunluk = {}, ulke = {}, sehir = {}, kaynak = {}, sayfa = {};
    rows.forEach(r => {
      if (!r.created_at) return;
      const d = new Date(r.created_at).toLocaleDateString('sv-SE'); gunluk[d] = (gunluk[d] || 0) + 1;
      if (new Date(r.created_at).getTime() < sinir) return;
      if (r.country) ulke[r.country] = (ulke[r.country] || 0) + 1;
      if (r.country && r.city) { const k = r.country + ' - ' + r.city; sehir[k] = (sehir[k] || 0) + 1; }
      let h = '(dogrudan)'; try { if (r.referrer) h = new URL(r.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
      if (!/ydt-ydsrusca/.test(h)) kaynak[h] = (kaynak[h] || 0) + 1;
      if (r.path) sayfa[r.path] = (sayfa[r.path] || 0) + 1;
    });
    const sirala = m => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { gunluk, ulkeler: sirala(ulke), sehirler: sirala(sehir), kaynaklar: sirala(kaynak), sayfalar: sirala(sayfa) };
  }
  async function ziyaretYukle() {
    const k = $('ys-ziyaret'); if (!k) return;
    if (!ZV.veri) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try { ZV.veri = await ziyaretVeri(ZV.gun); } catch (e) { ZV.veri = { gunluk: {}, ulkeler: [], sehirler: [], kaynaklar: [], sayfalar: [] }; }
    ziyaretCiz();
  }
  function cubukListe(liste, adFn) {
    if (!liste || !liste.length) return '<div class="yp-bos kucuk"><span>Henüz veri yok.</span></div>';
    const mx = Math.max(1, ...liste.map(x => x[1]));
    return '<ol class="ys-cubuklar">' + liste.slice(0, 10).map((x, i) => { const a = adFn ? adFn(x[0]) : [x[0]]; return '<li><span class="ys-sira">' + (i + 1) + '</span>' + (a[2] ? '<span class="ys-marka" style="background:' + a[1] + '">' + esc(a[2]) + '</span>' : '') + '<span class="ys-c-ad" title="' + esc(a[0]) + '">' + esc(a[0]) + '</span><span class="ys-c-iz"><i style="width:' + Math.max(2, Math.round(x[1] / mx * 100)) + '%"></i></span><b>' + x[1].toLocaleString('tr-TR') + '</b></li>'; }).join('') + '</ol>';
  }
  function ziyaretCiz() {
    const k = $('ys-ziyaret'); if (!k || !ZV.veri) return;
    const g = ZV.veri.gunluk || {}, key = d => d.toLocaleDateString('sv-SE');
    const top = (a, b) => { let s = 0; for (let i = a; i < b; i++) { const d = new Date(Date.now() - i * GUN); s += g[key(d)] || 0; } return s; };
    const bugun = top(0, 1), dun = top(1, 2), h7 = top(0, 7), o7 = top(7, 14), h30 = top(0, 30), o30 = top(30, 60);
    let ad = null; try { ad = new Intl.DisplayNames(['tr'], { type: 'region' }); } catch (e) {}
    const ulkeAd = n => { const p = String(n).split(' - '); if (ad && /^[A-Z]{2}$/.test(p[0])) { try { p[0] = ad.of(p[0]); } catch (e) {} } return [p.join(' - ')]; };
    k.innerHTML = '<div class="ys-kpiler d3">' +
      kpi('kullanicilar', 'mavi', 'Bugün', bugun.toLocaleString('tr-TR'), degisim(bugun, dun, 'düne göre')) +
      kpi('grafik', 'altin', 'Son 7 gün', h7.toLocaleString('tr-TR'), degisim(h7, o7, 'önceki haftaya göre')) +
      kpi('saat', 'gri', 'Son 30 gün', h30.toLocaleString('tr-TR'), degisim(h30, o30, 'önceki 30 güne göre')) + '</div>' +
      '<div class="ys-uc-kart">' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('pin', 18) + 'Ülke ve şehir (' + ZV.gun + ' gün)</h3></div>' +
      '<div class="ys-mini-sekme"><button type="button" class="' + (ZV.sekme === 'ulke' ? 'aktif' : '') + '" onclick="ysZvSekme(\'ulke\')">Ülkeler</button><button type="button" class="' + (ZV.sekme === 'sehir' ? 'aktif' : '') + '" onclick="ysZvSekme(\'sehir\')">Şehirler</button></div>' +
      cubukListe(ZV.sekme === 'ulke' ? ZV.veri.ulkeler : ZV.veri.sehirler, ulkeAd) + '</section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('link', 18) + 'Trafik kaynakları (' + ZV.gun + ' gün)</h3></div>' + cubukListe(ZV.veri.kaynaklar, kaynakAd) + '</section>' +
      '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('not', 18) + 'En çok ziyaret edilen sayfalar</h3></div>' + cubukListe(ZV.veri.sayfalar, p => [SAYFA_AD[p] || p]) + '</section>' +
      '</div>' +
      '<div class="ys-gsc-satir"><section class="yp-kart ys-gsc"><div class="yp-kart-bas"><h3><span class="ys-marka" style="background:#4285f4">G</span>Google Search Console</h3><div id="ys-gsc-acts"></div></div><div id="admin-gsc"><div class="admin-loading">Yükleniyor...</div></div></section>' +
      '<section class="yp-kart ys-seo"><div class="yp-kart-bas"><h3>' + ic('ara', 18) + 'SEO denetimi</h3><span id="ys-seo-puan"></span></div><div id="admin-seo"></div></section></div>';
    gscDugmeler();
    if (typeof adminGscShowLast === 'function') adminGscShowLast();
    seoCiz();
  }
  window.ysZvSekme = s => { ZV.sekme = s; ziyaretCiz(); };
  window.ysZvGun = g => { ZV.gun = +g; ZV.veri = null; ziyaretYukle(); };
  window.YS_AKS.visits = () => '<div class="yp-sec"><span>' + ic('takvim', 16) + '</span><select onchange="ysZvGun(this.value)" aria-label="Zaman aralığı">' +
    [[7, 'Son 7 gün'], [30, 'Son 30 gün'], [90, 'Son 90 gün']].map(o => '<option value="' + o[0] + '"' + (ZV.gun === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
  function gscDugmeler(gun) {
    const acts = $('ys-gsc-acts'); if (!acts) return;
    gun = gun || gl('_gscDays') || 28;
    acts.innerHTML = '<div class="ys-mini-sekme">' + [7, 28, 90].map(x => '<button type="button" class="' + (x === gun ? 'aktif' : '') + '" onclick="adminGscRange(' + x + ')">' + x + ' gün</button>').join('') + '</div>' +
      '<button type="button" class="yp-btn kucuk" onclick="adminGscShowLast()">' + ic('indir', 15) + 'Kayıtlı veriyi göster</button><button type="button" class="yp-btn kucuk" onclick="adminGscLoad()">' + ic('yenile', 15) + 'Canlı çek</button>';
  }
  function gscCiz(data, fetchedAt) {
    const box = $('admin-gsc'); if (!box || !data) return;
    const daily = data.daily || [], queries = data.queries || [], pages = data.pages || [];
    const tik = daily.reduce((a, r) => a + (r.clicks || 0), 0), gos = daily.reduce((a, r) => a + (r.impressions || 0), 0);
    const ctr = gos ? (tik / gos * 100).toFixed(1) : '0', gun = (data.range && data.range.days) || gl('_gscDays') || 28;
    gscDugmeler(gun);
    const tablo = (bas, rows, kolon) => '<div class="ys-gsc-t"><h4>' + bas + '</h4>' + (rows.length ? '<table class="yp-tablo"><thead><tr><th>#</th>' + kolon.map(c => '<th>' + c[0] + '</th>').join('') + '</tr></thead><tbody>' +
      rows.slice(0, 8).map((r, i) => '<tr><td>' + (i + 1) + '</td>' + kolon.map(c => '<td>' + esc(c[1](r)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : '<div class="yp-bos kucuk"><span>Henüz veri yok.</span></div>') + '</div>';
    box.innerHTML = '<div class="ys-gsc-kpi"><div>' + ic('okSag', 20) + '<span><small>Tıklama</small><b>' + tik.toLocaleString('tr-TR') + '</b></span></div><div>' + ic('goz', 20) + '<span><small>Gösterim</small><b>' + gos.toLocaleString('tr-TR') + '</b></span></div>' +
      '<div>' + ic('ziyaret', 20) + '<span><small>CTR</small><b>%' + ctr + '</b></span></div><div class="ys-gsc-son"><small>Son veri</small><b>' + (fetchedAt ? new Date(fetchedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—') + '</b></div></div>' +
      '<div class="ys-gsc-tablolar">' + tablo('En iyi aramalar', queries, [['Sorgu', r => r.keys[0]], ['Tıklama', r => r.clicks], ['Gösterim', r => r.impressions], ['Ort. sıra', r => (r.position || 0).toFixed(1)]]) +
      tablo('En iyi sayfalar', pages, [['Sayfa', r => (r.keys[0] || '').replace(/^https?:\/\/(www\.)?ydt-ydsrusca\.com/, '') || '/'], ['Tıklama', r => r.clicks], ['Gösterim', r => r.impressions]]) + '</div>';
  }
  function seoCiz() {
    const box = $('admin-seo'); if (!box) return;
    const c = [], t = document.title || '';
    c.push([t.length >= 25 && t.length <= 65, 'Sayfa başlığı (title) 25-65 karakter', t ? '"' + t + '" (' + t.length + ' karakter)' : 'Yok']);
    const md = document.querySelector('meta[name="description"]');
    c.push([!!md && (md.content || '').length >= 60, 'Meta açıklama (description) 60+ karakter', md ? (md.content || '').slice(0, 90) : 'Yok, eklenmeli']);
    c.push([!!document.querySelector('link[rel*="icon"]'), 'Favicon tanımlı', 'Site simgesi']);
    c.push([!!document.querySelector('meta[property="og:title"]'), 'Open Graph başlık (link paylaşım kartı)', 'Yoksa WhatsApp/Telegram önizlemesi çıkmaz']);
    c.push([!!document.querySelector('meta[property="og:image"]'), 'Open Graph görsel', 'Paylaşımda görünen resim']);
    c.push([!!document.documentElement.lang, 'HTML dil etiketi (lang)', document.documentElement.lang || 'Yok']);
    const h1 = document.querySelectorAll('h1').length;
    c.push([h1 === 1, 'Tek H1 başlığı', h1 + ' adet bulundu']);
    c.push([location.protocol === 'https:', 'HTTPS aktif', 'Site güvenli bağlantıyla açılıyor']);
    const ok = c.filter(x => x[0]).length, p = $('ys-seo-puan');
    if (p) p.innerHTML = '<span class="yp-durum ' + (ok === c.length ? 'd-yesil' : 'd-sari') + '">SEO puanı: ' + ok + '/' + c.length + '</span>';
    box.innerHTML = '<ul class="ys-seo-l">' + c.map(x => '<li class="' + (x[0] ? 'ok' : 'yok') + '">' + ic(x[0] ? 'onay' : 'carpi', 19) + '<div><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></div></li>').join('') + '</ul>';
  }

  /* ---------- Bağlantılar: eski yükleyiciler yeni sayfaları çizsin ---------- */
  function degistir(ad, fn) { window[ad] = fn; try { (0, eval)(ad + ' = window.' + ad); } catch (e) {} }
  function bagla() {
    degistir('adminLoadErrors', function () { return hataYukle(); });
    degistir('adminStaffLogLoad', function () { return islemYukle(); });
    degistir('renderBackupView', function () { yedekCiz(); });
    degistir('renderVisitsFull', function () { return ziyaretYukle(); });
    degistir('renderSeoCheck', function () { seoCiz(); });
    degistir('_gscRender', gscCiz);
    const eskiAyar = window.adminSettingsInit;
    degistir('adminSettingsInit', async function () {
      ayarlarCiz();
      const r = typeof eskiAyar === 'function' ? await eskiAyar.apply(this, arguments) : null;
      const a = $('set-announce'), s = $('ys-duyuru-say'); if (a && s) s.textContent = a.value.length;
      return r;
    });
  }
  if (document.readyState === 'complete') bagla(); else document.addEventListener('DOMContentLoaded', bagla);
})();
