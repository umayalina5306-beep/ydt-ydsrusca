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
      <div class="word-ru">${w.ru}</div>
      ${genderHTML}
      ${tipHTML}
      ${padejHTML}
      <div class="word-tr">${w.tr}</div>
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
  } catch (e) { console.error('Kayıtlı kelimeler yüklenemedi:', e); }
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
    console.error('Kelime kaydedilemedi:', e);
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
    // Tıklanan butonu anında güncelle (normal sayfada da yeşil olsun)
    if (btn) btn.classList.toggle('active', yeni === 'learned');
    // Bankadaysak listeyi tazele (kayıtlı/öğrenilmiş sekmeleri arası taşıma)
    const bank = document.getElementById('words-bank');
    if (bank && bank.style.display === 'block') renderBank();
  } catch (e) { console.error('Öğrenildi işaretlenemedi:', e); toast('İşlem başarısız oldu. Lütfen tekrar dene.'); }
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
  audio.play().catch(e => console.log('Ses çalınamadı:', e));
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
  if (ok) qScore++; else qWrong++;
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
  if (ok) qScore++; else qWrong++;
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

function finishQuizNow(){
  const blanks = qList.reduce((n,_,i)=> n + ((qAnswers[i] && qAnswers[i].answered) ? 0 : 1), 0);
  if (blanks > 0 && !confirm(blanks + ' soru boş kaldı. Testi bitirmek istiyor musun?')) return;
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
  if(id==='profile' && typeof openProfile==='function') openProfile();
}

// AUTH
function openAuth(tab){
  document.getElementById('auth-modal').classList.add('active');
  switchTab(tab);
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
  const [a1a2,b1,b2,c1,syn,ant,fam,vids] = await Promise.all([
    j('data/kelimeler/a1-a2.json'),
    j('data/kelimeler/b1.json'),
    j('data/kelimeler/b2.json'),
    j('data/kelimeler/c1.json'),
    j('data/es-anlamlilar/es-anlamlilar.json'),
    j('data/zit-anlamlilar/zit-anlamlilar.json'),
    j('data/akraba-kelimeler/akraba-kelimeler.json'),
    j('data/videolar/videolar.json'),
  ]);
  words = [].concat(a1a2,b1,b2,c1);
  wordsByRu = {};
  words.forEach(w => { wordsByRu[w.ru] = w; });
  synonymGroups = syn; antonymPairs = ant; wordFamilies = fam; videos = vids;
  // Paragraf soruları (dosya yoksa site yine çalışsın diye ayrı try/catch)
  try { paragraphQuestions = await j('data/sorular/paragraf-sorulari.json'); }
  catch (e) { console.warn('Paragraf soruları yüklenemedi:', e); paragraphQuestions = []; }
}
async function init(){
  try { await loadData(); renderVideos(); }
  catch(e){ console.error('Veri yükleme hatası:', e); toast('İçerik yüklenemedi. Sayfayı yenileyin.'); }
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

function openTestBuilder() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-testbuilder'); if (pg) pg.classList.add('active');
  tbUpdatePool();
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
  tbUpdatePool();
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

function tbUpdatePool() {
  const el = document.getElementById('tb-pool-info'); if (!el) return;
  if (tb.source !== 'all' && (typeof currentUser === 'undefined' || !currentUser)) {
    el.innerHTML = '<span class="tb-warn">⚠️ Bu kaynak için giriş yapmalısın.</span>'; return;
  }
  const n = tbPool().length;
  el.innerHTML = `Bu kapsamda <strong>${n}</strong> kelime var.` + (n < 4 ? ' <span class="tb-warn">Test için en az 4 kelime gerekli.</span>' : '');
}

function tbStart() {
  const pool = tbPool();
  if (pool.length < 4) { toast('Bu kapsamda yeterli kelime yok (en az 4).'); return; }
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

function tbSave() {
  const name = prompt('Teste bir isim ver:', tbDefaultName());
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
  const list = getTestResults();
  list.unshift({
    id: 'r' + Date.now(), date: new Date().toISOString(),
    type: quizSettings.type, name: quizTypeLabel(quizSettings.type),
    score: qScore, total: qList.length,
    items: (qReviewItems && qReviewItems.length ? qReviewItems : qAnswers).map(a => ({ n:a.n, st:a.st||(a.ok?'ok':'wrong'), ok:a.ok, your:a.your, correct:a.correct, ru:a.ru, tr:a.tr }))
  });
  setTestResults(list);
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
function clearTestHistory() { if (confirm('Tüm test geçmişi silinsin mi?')) { setTestResults([]); renderTestHistory(); } }
