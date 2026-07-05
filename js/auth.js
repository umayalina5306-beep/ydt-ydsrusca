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
    const { data, error } = await sb
      .from("profiles")
      .select("display_name, plan, is_admin, role, level, streak_count, created_at, avatar_seed, status, badges, premium_until")
      .eq("id", currentUser.id)
      .single();
    if (!error) currentProfile = data;
    // ÖZ-ONARIM: auth hesabı var ama profil satırı yoksa (silinip yeniden kayıt vb.) oluştur
    if (error || !data) {
      try {
        await sb.from("profiles").insert({
          id: currentUser.id,
          email: currentUser.email || null,
          display_name: (currentUser.user_metadata && (currentUser.user_metadata.display_name || currentUser.user_metadata.full_name)) || ((currentUser.email || "").split("@")[0]) || null
        });
        const r2 = await sb.from("profiles").select("display_name, plan, is_admin, role, level, streak_count, created_at, avatar_seed, status, badges, premium_until").eq("id", currentUser.id).single();
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
  const { error } = await sb.auth.signInWithPassword({ email, password: pass, options: _ct ? { captchaToken: _ct } : undefined });
  turnstileReset();
  if (error) { authHata(error); return; }        // DEĞİŞTİ: orijinal hatayı da göster
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
  return "Bir hata oluştu.";
}

// YENİ: Türkçe mesaj + orijinal hata metnini birlikte göster
function authHata(error) {
  const raw = (error && error.message) || "bilinmeyen hata";
  _logDev("Auth hatası:", error);
  authMsg(cevirHata(raw));
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
