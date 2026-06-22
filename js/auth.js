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
    console.warn("Supabase bilgileri henüz girilmemiş (js/supabase-config.js).");
    return;
  }
  // URL'i temizle: sadece çıplak adresi kullan (fazla /rest/v1, sondaki / vb. at)
  let url = (SUPABASE_URL || "").trim();
  try { url = new URL(url).origin; } catch (e) { console.error("SUPABASE_URL geçersiz:", url); }
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
  if (typeof loadSavedWords === "function") loadSavedWords();
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
    console.log("AUTH isim teşhisi -> user_metadata:", m, "| identity_data:", idData);
    if (ad && (!currentProfile || currentProfile.display_name !== ad)) {
      await sb.from("profiles").update({ display_name: ad }).eq("id", currentUser.id);
      if (currentProfile) currentProfile.display_name = ad;
    }
  } catch (e) { console.error("İsim güncellenemedi:", e); }
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
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
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
    if (adminLink) adminLink.style.display = isAdmin ? "inline-block" : "none";
  } else {
    buttons.style.display = "flex";
    account.style.display = "none";
    const adminLink = document.getElementById("nav-admin-link");
    if (adminLink) adminLink.style.display = "none";
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
  console.error("Auth hatası:", error);
  authMsg(cevirHata(raw) + "  —  (orijinal: " + raw + ")");
}

// Başlat
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", authInit);
} else {
  authInit();
}
