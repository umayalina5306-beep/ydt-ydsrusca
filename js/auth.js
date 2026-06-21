// ============================================================
//  GİRİŞ / KAYIT SİSTEMİ (Supabase)
//  - E-posta + şifre ile kayıt ve giriş
//  - Google ile giriş
//  - Oturum yönetimi + profil (free/premium etiketi)
//  Bu dosya mevcut site koduna dokunmaz; sadece ekler.
// ============================================================

let sb = null;
let currentUser = null;
let currentProfile = null;

function authInit() {
  if (!window.supabase || SUPABASE_URL.startsWith("BURAYA") || SUPABASE_KEY.startsWith("BURAYA")) {
    console.warn("Supabase bilgileri henüz girilmemiş (js/supabase-config.js).");
    return;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  } else {
    currentProfile = null;
  }
  updateAuthUI();
}

async function loadProfile() {
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("display_name, plan, is_admin, level")
      .eq("id", currentUser.id)
      .single();
    if (!error) currentProfile = data;
  } catch (e) {
    console.error("Profil yüklenemedi:", e);
  }
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
  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { display_name: name } }
  });
  if (error) { console.error("Kayıt hatası:", error); authMsg(cevirHata(error.message)); return; }
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
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { authMsg(cevirHata(error.message)); return; }
  authMsg("");
  closeAuth();
}

async function authGoogle() {
  if (!sb) { authMsg("Sistem henüz hazır değil (bağlantı bilgileri eksik)."); return; }
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) authMsg(cevirHata(error.message));
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
    const isPremium = currentProfile && currentProfile.plan === "premium";
    const name = (currentProfile && currentProfile.display_name) || currentUser.email;
    document.getElementById("account-name").textContent = name;
    const badge = document.getElementById("account-plan");
    badge.textContent = isPremium ? "PREMIUM" : "FREE";
    badge.className = "plan-badge " + (isPremium ? "plan-premium" : "plan-free");
    // Yönetici ise küçük bir işaret
    const adminDot = document.getElementById("account-admin");
    if (adminDot) adminDot.style.display = (currentProfile && currentProfile.is_admin) ? "inline" : "none";
  } else {
    buttons.style.display = "flex";
    account.style.display = "none";
  }
}

// Supabase hata mesajlarını Türkçeleştir
function cevirHata(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "E-posta veya şifre hatalı.";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) return "Bu e-posta zaten kayıtlı.";
  if (m.includes("email not confirmed")) return "Önce e-postanı onaylaman gerekiyor.";
  if (m.includes("database error")) return "Veritabanı hatası: profil oluşturma trigger'ı takıldı. SQL düzeltmesini çalıştır.";
  if (m.includes("password")) return "Şifre en az 6 karakter olmalı.";
  return "Hata: " + (msg || "bilinmeyen hata");
}

// Başlat
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", authInit);
} else {
  authInit();
}
