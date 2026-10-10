/* Geliştirici log — üretimde sessiz. Açmak için: localStorage.setItem('ydt_debug','1') */
/* ===== Cloudflare Turnstile (CAPTCHA) =====
   Kurulum: Cloudflare panel → Turnstile → Add site → Site Key'i aşağıya yapıştır.
   (Secret Key ise Supabase → Auth → Attack Protection'a girilir.)
   Boş bırakılırsa CAPTCHA devre dışı kalır, site normal çalışır. */
var TURNSTILE_SITE_KEY = "0x4AAAAAADuwG7UJkIWquoIL";

var _tsWidgetId = null;
var _tsBekliyor = false;   // pencere açık ama script henüz gelmediyse
var _tsDeneme = 0;
window._tsOnload = function () {  // Turnstile scripti yüklenince Cloudflare bunu çağırır
  if (_tsBekliyor) { _tsBekliyor = false; renderTurnstile(); }
};
function renderTurnstile() {
  if (!TURNSTILE_SITE_KEY) return;
  var box = document.getElementById("turnstile-box");
  if (!box) return;
  if (typeof turnstile === "undefined") {
    // Script henüz inmedi: bekle, kullanıcıya durum göster, birkaç kez yeniden dene
    _tsBekliyor = true;
    box.innerHTML = '<div class="ts-info">Güvenlik doğrulaması yükleniyor…</div>';
    if (_tsDeneme < 6) {
      _tsDeneme++;
      setTimeout(renderTurnstile, 1200);
    } else {
      box.innerHTML = '<div class="ts-info ts-err">⚠️ Doğrulama kutusu yüklenemedi. Sayfayı yenileyin; sorun sürerse ağınız/eklentiniz challenges.cloudflare.com adresini engelliyor olabilir.</div>';
      _tsDeneme = 0;
    }
    return;
  }
  _tsBekliyor = false; _tsDeneme = 0;
  if (_tsWidgetId !== null) { try { turnstile.reset(_tsWidgetId); } catch (e) {} return; }
  box.innerHTML = "";
  try { _tsWidgetId = turnstile.render(box, { sitekey: TURNSTILE_SITE_KEY }); } catch (e) {}
}
function turnstileToken() {
  if (!TURNSTILE_SITE_KEY || _tsWidgetId === null || typeof turnstile === "undefined") return null;
  try { return turnstile.getResponse(_tsWidgetId) || null; } catch (e) { return null; }
}
function turnstileReset() { if (_tsWidgetId !== null && typeof turnstile !== "undefined") { try { turnstile.reset(_tsWidgetId); } catch (e) {} } }

/* Giriş penceresi dışındaki işlemler (şifre sıfırlama, mail tekrar gönderme) için
   küçük bir doğrulama penceresi açar; kullanıcı doğrulayınca token döner. */
function captchaPrompt() {
  return new Promise(function (resolve) {
    if (!TURNSTILE_SITE_KEY || typeof turnstile === "undefined") { resolve(null); return; }
    var ov = document.createElement("div");
    ov.className = "ui-modal-overlay show";
    ov.style.zIndex = "10000";
    ov.innerHTML = '<div class="ui-modal" style="max-width:380px;text-align:center;">' +
      '<div class="ui-modal-title">Güvenlik Doğrulaması</div>' +
      '<div class="ui-modal-msg">Devam etmek için lütfen doğrulamayı tamamla.</div>' +
      '<div id="cap-box" style="margin:14px 0;display:flex;justify-content:center;"></div>' +
      '<div class="ui-modal-btns"><button class="ui-modal-btn ghost" id="cap-cancel">Vazgeç</button></div></div>';
    document.body.appendChild(ov);
    var done = false;
    function finish(t) { if (done) return; done = true; try { ov.remove(); } catch (e) {} resolve(t); }
    ov.querySelector("#cap-cancel").onclick = function () { finish(null); };
    try {
      turnstile.render(ov.querySelector("#cap-box"), {
        sitekey: TURNSTILE_SITE_KEY,
        callback: function (t) { setTimeout(function () { finish(t); }, 350); }
      });
    } catch (e) { finish(null); }
  });
}
if (typeof window !== "undefined") window.captchaPrompt = captchaPrompt;

function _logDev() {
  try {
    var isAdmin = (typeof currentProfile !== "undefined" && currentProfile && currentProfile.is_admin);
    if (isAdmin && typeof console !== "undefined") console.log.apply(console, arguments);
  } catch (e) {}
}
// ============================================================
//  GİRİŞ / KAYIT SİSTEMİ (Supabase)
//  - E-posta + şifre ile kayıt ve giriş
//  - Google ile giriş
//  - Oturum yönetimi + profil (Ücretsiz/Premium etiketi)
//  Bu dosya mevcut site koduna dokunmaz; sadece ekler.
// ============================================================

let sb = null;
let currentUser = null;
let currentProfile = null;

function authInit() {
  if (!window.supabase || SUPABASE_URL.startsWith("BURAYA") || SUPABASE_KEY.startsWith("BURAYA")) {
    _logDev("Supabase bilgileri henüz girilmemiş (js/supabase-config.js).");
    return;
  }
  // URL'i temizle: sadece çıplak adresi kullan (fazla /rest/v1, sondaki / vb. at)
  let url = (SUPABASE_URL || "").trim();
  try { url = new URL(url).origin; } catch (e) { _logDev("SUPABASE_URL geçersiz:", url); }
  sb = window.supabase.createClient(url, (SUPABASE_KEY || "").trim());

  // Oturum durumu değişince arayüzü güncelle (giriş, çıkış, Google dönüşü dahil)
  sb.auth.onAuthStateChange((_event, session) => {
    if (_event === "PASSWORD_RECOVERY" && !window._sifirlamaKodla) { setTimeout(function () { if (!window._sifirlamaKodla) openPwReset(); }, 300); }
    handleSession(session);
  });
  // Sayfa açılışında mevcut oturumu yükle
  sb.auth.getSession().then(({ data }) => handleSession(data.session));
}

async function handleSession(session) {
  currentUser = session ? session.user : null;
  if (currentUser) {
    // Hızlı açılış: son bilinen profil bilgisiyle üst barı hemen çiz (yalnız görünüm; yetkiler sunucuda denetlenir)
    if (!currentProfile) { try { const c = JSON.parse(localStorage.getItem('ydt_prof_ui') || 'null'); if (c && c.id === currentUser.id) { currentProfile = c.p; updateAuthUI(); } } catch (e) {} }
    await loadProfile();
    updateAuthUI();
    try { if (currentProfile) localStorage.setItem('ydt_prof_ui', JSON.stringify({ id: currentUser.id, ad: bestName(), p: { display_name: currentProfile.display_name, plan: currentProfile.plan, is_admin: currentProfile.is_admin, role: currentProfile.role, avatar_seed: currentProfile.avatar_seed, premium_until: currentProfile.premium_until } })); } catch (e) {}
    syncName().then(() => updateAuthUI()).catch(() => {});   // Google adını profile yaz (üst barı bekletmeden)
  } else {
    currentProfile = null;
    try { localStorage.removeItem('ydt_prof_ui'); } catch (e) {}
    try { document.documentElement.classList.remove('oturum-var'); } catch (e) {}
  }
  updateAuthUI();
  updateVerifyBanner();
  if (typeof loadSavedWords === "function") loadSavedWords();
  const _bell = document.getElementById("notif-bell");
  if (typeof notifPollId !== "undefined" && notifPollId) { clearInterval(notifPollId); notifPollId = null; }
  if (currentUser) {
    if (_bell) _bell.style.display = "inline-flex";
    if (typeof window.startNotifPolling === "function") window.startNotifPolling();
    else if (typeof loadNotifications === "function") {
      loadNotifications();
      notifPollId = setInterval(function () { if (currentUser && typeof loadNotifications === "function") loadNotifications(); }, 30000);
    }
  } else {
    if (_bell) _bell.style.display = "none";
    myNotifications = [];
    const _ap = document.querySelector(".page.active");
    if (_ap && (_ap.id === "page-profile" || _ap.id === "page-admin") && typeof showPage === "function") showPage("home");
  }
}

async function loadProfile() {
  try {
    // KADEMELİ PROFİL YÜKLEME: hangi kolon eksik olursa olsun profil MUTLAKA yüklensin
    let data = null, error = null;
    // 1. deneme: tüm kolonlar (kurum_id dahil)
    let r = await sb.from("profiles")
      .select("display_name, plan, is_admin, role, level, streak_count, created_at, avatar_seed, status, badges, premium_until, exam_date, weekly_goal, kurum_id")
      .eq("id", currentUser.id).single();
    data = r.data; error = r.error;
    // 2. deneme: kurum_id olmadan (kolon henüz yoksa)
    if (error) {
      try { console.warn("Profil 1. deneme hatası:", error.message); } catch(e){}
      r = await sb.from("profiles")
        .select("display_name, plan, is_admin, role, level, streak_count, created_at, avatar_seed, status, badges, premium_until, exam_date, weekly_goal")
        .eq("id", currentUser.id).single();
      data = r.data; error = r.error;
    }
    // 3. deneme: minimum kritik alanlar (her ne olursa olsun)
    if (error) {
      try { console.warn("Profil 2. deneme hatası:", error.message); } catch(e){}
      r = await sb.from("profiles")
        .select("display_name, plan, is_admin, role, level, status")
        .eq("id", currentUser.id).single();
      data = r.data; error = r.error;
      if (error) { try { console.error("Profil 3. deneme hatası:", error.message); } catch(e){} }
    }
    if (!error) currentProfile = data;
    // ÖZ-ONARIM: auth hesabı var ama profil satırı yoksa (silinip yeniden kayıt vb.) oluştur
    if (error || !data) {
      try {
        await sb.from("profiles").insert({
          id: currentUser.id,
          email: currentUser.email || null,
          display_name: (currentUser.user_metadata && (currentUser.user_metadata.display_name || currentUser.user_metadata.full_name)) || ((currentUser.email || "").split("@")[0]) || null
        });
        const r2 = await sb.from("profiles").select("display_name, plan, is_admin, role, level, streak_count, created_at, avatar_seed, status, badges, premium_until, exam_date, weekly_goal, kurum_id").eq("id", currentUser.id).single();
        if (!r2.error) currentProfile = r2.data;
      } catch (e3) { _logDev("Profil öz-onarım başarısız:", e3); }
    }
    if (currentProfile && currentProfile.status === "frozen") {
      const _reac = (typeof window.uiConfirm === "function") ? await window.uiConfirm("Hesabın dondurulmuş durumda. Yeniden aktifleştirmek ister misin?", "Hesap Donduruldu") : confirm("Hesabın dondurulmuş durumda. Yeniden aktifleştirmek ister misin?");
      if (_reac) {
        try { await sb.from("profiles").update({ status: "active" }).eq("id", currentUser.id); currentProfile.status = "active"; } catch (e2) {}
      } else {
        await sb.auth.signOut();
      }
    }
  } catch (e) {
    _logDev("Profil yüklenemedi:", e);
  }
}

// YENİ: Görüntülenecek en iyi isim (Google/sağlayıcı adı > profil adı > e-posta öneki)
function bestName() {
  const m = (currentUser && currentUser.user_metadata) || {};
  let idData = {};
  try { idData = (currentUser.identities && currentUser.identities[0] && currentUser.identities[0].identity_data) || {}; } catch (e) {}
  const adaylar = [
    m.full_name, m.name, m.display_name, m.user_name, m.given_name,
    idData.full_name, idData.name,
    currentProfile && currentProfile.display_name
  ];
  for (const a of adaylar) { if (a && String(a).trim()) return String(a).trim(); }
  const email = (currentUser && currentUser.email) || "";
  return email.split("@")[0] || email;   // son çare: @ öncesi (tam e-posta değil)
}

// YENİ: Çözülen adı profile kaydet (mevcut "id gibi" kayıtları da düzeltir)
async function syncName() {
  try {
    const m = (currentUser && currentUser.user_metadata) || {};
    let idData = {};
    try { idData = (currentUser.identities && currentUser.identities[0] && currentUser.identities[0].identity_data) || {}; } catch (e) {}
    const ad = m.full_name || m.name || idData.full_name || idData.name;
    _logDev("AUTH isim teşhisi -> user_metadata:", m, "| identity_data:", idData);
    if (ad && (!currentProfile || currentProfile.display_name !== ad)) {
      await sb.from("profiles").update({ display_name: ad }).eq("id", currentUser.id);
      if (currentProfile) currentProfile.display_name = ad;
    }
  } catch (e) { _logDev("İsim güncellenemedi:", e); }
}

function authMsg(text, ok) {
  const el = document.getElementById("auth-msg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#10b981" : "#ef4444";
  el.style.display = text ? "block" : "none";
}

/* ===== Kayıt: e-posta onay kodu zorunlu =====
   1) Bilgiler + robot doğrulaması → sunucu 6 haneli kodu e-postaya gönderir (gönderilemezse kayıt yok)
   2) Kod doğru girilirse hesap sunucuda açılır ve kullanıcı otomatik giriş yapar. */
const KAYIT = { ad: '', email: '', sifre: '', sayac: null, uzantilar: null };
const KAYIT_VARSAYILAN = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.tr', 'outlook.com', 'outlook.com.tr', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'yahoo.com', 'yahoo.com.tr', 'yandex.com', 'yandex.com.tr', 'yandex.ru'];
async function kayitUzantilar() {
  if (KAYIT.uzantilar) return KAYIT.uzantilar;
  try {
    const { data } = await sb.from('site_settings').select('value').eq('key', 'izinli_mail_uzantilari').maybeSingle();
    const l = String((data && data.value) || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    KAYIT.uzantilar = l.length ? l : KAYIT_VARSAYILAN;
  } catch (e) { KAYIT.uzantilar = KAYIT_VARSAYILAN; }
  return KAYIT.uzantilar;
}
function kayitAdim(adim) {
  const f = document.getElementById('auth-form-register'), k = document.getElementById('auth-form-kod');
  if (f) f.style.display = adim === 'form' ? 'block' : 'none';
  if (k) k.style.display = adim === 'kod' ? 'block' : 'none';
}
async function kayitFonksiyon(govde) {
  const { data, error } = await sb.functions.invoke('kayit-kodu', { body: govde });
  if (error) {
    let m = '';
    try { const j = error.context && await error.context.json(); m = j && j.hata; } catch (e) {}
    return { ok: false, hata: m || 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.' };
  }
  return data || { ok: false, hata: 'Beklenmeyen bir yanıt alındı.' };
}
function kayitSayac(sn) {
  const b = document.getElementById('kod-tekrar'); if (!b) return;
  clearInterval(KAYIT.sayac);
  let kalan = sn;
  const yaz = () => { b.disabled = kalan > 0; b.textContent = kalan > 0 ? 'Kodu tekrar gönder (' + kalan + ' sn)' : 'Kodu tekrar gönder'; };
  yaz();
  KAYIT.sayac = setInterval(() => { kalan--; yaz(); if (kalan <= 0) clearInterval(KAYIT.sayac); }, 1000);
}
async function kayitKodGonder(tekrar) {
  let tk = turnstileToken();
  if (TURNSTILE_SITE_KEY && !tk && typeof captchaPrompt === 'function') tk = await captchaPrompt();
  if (TURNSTILE_SITE_KEY && !tk) { authMsg('Devam etmek için robot doğrulamasını tamamla.'); return false; }
  authMsg(tekrar ? 'Yeni kod gönderiliyor...' : 'Onay kodu gönderiliyor...', true);
  const r = await kayitFonksiyon({ islem: 'gonder', email: KAYIT.email, ad: KAYIT.ad, turnstile: tk || undefined });
  turnstileReset();
  if (!r.ok) {
    authMsg(r.hata || 'Onay kodu gönderilemedi.');
    if (r.kod === 'bekle' && r.kalan_sn) kayitSayac(r.kalan_sn);
    return false;
  }
  authMsg('');
  const sd = document.getElementById('kod-sure'); if (sd && r.sure_dk) sd.textContent = r.sure_dk;
  kayitSayac(r.tekrar_sn || 60);
  return true;
}
async function authRegister() {
  if (!sb) { authMsg("Sistem henüz hazır değil (bağlantı bilgileri eksik)."); return; }
  const name = (document.getElementById("reg-name").value || "").trim();
  const email = (document.getElementById("reg-email").value || "").trim().toLowerCase();
  const pass = document.getElementById("reg-pass").value || "";
  if (!name) { authMsg("Adını ve soyadını yaz."); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { authMsg("Geçerli bir e-posta adresi yaz."); return; }
  if (pass.length < 6) { authMsg("Şifre en az 6 karakter olmalı."); return; }
  const alan = email.split('@')[1], liste = await kayitUzantilar();
  if (!liste.some(u => alan === u || alan.endsWith('.' + u))) {
    authMsg("Bu e-posta adresiyle kayıt olunamıyor. Lütfen Gmail, Hotmail, Outlook, Yahoo, Yandex ya da iCloud adresi kullan.");
    return;
  }
  const btn = document.getElementById('reg-btn'); if (btn) btn.disabled = true;
  Object.assign(KAYIT, { ad: name, email, sifre: pass });
  const ok = await kayitKodGonder(false);
  if (btn) btn.disabled = false;
  if (!ok) return;
  const e = document.getElementById('kod-email'); if (e) e.textContent = email;
  const k = document.getElementById('kod-in'); if (k) { k.value = ''; setTimeout(() => k.focus(), 50); }
  kayitAdim('kod');
}
async function kayitKodDogrula() {
  const kod = ((document.getElementById('kod-in') || {}).value || '').replace(/\D/g, '');
  if (kod.length !== 6) { authMsg('E-postana gelen 6 haneli kodu yaz.'); return; }
  const btn = document.getElementById('kod-btn'); if (btn) btn.disabled = true;
  authMsg('Kod doğrulanıyor...', true);
  const r = await kayitFonksiyon({ islem: 'dogrula', email: KAYIT.email, kod, sifre: KAYIT.sifre, ad: KAYIT.ad });
  if (btn) btn.disabled = false;
  if (!r.ok) { authMsg(r.hata || 'Kod doğrulanamadı.'); return; }
  clearInterval(KAYIT.sayac);
  authMsg('Hesabın oluşturuldu, giriş yapılıyor...', true);
  let girdi = false;
  if (r.token_hash) {
    for (const type of ['magiclink', 'email']) {
      try { const { error } = await sb.auth.verifyOtp({ token_hash: r.token_hash, type }); if (!error) { girdi = true; break; } } catch (e) {}
    }
  }
  const email = KAYIT.email;
  KAYIT.sifre = '';
  ['reg-name', 'reg-email', 'reg-pass', 'kod-in'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  kayitAdim('form');
  if (girdi) { authMsg(''); closeAuth(); if (typeof toast === 'function') toast('Hoş geldin! Hesabın oluşturuldu.'); return; }
  switchTab('login');
  const le = document.getElementById('login-email'); if (le) le.value = email;
  authMsg('Hesabın oluşturuldu. Şifrenle giriş yapabilirsin.', true);
}
function kayitKodTekrar() { kayitKodGonder(true); }
function kayitGeri() { clearInterval(KAYIT.sayac); kayitAdim('form'); authMsg(''); }
// Google ile girişte uzantı izinli değilse sunucu kaydı reddeder; dönüşte anlaşılır mesaj göster
(function () {
  try {
    const q = new URLSearchParams((location.hash || '').replace(/^#/, '') + '&' + (location.search || '').replace(/^\?/, ''));
    const d = q.get('error_description');
    if (!d) return;
    history.replaceState(null, '', location.pathname);
    const m = /database error saving new user/i.test(d)
      ? 'Bu e-posta adresiyle kayıt olunamıyor. Lütfen Gmail, Hotmail, Outlook, Yahoo, Yandex ya da iCloud adresiyle kayıt ol.'
      : 'Giriş tamamlanamadı: ' + d;
    setTimeout(() => { if (typeof uiAlert === 'function') uiAlert(m, 'Giriş'); }, 800);
  } catch (e) {}
})();

async function authLogin() {
  if (!sb) { authMsg("Sistem henüz hazır değil (bağlantı bilgileri eksik)."); return; }
  const email = (document.getElementById("login-email").value || "").trim();
  const pass = document.getElementById("login-pass").value || "";
  if (!email || !pass) { authMsg("E-posta ve şifre gir."); return; }
  authMsg("Giriş yapılıyor...", true);
  const _ct = turnstileToken();
  if (TURNSTILE_SITE_KEY && !_ct) { authMsg("Lütfen robot olmadığını doğrula (kutucuğu işaretle)."); return; }
  let { error } = await sb.auth.signInWithPassword({ email, password: pass, options: _ct ? { captchaToken: _ct } : undefined });
  // Otomatik teşhis: Supabase token'ı reddederse (yanlış/eksik secret ayarı) token'sız bir kez daha dene
  if (error && _ct && /captcha/i.test(error.message || "")) {
    try { if (window.logError) window.logError("Captcha token reddedildi: " + error.message, "auth-captcha"); } catch (e) {}
    const r2 = await sb.auth.signInWithPassword({ email, password: pass });
    if (!r2.error) {
      error = null;
      try { if (window.logError) window.logError("UYARI: Supabase captcha ayarı sorunlu görünüyor (Turnstile SECRET eksik/yanlış olabilir) — giriş token'sız başarıldı.", "auth-captcha"); } catch (e) {}
    } else { error = r2.error; }
  }
  turnstileReset();
  if (error) { authHata(error); return; }
  authMsg("");
  closeAuth();
}

async function authGoogle() {
  if (!sb) { authMsg("Sistem henüz hazır değil (bağlantı bilgileri eksik)."); return; }
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) authHata(error);                     // DEĞİŞTİ
}

async function authLogout() {
  if (!sb) return;
  await sb.auth.signOut();
}

// Giriş yapınca menüyü hesap görünümüne çevir
function updateAuthUI() {
  const buttons = document.getElementById("nav-auth-buttons");
  const account = document.getElementById("nav-account");
  if (!buttons || !account) return;

  try { document.documentElement.classList.toggle('oturum-var', !!currentUser); } catch (e) {}
  if (currentUser) {
    buttons.style.display = "none";
    account.style.display = "flex";
    const isAdmin = currentProfile && currentProfile.is_admin;
    const isPremium = currentProfile && currentProfile.plan === "premium";
    const name = bestName();
    document.getElementById("account-name").textContent = name;
    if (typeof applyAvatar === "function") applyAvatar();
    const badge = document.getElementById("account-plan");
    if (isAdmin) {
      badge.textContent = "Yönetici";
      badge.className = "plan-badge plan-admin";
    } else {
      badge.textContent = isPremium ? "Premium" : "Ücretsiz";
      badge.className = "plan-badge " + (isPremium ? "plan-premium" : "plan-free");
    }
    // Eski ★ işaretini gizle (artık etiket "Yönetici" yazıyor)
    const adminDot = document.getElementById("account-admin");
    if (adminDot) adminDot.style.display = "none";
    // Yönetim paneli linki (sadece yöneticide)
    const adminLink = document.getElementById("nav-admin-link");
    const rol = (typeof currentProfile !== "undefined" && currentProfile && currentProfile.role) || "user";
    if (adminLink) adminLink.style.display = (isAdmin || rol === "destek") ? "inline-block" : "none";
    const tLink = document.getElementById("nav-teacher-link");
    if (tLink) tLink.style.display = (rol === "ogretmen") ? "inline-block" : "none";
    const kLink = document.getElementById("nav-kurum-link");
    if (kLink) kLink.style.display = (rol === "kurum") ? "inline-block" : "none";
  } else {
    buttons.style.display = "flex";
    account.style.display = "none";
    const adminLink = document.getElementById("nav-admin-link");
    if (adminLink) adminLink.style.display = "none";
    const tLink = document.getElementById("nav-teacher-link");
    if (tLink) tLink.style.display = "none";
  }
}

// Supabase hata mesajlarını Türkçeleştir
function cevirHata(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "E-posta veya şifre hatalı.";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) return "Bu e-posta zaten kayıtlı.";
  if (m.includes("email not confirmed")) return "Önce e-postanı onaylaman gerekiyor.";
  if (m.includes("database error")) return "Bu e-posta adresiyle kayıt olunamıyor. İzin verilen uzantılardan biriyle kayıt ol.";
  if (m.includes("password")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("captcha")) return "Robot doğrulaması geçersiz — kutucuğu yeniden işaretleyip tekrar dene.";
  if (m.includes("rate limit") || m.includes("too many")) return "Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar dene.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Bağlantı sorunu: internetini kontrol et ve tekrar dene.";
  if (m.includes("signups not allowed")) return "Yeni kayıtlar şu anda kapalı.";
  return null; // bilinmeyen hata: teknik metin gösterilecek
}

/* Giriş/kayıt hatası: net Türkçe açıklama + teknik detay; ayrıca Hata Kayıtları'na düşer */
function authHata(error) {
  const raw = (error && error.message) || "bilinmeyen hata";
  const tr = cevirHata(raw);
  authMsg(tr ? tr + " (teknik: " + raw + ")" : "Beklenmeyen bir hata oluştu — teknik detay: " + raw);
  try { if (typeof window.logError === "function") window.logError("Giriş/kayıt hatası: " + raw, "auth"); } catch (e) {}
}


// Başlat
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", authInit);
} else {
  authInit();
}


/* ===== E-posta doğrulama (Y5) ===== */
function emailVerified() {
  return !!(currentUser && (currentUser.email_confirmed_at || currentUser.confirmed_at));
}
if (typeof window !== "undefined") window.emailVerified = emailVerified;

function updateVerifyBanner() {
  var b = document.getElementById("verify-banner");
  var show = !!(currentUser && !emailVerified());
  if (show && !b) {
    b = document.createElement("div");
    b.id = "verify-banner";
    b.className = "verify-banner";
    b.innerHTML = '⚠️ E-posta adresin henüz doğrulanmadı. Bazı özellikler (kelime kaydetme, destek talebi, premium) doğrulama sonrası açılır. ' +
      '<button class="verify-resend" onclick="resendVerifyMail()">Doğrulama mailini tekrar gönder</button>';
    document.body.insertBefore(b, document.body.firstChild);
  } else if (!show && b) { b.remove(); }
}
async function resendVerifyMail() {
  if (!sb || !currentUser) return;
  try {
    const _tk = await captchaPrompt();
    if (TURNSTILE_SITE_KEY && !_tk) { if (typeof toast === "function") toast("Doğrulama tamamlanmadı, işlem iptal edildi."); return; }
    await sb.auth.resend({ type: "signup", email: currentUser.email, options: _tk ? { captchaToken: _tk } : undefined });
    if (typeof toast === "function") toast("Doğrulama e-postası gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.");
  } catch (e) { if (typeof toast === "function") toast("Gönderilemedi. Lütfen biraz sonra tekrar dene."); }
}

/* Giriş penceresi: Şifremi Unuttum */
/* ===== Şifremi unuttum: e-posta elle yazılır → mailde YALNIZCA bağlantı gelir →
   bağlantı açılınca kod sayfada gösterilir (oturum açılmaz) → kod, başlatılan penceredeki
   alana yazılınca şifre değişir. İşlemler sunucudaki "sifre-sifirla" fonksiyonunda yapılır. */
const SIFIRLA = { email: '', sayac: null };
function sifirlaAdim(adim) {
  const L = document.getElementById('auth-form-login'), F = document.getElementById('auth-form-sifirla');
  const a = document.getElementById('sifirla-a1'), b = document.getElementById('sifirla-a2');
  if (adim === 'kapat') { if (F) F.style.display = 'none'; if (L) L.style.display = 'block'; clearInterval(SIFIRLA.sayac); authMsg(''); return; }
  if (L) L.style.display = 'none'; if (F) F.style.display = 'block';
  if (a) a.style.display = adim === 'email' ? 'block' : 'none';
  if (b) b.style.display = adim === 'kod' ? 'block' : 'none';
}
async function sifirlaFonksiyon(govde) {
  const { data, error } = await sb.functions.invoke('sifre-sifirla', { body: govde });
  if (error) {
    let m = '';
    try { const j = error.context && await error.context.json(); m = j && j.hata; } catch (e) {}
    return { ok: false, hata: m || 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.' };
  }
  return data || { ok: false, hata: 'Beklenmeyen bir yanıt alındı.' };
}
function authForgot() {
  const se = document.getElementById('sifirla-email');
  if (se) se.value = '';          // e-posta her seferinde elle yazılır
  authMsg('');
  sifirlaAdim('email');
  setTimeout(() => { if (se) se.focus(); }, 50);
}
function sifirlaSayac(sn) {
  const b = document.getElementById('sifirla-tekrar'); if (!b) return;
  clearInterval(SIFIRLA.sayac);
  let kalan = sn;
  const yaz = () => { b.disabled = kalan > 0; b.textContent = kalan > 0 ? 'Bağlantıyı tekrar gönder (' + kalan + ' sn)' : 'Bağlantıyı tekrar gönder'; };
  yaz(); SIFIRLA.sayac = setInterval(() => { kalan--; yaz(); if (kalan <= 0) clearInterval(SIFIRLA.sayac); }, 1000);
}
async function sifirlaKodGonder(tekrar) {
  const email = tekrar ? SIFIRLA.email : ((document.getElementById('sifirla-email') || {}).value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { authMsg('Geçerli bir e-posta adresi yaz.'); return; }
  let tk = turnstileToken();
  if (TURNSTILE_SITE_KEY && !tk && typeof captchaPrompt === 'function') tk = await captchaPrompt();
  if (TURNSTILE_SITE_KEY && !tk) { authMsg('Devam etmek için robot doğrulamasını tamamla.'); return; }
  authMsg('Gönderiliyor...', true);
  const r = await sifirlaFonksiyon({ islem: 'gonder', email, turnstile: tk || undefined });
  turnstileReset();
  if (!r.ok) { authMsg(r.hata || 'Gönderilemedi.'); if (r.kod === 'bekle' && r.kalan_sn) sifirlaSayac(r.kalan_sn); return; }
  SIFIRLA.email = email;
  const g = document.getElementById('sifirla-giden'); if (g) g.textContent = email;
  const sd = document.getElementById('sifirla-sure'); if (sd && r.sure_dk) sd.textContent = r.sure_dk;
  if (!tekrar) ['sifirla-kod', 'sifirla-p1', 'sifirla-p2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  authMsg(tekrar ? 'Yeni bağlantı gönderildi.' : '', true);
  sifirlaAdim('kod');
  sifirlaSayac(r.tekrar_sn || 60);
}
async function sifirlaTamamla() {
  const kod = ((document.getElementById('sifirla-kod') || {}).value || '').replace(/\D/g, '');
  const p1 = (document.getElementById('sifirla-p1') || {}).value || '', p2 = (document.getElementById('sifirla-p2') || {}).value || '';
  if (kod.length !== 6) { authMsg('Bağlantıyı açınca gösterilen 6 haneli kodu yaz.'); return; }
  if (p1.length < 6) { authMsg('Yeni şifre en az 6 karakter olmalı.'); return; }
  if (typeof pwStrength === 'function' && pwStrength(p1).sc < 2) { authMsg('Yeni şifre çok zayıf; harf ve rakam karışımı kullan.'); return; }
  if (p1 !== p2) { authMsg('Şifreler birbirini tutmuyor.'); return; }
  const btn = document.getElementById('sifirla-btn'); if (btn) btn.disabled = true;
  authMsg('Kod doğrulanıyor...', true);
  const r = await sifirlaFonksiyon({ islem: 'sifirla', email: SIFIRLA.email, kod, sifre: p1 });
  if (btn) btn.disabled = false;
  if (!r.ok) { authMsg(r.hata || 'Şifre değiştirilemedi.'); return; }
  clearInterval(SIFIRLA.sayac);
  ['sifirla-kod', 'sifirla-p1', 'sifirla-p2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  // Sunucu tüm açık oturumları kapattı; bu cihazdaki eski oturum da sonlansın
  try { if (typeof currentUser !== 'undefined' && currentUser) await sb.auth.signOut(); } catch (e) {}
  sifirlaAdim('kapat');
  switchTab('login');
  const le = document.getElementById('login-email'); if (le) le.value = SIFIRLA.email;
  authMsg('Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.', true);
}
// Mail bağlantısı açıldı: kodu göster (oturum açılmaz)
(function () {
  let anahtar = '';
  try { anahtar = new URLSearchParams(location.search).get('sifre_kod') || ''; } catch (e) {}
  if (!anahtar) return;
  try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  const bekle = setInterval(async () => {
    if (typeof sb === 'undefined' || !sb || typeof uiModal !== 'function') return;
    clearInterval(bekle);
    const r = await sifirlaFonksiyon({ islem: 'kodu_goster', anahtar });
    if (!r.ok) {
      const tekrar = await uiConfirm(r.hata || 'Bağlantı geçersiz.', 'Şifre yenileme', { confirmText: 'Yeniden başlat', cancelText: 'Kapat' });
      if (tekrar) { if (typeof openAuth === 'function') openAuth('login'); switchTab('login'); authForgot(); }
      return;
    }
    const ov = document.createElement('div');
    ov.className = 'ui-modal-overlay show'; ov.style.zIndex = '10000';
    ov.innerHTML = '<div class="ui-modal sk-kart" role="dialog" aria-labelledby="sk-b">' +
      '<div class="ui-modal-title" id="sk-b">Şifre yenileme kodun</div>' +
      '<div class="sk-kod" id="sk-kod">' + r.kod + '</div>' +
      '<p class="ui-modal-msg">Bu kodu, şifre yenilemeyi başlattığın penceredeki <b>Kod</b> alanına yaz. Kod ' + (r.kalan_dk || 30) + ' dakika içinde kullanılmalı.</p>' +
      '<p class="sk-not">O pencereyi kapattıysan ya da şifre yenilemeyi bu cihazda başlatmadıysan buradan devam edebilirsin.</p>' +
      '<div class="ui-modal-btns"><button class="ui-modal-btn ghost" id="sk-kapat">Kapat</button><button class="ui-modal-btn primary" id="sk-devam">Burada devam et</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#sk-kapat').onclick = () => ov.remove();
    ov.querySelector('#sk-devam').onclick = () => {
      ov.remove();
      SIFIRLA.email = r.email;
      if (typeof openAuth === 'function') openAuth('login');
      switchTab('login');
      const g = document.getElementById('sifirla-giden'); if (g) g.textContent = r.email_maske || r.email;
      ['sifirla-kod', 'sifirla-p1', 'sifirla-p2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      authMsg(''); sifirlaAdim('kod');
      const k = document.getElementById('sifirla-kod'); if (k) { k.value = r.kod; }
      const p = document.getElementById('sifirla-p1'); if (p) setTimeout(() => p.focus(), 60);
    };
  }, 150);
})();


/* ============================================================
   ŞİFRE SIFIRLAMA EKRANI
   Mailden gelen linkle dönüldüğünde otomatik açılır;
   yeni şifre belirlenir (👁 ile görülebilir), hesaba işlenir.
   ============================================================ */
if (typeof location !== "undefined" && (location.hash || "").includes("type=recovery")) {
  window.addEventListener("load", function () { setTimeout(openPwReset, 800); });
}
/* E-posta doğrulama linkiyle dönüş: karşılama */
if (typeof location !== "undefined" && /type=(signup|email_change|invite)/.test(location.hash || "")) {
  window.addEventListener("load", function () {
    setTimeout(function () {
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      var m = "E-posta adresin doğrulandı ve hesabın etkinleşti. \ud83c\udf89\n\nArtık tüm özellikleri kullanabilirsin — iyi çalışmalar!";
      if (typeof uiAlert === "function") uiAlert(m, "✅ Hoş Geldin!");
    }, 900);
  });
}
/* Süresi dolmuş / kullanılmış sıfırlama linki: sessiz kalma, açıkla */
if (typeof location !== "undefined" && /error_code=otp_expired|error=access_denied/.test(location.hash || "")) {
  window.addEventListener("load", function () {
    setTimeout(function () {
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      var m = "Bu şifre sıfırlama bağlantısının süresi dolmuş ya da bağlantı daha önce kullanılmış.\n\nSıfırlama linkleri güvenlik gereği TEK KULLANIMLIKTIR ve sınırlı süre geçerlidir. Lütfen en yeni maildeki linki kullan; gerekirse yeni bir sıfırlama maili iste.";
      if (typeof uiAlert === "function") uiAlert(m, "🔗 Bağlantı Geçersiz");
      else alert(m);
    }, 900);
  });
}
function openPwReset() {
  if (document.getElementById("pwr-overlay")) return;
  const ov = document.createElement("div");
  ov.id = "pwr-overlay";
  ov.className = "ui-modal-overlay show";
  ov.style.zIndex = "10000";
  ov.innerHTML = '<div class="ui-modal" style="max-width:400px;">' +
    '<h3 class="ui-modal-title">Yeni Şifre Belirle</h3>' +
    '<p class="ui-modal-msg">Sıfırlama bağlantısı doğrulandı. Hesabın için yeni bir şifre seç.</p>' +
    '<div class="pw-wrap" style="margin-bottom:10px;"><input id="pwr-1" class="form-input" type="password" placeholder="Yeni şifre (en az 6 karakter)" autocomplete="new-password" oninput="pwStrengthPaint(this.value, \'pwr-bar\', \'pwr-bar-t\')">' +
    '<button type="button" class="pw-eye" onclick="pwToggle(this, \'pwr-1\')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
    '<div class="pwbar"><div id="pwr-bar" class="pwbar-fill"></div></div><div id="pwr-bar-t" class="pwbar-t"></div>' +
    '<div class="pw-wrap" style="margin-bottom:12px;"><input id="pwr-2" class="form-input" type="password" placeholder="Yeni şifre (tekrar)" autocomplete="new-password">' +
    '<button type="button" class="pw-eye" onclick="pwToggle(this, \'pwr-2\')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
    '<div id="pwr-msg" style="font-size:.84rem; color:#b91c1c; min-height:18px; margin-bottom:8px;"></div>' +
    '<button class="set-btn" style="width:100%;" onclick="pwResetSubmit()">Şifreyi Güncelle</button>' +
    '</div>';
  document.body.appendChild(ov);
}
async function pwResetSubmit() {
  const p1 = (document.getElementById("pwr-1") || {}).value || "";
  const p2 = (document.getElementById("pwr-2") || {}).value || "";
  const msg = document.getElementById("pwr-msg");
  if (p1.length < 6) { msg.textContent = "Şifre en az 6 karakter olmalı."; return; }
  if (p1 !== p2) { msg.textContent = "Şifreler birbirini tutmuyor."; return; }
  msg.style.color = "var(--gray)"; msg.textContent = "Güncelleniyor...";
  try {
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) throw error;
    const ov = document.getElementById("pwr-overlay"); if (ov) ov.remove();
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    if (typeof uiAlert === "function") uiAlert("Şifren güncellendi ve oturumun açıldı. Artık yeni şifrenle giriş yapabilirsin.", "Şifre güncellendi");
    else alert("Şifren güncellendi.");
    try { if (window.logError) {} } catch (e) {}
  } catch (e) {
    msg.style.color = "#b91c1c";
    msg.textContent = "Güncellenemedi: " + ((e && e.message) || e);
  }
}
