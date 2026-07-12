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
    if (_event === "PASSWORD_RECOVERY") { setTimeout(openPwReset, 300); }
    handleSession(session);
  });
  // Sayfa açılışında mevcut oturumu yükle
  sb.auth.getSession().then(({ data }) => handleSession(data.session));
}

async function handleSession(session) {
  currentUser = session ? session.user : null;
  if (currentUser) {
    await loadProfile();
    await syncName();            // YENİ: Google adını profile yaz
  } else {
    currentProfile = null;
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

async function authRegister() {
  if (!sb) { authMsg("Sistem henüz hazır değil (bağlantı bilgileri eksik)."); return; }
  const name = (document.getElementById("reg-name").value || "").trim();
  const email = (document.getElementById("reg-email").value || "").trim();
  const pass = document.getElementById("reg-pass").value || "";
  if (!email || pass.length < 6) { authMsg("Geçerli e-posta ve en az 6 karakter şifre gir."); return; }
  authMsg("Hesap oluşturuluyor...", true);
  const _ct2 = turnstileToken();
  if (TURNSTILE_SITE_KEY && !_ct2) { authMsg("Lütfen robot olmadığını doğrula (kutucuğu işaretle)."); return; }
  const _opts = { data: { display_name: name } };
  if (_ct2) _opts.captchaToken = _ct2;
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: _opts });
  turnstileReset();
  if (error) { authHata(error); return; }       // DEĞİŞTİ: orijinal hatayı da göster
  if (data.user && !data.session) {
    authMsg("Kayıt başarılı! E-postanı kontrol edip hesabını onayla, sonra giriş yap.", true);
    switchTab("login");
  } else {
    authMsg("");
    closeAuth();
  }
}

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
  if (m.includes("database error")) return "Veritabanı hatası: profil oluşturma trigger'ı takıldı.";
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
async function authForgot() {
  var emailEl = document.getElementById("login-email");
  var email = (emailEl && emailEl.value || "").trim();
  if (!email) { authMsg("Önce yukarıya e-posta adresini yaz, sonra 'Şifremi unuttum'a tıkla."); return; }
  var tk = (typeof captchaPrompt === "function") ? await captchaPrompt() : null;
  if (TURNSTILE_SITE_KEY && !tk) { authMsg("Doğrulama tamamlanmadı."); return; }
  try {
    var opts = { redirectTo: window.location.origin + window.location.pathname };
    if (tk) opts.captchaToken = tk;
    var r = await sb.auth.resetPasswordForEmail(email, opts);
    if (r.error) throw r.error;
    authMsg("Sıfırlama bağlantısı e-postana gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.", true);
  } catch (e) { authMsg("Gönderilemedi. E-posta adresini kontrol edip tekrar dene."); }
}


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
    '<h3 class="ui-modal-title">🔑 Yeni Şifre Belirle</h3>' +
    '<p class="ui-modal-msg">Sıfırlama bağlantısı doğrulandı. Hesabın için yeni bir şifre seç.</p>' +
    '<div class="pw-wrap" style="margin-bottom:10px;"><input id="pwr-1" class="form-input" type="password" placeholder="Yeni şifre (en az 6 karakter)" autocomplete="new-password" oninput="pwStrengthPaint(this.value, \'pwr-bar\', \'pwr-bar-t\')">' +
    '<button type="button" class="pw-eye" onclick="pwToggle(this, \'pwr-1\')">👁</button></div>' +
    '<div class="pwbar"><div id="pwr-bar" class="pwbar-fill"></div></div><div id="pwr-bar-t" class="pwbar-t"></div>' +
    '<div class="pw-wrap" style="margin-bottom:12px;"><input id="pwr-2" class="form-input" type="password" placeholder="Yeni şifre (tekrar)" autocomplete="new-password">' +
    '<button type="button" class="pw-eye" onclick="pwToggle(this, \'pwr-2\')">👁</button></div>' +
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
    if (typeof uiAlert === "function") uiAlert("Şifren güncellendi ve oturumun açıldı. 🎉\n\nArtık yeni şifrenle giriş yapabilirsin.", "🔑 Şifre Güncellendi");
    else alert("Şifren güncellendi.");
    try { if (window.logError) {} } catch (e) {}
  } catch (e) {
    msg.style.color = "#b91c1c";
    msg.textContent = "Güncellenemedi: " + ((e && e.message) || e);
  }
}
