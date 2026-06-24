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
let paragraphQuestions = [];
let quizSettings = { type:'ru-tr', cat:'hepsi', count:20, level:'hepsi' };

function selectSetup(key, val, btn) {
  quizSettings[key] = val;
  btn.closest('.setup-options').querySelectorAll('.setup-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function showSetup() {
  document.getElementById('quiz-setup').style.display = 'block';
  document.getElementById('quiz-playing').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'none';
}

function shuffle(a){return[...a].sort(()=>Math.random()-0.5);}

function startQuiz(){
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

function loadQ(){
  qAnswered = false;
  const q = qList[qIdx];
  const type = quizSettings.type;

  document.getElementById('quiz-fill').style.width = (qIdx/qList.length*100)+'%';
  document.getElementById('quiz-num').textContent = `Soru ${qIdx+1} / ${qList.length}`;
  document.getElementById('quiz-fb').textContent = '';
  document.getElementById('quiz-fb').className = 'quiz-feedback';
  document.getElementById('quiz-next').style.display = 'none';

  // Tip etiketi
  const typeLabels = {'ru-tr':'🇷🇺 → 🇹🇷 Rusça → Türkçe','tr-ru':'🇹🇷 → 🇷🇺 Türkçe → Rusça','fill':'✍️ Yaz Bakalım','tf':'✓✗ Doğru / Yanlış','paragraf':'📖 Paragraf Soruları'};
  document.getElementById('quiz-type-badge').textContent = typeLabels[type];

  if (type === 'ru-tr') {
    // Rusça kelimeyi gör → Türkçe seç
    document.getElementById('quiz-q').innerHTML = `<span style="font-family:'Noto Sans',sans-serif;">${q.ru}</span>`;
    document.getElementById('quiz-pron').textContent = `[${q.p}]`;
    const wrong = shuffle(words.filter(w=>w.ru!==q.ru)).slice(0,3).map(w=>w.tr);
    const opts = shuffle([q.tr, ...wrong]);
    renderOpts(opts, q.tr, q.ru, 'tr');

  } else if (type === 'tr-ru') {
    // Türkçe kelimeyi gör → Rusça seç
    document.getElementById('quiz-q').textContent = q.tr;
    document.getElementById('quiz-pron').textContent = '';
    const wrong = shuffle(words.filter(w=>w.ru!==q.ru)).slice(0,3).map(w=>w.ru);
    const opts = shuffle([q.ru, ...wrong]);
    renderOpts(opts, q.ru, q.ru, 'ru');

  } else if (type === 'fill') {
    // Yaz Bakalım — kelimeyi klavyeyle yaz
    const subType = Math.random() > 0.5 ? 'ru-yaz' : 'tr-yaz';
    if (subType === 'ru-yaz') {
      // Türkçe göster → Rusça yaz
      document.getElementById('quiz-q').innerHTML = `<div style="font-size:1.1rem;color:var(--gray);margin-bottom:8px;">Türkçesi:</div><div style="font-size:1.6rem;font-weight:700;">${q.tr}</div>`;
      document.getElementById('quiz-pron').textContent = '';
      renderWriteInput(q.ru, q.ru, 'ru');
    } else {
      // Rusça göster → Türkçe yaz
      document.getElementById('quiz-q').innerHTML = `<div style="font-size:1.1rem;color:var(--gray);margin-bottom:8px;">Rusçası:</div><div style="font-family:'Noto Sans',sans-serif;font-size:1.8rem;font-weight:700;">${q.ru}</div><div style="font-size:0.9rem;color:var(--gray);">[${q.p}]</div>`;
      document.getElementById('quiz-pron').textContent = '';
      renderWriteInput(q.tr, q.ru, 'tr');
    }

  } else if (type === 'tf') {
    // Doğru/Yanlış — Rusça kelime ve Türkçe anlam eşleşiyor mu?
    const isCorrect = Math.random() > 0.5;
    let shownTr = q.tr;
    if (!isCorrect) {
      const decoy = shuffle(words.filter(w=>w.ru!==q.ru))[0];
      shownTr = decoy.tr;
    }
    document.getElementById('quiz-q').innerHTML = `<span style="font-family:'Noto Sans',sans-serif;">${q.ru}</span><br><small style="font-size:1rem;color:var(--gray);">${shownTr}</small>`;
    document.getElementById('quiz-pron').textContent = `[${q.p}]`;
    const correctAns = isCorrect ? 'Doğru ✓' : 'Yanlış ✗';
    const opts = ['Doğru ✓', 'Yanlış ✗'];
    renderOpts(opts, correctAns, q.ru, 'tf');

  } else if (type === 'paragraf') {
    // Paragraf okuma sorusu: paragraf + soru + şıklar
    document.getElementById('quiz-q').innerHTML =
      `<div class="para-text">${q.paragraf}</div><div class="para-soru">${q.soru}</div>`;
    document.getElementById('quiz-pron').textContent = '';
    renderParaOpts(q.siklar, q.dogru, q.aciklama);
  }
}

function renderWriteInput(correct, ru, mode) {
  const isRu = mode === 'ru';
  const placeholder = isRu ? 'Rusça yaz...' : 'Türkçe yaz...';
  const fontStyle = isRu ? "font-family:'Noto Sans',sans-serif;" : '';
  document.getElementById('quiz-opts').innerHTML = `
    <div class="write-input-wrap">
      <input type="text" id="write-answer" class="write-answer-input" 
        placeholder="${placeholder}"
        style="${fontStyle}"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        onkeydown="if(event.key==='Enter') checkWrite('${correct.replace(/'/g,"\\'")}','${ru.replace(/'/g,"\\'")}')">
      <button class="write-submit-btn" onclick="checkWrite('${correct.replace(/'/g,"\\'")}','${ru.replace(/'/g,"\\'")}')">
        Kontrol Et →
      </button>
    </div>
  `;
  setTimeout(() => {
    const inp = document.getElementById('write-answer');
    if (inp) inp.focus();
  }, 100);
}

function checkWrite(correct, ru) {
  if (qAnswered) return;
  const inp = document.getElementById('write-answer');
  if (!inp) return;
  const given = inp.value.trim().toLowerCase();
  const expected = correct.trim().toLowerCase();

  // Esnek karşılaştırma - parantez içini dikkate alma
  const cleanExpected = expected.replace(/\s*\([^)]*\)/g, '').trim();
  const isCorrect = given === expected || given === cleanExpected ||
    cleanExpected.split('/').map(s=>s.trim()).includes(given);

  qAnswered = true;
  inp.disabled = true;
  document.querySelector('.write-submit-btn').disabled = true;

  const fb = document.getElementById('quiz-fb');
  if (isCorrect) {
    fb.innerHTML = '✓ Doğru!';
    fb.className = 'quiz-feedback feedback-correct';
    qScore++;
  } else {
    fb.innerHTML = `✗ Yanlış. Doğru cevap: <span style="font-weight:700;">${correct}</span>`;
    fb.className = 'quiz-feedback feedback-wrong';
    qWrong++;
  }
  speak(ru);
  document.getElementById('quiz-next').style.display = 'inline-block';
}

function renderOpts(opts, correct, ru, mode) {
  document.getElementById('quiz-opts').innerHTML = opts.map(o => {
    const safe = o.replace(/'/g,"\\'");
    const correctSafe = correct.replace(/'/g,"\\'");
    const ruSafe = ru.replace(/'/g,"\\'");
    const style = mode==='ru' ? "font-family:'Noto Sans',sans-serif;" : '';
    return `<button class="quiz-opt" style="${style}" onclick="checkA(this,'${safe}','${correctSafe}','${ruSafe}')">${o}</button>`;
  }).join('');
}

function checkA(btn, chosen, correct, ru){
  if(qAnswered) return;
  qAnswered = true;
  document.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
  const fb = document.getElementById('quiz-fb');
  if(chosen === correct){
    btn.classList.add('correct');
    fb.textContent = '✓ Doğru!';
    fb.className = 'quiz-feedback feedback-correct';
    qScore++;
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.quiz-opt').forEach(b => { if(b.textContent===correct) b.classList.add('correct'); });
    fb.innerHTML = `✗ Yanlış. Doğru: <span style="font-family:'Noto Sans',sans-serif;">${correct}</span>`;
    fb.className = 'quiz-feedback feedback-wrong';
    qWrong++;
  }
  speak(ru);
  document.getElementById('quiz-next').style.display = 'inline-block';
}

// Paragraf sorusu: şıkları göster ve kontrol et (açıklama ile)
function renderParaOpts(siklar, correctIdx, aciklama) {
  window._paraAciklama = aciklama || '';
  document.getElementById('quiz-opts').innerHTML = siklar.map((o, i) =>
    `<button class="quiz-opt" style="text-align:left;" onclick="checkParaA(this, ${i}, ${correctIdx})">${o}</button>`
  ).join('');
}

function checkParaA(btn, chosenIdx, correctIdx) {
  if (qAnswered) return;
  qAnswered = true;
  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach(b => b.disabled = true);
  const fb = document.getElementById('quiz-fb');
  const acik = window._paraAciklama ? `<div class="para-aciklama">${window._paraAciklama}</div>` : '';
  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.innerHTML = '✓ Doğru!' + acik;
    fb.className = 'quiz-feedback feedback-correct';
    qScore++;
  } else {
    btn.classList.add('wrong');
    if (opts[correctIdx]) opts[correctIdx].classList.add('correct');
    fb.innerHTML = '✗ Yanlış.' + acik;
    fb.className = 'quiz-feedback feedback-wrong';
    qWrong++;
  }
  document.getElementById('quiz-next').style.display = 'inline-block';
}

function nextQ(){
  qIdx++;
  if(qIdx >= qList.length) showResult();
  else loadQ();
}

function showResult(){
  document.getElementById('quiz-fill').style.width = '100%';
  document.getElementById('quiz-card').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'block';
  const pct = Math.round(qScore/qList.length*100);
  document.getElementById('res-score').textContent = `${qScore}/${qList.length}`;
  const msgs = [[0,40,'Daha çok çalış 💪','Pes etme, tekrar dene!'],[40,70,'Fena değil! 🙂','Biraz daha pratik yap.'],[70,90,'Çok iyi! 👏','Başarın artıyor!'],[90,101,'Mükemmel! 🏆','Harika bir sınav performansı!']];
  const [,,l,s] = msgs.find(([mn,mx]) => pct>=mn && pct<mx);
  document.getElementById('res-label').textContent = l;
  document.getElementById('res-sub').textContent = s;
  document.getElementById('res-stats').innerHTML = `
    <div class="result-stat"><div class="result-stat-num" style="color:#10b981;">${qScore}</div><div class="result-stat-label">Doğru</div></div>
    <div class="result-stat"><div class="result-stat-num" style="color:#ef4444;">${qWrong}</div><div class="result-stat-label">Yanlış</div></div>
    <div class="result-stat"><div class="result-stat-num">${pct}%</div><div class="result-stat-label">Başarı</div></div>
  `;
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
