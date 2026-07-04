// DATA
let words = [];
let wordsByRu = {};


let videos = [];

// EŞ ANLAMLILAR
let synonymGroups = [];

let antonymPairs = [];

// AKRABA KELİMELER
let wordFamilies = [];

// SEVİYE SEÇİMİ
let currentLevel = 'a1a2';
const levelTitles = {
  'a1a2': 'A1-A2',
  'b1': 'B1',
  'b2': 'B2',
  'c1': 'C1'
};

function selectLevel(level) {
  currentLevel = level;
  rangeFrom = null; rangeTo = null; wordsPage = 1;
  const _f = document.getElementById('range-from'); if (_f) _f.value = '';
  const _t = document.getElementById('range-to'); if (_t) _t.value = '';
  document.getElementById('words-level-select').style.display = 'none';
  document.getElementById('words-category-select').style.display = 'none';
  document.getElementById('words-sozluk').style.display = 'none';

  if (level === 'sozluk') {
    document.getElementById('words-sozluk').style.display = 'block';
    setTimeout(() => document.getElementById('sozluk-input').focus(), 100);
    return;
  }

  document.getElementById('words-category-select').style.display = 'block';
  document.getElementById('cat-tabs').style.display = '';
  const lsw = document.getElementById('level-search-wrap');
  if (lsw) lsw.style.display = '';
  const lsi = document.getElementById('level-search-input');
  if (lsi) lsi.value = '';
  const lsc = document.getElementById('level-search-clear');
  if (lsc) lsc.style.display = 'none';
  currentCat = 'hepsi';
  document.getElementById('words-level-title').innerHTML = `${levelTitles[level]} <span>Kelimeleri</span>`;
  updateCatCounts();
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-btn').classList.add('active');
  renderWords('hepsi');
}

function backToLevels() {
  document.getElementById('words-level-select').style.display = 'block';
  document.getElementById('words-category-select').style.display = 'none';
  document.getElementById('words-sozluk').style.display = 'none';
  const bank = document.getElementById('words-bank');
  if (bank) bank.style.display = 'none';
}

function sozlukAra(query) {
  const clearBtn = document.getElementById('sozluk-clear-btn');
  const grid = document.getElementById('sozluk-grid');
  const info = document.getElementById('sozluk-info');
  const q = query.trim().toLowerCase();

  clearBtn.style.display = q ? 'block' : 'none';

  if (!q) {
    grid.innerHTML = '';
    info.textContent = 'Aramak istediğiniz kelimeyi yukarıya yazın.';
    return;
  }

  const results = words.filter(w =>
    w.ru.toLowerCase().includes(q) ||
    w.tr.toLowerCase().includes(q) ||
    (w.p && w.p.toLowerCase().includes(q))
  );

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="sozluk-not-found">
        <div class="not-found-icon">📭</div>
        <div class="not-found-title">"${query}" bulunamadı</div>
        <div class="not-found-sub">Bu kelime henüz listemizde yok. Yakında eklenecek!</div>
      </div>`;
    info.textContent = '';
    return;
  }

  info.textContent = `${results.length} kelime bulundu`;

  const highlight = (text, q) => {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return text.slice(0,idx) + `<mark style="background:#fef08a;border-radius:2px;">${text.slice(idx,idx+q.length)}</mark>` + text.slice(idx+q.length);
  };

  const levelColor = {'A1':'#10b981','A2':'#3b82f6','B1':'#f59e0b','B2':'#ef4444','C1':'#8b5cf6'};

  grid.innerHTML = results.map(w => {
    const tipHTML = w.tip ? `<span class="word-tip ${w.tip==='СВ'?'word-tip-cv':'word-tip-ncv'}">${w.tip}</span>` : '';
    const cvHTML = w.cv ? `<div class="word-cv-pair">⇄ СВ: <b>${w.cv}</b></div>` : '';
    const ncvHTML = w.ncv ? `<div class="word-cv-pair">⇄ НСВ: <b>${w.ncv}</b></div>` : '';
    const extraHTML = (cvHTML||ncvHTML) ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--light-gray);">${cvHTML}${ncvHTML}</div>` : '';
    const genderClass = w.cinsiyet==='м'?'gender-m':w.cinsiyet==='ж'?'gender-f':'gender-n';
    const genderLabel = w.cinsiyet==='м'?'м (erkil)':w.cinsiyet==='ж'?'ж (dişil)':w.cinsiyet==='с'?'с (nötr)':'';
    const genderHTML = w.cinsiyet ? `<span class="word-gender ${genderClass}">${genderLabel}</span>` : '';
    const padejHTML = w.padej ? `<span class="word-padej">${w.padej}</span><br>` : '';
    const lc = levelColor[w.level] || '#6b7280';
    const ruSafe = w.ru.replace(/'/g, "\\'");
    return `
    <div class="word-card">
      <button class="word-speak" onclick="speak('${ruSafe}')">🔊</button>
      <span style="position:absolute;top:12px;right:44px;font-size:0.6rem;font-weight:700;color:${lc};background:${lc}22;padding:2px 6px;border-radius:10px;">${w.level}</span>
      <div class="word-ru">${highlight(w.ru,q)} ${genderHTML}</div>
      ${tipHTML}${padejHTML}
      <div class="word-tr">${highlight(w.tr,q)}</div>
      <div class="word-pron">[${w.p}]</div>
      ${extraHTML}
      ${w.ornek?`<div class="word-example"><div class="word-example-ru">${w.ornek}</div><div class="word-example-tr">${w.ornekTr}</div></div>`:''}
    </div>`;
  }).join('');
}

function sozlukTemizle() {
  const input = document.getElementById('sozluk-input');
  input.value = '';
  input.focus();
  sozlukAra('');
}

let currentCat = 'hepsi';
let rangeFrom = null, rangeTo = null;
let wordsPage = 1;
let wordsPerPage = 20;
const WORDS_PAGE_SIZE = 20;
function wordsGoPage(p) {
  wordsPage = p;
  renderWords(currentCat);
  const cs = document.getElementById('words-category-select');
  if (cs) cs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setWordsPerPage(n) {
  wordsPerPage = parseInt(n, 10) || 20;
  wordsPage = 1;
  renderWords(currentCat);
}
function wordsJumpGo() {
  const el = document.getElementById('words-jump');
  if (!el) return;
  let p = parseInt(el.value, 10);
  if (isNaN(p) || p < 1) { el.value = ''; return; }
  wordsGoPage(p);
}

function applyRange() {
  wordsPage = 1;
  const f = parseInt(document.getElementById('range-from').value);
  const t = parseInt(document.getElementById('range-to').value);
  rangeFrom = (!isNaN(f) && f > 0) ? f : null;
  rangeTo = (!isNaN(t) && t > 0) ? t : null;
  if (rangeFrom && rangeTo && rangeFrom > rangeTo) { const tmp = rangeFrom; rangeFrom = rangeTo; rangeTo = tmp; }
  renderWords(currentCat);
}
function quickRange(n) {
  wordsPage = 1;
  rangeFrom = 1; rangeTo = n;
  const fEl = document.getElementById('range-from'); if (fEl) fEl.value = 1;
  const tEl = document.getElementById('range-to'); if (tEl) tEl.value = n;
  renderWords(currentCat);
}
function clearRange() {
  wordsPage = 1;
  rangeFrom = null; rangeTo = null;
  const fEl = document.getElementById('range-from'); if (fEl) fEl.value = '';
  const tEl = document.getElementById('range-to'); if (tEl) tEl.value = '';
  renderWords(currentCat);
}

// Özel uyarı baloncuğu (tarayıcı alert'i yerine, temaya uygun)
function toast(msg) {
  let t = document.getElementById('app-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'app-toast';
    t.className = 'app-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3400);
}
function getLevelWords() {
  return words.filter(w => {
    if (currentLevel === 'a1a2') return w.level === 'A1' || w.level === 'A2';
    if (currentLevel === 'b1') return w.level === 'B1';
    if (currentLevel === 'b2') return w.level === 'B2';
    if (currentLevel === 'c1') return w.level === 'C1';
    return true;
  });
}

function updateCatCounts() {
  const levelWords = getLevelWords();
  const allEl = document.getElementById('cnt-hepsi');
  if (allEl) allEl.textContent = levelWords.length;
  const cats = ['isim','fiil','sıfat','zarf','zamir','edat','bağlaç'];
  cats.forEach(cat => {
    const el = document.getElementById('cnt-' + cat);
    if (el) el.textContent = levelWords.filter(w => w.cat === cat).length;
  });
}


function renderWords(cat) {
  const grid = document.getElementById('words-grid');
  const levelWords = getLevelWords();
  const _rb = document.getElementById('range-bar');
  if (_rb) _rb.style.display = (cat === 'esanlamli' || cat === 'zitanlamli' || cat === 'akraba') ? 'none' : 'flex';

  if (cat === 'esanlamli') {
    grid.innerHTML = synonymGroups.map(g => `
      <div class="syn-card">
        <div class="syn-label">≈ Eş Anlamlı Grup</div>
        <div style="font-weight:700; color:var(--text); font-size:0.85rem; margin-bottom:10px;">${g.grup}</div>
        <div class="syn-group">
          ${g.kelimeler.map(k => `
            <div class="syn-item">
              <div>
                <div class="syn-item-ru">${k.ru}</div>
                <div class="syn-item-tr">${k.tr}</div>
              </div>
              <button class="syn-item-speak" onclick="speak('${k.ru.replace(/'/g,"\\'")}')">🔊</button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    return;
  }

  if (cat === 'zitanlamli') {
    grid.innerHTML = antonymPairs.map(p => `
      <div class="ant-card">
        <div class="ant-label">↔ Zıt Anlamlı Çift</div>
        <div class="ant-pair">
          <div class="ant-row">
            <div class="ant-word">
              <div class="ant-word-ru">${p.ru1}</div>
              <div class="ant-word-tr">${p.tr1}</div>
              <div class="ant-word-bottom">
                <button class="ant-speak" onclick="speak('${p.ru1.replace(/'/g,"\\'")}')">🔊</button>
              </div>
            </div>
            <div class="ant-divider"><div class="ant-arrow">↔</div></div>
            <div class="ant-word">
              <div class="ant-word-ru">${p.ru2}</div>
              <div class="ant-word-tr">${p.tr2}</div>
              <div class="ant-word-bottom">
                <button class="ant-speak" onclick="speak('${p.ru2.replace(/'/g,"\\'")}')">🔊</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    return;
  }

  if (cat === 'akraba') {
    grid.innerHTML = wordFamilies.map(f => `
      <div class="family-card">
        <div class="family-label">🌿 Akraba Kelimeler</div>
        <div class="family-root">Kök: <span>${f.kok}</span> — ${f.anlam}</div>
        <div class="family-words">
          ${f.kelimeler.map(k => `
            <div class="family-item">
              <div>
                <div class="family-item-ru">${k.ru}</div>
              </div>
              <div class="family-item-info">
                <div class="family-item-tr">${k.tr}</div>
                <div class="family-item-cat">${k.cat}</div>
              </div>
              <button class="family-item-speak" onclick="speak('${k.ru.replace(/'/g,"\\'")}')">🔊</button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    return;
  }

  let filtered = cat === 'hepsi' ? levelWords : levelWords.filter(w => w.cat === cat);
  const toplam = filtered.length;
  if (rangeFrom || rangeTo) {
    const from = (rangeFrom && rangeFrom > 0) ? rangeFrom - 1 : 0;
    const to = (rangeTo && rangeTo > 0) ? rangeTo : filtered.length;
    filtered = filtered.slice(from, to);
  }
  const _info = document.getElementById('range-info');
  if (_info) _info.textContent = (rangeFrom || rangeTo) ? `${filtered.length} / ${toplam} kelime` : `${toplam} kelime`;
  // Sayfalama
  const _tp = Math.max(1, Math.ceil(filtered.length / wordsPerPage));
  if (wordsPage > _tp) wordsPage = _tp;
  if (wordsPage < 1) wordsPage = 1;
  const _st = (wordsPage - 1) * wordsPerPage;
  const _items = filtered.slice(_st, _st + wordsPerPage);
  grid.innerHTML = _items.map(w => wordCardHTML(w)).join('');

  const footer = document.getElementById('words-pagination');
  if (footer) {
    const buttons = pageButtonsHTML(wordsPage, _tp, 'wordsGoPage');
    const jump = _tp > 1
      ? `<span class="pg-jump">Sayfa <input type="number" min="1" max="${_tp}" id="words-jump" placeholder="${wordsPage}" onkeydown="if(event.key==='Enter')wordsJumpGo()"><button class="pg-btn" onclick="wordsJumpGo()">Git</button></span>`
      : '';
    const perpage = `<div class="pg-perpage">Sayfa başına
      <select onchange="setWordsPerPage(this.value)">
        ${[20, 50, 100].map(n => `<option value="${n}" ${n === wordsPerPage ? 'selected' : ''}>${n}</option>`).join('')}
      </select></div>`;
    footer.innerHTML = `<div class="pg-footer">
      <div class="pg-total">Toplam ${filtered.length} kelime</div>
      <div class="pg-center">${buttons}${jump}</div>
      ${perpage}
    </div>`;
  }
}

function wordCardHTML(w, inBank) {
    const tipHTML = w.tip ? `<span class="word-tip ${w.tip==='СВ'||w.tip==='CV'?'word-tip-cv':'word-tip-ncv'}">${w.tip==='CV'?'СВ':w.tip==='NCV'?'НСВ':w.tip}</span>` : '';
    const cvHTML = w.cv ? `<div class="word-cv-pair">⇄ СВ: <b>${w.cv}</b></div>` : '';
    const ncvHTML = w.ncv ? `<div class="word-cv-pair">⇄ НСВ: <b>${w.ncv}</b></div>` : '';
    const extraHTML = (cvHTML||ncvHTML) ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--light-gray);">${cvHTML}${ncvHTML}</div>` : '';
    const genderClass = w.cinsiyet === 'м' ? 'gender-m' : w.cinsiyet === 'ж' ? 'gender-f' : 'gender-n';
    const genderLabel = w.cinsiyet === 'м' ? 'м (erkil)' : w.cinsiyet === 'ж' ? 'ж (dişil)' : w.cinsiyet === 'с' ? 'с (nötr)' : '';
    const genderHTML = w.cinsiyet ? `<span class="word-gender ${genderClass}">${genderLabel}</span>` : '';
    const padejHTML = w.padej ? `<span class="word-padej">${w.padej}</span><br>` : '';
    const ruSafe = w.ru.replace(/'/g, "\\'");
    const trSafe = (w.tr || '').replace(/'/g, "\\'");
    const isSaved = (typeof isWordSaved === 'function') && isWordSaved(w.ru);
    const isLearned = (typeof learnedWords !== 'undefined') && learnedWords.has(w.ru);
    // ✓ öğrenildi butonu YALNIZCA kaydedilmiş kelimelerde görünür (normal sayfa + banka)
    const showLearn = isSaved;
    const learnBtn = showLearn
      ? `<button class="word-learn${isLearned ? ' active' : ''}" onclick="toggleLearned(event,'${ruSafe}')" title="Öğrenildi olarak işaretle">✓</button>`
      : '';
    return `
    <div class="word-card${isSaved ? ' saved' : ''}${showLearn ? ' has-learn' : ''}">
      ${learnBtn}
      <button class="word-save${isSaved ? ' active' : ''}" onclick="toggleSaveWord(event,'${ruSafe}','${trSafe}','${w.level || ''}')" title="Kaydet">${isSaved ? '★' : '☆'}</button>
      <button class="word-speak" onclick="speak('${ruSafe}')">🔊</button>
      <div class="word-ru">${_escHtml(w.ru)}</div>
      ${genderHTML}
      ${tipHTML}
      ${padejHTML}
      <div class="word-tr">${_escHtml(w.tr)}</div>
      <div class="word-pron">[${w.p || ''}]</div>
      ${extraHTML}
      ${w.ornek ? `<div class="word-example"><div class="word-example-ru">${w.ornek}</div><div class="word-example-tr">${w.ornekTr}</div></div>` : ''}
      ${inBank ? `<button class="card-review-btn" onclick="reviewOneWord('${ruSafe}')">🔁 Tekrar Et</button>` : ''}
    </div>`;
}
// ===== KELİME KAYDETME (Premium) =====
let savedWords = new Set();      // status = 'saved'  (tekrar listesi)
let learnedWords = new Set();    // status = 'learned' (öğrenildi)
// Banka filtre durumu
let bankStatus = 'saved', bankLevel = 'hepsi', bankType = 'hepsi';
let bankSearchQuery = '', bankPage = 1;
const BANK_PAGE_SIZE = 20;

function isWordSaved(ru) {
  return savedWords.has(ru) || learnedWords.has(ru);
}

async function loadSavedWords() {
  savedWords = new Set();
  learnedWords = new Set();
  try {
    if (typeof sb !== 'undefined' && sb && typeof currentUser !== 'undefined' && currentUser) {
      const { data, error } = await sb.from('saved_words').select('word_ru, status').eq('user_id', currentUser.id);
      if (!error && data) data.forEach(r => {
        if (r.status === 'learned') learnedWords.add(r.word_ru);
        else savedWords.add(r.word_ru);
      });
    }
  } catch (e) { _logDev('Kayıtlı kelimeler yüklenemedi:', e); }
  // Görünümleri tazele
  const cs = document.getElementById('words-category-select');
  const normalCats = ['hepsi','isim','fiil','sıfat','zarf','zamir','edat','bağlaç'];
  if (cs && cs.style.display === 'block' && typeof currentCat !== 'undefined' && normalCats.includes(currentCat)) {
    renderWords(currentCat);
  }
  const bank = document.getElementById('words-bank');
  if (bank && bank.style.display === 'block') renderBank();
}

async function toggleSaveWord(ev, ru, tr, level) {
  if (ev) ev.stopPropagation();
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  if (typeof emailVerified === 'function' && !emailVerified()) {
    toast('Bu özellik için önce e-posta adresini doğrulaman gerekiyor. Üstteki banttan doğrulama mailini tekrar gönderebilirsin.');
    return;
  }
  const isPremium = currentProfile && (currentProfile.plan === 'premium' || currentProfile.is_admin);
  if (!isPremium) {
    toast('Kelime kaydetme Premium özelliğidir. Premium ile öğrendiğin kelimeleri kaydedip her gün tekrar edebilirsin.');
    return;
  }
  const btn = ev ? ev.currentTarget : null;
  const card = btn ? btn.closest('.word-card') : null;
  try {
    if (isWordSaved(ru)) {
      const { error } = await sb.from('saved_words').delete().eq('user_id', currentUser.id).eq('word_ru', ru);
      if (error) throw error;
      savedWords.delete(ru); learnedWords.delete(ru);
      if (btn) { btn.classList.remove('active'); btn.textContent = '☆'; }
      if (card) {
        card.classList.remove('saved', 'has-learn');
        const lb = card.querySelector('.word-learn');
        if (lb) lb.remove();
      }
      // Bankadaysak kart listeden çıksın
      if (card && card.classList.contains('in-bank')) card.remove();
    } else {
      const { error } = await sb.from('saved_words').upsert(
        { user_id: currentUser.id, word_ru: ru, word_tr: tr, level: level || null, status: 'saved' },
        { onConflict: 'user_id,word_ru' }
      );
      if (error) throw error;
      savedWords.add(ru);
      if (typeof logActivity === 'function') logActivity('wordsSaved', 1);
      if (btn) { btn.classList.add('active'); btn.textContent = '★'; }
      if (card) {
        card.classList.add('saved', 'has-learn');
        // ✓ öğrenildi butonunu anında ekle (yoksa)
        if (!card.querySelector('.word-learn')) {
          const lb = document.createElement('button');
          lb.className = 'word-learn';
          lb.title = 'Öğrenildi olarak işaretle';
          lb.textContent = '✓';
          lb.onclick = function (e) { toggleLearned(e, ru); };
          card.insertBefore(lb, card.firstChild);
        }
      }
    }
  } catch (e) {
    _logDev('Kelime kaydedilemedi:', e);
    toast('Kelime kaydedilemedi. Lütfen tekrar dene.');
  }
}

// ✓ Öğrenildi: kelimeyi kayıtlı <-> öğrenildi arasında taşı
async function toggleLearned(ev, ru) {
  if (ev) ev.stopPropagation();
  if (!currentUser) return;
  const yeni = learnedWords.has(ru) ? 'saved' : 'learned';
  const btn = ev ? ev.currentTarget : null;
  try {
    const { error } = await sb.from('saved_words').update({ status: yeni }).eq('user_id', currentUser.id).eq('word_ru', ru);
    if (error) throw error;
    if (yeni === 'learned') { savedWords.delete(ru); learnedWords.add(ru); }
    else { learnedWords.delete(ru); savedWords.add(ru); }
    if (yeni === 'learned' && typeof logActivity === 'function') logActivity('wordsLearned', 1);
    // Tıklanan butonu anında güncelle (normal sayfada da yeşil olsun)
    if (btn) btn.classList.toggle('active', yeni === 'learned');
    // Bankadaysak listeyi tazele (kayıtlı/öğrenilmiş sekmeleri arası taşıma)
    const bank = document.getElementById('words-bank');
    if (bank && bank.style.display === 'block') renderBank();
  } catch (e) { _logDev('Öğrenildi işaretlenemedi:', e); toast('İşlem başarısız oldu. Lütfen tekrar dene.'); }
}

// ===== KELİME KASASI =====
function showBank() {
  if (!currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  currentLevel = 'bank';
  document.getElementById('words-level-select').style.display = 'none';
  document.getElementById('words-sozluk').style.display = 'none';
  document.getElementById('words-category-select').style.display = 'none';
  document.getElementById('words-bank').style.display = 'block';
  bankStatus = 'saved'; bankLevel = 'hepsi'; bankType = 'hepsi';
  bankSearchQuery = ''; bankPage = 1;
  const si = document.getElementById('kasa-search-input'); if (si) si.value = '';
  ['bank-status-tabs','bank-level-tabs','bank-type-tabs'].forEach(id => {
    const bar = document.getElementById(id);
    if (bar) bar.querySelectorAll('button').forEach((b,i) => b.classList.toggle('active', i === 0));
  });
  renderBank();
  window.scrollTo(0, 0);
}

function bankSetStatus(s, btn) { bankStatus = s; bankPage = 1; _bankActive(btn); renderBank(); }
function bankSetLevel(l, btn) { bankLevel = l; bankPage = 1; _bankActive(btn); renderBank(); }
function bankSetType(t, btn) { bankType = t; bankPage = 1; _bankActive(btn); renderBank(); }
function _bankActive(btn) {
  if (!btn || !btn.parentElement) return;
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== TEKRAR ET (kaydedilen kelimelerden rastgele quiz) =====
function startReviewQuiz(fromBank) {
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  reviewReturnTo = fromBank ? 'bank' : 'profile';
  let pool = [];
  if (fromBank) {
    const set = bankStatus === 'learned' ? learnedWords : savedWords;
    set.forEach(ru => { const w = wordsByRu[ru]; if (w) pool.push(w); });
    if (bankLevel !== 'hepsi') {
      if (bankLevel === 'A1-A2') pool = pool.filter(w => w.level === 'A1' || w.level === 'A2');
      else pool = pool.filter(w => w.level === bankLevel);
    }
    if (bankType !== 'hepsi') pool = pool.filter(w => w.cat === bankType);
  } else {
    savedWords.forEach(ru => { const w = wordsByRu[ru]; if (w) pool.push(w); });
  }
  if (pool.length < 4) { toast('Tekrar için en az 4 kaydedilmiş kelime gerekli.'); return; }
  quizSettings = { type: 'ru-tr', cat: 'hepsi', count: pool.length, level: 'hepsi' };
  qList = shuffle(pool);
  qIdx = 0; qScore = 0; qWrong = 0;
  // Quiz sayfasına geç (kurulum ekranını atlayarak doğrudan başlat)
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const qp = document.getElementById('page-quiz');
  if (qp) qp.classList.add('active');
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  window.scrollTo(0, 0);
  loadQ();
}

function _bankBaseList() {
  // Durum (kayıtlı/öğrenilmiş) + arama uygulanmış liste
  const set = bankStatus === 'learned' ? learnedWords : savedWords;
  let list = [];
  set.forEach(ru => { const w = wordsByRu[ru]; list.push(w || { ru: ru, tr: '', p: '', cat: '', level: '' }); });
  const q = (bankSearchQuery || '').trim().toLowerCase();
  if (q) list = list.filter(w => (w.ru || '').toLowerCase().includes(q) || (w.tr || '').toLowerCase().includes(q));
  return list;
}

function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function renderBank() {
  const grid = document.getElementById('bank-grid');
  if (!grid) return;

  // Üst istatistik + sekme sayıları (toplam)
  _setText('kasa-saved-count', savedWords.size);
  _setText('kasa-learned-count', learnedWords.size);
  _setText('tab-saved-count', '(' + savedWords.size + ')');
  _setText('tab-learned-count', '(' + learnedWords.size + ')');

  // Durum + arama
  let baseList = _bankBaseList();

  // Seviye sayıları (arama dahil, seviye filtresi öncesi)
  const lvlCount = (fn) => baseList.filter(fn).length;
  _setText('blc-hepsi', '(' + baseList.length + ')');
  _setText('blc-a1a2', '(' + lvlCount(w => w.level === 'A1' || w.level === 'A2') + ')');
  _setText('blc-b1', '(' + lvlCount(w => w.level === 'B1') + ')');
  _setText('blc-b2', '(' + lvlCount(w => w.level === 'B2') + ')');
  _setText('blc-c1', '(' + lvlCount(w => w.level === 'C1') + ')');

  // Seviye filtresi
  let levelList = baseList;
  if (bankLevel !== 'hepsi') {
    if (bankLevel === 'A1-A2') levelList = baseList.filter(w => w.level === 'A1' || w.level === 'A2');
    else levelList = baseList.filter(w => w.level === bankLevel);
  }

  // Tür sayıları (seviye filtresi sonrası)
  const tCount = (c) => levelList.filter(w => w.cat === c).length;
  _setText('btc-hepsi', '(' + levelList.length + ')');
  ['isim','fiil','sıfat','zarf','zamir','edat','bağlaç'].forEach(c => _setText('btc-' + c, '(' + tCount(c) + ')'));

  // Tür filtresi
  let finalList = (bankType === 'hepsi') ? levelList : levelList.filter(w => w.cat === bankType);
  finalList.sort((a, b) => (a.ru || '').localeCompare(b.ru || '', 'ru'));

  if (!finalList.length) {
    grid.innerHTML = `<div class="profile-empty" style="grid-column:1/-1;">Bu filtrede ${bankStatus === 'learned' ? 'öğrenilmiş' : 'kayıtlı'} kelime yok.</div>`;
    const pg = document.getElementById('bank-pagination'); if (pg) pg.innerHTML = '';
    return;
  }

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(finalList.length / BANK_PAGE_SIZE));
  if (bankPage > totalPages) bankPage = totalPages;
  if (bankPage < 1) bankPage = 1;
  const start = (bankPage - 1) * BANK_PAGE_SIZE;
  const pageItems = finalList.slice(start, start + BANK_PAGE_SIZE);
  grid.innerHTML = pageItems.map(w => wordCardHTML(w, true)).join('');
  renderPagination('bank-pagination', bankPage, totalPages, 'bankGoPage');
}

function bankGoPage(p) {
  bankPage = p;
  renderBank();
  const top = document.getElementById('words-bank');
  if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bankSearch(q) {
  bankSearchQuery = q || '';
  bankPage = 1;
  renderBank();
}

// Sayfa düğmeleri HTML'i (« Önceki  1 2 3 … N  Sonraki »)
function pageButtonsHTML(page, totalPages, fnName) {
  if (totalPages <= 1) return '';
  let html = `<button class="pg-btn" ${page === 1 ? 'disabled' : ''} onclick="${fnName}(${page - 1})">« Önceki</button>`;
  const pages = [];
  const add = (n) => pages.push(n);
  add(1);
  let s = Math.max(2, page - 1), e = Math.min(totalPages - 1, page + 1);
  if (s > 2) pages.push('...');
  for (let i = s; i <= e; i++) add(i);
  if (e < totalPages - 1) pages.push('...');
  if (totalPages > 1) add(totalPages);
  html += pages.map(p => p === '...'
    ? `<span class="pg-ellipsis">…</span>`
    : `<button class="pg-btn ${p === page ? 'active' : ''}" onclick="${fnName}(${p})">${p}</button>`
  ).join('');
  html += `<button class="pg-btn" ${page === totalPages ? 'disabled' : ''} onclick="${fnName}(${page + 1})">Sonraki »</button>`;
  return html;
}

function renderPagination(containerId, page, totalPages, fnName) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = pageButtonsHTML(page, totalPages, fnName);
}

// Tek kelimeyi hızlı tekrar et (kart üzerindeki Tekrar Et butonu)
function reviewOneWord(ru) {
  const w = wordsByRu[ru];
  if (!w) return;
  quizSettings = { type: 'ru-tr', cat: 'hepsi', count: 1, level: 'hepsi' };
  qList = [w];
  qIdx = 0; qScore = 0; qWrong = 0;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const qp = document.getElementById('page-quiz'); if (qp) qp.classList.add('active');
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  window.scrollTo(0, 0);
  loadQ();
}

function filterWords(cat, btn) {
  currentCat = cat;
  wordsPage = 1;
  const ls = document.getElementById('level-search-input');
  if (ls) ls.value = '';
  const lc = document.getElementById('level-search-clear');
  if (lc) lc.style.display = 'none';
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderWords(cat);
}

// #3 — Sadece bulunulan seviye içinde arama
function levelAra(q) {
  const grid = document.getElementById('words-grid');
  const clearBtn = document.getElementById('level-search-clear');
  const query = (q || '').trim().toLowerCase();
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
  if (!query) { renderWords(currentCat); return; }
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  const lw = getLevelWords().filter(w =>
    w.ru.toLowerCase().includes(query) ||
    w.tr.toLowerCase().includes(query) ||
    (w.p && w.p.toLowerCase().includes(query))
  );
  if (lw.length === 0) {
    grid.innerHTML = `<div class="sozluk-not-found"><div class="not-found-icon">📭</div><div class="not-found-title">"${q}" bulunamadı</div><div class="not-found-sub">Bu seviyede böyle bir kelime yok.</div></div>`;
    return;
  }
  grid.innerHTML = lw.map(w => wordCardHTML(w)).join('');
}
function levelTemizle() {
  const input = document.getElementById('level-search-input');
  if (input) { input.value = ''; input.focus(); }
  levelAra('');
}

// #1 — Eş/Zıt/Akraba ayrı kategori görünümü (tüm seviyeler)
function showSpecial(type) {
  currentLevel = 'special';
  document.getElementById('words-level-select').style.display = 'none';
  document.getElementById('words-sozluk').style.display = 'none';
  document.getElementById('words-category-select').style.display = 'block';
  document.getElementById('cat-tabs').style.display = 'none';
  const lsw = document.getElementById('level-search-wrap');
  if (lsw) lsw.style.display = 'none';
  const titles = { esanlamli: 'Eş <span>Anlamlılar</span>', zitanlamli: 'Zıt <span>Anlamlılar</span>', akraba: 'Akraba <span>Kelimeler</span>' };
  document.getElementById('words-level-title').innerHTML = titles[type] || '';
  renderWords(type);
  requestAnimationFrame(fitWords);
  window.scrollTo(0, 0);
}

// === DİNAMİK SIĞDIRMA (eş & zıt anlamlılar tek satır kalsın, asla kırpılmasın) ===
// Performans: binlerce öğede reflow (layout) titremesini önlemek için
// önce hepsini sıfırla, sonra TEK seferde ölç, sonra TEK seferde yaz.
function fitOneLine(selector, baseRem, minRem) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  // 1) Sıfırla
  els.forEach(el => {
    el.style.whiteSpace = 'nowrap';
    el.style.wordBreak = 'normal';
    el.style.overflowWrap = 'normal';
    el.style.fontSize = '';
  });
  // 2) Ölç (taşanları topla — oran ile tek adımda küçülteceğiz)
  const jobs = [];
  els.forEach(el => {
    const cw = el.clientWidth, sw = el.scrollWidth;
    if (sw > cw + 1) jobs.push({ el, ratio: cw / sw });
  });
  // 3) Yaz (oran tahminiyle tek adımda küçült)
  jobs.forEach(job => {
    job.size = baseRem * job.ratio * 0.97; // küçük güvenlik payı
    if (job.size < minRem) job.size = minRem;
    job.el.style.fontSize = job.size.toFixed(3) + 'rem';
  });
  // 4) Doğrula: tahminden sonra hâlâ taşan varsa biraz daha küçült; en küçükte bile sığmazsa kırpma yerine sar
  jobs.forEach(job => {
    const el = job.el; let size = job.size, guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && size > minRem && guard < 6) {
      size = Math.max(minRem, size - 0.04);
      el.style.fontSize = size.toFixed(3) + 'rem';
      guard++;
    }
    if (el.scrollWidth > el.clientWidth + 1) {
      el.style.whiteSpace = 'normal';
      el.style.wordBreak = 'break-word';
      el.style.overflowWrap = 'anywhere';
    }
  });
}
function fitWords() {
  fitOneLine('#words-grid .ant-word-ru', 1.15, 0.72);
  fitOneLine('#words-grid .syn-item-ru', 1.10, 0.70);
}
// Grid değişince, pencere boyutlanınca ve fontlar yüklenince otomatik yeniden ayarla
(function () {
  const grid = document.getElementById('words-grid');
  if (grid && 'MutationObserver' in window) {
    new MutationObserver(() => requestAnimationFrame(fitWords)).observe(grid, { childList: true });
  }
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fitWords, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitWords));
})();
// renderWords çağrısı selectLevel'dan yapılacak

// SPEECH - Mobil uyumlu
function speak(text) {
  // Önce Web Speech API dene (mobilde daha iyi çalışır)
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = 0.85;
    u.pitch = 1;
    // Rus sesi bul
    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith('ru'));
    if (ruVoice) u.voice = ruVoice;
    window.speechSynthesis.speak(u);
    return;
  }
  // Fallback: Google TTS
  const audio = new Audio();
  audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ru&client=tw-ob`;
  audio.play().catch(e => _logDev('Ses çalınamadı:', e));
}
// Sesleri önceden yükle
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// QUIZ
let qList=[], qIdx=0, qScore=0, qAnswered=false, qWrong=0;
let reviewReturnTo = null;
let qTypes = null;  // 'mix' testlerinde her soru için tür
let quizReveal = 'instant';   // 'instant' | 'end'
let qAnswers = [];            // her sorunun {n, ok, your, correct, ru, tr}
let quizTimerId = null;
let quizTimeLeft = 0;
let paragraphQuestions = [];
let quizSettings = { type:'ru-tr', cat:'hepsi', count:20, level:'hepsi' };

function selectSetup(key, val, btn) {
  quizSettings[key] = val;
  btn.closest('.setup-options').querySelectorAll('.setup-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function selectReveal(val, btn) {
  quizReveal = val;
  if (btn) { btn.closest('.setup-options').querySelectorAll('.setup-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}

function quizBack() {
  stopQuizTimer();
  if (reviewReturnTo === 'bank') {
    reviewReturnTo = null;
    if (typeof showPage === 'function') showPage('words');
    if (typeof showBank === 'function') showBank();
    return;
  }
  if (reviewReturnTo === 'profile') {
    reviewReturnTo = null;
    if (typeof showPage === 'function') showPage('profile');
    return;
  }
  if (reviewReturnTo === 'testbuilder') {
    reviewReturnTo = null;
    if (typeof openTestBuilder === 'function') openTestBuilder();
    return;
  }
  showSetup();
}

function showSetup() {
  document.getElementById('quiz-setup').style.display = 'block';
  document.getElementById('quiz-playing').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'none';
}

function shuffle(a){return[...a].sort(()=>Math.random()-0.5);}

function startQuiz(){
  reviewReturnTo = null;
  const _rb = document.querySelector('#quiz-setup [data-reveal].active'); quizReveal = _rb ? _rb.dataset.reveal : 'instant';
  // Paragraf soruları ayrı havuzdan gelir (kelime değil)
  if (quizSettings.type === 'paragraf') {
    let pool = (paragraphQuestions || []).slice();
    if (quizSettings.level !== 'hepsi') pool = pool.filter(p => p.level === quizSettings.level);
    if (pool.length < 1) { toast('Bu seviyede paragraf sorusu yok. "Hepsi" seç ya da başka seviye dene.'); showSetup(); return; }
    const count = parseInt(quizSettings.count) || 20;
    qList = shuffle(pool).slice(0, count);
    qIdx = 0; qScore = 0; qWrong = 0;
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-playing').style.display = 'block';
    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'block';
    loadQ();
    return;
  }
  // Seviye filtresi
  let pool = words;
  if (quizSettings.level !== 'hepsi') {
    pool = words.filter(w => w.level === quizSettings.level);
  }
  // Kategori filtresi
  if (quizSettings.cat !== 'hepsi') {
    pool = pool.filter(w => w.cat === quizSettings.cat);
  }
  if (pool.length < 4) {
    toast('Bu seviye/kategori kombinasyonunda yeterli kelime yok.');
    showSetup();
    return;
  }
  const count = parseInt(quizSettings.count) || 20;
  qList = shuffle(pool).slice(0, count);
  qIdx = 0; qScore = 0; qWrong = 0;

  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  loadQ();
}

/* ===== TEST MOTORU — önceden hazırla + tek soruyu çiz (gezinme/atlama destekli) ===== */
let qPrep = [];
let qReviewItems = [];

function _qType(i){ return quizSettings.type === 'mix' ? ((qTypes && qTypes[i]) ? qTypes[i] : 'ru-tr') : quizSettings.type; }

function buildQuestion(w, type){
  if (type === 'paragraf'){
    return { kind:'choice', type:'paragraf', leftAlign:true, optFont:'', pron:'', speakRu:'',
      promptHTML:`<div class="para-text">${w.paragraf}</div><div class="para-soru">${w.soru}</div>`,
      options:(w.siklar||[]).slice(), correctIndex:w.dogru, aciklama:w.aciklama||'' };
  }
  if (type === 'tr-ru'){
    const wrong = shuffle(words.filter(x=>x.ru!==w.ru)).slice(0,3).map(x=>x.ru);
    const options = shuffle([w.ru, ...wrong]);
    return { kind:'choice', type, optFont:'ru', pron:'', speakRu:w.ru, promptHTML:`${w.tr}`, options, correctIndex:options.indexOf(w.ru), aciklama:'' };
  }
  if (type === 'tf'){
    const isCorrect = Math.random() > 0.5;
    let shownTr = w.tr;
    if (!isCorrect){ const d = shuffle(words.filter(x=>x.ru!==w.ru))[0]; shownTr = d ? d.tr : w.tr; }
    return { kind:'choice', type, optFont:'', pron:`[${w.p}]`, speakRu:w.ru,
      promptHTML:`<span style="font-family:'Noto Sans',sans-serif;">${w.ru}</span><br><small style="font-size:1rem;color:var(--gray);">${shownTr}</small>`,
      options:['Doğru ✓','Yanlış ✗'], correctIndex: isCorrect ? 0 : 1, aciklama:'' };
  }
  if (type === 'fill'){
    const mode = Math.random() > 0.5 ? 'ru' : 'tr';
    if (mode === 'ru')
      return { kind:'write', type:'fill', writeMode:'ru', pron:'', speakRu:w.ru, correct:w.ru, aciklama:'',
        promptHTML:`<div style="font-size:1.1rem;color:var(--gray);margin-bottom:8px;">Türkçesi:</div><div style="font-size:1.6rem;font-weight:700;">${w.tr}</div>` };
    return { kind:'write', type:'fill', writeMode:'tr', pron:'', speakRu:w.ru, correct:w.tr, aciklama:'',
      promptHTML:`<div style="font-size:1.1rem;color:var(--gray);margin-bottom:8px;">Rusçası:</div><div style="font-family:'Noto Sans',sans-serif;font-size:1.8rem;font-weight:700;">${w.ru}</div><div style="font-size:0.9rem;color:var(--gray);">[${w.p}]</div>` };
  }
  // ru-tr (varsayılan)
  const wrong = shuffle(words.filter(x=>x.ru!==w.ru)).slice(0,3).map(x=>x.tr);
  const options = shuffle([w.tr, ...wrong]);
  return { kind:'choice', type:'ru-tr', optFont:'tr', pron:`[${w.p}]`, speakRu:w.ru,
    promptHTML:`<span style="font-family:'Noto Sans',sans-serif;">${w.ru}</span>`, options, correctIndex:options.indexOf(w.tr), aciklama:'' };
}

// Taze başlatma (tüm launcher'lar bunu çağırır)
function loadQ(){
  qPrep = qList.map((w,i)=> buildQuestion(w, _qType(i)));
  qAnswers = new Array(qList.length);
  qScore = 0; qWrong = 0;
  startQuizTimer(qList.length * 60);
  renderQ();
}

const _QTYPE_LABELS = {'ru-tr':'🇷🇺 → 🇹🇷 Rusça → Türkçe','tr-ru':'🇹🇷 → 🇷🇺 Türkçe → Rusça','fill':'✍️ Yaz Bakalım','tf':'✓✗ Doğru / Yanlış','paragraf':'📖 Paragraf Soruları'};

function renderQ(){
  qAnswered = false;
  const prep = qPrep[qIdx], a = qAnswers[qIdx], total = qList.length;
  document.getElementById('quiz-fill').style.width = (qIdx/total*100)+'%';
  document.getElementById('quiz-num').textContent = `Soru ${qIdx+1} / ${total}`;
  document.getElementById('quiz-type-badge').textContent = _QTYPE_LABELS[prep.type] || '';
  document.getElementById('quiz-q').innerHTML = prep.promptHTML;
  document.getElementById('quiz-pron').textContent = prep.pron || '';
  const fb = document.getElementById('quiz-fb'); fb.textContent=''; fb.className='quiz-feedback';

  if (prep.kind === 'choice') renderChoice(prep, a);
  else renderWrite(prep, a);

  // anında modda cevaplanmışsa geri bildirim göster
  if (a && a.answered && quizReveal === 'instant'){
    if (a.ok){ fb.textContent='✓ Doğru!'; fb.className='quiz-feedback feedback-correct'; }
    else {
      const correctTxt = prep.kind==='write' ? prep.correct : prep.options[prep.correctIndex];
      fb.innerHTML = `✗ Yanlış. Doğru: <span style="font-family:'Noto Sans',sans-serif;">${correctTxt}</span>` + (prep.aciklama?`<div class="para-aciklama">${prep.aciklama}</div>`:'');
      fb.className='quiz-feedback feedback-wrong';
    }
  }

  const nb = document.getElementById('quiz-next');
  nb.style.display = 'inline-block';
  nb.textContent = (qIdx >= total-1) ? 'Testi Bitir ✓' : 'Sonraki Soru →';
  renderNav();
}

function renderChoice(prep, a){
  const locked = (quizReveal === 'instant' && a && a.answered);
  const font = prep.optFont === 'ru' ? "font-family:'Noto Sans',sans-serif;" : '';
  const left = prep.leftAlign ? 'text-align:left;' : '';
  document.getElementById('quiz-opts').innerHTML = prep.options.map((o,i)=>{
    let cls = 'quiz-opt';
    if (a && a.answered){
      if (quizReveal === 'instant'){
        if (i === prep.correctIndex) cls += ' correct';
        else if (i === a.yourIndex) cls += ' wrong';
      } else if (i === a.yourIndex) cls += ' chosen';
    }
    return `<button class="${cls}" style="${font}${left}" ${locked?'disabled':''} onclick="pickChoice(${i})">${o}</button>`;
  }).join('');
}

function renderWrite(prep, a){
  const isRu = prep.writeMode === 'ru';
  const ph = isRu ? 'Rusça yaz...' : 'Türkçe yaz...';
  const font = isRu ? "font-family:'Noto Sans',sans-serif;" : '';
  const locked = (quizReveal === 'instant' && a && a.answered);
  const val = (a && a.answered && a.your !== '(boş)') ? _escAttr(a.your) : '';
  document.getElementById('quiz-opts').innerHTML = `
    <div class="write-input-wrap">
      <input type="text" id="write-answer" class="write-answer-input" placeholder="${ph}" style="${font}" value="${val}" ${locked?'disabled':''}
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        onkeydown="if(event.key==='Enter')pickWrite()">
      <button class="write-submit-btn" ${locked?'disabled':''} onclick="pickWrite()">Kaydet →</button>
    </div>`;
  if (!locked) setTimeout(()=>{ const inp=document.getElementById('write-answer'); if(inp) inp.focus(); }, 80);
}

function _scoreAdjustRemove(prev){ if (prev && prev.answered){ if (prev.ok) qScore--; else qWrong--; } }

function pickChoice(i){
  const prep = qPrep[qIdx], prev = qAnswers[qIdx];
  if (quizReveal === 'instant' && prev && prev.answered) return; // kilitli
  const ok = (i === prep.correctIndex);
  _scoreAdjustRemove(prev);
  qAnswers[qIdx] = { answered:true, yourIndex:i, your:prep.options[i], ok };
  if (ok) { qScore++; _autoSaveCurrent(); } else qWrong++;
  if (quizReveal === 'instant' && prep.speakRu && typeof speak === 'function') speak(prep.speakRu);
  renderQ();
}

function _writeMatch(given, correct){
  given = (given||'').toLowerCase().trim();
  const expected = (correct||'').toLowerCase().trim();
  const clean = expected.replace(/\s*\([^)]*\)/g,'').trim();
  return given !== '' && (given === expected || given === clean || clean.split('/').map(s=>s.trim()).includes(given));
}

function pickWrite(){
  const prep = qPrep[qIdx], inp = document.getElementById('write-answer'); if (!inp) return;
  const prev = qAnswers[qIdx];
  if (quizReveal === 'instant' && prev && prev.answered) return;
  const given = inp.value.trim();
  const ok = _writeMatch(given, prep.correct);
  _scoreAdjustRemove(prev);
  qAnswers[qIdx] = { answered:true, your: given || '(boş)', ok };
  if (ok) { qScore++; _autoSaveCurrent(); } else qWrong++;
  if (quizReveal === 'instant' && prep.speakRu && typeof speak === 'function') speak(prep.speakRu);
  renderQ();
}

function renderNav(){
  const grid = document.getElementById('quiz-nav-grid'); if (!grid) return;
  grid.innerHTML = qList.map((_,i)=>{
    const a = qAnswers[i]; let cls = 'empty';
    if (i === qIdx) cls = 'now';
    else if (a && a.answered) cls = (quizReveal === 'instant') ? (a.ok ? 'ok' : 'no') : 'ans';
    return `<button class="qnav-cell ${cls}" onclick="jumpToQ(${i})">${i+1}</button>`;
  }).join('');
  const leg = document.getElementById('quiz-nav-legend');
  if (leg) leg.innerHTML = (quizReveal === 'instant')
    ? '<span><i class="lg ok"></i>Doğru</span><span><i class="lg no"></i>Yanlış</span><span><i class="lg now"></i>Şu an</span><span><i class="lg empty"></i>Boş</span>'
    : '<span><i class="lg ans"></i>Cevaplı</span><span><i class="lg now"></i>Şu an</span><span><i class="lg empty"></i>Boş</span>';
}

function jumpToQ(i){ if (i<0 || i>=qList.length) return; qIdx = i; renderQ(); window.scrollTo(0,0); }
function quizAdvance(){ if (qIdx >= qList.length-1) return finishQuizNow(); qIdx++; renderQ(); window.scrollTo(0,0); }
function nextQ(){ quizAdvance(); }

async function finishQuizNow(){
  const blanks = qList.reduce((n,_,i)=> n + ((qAnswers[i] && qAnswers[i].answered) ? 0 : 1), 0);
  if (blanks > 0 && !(await uiConfirm(blanks + ' soru boş kaldı. Testi bitirmek istiyor musun?', 'Testi Bitir'))) return;
  showResult();
}

function showResult(){
  stopQuizTimer();
  document.getElementById('quiz-fill').style.width = '100%';
  document.getElementById('quiz-card').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'block';
  // İnceleme öğeleri — durum: ok (doğru) / wrong (yanlış) / blank (boş)
  qReviewItems = qList.map((w,i)=>{
    const prep = qPrep[i], a = qAnswers[i];
    const correct = prep.kind === 'write' ? prep.correct : prep.options[prep.correctIndex];
    let st = 'blank', your = '(boş)';
    if (a && a.answered) { st = a.ok ? 'ok' : 'wrong'; your = a.your; }
    return { n:i+1, st, ok: st==='ok', your, correct,
      ru: w.ru || (prep.type==='paragraf' ? 'Paragraf sorusu' : ''), tr: w.tr || '' };
  });
  const cOk = qReviewItems.filter(x=>x.st==='ok').length;
  const cWrong = qReviewItems.filter(x=>x.st==='wrong').length;
  const cBlank = qReviewItems.filter(x=>x.st==='blank').length;
  qScore = cOk; qWrong = cWrong;
  const pct = Math.round(cOk/qList.length*100);
  document.getElementById('res-score').textContent = `${cOk}/${qList.length}`;
  const msgs = [[0,40,'Daha çok çalış 💪','Pes etme, tekrar dene!'],[40,70,'Fena değil! 🙂','Biraz daha pratik yap.'],[70,90,'Çok iyi! 👏','Başarın artıyor!'],[90,101,'Mükemmel! 🏆','Harika bir sınav performansı!']];
  const [,,l,s] = msgs.find(([mn,mx]) => pct>=mn && pct<mx);
  document.getElementById('res-label').textContent = l;
  document.getElementById('res-sub').textContent = s;
  document.getElementById('res-stats').innerHTML = `
    <div class="result-stat"><div class="result-stat-num" style="color:#10b981;">${cOk}</div><div class="result-stat-label">Doğru</div></div>
    <div class="result-stat"><div class="result-stat-num" style="color:#ef4444;">${cWrong}</div><div class="result-stat-label">Yanlış</div></div>
    <div class="result-stat"><div class="result-stat-num" style="color:#9ca3af;">${cBlank}</div><div class="result-stat-label">Boş</div></div>
    <div class="result-stat"><div class="result-stat-num">${pct}%</div><div class="result-stat-label">Başarı</div></div>
  `;
  renderQuizReview('quiz-review', qReviewItems);
  saveTestResult();
}


// VIDEO
function renderVideos(){
  document.getElementById('video-grid').innerHTML=videos.map(v=>`
    <div class="video-card ${v.locked?'video-locked':''}">
      <div class="video-thumb" style="background:${v.locked?'#1a2744':'#003580'}">
        <div class="video-thumb-num">${v.num}</div>
        ${v.locked?'<div class="video-lock-icon">🔒</div>':''}
        <div class="video-play" onclick="${v.locked?'showPage(\'pricing\')':'toast(\'Video yakında eklenecek!\')'}">
          ${v.locked?'🔒':'▶'}
        </div>
      </div>
      <div class="video-info">
        <div class="video-level">${v.level} Seviye</div>
        <div class="video-title">${v.title}</div>
        <div class="video-desc">${v.desc}</div>
      </div>
    </div>
  `).join('');
}

// NAV
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-links button').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const nb=document.getElementById('nav-'+id);
  if(nb) nb.classList.add('active');
  window.scrollTo(0,0);
  if(id==='quiz') showSetup();
  if(id==='admin' && typeof openAdmin==='function') openAdmin();
  if (typeof trackPageView === 'function') trackPageView(id);
  if(id==='profile' && typeof openProfile==='function') openProfile();
}

// AUTH
function openAuth(tab){
  document.getElementById('auth-modal').classList.add('active');
  switchTab(tab);
  if (typeof renderTurnstile === "function") setTimeout(renderTurnstile, 80);
}
function closeAuth(){
  document.getElementById('auth-modal').classList.remove('active');
}
function switchTab(tab){
  document.getElementById('auth-form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('auth-form-register').style.display=tab==='register'?'block':'none';
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
}
document.getElementById('auth-modal').addEventListener('click',function(e){
  if(e.target===this) closeAuth();
});

// ============================================================
//  VERİ YÜKLEME — JSON dosyaları buradan otomatik yüklenir.
//  Yeni içerik eklemek için ilgili JSON dosyasını düzenlemen
//  yeterli; bu dosyaya (app.js) dokunmana gerek yok.
// ============================================================
async function loadData() {
  const j = (p) => fetch(p).then(r => { if(!r.ok) throw new Error('Yüklenemedi: '+p); return r.json(); });
  const jSafe = u => j(u).catch(() => []);
  // Önce DB'den dene (İçerik Yönetimi ile taşındıysa dosyalara gerek kalmaz)
  let dbW = [];
  try {
    if (typeof sb !== 'undefined' && sb) {
      const { data } = await sb.from('content_words').select('*').limit(10000);
      dbW = (data || []).filter(r => r.active !== false);
    }
  } catch (e) {}
  const [a1a2,b1,b2,c1,syn,ant,fam,vids] = await Promise.all([
    jSafe('data/kelimeler/a1-a2.json'),
    jSafe('data/kelimeler/b1.json'),
    jSafe('data/kelimeler/b2.json'),
    jSafe('data/kelimeler/c1.json'),
    jSafe('data/es-anlamlilar/es-anlamlilar.json'),
    jSafe('data/zit-anlamlilar/zit-anlamlilar.json'),
    jSafe('data/akraba-kelimeler/akraba-kelimeler.json'),
    jSafe('data/videolar/videolar.json'),
  ]);
  // JSON temel + DB üstüne bindirme (kelime kaybı imkânsız; dosyalar silinirse DB tek başına yeter)
  words = [].concat(a1a2,b1,b2,c1);
  if (dbW.length) applyDbWords(dbW);
  wordsByRu = {};
  words.forEach(w => { wordsByRu[w.ru] = w; });
  synonymGroups = syn; antonymPairs = ant; wordFamilies = fam; videos = vids;
  try {
    if (typeof sb !== 'undefined' && sb) {
      const [sg, ap, wf, vd] = await Promise.all([
        sb.from('content_synonyms').select('*').eq('active', true).limit(5000),
        sb.from('content_antonyms').select('*').eq('active', true).limit(2000),
        sb.from('content_families').select('*').eq('active', true).limit(2000),
        sb.from('content_videos').select('*').eq('active', true).order('num').limit(1000)
      ]);
      if (sg.data && sg.data.length) synonymGroups = sg.data.map(r => ({ grup: r.grup, kelimeler: Array.isArray(r.kelimeler) ? r.kelimeler : JSON.parse(r.kelimeler || '[]') }));
      if (ap.data && ap.data.length) antonymPairs = ap.data.map(r => ({ ru1: r.ru1, tr1: r.tr1, p1: r.p1, ru2: r.ru2, tr2: r.tr2, p2: r.p2 }));
      if (wf.data && wf.data.length) wordFamilies = wf.data.map(r => ({ kok: r.kok, anlam: r.anlam, kelimeler: Array.isArray(r.kelimeler) ? r.kelimeler : JSON.parse(r.kelimeler || '[]') }));
      if (vd.data && vd.data.length) videos = vd.data.map(r => ({ num: r.num, level: r.level, title: r.title, desc: r.descr, locked: !!r.premium, source: r.source, video_id: r.video_id, thumb: r.thumb }));
    }
  } catch (e) { _logDev('DB içerikleri yüklenemedi:', e); }
  // Paragraf soruları (dosya yoksa site yine çalışsın diye ayrı try/catch)
  try {
    let dbPq = [];
    try {
      if (typeof sb !== 'undefined' && sb) {
        const { data: pq } = await sb.from('content_pquestions').select('*').limit(2000);
        dbPq = (pq || []).filter(r => r.active !== false);
      }
    } catch (e2) {}
    if (dbPq.length) {
      paragraphQuestions = dbPq.map(r => ({ id: r.id, level: r.level, konu: r.konu, paragraf: r.paragraf, soru: r.soru, siklar: Array.isArray(r.siklar) ? r.siklar : JSON.parse(r.siklar || '[]'), dogru: r.dogru, aciklama: r.aciklama || '' }));
    } else paragraphQuestions = await j('data/sorular/paragraf-sorulari.json'); }
  catch (e) { _logDev('Paragraf soruları yüklenemedi:', e); paragraphQuestions = []; }
}
async function init(){
  try { await loadData(); renderVideos(); }
  catch(e){ _logDev('Veri yükleme hatası:', e); toast('İçerik yüklenemedi. Sayfayı yenileyin.'); }
}
init();

// ===== Kelime Bankası başlık araması (Sözlük) =====
function kbSearch(q) {
  q = (q || '').trim().toLowerCase();
  const res = document.getElementById('kb-results');
  const grid = document.querySelector('#words-level-select .level-grid');
  const clr = document.getElementById('kb-search-clear');
  if (!res) return;
  if (!q) { res.style.display = 'none'; res.innerHTML = ''; if (grid) grid.style.display = ''; if (clr) clr.style.display = 'none'; return; }
  if (clr) clr.style.display = 'block';
  if (grid) grid.style.display = 'none';
  res.style.display = 'grid';
  const all = (typeof words !== 'undefined' ? words : []);
  const list = all.filter(w => (w.ru || '').toLowerCase().includes(q) || (w.tr || '').toLowerCase().includes(q)).slice(0, 60);
  res.innerHTML = list.length
    ? list.map(w => wordCardHTML(w)).join('')
    : '<div class="profile-empty" style="grid-column:1/-1;">Sonuç bulunamadı.</div>';
}
function kbClear() { const i = document.getElementById('kb-search-input'); if (i) i.value = ''; kbSearch(''); }

/* ============================================================
   TEKRAR SİSTEMİ — yöntem seçimi + kelime seçimi
   Kelime Kartları (flashcards) + Eşleştirme (matching)
   Test / Doğru-Yanlış => mevcut quiz motoruna yönlendirir
   ============================================================ */
let reviewPool = [];
let reviewSelected = new Set();
let reviewMethod = 'flash';
let reviewFrom = 'bank';
let revF = { level: 'hepsi', type: 'hepsi', status: 'hepsi' };

function _escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function openReview(from) {
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  reviewFrom = from || 'bank';
  // Ana havuz: kayıtlı + öğrenilen (tekilleştir)
  const seen = new Set(); reviewPool = [];
  [...savedWords, ...learnedWords].forEach(ru => {
    if (seen.has(ru)) return; seen.add(ru);
    const w = wordsByRu[ru]; if (w) reviewPool.push(w);
  });
  if (reviewPool.length < 1) { toast('Tekrar için önce kelime kaydetmelisin.'); return; }
  reviewSelected = new Set(reviewPool.map(w => w.ru));
  reviewMethod = 'flash';
  revF = { level: 'hepsi', type: 'hepsi', status: 'hepsi' };
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pr = document.getElementById('page-review'); if (pr) pr.classList.add('active');
  _revShow('review-setup');
  document.querySelectorAll('.rev-method').forEach(b => b.classList.toggle('active', b.dataset.m === 'flash'));
  document.querySelectorAll('#page-review .rev-select').forEach(sel => { sel.value = 'hepsi'; });
  const f = document.getElementById('rev-filter'); if (f) f.value = '';
  renderReviewWords();
  updateRevCount();
  window.scrollTo(0, 0);
}

function _revShow(id) {
  ['review-setup','review-flash','review-match','review-done'].forEach(x => {
    const el = document.getElementById(x); if (el) el.style.display = (x === id ? 'block' : 'none');
  });
}

function reviewPickMethod(m, btn) {
  reviewMethod = m;
  document.querySelectorAll('.rev-method').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function reviewSetFilter(kind, val) {
  if (kind === 'level') revF.level = val;
  else if (kind === 'type') revF.type = val;
  else if (kind === 'status') revF.status = val;
  renderReviewWords();
}

function _reviewFiltered() {
  const f = document.getElementById('rev-filter');
  const q = (f ? f.value : '').trim().toLowerCase();
  return reviewPool.filter(w => {
    if (revF.status === 'saved' && !savedWords.has(w.ru)) return false;
    if (revF.status === 'learned' && !learnedWords.has(w.ru)) return false;
    if (revF.level !== 'hepsi') {
      if (revF.level === 'A1-A2') { if (!(w.level === 'A1' || w.level === 'A2')) return false; }
      else if (w.level !== revF.level) return false;
    }
    if (revF.type !== 'hepsi' && w.cat !== revF.type) return false;
    if (q && !((w.ru||'').toLowerCase().includes(q) || (w.tr||'').toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderReviewWords() {
  const box = document.getElementById('rev-words'); if (!box) return;
  const list = _reviewFiltered();
  if (!list.length) { box.innerHTML = '<div class="rev-empty">Bu filtreyle kelime bulunamadı.</div>'; return; }
  box.innerHTML = list.map(w => {
    const on = reviewSelected.has(w.ru);
    const ru = _escAttr(w.ru);
    return `<div class="rev-chip ${on?'on':''}" onclick="toggleReviewWord('${ru}')">
      <span class="rev-chip-box">${on?'✓':''}</span>
      <span class="rev-chip-text"><span class="rev-chip-ru">${_escHtml(w.ru)}</span><span class="rev-chip-tr">${_escHtml(w.tr)}</span></span>
      <span class="rev-chip-x">${on?'✕':'+'}</span>
    </div>`;
  }).join('');
}

function toggleReviewWord(ru) {
  if (reviewSelected.has(ru)) reviewSelected.delete(ru);
  else reviewSelected.add(ru);
  renderReviewWords();
  updateRevCount();
}

function reviewSelectAll(on) {
  if (on) _reviewFiltered().forEach(w => reviewSelected.add(w.ru));
  else reviewSelected.clear();
  renderReviewWords();
  updateRevCount();
}

function updateRevCount() {
  const n = reviewSelected.size;
  const el = document.getElementById('rev-sel-count'); if (el) el.textContent = n + ' kelime';
  const g = document.getElementById('rev-goal-num'); if (g) g.textContent = n;
}

function revGoProfile(view) {
  if (typeof showPage === 'function') showPage('profile');
  setTimeout(() => { if (typeof profileNav === 'function') {
    const btn = document.getElementById('psb-' + view);
    profileNav(view, btn);
  } }, 60);
}

function reviewExit() {
  if (reviewFrom === 'profile') { showPage('profile'); return; }
  showPage('words');
  if (typeof showBank === 'function') showBank();
}

function reviewBackToSetup() { _revShow('review-setup'); window.scrollTo(0,0); }

function reviewStart() {
  const sel = reviewPool.filter(w => reviewSelected.has(w.ru));
  const pool = sel.length ? sel : reviewPool.slice();
  if (pool.length < 1) { toast('Tekrar edilecek kelime seç.'); return; }
  if (reviewMethod === 'flash') return startFlash(pool);
  if (reviewMethod === 'match') {
    if (pool.length < 2) { toast('Eşleştirme için en az 2 kelime gerekli.'); return; }
    return startMatch(pool);
  }
  // test / tf -> mevcut quiz motoru
  if ((reviewMethod === 'test' || reviewMethod === 'tf') && pool.length < 4) {
    toast('Test için en az 4 kelime gerekli.'); return;
  }
  quizSettings = { type: (reviewMethod === 'tf' ? 'tf' : 'ru-tr'), cat: 'hepsi', count: pool.length, level: 'hepsi' };
  qList = shuffle(pool); qIdx = 0; qScore = 0; qWrong = 0;
  reviewReturnTo = (reviewFrom === 'profile') ? 'profile' : 'bank';
  quizReveal = 'instant';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-quiz').classList.add('active');
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  window.scrollTo(0, 0);
  loadQ();
}

/* ---------- Kelime Kartları ---------- */
let flashList = [], flashIdx = 0, flashFlipped = false;

function startFlash(pool) {
  flashList = shuffle(pool); flashIdx = 0; flashFlipped = false;
  _revShow('review-flash');
  renderFlash(); window.scrollTo(0,0);
}

function renderFlash() {
  const w = flashList[flashIdx]; if (!w) return;
  flashFlipped = false;
  const inner = document.getElementById('flashcard-inner'); if (inner) inner.classList.remove('flipped');
  document.getElementById('flash-front').textContent = w.ru || '';
  document.getElementById('flash-back').textContent = w.tr || '';
  document.getElementById('flash-pron').textContent = w.p ? ('[' + w.p + ']') : '';
  document.getElementById('flash-ex').textContent = w.ornek || '';
  document.getElementById('rev-flash-count').textContent = (flashIdx + 1) + ' / ' + flashList.length;
  const bar = document.getElementById('rev-flash-bar');
  if (bar) bar.style.width = ((flashIdx + 1) / flashList.length * 100) + '%';
}

function flashFlip() {
  flashFlipped = !flashFlipped;
  const inner = document.getElementById('flashcard-inner');
  if (inner) inner.classList.toggle('flipped', flashFlipped);
}

function flashNext() { if (flashIdx < flashList.length - 1) { flashIdx++; renderFlash(); } else flashDone(); }
function flashPrev() { if (flashIdx > 0) { flashIdx--; renderFlash(); } }
function flashSpeak() { const w = flashList[flashIdx]; if (w && typeof speak === 'function') speak(w.ru); }

function flashMark(known) {
  const w = flashList[flashIdx];
  if (!known && w) flashList.push(w); // "Tekrar et" -> sona ekle, tekrar görülsün
  flashNext();
}

function flashDone() {
  showReviewDone('Kartları bitirdin! 🃏', 'Tüm kartları gözden geçirdin. Harika çalışma!');
}

/* ---------- Eşleştirme ---------- */
let matchQueue = [], matchBatch = [], matchFirst = null, matchSolved = 0, matchTotal = 0, matchLock = false;
const MATCH_BATCH = 5;

function startMatch(pool) {
  matchQueue = shuffle(pool).slice();
  matchTotal = matchQueue.length; matchSolved = 0; matchFirst = null; matchLock = false;
  _revShow('review-match');
  nextMatchBatch(); window.scrollTo(0,0);
}

function nextMatchBatch() {
  matchBatch = matchQueue.splice(0, MATCH_BATCH);
  if (!matchBatch.length) return matchFinish();
  matchFirst = null;
  let cards = [];
  matchBatch.forEach((w, i) => {
    cards.push({ id: i, side: 'ru', text: w.ru });
    cards.push({ id: i, side: 'tr', text: w.tr });
  });
  cards = shuffle(cards);
  const grid = document.getElementById('match-grid');
  grid.innerHTML = cards.map(c =>
    `<button class="match-card ${c.side}" data-pair="${c.id}" data-side="${c.side}" onclick="matchPick(this)">${_escHtml(c.text)}</button>`
  ).join('');
  updateMatchProgress();
  const msg = document.getElementById('rev-match-msg'); if (msg) msg.textContent = '';
}

function updateMatchProgress() {
  const p = document.getElementById('rev-match-progress');
  if (p) p.textContent = 'Eşleşen: ' + matchSolved + ' / ' + matchTotal;
}

function matchPick(btn) {
  if (matchLock || btn.classList.contains('done')) return;
  if (!matchFirst) { matchFirst = btn; btn.classList.add('sel'); return; }
  if (btn === matchFirst) { btn.classList.remove('sel'); matchFirst = null; return; }
  const a = matchFirst, b = btn;
  const ok = (a.dataset.pair === b.dataset.pair) && (a.dataset.side !== b.dataset.side);
  if (ok) {
    a.classList.remove('sel'); a.classList.add('done'); b.classList.add('done');
    matchFirst = null; matchSolved++; updateMatchProgress();
    const remaining = document.querySelectorAll('#match-grid .match-card:not(.done)').length;
    if (remaining === 0) {
      const msg = document.getElementById('rev-match-msg'); if (msg) msg.textContent = 'Harika! Yeni grup geliyor…';
      matchLock = true;
      setTimeout(() => { matchLock = false; nextMatchBatch(); }, 750);
    }
  } else {
    matchLock = true;
    a.classList.add('wrong'); b.classList.add('wrong','sel');
    setTimeout(() => {
      a.classList.remove('sel','wrong'); b.classList.remove('sel','wrong');
      matchFirst = null; matchLock = false;
    }, 600);
  }
}

function matchFinish() {
  showReviewDone('Eşleştirme tamam! 🔗', matchTotal + ' kelimeyi başarıyla eşleştirdin!');
}

/* ---------- Ortak bitiş ekranı ---------- */
function showReviewDone(title, sub) {
  const t = document.getElementById('rev-done-title'); if (t) t.textContent = title;
  const s = document.getElementById('rev-done-sub'); if (s) s.textContent = sub || '';
  _revShow('review-done'); window.scrollTo(0,0);
}

/* ============================================================
   TEST OLUŞTUR — öğrenci kendi pratik testini kurar
   ============================================================ */
let tb = { type:'ru-tr', source:'all', level:'hepsi', cat:'hepsi', count:20, reveal:'instant' };
let tbSelected = new Set();
let tbWordsPage = 1;
let tbSearchQ = '';
const TB_PAGE_SIZE = 24;

function openTestBuilder() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-testbuilder'); if (pg) pg.classList.add('active');
  tbSelected = new Set(); tbWordsPage = 1; tbSearchQ = '';
  const sb = document.getElementById('tb-search'); if (sb) sb.value = '';
  renderTbWords();
  renderSavedTests();
  window.scrollTo(0, 0);
}

function tbPick(kind, val, btn) {
  tb[kind] = (kind === 'count') ? parseInt(val) : val;
  if (btn) {
    if (kind === 'type') { document.querySelectorAll('#page-testbuilder .rev-method').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    if (kind === 'count') { document.querySelectorAll('#page-testbuilder .tb-count').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    if (kind === 'reveal') { document.querySelectorAll('#page-testbuilder .tb-reveal').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  }
  if (kind === 'source' || kind === 'level' || kind === 'cat') tbWordsPage = 1;
  renderTbWords();
}

function tbPool() {
  let pool = [];
  if (tb.source === 'all') pool = (typeof words !== 'undefined' ? words.slice() : []);
  else {
    if (typeof currentUser === 'undefined' || !currentUser) return [];
    const set = (tb.source === 'learned') ? learnedWords : savedWords;
    set.forEach(ru => { const w = wordsByRu[ru]; if (w) pool.push(w); });
  }
  if (tb.level !== 'hepsi') pool = pool.filter(w => w.level === tb.level);
  if (tb.cat !== 'hepsi') pool = pool.filter(w => w.cat === tb.cat);
  return pool;
}

function tbVisibleWords() {
  let list = tbPool();
  const q = (tbSearchQ || '').trim().toLowerCase();
  if (q) list = list.filter(w => (w.ru||'').toLowerCase().includes(q) || (w.tr||'').toLowerCase().includes(q) || (w.p||'').toLowerCase().includes(q));
  return list;
}

function renderTbWords() {
  const info = document.getElementById('tb-pool-info');
  const box = document.getElementById('tb-words');
  const pager = document.getElementById('tb-pager');
  if (!box) return;
  // giriş gerekiyorsa
  if (tb.source !== 'all' && (typeof currentUser === 'undefined' || !currentUser)) {
    if (info) info.innerHTML = '<span class="tb-warn">⚠️ Bu kaynak için giriş yapmalısın.</span>';
    box.innerHTML = ''; if (pager) pager.innerHTML = '';
    return;
  }
  const scopeN = tbPool().length;
  if (info) info.innerHTML = `Kapsam: <strong>${scopeN}</strong> kelime · Seçilen: <strong>${tbSelected.size}</strong>`;
  const list = tbVisibleWords();
  if (!list.length) { box.innerHTML = '<div class="rev-empty">Bu kapsam/arama ile kelime yok.</div>'; if (pager) pager.innerHTML = ''; return; }
  const pages = Math.max(1, Math.ceil(list.length / TB_PAGE_SIZE));
  if (tbWordsPage > pages) tbWordsPage = pages;
  if (tbWordsPage < 1) tbWordsPage = 1;
  const start = (tbWordsPage - 1) * TB_PAGE_SIZE;
  box.innerHTML = list.slice(start, start + TB_PAGE_SIZE).map(w => {
    const on = tbSelected.has(w.ru);
    return `<div class="rev-chip ${on?'on':''}" onclick="tbToggleWord('${_escAttr(w.ru)}')">
      <span class="rev-chip-box">${on?'✓':''}</span>
      <span class="rev-chip-text"><span class="rev-chip-ru">${_escHtml(w.ru)}</span><span class="rev-chip-tr">${_escHtml(w.tr)}</span></span>
      <span class="rev-chip-x">${on?'✕':'+'}</span>
    </div>`;
  }).join('');
  tbRenderPager(pages);
}

function tbRenderPager(pages) {
  const el = document.getElementById('tb-pager'); if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }
  const cur = tbWordsPage, nums = []; let last = 0;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= cur-1 && i <= cur+1)) {
      if (last && i - last > 1) nums.push('…');
      nums.push(i); last = i;
    }
  }
  let html = `<button class="tbp-btn" ${cur===1?'disabled':''} onclick="tbGoPage(${cur-1})">«</button>`;
  html += nums.map(n => n === '…' ? '<span class="tbp-dots">…</span>' : `<button class="tbp-btn ${n===cur?'active':''}" onclick="tbGoPage(${n})">${n}</button>`).join('');
  html += `<button class="tbp-btn" ${cur===pages?'disabled':''} onclick="tbGoPage(${cur+1})">»</button>`;
  el.innerHTML = html;
}

function tbGoPage(n) { tbWordsPage = n; renderTbWords(); const b=document.getElementById('tb-words'); if(b) b.scrollIntoView({behavior:'smooth',block:'nearest'}); }
function tbSearch(v) { tbSearchQ = v; tbWordsPage = 1; renderTbWords(); }
function tbToggleWord(ru) { if (tbSelected.has(ru)) tbSelected.delete(ru); else tbSelected.add(ru); renderTbWords(); }
function tbSelectAllShown() { tbVisibleWords().forEach(w => tbSelected.add(w.ru)); renderTbWords(); }
function tbClearSel() { tbSelected.clear(); renderTbWords(); }

function tbStart() {
  let pool;
  if (tbSelected.size > 0) {
    pool = []; tbSelected.forEach(ru => { const w = wordsByRu[ru]; if (w) pool.push(w); });
  } else {
    pool = tbPool();
  }
  if (pool.length < 4) { toast('En az 4 kelime gerekli — kelime seç ya da kapsamı genişlet.'); return; }
  launchCustomQuiz(pool, tb.type, tb.count);
}

function launchCustomQuiz(pool, type, count) {
  quizReveal = tb.reveal || 'instant';
  qList = shuffle(pool).slice(0, count);
  quizSettings = { type: type, cat: 'hepsi', count: qList.length, level: 'hepsi' };
  if (type === 'mix') {
    const ts = ['ru-tr','tr-ru','fill','tf'];
    qTypes = qList.map(() => ts[Math.floor(Math.random() * ts.length)]);
  } else qTypes = null;
  qIdx = 0; qScore = 0; qWrong = 0;
  reviewReturnTo = 'testbuilder';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-quiz').classList.add('active');
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  window.scrollTo(0, 0);
  loadQ();
}

/* Kayıtlı testler — localStorage */
function tbGetSaved() { try { return JSON.parse(localStorage.getItem('ydt_saved_tests') || '[]'); } catch (e) { return []; } }
function tbSetSaved(list) { try { localStorage.setItem('ydt_saved_tests', JSON.stringify(list.slice(0, 30))); } catch (e) {} }

function tbDefaultName() {
  const tl = {'ru-tr':'R→T','tr-ru':'T→R','fill':'Yazmalı','tf':'D/Y','mix':'Karışık'};
  const sl = {'all':'Tüm Kelimeler','saved':'Kasam','learned':'Öğrendiğim'};
  let extra = '';
  if (tb.level !== 'hepsi') extra += ' ' + tb.level;
  if (tb.cat !== 'hepsi') extra += ' ' + tb.cat;
  return `${sl[tb.source]}${extra} · ${tl[tb.type]} · ${tb.count} soru`;
}

async function tbSave() {
  const name = await uiPrompt('Teste bir isim ver:', { title: 'Testi Kaydet', placeholder: tbDefaultName() });
  if (name === null) return;
  const list = tbGetSaved();
  list.unshift({ id: 't' + Date.now(), name: (name.trim() || tbDefaultName()), type: tb.type, source: tb.source, level: tb.level, cat: tb.cat, count: tb.count });
  tbSetSaved(list);
  toast('Test kaydedildi.');
  renderSavedTests();
}

function renderSavedTests() {
  const panel = document.getElementById('tb-saved-panel');
  const box = document.getElementById('tb-saved-list');
  if (!panel || !box) return;
  const list = tbGetSaved();
  if (!list.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  box.innerHTML = list.map(t => `
    <div class="tb-saved">
      <div class="tb-saved-info"><div class="tb-saved-name">${_escHtml(t.name)}</div><div class="tb-saved-meta">${t.count} soru</div></div>
      <div class="tb-saved-actions">
        <button class="tb-run" onclick="tbRun('${t.id}')">▶ Başlat</button>
        <button class="tb-del" onclick="tbDelete('${t.id}')" title="Sil">🗑️</button>
      </div>
    </div>`).join('');
}

function tbRun(id) {
  const t = tbGetSaved().find(x => x.id === id); if (!t) return;
  const prev = tb;
  tb = { type: t.type, source: t.source, level: t.level, cat: t.cat, count: t.count };
  const pool = tbPool();
  if (pool.length < 4) { toast('Bu testin kapsamında yeterli kelime yok.'); tb = prev; return; }
  launchCustomQuiz(pool, t.type, t.count);
}

function tbDelete(id) {
  tbSetSaved(tbGetSaved().filter(x => x.id !== id));
  renderSavedTests();
}

/* ============================================================
   SAYAÇ · CEVAP KAYDI · İNCELEME · TEST GEÇMİŞİ
   ============================================================ */
function startQuizTimer(totalSec) {
  stopQuizTimer();
  quizTimeLeft = totalSec;
  _renderTimer();
  quizTimerId = setInterval(() => {
    quizTimeLeft--;
    _renderTimer();
    if (quizTimeLeft <= 0) { stopQuizTimer(); finishByTimer(); }
  }, 1000);
}
function stopQuizTimer() { if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; } }
function _renderTimer() {
  const el = document.getElementById('quiz-timer'); if (!el) return;
  const t = Math.max(0, quizTimeLeft);
  el.textContent = '⏱️ ' + Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
  el.classList.toggle('low', quizTimeLeft <= 30);
}
function finishByTimer() {
  const playing = document.getElementById('quiz-playing');
  if (!playing || playing.style.display === 'none') return;
  if (document.getElementById('quiz-result').style.display === 'block') return;
  toast('Süre doldu! Test sonlandırıldı.');
  showResult();
}

function recordAnswer(ok, your, correct, label) {
  const w = qList[qIdx] || {};
  qAnswers[qIdx] = { n: qIdx+1, ok: !!ok, your: your, correct: correct || '', ru: w.ru || label || '', tr: w.tr || '' };
}

function _qrevStatus(a){ return a.st || (a.ok ? 'ok' : 'wrong'); }
function _qrevItemsHTML(items) {
  return items.map(a => {
    const st = _qrevStatus(a);
    const cls = st==='ok' ? 'ok' : (st==='wrong' ? 'no' : 'blank');
    const badge = st==='ok' ? '✓' : (st==='wrong' ? '✗' : '—');
    const ansLine = (st==='blank')
      ? `Boş bıraktın &nbsp;·&nbsp; Doğru: <b class="g">${_escHtml(a.correct)}</b>`
      : `Senin cevabın: <b class="${st==='ok'?'g':'r'}">${_escHtml(a.your)}</b>${st==='ok'?'':(a.correct?` &nbsp;·&nbsp; Doğru: <b class="g">${_escHtml(a.correct)}</b>`:'')}`;
    return `<div class="qrev-item ${cls}" id="qrev-item-${a.n}">
      <div class="qrev-item-head"><span class="qrev-badge ${cls}">${badge}</span><span class="qrev-q">${a.n}. ${_escHtml(a.ru)}${a.tr?' — '+_escHtml(a.tr):''}</span></div>
      <div class="qrev-ans">${ansLine}</div>
    </div>`;
  }).join('');
}
function renderQuizReview(containerId, answers) {
  const box = document.getElementById(containerId); if (!box) return;
  if (!answers || !answers.length) { box.innerHTML = ''; return; }
  const grid = answers.map(a => { const st=_qrevStatus(a); const cls= st==='ok'?'ok':(st==='wrong'?'no':'blank'); return `<button class="qrev-num ${cls}" onclick="(document.getElementById('qrev-item-${a.n}')||{}).scrollIntoView&&document.getElementById('qrev-item-${a.n}').scrollIntoView({behavior:'smooth',block:'center'})">${a.n}</button>`; }).join('');
  box.innerHTML = `<div class="qrev-title">Soru Dağılımı <span>· numaraya tıkla, o sorunun detayına git</span></div><div class="qrev-grid">${grid}</div><div class="qrev-list">${_qrevItemsHTML(answers)}</div>`;
}

/* Test geçmişi (localStorage) */
function getTestResults() { try { return JSON.parse(localStorage.getItem('ydt_test_results') || '[]'); } catch (e) { return []; } }
function setTestResults(l) { try { localStorage.setItem('ydt_test_results', JSON.stringify(l.slice(0,50))); } catch (e) {} }
function quizTypeLabel(t) { return {'ru-tr':'Rusça → Türkçe','tr-ru':'Türkçe → Rusça','fill':'Yazmalı','tf':'Doğru / Yanlış','paragraf':'Paragraf','mix':'Karışık'}[t] || t; }
function saveTestResult() {
  const rec = {
    id: 'r' + Date.now(), date: new Date().toISOString(),
    type: quizSettings.type, name: quizSettings.label || quizTypeLabel(quizSettings.type),
    score: qScore, total: qList.length,
    items: (qReviewItems && qReviewItems.length ? qReviewItems : qAnswers).map(a => ({ n:a.n, st:a.st||(a.ok?'ok':'wrong'), ok:a.ok, your:a.your, correct:a.correct, ru:a.ru, tr:a.tr }))
  };
  const list = getTestResults(); list.unshift(rec); setTestResults(list);
  if (typeof logActivity === 'function') {
    logActivity('questions', rec.total);
    logActivity('testsDone', 1);
    if (quizSettings && quizSettings.label === 'Günlük Tekrar') logActivity('dailyReviews', 1);
  }
  if (typeof checkTasks === 'function') checkTasks();
  saveTestResultToDB(rec);
}

async function saveTestResultToDB(rec) {
  if (typeof sb === 'undefined' || !sb || typeof currentUser === 'undefined' || !currentUser) return;
  try {
    await sb.from('test_results').insert({
      user_id: currentUser.id, type: rec.type, name: rec.name,
      score: rec.score, total: rec.total, items: rec.items
    });
  } catch (e) { /* sessiz: localStorage yedeği var */ }
}

// Yeni cihazda yereli boşsa DB'den çek (kalıcı senkron)
async function syncTestResultsFromDB() {
  if (typeof sb === 'undefined' || !sb || typeof currentUser === 'undefined' || !currentUser) return;
  if (getTestResults().length > 0) return;
  try {
    const { data } = await sb.from('test_results').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50);
    if (data && data.length) {
      setTestResults(data.map(r => ({ id:r.id, date:r.created_at, type:r.type, name:r.name, score:r.score, total:r.total, items:r.items || [] })));
    }
  } catch (e) {}
}
function renderTestHistory() {
  const box = document.getElementById('test-history'); if (!box) return;
  const list = getTestResults();
  if (!list.length) { box.innerHTML = '<div class="profile-panel"><div class="profile-empty">Henüz test çözülmedi. Test çözdükçe sonuçların burada listelenecek.</div></div>'; return; }
  box.innerHTML = list.map(r => {
    const pct = Math.round(r.score / r.total * 100);
    const d = new Date(r.date);
    const ds = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
    return `<div class="th-row">
      <div class="th-main" onclick="toggleTestResult('${r.id}')">
        <div class="th-info"><div class="th-name">${_escHtml(r.name)}</div><div class="th-meta">${ds} · ${r.total} soru</div></div>
        <div class="th-score ${pct>=70?'good':(pct>=40?'mid':'low')}">${r.score}/${r.total}<span>%${pct}</span></div>
        <button class="th-del" title="Bu kaydı sil" onclick="event.stopPropagation();deleteTestResult('${r.id}')">×</button>
      </div>
      <div class="th-detail" id="th-detail-${r.id}" style="display:none;"></div>
    </div>`;
  }).join('') + '<button class="th-clear" onclick="clearTestHistory()">Geçmişi Temizle</button>';
}
function toggleTestResult(id) {
  const det = document.getElementById('th-detail-' + id); if (!det) return;
  if (det.style.display !== 'none') { det.style.display = 'none'; det.innerHTML = ''; return; }
  const r = getTestResults().find(x => x.id === id); if (!r) return;
  det.innerHTML = _qrevItemsHTML(r.items);
  det.style.display = 'block';
}
async function clearTestHistory() { if (await uiConfirm('Tüm test geçmişi silinsin mi?', 'Geçmişi Temizle', { danger: true })) { setTestResults([]); renderTestHistory(); } }
async function deleteTestResult(id) {
  if (!(await uiConfirm('Bu test kaydı silinsin mi?', 'Kaydı Sil', { danger: true }))) return;
  setTestResults(getTestResults().filter(x => x.id !== id));
  renderTestHistory();
  if (typeof renderStatsView === 'function') { const sb2 = document.getElementById('stats-body'); if (sb2 && sb2.innerHTML) renderStatsView(); }
  if (typeof sb !== 'undefined' && sb && typeof currentUser !== 'undefined' && currentUser && /-/.test(String(id))) {
    try { await sb.from('test_results').delete().eq('id', id).eq('user_id', currentUser.id); } catch (e) {}
  }
}

/* ============================================================
   VERİ & İSTATİSTİK — streak, istatistik görünümü, veri indirme
   ============================================================ */
function _resultDays() {
  return [...new Set(getTestResults().map(r => (r.date || '').slice(0,10)).filter(Boolean))];
}
function computeStreakFromResults() {
  const days = new Set(_resultDays());
  if (!days.size) return 0;
  const iso = d => d.toISOString().slice(0,10);
  let streak = 0, d = new Date();
  while (days.has(iso(d))) { streak++; d.setDate(d.getDate()-1); }
  if (streak === 0) { // bugün yoksa dünden devam eden seriyi göster
    d = new Date(); d.setDate(d.getDate()-1);
    while (days.has(iso(d))) { streak++; d.setDate(d.getDate()-1); }
  }
  return streak;
}
function longestStreakFromResults() {
  const days = _resultDays().sort();
  let best = 0, cur = 0, prev = null;
  for (const k of days) {
    if (prev) { const diff = (new Date(k) - new Date(prev)) / 86400000; cur = (diff === 1) ? cur+1 : 1; }
    else cur = 1;
    best = Math.max(best, cur); prev = k;
  }
  return best;
}

function renderStatsView() {
  const box = document.getElementById('stats-body'); if (!box) return;
  const saved = (typeof savedWords !== 'undefined' ? savedWords.size : 0);
  const learned = (typeof learnedWords !== 'undefined' ? learnedWords.size : 0);
  const lvl = { A1:0, A2:0, B1:0, B2:0, C1:0 };
  if (typeof savedWords !== 'undefined') savedWords.forEach(ru => { const w = wordsByRu[ru]; if (w && lvl[w.level] !== undefined) lvl[w.level]++; });
  const res = getTestResults();
  const tests = res.length;
  const avg = tests ? Math.round(res.reduce((a,r) => a + (r.total ? r.score/r.total*100 : 0), 0) / tests) : 0;
  const best = res.reduce((m,r) => Math.max(m, r.total ? Math.round(r.score/r.total*100) : 0), 0);
  const streak = computeStreakFromResults();
  const maxLvl = Math.max(1, ...Object.values(lvl));
  const bars = Object.keys(lvl).map(k => `
    <div class="st-bar-row"><span class="st-bar-lab">${k}</span>
      <div class="st-bar-track"><div class="st-bar-fill" style="width:${Math.round(lvl[k]/maxLvl*100)}%"></div></div>
      <span class="st-bar-val">${lvl[k]}</span></div>`).join('');
  const recent = res.slice(0,5).map(r => {
    const pct = r.total ? Math.round(r.score/r.total*100) : 0;
    const d = new Date(r.date);
    return `<div class="st-recent-row"><span>${_escHtml(r.name)}</span><span class="st-recent-meta">${d.toLocaleDateString('tr-TR')} · ${r.score}/${r.total} · %${pct}</span></div>`;
  }).join('') || '<div class="profile-empty">Henüz test çözülmedi.</div>';

  box.innerHTML = `
    <div class="st-cards">
      <div class="st-card"><div class="st-card-num">${saved}</div><div class="st-card-lab">Kayıtlı Kelime</div></div>
      <div class="st-card"><div class="st-card-num">${learned}</div><div class="st-card-lab">Öğrenilen</div></div>
      <div class="st-card"><div class="st-card-num">${tests}</div><div class="st-card-lab">Çözülen Test</div></div>
      <div class="st-card"><div class="st-card-num">%${avg}</div><div class="st-card-lab">Ortalama Başarı</div></div>
      <div class="st-card"><div class="st-card-num">%${best}</div><div class="st-card-lab">En İyi Test</div></div>
      <div class="st-card"><div class="st-card-num">${streak}</div><div class="st-card-lab">Gün Serisi</div></div>
    </div>
    <div class="profile-panel">
      <h3 class="st-h3">Kayıtlı Kelimeler — Seviyeye Göre</h3>
      ${bars}
    </div>
    <div class="profile-panel">
      <h3 class="st-h3">Son Etkinlikler</h3>
      <div class="st-recent">${recent}</div>
    </div>`;
}

/* Veri indirme (her plan için çalışır) */
function _wordsFromSet(set) {
  const out = [];
  if (set && typeof set.forEach === 'function') set.forEach(ru => { const w = (typeof wordsByRu !== 'undefined' && wordsByRu[ru]) || { ru }; out.push({ ru: w.ru, tr: w.tr || '', level: w.level || '', cat: w.cat || '' }); });
  return out;
}
function exportMyData() {
  const data = {
    exportedAt: new Date().toISOString(),
    user: (typeof currentUser !== 'undefined' && currentUser && currentUser.email) || '',
    savedWords: _wordsFromSet(typeof savedWords !== 'undefined' ? savedWords : null),
    learnedWords: _wordsFromSet(typeof learnedWords !== 'undefined' ? learnedWords : null),
    testResults: getTestResults()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ydt-yds-verilerim.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  if (typeof toast === 'function') toast('Verilerin indiriliyor.');
}
function veriYonetimiHTML() {
  return `<div class="profile-panel vy-panel">
    <h3 class="vy-title">Verilerimi İndir</h3>
    <p class="vy-sub">Kayıtlı kelimelerin, öğrendiklerin ve test geçmişin tek dosyada iner. Ücretsiz hesaba dönsen bile verilerin saklanır ve istediğin zaman indirebilirsin.</p>
    <button class="vy-btn" onclick="exportMyData()">⬇️ Verilerimi İndir (JSON)</button>
    <div class="vy-note">Verilerin hesabına bağlıdır; premium süresi dolsa dahi silinmez. Silme yalnızca senin isteğinle olur.</div>
  </div>`;
}

/* ============================================================
   PROFİL — Inline Kelime Kasam / Öğrenilen görünümü
   ============================================================ */
const KV_CATS = ['all','isim','fiil','sıfat','zarf','zamir','edat','bağlaç'];
const kasaViewState = { saved: { page:1, level:'all', cat:'all' }, learned: { page:1, level:'all', cat:'all' } };

function renderKasaView(status) {
  const box = document.getElementById(status === 'learned' ? 'kasa-learned-body' : 'kasa-saved-body');
  if (!box) return;
  const set = status === 'learned' ? (typeof learnedWords !== 'undefined' ? learnedWords : new Set())
                                   : (typeof savedWords !== 'undefined' ? savedWords : new Set());
  const st = kasaViewState[status];
  let items = [];
  set.forEach(ru => { const w = (typeof wordsByRu !== 'undefined' && wordsByRu[ru]) || { ru, tr:'', level:'' }; items.push(w); });
  if (st.level !== 'all') items = items.filter(w => w.level === st.level);
  if (st.cat !== 'all') items = items.filter(w => w.cat === st.cat);
  items.sort((a,b) => (a.ru || '').localeCompare(b.ru || '', 'ru'));
  const total = items.length;
  const PAGE = 24;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (st.page > pages) st.page = pages;
  const slice = items.slice((st.page-1)*PAGE, st.page*PAGE);

  const levels = ['all','A1','A2','B1','B2','C1'];
  const pills = levels.map(l => `<button class="kv-pill ${st.level===l?'active':''}" onclick="kasaViewSetLevel('${status}','${l}')">${l==='all'?'Tümü':l}</button>`).join('');
  const catLabels = { all:'Tüm Türler', isim:'İsim', fiil:'Fiil', 'sıfat':'Sıfat', zarf:'Zarf', zamir:'Zamir', edat:'Edat', 'bağlaç':'Bağlaç' };
  const typePills = KV_CATS.map(c => `<button class="kv-pill kv-pill-type ${st.cat===c?'active':''}" onclick="kasaViewSetType('${status}','${c}')">${catLabels[c]}</button>`).join('');

  if (!total) {
    box.innerHTML = `<div class="kv-filter">${pills}</div><div class="kv-filter kv-filter-type">${typePills}</div><div class="profile-panel"><div class="profile-empty">${(st.cat!=='all'||st.level!=='all')?'Bu filtreye uygun kelime yok.':(status==='learned'?'Henüz öğrenilen kelime yok. Kelime Kasanda bir kelimeyi ✓ ile öğrenildi işaretleyebilirsin.':'Henüz kayıtlı kelime yok. Kelimeler sayfasından ☆ ile kaydet.')}</div></div>`;
    return;
  }
  const cards = slice.map(w => {
    const ru = _escAttr(w.ru);
    const rem = status === 'learned'
      ? `<button class="kv-x" title="Öğrenilenlerden çıkar" onclick="kasaRemoveLearned('${ru}')">×</button>` : '';
    return `<div class="kv-card">
      <div class="kv-top"><span class="kv-ru">${_escHtml(w.ru)}</span><span class="kv-lvl">${w.level||''}</span></div>
      <div class="kv-tr">${_escHtml(w.tr||'')}</div>
      <div class="kv-foot"><button class="kv-speak" onclick="speak('${ru}')">🔊 Dinle</button>${rem}</div>
    </div>`;
  }).join('');
  let pager = '';
  if (pages > 1) {
    pager = '<div class="kv-pager">';
    if (st.page > 1) pager += `<button class="kv-pg" onclick="kasaViewGoPage('${status}',${st.page-1})">‹</button>`;
    for (let i=1;i<=pages;i++) pager += `<button class="kv-pg ${i===st.page?'active':''}" onclick="kasaViewGoPage('${status}',${i})">${i}</button>`;
    if (st.page < pages) pager += `<button class="kv-pg" onclick="kasaViewGoPage('${status}',${st.page+1})">›</button>`;
    pager += '</div>';
  }
  box.innerHTML = `<div class="kv-filter">${pills}<span class="kv-count">${total} kelime</span></div><div class="kv-filter kv-filter-type">${typePills}</div><div class="kv-grid">${cards}</div>${pager}`;
}
function kasaViewSetLevel(status, l) { kasaViewState[status].level = l; kasaViewState[status].page = 1; renderKasaView(status); }
function kasaViewSetType(status, c) { kasaViewState[status].cat = c; kasaViewState[status].page = 1; renderKasaView(status); }
function kasaViewGoPage(status, p) { kasaViewState[status].page = p; renderKasaView(status); }
async function kasaRemoveLearned(ru) {
  if (typeof toggleLearned === 'function') { try { await toggleLearned(null, ru); } catch (e) {} }
  renderKasaView('learned');
}

/* ============================================================
   PROFİL — Çalışma Takvimi (aktivite günleri işaretli)
   ============================================================ */
let calRef = new Date(); calRef.setDate(1);
let calSelected = null;
function calMove(delta) { calRef.setMonth(calRef.getMonth() + delta); calSelected = null; const dt = document.getElementById('cal-detail'); if (dt) dt.innerHTML = ''; renderStudyCalendar(); }
function renderStudyCalendar() {
  const box = document.getElementById('study-calendar'); if (!box) return;
  const titleEl = document.getElementById('cal-title');
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const y = calRef.getFullYear(), m = calRef.getMonth();
  if (titleEl) titleEl.textContent = `${months[m]} ${y}`;
  const active = (typeof activeDaySet === 'function') ? activeDaySet() : new Set();
  const plans = (typeof getPlans === 'function') ? getPlans() : {};
  const todayKey = new Date().toISOString().slice(0,10);
  const first = new Date(y, m, 1);
  let startDow = first.getDay(); startDow = (startDow === 0) ? 6 : startDow - 1; // Pzt=0
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const dows = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i=0;i<startDow;i++) html += `<div class="cal-cell empty"></div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls = ['cal-cell'];
    if (active.has(key)) cls.push('active');
    if (key === todayKey) cls.push('today');
    if (plans[key] && String(plans[key]).trim()) cls.push('planned');
    if (key === calSelected) cls.push('sel');
    html += `<div class="${cls.join(' ')}" onclick="calDay('${key}')">${d}</div>`;
  }
  box.innerHTML = html;
}

/* ============================================================
   GÜNLÜK TEKRAR — kayıtlı+öğrenilen havuzdan rastgele 20 kelime
   ============================================================ */
function startDailyReview() {
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  let pool = []; const seen = new Set();
  const add = set => { if (set && set.forEach) set.forEach(ru => { const w = wordsByRu[ru]; if (w && !seen.has(ru)) { seen.add(ru); pool.push(w); } }); };
  add(typeof savedWords !== 'undefined' ? savedWords : null);
  add(typeof learnedWords !== 'undefined' ? learnedWords : null);
  if (pool.length < 4) { toast('Günlük tekrar için en az 4 kayıtlı/öğrenilmiş kelime gerekli.'); return; }
  const count = Math.min(20, pool.length);
  quizReveal = 'instant';
  qList = shuffle(pool).slice(0, count);
  quizSettings = { type: 'mix', cat: 'hepsi', count: qList.length, level: 'hepsi', label: 'Günlük Tekrar' };
  const ts = ['ru-tr','tr-ru','fill','tf'];
  qTypes = qList.map(() => ts[Math.floor(Math.random() * ts.length)]);
  qIdx = 0; qScore = 0; qWrong = 0;
  reviewReturnTo = 'profile';
  try { localStorage.setItem('ydt_daily_reviews', String((parseInt(localStorage.getItem('ydt_daily_reviews') || '0', 10) || 0) + 1)); } catch (e) {}
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const qp = document.getElementById('page-quiz'); if (qp) qp.classList.add('active');
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-playing').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  window.scrollTo(0, 0);
  loadQ();
}

/* ============================================================
   GELİŞİM GRAFİĞİ — mevcut tüm istatistikler (genişletilebilir)
   ============================================================ */
function renderProgressChart() {
  const box = document.getElementById('progress-chart'); if (!box) return;
  const log = (typeof getDailyLog === 'function') ? getDailyLog() : {};
  const daysSet = new Set(Object.keys(log).filter(k => _dayHasActivity(log[k])));
  (typeof getTestResults === 'function' ? getTestResults() : []).forEach(r => { const k = (r.date||'').slice(0,10); if (k) daysSet.add(k); });
  let days = [...daysSet].sort();
  if (days.length > 21) days = days.slice(-21);
  if (!days.length) {
    box.innerHTML = '<div class="profile-empty">Henüz veri yok. Test çöz, kelime öğren ya da pomodoro çalış — gelişimin burada tarih bazlı çizgisel grafikte görünecek.</div>';
    return;
  }
  const qOf = d => { const a = log[d]; if (a && a.questions) return a.questions; const res = (getTestResults()||[]).filter(r => (r.date||'').slice(0,10) === d); return res.reduce((s2,r) => s2 + (r.total||0), 0); };
  const wOf = d => { const a = log[d]; return (a && a.wordsLearned) ? a.wordsLearned : 0; };
  const vOf = d => { const a = log[d]; return (a && a.videos) ? a.videos : 0; };
  const q = days.map(qOf), w = days.map(wOf), v = days.map(vOf);
  const allRes = (typeof getTestResults === 'function') ? getTestResults() : [];
  const onDay = d => allRes.filter(r => (r.date||'').slice(0,10) === d);
  const c = days.map(d => onDay(d).reduce((s2,r) => s2 + (r.score||0), 0));
  const x = days.map(d => onDay(d).reduce((s2,r) => s2 + ((r.total||0)-(r.score||0)), 0));
  const max = Math.max(1, ...q, ...w, ...v, ...c, ...x);
  const W = 600, H = 240, padL = 34, padR = 14, padT = 16, padB = 42;
  const plotW = W - padL - padR, plotH = H - padT - padB, n = days.length;
  const X = i => n === 1 ? padL + plotW/2 : padL + i*(plotW/(n-1));
  const Y = v => padT + plotH - (v/max)*plotH;
  const line = (arr, col, wd) => {
    wd = wd || 2.5;
    if (n === 1) return `<circle cx="${X(0)}" cy="${Y(arr[0])}" r="5" fill="${col}"/>`;
    const pts = arr.map((v,i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const dots = arr.map((v,i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.4" fill="${col}"/>`).join('');
    return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  };
  let grid = '';
  for (let g = 0; g <= 4; g++) { const yy = padT + plotH*(g/4); const val = Math.round(max*(1-g/4)); grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W-padR}" y2="${yy.toFixed(1)}" stroke="var(--light-gray)" stroke-width="1"/><text x="${padL-6}" y="${(yy+3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--gray)">${val}</text>`; }
  let xlab = ''; const step = Math.max(1, Math.ceil(n/5));
  const addLab = i => { const dd = days[i].slice(5).replace('-','.'); xlab += `<text x="${X(i).toFixed(1)}" y="${H-padB+16}" text-anchor="middle" font-size="9" fill="var(--gray)">${dd}</text>`; };
  for (let i = 0; i < n; i += step) addLab(i);
  if ((n-1) % step !== 0) addLab(n-1);
  const lvl = (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.level) ? String(currentProfile.level).toUpperCase() : '';
  const lvlChip = lvl ? `<span class="pg-leg pg-level">Seviye: <b>${lvl}</b></span>` : `<span class="pg-leg pg-level pg-level-none">Seviye: belirsiz</span>`;
  box.innerHTML = `<div class="pg-legend">`
    + `<span class="pg-leg"><i style="background:#7e6bd0"></i>Çözülen Soru</span>`
    + `<span class="pg-leg"><i style="background:#2e9e5b"></i>Doğru</span>`
    + `<span class="pg-leg"><i style="background:#cc4b4b"></i>Yanlış</span>`
    + `<span class="pg-leg"><i style="background:var(--gold)"></i>Öğrenilen Kelime</span>`
    + `<span class="pg-leg"><i style="background:#1E88E5"></i>İzlenen Video</span>`
    + lvlChip + `</div>`
    + `<svg viewBox="0 0 ${W} ${H}" class="pg-svg" preserveAspectRatio="xMidYMid meet">${grid}${line(q,'#7e6bd0')}${line(w,'var(--gold)')}${line(v,'#1E88E5')}${line(c,'#2e9e5b',3)}${line(x,'#cc4b4b',3)}${xlab}</svg>`
    + `<div class="pg-foot">Tarih bazlı günlük gelişim. Doğru/Yanlış çizgileri yukarıdaki renklerle gösterilir. Seviye, tespit sınavı sonrası eklenecek (çizgi değil, durum olarak gösterilir).</div>`;
}

/* ============================================================
   GÜNLÜK AKTİVİTE KAYDI + TAKVİM DETAY + PLAN/NOT
   ============================================================ */
function getDailyLog() { try { return JSON.parse(localStorage.getItem('ydt_daily_activity') || '{}'); } catch (e) { return {}; } }
function setDailyLog(o) { try { localStorage.setItem('ydt_daily_activity', JSON.stringify(o)); } catch (e) {} }
function _emptyDay() { return { focusMin:0, pomodoros:0, questions:0, videos:0, wordsLearned:0 }; }
function dayActivity(key) { const l = getDailyLog(); return Object.assign(_emptyDay(), l[key] || {}); }
function _dayHasActivity(a) { return !!(a && (a.focusMin || a.pomodoros || a.questions || a.videos || a.wordsLearned)); }
function logActivity(field, amount) {
  if (!amount) return;
  const l = getDailyLog(); const k = new Date().toISOString().slice(0,10);
  const day = Object.assign(_emptyDay(), l[k] || {});
  day[field] = (day[field] || 0) + amount;
  l[k] = day; setDailyLog(l);
  if (field !== 'questions' && typeof checkTasks === 'function') { try { checkTasks(); } catch (e) {} }
}
if (typeof window !== 'undefined') window.logActivity = logActivity; // extras.js (pomodoro) için
function activeDaySet() {
  const s = new Set(); const l = getDailyLog();
  Object.keys(l).forEach(k => { if (_dayHasActivity(l[k])) s.add(k); });
  (typeof _resultDays === 'function' ? _resultDays() : []).forEach(d => s.add(d));
  return s;
}
function getPlans() { try { return JSON.parse(localStorage.getItem('ydt_plans') || '{}'); } catch (e) { return {}; } }
function setPlans(o) { try { localStorage.setItem('ydt_plans', JSON.stringify(o)); } catch (e) {} }

function calDay(key) {
  calSelected = key;
  renderStudyCalendar();
  const box = document.getElementById('cal-detail'); if (!box) return;
  const todayKey = new Date().toISOString().slice(0,10);
  const [yy,mm,dd] = key.split('-');
  const pretty = `${dd}.${mm}.${yy}`;
  if (key > todayKey) {
    const plans = getPlans();
    box.innerHTML = `<div class="cal-det-head">📅 ${pretty} — Plan & Not</div>
      <textarea id="cal-plan-input" class="cal-plan-input" placeholder="Bu gün için planını ya da notunu yaz...">${_escHtml(plans[key] || '')}</textarea>
      <button class="cal-plan-save" onclick="savePlan('${key}')">Kaydet</button>`;
  } else {
    const a = dayActivity(key);
    let inner;
    if (!_dayHasActivity(a)) {
      inner = `<div class="cal-det-empty">Bu gün için çalışma kaydı yok.</div>`;
    } else {
      inner = `<div class="cal-det-grid">
        <div class="cal-det-item"><b>${a.focusMin}</b><span>dk odak</span></div>
        <div class="cal-det-item"><b>${a.pomodoros}</b><span>pomodoro</span></div>
        <div class="cal-det-item"><b>${a.questions}</b><span>soru</span></div>
        <div class="cal-det-item"><b>${a.videos}</b><span>video</span></div>
        <div class="cal-det-item"><b>${a.wordsLearned}</b><span>kelime öğrenildi</span></div>
      </div>`;
    }
    const plans = getPlans();
    const note = (plans[key] && plans[key].trim()) ? `<div class="cal-det-note">📝 ${_escHtml(plans[key])}</div>` : '';
    box.innerHTML = `<div class="cal-det-head">${pretty} — Günün Özeti</div>${inner}${note}`;
  }
}
function savePlan(key) {
  const inp = document.getElementById('cal-plan-input'); if (!inp) return;
  const plans = getPlans();
  const v = (inp.value || '').trim();
  if (v) plans[key] = v; else delete plans[key];
  setPlans(plans);
  renderStudyCalendar();
  if (typeof toast === 'function') toast('Plan kaydedildi.');
}

/* ============================================================
   AYARLAR — Güvenlik / Çalışma / Üyelik + hesap işlemleri
   ============================================================ */
function autoSaveOn() { try { return localStorage.getItem('ydt_autosave') === '1'; } catch (e) { return false; } }
function toggleAutoSave(on) { try { localStorage.setItem('ydt_autosave', on ? '1' : '0'); } catch (e) {} if (typeof toast === 'function') toast(on ? 'Otomatik kaydetme açık.' : 'Otomatik kaydetme kapalı.'); }
function _autoSaveCurrent() {
  try {
    if (!autoSaveOn()) return;
    const w = qList[qIdx]; if (!w) return;
    const isPremium = currentProfile && (currentProfile.plan === 'premium' || currentProfile.is_admin);
    if (!isPremium) return;
    if (typeof savedWords === 'undefined') return;
    if (savedWords.has(w.ru) || learnedWords.has(w.ru)) return;
    if (typeof sb !== 'undefined' && sb && typeof currentUser !== 'undefined' && currentUser) {
      sb.from('saved_words').upsert({ user_id: currentUser.id, word_ru: w.ru, word_tr: w.tr, level: w.level || null, status: 'saved' }, { onConflict: 'user_id,word_ru' }).then(function(){}, function(){});
      savedWords.add(w.ru);
    }
  } catch (e) {}
}

function _settingsBox(html) { return html; }

function guvenlikHTML() {
  return `<div class="profile-panel set-panel">
    <h3 class="set-h3">🔑 Şifre Değiştir</h3>
    <input id="set-newpass" type="password" class="set-input" placeholder="Yeni şifre (en az 6 karakter)" autocomplete="new-password">
    <input id="set-newpass2" type="password" class="set-input" placeholder="Yeni şifre (tekrar)" autocomplete="new-password">
    <button class="set-btn" onclick="changePassword()">Şifreyi Güncelle</button>
  </div>
  <div class="profile-panel set-panel">
    <h3 class="set-h3">📧 E-posta Değiştir</h3>
    <input id="set-newemail" type="email" class="set-input" placeholder="Yeni e-posta adresi">
    <button class="set-btn" onclick="changeEmail()">E-postayı Güncelle</button>
    <div class="set-note">Yeni adrese onay maili gönderilir; onayladıktan sonra değişir.</div>
  </div>
  <div class="profile-panel set-panel">
    <h3 class="set-h3">🔗 Google ile Bağla</h3>
    <p class="set-sub">Hesabını Google ile bağlayıp tek tıkla giriş yapabilirsin.</p>
    <button class="set-btn ghost" onclick="linkGoogle()">Google Hesabını Bağla</button>
  </div>
  <div class="profile-panel set-panel">
    <h3 class="set-h3">↩️ Şifremi Unuttum</h3>
    <p class="set-sub">E-postana şifre sıfırlama bağlantısı gönderelim.</p>
    <button class="set-btn ghost" onclick="sendPasswordReset()">Sıfırlama Bağlantısı Gönder</button>
  </div>`;
}

function calismaAyarlariHTML() {
  const on = autoSaveOn();
  const lvl = (currentProfile && currentProfile.level) ? String(currentProfile.level).toUpperCase() : '';
  const opts = ['A1','A2','B1','B2','C1'].map(l => `<option ${lvl===l?'selected':''}>${l}</option>`).join('');
  return `<div class="profile-panel set-panel">
    <div class="set-switch-row">
      <div><h3 class="set-h3">💾 Otomatik Kelime Kaydetme</h3>
      <p class="set-sub">Açıkken, testte doğru bildiğin kelimeler otomatik olarak Kelime Kasam'a eklenir (Premium).</p></div>
      <label class="set-switch"><input type="checkbox" id="set-autosave" ${on?'checked':''} onchange="toggleAutoSave(this.checked)"><span class="set-slider"></span></label>
    </div>
  </div>
  <div class="profile-panel set-panel">
    <h3 class="set-h3">🎚️ Seviyem</h3>
    <p class="set-sub">Seviye tespit sınavı gelene kadar seviyeni buradan seçebilirsin. Avatarının çerçevesi seviyene göre renklenir.</p>
    <select id="set-level" class="set-input" onchange="setMyLevel(this.value)">
      <option value="" ${lvl===''?'selected':''}>Seçilmedi</option>${opts}
    </select>
  </div>`;
}

function uyelikHTML() {
  const isAdmin = currentProfile && currentProfile.is_admin;
  const isPrem = currentProfile && (currentProfile.plan === 'premium' || isAdmin);
  const planLab = isAdmin ? 'Yönetici' : (isPrem ? 'Premium' : 'Ücretsiz');
  return `<div class="profile-panel set-panel">
    <h3 class="set-h3">👑 Üyelik Durumu</h3>
    <p class="set-sub">Mevcut planın: <b>${planLab}</b></p>
    ${!isPrem ? `<button class="set-btn" onclick="buyPremium()">Premium'a Geç</button>` : `<div class="set-note">Premium avantajlarından yararlanıyorsun.</div>`}
  </div>
  <div class="profile-panel set-panel danger-zone">
    <h3 class="set-h3 danger">⚠️ Tehlikeli Bölge</h3>
    <p class="set-sub">Bu işlemler dikkat gerektirir. Verilerin (kayıtlı/öğrenilen kelimeler) dondurmada korunur.</p>
    <button class="set-btn warn" onclick="freezeAccount()">Hesabı Dondur</button>
    <button class="set-btn danger" onclick="deleteAccount()">Hesabı Sil</button>
  </div>`;
}

async function changePassword() {
  const a = document.getElementById('set-newpass'), b = document.getElementById('set-newpass2');
  const p1 = (a && a.value) || '', p2 = (b && b.value) || '';
  if (p1.length < 6) { toast('Şifre en az 6 karakter olmalı.'); return; }
  if (p1 !== p2) { toast('Şifreler eşleşmiyor.'); return; }
  try { const { error } = await sb.auth.updateUser({ password: p1 }); if (error) throw error; toast('Şifren güncellendi.'); if (a) a.value = ''; if (b) b.value = ''; }
  catch (e) { toast('Şifre güncellenemedi. Lütfen tekrar dene.'); }
}
async function sendPasswordReset() {
  const email = (currentUser && currentUser.email) || '';
  if (!email) { toast('E-posta bulunamadı.'); return; }
  const _tk = (typeof captchaPrompt === 'function') ? await captchaPrompt() : null;
  if (typeof TURNSTILE_SITE_KEY !== 'undefined' && TURNSTILE_SITE_KEY && !_tk) { toast('Doğrulama tamamlanmadı, işlem iptal edildi.'); return; }
  try { const { error } = await sb.auth.resetPasswordForEmail(email, Object.assign({ redirectTo: location.origin + location.pathname }, _tk ? { captchaToken: _tk } : {})); if (error) throw error; toast('Sıfırlama bağlantısı e-postana gönderildi.'); }
  catch (e) { toast('Gönderilemedi. Lütfen tekrar dene.'); }
}
async function changeEmail() {
  const el = document.getElementById('set-newemail'); const em = ((el && el.value) || '').trim();
  if (!/.+@.+\..+/.test(em)) { toast('Geçerli bir e-posta gir.'); return; }
  try { const { error } = await sb.auth.updateUser({ email: em }); if (error) throw error; toast('Onay maili ' + em + ' adresine gönderildi.'); }
  catch (e) { toast('E-posta güncellenemedi. Lütfen tekrar dene.'); }
}
async function linkGoogle() {
  try {
    if (sb.auth && typeof sb.auth.linkIdentity === 'function') {
      const { error } = await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) throw error;
    } else { toast('Bu özellik için hesap bağlama ayarının açık olması gerekir.'); }
  } catch (e) { toast('Google bağlanamadı. Lütfen tekrar dene.'); }
}
async function setMyLevel(lvl) {
  if (!sb || !currentUser) return;
  try {
    const { error } = await sb.from('profiles').update({ level: lvl || null }).eq('id', currentUser.id);
    if (error) throw error;
    if (currentProfile) currentProfile.level = lvl || null;
    if (typeof applyAvatar === 'function') applyAvatar();
    if (typeof renderProgressChart === 'function') renderProgressChart();
    toast(lvl ? ('Seviyen ' + lvl + ' olarak ayarlandı.') : 'Seviye temizlendi.');
  } catch (e) { toast('Seviye güncellenemedi (yetki kısıtı olabilir).'); }
}
async function freezeAccount() {
  if (!(await uiConfirm('Hesabını dondurmak istediğine emin misin? Verilerin korunur; tekrar giriş yapana kadar pasif olur.', 'Hesabı Dondur'))) return;
  if (!(await uiConfirm('Son onay: Hesabın DONDURULSUN mu?', 'Hesabı Dondur', { danger: true }))) return;
  if (!sb || !currentUser) return;
  try {
    const { error } = await sb.from('profiles').update({ status: 'frozen' }).eq('id', currentUser.id);
    if (error) throw error;
    toast('Hesabın donduruldu. Çıkış yapılıyor...');
    setTimeout(() => { if (typeof authLogout === 'function') authLogout(); else sb.auth.signOut(); }, 1300);
  } catch (e) { toast('İşlem başarısız. Lütfen tekrar dene.'); }
}
async function deleteAccount() {
  if (!(await uiConfirm('Hesabını ve tüm verilerini silmek istediğine emin misin? Bu işlem geri alınamaz.', 'Hesabı Sil', { danger: true }))) return;
  const typed = await uiPrompt('Onaylamak için büyük harflerle  SİL  yaz:', { title: 'Hesabı Sil', placeholder: 'SİL' });
  if (typed !== 'SİL') { toast('İşlem iptal edildi.'); return; }
  const pw = await uiPrompt('Güvenlik için şifreni gir:', { title: 'Hesabı Sil', type: 'password', placeholder: 'Şifren' });
  if (pw === null || pw === '') { toast('İşlem iptal edildi.'); return; }
  if (!sb || !currentUser) return;
  try {
    const { error: pErr } = await sb.auth.signInWithPassword({ email: currentUser.email, password: pw });
    if (pErr) { toast('Şifre hatalı. İşlem iptal edildi.'); return; }
  } catch (e) { toast('Şifre doğrulanamadı. İşlem iptal edildi.'); return; }
  function _wipeLocal() { try { localStorage.removeItem('ydt_test_results'); localStorage.removeItem('ydt_daily_activity'); localStorage.removeItem('ydt_plans'); localStorage.removeItem('ydt_badges_earned'); } catch (e2) {} }
  function _bye() { setTimeout(() => { if (typeof authLogout === 'function') authLogout(); else sb.auth.signOut(); }, 1600); }
  try {
    // Önce gerçek silme (Edge Function): auth hesabını da kalıcı siler
    const { error } = await sb.functions.invoke('delete-account');
    if (error) throw error;
    _wipeLocal();
    toast('Hesabın kalıcı olarak silindi. Çıkış yapılıyor...');
    _bye();
  } catch (e) {
    // Edge Function kurulu değilse/başarısızsa: verileri sil + talep işaretle
    try {
      await sb.from('saved_words').delete().eq('user_id', currentUser.id);
      await sb.from('test_results').delete().eq('user_id', currentUser.id);
      await sb.from('profiles').update({ status: 'deletion_requested' }).eq('id', currentUser.id);
      _wipeLocal();
      toast('Verilerin silindi, hesap kapatma talebin alındı. Çıkış yapılıyor...');
      _bye();
    } catch (e3) { toast('Silme başarısız. Lütfen tekrar dene.'); }
  }
}

/* ============================================================
   SİTE-İÇİ MODAL (alert/confirm/prompt yerine)
   ============================================================ */
function _ensureModalRoot() {
  let r = document.getElementById('ui-modal-root');
  if (!r) { r = document.createElement('div'); r.id = 'ui-modal-root'; document.body.appendChild(r); }
  return r;
}
function uiModal(o) {
  return new Promise(resolve => {
    const root = _ensureModalRoot();
    const wrap = document.createElement('div');
    wrap.className = 'ui-modal-overlay';
    const promptHtml = o.prompt ? `<input id="ui-modal-input" type="${o.inputType||'text'}" class="ui-modal-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${(o.placeholder||'').replace(/"/g,'&quot;')}">` : '';
    const cancelBtn = o.cancel ? `<button class="ui-modal-btn ghost" data-act="cancel">${_escHtml(o.cancelText||'Vazgeç')}</button>` : '';
    const danger = o.danger ? ' danger' : '';
    wrap.innerHTML = `<div class="ui-modal">
      <div class="ui-modal-title">${_escHtml(o.title||'')}</div>
      <div class="ui-modal-msg">${_escHtml(o.message||'').replace(/\n/g,'<br>')}</div>
      ${promptHtml}
      <div class="ui-modal-btns">${cancelBtn}<button class="ui-modal-btn primary${danger}" data-act="ok">${_escHtml(o.confirmText||'Tamam')}</button></div>
    </div>`;
    root.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const inp = wrap.querySelector('#ui-modal-input');
    if (inp) setTimeout(() => inp.focus(), 60);
    function done(val) { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 160); resolve(val); }
    wrap.addEventListener('click', e => {
      const act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'ok') done(o.prompt ? (inp ? inp.value : '') : true);
      else if (act === 'cancel') done(o.prompt ? null : false);
      else if (e.target === wrap && o.cancel) done(o.prompt ? null : false);
    });
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); });
  });
}
function uiAlert(message, title) { return uiModal({ title: title || 'Bilgi', message: message, confirmText: 'Tamam', cancel: false }); }
function uiConfirm(message, title, opts) { opts = opts || {}; return uiModal({ title: title || 'Onay', message: message, confirmText: opts.confirmText || 'Evet', cancelText: opts.cancelText || 'Vazgeç', cancel: true, danger: opts.danger }); }
function uiPrompt(message, opts) { opts = opts || {}; return uiModal({ title: opts.title || 'Giriş', message: message, prompt: true, inputType: opts.type || 'text', placeholder: opts.placeholder || '', confirmText: 'Tamam', cancelText: 'Vazgeç', cancel: true }); }
if (typeof window !== 'undefined') { window.uiAlert = uiAlert; window.uiConfirm = uiConfirm; window.uiPrompt = uiPrompt; }

/* ============================================================
   BİLDİRİM SİSTEMİ
   ============================================================ */
let myNotifications = [];
let notifPollId = null;
async function loadNotifications() {
  if (typeof sb === 'undefined' || !sb || typeof currentUser === 'undefined' || !currentUser) return;
  try {
    const { data } = await sb.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30);
    myNotifications = data || [];
  } catch (e) { myNotifications = []; }
  updateNotifBadge(); renderNotifPanel();
}
function notifUnread() { return myNotifications.filter(n => !n.is_read).length; }
function updateNotifBadge() {
  const c = document.getElementById('notif-count'); if (!c) return;
  if (typeof window !== 'undefined' && window.focusActive) { c.style.display = 'none'; return; }
  const u = notifUnread();
  if (u > 0) { c.textContent = u > 9 ? '9+' : String(u); c.style.display = 'flex'; } else { c.style.display = 'none'; }
}
function toggleNotifPanel(ev) {
  if (ev) ev.stopPropagation();
  const p = document.getElementById('notif-panel'); if (!p) return;
  if (p.style.display === 'block') { p.style.display = 'none'; return; }
  p.style.display = 'block';
  if (typeof loadNotifications === 'function') loadNotifications(); else renderNotifPanel();
  setTimeout(() => document.addEventListener('click', _notifOutside), 0);
}
function _notifOutside(e) {
  const bell = document.getElementById('notif-bell');
  if (bell && !bell.contains(e.target)) { const p = document.getElementById('notif-panel'); if (p) p.style.display = 'none'; document.removeEventListener('click', _notifOutside); }
}
function renderNotifPanel() {
  const p = document.getElementById('notif-panel'); if (!p) return;
  const head = `<div class="notif-head"><span>Bildirimler</span>${myNotifications.length ? `<button class="notif-allread" onclick="markAllNotifRead(event)">Tümünü okundu yap</button>` : ''}</div>`;
  if (!myNotifications.length) { p.innerHTML = head + `<div class="notif-empty">Henüz bildirim yok.</div>`; return; }
  const items = myNotifications.map(n => {
    const d = new Date(n.created_at);
    const icon = n.type === 'success' ? '✅' : (n.type === 'warning' ? '⚠️' : (n.type === 'admin' ? '📢' : '🔔'));
    return `<div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}', event)">
      <div class="notif-ic">${icon}</div>
      <div class="notif-body"><div class="notif-t">${_escHtml(n.title||'')}</div>${n.body ? `<div class="notif-d">${_escHtml(n.body)}</div>` : ''}<div class="notif-time">${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div></div>
      <button class="notif-x" title="Sil" onclick="deleteNotif('${n.id}', event)">×</button>
    </div>`;
  }).join('');
  p.innerHTML = head + `<div class="notif-list">${items}</div>`;
}
async function markNotifRead(id, ev) {
  if (ev) ev.stopPropagation();
  const n = myNotifications.find(x => x.id === id); if (!n || n.is_read) return;
  n.is_read = true; updateNotifBadge(); renderNotifPanel();
  try { await sb.from('notifications').update({ is_read: true }).eq('id', id); } catch (e) {}
}
async function markAllNotifRead(ev) {
  if (ev) ev.stopPropagation();
  myNotifications.forEach(n => n.is_read = true); updateNotifBadge(); renderNotifPanel();
  try { await sb.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false); } catch (e) {}
}
async function deleteNotif(id, ev) {
  if (ev) ev.stopPropagation();
  myNotifications = myNotifications.filter(x => x.id !== id); updateNotifBadge(); renderNotifPanel();
  try { await sb.from('notifications').delete().eq('id', id); } catch (e) {}
}
async function createNotification(title, body, type) {
  if (typeof sb === 'undefined' || !sb || typeof currentUser === 'undefined' || !currentUser) return;
  try { await sb.from('notifications').insert({ user_id: currentUser.id, title: title, body: body || null, type: type || 'system' }); } catch (e) {}
}
if (typeof window !== 'undefined') { window.loadNotifications = loadNotifications; window.createNotification = createNotification; }

/* Yönetici: bildirim gönderme */
function anTargetChange() {
  const sel = document.querySelector('input[name="an-tgt"]:checked');
  const box = document.getElementById('an-userlist'); if (!box) return;
  if (sel && sel.value === 'sel') { box.style.display = 'block'; anLoadUserList(); } else { box.style.display = 'none'; }
}
let _anUsers = [];
let _anSelected = new Set();
async function anLoadUserList() {
  const box = document.getElementById('an-userlist'); if (!box) return;
  box.innerHTML = '<div class="an-loading">Yükleniyor...</div>';
  try {
    const { data } = await sb.from('profiles').select('id, email, display_name').order('display_name');
    _anUsers = data || [];
    if (!_anUsers.length) { box.innerHTML = '<div class="an-loading">Kullanıcı bulunamadı.</div>'; return; }
    box.innerHTML = `<input id="an-search" class="admin-search" placeholder="🔍 İsim veya e-posta ara..." autocomplete="off" oninput="anRenderUsers(this.value)"><div id="an-userlist-items"></div>`;
    anRenderUsers('');
  } catch (e) { box.innerHTML = '<div class="an-loading">Liste alınamadı (yönetici yetkisi gerekli).</div>'; }
}
function anRenderUsers(q) {
  const box = document.getElementById('an-userlist-items'); if (!box) return;
  q = (q || '').toLowerCase().trim();
  const list = _anUsers.filter(u => !q || (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  if (!list.length) { box.innerHTML = '<div class="an-loading">Eşleşen kullanıcı yok.</div>'; return; }
  box.innerHTML = list.map(u => `<label class="an-user"><input type="checkbox" value="${u.id}" ${_anSelected.has(u.id) ? 'checked' : ''} onchange="anToggleUser('${u.id}', this.checked)"> <span>${_escHtml(u.display_name || (u.email||'').split('@')[0] || u.id.slice(0,8))}</span> <span class="an-user-mail">${_escHtml(u.email || '')}</span></label>`).join('');
}
function anToggleUser(id, on) { if (on) _anSelected.add(id); else _anSelected.delete(id); }
async function adminSendNotification() {
  const tEl = document.getElementById('an-title'), bEl = document.getElementById('an-body');
  const t = (tEl && tEl.value || '').trim(), b = (bEl && bEl.value || '').trim();
  if (!t) { uiAlert('Lütfen bir başlık gir.'); return; }
  const sel = document.querySelector('input[name="an-tgt"]:checked');
  try {
    let targets = [];
    if (sel && sel.value === 'sel') {
      targets = [..._anSelected];
      if (!targets.length) { uiAlert('En az bir kullanıcı seç.'); return; }
    } else {
      const { data } = await sb.from('profiles').select('id');
      targets = (data || []).map(u => u.id);
    }
    if (!targets.length) { uiAlert('Hedef kullanıcı bulunamadı.'); return; }
    const rows = targets.map(uid => ({ user_id: uid, title: t, body: b || null, type: 'admin' }));
    const { error } = await sb.from('notifications').insert(rows);
    if (error) throw error;
    await uiAlert(targets.length + ' kullanıcıya bildirim gönderildi.', 'Gönderildi');
    if (tEl) tEl.value = ''; if (bEl) bEl.value = ''; _anSelected = new Set();
    if (typeof currentUser !== 'undefined' && currentUser) loadNotifications();
  } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
}

/* ============================================================
   PREMIUM SATIN ALMA — e-posta doğrulama şartı
   ============================================================ */
async function buyPremium() {
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('register'); return; }
  const confirmed = !!(currentUser.email_confirmed_at || currentUser.confirmed_at);
  if (!confirmed) {
    const r = await uiConfirm('Premium satın almadan önce e-posta adresini doğrulaman gerekiyor. Doğrulama bağlantısını şimdi tekrar gönderelim mi?', 'E-posta Doğrulama Gerekli', { confirmText: 'Tekrar Gönder', cancelText: 'Kapat' });
    if (r) {
      try {
        const _tk2 = (typeof captchaPrompt === 'function') ? await captchaPrompt() : null;
        if (typeof TURNSTILE_SITE_KEY !== 'undefined' && TURNSTILE_SITE_KEY && !_tk2) { toast('Doğrulama tamamlanmadı, işlem iptal edildi.'); return; }
        await sb.auth.resend({ type: 'signup', email: currentUser.email, options: _tk2 ? { captchaToken: _tk2 } : undefined });
        uiAlert('Doğrulama e-postası gönderildi. Lütfen gelen kutunu (ve spam klasörünü) kontrol et.', 'Gönderildi'); }
      catch (e) { uiAlert('E-posta gönderilemedi. Lütfen daha sonra tekrar dene.'); }
    }
    return;
  }
  uiAlert('E-posta adresin doğrulanmış görünüyor. Ödeme sistemi çok yakında eklenecek; o zaman buradan premiuma geçebileceksin.', 'Premium');
}

/* ============================================================
   BİLDİRİM TERCİHLERİ (Ayarlar → Bildirimler)
   ============================================================ */
function notifPref(key) { try { return localStorage.getItem('ydt_np_' + key) !== '0'; } catch (e) { return true; } }
function toggleNotifPref(key, on) { try { localStorage.setItem('ydt_np_' + key, on ? '1' : '0'); } catch (e) {} if (typeof toast === 'function') toast('Tercih kaydedildi.'); }
async function clearReadNotifs() {
  const ids = myNotifications.filter(n => n.is_read).map(n => n.id);
  if (!ids.length) { toast('Okunmuş bildirim yok.'); return; }
  myNotifications = myNotifications.filter(n => !n.is_read);
  updateNotifBadge(); renderNotifPanel();
  try { await sb.from('notifications').delete().in('id', ids); } catch (e) {}
  toast('Okunmuş bildirimler temizlendi.');
}
function bildirimAyarlariHTML() {
  const badges = notifPref('badges');
  const reminder = notifPref('reminder');
  return `<div class="profile-panel set-panel">
    <h3 class="set-h3">🔔 Bildirim Tercihleri</h3>
    <div class="set-switch-row">
      <div><div style="font-weight:700;color:var(--text);">Rozet kazanma bildirimleri</div>
      <div style="font-size:.8rem;color:var(--gray);margin-top:3px;">Yeni bir rozet kazandığında bildirim al.</div></div>
      <label class="set-switch"><input type="checkbox" ${badges?'checked':''} onchange="toggleNotifPref('badges', this.checked)"><span class="set-slider"></span></label>
    </div>
    <div class="set-switch-row" style="margin-top:14px;">
      <div><div style="font-weight:700;color:var(--text);">Günlük tekrar hatırlatması</div>
      <div style="font-size:.8rem;color:var(--gray);margin-top:3px;">Hatırlatma sistemi eklendiğinde bu tercih kullanılacak.</div></div>
      <label class="set-switch"><input type="checkbox" ${reminder?'checked':''} onchange="toggleNotifPref('reminder', this.checked)"><span class="set-slider"></span></label>
    </div>
    <div class="set-note" style="margin-top:14px;">Yönetici duyuruları her zaman alınır.</div>
  </div>
  <div class="profile-panel set-panel">
    <h3 class="set-h3">🧹 Bildirimleri Yönet</h3>
    <button class="set-btn ghost" onclick="markAllNotifRead()">Tümünü okundu yap</button>
    <button class="set-btn ghost" onclick="clearReadNotifs()" style="margin-left:8px;">Okunmuşları temizle</button>
  </div>`;
}

/* ============================================================
   DESTEK / TICKET SİSTEMİ
   ============================================================ */
function supStatusLabel(s) { return s === 'answered' ? 'Yanıtlandı' : (s === 'closed' ? 'Kapandı' : 'Açık'); }
async function notifyUser(userId, title, body, type) {
  if (typeof sb === 'undefined' || !sb || !userId) return;
  try { await sb.from('notifications').insert({ user_id: userId, title: title, body: body || null, type: type || 'info' }); } catch (e) {}
}

/* ---- Kullanıcı tarafı ---- */
let supportView = { mode: 'list', ticketId: null };
function renderSupport() {
  const box = document.getElementById('support-body'); if (!box) return;
  if (typeof currentUser === 'undefined' || !currentUser) { box.innerHTML = '<div class="profile-empty">Destek için giriş yapmalısın.</div>'; return; }
  if (supportView.mode === 'thread') { supportRenderThread(supportView.ticketId); return; }
  box.innerHTML = `
    <div class="profile-panel">
      <h3 class="sup-h3">Yeni Destek Talebi</h3>
      <input id="sup-subject" class="sup-input" placeholder="Konu (örn. Giriş yapamıyorum)" autocomplete="off">
      <textarea id="sup-msg" class="sup-textarea" placeholder="Sorununu detaylı yaz..."></textarea>
      <button class="sup-send" onclick="supportCreateTicket()">Talep Oluştur</button>
    </div>
    <div class="profile-panel">
      <h3 class="sup-h3">Taleplerim</h3>
      <div id="sup-list"><div class="profile-empty">Yükleniyor...</div></div>
    </div>`;
  supportLoadTickets();
}
async function supportLoadTickets() {
  const box = document.getElementById('sup-list'); if (!box) return;
  try {
    const { data } = await sb.from('support_tickets').select('*').eq('user_id', currentUser.id).order('updated_at', { ascending: false });
    if (!data || !data.length) { box.innerHTML = '<div class="profile-empty">Henüz talebin yok.</div>'; return; }
    box.innerHTML = data.map(t => {
      const d = new Date(t.updated_at);
      return `<div class="sup-ticket" onclick="supportOpenTicket('${t.id}')">
        <div class="sup-ticket-main"><div class="sup-ticket-subj">${_escHtml(t.subject)}</div><div class="sup-ticket-date">${d.toLocaleDateString('tr-TR')}</div></div>
        <span class="sup-status sup-${t.status}">${supStatusLabel(t.status)}</span></div>`;
    }).join('');
  } catch (e) { box.innerHTML = '<div class="profile-empty">Talepler alınamadı.</div>'; }
}
async function supportCreateTicket() {
  const sEl = document.getElementById('sup-subject'), mEl = document.getElementById('sup-msg');
  const subj = (sEl && sEl.value || '').trim(), msg = (mEl && mEl.value || '').trim();
  if (!subj || !msg) { uiAlert('Lütfen konu ve mesaj gir.'); return; }
  if (typeof emailVerified === 'function' && !emailVerified()) { uiAlert('Destek talebi açmak için önce e-posta adresini doğrulamalısın. Üstteki banttan doğrulama mailini tekrar gönderebilirsin.'); return; }
  try {
    const { data, error } = await sb.from('support_tickets').insert({ user_id: currentUser.id, subject: subj, status: 'open' }).select().single();
    if (error) throw error;
    await sb.from('ticket_messages').insert({ ticket_id: data.id, user_id: currentUser.id, sender: 'user', body: msg });
    toast('Talebin oluşturuldu. En kısa sürede yanıtlanacak.');
    supportView = { mode: 'list', ticketId: null }; renderSupport();
  } catch (e) { uiAlert('Talep oluşturulamadı. Lütfen tekrar dene.'); }
}
function supportOpenTicket(id) { supportView = { mode: 'thread', ticketId: id }; renderSupport(); }
function supportBack() { supportView = { mode: 'list', ticketId: null }; renderSupport(); }
async function supportRenderThread(id) {
  const box = document.getElementById('support-body'); if (!box) return;
  box.innerHTML = '<div class="profile-panel"><div class="profile-empty">Yükleniyor...</div></div>';
  try {
    const { data: t } = await sb.from('support_tickets').select('*').eq('id', id).single();
    const { data: msgs } = await sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    const thread = (msgs || []).map(m => `<div class="sup-msg-row ${m.sender === 'admin' ? 'admin' : 'user'}"><div class="sup-bubble"><div class="sup-bubble-who">${m.sender === 'admin' ? 'Destek Ekibi' : 'Sen'}</div>${_escHtml(m.body)}<div class="sup-bubble-time">${new Date(m.created_at).toLocaleString('tr-TR')}</div></div></div>`).join('');
    const closed = t && t.status === 'closed';
    box.innerHTML = `<div class="profile-panel">
      <button class="sup-back" onclick="supportBack()">‹ Taleplerime dön</button>
      <h3 class="sup-h3">${_escHtml(t ? t.subject : '')} <span class="sup-status sup-${t ? t.status : 'open'}">${supStatusLabel(t ? t.status : 'open')}</span></h3>
      <div class="sup-thread">${thread || '<div class="profile-empty">Mesaj yok.</div>'}</div>
      ${closed ? '<div class="profile-empty">Bu talep kapatıldı.</div>' : `<textarea id="sup-reply" class="sup-textarea" placeholder="Yanıtını yaz..."></textarea><button class="sup-send" onclick="supportReply('${id}')">Gönder</button>`}
    </div>`;
  } catch (e) { box.innerHTML = '<div class="profile-panel"><div class="profile-empty">Talep yüklenemedi.</div></div>'; }
}
async function supportReply(id) {
  const inp = document.getElementById('sup-reply'); if (!inp) return;
  const body = (inp.value || '').trim(); if (!body) return;
  try {
    await sb.from('ticket_messages').insert({ ticket_id: id, user_id: currentUser.id, sender: 'user', body: body });
    await sb.from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', id);
    supportRenderThread(id);
  } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
}

/* ---- Yönetici tarafı ---- */
let adminTicketView = { mode: 'list', ticketId: null, userId: null };
async function adminLoadTickets() {
  const box = document.getElementById('admin-tickets'); if (!box) return;
  if (adminTicketView.mode === 'thread') { adminRenderThread(adminTicketView.ticketId, adminTicketView.userId); return; }
  box.innerHTML = '<div class="profile-empty">Yükleniyor...</div>';
  try {
    const { data } = await sb.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(100);
    if (!data || !data.length) { box.innerHTML = '<div class="profile-empty">Henüz talep yok.</div>'; return; }
    const ids = [...new Set(data.map(t => t.user_id))];
    let names = {};
    try { const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids); (profs || []).forEach(p => names[p.id] = p.display_name); } catch (e) {}
    box.innerHTML = data.map(t => {
      const d = new Date(t.updated_at);
      return `<div class="sup-ticket" onclick="adminOpenTicket('${t.id}','${t.user_id}')">
        <div class="sup-ticket-main"><div class="sup-ticket-subj">${_escHtml(t.subject)}</div><div class="sup-ticket-date">${_escHtml(names[t.user_id] || t.user_id.slice(0,8))} · ${d.toLocaleDateString('tr-TR')}</div></div>
        <span class="sup-status sup-${t.status}">${supStatusLabel(t.status)}</span>
        <button class="sup-del" title="Talebi sil" onclick="event.stopPropagation();adminDeleteTicket('${t.id}')">×</button></div>`;
    }).join('');
  } catch (e) { box.innerHTML = '<div class="profile-empty">Talepler alınamadı (yönetici yetkisi gerekli).</div>'; }
}
function adminOpenTicket(id, userId) { adminTicketView = { mode: 'thread', ticketId: id, userId: userId }; adminLoadTickets(); }
function adminTicketBack() { adminTicketView = { mode: 'list', ticketId: null, userId: null }; adminLoadTickets(); }
async function adminRenderThread(id, userId) {
  const box = document.getElementById('admin-tickets'); if (!box) return;
  box.innerHTML = '<div class="profile-empty">Yükleniyor...</div>';
  try {
    const { data: t } = await sb.from('support_tickets').select('*').eq('id', id).single();
    const { data: msgs } = await sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    const thread = (msgs || []).map(m => `<div class="sup-msg-row ${m.sender === 'admin' ? 'admin' : 'user'}"><div class="sup-bubble"><div class="sup-bubble-who">${m.sender === 'admin' ? 'Destek Ekibi' : 'Kullanıcı'}</div>${_escHtml(m.body)}<div class="sup-bubble-time">${new Date(m.created_at).toLocaleString('tr-TR')}</div></div></div>`).join('');
    // Kullanıcı detay kartı
    let uCard = '';
    try {
      const { data: up } = await sb.from('profiles').select('display_name, email, plan, level, is_admin, created_at, status').eq('id', userId).single();
      if (up) {
        _tkUserEmail = up.email || '';
        uCard = `<div class="tk-user-card">
          <div class="tk-user-name">👤 ${_escHtml(up.display_name || (up.email || '').split('@')[0] || 'Kullanıcı')}</div>
          <div class="tk-user-meta">
            <span>📧 ${_escHtml(up.email || '—')}</span>
            <span>${up.plan === 'premium' ? '👑 Premium' : '🆓 Ücretsiz'}</span>
            <span>🎚️ ${up.level || 'seviye yok'}</span>
            <span>📅 Kayıt: ${up.created_at ? new Date(up.created_at).toLocaleDateString('tr-TR') : '—'}</span>
            ${up.status === 'frozen' ? '<span>❄️ Dondurulmuş</span>' : ''}
          </div>
        </div>`;
      }
    } catch (e) { _tkUserEmail = ''; }
    box.innerHTML = `<button class="sup-back" onclick="adminTicketBack()">‹ Tüm talepler</button>
      <h4 class="sup-h3">${_escHtml(t ? t.subject : '')} <span class="sup-status sup-${t ? t.status : 'open'}">${supStatusLabel(t ? t.status : 'open')}</span></h4>
      ${uCard}
      <div class="sup-thread">${thread}</div>
      <select class="pq-input mail-tpl" onchange="tkTpl(this.value); this.selectedIndex = 0;">
        <option value="">📋 Hazır şablon ekle...</option>
        ${TICKET_TEMPLATES.map((tp, i) => `<option value="${i}">${tp.t}</option>`).join('')}
      </select>
      <textarea id="adm-reply" class="sup-textarea" placeholder="Yanıt yaz..."></textarea>
      <div class="mail-actions" style="margin-top:8px;">
        <button class="sup-send" onclick="adminReply('${id}','${userId}')">Yanıtla (site içi)</button>
        <button class="mail-act" onclick="adminTicketMail('${id}')">📧 destek@ ile Mail Gönder</button>
        <button class="set-btn ghost" onclick="adminCloseTicket('${id}')">Talebi Kapat</button>
      </div>`;
  } catch (e) { box.innerHTML = '<div class="profile-empty">Yüklenemedi.</div>'; }
}
async function adminReply(id, userId) {
  const inp = document.getElementById('adm-reply'); if (!inp) return;
  const body = (inp.value || '').trim(); if (!body) return;
  try {
    await sb.from('ticket_messages').insert({ ticket_id: id, user_id: currentUser.id, sender: 'admin', body: body });
    await sb.from('support_tickets').update({ status: 'answered', updated_at: new Date().toISOString() }).eq('id', id);
    notifyUser(userId, 'Destek talebine yanıt geldi', 'Talebine destek ekibi yanıt verdi.', 'info');
    adminRenderThread(id, userId);
  } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
}
async function adminCloseTicket(id) {
  try { await sb.from('support_tickets').update({ status: 'closed' }).eq('id', id); adminTicketBack(); } catch (e) {}
}

/* ---- Yönetici: ticket silme ---- */
async function adminDeleteTicket(id) {
  if (!(await uiConfirm('Bu destek talebi ve tüm mesajları silinsin mi?', 'Talebi Sil', { danger: true }))) return;
  try { await sb.from('support_tickets').delete().eq('id', id); } catch (e) {}
  adminTicketView = { mode: 'list', ticketId: null, userId: null };
  adminLoadTickets();
}
async function adminClearClosedTickets() {
  if (!(await uiConfirm('Kapanmış tüm talepler kalıcı olarak silinsin mi?', 'Kapanmışları Temizle', { danger: true }))) return;
  try { await sb.from('support_tickets').delete().eq('status', 'closed'); } catch (e) {}
  adminLoadTickets();
}

/* ============================================================
   SİTE MAİL / İLETİŞİM (kullanıcı → yönetici gelen kutusu)
   ============================================================ */
async function sendSiteMail() {
  if (typeof currentUser === 'undefined' || !currentUser) { uiAlert('Mesaj göndermek için giriş yapmalısın.'); return; }
  const sEl = document.getElementById('sm-subject'), bEl = document.getElementById('sm-body');
  const subj = (sEl && sEl.value || '').trim(), body = (bEl && bEl.value || '').trim();
  if (!subj || !body) { uiAlert('Lütfen konu ve mesaj gir.'); return; }
  try {
    await sb.from('site_mail').insert({ user_id: currentUser.id, email: currentUser.email || null, subject: subj, body: body });
    toast('Mesajın yöneticiye iletildi.');
    if (sEl) sEl.value = ''; if (bEl) bEl.value = '';
  } catch (e) { uiAlert('Gönderilemedi. Lütfen tekrar dene.'); }
}
let adminMailTab = 'inbox';
let _mailSelected = new Set();
let _mailCache = {};
let _mailMembers = {};
function admMailToggle(headEl, id) {
  const item = headEl.closest('.sm-item'); if (!item) return;
  item.classList.toggle('open');
  if (item.classList.contains('unread')) {
    item.classList.remove('unread');
    try { sb.from('inbox_mail').update({ is_read: true }).eq('id', id).then(function(){}, function(){}); } catch (e) {}
  }
}
function admMailSel(id, on) {
  if (on) _mailSelected.add(id); else _mailSelected.delete(id);
  const bar = document.getElementById('mail-selbar-count'); if (bar) bar.textContent = _mailSelected.size;
  const sel = document.getElementById('mail-selbar'); if (sel) sel.style.display = _mailSelected.size ? 'flex' : 'none';
}
function admMailSelectAll() {
  const cbs = document.querySelectorAll('.mail-cb');
  const allChecked = _mailSelected.size >= cbs.length && cbs.length > 0;
  cbs.forEach(cb => { cb.checked = !allChecked; admMailSel(cb.getAttribute('data-id'), !allChecked); });
}
async function admMailDeleteSelected() {
  if (!_mailSelected.size) return;
  const ids = [..._mailSelected];
  if (adminMailTab === 'sent') {
    if (!(await uiConfirm(ids.length + ' gönderilmiş mail kaydı silinsin mi?', 'Seçilenleri Sil', { danger: true }))) return;
    try { await sb.from('outbox_mail').delete().in('id', ids); } catch (e) {}
    _mailSelected = new Set(); adminLoadMail(); return;
  }
  if (adminMailTab === 'trash') {
    if (!(await uiConfirm(ids.length + ' mail kalıcı olarak silinsin mi?', 'Kalıcı Sil', { danger: true }))) return;
    try { await sb.from('inbox_mail').delete().in('id', ids); } catch (e) {}
  } else {
    if (!(await uiConfirm(ids.length + ' mail çöp kutusuna taşınsın mı?', 'Seçilenleri Sil', { danger: true }))) return;
    try { await sb.from('inbox_mail').update({ is_deleted: true }).in('id', ids); } catch (e) {}
  }
  _mailSelected = new Set();
  adminLoadMail();
}
function adminMailSetTab(tab) { adminMailTab = tab; _mailSelected = new Set(); adminLoadMail(); }
async function adminLoadMail() {
  const box = document.getElementById('admin-mail'); if (!box) return;
  const tabs = [['inbox','📥 Gelen'],['spam','🚫 Spam'],['trash','🗑️ Çöp'],['sent','📤 Gönderilen']];
  const selLabel = adminMailTab === 'trash' ? 'Seçilenleri Kalıcı Sil' : 'Seçilenleri Sil';
  const searchBox = `<input class="pq-input mail-search" placeholder="🔍 Mail ara (gönderen / konu / içerik)..." oninput="admMailSearch(this.value)" autocomplete="off">`;
  const selBar = `<div class="mail-selrow">
    ${searchBox}
    <button class="mail-act" onclick="admMailSelectAll()">☑️ Tümünü Seç / Bırak</button>
    <div id="mail-selbar" class="mail-selbar" style="display:none;"><span><b id="mail-selbar-count">0</b> seçili</span>
    <button class="mail-act red" onclick="admMailDeleteSelected()">🗑️ ${selLabel}</button></div></div>`;
  const tabsHtml = '<div class="mail-tabs">' + tabs.map(t => `<button class="mail-tab ${adminMailTab===t[0]?'active':''}" onclick="adminMailSetTab('${t[0]}')">${t[1]}</button>`).join('') + (adminMailTab==='trash' ? '<button class="set-btn ghost mail-empty-btn" onclick="adminEmptyTrash()">Çöpü Boşalt</button>' : '') + '</div>' + selBar;
  box.innerHTML = tabsHtml + '<div class="profile-empty">Yükleniyor...</div>';
  try {
    if (adminMailTab === 'sent') {
      const { data } = await sb.from('outbox_mail').select('*').order('created_at', { ascending: false }).limit(100);
      _mailCache = {}; (data || []).forEach(m => { _mailCache[m.id] = m; });
      const items = (data && data.length) ? data.map(m => {
        const d = new Date(m.created_at);
        const stMap = { sent: ['Gönderildi',''], delivered: ['✓ Ulaştı','yes'], bounced: ['Geri döndü','no'], complained: ['Şikayet','no'], failed: ['İletilemedi','no'] };
        const st = stMap[m.status] || stMap.sent;
        return `<div class="sm-item"><div class="sm-head" onclick="this.parentNode.classList.toggle('open')">
          <input type="checkbox" class="mail-cb" data-id="${m.id}" onclick="event.stopPropagation()" onchange="admMailSel('${m.id}', this.checked)">
          <div style="flex:1;min-width:0;"><div class="sm-subj">${_escHtml(m.subject || '(konu yok)')} <span class="mail-member ${st[1]}">${st[0]}</span></div>
          <div class="sm-meta">Kime: ${_escHtml(m.to_email)} · ${d.toLocaleString('tr-TR')}</div></div>
          <button class="sup-del" title="Sil" onclick="event.stopPropagation();admSentDelete('${m.id}')">×</button></div>
          <div class="sm-body">${_escHtml(m.body || '')}</div></div>`;
      }).join('') : '<div class="profile-empty">Gönderilen mail yok.</div>';
      box.innerHTML = tabsHtml + items; return;
    }
    let q = sb.from('inbox_mail').select('*').order('created_at', { ascending: false }).limit(100);
    if (adminMailTab === 'inbox') q = q.eq('is_deleted', false).eq('is_spam', false);
    else if (adminMailTab === 'spam') q = q.eq('is_deleted', false).eq('is_spam', true);
    else q = q.eq('is_deleted', true);
    const { data } = await q;
    if (!data || !data.length) {
      const empt = { inbox: 'Gelen e-posta yok. (info@ / destek@ / support@ adresine gelenler buraya düşer.)', spam: 'Spam yok.', trash: 'Çöp kutusu boş.' }[adminMailTab];
      box.innerHTML = tabsHtml + '<div class="profile-empty">' + empt + '</div>'; return;
    }
    const froms = [...new Set(data.map(m => (m.from_email || '').toLowerCase()).filter(Boolean))];
    let members = {};
    try { if (froms.length) { const { data: profs } = await sb.from('profiles').select('id, email').in('email', froms); (profs || []).forEach(p => { members[(p.email || '').toLowerCase()] = p.id; }); } } catch (e) {}
    _mailMembers = members;
    _mailCache = {};
    data.forEach(m => { _mailCache[m.id] = m; });
    box.innerHTML = tabsHtml + data.map(m => {
      const d = new Date(m.created_at);
      const fe = (m.from_email || '').toLowerCase();
      const badge = members[fe] ? '<span class="mail-member yes">Üye</span>' : '<span class="mail-member no">Üye değil</span>';
      const spamBadge = m.is_spam ? '<span class="mail-member spam">SPAM</span>' : '';
      let actions = '';
      if (adminMailTab === 'trash') {
        actions = `<button class="mail-act" onclick="admMailRestore('${m.id}')">↩️ Geri Al</button>
                   <button class="mail-act red" onclick="admMailHardDelete('${m.id}')">Kalıcı Sil</button>`;
      } else {
        actions = `<button class="mail-act" onclick="admMailReplyBox('${m.id}')">✉️ Site İçinden Yanıtla</button>
                   ${members[fe] ? `<button class="mail-act" onclick="admMailToTicket('${m.id}')">🎫 Ticket'a Dönüştür</button>` : ''}
                   <a class="mail-act" href="mailto:${encodeURIComponent(m.from_email||'')}?subject=${encodeURIComponent('RE: '+(m.subject||''))}">📧 Mail Uygulamasıyla</a>
                   <button class="mail-act" onclick="admMailToggleSpam('${m.id}', ${m.is_spam ? 'false' : 'true'})">${m.is_spam ? '✅ Spam Değil' : '🚫 Spam İşaretle'}</button>
                   <button class="mail-act red" onclick="admMailDelete('${m.id}')">🗑️ Sil</button>`;
      }
      const headBtns = adminMailTab === 'trash'
        ? `<button class="sup-del" title="Kalıcı sil" onclick="event.stopPropagation();admMailHardDelete('${m.id}')">×</button>`
        : `<button class="sup-del" title="Çöpe taşı" onclick="event.stopPropagation();admMailDelete('${m.id}')">×</button>`;
      return `<div class="sm-item ${m.is_read ? '' : 'unread'}">
        <div class="sm-head" onclick="admMailToggle(this, '${m.id}')">
          <input type="checkbox" class="mail-cb" data-id="${m.id}" onclick="event.stopPropagation()" onchange="admMailSel('${m.id}', this.checked)">
          <div style="flex:1;min-width:0;"><div class="sm-subj">${_escHtml(m.subject || '(konu yok)')} ${badge} ${spamBadge}</div>
          <div class="sm-meta">${_escHtml(m.from_name || '')} &lt;${_escHtml(m.from_email || '')}&gt;${m.to_email ? ' → <b>' + _escHtml(m.to_email) + '</b>' : ''} · ${d.toLocaleString('tr-TR')}</div></div>
          ${headBtns}
        </div>
        <div class="sm-body">${_escHtml(m.body || '')}
          <div class="mail-actions">${actions}</div>
          <div id="reply-${m.id}" class="mail-replybox" style="display:none;">
            <select class="pq-input mail-tpl" onchange="admMailTpl('${m.id}', this.value); this.selectedIndex = 0;">
              <option value="">📋 Hazır şablon ekle...</option>
              ${MAIL_TEMPLATES.map((t, i) => `<option value="${i}">${t.t}</option>`).join('')}
            </select>
            <textarea id="reply-txt-${m.id}" class="sup-textarea" placeholder="Yanıtını yaz..."></textarea>
            <div class="mail-sign-note">Yanıtın sonuna otomatik olarak "YDT-YDS Rusça Ekibi" imzası eklenir.</div>
            <button class="sup-send" onclick="admMailSendReply('${m.id}')">Gönder</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { box.innerHTML = tabsHtml + '<div class="profile-empty">Gelen kutusu alınamadı. (inbox_mail_v2.sql çalıştırıldı mı?)</div>'; }
}
function admMailReplyBox(id) { const b = document.getElementById('reply-' + id); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; }
async function admMailSendReply(id) {
  const m = _mailCache[id]; if (!m) return;
  const txt = document.getElementById('reply-txt-' + id); if (!txt) return;
  const body = (txt.value || '').trim(); if (!body) { uiAlert('Yanıt boş olamaz.'); return; }
  try {
    const { data, error } = await sb.functions.invoke('send-mail', { body: {
      to: m.from_email,
      subject: 'RE: ' + (m.subject || ''),
      body: body,
      from: (m.to_email || '').toLowerCase(),
      in_reply_to: m.message_id || null
    } });
    if (error || (data && data.error)) throw new Error((data && data.error) || 'hata');
    toast('Yanıt gönderildi (' + ((m.to_email || 'destek@ydt-ydsrusca.com')) + ' adresinden).');
    txt.value = ''; admMailReplyBox(id);
  } catch (e) { uiAlert('Gönderilemedi. Resend kurulumu (domain doğrulama + RESEND_API_KEY + send-mail) tamam mı? Resend panelindeki Emails sayfasından durumu kontrol edebilirsin.'); }
}
async function admMailToggleSpam(id, on) {
  try { await sb.from('inbox_mail').update({ is_spam: on }).eq('id', id); } catch (e) {}
  adminLoadMail();
}
async function admMailRestore(id) {
  try { await sb.from('inbox_mail').update({ is_deleted: false }).eq('id', id); } catch (e) {}
  adminLoadMail();
}
async function admMailHardDelete(id) {
  if (!(await uiConfirm('Bu mail kalıcı olarak silinsin mi?', 'Kalıcı Sil', { danger: true }))) return;
  try { await sb.from('inbox_mail').delete().eq('id', id); } catch (e) {}
  adminLoadMail();
}
async function adminEmptyTrash() {
  if (!(await uiConfirm('Çöp kutusundaki tüm mailler kalıcı olarak silinsin mi?', 'Çöpü Boşalt', { danger: true }))) return;
  try { await sb.from('inbox_mail').delete().eq('is_deleted', true); } catch (e) {}
  adminLoadMail();
}
async function admMailDelete(id) {
  try { await sb.from('inbox_mail').update({ is_deleted: true }).eq('id', id); } catch (e) {}
  adminLoadMail();
}


/* ============================================================
   SEVİYE TESPİT SINAVI (ayrı soru havuzu: placement_questions)
   ============================================================ */
const PLC_LEVELS = ['A1','A2','B1','B2','C1'];
const PLC_SIZE = 20;
const PLC_PASS = 70;
let placementPool = null;        // { A1:[...], ... }
let plcExam = [], plcAnswers = [], plcIdx = 0;
let plcNoLevel = false;

async function openPlacement() {
  if (typeof currentUser === 'undefined' || !currentUser) { if (typeof openAuth === 'function') openAuth('login'); return; }
  if (typeof showPage === 'function') showPage('placement');
  renderPlacementIntro();
}
async function loadPlacementPool() {
  if (placementPool) return placementPool;
  const g = { A1:[], A2:[], B1:[], B2:[], C1:[] };
  try {
    const { data } = await sb.from('placement_questions').select('*').eq('active', true);
    (data || []).forEach(q => { if (g[q.level]) g[q.level].push(q); });
  } catch (e) {}
  placementPool = g; return g;
}
function renderPlacementIntro() {
  const box = document.getElementById('plc-content'); if (!box) return;
  const lvl = (currentProfile && currentProfile.level) ? String(currentProfile.level).toUpperCase() : '';
  box.innerHTML = `<div class="plc-card">
    <div class="plc-icon">🎚️</div>
    <h2 class="plc-title">Seviye Tespit Sınavı</h2>
    <p class="plc-sub">${PLC_SIZE} soruluk bir sınavla Rusça seviyen belirlenir. Sonuç avatarındaki seviye çerçevesine ve gelişim grafiğine işlenir.</p>
    ${lvl ? `<div class="plc-level-now">Mevcut seviyen: <b>${lvl}</b></div>` : ''}
    <ul class="plc-rules">
      ${lvl
        ? `<li>Sorular seviyene göre ağırlıklı olarak havuzdan <b>rastgele</b> seçilir.</li>
           <li>Geçme barajı <b>%${PLC_PASS}</b>. Geçersen bir üst seviyeye çıkarsın.</li>
           <li>Geçemezsen <b>farklı sorularla</b> tekrar girebilirsin.</li>`
        : `<li>Sorular <b>tüm seviyelerden</b> rastgele seçilir.</li>
           <li>Bu ilk sınavda geçme barajı yoktur; sonucuna göre <b>seviyen belirlenir</b>.</li>
           <li>Sonrasında istediğin zaman tekrar girip seviyeni yükseltmeyi deneyebilirsin.</li>`}
    </ul>
    <button class="plc-start" onclick="startPlacement()">Sınava Başla →</button>
  </div>`;
}
function placementCounts(idx, total) {
  const last = PLC_LEVELS.length - 1;
  const counts = {};
  const add = (i, c) => { if (i >= 0 && i <= last && c > 0) counts[i] = (counts[i] || 0) + c; };
  const hasBelow = idx > 0, hasAbove = idx < last;
  if (hasBelow && hasAbove) {
    add(idx, Math.round(total * 0.60));
    add(idx - 1, Math.round(total * 0.10));
    add(idx + 1, Math.round(total * 0.20));
    if (idx + 2 <= last) add(idx + 2, Math.round(total * 0.10)); else add(idx + 1, Math.round(total * 0.10));
  } else if (!hasBelow) {
    add(idx, Math.round(total * 0.70));
    add(idx + 1, Math.round(total * 0.20));
    if (idx + 2 <= last) add(idx + 2, Math.round(total * 0.10)); else add(idx + 1, Math.round(total * 0.10));
  } else { // en üst seviye
    add(idx, Math.round(total * 0.80));
    let lower = total - (counts[idx] || 0), i = idx - 1;
    while (lower > 0 && i >= 0) { const c = Math.min(lower, Math.max(1, Math.ceil(lower / 2))); add(i, c); lower -= c; i--; }
  }
  let sum = Object.values(counts).reduce((a, b) => a + b, 0);
  while (sum > total) { counts[idx]--; sum--; }
  while (sum < total) { counts[idx] = (counts[idx] || 0) + 1; sum++; }
  return counts;
}
function buildPlacementExam() {
  const rawLevel = currentProfile && currentProfile.level;
  plcNoLevel = !(rawLevel && PLC_LEVELS.indexOf(String(rawLevel).toUpperCase()) >= 0);
  let counts;
  if (plcNoLevel) {
    // Seviyesi hiç belirlenmemiş kullanıcı: tüm seviyelere yayılan tanı dağılımı
    // A1 %30 · A2 %25 · B1 %20 · B2 %15 · C1 %10
    const w = [0.30, 0.25, 0.20, 0.15, 0.10];
    counts = {};
    let sum = 0;
    w.forEach((p, i) => { counts[i] = Math.round(PLC_SIZE * p); sum += counts[i]; });
    while (sum > PLC_SIZE) { counts[0]--; sum--; }
    while (sum < PLC_SIZE) { counts[0]++; sum++; }
  } else {
    const idx0 = PLC_LEVELS.indexOf(String(rawLevel).toUpperCase());
    counts = placementCounts(idx0, PLC_SIZE);
  }
  const curLevel = plcNoLevel ? 'A1' : String(rawLevel).toUpperCase();
  let idx = PLC_LEVELS.indexOf(curLevel); if (idx < 0) idx = 0;
  let exam = [], deficit = 0;
  Object.keys(counts).forEach(li => {
    const lv = PLC_LEVELS[li];
    const pool = (placementPool[lv] || []).slice(); shuffle(pool);
    const want = counts[li]; const take = pool.slice(0, want);
    if (take.length < want) deficit += (want - take.length);
    exam = exam.concat(take);
  });
  if (deficit > 0) {
    let extra = [];
    PLC_LEVELS.forEach(lv => (placementPool[lv] || []).forEach(q => { if (exam.indexOf(q) === -1) extra.push(q); }));
    shuffle(extra); exam = exam.concat(extra.slice(0, deficit));
  }
  shuffle(exam);
  return exam.slice(0, PLC_SIZE);
}
async function startPlacement() {
  const box = document.getElementById('plc-content'); if (box) box.innerHTML = '<div class="plc-card"><div class="profile-empty">Sorular hazırlanıyor...</div></div>';
  await loadPlacementPool();
  const totalQ = PLC_LEVELS.reduce((a, lv) => a + (placementPool[lv] ? placementPool[lv].length : 0), 0);
  if (totalQ < 4) { if (box) box.innerHTML = '<div class="plc-card"><div class="profile-empty">Soru havuzu henüz boş. Lütfen yönetici sorular ekleyince tekrar dene.</div><button class="plc-start" onclick="renderPlacementIntro()">Geri</button></div>'; return; }
  plcExam = buildPlacementExam();
  plcAnswers = new Array(plcExam.length).fill(null);
  plcIdx = 0;
  renderPlcQ();
}
function renderPlcQ() {
  const box = document.getElementById('plc-content'); if (!box) return;
  const q = plcExam[plcIdx]; if (!q) { finishPlacement(); return; }
  const opts = Array.isArray(q.options) ? q.options : (function(){ try { return JSON.parse(q.options); } catch (e) { return []; } })();
  const pct = Math.round((plcIdx) / plcExam.length * 100);
  const optsHtml = opts.map((o, i) => `<button class="plc-opt ${plcAnswers[plcIdx] === i ? 'sel' : ''}" onclick="plcPick(${i})">${_escHtml(o)}</button>`).join('');
  box.innerHTML = `<div class="plc-card plc-quiz">
    <div class="plc-progress"><div class="plc-progress-bar" style="width:${pct}%"></div></div>
    <div class="plc-qnum">Soru ${plcIdx + 1} / ${plcExam.length}</div>
    <div class="plc-q">${_escHtml(q.question)}</div>
    <div class="plc-opts">${optsHtml}</div>
    <div class="plc-nav">
      ${plcIdx > 0 ? `<button class="plc-navbtn ghost" onclick="plcPrev()">‹ Önceki</button>` : '<span></span>'}
      ${plcIdx < plcExam.length - 1 ? `<button class="plc-navbtn" onclick="plcNext()">Sonraki ›</button>` : `<button class="plc-navbtn gold" onclick="finishPlacement()">Sınavı Bitir</button>`}
    </div>
  </div>`;
}
function plcPick(i) { plcAnswers[plcIdx] = i; renderPlcQ(); }
function plcNext() { if (plcIdx < plcExam.length - 1) { plcIdx++; renderPlcQ(); } }
function plcPrev() { if (plcIdx > 0) { plcIdx--; renderPlcQ(); } }
async function finishPlacement() {
  const blanks = plcAnswers.filter(a => a === null).length;
  if (blanks > 0 && !(await uiConfirm(blanks + ' soru boş. Yine de bitirilsin mi?', 'Sınavı Bitir'))) return;
  // Önce SUNUCU puanlaması dene (manipülasyona kapalı); olmazsa yerel hesap
  let srv = null;
  try {
    const { data, error } = await sb.functions.invoke('grade-placement', { body: {
      answers: plcExam.map((q, i) => ({ id: q.id, answer: plcAnswers[i] }))
    } });
    if (!error && data && data.ok) srv = data;
  } catch (e) {}
  if (srv) {
    if (currentProfile) currentProfile.level = srv.newLevel;
    if (typeof applyAvatar === 'function') applyAvatar();
    if (typeof createNotification === 'function') createNotification('🎚️ Seviyen: ' + srv.newLevel, srv.noLevel ? 'Seviyen belirlendi.' : (srv.passed ? 'Tebrikler! Seviye tespit sınavını geçtin.' : 'Bu sefer olmadı; farklı sorularla tekrar deneyebilirsin.'), 'success');
    _plcShowResult(srv.correct, srv.total, srv.pct, srv.passed, srv.newLevel, srv.noLevel);
    return;
  }
  const correct = plcExam.reduce((a, q, i) => a + (plcAnswers[i] === q.correct ? 1 : 0), 0);
  const total = plcExam.length;
  const pct = Math.round(correct / total * 100);
  let passed, newLevel;
  if (plcNoLevel) {
    // Ağırlıklı puan: zor seviyenin doğrusu daha çok puan (A1=1 ... C1=5)
    let wGot = 0, wMax = 0;
    plcExam.forEach((q, i) => {
      const wq = PLC_LEVELS.indexOf(q.level) + 1 || 1;
      wMax += wq;
      if (plcAnswers[i] === q.correct) wGot += wq;
    });
    const wp = wMax ? (wGot / wMax * 100) : 0;
    newLevel = wp < 25 ? 'A1' : (wp < 45 ? 'A2' : (wp < 65 ? 'B1' : (wp < 85 ? 'B2' : 'C1')));
    passed = true; // ilk belirleme: geç/kal yok, seviye atanır
  } else {
    passed = pct >= PLC_PASS;
    const curLevel = (currentProfile && currentProfile.level) || 'A1';
    let idx = PLC_LEVELS.indexOf(String(curLevel).toUpperCase()); if (idx < 0) idx = 0;
    const newIdx = passed ? Math.min(PLC_LEVELS.length - 1, idx + 1) : idx;
    newLevel = PLC_LEVELS[newIdx];
  }
  try {
    if (sb && currentUser) await sb.from('profiles').update({ level: newLevel }).eq('id', currentUser.id);
    if (currentProfile) currentProfile.level = newLevel;
    if (typeof applyAvatar === 'function') applyAvatar();
    if (typeof createNotification === 'function') createNotification('🎚️ Seviyen: ' + newLevel, passed ? 'Tebrikler! Seviye tespit sınavını geçtin.' : 'Seviyen belirlendi.', 'success');
  } catch (e) {}
  _plcShowResult(correct, total, pct, passed, newLevel, plcNoLevel);
}

function _plcShowResult(correct, total, pct, passed, newLevel, noLevel) {
  const box = document.getElementById('plc-content'); if (!box) return;
  box.innerHTML = `<div class="plc-card plc-result">
    <div class="plc-icon">${passed ? '🎉' : '📋'}</div>
    <h2 class="plc-title">${noLevel ? 'Seviyen Belirlendi!' : (passed ? 'Tebrikler!' : 'Sınav Tamamlandı')}</h2>
    <div class="plc-score ${noLevel ? 'pass' : (passed ? 'pass' : 'fail')}">%${pct}</div>
    <p class="plc-sub">${correct} / ${total} doğru${noLevel ? ' — sonuçlar tüm seviyelere göre ağırlıklı değerlendirildi.' : (passed ? ' — barajı geçtin.' : ' — baraj %' + PLC_PASS + ', tekrar deneyebilirsin.')}</p>
    <div class="plc-newlevel">Seviyen: <b>${newLevel}</b></div>
    <div class="plc-result-btns">
      <button class="plc-start" onclick="startPlacement()">Tekrar Dene (farklı sorular)</button>
      <button class="plc-navbtn ghost" onclick="showPage('profile')">Profilime Dön</button>
    </div>
  </div>`;
}

/* ============================================================
   YÖNETİCİ — Seviye Sınavı soru havuzu (tek + toplu ekleme)
   ============================================================ */
async function adminQuestionStats() {
  const box = document.getElementById('pq-stats'); if (!box) return;
  box.innerHTML = 'Yükleniyor...';
  try {
    const { data } = await sb.from('placement_questions').select('level').eq('active', true);
    const c = { A1:0, A2:0, B1:0, B2:0, C1:0 };
    (data || []).forEach(r => { if (c[r.level] !== undefined) c[r.level]++; });
    box.innerHTML = 'Havuz → ' + Object.keys(c).map(k => `<span class="pq-stat">${k}: <b>${c[k]}</b></span>`).join(' ') + ` · Toplam <b>${(data || []).length}</b>`;
  } catch (e) { box.innerHTML = '<span class="an-loading">Sayım alınamadı (tablo kurulu mu?).</span>'; }
}
function _v(id) { const el = document.getElementById(id); return el ? (el.value || '') : ''; }
async function adminAddQuestion() {
  const level = _v('pq-level'), q = _v('pq-q').trim();
  const opts = [_v('pq-o0'), _v('pq-o1'), _v('pq-o2'), _v('pq-o3')].map(x => x.trim());
  const cEl = document.querySelector('input[name="pq-correct"]:checked');
  if (!q || opts.some(o => !o)) { uiAlert('Soru ve 4 şık da dolu olmalı.'); return; }
  if (!cEl) { uiAlert('Doğru şıkkı seç.'); return; }
  try {
    await sb.from('placement_questions').insert({ level: level, question: q, options: opts, correct: parseInt(cEl.value, 10), tag: 'kelime', active: true });
    toast('Soru eklendi.');
    ['pq-q','pq-o0','pq-o1','pq-o2','pq-o3'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (cEl) cEl.checked = false;
    placementPool = null; adminQuestionStats();
  } catch (e) { uiAlert('Eklenemedi. Yönetici yetkisi ve placement_questions tablosu gerekli.'); }
}
async function adminBulkAddQuestions() {
  const raw = _v('pq-json').trim();
  if (!raw) { uiAlert('Önce JSON gir.'); return; }
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { uiAlert('Geçersiz JSON. Biçim: [{"level":"A1","question":"...","options":["a","b","c","d"],"correct":0}]'); return; }
  if (!Array.isArray(arr) || !arr.length) { uiAlert('JSON bir dizi (liste) olmalı.'); return; }
  const LV = ['A1','A2','B1','B2','C1']; const valid = [];
  for (const o of arr) {
    if (!o || LV.indexOf(o.level) === -1 || !o.question || !Array.isArray(o.options) || o.options.length !== 4) continue;
    const c = parseInt(o.correct, 10); if (isNaN(c) || c < 0 || c > 3) continue;
    valid.push({ level: o.level, question: String(o.question), options: o.options.map(String), correct: c, tag: o.tag || 'kelime', active: true });
  }
  if (!valid.length) { uiAlert('Geçerli soru yok. Her soruda level (A1-C1), question, 4 options ve correct (0-3) olmalı.'); return; }
  try {
    await sb.from('placement_questions').insert(valid);
    const skipped = arr.length - valid.length;
    await uiAlert(valid.length + ' soru eklendi' + (skipped > 0 ? ` (${skipped} geçersiz atlandı).` : '.'), 'Toplu Ekleme');
    const ta = document.getElementById('pq-json'); if (ta) ta.value = '';
    placementPool = null; adminQuestionStats();
  } catch (e) { uiAlert('Eklenemedi. Yönetici yetkisi ve placement_questions tablosu gerekli.'); }
}

/* ============================================================
   GÖREV / MİSYON SİSTEMİ — günlük + haftalık, XP, bildirim
   ============================================================ */
function _todayKey() { return new Date().toISOString().slice(0,10); }
function _weekId() {
  const d = new Date(); const day = (d.getDay() + 6) % 7; // Pzt=0
  const mon = new Date(d); mon.setDate(d.getDate() - day);
  return 'W' + mon.toISOString().slice(0,10);
}
function _weekKeys() {
  const keys = []; const d = new Date(); const day = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day);
  for (let i = 0; i <= day; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); keys.push(x.toISOString().slice(0,10)); }
  return keys;
}
function _dayField(key, f) { const l = getDailyLog(); return (l[key] && l[key][f]) || 0; }
function _weekSum(f) { return _weekKeys().reduce((a, k) => a + _dayField(k, f), 0); }
function _testsOnDay(key) { return getTestResults().filter(r => (r.date || '').slice(0,10) === key).length; }
function _testsInWeek() { const ks = new Set(_weekKeys()); return getTestResults().filter(r => ks.has((r.date || '').slice(0,10))).length; }
function _activeDaysInWeek() { const act = activeDaySet(); return _weekKeys().filter(k => act.has(k)).length; }

const TASKS_DAILY = [
  { id: 'd_test',   e: '📝', t: '1 test çöz',            target: 1,  xp: 10, val: () => _testsOnDay(_todayKey()) },
  { id: 'd_learn',  e: '🧠', t: '5 kelime öğren',        target: 5,  xp: 10, val: () => _dayField(_todayKey(), 'wordsLearned') },
  { id: 'd_review', e: '🔁', t: 'Günlük tekrarı yap',    target: 1,  xp: 10, val: () => _dayField(_todayKey(), 'dailyReviews') },
  { id: 'd_pomo',   e: '🍅', t: '1 Pomodoro tamamla',    target: 1,  xp: 10, val: () => _dayField(_todayKey(), 'pomodoros') }
];
const TASKS_WEEKLY = [
  { id: 'w_tests', e: '📚', t: '5 test çöz',             target: 5,  xp: 30, val: () => _testsInWeek() },
  { id: 'w_learn', e: '🌟', t: '25 kelime öğren',        target: 25, xp: 30, val: () => _weekSum('wordsLearned') },
  { id: 'w_save',  e: '📦', t: '30 kelime kaydet',       target: 30, xp: 30, val: () => _weekSum('wordsSaved') },
  { id: 'w_days',  e: '🗓️', t: '3 farklı gün çalış',     target: 3,  xp: 30, val: () => _activeDaysInWeek() }
];

function _tasksDone() { try { return JSON.parse(localStorage.getItem('ydt_tasks_done') || '{}'); } catch (e) { return {}; } }
function _saveTasksDone(o) { try { localStorage.setItem('ydt_tasks_done', JSON.stringify(o)); } catch (e) {} }
function getXP() { return parseInt(localStorage.getItem('ydt_xp') || '0', 10) || 0; }
function _addXP(n) { try { localStorage.setItem('ydt_xp', String(getXP() + n)); } catch (e) {} }

function checkTasks() {
  const done = _tasksDone(); let changed = false;
  const scan = (defs, period) => {
    defs.forEach(t => {
      const key = period + ':' + t.id;
      if (done[key]) return;
      let v = 0; try { v = t.val(); } catch (e) {}
      if (v >= t.target) {
        done[key] = true; changed = true; _addXP(t.xp);
        if (typeof createNotification === 'function') createNotification('🎯 Görev tamamlandı: ' + t.t, '+' + t.xp + ' XP kazandın!', 'success');
        if (typeof toast === 'function') toast('🎯 Görev tamamlandı: ' + t.t + ' (+' + t.xp + ' XP)');
      }
    });
  };
  scan(TASKS_DAILY, _todayKey());
  scan(TASKS_WEEKLY, _weekId());
  if (changed) { _saveTasksDone(done); const b = document.getElementById('tasks-body'); if (b && b.innerHTML) renderTasksView(); }
}
if (typeof window !== 'undefined') window.checkTasks = checkTasks;

function renderTasksView() {
  const box = document.getElementById('tasks-body'); if (!box) return;
  const done = _tasksDone();
  const row = (t, period) => {
    let v = 0; try { v = t.val(); } catch (e) {}
    const isDone = !!done[period + ':' + t.id] || v >= t.target;
    const pct = Math.min(100, Math.round(v / t.target * 100));
    return `<div class="tsk-row ${isDone ? 'done' : ''}">
      <div class="tsk-ic">${t.e}</div>
      <div class="tsk-main"><div class="tsk-t">${t.t}</div>
        <div class="tsk-track"><div class="tsk-fill" style="width:${pct}%"></div></div></div>
      <div class="tsk-right">${isDone ? '<span class="tsk-check">✔</span>' : `<span class="tsk-count">${Math.min(v, t.target)}/${t.target}</span>`}<span class="tsk-xp">+${t.xp} XP</span></div>
    </div>`;
  };
  const dDone = TASKS_DAILY.filter(t => done[_todayKey() + ':' + t.id]).length;
  const wDone = TASKS_WEEKLY.filter(t => done[_weekId() + ':' + t.id]).length;
  box.innerHTML = `
    <div class="tsk-xp-card"><div class="tsk-xp-num">⭐ ${getXP()} XP</div><div class="tsk-xp-lab">Toplam puanın — görev tamamladıkça artar</div></div>
    <div class="profile-panel"><h3 class="st-h3">📅 Günlük Görevler <span class="tsk-badge">${dDone}/${TASKS_DAILY.length}</span></h3>
      <div class="tsk-sub">Her gece sıfırlanır.</div>${TASKS_DAILY.map(t => row(t, _todayKey())).join('')}</div>
    <div class="profile-panel"><h3 class="st-h3">🗓️ Haftalık Görevler <span class="tsk-badge">${wDone}/${TASKS_WEEKLY.length}</span></h3>
      <div class="tsk-sub">Her pazartesi sıfırlanır.</div>${TASKS_WEEKLY.map(t => row(t, _weekId())).join('')}</div>`;
}

/* ---- Mail: hazır şablonlar, arama, ticket'a dönüştürme ---- */
const MAIL_TEMPLATES = [
  { t: '👋 Hoş geldiniz', body: 'Merhaba,\n\nYDT-YDS Rusça platformuna hoş geldiniz! Sorunuz için teşekkür ederiz. Size en kısa sürede yardımcı olacağız.\n\nİyi çalışmalar dileriz.' },
  { t: '👑 Premium bilgisi', body: 'Merhaba,\n\nPremium üyelik; kelime kaydetme, günlük tekrar, tüm testler ve video derslere tam erişim sağlar. Güncel fiyat ve planları sitemizin Fiyatlar sayfasında bulabilirsiniz: https://ydt-ydsrusca.com\n\nBaşka bir sorunuz olursa yazmaktan çekinmeyin.' },
  { t: '🔑 Şifre sıfırlama yönlendirmesi', body: 'Merhaba,\n\nŞifrenizi sıfırlamak için giriş penceresindeki "Şifremi Unuttum" bağlantısını kullanabilirsiniz. E-postanıza gelen bağlantıyla yeni şifre belirleyebilirsiniz. Mail gelmezse spam klasörünü kontrol etmenizi öneririz.\n\nSorun devam ederse bize tekrar yazın, birlikte çözelim.' },
  { t: '🛠️ Sorununuz inceleniyor', body: 'Merhaba,\n\nBildirdiğiniz konu tarafımıza ulaştı ve inceleniyor. En kısa sürede size dönüş yapacağız. Anlayışınız için teşekkür ederiz.' },
  { t: '🙏 Teşekkür / kapanış', body: 'Merhaba,\n\nGeri bildiriminiz için çok teşekkür ederiz. Başka bir konuda yardımcı olabileceksek her zaman yazabilirsiniz.\n\nİyi çalışmalar dileriz.' }
];
function admMailTpl(id, idx) {
  if (idx === '') return;
  const t = MAIL_TEMPLATES[parseInt(idx, 10)]; if (!t) return;
  const txt = document.getElementById('reply-txt-' + id); if (!txt) return;
  txt.value = txt.value ? (txt.value + '\n\n' + t.body) : t.body;
  txt.focus();
}
function admMailSearch(q) {
  q = (q || '').toLowerCase().trim();
  document.querySelectorAll('#admin-mail .sm-item').forEach(it => {
    it.style.display = (!q || it.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}
async function admMailToTicket(id) {
  const m = _mailCache[id]; if (!m) return;
  const fe = (m.from_email || '').toLowerCase();
  const memberId = _mailMembers[fe];
  if (!memberId) { uiAlert('Bu gönderici üye değil; ticket yalnızca üyeler için açılabilir.'); return; }
  if (!(await uiConfirm('Bu mail, kullanıcı adına bir destek talebine dönüştürülsün mü? Kullanıcı, talebi Profil → Destek bölümünde görecek ve bildirim alacak.', "Ticket'a Dönüştür"))) return;
  try {
    const { data: t, error } = await sb.from('support_tickets').insert({ user_id: memberId, subject: '[Mail] ' + (m.subject || '(konu yok)'), status: 'open' }).select().single();
    if (error) throw error;
    await sb.from('ticket_messages').insert({ ticket_id: t.id, user_id: currentUser.id, sender: 'user', body: (m.body || '').slice(0, 5000) });
    notifyUser(memberId, 'Mailiniz destek talebine dönüştürüldü', 'Konuyu Profil → Destek bölümünden takip edebilirsiniz.', 'info');
    toast("Ticket oluşturuldu. Destek Talepleri'nde görünecek.");
    if (typeof adminLoadTickets === 'function') { adminTicketView = { mode: 'list', ticketId: null, userId: null }; adminLoadTickets(); }
  } catch (e) { uiAlert("Ticket oluşturulamadı. mail_iyilestirmeler.sql çalıştırıldı mı?"); }
}

async function admSentDelete(id) {
  if (!(await uiConfirm('Bu gönderilmiş mail kaydı silinsin mi?', 'Kaydı Sil', { danger: true }))) return;
  try { await sb.from('outbox_mail').delete().eq('id', id); } catch (e) {}
  adminLoadMail();
}



/* ============================================================
   HATA YÖNETİM SİSTEMİ (Y7) — otomatik kayıt + panel görüntüleme
   ============================================================ */
let _errLogged = 0;
let _errLastMsg = '';
async function logError(message, source) {
  try {
    if (_errLogged >= 25) return; // oturum başına en fazla 25 kayıt (döngüsel hata patlamasına karşı)
    const _m = String(message || '').slice(0, 600);
    if (_m && _m === _errLastMsg) return; // aynı hatanın arka arkaya tekrarını yazma
    _errLastMsg = _m;
    if (typeof sb === 'undefined' || !sb || typeof currentUser === 'undefined' || !currentUser) return;
    _errLogged++;
    await sb.from('error_log').insert({
      user_id: currentUser.id,
      message: String(message || '').slice(0, 600),
      source: String(source || '').slice(0, 200),
      url: (location.pathname + location.hash).slice(0, 200)
    });
  } catch (e) {}
}
if (typeof window !== 'undefined') {
  window.logError = logError;
  window.addEventListener('error', function (ev) {
    logError(ev.message || 'script error', (ev.filename || '') + ':' + (ev.lineno || ''));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason; logError((r && (r.message || String(r))) || 'promise error', 'unhandledrejection');
  });
}

let _errShowAll = false;
async function adminLoadErrors(showAll) {
  if (typeof showAll === 'boolean') _errShowAll = showAll;
  const box = document.getElementById('admin-errors'); if (!box) return;
  box.innerHTML = '<div class="profile-empty">Yükleniyor...</div>';
  try {
    const { data } = await sb.from('error_log').select('*').order('created_at', { ascending: false }).limit(_errShowAll ? 1000 : 50);
    if (!data || !data.length) { box.innerHTML = '<div class="profile-empty">Kayıtlı hata yok. 🎉</div>'; return; }
    const foot = _errShowAll
      ? `<div class="err-foot">${data.length} kayıt gösteriliyor. <button class="mail-act" onclick="adminLoadErrors(false)">Son 50'ye dön</button></div>`
      : `<div class="err-foot">Son ${data.length} kayıt. <button class="mail-act" onclick="adminLoadErrors(true)">Tümünü Gör</button></div>`;
    box.innerHTML = foot + data.map(e => {
      const d = new Date(e.created_at);
      return `<div class="err-row"><div class="err-msg">${_escHtml(e.message)}</div>
        <div class="err-meta">${_escHtml(e.source || '')} · ${_escHtml((e.user_id || '').slice(0,8))} · ${d.toLocaleString('tr-TR')}</div></div>`;
    }).join('');
  } catch (e) { box.innerHTML = '<div class="profile-empty">Hata kayıtları alınamadı (error_log.sql çalıştırıldı mı?).</div>'; }
}
async function adminClearErrors() {
  if (!(await uiConfirm('Tüm hata kayıtları silinsin mi?', 'Kayıtları Temizle', { danger: true }))) return;
  try { await sb.from('error_log').delete().gte('created_at', '1970-01-01'); } catch (e) {}
  adminLoadErrors();
}

/* ============================================================
   ZİYARET TAKİBİ (page_views) + SEO DENETİMİ
   ============================================================ */
let _pvLogged = new Set();
function trackPageView(pageId) {
  try {
    if (typeof sb === 'undefined' || !sb) return;
    const key = pageId + ':' + new Date().toISOString().slice(0,13); // saat başına aynı sayfayı 1 kez
    if (_pvLogged.has(key)) return;
    _pvLogged.add(key);
    sb.from('page_views').insert({
      path: String(pageId || 'home').slice(0, 60),
      user_id: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null,
      referrer: (document.referrer || '').slice(0, 200),
      ua: (navigator.userAgent || '').slice(0, 200)
    }).then(function(){}, function(){});
  } catch (e) {}
}

async function _visitData(days) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await sb.from('page_views').select('path, created_at')
    .gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(5000);
  return data || [];
}
function _visitAggregate(rows) {
  const byDay = {}, byPage = {};
  rows.forEach(r => {
    const d = (r.created_at || '').slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
    byPage[r.path] = (byPage[r.path] || 0) + 1;
  });
  return { byDay, byPage, total: rows.length };
}
async function renderVisitsMini() {
  const box = document.getElementById('admin-visits-mini'); if (!box) return;
  box.innerHTML = '<div class="profile-empty">Yükleniyor...</div>';
  try {
    const rows = await _visitData(7);
    const { byDay, total } = _visitAggregate(rows);
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0,10)); }
    const max = Math.max(1, ...days.map(k => byDay[k] || 0));
    box.innerHTML = `<div class="vis-total">Son 7 gün: <b>${total}</b> sayfa görüntüleme</div>
      <div class="vis-bars">${days.map(k => `<div class="vis-col"><div class="vis-bar" style="height:${Math.round((byDay[k]||0)/max*70)+4}px" title="${k}: ${byDay[k]||0}"></div><span>${k.slice(8)}</span></div>`).join('')}</div>`;
  } catch (e) { box.innerHTML = '<div class="profile-empty">Ziyaret verisi alınamadı (page_views.sql çalıştırıldı mı?)</div>'; }
}
async function renderVisitsFull() {
  const box = document.getElementById('admin-visits'); if (!box) return;
  box.innerHTML = '<div class="profile-empty">Yükleniyor...</div>';
  try {
    const rows = await _visitData(30);
    const { byDay, byPage, total } = _visitAggregate(rows);
    const today = new Date().toISOString().slice(0,10);
    const week = Object.keys(byDay).filter(k => k >= new Date(Date.now() - 7*86400000).toISOString().slice(0,10)).reduce((a,k) => a + byDay[k], 0);
    const pageNames = { home:'Ana Sayfa', words:'Kelimeler', quiz:'Testler', review:'Tekrar', testbuilder:'Test Oluştur', video:'Videolar', pricing:'Fiyatlar', profile:'Profil', admin:'Yönetim', placement:'Seviye Sınavı' };
    const top = Object.entries(byPage).sort((a,b) => b[1]-a[1]).slice(0,8);
    const maxP = Math.max(1, ...(top.map(t => t[1])));
    box.innerHTML = `<div class="st-cards">
      <div class="st-card"><div class="st-card-num">${byDay[today]||0}</div><div class="st-card-lab">Bugün</div></div>
      <div class="st-card"><div class="st-card-num">${week}</div><div class="st-card-lab">Son 7 Gün</div></div>
      <div class="st-card"><div class="st-card-num">${total}</div><div class="st-card-lab">Son 30 Gün</div></div>
    </div>
    <h4 class="st-h3">En Çok Ziyaret Edilen Sayfalar (30 gün)</h4>
    ${top.map(t => `<div class="st-bar-row"><span class="st-bar-lab" style="width:110px">${pageNames[t[0]]||t[0]}</span><div class="st-bar-track"><div class="st-bar-fill" style="width:${Math.round(t[1]/maxP*100)}%"></div></div><span class="st-bar-val">${t[1]}</span></div>`).join('') || '<div class="profile-empty">Henüz veri yok.</div>'}
    <div class="pg-foot">Not: Kayıtlar tarayıcıdan toplanır (saat başına sayfa başı 1 kayıt). Derin analiz (ülke, cihaz, gerçek benzersiz ziyaretçi) için Cloudflare panelindeki <b>Analytics</b> sekmesi de kullanılabilir.</div>`;
  } catch (e) { box.innerHTML = '<div class="profile-empty">Ziyaret verisi alınamadı (page_views.sql çalıştırıldı mı?)</div>'; }
}
function renderSeoCheck() {
  const box = document.getElementById('admin-seo'); if (!box) return;
  const checks = [];
  const t = document.title || '';
  checks.push([t.length >= 25 && t.length <= 65, 'Sayfa başlığı (title) 25-65 karakter', t ? `"${t}" (${t.length})` : 'YOK']);
  const md = document.querySelector('meta[name="description"]');
  checks.push([!!md && (md.content||'').length >= 60, 'Meta açıklama (description) 60+ karakter', md ? (md.content||'').slice(0,80) : 'YOK — eklenmeli']);
  checks.push([!!document.querySelector('link[rel*="icon"]'), 'Favicon tanımlı', '']);
  checks.push([!!document.querySelector('meta[property="og:title"]'), 'Open Graph başlık (link paylaşım kartı)', 'YOK ise WhatsApp/Telegram önizlemesi çıkmaz']);
  checks.push([!!document.querySelector('meta[property="og:image"]'), 'Open Graph görsel', 'Paylaşımda görünen resim']);
  checks.push([!!document.documentElement.lang, 'HTML dil etiketi (lang)', document.documentElement.lang || 'YOK']);
  checks.push([document.querySelectorAll('h1').length === 1, 'Tek H1 başlığı', document.querySelectorAll('h1').length + ' adet bulundu']);
  checks.push([location.protocol === 'https:', 'HTTPS aktif', '']);
  const ok = checks.filter(c => c[0]).length;
  box.innerHTML = `<div class="vis-total">SEO puanı: <b>${ok}/${checks.length}</b></div>` +
    checks.map(c => `<div class="seo-row ${c[0] ? 'ok' : 'no'}"><span>${c[0] ? '✅' : '❌'}</span><div><b>${c[1]}</b>${c[2] ? `<div class="seo-note">${_escHtml(String(c[2]))}</div>` : ''}</div></div>`).join('') +
    `<div class="pg-foot">Eksikler (OG etiketleri, meta description, logo) yol haritasındaki H4 adımında birlikte eklenecek. Arama sonuç metrikleri için ücretsiz <b>Google Search Console</b> kurulumunu da o adımda yaparız.</div>`;
}

// İlk açılış ziyareti (giriş beklemeden, anonim de sayılır)
setTimeout(function () { try { trackPageView('home'); } catch (e) {} }, 2500);

/* ============================================================
   İÇERİK: DB kelimeleri (content_words) JSON'un üstüne bindirilir
   ============================================================ */
function _tryLoadDbWords(attempt) {
  attempt = attempt || 0;
  if (typeof sb === 'undefined' || !sb) {
    if (attempt < 10) setTimeout(function () { _tryLoadDbWords(attempt + 1); }, 800);
    return;
  }
  loadDbWords();
}
function applyDbWords(rows) {
  rows.forEach(r => {
    const lvl = r.level || 'A1';
    const match = x => x.ru === r.ru && (x.level || 'A1') === lvl;
    if (r.active === false) { words = words.filter(x => !match(x)); return; }
    const w = { ru: r.ru, tr: r.tr, p: r.p || '', cat: r.cat || 'isim', level: lvl,
                ornek: r.ornek || '', ornekTr: r.ornek_tr || '', cinsiyet: r.cinsiyet || '', premium: !!r.premium };
    if (r.padej) w.padej = r.padej;
    const ex = words.find(match);
    if (ex) Object.assign(ex, w); else words.push(w);
  });
}
async function loadDbWords() {
  try {
    const { data } = await sb.from('content_words').select('*').limit(10000);
    if (!data) return;
    applyDbWords(data);
    wordsByRu = {};
    words.forEach(w => { wordsByRu[w.ru] = w; });
  } catch (e) { _logDev('DB kelimeleri yüklenemedi:', e); }
}

/* ============================================================
   YÖNETİCİ — İÇERİK YÖNETİMİ (kelimeler): listele/düzenle/sil,
   tekli ekleme, JSON kutusu, JSON/CSV/Excel dosyası, JSON->DB göçü
   ============================================================ */
let _cwRows = [];
const cwState = { page: 1, q: '', level: 'all' };
const CW_PAGE = 20;

async function adminContentInit() {
  cwCatChanged();
  await adminCwReload();
}
async function adminCwReload() {
  try {
    const { data } = await sb.from('content_words').select('*').order('ru').limit(10000);
    _cwRows = data || [];
  } catch (e) { _cwRows = []; }
  renderCwStats(); renderCwList();
}
function renderCwStats() {
  const box = document.getElementById('cw-stats'); if (!box) return;
  const act = _cwRows.filter(r => r.active !== false);
  const c = { A1:0, A2:0, B1:0, B2:0, C1:0 };
  act.forEach(r => { if (c[r.level] !== undefined) c[r.level]++; });
  const jsonCount = (typeof words !== 'undefined') ? words.length : 0;
  box.innerHTML = `DB'de <b>${act.length}</b> aktif kelime (${Object.keys(c).map(k => k + ': ' + c[k]).join(' · ')}) · gizlenen: <b>${_cwRows.length - act.length}</b> · sitede toplam görünen: <b>${jsonCount}</b>`;
}
function cwSet(k, v) { cwState[k] = v; cwState.page = 1; renderCwList(); }
function renderCwList() {
  const box = document.getElementById('cw-list'); if (!box) return;
  let list = _cwRows;
  if (cwState.level !== 'all') list = list.filter(r => r.level === cwState.level);
  const q = cwState.q.toLowerCase();
  if (q) list = list.filter(r => (r.ru || '').toLowerCase().includes(q) || (r.tr || '').toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(list.length / CW_PAGE));
  if (cwState.page > pages) cwState.page = pages;
  const slice = list.slice((cwState.page - 1) * CW_PAGE, cwState.page * CW_PAGE);
  if (!list.length) { box.innerHTML = '<div class="profile-empty">DB\'de eşleşen kelime yok. (JSON\'dan gelenleri düzenlemek için önce "JSON\'daki kelimeleri DB\'ye aktar" butonunu kullan.)</div>'; return; }
  let pager = '';
  if (pages > 1) {
    pager = '<div class="kv-pager">';
    if (cwState.page > 1) pager += `<button class="kv-pg" onclick="cwSet('page', ${cwState.page-1}); cwState.page=${cwState.page-1}; renderCwList();">‹</button>`;
    pager += `<span class="kv-count" style="margin:0 8px;">Sayfa ${cwState.page}/${pages}</span>`;
    if (cwState.page < pages) pager += `<button class="kv-pg" onclick="cwState.page=${cwState.page+1}; renderCwList();">›</button>`;
    pager += '</div>';
  }
  box.innerHTML = slice.map(r => `
    <div class="cw-row ${r.active === false ? 'off' : ''}">
      <div class="cw-main"><b>${_escHtml(r.ru)}</b> — ${_escHtml(r.tr)} <span class="kv-lvl">${r.level || ''}</span> <span class="cw-cat">${_escHtml(r.cat || '')}</span>${r.cinsiyet ? ` <span class="cw-cat">${_escHtml(r.cinsiyet)}</span>` : ''}${r.padej ? ` <span class="cw-cat">${_escHtml(r.padej)}</span>` : ''}${r.premium ? ' <span class="mail-member yes">Premium</span>' : ''}${r.active === false ? ' <span class="mail-member no">Gizli</span>' : ''}</div>
      <div class="cw-acts">
        <button class="mail-act" onclick="adminWordEdit('${r.id}')">✏️ Düzenle</button>
        ${r.active === false
          ? `<button class="mail-act" onclick="adminWordRestore('${r.id}')">↩️ Göster</button>`
          : `<button class="mail-act red" onclick="adminWordDelete('${r.id}')">🗑️ Gizle/Sil</button>`}
      </div>
    </div>`).join('') + pager;
}
function _cwVal(id) { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }
function adminWordFormClear() {
  ['cw-ru','cw-tr','cw-p','cw-ornek','cw-ornektr'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pr = document.getElementById('cw-premium'); if (pr) pr.checked = false;
  const ru = document.getElementById('cw-ru'); if (ru) ru.disabled = false;
  const btn = document.getElementById('cw-save-btn'); if (btn) btn.textContent = 'Kelime Ekle';
  _cwEditId = null;
  cwCatChanged();
}
let _cwEditId = null;
function adminWordEdit(id) {
  const r = _cwRows.find(x => x.id === id); if (!r) return;
  _cwEditId = r.id;
  document.getElementById('cw-ru').value = r.ru; document.getElementById('cw-ru').disabled = true;
  document.getElementById('cw-tr').value = r.tr || '';
  document.getElementById('cw-p').value = r.p || '';
  document.getElementById('cw-cat').value = r.cat || 'isim';
  cwCatChanged(r.cat === 'edat' ? (r.padej || '') : (r.cinsiyet || ''));
  document.getElementById('cw-lvl').value = r.level || 'A1';
  document.getElementById('cw-ornek').value = r.ornek || '';
  document.getElementById('cw-ornektr').value = r.ornek_tr || '';
  document.getElementById('cw-premium').checked = !!r.premium;
  const btn = document.getElementById('cw-save-btn'); if (btn) btn.textContent = 'Değişiklikleri Kaydet';
  document.getElementById('cw-ru').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function adminWordSave() {
  const ru = _cwVal('cw-ru'), tr = _cwVal('cw-tr');
  if (!ru || !tr) { uiAlert('Rusça kelime ve Türkçe anlam zorunlu.'); return; }
  const row = { ru, tr, p: _cwVal('cw-p') || null, cat: _cwVal('cw-cat'), level: _cwVal('cw-lvl'),
    cinsiyet: (_cwVal('cw-cat') === 'edat') ? null : (_cwVal('cw-gram') || null),
    padej: (_cwVal('cw-cat') === 'edat') ? cwPadejValue() : null,
    ornek: _cwVal('cw-ornek') || null, ornek_tr: _cwVal('cw-ornektr') || null,
    premium: document.getElementById('cw-premium').checked, active: true, updated_at: new Date().toISOString() };
  try {
    let error;
    if (_cwEditId) { ({ error } = await sb.from('content_words').update(row).eq('id', _cwEditId)); }
    else { ({ error } = await sb.from('content_words').upsert(row, { onConflict: 'ru,level' })); }
    if (error) throw error;
    toast('Kelime kaydedildi.');
    adminWordFormClear(); await adminCwReload(); loadDbWords();
  } catch (e) { uiAlert('Kaydedilemedi. content_words.sql çalıştırıldı mı?'); }
}
async function adminWordDelete(id) {
  const r = _cwRows.find(x => x.id === id); if (!r) return;
  if (!(await uiConfirm(`"${r.ru}" (${r.level}) sitede gizlensin mi? Buradan geri açabilirsin.`, 'Kelimeyi Gizle', { danger: true }))) return;
  try {
    await sb.from('content_words').update({ active: false }).eq('id', id);
    await adminCwReload();
    words = words.filter(x => !(x.ru === r.ru && (x.level || 'A1') === (r.level || 'A1')));
    wordsByRu = {}; words.forEach(w => { wordsByRu[w.ru] = w; });
  } catch (e) { uiAlert('İşlem başarısız.'); }
}
async function adminWordRestore(id) {
  try { await sb.from('content_words').update({ active: true }).eq('id', id); await adminCwReload(); loadDbWords(); }
  catch (e) { uiAlert('İşlem başarısız.'); }
}

/* ---- İçe aktarma: normalize + parçalı upsert ---- */
function _cwNormalize(o) {
  if (!o) return null;
  const ru = String(o.ru || o.RU || o.rusca || '').trim();
  const tr = String(o.tr || o.TR || o.turkce || o.anlam || '').trim();
  if (!ru || !tr) return null;
  const lvl = String(o.level || o.seviye || 'A1').toUpperCase();
  return { ru, tr,
    p: (o.p || o.okunus || '') ? String(o.p || o.okunus).trim() : null,
    cat: String(o.cat || o.tur || 'isim').toLowerCase(),
    level: ['A1','A2','B1','B2','C1'].includes(lvl) ? lvl : 'A1',
    ornek: (o.ornek || '') ? String(o.ornek).trim() : null,
    ornek_tr: (o.ornekTr || o.ornek_tr || '') ? String(o.ornekTr || o.ornek_tr).trim() : null,
    cinsiyet: (o.cinsiyet || '') ? String(o.cinsiyet).trim() : null,
    padej: (o.padej || '') ? String(o.padej).trim() : null,
    premium: o.premium === true || o.premium === 'true' || o.premium === 1,
    active: true };
}
async function _cwUpsertAll(rows) {
  // Aynı (ru, seviye) ikilisi birden fazla kez varsa tek kayda indir (yoksa DB hata verir)
  const uniq = {};
  rows.forEach(r => { uniq[r.ru + '|' + (r.level || 'A1')] = r; });
  rows = Object.values(uniq);
  let done = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const { error } = await sb.from('content_words').upsert(chunk, { onConflict: 'ru,level' });
    if (error) throw error;
    done += chunk.length;
  }
  return done;
}
async function adminWordsImportJson() {
  const ta = document.getElementById('cw-json'); if (!ta) return;
  let arr;
  try { arr = JSON.parse(ta.value.trim()); } catch (e) { uiAlert('Geçersiz JSON. Bir dizi bekleniyor: [{"ru":"...","tr":"...","level":"A1"}, ...]'); return; }
  if (!Array.isArray(arr)) { uiAlert('JSON bir dizi (liste) olmalı.'); return; }
  await _cwImportArray(arr, 'JSON kutusu');
  ta.value = '';
}
async function _cwImportArray(arr, kaynak) {
  const rows = arr.map(_cwNormalize).filter(Boolean);
  if (!rows.length) { uiAlert('Geçerli satır bulunamadı. Her satırda en az "ru" ve "tr" olmalı.'); return; }
  try {
    const n = await _cwUpsertAll(rows);
    await uiAlert(n + ' kelime içe aktarıldı (' + kaynak + ').' + (arr.length - rows.length > 0 ? ' ' + (arr.length - rows.length) + ' geçersiz satır atlandı.' : ''), 'İçe Aktarma');
    await adminCwReload(); loadDbWords();
  } catch (e) { uiAlert('İçe aktarılamadı: ' + ((e && e.message) || e)); }
}
function _parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseLine = l => {
    const out = []; let cur = '', inQ = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (inQ) { if (ch === '"' && l[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
      else { if (ch === '"') inQ = true; else if (ch === ',' || ch === ';') { out.push(cur); cur = ''; } else cur += ch; }
    }
    out.push(cur); return out;
  };
  const head = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => { const v = parseLine(l); const o = {}; head.forEach((h, i) => o[h] = (v[i] || '').trim()); return o; });
}
async function adminWordsImportFile() {
  const inp = document.getElementById('cw-file');
  if (!inp || !inp.files || !inp.files[0]) { uiAlert('Önce bir dosya seç (.json, .csv veya .xlsx).'); return; }
  const f = inp.files[0];
  const name = f.name.toLowerCase();
  try {
    let arr = [];
    if (name.endsWith('.json')) {
      arr = JSON.parse(await f.text());
    } else if (name.endsWith('.csv')) {
      arr = _parseCsv(await f.text());
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') { uiAlert('Excel kütüphanesi yüklenemedi; sayfayı yenileyip tekrar dene.'); return; }
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      arr = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    } else { uiAlert('Desteklenen türler: .json, .csv, .xlsx'); return; }
    if (!Array.isArray(arr)) { uiAlert('Dosya bir liste içermiyor.'); return; }
    await _cwImportArray(arr, f.name);
    inp.value = '';
  } catch (e) { uiAlert('Dosya okunamadı: biçimi kontrol et. (CSV başlıkları: ru,tr,p,cat,level,ornek,ornekTr)'); }
}
async function adminMigrateWords() {
  if (!(await uiConfirm('Sitedeki JSON kelimelerinin TAMAMI (' + words.length + ' kelime) veritabanına aktarılsın mı? Böylece hepsi panelden düzenlenebilir olur. (Tekrar çalıştırmak güvenlidir; var olanların üzerine yazar.)', "JSON'dan DB'ye Aktar"))) return;
  try {
    const rows = words.map(w => _cwNormalize(w)).filter(Boolean);
    const n = await _cwUpsertAll(rows);
    await uiAlert(n + ' kelime veritabanına aktarıldı. Artık hepsi listede ve düzenlenebilir.', 'Göç Tamam');
    await adminCwReload();
  } catch (e) { uiAlert('Göç başarısız: ' + ((e && e.message) || e) + ' — content_words.sql çalıştırıldığından emin ol.'); }
}

/* Bildirim yükleme/polling garantisi (auth app.js'ten önce yüklendiği için buradan başlatılır) */
function startNotifPolling() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  loadNotifications();
  if (notifPollId) clearInterval(notifPollId);
  notifPollId = setInterval(function () { if (typeof currentUser !== 'undefined' && currentUser) loadNotifications(); }, 30000);
}
if (typeof window !== 'undefined') window.startNotifPolling = startNotifPolling;
setTimeout(function () { try { startNotifPolling(); } catch (e) {} }, 2000);

/* ============================================================
   YÖNETİCİ — kullanıcı işlemleri (bildirim, şifre maili, e-posta)
   ============================================================ */
async function adminUserNotify(userId, name) {
  const t = await uiPrompt('Bildirim başlığı:', { title: (name || 'Kullanıcı') + ' — Bildirim' });
  if (!t) return;
  const b = await uiPrompt('Mesaj (opsiyonel):', { title: 'Bildirim mesajı' });
  try {
    await sb.from('notifications').insert({ user_id: userId, title: t, body: b || null, type: 'admin' });
    toast('Bildirim gönderildi.');
  } catch (e) { uiAlert('Gönderilemedi.'); }
}
async function adminUserResetPw(email) {
  if (!email) { uiAlert('Kullanıcının e-postası yok.'); return; }
  if (!(await uiConfirm(email + ' adresine şifre sıfırlama bağlantısı gönderilsin mi?', 'Şifre Sıfırlama'))) return;
  const tk = (typeof captchaPrompt === 'function') ? await captchaPrompt() : null;
  if (typeof TURNSTILE_SITE_KEY !== 'undefined' && TURNSTILE_SITE_KEY && !tk) { toast('Doğrulama tamamlanmadı.'); return; }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, Object.assign({ redirectTo: location.origin + location.pathname }, tk ? { captchaToken: tk } : {}));
    if (error) throw error;
    toast('Sıfırlama maili gönderildi: ' + email);
  } catch (e) { uiAlert('Gönderilemedi. (Kısa sürede çok istek atıldıysa biraz bekle.)'); }
}
async function adminUserChangeEmail(userId, oldEmail) {
  const yeni = await uiPrompt('Yeni e-posta adresi:', { title: 'E-posta Değiştir', placeholder: oldEmail });
  if (!yeni || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(yeni)) { if (yeni !== null) uiAlert('Geçerli bir e-posta gir.'); return; }
  try {
    const { data, error } = await sb.functions.invoke('admin-user', { body: { action: 'change_email', user_id: userId, email: yeni } });
    if (error || (data && data.error)) throw new Error((data && data.error) || 'hata');
    toast('E-posta güncellendi: ' + yeni);
    if (typeof loadAdminUsers === 'function') loadAdminUsers();
  } catch (e) { uiAlert('Değiştirilemedi. Bunun için "admin-user" Edge Function kurulmalı (KURULUM notunda).'); }
}

/* ============================================================
   YÖNETİCİ — YEDEKLEME (tüm tabloları JSON indir)
   ============================================================ */
const BACKUP_TABLES = ['profiles','saved_words','test_results','notifications','support_tickets','ticket_messages','inbox_mail','outbox_mail','placement_questions','placement_results','content_words','error_log','page_views'];
async function adminBackupAll() {
  const st = document.getElementById('backup-status');
  const out = { exportedAt: new Date().toISOString(), tables: {} };
  for (const t of BACKUP_TABLES) {
    if (st) st.textContent = 'Alınıyor: ' + t + '...';
    try {
      const { data } = await sb.from(t).select('*').limit(10000);
      out.tables[t] = data || [];
    } catch (e) { out.tables[t] = { error: 'okunamadı' }; }
  }
  if (st) st.textContent = 'Dosya hazırlanıyor...';
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ydt-yedek-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  if (st) st.textContent = 'Yedek indirildi ✓ (' + BACKUP_TABLES.length + ' tablo)';
}
async function adminBackupTable(t) {
  try {
    const { data } = await sb.from(t).select('*').limit(10000);
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ydt-' + t + '-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  } catch (e) { uiAlert(t + ' indirilemedi.'); }
}
function renderBackupView() {
  const box = document.getElementById('backup-tables'); if (!box) return;
  box.innerHTML = BACKUP_TABLES.map(t => `<button class="mail-act" onclick="adminBackupTable('${t}')">⬇️ ${t}</button>`).join('');
}

/* ============================================================
   SİTE AYARLARI — duyuru bandı (site_settings)
   ============================================================ */
async function loadSiteSettings() {
  try {
    const { data } = await sb.from('site_settings').select('*');
    const map = {}; (data || []).forEach(r => map[r.key] = r.value);
    const txt = (map['announcement'] || '').trim();
    let b = document.getElementById('site-announce');
    if (txt) {
      if (!b) {
        b = document.createElement('div'); b.id = 'site-announce'; b.className = 'site-announce';
        document.body.insertBefore(b, document.body.firstChild);
      }
      b.innerHTML = '📢 ' + _escHtml(txt);
    } else if (b) b.remove();
    if ((map['maintenance'] || '') === '1') {
      setTimeout(function () {
        if (!(typeof currentProfile !== 'undefined' && currentProfile && currentProfile.is_admin)) _maintOverlay();
      }, 2600);
    } else { const mo = document.getElementById('maint-overlay'); if (mo) mo.remove(); }
    return map;
  } catch (e) { return {}; }
}
async function adminSettingsInit() {
  const map = await loadSiteSettings();
  const inp = document.getElementById('set-announce'); if (inp) inp.value = map['announcement'] || '';
  const mc = document.getElementById('set-maint'); if (mc) mc.checked = (map['maintenance'] || '') === '1';
}
async function adminSaveAnnouncement() {
  const inp = document.getElementById('set-announce'); if (!inp) return;
  try {
    await sb.from('site_settings').upsert({ key: 'announcement', value: (inp.value || '').trim() }, { onConflict: 'key' });
    toast('Duyuru kaydedildi.');
    loadSiteSettings();
  } catch (e) { uiAlert('Kaydedilemedi. site_settings.sql çalıştırıldı mı?'); }
}
setTimeout(function () { try { if (typeof sb !== 'undefined' && sb) loadSiteSettings(); } catch (e) {} }, 1800);

/* ---- Ticket: şablonlar + destek@ üzerinden mail ---- */
let _tkUserEmail = '';
const TICKET_TEMPLATES = [
  { t: '🛠️ İnceleniyor', body: 'Merhaba,\n\nTalebiniz bize ulaştı ve inceleniyor. En kısa sürede dönüş yapacağız. Sabrınız için teşekkürler.' },
  { t: '🔑 Şifre sıfırlama yönlendirmesi', body: 'Merhaba,\n\nŞifrenizi sıfırlamak için giriş penceresindeki "Şifremi unuttum" bağlantısını kullanabilirsiniz. E-postanıza gelen bağlantıyla yeni şifre belirleyebilirsiniz. Mail gelmezse spam klasörünü kontrol edin.' },
  { t: '📧 Doğrulama maili', body: 'Merhaba,\n\nHesabınızın e-posta doğrulaması eksik görünüyor. Sitede üst kısımdaki sarı banttan "Doğrulama mailini tekrar gönder" butonunu kullanabilirsiniz. Mail birkaç dakika içinde gelmezse spam klasörünü kontrol edin.' },
  { t: '✅ Çözüldü', body: 'Merhaba,\n\nBildirdiğiniz sorun çözüldü. Kontrol edip sorun devam ederse bu talep üzerinden tekrar yazabilirsiniz. İyi çalışmalar!' },
  { t: '🙏 Teşekkür / kapanış', body: 'Merhaba,\n\nGeri bildiriminiz için teşekkür ederiz. Başka bir konuda yardımcı olabileceksek her zaman yazabilirsiniz.' }
];
function tkTpl(idx) {
  if (idx === '') return;
  const t = TICKET_TEMPLATES[parseInt(idx, 10)]; if (!t) return;
  const ta = document.getElementById('adm-reply'); if (!ta) return;
  ta.value = ta.value ? (ta.value + '\n\n' + t.body) : t.body;
  ta.focus();
}
async function adminTicketMail(ticketId) {
  if (!_tkUserEmail) { uiAlert('Kullanıcının e-posta adresi bulunamadı.'); return; }
  const ta = document.getElementById('adm-reply');
  const body = (ta && ta.value || '').trim();
  if (!body) { uiAlert('Önce yukarıdaki kutuya mesajını yaz (istersen şablon kullan), sonra bu butona bas.'); return; }
  if (!(await uiConfirm('Bu mesaj ' + _tkUserEmail + ' adresine destek@ydt-ydsrusca.com üzerinden e-posta olarak gönderilsin mi?', 'Mail Gönder'))) return;
  try {
    const { data, error } = await sb.functions.invoke('send-mail', { body: {
      to: _tkUserEmail,
      subject: 'Destek talebiniz hakkında',
      body: body,
      from: 'destek@ydt-ydsrusca.com'
    } });
    if (error || (data && data.error)) throw new Error((data && data.error) || 'hata');
    toast('Mail gönderildi: ' + _tkUserEmail);
    if (ta) ta.value = '';
  } catch (e) { uiAlert('Mail gönderilemedi. (send-mail + Resend kurulumunu kontrol et.)'); }
}

/* ---- Kelime formu: türe göre gramer seçenekleri ---- */
const CW_GRAM_OPTS = {
  'isim': [['', 'Cinsiyet seç...'], ['м', 'м — eril'], ['ж', 'ж — dişil'], ['с', 'с — nötr']],
  'fiil': [['', 'Görünüş seç...'], ['нсв', 'НСВ — bitmemiş (HCB)'], ['св', 'СВ — bitmiş (CB)']]
};
const CW_PADEJ = ['Р.п.', 'Д.п.', 'В.п.', 'Т.п.', 'П.п.']; // sitedeki etiket biçimi (örn: "П.п. / В.п.")
function cwCatChanged(setVal) {
  const cat = _cwVal('cw-cat');
  const sel = document.getElementById('cw-gram');
  const pd = document.getElementById('cw-padej');
  if (pd) pd.style.display = 'none';
  if (!sel) return;
  if (cat === 'edat') {
    sel.innerHTML = ''; sel.style.display = 'none';
    if (pd) {
      pd.style.display = 'flex';
      const cur = (setVal || '').split('/').map(x => x.trim());
      pd.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = cur.indexOf(cb.value) >= 0; });
    }
    return;
  }
  const opts = CW_GRAM_OPTS[cat];
  if (!opts) { sel.innerHTML = ''; sel.style.display = 'none'; return; }
  sel.style.display = '';
  sel.innerHTML = opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');
  if (setVal) sel.value = setVal;
}
function cwPadejValue() {
  const pd = document.getElementById('cw-padej'); if (!pd || pd.style.display === 'none') return null;
  const v = [...pd.querySelectorAll('input:checked')].map(c => c.value);
  return v.length ? v.join(' / ') : null;
}

/* ============================================================
   YÖNETİCİ — Paragraf Soruları yönetimi
   ============================================================ */
let _cpqRows = [];
async function adminPquestInit() { await adminPqReload(); }
async function adminPqReload() {
  try { const { data } = await sb.from('content_pquestions').select('*').order('created_at', { ascending: false }).limit(2000); _cpqRows = data || []; }
  catch (e) { _cpqRows = []; }
  const st = document.getElementById('cpq-stats');
  if (st) {
    const act = _cpqRows.filter(r => r.active !== false);
    const c = { A1:0, A2:0, B1:0, B2:0, C1:0 };
    act.forEach(r => { if (c[r.level] !== undefined) c[r.level]++; });
    st.innerHTML = `DB'de <b>${act.length}</b> aktif soru (${Object.keys(c).map(k => k + ': ' + c[k]).join(' · ')}) · gizli: ${_cpqRows.length - act.length}`;
  }
  renderCpqList();
}
function renderCpqList() {
  const box = document.getElementById('cpq-list'); if (!box) return;
  if (!_cpqRows.length) { box.innerHTML = '<div class="profile-empty">DB\'de soru yok. "JSON Dosyasındaki Soruları DB\'ye Aktar" ile başlayabilirsin.</div>'; return; }
  box.innerHTML = _cpqRows.map(r => `
    <div class="cw-row ${r.active === false ? 'off' : ''}">
      <div class="cw-main"><b>${_escHtml((r.soru || '').slice(0, 70))}</b> <span class="kv-lvl">${r.level || ''}</span> <span class="cw-cat">${_escHtml(r.konu || '')}</span>${r.active === false ? ' <span class="mail-member no">Gizli</span>' : ''}
        <div class="err-meta">${_escHtml((r.paragraf || '').slice(0, 90))}...</div></div>
      <div class="cw-acts">
        <button class="mail-act" onclick="adminPqEdit('${r.id}')">✏️</button>
        ${r.active === false
          ? `<button class="mail-act" onclick="adminPqRestore('${r.id}')">↩️</button>`
          : `<button class="mail-act red" onclick="adminPqHide('${r.id}')">🗑️</button>`}
      </div>
    </div>`).join('');
}
function adminPqFormClear() {
  ['cpq-id','cpq-konu','cpq-para','cpq-soru','cpq-o0','cpq-o1','cpq-o2','cpq-o3','cpq-acik'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const c = document.querySelector('input[name="cpq-correct"]:checked'); if (c) c.checked = false;
  const btn = document.getElementById('cpq-save-btn'); if (btn) btn.textContent = 'Soru Ekle';
}
function adminPqEdit(id) {
  const r = _cpqRows.find(x => x.id === id); if (!r) return;
  document.getElementById('cpq-id').value = r.id;
  document.getElementById('cpq-lvl').value = r.level || 'B1';
  document.getElementById('cpq-konu').value = r.konu || '';
  document.getElementById('cpq-para').value = r.paragraf || '';
  document.getElementById('cpq-soru').value = r.soru || '';
  const sk = Array.isArray(r.siklar) ? r.siklar : [];
  ['cpq-o0','cpq-o1','cpq-o2','cpq-o3'].forEach((eid, i) => { document.getElementById(eid).value = sk[i] || ''; });
  const radio = document.querySelector(`input[name="cpq-correct"][value="${r.dogru}"]`); if (radio) radio.checked = true;
  document.getElementById('cpq-acik').value = r.aciklama || '';
  const btn = document.getElementById('cpq-save-btn'); if (btn) btn.textContent = 'Değişiklikleri Kaydet';
  document.getElementById('cpq-para').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function adminPqSave() {
  const para = _cwVal('cpq-para'), soru = _cwVal('cpq-soru');
  const opts = ['cpq-o0','cpq-o1','cpq-o2','cpq-o3'].map(_cwVal);
  const cEl = document.querySelector('input[name="cpq-correct"]:checked');
  if (!para || !soru || opts.some(o => !o)) { uiAlert('Paragraf, soru ve 4 şık zorunlu.'); return; }
  if (!cEl) { uiAlert('Doğru şıkkı seç.'); return; }
  const row = { level: _cwVal('cpq-lvl'), konu: _cwVal('cpq-konu') || null, paragraf: para, soru: soru,
    siklar: opts, dogru: parseInt(cEl.value, 10), aciklama: _cwVal('cpq-acik') || null, active: true };
  const id = _cwVal('cpq-id');
  try {
    if (id) { const { error } = await sb.from('content_pquestions').update(row).eq('id', id); if (error) throw error; }
    else { const { error } = await sb.from('content_pquestions').insert(row); if (error) throw error; }
    toast('Soru kaydedildi.'); adminPqFormClear(); adminPqReload();
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e) + ' — content_pquestions.sql çalıştı mı?'); }
}
async function adminPqHide(id) {
  try { await sb.from('content_pquestions').update({ active: false }).eq('id', id); adminPqReload(); } catch (e) {}
}
async function adminPqRestore(id) {
  try { await sb.from('content_pquestions').update({ active: true }).eq('id', id); adminPqReload(); } catch (e) {}
}
async function adminPqImportJson() {
  const ta = document.getElementById('cpq-json'); if (!ta) return;
  let arr; try { arr = JSON.parse(ta.value.trim()); } catch (e) { uiAlert('Geçersiz JSON.'); return; }
  if (!Array.isArray(arr)) { uiAlert('JSON bir liste olmalı.'); return; }
  const rows = arr.map(o => {
    if (!o || !o.paragraf || !o.soru || !Array.isArray(o.siklar) || o.siklar.length !== 4) return null;
    const d = parseInt(o.dogru, 10); if (isNaN(d) || d < 0 || d > 3) return null;
    return { level: o.level || 'B1', konu: o.konu || null, paragraf: String(o.paragraf), soru: String(o.soru),
      siklar: o.siklar.map(String), dogru: d, aciklama: o.aciklama || null, active: true };
  }).filter(Boolean);
  if (!rows.length) { uiAlert('Geçerli soru yok (paragraf, soru, 4 siklar, dogru 0-3 zorunlu).'); return; }
  try {
    const { error } = await sb.from('content_pquestions').insert(rows);
    if (error) throw error;
    await uiAlert(rows.length + ' soru eklendi.', 'İçe Aktarma'); ta.value = ''; adminPqReload();
  } catch (e) { uiAlert('Eklenemedi: ' + ((e && e.message) || e)); }
}
async function adminPqMigrate() {
  if (_cpqRows.length && !(await uiConfirm('DB\'de zaten ' + _cpqRows.length + ' soru var. JSON dosyasındakiler YİNE DE eklensin mi? (Kopya oluşabilir.)', 'Göç'))) return;
  const src = (typeof paragraphQuestions !== 'undefined' && paragraphQuestions) ? paragraphQuestions : [];
  if (!src.length) { uiAlert('JSON kaynağında soru bulunamadı.'); return; }
  const rows = src.map(o => ({ level: o.level || 'B1', konu: o.konu || null, paragraf: o.paragraf, soru: o.soru,
    siklar: o.siklar, dogru: o.dogru, aciklama: o.aciklama || null, active: true }));
  try {
    const { error } = await sb.from('content_pquestions').insert(rows);
    if (error) throw error;
    await uiAlert(rows.length + ' soru DB\'ye aktarıldı. Artık panelden yönetilir; istersen data/sorular dosyasını silebilirsin.', 'Göç Tamam');
    adminPqReload();
  } catch (e) { uiAlert('Göç başarısız: ' + ((e && e.message) || e)); }
}

/* ---- Bakım modu ---- */
async function adminSaveMaintenance() {
  const cb = document.getElementById('set-maint'); if (!cb) return;
  try {
    await sb.from('site_settings').upsert({ key: 'maintenance', value: cb.checked ? '1' : '' }, { onConflict: 'key' });
    toast(cb.checked ? 'Bakım modu AÇILDI (ziyaretçiler bakım ekranı görecek).' : 'Bakım modu kapatıldı.');
  } catch (e) { uiAlert('Kaydedilemedi.'); }
}
function _maintOverlay() {
  if (document.getElementById('maint-overlay')) return;
  const d = document.createElement('div');
  d.id = 'maint-overlay';
  d.innerHTML = '<div class="maint-box"><div style="font-size:3rem;">🚧</div><h2>Bakımdayız</h2><p>Sitemiz kısa süreliğine bakımda. Birazdan tekrar buradayız — anlayışınız için teşekkürler!</p><div class="maint-brand">YDT-YDS Rusça</div></div>';
  document.body.appendChild(d);
}

/* ============================================================
   YÖNETİCİ — VİDEO YÖNETİMİ
   ============================================================ */
let _cvRows = [];
async function adminVideosInit() { await adminCvReload(); }
async function adminCvReload() {
  try { const { data } = await sb.from('content_videos').select('*').order('num').limit(1000); _cvRows = data || []; }
  catch (e) { _cvRows = []; }
  const st = document.getElementById('cv-stats');
  if (st) {
    const act = _cvRows.filter(r => r.active !== false);
    st.innerHTML = `Toplam <b>${act.length}</b> video · 👑 Premium: <b>${act.filter(r => r.premium).length}</b> · 🆓 Ücretsiz: <b>${act.filter(r => !r.premium).length}</b> · gizli: ${_cvRows.length - act.length}`;
  }
  renderCvList();
}
function renderCvList() {
  const box = document.getElementById('cv-list'); if (!box) return;
  if (!_cvRows.length) { box.innerHTML = '<div class="profile-empty">DB\'de video yok. (tum_veriler_db.sql çalıştırıldı mı?)</div>'; return; }
  box.innerHTML = _cvRows.map(r => `
    <div class="cw-row ${r.active === false ? 'off' : ''}">
      <div class="cv-thumbbox">${r.thumb ? `<img src="${_escAttr(r.thumb)}" alt="">` : '🎬'}</div>
      <div class="cw-main" style="flex:1;"><b>#${r.num || '-'} ${_escHtml(r.title)}</b> <span class="kv-lvl">${r.level || ''}</span>
        ${r.premium ? '<span class="mail-member yes">👑 Premium</span>' : '<span class="mail-member">🆓 Ücretsiz</span>'}
        <span class="cw-cat">${r.source === 'stream' ? 'CF Stream' : 'YouTube'}</span>
        ${!r.video_id ? '<span class="mail-member no">ID eksik</span>' : ''}
        ${r.active === false ? '<span class="mail-member no">Gizli</span>' : ''}
        <div class="err-meta">${_escHtml(r.descr || '')}</div></div>
      <div class="cw-acts">
        <button class="mail-act" onclick="adminVidEdit('${r.id}')">✏️</button>
        <button class="mail-act" onclick="adminVidTogglePremium('${r.id}', ${r.premium ? 'false' : 'true'})">${r.premium ? '🆓 Ücretsiz yap' : '👑 Premium yap'}</button>
        ${r.active === false
          ? `<button class="mail-act" onclick="adminVidRestore('${r.id}')">↩️</button>`
          : `<button class="mail-act red" onclick="adminVidHide('${r.id}')">🗑️</button>`}
      </div>
    </div>`).join('');
}
function adminVidFormClear() {
  ['cv-id','cv-num','cv-title','cv-desc','cv-vid','cv-thumb'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pr = document.getElementById('cv-premium'); if (pr) pr.checked = false;
  const btn = document.getElementById('cv-save-btn'); if (btn) btn.textContent = 'Video Ekle';
}
function adminVidEdit(id) {
  const r = _cvRows.find(x => x.id === id); if (!r) return;
  document.getElementById('cv-id').value = r.id;
  document.getElementById('cv-num').value = r.num || '';
  document.getElementById('cv-lvl').value = r.level || 'A1';
  document.getElementById('cv-title').value = r.title || '';
  document.getElementById('cv-desc').value = r.descr || '';
  document.getElementById('cv-source').value = r.source || 'youtube';
  document.getElementById('cv-vid').value = r.video_id || '';
  document.getElementById('cv-thumb').value = r.thumb || '';
  document.getElementById('cv-premium').checked = !!r.premium;
  const btn = document.getElementById('cv-save-btn'); if (btn) btn.textContent = 'Değişiklikleri Kaydet';
  document.getElementById('cv-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function adminVidSave() {
  const title = _cwVal('cv-title'); if (!title) { uiAlert('Video başlığı zorunlu.'); return; }
  const row = { num: parseInt(_cwVal('cv-num'), 10) || null, level: _cwVal('cv-lvl'), title,
    descr: _cwVal('cv-desc') || null, source: _cwVal('cv-source'), video_id: _cwVal('cv-vid') || null,
    thumb: _cwVal('cv-thumb') || null, premium: document.getElementById('cv-premium').checked, active: true };
  const id = _cwVal('cv-id');
  try {
    let error;
    if (id) ({ error } = await sb.from('content_videos').update(row).eq('id', id));
    else ({ error } = await sb.from('content_videos').insert(row));
    if (error) throw error;
    toast('Video kaydedildi.'); adminVidFormClear(); adminCvReload();
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
}
async function adminVidTogglePremium(id, on) {
  try { await sb.from('content_videos').update({ premium: on }).eq('id', id); adminCvReload(); } catch (e) {}
}
async function adminVidHide(id) { try { await sb.from('content_videos').update({ active: false }).eq('id', id); adminCvReload(); } catch (e) {} }
async function adminVidRestore(id) { try { await sb.from('content_videos').update({ active: true }).eq('id', id); adminCvReload(); } catch (e) {} }
