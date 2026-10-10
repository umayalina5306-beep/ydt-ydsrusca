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
    { g: 'İçerik Yönetimi', k: 'ic', items: [['icerik', 'İçerik Merkezi', 'kitap'], ['videos', 'Videolar', 'video'], ['content', 'Kelimeler', 'kelime'], ['recs', 'Bloglar ve Makaleler', 'blog']] },
    { g: 'İletişim ve Destek', k: 'il', items: [['notify', 'Bildirim Gönder', 'bildirim'], ['support', 'Destek Talepleri', 'destek'], ['mail', 'Mail Kutusu', 'mail']] },
    { g: 'Site Yönetimi', k: 'site', items: [['visits', 'Ziyaret ve SEO', 'ziyaret'], ['settings', 'Site Ayarları', 'ayar'], ['backup', 'Yedekleme', 'yedek'], ['stafflog', 'İşlem Kayıtları', 'log'], ['errors', 'Hata Kayıtları', 'hata']] }
  ];
  const BASLIK = {   // sayfa başlıkları (görünümdeki h2/p yerine)
    overview: ['Genel Bakış', 'Platformun güncel durumu ve hızlı erişim.'],
    icerikler: ['İçerik Listesi', 'Tüm içerikler tek yerde: ara, filtrele, düzenle ya da yenisini ekle.'],
    icerik: ['İçerik Merkezi', 'Müfredat, e-kitap, çalışmalar, sorular, notlar ve kartlar tek yerden yönetilir.'],
    recs: ['Bloglar ve Makaleler', 'Kendi blog yazılarını oluştur ya da güvenilir kaynaklardan makaleleri ekle.']
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
    let h = '<div class="yp-logo-k"><div class="yp-logo" onclick="ypGit(\'overview\')" role="button" tabindex="0"><span class="yp-logo-ic">' + ic('kitap', 24) + '</span><div><b>YDT-YDS <em>Rusça</em></b><small>Yönetim Paneli</small></div></div>' +
      '<button type="button" class="yp-daralt" onclick="ypDaralt()" aria-label="Menüyü gizle" title="Menüyü gizle / göster">' + ic('menu', 19) + '</button></div><div class="yp-menu" role="navigation" aria-label="Yönetim menüsü">';
    MENU.forEach(g => {
      if (g.g) h += '<div class="yp-grup' + (katli[g.k] ? ' katli' : '') + '" data-k="' + g.k + '"><button type="button" class="yp-grup-b" onclick="ypGrup(\'' + g.k + '\')">' + esc(g.g) + ic('asagi', 14) + '</button><div class="yp-grup-ic">';
      g.items.forEach(([v, ad, ikon, alt]) => {
        h += '<button type="button" class="psb-item yp-it"' + (alt ? '' : ' id="asb-' + v + '"') + ' data-v="' + v + '"' + (alt ? ' data-alt="' + alt + '"' : '') +
          ' title="' + esc(ad) + '" onclick="ypGit(\'' + v + '\'' + (alt ? ', \'' + alt + '\'' : '') + ')">' + ic(ikon) + '<span>' + esc(ad) + '</span><i class="yp-rozet" data-r="' + v + (alt ? '-' + alt : '') + '"></i></button>';
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
    if (v === 'makaleler') { v = 'recs'; window.__ysBlSekme = 'makale'; }
    // İçerik Merkezi'ne taşınan eski sayfalar
    const ICM_YON = { icerikler: 'genel', questions: 'sorular:soru', pquest: 'sorular:pq' };
    if (ICM_YON[v]) { const h = ICM_YON[v].split(':'); window.__icmSoru = h[1] || null; alt = h[0]; v = 'icerik'; }
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
    if (v === 'icerik') ikon = 'kitap';
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
  // Sol menüyü daralt: menü gizlenir, yerinde yalnızca simgelerin durduğu lacivert bir sütun kalır (tercih hatırlanır)
  function ypDaralt() {
    const dar = !document.body.classList.contains('yp-dar');
    document.body.classList.toggle('yp-dar', dar); lsYaz('yp_dar', dar);
    const b = document.querySelector('.yp-daralt'); if (b) b.setAttribute('aria-label', dar ? 'Menüyü göster' : 'Menüyü gizle');
  }
  if (lsOku('yp_dar', false)) document.body.classList.add('yp-dar');
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
    if (t === 'unite' || t === 'set') { const e = gl('EKA'); if (e && typeof e === 'object') e.mode = t === 'set' ? 'set' : 'unit'; if ((aktifGor !== 'icerik')) ypGit('icerik', t); if (typeof ekAdmNew === 'function') ekAdmNew(); return; }
    if (t === 'ozet') { ypGit('icerik', 'ozet'); await bekleKadar(() => $('oz-baslik') && $('ic-ozet').style.display !== 'none' && $('ic-ozet').offsetParent, 4000); if (typeof ozClear === 'function') ozClear(); odakla('oz-baslik'); return; }
    if (t === 'video') { ypGit('videos'); if (typeof adminVidFormClear === 'function') adminVidFormClear(); odakla('cv-title'); return; }
    if (t === 'pq') { ypGit('pquest'); if (typeof adminPqFormClear === 'function') adminPqFormClear(); odakla('cpq-para'); return; }
    if (t === 'soru') { ypGit('questions'); if (typeof pqFormClear === 'function') pqFormClear(); odakla('pq-q'); return; }
    if (t === 'oneri') { ypGit('recs'); if (typeof adminRcFormClear === 'function') adminRcFormClear(); odakla('rc-title'); return; }
    if (t === 'kelime') { ypGit('content'); if (typeof adminWordFormClear === 'function') adminWordFormClear(); odakla('cw-ru'); return; }
  }
  async function ypDuzenle(t, id) {
    const has = (ad) => { const a = gl(ad); return Array.isArray(a) && a.some(r => String(r.id) === String(id)); };
    if (t === 'unite' || t === 'set') { const e = gl('EKA'); if (e && typeof e === 'object') e.mode = t === 'set' ? 'set' : 'unit'; if ((aktifGor !== 'icerik')) ypGit('icerik', t); if (typeof ekAdmEdit === 'function') ekAdmEdit(id); return; }
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
    setTimeout(async () => { const el = $('yp-mk-say'); if (!el) return; try { const { count } = await sb.from('content_articles').select('id', { count: 'exact', head: true }); el.textContent = count == null ? '0' : count; } catch (e) { el.textContent = '0'; } }, 50);
    if (!IX) { k.innerHTML = '<div class="yp-kart"><div class="admin-loading">İçerikler yükleniyor...</div></div>'; await icerikYukle(); }
    const say = {}; TUR_SIRA.forEach(t => say[t] = IX.filter(x => x.tur === t).length);
    if (kelimeSay != null) say.kelime = kelimeSay;
    const sekme = (v, ad, n) => '<button type="button" class="yp-sekme' + (IL.tur === v ? ' aktif' : '') + '" onclick="ypIlAyarla(\'tur\', \'' + v + '\')">' + ad + (n != null ? ' <span>' + n + '</span>' : '') + '</button>';
    const sec = (k2, ops) => '<select class="yp-sel" onchange="ypIlAyarla(\'' + k2 + '\', this.value)">' + ops.map(o => '<option value="' + o[0] + '"' + (IL[k2] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
    k.innerHTML =
      '<div class="yp-ozet-satir">' + TUR_SIRA.map(t => '<button type="button" class="yp-ozet-k' + (IL.tur === t ? ' aktif' : '') + '" onclick="ypIlAyarla(\'tur\', \'' + (IL.tur === t ? 'hepsi' : t) + '\')"><span class="yp-tur-ic r-' + TUR[t].renk + '">' + ic(TUR[t].ic, 18) + '</span><div><b>' + (say[t] == null ? '—' : say[t].toLocaleString('tr-TR')) + '</b><small>' + TUR[t].kisa + '</small></div></button>').join('') +
      '<button type="button" class="yp-ozet-k" onclick="ypGit(\'makaleler\')" title="Bloglar ve Makaleler → Makaleler"><span class="yp-tur-ic r-mor">' + ic('makale', 18) + '</span><div><b id="yp-mk-say">—</b><small>Makale</small></div></button></div>' +
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

  Object.assign(window, { ypIlCiz: () => ilCiz(), ypGit, ypGrup, ypMenuAc, ypDaralt, ypMenuKapat, ypSiteye, ypKapatHepsi, ypHesap, ypZil, ypYeni, ypYeniAc, ypDuzenle });
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
    kullanici_ekle: ['Kullanıcı ekleme', 'Yönetim panelinden yeni hesap açıldı.', 'arti', 'yesil'],
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
      '<button type="button" class="yp-btn ana" onclick="ysIsYenile()">' + ic('yenile', 17) + 'Yenile</button>' +
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

  /* ============================================================
     ORTAK: ⋮ menüsü, aramalı seçim kutusu, dışa aktarma (v172)
     ============================================================ */
  const MENULER = {};
  let acikMenu = null;
  function menuKapat() { if (acikMenu) { acikMenu.remove(); acikMenu = null; } }
  window.ysMenuAc = (e, tur, id) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const btn = e && e.currentTarget;
    const zatenAcik = acikMenu && acikMenu.dataset.kim === tur + ':' + id;
    menuKapat(); if (zatenAcik || !MENULER[tur]) return;
    const ogeler = MENULER[tur](id); if (!ogeler || !ogeler.length) return;
    const m = document.createElement('div'); m.className = 'ys-menu'; m.dataset.kim = tur + ':' + id; m.setAttribute('role', 'menu');
    m.innerHTML = ogeler.map(o => o.ayrac ? '<div class="ys-menu-ayrac"></div>' : o.baslik ? '<div class="ys-menu-bas">' + esc(o.baslik) + '</div>' :
      '<button type="button" role="menuitem" class="' + (o.tehlike ? 'tehlike' : '') + (o.secili ? ' secili' : '') + '" data-fn="' + esc(o.fn) + '">' + ic(o.secili ? 'onay' : o.ic, 16) + '<span>' + esc(o.ad) + '</span></button>').join('');
    document.body.appendChild(m); acikMenu = m;
    const r = btn ? btn.getBoundingClientRect() : { right: e.clientX, bottom: e.clientY, top: e.clientY };
    const h = m.offsetHeight, w = m.offsetWidth;
    let top = r.bottom + 6; if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    m.style.top = top + 'px'; m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    m.addEventListener('click', ev => { const b = ev.target.closest('button[data-fn]'); if (!b) return; const fn = b.dataset.fn; menuKapat(); try { (0, eval)(fn); } catch (x) { console.error(x); } });
  };
  document.addEventListener('mousedown', e => { if (acikMenu && !acikMenu.contains(e.target)) menuKapat(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') menuKapat(); });
  window.addEventListener('scroll', menuKapat, true);
  window.addEventListener('resize', menuKapat);
  const menuB = (tur, id) => '<button type="button" class="ys-uc-nokta" aria-label="İşlemler" title="İşlemler" onclick="ysMenuAc(event, \'' + tur + '\', \'' + esc(id) + '\')">' + ic('nokta3', 17) + '</button>';
  const jsq = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // Aramalı seçim kutusu (öğrenci / öğretmen seçimi)
  const SK = {};
  function secimKutusu(id, ph, liste, secili) {
    SK[id] = { liste: liste, secili: secili || null };
    const s = liste.find(x => x.id === secili);
    return '<div class="ys-sk" id="' + id + '"><div class="ys-ara">' + ic('ara', 17) + '<input type="text" placeholder="' + esc(ph) + '" value="' + esc(s ? s.ad : '') + '" autocomplete="off" ' +
      'oninput="ysSkAra(\'' + id + '\', this.value)" onfocus="ysSkAra(\'' + id + '\', this.value, 1)"><span class="ys-sk-ok">' + ic('asagi', 15) + '</span></div><div class="ys-sk-l"></div></div>';
  }
  window.ysSkAra = (id, q, odak) => {
    const d = SK[id], k = $(id); if (!d || !k) return;
    if (!odak) { d.secili = null; if (d.degisti) d.degisti(null); }
    const l = k.querySelector('.ys-sk-l');
    const t = String(odak && d.secili ? '' : q || '').trim().toLocaleLowerCase('tr');
    const L = d.liste.filter(x => !t || (x.ad + ' ' + (x.alt || '')).toLocaleLowerCase('tr').includes(t)).slice(0, 60);
    l.innerHTML = L.length ? L.map(x => '<button type="button" onmousedown="event.preventDefault()" onclick="ysSkSec(\'' + id + '\', \'' + esc(x.id) + '\')">' + avatar(null, x.ad) + '<span><b>' + esc(x.ad) + '</b><small>' + esc(x.alt || '') + '</small></span></button>').join('') : '<div class="ys-sk-bos">Sonuç yok</div>';
    k.classList.add('acik');
  };
  window.ysSkSec = (id, deger) => {
    const d = SK[id], k = $(id); if (!d || !k) return;
    d.secili = deger; const s = d.liste.find(x => x.id === deger);
    k.querySelector('input').value = s ? s.ad : ''; k.classList.remove('acik');
    if (d.degisti) d.degisti(deger);
  };
  document.addEventListener('mousedown', e => { document.querySelectorAll('.ys-sk.acik').forEach(k => { if (!k.contains(e.target)) k.classList.remove('acik'); }); });

  function csvIndir(ad, basliklar, satirlar) {
    const hucre = v => { v = v == null ? '' : String(v); return /[";\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const metin = '﻿' + [basliklar].concat(satirlar).map(r => r.map(hucre).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }));
    a.download = ad + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const RENKLER = ['#2563eb', '#7c3aed', '#0e7490', '#b0862c', '#15803d', '#c2410c', '#be185d', '#475569'];
  function harfAv(ad) {
    const p = String(ad || '?').trim().split(/\s+/), h = ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toLocaleUpperCase('tr');
    let n = 0; for (const c of String(ad || '')) n = (n * 31 + c.charCodeAt(0)) % 997;
    return '<span class="ys-av renkli" style="background:' + RENKLER[n % RENKLER.length] + '">' + esc(h) + '</span>';
  }
  function globalAta(ad, deger) { window.__ysTmp = deger; try { (0, eval)(ad + ' = window.__ysTmp'); } catch (e) {} delete window.__ysTmp; }
  const superMi = () => { const f = gl('_isSuper'); return typeof f === 'function' ? f() : false; };

  /* ============================================================
     KULLANICILAR
     ============================================================ */
  const UK = { ara: '', rol: 'hepsi', plan: 'hepsi', durum: 'hepsi', sayfa: 1, boy: 10, secili: new Set(), son: null, kurum: {}, acik: null, yuk: false };
  const ROLLER = { yonetici: ['Yönetici', 'altin'], destek: ['Destek', 'turuncu'], ogretmen: ['Öğretmen', 'mavi'], kurum: ['Kurum yöneticisi', 'camgobegi'], ogrenci: ['Öğrenci', 'mor'] };
  const rolKod = u => u.is_admin ? 'yonetici' : (u.role === 'destek' || u.role === 'ogretmen' || u.role === 'kurum') ? u.role : 'ogrenci';
  const premiumMu = u => u.plan === 'premium' && (!u.premium_until || new Date(u.premium_until) > new Date());
  const AKTIF_GUN = 30;
  function durumKod(u) {
    if (!UK.son) return 'bilinmiyor';
    const t = UK.son[u.id] || u.created_at; if (!t) return 'pasif';
    return (Date.now() - new Date(t).getTime()) < AKTIF_GUN * GUN ? 'aktif' : 'pasif';
  }
  async function kullaniciYukle() {
    const k = $('ys-kul'); if (!k) return;
    if (!kullanicilar().length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    UK.yuk = true;
    const alan = 'id, email, display_name, plan, is_admin, role, level, streak_count, created_at, premium_until';
    try {
      let r = await sb.from('profiles').select(alan + ', kurum_id').order('created_at', { ascending: false });
      if (r.error) r = await sb.from('profiles').select(alan).order('created_at', { ascending: false });
      if (r.error) throw r.error;
      globalAta('_adminUsers', r.data || []);
      const [ku, son] = await Promise.all([
        sb.from('kurumlar').select('id, name').then(x => x, () => ({ data: [] })),
        sb.from('access_log').select('user_id, created_at').order('created_at', { ascending: false }).limit(5000).then(x => x, () => ({ error: 1 }))
      ]);
      UK.kurum = {}; ((ku && ku.data) || []).forEach(x => UK.kurum[x.id] = x.name);
      if (son && !son.error && son.data) { UK.son = {}; son.data.forEach(x => { if (x.user_id && !UK.son[x.user_id]) UK.son[x.user_id] = x.created_at; }); } else UK.son = null;
    } catch (e) {
      k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('kullanicilar', 28) + '<b>Kullanıcılar yüklenemedi.</b><span>admin-rls.sql kuralları çalıştırıldı mı?</span></div></div>'; UK.yuk = false; return;
    }
    UK.yuk = false; UK.secili.clear();
    kullaniciCiz();
  }
  function kullaniciFiltre() {
    const q = UK.ara.trim().toLocaleLowerCase('tr');
    return kullanicilar().filter(u => (UK.rol === 'hepsi' || rolKod(u) === UK.rol) && (UK.plan === 'hepsi' || (UK.plan === 'premium') === premiumMu(u)) &&
      (UK.durum === 'hepsi' || durumKod(u) === UK.durum) &&
      (!q || [u.display_name, u.email, u.kurum_id && UK.kurum[u.kurum_id], (ROLLER[rolKod(u)] || [])[0]].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
  }
  function kullaniciCiz() {
    const k = $('ys-kul'); if (!k) return;
    const T = kullanicilar(), L = kullaniciFiltre();
    const aktif = UK.son ? T.filter(u => durumKod(u) === 'aktif').length : null;
    const n = Math.max(1, Math.ceil(L.length / UK.boy)); if (UK.sayfa > n) UK.sayfa = n;
    const dilim = L.slice((UK.sayfa - 1) * UK.boy, UK.sayfa * UK.boy);
    const tumSecili = dilim.length && dilim.every(u => UK.secili.has(u.id));
    const filtreVar = UK.ara || UK.rol !== 'hepsi' || UK.plan !== 'hepsi' || UK.durum !== 'hepsi';
    let h = '<div class="ys-kpiler d5">' +
      kpi('kullanicilar', 'mavi', 'Toplam kullanıcı', T.length.toLocaleString('tr-TR'), '<small>' + T.filter(premiumMu).length + ' premium</small>') +
      kpi('onay', 'yesil', 'Aktif kullanıcı', aktif == null ? '—' : aktif.toLocaleString('tr-TR'), '<small>son ' + AKTIF_GUN + ' günde giriş</small>') +
      kpi('saat', 'gri', 'Pasif kullanıcı', aktif == null ? '—' : (T.length - aktif).toLocaleString('tr-TR'), '<small>' + AKTIF_GUN + ' gündür girmeyen</small>') +
      kpi('ogretmen', 'mavi', 'Öğretmen', T.filter(u => u.role === 'ogretmen').length, '') +
      kpi('kurum', 'mor', 'Kurum kullanıcısı', T.filter(u => u.kurum_id).length, '') + '</div>';
    h += '<div class="yp-kart ys-liste"><div class="ys-arac">' +
      aramaKutusu('admin-search', UK.ara, 'İsim, e-posta veya kurum ara…', 'ysUk(\'ara\', this.value)') +
      secim('Rol', UK.rol, [['hepsi', 'Tüm roller']].concat(Object.keys(ROLLER).map(r => [r, ROLLER[r][0]])), 'ysUk(\'rol\', this.value)') +
      secim('Plan', UK.plan, [['hepsi', 'Tüm planlar'], ['premium', 'Premium'], ['ucretsiz', 'Ücretsiz']], 'ysUk(\'plan\', this.value)') +
      secim('Durum', UK.durum, [['hepsi', 'Tüm durumlar'], ['aktif', 'Aktif'], ['pasif', 'Pasif']], 'ysUk(\'durum\', this.value)') +
      (filtreVar ? '<button type="button" class="yp-btn" onclick="ysUkTemizle()">' + ic('kapat', 15) + 'Temizle</button>' : '') + '</div>';
    if (UK.secili.size) h += '<div class="ys-secbar"><b>' + UK.secili.size + ' kullanıcı seçili</b><button type="button" class="yp-btn kucuk" onclick="ysUkDisa(true)">' + ic('indir', 15) + 'Seçilenleri dışa aktar</button><button type="button" class="yp-link" onclick="ysUkSec(\'temizle\')">Seçimi kaldır</button></div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('kullanicilar', 30) + '<b>' + (T.length ? 'Filtreye uyan kullanıcı yok.' : 'Henüz kullanıcı yok.') + '</b></div>';
    else {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th class="ys-cb"><input type="checkbox" ' + (tumSecili ? 'checked' : '') + ' onchange="ysUkSec(\'sayfa\', this.checked)" aria-label="Sayfadakileri seç"></th><th>Kullanıcı</th><th>E-posta</th><th>Rol</th><th>Plan</th><th>Kurum</th><th>Durum</th><th>Kayıt tarihi</th><th>Son giriş</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>';
      dilim.forEach(u => {
        const ad = kisiAd(u), R = ROLLER[rolKod(u)], d = durumKod(u), prem = premiumMu(u);
        h += '<tr' + (UK.acik === u.id ? ' class="acik"' : '') + '><td class="ys-cb"><input type="checkbox" ' + (UK.secili.has(u.id) ? 'checked' : '') + ' onchange="ysUkSec(\'' + u.id + '\', this.checked)" aria-label="Seç"></td>' +
          '<td><button type="button" class="ys-kisi-b" onclick="ysUkAc(\'' + u.id + '\')">' + harfAv(ad) + '<b>' + esc(ad) + '</b></button></td>' +
          '<td class="ys-soluk">' + esc(u.email || '—') + '</td>' +
          '<td><span class="yp-durum r-' + R[1] + '">' + R[0] + '</span></td>' +
          '<td><span class="yp-durum ' + (prem ? 'r-altin' : 'r-mavi') + '"' + (prem && u.premium_until ? ' title="' + esc(tarih(u.premium_until)) + ' tarihine kadar"' : '') + '>' + (prem ? 'Premium' : 'Ücretsiz') + '</span></td>' +
          '<td class="ys-soluk">' + esc((u.kurum_id && UK.kurum[u.kurum_id]) || '—') + '</td>' +
          '<td>' + (d === 'bilinmiyor' ? '<span class="ys-soluk">—</span>' : '<span class="yp-durum ' + (d === 'aktif' ? 'd-yesil' : 'd-kirmizi') + '">' + (d === 'aktif' ? 'Aktif' : 'Pasif') + '</span>') + '</td>' +
          '<td class="ys-tar">' + tarih(u.created_at) + '</td>' +
          '<td class="ys-tar">' + (UK.son && UK.son[u.id] ? tarih(UK.son[u.id]) : '<span class="ys-soluk">—</span>') + '</td>' +
          '<td class="ys-sag">' + menuB('kul', u.id) + '</td></tr>';
        if (UK.acik === u.id) h += '<tr class="ys-ac-satir"><td colspan="10">' + kullaniciDetay(u) + '</td></tr>';
      });
      h += '</tbody></table></div>' + sayfalama(L.length, UK.sayfa, UK.boy, 'ysUkSayfa', 'kullanıcı');
    }
    k.innerHTML = h + '</div>';
    if (UK.acik && $('udet-' + UK.acik) && typeof adminUserDetail === 'function') adminUserDetail(UK.acik);
  }
  function kullaniciDetay(u) {
    const prem = premiumMu(u);
    const bilgi = [['E-posta', u.email || '—'], ['Seviye', u.level || 'seviye yok'], ['Seri', (u.streak_count || 0) + ' gün'], ['Kayıt', tarih(u.created_at)],
      ['Plan', prem ? 'Premium' + (u.premium_until ? ' (' + tarih(u.premium_until) + ' tarihine kadar)' : '') : 'Ücretsiz']];
    let h = '<div class="ys-detay-k"><div class="ys-detay-bilgi">' + bilgi.map(b => '<div><small>' + b[0] + '</small><b>' + esc(b[1]) + '</b></div>').join('') + '</div>';
    if (superMi() && !u.is_admin) h += '<div class="ys-detay-rol"><small>Rol</small><div class="ys-mini-sekme">' + [['user', 'Öğrenci'], ['destek', 'Destek'], ['ogretmen', 'Öğretmen'], ['kurum', 'Kurum yöneticisi']]
      .map(r => '<button type="button" class="' + ((u.role || 'user') === r[0] || (r[0] === 'user' && !['destek', 'ogretmen', 'kurum'].includes(u.role)) ? 'aktif' : '') + '" onclick="ysUkRol(\'' + u.id + '\', \'' + r[0] + '\')">' + r[1] + '</button>').join('') + '</div></div>';
    h += '</div><div id="udet-' + u.id + '" class="udet-box ys-udet" style="display:none"></div>';
    return h;
  }
  MENULER.kul = id => {
    const u = kisiBul(id); if (!u) return [];
    const ad = kisiAd(u), prem = premiumMu(u), L = [];
    L.push({ ic: 'goz', ad: UK.acik === id ? 'Ayrıntıları kapat' : 'Ayrıntılar ve giriş kayıtları', fn: "ysUkAc('" + id + "')" });
    if (!u.is_admin) {
      L.push({ ic: 'tac', ad: 'Premium tanımla', fn: "adminGiftPremium('" + id + "')" });
      if (prem) L.push({ ic: 'carpi', ad: 'Ücretsiz plana al', fn: "togglePremium('" + id + "', 'premium')" });
    }
    L.push({ ayrac: 1 });
    L.push({ ic: 'bildirim', ad: 'Bildirim gönder', fn: "adminUserNotify('" + id + "', '" + jsq(u.display_name || '') + "')" });
    if (u.email) {
      L.push({ ic: 'anahtar', ad: 'Şifre yenileme maili', fn: "adminUserResetPw('" + jsq(u.email) + "')" });
      L.push({ ic: 'mail', ad: 'Onay maili gönder', fn: "tkResendVerify('" + jsq(u.email) + "')" });
      L.push({ ic: 'kalem', ad: 'E-posta değiştir', fn: "adminUserChangeEmail('" + id + "', '" + jsq(u.email) + "')" });
    }
    if (superMi() && !u.is_admin && !(gl('currentUser') && gl('currentUser').id === id)) { L.push({ ayrac: 1 }); L.push({ ic: 'cop', ad: 'Kullanıcıyı sil', fn: "adminUserDelete('" + id + "')", tehlike: 1 }); }
    return L;
  };
  window.ysUk = (a, v) => { UK[a] = v; UK.sayfa = 1; kullaniciCiz(); if (a === 'ara') { const i = $('admin-search'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysUkTemizle = () => { Object.assign(UK, { ara: '', rol: 'hepsi', plan: 'hepsi', durum: 'hepsi', sayfa: 1 }); kullaniciCiz(); };
  window.ysUkSayfa = (s, boy) => { if (boy) UK.boy = boy; UK.sayfa = s; kullaniciCiz(); };
  window.ysUkAc = id => { UK.acik = UK.acik === id ? null : id; kullaniciCiz(); };
  window.ysUkSec = (id, acik) => {
    if (id === 'temizle') UK.secili.clear();
    else if (id === 'sayfa') kullaniciFiltre().slice((UK.sayfa - 1) * UK.boy, UK.sayfa * UK.boy).forEach(u => acik ? UK.secili.add(u.id) : UK.secili.delete(u.id));
    else acik ? UK.secili.add(id) : UK.secili.delete(id);
    kullaniciCiz();
  };
  window.ysUkRol = async (id, rol) => {
    const u = kisiBul(id); if (!u || (u.role || 'user') === rol) return;
    if (typeof adminSetRole === 'function') await adminSetRole(id, rol, u.display_name || '');
    kullaniciCiz();
  };
  window.ysUkDisa = secilen => {
    const L = secilen ? kullanicilar().filter(u => UK.secili.has(u.id)) : kullaniciFiltre();
    csvIndir('kullanicilar', ['Ad', 'E-posta', 'Rol', 'Plan', 'Premium bitiş', 'Kurum', 'Durum', 'Seviye', 'Kayıt tarihi', 'Son giriş'],
      L.map(u => [kisiAd(u), u.email || '', ROLLER[rolKod(u)][0], premiumMu(u) ? 'Premium' : 'Ücretsiz', u.premium_until ? tarih(u.premium_until) : '', (u.kurum_id && UK.kurum[u.kurum_id]) || '',
        { aktif: 'Aktif', pasif: 'Pasif' }[durumKod(u)] || '', u.level || '', tarih(u.created_at), UK.son && UK.son[u.id] ? new Date(UK.son[u.id]).toLocaleString('tr-TR') : '']));
  };
  // Yeni kullanıcı ekle (yalnız yönetici) — hesap "kullanici-ekle" sunucu fonksiyonunda açılır
  window.ysUkYeni = async () => {
    if (!superMi()) { uiAlert('Bu işlem için yönetici yetkisi gerekli.'); return; }
    let kurumlar = Object.entries(UK.kurum || {});
    if (!kurumlar.length) { try { const { data } = await sb.from('kurumlar').select('id, name'); kurumlar = (data || []).map(k => [k.id, k.name]); } catch (e) {} }
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'ys-uk-modal';
    ov.innerHTML = '<div class="ui-modal ys-modal genis" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('kullanici', 20) + '</span><h3>Yeni kullanıcı ekle</h3><button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'ys-uk-modal\').remove()">' + ic('kapat', 17) + '</button></div>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Ad soyad</span><input id="ys-uk-ad" class="ys-girdi" maxlength="80" placeholder="Örn. Elif Güven" autocomplete="off"></label>' +
      '<label class="ys-alan"><span>E-posta</span><input id="ys-uk-email" class="ys-girdi" type="email" maxlength="254" placeholder="ornek@gmail.com" autocomplete="off"></label></div>' +
      '<div class="ys-alan"><span>Şifre</span><div class="ys-secenek">' +
      '<label><input type="radio" name="ys-uk-sifre" value="link" checked onchange="ysUkSifreTur()"><span><b>Kullanıcı kendisi belirlesin</b><small>Hesap açılınca e-posta adresine şifre belirleme bağlantısı gönderilir.</small></span></label>' +
      '<label><input type="radio" name="ys-uk-sifre" value="elle" onchange="ysUkSifreTur()"><span><b>Şifreyi ben belirleyeyim</b><small>Şifreyi kullanıcıya kendin iletirsin.</small></span></label></div>' +
      '<input id="ys-uk-sifre" class="ys-girdi" type="text" minlength="6" maxlength="72" placeholder="En az 6 karakter" autocomplete="off" style="display:none"></div>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Rol</span><select id="ys-uk-rol" class="ys-girdi"><option value="user">Öğrenci</option><option value="ogretmen">Öğretmen</option><option value="destek">Destek</option><option value="kurum">Kurum yöneticisi</option></select></label>' +
      '<label class="ys-alan"><span>Kurum (isteğe bağlı)</span><select id="ys-uk-kurum" class="ys-girdi"><option value="">Kurum yok</option>' + kurumlar.map(k => '<option value="' + esc(k[0]) + '">' + esc(k[1]) + '</option>').join('') + '</select></label></div>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Plan</span><select id="ys-uk-plan" class="ys-girdi" onchange="document.getElementById(\'ys-uk-ay-k\').style.visibility = this.value === \'premium\' ? \'visible\' : \'hidden\'"><option value="free">Ücretsiz</option><option value="premium">Premium</option></select></label>' +
      '<label class="ys-alan" id="ys-uk-ay-k" style="visibility:hidden"><span>Premium süresi</span><select id="ys-uk-ay" class="ys-girdi"><option value="1">1 ay</option><option value="3">3 ay</option><option value="6" selected>6 ay</option><option value="12">12 ay</option></select></label></div>' +
      '<div class="ys-not">' + ic('bilgi', 18) + '<div><span>Hesap e-postası onaylanmış olarak açılır; kayıt onay kodu ve e-posta uzantısı kısıtı panelden eklenen hesaplara uygulanmaz.</span></div></div>' +
      '<div class="ys-modal-alt"><button type="button" class="yp-btn" onclick="document.getElementById(\'ys-uk-modal\').remove()">Vazgeç</button><button type="button" class="yp-btn ana" id="ys-uk-kaydet" onclick="ysUkEkle()">' + ic('arti', 16) + 'Kullanıcıyı ekle</button></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); setTimeout(() => { const i = $('ys-uk-ad'); if (i) i.focus(); }, 30);
  };
  window.ysUkSifreTur = () => {
    const elle = (document.querySelector('input[name="ys-uk-sifre"]:checked') || {}).value === 'elle', i = $('ys-uk-sifre');
    if (i) { i.style.display = elle ? '' : 'none'; if (elle) i.focus(); }
  };
  window.ysUkEkle = async () => {
    const ad = ($('ys-uk-ad').value || '').trim(), email = ($('ys-uk-email').value || '').trim().toLowerCase();
    const elle = (document.querySelector('input[name="ys-uk-sifre"]:checked') || {}).value === 'elle', sifre = elle ? $('ys-uk-sifre').value : '';
    if (!ad) { uiAlert('Ad soyad zorunlu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { uiAlert('Geçerli bir e-posta adresi yaz.'); return; }
    if (elle && sifre.length < 6) { uiAlert('Şifre en az 6 karakter olmalı.'); return; }
    const b = $('ys-uk-kaydet'); if (b) { b.disabled = true; b.textContent = 'Ekleniyor…'; }
    const govde = { email, ad, sifre: sifre || undefined, rol: $('ys-uk-rol').value, plan: $('ys-uk-plan').value, premium_ay: +$('ys-uk-ay').value, kurum_id: $('ys-uk-kurum').value || undefined };
    let r;
    try {
      const { data, error } = await sb.functions.invoke('kullanici-ekle', { body: govde });
      if (error) { let m = ''; try { const j = error.context && await error.context.json(); m = j && j.hata; } catch (e) {} r = { ok: false, hata: m || 'Sunucu fonksiyonuna ulaşılamadı. kullanici-ekle fonksiyonu kuruldu mu?' }; }
      else r = data || { ok: false, hata: 'Beklenmeyen bir yanıt alındı.' };
    } catch (e) { r = { ok: false, hata: 'Sunucu fonksiyonuna ulaşılamadı.' }; }
    if (!r.ok) { if (b) { b.disabled = false; b.innerHTML = ic('arti', 16) + 'Kullanıcıyı ekle'; } uiAlert(r.hata || 'Kullanıcı eklenemedi.'); return; }
    const m = $('ys-uk-modal'); if (m) m.remove();
    toast('Kullanıcı eklendi: ' + ad);
    UK.ara = email; UK.sayfa = 1;
    await kullaniciYukle();
    if (!elle && typeof adminUserResetPw === 'function') adminUserResetPw(email);
  };
  window.YS_AKS.users = () => '<button type="button" class="yp-btn" onclick="ysUkDisa()">' + ic('indir', 16) + 'Dışa aktar</button>' + (superMi() ? '<button type="button" class="yp-btn ana" onclick="ysUkYeni()">' + ic('arti', 16) + 'Yeni kullanıcı ekle</button>' : '');

  /* ============================================================
     ÖĞRETMEN ATAMA
     ============================================================ */
  const AS = { sekme: 'yeni', ogretmenler: [], ogrenciler: [], rows: [], ara: '', ogr: 'hepsi', sayfa: 1, boy: 10, toplu: new Set(), topluAra: '', topluBos: false };
  const kisiListe = L => L.map(p => ({ id: p.id, ad: kisiAd(p), alt: p.email || '' }));
  async function atamaYukle() {
    const k = $('ys-atama'); if (!k) return;
    if (!AS.rows.length && !AS.ogretmenler.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const [p, r] = await Promise.all([sb.from('profiles').select('id, display_name, email, role, is_admin, created_at'), sb.from('teacher_students').select('*').limit(5000)]);
      if (r.error) throw r.error;
      const all = (p.data || []).sort((a, b) => kisiAd(a).localeCompare(kisiAd(b), 'tr'));
      if (!kullanicilar().length) KUL = all;
      AS.ogretmenler = all.filter(x => x.role === 'ogretmen');
      AS.ogrenciler = all.filter(x => !x.is_admin && x.role !== 'ogretmen' && x.role !== 'destek');
      AS.rows = (r.data || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      AS.kisi = {}; all.forEach(x => AS.kisi[x.id] = x);
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('ogretmen', 28) + '<b>Atamalar okunamadı.</b><span>roller_altyapi.sql çalıştırıldı mı?</span></div></div>'; return; }
    atamaCiz();
  }
  const asKisi = id => (AS.kisi && AS.kisi[id]) || kisiBul(id);
  function atamaTablo(rows, tam) {
    if (!rows.length) return '<div class="yp-bos">' + ic('ogretmen', 30) + '<b>Henüz eşleştirme yok.</b></div>';
    let h = '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Öğrenci</th><th>Öğretmen</th><th>Tarih</th><th>Durum</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>';
    rows.forEach(r => {
      const o = asKisi(r.student_id), t = asKisi(r.teacher_id);
      const kisi = (p, id) => '<div class="ys-kim orta">' + harfAv(p ? kisiAd(p) : '?') + '<div><b>' + esc(p ? kisiAd(p) : String(id).slice(0, 8) + '…') + '</b>' + (tam && p && p.email ? '<small>' + esc(p.email) + '</small>' : '') + '</div></div>';
      h += '<tr><td>' + kisi(o, r.student_id) + '</td><td>' + kisi(t, r.teacher_id) + '</td><td class="ys-tar">' + tarih(r.created_at) + '</td>' +
        '<td>' + (t && t.role === 'ogretmen' ? '<span class="yp-durum d-yesil">Aktif</span>' : '<span class="yp-durum d-sari" title="Bu kişinin artık öğretmen rolü yok">Rolü kaldırılmış</span>') + '</td>' +
        '<td class="ys-sag">' + menuB('asg', r.teacher_id + '|' + r.student_id) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function atamaCiz() {
    const k = $('ys-atama'); if (!k) return;
    const sekmeler = [['yeni', 'Yeni eşleştirme', 'arti'], ['mevcut', 'Mevcut eşleştirmeler', 'liste'], ['toplu', 'Toplu işlemler', 'kullanicilar']];
    let h = '<div class="yp-kart ys-sekme-kart"><div class="ys-sekme-cubuk">' + sekmeler.map(s => '<button type="button" class="' + (AS.sekme === s[0] ? 'aktif' : '') + '" onclick="ysAs(\'sekme\', \'' + s[0] + '\')">' + ic(s[2], 16) + s[1] + (s[0] === 'mevcut' ? '<i>' + AS.rows.length + '</i>' : '') + '</button>').join('') + '</div></div>';
    const ogrL = kisiListe(AS.ogrenciler), ogtL = kisiListe(AS.ogretmenler);
    const ogretmenYok = !AS.ogretmenler.length ? '<div class="ys-uyari">' + ic('bilgi', 18) + '<span>Henüz öğretmen yok. Kullanıcılar sayfasında bir kişinin ayrıntılarını açıp rolünü <b>Öğretmen</b> yap.</span></div>' : '';
    if (AS.sekme === 'yeni') {
      h += '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('liste', 18) + 'Yeni eşleştirme</h3></div>' + ogretmenYok +
        '<div class="ys-esle"><label class="ys-alan"><span>Öğrenci seç</span>' + secimKutusu('ys-as-ogr', 'Öğrenci adı veya e-posta ara…', ogrL) + '</label>' +
        '<span class="ys-esle-ok">' + ic('okSag', 20) + '</span>' +
        '<label class="ys-alan"><span>Öğretmen seç</span>' + secimKutusu('ys-as-ogt', 'Öğretmen adı veya e-posta ara…', ogtL) + '</label></div>' +
        '<div class="ys-esle-alt"><div class="ys-not">' + ic('bilgi', 18) + '<div><span>Eşleştirmeden sonra öğretmen, kendi panelinde bu öğrencinin çalışmalarını, ilerlemesini ve raporlarını görebilir. Bir öğrenci birden fazla öğretmene bağlanabilir.</span></div></div>' +
        '<button type="button" class="yp-btn ana" onclick="ysAsEsle()">' + ic('link', 16) + 'Eşleştir</button></div></section>' +
        '<section class="yp-kart ys-liste"><div class="yp-kart-bas ys-ic-bas"><h3>' + ic('saat', 18) + 'Son eşleştirmeler</h3>' + (AS.rows.length > 5 ? '<button type="button" class="yp-link" onclick="ysAs(\'sekme\', \'mevcut\')">Tümünü gör (' + AS.rows.length + ')</button>' : '') + '</div>' + atamaTablo(AS.rows.slice(0, 5)) + '</section>';
    } else if (AS.sekme === 'mevcut') {
      const q = AS.ara.trim().toLocaleLowerCase('tr');
      const L = AS.rows.filter(r => (AS.ogr === 'hepsi' || r.teacher_id === AS.ogr) && (!q || [asKisi(r.student_id), asKisi(r.teacher_id)].filter(Boolean).map(p => kisiAd(p) + ' ' + (p.email || '')).join(' ').toLocaleLowerCase('tr').includes(q)));
      const n = Math.max(1, Math.ceil(L.length / AS.boy)); if (AS.sayfa > n) AS.sayfa = n;
      h += '<section class="yp-kart ys-liste"><div class="ys-arac">' + aramaKutusu('ys-as-ara', AS.ara, 'Öğrenci veya öğretmen ara…', 'ysAs(\'ara\', this.value)') +
        secim('Öğretmen', AS.ogr, [['hepsi', 'Tüm öğretmenler']].concat(AS.ogretmenler.map(t => [t.id, kisiAd(t) + ' (' + AS.rows.filter(r => r.teacher_id === t.id).length + ')'])), 'ysAs(\'ogr\', this.value)', true) + '</div>' +
        atamaTablo(L.slice((AS.sayfa - 1) * AS.boy, AS.sayfa * AS.boy), true) + (L.length ? sayfalama(L.length, AS.sayfa, AS.boy, 'ysAsSayfa', 'eşleştirme') : '') + '</section>';
    } else {
      const q = AS.topluAra.trim().toLocaleLowerCase('tr');
      const bagli = new Set(AS.rows.map(r => r.student_id));
      const L = AS.ogrenciler.filter(p => (!AS.topluBos || !bagli.has(p.id)) && (!q || (kisiAd(p) + ' ' + (p.email || '')).toLocaleLowerCase('tr').includes(q)));
      h += '<section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('kullanicilar', 18) + 'Birden çok öğrenciyi aynı öğretmene bağla</h3></div>' + ogretmenYok +
        '<div class="ys-toplu-ust"><label class="ys-alan"><span>Öğretmen</span>' + secimKutusu('ys-as-togt', 'Öğretmen adı veya e-posta ara…', ogtL, AS.topluOgt) + '</label>' +
        '<button type="button" class="yp-btn ana" onclick="ysAsTopluAta()"' + (AS.toplu.size ? '' : ' disabled') + '>' + ic('link', 16) + (AS.toplu.size ? AS.toplu.size + ' öğrenciyi ata' : 'Öğrenci seç') + '</button></div>' +
        '<div class="ys-arac ic">' + aramaKutusu('ys-as-tara', AS.topluAra, 'Öğrenci ara…', 'ysAsToplu(\'ara\', this.value)') +
        '<label class="ys-anahtar kucuk"><input type="checkbox" ' + (AS.topluBos ? 'checked' : '') + ' onchange="ysAsToplu(\'bos\', this.checked)"><i></i><span>Yalnızca öğretmeni olmayanlar</span></label>' +
        '<button type="button" class="yp-link" onclick="ysAsToplu(\'hepsi\')">' + (L.length && L.every(p => AS.toplu.has(p.id)) ? 'Seçimi kaldır' : 'Listedekilerin hepsini seç') + '</button></div>' +
        '<div class="ys-secim-liste">' + (L.length ? L.slice(0, 300).map(p => '<label class="' + (AS.toplu.has(p.id) ? 'secili' : '') + '"><input type="checkbox" ' + (AS.toplu.has(p.id) ? 'checked' : '') + ' onchange="ysAsToplu(\'sec\', \'' + p.id + '\')">' + harfAv(kisiAd(p)) +
          '<span><b>' + esc(kisiAd(p)) + '</b><small>' + esc(p.email || '') + '</small></span>' + (bagli.has(p.id) ? '<em class="yp-durum d-gri">' + AS.rows.filter(r => r.student_id === p.id).length + ' öğretmen</em>' : '') + '</label>').join('') : '<div class="yp-bos kucuk"><span>Öğrenci bulunamadı.</span></div>') +
        (L.length > 300 ? '<div class="ys-soluk ys-ince-not">İlk 300 kişi gösteriliyor; aramayı daralt.</div>' : '') + '</div></section>';
    }
    k.innerHTML = h;
    if (SK['ys-as-togt']) SK['ys-as-togt'].degisti = v => { AS.topluOgt = v; };
  }
  async function ataYap(ogretmen, ogrenciler) {
    const yeni = ogrenciler.filter(s => !AS.rows.some(r => r.teacher_id === ogretmen && r.student_id === s));
    if (!yeni.length) { uiAlert('Seçilen öğrenciler zaten bu öğretmene bağlı.'); return false; }
    try {
      const { error } = await sb.from('teacher_students').upsert(yeni.map(s => ({ teacher_id: ogretmen, student_id: s })));
      if (error) throw error;
      yeni.forEach(s => { try { staffLog('ogrenci_ata', s, { ogretmen: ogretmen }); } catch (e) {} });
      toast(yeni.length === 1 ? 'Eşleştirme kaydedildi.' : yeni.length + ' öğrenci eşleştirildi.');
      return true;
    } catch (e) { uiAlert('Eşleştirilemedi. roller_altyapi.sql çalıştırıldı mı?'); return false; }
  }
  window.ysAs = (a, v) => { AS[a] = v; if (a !== 'sekme') AS.sayfa = 1; menuKapat(); atamaCiz(); if (a === 'ara') { const i = $('ys-as-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysAsSayfa = (s, boy) => { if (boy) AS.boy = boy; AS.sayfa = s; atamaCiz(); };
  window.ysAsEsle = async () => {
    const o = SK['ys-as-ogr'] && SK['ys-as-ogr'].secili, t = SK['ys-as-ogt'] && SK['ys-as-ogt'].secili;
    if (!o || !t) { uiAlert('Önce listeden bir öğrenci ve bir öğretmen seç.'); return; }
    if (await ataYap(t, [o])) atamaYukle();
  };
  window.ysAsToplu = (a, v) => {
    if (a === 'ara') AS.topluAra = v;
    else if (a === 'bos') AS.topluBos = v;
    else if (a === 'sec') AS.toplu.has(v) ? AS.toplu.delete(v) : AS.toplu.add(v);
    else if (a === 'hepsi') {
      const q = AS.topluAra.trim().toLocaleLowerCase('tr'), bagli = new Set(AS.rows.map(r => r.student_id));
      const L = AS.ogrenciler.filter(p => (!AS.topluBos || !bagli.has(p.id)) && (!q || (kisiAd(p) + ' ' + (p.email || '')).toLocaleLowerCase('tr').includes(q))).slice(0, 300);
      const hepsi = L.length && L.every(p => AS.toplu.has(p.id)); L.forEach(p => hepsi ? AS.toplu.delete(p.id) : AS.toplu.add(p.id));
    }
    const y = window.scrollY; atamaCiz(); window.scrollTo(0, y);
    if (a === 'ara') { const i = $('ys-as-tara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }
  };
  window.ysAsTopluAta = async () => {
    const t = AS.topluOgt || (SK['ys-as-togt'] && SK['ys-as-togt'].secili);
    if (!t) { uiAlert('Önce bir öğretmen seç.'); return; }
    if (!AS.toplu.size) return;
    const ad = kisiAd(asKisi(t));
    if (!(await uiConfirm(AS.toplu.size + ' öğrenci ' + ad + ' adlı öğretmene bağlanacak.', 'Toplu eşleştirme', { confirmText: 'Eşleştir' }))) return;
    if (await ataYap(t, [...AS.toplu])) { AS.toplu.clear(); atamaYukle(); }
  };
  MENULER.asg = anahtar => {
    const [t, s] = anahtar.split('|'); const o = asKisi(s);
    return [{ ic: 'kullanici', ad: 'Öğrenciyi Kullanıcılar\'da aç', fn: "ysKisiyeGit('" + s + "')" },
      { ic: 'ogretmen', ad: 'Öğretmenin tüm öğrencileri', fn: "ysAs('ogr', '" + t + "'); ysAs('sekme', 'mevcut')" },
      { ayrac: 1 }, { ic: 'carpi', ad: 'Eşleştirmeyi kaldır', fn: "adminAssignRemove('" + t + "', '" + s + "')", tehlike: 1 }].filter(x => x.ayrac || !(x.fn.startsWith('ysKisiyeGit') && !o));
  };
  window.ysKisiyeGit = id => {
    const p = asKisi(id) || kisiBul(id); if (typeof ypGit === 'function') ypGit('users');
    setTimeout(() => { UK.ara = (p && p.email) || ''; UK.acik = id; UK.sayfa = 1; kullaniciCiz(); }, 150);
  };

  /* ============================================================
     KURUMLAR
     ============================================================ */
  const KR = { rows: [], uye: {}, yon: {}, ara: '', durum: 'hepsi', plan: 'hepsi', sayfa: 1, boy: 10, secili: new Set() };
  const PLANLAR = { basic: ['Basic', 'r-mavi', '100 öğrenci'], premium: ['Premium', 'r-altin', '500 öğrenci'], enterprise: ['Enterprise', 'r-mor', 'sınırsız'] };
  async function kurumYukle() {
    const k = $('ys-kurum'); if (!k) return;
    if (!KR.rows.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const { data, error } = await sb.from('kurumlar').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      KR.rows = data || []; KR.uye = {}; KR.yon = {};
      if (KR.rows.length) {
        const { data: m } = await sb.from('profiles').select('id, display_name, email, kurum_id, role').in('kurum_id', KR.rows.map(x => x.id));
        (m || []).forEach(p => {
          const s = KR.uye[p.kurum_id] || (KR.uye[p.kurum_id] = { ogretmen: 0, ogrenci: 0, toplam: 0 });
          s.toplam++; if (p.role === 'ogretmen') s.ogretmen++; else if (p.role === 'kurum') (KR.yon[p.kurum_id] = KR.yon[p.kurum_id] || []).push(p); else s.ogrenci++;
        });
      }
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('kurum', 28) + '<b>Kurumlar okunamadı.</b><span>' + esc((e && e.message) || '') + '</span></div></div>'; return; }
    KR.secili.clear(); kurumCiz();
  }
  function kurumFiltre() {
    const q = KR.ara.trim().toLocaleLowerCase('tr');
    return KR.rows.filter(r => (KR.durum === 'hepsi' || (KR.durum === 'aktif') === (r.active !== false)) && (KR.plan === 'hepsi' || (r.plan || 'basic') === KR.plan) &&
      (!q || [r.name, r.notes, (KR.yon[r.id] || []).map(p => kisiAd(p) + ' ' + (p.email || '')).join(' ')].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
  }
  function kurumCiz() {
    const k = $('ys-kurum'); if (!k) return;
    const L = kurumFiltre(), n = Math.max(1, Math.ceil(L.length / KR.boy)); if (KR.sayfa > n) KR.sayfa = n;
    const dilim = L.slice((KR.sayfa - 1) * KR.boy, KR.sayfa * KR.boy);
    const tumSecili = dilim.length && dilim.every(r => KR.secili.has(r.id));
    const uyeTop = Object.values(KR.uye).reduce((a, s) => a + s.toplam, 0);
    let h = '<div class="ys-kpiler d4">' + kpi('kurum', 'mor', 'Toplam kurum', KR.rows.length, '') + kpi('onay', 'yesil', 'Aktif kurum', KR.rows.filter(r => r.active !== false).length, '') +
      kpi('saat', 'gri', 'Dondurulmuş', KR.rows.filter(r => r.active === false).length, '') + kpi('kullanicilar', 'mavi', 'Kurum üyesi', uyeTop, '') + '</div>';
    h += '<div class="yp-kart ys-liste"><div class="ys-arac">' + aramaKutusu('ys-kr-ara', KR.ara, 'Kurum adı, not veya yönetici ara…', 'ysKr(\'ara\', this.value)') +
      secim('Durum', KR.durum, [['hepsi', 'Tüm durumlar'], ['aktif', 'Aktif'], ['pasif', 'Dondurulmuş']], 'ysKr(\'durum\', this.value)') +
      secim('Plan', KR.plan, [['hepsi', 'Tüm planlar']].concat(Object.keys(PLANLAR).map(p => [p, PLANLAR[p][0]])), 'ysKr(\'plan\', this.value)') + '</div>';
    if (KR.secili.size) h += '<div class="ys-secbar"><b>' + KR.secili.size + ' kurum seçili</b><button type="button" class="yp-btn kucuk" onclick="ysKrDisa(true)">' + ic('indir', 15) + 'Seçilenleri dışa aktar</button><button type="button" class="yp-link" onclick="ysKrSec(\'temizle\')">Seçimi kaldır</button></div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('kurum', 30) + '<b>' + (KR.rows.length ? 'Filtreye uyan kurum yok.' : 'Henüz kurum yok.') + '</b>' + (KR.rows.length ? '' : '<button type="button" class="yp-btn ana" onclick="ysKrYeni()">' + ic('arti', 16) + 'Yeni kurum oluştur</button>') + '</div>';
    else {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th class="ys-cb"><input type="checkbox" ' + (tumSecili ? 'checked' : '') + ' onchange="ysKrSec(\'sayfa\', this.checked)" aria-label="Sayfadakileri seç"></th><th>Kurum adı</th><th>Kurum yöneticisi</th><th>Plan</th><th>Üye sayısı</th><th>Durum</th><th>Kayıt tarihi</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>';
      dilim.forEach(r => {
        const P = PLANLAR[r.plan] || PLANLAR.basic, s = KR.uye[r.id] || { ogretmen: 0, ogrenci: 0, toplam: 0 }, y = KR.yon[r.id] || [];
        h += '<tr><td class="ys-cb"><input type="checkbox" ' + (KR.secili.has(r.id) ? 'checked' : '') + ' onchange="ysKrSec(\'' + r.id + '\', this.checked)" aria-label="Seç"></td>' +
          '<td><div class="ys-kim orta"><span class="ys-kurum-ic">' + ic('kurum', 17) + '</span><div><b>' + esc(r.name) + '</b>' + (r.notes ? '<small>' + esc(r.notes) + '</small>' : '') + '</div></div></td>' +
          '<td>' + (y.length ? y.map(p => '<div class="ys-yon"><b>' + esc(kisiAd(p)) + '</b><small>' + esc(p.email || '') + '</small></div>').join('') : '<button type="button" class="yp-link" onclick="adminKurumSetAdmin(\'' + r.id + '\', \'' + jsq(r.name) + '\')">Yönetici ata</button>') + '</td>' +
          '<td><span class="yp-durum ' + P[1] + '" title="' + P[2] + '">' + P[0] + '</span></td>' +
          '<td><b>' + s.toplam + '</b><small class="ys-soluk">' + s.ogretmen + ' öğretmen · ' + s.ogrenci + ' öğrenci</small></td>' +
          '<td><span class="yp-durum ' + (r.active !== false ? 'd-yesil' : 'd-kirmizi') + '">' + (r.active !== false ? 'Aktif' : 'Dondurulmuş') + '</span></td>' +
          '<td class="ys-tar">' + tarih(r.created_at) + '</td><td class="ys-sag">' + menuB('kurum', r.id) + '</td></tr>';
      });
      h += '</tbody></table></div>' + sayfalama(L.length, KR.sayfa, KR.boy, 'ysKrSayfa', 'kurum');
    }
    k.innerHTML = h + '</div>';
  }
  MENULER.kurum = id => {
    const r = KR.rows.find(x => x.id === id); if (!r) return [];
    const ad = jsq(r.name);
    return [{ ic: 'kullanicilar', ad: 'Üyeleri gör', fn: "adminKurumMembers('" + id + "', '" + ad + "')" },
      { ic: 'kullanici', ad: 'Kurum yöneticisi ata', fn: "adminKurumSetAdmin('" + id + "', '" + ad + "')" },
      { ic: 'kalem', ad: 'Bilgileri düzenle', fn: "ysKrYeni('" + id + "')" },
      { ic: r.active !== false ? 'saat' : 'onay', ad: r.active !== false ? 'Dondur' : 'Aktifleştir', fn: "adminKurumToggle('" + id + "', " + (r.active !== false) + ")" },
      { ayrac: 1 }, { ic: 'cop', ad: 'Kurumu sil', fn: "adminKurumDelete('" + id + "', '" + ad + "')", tehlike: 1 }];
  };
  window.ysKr = (a, v) => { KR[a] = v; KR.sayfa = 1; kurumCiz(); if (a === 'ara') { const i = $('ys-kr-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysKrSayfa = (s, boy) => { if (boy) KR.boy = boy; KR.sayfa = s; kurumCiz(); };
  window.ysKrSec = (id, acik) => {
    if (id === 'temizle') KR.secili.clear();
    else if (id === 'sayfa') kurumFiltre().slice((KR.sayfa - 1) * KR.boy, KR.sayfa * KR.boy).forEach(r => acik ? KR.secili.add(r.id) : KR.secili.delete(r.id));
    else acik ? KR.secili.add(id) : KR.secili.delete(id);
    kurumCiz();
  };
  window.ysKrDisa = secilen => {
    const L = secilen ? KR.rows.filter(r => KR.secili.has(r.id)) : kurumFiltre();
    csvIndir('kurumlar', ['Kurum', 'Plan', 'Durum', 'Yönetici', 'Öğretmen', 'Öğrenci', 'Not', 'Kayıt tarihi'],
      L.map(r => { const s = KR.uye[r.id] || { ogretmen: 0, ogrenci: 0 }; return [r.name, (PLANLAR[r.plan] || PLANLAR.basic)[0], r.active !== false ? 'Aktif' : 'Dondurulmuş', (KR.yon[r.id] || []).map(p => kisiAd(p) + ' <' + (p.email || '') + '>').join(', '), s.ogretmen, s.ogrenci, r.notes || '', tarih(r.created_at)]; }));
  };
  // Yeni kurum / düzenle penceresi
  window.ysKrYeni = id => {
    const r = id ? KR.rows.find(x => x.id === id) : null;
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'ys-kr-modal';
    ov.innerHTML = '<div class="ui-modal ys-modal" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('kurum', 20) + '</span><h3>' + (r ? 'Kurumu düzenle' : 'Yeni kurum oluştur') + '</h3><button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'ys-kr-modal\').remove()">' + ic('kapat', 17) + '</button></div>' +
      '<label class="ys-alan"><span>Kurum adı</span><input id="ys-kr-ad" class="ys-girdi" maxlength="120" value="' + esc(r ? r.name : '') + '" placeholder="Örn. Ankara Dil Kursu"></label>' +
      '<label class="ys-alan"><span>Plan</span><select id="ys-kr-plan" class="ys-girdi">' + Object.keys(PLANLAR).map(p => '<option value="' + p + '"' + ((r ? r.plan : 'basic') === p ? ' selected' : '') + '>' + PLANLAR[p][0] + ' (' + PLANLAR[p][2] + ')</option>').join('') + '</select></label>' +
      '<label class="ys-alan"><span>Not (isteğe bağlı)</span><input id="ys-kr-not" class="ys-girdi" maxlength="300" value="' + esc(r ? r.notes || '' : '') + '" placeholder="Örn. özel kurs, şube, iletişim kişisi"></label>' +
      '<div class="ys-modal-alt"><button type="button" class="yp-btn" onclick="document.getElementById(\'ys-kr-modal\').remove()">Vazgeç</button><button type="button" class="yp-btn ana" onclick="ysKrKaydet(' + (r ? '\'' + r.id + '\'' : '') + ')">' + ic('kaydet', 16) + (r ? 'Kaydet' : 'Oluştur') + '</button></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); setTimeout(() => { const i = $('ys-kr-ad'); if (i) i.focus(); }, 30);
  };
  window.ysKrKaydet = async id => {
    const name = ($('ys-kr-ad').value || '').trim(), plan = $('ys-kr-plan').value || 'basic', notes = ($('ys-kr-not').value || '').trim();
    if (!name) { uiAlert('Kurum adı zorunlu.'); return; }
    try {
      const q = id ? sb.from('kurumlar').update({ name, plan, notes: notes || null }).eq('id', id) : sb.from('kurumlar').insert({ name, plan, notes: notes || null });
      const { error } = await q; if (error) throw error;
      const m = $('ys-kr-modal'); if (m) m.remove();
      toast(id ? 'Kurum güncellendi.' : 'Kurum oluşturuldu: ' + name);
      kurumYukle();
    } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
  };
  window.YS_AKS.kurumlar = () => '<button type="button" class="yp-btn" onclick="ysKrDisa()">' + ic('indir', 16) + 'Dışa aktar</button><button type="button" class="yp-btn ana" onclick="ysKrYeni()">' + ic('arti', 16) + 'Yeni kurum oluştur</button>';

  /* ============================================================
     BİLDİRİM GÖNDER (v174)
     ============================================================ */
  const BG = { hedef: 'tum', secili: new Set(), seviye: '', ara: '', kisiler: [], aktifBugun: null, sonlar: null, baslik: '', mesaj: '' };
  const SEVIYELER = ['A1', 'A2', 'B1', 'B2', 'C1'];
  async function bildirimYukle() {
    const k = $('ys-bildirim'); if (!k) return;
    if (!BG.kisiler.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    const gece = new Date(); gece.setHours(0, 0, 0, 0);
    const [p, a, n] = await Promise.all([
      sb.from('profiles').select('id, email, display_name, plan, premium_until, level, role, is_admin').then(r => r, () => ({ data: [] })),
      sb.from('access_log').select('user_id').gte('created_at', gece.toISOString()).limit(5000).then(r => r, () => ({ error: 1 })),
      sb.from('notifications').select('id, title, body, created_at, is_read').eq('type', 'admin').order('created_at', { ascending: false }).limit(5000).then(r => r, () => ({ error: 1 }))
    ]);
    BG.kisiler = ((p && p.data) || []).sort((x, y) => kisiAd(x).localeCompare(kisiAd(y), 'tr'));
    if (!kullanicilar().length) KUL = BG.kisiler;
    BG.aktifBugun = a && !a.error && a.data ? new Set(a.data.map(x => x.user_id).filter(Boolean)).size : null;
    if (n && !n.error && n.data) {
      const gr = {};
      n.data.forEach(r => { const anahtar = r.title + '\u0001' + (r.body || '') + '\u0001' + String(r.created_at).slice(0, 16); const g = gr[anahtar] || (gr[anahtar] = { title: r.title, body: r.body, t: r.created_at, n: 0, okundu: 0, ids: [] }); g.n++; if (r.is_read) g.okundu++; g.ids.push(r.id); });
      BG.sonlar = Object.values(gr).sort((x, y) => new Date(y.t) - new Date(x.t)).slice(0, 30);
    } else BG.sonlar = null;
    bildirimCiz();
  }
  function hedefKisiler() {
    const L = BG.kisiler;
    if (BG.hedef === 'secili') return L.filter(u => BG.secili.has(u.id));
    if (BG.hedef === 'seviye') return L.filter(u => BG.seviye && String(u.level || '').toUpperCase() === BG.seviye);
    if (BG.hedef === 'premium') return L.filter(premiumMu);
    return L;
  }
  const HEDEF_AD = { tum: 'Tüm kullanıcılar', secili: 'Seçili kullanıcılar', seviye: 'Seviye bazlı', premium: 'Premium üyeler' };
  function hedefEtiket() { return BG.hedef === 'seviye' ? (BG.seviye ? BG.seviye + ' seviyesi' : 'Seviye seçilmedi') : HEDEF_AD[BG.hedef]; }
  function bildirimCiz() {
    const k = $('ys-bildirim'); if (!k) return;
    const L = BG.kisiler, hedefN = hedefKisiler().length;
    let h = '<div class="ys-kpiler d5">' +
      kpi('kullanicilar', 'mavi', 'Toplam kullanıcı', L.length.toLocaleString('tr-TR'), '') +
      kpi('tac', 'altin', 'Premium üye', L.filter(premiumMu).length.toLocaleString('tr-TR'), '') +
      kpi('ogretmen', 'mavi', 'Öğretmen', L.filter(u => u.role === 'ogretmen').length, '') +
      kpi('onay', 'yesil', 'Bugün aktif', BG.aktifBugun == null ? '—' : BG.aktifBugun.toLocaleString('tr-TR'), '<small>bugün giriş yapan</small>') +
      '<div class="ys-kpi"><span class="ys-kpi-ic r-altin">' + ic('hedef', 22) + '</span><div class="ys-kpi-y"><small>Seçili hedef kitle</small><b id="ys-bg-n">' + hedefN.toLocaleString('tr-TR') + '</b><div class="ys-kpi-s"><small id="ys-bg-ad">' + esc(hedefEtiket()) + '</small></div></div></div></div>';
    const hedefB = (v, ikon) => '<button type="button" class="ys-hedef' + (BG.hedef === v ? ' aktif' : '') + '" onclick="ysBg(\'hedef\', \'' + v + '\')">' + ic(ikon, 16) + HEDEF_AD[v] + '</button>';
    let alt = '';
    if (BG.hedef === 'secili') {
      const q = BG.ara.trim().toLocaleLowerCase('tr');
      const S = L.filter(u => !q || (kisiAd(u) + ' ' + (u.email || '')).toLocaleLowerCase('tr').includes(q)).slice(0, 200);
      alt = '<div class="ys-hedef-alt"><div class="ys-arac ic">' + aramaKutusu('ys-bg-ara', BG.ara, 'İsim veya e-posta ara…', 'ysBg(\'ara\', this.value)') + '<span class="ys-soluk">' + BG.secili.size + ' kişi seçili</span>' + (BG.secili.size ? '<button type="button" class="yp-link" onclick="ysBg(\'temizle\')">Seçimi kaldır</button>' : '') + '</div>' +
        '<div class="ys-secim-liste kisa">' + (S.length ? S.map(u => '<label class="' + (BG.secili.has(u.id) ? 'secili' : '') + '"><input type="checkbox" ' + (BG.secili.has(u.id) ? 'checked' : '') + ' onchange="ysBg(\'sec\', \'' + u.id + '\')">' + harfAv(kisiAd(u)) + '<span><b>' + esc(kisiAd(u)) + '</b><small>' + esc(u.email || '') + '</small></span></label>').join('') : '<div class="yp-bos kucuk"><span>Kullanıcı bulunamadı.</span></div>') + '</div></div>';
    } else if (BG.hedef === 'seviye') {
      alt = '<div class="ys-hedef-alt"><div class="ys-mini-sekme">' + SEVIYELER.map(s => '<button type="button" class="' + (BG.seviye === s ? 'aktif' : '') + '" onclick="ysBg(\'seviye\', \'' + s + '\')">' + s + ' <small>(' + L.filter(u => String(u.level || '').toUpperCase() === s).length + ')</small></button>').join('') + '</div></div>';
    }
    h += '<div class="ys-bg-izgara"><section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('not', 18) + 'Bildirim içeriği</h3></div>' +
      '<label class="ys-alan"><span>Bildirim başlığı <em>*</em></span><div class="ys-sayacli"><input id="an-title" class="ys-girdi" maxlength="100" placeholder="Örn. Yeni dersler eklendi!" value="' + esc(BG.baslik) + '" oninput="ysBgYaz()" autocomplete="off"><small><span id="ys-bg-bs">' + BG.baslik.length + '</span>/100</small></div></label>' +
      '<label class="ys-alan"><span>Bildirim mesajı</span><div class="ys-sayacli"><textarea id="an-body" class="ys-girdi alan" rows="4" maxlength="500" placeholder="Kullanıcılara göndermek istediğin mesajı buraya yaz…" oninput="ysBgYaz()">' + esc(BG.mesaj) + '</textarea><small><span id="ys-bg-ms">' + BG.mesaj.length + '</span>/500</small></div></label>' +
      '<div class="ys-alan"><span>Hedef kitle</span><div class="ys-hedefler">' + hedefB('tum', 'kullanicilar') + hedefB('secili', 'kullanici') + hedefB('seviye', 'grafik') + hedefB('premium', 'tac') + '</div>' + alt + '</div>' +
      '<div class="ys-bg-alt"><button type="button" class="yp-btn ana" onclick="ysBgGonder()">' + ic('okSag', 16) + 'Bildirimi gönder</button><span class="ys-soluk" id="ys-bg-ozet">' + hedefN.toLocaleString('tr-TR') + ' kişiye gidecek</span></div></section>' +
      '<div class="ys-bg-sag"><section class="yp-kart"><div class="yp-kart-bas"><h3>' + ic('goz', 18) + 'Önizleme</h3></div><div class="ys-telefon"><div class="ys-tel-ust"><span>' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + '</span><i></i></div>' +
      '<div class="ys-tel-bil"><span class="ys-tel-logo">' + ic('kitap', 20) + '</span><div><div class="ys-tel-bas"><b>YDT-YDS Rusça</b><small>şimdi</small></div><b id="ys-on-b">' + esc(BG.baslik || 'Bildirim başlığı') + '</b><p id="ys-on-m">' + esc(BG.mesaj || 'Mesaj burada görünecek.') + '</p></div></div></div></section>' +
      '<section class="yp-kart ys-liste"><div class="yp-kart-bas ys-ic-bas"><h3>' + ic('saat', 18) + 'Son bildirimler</h3></div>' + sonBildirimler() + '</section></div></div>';
    k.innerHTML = h;
  }
  function sonBildirimler() {
    if (BG.sonlar == null) return '<div class="yp-bos kucuk"><span>Gönderilen bildirimler okunamadı.</span></div>';
    if (!BG.sonlar.length) return '<div class="yp-bos kucuk"><span>Henüz panelden bildirim gönderilmedi.</span></div>';
    return '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Başlık</th><th>Alıcı</th><th>Gönderim</th><th>Okunma</th><th class="ys-sag"></th></tr></thead><tbody>' +
      BG.sonlar.slice(0, 8).map((g, i) => '<tr><td class="ys-mesaj"><b>' + esc(g.title) + '</b>' + (g.body ? '<small>' + esc(String(g.body).slice(0, 70)) + '</small>' : '') + '</td><td>' + g.n.toLocaleString('tr-TR') + ' kişi</td>' +
        '<td class="ys-tar">' + tarih(g.t) + '<small>' + saat(g.t).slice(0, 5) + '</small></td><td><span class="yp-durum d-yesil">%' + Math.round(g.okundu / g.n * 100) + '</span></td><td class="ys-sag">' + menuB('bil', String(i)) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  MENULER.bil = i => {
    const g = BG.sonlar && BG.sonlar[+i]; if (!g) return [];
    return [{ ic: 'kopya', ad: 'Formu bununla doldur', fn: "ysBgKullan(" + i + ")" }, { ayrac: 1 }, { ic: 'cop', ad: 'Geri çek (' + g.n + ' kişiden sil)', fn: "ysBgGeriCek(" + i + ")", tehlike: 1 }];
  };
  window.ysBgYaz = () => {
    BG.baslik = $('an-title').value; BG.mesaj = $('an-body').value;
    $('ys-bg-bs').textContent = BG.baslik.length; $('ys-bg-ms').textContent = BG.mesaj.length;
    $('ys-on-b').textContent = BG.baslik || 'Bildirim başlığı'; $('ys-on-m').textContent = BG.mesaj || 'Mesaj burada görünecek.';
  };
  window.ysBg = (a, v) => {
    if (a === 'hedef') BG.hedef = v; else if (a === 'seviye') BG.seviye = v; else if (a === 'ara') BG.ara = v;
    else if (a === 'sec') BG.secili.has(v) ? BG.secili.delete(v) : BG.secili.add(v); else if (a === 'temizle') BG.secili.clear();
    const y = window.scrollY; bildirimCiz(); window.scrollTo(0, y);
    if (a === 'ara') { const i = $('ys-bg-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }
  };
  window.ysBgKullan = i => { const g = BG.sonlar[i]; BG.baslik = g.title || ''; BG.mesaj = g.body || ''; bildirimCiz(); window.scrollTo(0, 0); };
  window.ysBgGeriCek = async i => {
    const g = BG.sonlar[i]; if (!g) return;
    if (!(await uiConfirm('"' + g.title + '" bildirimi ' + g.n + ' kişinin bildirim listesinden silinsin mi?', 'Bildirimi geri çek', { danger: true, confirmText: 'Geri çek' }))) return;
    try { for (let j = 0; j < g.ids.length; j += 500) { const { error } = await sb.from('notifications').delete().in('id', g.ids.slice(j, j + 500)); if (error) throw error; } toast('Bildirim geri çekildi.'); }
    catch (e) { uiAlert('Silinemedi.'); }
    bildirimYukle();
  };
  window.ysBgGonder = async () => {
    const t = (BG.baslik || '').trim(), b = (BG.mesaj || '').trim();
    if (!t) { uiAlert('Lütfen bir başlık yaz.'); return; }
    const H = hedefKisiler();
    if (!H.length) { uiAlert(BG.hedef === 'secili' ? 'En az bir kullanıcı seç.' : 'Bu hedef kitlede kullanıcı yok.'); return; }
    if (!(await uiConfirm('"' + t + '" bildirimi ' + H.length + ' kişiye (' + hedefEtiket() + ') gönderilecek.', 'Bildirimi gönder', { confirmText: 'Gönder' }))) return;
    try {
      const rows = H.map(u => ({ user_id: u.id, title: t, body: b || null, type: 'admin' }));
      for (let j = 0; j < rows.length; j += 500) { const { error } = await sb.from('notifications').insert(rows.slice(j, j + 500)); if (error) throw error; }
      try { staffLog('bildirim', null, { baslik: t, kime: hedefEtiket(), kisi: H.length }); } catch (e) {}
      toast(H.length + ' kişiye bildirim gönderildi.');
      BG.baslik = ''; BG.mesaj = ''; BG.secili.clear();
      if (typeof loadNotifications === 'function') loadNotifications();
      bildirimYukle();
    } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
  };

  /* ============================================================
     DESTEK TALEPLERİ (v174)
     ============================================================ */
  const DT = { rows: [], kisi: {}, sekme: 'hepsi', ara: '', atanan: 'hepsi', secili: null, sayfa: 1, boy: 12, mesajlar: [], profil: null, sonGiris: '', yukDetay: false };
  const TALEP_DURUM = { open: ['Açık', 'turuncu'], pending: ['Beklemede', 'sari'], answered: ['Yanıtlandı', 'yesil'], closed: ['Kapalı', 'gri'] };
  const benimId = () => (gl('currentUser') || {}).id;
  async function destekYukle() {
    const k = $('ys-destek'); if (!k) return;
    if (!DT.rows.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const { data, error } = await sb.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(500);
      if (error) throw error;
      DT.rows = data || [];
      const ids = [...new Set(DT.rows.map(t => t.user_id).concat(DT.rows.map(t => t.assigned_to)).filter(Boolean))].filter(id => !kisiBul(id) && !DT.kisi[id]);
      if (ids.length) { try { const { data: ps } = await sb.from('profiles').select('id, display_name, email, plan, premium_until, level, created_at').in('id', ids); (ps || []).forEach(p => DT.kisi[p.id] = p); } catch (e) {} }
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('destek', 28) + '<b>Talepler alınamadı.</b><span>Yönetici ya da destek yetkisi gerekli.</span></div></div>'; return; }
    if (typeof loadTicketTemplates === 'function' && gl('_tkTpls') === null) { try { await loadTicketTemplates(); } catch (e) {} }
    if (DT.secili && !DT.rows.some(t => t.id === DT.secili)) DT.secili = null;
    destekCiz();
    if (DT.secili) talepAc(DT.secili, true);
  }
  const dtKisi = id => kisiBul(id) || DT.kisi[id];
  function talepFiltre() {
    const q = DT.ara.trim().toLocaleLowerCase('tr'), ben = benimId();
    return DT.rows.filter(t => (DT.sekme === 'hepsi' || t.status === DT.sekme) &&
      (DT.atanan === 'hepsi' || (DT.atanan === 'ben' ? t.assigned_to === ben : !t.assigned_to)) &&
      (!q || [t.subject, String(t.id), kisiAd(dtKisi(t.user_id)), (dtKisi(t.user_id) || {}).email].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
  }
  function destekCiz() {
    const k = $('ys-destek'); if (!k) return;
    const say = s => DT.rows.filter(t => s === 'hepsi' || t.status === s).length;
    const L = talepFiltre(), n = Math.max(1, Math.ceil(L.length / DT.boy)); if (DT.sayfa > n) DT.sayfa = n;
    const dilim = L.slice((DT.sayfa - 1) * DT.boy, DT.sayfa * DT.boy);
    let h = '<div class="yp-kart ys-sekme-kart"><div class="ys-sekme-cubuk">' + [['hepsi', 'Tümü', 'liste'], ['open', 'Açık', 'bildirim'], ['pending', 'Beklemede', 'saat'], ['answered', 'Yanıtlandı', 'onay'], ['closed', 'Kapalı', 'kilit']]
      .map(s => '<button type="button" class="' + (DT.sekme === s[0] ? 'aktif' : '') + '" onclick="ysDt(\'sekme\', \'' + s[0] + '\')">' + ic(s[2], 16) + s[1] + '<i>' + say(s[0]) + '</i></button>').join('') + '</div></div>';
    h += '<div class="ys-iki-panel' + (DT.secili ? ' detayli' : '') + '"><section class="yp-kart ys-liste ys-sol-panel"><div class="ys-arac">' + aramaKutusu('ys-dt-ara', DT.ara, 'Konu, kullanıcı ya da talep no ara…', 'ysDt(\'ara\', this.value)') +
      secim('Atanan', DT.atanan, [['hepsi', 'Herkes'], ['ben', 'Bana atananlar'], ['yok', 'Atanmamış']], 'ysDt(\'atanan\', this.value)') + '</div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('destek', 30) + '<b>' + (DT.rows.length ? 'Filtreye uyan talep yok.' : 'Henüz talep yok.') + '</b></div>';
    else {
      h += '<div class="ys-talepler">' + dilim.map(t => {
        const u = dtKisi(t.user_id), D = TALEP_DURUM[t.status] || TALEP_DURUM.open, ad = u ? kisiAd(u) : 'Kullanıcı';
        return '<button type="button" class="ys-talep' + (DT.secili === t.id ? ' secili' : '') + (t.status === 'open' ? ' yeni' : '') + '" onclick="ysDtAc(\'' + t.id + '\')">' + harfAv(ad) +
          '<span class="ys-talep-y"><span class="ys-talep-ust"><b>' + esc(ad) + '</b><span class="yp-durum r-' + D[1] + '">' + D[0] + '</span></span><span class="ys-talep-konu">' + esc(t.subject || '(konu yok)') + '</span>' +
          '<small>' + (t.assigned_to ? ic('kullanici', 12) + (t.assigned_to === benimId() ? 'Bende' : esc(kisiAd(dtKisi(t.assigned_to)) || 'Atanmış')) + ' · ' : '') + esc(onceKadar(t.updated_at || t.created_at)) + '</small></span></button>';
      }).join('') + '</div>' + sayfalama(L.length, DT.sayfa, DT.boy, 'ysDtSayfa', 'talep');
    }
    h += '</section><section class="yp-kart ys-sag-panel" id="ys-dt-detay">' + (DT.secili ? '<div class="admin-loading">Yükleniyor...</div>' : '<div class="yp-bos">' + ic('destek', 30) + '<b>Bir talep seç</b><span>Mesajları ve kullanıcı bilgilerini görmek için soldaki listeden bir talep aç.</span></div>') + '</section></div>';
    k.innerHTML = h;
  }
  async function talepAc(id, sessiz) {
    DT.secili = id;
    const kutu = $('ys-dt-detay'); if (!kutu) return;
    if (!sessiz) kutu.innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
    const t = DT.rows.find(x => x.id === id); if (!t) return;
    try {
      const [m, p, a] = await Promise.all([
        sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
        sb.from('profiles').select('id, display_name, email, plan, premium_until, level, created_at').eq('id', t.user_id).maybeSingle().then(r => r, () => ({})),
        sb.from('access_log').select('created_at').eq('user_id', t.user_id).order('created_at', { ascending: false }).limit(1).then(r => r, () => ({}))
      ]);
      DT.mesajlar = (m && m.data) || []; DT.profil = (p && p.data) || dtKisi(t.user_id) || null;
      DT.sonGiris = a && a.data && a.data[0] ? a.data[0].created_at : '';
    } catch (e) { kutu.innerHTML = '<div class="yp-bos"><b>Talep yüklenemedi.</b></div>'; return; }
    globalAta('_tkUserEmail', (DT.profil && DT.profil.email) || '');
    talepCiz();
  }
  function talepCiz() {
    const kutu = $('ys-dt-detay'), t = DT.rows.find(x => x.id === DT.secili); if (!kutu || !t) return;
    const u = DT.profil, ad = u ? kisiAd(u) : 'Kullanıcı', ben = benimId(), prem = u && premiumMu(u);
    const sablonlar = typeof tkTplList === 'function' ? tkTplList() : [];
    let h = '<div class="ys-dt-bas"><button type="button" class="yp-ikon-b ys-geri" onclick="ysDtKapat()" aria-label="Listeye dön">' + ic('siteye', 18) + '</button><div class="ys-dt-bas-y"><h3>' + esc(t.subject || '(konu yok)') + '</h3>' +
      '<div class="ys-dt-alt"><span class="ys-soluk">#' + esc(String(t.id).slice(0, 8)) + '</span><span>' + esc(ad) + '</span>' + (u && u.email ? '<span class="ys-soluk">' + esc(u.email) + '</span>' : '') + '<span class="ys-soluk">' + esc(onceKadar(t.created_at)) + '</span></div></div>' +
      '<label class="ys-durum-sec"><select onchange="ysDtDurum(this.value)" aria-label="Talep durumu">' + Object.keys(TALEP_DURUM).map(s => '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + TALEP_DURUM[s][0] + '</option>').join('') + '</select></label>' + menuB('talep', t.id) + '</div>';
    h += '<div class="ys-dt-etiket">' + (t.assigned_to ? '<span class="yp-durum d-gri">' + ic('kullanici', 13) + ' ' + (t.assigned_to === ben ? 'Bende' : esc(kisiAd(dtKisi(t.assigned_to)) || 'Atanmış')) + '</span>' : '<button type="button" class="yp-btn kucuk" onclick="ysDtUstlen()">' + ic('el', 15) + 'Üstlen</button>') +
      (u ? '<span class="yp-durum ' + (prem ? 'r-altin' : 'r-mavi') + '">' + (prem ? 'Premium' : 'Ücretsiz') + '</span><span class="yp-durum d-gri">' + esc(u.level || 'seviye yok') + '</span><span class="ys-soluk">Kayıt ' + tarih(u.created_at) + (DT.sonGiris ? ' · son giriş ' + esc(onceKadar(DT.sonGiris)) : '') + '</span>' : '') + '</div>';
    h += '<div class="ys-mesajlar">' + (DT.mesajlar.length ? DT.mesajlar.map(m => {
      const yon = m.sender === 'admin', kimAd = yon ? (m.user_id === ben ? 'Sen' : (kisiAd(dtKisi(m.user_id)) || 'Destek ekibi')) : ad;
      return '<div class="ys-mesaj-s' + (yon ? ' biz' : '') + '">' + (yon ? '<span class="ys-av renkli" style="background:#0d1b2a">' + ic('destek', 15) + '</span>' : harfAv(ad)) + '<div class="ys-balon"><div class="ys-balon-bas"><b>' + esc(kimAd) + '</b><small>' + (m.created_at ? new Date(m.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'şimdi') + '</small></div><div class="ys-balon-m">' + esc(m.body) + '</div></div></div>';
    }).join('') : '<div class="yp-bos kucuk"><span>Mesaj yok.</span></div>') + '</div>';
    h += '<div class="ys-yanit"><textarea id="adm-reply" class="ys-girdi alan" rows="4" placeholder="Yanıtını yaz…"></textarea><div class="ys-yanit-alt"><div class="ys-yanit-sol">' +
      '<select class="ys-girdi kucuk mail-tpl" onchange="ysDtSablon(this.value); this.selectedIndex = 0" aria-label="Hazır şablon"><option value="">Hazır şablon ekle…</option>' + sablonlar.map((s, i) => '<option value="' + i + '">' + esc(String(s.t || '').replace(/^\S*[\u{1F300}-\u{1FAFF}☀-➿]️?\s*/u, '')) + '</option>').join('') + '</select>' +
      '<button type="button" class="yp-ikon-b" title="Şablon ekle" aria-label="Şablon ekle" onclick="tkTplAdd()">' + ic('arti', 16) + '</button></div><div class="ys-yanit-sag">' +
      '<button type="button" class="yp-btn" onclick="adminTicketMail(\'' + t.id + '\')" title="Yanıtı destek@ adresinden e-posta olarak gönderir">' + ic('mail', 16) + 'E-postayla gönder</button>' +
      '<button type="button" class="yp-btn ana" onclick="ysDtYanit()">' + ic('okSag', 16) + 'Yanıt gönder</button></div></div></div>';
    kutu.innerHTML = h;
    const ms = kutu.querySelector('.ys-mesajlar'); if (ms) ms.scrollTop = ms.scrollHeight;
  }
  MENULER.talep = id => {
    const t = DT.rows.find(x => x.id === id); if (!t) return [];
    const u = DT.profil, L = [];
    if (u) L.push({ ic: 'kullanici', ad: 'Kullanıcıyı aç', fn: "ysKisiyeGit('" + t.user_id + "')" });
    if (u && u.email) { L.push({ ic: 'anahtar', ad: 'Şifre yenileme maili', fn: "adminUserResetPw('" + jsq(u.email) + "')" }); L.push({ ic: 'mail', ad: 'Doğrulama mailini tekrar gönder', fn: "tkResendVerify('" + jsq(u.email) + "')" }); }
    if (u && !premiumMu(u)) L.push({ ic: 'hediye', ad: '1 hafta deneme premium', fn: "tkTrial('" + t.user_id + "')" });
    if (t.status !== 'closed') L.push({ ic: 'kilit', ad: 'Talebi kapat', fn: "ysDtDurum('closed')" });
    L.push({ ayrac: 1 }); L.push({ ic: 'cop', ad: 'Talebi sil', fn: "ysDtSil('" + id + "')", tehlike: 1 });
    return L;
  };
  window.ysDt = (a, v) => { DT[a] = v; DT.sayfa = 1; destekCiz(); if (DT.secili) talepCiz(); if (a === 'ara') { const i = $('ys-dt-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysDtSayfa = (s, boy) => { if (boy) DT.boy = boy; DT.sayfa = s; destekCiz(); if (DT.secili) talepCiz(); };
  window.ysDtAc = id => { DT.secili = id; destekCiz(); talepAc(id); };
  window.ysDtKapat = () => { DT.secili = null; destekCiz(); };
  window.ysDtSablon = i => { if (i === '') return; const s = (typeof tkTplList === 'function' ? tkTplList() : [])[+i]; const ta = $('adm-reply'); if (!s || !ta) return; const m = s.m || s.body || ''; ta.value = ta.value ? ta.value + '\n\n' + m : m; ta.focus(); };
  async function talepGuncelle(alan, kayit, bildirim) {
    const t = DT.rows.find(x => x.id === DT.secili); if (!t) return false;
    try { const { error } = await sb.from('support_tickets').update(Object.assign({ updated_at: new Date().toISOString() }, alan)).eq('id', t.id); if (error) throw error; }
    catch (e) { uiAlert('Talep güncellenemedi.'); return false; }
    Object.assign(t, alan, { updated_at: new Date().toISOString() });
    if (kayit) try { staffLog(kayit[0], null, kayit[1]); } catch (e) {}
    if (bildirim) toast(bildirim);
    return true;
  }
  window.ysDtDurum = async s => { if (await talepGuncelle({ status: s }, ['talep_durum', { ticket: DT.secili, durum: s }], 'Durum: ' + TALEP_DURUM[s][0])) { destekCiz(); talepCiz(); } };
  window.ysDtUstlen = async () => { if (await talepGuncelle({ assigned_to: benimId() }, ['talep_ustlen', { ticket: DT.secili }], 'Talep üstlenildi.')) { destekCiz(); talepCiz(); } };
  window.ysDtYanit = async () => {
    const ta = $('adm-reply'), body = ((ta && ta.value) || '').trim(), t = DT.rows.find(x => x.id === DT.secili);
    if (!body || !t) { if (!body) uiAlert('Yanıt boş olamaz.'); return; }
    try {
      const { error } = await sb.from('ticket_messages').insert({ ticket_id: t.id, user_id: benimId(), sender: 'admin', body });
      if (error) throw error;
      await talepGuncelle({ status: 'answered' });
      if (typeof notifyUser === 'function') notifyUser(t.user_id, 'Destek talebine yanıt geldi', 'Talebine destek ekibi yanıt verdi.', 'info');
      toast('Yanıt gönderildi.');
      destekCiz(); talepAc(t.id);
    } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
  };
  window.ysDtSil = async id => {
    if (!(await uiConfirm('Bu destek talebi ve tüm mesajları silinsin mi?', 'Talebi sil', { danger: true }))) return;
    try { const { error } = await sb.from('support_tickets').delete().eq('id', id); if (error) throw error; toast('Talep silindi.'); } catch (e) { uiAlert('Silinemedi.'); }
    DT.secili = null; destekYukle();
  };
  window.YS_AKS.support = () => '<button type="button" class="yp-btn" onclick="adminClearClosedTickets()">' + ic('cop', 16) + 'Kapalıları temizle</button><button type="button" class="yp-btn" onclick="adminLoadTickets()">' + ic('yenile', 16) + 'Yenile</button>';

  /* ============================================================
     MAIL KUTUSU (v174)
     ============================================================ */
  const MK = { sekme: 'inbox', rows: [], uye: {}, ara: '', secili: null, isaret: new Set(), say: {}, yanitAcik: false, sayfa: 1, boy: 20 };
  const MAIL_SEKME = [['inbox', 'Gelen', 'mail'], ['spam', 'Spam', 'hata'], ['trash', 'Çöp', 'cop'], ['sent', 'Gönderilen', 'okSag']];
  async function mailYukle() {
    const k = $('ys-mail'); if (!k) return;
    k.innerHTML = MK.rows.length ? k.innerHTML : '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try {
      const sayac = q => q.then(r => r.count || 0, () => 0);
      const [ci, cs, ct, co] = await Promise.all([
        sayac(sb.from('inbox_mail').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('is_spam', false).eq('is_read', false)),
        sayac(sb.from('inbox_mail').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('is_spam', true)),
        sayac(sb.from('inbox_mail').select('id', { count: 'exact', head: true }).eq('is_deleted', true)),
        sayac(sb.from('outbox_mail').select('id', { count: 'exact', head: true }))
      ]);
      MK.say = { inbox: ci, spam: cs, trash: ct, sent: co };
      let data;
      if (MK.sekme === 'sent') { const r = await sb.from('outbox_mail').select('*').order('created_at', { ascending: false }).limit(300); if (r.error) throw r.error; data = r.data; }
      else {
        let q = sb.from('inbox_mail').select('*').order('created_at', { ascending: false }).limit(300);
        q = MK.sekme === 'inbox' ? q.eq('is_deleted', false).eq('is_spam', false) : MK.sekme === 'spam' ? q.eq('is_deleted', false).eq('is_spam', true) : q.eq('is_deleted', true);
        const r = await q; if (r.error) throw r.error; data = r.data;
      }
      MK.rows = data || [];
      MK.uye = {};
      const adresler = [...new Set(MK.rows.map(m => String((MK.sekme === 'sent' ? m.to_email : m.from_email) || '').toLowerCase()).filter(Boolean))];
      if (adresler.length) { try { const { data: ps } = await sb.from('profiles').select('id, email').in('email', adresler); (ps || []).forEach(p => MK.uye[String(p.email || '').toLowerCase()] = p.id); } catch (e) {} }
      globalAta('_mailMembers', MK.uye);
      const c = {}; MK.rows.forEach(m => c[m.id] = m); globalAta('_mailCache', c);
    } catch (e) { k.innerHTML = '<div class="yp-kart"><div class="yp-bos">' + ic('mail', 28) + '<b>Mail kutusu okunamadı.</b><span>inbox_mail_v2.sql çalıştırıldı mı?</span></div></div>'; return; }
    if (MK.secili && !MK.rows.some(m => String(m.id) === String(MK.secili))) MK.secili = null;
    MK.isaret.clear();
    mailCiz();
  }
  function mailFiltre() {
    const q = MK.ara.trim().toLocaleLowerCase('tr');
    return MK.rows.filter(m => !q || [m.from_name, m.from_email, m.to_email, m.subject, m.body].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q));
  }
  function mailCiz() {
    const k = $('ys-mail'); if (!k) return;
    const L = mailFiltre(), n = Math.max(1, Math.ceil(L.length / MK.boy)); if (MK.sayfa > n) MK.sayfa = n;
    const dilim = L.slice((MK.sayfa - 1) * MK.boy, MK.sayfa * MK.boy), gonderilen = MK.sekme === 'sent';
    let h = '<div class="yp-kart ys-sekme-kart"><div class="ys-sekme-cubuk">' + MAIL_SEKME.map(s => '<button type="button" class="' + (MK.sekme === s[0] ? 'aktif' : '') + '" onclick="ysMk(\'sekme\', \'' + s[0] + '\')">' + ic(s[2], 16) + s[1] +
      (MK.say[s[0]] ? '<i' + (s[0] === 'inbox' ? ' class="koyu" title="okunmamış"' : '') + '>' + MK.say[s[0]] + '</i>' : '') + '</button>').join('') + '</div></div>';
    h += '<div class="ys-iki-panel' + (MK.secili ? ' detayli' : '') + '"><section class="yp-kart ys-liste ys-sol-panel"><div class="ys-arac">' + aramaKutusu('ys-mk-ara', MK.ara, 'Mail ara (gönderen / konu / içerik)…', 'ysMk(\'ara\', this.value)') + '</div>';
    if (MK.isaret.size) h += '<div class="ys-secbar"><b>' + MK.isaret.size + ' seçili</b><button type="button" class="yp-btn kucuk kirmizi" onclick="ysMkToplu()">' + ic('cop', 15) + (MK.sekme === 'trash' || gonderilen ? 'Kalıcı sil' : 'Çöpe taşı') + '</button><button type="button" class="yp-link" onclick="ysMkSec(\'temizle\')">Seçimi kaldır</button></div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('mail', 30) + '<b>' + (MK.rows.length ? 'Aramaya uyan mail yok.' : { inbox: 'Gelen kutusu boş.', spam: 'Spam yok.', trash: 'Çöp kutusu boş.', sent: 'Gönderilen mail yok.' }[MK.sekme]) + '</b>' + (MK.sekme === 'inbox' && !MK.rows.length ? '<span>info@, destek@ ve support@ adreslerine gelenler buraya düşer.</span>' : '') + '</div>';
    else {
      h += '<div class="ys-mailler">' + dilim.map(m => {
        const kim = gonderilen ? (m.to_email || '') : (m.from_name || m.from_email || '?'), adr = String((gonderilen ? m.to_email : m.from_email) || '').toLowerCase();
        return '<div class="ys-mailo' + (String(MK.secili) === String(m.id) ? ' secili' : '') + (!gonderilen && !m.is_read ? ' okunmadi' : '') + '"><input type="checkbox" ' + (MK.isaret.has(String(m.id)) ? 'checked' : '') + ' onchange="ysMkSec(\'' + m.id + '\', this.checked)" aria-label="Seç">' +
          '<button type="button" onclick="ysMkAc(\'' + m.id + '\')">' + harfAv(kim) + '<span class="ys-talep-y"><span class="ys-talep-ust"><b>' + esc(gonderilen ? 'Kime: ' + kim : kim) + '</b><small>' + esc(kisaZaman(m.created_at)) + '</small></span><span class="ys-talep-konu">' + esc(m.subject || '(konu yok)') + '</span>' +
          '<small class="ys-onizleme">' + esc(String(m.body || '').replace(/\s+/g, ' ').slice(0, 90)) + '</small>' + (MK.uye[adr] ? '<span class="yp-durum r-yesil">Üye</span>' : '') + '</span></button></div>';
      }).join('') + '</div>' + sayfalama(L.length, MK.sayfa, MK.boy, 'ysMkSayfa', 'mail');
    }
    h += '</section><section class="yp-kart ys-sag-panel" id="ys-mk-detay">' + mailDetay() + '</section></div>';
    k.innerHTML = h;
  }
  function kisaZaman(t) {
    if (!t) return ''; const d = new Date(t), b = new Date();
    if (d.toDateString() === b.toDateString()) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const dun = new Date(Date.now() - GUN); if (d.toDateString() === dun.toDateString()) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }
  function mailDetay() {
    const m = MK.rows.find(x => String(x.id) === String(MK.secili));
    if (!m) return '<div class="yp-bos">' + ic('mail', 30) + '<b>Bir mail seç</b><span>Okumak ve yanıtlamak için soldaki listeden bir mail aç.</span></div>';
    const gonderilen = MK.sekme === 'sent', cop = MK.sekme === 'trash', uye = MK.uye[String(m.from_email || '').toLowerCase()];
    const ikon = (ad, isim, fn, tehlike) => '<button type="button" class="yp-ikon-b' + (tehlike ? ' sil' : '') + '" title="' + ad + '" aria-label="' + ad + '" onclick="' + fn + '">' + ic(isim, 17) + '</button>';
    let araclar = '<button type="button" class="yp-ikon-b ys-geri" onclick="ysMkKapat()" aria-label="Listeye dön">' + ic('siteye', 18) + '</button>';
    if (gonderilen) araclar += ikon('Kaydı sil', 'cop', "ysMkIs('sentsil')", 1);
    else if (cop) araclar += ikon('Geri al', 'geri', "ysMkIs('geri')") + ikon('Kalıcı sil', 'cop', "ysMkIs('kalici')", 1);
    else araclar += ikon('Yanıtla', 'geri', "ysMkIs('yanit')") + (uye ? ikon('Destek talebine dönüştür', 'destek', "admMailToTicket('" + m.id + "')") : '') + ikon(m.is_spam ? 'Spam değil' : 'Spam olarak işaretle', m.is_spam ? 'onay' : 'hata', "ysMkIs('spam')") + ikon('Çöpe taşı', 'cop', "ysMkIs('cop')", 1);
    const ST = { sent: ['Gönderildi', 'd-gri'], delivered: ['Ulaştı', 'd-yesil'], bounced: ['Geri döndü', 'd-kirmizi'], complained: ['Şikâyet', 'd-kirmizi'], failed: ['İletilemedi', 'd-kirmizi'] };
    const kim = gonderilen ? m.to_email : (m.from_name || m.from_email);
    let h = '<div class="ys-mk-arac">' + araclar + '</div><div class="ys-mk-bas">' + harfAv(kim || '?') + '<div><b>' + esc(gonderilen ? 'Kime: ' + (m.to_email || '') : (m.from_name || m.from_email || '')) + '</b>' +
      '<small>' + esc(gonderilen ? '' : (m.from_email || '')) + (m.to_email && !gonderilen ? ' → ' + esc(m.to_email) : '') + '</small></div><small class="ys-mk-t">' + new Date(m.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</small></div>' +
      '<h3 class="ys-mk-konu">' + esc(m.subject || '(konu yok)') + '</h3><div class="ys-mk-etiket">' + (gonderilen ? '<span class="yp-durum ' + (ST[m.status] || ST.sent)[1] + '">' + (ST[m.status] || ST.sent)[0] + '</span>' : (uye ? '<span class="yp-durum r-yesil">Üye</span>' : '<span class="yp-durum d-gri">Üye değil</span>') + (m.is_spam ? '<span class="yp-durum d-kirmizi">Spam</span>' : '')) + '</div>' +
      '<div class="ys-mk-govde">' + esc(m.body || '') + '</div>';
    if (!gonderilen && !cop) {
      const T = gl('MAIL_TEMPLATES') || [];
      h += MK.yanitAcik ? '<div class="ys-yanit"><textarea id="ys-mk-yanit" class="ys-girdi alan" rows="5" placeholder="Yanıtını yaz…"></textarea><div class="ys-mail-imza">Yanıtın sonuna "YDT-YDS Rusça Ekibi" imzası otomatik eklenir. Gönderen: ' + esc((m.to_email || 'destek@ydt-ydsrusca.com').toLowerCase()) + '</div><div class="ys-yanit-alt"><div class="ys-yanit-sol">' +
        '<select class="ys-girdi kucuk" onchange="ysMkSablon(this.value); this.selectedIndex = 0" aria-label="Hazır şablon"><option value="">Hazır şablon ekle…</option>' + T.map((s, i) => '<option value="' + i + '">' + esc(String(s.t || '').replace(/^\S*[\u{1F300}-\u{1FAFF}☀-➿]️?\s*/u, '')) + '</option>').join('') + '</select>' +
        '<a class="yp-link" href="mailto:' + encodeURIComponent(m.from_email || '') + '?subject=' + encodeURIComponent('RE: ' + (m.subject || '')) + '">Mail uygulamasında aç</a></div><div class="ys-yanit-sag"><button type="button" class="yp-btn" onclick="ysMkIs(\'yanit\')">Vazgeç</button><button type="button" class="yp-btn ana" onclick="ysMkGonder()">' + ic('okSag', 16) + 'Gönder</button></div></div></div>'
        : '<div class="ys-mk-alt"><button type="button" class="yp-btn ana" onclick="ysMkIs(\'yanit\')">' + ic('geri', 16) + 'Yanıtla</button>' + (uye ? '<button type="button" class="yp-btn" onclick="admMailToTicket(\'' + m.id + '\')">' + ic('destek', 16) + 'Destek talebine dönüştür</button>' : '') + '</div>';
    }
    return h;
  }
  window.ysMk = (a, v) => { MK[a] = v; MK.sayfa = 1; if (a === 'sekme') { MK.secili = null; MK.ara = ''; MK.yanitAcik = false; return mailYukle(); } mailCiz(); if (a === 'ara') { const i = $('ys-mk-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysMkSayfa = (s, boy) => { if (boy) MK.boy = boy; MK.sayfa = s; mailCiz(); };
  window.ysMkKapat = () => { MK.secili = null; MK.yanitAcik = false; mailCiz(); };
  window.ysMkAc = async id => {
    MK.secili = id; MK.yanitAcik = false;
    const m = MK.rows.find(x => String(x.id) === String(id));
    if (m && MK.sekme !== 'sent' && !m.is_read) { m.is_read = true; if (MK.sekme === 'inbox' && MK.say.inbox) MK.say.inbox--; try { sb.from('inbox_mail').update({ is_read: true }).eq('id', id).then(() => {}, () => {}); } catch (e) {} }
    mailCiz();
  };
  window.ysMkSec = (id, acik) => { if (id === 'temizle') MK.isaret.clear(); else acik ? MK.isaret.add(String(id)) : MK.isaret.delete(String(id)); mailCiz(); };
  window.ysMkSablon = i => { if (i === '') return; const s = (gl('MAIL_TEMPLATES') || [])[+i], ta = $('ys-mk-yanit'); if (!s || !ta) return; ta.value = ta.value ? ta.value + '\n\n' + s.body : s.body; ta.focus(); };
  window.ysMkIs = async is => {
    const m = MK.rows.find(x => String(x.id) === String(MK.secili)); if (!m) return;
    try {
      if (is === 'yanit') { MK.yanitAcik = !MK.yanitAcik; const d = $('ys-mk-detay'); if (d) d.innerHTML = mailDetay(); const ta = $('ys-mk-yanit'); if (ta) ta.focus(); return; }
      if (is === 'spam') { await sb.from('inbox_mail').update({ is_spam: !m.is_spam }).eq('id', m.id); toast(m.is_spam ? 'Gelen kutusuna taşındı.' : 'Spam olarak işaretlendi.'); }
      else if (is === 'cop') { await sb.from('inbox_mail').update({ is_deleted: true }).eq('id', m.id); toast('Çöpe taşındı.'); }
      else if (is === 'geri') { await sb.from('inbox_mail').update({ is_deleted: false }).eq('id', m.id); toast('Geri alındı.'); }
      else if (is === 'kalici') { if (!(await uiConfirm('Bu mail kalıcı olarak silinsin mi?', 'Kalıcı sil', { danger: true }))) return; await sb.from('inbox_mail').delete().eq('id', m.id); }
      else if (is === 'sentsil') { if (!(await uiConfirm('Bu gönderilmiş mail kaydı silinsin mi?', 'Kaydı sil', { danger: true }))) return; await sb.from('outbox_mail').delete().eq('id', m.id); }
    } catch (e) { uiAlert('İşlem yapılamadı.'); }
    MK.secili = null; mailYukle();
  };
  window.ysMkToplu = async () => {
    const ids = [...MK.isaret]; if (!ids.length) return;
    const kalici = MK.sekme === 'trash' || MK.sekme === 'sent';
    if (!(await uiConfirm(ids.length + (kalici ? ' kayıt kalıcı olarak silinsin mi?' : ' mail çöpe taşınsın mı?'), kalici ? 'Kalıcı sil' : 'Çöpe taşı', { danger: true }))) return;
    try {
      if (MK.sekme === 'sent') await sb.from('outbox_mail').delete().in('id', ids);
      else if (kalici) await sb.from('inbox_mail').delete().in('id', ids);
      else await sb.from('inbox_mail').update({ is_deleted: true }).in('id', ids);
    } catch (e) { uiAlert('İşlem yapılamadı.'); }
    mailYukle();
  };
  window.ysMkGonder = async () => {
    const m = MK.rows.find(x => String(x.id) === String(MK.secili)), ta = $('ys-mk-yanit'); if (!m || !ta) return;
    const body = (ta.value || '').trim(); if (!body) { uiAlert('Yanıt boş olamaz.'); return; }
    try {
      const { data, error } = await sb.functions.invoke('send-mail', { body: { to: m.from_email, subject: 'RE: ' + (m.subject || ''), body, from: (m.to_email || '').toLowerCase(), in_reply_to: m.message_id || null } });
      if (error || (data && data.error)) throw new Error((data && data.error) || 'hata');
      toast('Yanıt gönderildi.'); MK.yanitAcik = false; const d = $('ys-mk-detay'); if (d) d.innerHTML = mailDetay();
    } catch (e) { uiAlert('Gönderilemedi. Resend kurulumu (domain doğrulama, RESEND_API_KEY, send-mail) tamam mı? Resend panelindeki Emails sayfasından durumu kontrol edebilirsin.'); }
  };
  window.YS_AKS.mail = () => (MK.sekme === 'trash' ? '<button type="button" class="yp-btn kirmizi" onclick="adminEmptyTrash()">' + ic('cop', 16) + 'Çöpü boşalt</button>' : '') + '<button type="button" class="yp-btn" onclick="adminLoadMail()">' + ic('yenile', 16) + 'Yenile</button>';

  /* ============================================================
     KELİMELER (v175) — eski kaydetme/içe aktarma işlevleri aynen kullanılır
     ============================================================ */
  const KEL_TUR = [['all', 'Tümü', 'liste'], ['isim', 'İsim', 'not'], ['fiil', 'Fiil', 'kalem'], ['sıfat', 'Sıfat', 'yildiz'], ['zarf', 'Zarf', 'surgu'], ['diger', 'Diğer', 'nokta3']];
  const KEL_SIRA = [['yeni', 'Eklenme tarihi (yeni)'], ['eski', 'Eklenme tarihi (eski)'], ['alfabe', 'Alfabetik (Rusça)'], ['seviye', 'Seviye']];
  const kelAna = r => { const f = gl('_catAna'); return typeof f === 'function' ? f(r.cat) : String(r.cat || '').toLowerCase(); };
  const kelEksik = r => { const a = kelAna(r); return (a === 'isim' || a === 'sıfat') ? !r.cinsiyet : a === 'fiil' ? !r.tip : a === 'edat' ? !r.padej : false; };
  function kelimeKpi() {
    const k = $('cw-stats'); if (!k) return;
    const R = (gl('_cwRows') || []).filter(r => r.active !== false), T = R.length || 1;
    const ay = R.filter(r => r.created_at && Date.now() - new Date(r.created_at).getTime() < 30 * GUN).length;
    const yuzde = n => '<span class="ys-rozet kucuk">%' + Math.round(n / T * 100) + '</span>';
    const a12 = R.filter(r => r.level === 'A1' || r.level === 'A2').length, pr = R.filter(r => r.premium).length, ek = R.filter(kelEksik).length, orn = R.filter(r => r.ornek).length;
    k.innerHTML = kpi('kitap', 'altin', 'Toplam kelime', R.length.toLocaleString('tr-TR'), ay ? '<span class="ys-deg art">+' + ay + '</span><small>son 30 gün</small>' : '') +
      kpi('grafik', 'yesil', 'A1–A2 kelime', a12.toLocaleString('tr-TR'), yuzde(a12)) +
      kpi('tac', 'altin', 'Premium kelime', pr.toLocaleString('tr-TR'), yuzde(pr)) +
      kpi('hata', 'kirmizi', 'Eksik etiket', ek.toLocaleString('tr-TR'), '<button type="button" class="yp-link" onclick="cwState.tag=\'eksik\'; cwState.page=1; renderCwList()">göster</button>') +
      kpi('not', 'mavi', 'Örnek cümleli', orn.toLocaleString('tr-TR'), yuzde(orn));
  }
  function kelimeListe() {
    const box = $('cw-list'); if (!box) return;
    const cw = gl('cwState'), R = gl('_cwRows') || [];
    if (!cw.sira) cw.sira = 'yeni';
    const aktifler = R.filter(r => r.active !== false), cop = R.filter(r => r.active === false);
    let L = cw.trash ? cop : aktifler;
    const turSay = t => aktifler.filter(r => t === 'all' ? true : t === 'diger' ? !['isim', 'fiil', 'sıfat', 'zarf'].includes(kelAna(r)) : kelAna(r) === t).length;
    if (cw.level !== 'all') L = L.filter(r => r.level === cw.level);
    if (cw.cat && cw.cat !== 'all') L = L.filter(r => cw.cat === 'diger' ? !['isim', 'fiil', 'sıfat', 'zarf'].includes(kelAna(r)) : kelAna(r) === cw.cat);
    if (cw.prem) L = L.filter(r => r.premium);
    const t = cw.tag;
    if (t && t !== 'all') {
      if (t === 'НСВ' || t === 'СВ') L = L.filter(r => r.tip === t);
      else if (['м', 'ж', 'с', 'мн', 'м/ж'].includes(t)) L = L.filter(r => r.cinsiyet === t);
      else if (t === 'padejli') L = L.filter(r => r.padej);
      else if (t === 'eksik') L = L.filter(kelEksik);
      else if (t === 'ornekli') L = L.filter(r => r.ornek);
      else if (t === 'orneksiz') L = L.filter(r => !r.ornek);
    }
    const q = (cw.q || '').trim().toLocaleLowerCase('tr');
    if (q) L = L.filter(r => ((r.ru || '') + ' ' + (r.tr || '')).toLocaleLowerCase('tr').includes(q));
    const SV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
    L = L.slice().sort(cw.sira === 'alfabe' ? (a, b) => (a.ru || '').localeCompare(b.ru || '', 'ru') : cw.sira === 'seviye' ? (a, b) => (SV[a.level] || 9) - (SV[b.level] || 9) || (a.ru || '').localeCompare(b.ru || '', 'ru')
      : cw.sira === 'eski' ? (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0) : (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const boy = cw.boy || 25, n = Math.max(1, Math.ceil(L.length / boy)); if (cw.page > n) cw.page = n;
    const dilim = L.slice((cw.page - 1) * boy, cw.page * boy);
    const sk = $('cw-sira-k'); if (sk) sk.innerHTML = '<label class="yp-sec ince"><span>' + ic('surgu', 15) + '</span><select onchange="ysKel(\'sira\', this.value)" aria-label="Sıralama">' + KEL_SIRA.map(o => '<option value="' + o[0] + '"' + (cw.sira === o[0] ? ' selected' : '') + '>Sıralama: ' + o[1] + '</option>').join('') + '</select></label>';
    let h = '<div class="ys-arac ust">' + aramaKutusu('ys-kel-ara', cw.q || '', 'Rusça veya Türkçe ara…', 'ysKel(\'q\', this.value)') + '</div>' +
      '<div class="ys-cipler">' + KEL_TUR.map(x => '<button type="button" class="ys-cip' + (!cw.trash && !cw.prem && (cw.cat || 'all') === x[0] ? ' aktif' : '') + '" onclick="ysKel(\'cat\', \'' + x[0] + '\')">' + ic(x[2], 14) + x[1] + ' <small>(' + turSay(x[0]).toLocaleString('tr-TR') + ')</small></button>').join('') +
      '<button type="button" class="ys-cip' + (cw.prem && !cw.trash ? ' aktif' : '') + '" onclick="ysKel(\'prem\', 1)">' + ic('tac', 14) + 'Premium <small>(' + aktifler.filter(r => r.premium).length + ')</small></button>' +
      '<button type="button" class="ys-cip' + (cw.trash ? ' aktif' : '') + '" onclick="ysKel(\'trash\', 1)">' + ic('cop', 14) + 'Çöp kutusu <small>(' + cop.length + ')</small></button></div>' +
      '<div class="ys-arac alt">' + secim('Seviye', cw.level, [['all', 'Tümü'], ['A1', 'A1'], ['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1']], 'ysKel(\'level\', this.value)') +
      secim('Etiket', cw.tag || 'all', [['all', 'Tümü'], ['eksik', 'Etiketi eksik'], ['ornekli', 'Örnek cümle var'], ['orneksiz', 'Örnek cümle yok'], ['НСВ', 'НСВ'], ['СВ', 'СВ'], ['м', 'м (eril)'], ['ж', 'ж (dişil)'], ['с', 'с (nötr)'], ['padejli', 'Padejli']], 'ysKel(\'tag\', this.value)') +
      (cw.trash && cop.length ? '<button type="button" class="yp-btn kirmizi" onclick="adminWordPurgeAll()">' + ic('cop', 15) + 'Çöpü boşalt</button>' : '') + '</div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('kelime', 30) + '<b>' + (cw.trash ? 'Çöp kutusu boş.' : 'Eşleşen kelime yok.') + '</b></div>';
    else {
      const CNS = { 'м': 'mavi', 'ж': 'kirmizi', 'с': 'yesil', 'мн': 'mor', 'м/ж': 'mor' };
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta ys-kel-t"><thead><tr><th>#</th><th>Rusça kelime</th><th>Türkçe anlam</th><th>Seviye</th><th>Tür</th><th>Etiketler / durum</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>';
      dilim.forEach((r, i) => {
        const et = [];
        if (r.cinsiyet) et.push('<span class="yp-durum r-' + (CNS[r.cinsiyet] || 'gri') + '">' + esc(r.cinsiyet) + '</span>');
        if (r.tip) et.push('<span class="yp-durum r-' + (r.tip === 'СВ' ? 'turuncu' : 'camgobegi') + '">' + esc(r.tip) + '</span>');
        if (r.padej) et.push('<span class="yp-durum r-mor">' + esc(r.padej) + '</span>');
        if (r.cekim) et.push('<span class="ys-et yesil">' + ic('onay', 13) + 'Çekim düzeltilmiş</span>');
        if (r.ornek) et.push('<span class="ys-et mavi">' + ic('not', 13) + 'Örnek cümle</span>');
        if (r.premium) et.push('<span class="ys-et altin">' + ic('tac', 13) + 'Premium</span>');
        if (kelEksik(r)) et.push('<span class="ys-et kirmizi">' + ic('hata', 13) + 'Etiket eksik</span>');
        h += '<tr' + (gl('_cwEditId') === r.id ? ' class="acik"' : '') + '><td class="ys-soluk">' + ((cw.page - 1) * boy + i + 1) + '</td><td><button type="button" class="ys-ru" onclick="ysKelDuzenle(\'' + r.id + '\')">' + esc(r.ru) + '</button></td><td>' + esc(r.tr || '') + '</td>' +
          '<td><span class="yp-durum r-altin">' + esc(r.level || '') + '</span></td><td><span class="yp-durum r-mavi">' + esc(r.cat || '') + '</span></td><td><div class="ys-etler">' + (et.join('') || '<span class="ys-soluk">—</span>') + '</div></td>' +
          '<td class="ys-sag"><div class="ys-satir-b">' + (r.active === false ? '<button type="button" class="yp-ikon-b" title="Geri al" aria-label="Geri al" onclick="adminWordRestore(\'' + r.id + '\')">' + ic('geri', 16) + '</button><button type="button" class="yp-ikon-b sil" title="Kalıcı sil" aria-label="Kalıcı sil" onclick="adminWordPurge(\'' + r.id + '\')">' + ic('cop', 16) + '</button>'
            : '<button type="button" class="ys-uc-nokta" title="Düzenle" aria-label="Düzenle" onclick="ysKelDuzenle(\'' + r.id + '\')">' + ic('kalem', 15) + '</button><button type="button" class="ys-uc-nokta" title="Çöpe at" aria-label="Çöpe at" onclick="adminWordDelete(\'' + r.id + '\')">' + ic('cop', 15) + '</button>') + '</div></td></tr>';
      });
      h += '</tbody></table></div>' + sayfalama(L.length, cw.page, boy, 'ysKelSayfa', 'kelime');
    }
    box.innerHTML = h;
  }
  window.ysKel = (a, v) => {
    const cw = gl('cwState');
    if (a === 'cat') { cw.cat = v; cw.trash = false; cw.prem = false; }
    else if (a === 'prem') { cw.prem = true; cw.trash = false; cw.cat = 'all'; }
    else if (a === 'trash') { cw.trash = true; cw.prem = false; cw.cat = 'all'; }
    else cw[a] = v;
    cw.page = 1; kelimeListe();
    if (a === 'q') { const i = $('ys-kel-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }
  };
  window.ysKelSayfa = (s, boy) => { const cw = gl('cwState'); if (boy) cw.boy = boy; cw.page = s; kelimeListe(); };
  window.ysKelDuzenle = id => {
    if (typeof adminWordEdit === 'function') adminWordEdit(id);
    const b = $('ys-kel-form-b'); if (b) b.textContent = 'Kelimeyi düzenle';
    kelimeListe();
    const f = $('ys-kel-form'); if (f && window.innerWidth < 1200) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  function gramEtiketi() {
    const sel = $('cw-gram'); if (!sel) return;
    const k = sel.closest('.ys-alan'); if (k) k.style.display = sel.style.display === 'none' ? 'none' : '';
    const ana = kelAna({ cat: ($('cw-cat') || {}).value }), l = $('cw-gram-lbl');
    if (l) l.textContent = ana === 'fiil' ? 'Görünüş' : 'Cinsiyet';
  }
  window.YS_AKS.content = () => '<button type="button" class="yp-btn" onclick="document.getElementById(\'cw-file\').click()">' + ic('yukle', 16) + 'Dosya içe aktar</button>' +
    '<div class="ys-acilir-k"><button type="button" class="yp-btn" onclick="ysMenuAc(event, \'keldisa\', \'x\')">' + ic('indir', 16) + 'Dışa aktar' + ic('asagi', 14) + '</button></div>' +
    '<button type="button" class="yp-btn ana" onclick="ysKelYeni()">' + ic('arti', 16) + 'Yeni kelime</button>';
  MENULER.keldisa = () => [{ ic: 'indir', ad: 'CSV olarak indir', fn: "ypKelimeIndir('csv')" }, { ic: 'indir', ad: 'Excel olarak indir', fn: "ypKelimeIndir('xlsx')" }];
  window.ysKelYeni = () => {
    if (typeof adminWordFormClear === 'function') adminWordFormClear();
    const b = $('ys-kel-form-b'); if (b) b.textContent = 'Kelime ekle / düzenle';
    kelimeListe(); const i = $('cw-ru'); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => i.focus(), 250); }
  };

  /* ============================================================
     VİDEOLAR (v175)
     ============================================================ */
  const VD = { filtre: 'hepsi', ara: '', sira: 'num' };
  const sureYaz = s => { s = Math.round(s || 0); if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  function videoKpi() {
    const k = $('cv-stats'); if (!k) return;
    const R = (gl('_cvRows') || []).filter(r => r.active !== false), T = R.length || 1;
    const yz = n => '<span class="ys-rozet kucuk">%' + Math.round(n / T * 100) + '</span>';
    const pr = R.filter(r => r.premium).length, st = R.filter(r => r.source === 'stream').length, mf = R.filter(r => r.mf_ref).length;
    const ay = R.filter(r => r.created_at && Date.now() - new Date(r.created_at).getTime() < 30 * GUN).length;
    k.innerHTML = kpi('video', 'altin', 'Toplam video', R.length, ay ? '<span class="ys-deg art">+' + ay + '</span><small>son 30 gün</small>' : '') + kpi('tac', 'altin', 'Premium video', pr, yz(pr)) +
      kpi('hediye', 'mavi', 'Ücretsiz video', R.length - pr, yz(R.length - pr)) + kpi('yukle', 'mor', 'CF Stream', st, yz(st)) + kpi('kitap', 'yesil', 'Müfredata bağlı', mf, yz(mf));
  }
  function videoListe() {
    const box = $('cv-list'); if (!box) return;
    const R = gl('_cvRows') || [], akt = R.filter(r => r.active !== false), sil = R.filter(r => r.active === false);
    const F = { hepsi: akt, premium: akt.filter(r => r.premium), ucretsiz: akt.filter(r => !r.premium), baglisiz: akt.filter(r => !r.mf_ref), silinen: sil };
    let L = F[VD.filtre] || akt;
    const q = VD.ara.trim().toLocaleLowerCase('tr');
    if (q) L = L.filter(r => [r.title, r.descr, r.video_id, String(r.num || '')].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q));
    const SV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
    L = L.slice().sort(VD.sira === 'yeni' ? (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) : VD.sira === 'baslik' ? (a, b) => (a.title || '').localeCompare(b.title || '', 'tr') : VD.sira === 'seviye' ? (a, b) => (SV[a.level] || 9) - (SV[b.level] || 9) || (a.num || 0) - (b.num || 0) : (a, b) => (a.num || 0) - (b.num || 0));
    const sk = $('cv-sira-k'); if (sk) sk.innerHTML = '<label class="yp-sec ince"><span>' + ic('surgu', 15) + '</span><select onchange="ysVd(\'sira\', this.value)" aria-label="Sıralama">' + [['num', 'Sıra no'], ['yeni', 'Eklenme (yeni)'], ['baslik', 'Başlık'], ['seviye', 'Seviye']].map(o => '<option value="' + o[0] + '"' + (VD.sira === o[0] ? ' selected' : '') + '>Sıralama: ' + o[1] + '</option>').join('') + '</select></label>';
    const kat = r => { const f = gl('vdKat'); const k = typeof f === 'function' && r.mf_ref ? f(r.mf_ref) : null; return k ? k[1] : (r.mf_ref ? 'Müfredat ' + r.mf_ref : ''); };
    let h = '<div class="ys-arac ust">' + aramaKutusu('ys-vd-ara', VD.ara, 'Video ara… (başlık, açıklama, ID)', 'ysVd(\'ara\', this.value)') + '</div><div class="ys-cipler">' +
      [['hepsi', 'Tümü', 'liste'], ['premium', 'Premium', 'tac'], ['ucretsiz', 'Ücretsiz', 'hediye'], ['baglisiz', 'Müfredata bağlı değil', 'link'], ['silinen', 'Silinenler', 'cop']].map(x => '<button type="button" class="ys-cip' + (VD.filtre === x[0] ? ' aktif' : '') + '" onclick="ysVd(\'filtre\', \'' + x[0] + '\')">' + ic(x[2], 14) + x[1] + ' <small>(' + F[x[0]].length + ')</small></button>').join('') +
      (VD.filtre === 'silinen' && sil.length ? '<button type="button" class="yp-btn kucuk kirmizi" onclick="adminVidEmptyTrash()">' + ic('cop', 15) + 'Çöpü boşalt (Stream\'den de siler)</button>' : '') + '</div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('video', 30) + '<b>' + (VD.filtre === 'silinen' ? 'Silinen video yok.' : 'Eşleşen video yok.') + '</b></div>';
    else h += '<div class="ys-videolar">' + L.map(r => {
      const silinmis = r.active === false, k = kat(r), ti = jsq(r.title || '');
      const resim = r.thumb || (r.source !== 'stream' && r.video_id ? 'https://i.ytimg.com/vi/' + encodeURIComponent(r.video_id) + '/mqdefault.jpg' : '');
      const B = (ikon, ad, fn, ek) => '<button type="button" class="ys-vb' + (ek || '') + '" onclick="' + fn + '">' + ic(ikon, 15) + ad + '</button>';
      return '<div class="ys-video' + (silinmis ? ' silik' : '') + '"><div class="ys-v-resim">' + (resim ? '<img src="' + esc(resim) + '" alt="" loading="lazy">' : ic('video', 26)) + (r.duration_sec ? '<span>' + sureYaz(r.duration_sec) + '</span>' : '') + '</div>' +
        '<div class="ys-v-g"><div class="ys-v-ust"><div><b>' + (r.num ? '<span class="ys-soluk">' + r.num + '.</span> ' : '') + esc(r.title || '(başlıksız)') + '</b>' + (r.descr ? '<p>' + esc(String(r.descr).slice(0, 140)) + '</p>' : '') + '</div>' +
        '<div class="ys-v-sag">' + (silinmis ? '<span class="yp-durum d-kirmizi">Silindi</span>' : '<label class="ys-anahtar kucuk" title="Kapatırsan video gizlenir ve Silinenler\'e taşınır"><input type="checkbox" checked onchange="adminVidHide(\'' + r.id + '\')"><i></i><span>Aktif</span></label>') + menuB('video', r.id) + '</div></div>' +
        '<div class="ys-etler"><span class="yp-durum r-altin">' + esc(r.level || '—') + '</span>' + (r.source === 'stream' ? '<span class="yp-durum r-mor">CF Stream</span>' : '<span class="yp-durum r-kirmizi">YouTube</span>') +
        (r.premium ? '<span class="ys-et altin">' + ic('tac', 13) + 'Premium</span>' : '<span class="ys-et yesil">' + ic('hediye', 13) + 'Ücretsiz</span>') +
        (k ? '<span class="ys-et mavi">' + ic('kitap', 13) + esc(k) + '</span>' : '<span class="ys-et gri">' + ic('link', 13) + 'Müfredata bağlı değil</span>') + (!r.video_id ? '<span class="ys-et kirmizi">' + ic('hata', 13) + 'ID eksik</span>' : '') + '</div>' +
        (silinmis ? '<div class="ys-v-b">' + B('geri', 'Geri al', "adminVidRestore('" + r.id + "')") + B('cop', 'Temelli sil', "adminVidPurge('" + r.id + "')", ' sil') + '</div>'
          : '<div class="ys-v-b">' + B('kalem', 'Düzenle', "ysVdDuzenle('" + r.id + "')") + B('kart', 'Kartlar', "adminVidCards('" + r.id + "', '" + ti + "')") + B('liste', 'Bölümler', "adminVidChapters('" + r.id + "', '" + ti + "')") +
            B('not', 'Dokümanlar', "adminVidDocs('" + r.id + "', '" + ti + "')") + B('paragraf', 'Altyazı', "adminVidSubs('" + r.id + "', '" + ti + "')") + B('grafik', 'İstatistik', "adminVidStats('" + r.id + "', '" + ti + "')") + B('cop', 'Sil', "adminVidHide('" + r.id + "')", ' sil') + '</div>') + '</div></div>';
    }).join('') + '</div>';
    box.innerHTML = h;
  }
  MENULER.video = id => {
    const r = (gl('_cvRows') || []).find(x => x.id === id); if (!r) return [];
    if (r.active === false) return [{ ic: 'geri', ad: 'Geri al', fn: "adminVidRestore('" + id + "')" }, { ic: 'cop', ad: 'Temelli sil', fn: "adminVidPurge('" + id + "')", tehlike: 1 }];
    return [{ ic: 'kalem', ad: 'Düzenle', fn: "ysVdDuzenle('" + id + "')" }, { ic: r.premium ? 'hediye' : 'tac', ad: r.premium ? 'Ücretsiz yap' : 'Premium yap', fn: "adminVidTogglePremium('" + id + "', " + !r.premium + ")" }, { ayrac: 1 },
      { ic: 'yukari2', ad: 'En başa taşı', fn: "adminVidMoveEdge('" + id + "', 'top')" }, { ic: 'yukari', ad: 'Bir yukarı', fn: "adminVidMove('" + id + "', -1)" }, { ic: 'asagi2', ad: 'Bir aşağı', fn: "adminVidMove('" + id + "', 1)" }, { ic: 'asagi', ad: 'En sona taşı', fn: "adminVidMoveEdge('" + id + "', 'bottom')" },
      { ayrac: 1 }, { ic: 'cop', ad: 'Sil (çöpe taşı)', fn: "adminVidHide('" + id + "')", tehlike: 1 }];
  };
  window.ysVd = (a, v) => { VD[a] = v; videoListe(); if (a === 'ara') { const i = $('ys-vd-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } } };
  window.ysVdDuzenle = id => {
    if (typeof adminVidEdit === 'function') adminVidEdit(id);
    ysVidKaynakCiz(); const b = $('ys-vid-form-b'); if (b) b.textContent = 'Videoyu düzenle';
    const d = $('cv-desc'), s = $('cv-desc-say'); if (d && s) s.textContent = d.value.length;
    const f = $('ys-vid-form'); if (f && window.innerWidth < 1200) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.ysVidKaynak = k => { const s = $('cv-source'); if (!s) return; s.value = k; if (typeof adminVidSourceChanged === 'function') adminVidSourceChanged(); ysVidKaynakCiz(); };
  window.ysVidKaynakCiz = () => {
    const k = ($('cv-source') || {}).value || 'youtube';
    document.querySelectorAll('#ys-vid-kaynak .ys-hedef').forEach(b => b.classList.toggle('aktif', b.dataset.k === k));
    const l = $('cv-vid-lbl'); if (l) l.innerHTML = (k === 'stream' ? 'Stream video UID' : 'YouTube video ID') + ' <em>*</em>';
  };
  window.ysVdYeni = () => {
    if (typeof adminVidFormClear === 'function') adminVidFormClear();
    ysVidKaynakCiz(); const b = $('ys-vid-form-b'); if (b) b.textContent = 'Video ekle / düzenle';
    const s = $('cv-desc-say'); if (s) s.textContent = '0';
    const i = $('cv-title'); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => i.focus(), 250); }
  };
  window.YS_AKS.videos = () => '<button type="button" class="yp-btn ana" onclick="ysVdYeni()">' + ic('arti', 16) + 'Yeni video ekle</button>';

  /* ============================================================
     BLOGLAR VE MAKALELER (v175)
     Bloglar: content_recs (film/dizi/anime/kitap önerileri) · Makaleler: content_articles (dış kaynak)
     ============================================================ */
  const BL = { sekme: 'blog', ara: '', tur: 'hepsi', durum: 'hepsi', sayfa: 1, boy: 10, makaleler: null, mkHata: false, duzen: null };
  const BLOG_TUR = { film: ['Film', 'mavi'], dizi: ['Dizi', 'mor'], anime: ['Anime', 'kirmizi'], kitap: ['Kitap', 'altin'] };
  const MK_DURUM = { yayinda: ['Yayında', 'd-yesil'], taslak: ['Taslak', 'd-sari'], arsiv: ['Arşivde', 'd-gri'] };
  function editorCubugu(hedef) {
    const b = (k, ikon, ad, deger) => '<button type="button" class="ys-rte-b" title="' + ad + '" aria-label="' + ad + '" onmousedown="event.preventDefault()" onclick="ysRte(\'' + hedef + '\', \'' + k + '\'' + (deger ? ', \'' + deger + '\'' : '') + ')">' + ikon + '</button>';
    return '<div class="ys-rte">' + b('bold', '<b>K</b>', 'Kalın') + b('italic', '<i>İ</i>', 'İtalik') + b('underline', '<u>A</u>', 'Altı çizili') + b('strikeThrough', '<s>S</s>', 'Üstü çizili') + '<span></span>' +
      b('insertUnorderedList', ic('liste', 15), 'Madde listesi') + b('insertOrderedList', '1.', 'Numaralı liste') + '<span></span>' + b('justifyLeft', ic('menu', 15), 'Sola yasla') + b('justifyCenter', '≡', 'Ortala') + '<span></span>' +
      '<label class="ys-rte-b" title="Yazı rengi"><span style="border-bottom:3px solid #b0862c">A</span><input type="color" onchange="ysRte(\'' + hedef + '\', \'foreColor\', this.value)"></label>' + b('removeFormat', ic('kapat', 14), 'Biçimi temizle') + '</div>';
  }
  window.ysRte = (hedef, k, v) => { const a = $(hedef); if (a) a.focus(); try { document.execCommand(k, false, v || null); } catch (e) {} };
  async function blogYukle() {
    const k = $('ys-blog'); if (!k) return;
    if (window.__ysBlSekme) { if (BL.sekme !== window.__ysBlSekme) { BL.sekme = window.__ysBlSekme; BL.duzen = null; BL.ara = ''; BL.durum = 'hepsi'; k.innerHTML = ''; } delete window.__ysBlSekme; }
    if (BL.sekme === 'blog') { if (typeof adminRcReload === 'function' && !BL._icYukleme) { BL._icYukleme = true; try { await adminRcReload(); } finally { BL._icYukleme = false; } return; } }
    else {
      try { const { data, error } = await sb.from('content_articles').select('*').order('created_at', { ascending: false }).limit(1000); if (error) throw error; BL.makaleler = data || []; BL.mkHata = false; }
      catch (e) { BL.makaleler = []; BL.mkHata = true; }
    }
    blogCiz();
  }
  function blogCiz() {
    const k = $('ys-blog'); if (!k) return;
    const odak = document.activeElement && document.activeElement.closest && document.activeElement.closest('#ys-bl-form');
    if (odak && $('ys-bl-form-ic')) { blogListeCiz(); return; }     // formda yazarken formu bozma
    let h = '<div class="yp-kart ys-sekme-kart"><div class="ys-sekme-cubuk">' + [['blog', 'Bloglar', 'blog'], ['makale', 'Makaleler (dış kaynak)', 'makale']].map(s => '<button type="button" class="' + (BL.sekme === s[0] ? 'aktif' : '') + '" onclick="ysBl(\'sekme\', \'' + s[0] + '\')">' + ic(s[2], 16) + s[1] + '</button>').join('') + '</div></div>';
    h += '<div id="ys-bl-kpi" class="ys-kpiler d4"></div><div class="ys-yan-yana"><section class="yp-kart ys-liste" id="ys-bl-liste"></section><section class="yp-kart ys-form-kart" id="ys-bl-form"><div id="ys-bl-form-ic">' + (BL.sekme === 'blog' ? blogForm() : makaleForm()) + '</div></section></div>';
    k.innerHTML = h;
    if (BL.sekme === 'blog' && BL.duzen && typeof adminRcEdit === 'function') { adminRcEdit(BL.duzen); }
    if (BL.sekme === 'makale' && BL.duzen) makaleDoldur(BL.duzen);
    blogListeCiz();
  }
  function blogListeCiz() {
    const kp = $('ys-bl-kpi'), lk = $('ys-bl-liste'); if (!kp || !lk) return;
    const q = BL.ara.trim().toLocaleLowerCase('tr');
    let L, h;
    if (BL.sekme === 'blog') {
      const R = gl('_rcRows') || [];
      kp.innerHTML = kpi('blog', 'mavi', 'Toplam blog yazısı', R.length, '') + kpi('onay', 'yesil', 'Yayında', R.filter(r => r.active !== false).length, '') + kpi('saat', 'turuncu', 'Taslak / gizli', R.filter(r => r.active === false).length, '') + kpi('video', 'mor', 'Fragmanlı', R.filter(r => r.trailer).length, '');
      L = R.filter(r => (BL.tur === 'hepsi' || r.rtype === BL.tur) && (BL.durum === 'hepsi' || (BL.durum === 'yayinda') === (r.active !== false)) && (!q || [r.title, r.title_ru, String(r.descr || '').replace(/<[^>]*>/g, ' ')].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
      h = '<div class="ys-arac">' + aramaKutusu('ys-bl-ara', BL.ara, 'Başlık veya içerik ara…', 'ysBl(\'ara\', this.value)') + secim('Tür', BL.tur, [['hepsi', 'Tüm türler']].concat(Object.keys(BLOG_TUR).map(t => [t, BLOG_TUR[t][0]])), 'ysBl(\'tur\', this.value)') +
        secim('Durum', BL.durum, [['hepsi', 'Tüm durumlar'], ['yayinda', 'Yayında'], ['gizli', 'Taslak / gizli']], 'ysBl(\'durum\', this.value)') + '</div>';
    } else {
      const R = BL.makaleler || [];
      kp.innerHTML = kpi('makale', 'mavi', 'Toplam makale', R.length, '') + kpi('onay', 'yesil', 'Yayında', R.filter(r => r.durum === 'yayinda').length, '') + kpi('saat', 'turuncu', 'Taslak', R.filter(r => r.durum === 'taslak').length, '') + kpi('klasor', 'gri', 'Arşivde', R.filter(r => r.durum === 'arsiv').length, '');
      L = R.filter(r => (BL.durum === 'hepsi' || r.durum === BL.durum) && (!q || [r.baslik, r.ozet, r.kaynak_ad, r.kategori, r.yazar].filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)));
      h = '<div class="ys-arac">' + aramaKutusu('ys-bl-ara', BL.ara, 'Başlık, kaynak veya kategori ara…', 'ysBl(\'ara\', this.value)') + secim('Durum', BL.durum, [['hepsi', 'Tüm durumlar'], ['yayinda', 'Yayında'], ['taslak', 'Taslak'], ['arsiv', 'Arşivde']], 'ysBl(\'durum\', this.value)') + '</div>';
      if (BL.mkHata) { lk.innerHTML = h + '<div class="yp-bos">' + ic('makale', 30) + '<b>Makaleler tablosu bulunamadı.</b><span>makaleler.sql dosyasını Supabase\'de çalıştırınca bu bölüm açılır.</span></div>'; return; }
    }
    const n = Math.max(1, Math.ceil(L.length / BL.boy)); if (BL.sayfa > n) BL.sayfa = n;
    const dilim = L.slice((BL.sayfa - 1) * BL.boy, BL.sayfa * BL.boy);
    if (!L.length) h += '<div class="yp-bos">' + ic(BL.sekme === 'blog' ? 'blog' : 'makale', 30) + '<b>' + (BL.sekme === 'blog' ? 'Blog yazısı bulunamadı.' : 'Makale bulunamadı.') + '</b></div>';
    else if (BL.sekme === 'blog') {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Başlık</th><th>Tür</th><th>Seviye</th><th>Durum</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>' + dilim.map(r => {
        const T = BLOG_TUR[r.rtype] || [r.rtype || '—', 'gri'];
        return '<tr' + (BL.duzen === r.id ? ' class="acik"' : '') + '><td><div class="ys-yazi">' + (r.thumb ? '<img src="' + esc(r.thumb) + '" alt="" loading="lazy">' : '<span class="ys-yazi-ic">' + ic('blog', 20) + '</span>') + '<div><b>' + esc(r.title) + '</b><small>' + esc(String(r.descr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)) + '</small></div></div></td>' +
          '<td><span class="yp-durum r-' + T[1] + '">' + esc(T[0]) + '</span></td><td><span class="yp-durum r-altin">' + esc(r.level || '—') + '+</span></td><td><span class="yp-durum ' + (r.active !== false ? 'd-yesil' : 'd-sari') + '">' + (r.active !== false ? 'Yayında' : 'Taslak / gizli') + '</span></td><td class="ys-sag">' + menuB('blog', r.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    } else {
      h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Başlık</th><th>Kaynak</th><th>Durum</th><th>Okunma</th><th>Tarih</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>' + dilim.map(r => {
        const D = MK_DURUM[r.durum] || MK_DURUM.taslak;
        return '<tr' + (BL.duzen === r.id ? ' class="acik"' : '') + '><td><div class="ys-yazi">' + (r.kapak ? '<img src="' + esc(r.kapak) + '" alt="" loading="lazy">' : '<span class="ys-yazi-ic">' + ic('makale', 20) + '</span>') + '<div><b>' + esc(r.baslik) + '</b><small>' + esc((r.ozet || '').slice(0, 90)) + '</small></div></div></td>' +
          '<td>' + (r.kaynak_url ? '<a class="ys-kaynak" href="' + esc(r.kaynak_url) + '" target="_blank" rel="noopener">' + esc(r.kaynak_ad || r.kaynak_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + ic('link', 12) + '</a>' : esc(r.kaynak_ad || '—')) + (r.seviye ? '<small class="ys-soluk">' + esc(r.seviye) + (r.kategori ? ' · ' + esc(r.kategori) : '') + '</small>' : '') + '</td>' +
          '<td><span class="yp-durum ' + D[1] + '">' + D[0] + '</span></td><td>' + (r.okunma || 0).toLocaleString('tr-TR') + '</td><td class="ys-tar">' + tarih(r.created_at) + '</td><td class="ys-sag">' + menuB('makale', r.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    if (L.length) h += sayfalama(L.length, BL.sayfa, BL.boy, 'ysBlSayfa', BL.sekme === 'blog' ? 'blog yazısı' : 'makale');
    lk.innerHTML = h;
  }
  function blogForm() {
    return '<div class="yp-kart-bas"><div><h3 id="ys-bl-form-b">Blog yazısı ekle / düzenle</h3><p class="ys-kart-alt">Film, dizi, anime ve kitap önerileri blog sayfasında yayınlanır.</p></div></div><input type="hidden" id="rc-id">' +
      '<label class="ys-alan"><span>Başlık <em>*</em></span><input id="rc-title" class="ys-girdi" placeholder="Blog yazısı başlığı" autocomplete="off"></label>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Tür <em>*</em></span><select id="rc-type" class="ys-girdi">' + Object.keys(BLOG_TUR).map(t => '<option value="' + t + '">' + BLOG_TUR[t][0] + '</option>').join('') + '</select></label>' +
      '<label class="ys-alan"><span>Seviye</span><select id="rc-level" class="ys-girdi"><option>A1</option><option selected>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label></div>' +
      '<div class="ys-alan"><span>İçerik <em>*</em></span><div class="ys-editor">' + editorCubugu('rc-desc') + '<div id="rc-desc" class="ys-rte-alan" contenteditable="true" data-ph="Neden izlenmeli ya da okunmalı? Yazını buraya yaz…"></div></div></div>' +
      '<label class="ys-alan"><span>Rusça açıklama <small class="ys-soluk">(isteğe bağlı, RU modunda gösterilir)</small></span><textarea id="rc-desc-ru" class="ys-girdi alan" rows="2"></textarea></label>' +
      gorselAlan('rc-thumb', 'Kapak görseli', 'blog-kapak') +
      '<div class="ys-iki"><label class="ys-alan"><span>YouTube fragman</span><input id="rc-trailer" class="ys-girdi" placeholder="Video ID ya da bağlantı" autocomplete="off"></label>' +
      '<label class="ys-alan"><span>Nerede izlenir / alınır</span><input id="rc-link" class="ys-girdi" placeholder="https://" autocomplete="off"></label></div>' +
      '<div class="ys-form-alt"><button type="button" class="yp-btn ana" onclick="ysRcKaydet(true)">' + ic('okSag', 16) + 'Yayınla</button><button type="button" class="yp-btn" onclick="ysRcKaydet(false)">' + ic('kaydet', 16) + 'Taslak kaydet</button><button type="button" class="yp-btn" onclick="ysBlTemizle()">' + ic('kapat', 15) + 'Temizle</button></div>';
  }
  function makaleForm() {
    return '<div class="yp-kart-bas"><div><h3 id="ys-bl-form-b">Makale ekle / düzenle</h3><p class="ys-kart-alt">Güvenilir bir kaynaktaki makaleyi bağlantısı ve kaynak bilgisiyle ekle.</p></div></div><input type="hidden" id="mk-id">' +
      '<label class="ys-alan"><span>Başlık <em>*</em></span><input id="mk-baslik" class="ys-girdi" placeholder="Makale başlığı" autocomplete="off"></label>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Kaynak adı</span><input id="mk-kaynak" class="ys-girdi" placeholder="Örn. RIA Novosti" autocomplete="off"></label><label class="ys-alan"><span>Kaynak bağlantısı</span><input id="mk-url" class="ys-girdi" placeholder="https://" autocomplete="off"></label></div>' +
      '<div class="ys-uclu"><label class="ys-alan"><span>Yazar</span><input id="mk-yazar" class="ys-girdi" autocomplete="off"></label><label class="ys-alan"><span>Kategori</span><input id="mk-kategori" class="ys-girdi" placeholder="Örn. Kültür" autocomplete="off"></label>' +
      '<label class="ys-alan"><span>Seviye</span><select id="mk-seviye" class="ys-girdi"><option value="">—</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label></div>' +
      '<label class="ys-alan"><span>Özet</span><div class="ys-sayacli"><textarea id="mk-ozet" class="ys-girdi alan" rows="2" maxlength="400" placeholder="Listede ve kartta görünecek kısa özet" oninput="document.getElementById(\'mk-ozet-say\').textContent=this.value.length"></textarea><small><span id="mk-ozet-say">0</span>/400</small></div></label>' +
      gorselAlan('mk-kapak', 'Kapak görseli', 'makale-kapak') +
      '<div class="ys-alan"><span>Makale metni</span><div class="ys-editor">' + editorCubugu('mk-govde') + '<div id="mk-govde" class="ys-rte-alan uzun" contenteditable="true" data-ph="Makalenin metnini buraya yapıştır ya da yaz…"></div></div></div>' +
      '<div class="ys-not">' + ic('bilgi', 18) + '<div><span>Başka bir sitedeki makaleyi tam metin olarak yayımlamadan önce kaynağın izin verdiğinden emin ol; izin yoksa yalnızca özet ve bağlantı ekle.</span></div></div>' +
      '<div class="ys-form-alt"><button type="button" class="yp-btn ana" onclick="ysMkKaydet(\'yayinda\')">' + ic('okSag', 16) + 'Yayınla</button><button type="button" class="yp-btn" onclick="ysMkKaydet(\'taslak\')">' + ic('kaydet', 16) + 'Taslak kaydet</button><button type="button" class="yp-btn" onclick="ysBlTemizle()">' + ic('kapat', 15) + 'Temizle</button></div>';
  }
  function gorselAlan(id, ad, klasor) {
    return '<div class="ys-alan"><span>' + ad + '</span><div class="ys-dosya-sec"><span class="ys-ayar-ic">' + ic('resim', 20) + '</span><input id="' + id + '" class="ys-girdi" placeholder="Görsel adresi ya da dosya seç (önerilen 1200 × 630)" autocomplete="off">' +
      '<input type="file" id="' + id + '-dosya" accept="image/*" style="display:none" onchange="ysGorselYukle(this, \'' + id + '\', \'' + klasor + '\')"><button type="button" class="yp-btn kucuk" onclick="document.getElementById(\'' + id + '-dosya\').click()">Dosya seç</button></div><div id="' + id + '-durum" class="ys-durum-yazi"></div></div>';
  }
  window.ysGorselYukle = async (inp, hedef, klasor) => {
    const f = inp.files && inp.files[0], d = $(hedef + '-durum'); if (!f) return;
    if (f.size > 3 * 1024 * 1024) { uiAlert('Görsel en fazla 3 MB olabilir.'); return; }
    if (d) d.textContent = 'Yükleniyor…';
    try {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const yol = klasor + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
      const { error } = await sb.storage.from('docs').upload(yol, f, { cacheControl: '3600', upsert: false }); if (error) throw error;
      const { data } = sb.storage.from('docs').getPublicUrl(yol);
      $(hedef).value = (data && data.publicUrl) || ''; if (d) d.textContent = 'Görsel yüklendi.';
    } catch (e) { if (d) d.textContent = 'Yüklenemedi: ' + ((e && e.message) || e); }
    inp.value = '';
  };
  function makaleDoldur(id) {
    const r = (BL.makaleler || []).find(x => x.id === id); if (!r) return;
    const y = (k, v) => { const e = $(k); if (e) e.value = v || ''; };
    y('mk-id', r.id); y('mk-baslik', r.baslik); y('mk-kaynak', r.kaynak_ad); y('mk-url', r.kaynak_url); y('mk-yazar', r.yazar); y('mk-kategori', r.kategori); y('mk-seviye', r.seviye); y('mk-ozet', r.ozet); y('mk-kapak', r.kapak);
    const g = $('mk-govde'); if (g) g.innerHTML = typeof _sanitizeRich === 'function' ? _sanitizeRich(r.govde || '') : '';
    const s = $('mk-ozet-say'); if (s) s.textContent = (r.ozet || '').length;
    const b = $('ys-bl-form-b'); if (b) b.textContent = 'Makaleyi düzenle';
  }
  MENULER.blog = id => {
    const r = (gl('_rcRows') || []).find(x => x.id === id); if (!r) return [];
    return [{ ic: 'kalem', ad: 'Düzenle', fn: "ysBlDuzenle('" + id + "')" }, r.active !== false ? { ic: 'goz', ad: 'Yayından kaldır (taslağa al)', fn: "adminRcHide('" + id + "')" } : { ic: 'onay', ad: 'Yayınla', fn: "adminRcRestore('" + id + "')" },
      { ayrac: 1 }, { ic: 'cop', ad: 'Kalıcı sil', fn: "adminRcPurge('" + id + "')", tehlike: 1 }];
  };
  MENULER.makale = id => {
    const r = (BL.makaleler || []).find(x => x.id === id); if (!r) return [];
    const L = [{ ic: 'kalem', ad: 'Düzenle', fn: "ysBlDuzenle('" + id + "')" }];
    if (r.kaynak_url) L.push({ ic: 'link', ad: 'Kaynağı aç', fn: "window.open('" + jsq(r.kaynak_url) + "', '_blank', 'noopener')" });
    Object.keys(MK_DURUM).filter(d => d !== r.durum).forEach(d => L.push({ ic: d === 'yayinda' ? 'onay' : d === 'taslak' ? 'kalem' : 'klasor', ad: d === 'yayinda' ? 'Yayınla' : d === 'taslak' ? 'Taslağa al' : 'Arşive taşı', fn: "ysMkDurum('" + id + "', '" + d + "')" }));
    L.push({ ayrac: 1 }, { ic: 'cop', ad: 'Kalıcı sil', fn: "ysMkSil('" + id + "')", tehlike: 1 });
    return L;
  };
  window.ysBl = (a, v) => {
    if (a === 'sekme') { if (BL.sekme === v) return; BL.sekme = v; BL.ara = ''; BL.durum = 'hepsi'; BL.tur = 'hepsi'; BL.sayfa = 1; BL.duzen = null; const k = $('ys-blog'); if (k) k.innerHTML = ''; return blogYukle(); }
    BL[a] = v; BL.sayfa = 1; blogListeCiz();
    if (a === 'ara') { const i = $('ys-bl-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }
  };
  window.ysBlSayfa = (s, boy) => { if (boy) BL.boy = boy; BL.sayfa = s; blogListeCiz(); };
  window.ysBlDuzenle = id => {
    BL.duzen = id;
    if (BL.sekme === 'blog') { if (typeof adminRcEdit === 'function') adminRcEdit(id); const b = $('ys-bl-form-b'); if (b) b.textContent = 'Blog yazısını düzenle'; }
    else makaleDoldur(id);
    blogListeCiz();
    const f = $('ys-bl-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.ysBlTemizle = () => { BL.duzen = null; const f = $('ys-bl-form-ic'); if (f) f.innerHTML = BL.sekme === 'blog' ? blogForm() : makaleForm(); blogListeCiz(); };
  window.ysBlYeni = tur => { if (BL.sekme !== tur) { BL.sekme = tur; BL.duzen = null; const k = $('ys-blog'); if (k) k.innerHTML = ''; blogYukle().then(() => { const i = $(tur === 'blog' ? 'rc-title' : 'mk-baslik'); if (i) i.focus(); }); } else { ysBlTemizle(); const i = $(tur === 'blog' ? 'rc-title' : 'mk-baslik'); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus(); } } };
  window.ysRcKaydet = async yayin => {
    const v = id => (($(id) || {}).value || '').trim();
    const title = v('rc-title'); if (!title) { uiAlert('Başlık zorunlu.'); return; }
    const alan = $('rc-desc'), descr = alan && (alan.textContent || '').trim() ? (typeof _sanitizeRich === 'function' ? _sanitizeRich(alan.innerHTML) : alan.innerHTML) : null;
    let trailer = v('rc-trailer'); const ym = trailer.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/); if (ym) trailer = ym[1];
    const row = { rtype: v('rc-type'), title, level: v('rc-level'), descr, descr_ru: v('rc-desc-ru') || null, thumb: v('rc-thumb') || null, trailer: trailer || null, link: v('rc-link') || null, active: !!yayin };
    const id = v('rc-id');
    try {
      const { error } = id ? await sb.from('content_recs').update(row).eq('id', id) : await sb.from('content_recs').insert(row);
      if (error) throw error;
      toast(yayin ? 'Blog yazısı yayınlandı.' : 'Taslak olarak kaydedildi (sitede görünmez).');
      BL.duzen = null; const f = $('ys-bl-form-ic'); if (f) f.innerHTML = blogForm();
      if (typeof adminRcReload === 'function') adminRcReload(); if (typeof loadRecs === 'function') loadRecs();
    } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
  };
  window.ysMkKaydet = async durum => {
    const v = id => (($(id) || {}).value || '').trim();
    const baslik = v('mk-baslik'); if (!baslik) { uiAlert('Başlık zorunlu.'); return; }
    const url = v('mk-url'); if (url && !/^https?:\/\//i.test(url)) { uiAlert('Kaynak bağlantısı http:// ya da https:// ile başlamalı.'); return; }
    const g = $('mk-govde'), govde = g && (g.textContent || '').trim() ? (typeof _sanitizeRich === 'function' ? _sanitizeRich(g.innerHTML) : g.innerHTML) : null;
    if (durum === 'yayinda' && !govde && !v('mk-ozet')) { uiAlert('Yayınlamak için en azından bir özet ya da makale metni yaz.'); return; }
    const row = { baslik, kaynak_ad: v('mk-kaynak') || null, kaynak_url: url || null, yazar: v('mk-yazar') || null, kategori: v('mk-kategori') || null, seviye: v('mk-seviye') || null, ozet: v('mk-ozet') || null, kapak: v('mk-kapak') || null, govde, durum, updated_at: new Date().toISOString() };
    const id = v('mk-id');
    try {
      const { error } = id ? await sb.from('content_articles').update(row).eq('id', id) : await sb.from('content_articles').insert(row);
      if (error) throw error;
      toast(durum === 'yayinda' ? 'Makale yayınlandı.' : 'Makale taslak olarak kaydedildi.');
      BL.duzen = null; const f = $('ys-bl-form-ic'); if (f) f.innerHTML = makaleForm();
      blogYukle(); if (typeof makalelerYukle === 'function') makalelerYukle(true);
    } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e) + (/relation|does not exist/i.test((e && e.message) || '') ? ' — makaleler.sql çalıştırıldı mı?' : '')); }
  };
  window.ysMkDurum = async (id, d) => { try { const { error } = await sb.from('content_articles').update({ durum: d, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error; toast('Durum: ' + MK_DURUM[d][0]); } catch (e) { uiAlert('Güncellenemedi.'); } blogYukle(); if (typeof makalelerYukle === 'function') makalelerYukle(true); };
  window.ysMkSil = async id => {
    const r = (BL.makaleler || []).find(x => x.id === id);
    if (!(await uiConfirm('"' + ((r && r.baslik) || 'Makale') + '" kalıcı olarak silinsin mi?', 'Makaleyi sil', { danger: true }))) return;
    try { const { error } = await sb.from('content_articles').delete().eq('id', id); if (error) throw error; toast('Makale silindi.'); } catch (e) { uiAlert('Silinemedi.'); }
    if (BL.duzen === id) BL.duzen = null; blogYukle(); if (typeof makalelerYukle === 'function') makalelerYukle(true);
  };
  window.YS_AKS.recs = () => '<button type="button" class="yp-btn" onclick="ysBlYeni(\'makale\')">' + ic('link', 16) + 'Makale ekle</button><button type="button" class="yp-btn ana" onclick="ysBlYeni(\'blog\')">' + ic('arti', 16) + 'Blog yazısı ekle</button>';

  /* ============================================================
     İÇERİK MERKEZİ (v176)
     Sekmeler: Genel Liste · Müfredat Ağacı · E-Kitap · Konular · Çalışma Setleri · Sorular · Notlar ve Kartlar · Bağlantısız İçerikler
     Eski bölümlerin DOM'u (konular, özet notları, kartlar, soru havuzu, paragraf soruları) sekmelerin içine taşınır;
     kayıt/okuma işlevleri aynen çalışır.
     ============================================================ */
  const ICM_SEKME = [['genel', 'Genel Liste', 'liste'], ['agac', 'Müfredat Ağacı', 'agac'], ['unite', 'E-Kitap', 'kitap'], ['konular', 'Konular', 'etiket'],
    ['set', 'Çalışma Setleri', 'set'], ['sorular', 'Sorular', 'soru'], ['ozet', 'Notlar ve Kartlar', 'not'], ['baglantisiz', 'Bağlantısız İçerikler', 'link']];
  const ICM = { kuruldu: false, soru: 'pq', not: 'ozet' };
  const icS = () => gl('IC') || { tab: 'agac' };
  function icmKur() {
    if (ICM.kuruldu) return true;
    const v = $('av-icerik'); if (!v) return false;
    ICM.kuruldu = true;
    const eski = $('ic-tabs'); if (eski) eski.style.display = 'none';
    const cubuk = document.createElement('div'); cubuk.className = 'yp-kart ys-sekme-kart icm-sekmeler'; cubuk.id = 'icm-sekmeler';
    v.insertBefore(cubuk, eski ? eski.nextSibling : v.firstChild);
    const pano = id => { const d = document.createElement('div'); d.id = 'icm-' + id; d.className = 'icm-pano'; d.style.display = 'none'; v.appendChild(d); return d; };
    // Genel liste: İçerik Listesi görünümünün kutusu buraya taşınır
    const g = pano('genel'); const il = $('yp-il'); if (il) g.appendChild(il);
    pano('agac').innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
    const ek = pano('unite'); ek.innerHTML = '<div id="icm-ek-liste"></div><div id="icm-ed" style="display:none"></div>';
    const icEk = $('ic-ekitap'); if (icEk) { icEk.style.display = 'none'; ek.appendChild(icEk); }
    const kn = pano('konular'); const icK = $('ic-konular'); if (icK) { kn.appendChild(icK); icK.style.display = ''; }
    pano('set').innerHTML = '<div id="icm-set-liste"></div>';
    // Sorular: Soru havuzu (seviye sınavı) + paragraf soruları
    const sr = pano('sorular');
    sr.innerHTML = '<div class="ys-mini-sekme icm-alt" id="icm-soru-sec"></div><div id="icm-soru-pq" class="icm-alt-pano"></div><div id="icm-soru-soru" class="icm-alt-pano"></div>';
    [['pquest', 'icm-soru-pq'], ['questions', 'icm-soru-soru']].forEach(([gor, hedef]) => {
      const kaynak = $('av-' + gor), h = $(hedef); if (!kaynak || !h) return;
      [...kaynak.children].forEach(c => { if (!c.matches('h2.profile-h2, p.profile-sub')) h.appendChild(c); });
    });
    const nt = pano('ozet');
    nt.innerHTML = '<div class="ys-mini-sekme icm-alt" id="icm-not-sec"></div>';
    ['ic-ozet', 'ic-kartlar'].forEach(id => { const el = $(id); if (el) { nt.appendChild(el); const t = el.querySelector('.yp-nk'); if (t) t.remove(); } });
    pano('baglantisiz');
    return true;
  }
  function icmSekmeCiz() {
    const c = $('icm-sekmeler'); if (!c) return;
    const t = icS().tab === 'kartlar' ? 'ozet' : icS().tab;
    c.innerHTML = '<div class="ys-sekme-cubuk">' + ICM_SEKME.map(s => '<button type="button" class="' + (t === s[0] ? 'aktif' : '') + '" onclick="icTab(\'' + s[0] + '\')">' + ic(s[2], 16) + s[1] + '</button>').join('') + '</div>';
  }
  async function icmSekme(t) {
    if (!icmKur()) return;
    if (t === 'kartlar') { ICM.not = 'kartlar'; t = 'ozet'; } else if (t === 'ozet' && !ICM._notSabit) ICM.not = ICM.not || 'ozet';
    const IC_ = icS(); IC_.tab = t;
    icmSekmeCiz();
    ICM_SEKME.forEach(s => { const p = $('icm-' + s[0]); if (p) p.style.display = s[0] === t ? '' : 'none'; });
    menuKapat();
    try {
      if (t === 'genel') { if (typeof window.ypIlCiz === 'function') await window.ypIlCiz(); }
      else if (t === 'agac') await agacYukle();
      else if (t === 'unite' || t === 'set') await ekSekme(t);
      else if (t === 'konular') { if (typeof ekTopicsInit === 'function') await ekTopicsInit(); konularDuzen(); }
      else if (t === 'sorular') soruSekme(window.__icmSoru || ICM.soru);
      else if (t === 'ozet') notSekme(ICM.not);
      else if (t === 'baglantisiz') await baglantisizYukle();
    } catch (e) { console.error(e); }
    delete window.__icmSoru;
  }
  // Konular sekmesi: eski "Müfredat ağacı" kartı Müfredat Ağacı sekmesinde yeniden yapıldı, burada gizlenir
  function konularDuzen() {
    const t = $('mf-tree'); const k = t && t.closest('.admin-notif-card'); if (k) k.style.display = 'none';
    document.querySelectorAll('#ic-konular .admin-notif-card').forEach(c => c.classList.add('yp-kart', 'ys-eski-kart'));
  }
  function soruSekme(s) {
    ICM.soru = s === 'soru' ? 'soru' : 'pq';
    const sec = $('icm-soru-sec');
    if (sec) sec.innerHTML = '<button type="button" class="' + (ICM.soru === 'pq' ? 'aktif' : '') + '" onclick="icmSoru(\'pq\')">Paragraf soruları</button><button type="button" class="' + (ICM.soru === 'soru' ? 'aktif' : '') + '" onclick="icmSoru(\'soru\')">Seviye sınavı soruları</button>';
    const a = $('icm-soru-pq'), b = $('icm-soru-soru'); if (a) a.style.display = ICM.soru === 'pq' ? '' : 'none'; if (b) b.style.display = ICM.soru === 'soru' ? '' : 'none';
    document.querySelectorAll('#icm-sorular .admin-notif-card').forEach(c => c.classList.add('yp-kart', 'ys-eski-kart'));
    if (ICM.soru === 'pq') { if (typeof adminPquestInit === 'function') adminPquestInit(); }
    else { if (typeof adminQuestionStats === 'function') adminQuestionStats(); if (typeof adminPqlReload === 'function') adminPqlReload(); if (typeof plcCfgInit === 'function') plcCfgInit(); }
  }
  window.icmSoru = s => soruSekme(s);
  function notSekme(n) {
    ICM.not = n === 'kartlar' ? 'kartlar' : 'ozet';
    const sec = $('icm-not-sec');
    if (sec) sec.innerHTML = '<button type="button" class="' + (ICM.not === 'ozet' ? 'aktif' : '') + '" onclick="icmNot(\'ozet\')">' + ic('not', 14) + ' Özet notları</button><button type="button" class="' + (ICM.not === 'kartlar' ? 'aktif' : '') + '" onclick="icmNot(\'kartlar\')">' + ic('kart', 14) + ' Çalışma kartları</button>';
    const a = $('ic-ozet'), b = $('ic-kartlar'); if (a) a.style.display = ICM.not === 'ozet' ? '' : 'none'; if (b) b.style.display = ICM.not === 'kartlar' ? '' : 'none';
    document.querySelectorAll('#icm-ozet .admin-notif-card').forEach(c => c.classList.add('yp-kart', 'ys-eski-kart'));
    if (ICM.not === 'kartlar') { if (typeof icKartInit === 'function') icKartInit(); }
    else (async () => { if (typeof ekTopicsFetch === 'function') await ekTopicsFetch(); if (typeof ozInit === 'function') ozInit(); })();
  }
  window.icmNot = n => notSekme(n);

  // Başlık düğmeleri: PDF'den içe aktar + Yeni içerik menüsü
  window.YS_AKS.icerik = () => '<button type="button" class="yp-btn" onclick="icmPdfAc()">' + ic('yukle', 16) + 'PDF\'den içe aktar</button>' +
    '<button type="button" class="yp-btn ana" onclick="ysMenuAc(event, \'icmyeni\', \'x\')">' + ic('arti', 16) + 'Yeni içerik' + ic('asagi', 14) + '</button>';
  MENULER.icmyeni = () => [{ baslik: 'Müfredat' }, { ic: 'kitap', ad: 'E-kitap ünitesi', fn: "icmYeni('unite')" }, { ic: 'agac', ad: 'Modül', fn: "icmYeni('modul')" }, { ic: 'etiket', ad: 'Konu', fn: "icmYeni('konu')" },
    { baslik: 'Çalışma' }, { ic: 'set', ad: 'Çalışma seti', fn: "icmYeni('set')" }, { ic: 'paragraf', ad: 'Paragraf sorusu', fn: "icmYeni('pq')" }, { ic: 'soru', ad: 'Seviye sınavı sorusu', fn: "icmYeni('soru')" },
    { baslik: 'Notlar' }, { ic: 'not', ad: 'Özet notu', fn: "icmYeni('ozet')" }, { ic: 'kart', ad: 'Çalışma kartı', fn: "icmYeni('kart')" },
    { baslik: 'Diğer' }, { ic: 'video', ad: 'Video', fn: "icmYeni('video')" }, { ic: 'kelime', ad: 'Kelime', fn: "icmYeni('kelime')" }];
  window.icmYeni = async t => {
    if (t === 'modul') { await icmSekme('agac'); if (typeof mfYeniModul === 'function') await mfYeniModul(); return agacCiz(); }
    if (t === 'konu') { await icmSekme('konular'); if (typeof ekTopicYeni === 'function') ekTopicYeni(); const i = $('tp-kod'); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => i.focus(), 300); } return; }
    if (t === 'kart') { ICM.not = 'kartlar'; return icmSekme('ozet'); }
    if (t === 'video') { ypGit('videos'); return setTimeout(() => window.ysVdYeni && window.ysVdYeni(), 400); }
    if (t === 'kelime') { ypGit('content'); return setTimeout(() => window.ysKelYeni && window.ysKelYeni(), 600); }
    if (typeof ypYeni === 'function') return ypYeni(t);
  };

  /* ---------- Bağlantısız içerikler ---------- */
  async function baglantisizYukle() {
    const k = $('icm-baglantisiz'); if (!k) return;
    k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    const al = q => q.then(r => (r && r.data) || [], () => []);
    if (typeof ekTopicsFetch === 'function') await ekTopicsFetch();
    if (typeof mfYukle === 'function') await mfYukle();
    const [vid, oz, sets, pq] = await Promise.all([al(sb.from('content_videos').select('id, title, mf_ref, level, active').eq('active', true)),
      al(sb.from('ozet_notlar').select('id, baslik, konu')), al(sb.from('gw_sets').select('id, baslik, konular, seviye, yayinda')),
      al(sb.from('content_pquestions').select('id, soru, paragraf, konu, level, active').eq('active', true))]);
    const MFx = gl('MF') || { rows: [] }, T = (gl('EKA') || {}).topics || [];
    const atanan = typeof mfAtananlar === 'function' ? mfAtananlar() : new Set();
    const cocuk = {}; T.forEach(t => { if (t.ust_kod) (cocuk[t.ust_kod] = cocuk[t.ust_kod] || []).push(t.kod); });
    const bagli = kod => atanan.has(kod) || (cocuk[kod] || []).some(bagli);
    const tAd = kod => { const t = T.find(x => x.kod === kod); return t ? t.ad : kod; };
    const konusuzDers = []; MFx.rows.forEach(u => (u.p ? u.p.sections : []).forEach((s, si) => { if (s.tur === 'ders' && !s.konular.length) konusuzDers.push({ u, s, si }); }));
    const gruplar = [
      ['Konusu olmayan dersler', 'kitap', konusuzDers, x => 'Modül ' + x.u.modul_no + ' · Ünite ' + x.u.unite_no + ' · Ders ' + x.s.no + ' — ' + x.s.ad, x => ({ ad: 'Ağaçta aç', fn: "icmAgacSec('b', " + x.u.id + ", " + x.si + ")" }), 'Bu derslere konu atanmadığı için notlar, sorular ve setler onlara bağlanamaz.'],
      ['Hiçbir derse bağlı olmayan konular', 'etiket', T.filter(t => !bagli(t.kod)), x => x.ad + ' (' + x.kod + ')', () => ({ ad: 'Ağaçta ata', fn: "icTab('agac')" }), 'Konuyu bir derse atamak için Müfredat Ağacı\'nda dersi seçip "Konu ekle"yi kullan.'],
      ['Müfredata bağlı olmayan videolar', 'video', vid.filter(v => !v.mf_ref), x => x.title + (x.level ? ' · ' + x.level : ''), x => ({ ad: 'Düzenle', fn: "ypGit('videos'); setTimeout(() => ysVdDuzenle('" + x.id + "'), 700)" }), ''],
      ['Konusu olmayan özet notları', 'not', oz.filter(n => !n.konu || !T.some(t => t.kod === n.konu)), x => x.baslik + (x.konu ? ' · bilinmeyen konu: ' + x.konu : ''), x => ({ ad: 'Düzenle', fn: "ypDuzenle('ozet', '" + x.id + "')" }), ''],
      ['Konusu olmayan çalışma setleri', 'set', sets.filter(s => !(s.konular || []).length), x => x.baslik + (x.seviye ? ' · ' + x.seviye : ''), x => ({ ad: 'Düzenle', fn: "ypDuzenle('set', " + x.id + ")" }), ''],
      ['Konusu olmayan paragraf soruları', 'paragraf', pq.filter(q => !q.konu), x => String(x.soru || x.paragraf || '').slice(0, 90) + (x.level ? ' · ' + x.level : ''), x => ({ ad: 'Düzenle', fn: "ypDuzenle('pq', '" + x.id + "')" }), '']
    ];
    const toplam = gruplar.reduce((a, g) => a + g[2].length, 0);
    let h = '<div class="ys-kpiler d3">' + kpi('link', toplam ? 'turuncu' : 'yesil', 'Bağlantısız içerik', toplam, '<small>müfredata ya da konuya bağlanmamış</small>') +
      kpi('etiket', 'mavi', 'Konu', T.length, '<small>' + T.filter(t => bagli(t.kod)).length + ' tanesi bir derse bağlı</small>') +
      kpi('kitap', 'altin', 'Ders', MFx.rows.reduce((a, u) => a + (u.p ? u.p.sections.filter(s => s.tur === 'ders').length : 0), 0), '<small>' + konusuzDers.length + ' derste konu yok</small>') + '</div>';
    if (!toplam) h += '<div class="yp-kart"><div class="yp-bos">' + ic('onay', 30) + '<b>Her şey bağlı.</b><span>Müfredata ya da bir konuya bağlanmamış içerik bulunmadı.</span></div></div>';
    gruplar.forEach(g => {
      if (!g[2].length) return;
      h += '<section class="yp-kart ys-liste"><div class="yp-kart-bas ys-ic-bas"><div><h3>' + ic(g[1], 18) + esc(g[0]) + ' <span class="ys-rozet kucuk">' + g[2].length + '</span></h3>' + (g[5] ? '<p class="ys-kart-alt">' + esc(g[5]) + '</p>' : '') + '</div></div><div class="icm-bl-liste">' +
        g[2].slice(0, 200).map(x => { const b = g[4](x); return '<div class="icm-bl-s"><span>' + esc(g[3](x)) + '</span><button type="button" class="yp-btn kucuk" onclick="' + esc(b.fn) + '">' + esc(b.ad) + '</button></div>'; }).join('') + '</div></section>';
    });
    k.innerHTML = h;
  }

  /* ---------- Müfredat ağacı (3 bölmeli) ---------- */
  const AG = { sec: null, ara: '', filtre: 'hepsi', kapali: new Set(), sagSekme: 'duzen', veri: null, blok: null };
  const MOD_RENK = ['mavi', 'altin', 'mor', 'yesil', 'turuncu', 'camgobegi', 'kirmizi'];
  const BOLUM_AD = { ders: 'Ders', ozet: 'Ünite özeti', okuma: 'Okuma', test: 'Ünite testi', giris: 'Giriş' };
  async function agacYukle() {
    const k = $('icm-agac'); if (!k) return;
    if (!AG.veri) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    const al = q => q.then(r => (r && r.data) || [], () => []);
    const [_, __, vid, sets, oz, pq] = await Promise.all([typeof ekTopicsFetch === 'function' ? ekTopicsFetch() : null, typeof mfYukle === 'function' ? mfYukle() : null,
      al(sb.from('content_videos').select('id, title, mf_ref, level, premium, source, duration_sec, active, num').eq('active', true).order('num')),
      al(sb.from('gw_sets').select('id, baslik, seviye, konular, kitap_ref, yayinda, act_say')),
      al(sb.from('ozet_notlar').select('id, baslik, konu, aktif, govde')),
      al(sb.from('content_pquestions').select('id, soru, paragraf, konu, level, active').eq('active', true))]);
    AG.veri = { vid, sets, oz, pq };
    agacCiz();
  }
  const agU = id => (gl('MF') || { rows: [] }).rows.find(r => String(r.id) === String(id));
  function agSecim() {
    const s = AG.sec; if (!s) return null;
    if (s.t === 'm') { const units = (gl('MF') || { rows: [] }).rows.filter(r => r.modul_no === s.m); return units.length ? { t: 'm', m: s.m, units } : null; }
    const u = agU(s.u); if (!u) return null;
    if (s.t === 'u') return { t: 'u', u };
    const sec = u.p && u.p.sections[s.si]; return sec ? { t: 'b', u, si: s.si, sec } : null;
  }
  // Seçili düğüme bağlı içerikler
  function agBagli(x) {
    const V = AG.veri || { vid: [], sets: [], oz: [], pq: [] }, out = [];
    let units = [], secs = [];
    if (x.t === 'm') units = x.units; else units = [x.u];
    units.forEach(u => (u.p ? u.p.sections : []).forEach((s, si) => { if (x.t !== 'b' || si === x.si) secs.push({ u, s, si }); }));
    const konular = new Set(); secs.forEach(o => { o.s.konular.forEach(k => konular.add(k)); o.s.blocks.forEach(b => { if (b.t === 'act') (b.konu || []).forEach(k => konular.add(k)); }); });
    secs.forEach(o => { if (!BOLUM_AD[o.s.tur]) return;
      const act = o.s.blocks.filter(b => b.t === 'act').length, sayfa = 1 + o.s.blocks.filter(b => b.t === 'pagebreak').length;
      out.push({ tur: 'ekitap', ad: (o.s.tur === 'ders' ? 'Ders ' + o.s.no + ' — ' : (BOLUM_AD[o.s.tur] + ' — ')) + o.s.ad, alt: o.s.blocks.length + ' blok · ' + act + ' etkinlik', durum: o.u.yayinda ? 'yayinda' : 'taslak', u: o.u.id, si: o.si });
    });
    const refs = new Set(); secs.forEach(o => { if (o.s.tur === 'ders') refs.add(o.u.modul_no + '.' + o.u.unite_no + '.' + o.s.no); });
    units.forEach(u => { if (x.t !== 'b') refs.add(u.modul_no + '.' + u.unite_no); });
    V.vid.filter(v => v.mf_ref && (refs.has(v.mf_ref) || (x.t !== 'b' && units.some(u => String(v.mf_ref).startsWith(u.modul_no + '.' + u.unite_no + '.'))))).forEach(v =>
      out.push({ tur: 'video', ad: v.title, alt: [v.duration_sec ? sureYaz(v.duration_sec) : '', v.source === 'stream' ? 'CF Stream' : 'YouTube', v.premium ? 'Premium' : ''].filter(Boolean).join(' · '), durum: 'yayinda', id: v.id }));
    secs.forEach(o => o.s.blocks.forEach((b, bi) => { if (b.t === 'act') out.push({ tur: 'etkinlik', ad: (b.alanlar['yönerge'] || b.alanlar['görev'] || 'Etkinlik').slice(0, 80), alt: ((gl('EK_TIPLER') || {})[b.tip] || b.tip) + ' · ' + (b.items.length || 1) + ' madde' + (b.kontrol ? ' · kontrol edilecek' : ''), durum: b.kontrol ? 'kontrol' : (o.u.yayinda ? 'yayinda' : 'taslak'), u: o.u.id, si: o.si, bi }); }));
    const unitRef = new Set(units.map(u => u.modul_no + '.' + u.unite_no));
    V.sets.filter(s => (s.konular || []).some(k => konular.has(k)) || (x.t !== 'b' && s.kitap_ref && unitRef.has(s.kitap_ref))).forEach(s =>
      out.push({ tur: 'calisma', ad: s.baslik, alt: (s.act_say || 0) + ' etkinlik' + (s.seviye ? ' · ' + s.seviye : ''), durum: s.yayinda ? 'yayinda' : 'taslak', id: s.id }));
    V.pq.filter(q => q.konu && konular.has(q.konu)).forEach(q => out.push({ tur: 'soru', ad: String(q.soru || '').slice(0, 90) || 'Paragraf sorusu', alt: 'Paragraf sorusu' + (q.level ? ' · ' + q.level : ''), durum: 'yayinda', id: q.id }));
    V.oz.filter(n => n.konu && konular.has(n.konu)).forEach(n => out.push({ tur: 'not', ad: n.baslik, alt: 'Özet notu', durum: n.aktif === false ? 'gizli' : 'yayinda', id: n.id }));
    secs.forEach(o => o.s.blocks.forEach((b, bi) => { if (b.t === 'kartlar') b.cards.forEach((c, ci) => out.push({ tur: 'kart', ad: String(c.on || '').replace(/\{\{|\}\}/g, '').slice(0, 80) || 'Kart', alt: 'Çalışma kartı', durum: o.u.yayinda ? 'yayinda' : 'taslak', u: o.u.id, si: o.si, bi })); }));
    // Kelimeler: bölümlerde geçen Rusça sözcükler (kelime paneliyle aynı yöntem) ve kelime bloklarındakiler
    const kel = new Map();
    secs.forEach(o => {
      o.s.blocks.forEach(b => { if (b.t === 'kelimeler') b.kel.forEach(k => { const ru = String(k.ru || '').replace(/[{}]/g, '').trim(); if (ru) kel.set(ru.toLowerCase(), { ru, tr: k.tr }); }); });
      if (x.t === 'b') Object.values(blokOnizEl(o.s, 'icm6')).forEach(el => el.querySelectorAll('[data-w]').forEach(n => { const w = n.dataset.w; if (w && w.replace(/[^а-яё]/gi, '').length > 2 && !kel.has(w.toLowerCase())) kel.set(w.toLowerCase(), { ru: w, tr: '' }); }));
    });
    [...kel.values()].forEach(w => { const f = gl('ekFindWord'); const s = typeof f === 'function' ? f(w.ru) : null; out.push({ tur: 'kelime', ad: w.ru, alt: s ? (s.tr || '') + ' · sözlükte var' : (w.tr ? w.tr + ' · ' : '') + 'sözlükte yok', durum: s ? 'yayinda' : 'eksik', ru: w.ru }); });
    return { out, konular: [...konular] };
  }
  const BG_TUR = { ekitap: ['E-Kitap', 'kitap', 'mavi'], video: ['Video', 'video', 'kirmizi'], calisma: ['Çalışma', 'set', 'mor'], etkinlik: ['Etkinlik', 'onay', 'camgobegi'], soru: ['Soru', 'soru', 'yesil'], not: ['Not', 'not', 'gri'], kart: ['Kart', 'kart', 'turuncu'], kelime: ['Kelime', 'kelime', 'altin'] };
  const BG_DURUM = { yayinda: ['Yayında', 'd-yesil'], taslak: ['Taslak', 'd-sari'], kontrol: ['Kontrol', 'd-turuncu'], gizli: ['Gizli', 'd-gri'], eksik: ['Sözlükte yok', 'd-gri'] };
  function agacCiz() {
    const k = $('icm-agac'); if (!k || k.style.display === 'none') return;
    const MFx = gl('MF') || { rows: [] };
    const mods = typeof mfModuller === 'function' ? mfModuller() : [];
    if (!AG.sec && mods.length) { const u0 = mods[0].units[0]; const d = u0 && u0.p ? u0.p.sections.findIndex(s => s.tur === 'ders') : -1; AG.sec = d > -1 ? { t: 'b', u: u0.id, si: d } : { t: 'm', m: mods[0].no }; }
    const q = AG.ara.trim().toLocaleLowerCase('tr'), uyar = t => !q || String(t || '').toLocaleLowerCase('tr').includes(q);
    const ss = AG.sec || {};
    let agac = '';
    mods.forEach((m, mi) => {
      const mk = 'm' + m.no, dSay = m.units.reduce((a, u) => a + (u.p ? u.p.sections.filter(s => s.tur === 'ders').length : 0), 0);
      const uSatir = m.units.map(u => {
        const secs = (u.p ? u.p.sections : []).map((s, si) => ({ s, si })).filter(o => BOLUM_AD[o.s.tur] && o.s.ln);
        const eslesen = secs.filter(o => uyar(o.s.ad) || uyar(m.ad) || uyar(u.unite_ad));
        if (q && !eslesen.length && !uyar(u.unite_ad) && !uyar(m.ad)) return '';
        const uk = 'u' + u.id, uKapali = AG.kapali.has(uk) && !q;
        return '<div class="icm-dugum"><div class="icm-satir u' + (ss.t === 'u' && String(ss.u) === String(u.id) ? ' secili' : '') + '"><button type="button" class="icm-ok" onclick="icmAgacAc(\'' + uk + '\')" aria-label="Aç/kapat">' + ic(uKapali ? 'sag' : 'asagi', 14) + '</button>' +
          '<button type="button" class="icm-ad" onclick="icmAgacSec(\'u\', ' + u.id + ')"><span class="icm-ic r-' + MOD_RENK[mi % MOD_RENK.length] + '">' + ic('kitap', 16) + '</span><span><b>Ünite ' + u.unite_no + '</b> ' + esc(u.unite_ad || '') + '<small>' + secs.filter(o => o.s.tur === 'ders').length + ' ders · ' + (u.yayinda ? 'yayında' : 'taslak') + '</small></span></button>' + menuB('agu', String(u.id)) + '</div>' +
          (uKapali ? '' : '<div class="icm-cocuk">' + (secs.length ? (q ? eslesen : secs).map(o => '<div class="icm-satir b' + (ss.t === 'b' && String(ss.u) === String(u.id) && ss.si === o.si ? ' secili' : '') + '"><button type="button" class="icm-ad" onclick="icmAgacSec(\'b\', ' + u.id + ', ' + o.si + ')">' +
            '<span class="icm-ic-k">' + ic(o.s.tur === 'ders' ? 'kitap' : o.s.tur === 'test' ? 'soru' : o.s.tur === 'okuma' ? 'paragraf' : 'not', 15) + '</span><span>' + (o.s.tur === 'ders' ? '<b>Ders ' + o.s.no + '</b> ' : '') + esc(o.s.tur === 'ders' ? o.s.ad : BOLUM_AD[o.s.tur] + (o.s.ad && o.s.tur !== 'ozet' ? ' — ' + o.s.ad : '')) + '</span></button>' + menuB('agb', u.id + ':' + o.si) + '</div>').join('') : '<div class="icm-bos-s">Ders yok</div>') + '</div>') + '</div>';
      }).join('');
      if (q && !uSatir && !uyar(m.ad)) return;
      const mKapali = AG.kapali.has(mk) && !q;
      agac += '<div class="icm-dugum"><div class="icm-satir m' + (ss.t === 'm' && ss.m === m.no ? ' secili' : '') + '"><button type="button" class="icm-ok" onclick="icmAgacAc(\'' + mk + '\')" aria-label="Aç/kapat">' + ic(mKapali ? 'sag' : 'asagi', 14) + '</button>' +
        '<button type="button" class="icm-ad" onclick="icmAgacSec(\'m\', ' + m.no + ')"><span class="icm-ic buyuk r-' + MOD_RENK[mi % MOD_RENK.length] + '">' + ic('kitap', 18) + '</span><span><b>Modül ' + m.no + '</b> ' + esc(m.ad || '') + '<small>' + m.units.length + ' ünite · ' + dSay + ' ders</small></span></button>' + menuB('agm', String(m.no)) + '</div>' +
        (mKapali ? '' : '<div class="icm-cocuk">' + uSatir + '</div>') + '</div>';
    });
    if (!mods.length) agac = '<div class="yp-bos">' + ic('agac', 28) + '<b>Henüz modül yok.</b><span>"+" ile ilk modülü ve ünitesini oluştur.</span></div>';
    else if (!agac) agac = '<div class="yp-bos kucuk"><span>Aramaya uyan düğüm yok.</span></div>';
    const x = agSecim();
    k.innerHTML = '<div class="icm-uclu"><section class="yp-kart icm-sol"><div class="icm-bas"><h3>Müfredat ağacı</h3><button type="button" class="yp-ikon-b" title="Toplu müfredat düzenle" aria-label="Toplu müfredat" onclick="icTab(\'konular\'); setTimeout(() => { const d = document.querySelector(\'.mf-toplu\'); if (d) { d.open = true; d.scrollIntoView({ block: \'start\', behavior: \'smooth\' }); } }, 300)">' + ic('kalem', 16) + '</button></div>' +
      '<div class="icm-arac">' + aramaKutusu('icm-ag-ara', AG.ara, 'Modül, ünite, ders ara…', 'icmAgacAra(this.value)') + '<button type="button" class="ys-uc-nokta" title="Tümünü aç / kapat" aria-label="Tümünü aç ya da kapat" onclick="icmAgacTumu()">' + ic('liste', 16) + '</button><button type="button" class="yp-btn ana kare" title="Yeni modül" aria-label="Yeni modül" onclick="icmYeni(\'modul\')">' + ic('arti', 17) + '</button></div>' +
      '<div class="icm-agac-l">' + agac + '</div></section>' +
      '<section class="yp-kart icm-orta" id="icm-orta">' + agOrta(x) + '</section><section class="yp-kart icm-sag" id="icm-sag">' + agSag(x) + '</section></div>';
    if (x && x.t === 'b' && AG.sagSekme === 'duzen') blokListeBagla('icm-sag-bloklar', agBaglam(x));
  }
  function agOrta(x) {
    if (!x) return '<div class="yp-bos">' + ic('agac', 28) + '<b>Soldan bir modül, ünite ya da ders seç.</b></div>';
    const b = agBagli(x), say = t => b.out.filter(o => t === 'hepsi' || o.tur === t).length;
    let bas, yol = '', etiket = '';
    if (x.t === 'm') { bas = 'Modül ' + x.m + ' — ' + esc(x.units[0].modul_ad || ''); etiket = '<span class="yp-durum d-gri">' + x.units.length + ' ünite</span>'; }
    else if (x.t === 'u') { bas = 'Ünite ' + x.u.unite_no + ' — ' + esc(x.u.unite_ad || ''); yol = 'Modül ' + x.u.modul_no; etiket = '<span class="yp-durum r-altin">' + esc(x.u.seviye || '—') + '</span><span class="yp-durum ' + (x.u.yayinda ? 'd-yesil' : 'd-sari') + '">' + (x.u.yayinda ? 'Yayında' : 'Taslak') + '</span>'; }
    else { bas = (x.sec.tur === 'ders' ? 'Ders ' + x.sec.no + ' — ' : BOLUM_AD[x.sec.tur] + ' — ') + esc(x.sec.ad); yol = 'Modül ' + x.u.modul_no + ' ' + ic('sag', 12) + ' Ünite ' + x.u.unite_no; etiket = '<span class="yp-durum r-altin">' + esc(x.u.seviye || '—') + '</span><span class="yp-durum ' + (x.u.yayinda ? 'd-yesil' : 'd-sari') + '">' + (x.u.yayinda ? 'Yayında' : 'Taslak') + '</span>'; }
    const anahtar = x.t === 'm' ? 'agm' : x.t === 'u' ? 'agu' : 'agb', kim = x.t === 'm' ? String(x.m) : x.t === 'u' ? String(x.u.id) : x.u.id + ':' + x.si;
    let h = '<div class="icm-orta-bas"><div><h3>' + bas + '</h3>' + (yol ? '<div class="icm-yol">' + yol + '</div>' : '') + '<div class="ys-etler">' + etiket + '</div></div>' + menuB(anahtar, kim) + '</div>';
    if (x.t === 'b') {
      const T = (gl('EKA') || {}).topics || [], tAd = kod => { const t = T.find(z => z.kod === kod); return t ? t.ad : kod; };
      h += '<div class="icm-konular"><span class="icm-konular-b">Konular</span>' + (x.sec.konular.length ? x.sec.konular.map(kd => '<span class="icm-konu" title="' + esc(kd) + '">' + esc(tAd(kd)) + '<button type="button" aria-label="Konuyu çıkar" onclick="icmKonuCikar(' + x.u.id + ', ' + x.si + ', \'' + jsq(kd) + '\')">' + ic('kapat', 12) + '</button></span>').join('') : '<span class="ys-soluk">Konu atanmadı</span>') +
        '<button type="button" class="yp-link" onclick="icmKonuEkle(' + x.u.id + ', ' + x.si + ')">+ Konu ekle</button></div>';
    }
    h += '<div class="ys-cipler icm-filtre">' + [['hepsi', 'Tümü']].concat(Object.keys(BG_TUR).map(t => [t, BG_TUR[t][0]])).map(f => '<button type="button" class="ys-cip' + (AG.filtre === f[0] ? ' aktif' : '') + '" onclick="icmAgacFiltre(\'' + f[0] + '\')">' + f[1] + ' <small>' + say(f[0]) + '</small></button>').join('') + '</div>';
    const L = b.out.filter(o => AG.filtre === 'hepsi' || o.tur === AG.filtre);
    h += '<div class="icm-icerikler">' + (L.length ? L.slice(0, 300).map((o, i) => {
      const T = BG_TUR[o.tur], D = BG_DURUM[o.durum] || BG_DURUM.yayinda;
      return '<button type="button" class="icm-icerik" onclick="icmIcerikAc(' + b.out.indexOf(o) + ')"><span class="icm-tur r-' + T[2] + '">' + ic(T[1], 15) + T[0] + '</span><span class="icm-icerik-y"><b>' + esc(o.ad) + '</b><small>' + esc(o.alt || '') + '</small></span><span class="yp-durum ' + D[1] + '">' + D[0] + '</span></button>';
    }).join('') : '<div class="yp-bos kucuk"><span>' + (AG.filtre === 'hepsi' ? 'Bu düğüme bağlı içerik yok.' : 'Bu türde içerik yok.') + '</span></div>') + '</div>';
    AG._bagli = b.out;
    return h;
  }
  function agSag(x) {
    if (!x || x.t !== 'b') {
      if (x && x.t === 'u') return '<div class="icm-sag-bas"><h3>Ünite</h3></div><div class="icm-ozet-k">' + [['Modül', x.u.modul_no + ' — ' + (x.u.modul_ad || '')], ['Ünite', x.u.unite_no + ' — ' + (x.u.unite_ad || '')], ['Seviye', x.u.seviye || '—'], ['Durum', x.u.yayinda ? 'Yayında' : 'Taslak'], ['Bölüm', (x.u.p ? x.u.p.sections.length : 0) + ''], ['Son güncelleme', x.u.updated_at ? new Date(x.u.updated_at).toLocaleString('tr-TR') : '—']].map(r => '<div><small>' + r[0] + '</small><b>' + esc(r[1]) + '</b></div>').join('') + '</div>' +
        '<div class="ys-form-alt"><button type="button" class="yp-btn ana" onclick="icmEdAc(' + x.u.id + ')">' + ic('kalem', 16) + 'E-kitap düzenleyicisinde aç</button><button type="button" class="yp-btn" onclick="icmOnizle(' + x.u.id + ')">' + ic('goz', 16) + 'Öğrenci önizleme</button></div>';
      return '<div class="yp-bos">' + ic('kitap', 28) + '<b>Ders seç</b><span>Bir dersin içerik bloklarını düzenlemek için soldan bir ders seç.</span></div>';
    }
    const sek = [['duzen', 'Düzenle'], ['sayfa', 'Sayfa görünümü'], ['onizle', 'Öğrenci önizleme']];
    let h = '<div class="icm-sag-sekme">' + sek.map(s => '<button type="button" class="' + (AG.sagSekme === s[0] ? 'aktif' : '') + '" onclick="icmAgacSag(\'' + s[0] + '\')">' + s[1] + '</button>').join('') + '<button type="button" class="yp-ikon-b" title="Tam ekran düzenleyicide aç" aria-label="Tam ekran düzenleyicide aç" onclick="icmEdAc(' + x.u.id + ', ' + x.si + ')">' + ic('okSag', 16) + '</button></div>';
    if (AG.sagSekme === 'duzen') h += '<div class="icm-sag-bas"><div><h3>E-kitap içeriği</h3><p class="ys-kart-alt">Değişiklikler anında kaydedilir.</p></div><span class="yp-durum ' + (x.u.yayinda ? 'd-yesil' : 'd-sari') + '">' + (x.u.yayinda ? 'Yayında' : 'Taslak') + '</span></div><div id="icm-sag-bloklar"></div>';
    else {
      h += '<div class="ek-adm-preview icm-onizleme' + (AG.sagSekme === 'sayfa' ? ' sayfa' : '') + '" id="icm-sag-on"></div>';
      setTimeout(() => onizlemeCiz($('icm-sag-on'), x.u.p, x.si, AG.sagSekme === 'sayfa'), 0);
    }
    return h;
  }
  function agBaglam(x) {
    return { kok: 'icm-sag-bloklar', si: x.si, kapsam: 'icm2', kompakt: true, set: false,
      src: () => (agU(x.u.id) || x.u).kaynak, p: () => (agU(x.u.id) || x.u).p,
      yaz: async yeni => { const u = agU(x.u.id); if (!u) return false; const ok = await mfYaz(u, yeni); if (ok) { surumKaydet(u.id, yeni, u.yayinda, 'Müfredat ağacından düzenleme'); } return ok; },
      sonra: () => agacCiz() };
  }
  window.icmAgacSec = async (t, a, b) => {
    if (t === 'b' && icS().tab !== 'agac') { await icmSekme('agac'); }
    AG.sec = t === 'm' ? { t, m: a } : t === 'u' ? { t, u: a } : { t, u: a, si: b };
    if (t !== 'm') { const u = agU(a); if (u) { AG.kapali.delete('m' + u.modul_no); AG.kapali.delete('u' + u.id); } }
    AG.filtre = 'hepsi'; agacCiz();
  };
  window.icmAgacAc = k => { AG.kapali.has(k) ? AG.kapali.delete(k) : AG.kapali.add(k); agacCiz(); };
  window.icmAgacTumu = () => { const MFx = gl('MF') || { rows: [] }; if (AG.kapali.size) AG.kapali.clear(); else MFx.rows.forEach(r => AG.kapali.add('u' + r.id)); agacCiz(); };
  window.icmAgacAra = v => { AG.ara = v; agacCiz(); const i = $('icm-ag-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } };
  window.icmAgacFiltre = f => { AG.filtre = f; const o = $('icm-orta'); if (o) o.innerHTML = agOrta(agSecim()); };
  window.icmAgacSag = s => { AG.sagSekme = s; const x = agSecim(), k = $('icm-sag'); if (!k) return; k.innerHTML = agSag(x); if (x && x.t === 'b' && s === 'duzen') blokListeBagla('icm-sag-bloklar', agBaglam(x)); };
  window.icmIcerikAc = i => {
    const o = (AG._bagli || [])[i]; if (!o) return;
    if (o.tur === 'ekitap') return icmAgacSec('b', o.u, o.si);
    if (o.tur === 'etkinlik' || o.tur === 'kart') { AG.sagSekme = 'duzen'; AG.sec = { t: 'b', u: o.u, si: o.si }; agacCiz(); setTimeout(() => blokDuzenAc('icm-sag-bloklar', o.bi), 50); return; }
    if (o.tur === 'video') { ypGit('videos'); return setTimeout(() => window.ysVdDuzenle && window.ysVdDuzenle(o.id), 700); }
    if (o.tur === 'calisma') return ypDuzenle('set', o.id);
    if (o.tur === 'not') return ypDuzenle('ozet', o.id);
    if (o.tur === 'soru') return ypDuzenle('pq', o.id);
    if (o.tur === 'kelime') { ypGit('content'); return setTimeout(() => { const cw = gl('cwState'); if (cw) { cw.q = o.ru; cw.page = 1; } if (typeof renderCwList === 'function') renderCwList(); }, 900); }
  };
  window.icmKonuCikar = async (uid, si, kod) => {
    const u = agU(uid); if (!u) return;
    if (await mfYaz(u, mfKonuYaz(u.kaynak, si, u.p.sections[si].konular.filter(k => k !== kod)))) { toast('Konu dersten çıkarıldı.'); if (typeof ekKullanimYukle === 'function') ekKullanimYukle(); }
    agacCiz();
  };
  window.icmKonuEkle = async (uid, si) => {
    const u = agU(uid); if (!u) return;
    const T = (gl('EKA') || {}).topics || [], mevcut = new Set(u.p.sections[si].konular);
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'icm-konu-m';
    SK['icm-konu-sk'] = null;
    ov.innerHTML = '<div class="ui-modal ys-modal" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('etiket', 20) + '</span><h3>Derse konu ekle</h3><button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'icm-konu-m\').remove()">' + ic('kapat', 17) + '</button></div>' +
      '<label class="ys-alan"><span>Var olan konu</span>' + secimKutusu('icm-konu-sk', 'Konu adı ya da kodu ara…', T.filter(t => !mevcut.has(t.kod)).map(t => ({ id: t.kod, ad: t.ad, alt: t.kod + (t.seviye ? ' · ' + t.seviye : '') }))) + '</label>' +
      '<label class="ys-alan"><span>ya da yeni konu oluştur</span><input id="icm-konu-yeni" class="ys-girdi" placeholder="Yeni konu adı (ör. İsimlerde çoğul)" autocomplete="off"></label>' +
      '<div class="ys-modal-alt"><button type="button" class="yp-btn" onclick="document.getElementById(\'icm-konu-m\').remove()">Vazgeç</button><button type="button" class="yp-btn ana" onclick="icmKonuEkleKaydet(' + uid + ', ' + si + ')">' + ic('arti', 16) + 'Ekle</button></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };
  window.icmKonuEkleKaydet = async (uid, si) => {
    const u = agU(uid); if (!u) return;
    const yeni = ($('icm-konu-yeni').value || '').trim(); let kod = SK['icm-konu-sk'] && SK['icm-konu-sk'].secili;
    if (yeni) kod = await mfKonuOlustur(yeni, u.seviye);
    if (!kod) { uiAlert('Bir konu seç ya da yeni konu adı yaz.'); return; }
    if (await mfYaz(u, mfKonuYaz(u.kaynak, si, u.p.sections[si].konular.concat(kod)))) { toast('Konu derse atandı.'); const m = $('icm-konu-m'); if (m) m.remove(); if (typeof ekKullanimYukle === 'function') ekKullanimYukle(); }
    agacCiz();
  };
  // Ağaç menüleri: eski müfredat eylemleri (mfEylem) aynen kullanılır
  const mfCagir = async (a, veri) => { const b = document.createElement('button'); b.dataset.mf = a; Object.keys(veri || {}).forEach(k => b.dataset[k] = veri[k]); if (typeof mfEylem === 'function') await mfEylem({ target: b }); agacCiz(); };
  window.icmMf = (a, u, s, m) => mfCagir(a, Object.assign({}, u != null ? { u: String(u) } : {}, s != null ? { s: String(s) } : {}, m != null ? { m: String(m) } : {}));
  MENULER.agm = m => [{ ic: 'kalem', ad: 'Modülün adını değiştir', fn: "icmMf('madi', null, null, " + m + ")" }, { ic: 'arti', ad: 'Ünite ekle', fn: "icmMf('uyeni', null, null, " + m + ")" }];
  MENULER.agu = id => {
    const u = agU(id); if (!u) return [];
    return [{ ic: 'kalem', ad: 'E-kitap düzenleyicisinde aç', fn: "icmEdAc(" + id + ")" }, { ic: 'goz', ad: 'Öğrenci önizleme', fn: "icmOnizle(" + id + ")" }, { ayrac: 1 },
      { ic: 'kalem', ad: 'Ünitenin adını değiştir', fn: "icmMf('uadi', " + id + ")" }, { ic: 'grafik', ad: 'Seviyeyi değiştir', fn: "icmMf('sev', " + id + ")" }, { ic: 'arti', ad: 'Ders ekle', fn: "icmMf('dyeni', " + id + ")" },
      { ayrac: 1 }, { ic: u.yayinda ? 'kilit' : 'onay', ad: u.yayinda ? 'Yayından kaldır' : 'Yayınla', fn: "icmUniteYayin(" + id + ", " + !u.yayinda + ")" }];
  };
  MENULER.agb = k => {
    const [id, si] = k.split(':'), u = agU(id); if (!u) return []; const s = u.p.sections[+si]; if (!s) return [];
    const L = [{ ic: 'kalem', ad: 'Tam ekran düzenleyicide aç', fn: "icmEdAc(" + id + ", " + si + ")" }, { ic: 'kalem', ad: 'Adını değiştir', fn: "icmMf('dadi', " + id + ", " + si + ")" }, { ic: 'etiket', ad: 'Konu ekle', fn: "icmKonuEkle(" + id + ", " + si + ")" }];
    if (!s.blocks.length) L.push({ ayrac: 1 }, { ic: 'cop', ad: 'Dersi sil', fn: "icmMf('dsil', " + id + ", " + si + ")", tehlike: 1 });
    return L;
  };
  window.icmUniteYayin = async (id, yayinda) => {
    try { const { error } = await sb.from('ek_units').update({ yayinda }).eq('id', id); if (error) throw error; const u = agU(id); if (u) u.yayinda = yayinda; toast(yayinda ? 'Ünite yayınlandı.' : 'Ünite yayından kaldırıldı.'); const E = gl('EK'); if (E) E.loaded = false; }
    catch (e) { uiAlert('Güncellenemedi.'); }
    if (icS().tab === 'agac') agacCiz(); else ekListeCiz();
  };

  /* ---------- Blok düzenleyici (e-kitap metnini bloklara ayırıp düzenler) ---------- */
  const BL_CTX = {}, BL_ACIK = {};
  const BLOK_AD = { h2: ['Başlık', 'paragraf'], h3: ['Alt başlık', 'paragraf'], p: ['Metin', 'not'], ul: ['Madde listesi', 'liste'], ol: ['Numaralı liste', 'liste'], table: ['Tablo', 'grafik'], img: ['Görsel', 'resim'],
    kutular: ['Cinsiyet kutuları', 'kart'], kelimeler: ['Kelime listesi', 'kelime'], ornek: ['Örnek kutusu', 'ses'], act: ['Etkinlik', 'onay'], kartlar: ['Çalışma kartları', 'kart'], pagebreak: ['Sayfa sonu', 'surgu'] };
  const KUTU_AD = { 'altın': 'Kural kutusu (altın kural)', dikkat: 'Dikkat kutusu', istisna: 'İstisna kutusu', ipucu: 'İpucu kutusu', bilgi: 'Bilgi kutusu', sonraki: 'Sonraki ders kutusu', 'bu-derste': '"Bu derste" kutusu' };
  const blokAd = b => b.t === 'kutu' ? (KUTU_AD[b.tur] || 'Kutu') : b.t === 'act' ? 'Etkinlik · ' + ((gl('EK_TIPLER') || {})[b.tip] || b.tip) : (BLOK_AD[b.t] || [b.t])[0];
  const blokIkon = b => b.t === 'kutu' ? 'yildiz' : (BLOK_AD[b.t] || [0, 'nokta'])[1];
  function blokSablon(t, konu) {
    const K = konu ? 'konu: ' + konu + '\n' : 'konu: \n';
    const S = {
      h2: '## 1.1 Yeni başlık', h3: '### Alt başlık', p: 'Yeni paragraf. Rusça sözcükler kelime paneline kendiliğinden bağlanır; çekimli bir sözcüğü sözlük biçimine bağlamak için {=дом:дома} yaz.',
      ul: '- Birinci madde\n- İkinci madde', ol: '1. Birinci madde\n2. İkinci madde', table: '| Eril | Dişil | Nötr |\n|---|---|---|\n| {м:дом} | {ж:книга} | {с:окно} |',
      'altın': ':::altın Altın kural\nKuralı buraya yaz.\n:::', dikkat: ':::dikkat Dikkat\nDikkat edilmesi gereken noktayı yaz.\n:::', istisna: ':::istisna İstisna\nİstisnayı yaz.\n:::',
      ipucu: ':::ipucu İpucu\nİpucunu yaz.\n:::', bilgi: ':::bilgi Bilgi\nBilgiyi yaz.\n:::', 'bu-derste': ':::bu-derste Bu derste\n- Öğrenilecek ilk konu\n- İkinci konu\n:::', sonraki: ':::sonraki Bir sonraki derste\nSonraki dersin konusu.\n:::',
      ornek: ':::örnek\nЭто мой дом. = Bu benim evim.\nЭто книга. = Bu bir kitap.\n:::', kelimeler: ':::kelimeler\n | дом | ev\n | книга | kitap\n:::',
      kutular: ':::kutular\n[м] Eril | ünsüzle biter | дом:ev\n[ж] Dişil | -а, -я ile biter | книга:kitap\n[с] Nötr | -о, -е ile biter | окно:pencere\n:::',
      kartlar: ':::kartlar\nön: Rusça ifade ya da soru\narka: Cevap\n---\nön: İkinci kart\narka: Cevap\n:::', pagebreak: '---sayfa---',
      bosluk: ':::etkinlik bosluk\nyönerge: Boşlukları doldurun.\n' + K + '---\n1. Это {{мой}} дом.\n2. Это {{моя}} книга.\n:::',
      coktan: ':::etkinlik coktan\nyönerge: Doğru seçeneği işaretleyin.\n' + K + '---\n1. «стол» kelimesinin cinsiyeti nedir?\n[x] Eril\n[ ] Dişil\n[ ] Nötr\n:::',
      'dogru-yanlis': ':::etkinlik dogru-yanlis\nyönerge: Cümleler doğru mu, yanlış mı?\n' + K + '---\n1. «книга» dişildir. => D\n2. «окно» erildir. => Y\n:::',
      ceviri: ':::etkinlik ceviri\nyönerge: Cümleleri Rusçaya çevirin.\n' + K + '---\n1. Bu benim evim. => Это мой дом.\n:::',
      serbest: ':::etkinlik serbest\nyönerge: Soruyu cevaplayın.\n' + K + '---\n1. Soru metni\nörnek-cevap: Örnek cevap\n:::'
    };
    if (S[t]) return S[t];
    return ':::etkinlik ' + t + '\nyönerge: Yönergeyi yaz.\n' + K + '---\n1. Birinci madde => cevap\n:::';
  }
  function blokAraliklari(p, si, L) {
    const sec = p.sections[si]; if (!sec) return { st: 0, en: 0, list: [] };
    const st = sec.ln || 0; let en = L.length;
    for (let k = si + 1; k < p.sections.length; k++) if (p.sections[k].ln) { en = p.sections[k].ln - 1; break; }
    const bl = sec.blocks.map((b, bi) => ({ b, bi })).filter(x => x.b.ln);
    const list = bl.map((x, k) => {
      let e = k + 1 < bl.length ? bl[k + 1].b.ln - 1 : en;
      while (e > x.b.ln && (!L[e - 1].trim() || /^@/.test(L[e - 1].trim()))) e--;
      return { b: x.b, bi: x.bi, st: x.b.ln, en: e };
    });
    // Bölümün içeriğe ekleme noktası: başlık ve hemen ardından gelen @ satırlarından sonra (1 tabanlı satır no)
    let bas = st, j = st;
    while (j < en && L[j] !== undefined && (!L[j].trim() || /^@/.test(L[j].trim()))) { if (/^@/.test(L[j].trim())) bas = j + 1; j++; }
    return { st, en, bas, list };
  }
  const ekKapsam = k => { const S = gl('EK_SCOPE'); if (S && !S[k]) S[k] = []; return k; };
  function blokOnizEl(sec, kapsam) {
    const out = {}; try {
      const secs = ekBuildSections({ sections: [sec] }, ekKapsam(kapsam));
      (secs[0] ? secs[0].els : []).forEach(x => { if (x.el && x.el.dataset.bid) { const bi = +x.el.dataset.bid.split('-')[1]; if (!isNaN(bi)) out[bi] = x.el; } });
    } catch (e) { console.error(e); }
    return out;
  }
  function blokOzet(b) {
    if (b.t === 'pagebreak') return '<div class="icm-bk-ozet sayfa">— elle sayfa sonu —</div>';
    if (b.t === 'kartlar') return '<div class="icm-bk-kartlar">' + b.cards.map(c => '<div><b>' + esc(String(c.on || '').replace(/\{\{|\}\}/g, '')) + '</b><span>' + esc(String(c.arka || '').replace(/\{\{|\}\}/g, '')) + '</span></div>').join('') + '</div>';
    return '<div class="icm-bk-ozet">(önizleme yok)</div>';
  }
  function blokListeBagla(kokId, ctx) { BL_CTX[kokId] = ctx; blokCiz(kokId); }
  function blokCiz(kokId) {
    const k = $(kokId), ctx = BL_CTX[kokId]; if (!k || !ctx) return;
    const p = ctx.p(), src = ctx.src() || '', L = src.replace(/\r/g, '').split('\n');
    const sec = p && p.sections[ctx.si];
    if (!sec) { k.innerHTML = '<div class="yp-bos kucuk"><span>Bölüm bulunamadı.</span></div>'; return; }
    const R = blokAraliklari(p, ctx.si, L), on = blokOnizEl(sec, ctx.kapsam), acik = BL_ACIK[kokId];
    let h = '<div class="icm-bloklar' + (ctx.kompakt ? ' kompakt' : '') + '">';
    if (!R.list.length) h += '<div class="yp-bos kucuk"><span>Bu bölümde henüz blok yok.</span></div>';
    R.list.forEach((x, n) => {
      const ac = acik && acik.bi === x.bi;
      h += '<div class="icm-blok' + (ac ? ' acik' : '') + (x.b.t === 'act' && x.b.kontrol ? ' kontrol' : '') + '" data-bi="' + x.bi + '"><div class="icm-blok-bas"><span class="icm-blok-tut" draggable="true" title="Sürükleyerek taşı" aria-label="Sürükleyerek taşı">' + GI.tut + '</span><span class="icm-blok-no">' + (n + 1) + '</span><span class="icm-blok-tur">' + ic(blokIkon(x.b), 15) + esc(blokAd(x.b)) + '</span>' +
        '<span class="icm-blok-k">' + (x.b.t === 'act' && x.b.kontrol ? '<span class="yp-durum d-turuncu">Kontrol edilecek</span>' : '') + '<small class="ys-soluk">satır ' + x.st + (x.en > x.st ? '–' + x.en : '') + '</small></span>' +
        '<button type="button" class="yp-ikon-b" title="Düzenle" aria-label="Düzenle" onclick="icmBlok(\'' + kokId + '\', \'duzen\', ' + x.bi + ')">' + ic('kalem', 15) + '</button>' + menuB('blok', kokId + '|' + x.bi) + '</div>';
      if (ac) {
        const metin = L.slice(x.st - 1, x.en).join('\n');
        const mod = acik.mod || GD.mod || 'gorsel';
        h += '<div class="icm-blok-duz"><div class="icm-gd-ust"><div class="ys-mini-sekme icm-gd-sek"><button type="button" data-m="gorsel" class="' + (mod === 'gorsel' ? 'aktif' : '') + '" onclick="icmBlokMod(\'' + kokId + '\', \'gorsel\')">' + ic('kalem', 14) + 'Görsel</button><button type="button" data-m="kaynak" class="' + (mod === 'kaynak' ? 'aktif' : '') + '" onclick="icmBlokMod(\'' + kokId + '\', \'kaynak\')">' + ic('kod', 14) + 'Kaynak</button></div><small class="ys-soluk">Değişiklikler aşağıdaki önizlemede anında görünür.</small></div>' +
          '<div class="icm-gd" id="' + kokId + '-gd"' + (mod === 'gorsel' ? '' : ' style="display:none"') + '></div>' +
          '<textarea id="' + kokId + '-ta" class="ys-girdi alan kod" rows="' + Math.min(18, Math.max(3, metin.split('\n').length + 1)) + '" spellcheck="false" oninput="icmBlokCanli(\'' + kokId + '\')"' + (mod === 'gorsel' ? ' style="display:none"' : '') + '>' + esc(metin) + '</textarea>' +
          '<div class="icm-blok-ipucu" id="' + kokId + '-ip"' + (mod === 'gorsel' ? ' style="display:none"' : '') + '>' + blokIpucu(x.b) + '</div><div class="icm-canli-bas">Önizleme</div><div class="ek-adm-preview icm-blok-canli" id="' + kokId + '-canli"></div>' +
          '<div class="ys-form-alt"><button type="button" class="yp-btn ana kucuk" onclick="icmBlok(\'' + kokId + '\', \'uygula\', ' + x.bi + ')">' + ic('onay', 15) + 'Uygula</button><button type="button" class="yp-btn kucuk" onclick="icmBlok(\'' + kokId + '\', \'kapat\')">Vazgeç</button></div></div>';
      } else {
        h += on[x.bi] ? '<div class="icm-blok-on ek-adm-preview" data-bi="' + x.bi + '"></div>' : '<div class="icm-blok-on ek-adm-preview">' + blokOzet(x.b) + '</div>';
      }
      h += '</div>';
      h += '<div class="icm-araya"><button type="button" onclick="ysMenuAc(event, \'blokekle\', \'' + kokId + '|' + x.bi + '\')" aria-label="Buraya blok ekle" title="Buraya blok ekle">' + ic('arti', 13) + '</button></div>';
    });
    h += '<button type="button" class="icm-blok-ekle" onclick="ysMenuAc(event, \'blokekle\', \'' + kokId + '|son\')">' + ic('arti', 16) + 'Blok ekle</button>' +
      '<input type="file" id="' + kokId + '-gorsel" accept="image/*" style="display:none" onchange="icmBlokGorsel(\'' + kokId + '\', this)"></div>';
    k.innerHTML = h;
    k.querySelectorAll('.icm-blok-on[data-bi]').forEach(d => { const el = on[+d.dataset.bi]; if (el) d.appendChild(el); });
    blokSurukleBagla(kokId);
    if (acik) {
      const gd = $(kokId + '-gd'); if (gd) delete gd.dataset.bagli;
      const mod = acik.mod || GD.mod || 'gorsel'; if (mod === 'gorsel') gdKur(kokId);
      icmBlokCanli(kokId);
      const ta = $(kokId + '-ta');
      if (ta && acik.odak) { acik.odak = false; const od = mod === 'gorsel' ? (gd && gd.querySelector('.icm-rz, input')) : ta; if (od) od.focus(); ta.closest('.icm-blok').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  }
  function blokIpucu(b) {
    const ip = {
      h2: '<b>## 1.1 Başlık</b> — numara isteğe bağlı; "kural: 1.1" ile etkinlikler bu başlığa bağlanır.', h3: '<b>### Alt başlık</b>', p: 'Düz metin. <b>**kalın**</b>, <b>*eğik*</b>, <b>==vurgu==</b>, cinsiyet rengi <b>{м:дом}</b>, sözlük biçimine bağlama <b>{=дом:дома}</b>.',
      table: 'Satırlar <b>| hücre | hücre |</b> biçiminde; ikinci satırdaki <b>|---|</b> başlık ayırıcıdır.', img: '<b>![açıklama](dosya-adı)</b>', ornek: 'Her satır: <b>Rusça = Türkçe</b>', kelimeler: 'Her satır: <b>simge | Rusça | Türkçe</b> (simge boş olabilir)',
      kutular: 'Her satır: <b>[м|ж|с|мн] Başlık | açıklama | örnek:anlam</b>', kartlar: 'Her kart: <b>ön:</b> ve <b>arka:</b> satırları; kartları <b>---</b> ile ayır. İsteğe bağlı <b>konu:</b>',
      pagebreak: 'Bu satır sayfayı burada böler.', act: 'Başlık alanları (<b>yönerge:</b>, <b>konu:</b>, <b>kural:</b>, <b>kontrol-et: evet</b>), sonra <b>---</b> ve numaralı maddeler. Cevap: <b>{{boşluk}}</b>, <b>=> cevap</b>, seçenekler <b>[x]</b> / <b>[ ]</b>, doğru-yanlış <b>=> D / Y</b>.',
      kutu: 'İlk satır <b>:::tür Başlık</b>, son satır <b>:::</b>'
    };
    return ip[b.t] || '';
  }
  window.icmBlokCanli = kokId => {
    const ta = $(kokId + '-ta'), c = $(kokId + '-canli'); if (!ta || !c) return;
    const p = ekParse('@modül 1 | x\n@ünite 1 | x\n# Ders 1 | x\n' + ta.value);
    const sec = p.sections.find(s => s.tur === 'ders') || p.sections[0];
    c.innerHTML = '';
    const hata = p.errors.filter(e => e.ln > 3);
    if (sec) { const on = blokOnizEl(sec, 'icm3'); sec.blocks.forEach((b, bi) => { if (on[bi]) c.appendChild(on[bi]); else c.insertAdjacentHTML('beforeend', blokOzet(b)); }); }
    if (hata.length) c.insertAdjacentHTML('afterbegin', '<div class="icm-blok-hata">' + hata.map(e => esc(e.msg)).join('<br>') + '</div>');
  };
  async function blokYaz(kokId, yeni, mesaj) {
    const ctx = BL_CTX[kokId]; if (!ctx) return false;
    const eski = ekParse(ctx.src() || '', { set: !!ctx.set }), p2 = ekParse(yeni, { set: !!ctx.set });
    if (p2.errors.length > eski.errors.length && !ctx.kompakt) {
      if (!(await uiConfirm('Bu değişiklik metinde yeni bir hata oluşturuyor:\n' + p2.errors.slice(0, 3).map(e => 'Satır ' + e.ln + ': ' + e.msg).join('\n') + '\n\nYine de uygulansın mı?', 'Metin hatası', { confirmText: 'Uygula' }))) return false;
    }
    const ok = await ctx.yaz(yeni); if (ok === false) return false;
    if (mesaj) toast(mesaj);
    if (ctx.sonra) ctx.sonra(); else blokCiz(kokId);
    return true;
  }
  window.icmBlok = async (kokId, is, bi, ek) => {
    const ctx = BL_CTX[kokId]; if (!ctx) return;
    const src = ctx.src() || '', L = src.replace(/\r/g, '').split('\n'), p = ctx.p(), R = blokAraliklari(p, ctx.si, L);
    const k = R.list.findIndex(x => x.bi === bi), x = R.list[k];
    if (is === 'duzen') { BL_ACIK[kokId] = { bi, odak: true }; return blokCiz(kokId); }
    if (is === 'kapat') { delete BL_ACIK[kokId]; return blokCiz(kokId); }
    if (!x && is !== 'ekle') return;
    if (is === 'uygula') {
      const ta = $(kokId + '-ta'); if (!ta) return;
      const yeni = L.slice(0, x.st - 1).concat(ta.value.replace(/\r/g, '').replace(/\n+$/, '').split('\n'), L.slice(x.en)).join('\n');
      if (await blokYaz(kokId, yeni, 'Blok güncellendi.')) delete BL_ACIK[kokId];
      return;
    }
    if (is === 'yukari' || is === 'asagi') {
      const y = R.list[k + (is === 'yukari' ? -1 : 1)]; if (!y) return;
      const [a, b] = is === 'yukari' ? [y, x] : [x, y];
      const ta = L.slice(a.st - 1, a.en), tb = L.slice(b.st - 1, b.en), ara = L.slice(a.en, b.st - 1);
      const yeni = L.slice(0, a.st - 1).concat(tb, ara, ta, L.slice(b.en)).join('\n');
      delete BL_ACIK[kokId]; return blokYaz(kokId, yeni);
    }
    if (is === 'tasi') {
      const y = R.list.find(z => z.bi === ek.hedef); if (!y || y === x) return;
      const parca = L.slice(x.st - 1, x.en), n = x.en - x.st + 1, L2 = L.slice();
      L2.splice(x.st - 1, n);
      if (L2[x.st - 2] !== undefined && !L2[x.st - 2].trim() && L2[x.st - 1] !== undefined && !L2[x.st - 1].trim()) L2.splice(x.st - 2, 1);
      const silinen = L.length - L2.length;
      let yer = ek.once ? y.st - 1 : y.en; if (yer > x.st - 1) yer -= silinen;
      L2.splice(yer, 0, ...(ek.once ? parca.concat(['']) : [''].concat(parca)));
      delete BL_ACIK[kokId]; return blokYaz(kokId, L2.join('\n'), 'Blok taşındı.');
    }
    if (is === 'kopyala') { const t = L.slice(x.st - 1, x.en); const yeni = L.slice(0, x.en).concat([''], t, L.slice(x.en)).join('\n'); return blokYaz(kokId, yeni, 'Blok kopyalandı.'); }
    if (is === 'sil') {
      if (!(await uiConfirm('"' + blokAd(x.b) + '" bloğu silinsin mi?', 'Bloğu sil', { danger: true }))) return;
      const L2 = L.slice(); L2.splice(x.st - 1, x.en - x.st + 1);
      if (L2[x.st - 2] !== undefined && !L2[x.st - 2].trim() && (L2[x.st - 1] === undefined || !L2[x.st - 1].trim())) L2.splice(x.st - 2, 1);
      delete BL_ACIK[kokId]; return blokYaz(kokId, L2.join('\n'), 'Blok silindi.');
    }
    if (is === 'ekle') {
      const metin = ek; if (!metin) return;
      const yer = bi === 'son' ? (R.list.length ? R.list[R.list.length - 1].en : R.bas) : (x ? x.en : R.bas);
      const satirlar = metin.split('\n'), L2 = L.slice();
      const once = yer > 0 && L2[yer - 1] !== undefined && L2[yer - 1].trim() ? [''] : [];
      const sonra = L2[yer] !== undefined && L2[yer].trim() ? [''] : [];
      L2.splice(yer, 0, ...once, ...satirlar, ...sonra);
      const yeni = L2.join('\n');
      const ok = await blokYaz(kokId, yeni, 'Blok eklendi.');
      if (ok) {   // yeni bloğu düzenlemeye aç
        const p2 = ctx.p(), R2 = blokAraliklari(p2, ctx.si, (ctx.src() || '').split('\n'));
        const hedef = R2.list.find(z => z.st === yer + once.length + 1);
        if (hedef) { BL_ACIK[kokId] = { bi: hedef.bi, odak: true }; blokCiz(kokId); }
      }
    }
  };
  MENULER.blok = anahtar => {
    const [kok, bi] = anahtar.split('|');
    return [{ ic: 'kalem', ad: 'Düzenle', fn: "icmBlok('" + kok + "', 'duzen', " + bi + ")" }, { ic: 'yukari', ad: 'Yukarı taşı', fn: "icmBlok('" + kok + "', 'yukari', " + bi + ")" }, { ic: 'asagi', ad: 'Aşağı taşı', fn: "icmBlok('" + kok + "', 'asagi', " + bi + ")" },
      { ic: 'kopya', ad: 'Kopyala', fn: "icmBlok('" + kok + "', 'kopyala', " + bi + ")" }, { ic: 'arti', ad: 'Altına blok ekle…', fn: "setTimeout(() => icmBlokEkleMenu('" + kok + "', " + bi + "), 10)" }, { ayrac: 1 }, { ic: 'cop', ad: 'Sil', fn: "icmBlok('" + kok + "', 'sil', " + bi + ")", tehlike: 1 }];
  };
  window.icmBlokEkleMenu = (kok, bi) => { const b = document.querySelector('#' + kok + ' .icm-blok[data-bi="' + bi + '"] .ys-uc-nokta'); if (b) ysMenuAc({ currentTarget: b, stopPropagation() {}, preventDefault() {} }, 'blokekle', kok + '|' + bi); };
  MENULER.blokekle = anahtar => {
    const [kok, bi] = anahtar.split('|'), e = (t, ad, ikon) => ({ ic: ikon, ad, fn: "icmBlokEkle('" + kok + "', '" + bi + "', '" + t + "')" });
    return [{ baslik: 'Metin' }, e('h2', 'Başlık', 'paragraf'), e('h3', 'Alt başlık', 'paragraf'), e('p', 'Paragraf', 'not'), e('ul', 'Madde listesi', 'liste'), e('ol', 'Numaralı liste', 'liste'), e('table', 'Tablo', 'grafik'), e('img', 'Görsel', 'resim'),
      { baslik: 'Kutular' }, e('altın', 'Kural kutusu', 'yildiz'), e('dikkat', 'Dikkat', 'hata'), e('istisna', 'İstisna', 'bilgi'), e('ipucu', 'İpucu', 'ampul'), e('bilgi', 'Bilgi', 'bilgi'), e('bu-derste', 'Bu derste', 'hedef'), e('sonraki', 'Sonraki ders', 'okSag'),
      e('ornek', 'Örnek kutusu', 'ses'), e('kelimeler', 'Kelime listesi', 'kelime'), e('kutular', 'Cinsiyet kutuları', 'kart'),
      { baslik: 'Etkinlik' }, e('bosluk', 'Boşluk doldurma', 'onay'), e('coktan', 'Çoktan seçmeli', 'onay'), e('dogru-yanlis', 'Doğru / yanlış', 'onay'), e('ceviri', 'Çeviri', 'onay'), e('serbest', 'Serbest cevap', 'onay'), e('diger', 'Diğer etkinlik türü…', 'nokta3'),
      { baslik: 'Diğer' }, e('kartlar', 'Çalışma kartları', 'kart'), e('pagebreak', 'Sayfa sonu', 'surgu')];
  };
  window.icmBlokEkle = async (kok, bi, t) => {
    const ctx = BL_CTX[kok]; if (!ctx) return;
    const pos = bi === 'son' ? 'son' : +bi;
    if (t === 'img') { BL_CTX[kok]._gorselYer = pos; const f = $(kok + '-gorsel'); if (f) f.click(); return; }
    let tip = t;
    if (t === 'diger') {
      const T = gl('EK_TIPLER') || {};
      const secilen = await new Promise(coz => {
        const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'icm-tip-m';
        ov.innerHTML = '<div class="ui-modal ys-modal" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('onay', 20) + '</span><h3>Etkinlik türü</h3></div><select id="icm-tip-sec" class="ys-girdi">' + Object.keys(T).map(k2 => '<option value="' + k2 + '">' + esc(T[k2]) + '</option>').join('') + '</select>' +
          '<div class="ys-modal-alt"><button type="button" class="yp-btn" id="icm-tip-v">Vazgeç</button><button type="button" class="yp-btn ana" id="icm-tip-e">Ekle</button></div></div>';
        document.body.appendChild(ov);
        ov.querySelector('#icm-tip-v').onclick = () => { ov.remove(); coz(null); }; ov.querySelector('#icm-tip-e').onclick = () => { const v = ov.querySelector('#icm-tip-sec').value; ov.remove(); coz(v); };
      });
      if (!secilen) return; tip = secilen;
    }
    const sec = ctx.p() && ctx.p().sections[ctx.si];
    icmBlok(kok, 'ekle', pos, blokSablon(tip, sec && sec.konular[0]));
  };
  window.icmBlokGorsel = async (kok, inp) => {
    const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    if (f.size > 3 * 1024 * 1024) { uiAlert('Görsel en fazla 3 MB olabilir.'); return; }
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, ''), ad = Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
    try { const { error } = await sb.storage.from('docs').upload('ekitap/' + ad, f, { cacheControl: '31536000', upsert: false }); if (error) throw error; }
    catch (e) { uiAlert('Görsel yüklenemedi: ' + ((e && e.message) || e)); return; }
    const aciklama = String(await uiPrompt('Görsel açıklaması (isteğe bağlı):', { title: 'Görsel' }) || '').replace(/[\[\]]/g, '');
    icmBlok(kok, 'ekle', BL_CTX[kok]._gorselYer, '![' + aciklama + '](' + ad + ')');
  };

  /* ---------- Görsel blok düzenleyici: fareyle biçimlendirme (kalın, renk, boyut, cinsiyet…) ---------- */
  const SVG = d => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const GI = {
    geri: SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'), ileri: SVG('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    renk: SVG('<path d="M6 16L11 4h2l5 12"/><path d="M8 11.5h8"/>'), zemin: SVG('<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21h16"/>'),
    temizle: SVG('<path d="M5 5h11M10 5l-3 14"/><path d="M15 14l5 5M20 14l-5 5"/>'), tut: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    bosluk: SVG('<path d="M4 17h16"/><path d="M8 13V7M16 13V7"/>'), lemma: SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')
  };
  const GD_RENK = [['#0d1b2a', 'Lacivert'], ['#1a3a5c', 'Açık lacivert'], ['#cc0000', 'Kırmızı'], ['#c9a84c', 'Altın'], ['#1d6fd8', 'Mavi'], ['#1f8a4c', 'Yeşil'], ['#7a3fb0', 'Mor'], ['#d9730d', 'Turuncu'], ['#6b7280', 'Gri']];
  const GD_ZEMIN = [['#fff3b0', 'Sarı'], ['#ffe0cc', 'Turuncu'], ['#ffd6d6', 'Kırmızı'], ['#d8f3dc', 'Yeşil'], ['#dbeafe', 'Mavi'], ['#ede4ff', 'Mor'], ['#f5f0e8', 'Krem'], ['#e0d9ce', 'Gri']];
  const GD = { mod: 'gorsel' };
  const gdEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Kaynak sözdizimi → düzenlenebilir HTML
  function gdHtml(str) {
    const RE = new RegExp((gl('EK_INLINE') || /$^/).source, 'g');
    let h = '', son = 0, m; str = String(str || '');
    while ((m = RE.exec(str))) {
      h += gdEsc(str.slice(son, m.index)); son = RE.lastIndex;
      if (m[1] != null) h += '<span class="icm-chip" contenteditable="false" data-raw="' + gdEsc(m[0]) + '" title="Boşluk (cevap)">' + gdEsc(m[1]) + '</span>';
      else if (m[2]) h += '<span class="icm-g g-' + ({ 'м': 'm', 'ж': 'z', 'с': 'n', 'мн': 'c' }[m[2]]) + '" data-c="' + m[2] + '"' + (m[3] ? ' data-y="1"' : '') + (m[4] ? ' data-l="' + gdEsc(m[4]) + '"' : '') + '>' + gdEsc(m[5]) + '</span>';
      else if (m[6] != null) h += '<span class="icm-lem" data-lemma="' + gdEsc(m[6]) + '" title="Sözlük biçimi: ' + gdEsc(m[6]) + '">' + gdEsc(m[7]) + '</span>';
      else if (m[8] != null) h += '<span class="icm-chip" contenteditable="false" data-raw="' + gdEsc(m[0]) + '">' + gdEsc(m[8]) + '</span>';
      else if (m[9] != null) h += '<b>' + gdHtml(m[9]) + '</b>';
      else if (m[10] != null) h += '<mark>' + gdHtml(m[10]) + '</mark>';
      else if (m[11] != null) h += '<i>' + gdHtml(m[11]) + '</i>';
      else if (m[12] != null) h += '<u>' + gdHtml(m[12]) + '</u>';
      else if (m[13] != null) h += '<s>' + gdHtml(m[13]) + '</s>';
      else if (m[14] === 'renk') h += '<span style="color:' + gdEsc(m[15]) + '">' + gdHtml(m[16]) + '</span>';
      else if (m[14] === 'zemin') h += '<span style="background-color:' + gdEsc(m[15]) + '">' + gdHtml(m[16]) + '</span>';
      else if (m[14] === 'boyut') h += '<span class="icm-boy-' + gdEsc(m[15]) + '" data-boyut="' + gdEsc(m[15]) + '">' + gdHtml(m[16]) + '</span>';
      else h += gdEsc(m[0]);
    }
    return h + gdEsc(str.slice(son));
  }
  const gdHex = v => {
    v = String(v || '').trim(); if (!v || v === 'transparent' || v === 'inherit' || v === 'initial') return '';
    const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (m) { if (m[4] != null && +m[4] === 0) return ''; return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join(''); }
    return /^#[0-9a-f]{3,8}$/i.test(v) ? v.toLowerCase() : '';
  };
  const gdDerin = s => { let d = 0, mx = 0; for (const c of s) { if (c === '{') mx = Math.max(mx, ++d); else if (c === '}') d--; } return mx; };
  // Düzenlenebilir HTML → kaynak sözdizimi
  function gdKaynak(node, akt) {
    akt = akt || {};
    let s = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { s += n.nodeValue.replace(/\u00a0/g, ' ').replace(/[\r\n]+/g, ' '); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName, st = n.style || {};
      if (n.dataset.raw) { s += n.dataset.raw; return; }
      if (t === 'BR') { s += '\n'; return; }
      if (t === 'DIV' || t === 'P' || t === 'LI') { s += '\n' + gdKaynak(n, akt) + '\n'; return; }
      if (n.dataset.c) { const ic2 = n.textContent.replace(/[{}]/g, '').replace(/\s+/g, ' '); if (!ic2.trim()) { s += ic2; return; } s += sar(ic2, x => '{' + n.dataset.c + (n.dataset.y ? '*' : '') + (n.dataset.l ? '=' + n.dataset.l : '') + ':' + x + '}'); return; }
      if (n.dataset.lemma) { const ic2 = n.textContent.replace(/[{}]/g, '').replace(/\s+/g, ' '); if (!ic2.trim()) { s += ic2; return; } s += sar(ic2, x => '{=' + n.dataset.lemma + ':' + x + '}'); return; }
      // Biçimler (iç içe olabilir)
      const ka = [];
      const fw = st.fontWeight, kalin = t === 'B' || t === 'STRONG' || fw === 'bold' || +fw >= 600;
      if (kalin && !akt.b) ka.push('b');
      if ((t === 'I' || t === 'EM' || st.fontStyle === 'italic') && !akt.i) ka.push('i');
      const dek = (st.textDecorationLine || st.textDecoration || '');
      if ((t === 'U' || /underline/.test(dek)) && !akt.u) ka.push('u');
      if ((t === 'S' || t === 'STRIKE' || t === 'DEL' || /line-through/.test(dek)) && !akt.s) ka.push('s');
      const renk = gdHex(st.color || (t === 'FONT' ? n.getAttribute('color') : '')), zem = gdHex(st.backgroundColor);
      if (t === 'MARK' && !zem && !akt.m) ka.push('m');
      if (renk) ka.push('renk'); if (zem) ka.push('zemin');
      if (n.dataset.boyut && /^(kucuk|buyuk|cokbuyuk)$/.test(n.dataset.boyut)) ka.push('boyut');
      const akt2 = Object.assign({}, akt); ka.forEach(k => akt2[k] = 1);
      let ic2 = gdKaynak(n, akt2);
      for (let k = ka.length - 1; k >= 0; k--) {
        const tur = ka[k];
        if (!ic2.trim()) break;
        if (tur === 'b') ic2 = sar(ic2, x => '**' + (/^\*/.test(x) ? '\u200b' : '') + x + (/\*$/.test(x) ? '\u200b' : '') + '**');
        else if (tur === 'i') ic2 = sar(ic2, x => /^\*|\*$/.test(x) ? x : '*' + x + '*');
        else if (tur === 'u') ic2 = sar(ic2, x => /^_|_$/.test(x) ? x : '__' + x + '__');
        else if (tur === 's') ic2 = sar(ic2, x => /^~|~$/.test(x) ? x : '~~' + x + '~~');
        else if (tur === 'm') ic2 = sar(ic2, x => /^=|=$/.test(x) ? x : '==' + x + '==');
        else if (gdDerin(ic2) < 2 && !/\n/.test(ic2)) ic2 = sar(ic2, x => '{' + tur + '=' + (tur === 'renk' ? renk : tur === 'zemin' ? zem : n.dataset.boyut) + ':' + x + '}');
      }
      s += ic2;
    });
    return s;
    function sar(x, f) { const m = x.match(/^(\s*)([\s\S]*?)(\s*)$/); return m[2] ? m[1] + f(m[2]) + m[3] : x; }
  }
  // Alan değerini okur: tek satır / satırlar
  function gdSatirlar(el) {
    const out = []; let buf = null;
    el.childNodes.forEach(n => {
      if (n.nodeType === 1 && (n.tagName === 'DIV' || n.tagName === 'P' || n.tagName === 'LI' || n.tagName === 'UL' || n.tagName === 'OL')) { if (buf !== null && buf.trim()) out.push(buf); buf = null; out.push(...gdSatirlar(n)); return; }
      if (n.nodeType === 1 && n.tagName === 'BR') { out.push(buf === null ? '' : buf); buf = null; return; }
      const w = document.createElement('span'); w.appendChild(n.cloneNode(true)); buf = (buf || '') + gdKaynak(w);
    });
    if (buf !== null) out.push(buf);
    if (!out.length) out.push('');
    return out.reduce((a, x) => a.concat(String(x).split('\n')), []).map(x => x.replace(/[ \t\u00a0]+/g, ' ').trim());
  }
  // Ardışık düz satırları paragraf olarak birleştirir (liste satırları ayrı kalır)
  function gdParagraflar(L) {
    const out = []; let acik = false;
    L.forEach(x => { const s = x.trim(); if (!s) { acik = false; return; } const lis = /^(- |\d+\. )/.test(s); if (acik && !lis) out[out.length - 1] += ' ' + s; else out.push(s); acik = !lis; });
    return out;
  }
  function gdOku(el) {
    if (!el) return '';
    const L = gdSatirlar(el), mod = el.dataset.mod;
    if (mod === 'tek') return L.filter(Boolean).join(' ');
    if (mod === 'satir') { while (L.length && !L[0]) L.shift(); while (L.length && !L[L.length - 1]) L.pop(); return L.join('\n'); }
    // paragraf: dolu satırlar arasında boş satır; ardışık liste satırları bitişik kalır
    const D = L.filter(Boolean); let out = '';
    D.forEach((x, k) => { if (k) out += (/^(- |\d+\. )/.test(x) && /^(- |\d+\. )/.test(D[k - 1])) ? '\n' : '\n\n'; out += x; });
    return out;
  }
  const rz = (deger, mod, ek) => '<div class="icm-rz' + (mod === 'tek' ? ' tek' : '') + (ek && ek.cls ? ' ' + ek.cls : '') + '" contenteditable="true" spellcheck="false" data-mod="' + mod + '"' + (ek && ek.ad ? ' data-ad="' + ek.ad + '"' : '') + (ek && ek.ph ? ' data-ph="' + gdEsc(ek.ph) + '"' : '') + '>' +
    (mod === 'tek' ? gdHtml(deger) : String(deger || '').split(/\n/).filter((x, k, A) => mod === 'satir' || x.trim() || false).map(x => '<div>' + (gdHtml(x) || '<br>') + '</div>').join('') || '<div><br></div>') + '</div>';
  const gdInp = (ad, deger, ph, cls) => '<input class="ys-girdi' + (cls ? ' ' + cls : '') + '" data-ad="' + ad + '" value="' + gdEsc(deger) + '"' + (ph ? ' placeholder="' + gdEsc(ph) + '"' : '') + '>';
  // Metnin tek bir bloğa karşılık gelip gelmediğini ve türünü bulur
  function gdTur(metin) {
    const p = ekParse('@modül 1 | x\n@ünite 1 | x\n# Ders 1 | x\n' + metin), s = p.sections.find(x => x.tur === 'ders');
    if (!s || !s.blocks.length || p.errors.some(e => e.ln > 3)) return null;
    if (s.blocks.length > 1) return s.blocks.every(b => b.t === 'p') ? 'p' : null;
    const b = s.blocks[0], ilk = metin.trim().split('\n')[0].trim();
    if (b.t === 'kutu') return 'kutu';
    if (b.t === 'act') return 'act';
    if (b.t === 'p' && /^(\d+\.|[-•])\s/.test(ilk)) return null;
    return b.t;
  }
  const KUTU_TUR = [['altın', 'Kural (altın)'], ['dikkat', 'Dikkat'], ['istisna', 'İstisna'], ['ipucu', 'İpucu'], ['bilgi', 'Bilgi'], ['bu-derste', 'Bu derste'], ['sonraki', 'Sonraki ders']];
  const CINS = [['м', 'Eril (м)'], ['ж', 'Dişil (ж)'], ['с', 'Nötr (с)'], ['мн', 'Çoğul (мн)']];
  const satirSil = '<button type="button" class="yp-ikon-b icm-gs-sil" title="Satırı sil" aria-label="Satırı sil" onmousedown="event.preventDefault()" onclick="icmGdSatir(this, \'sil\')">' + ic('kapat', 14) + '</button>';
  const satirEkle = (ad, tur) => '<button type="button" class="yp-btn kucuk icm-gs-ekle" onclick="icmGdSatir(this, \'ekle\', \'' + tur + '\')">' + ic('arti', 14) + ad + '</button>';
  function gdSatir(tur, d) {
    d = d || {};
    if (tur === 'liste') return '<div class="icm-gs-satir" data-tur="liste"><span class="icm-gs-no"></span>' + rz(d.t || '', 'tek', { ad: 't', ph: 'Madde' }) + satirSil + '</div>';
    if (tur === 'ornek') return '<div class="icm-gs-satir iki" data-tur="ornek">' + rz(d.ru || '', 'tek', { ad: 'ru', ph: 'Rusça' }) + rz(d.tr || '', 'tek', { ad: 'tr', ph: 'Türkçe' }) + satirSil + '</div>';
    if (tur === 'kelime') return '<div class="icm-gs-satir kel" data-tur="kelime">' + gdInp('ic', d.ic || '', 'Simge', 'kisa') + rz(d.ru || '', 'tek', { ad: 'ru', ph: 'Rusça' }) + rz(d.tr || '', 'tek', { ad: 'tr', ph: 'Türkçe' }) + satirSil + '</div>';
    if (tur === 'cins') return '<div class="icm-gs-satir cins" data-tur="cins"><select class="ys-girdi kisa" data-ad="c">' + CINS.map(c => '<option value="' + c[0] + '"' + (d.c === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') + '</select>' + gdInp('baslik', d.baslik || '', 'Başlık') + gdInp('aciklama', d.aciklama || '', 'Açıklama') + gdInp('ornek', d.ornek || '', 'Örnekler: дом:ev | стол:masa') + satirSil + '</div>';
    if (tur === 'kart') return '<div class="icm-gs-satir kart" data-tur="kart"><div class="icm-gs-kart">' + rz(d.on || '', 'tek', { ad: 'on', ph: 'Ön yüz' }) + rz(d.arka || '', 'tek', { ad: 'arka', ph: 'Arka yüz' }) + gdInp('konu', d.konu || '', 'Konu (isteğe bağlı)') + '</div>' + satirSil + '</div>';
    return '';
  }
  // Blok metninden form
  function gdForm(tur, metin) {
    const L = metin.replace(/\r/g, '').split('\n'), ic1 = L.slice(1, -1);
    let h = '';
    if (tur === 'p') h = '<label class="ys-alan"><span>Metin <small class="ys-soluk">Enter yeni paragraf açar.</small></span>' + rz(gdParagraflar(L).join('\n'), 'paragraf', { ad: 'metin', cls: 'buyuk' }) + '</label>';
    else if (tur === 'h2') { const m = L[0].match(/^##\s+(?:(\d+(?:\.\d+)*)\s+)?(.*)$/) || []; h = '<div class="icm-gs-bas2">' + '<label class="ys-alan"><span>Numara</span>' + gdInp('no', m[1] || '', '1.1', 'kisa') + '</label><label class="ys-alan"><span>Başlık</span>' + rz(m[2] || '', 'tek', { ad: 'metin', cls: 'h2' }) + '</label></div>'; }
    else if (tur === 'h3') h = '<label class="ys-alan"><span>Alt başlık</span>' + rz(L[0].replace(/^###\s+/, ''), 'tek', { ad: 'metin', cls: 'h3' }) + '</label>';
    else if (tur === 'ul' || tur === 'ol') h = '<div class="icm-gs-liste ' + tur + '" data-liste="liste">' + L.filter(x => x.trim()).map(x => gdSatir('liste', { t: x.trim().replace(/^([-•]|\d+\.)\s+/, '') })).join('') + '</div>' + satirEkle('Madde ekle', 'liste');
    else if (tur === 'kutu') {
      const m = L[0].match(/^:::\s*(\S+)\s*(.*)$/) || [], kt = (m[1] || 'bilgi').toLowerCase().replace(/altin$/, 'altın');
      h = '<div class="icm-gs-bas2"><label class="ys-alan"><span>Kutu türü</span><select class="ys-girdi" data-ad="kt">' + KUTU_TUR.map(k => '<option value="' + k[0] + '"' + (k[0] === kt ? ' selected' : '') + '>' + k[1] + '</option>').join('') + (KUTU_TUR.some(k => k[0] === kt) ? '' : '<option selected value="' + gdEsc(kt) + '">' + gdEsc(kt) + '</option>') + '</select></label>' +
        '<label class="ys-alan"><span>Başlık</span>' + gdInp('baslik', m[2] || '', 'Kutu başlığı') + '</label></div><label class="ys-alan"><span>İçerik <small class="ys-soluk">Satır başına "- " yazarak madde listesi yapabilirsin.</small></span>' + rz(gdParagraflar(ic1).join('\n'), 'paragraf', { ad: 'govde', cls: 'buyuk' }) + '</label>';
    }
    else if (tur === 'ornek') h = '<div data-liste="ornek">' + ic1.filter(x => x.trim()).map(x => { const k = x.indexOf(' = '); return gdSatir('ornek', k > -1 ? { ru: x.slice(0, k).trim(), tr: x.slice(k + 3).trim() } : { ru: x.trim() }); }).join('') + '</div>' + satirEkle('Örnek ekle', 'ornek');
    else if (tur === 'kelimeler') h = '<div data-liste="kelime">' + ic1.filter(x => x.trim()).map(x => { const p = x.split('|').map(y => y.trim()); return gdSatir('kelime', { ic: p[0], ru: p[1], tr: p[2] }); }).join('') + '</div>' + satirEkle('Kelime ekle', 'kelime');
    else if (tur === 'kutular') h = '<div data-liste="cins">' + ic1.filter(x => x.trim()).map(x => { const q = x.trim().match(/^\[(мн|м|ж|с)\]\s*(.*)$/) || [0, 'м', x]; const p = q[2].split('|').map(y => y.trim()); return gdSatir('cins', { c: q[1], baslik: p[0], aciklama: p[1], ornek: p.slice(2).join(' | ') }); }).join('') + '</div>' + satirEkle('Kutu ekle', 'cins');
    else if (tur === 'kartlar') {
      const K = []; let c = null;
      ic1.forEach(x => { const s = x.trim(); let q; if (!s) return; if (s === '---') { if (c) K.push(c); c = null; return; }
        if ((q = s.match(/^[öo]n:\s*(.*)$/i))) { if (c && (c.on || c.arka)) K.push(c); c = { on: q[1], arka: '', konu: '' }; } else if ((q = s.match(/^arka:\s*(.*)$/i))) { c = c || { on: '', arka: '', konu: '' }; c.arka = q[1]; } else if ((q = s.match(/^konu:\s*(.*)$/i))) { c = c || { on: '', arka: '', konu: '' }; c.konu = q[1]; } else if (c) { if (c.arka) c.arka += ' ' + s; else c.on += ' ' + s; } });
      if (c) K.push(c);
      h = '<div data-liste="kart">' + K.map(k => gdSatir('kart', k)).join('') + '</div>' + satirEkle('Kart ekle', 'kart');
    }
    else if (tur === 'table') {
      const R = L.filter(x => x.trim().startsWith('|') && !/^\|[\s:|-]+\|?$/.test(x.trim())).map(x => x.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      const sut = Math.max(1, ...R.map(r => r.length));
      h = '<div class="icm-gs-tablo-arac"><button type="button" class="yp-btn kucuk" onclick="icmGdTablo(this, \'satir+\')">' + ic('arti', 14) + 'Satır</button><button type="button" class="yp-btn kucuk" onclick="icmGdTablo(this, \'sutun+\')">' + ic('arti', 14) + 'Sütun</button>' +
        '<button type="button" class="yp-btn kucuk" onclick="icmGdTablo(this, \'satir-\')">Son satırı sil</button><button type="button" class="yp-btn kucuk" onclick="icmGdTablo(this, \'sutun-\')">Son sütunu sil</button><small class="ys-soluk">İlk satır başlık satırıdır.</small></div>' +
        '<div class="icm-gs-tablo-k"><table class="icm-gs-tablo" data-ad="tablo">' + R.map((r, ri) => '<tr>' + Array.from({ length: sut }, (_, k) => '<td' + (ri ? '' : ' class="bas"') + '>' + rz(r[k] || '', 'tek', {}) + '</td>').join('') + '</tr>').join('') + '</table></div>';
    }
    else if (tur === 'img') {
      const m = L[0].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/) || [];
      h = '<div class="icm-gs-gorsel"><div class="icm-gs-gorsel-on" data-src="' + gdEsc(m[2] || '') + '">' + gdEsc(m[2] || '') + '</div><div><label class="ys-alan"><span>Açıklama (alt metin)</span>' + gdInp('alt', m[1] || '', 'Görseli anlatan kısa açıklama') + '</label>' +
        '<label class="yp-btn kucuk">' + ic('resim', 14) + 'Görseli değiştir<input type="file" accept="image/*" style="display:none" onchange="icmGdGorsel(this)"></label></div></div>';
    }
    else if (tur === 'act') {
      const m = L[0].match(/^:::\s*etkinlik\s+(\S+)/i) || [], T = gl('EK_TIPLER') || {}, tip = (m[1] || '').toLowerCase();
      const ay = ic1.findIndex(x => x.trim() === '---'), bas = ay > -1 ? ic1.slice(0, ay) : [], govde = ay > -1 ? ic1.slice(ay + 1) : ic1;
      const A = {}, diger = []; let metinMi = false;
      bas.forEach(x => { const q = x.trim().match(/^([a-zA-ZçğıöşüÇĞİÖŞÜ-]+):\s?(.*)$/); const k = q && q[1].toLowerCase();
        if (!metinMi && q && ['yönerge', 'konu', 'kural', 'kontrol-et'].includes(k) && A[k] == null) A[k] = q[2].trim(); else { if (k === 'metin') metinMi = true; diger.push(x); } });
      h = '<div class="icm-gs-bas2"><label class="ys-alan"><span>Etkinlik türü</span><select class="ys-girdi" data-ad="tip">' + Object.keys(T).map(k => '<option value="' + k + '"' + (k === tip ? ' selected' : '') + '>' + gdEsc(T[k]) + '</option>').join('') + '</select></label>' +
        '<label class="ys-alan"><span>Konu</span>' + gdInp('konu', A['konu'] || '', 'Virgülle ayır') + '</label><label class="ys-alan"><span>Kural no</span>' + gdInp('kural', A['kural'] || '', 'ör. 1.2', 'kisa') + '</label>' +
        '<label class="ys-anahtar kucuk icm-gs-kontrol"><input type="checkbox" data-ad="kontrol"' + (/^evet$/i.test(A['kontrol-et'] || '') ? ' checked' : '') + '><i></i><span>Kontrol edilecek</span></label></div>' +
        '<label class="ys-alan"><span>Yönerge</span>' + rz(A['yönerge'] || '', 'tek', { ad: 'yonerge' }) + '</label>' +
        (diger.length ? '<label class="ys-alan"><span>Diğer başlık satırları <small class="ys-soluk">(metin:, görev:, ek alanlar)</small></span><textarea class="ys-girdi alan kod" data-ad="diger" rows="' + Math.min(8, diger.length + 1) + '" spellcheck="false">' + gdEsc(diger.join('\n')) + '</textarea></label>' : '<input type="hidden" data-ad="diger" value="">') +
        '<label class="ys-alan"><span>Maddeler <small class="ys-soluk">Her madde "1. " ile başlar. Cevap: araç çubuğundaki boşluk düğmesi ya da "=> cevap"; seçenekler [x] / [ ].</small></span>' + rz(govde.join('\n'), 'satir', { ad: 'maddeler', cls: 'buyuk kodlu' }) + '</label>';
    }
    else if (tur === 'pagebreak') h = '<div class="ys-not">' + ic('bilgi', 18) + '<div><span>Bu blok sayfayı burada böler; düzenlenecek alanı yok.</span></div></div>';
    return h;
  }
  // Formdan blok metni
  function gdMetin(f, tur) {
    const q = a => f.querySelector('[data-ad="' + a + '"]'), v = a => { const e = q(a); return e ? (e.classList.contains('icm-rz') ? gdOku(e) : String(e.value || '').trim()) : ''; };
    const satirlar = ad => [...f.querySelectorAll('[data-liste="' + ad + '"] > .icm-gs-satir')].map(r => { const o = {}; r.querySelectorAll('[data-ad]').forEach(e => o[e.dataset.ad] = e.classList.contains('icm-rz') ? gdOku(e) : String(e.value || '').trim()); return o; });
    const tp = s => String(s || '').replace(/\|/g, '/');
    if (tur === 'p') return v('metin');
    if (tur === 'h2') return '## ' + (v('no') ? v('no').replace(/\s+/g, '') + ' ' : '') + v('metin');
    if (tur === 'h3') return '### ' + v('metin');
    if (tur === 'ul' || tur === 'ol') return satirlar('liste').filter(o => o.t).map((o, k) => (tur === 'ol' ? (k + 1) + '. ' : '- ') + o.t).join('\n');
    if (tur === 'kutu') return ':::' + (v('kt') || 'bilgi') + (v('baslik') ? ' ' + v('baslik') : '') + '\n' + v('govde').split('\n').map(x => x.trim() === ':::' ? '‌:::' : x).join('\n') + '\n:::';
    if (tur === 'ornek') return ':::örnek\n' + satirlar('ornek').filter(o => o.ru || o.tr).map(o => o.ru + (o.tr ? ' = ' + o.tr : '')).join('\n') + '\n:::';
    if (tur === 'kelimeler') return ':::kelimeler\n' + satirlar('kelime').filter(o => o.ru || o.tr).map(o => tp(o.ic) + ' | ' + tp(o.ru) + ' | ' + tp(o.tr)).join('\n') + '\n:::';
    if (tur === 'kutular') return ':::kutular\n' + satirlar('cins').filter(o => o.baslik || o.aciklama || o.ornek).map(o => '[' + o.c + '] ' + tp(o.baslik) + ' | ' + tp(o.aciklama) + (o.ornek ? ' | ' + o.ornek.split('|').map(x => x.trim()).filter(Boolean).join(' | ') : '')).join('\n') + '\n:::';
    if (tur === 'kartlar') return ':::kartlar\n' + satirlar('kart').filter(o => o.on || o.arka).map(o => 'ön: ' + o.on + '\narka: ' + o.arka + (o.konu ? '\nkonu: ' + o.konu : '')).join('\n---\n') + '\n:::';
    if (tur === 'table') {
      const R = [...f.querySelectorAll('.icm-gs-tablo tr')].map(tr => [...tr.querySelectorAll('td > .icm-rz')].map(e => tp(gdOku(e))));
      if (!R.length) return '';
      return R.map((r, k) => '| ' + r.join(' | ') + ' |' + (k ? '' : '\n|' + r.map(() => '---').join('|') + '|')).join('\n');
    }
    if (tur === 'img') { const o = f.querySelector('.icm-gs-gorsel-on'); return '![' + v('alt').replace(/[\[\]]/g, '') + '](' + ((o && o.dataset.src) || '') + ')'; }
    if (tur === 'act') {
      const k = q('kontrol'), dg = v('diger');
      return ':::etkinlik ' + v('tip') + '\nyönerge: ' + v('yonerge') + '\nkonu: ' + v('konu') + (v('kural') ? '\nkural: ' + v('kural') : '') + (k && k.checked ? '\nkontrol-et: evet' : '') + (dg ? '\n' + dg : '') + '\n---\n' + v('maddeler').split('\n').map(x => x.trim() === ':::' ? '‌:::' : x).join('\n') + '\n:::';
    }
    if (tur === 'pagebreak') return '---sayfa---';
    return '';
  }
  // Araç çubuğu
  function gdArac() {
    const d = (k, baslik, ic3, cls) => '<button type="button" class="icm-ga-b' + (cls ? ' ' + cls : '') + '" data-k="' + k + '" title="' + baslik + '" aria-label="' + baslik + '" onmousedown="event.preventDefault()">' + ic3 + '</button>';
    const ayr = '<span class="icm-ga-ayr"></span>';
    return '<div class="icm-ga" role="toolbar" aria-label="Biçimlendirme">' +
      d('geri', 'Geri al (Ctrl+Z)', GI.geri) + d('ileri', 'İleri al (Ctrl+Y)', GI.ileri) + ayr +
      d('kalin', 'Kalın (Ctrl+B)', '<b>K</b>', 'harf') + d('egik', 'Eğik (Ctrl+I)', '<i>E</i>', 'harf') + d('alti', 'Altı çizili (Ctrl+U)', '<u>A</u>', 'harf') + d('ustu', 'Üstü çizili', '<s>Ü</s>', 'harf') + d('vurgu', 'Vurgula', '<mark>V</mark>', 'harf') + ayr +
      '<span class="icm-ga-grup">' + d('renkM', 'Yazı rengi', GI.renk + '<i class="icm-ga-cizgi" id="icm-ga-renk-i"></i>') + '</span>' +
      '<span class="icm-ga-grup">' + d('zeminM', 'Zemin rengi', GI.zemin + '<i class="icm-ga-cizgi zem" id="icm-ga-zemin-i"></i>') + '</span>' +
      '<select class="icm-ga-sec" data-k="boyut" title="Yazı boyutu" aria-label="Yazı boyutu"><option value="">Boyut</option><option value="kucuk">Küçük</option><option value="normal">Normal</option><option value="buyuk">Büyük</option><option value="cokbuyuk">Çok büyük</option></select>' + ayr +
      d('g:м', 'Eril rengi (м)', 'м', 'harf g-m') + d('g:ж', 'Dişil rengi (ж)', 'ж', 'harf g-z') + d('g:с', 'Nötr rengi (с)', 'с', 'harf g-n') + d('g:мн', 'Çoğul rengi (мн)', 'мн', 'harf g-c') + ayr +
      d('lemma', 'Sözlük biçimine bağla', GI.lemma) + d('bosluk', 'Boşluk (cevap) yap', GI.bosluk) + d('temizle', 'Biçimi temizle', GI.temizle) +
      '</div>';
  }
  function gdPalet(tur) {
    const R = tur === 'renk' ? GD_RENK : GD_ZEMIN;
    return '<div class="icm-ga-palet" id="icm-ga-palet" data-tur="' + tur + '">' + R.map(r => '<button type="button" style="background:' + r[0] + '" title="' + r[1] + '" aria-label="' + r[1] + '" data-renk="' + r[0] + '" onmousedown="event.preventDefault()"></button>').join('') +
      '<label class="icm-ga-ozel" title="Özel renk"><input type="color" value="' + (tur === 'renk' ? '#0d1b2a' : '#fff3b0') + '"><span>Özel</span></label><button type="button" class="icm-ga-yok" data-renk="" onmousedown="event.preventDefault()">' + (tur === 'renk' ? 'Varsayılan' : 'Zeminsiz') + '</button></div>';
  }
  // Seçim yardımcıları
  const gdAlan = n => { while (n && n.nodeType !== 1) n = n.parentNode; return n && n.closest ? n.closest('.icm-rz') : null; };
  function gdSecim(kok) {
    const s = window.getSelection(); if (!s || !s.rangeCount) return null;
    const r = s.getRangeAt(0), a = gdAlan(r.commonAncestorContainer);
    return a && kok.contains(a) ? { s, r, a } : null;
  }
  function gdSar(kok, el) {
    const x = gdSecim(kok); if (!x || x.r.collapsed) { toast('Önce biçimlendirilecek metni seç.'); return false; }
    const fr = x.r.extractContents(); el.appendChild(fr); x.r.insertNode(el);
    const r2 = document.createRange(); r2.selectNodeContents(el); x.s.removeAllRanges(); x.s.addRange(r2);
    return true;
  }
  function gdCoz(kok, filtre) {
    const x = gdSecim(kok); if (!x || x.r.collapsed) { toast('Önce metni seç.'); return false; }
    // Seçimi kapsayan biçim öğelerinden de çık: seçimi en yakın satıra genişletmeden, seçili parçayı çıkarıp düzleştirir
    let ust = x.r.commonAncestorContainer; if (ust.nodeType === 3) ust = ust.parentNode;
    const kapsayan = [], zincir = [];
    while (ust && ust !== x.a) { zincir.push(ust); if (filtre(ust) && !/^(DIV|P|LI)$/.test(ust.tagName)) kapsayan.push(ust); ust = ust.parentNode; }
    let fr = x.r.extractContents();
    const duz = n => { [...n.childNodes].forEach(c => { if (c.nodeType === 1) { duz(c); if (!c.dataset.raw && c.tagName !== 'DIV' && c.tagName !== 'BR' && filtre(c)) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); } } }); };
    duz(fr);
    let bas = fr.firstChild, son = fr.lastChild;
    if (kapsayan.length) {
      // Kapsayan biçimi seçimin olduğu yerde böl
      const dis = kapsayan[kapsayan.length - 1];
      // Kaldırılmayan iç biçimler (ör. kalın) seçili parçada korunur
      zincir.slice(0, zincir.indexOf(dis)).filter(n => !filtre(n) && n.tagName !== 'DIV').forEach(n => { const k2 = n.cloneNode(false); k2.appendChild(fr); const f2 = document.createDocumentFragment(); f2.appendChild(k2); fr = f2; });
      bas = fr.firstChild; son = fr.lastChild;
      const r2 = document.createRange(); r2.setStart(x.r.startContainer, x.r.startOffset); r2.setEndAfter(dis);
      const sag = r2.extractContents();
      dis.parentNode.insertBefore(fr, dis.nextSibling);
      const yer = son ? son : dis; if (yer.parentNode) yer.parentNode.insertBefore(sag, yer.nextSibling);
    } else x.r.insertNode(fr);
    if (bas && son && bas.parentNode) { const r3 = document.createRange(); r3.setStartBefore(bas); r3.setEndAfter(son); x.s.removeAllRanges(); x.s.addRange(r3); }
    return true;
  }
  function gdKomut(kokId, k, deger) {
    const kok = $(kokId + '-gd'); if (!kok) return;
    if (k === 'geri' || k === 'ileri') { gdKaydetGecmis(kokId, true); return gdGecmis(kokId, k); }
    const x = gdSecim(kok);
    if (!x) { toast('Önce bir alana tıkla ve metni seç.'); return; }
    document.execCommand('styleWithCSS', false, false);
    if (k === 'kalin') document.execCommand('bold');
    else if (k === 'egik') document.execCommand('italic');
    else if (k === 'alti') document.execCommand('underline');
    else if (k === 'ustu') document.execCommand('strikeThrough');
    else if (k === 'vurgu') { if (x.r.collapsed) return toast('Önce metni seç.'); const n0 = x.r.startContainer.nodeType === 3 ? x.r.startContainer.parentNode : x.r.startContainer, mk = n0.closest && n0.closest('mark'); if (mk && x.a.contains(mk)) gdCoz(kok, n => n.tagName === 'MARK'); else gdSar(kok, document.createElement('mark')); }
    else if (k === 'renk' || k === 'zemin') {
      if (x.r.collapsed) return toast('Önce metni seç.');
      const ozellik = k === 'renk' ? 'color' : 'backgroundColor';
      gdCoz(kok, n => n.style && n.style[ozellik] && !n.dataset.c && !n.dataset.lemma);
      if (deger) { const sp = document.createElement('span'); sp.style[ozellik] = deger; gdSar(kok, sp); }
      const g = $('icm-ga-' + k + '-i'); if (g && deger) g.style.background = deger;
    }
    else if (k === 'boyut') { if (x.r.collapsed) return toast('Önce metni seç.'); gdCoz(kok, n => !!n.dataset.boyut); if (deger && deger !== 'normal') { const sp = document.createElement('span'); sp.dataset.boyut = deger; sp.className = 'icm-boy-' + deger; gdSar(kok, sp); } }
    else if (k.startsWith('g:')) { if (x.r.collapsed) return toast('Önce sözcüğü seç.'); gdCoz(kok, n => !!n.dataset.c); const c = k.slice(2); const sp = document.createElement('span'); sp.dataset.c = c; sp.className = 'icm-g g-' + ({ 'м': 'm', 'ж': 'z', 'с': 'n', 'мн': 'c' }[c]); gdSar(kok, sp); }
    else if (k === 'lemma') {
      if (x.r.collapsed) return toast('Önce çekimli sözcüğü seç.');
      const r = x.r.cloneRange(), sec = String(x.s).trim();
      uiPrompt('"' + sec + '" sözcüğünün sözlük biçimi (yalın hâl):', { title: 'Sözlük biçimine bağla', value: '' }).then(l => setTimeout(() => {
        l = String(l || '').replace(/[{}:]/g, '').trim(); if (!l) return;
        const s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r);
        gdCoz(kok, n => !!n.dataset.lemma); const sp = document.createElement('span'); sp.dataset.lemma = l; sp.className = 'icm-lem'; sp.title = 'Sözlük biçimi: ' + l; gdSar(kok, sp); gdDegisti(kokId);
      }, 40));
      return;
    }
    else if (k === 'bosluk') {
      if (x.r.collapsed) return toast('Önce cevap olacak sözcüğü seç.');
      const t = String(x.s).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim(); if (!t) return;
      x.r.deleteContents(); const sp = document.createElement('span'); sp.className = 'icm-chip'; sp.contentEditable = 'false'; sp.dataset.raw = '{{' + t + '}}'; sp.textContent = t; x.r.insertNode(sp);
      const r2 = document.createRange(); r2.setStartAfter(sp); r2.collapse(true); x.s.removeAllRanges(); x.s.addRange(r2);
    }
    else if (k === 'temizle') { if (x.r.collapsed) return toast('Önce metni seç.'); gdCoz(kok, n => !n.dataset.raw); }
    gdDegisti(kokId);
  }
  // Geçmiş: her değişiklik blok metni olarak saklanır
  function gdGecmis(kok, yon) {
    const G = GD.gecmis; if (!G) return;
    if (yon === 'geri') { if (G.i <= 0) return; G.i--; } else { if (G.i >= G.l.length - 1) return; G.i++; }
    const ta = $(kok + '-ta'); if (ta) ta.value = G.l[G.i];
    gdKur(kok, true); icmBlokCanli(kok);
  }
  function gdKaydetGecmis(kok, hemen) {
    const ta = $(kok + '-ta'); if (!ta || !GD.gecmis) return;
    clearTimeout(GD._gt);
    const yap = () => { const G = GD.gecmis; if (G.l[G.i] === ta.value) return; G.l = G.l.slice(0, G.i + 1); G.l.push(ta.value); if (G.l.length > 80) G.l.shift(); G.i = G.l.length - 1; };
    if (hemen) yap(); else GD._gt = setTimeout(yap, 450);
  }
  function gdDegisti(kok, yaziMi) {
    const f = $(kok + '-gd-f'), ta = $(kok + '-ta'); if (!f || !ta) return;
    ta.value = gdMetin(f, f.dataset.tur);
    f.querySelectorAll('[data-liste="liste"] .icm-gs-no').forEach((n, k) => n.textContent = f.querySelector('.icm-gs-liste.ol') ? (k + 1) + '.' : '•');
    gdKaydetGecmis(kok, !yaziMi);
    icmBlokCanli(kok);
  }
  // Görsel formu kurar (ya da kaynak kipine düşer)
  function gdKur(kok, gecmistenMi) {
    const k = $(kok + '-gd'), ta = $(kok + '-ta'); if (!k || !ta) return;
    const tur = gdTur(ta.value);
    if (!tur) { k.innerHTML = '<div class="ys-uyari">' + ic('bilgi', 18) + '<span>Bu blok görsel düzenleyicide açılamıyor (metinde hata var ya da birden fazla blok içeriyor). Kaynak görünümünde düzenleyebilirsin.</span></div>'; return; }
    if (!gecmistenMi) GD.gecmis = { l: [ta.value], i: 0 };
    k.innerHTML = (tur === 'pagebreak' || tur === 'img' ? '' : gdArac()) + '<div class="icm-gd-form" id="' + kok + '-gd-f" data-tur="' + tur + '">' + gdForm(tur, ta.value) + '</div>';
    const f = $(kok + '-gd-f');
    f.querySelectorAll('[data-liste="liste"] .icm-gs-no').forEach((n, i) => n.textContent = tur === 'ol' ? (i + 1) + '.' : '•');
    if (k.dataset.bagli) return;
    k.dataset.bagli = '1';
    k.addEventListener('input', e => { if (e.target.closest('.icm-ga')) return; gdDegisti(kok, true); });
    k.addEventListener('change', e => { if (e.target.closest('.icm-ga')) { const s = e.target; if (s.dataset.k === 'boyut' && s.value) { gdSecGeri(); gdKomut(kok, 'boyut', s.value); s.value = ''; } return; } gdDegisti(kok); });
    k.addEventListener('mousedown', e => { if (e.target.closest('.icm-ga-sec')) gdSecSakla(k); });
    k.addEventListener('click', e => {
      const b = e.target.closest('.icm-ga-b'); const pb = e.target.closest('#icm-ga-palet button');
      if (pb) { const tur2 = pb.parentNode.dataset.tur; gdPaletKapat(); gdSecGeri(); gdKomut(kok, tur2, pb.dataset.renk); return; }
      if (!b) { if (!e.target.closest('#icm-ga-palet')) gdPaletKapat(); return; }
      const kk = b.dataset.k;
      if (kk === 'renkM' || kk === 'zeminM') { gdSecSakla(k); const tur2 = kk === 'renkM' ? 'renk' : 'zemin'; const acik = $('icm-ga-palet'); gdPaletKapat(); if (acik && acik.dataset.tur === tur2) return; b.parentNode.insertAdjacentHTML('beforeend', gdPalet(tur2)); const inp = b.parentNode.querySelector('input[type=color]'); inp.addEventListener('change', () => { gdPaletKapat(); gdSecGeri(); gdKomut(kok, tur2, inp.value); }); return; }
      gdKomut(kok, kk);
    });
    k.addEventListener('keydown', e => {
      const a = e.target.closest && e.target.closest('.icm-rz'); if (!a) return;
      const m = e.ctrlKey || e.metaKey, t = e.key.toLowerCase();
      if (m && t === 'z' && !e.shiftKey) { e.preventDefault(); gdKaydetGecmis(kok, true); return gdGecmis(kok, 'geri'); }
      if (m && (t === 'y' || (t === 'z' && e.shiftKey))) { e.preventDefault(); return gdGecmis(kok, 'ileri'); }
      if (m && t === 'b') { e.preventDefault(); return gdKomut(kok, 'kalin'); }
      if (m && t === 'i') { e.preventDefault(); return gdKomut(kok, 'egik'); }
      if (m && t === 'u') { e.preventDefault(); return gdKomut(kok, 'alti'); }
      if (e.key === 'Enter' && a.dataset.mod === 'tek') { e.preventDefault(); const sat = a.closest('.icm-gs-satir'); if (sat && sat.dataset.tur === 'liste') icmGdSatir(sat.querySelector('.icm-gs-sil'), 'ekle', 'liste', sat); }
    });
    k.addEventListener('paste', e => {
      const a = e.target.closest && e.target.closest('.icm-rz'); if (!a) return;
      e.preventDefault(); let t = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
      if (a.dataset.mod === 'tek') t = t.replace(/\s*\n\s*/g, ' ');
      document.execCommand('insertText', false, t);
    });
  }
  function gdSecSakla(k) { const x = gdSecim(k); GD._sec = x ? x.r.cloneRange() : null; }
  function gdSecGeri() { if (!GD._sec) return; const s = window.getSelection(); s.removeAllRanges(); s.addRange(GD._sec); }
  document.addEventListener('selectionchange', () => { const k = document.querySelector('.icm-gd'); if (!k || k.style.display === 'none') return; const x = gdSecim(k); if (x) GD._sec = x.r.cloneRange(); });
  function gdPaletKapat() { const p = $('icm-ga-palet'); if (p) p.remove(); }
  window.GD = GD;
  window.icmGdSatir = (btn, is, tur, sonra) => {
    const f = btn.closest('.icm-gd-form'), kok = f.id.replace(/-gd-f$/, '');
    if (is === 'sil') { const r = btn.closest('.icm-gs-satir'); r.remove(); }
    else {
      const liste = f.querySelector('[data-liste="' + tur + '"]'); if (!liste) return;
      liste.insertAdjacentHTML('beforeend', gdSatir(tur, tur === 'cins' ? { c: 'м' } : {}));
      let yeni = liste.lastElementChild;
      if (sonra && sonra.parentNode === liste) { liste.insertBefore(yeni, sonra.nextSibling); }
      const odak = yeni.querySelector('.icm-rz, input'); if (odak) odak.focus();
    }
    gdDegisti(kok);
  };
  window.icmGdTablo = (btn, is) => {
    const f = btn.closest('.icm-gd-form'), kok = f.id.replace(/-gd-f$/, ''), t = f.querySelector('.icm-gs-tablo'); if (!t) return;
    const R = [...t.rows], sut = R[0] ? R[0].cells.length : 1;
    if (is === 'satir+') { const tr = t.insertRow(); for (let k = 0; k < sut; k++) tr.insertAdjacentHTML('beforeend', '<td>' + rz('', 'tek', {}) + '</td>'); }
    else if (is === 'sutun+') R.forEach((tr, i) => tr.insertAdjacentHTML('beforeend', '<td' + (i ? '' : ' class="bas"') + '>' + rz('', 'tek', {}) + '</td>'));
    else if (is === 'satir-') { if (R.length > 1) t.deleteRow(R.length - 1); }
    else if (is === 'sutun-') { if (sut > 1) R.forEach(tr => tr.deleteCell(sut - 1)); }
    gdDegisti(kok);
  };
  window.icmGdGorsel = async inp => {
    const f0 = inp.files && inp.files[0], form = inp.closest('.icm-gd-form'); inp.value = ''; if (!f0 || !form) return;
    if (f0.size > 3 * 1024 * 1024) { uiAlert('Görsel en fazla 3 MB olabilir.'); return; }
    const ext = (f0.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, ''), ad = Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
    try { const { error } = await sb.storage.from('docs').upload('ekitap/' + ad, f0, { cacheControl: '31536000', upsert: false }); if (error) throw error; }
    catch (e) { uiAlert('Görsel yüklenemedi: ' + ((e && e.message) || e)); return; }
    const o = form.querySelector('.icm-gs-gorsel-on'); o.dataset.src = ad; o.textContent = ad;
    gdDegisti(form.id.replace(/-gd-f$/, ''));
  };
  window.icmBlokMod = (kok, mod) => {
    GD.mod = mod; const A = BL_ACIK[kok]; if (A) A.mod = mod;
    const k = $(kok + '-gd'), ta = $(kok + '-ta'), ip = $(kok + '-ip');
    document.querySelectorAll('#' + kok + ' .icm-gd-sek button').forEach(b => b.classList.toggle('aktif', b.dataset.m === mod));
    if (mod === 'gorsel') { if (ta) ta.style.display = 'none'; if (ip) ip.style.display = 'none'; if (k) { k.style.display = ''; gdKur(kok); } }
    else { if (k) k.style.display = 'none'; if (ta) { ta.style.display = ''; ta.rows = Math.min(18, Math.max(3, ta.value.split('\n').length + 1)); ta.focus(); } if (ip) ip.style.display = ''; }
  };
  // Sürükle-bırak ile blok sırası
  function blokSurukleBagla(kokId) {
    const k = $(kokId); if (!k || k.dataset.dnd) return; k.dataset.dnd = '1';
    let kaynak = null;
    const temizle = () => k.querySelectorAll('.icm-blok.ust-cizgi, .icm-blok.alt-cizgi').forEach(b => b.classList.remove('ust-cizgi', 'alt-cizgi'));
    k.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('.icm-blok-tut'); if (!t) return; const b = t.closest('.icm-blok'); kaynak = +b.dataset.bi; b.classList.add('suruk'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(kaynak)); e.dataTransfer.setDragImage(b, 20, 20); } catch (x) {} });
    k.addEventListener('dragend', () => { kaynak = null; temizle(); k.querySelectorAll('.icm-blok.suruk').forEach(b => b.classList.remove('suruk')); });
    k.addEventListener('dragover', e => {
      if (kaynak == null) return; const b = e.target.closest('.icm-blok'); if (!b) return; e.preventDefault();
      const r = b.getBoundingClientRect(), ust = e.clientY < r.top + r.height / 2; temizle(); b.classList.add(ust ? 'ust-cizgi' : 'alt-cizgi');
    });
    k.addEventListener('drop', e => {
      if (kaynak == null) return; const b = e.target.closest('.icm-blok'); if (!b) return; e.preventDefault();
      const r = b.getBoundingClientRect(), ust = e.clientY < r.top + r.height / 2, hedef = +b.dataset.bi, bi = kaynak; kaynak = null; temizle();
      if (hedef !== bi) icmBlok(kokId, 'tasi', bi, { hedef, once: ust });
    });
  }

  // Ders / ünite önizleme (öğrencinin göreceği biçim)
  function onizlemeCiz(kutu, p, si, sayfaMi) {
    if (!kutu || !p) return;
    kutu.innerHTML = '';
    const secler = si == null ? p.sections : [p.sections[si]].filter(Boolean);
    const S = ekBuildSections({ sections: secler }, ekKapsam('icm4'));
    const sar = document.createElement('div'); sar.className = 'ek-wrap icm-kitap' + (sayfaMi ? ' sayfali' : '');
    S.forEach(s => { if (s.sec.tur === 'anahtar' && si != null) return; s.els.forEach(x => { if (x.pb) sar.appendChild(ekEl('<div class="icm-sayfa-sonu"><span>sayfa sonu</span></div>')); else sar.appendChild(x.el); }); });
    kutu.appendChild(sar);
  }
  window.icmOnizle = async id => {
    let row = agU(id);
    if (!row || !row.kaynak) { try { const { data } = await sb.from('ek_units').select('id, modul_no, unite_no, unite_ad, kaynak').eq('id', id).single(); row = data; } catch (e) {} }
    if (!row) return uiAlert('Ünite yüklenemedi.');
    const p = ekParse(row.kaynak || '');
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'icm-on-m';
    ov.innerHTML = '<div class="ui-modal ys-modal icm-on-modal" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('goz', 20) + '</span><h3>Öğrenci önizleme · Modül ' + row.modul_no + ' · Ünite ' + row.unite_no + '</h3>' +
      '<div class="ys-mini-sekme" id="icm-on-gen">' + [['100%', 'Masaüstü'], ['760px', 'Tablet'], ['390px', 'Telefon']].map((g, i) => '<button type="button" class="' + (i ? '' : 'aktif') + '" onclick="this.parentNode.querySelectorAll(\'button\').forEach(b => b.classList.remove(\'aktif\')); this.classList.add(\'aktif\'); document.getElementById(\'icm-on-g\').style.maxWidth=\'' + g[0] + '\'">' + g[1] + '</button>').join('') + '</div>' +
      '<button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'icm-on-m\').remove()">' + ic('kapat', 17) + '</button></div><div class="icm-on-cerceve"><div id="icm-on-g" class="ek-adm-preview icm-on-g"></div></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    onizlemeCiz($('icm-on-g'), p, null, false);
  };

  // Sürüm kaydı (tablo kurulu değilse sessizce atlanır)
  async function surumKaydet(unitId, kaynak, yayinda, not) {
    if (!unitId || !kaynak) return;
    try { await sb.from('ek_unit_surumler').insert({ unit_id: unitId, kaynak, yayinda: yayinda == null ? null : !!yayinda, not_metni: not || null }); } catch (e) {}
  }

  /* ---------- E-Kitap ve çalışma seti listeleri ---------- */
  const EKL = { ara: '', durum: 'hepsi', rows: [], setler: [] };
  async function ekSekme(t) {
    const E = gl('EKA'); if (E) E.mode = t === 'set' ? 'set' : 'unit';
    if (typeof ekTopicsFetch === 'function') await ekTopicsFetch();
    const ed = $('icm-ed'), pano = $('icm-' + (t === 'set' ? 'set' : 'unite'));
    if (ed && pano && ed.parentNode !== pano) pano.appendChild(ed);
    if (ED.acik && ED.mod === (t === 'set' ? 'set' : 'unit')) { edGoster(true); return; }
    edGoster(false);
    return t === 'set' ? setListeCiz() : ekListeCiz();
  }
  async function ekListeCiz() {
    const k = $('icm-ek-liste'); if (!k) return;
    if (!EKL.rows.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try { const { data } = await sb.from('ek_units').select('id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, kontrol_say, updated_at, toc').order('modul_no').order('unite_no'); EKL.rows = data || []; } catch (e) { EKL.rows = []; }
    const R = EKL.rows, q = EKL.ara.trim().toLocaleLowerCase('tr');
    const L = R.filter(r => (EKL.durum === 'hepsi' || (EKL.durum === 'yayinda') === !!r.yayinda) && (!q || [r.modul_ad, r.unite_ad, 'modül ' + r.modul_no, 'ünite ' + r.unite_no].join(' ').toLocaleLowerCase('tr').includes(q)));
    let h = '<div class="ys-kpiler d4">' + kpi('kitap', 'mavi', 'E-kitap ünitesi', R.length, '') + kpi('onay', 'yesil', 'Yayında', R.filter(r => r.yayinda).length, '') + kpi('saat', 'turuncu', 'Taslak', R.filter(r => !r.yayinda).length, '') +
      kpi('hata', 'kirmizi', 'Kontrol bekleyen etkinlik', R.reduce((a, r) => a + (r.kontrol_say || 0), 0), '') + '</div>';
    h += '<section class="yp-kart ys-liste"><div class="ys-arac">' + aramaKutusu('icm-ek-ara', EKL.ara, 'Modül ya da ünite ara…', 'icmEkAra(this.value)') + secim('Durum', EKL.durum, [['hepsi', 'Tümü'], ['yayinda', 'Yayında'], ['taslak', 'Taslak']], 'icmEkDurum(this.value)') +
      '<button type="button" class="yp-btn" onclick="icmPdfAc()">' + ic('yukle', 16) + 'PDF\'den içe aktar</button><button type="button" class="yp-btn ana" onclick="icmEdYeni()">' + ic('arti', 16) + 'Yeni ünite</button></div>';
    if (!L.length) h += '<div class="yp-bos">' + ic('kitap', 30) + '<b>' + (R.length ? 'Aramaya uyan ünite yok.' : 'Henüz e-kitap ünitesi yok.') + '</b><span>Yeni ünite oluştur ya da bir PDF\'i içe aktar.</span></div>';
    else h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Ünite</th><th>Seviye</th><th>Ders</th><th>Durum</th><th>Son güncelleme</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>' + L.map(r => {
      const ders = (r.toc || []).filter(t => t.tur === 'ders').length;
      return '<tr><td><button type="button" class="icm-un" onclick="icmEdAc(' + r.id + ')"><span class="icm-ic r-mavi">' + ic('kitap', 16) + '</span><span><b>Modül ' + r.modul_no + ' · Ünite ' + r.unite_no + '</b><small>' + esc(r.unite_ad || '') + (r.modul_ad ? ' · ' + esc(r.modul_ad) : '') + '</small></span></button></td>' +
        '<td><span class="yp-durum r-altin">' + esc(r.seviye || '—') + '</span></td><td>' + ders + '</td><td><span class="yp-durum ' + (r.yayinda ? 'd-yesil' : 'd-sari') + '">' + (r.yayinda ? 'Yayında' : 'Taslak') + '</span>' + (r.kontrol_say ? ' <span class="yp-durum d-turuncu">' + r.kontrol_say + ' kontrol</span>' : '') + '</td>' +
        '<td class="ys-tar">' + tarih(r.updated_at) + '<small>' + saat(r.updated_at).slice(0, 5) + '</small></td><td class="ys-sag"><div class="ys-satir-b"><button type="button" class="ys-uc-nokta" title="Düzenle" aria-label="Düzenle" onclick="icmEdAc(' + r.id + ')">' + ic('kalem', 15) + '</button>' + menuB('eku', String(r.id)) + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
    k.innerHTML = h + '</section>';
  }
  window.icmEkAra = v => { EKL.ara = v; ekListeCiz().then(() => { const i = $('icm-ek-ara'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }); };
  window.icmEkDurum = v => { EKL.durum = v; ekListeCiz(); };
  MENULER.eku = id => {
    const r = EKL.rows.find(x => String(x.id) === String(id)); if (!r) return [];
    return [{ ic: 'kalem', ad: 'Düzenle', fn: 'icmEdAc(' + id + ')' }, { ic: 'goz', ad: 'Öğrenci önizleme', fn: 'icmOnizle(' + id + ')' }, { ic: 'saat', ad: 'Sürüm geçmişi', fn: 'icmSurumler(' + id + ')' }, { ic: 'agac', ad: 'Müfredat ağacında göster', fn: "icmAgacSec('u', " + id + ")" },
      { ayrac: 1 }, { ic: r.yayinda ? 'kilit' : 'onay', ad: r.yayinda ? 'Yayından kaldır' : 'Yayınla', fn: 'icmUniteYayin(' + id + ', ' + !r.yayinda + ')' }, { ic: 'cop', ad: 'Üniteyi sil', fn: "EKA.mode='unit'; ekAdmDelete(" + id + ")", tehlike: 1 }];
  };
  async function setListeCiz() {
    const k = $('icm-set-liste'); if (!k) return;
    if (!EKL.setler.length) k.innerHTML = '<div class="yp-kart"><div class="admin-loading">Yükleniyor...</div></div>';
    try { const { data } = await sb.from('gw_sets').select('id, baslik, seviye, konular, act_say, kontrol_say, yayinda, updated_at, sort, kitap_ref').order('sort').order('id'); EKL.setler = data || []; } catch (e) { EKL.setler = []; }
    const E = gl('EKA'); if (E) E.setRows = EKL.setler;
    const R = EKL.setler, T = (gl('EKA') || {}).topics || [], tAd = kod => { const t = T.find(z => z.kod === kod); return t ? t.ad : kod; };
    let h = '<div class="ys-kpiler d4">' + kpi('set', 'mor', 'Çalışma seti', R.length, '') + kpi('onay', 'yesil', 'Yayında', R.filter(r => r.yayinda).length, '') + kpi('onay', 'mavi', 'Toplam etkinlik', R.reduce((a, r) => a + (r.act_say || 0), 0), '') +
      kpi('hata', 'kirmizi', 'Kontrol bekleyen', R.reduce((a, r) => a + (r.kontrol_say || 0), 0), '') + '</div>';
    h += '<section class="yp-kart ys-liste"><div class="ys-arac"><p class="ys-kart-alt icm-arac-not">Setler Eğitim → Çalışmalar → Gramer Çalışmaları sayfasında bu sırayla görünür.</p><button type="button" class="yp-btn ana" onclick="icmSetYeni()">' + ic('arti', 16) + 'Yeni çalışma seti</button></div>';
    if (!R.length) h += '<div class="yp-bos">' + ic('set', 30) + '<b>Henüz çalışma seti yok.</b></div>';
    else h += '<div class="yp-tablo-k"><table class="yp-tablo ys-tablo ys-orta"><thead><tr><th>Sıra</th><th>Set</th><th>Konular</th><th>Etkinlik</th><th>Durum</th><th class="ys-sag">İşlemler</th></tr></thead><tbody>' + R.map((r, i) =>
      '<tr><td><div class="ys-satir-b"><button type="button" class="yp-ikon-b" aria-label="Yukarı" title="Yukarı" ' + (i ? '' : 'disabled') + ' onclick="icmSetTasi(' + r.id + ', -1)">' + ic('yukari', 14) + '</button><button type="button" class="yp-ikon-b" aria-label="Aşağı" title="Aşağı" ' + (i < R.length - 1 ? '' : 'disabled') + ' onclick="icmSetTasi(' + r.id + ', 1)">' + ic('asagi', 14) + '</button></div></td>' +
      '<td><button type="button" class="icm-un" onclick="icmSetAc(' + r.id + ')"><span class="icm-ic r-mor">' + ic('set', 16) + '</span><span><b>' + esc(r.baslik) + '</b><small>' + esc(r.seviye || '') + (r.kitap_ref ? ' · kitap ' + esc(r.kitap_ref) : '') + '</small></span></button></td>' +
      '<td><div class="ys-etler">' + ((r.konular || []).map(kd => '<span class="yp-durum d-gri">' + esc(tAd(kd)) + '</span>').join('') || '<span class="ys-soluk">—</span>') + '</div></td><td>' + (r.act_say || 0) + (r.kontrol_say ? ' <span class="yp-durum d-turuncu">' + r.kontrol_say + ' kontrol</span>' : '') + '</td>' +
      '<td><span class="yp-durum ' + (r.yayinda ? 'd-yesil' : 'd-sari') + '">' + (r.yayinda ? 'Yayında' : 'Taslak') + '</span></td><td class="ys-sag"><div class="ys-satir-b"><button type="button" class="ys-uc-nokta" title="Düzenle" aria-label="Düzenle" onclick="icmSetAc(' + r.id + ')">' + ic('kalem', 15) + '</button>' + menuB('gws', String(r.id)) + '</div></td></tr>').join('') + '</tbody></table></div>';
    k.innerHTML = h + '</section>';
  }
  MENULER.gws = id => { const r = EKL.setler.find(x => String(x.id) === String(id)); if (!r) return [];
    return [{ ic: 'kalem', ad: 'Düzenle', fn: 'icmSetAc(' + id + ')' }, { ic: r.yayinda ? 'kilit' : 'onay', ad: r.yayinda ? 'Yayından kaldır' : 'Yayınla', fn: "EKA.mode='set'; ekAdmToggle(" + id + ", " + !r.yayinda + ")" }, { ayrac: 1 }, { ic: 'cop', ad: 'Seti sil', fn: "EKA.mode='set'; ekAdmDelete(" + id + ")", tehlike: 1 }]; };
  window.icmSetTasi = async (id, y) => { const E = gl('EKA'); if (E) { E.mode = 'set'; E.setRows = EKL.setler; } if (typeof gwAdmMove === 'function') await gwAdmMove(id, y); };
  window.icmSetAc = id => { const E = gl('EKA'); if (E) E.mode = 'set'; if (typeof ekAdmEdit === 'function') ekAdmEdit(id); };
  window.icmSetYeni = () => { const E = gl('EKA'); if (E) E.mode = 'set'; if (typeof ekAdmNew === 'function') ekAdmNew(); };

  /* ---------- Tam ekran e-kitap düzenleyicisi ---------- */
  const ED = { acik: false, mod: 'unit', si: 0, gorunum: 'bloklar', yan: 'bolum', kirli: false, p: null, notlar: null, cihaz: '100%', yayinda: null };
  const GORUNUM = [['bloklar', 'Bloklar', 'liste'], ['akis', 'Akış', 'paragraf'], ['sayfa', 'Sayfa düzeni', 'kitap'], ['ogrenci', 'Öğrenci önizleme', 'goz'], ['metin', 'Metin', 'kod']];
  const YAN = [['bolum', 'Bölüm'], ['etkinlik', 'Etkinlikler'], ['kelime', 'Kelimeler'], ['not', 'Notlar ve kartlar'], ['rapor', 'Rapor']];
  const edSrc = () => (($('ek-src') || {}).value || '');
  function edKabuk() {
    let ed = $('icm-ed'); if (!ed) return null;
    if (ed.dataset.kuruldu) return ed;
    ed.dataset.kuruldu = '1';
    ed.innerHTML = '<div class="yp-kart icm-ed-ust"><button type="button" class="yp-btn kucuk" onclick="icmEdKapat()">' + ic('siteye', 15) + 'Listeye dön</button><div class="icm-ed-baslik"><h3 id="icm-ed-b"></h3><small id="icm-ed-alt"></small></div><span id="icm-ed-durum"></span>' +
      '<div class="icm-ed-acts"><button type="button" class="yp-btn kucuk" onclick="icmSurumler()" id="icm-ed-surum">' + ic('saat', 15) + 'Sürüm geçmişi</button><button type="button" class="yp-btn kucuk" onclick="icmPdfIndir()">' + ic('indir', 15) + 'PDF</button>' +
      '<button type="button" class="yp-btn ana" onclick="icmKaydet()">' + ic('kaydet', 16) + 'Kaydet</button><button type="button" class="yp-btn ana kare" aria-label="Kaydetme seçenekleri" onclick="ysMenuAc(event, \'edkaydet\', \'x\')">' + ic('asagi', 15) + '</button></div></div>' +
      '<div class="icm-ed-govde"><aside class="yp-kart icm-ed-sol"><div class="icm-bas"><h3>Bölümler</h3><button type="button" class="yp-ikon-b" title="Bölüm ekle" aria-label="Bölüm ekle" onclick="ysMenuAc(event, \'edbolum\', \'x\')">' + ic('arti', 16) + '</button></div><div id="icm-ed-bolumler"></div></aside>' +
      '<section class="yp-kart icm-ed-orta"><div class="icm-ed-gor" id="icm-ed-gor"></div><div id="icm-ed-v-bloklar" class="icm-ed-v"><div class="icm-ed-bolum-bas" id="icm-ed-bolum-bas"></div><div id="icm-ed-bloklar"></div></div>' +
      '<div id="icm-ed-v-onizle" class="icm-ed-v"></div><div id="icm-ed-v-ogrenci" class="icm-ed-v"><div class="icm-cihaz" id="icm-ed-cihaz"></div><div class="icm-on-cerceve"><div id="icm-ed-ogr" class="ek-adm-preview icm-on-g"></div></div></div>' +
      '<div id="icm-ed-v-metin" class="icm-ed-v"><div class="icm-metin-arac"><button type="button" class="yp-btn kucuk" onclick="ekAdmInsert(\'\\n---sayfa---\\n\')">Sayfa sonu ekle</button><label class="yp-btn kucuk">Görsel yükle<input type="file" accept="image/*" style="display:none" onchange="ekAdmImage(event)"></label>' +
      '<button type="button" class="yp-btn kucuk" onclick="ekAdmCopyFormat()">Konu listesini kopyala</button><button type="button" class="yp-btn kucuk" onclick="icmEdYenile(true)">' + ic('onay', 14) + 'Kontrol et</button><span class="ys-soluk">Metin, tüm bloklarıyla e-kitabın kaynağıdır.</span></div></div></section>' +
      '<aside class="yp-kart icm-ed-sag"><div class="icm-sag-sekme" id="icm-ed-yan-s"></div><div id="icm-ed-yan"></div><div id="icm-ed-rapor-k" style="display:none"></div></aside></div>';
    // Eski düzenleyicinin öğeleri (kimlikleriyle) yeni kabuğa taşınır
    const src = $('ek-src'); if (src) { $('icm-ed-v-metin').appendChild(src); src.classList.add('icm-src'); src.addEventListener('input', () => { ED.kirli = true; edDurum(); clearTimeout(ED._t); ED._t = setTimeout(() => icmEdYenile(false, true), 500); }); }
    const on = $('ek-adm-preview'); if (on) $('icm-ed-v-onizle').appendChild(on);
    const rp = $('ek-adm-report'); if (rp) { $('icm-ed-rapor-k').appendChild(rp); rp.addEventListener('click', e => { const b = e.target.closest('.ek-rep-row b'); const m = b && b.textContent.match(/Satır\s+(\d+)/); if (m) { icmEdGor('metin'); setTimeout(() => ekPdGoster(+m[1]), 50); } }); }
    return ed;
  }
  function edGoster(acik) {
    const ed = $('icm-ed'), liste = $(ED.mod === 'set' ? 'icm-set-liste' : 'icm-ek-liste');
    if (ed) ed.style.display = acik ? '' : 'none';
    ['icm-ek-liste', 'icm-set-liste'].forEach(id => { const el = $(id); if (el) el.style.display = acik ? 'none' : ''; });
    if (!acik && liste) liste.style.display = '';
  }
  // Eski "editörü aç" çağrısı yeni düzenleyiciyi açar
  async function edAc(src, id) {
    const E = gl('EKA') || {};
    ED.mod = E.mode === 'set' ? 'set' : 'unit';
    const hedefSekme = ED.mod === 'set' ? 'set' : 'unite';
    if (icS().tab !== hedefSekme || !$('icm-' + hedefSekme) || $('icm-' + hedefSekme).style.display === 'none') { const IC_ = icS(); IC_.tab = hedefSekme; icmSekmeCiz(); ICM_SEKME.forEach(s => { const p = $('icm-' + s[0]); if (p) p.style.display = s[0] === hedefSekme ? '' : 'none'; }); }
    const ed = $('icm-ed'), pano = $('icm-' + hedefSekme); if (ed && pano && ed.parentNode !== pano) pano.appendChild(ed);
    edKabuk();
    if (!src && ED.mod === 'unit' && !id) {
      if (!EKL.rows.length) { try { const { data } = await sb.from('ek_units').select('id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, kontrol_say, updated_at, toc').order('modul_no').order('unite_no'); EKL.rows = data || []; } catch (e) {} }
      const R = EKL.rows.length ? EKL.rows : ((gl('MF') || {}).rows || []);
      const mNo = R.reduce((a, r) => Math.max(a, r.modul_no || 0), 0) || 1, uNo = R.filter(r => r.modul_no === mNo).reduce((a, r) => Math.max(a, r.unite_no || 0), 0) + 1;
      const son = R.filter(r => r.modul_no === mNo).slice(-1)[0];
      $('ek-src').value = '@modül ' + mNo + ' | ' + ((son && son.modul_ad) || 'Modül adı') + '\n@ünite ' + uNo + ' | Yeni ünite\n@seviye ' + ((son && son.seviye) || 'A1') + '\n\n# Ders 1 | Yeni ders\n\nİlk paragraf.\n';
    }
    ED.acik = true; ED.kirli = false; ED.si = 0; ED.yan = 'bolum'; ED.notlar = null; ED.yayinda = null;
    if (ED._pdfYeni) { ED.gorunum = 'bloklar'; ED.kirli = true; delete ED._pdfYeni; } else if (!['bloklar', 'akis', 'sayfa', 'ogrenci', 'metin'].includes(ED.gorunum)) ED.gorunum = 'bloklar';
    if (ED._acSi != null) { ED.si = ED._acSi; delete ED._acSi; }
    edGoster(true);
    if (id && ED.mod === 'unit') {
      try { const { data } = await sb.from('ek_units').select('yayinda').eq('id', id).single(); if (data) ED.yayinda = !!data.yayinda; } catch (e) {}
    } else if (id && ED.mod === 'set') { const r = EKL.setler.find(x => String(x.id) === String(id)); ED.yayinda = r ? !!r.yayinda : null; }
    icmEdYenile(true);
    window.scrollTo({ top: 0 });
  }
  function edDurum() {
    const d = $('icm-ed-durum'); if (!d) return;
    d.innerHTML = (ED.yayinda == null ? '<span class="yp-durum d-gri">Kaydedilmedi</span>' : '<span class="yp-durum ' + (ED.yayinda ? 'd-yesil' : 'd-sari') + '">' + (ED.yayinda ? 'Yayında' : 'Taslak') + '</span>') + (ED.kirli ? ' <span class="yp-durum d-turuncu">Kaydedilmemiş değişiklik</span>' : '');
  }
  window.icmEdYenile = (rapor, metindenMi) => {
    const E = gl('EKA') || {};
    const p = ekParse(edSrc(), { set: ED.mod === 'set' }); ED.p = p; E.lastParse = p;
    if (ED.si >= p.sections.length) ED.si = Math.max(0, p.sections.length - 1);
    const m = p.meta;
    $('icm-ed-b').textContent = ED.mod === 'set' ? (m.baslik || 'Yeni çalışma seti') : ('Modül ' + (m.modul_no || '?') + ' · Ünite ' + (m.unite_no || '?') + ' — ' + (m.unite_ad || ''));
    $('icm-ed-alt').textContent = (ED.mod === 'set' ? 'Çalışma seti' : (m.modul_ad || '')) + (m.seviye ? ' · ' + m.seviye : '') + ' · ' + p.actSay + ' etkinlik · ' + p.errors.length + ' hata';
    const sb2 = $('icm-ed-surum'); if (sb2) sb2.style.display = ED.mod === 'set' ? 'none' : '';
    edDurum();
    // Bölümler
    const bl = $('icm-ed-bolumler');
    if (bl) bl.innerHTML = p.sections.length ? p.sections.map((s, si) => '<button type="button" class="icm-ed-bolum' + (si === ED.si ? ' secili' : '') + '" onclick="icmEdBolum(' + si + ')"><span class="icm-ic-k">' + ic(s.tur === 'ders' ? 'kitap' : s.tur === 'set' ? 'set' : s.tur === 'test' ? 'soru' : 'not', 15) + '</span><span><b>' + esc(s.tur === 'ders' ? 'Ders ' + s.no : (BOLUM_AD[s.tur] || 'Bölüm')) + '</b><small>' + esc(s.ad || '') + '</small></span><em>' + s.blocks.filter(b => b.t === 'act').length + '</em></button>').join('') : '<div class="yp-bos kucuk"><span>Bölüm yok.</span></div>';
    // Görünüm sekmeleri
    const g = $('icm-ed-gor'); if (g) g.innerHTML = GORUNUM.map(x => '<button type="button" class="' + (ED.gorunum === x[0] ? 'aktif' : '') + '" onclick="icmEdGor(\'' + x[0] + '\')">' + ic(x[2], 15) + x[1] + '</button>').join('');
    GORUNUM.forEach(x => { const v = $('icm-ed-v-' + (x[0] === 'akis' || x[0] === 'sayfa' ? 'onizle' : x[0])); if (v) v.style.display = 'none'; });
    const gv = $('icm-ed-v-' + (ED.gorunum === 'akis' || ED.gorunum === 'sayfa' ? 'onizle' : ED.gorunum)); if (gv) gv.style.display = '';
    if (ED.gorunum === 'bloklar') edBloklar();
    else if (ED.gorunum === 'akis' || ED.gorunum === 'sayfa') { E.gorunum = ED.gorunum; const on = $('ek-adm-preview'); if (on && on.parentNode !== $('icm-ed-v-onizle')) $('icm-ed-v-onizle').appendChild(on); if (typeof ekAdmCheck === 'function') ekAdmCheck(); }
    else if (ED.gorunum === 'ogrenci') edOgrenci();
    else if (ED.gorunum === 'metin' && rapor && !metindenMi && typeof ekAdmCheck === 'function') { E.gorunum = 'akis'; ekAdmCheck(); }
    if (rapor && ED.gorunum !== 'akis' && ED.gorunum !== 'sayfa' && typeof ekAdmCheck === 'function') { const gor = E.gorunum; E.gorunum = 'akis'; ekAdmCheck(); E.gorunum = gor; }
    edYan();
  };
  function edBaglam() {
    return { kok: 'icm-ed-bloklar', si: ED.si, kapsam: 'icm', set: ED.mod === 'set', src: edSrc, p: () => ED.p,
      yaz: yeni => { $('ek-src').value = yeni; ED.kirli = true; ED.p = ekParse(yeni, { set: ED.mod === 'set' }); return true; }, sonra: () => icmEdYenile(false) };
  }
  function edBloklar() {
    const s = ED.p && ED.p.sections[ED.si], b = $('icm-ed-bolum-bas');
    if (b) b.innerHTML = s ? '<div><span class="icm-tur r-mavi">' + ic(s.tur === 'ders' ? 'kitap' : 'not', 14) + esc(s.tur === 'ders' ? 'Ders ' + s.no : (BOLUM_AD[s.tur] || 'Bölüm')) + '</span><h3>' + esc(s.ad || '') + '</h3></div><div class="ys-etler">' + (s.konular || []).map(k => '<span class="yp-durum d-gri">' + esc(k) + '</span>').join('') + '</div>' : '';
    blokListeBagla('icm-ed-bloklar', edBaglam());
  }
  function edOgrenci() {
    const c = $('icm-ed-cihaz'); if (c) c.innerHTML = '<div class="ys-mini-sekme">' + [['100%', 'Masaüstü'], ['760px', 'Tablet'], ['390px', 'Telefon']].map(g => '<button type="button" class="' + (ED.cihaz === g[0] ? 'aktif' : '') + '" onclick="icmEdCihaz(\'' + g[0] + '\')">' + g[1] + '</button>').join('') + '</div><label class="ys-anahtar kucuk"><input type="checkbox" ' + (ED.tumu ? 'checked' : '') + ' onchange="ED_TUMU(this.checked)"><i></i><span>Tüm bölümler</span></label>';
    const g = $('icm-ed-ogr'); if (g) { g.style.maxWidth = ED.cihaz; onizlemeCiz(g, ED.p, ED.tumu ? null : ED.si, false); }
  }
  window.ED_TUMU = v => { ED.tumu = v; edOgrenci(); };
  window.icmEdCihaz = c => { ED.cihaz = c; edOgrenci(); };
  window.icmEdGor = g => { ED.gorunum = g; icmEdYenile(false); };
  window.icmEdBolum = si => { ED.si = si; delete BL_ACIK['icm-ed-bloklar']; if (ED.gorunum !== 'bloklar' && ED.gorunum !== 'ogrenci') ED.gorunum = 'bloklar'; icmEdYenile(false); };
  function edYan() {
    const s = $('icm-ed-yan-s'); if (s) s.innerHTML = YAN.map(y => '<button type="button" class="' + (ED.yan === y[0] ? 'aktif' : '') + '" onclick="icmEdYan(\'' + y[0] + '\')">' + y[1] + (y[0] === 'rapor' && ED.p && ED.p.errors.length ? ' <em class="hata">' + ED.p.errors.length + '</em>' : '') + '</button>').join('');
    const k = $('icm-ed-yan'), rk = $('icm-ed-rapor-k'); if (!k) return;
    if (rk) rk.style.display = ED.yan === 'rapor' ? '' : 'none';
    k.style.display = ED.yan === 'rapor' ? 'none' : '';
    const p = ED.p, sec = p && p.sections[ED.si];
    if (ED.yan === 'bolum') {
      const m = p ? p.meta : {}, alan = (id, ad, deger, ph, tip) => '<label class="ys-alan"><span>' + ad + '</span><input id="' + id + '" class="ys-girdi" value="' + esc(deger == null ? '' : deger) + '" placeholder="' + esc(ph || '') + '"' + (tip ? ' type="' + tip + '"' : '') + ' onchange="icmEdMeta()"></label>';
      let h = '<div class="icm-yan-bl"><h4>' + (ED.mod === 'set' ? 'Set bilgileri' : 'Ünite bilgileri') + '</h4>';
      if (ED.mod === 'set') h += alan('ed-set', 'Başlık', m.baslik, 'Set başlığı') + '<div class="ys-iki">' + alan('ed-sev', 'Seviye', m.seviye, 'A1') + alan('ed-kitap', 'Kitap bağlantısı', m.kitap ? m.kitap.m + '.' + m.kitap.u : '', 'ör. 1.2') + '</div>' + alan('ed-acik', 'Açıklama', m.aciklama, 'Liste kartında görünür');
      else h += '<div class="ys-iki">' + alan('ed-mno', 'Modül no', m.modul_no, '1', 'number') + alan('ed-uno', 'Ünite no', m.unite_no, '1', 'number') + '</div>' + alan('ed-mad', 'Modül adı', m.modul_ad, '') + alan('ed-uad', 'Ünite adı', m.unite_ad, '') + alan('ed-sev', 'Seviye', m.seviye, 'A1');
      h += '</div>';
      if (sec) {
        const T = (gl('EKA') || {}).topics || [], tAd = kod => { const t = T.find(z => z.kod === kod); return t ? t.ad : kod; };
        h += '<div class="icm-yan-bl"><h4>Seçili bölüm</h4>' + (sec.ln ? '<label class="ys-alan"><span>' + (sec.tur === 'ders' ? 'Ders ' + sec.no + ' adı' : 'Bölüm adı') + '</span><input id="ed-bad" class="ys-girdi" value="' + esc(sec.ad || '') + '" onchange="icmEdBolumAd()"></label>' : '') +
          '<div class="ys-alan"><span>Konular</span><div class="icm-konular dikey">' + (sec.konular.length ? sec.konular.map(kd => '<span class="icm-konu" title="' + esc(kd) + '">' + esc(tAd(kd)) + '<button type="button" aria-label="Konuyu çıkar" onclick="icmEdKonu(\'cikar\', \'' + jsq(kd) + '\')">' + ic('kapat', 12) + '</button></span>').join('') : '<span class="ys-soluk">Konu atanmadı</span>') + '</div>' +
          (ED.mod === 'set' ? '<small class="ys-soluk">Set konuları etkinliklerin "konu:" alanlarından gelir.</small>' : secimKutusu('ed-konu-sk', 'Konu ekle…', T.filter(t => !sec.konular.includes(t.kod)).map(t => ({ id: t.kod, ad: t.ad, alt: t.kod })))) + '</div>' +
          (sec.ln && ED.mod === 'unit' ? '<button type="button" class="yp-btn kucuk kirmizi" onclick="icmEdBolumSil()">' + ic('cop', 14) + 'Bölümü sil</button>' : '') + '</div>';
      }
      k.innerHTML = h;
      if (SK['ed-konu-sk']) SK['ed-konu-sk'].degisti = v => { if (v) icmEdKonu('ekle', v); };
    } else if (ED.yan === 'etkinlik') {
      const acts = sec ? sec.blocks.map((b, bi) => ({ b, bi })).filter(x => x.b.t === 'act') : [];
      k.innerHTML = '<div class="icm-yan-bl"><h4>Bu bölümdeki etkinlikler <span class="ys-rozet kucuk">' + acts.length + '</span></h4>' + (acts.length ? acts.map((x, n) => '<button type="button" class="icm-yan-oge" onclick="icmEdBlokAc(' + x.bi + ')"><span class="icm-blok-no">' + (n + 1) + '</span><span><b>' + esc((gl('EK_TIPLER') || {})[x.b.tip] || x.b.tip) + '</b><small>' + esc(x.b.alanlar['yönerge'] || x.b.alanlar['görev'] || '') + '</small><small>' + (x.b.items.length || 1) + ' madde' + ((x.b.konu || []).length ? ' · ' + esc(x.b.konu.join(', ')) : '') + '</small></span>' + (x.b.kontrol ? '<span class="yp-durum d-turuncu">Kontrol</span>' : '') + '</button>').join('') : '<div class="yp-bos kucuk"><span>Etkinlik yok.</span></div>') +
        '<button type="button" class="yp-btn kucuk" onclick="icmEdGor(\'bloklar\'); setTimeout(() => icmBlokEkle(\'icm-ed-bloklar\', \'son\', \'bosluk\'), 60)">' + ic('arti', 14) + 'Etkinlik ekle</button></div>';
    } else if (ED.yan === 'kelime') {
      const kel = new Map(), f = gl('ekFindWord');
      if (sec) { const on = blokOnizEl(sec, 'icm5'); Object.values(on).forEach(el => el.querySelectorAll('[data-w]').forEach(n => { const w = n.dataset.w; if (w && /[а-яё]/i.test(w) && w.replace(/[^а-яё]/gi, '').length > 2 && !kel.has(w.toLowerCase())) kel.set(w.toLowerCase(), w); }));
        sec.blocks.forEach(b => { if (b.t === 'kelimeler') b.kel.forEach(x => { const w = String(x.ru || '').replace(/[{}]/g, '').trim(); if (w && !kel.has(w.toLowerCase())) kel.set(w.toLowerCase(), w); }); }); }
      const L = [...kel.values()].map(w => ({ w, s: typeof f === 'function' ? f(w) : null }));
      k.innerHTML = '<div class="icm-yan-bl"><h4>Kelime eşleme <span class="ys-rozet kucuk">' + L.length + '</span></h4><p class="ys-kart-alt">Bölümdeki Rusça sözcükler kelime bankasıyla eşleştirilir; öğrenci bir sözcüğe tıkladığında eşleşen kayıt açılır. Çekimli bir sözcüğü sözlük biçimine bağlamak için metinde {=дом:дома} yaz.</p>' +
        (L.length ? L.sort((a, b) => (b.s ? 1 : 0) - (a.s ? 1 : 0)).slice(0, 150).map(x => '<div class="icm-yan-oge sabit"><span><b>' + esc(x.w) + '</b><small>' + (x.s ? esc(x.s.ru !== x.w ? x.s.ru + ' · ' : '') + esc(x.s.tr || '') : 'Kelime bankasında yok') + '</small></span>' + (x.s ? '<span class="yp-durum d-yesil">Eşleşti</span>' : '<button type="button" class="yp-btn kucuk" onclick="icmKelimeEkle(\'' + jsq(x.w) + '\')">Bankaya ekle</button>') + '</div>').join('') : '<div class="yp-bos kucuk"><span>Bu bölümde işaretli sözcük yok.</span></div>') + '</div>';
    } else if (ED.yan === 'not') {
      const kartlar = sec ? sec.blocks.map((b, bi) => ({ b, bi })).filter(x => x.b.t === 'kartlar') : [];
      let h = '<div class="icm-yan-bl"><h4>Çalışma kartları <span class="ys-rozet kucuk">' + kartlar.reduce((a, x) => a + x.b.cards.length, 0) + '</span></h4>' + (kartlar.length ? kartlar.map(x => '<button type="button" class="icm-yan-oge" onclick="icmEdBlokAc(' + x.bi + ')"><span><b>' + x.b.cards.length + ' kart</b><small>' + esc(x.b.cards.map(c => String(c.on || '').replace(/\{\{|\}\}/g, '')).slice(0, 3).join(' · ')) + '</small></span></button>').join('') : '<div class="yp-bos kucuk"><span>Bu bölümde kart yok.</span></div>') +
        '<button type="button" class="yp-btn kucuk" onclick="icmEdGor(\'bloklar\'); setTimeout(() => icmBlokEkle(\'icm-ed-bloklar\', \'son\', \'kartlar\'), 60)">' + ic('arti', 14) + 'Kart bloğu ekle</button></div><div class="icm-yan-bl"><h4>Bağlı özet notları</h4><div id="icm-ed-notlar"><div class="admin-loading">Yükleniyor...</div></div></div>';
      k.innerHTML = h; edNotlar(sec);
    }
  }
  async function edNotlar(sec) {
    const k = $('icm-ed-notlar'); if (!k) return;
    if (!ED.notlar) { try { const { data } = await sb.from('ozet_notlar').select('id, baslik, konu, aktif'); ED.notlar = data || []; } catch (e) { ED.notlar = []; } }
    const kon = new Set(sec ? sec.konular : []), L = ED.notlar.filter(n => n.konu && kon.has(n.konu));
    k.innerHTML = (L.length ? L.map(n => '<button type="button" class="icm-yan-oge" onclick="icmNotAc(\'' + n.id + '\')"><span><b>' + esc(n.baslik) + '</b><small>' + esc(n.konu) + (n.aktif === false ? ' · gizli' : '') + '</small></span></button>').join('') : '<div class="yp-bos kucuk"><span>' + (kon.size ? 'Bu bölümün konularına bağlı not yok.' : 'Not bağlamak için önce bölüme konu ekle.') + '</span></div>') +
      (kon.size ? '<button type="button" class="yp-btn kucuk" onclick="icmNotYeni(\'' + jsq([...kon][0]) + '\')">' + ic('arti', 14) + 'Bu konuya not ekle</button>' : '');
  }
  async function cikmadanOnce() { if (!ED.acik || !ED.kirli) return true; return uiConfirm('Düzenleyicide kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?', 'Kaydedilmemiş değişiklik', { danger: true, confirmText: 'Kaydetmeden çık' }); }
  window.icmNotAc = async id => { if (!(await cikmadanOnce())) return; ED.acik = false; ED.kirli = false; ypDuzenle('ozet', id); };
  window.icmNotYeni = async kod => { if (!(await cikmadanOnce())) return; ED.acik = false; ED.kirli = false; await ypYeni('ozet'); setTimeout(() => { const s = $('oz-konu'); if (s) s.value = kod; }, 500); };
  window.icmKelimeEkle = async w => { if (!(await cikmadanOnce())) return; ED.acik = false; ED.kirli = false; ypGit('content'); setTimeout(() => { if (window.ysKelYeni) window.ysKelYeni(); const i = $('cw-ru'); if (i) i.value = w; }, 900); };
  window.icmEdYan = y => { ED.yan = y; edYan(); };
  window.icmEdBlokAc = bi => { ED.gorunum = 'bloklar'; BL_ACIK['icm-ed-bloklar'] = { bi, odak: true }; icmEdYenile(false); };
  window.icmEdMeta = () => {
    let src = edSrc(); const v = id => (($(id) || {}).value || '').trim(), sat = (re, yeni) => { src = mfBaslikYaz(src, re, yeni); };
    if (ED.mod === 'set') {
      if (v('ed-set')) sat(/^@set\s/i, '@set ' + mfAdTemiz(v('ed-set')));
      if (v('ed-sev')) sat(/^@seviye\s/i, '@seviye ' + v('ed-sev').toUpperCase());
      const kt = v('ed-kitap'); if (/^\d+\.\d+$/.test(kt)) sat(/^@kitap\s/i, '@kitap ' + kt); else if (!kt) src = src.split('\n').filter(l => !/^@kitap\s/i.test(l.trim())).join('\n');
      if (v('ed-acik')) sat(/^@a[çc][ıi]klama\s/i, '@açıklama ' + v('ed-acik').replace(/[\r\n]+/g, ' '));
    } else {
      const mno = parseInt(v('ed-mno'), 10), uno = parseInt(v('ed-uno'), 10);
      if (mno) sat(/^@mod[üu]l\s/i, '@modül ' + mno + ' | ' + mfAdTemiz(v('ed-mad') || ''));
      if (uno) sat(/^@[üu]nite\s/i, '@ünite ' + uno + ' | ' + mfAdTemiz(v('ed-uad') || ''));
      if (v('ed-sev')) src = mfSeviyeYaz(src, v('ed-sev').toUpperCase());
    }
    $('ek-src').value = src; ED.kirli = true; icmEdYenile(false);
  };
  window.icmEdBolumAd = () => { const ad = mfAdTemiz(($('ed-bad') || {}).value || ''); if (!ad) return; $('ek-src').value = mfDersAdYaz(edSrc(), ED.si, ad); ED.kirli = true; icmEdYenile(false); };
  window.icmEdKonu = async (is, kod) => {
    const s = ED.p && ED.p.sections[ED.si]; if (!s || ED.mod === 'set') return;
    let liste = s.konular.slice();
    if (is === 'cikar') liste = liste.filter(k => k !== kod); else if (!liste.includes(kod)) liste.push(kod);
    $('ek-src').value = mfKonuYaz(edSrc(), ED.si, liste); ED.kirli = true; icmEdYenile(false);
  };
  window.icmEdBolumSil = async () => {
    const p = ED.p, s = p && p.sections[ED.si]; if (!s || !s.ln) return;
    if (!(await uiConfirm('"' + (s.tur === 'ders' ? 'Ders ' + s.no + ' — ' : '') + s.ad + '" bölümü ve içindeki ' + s.blocks.length + ' blok silinsin mi? Kaydedene kadar geri alabilirsin (sürüm geçmişi).', 'Bölümü sil', { danger: true }))) return;
    const L = edSrc().replace(/\r/g, '').split('\n'), R = blokAraliklari(p, ED.si, L);
    L.splice(R.st - 1, R.en - R.st + 1); $('ek-src').value = L.join('\n'); ED.si = Math.max(0, ED.si - 1); ED.kirli = true; icmEdYenile(false);
  };
  MENULER.edbolum = () => ED.mod === 'set' ? [] : [{ ic: 'kitap', ad: 'Ders ekle', fn: "icmEdBolumEkle('ders')" }, { ic: 'not', ad: 'Ünite özeti ekle', fn: "icmEdBolumEkle('ozet')" }, { ic: 'paragraf', ad: 'Okuma bölümü ekle', fn: "icmEdBolumEkle('okuma')" }, { ic: 'soru', ad: 'Ünite testi ekle', fn: "icmEdBolumEkle('test')" }];
  window.icmEdBolumEkle = async t => {
    const ad = mfAdTemiz(await uiPrompt(t === 'ders' ? 'Yeni dersin adı:' : 'Bölümün adı:', { title: 'Bölüm ekle', value: t === 'ozet' ? 'Ünite özeti' : t === 'test' ? 'Ünite testi' : '' })); if (!ad) return;
    let src = edSrc();
    if (t === 'ders') src = mfDersEkleYaz(src, ad).src;
    else src = src.replace(/\s+$/, '') + '\n\n# ' + ({ ozet: 'Özet', okuma: 'Okuma', test: 'Test' })[t] + ' | ' + ad + '\n';
    $('ek-src').value = src; ED.kirli = true;
    const p = ekParse(src); ED.si = t === 'ders' ? p.sections.map((s, i) => ({ s, i })).filter(x => x.s.tur === 'ders').slice(-1)[0].i : p.sections.length - 1;
    ED.gorunum = 'bloklar'; icmEdYenile(false);
  };
  MENULER.edkaydet = () => ED.mod === 'set' ? [{ ic: 'kaydet', ad: 'Taslak olarak kaydet', fn: "icmKaydet(false)" }, { ic: 'onay', ad: 'Kaydet ve yayınla', fn: "icmKaydet(true)" }]
    : [{ ic: 'kaydet', ad: 'Kaydet (durum değişmez)', fn: "icmKaydet()" }, { ic: 'saat', ad: 'Taslak olarak kaydet', fn: "icmKaydet(false)" }, { ic: 'onay', ad: 'Kaydet ve yayınla', fn: "icmKaydet(true)" }];
  window.icmKaydet = async yayinla => {
    const E = gl('EKA') || {};
    const p = ekParse(edSrc(), { set: ED.mod === 'set' });
    if (p.errors.length) { ED.yan = 'rapor'; icmEdYenile(true); uiAlert('Kaydetmeden önce ' + p.errors.length + ' hatayı düzeltmelisin. Sağdaki Rapor sekmesinde satır numaralarıyla listelendi.'); return; }
    if (ED.mod === 'set') { await ekAdmSave(yayinla === undefined ? undefined : yayinla); ED.kirli = false; if (yayinla !== undefined) ED.yayinda = !!yayinla; else if (ED.yayinda == null) ED.yayinda = false; edDurum(); return; }
    const src = edSrc(), toc = p.sections.map(s => ({ tur: s.tur, no: s.no, ad: s.ad }));
    if (p.actSay) toc.push({ tur: 'anahtar', no: null, ad: 'Cevap anahtarı' });
    const row = { modul_no: p.meta.modul_no, modul_ad: p.meta.modul_ad || null, unite_no: p.meta.unite_no, unite_ad: p.meta.unite_ad || null, seviye: p.meta.seviye || null, kaynak: src, toc, konular: [...p.konular], kontrol_say: p.kontrolSay, updated_at: new Date().toISOString() };
    if (yayinla !== undefined) row.yayinda = !!yayinla; else if (!E.editId) row.yayinda = false;
    // Yeni kayıtta aynı modül/ünite numarası varsa üzerine yazmadan önce sor
    try {
      const { data: ayni } = await sb.from('ek_units').select('id, unite_ad').eq('modul_no', row.modul_no).eq('unite_no', row.unite_no).limit(1);
      const cak = (ayni || []).find(x => String(x.id) !== String(E.editId));
      if (cak && E.editId) { uiAlert('Modül ' + row.modul_no + ' · Ünite ' + row.unite_no + ' numarası başka bir üniteye ait ("' + (cak.unite_ad || '') + '"). Bölüm sekmesinden farklı bir ünite numarası seç.'); return; }
      if (cak && !(await uiConfirm('Modül ' + row.modul_no + ' · Ünite ' + row.unite_no + ' numarasıyla zaten bir ünite var ("' + (cak.unite_ad || '') + '"). Kaydedersen o ünitenin içeriği bu metinle değiştirilir. Devam edilsin mi?', 'Ünite numarası çakışıyor', { danger: true, confirmText: 'Üzerine yaz' }))) return;
    } catch (e) {}
    try {
      const res = E.editId ? await sb.from('ek_units').update(row).eq('id', E.editId).select('id, yayinda').single() : await sb.from('ek_units').upsert(row, { onConflict: 'modul_no,unite_no' }).select('id, yayinda').single();
      if (res.error) throw res.error;
      E.editId = res.data.id; ED.yayinda = !!res.data.yayinda; ED.kirli = false;
      const EKg = gl('EK'); if (EKg) { EKg.loaded = false; if (EKg.unit && EKg.unit.id === E.editId) { EKg.unit = null; EKg.pages = []; } }
      surumKaydet(E.editId, src, ED.yayinda, yayinla === true ? 'Yayınlandı' : yayinla === false ? 'Taslak' : null);
      toast(yayinla === true ? 'Ünite kaydedildi ve yayınlandı.' : 'Ünite kaydedildi.');
      edDurum(); EKL.rows = [];
    } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
  };
  window.icmEdKapat = async () => { if (!(await cikmadanOnce())) return; ED.acik = false; ED.kirli = false; edGoster(false); if (ED.mod === 'set') setListeCiz(); else ekListeCiz(); };
  window.icmEdAc = async (id, si) => {
    if (ED.acik && ED.kirli && !(await cikmadanOnce())) return;
    const E = gl('EKA'); if (E) E.mode = 'unit';
    if (si != null) ED._acSi = si;
    if (icS().tab !== 'unite') { const IC_ = icS(); IC_.tab = 'unite'; icmSekmeCiz(); ICM_SEKME.forEach(s => { const p = $('icm-' + s[0]); if (p) p.style.display = s[0] === 'unite' ? '' : 'none'; }); }
    if (typeof ekAdmEdit === 'function') ekAdmEdit(id);
  };
  window.icmEdYeni = async () => { if (ED.acik && ED.kirli && !(await cikmadanOnce())) return; const E = gl('EKA'); if (E) E.mode = 'unit'; if (typeof ekAdmNew === 'function') ekAdmNew(); };

  /* ---------- Sürüm geçmişi ---------- */
  window.icmSurumler = async id => {
    const E = gl('EKA') || {}; id = id || E.editId;
    if (!id) { uiAlert('Sürüm geçmişi ünite ilk kez kaydedildikten sonra oluşur.'); return; }
    let rows = null, hata = false;
    try { const { data, error } = await sb.from('ek_unit_surumler').select('id, created_at, not_metni, yayinda, kaynak').eq('unit_id', id).order('created_at', { ascending: false }).limit(60); if (error) throw error; rows = data || []; } catch (e) { hata = true; }
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'icm-surum-m';
    const simdi = ED.acik ? edSrc() : null;
    ov.innerHTML = '<div class="ui-modal ys-modal genis" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('saat', 20) + '</span><h3>Sürüm geçmişi</h3><button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'icm-surum-m\').remove()">' + ic('kapat', 17) + '</button></div>' +
      (hata ? '<div class="ys-uyari">' + ic('bilgi', 18) + '<span>Sürüm tablosu bulunamadı. ekitap_surum_pdf.sql dosyasını Supabase\'de çalıştırdıktan sonra her kayıtta bir sürüm saklanır.</span></div>'
        : !rows.length ? '<div class="yp-bos kucuk"><span>Henüz kayıtlı sürüm yok. Bundan sonraki her kayıtta bir sürüm saklanır.</span></div>'
        : '<div class="icm-surumler">' + rows.map((r, i) => { const n = r.kaynak.split('\n').length, f = simdi != null ? satirFarki(simdi, r.kaynak) : null;
          return '<div class="icm-surum"><span class="icm-ic r-' + (i ? 'gri' : 'yesil') + '">' + ic(i ? 'saat' : 'onay', 15) + '</span><span><b>' + new Date(r.created_at).toLocaleString('tr-TR') + (i ? '' : ' · en son') + '</b><small>' + n + ' satır' + (r.not_metni ? ' · ' + esc(r.not_metni) : '') + (r.yayinda ? ' · yayında' : '') + (f ? ' · şimdikine göre +' + f[0] + ' / −' + f[1] + ' satır' : '') + '</small></span>' +
            '<button type="button" class="yp-btn kucuk" onclick="icmSurumYukle(' + r.id + ', ' + id + ')">Bu sürümü aç</button></div>'; }).join('') + '</div>') +
      '<div class="ys-modal-alt"><button type="button" class="yp-btn" onclick="document.getElementById(\'icm-surum-m\').remove()">Kapat</button></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ED._surumler = rows || [];
  };
  function satirFarki(a, b) { const A = new Map(), B = new Map(); a.split('\n').forEach(l => A.set(l, (A.get(l) || 0) + 1)); b.split('\n').forEach(l => B.set(l, (B.get(l) || 0) + 1)); let ek = 0, cik = 0; B.forEach((n, l) => { const m = A.get(l) || 0; if (n > m) ek += n - m; }); A.forEach((n, l) => { const m = B.get(l) || 0; if (n > m) cik += n - m; }); return [ek, cik]; }
  window.icmSurumYukle = async (sid, unitId) => {
    const r = (ED._surumler || []).find(x => x.id === sid); if (!r) return;
    const E = gl('EKA') || {};
    if (!ED.acik || String(E.editId) !== String(unitId)) { const m = $('icm-surum-m'); if (m) m.remove(); await icmEdAc(unitId); await new Promise(c => setTimeout(c, 700)); }
    if (!(await uiConfirm(new Date(r.created_at).toLocaleString('tr-TR') + ' tarihli sürüm düzenleyiciye yüklensin mi? Kaydet\'e basana kadar yayındaki ünite değişmez.', 'Sürümü aç', { confirmText: 'Yükle' }))) return;
    $('ek-src').value = r.kaynak; ED.kirli = true; const m = $('icm-surum-m'); if (m) m.remove(); icmEdYenile(true); toast('Sürüm yüklendi. Kalıcı olması için kaydet.');
  };

  /* ---------- PDF olarak dışa aktar (yazdır → PDF) ---------- */
  window.icmPdfIndir = () => {
    const p = ED.p || ekParse(edSrc(), { set: ED.mod === 'set' });
    const kap = document.createElement('div'); onizlemeCiz(kap, p, null, false);
    kap.querySelectorAll('input.ek-blank').forEach(i => { const s = document.createElement('span'); s.className = 'pdf-bosluk'; i.replaceWith(s); });
    kap.querySelectorAll('button').forEach(b => { if (!b.closest('.ek-opts')) b.remove(); });
    const baslik = ED.mod === 'set' ? (p.meta.baslik || 'Çalışma seti') : ('Modül ' + (p.meta.modul_no || '') + ' · Ünite ' + (p.meta.unite_no || '') + ' — ' + (p.meta.unite_ad || ''));
    const w = window.open('', '_blank'); if (!w) { uiAlert('Açılır pencere engellendi; tarayıcıda bu site için açılır pencerelere izin ver.'); return; }
    const kok = location.origin + location.pathname.replace(/[^/]*$/, '');
    w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + esc(baslik) + '</title><link rel="stylesheet" href="' + kok + 'css/style.css"><link rel="stylesheet" href="' + kok + 'css/ekitap.css">' +
      '<style>body{background:#fff;margin:0;padding:24px 32px;font-family:Inter,sans-serif;color:#1f2a37}.pdf-bas{border-bottom:2px solid #c9a84c;margin-bottom:18px;padding-bottom:8px}.pdf-bas h1{font:700 1.5rem "PT Serif",serif;color:#0d1b2a;margin:0}.pdf-bas small{color:#8a8270}.icm-sayfa-sonu{break-after:page;page-break-after:always;height:0;border:0}.icm-sayfa-sonu span{display:none}.pdf-bosluk{display:inline-block;min-width:70px;border-bottom:1px solid #333;margin:0 3px}.ek-act,.ek-box,.ek-tbl-wrap,.ek-ornek,.ek-kutular{break-inside:avoid}.ek-lesson-head{break-before:auto}@page{margin:16mm}</style></head><body>' +
      '<div class="pdf-bas"><h1>' + esc(baslik) + '</h1><small>YDT-YDS Rusça · ' + new Date().toLocaleDateString('tr-TR') + '</small></div>' + kap.innerHTML + '</body></html>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 900);
  };

  /* ---------- PDF: içe aktarma motoru ---------- */
  const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfjsSoz = null;
  function pdfjsYukle() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsSoz) return pdfjsSoz;
    pdfjsSoz = new Promise((coz, red) => {
      const s = document.createElement('script'); s.src = PDFJS_URL; s.async = true;
      s.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; coz(window.pdfjsLib); } catch (e) { red(e); } };
      s.onerror = () => { pdfjsSoz = null; red(new Error('PDF okuyucu yüklenemedi (internet bağlantısını kontrol et).')); };
      document.head.appendChild(s);
    });
    return pdfjsSoz;
  }
  async function pdfAc(kaynak) { const lib = await pdfjsYukle(); return lib.getDocument(kaynak instanceof ArrayBuffer ? { data: kaynak } : { url: kaynak }).promise; }
  async function pdfSayfaCiz(doc, no, kanvas, genislik) {
    const sf = await doc.getPage(no), v1 = sf.getViewport({ scale: 1 }), olcek = genislik / v1.width, oran = window.devicePixelRatio || 1;
    const v = sf.getViewport({ scale: olcek * oran });
    kanvas.width = v.width; kanvas.height = v.height; kanvas.style.width = genislik + 'px'; kanvas.style.height = (v.height / oran) + 'px';
    await sf.render({ canvasContext: kanvas.getContext('2d'), viewport: v }).promise;
  }
  // Motor: PDF'in metin katmanını satırlara, satırları ders / başlık / kutu / tablo / liste / paragraf bloklarına dönüştürür (yapay zekâ kullanılmaz)
  const PDF_KUTU = [[/^(dikkat|внимание|uyarı)$/i, 'dikkat'], [/^(altın kural|kural|правило|запомни|запомните|unutma)$/i, 'altın'], [/^(ipucu|совет|подсказка)$/i, 'ipucu'], [/^(istisna|исключение|исключения)$/i, 'istisna'], [/^(not|bilgi|примечание|заметка)$/i, 'bilgi']];
  async function pdfYaziTipleri(sf, tc) {
    const ad = {}, ids = [...new Set(tc.items.map(it => it.fontName).filter(Boolean))];
    try { await sf.getOperatorList(); } catch (e) {}
    ids.forEach(id => {
      let n = ''; try { const f = sf.commonObjs.has(id) ? sf.commonObjs.get(id) : null; n = (f && (f.name || f.loadedName)) || ''; } catch (e) {}
      const st = (tc.styles && tc.styles[id]) || {}; n += ' ' + (st.fontFamily || '');
      ad[id] = { b: /bold|black|heavy|semibold|demi|extrabold|ultrabold|\bbd\b/i.test(n), i: /italic|oblique|kursiv/i.test(n) };
    });
    return ad;
  }
  function pdfSatirMetin(l) {
    // Satırı parçaların kalın / eğik bilgisiyle yazar; satırın tamamı kalınsa işaret koymaz (başlık adayı olur)
    const H = l.hucre.map(h => h.p);
    const tumKalin = l.p.every(p => p.b || !p.s.trim()), tumEgik = l.p.every(p => p.i || !p.s.trim());
    const yaz = P => {
      let s = '', acB = false, acI = false;
      const kapat = () => { let k = ''; if (acI) { k += '*'; acI = false; } if (acB) { k += '**'; acB = false; } return k; };
      P.forEach((p, k) => {
        const ara = k && p.ara ? ' ' : '', b = p.b && !tumKalin, i = p.i && !tumEgik && !b;
        if ((acB && !b) || (acI && !i)) { s = s.replace(/\s+$/, ''); s += kapat(); }
        s += ara;
        if (b && !acB) { s += '**'; acB = true; }
        if (i && !acI) { s += '*'; acI = true; }
        s += p.s;
      });
      s = s.replace(/\s+$/, '') + kapat();
      return s.replace(/\s+/g, ' ').trim().replace(/\*\*\*\*/g, '');
    };
    l.t = yaz(l.p);
    l.duz = l.p.map((p, k) => (k && p.ara ? ' ' : '') + p.s).join('').replace(/\s+/g, ' ').trim();
    l.hucreler = H.map(P => yaz(P).replace(/\|/g, '/'));
    l.kalin = tumKalin; l.egik = tumEgik;
  }
  async function pdfMotor(doc, bas, son, sec, ilerleme) {
    const sayfalar = [];
    for (let n = bas; n <= son; n++) {
      const sf = await doc.getPage(n), tc = await sf.getTextContent(), vh = sf.getViewport({ scale: 1 }).height;
      const FT = sec.bicim ? await pdfYaziTipleri(sf, tc) : {};
      const parca = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10, w: it.width || 0, b: !!(FT[it.fontName] || {}).b, i: !!(FT[it.fontName] || {}).i }));
      parca.sort((a, b) => b.y - a.y || a.x - b.x);
      const satirlar = [];
      parca.forEach(p => {
        const l = satirlar[satirlar.length - 1];
        if (l && Math.abs(l.y - p.y) < Math.max(l.h, p.h) * 0.55) {
          const bosluk = p.x - (l.xs + l.ws);
          p.ara = bosluk > p.h * 0.18 && !/\s$/.test(l.p[l.p.length - 1].s) && !/^\s/.test(p.s);
          if (bosluk > Math.max(l.h, p.h) * 1.6) l.hucre.push({ x: p.x, p: [Object.assign({}, p, { ara: false })] }); else l.hucre[l.hucre.length - 1].p.push(p);
          l.p.push(p); l.h = Math.max(l.h, p.h); l.xs = p.x; l.ws = p.w;
        } else satirlar.push({ y: p.y, h: p.h, x: p.x, xs: p.x, ws: p.w, p: [Object.assign(p, { ara: false })], hucre: [{ x: p.x, p: [p] }] });
      });
      satirlar.forEach(l => { pdfSatirMetin(l); l.ust = l.y > vh * 0.93; l.alt = l.y < vh * 0.07; });
      sayfalar.push(satirlar.filter(l => l.duz));
      if (ilerleme) ilerleme(n - bas + 1, son - bas + 1);
    }
    // Her sayfada tekrar eden üst / alt bilgi ve sayfa numaraları atılır
    const anah = l => l.duz.replace(/\d+/g, '#');
    const say = {}; sayfalar.forEach(L => new Set(L.filter(l => l.ust || l.alt).map(anah)).forEach(k => say[k] = (say[k] || 0) + 1));
    const tekrar = new Set(Object.keys(say).filter(k => sayfalar.length >= 2 && say[k] >= Math.max(2, sayfalar.length * 0.5)));
    const boylar = []; sayfalar.forEach(L => L.forEach(l => { for (let i = 0; i < Math.min(l.duz.length, 80); i++) boylar.push(Math.round(l.h * 2) / 2); }));
    boylar.sort((a, b) => a - b); const govde = boylar.length ? boylar[Math.floor(boylar.length / 2)] : 11;
    const kac = s => /^(#|@|:::|---|\||!\[|\d+[.)]\s|[-*]\s)/.test(s) ? '‌' + s : s;
    const out = []; let dersVar = false, para = [], kutu = null, tablo = [];
    const sat = s => { out.push(s); }, ayir = () => { if (out.length && out[out.length - 1] !== '') out.push(''); };
    const paraBitir = () => {
      const metin = para.join(' ').replace(/(\S)- (\p{Ll})/gu, '$1$2').replace(/\*\* \*\*/g, ' '); para = [];
      if (kutu) { ayir(); sat(':::' + kutu.tur + (kutu.baslik ? ' ' + kutu.baslik : '')); if (metin) sat(metin.replace(/^:::/, '‌:::')); sat(':::'); sat(''); kutu = null; return; }
      if (metin) { ayir(); sat(kac(metin)); sat(''); }
    };
    const tabloBitir = () => {
      if (!tablo.length) return;
      if (tablo.length < 2) { para.push(tablo[0].join(' ')); tablo = []; return; }
      ayir(); const sut = Math.max(...tablo.map(r => r.length));
      tablo.forEach((r, k) => { while (r.length < sut) r.push(''); sat('| ' + r.join(' | ') + ' |'); if (!k) sat('|' + Array(sut).fill('---').join('|') + '|'); });
      sat(''); tablo = [];
    };
    const blokBitir = () => { tabloBitir(); paraBitir(); };
    sayfalar.forEach((L, si) => {
      let oncekiY = null, oncekiH = govde;
      L.forEach(l => {
        if ((l.ust || l.alt) && l.h <= govde * 1.1 && (tekrar.has(anah(l)) || /^\d{1,4}$/.test(l.duz))) return;
        if (/^\d{1,4}$/.test(l.duz) && (l.ust || l.alt)) return;
        const bosluk = oncekiY == null ? 0 : (oncekiY - l.y);
        let m;
        if (sec.tablo && l.hucreler.length >= 2 && l.duz.length < 200) {
          if (para.length || kutu) paraBitir();
          if (tablo.length && bosluk > oncekiH * 2.6) tabloBitir();
          tablo.push(l.hucreler.slice());
        }
        else if (sec.ders && (m = l.duz.match(/^(?:Ders|Урок|Lesson)\s*(\d+)\s*[.:|\-–—]?\s*(.*)$/i))) { blokBitir(); ayir(); sat('# Ders ' + m[1] + ' | ' + (m[2] || 'Ders ' + m[1]).replace(/\|/g, '/')); sat(''); dersVar = true; }
        else if (sec.baslik && l.duz.length < 120 && (l.h >= govde * 1.45 || (l.h >= govde * 1.18 && /^\d+(?:\.\d+)+\.?\s/.test(l.duz)))) { blokBitir(); ayir(); m = l.duz.match(/^(\d+(?:\.\d+)+)\.?\s+(.+)$/); sat(m ? '## ' + m[1] + ' ' + m[2] : '## ' + l.duz); sat(''); }
        else if (sec.baslik && l.duz.length < 90 && (l.h >= govde * 1.18 || (l.kalin && !/[.,;]$/.test(l.duz) && !/^[•●▪◦■□➢►–-]/.test(l.duz)))) { blokBitir(); ayir(); sat('### ' + l.duz); sat(''); }
        else if (sec.kutu && (m = l.duz.match(/^([\p{L} ]{2,14}?)\s*[:!]\s*(.*)$/u)) && PDF_KUTU.some(k => k[0].test(m[1].trim()))) {
          blokBitir(); const tur = PDF_KUTU.find(k => k[0].test(m[1].trim()))[1];
          kutu = { tur, baslik: m[1].trim().replace(/^./, c => c.toLocaleUpperCase('tr')) };
          const govdeMetin = l.t.replace(/^\**[^:!]*[:!]\**\s*/, ''); if (govdeMetin) para.push(govdeMetin);
        }
        else if ((m = l.t.match(/^[•●▪◦■□➢►–-]\s*(.+)$/))) { blokBitir(); sat('- ' + m[1]); }
        else if ((m = l.t.match(/^(\d{1,2})[.)]\s+(.+)$/))) { blokBitir(); sat(m[1] + '. ' + m[2]); }
        else {
          tabloBitir();
          if (para.length && (bosluk > oncekiH * 1.9 || /[.!?:»"]\**$/.test(para[para.length - 1]) && bosluk > oncekiH * 1.45)) paraBitir();
          else if (!para.length && !kutu && out.length && /^(- |\d+\. )/.test(out[out.length - 1])) sat('');
          para.push(l.t);
        }
        oncekiY = l.y; oncekiH = l.h;
      });
      blokBitir();
      if (sec.sayfa && si < sayfalar.length - 1) { if (out.length && out[out.length - 1] !== '') sat(''); sat('---sayfa---'); sat(''); }
    });
    return { metin: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), dersVar, satir: sayfalar.reduce((a, L) => a + L.length, 0) };
  }
  const PI = { dosya: null, doc: null, hedef: 'yeni' };
  window.icmPdfAc = async () => {
    if (ED.acik && ED.kirli && !(await cikmadanOnce())) return;
    PI.dosya = null; PI.doc = null;
    const R = EKL.rows.length ? EKL.rows : ((gl('MF') || {}).rows || []);
    const mNo = R.reduce((a, r) => Math.max(a, r.modul_no || 0), 0) || 1, uNo = R.filter(r => r.modul_no === mNo).reduce((a, r) => Math.max(a, r.unite_no || 0), 0) + 1;
    const ov = document.createElement('div'); ov.className = 'ui-modal-overlay show ys-modal-ov'; ov.id = 'icm-pdf-m';
    ov.innerHTML = '<div class="ui-modal ys-modal genis icm-pdf-m" role="dialog" aria-modal="true"><div class="ys-modal-bas"><span class="ys-ayar-ic">' + ic('yukle', 20) + '</span><h3>PDF\'den e-kitap ünitesi oluştur</h3><button type="button" class="yp-ikon-b" aria-label="Kapat" onclick="document.getElementById(\'icm-pdf-m\').remove()">' + ic('kapat', 17) + '</button></div>' +
      '<label class="icm-pdf-birak" id="icm-pdf-birak"><input type="file" accept="application/pdf,.pdf" onchange="icmPdfSec(this.files[0])"><span class="ys-ayar-ic">' + ic('yukle', 22) + '</span><span><b>PDF dosyasını seç ya da buraya bırak</b><small>En fazla 40 MB. Metin katmanı olan (taranmış görüntü olmayan) PDF\'ler en iyi sonucu verir.</small></span></label>' +
      '<div id="icm-pdf-bilgi"></div>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Hedef</span><select id="icm-pdf-hedef" class="ys-girdi" onchange="document.getElementById(\'icm-pdf-yeni\').style.display = this.value === \'yeni\' ? \'\' : \'none\'"><option value="yeni">Yeni ünite oluştur</option>' + R.map(r => '<option value="' + r.id + '">Mevcut: Modül ' + r.modul_no + ' · Ünite ' + r.unite_no + ' — ' + esc(r.unite_ad || '') + ' (metni değiştirilir)</option>').join('') + '</select></label>' +
      '<div class="ys-iki"><label class="ys-alan"><span>İlk sayfa</span><input id="icm-pdf-bas" class="ys-girdi" type="number" min="1" value="1"></label><label class="ys-alan"><span>Son sayfa</span><input id="icm-pdf-son" class="ys-girdi" type="number" min="1" value="1"></label></div></div>' +
      '<div id="icm-pdf-yeni"><div class="ys-uclu"><label class="ys-alan"><span>Modül no</span><input id="icm-pdf-mno" class="ys-girdi" type="number" min="1" value="' + mNo + '"></label><label class="ys-alan"><span>Ünite no</span><input id="icm-pdf-uno" class="ys-girdi" type="number" min="1" value="' + uNo + '"></label>' +
      '<label class="ys-alan"><span>Seviye</span><select id="icm-pdf-sev" class="ys-girdi"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label></div>' +
      '<div class="ys-iki"><label class="ys-alan"><span>Modül adı</span><input id="icm-pdf-mad" class="ys-girdi" value="' + esc((R.find(r => r.modul_no === mNo) || {}).modul_ad || '') + '"></label><label class="ys-alan"><span>Ünite adı</span><input id="icm-pdf-uad" class="ys-girdi" placeholder="ör. İsimler: Cinsiyet ve Çokluk"></label></div></div>' +
      '<div class="icm-pdf-sec"><label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-ders" checked><i></i><span>"Ders 1 / Урок 1" satırlarını ders başlığı yap</span></label>' +
      '<label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-baslik" checked><i></i><span>Büyük yazıları başlık yap</span></label><label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-sayfa" checked><i></i><span>PDF sayfalarını sayfa sonuyla ayır</span></label>' +
      '<label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-bicim" checked><i></i><span>Kalın ve eğik yazıları koru</span></label><label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-kutu" checked><i></i><span>"Dikkat:", "Kural:", "İpucu:" satırlarını kutuya çevir</span></label>' +
      '<label class="ys-anahtar kucuk"><input type="checkbox" id="icm-pdf-o-tablo" checked><i></i><span>Sütunlu satırları tabloya çevir</span></label></div>' +
      '<div class="ys-not">' + ic('bilgi', 18) + '<div><span>Dönüştürme motoru PDF\'in metnini, yazı tiplerini, boyutlarını, sütunlarını ve satır aralıklarını okuyarak ders, başlık, kutu, tablo, liste ve paragraf blokları üretir; kalın ve eğik yazıları korur. Yapay zekâ kullanmaz. Etkinlikler otomatik tanınmaz; sonuç doğrudan düzenleyiciye aktarılır, orada araç çubuğuyla biçimlendirip etkinlik ekleyebilirsin. Ünite sen kaydedene kadar oluşturulmaz.</span></div></div>' +
      '<div id="icm-pdf-ilerleme"></div><div class="ys-modal-alt"><button type="button" class="yp-btn" onclick="document.getElementById(\'icm-pdf-m\').remove()">Vazgeç</button><button type="button" class="yp-btn ana" id="icm-pdf-don" disabled onclick="icmPdfDonustur()">' + ic('sihir', 16) + 'Dönüştür ve düzenleyicide aç</button></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    const b = $('icm-pdf-birak');
    ['dragover', 'dragenter'].forEach(t => b.addEventListener(t, e => { e.preventDefault(); b.classList.add('ust'); }));
    ['dragleave', 'drop'].forEach(t => b.addEventListener(t, e => { e.preventDefault(); b.classList.remove('ust'); }));
    b.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) icmPdfSec(f); });
  };
  window.icmPdfSec = async f => {
    const bilgi = $('icm-pdf-bilgi'); if (!f || !bilgi) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { uiAlert('Lütfen bir PDF dosyası seç.'); return; }
    if (f.size > 40 * 1024 * 1024) { uiAlert('PDF en fazla 40 MB olabilir.'); return; }
    bilgi.innerHTML = '<div class="admin-loading">PDF okunuyor...</div>';
    try {
      PI.dosya = f; PI.doc = await pdfAc(await f.arrayBuffer());
      const n = PI.doc.numPages; $('icm-pdf-son').value = n; $('icm-pdf-son').max = n; $('icm-pdf-bas').max = n;
      const uad = $('icm-pdf-uad'); if (uad && !uad.value) uad.value = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').slice(0, 80);
      bilgi.innerHTML = '<div class="icm-pdf-ozet"><b>' + esc(f.name) + '</b><small>' + n + ' sayfa · ' + (f.size / 1048576).toFixed(1) + ' MB</small></div><div class="icm-pdf-kucuk" id="icm-pdf-kucuk"></div>';
      const k = $('icm-pdf-kucuk');
      for (let i = 1; i <= Math.min(n, 8); i++) { const c = document.createElement('canvas'); k.appendChild(c); await pdfSayfaCiz(PI.doc, i, c, 90); }
      if (n > 8) k.insertAdjacentHTML('beforeend', '<span class="ys-soluk">+' + (n - 8) + ' sayfa</span>');
      $('icm-pdf-don').disabled = false;
    } catch (e) { bilgi.innerHTML = '<div class="ys-uyari">' + ic('hata', 18) + '<span>PDF açılamadı: ' + esc((e && e.message) || e) + '</span></div>'; PI.doc = null; }
  };
  window.icmPdfDonustur = async () => {
    if (!PI.doc) return;
    const n = PI.doc.numPages, bas = Math.max(1, Math.min(n, parseInt($('icm-pdf-bas').value, 10) || 1)), son = Math.max(bas, Math.min(n, parseInt($('icm-pdf-son').value, 10) || n));
    const ilr = $('icm-pdf-ilerleme'), dugme = $('icm-pdf-don'); dugme.disabled = true;
    try {
      const r = await pdfMotor(PI.doc, bas, son, { ders: $('icm-pdf-o-ders').checked, baslik: $('icm-pdf-o-baslik').checked, sayfa: $('icm-pdf-o-sayfa').checked, bicim: $('icm-pdf-o-bicim').checked, kutu: $('icm-pdf-o-kutu').checked, tablo: $('icm-pdf-o-tablo').checked }, (i, t) => { ilr.innerHTML = '<div class="icm-ilerleme"><i style="width:' + Math.round(i / t * 100) + '%"></i></div><small class="ys-soluk">Sayfa ' + i + ' / ' + t + ' okunuyor…</small>'; });
      if (!r.satir) { ilr.innerHTML = '<div class="ys-uyari">' + ic('hata', 18) + '<span>Bu PDF\'te okunabilir metin bulunamadı (büyük olasılıkla taranmış görüntü). Metni düzenleyicide elle girmen gerekecek.</span></div>'; }
      const hedef = $('icm-pdf-hedef').value, E = gl('EKA') || {};
      let src;
      if (hedef === 'yeni') {
        const mno = parseInt($('icm-pdf-mno').value, 10) || 1, uno = parseInt($('icm-pdf-uno').value, 10) || 1;
        src = '@modül ' + mno + ' | ' + mfAdTemiz($('icm-pdf-mad').value || 'Modül') + '\n@ünite ' + uno + ' | ' + mfAdTemiz($('icm-pdf-uad').value || 'Yeni ünite') + '\n@seviye ' + $('icm-pdf-sev').value + '\n\n' + (r.dersVar ? '' : '# Ders 1 | ' + mfAdTemiz($('icm-pdf-uad').value || 'Ders 1') + '\n\n') + r.metin + '\n';
        if (EKL.rows.some(x => x.modul_no === mno && x.unite_no === uno) && !(await uiConfirm('Modül ' + mno + ' · Ünite ' + uno + ' zaten var. Kaydedersen o ünitenin metni bununla değiştirilir. Devam edilsin mi?', 'Ünite zaten var', { confirmText: 'Devam' }))) { dugme.disabled = false; return; }
      } else {
        const u = EKL.rows.find(x => String(x.id) === hedef) || {};
        let eski = ''; try { const { data } = await sb.from('ek_units').select('kaynak').eq('id', hedef).single(); eski = (data && data.kaynak) || ''; } catch (e) {}
        const meta = eski.split('\n').filter(l => /^@(mod[üu]l|[üu]nite|seviye)\s/i.test(l.trim())).join('\n') || ('@modül ' + u.modul_no + ' | ' + (u.modul_ad || '') + '\n@ünite ' + u.unite_no + ' | ' + (u.unite_ad || ''));
        src = meta + '\n\n' + (r.dersVar ? '' : '# Ders 1 | ' + (u.unite_ad || 'Ders 1') + '\n\n') + r.metin + '\n';
      }
      ED._pdfYeni = true;
      const m = $('icm-pdf-m'); if (m) m.remove();
      E.mode = 'unit';
      if (typeof ekAdmOpenEditor === 'function') ekAdmOpenEditor(src, hedef === 'yeni' ? null : +hedef);
      toast('PDF dönüştürüldü. İçeriği düzenleyip kaydet.');
    } catch (e) { ilr.innerHTML = '<div class="ys-uyari">' + ic('hata', 18) + '<span>Dönüştürülemedi: ' + esc((e && e.message) || e) + '</span></div>'; dugme.disabled = false; }
  };

  /* ---------- Bağlantılar: eski yükleyiciler yeni sayfaları çizsin ---------- */
  function degistir(ad, fn) { window[ad] = fn; try { (0, eval)(ad + ' = window.' + ad); } catch (e) {} }
  function bagla() {
    degistir('adminLoadErrors', function () { return hataYukle(); });
    degistir('adminStaffLogLoad', function () { return islemYukle(); });
    degistir('renderBackupView', function () { yedekCiz(); });
    degistir('renderVisitsFull', function () { return ziyaretYukle(); });
    degistir('renderSeoCheck', function () { seoCiz(); });
    degistir('_gscRender', gscCiz);
    degistir('loadAdminUsers', function () { return kullaniciYukle(); });
    degistir('renderAdminUsers', function () { kullaniciCiz(); });
    degistir('filterAdminUsers', function (q) { UK.ara = q || ''; UK.sayfa = 1; kullaniciCiz(); });
    degistir('adminAssignInit', function () { return atamaYukle(); });
    degistir('adminKurumLoad', function () { return kurumYukle(); });
    degistir('anTargetChange', function () { return bildirimYukle(); });
    degistir('adminLoadTickets', function () { return destekYukle(); });
    degistir('adminLoadMail', function () { return mailYukle(); });
    degistir('renderCwStats', function () { kelimeKpi(); });
    degistir('renderCwList', function () { kelimeListe(); });
    const eskiKat = window.cwCatChanged;
    if (typeof eskiKat === 'function') degistir('cwCatChanged', function () { const r = eskiKat.apply(this, arguments); gramEtiketi(); return r; });
    const eskiTemiz = window.adminWordFormClear;
    if (typeof eskiTemiz === 'function') degistir('adminWordFormClear', function () { const r = eskiTemiz.apply(this, arguments); const b = $('ys-kel-form-b'); if (b) b.textContent = 'Kelime ekle / düzenle'; const s = $('cw-save-btn'); if (s) s.textContent = 'Kelime ekle'; if ($('cw-list')) kelimeListe(); return r; });
    const eskiCv = window.adminCvReload;
    if (typeof eskiCv === 'function') degistir('adminCvReload', async function () { const r = await eskiCv.apply(this, arguments); videoKpi(); return r; });
    degistir('renderCvList', function () { videoListe(); });
    const eskiVdTemiz = window.adminVidFormClear;
    if (typeof eskiVdTemiz === 'function') degistir('adminVidFormClear', function () { const r = eskiVdTemiz.apply(this, arguments); const b = $('ys-vid-form-b'); if (b) b.textContent = 'Video ekle / düzenle'; const s = $('cv-save-btn'); if (s) s.textContent = 'Video ekle'; const d = $('cv-desc-say'); if (d) d.textContent = '0'; return r; });
    const eskiRc = window.adminRcReload;
    if (typeof eskiRc === 'function') degistir('adminRcReload', async function () { const r = await eskiRc.apply(this, arguments); if ($('ys-blog')) { if (BL.sekme === 'blog') blogCiz(); } return r; });
    degistir('renderRcList', function () {});
    degistir('adminRecsInit', function () { return blogYukle(); });
    // İçerik Merkezi
    degistir('icTab', function (t) { return icmSekme(t); });
    const eskiAc = window.ekAdmOpenEditor;
    if (typeof eskiAc === 'function') degistir('ekAdmOpenEditor', function (src, id) { eskiAc.apply(this, arguments); edAc(src, id); });
    degistir('ekAdmList', function () { ED.acik = false; ED.kirli = false; edGoster(false); const E = gl('EKA') || {}; return E.mode === 'set' ? setListeCiz() : ekListeCiz(); });
    const eskiMf = window.mfRender;
    if (typeof eskiMf === 'function') degistir('mfRender', function () { const r = eskiMf.apply(this, arguments); const a = $('icm-agac'); if (a && a.style.display !== 'none') agacCiz(); return r; });
    window.addEventListener('beforeunload', e => { if (ED.acik && ED.kirli) { e.preventDefault(); e.returnValue = ''; } });
    degistir('adminRcFormClear', function () { if ($('ys-bl-form-ic') && BL.sekme === 'blog') { BL.duzen = null; $('ys-bl-form-ic').innerHTML = blogForm(); } });
    ['adminKurumSetAdmin', 'adminKurumRemoveMember'].forEach(ad => {
      const eski = window[ad]; if (typeof eski !== 'function') return;
      degistir(ad, async function () { const r = await eski.apply(this, arguments); if ($('ys-kurum') && $('av-kurumlar').style.display !== 'none') kurumYukle(); return r; });
    });
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
