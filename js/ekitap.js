/* ============================================================
   YDT-YDS Rusça · E-KİTAP (Faz 1)
   İçerik formatı → ayrıştırıcı → açık kitap okuyucu
   + etkinlikler (yazma/seçme/doğru-yanlış/serbest) + kelime paneli
   + yönetim: E-Kitap editörü (yapıştır → kontrol → önizle → yayınla)
   + Konu Yönetimi (tekli / toplu)
   ============================================================ */

/* ---------- Sabitler ---------- */
const EK_TIPLER = {
  'bosluk':'Boşluk doldurma','coktan':'Çoktan seçmeli','dogru-yanlis':'Doğru / yanlış','eslestir':'Eşleştirme',
  'cumle-sirala':'Cümleyi sırala','kelime-olustur':'Kelimeyi oluştur','cekim-tablosu':'Çekim tablosu','donustur':'Dönüştürme',
  'hata-bul':'Hata bulma','hata-duzelt':'Hatayı düzelt','cumle-tamamla':'Cümle tamamlama','serbest':'Serbest cevap',
  'cumle-kur':'Cümle kurma','ceviri':'Çeviri','yazma':'Yazma','dinle-sec':'Dinle ve seç','dikte':'Dinle ve yaz',
  'dinle-bosluk':'Dinle ve doldur','dinle-sirala':'Dinle ve sırala','telaffuz':'Telaffuz','kelime-ailesi':'Kelime ailesi',
  'baglam-anlam':'Bağlama göre anlam','es-zit':'Eş / zıt anlam','fazlaligi-bul':'Fazlalığı bul','kurali-kesfet':'Kuralı keşfet',
  'kurala-bagla':'Kurala bağla','istisna-bul':'İstisnayı bul','sema-tamamla':'Şema tamamlama','adim-adim':'Adım adım',
  'metin-analiz':'Metin analizi','okudugunu-anla':'Okuduğunu anlama','kanit-goster':'Kanıtı göster',
  'diyalog-tamamla':'Diyalog tamamlama','diyalog-sirala':'Diyalog sıralama','senaryo':'Senaryo','kontrol':'Kontrol noktası'
};
// Bu türler 2. aşamada etkileşimli olacak (şimdilik önizleme olarak gösterilir)
const EK_FAZ2 = new Set(['eslestir','cumle-sirala','kelime-olustur','dinle-sirala','diyalog-sirala','kelime-ailesi',
  'kurala-bagla','hata-bul','hata-duzelt','metin-analiz','adim-adim','telaffuz']);
const EK_KUTULAR = {
  'altın':'Altın kural','dikkat':'Dikkat','istisna':'İstisna','ipucu':'İpucu','bilgi':'Bilgi',
  'sonraki':'Bir sonraki derste','bu-derste':'Bu derste'
};
const EK_BLOKLAR = new Set(['kutular','kelimeler','örnek','etkinlik','kartlar'].concat(Object.keys(EK_KUTULAR)));
const EK_BASLIK_ALANLARI = ['yönerge','konu','kural','zorluk','ses','kontrol-et','ilişki','örnekler','durum','görev','kontrol-listesi','ipucu'];
const EK_MADDE_ALANLARI = ['neden','ipucu','kural','ses','örnek-cevap','kanıt','parçalar','kelimeler','adım'];
const EK_CINS = { 'м':'m', 'ж':'f', 'с':'n', 'мн':'p' };

/* Minimal çizgi ikonlar */
const EK_IC = {
  'altın':'<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  'dikkat':'<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r=".6"/></svg>',
  'istisna':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><circle cx="12" cy="16.5" r=".6"/></svg>',
  'ipucu':'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  'bilgi':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="17"/><circle cx="12" cy="7.5" r=".6"/></svg>',
  'sonraki':'<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>',
  'bu-derste':'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>',
  'ses':'<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  'etkinlik':'<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg>'
};

/* ---------- Yardımcılar ---------- */
function ekEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function ekNorm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”]/g, '')
    .replace(/[.!?…,;:]+$/g, '').replace(/\s+/g, ' ').trim();
}
function ekEl(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function ekImgUrl(name) {
  name = String(name || '').trim();
  if (/^https:\/\//i.test(name)) return name;
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '');
  try { return sb.storage.from('docs').getPublicUrl('ekitap/' + safe).data.publicUrl; } catch (e) { return ''; }
}
function ekWrapWords(text) {
  return String(text).split(/([А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*)/).map((p, i) =>
    i % 2 ? `<span class="ek-w" data-w="${ekEsc(p)}">${ekEsc(p)}</span>` : ekEsc(p)).join('');
}

/* ---------- Satır içi biçimlendirme ----------
   ctx.act: etkinlik içindeysek boşluklar giriş kutusu olur */
const EK_INLINE = /\{\{([^}]+)\}\}|\{(мн|м|ж|с)(\*?)(?:=([^:{}]+))?:([^{}]+)\}|\{=([^:{}]+):([^{}]+)\}|\[\[([^\]]+)\]\]|\*\*(.+?)\*\*|==(.+?)==|\*([^*\s][^*]*?)\*/g;
function ekInline(str, ctx) {
  str = String(str || '');
  // Her çağrıda ayrı regex örneği: iç içe (özyinelemeli) çağrılar sayacı bozmasın
  const re = new RegExp(EK_INLINE.source, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(str)) !== null) {
    out += ekWrapWords(str.slice(last, m.index));
    last = re.lastIndex;
    if (m[1] !== undefined) {                       // {{boşluk}}
      const alts = m[1].split('|').map(x => x.trim()).filter(Boolean);
      if (ctx && ctx.act) out += ekBlankInput(ctx, alts);
      else out += '<span class="ek-blank-static">______</span>';
    } else if (m[2] !== undefined) {                // {м:...} cinsiyet
      const code = EK_CINS[m[2]] || 'm', only = m[3] === '*', lemma = m[4], body = m[5];
      const br = body.match(/^(.*?)\[([^\]]*)\](.*)$/);
      if (br) {
        const shown = br[1] + br[2] + br[3];
        const w = (lemma || shown).trim();
        out += `<span class="ek-g ek-g-${code}${only ? ' ek-g-only' : ''}" data-w="${ekEsc(w)}">${ekEsc(br[1])}<b class="ek-end">${ekEsc(br[2])}</b>${ekEsc(br[3])}</span>`;
      } else if (lemma) {
        out += `<span class="ek-g ek-g-${code}" data-w="${ekEsc(lemma.trim())}">${ekEsc(body)}</span>`;
      } else {
        out += `<span class="ek-g ek-g-${code}${only ? ' ek-g-only' : ''}">${ekWrapWords(body)}</span>`;
      }
    } else if (m[6] !== undefined) {                // {=lemma:görünen}
      out += `<span class="ek-w" data-w="${ekEsc(m[6].trim())}">${ekEsc(m[7])}</span>`;
    } else if (m[8] !== undefined) {                // [[hedef]] — önizlemede cevabı ele vermeden düz metin
      out += ekWrapWords(m[8].split('=>')[0]);
    } else if (m[9] !== undefined) {
      out += '<b>' + ekInline(m[9], ctx) + '</b>';
    } else if (m[10] !== undefined) {
      out += '<mark class="ek-hl">' + ekInline(m[10], ctx) + '</mark>';
    } else if (m[11] !== undefined) {
      out += '<i>' + ekInline(m[11], ctx) + '</i>';
    }
  }
  out += ekWrapWords(str.slice(last));
  return out;
}

/* ============================================================
   AYRIŞTIRICI
   ============================================================ */
function ekParse(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const res = { meta: {}, sections: [], errors: [], warnings: [], konular: new Set(), kontrolSay: 0, actSay: 0, bolumNo: new Set(), kuralRef: [] };
  const err = (ln, msg) => res.errors.push({ ln, msg });
  const warn = (ln, msg) => res.warnings.push({ ln, msg });
  let sec = null, i = 0;
  const ensureSec = (ln) => {
    if (!sec) { warn(ln, 'İçerik bir "# Ders N | Ad" başlığından önce başlıyor; "Giriş" bölümü olarak eklendi.');
      sec = { tur: 'giris', no: null, ad: 'Giriş', altbaslik: '', konular: [], blocks: [] }; res.sections.push(sec); }
  };
  while (i < lines.length) {
    const raw = lines[i], line = raw.trim(), ln = i + 1;
    if (!line) { i++; continue; }
    // Ünite üst bilgileri
    let mm;
    if ((mm = line.match(/^@mod[üu]l\s+(\d+)\s*\|\s*(.+)$/i))) { res.meta.modul_no = +mm[1]; res.meta.modul_ad = mm[2].trim(); i++; continue; }
    if ((mm = line.match(/^@[üu]nite\s+(\d+)\s*\|\s*(.+)$/i))) { res.meta.unite_no = +mm[1]; res.meta.unite_ad = mm[2].trim(); i++; continue; }
    if ((mm = line.match(/^@seviye\s+(\S+)/i))) { res.meta.seviye = mm[1].toUpperCase(); i++; continue; }
    if ((mm = line.match(/^@alt\s*ba[şs]l[ıi]k\s+(.+)$/i))) { ensureSec(ln); sec.altbaslik = mm[1].trim(); i++; continue; }
    if ((mm = line.match(/^@konu\s+(.+)$/i))) {
      ensureSec(ln); mm[1].split(',').map(x => x.trim()).filter(Boolean).forEach(k => { sec.konular.push(k); res.konular.add(k); }); i++; continue;
    }
    // Bölüm başlığı
    if ((mm = line.match(/^#\s+(Ders\s+(\d+)|[ÖO]zet|Okuma|Test)\s*\|\s*(.+)$/i))) {
      const t = mm[1].toLowerCase();
      const tur = t.startsWith('ders') ? 'ders' : (t.startsWith('okuma') ? 'okuma' : (t.startsWith('test') ? 'test' : 'ozet'));
      sec = { tur, no: mm[2] ? +mm[2] : null, ad: mm[3].trim(), altbaslik: '', konular: [], blocks: [], ln };
      res.sections.push(sec); i++; continue;
    }
    if (/^#\s/.test(line)) { err(ln, 'Tanınmayan bölüm başlığı. Biçim: "# Ders 1 | Ad" veya "# Özet | Ad", "# Okuma | Ad", "# Test | Ad".'); i++; continue; }
    ensureSec(ln);
    // Sayfa sonu
    if (/^---\s*sayfa\s*---$/i.test(line)) { sec.blocks.push({ t: 'pagebreak' }); i++; continue; }
    // Başlıklar
    if ((mm = line.match(/^##\s+(\d+(?:\.\d+)*)\s+(.+)$/))) {
      if (res.bolumNo.has(mm[1])) warn(ln, 'Bölüm numarası ' + mm[1] + ' tekrar kullanılmış.');
      res.bolumNo.add(mm[1]); sec.blocks.push({ t: 'h2', no: mm[1], text: mm[2].trim() }); i++; continue;
    }
    if ((mm = line.match(/^##\s+(.+)$/))) { sec.blocks.push({ t: 'h2', no: '', text: mm[1].trim() }); i++; continue; }
    if ((mm = line.match(/^###\s+(.+)$/))) { sec.blocks.push({ t: 'h3', text: mm[1].trim() }); i++; continue; }
    // ::: blokları
    if ((mm = line.match(/^:::\s*([^\s]+)\s*(.*)$/))) {
      const tip = mm[1].toLowerCase().replace(/altin$/, 'altın').replace(/^ornek$/, 'örnek');
      const rest = mm[2].trim();
      const body = []; let j = i + 1, kapandi = false;
      while (j < lines.length) { if (lines[j].trim() === ':::') { kapandi = true; break; } body.push(lines[j]); j++; }
      if (!kapandi) { err(ln, '":::' + mm[1] + '" bloğu kapatılmamış (sonuna tek başına ":::" satırı gerekli).'); i = lines.length; break; }
      if (!EK_BLOKLAR.has(tip)) { err(ln, 'Tanınmayan blok türü: ":::' + mm[1] + '".'); i = j + 1; continue; }
      if (tip === 'etkinlik') {
        const act = ekParseAct(rest, body, ln, res);
        if (act) { sec.blocks.push(act); res.actSay++; if (act.kontrol) res.kontrolSay++; (act.konu || []).forEach(k => res.konular.add(k)); }
      } else if (tip === 'kartlar') {
        const cards = []; let cur = null;
        body.forEach(l => {
          const s = l.trim(); if (!s) return;
          if (s === '---') { if (cur) cards.push(cur); cur = null; return; }
          let q;
          if ((q = s.match(/^[öo]n:\s*(.*)$/i))) { if (cur && (cur.on || cur.arka)) cards.push(cur); cur = { on: q[1], arka: '', konu: '' }; }
          else if ((q = s.match(/^arka:\s*(.*)$/i))) { cur = cur || { on: '', arka: '', konu: '' }; cur.arka = q[1]; }
          else if ((q = s.match(/^konu:\s*(.*)$/i))) { cur = cur || { on: '', arka: '', konu: '' }; cur.konu = q[1]; }
          else if (cur) { if (cur.arka) cur.arka += ' ' + s; else cur.on += ' ' + s; }
        });
        if (cur) cards.push(cur);
        sec.blocks.push({ t: 'kartlar', cards });
      } else if (tip === 'kutular') {
        const kutular = body.map(l => l.trim()).filter(Boolean).map(l => {
          const q = l.match(/^\[(мн|м|ж|с)\]\s*(.*)$/); if (!q) return null;
          const p = q[2].split('|').map(x => x.trim());
          return { c: EK_CINS[q[1]], baslik: p[0] || '', aciklama: p[1] || '', ornek: p.slice(2) };
        }).filter(Boolean);
        sec.blocks.push({ t: 'kutular', kutular });
      } else if (tip === 'kelimeler') {
        const kel = body.map(l => l.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); return { ic: p[0] || '', ru: p[1] || '', tr: p[2] || '' }; });
        sec.blocks.push({ t: 'kelimeler', kel });
      } else if (tip === 'örnek') {
        const ornek = body.map(l => l.trim()).filter(Boolean).map(l => { const k = l.indexOf(' = '); return k > -1 ? { ru: l.slice(0, k).trim(), tr: l.slice(k + 3).trim() } : { ru: l, tr: '' }; });
        sec.blocks.push({ t: 'ornek', ornek });
      } else {
        sec.blocks.push({ t: 'kutu', tur: tip, baslik: rest || EK_KUTULAR[tip], body: ekParseSimple(body) });
      }
      i = j + 1; continue;
    }
    // Düz içerik (paragraf, liste, tablo, görsel) — bir sonraki özel satıra kadar
    const chunk = [];
    while (i < lines.length) {
      const s = lines[i].trim();
      if (/^(#|@|:::|---\s*sayfa)/i.test(s)) break;
      chunk.push(lines[i]); i++;
    }
    ekParseSimple(chunk).forEach(b => sec.blocks.push(b));
  }
  // Doğrulamalar
  if (res.meta.modul_no == null) err(1, '"@modül N | Ad" satırı eksik.');
  if (res.meta.unite_no == null) err(1, '"@ünite N | Ad" satırı eksik.');
  if (!res.meta.seviye) warn(1, '"@seviye" satırı eksik.');
  res.sections.forEach(s => {
    if (s.tur === 'ders' && !s.blocks.some(b => b.t === 'act')) warn(s.ln || 1, '"' + s.ad + '" dersinde hiç etkinlik yok.');
    if (s.tur === 'ders' && !s.konular.length) warn(s.ln || 1, '"' + s.ad + '" dersinde @konu satırı yok.');
  });
  res.kuralRef.forEach(r => { if (!res.bolumNo.has(r.no)) warn(r.ln, 'kural: ' + r.no + ' — bu numarada bir bölüm yok.'); });
  return res;
}

/* Paragraf / liste / tablo / görsel */
function ekParseSimple(lines) {
  const out = []; let para = [], list = null;
  const flushP = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = []; } };
  const flushL = () => { if (list) { out.push(list); list = null; } };
  for (let k = 0; k < lines.length; k++) {
    const s = lines[k].trim();
    if (!s) { flushP(); flushL(); continue; }
    let m;
    if (s.startsWith('|')) {
      flushP(); flushL();
      const rows = [];
      while (k < lines.length && lines[k].trim().startsWith('|')) {
        const r = lines[k].trim();
        if (!/^\|[\s:|-]+\|?$/.test(r)) rows.push(r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        k++;
      }
      k--; out.push({ t: 'table', rows }); continue;
    }
    if ((m = s.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) { flushP(); flushL(); out.push({ t: 'img', alt: m[1], src: m[2] }); continue; }
    if ((m = s.match(/^[-•]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = s.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushL(); para.push(s);
  }
  flushP(); flushL();
  return out;
}

/* Etkinlik ayrıştırma */
function ekParseAct(tipStr, body, ln, res) {
  const tip = String(tipStr || '').trim().toLowerCase();
  if (!EK_TIPLER[tip]) { res.errors.push({ ln, msg: 'Tanınmayan etkinlik türü: "' + tipStr + '".' }); return null; }
  const act = { t: 'act', tip, ln, alanlar: {}, konu: [], kural: '', kontrol: false, metin: '', intro: [], items: [] };
  let k = 0, ayrac = body.findIndex(l => l.trim() === '---');
  if (ayrac === -1) { res.warnings.push({ ln, msg: 'Etkinlikte başlık ile maddeler arasında "---" çizgisi yok.' }); ayrac = -1; }
  // Başlık alanları
  const baslik = ayrac > -1 ? body.slice(0, ayrac) : [];
  for (k = 0; k < baslik.length; k++) {
    const s = baslik[k].trim(); if (!s) continue;
    const m = s.match(/^([a-zA-ZçğıöşüÇĞİÖŞÜ-]+):\s?(.*)$/);
    if (m && m[1].toLowerCase() === 'metin') {
      const mt = [m[2]]; k++;
      while (k < baslik.length) { mt.push(baslik[k]); k++; }
      act.metin = mt.join('\n').trim(); break;
    }
    if (m && EK_BASLIK_ALANLARI.includes(m[1].toLowerCase())) act.alanlar[m[1].toLowerCase()] = m[2].trim();
    else act.intro.push(baslik[k]);
  }
  const a = act.alanlar;
  if (!a['yönerge'] && !a['görev']) res.errors.push({ ln, msg: 'Etkinlikte "yönerge:" alanı eksik.' });
  if (a['konu']) act.konu = a['konu'].split(',').map(x => x.trim()).filter(Boolean);
  else res.warnings.push({ ln, msg: 'Etkinlikte "konu:" alanı eksik.' });
  if (a['kural']) { act.kural = a['kural'].replace(/^#/, '').trim(); res.kuralRef.push({ no: act.kural, ln }); }
  act.kontrol = /^evet$/i.test(a['kontrol-et'] || '');
  // Maddeler
  const govde = body.slice(ayrac + 1);
  let cur = null; const lead = [];
  govde.forEach((l, idx) => {
    const s = l.trim();
    const nm = s.match(/^(\d+)\.\s+(.*)$/);
    if (nm) { if (cur) act.items.push(cur); cur = { ln: ln + ayrac + 2 + idx, lines: [nm[2]] }; }
    else if (cur) cur.lines.push(l);
    else lead.push(l);
  });
  if (cur) act.items.push(cur);
  act.lead = lead;
  act.items = act.items.map(it => ekParseItem(it, res));
  if (!act.items.length) act.bodyItem = ekParseItem({ ln, lines: lead }, res, true);
  return act;
}
function ekParseItem(it, res, govdeMi) {
  const o = { ln: it.ln, prompt: [], opts: [], ans: null, tf: null, alan: {}, adimlar: [] };
  it.lines.forEach(l => {
    const s = l.trim(); if (!s && !govdeMi) return;
    let m;
    if ((m = s.match(/^\[( |x|X)\]\s*(.*)$/))) { o.opts.push({ t: m[2], ok: m[1].toLowerCase() === 'x' }); return; }
    if ((m = s.match(/^([a-zA-ZçğıöşüÇĞİÖŞÜ-]+):\s?(.*)$/)) && EK_MADDE_ALANLARI.includes(m[1].toLowerCase())) {
      const key = m[1].toLowerCase();
      if (key === 'kural') res.kuralRef.push({ no: m[2].replace(/^#/, '').trim(), ln: it.ln });
      if (key === 'adım') o.adimlar.push(m[2]);
      o.alan[key] = m[2].trim(); return;
    }
    if ((m = s.match(/^=>\s*(.*)$/))) { o.ans = m[1]; return; }
    o.prompt.push(l);
  });
  // Satır sonunda "=> cevap" ([[a=>b]] içindeki => hariç)
  if (o.ans == null && o.prompt.length) {
    const li = o.prompt.length - 1, last = o.prompt[li];
    const maske = last.replace(/\[\[[^\]]*\]\]/g, m => '_'.repeat(m.length));
    const p = maske.lastIndexOf('=>');
    if (p > -1) { o.prompt[li] = last.slice(0, p).trimEnd(); o.ans = last.slice(p + 2).trim(); }
  }
  if (o.ans != null && /^(D|Y|Doğru|Yanlış)$/i.test(o.ans.trim())) { o.tf = /^d/i.test(o.ans.trim()); o.ans = null; }
  if (o.opts.length && !o.opts.some(x => x.ok)) res.errors.push({ ln: it.ln, msg: 'Seçmeli maddede doğru seçenek ([x]) işaretlenmemiş.' });
  return o;
}

/* ============================================================
   BLOK → HTML
   ============================================================ */
let _ekActSeq = 0;              // hiç sıfırlanmaz → kimlikler sayfa genelinde benzersiz
const EK_ACT = {};              // etkinlik çalışma verisi: id → { blanks:[], items:[], act }
const EK_SCOPE = { reader: [], admin: [] };
let _ekScope = 'reader';

function ekBlankInput(ctx, alts) {
  const reg = EK_ACT[ctx.act];
  const bi = reg.blanks.length;
  reg.blanks.push({ alts, item: ctx.item == null ? -1 : ctx.item });
  const w = Math.max(3, Math.min(18, Math.max(...alts.map(a => a.length)) + 2));
  return `<input class="ek-blank" data-a="${ctx.act}" data-b="${bi}" style="width:${w}ch" autocomplete="off" spellcheck="false" type="text">`;
}

function ekBlockEl(b, sec, secIdx, unit) {
  const ctx = {};
  switch (b.t) {
    case 'sectitle': {
      if (sec.tur === 'ders') {
        return ekEl(`<div class="ek-lesson-head" data-sec="${secIdx}">
          <div class="ek-lesson-no">${sec.no}</div>
          <div><div class="ek-lesson-k">DERS ${sec.no}</div>
            ${sec.altbaslik ? `<div class="ek-lesson-sub">${ekInline(sec.altbaslik)}</div>` : ''}
            <div class="ek-lesson-ad">${ekInline(sec.ad)}</div></div></div>`);
      }
      const k = { ozet: 'ÜNİTE ÖZETİ', okuma: 'OKUMA', test: 'ÜNİTE TESTİ', anahtar: 'CEVAP ANAHTARI', giris: 'GİRİŞ' }[sec.tur] || '';
      return ekEl(`<div class="ek-lesson-head ek-lesson-head-alt" data-sec="${secIdx}"><div><div class="ek-lesson-k">${k}</div><div class="ek-lesson-ad">${ekInline(sec.ad)}</div></div></div>`);
    }
    case 'h2': return ekEl(`<h2 class="ek-h2"${b.no ? ` data-bolum="${ekEsc(b.no)}"` : ''}>${b.no ? `<span class="ek-h2-no">${ekEsc(b.no)}</span>` : ''}<span class="ek-h2-t">${ekInline(b.text)}</span></h2>`);
    case 'h3': return ekEl(`<h3 class="ek-h3">${ekInline(b.text)}</h3>`);
    case 'p': return ekEl(`<p class="ek-p">${ekInline(b.text)}</p>`);
    case 'ul': return ekEl(`<ul class="ek-ul">${b.items.map(x => `<li>${ekInline(x)}</li>`).join('')}</ul>`);
    case 'ol': return ekEl(`<ol class="ek-ol">${b.items.map(x => `<li>${ekInline(x)}</li>`).join('')}</ol>`);
    case 'table': return ekEl(ekTableHTML(b.rows, ctx));
    case 'img': return ekEl(`<figure class="ek-fig"><img src="${ekEsc(ekImgUrl(b.src))}" alt="${ekEsc(b.alt)}" loading="lazy">${b.alt ? `<figcaption>${ekEsc(b.alt)}</figcaption>` : ''}</figure>`);
    case 'kutu': {
      return ekEl(`<div class="ek-box ek-box-${ekEsc(b.tur)}" data-kutu="${ekEsc(b.tur)}">
        <div class="ek-box-h"><span class="ek-ic">${EK_IC[b.tur] || ''}</span>${ekInline(b.baslik)}</div>
        <div class="ek-box-b">${b.body.map(x => ekSimpleHTML(x, ctx)).join('')}</div></div>`);
    }
    case 'kutular': return ekEl(`<div class="ek-kutular">${b.kutular.map(k => `
        <div class="ek-kutu ek-kutu-${k.c}"><div class="ek-kutu-h">${ekInline(k.baslik)}</div>
          ${k.aciklama ? `<div class="ek-kutu-a">${ekInline(k.aciklama)}</div>` : ''}
          ${k.ornek.map(o => { const p = o.split(':'); return p.length > 1 ? `<div class="ek-kutu-o"><span>${ekInline(p[0])}</span><span>${ekInline(p.slice(1).join(':'))}</span></div>` : `<div class="ek-kutu-o"><span>${ekInline(o)}</span></div>`; }).join('')}
        </div>`).join('')}</div>`);
    case 'kelimeler': return ekEl(`<div class="ek-kelimeler">${b.kel.map(k => `
        <div class="ek-kel">${k.ic ? `<span class="ek-kel-ic">${ekEsc(k.ic)}</span>` : ''}
          <div><div class="ek-kel-ru">${ekInline(k.ru)}</div><div class="ek-kel-tr">${ekEsc(k.tr)}</div></div></div>`).join('')}</div>`);
    case 'ornek': return ekEl(`<div class="ek-ornek">${b.ornek.map(o => `
        <div class="ek-ornek-s"><button class="ek-say" data-ek="speak" data-t="${ekEsc(o.ru.replace(/\{[^:}]*:|[{}\[\]]/g, ''))}" title="Dinle">${EK_IC.ses}</button>
          <div><div class="ek-ornek-ru">${ekInline(o.ru)}</div>${o.tr ? `<div class="ek-ornek-tr">${ekEsc(o.tr)}</div>` : ''}</div></div>`).join('')}</div>`);
    case 'act': return ekActEl(b);
    case 'anahtar': return ekEl(`<div class="ek-key"><div class="ek-key-h">${ekEsc(b.baslik)}</div>${b.satirlar.map(s => `<div class="ek-key-r">${ekEsc(s)}</div>`).join('')}</div>`);
    case 'kartlar': return null; // kartlar Kartlar sekmesinde gösterilir
    default: return null;
  }
}
function ekSimpleHTML(b, ctx) {
  if (b.t === 'p') return `<p class="ek-p">${ekInline(b.text, ctx)}</p>`;
  if (b.t === 'ul') return `<ul class="ek-ul">${b.items.map(x => `<li>${ekInline(x, ctx)}</li>`).join('')}</ul>`;
  if (b.t === 'ol') return `<ol class="ek-ol">${b.items.map(x => `<li>${ekInline(x, ctx)}</li>`).join('')}</ol>`;
  if (b.t === 'table') return ekTableHTML(b.rows, ctx);
  if (b.t === 'img') return `<figure class="ek-fig"><img src="${ekEsc(ekImgUrl(b.src))}" alt="${ekEsc(b.alt)}" loading="lazy"></figure>`;
  return '';
}
function ekTableHTML(rows, ctx) {
  if (!rows.length) return '';
  const [h, ...r] = rows;
  return `<div class="ek-tbl-wrap"><table class="ek-tbl"><thead><tr>${h.map(c => `<th>${ekInline(c, ctx)}</th>`).join('')}</tr></thead>
    <tbody>${r.map(row => `<tr>${row.map(c => `<td>${ekInline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- Etkinlik ---------- */
function ekActEl(act) {
  const id = 'a' + (++_ekActSeq);
  const reg = EK_ACT[id] = { blanks: [], items: [], act };
  EK_SCOPE[_ekScope].push(id);
  const faz2 = EK_FAZ2.has(act.tip) || (act.tip === 'es-zit' && !act.items.some(it => it.opts.length));
  const a = act.alanlar;
  let h = `<div class="ek-act" data-act="${id}">
    <div class="ek-act-h"><span class="ek-ic">${EK_IC.etkinlik}</span><span class="ek-act-tip">${EK_TIPLER[act.tip]}</span>
      ${faz2 ? '<span class="ek-act-soon">Etkileşim yakında</span>' : ''}</div>
    <div class="ek-act-y">${ekInline(a['yönerge'] || a['görev'] || '')}</div>`;
  if (a['durum']) h += `<div class="ek-act-durum">${ekInline(a['durum'])}</div>`;
  if (a['örnekler']) h += `<div class="ek-act-ornekler">${ekInline(a['örnekler'])}</div>`;
  if (a['ses']) h += `<div class="ek-act-ses"><button class="ek-say ek-say-lg" data-ek="speak" data-t="${ekEsc(a['ses'])}">${EK_IC.ses}<span>Dinle</span></button></div>`;
  if (act.metin) h += `<div class="ek-act-metin">${act.metin.split(/\n\s*\n/).map(p => `<p>${ekInline(p.replace(/\n/g, ' '))}</p>`).join('')}</div>`;
  if (a['kontrol-listesi']) h += `<ul class="ek-act-kl">${a['kontrol-listesi'].split('|').map(x => `<li>${ekInline(x.trim())}</li>`).join('')}</ul>`;

  if (faz2) {
    h += `<div class="ek-act-body">${ekFaz2Preview(act)}</div></div>`;
    return ekEl(h);
  }

  let body = '';
  if (act.lead && act.lead.some(l => l.trim()) && act.items.length) {
    body += ekParseSimple(act.lead).map(b => ekSimpleHTML(b, { act: id })).join('');
  }
  const items = act.items.length ? act.items : (act.bodyItem ? [act.bodyItem] : []);
  items.forEach((it, n) => { reg.items.push(it); body += ekItemHTML(id, it, n, act.items.length > 0); });
  const girisVar = reg.blanks.length || items.some(it => ekItemKind(it) === 'text');
  h += `<div class="ek-act-body">${body}</div>
    <div class="ek-act-f">
      ${girisVar ? `<button class="ek-btn" data-ek="check" data-a="${id}">Kontrol et</button>` : ''}
      ${(girisVar || items.some(it => it.opts.length || it.tf != null)) ? `<button class="ek-btn ghost" data-ek="reveal" data-a="${id}">Cevapları göster</button>` : ''}
      <span class="ek-act-skor" id="ek-skor-${id}"></span>
    </div></div>`;
  return ekEl(h);
}

/* 2. aşama türlerinin önizlemesi — cevabı ele vermeden, karışık sırayla */
function ekKaristir(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function ekCipler(liste) { return `<div class="ek-chips">${liste.map(x => `<span class="ek-chip">${ekInline(x)}</span>`).join('')}</div>`; }
function ekSesBtn(t) { return `<button class="ek-say" data-ek="speak" data-t="${ekEsc(t)}" title="Dinle">${EK_IC.ses}</button>`; }
function ekFaz2Preview(act) {
  let h = '';
  if (act.items.length) {
    act.items.forEach((it, n) => {
      const pr = it.prompt.join(' ').trim();
      let ic = '';
      if (it.alan['ses'] != null) ic += ekSesBtn(it.alan['ses']);
      else if (act.tip === 'telaffuz' && pr) ic += ekSesBtn(pr.replace(/\{[^:}]*:|[{}\[\]]/g, ''));
      let govde = '';
      if (it.adimlar.length) {
        govde = `<div>${ekInline(it.adimlar[0])}</div><div class="ek-act-not">${it.adimlar.length} adımlı çözüm</div>`;
      } else if (it.alan['parçalar']) {
        govde = ekCipler(ekKaristir(it.alan['parçalar'].split('=>')[0].split(',').map(x => x.trim()).filter(Boolean)));
      } else if (/\s\|\s/.test(pr) && !pr.startsWith('|')) {
        govde = ekCipler(ekKaristir(pr.split('|').map(x => x.trim()).filter(Boolean)));
      } else govde = ekInline(pr);
      h += `<div class="ek-it"><div class="ek-it-q"><span class="ek-it-no">${n + 1}.</span>${ic}<div class="ek-it-t">${govde}</div></div></div>`;
    });
    return h;
  }
  const lines = (act.lead || []).map(l => l.trim()).filter(Boolean);
  const ciftler = lines.filter(l => / = /.test(l) && !/^\[/.test(l));
  const gruplar = lines.filter(l => /^\[[^\]]+\]/.test(l));
  const diyalog = lines.filter(l => /^-\s*[^:]{1,12}:/.test(l));
  if (ciftler.length && ciftler.length === lines.length) {
    const sol = ciftler.map(l => l.split(' = ')[0].trim()), sag = ekKaristir(ciftler.map(l => l.split(' = ').slice(1).join(' = ').trim()));
    return `<div class="ek-match"><div>${ekCipler(sol)}</div><div class="ek-match-ok">↔</div><div>${ekCipler(sag)}</div></div>`;
  }
  if (gruplar.length && gruplar.length === lines.length) {
    const adlar = [], ogeler = [];
    gruplar.forEach(l => { const m = l.match(/^\[([^\]]+)\]\s*(.*)$/); adlar.push(m[1]); ogeler.push(...m[2].split(',').map(x => x.trim()).filter(Boolean)); });
    return `<div class="ek-act-not">Gruplar</div><div class="ek-chips">${adlar.map(a => `<span class="ek-chip ek-chip-grp">${ekInline(a)}</span>`).join('')}</div>
      <div class="ek-act-not">Yerleştirilecek öğeler</div>${ekCipler(ekKaristir(ogeler))}`;
  }
  if (act.tip === 'diyalog-sirala' && diyalog.length) {
    return ekKaristir(diyalog).map(l => `<div class="ek-act-onz">${ekInline(l.replace(/^-\s*/, ''))}</div>`).join('');
  }
  return lines.map(l => `<div class="ek-act-onz">${ekInline(l)}</div>`).join('');
}
function ekItemKind(it) {
  if (it.opts.length) return 'choice';
  if (it.tf != null) return 'tf';
  if (it.alan['örnek-cevap'] != null && it.ans == null) return 'free';
  if (it.ans != null) return 'text';
  if (it.alan['ses'] != null && !it.prompt.join('').trim()) return 'text';   // dikte
  return 'blank';
}
function ekItemHTML(id, it, n, numarali) {
  const ctx = { act: id, item: n };
  const kind = ekItemKind(it);
  let q = '';
  const prompt = it.prompt.join('\n').trim();
  if (prompt) {
    if (prompt.split('\n').some(l => l.trim().startsWith('|'))) q = ekParseSimple(it.prompt).map(b => ekSimpleHTML(b, ctx)).join('');
    else q = prompt.split('\n').map(l => ekInline(l.trim(), ctx)).join('<br>');
  }
  let h = `<div class="ek-it" data-i="${n}">`;
  h += `<div class="ek-it-q">${numarali ? `<span class="ek-it-no">${n + 1}.</span>` : ''}
    ${it.alan['ses'] != null ? `<button class="ek-say" data-ek="speak" data-t="${ekEsc(it.alan['ses'])}" title="Dinle">${EK_IC.ses}</button>` : ''}
    <div class="ek-it-t">${q}</div></div>`;
  if (it.alan['kelimeler']) h += `<div class="ek-it-kel">${ekInline(it.alan['kelimeler'])}</div>`;
  if (kind === 'choice') {
    h += `<div class="ek-opts">${it.opts.map((o, k) => `<button class="ek-opt" data-ek="choose" data-a="${id}" data-i="${n}" data-o="${k}">${ekInline(o.t)}</button>`).join('')}</div>`;
  } else if (kind === 'tf') {
    h += `<div class="ek-opts ek-tf"><button class="ek-opt" data-ek="tf" data-a="${id}" data-i="${n}" data-v="1">Doğru</button><button class="ek-opt" data-ek="tf" data-a="${id}" data-i="${n}" data-v="0">Yanlış</button></div>`;
  } else if (kind === 'text') {
    h += `<input class="ek-blank ek-blank-wide" data-a="${id}" data-whole="${n}" type="text" autocomplete="off" spellcheck="false" placeholder="Cevabını yaz">`;
  } else if (kind === 'free') {
    h += `<textarea class="ek-free" rows="3" placeholder="Cevabını buraya yaz"></textarea>
      <button class="ek-btn ghost sm" data-ek="ornek" data-a="${id}" data-i="${n}">Örnek cevabı göster</button>
      <div class="ek-ornek-cevap" style="display:none">${ekInline(it.alan['örnek-cevap'])}</div>`;
  }
  if (it.alan['ipucu']) h += `<div class="ek-it-ipucu">İpucu: ${ekInline(it.alan['ipucu'])}</div>`;
  h += `<div class="ek-it-fb"></div></div>`;
  return h;
}

/* Etkinlik etkileşimleri */
function ekAnsList(it) {
  if (it.ans != null) return it.ans.split('|').map(x => x.trim()).filter(Boolean);
  if (it.alan['ses'] != null) return [it.alan['ses']];
  return [];
}
function ekFeedback(actId, n, dogru) {
  const reg = EK_ACT[actId]; if (!reg) return;
  const it = reg.items[n]; const box = document.querySelector(`.ek-act[data-act="${actId}"] .ek-it[data-i="${n}"] .ek-it-fb`);
  if (!box || !it) return;
  if (dogru) { box.innerHTML = '<span class="ek-ok-t">Doğru</span>'; return; }
  const kural = it.alan['kural'] || reg.act.kural;
  box.innerHTML = `<span class="ek-no-t">Yanlış</span>` +
    (it.alan['neden'] ? `<div class="ek-neden">${ekInline(it.alan['neden'])}</div>` : '') +
    (kural ? `<button class="ek-btn ghost sm" data-ek="kural" data-no="${ekEsc(kural)}">Kuralı gör (${ekEsc(kural)})</button>` : '');
}
function ekCheckAct(actId) {
  const reg = EK_ACT[actId]; if (!reg) return;
  const root = document.querySelector(`.ek-act[data-act="${actId}"]`); if (!root) return;
  const itemOk = {};
  root.querySelectorAll('input.ek-blank').forEach(inp => {
    let ok, n;
    if (inp.dataset.whole != null) { n = +inp.dataset.whole; ok = ekAnsList(reg.items[n]).some(a => ekNorm(a) === ekNorm(inp.value)); }
    else { const b = reg.blanks[+inp.dataset.b]; n = b.item; ok = b.alts.some(a => ekNorm(a) === ekNorm(inp.value)); }
    inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok);
    if (n >= 0) itemOk[n] = (itemOk[n] !== false) && ok;
  });
  Object.keys(itemOk).forEach(n => ekFeedback(actId, +n, itemOk[n]));
  const toplam = root.querySelectorAll('input.ek-blank').length, dogru = root.querySelectorAll('input.ek-blank.ok').length;
  const sk = document.getElementById('ek-skor-' + actId); if (sk && toplam) sk.textContent = dogru + ' / ' + toplam + ' doğru';
}
function ekRevealAct(actId) {
  const reg = EK_ACT[actId]; if (!reg) return;
  const root = document.querySelector(`.ek-act[data-act="${actId}"]`); if (!root) return;
  root.querySelectorAll('input.ek-blank').forEach(inp => {
    if (inp.classList.contains('ok')) return;
    const v = inp.dataset.whole != null ? (ekAnsList(reg.items[+inp.dataset.whole])[0] || '') : (reg.blanks[+inp.dataset.b].alts[0] || '');
    inp.value = v; inp.classList.remove('no'); inp.classList.add('shown');
  });
  reg.items.forEach((it, n) => {
    const rowOpts = root.querySelectorAll(`.ek-it[data-i="${n}"] .ek-opt`);
    if (it.opts.length) rowOpts.forEach((b, k) => { if (it.opts[k].ok) b.classList.add('ok'); });
    if (it.tf != null) rowOpts.forEach(b => { if ((b.dataset.v === '1') === it.tf) b.classList.add('ok'); });
  });
}
function ekChoose(actId, n, k) {
  const reg = EK_ACT[actId]; const it = reg && reg.items[n]; if (!it) return;
  const btns = document.querySelectorAll(`.ek-act[data-act="${actId}"] .ek-it[data-i="${n}"] .ek-opt`);
  const ok = it.opts[k] && it.opts[k].ok;
  btns.forEach((b, j) => { b.classList.remove('ok', 'no'); if (j === k) b.classList.add(ok ? 'ok' : 'no'); });
  ekFeedback(actId, n, ok);
}
function ekTF(actId, n, v) {
  const reg = EK_ACT[actId]; const it = reg && reg.items[n]; if (!it) return;
  const ok = (v === '1') === it.tf;
  document.querySelectorAll(`.ek-act[data-act="${actId}"] .ek-it[data-i="${n}"] .ek-opt`).forEach(b => {
    b.classList.remove('ok', 'no'); if (b.dataset.v === v) b.classList.add(ok ? 'ok' : 'no');
  });
  ekFeedback(actId, n, ok);
}

/* Cevap anahtarı üretimi */
function ekActAnswers(act) {
  const out = [];
  const fromText = (t) => {
    const r = []; let m; const re = /\{\{([^}]+)\}\}|\[\[([^\]]+)\]\]/g;
    while ((m = re.exec(t))) { if (m[1]) r.push(m[1].split('|')[0].trim()); else r.push((m[2].split('=>')[1] || m[2]).trim()); }
    return r;
  };
  const one = (it) => {
    const parts = [];
    const pt = it.prompt.join(' ');
    parts.push(...fromText(pt));
    if (it.opts.length) parts.push(it.opts.filter(o => o.ok).map(o => o.t).join(', '));
    if (it.tf != null) parts.push(it.tf ? 'Doğru' : 'Yanlış');
    if (it.ans != null) parts.push(it.ans.split('|')[0].trim());
    if (it.alan['ses'] != null && it.ans == null && !it.opts.length && !pt.trim()) parts.push(it.alan['ses']);
    if (it.alan['parçalar']) { const p = it.alan['parçalar'].split('=>'); if (p[1]) parts.push(p[1].trim()); }
    if (!parts.length && /\s\|\s/.test(pt)) parts.push(pt.split('|').map(x => x.trim()).join(' '));
    if (!parts.length && it.alan['örnek-cevap']) parts.push('Örnek: ' + it.alan['örnek-cevap']);
    return parts.filter(Boolean).join(' · ').replace(/\{[^:}]*:|[{}\[\]]/g, '');
  };
  if (act.items.length) act.items.forEach((it, n) => { const s = one(it); if (s) out.push((n + 1) + '. ' + s); });
  else {
    const s = (act.lead || []).map(l => l.trim()).filter(Boolean);
    const cev = []; s.forEach(l => { cev.push(...fromText(l)); if (/^\S.*\s=\s\S/.test(l) && !l.startsWith('|')) cev.push(l.replace(/\s=\s/, ' — ')); if (/^\[[^\]]+\]/.test(l)) cev.push(l); });
    if (cev.length) out.push(cev.join(' · ').replace(/\{[^:}]*:|[{}\[\]]/g, ''));
    else if (s.length && ['cumle-sirala', 'diyalog-sirala', 'dinle-sirala'].includes(act.tip)) out.push('Sıra: yazıldığı gibi');
  }
  return out;
}

/* ============================================================
   OKUYUCU
   ============================================================ */
const EK = { list: [], unit: null, parsed: null, sections: [], pages: [], anchors: {}, secPage: [], cur: 0, single: false, zoom: 100, acik: {}, tab: 'kelime', loaded: false, saveT: null };

function ekShellHTML() {
  return `<div class="ek-wrap" id="ek-wrap">
    <div class="ek-toptabs">
      <button class="ek-ttab active" data-ek="ttab" data-v="kitap"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><line x1="12" y1="5" x2="12" y2="19"/></svg>E-Kitap</button>
      <button class="ek-ttab" data-ek="ttab" data-v="notlar"><svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg>Notlar</button>
      <button class="ek-ttab" data-ek="ttab" data-v="kartlar"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/></svg>Kartlar</button>
    </div>
    <div class="ek-view" id="ek-v-kitap">
      <div class="ek-main">
        <div class="ek-center">
          <div class="ek-toolbar">
            <div class="ek-tb-nav">
              <button class="ek-ico-btn" data-ek="prev" title="Önceki sayfa"><svg viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18"/></svg></button>
              <span class="ek-tb-page" id="ek-tb-page">Sayfa – / –</span>
              <button class="ek-ico-btn" data-ek="next" title="Sonraki sayfa"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></button>
            </div>
            <div class="ek-tb-r">
              <select class="ek-zoom" id="ek-zoom" data-ek-zoom="1">
                <option value="90">%90</option><option value="100" selected>%100</option><option value="110">%110</option><option value="125">%125</option>
              </select>
              <button class="ek-ico-btn" data-ek="fs" title="Tam ekran"><svg viewBox="0 0 24 24"><polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/></svg></button>
            </div>
          </div>
          <div class="ek-book" id="ek-book"><div class="ek-empty">Yükleniyor…</div></div>
          <div class="ek-bottom">
            <button class="ek-nav-btn" data-ek="prev"><svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>Önceki Sayfa</button>
            <input type="range" class="ek-slider" id="ek-slider" min="0" max="0" value="0" data-ek-slider="1">
            <span class="ek-bottom-n" id="ek-bottom-n">–</span>
            <button class="ek-nav-btn" data-ek="next">Sonraki Sayfa<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></button>
          </div>
        </div>
        <aside class="ek-side">
          <div class="ek-side-tabs">
            <button class="ek-stab" data-ek="stab" data-v="notlar">Notlar</button>
            <button class="ek-stab active" data-ek="stab" data-v="kelime">Kelime</button>
          </div>
          <div class="ek-side-b" id="ek-side-notlar" style="display:none"></div>
          <div class="ek-side-b" id="ek-side-kelime">
            <input class="ek-search" id="ek-search" type="search" placeholder="Sözlükte ara (Rusça / Türkçe)" autocomplete="off" data-lpignore="true" data-form-type="other">
            <div id="ek-search-res"></div>
            <div id="ek-word"><div class="ek-side-empty">Kitaptaki bir Rusça kelimeye tıkla; bilgileri burada görünecek.</div></div>
          </div>
        </aside>
      </div>
    </div>
    <div class="ek-view" id="ek-v-notlar" style="display:none">
      <div class="ek-soon"><h3>Notlarım</h3><p>Ders ve konulara bağlı kendi notlarını tutacağın bu alan bir sonraki aşamada açılacak.</p></div>
    </div>
    <div class="ek-view" id="ek-v-kartlar" style="display:none"><div id="ek-cards"></div></div>
    <div class="ek-measure" id="ek-measure" aria-hidden="true"></div>
  </div>`;
}

/* Gramer sayfası açıldığında */
async function ekOpen() {
  const host = document.getElementById('ek-host'); if (!host) return;
  if (!document.getElementById('ek-wrap')) host.innerHTML = ekShellHTML();
  const tree = document.getElementById('ek-tree'); if (tree) tree.style.display = '';
  if (!EK.loaded) await ekLoadList();
  ekRenderTree();
  if (!EK.list.length) {
    document.getElementById('ek-book').innerHTML = '<div class="ek-empty">Henüz yayınlanmış ünite yok.</div>';
    return;
  }
  if (!EK.unit) {
    let hedef = null; try { hedef = +localStorage.getItem('ek_last') || null; } catch (e) {}
    const u = EK.list.find(x => x.id === hedef) || EK.list[0];
    await ekOpenUnit(u.id);
  } else {
    setTimeout(() => { ekPaginate(); ekRender(); }, 30);
  }
}
async function ekLoadList() {
  try {
    const { data } = await sb.from('ek_units').select('id, modul_no, modul_ad, unite_no, unite_ad, seviye, toc, yayinda')
      .order('modul_no').order('unite_no');
    EK.list = data || [];
  } catch (e) { EK.list = []; }
  EK.loaded = true;
}
function ekRenderTree() {
  const box = document.getElementById('ek-tree'); if (!box) return;
  if (!EK.list.length) { box.innerHTML = ''; return; }
  const moduller = {};
  EK.list.forEach(u => { (moduller[u.modul_no] = moduller[u.modul_no] || { ad: u.modul_ad, units: [] }).units.push(u); });
  const curSec = ekCurSection();
  let h = '';
  Object.keys(moduller).sort((a, b) => a - b).forEach(mno => {
    const md = moduller[mno];
    const mAcik = EK.acik['m' + mno] !== false;
    h += `<div class="ekt-mod${mAcik ? ' open' : ''}">
      <button class="ekt-mod-h" data-ek="tmod" data-m="${mno}">
        <svg class="ekt-mic" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><line x1="12" y1="5" x2="12" y2="19"/></svg>
        <span><b>Modül ${mno}</b><small>${ekEsc(md.ad || '')}</small></span>
        <svg class="ekt-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
      <div class="ekt-mod-b">`;
    md.units.forEach(u => {
      const aktifU = EK.unit && EK.unit.id === u.id;
      const uAcik = EK.acik['u' + u.id] != null ? EK.acik['u' + u.id] : aktifU;
      h += `<div class="ekt-u${aktifU ? ' active' : ''}${uAcik ? ' open' : ''}">
        <button class="ekt-u-h" data-ek="tunit" data-u="${u.id}">
          <span><b>Ünite ${u.unite_no}</b>${u.yayinda ? '' : ' <em class="ekt-taslak">taslak</em>'}<small>${ekEsc(u.unite_ad || '')}</small></span>
          <svg class="ekt-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
        <div class="ekt-u-b">`;
      (u.toc || []).forEach((t, si) => {
        const akt = aktifU && curSec === si;
        const etiket = t.tur === 'ders' ? `<span class="ekt-dno">Ders ${t.no}</span>${ekEsc(t.ad)}` : ekEsc(t.ad);
        h += `<button class="ekt-s${akt ? ' active' : ''}${t.tur !== 'ders' ? ' ekt-s-alt' : ''}" data-ek="tsec" data-u="${u.id}" data-s="${si}">
          <span class="ekt-dot"></span><span class="ekt-s-t">${etiket}</span></button>`;
      });
      h += `</div></div>`;
    });
    h += `</div></div>`;
  });
  box.innerHTML = h;
}
async function ekOpenUnit(id, secIdx) {
  const book = document.getElementById('ek-book');
  if (book) book.innerHTML = '<div class="ek-empty">Yükleniyor…</div>';
  let row = null;
  try { const { data } = await sb.from('ek_units').select('*').eq('id', id).single(); row = data; } catch (e) {}
  if (!row) { if (book) book.innerHTML = '<div class="ek-empty">Ünite yüklenemedi.</div>'; return; }
  EK.unit = row; EK.acik['u' + id] = true;
  try { localStorage.setItem('ek_last', String(id)); } catch (e) {}
  EK.parsed = ekParse(row.kaynak);
  EK.sections = ekBuildSections(EK.parsed, 'reader');
  ekPaginate();
  let start = 0;
  if (secIdx != null) start = EK.secPage[secIdx] || 0;
  else {
    let kayit = null;
    try { kayit = localStorage.getItem('ek_pos_' + id); } catch (e) {}
    if (kayit == null && typeof currentUser !== 'undefined' && currentUser) {
      try { const { data } = await sb.from('ek_progress').select('sayfa').eq('unit_id', id).eq('user_id', currentUser.id).maybeSingle(); if (data) kayit = data.sayfa - 1; } catch (e) {}
    }
    start = Math.max(0, Math.min(EK.pages.length - 1, +kayit || 0));
  }
  ekGoPage(start);
  ekRenderCards();
  ekRenderTree();
}
/* Bölümleri blok elemanlarına çevir (bir kez; sayfalama elemanları taşır, durum korunur) */
function ekBuildSections(parsed, scope) {
  _ekScope = scope || 'reader';
  EK_SCOPE[_ekScope].forEach(k => delete EK_ACT[k]); EK_SCOPE[_ekScope] = [];
  const secs = parsed.sections.slice();
  const anahtar = [];
  secs.forEach(s => {
    let sayac = 0;
    s.blocks.forEach(b => { if (b.t === 'act') { sayac++; const c = ekActAnswers(b); if (c.length) anahtar.push({ t: 'anahtar', baslik: (s.tur === 'ders' ? 'Ders ' + s.no : s.ad) + ' · Etkinlik ' + sayac + ' — ' + EK_TIPLER[b.tip], satirlar: c }); } });
  });
  if (anahtar.length) secs.push({ tur: 'anahtar', ad: 'Cevap anahtarı', blocks: anahtar });
  return secs.map((s, si) => {
    const els = [{ el: ekBlockEl({ t: 'sectitle' }, s, si), pb: false }];
    s.blocks.forEach(b => {
      if (b.t === 'pagebreak') { els.push({ pb: true }); return; }
      const el = ekBlockEl(b, s, si); if (el) els.push({ el, pb: false });
    });
    return { sec: s, els };
  });
}
function ekPageSize() {
  const wrap = document.getElementById('ek-wrap'), book = document.getElementById('ek-book');
  if (!wrap || !book) return null;
  const fs = wrap.classList.contains('ek-fs');
  const bw = book.clientWidth || 900;
  EK.single = bw < 740;
  const w = EK.single ? Math.min(bw - 8, 640) : Math.floor((bw - 8) / 2);
  const h = Math.max(520, Math.min(fs ? 2000 : 980, window.innerHeight - (fs ? 150 : 250)));
  wrap.style.setProperty('--ek-pg-h', h + 'px');
  wrap.style.setProperty('--ek-fs', (EK.zoom / 100) + '');
  return { w, h };
}
function ekPaginate() {
  const meas = document.getElementById('ek-measure'); const sz = ekPageSize();
  if (!meas || !sz || !EK.sections.length) return;
  meas.style.width = sz.w + 'px';
  meas.innerHTML = '';
  EK.pages = []; EK.anchors = {}; EK.secPage = [];
  const u = EK.unit || {};
  const bas = `Modül ${u.modul_no || ''} · Ünite ${u.unite_no || ''} — ${u.unite_ad || ''}`;
  let pg = null, body = null;
  const yeni = () => {
    pg = ekEl(`<div class="ek-page"><div class="ek-pg-head"><span>${ekEsc(bas)}</span><span class="ek-pg-no"></span></div><div class="ek-pg-body"></div></div>`);
    body = pg.querySelector('.ek-pg-body'); meas.appendChild(pg); EK.pages.push(pg);
  };
  EK.sections.forEach((s, si) => {
    yeni(); EK.secPage[si] = EK.pages.length - 1;
    s.els.forEach(x => {
      if (x.pb) { if (body.children.length) yeni(); return; }
      body.appendChild(x.el);
      if (body.scrollHeight > body.clientHeight + 2 && body.children.length > 1) {
        body.removeChild(x.el); yeni(); body.appendChild(x.el);
      }
      if (body.children.length === 1 && body.scrollHeight > body.clientHeight + 2) x.el.classList.add('ek-tall');
      x.el.querySelectorAll('[data-bolum]').forEach(h => { EK.anchors[h.dataset.bolum] = EK.pages.length - 1; });
      if (x.el.dataset && x.el.dataset.bolum) EK.anchors[x.el.dataset.bolum] = EK.pages.length - 1;
    });
  });
  EK.pages.forEach((p, k) => { p.querySelector('.ek-pg-no').textContent = k + 1; });
  meas.innerHTML = '';
}
function ekRender() {
  const book = document.getElementById('ek-book'); if (!book || !EK.pages.length) return;
  book.innerHTML = '';
  book.classList.toggle('ek-single', EK.single);
  const sol = EK.pages[EK.cur]; if (sol) { sol.classList.remove('ek-right'); sol.classList.add('ek-left'); book.appendChild(sol); }
  if (!EK.single) {
    const sag = EK.pages[EK.cur + 1];
    if (sag) { sag.classList.remove('ek-left'); sag.classList.add('ek-right'); book.appendChild(sag); }
    else book.appendChild(ekEl('<div class="ek-page ek-right ek-page-blank"></div>'));
  }
  const n = EK.pages.length;
  const a = EK.cur + 1, b = EK.single ? a : Math.min(n, EK.cur + 2);
  const etiket = a === b ? `${a} / ${n}` : `${a}–${b} / ${n}`;
  const tp = document.getElementById('ek-tb-page'); if (tp) tp.textContent = 'Sayfa ' + etiket;
  const bn = document.getElementById('ek-bottom-n'); if (bn) bn.textContent = etiket;
  const sl = document.getElementById('ek-slider'); if (sl) { sl.max = n - 1; sl.value = EK.cur; }
  ekRenderSideNotes();
  ekRenderTree();
  ekSaveProgress();
}
function ekGoPage(p) {
  if (!EK.pages.length) return;
  p = Math.max(0, Math.min(EK.pages.length - 1, p | 0));
  if (!EK.single && p % 2) p -= 1;
  EK.cur = p; ekRender();
}
function ekStep(d) { ekGoPage(EK.cur + d * (EK.single ? 1 : 2)); }
function ekCurSection() {
  if (!EK.unit || !EK.secPage.length) return -1;
  let s = 0; EK.secPage.forEach((p, i) => { if (p <= EK.cur) s = i; });
  return s;
}
function ekGoKural(no) {
  const p = EK.anchors[no];
  if (p == null) { if (typeof toast === 'function') toast('Bu bölüm bulunamadı.'); return; }
  const ta = document.getElementById('ek-v-kitap'); if (ta && ta.style.display === 'none') ekTopTab('kitap');
  ekGoPage(p);
  setTimeout(() => { const h = document.querySelector(`#ek-book [data-bolum="${CSS.escape(no)}"]`); if (h) { h.classList.add('ek-flash'); h.scrollIntoView({ block: 'nearest' }); setTimeout(() => h.classList.remove('ek-flash'), 1600); } }, 60);
}
function ekSaveProgress() {
  if (!EK.unit) return;
  const id = EK.unit.id, p = EK.cur;
  try { localStorage.setItem('ek_pos_' + id, String(p)); } catch (e) {}
  clearTimeout(EK.saveT);
  EK.saveT = setTimeout(() => {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    sb.from('ek_progress').upsert({ user_id: currentUser.id, unit_id: id, sayfa: p + 1, updated_at: new Date().toISOString() }, { onConflict: 'user_id,unit_id' }).then(() => {}, () => {});
  }, 1500);
}

/* Sağ panel: kelime */
function ekFindWord(k) {
  if (!k) return null;
  const kl = k.toLowerCase().replace(/ё/g, 'е');
  if (typeof wordsByRu !== 'undefined') { const w = wordsByRu[k] || wordsByRu[k.toLowerCase()]; if (w) return w; }
  if (typeof words === 'undefined' || !words.length) return null;
  const n = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  let w = words.find(x => n(x.ru) === kl);
  if (!w && kl.length > 3) {
    const kok = kl.slice(0, Math.max(3, Math.ceil(kl.length * 0.7)));
    w = words.find(x => n(x.ru).startsWith(kok) && Math.abs(n(x.ru).length - kl.length) <= 3);
  }
  return w || null;
}
function ekShowWord(k) {
  ekSideTab('kelime');
  const box = document.getElementById('ek-word'); if (!box) return;
  const w = ekFindWord(k);
  if (!w) { box.innerHTML = `<div class="ek-wc"><div class="ek-wc-ru">${ekEsc(k)}</div><div class="ek-side-empty">Bu kelime henüz sözlükte kayıtlı değil.</div></div>`; return; }
  const CINS = { 'м': ['m', 'eril'], 'ж': ['f', 'dişil'], 'с': ['n', 'nötr'], 'мн': ['p', 'çoğul'], 'м/ж': ['mf', 'ortak'] };
  const c = CINS[w.cinsiyet];
  const roz = [];
  if (w.level) roz.push(`<span class="ek-wc-b lvl">${ekEsc(w.level)}</span>`);
  if (w.cat) roz.push(`<span class="ek-wc-b">${ekEsc(w.cat)}</span>`);
  if (c) roz.push(`<span class="ek-wc-b ek-g-${c[0]}b">${ekEsc(w.cinsiyet)} · ${c[1]}</span>`);
  if (w.tip) roz.push(`<span class="ek-wc-b">${ekEsc(w.tip)}</span>`);
  if (w.padej) roz.push(`<span class="ek-wc-b">${ekEsc(w.padej)}</span>`);
  const kayitli = typeof isWordSaved === 'function' && isWordSaved(w.ru);
  box.innerHTML = `<div class="ek-wc">
    <div class="ek-wc-top"><div class="ek-wc-ru${c ? ' ek-g-' + c[0] : ''}">${ekEsc(w.ru)}</div>
      <button class="ek-say" data-ek="speak" data-t="${ekEsc(w.ru)}" title="Dinle">${EK_IC.ses}</button></div>
    ${(w.p || w.pron) ? `<div class="ek-wc-ipa">${ekEsc(w.p || w.pron)}</div>` : ''}
    <div class="ek-wc-roz">${roz.join('')}</div>
    <div class="ek-wc-tr">${ekEsc(w.tr || '')}</div>
    ${w.ornek ? `<div class="ek-wc-ex"><div class="ek-wc-lbl">Örnek</div>
      <div class="ek-wc-ex-ru"><button class="ek-say sm" data-ek="speak" data-t="${ekEsc(w.ornek)}">${EK_IC.ses}</button>${ekEsc(w.ornek)}</div>
      ${w.ornekTr ? `<div class="ek-wc-ex-tr">${ekEsc(w.ornekTr)}</div>` : ''}</div>` : ''}
    ${(w.not || w.note) ? `<div class="ek-wc-lbl">Not</div><div class="ek-wc-not">${ekEsc(w.not || w.note)}</div>` : ''}
    <button class="ek-btn ${kayitli ? 'ghost' : ''}" data-ek="saveword" data-w="${ekEsc(w.ru)}">${kayitli ? 'Kelime kasanda' : '+ Kelime kasama ekle'}</button>
  </div>`;
}
function ekSearch(q) {
  const box = document.getElementById('ek-search-res'); if (!box) return;
  q = String(q || '').trim().toLowerCase().replace(/ё/g, 'е');
  if (q.length < 2 || typeof words === 'undefined') { box.innerHTML = ''; return; }
  const n = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const r = words.filter(w => n(w.ru).startsWith(q) || n(w.tr).includes(q)).slice(0, 8);
  box.innerHTML = r.length ? r.map(w => `<button class="ek-sr" data-ek="sword" data-w="${ekEsc(w.ru)}"><b>${ekEsc(w.ru)}</b><span>${ekEsc(w.tr || '')}</span></button>`).join('')
    : '<div class="ek-side-empty">Sonuç yok.</div>';
}
/* Sağ panel: bu sayfalardaki bizim notlarımız */
function ekRenderSideNotes() {
  const box = document.getElementById('ek-side-notlar'); if (!box) return;
  const kutular = document.querySelectorAll('#ek-book .ek-box');
  let h = `<div class="ek-side-sec">Bu sayfadaki notlar (${kutular.length})</div>`;
  if (!kutular.length) h += '<div class="ek-side-empty">Bu sayfalarda not kutusu yok.</div>';
  kutular.forEach((k, i) => {
    const tur = k.dataset.kutu;
    const bas = (k.querySelector('.ek-box-h') || {}).textContent || '';
    const oz = ((k.querySelector('.ek-box-b') || {}).textContent || '').trim().slice(0, 90);
    h += `<button class="ek-sn ek-sn-${ekEsc(tur)}" data-ek="snote" data-k="${i}"><b>${ekEsc(bas)}</b><span>${ekEsc(oz)}${oz.length >= 90 ? '…' : ''}</span></button>`;
  });
  h += '<div class="ek-side-sec" style="margin-top:14px">Kendi notlarım</div><div class="ek-side-empty">Kendi not alma araçların bir sonraki aşamada eklenecek.</div>';
  box.innerHTML = h;
}
function ekSideTab(v) {
  EK.tab = v;
  document.querySelectorAll('.ek-stab').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  const n = document.getElementById('ek-side-notlar'), k = document.getElementById('ek-side-kelime');
  if (n) n.style.display = v === 'notlar' ? '' : 'none';
  if (k) k.style.display = v === 'kelime' ? '' : 'none';
}
function ekTopTab(v) {
  document.querySelectorAll('.ek-ttab').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  ['kitap', 'notlar', 'kartlar'].forEach(x => { const el = document.getElementById('ek-v-' + x); if (el) el.style.display = x === v ? '' : 'none'; });
  if (v === 'kitap') setTimeout(() => { ekPaginate(); ekRender(); }, 20);
}
/* Kartlar (Faz 1: liste; kaydırmalı deste Faz 4) */
function ekRenderCards() {
  const box = document.getElementById('ek-cards'); if (!box || !EK.parsed) return;
  let h = '<div class="ek-cards-h"><h3>Çalışma kartları</h3><p>Kaydırmalı çalışma destesi bir sonraki aşamada eklenecek. Şimdilik kartlara tıklayarak ön ve arka yüzlerini görebilirsin.</p></div>';
  let say = 0;
  EK.parsed.sections.forEach(s => {
    const cards = []; s.blocks.forEach(b => { if (b.t === 'kartlar') cards.push(...b.cards); });
    if (!cards.length) return;
    say += cards.length;
    h += `<div class="ek-cards-sec">${s.tur === 'ders' ? 'Ders ' + s.no + ' · ' : ''}${ekEsc(s.ad)} <span>${cards.length} kart</span></div><div class="ek-cards-grid">`;
    cards.forEach(c => { h += `<button class="ek-fc" data-ek="flip"><div class="ek-fc-on">${ekInline(c.on)}</div><div class="ek-fc-arka">${ekInline(c.arka)}</div></button>`; });
    h += '</div>';
  });
  if (!say) h += '<div class="ek-side-empty">Bu ünitede henüz kart yok.</div>';
  box.innerHTML = h;
}

/* ---------- Olay yönetimi (tek dinleyici) ---------- */
document.addEventListener('click', function (e) {
  const t = e.target.closest('[data-ek]');
  if (t) {
    const a = t.dataset.ek;
    if (a === 'speak') { e.stopPropagation(); if (typeof speak === 'function') speak(t.dataset.t); return; }
    if (a === 'choose') { ekChoose(t.dataset.a, +t.dataset.i, +t.dataset.o); return; }
    if (a === 'tf') { ekTF(t.dataset.a, +t.dataset.i, t.dataset.v); return; }
    if (a === 'check') { ekCheckAct(t.dataset.a); return; }
    if (a === 'reveal') { ekRevealAct(t.dataset.a); return; }
    if (a === 'ornek') { const d = t.nextElementSibling; if (d) d.style.display = d.style.display === 'none' ? '' : 'none'; return; }
    if (a === 'kural') { ekGoKural(t.dataset.no); return; }
    if (a === 'prev') { ekStep(-1); return; }
    if (a === 'next') { ekStep(1); return; }
    if (a === 'fs') { const w = document.getElementById('ek-wrap'); if (w) { w.classList.toggle('ek-fs'); setTimeout(() => { ekPaginate(); ekRender(); }, 40); } return; }
    if (a === 'stab') { ekSideTab(t.dataset.v); return; }
    if (a === 'ttab') { ekTopTab(t.dataset.v); return; }
    if (a === 'sword') { ekShowWord(t.dataset.w); return; }
    if (a === 'saveword') { if (typeof _wAddWordToSaved === 'function') _wAddWordToSaved(t.dataset.w); setTimeout(() => ekShowWord(t.dataset.w), 400); return; }
    if (a === 'flip') { t.classList.toggle('flipped'); return; }
    if (a === 'snote') { const k = document.querySelectorAll('#ek-book .ek-box')[+t.dataset.k]; if (k) { k.classList.add('ek-flash'); k.scrollIntoView({ block: 'nearest' }); setTimeout(() => k.classList.remove('ek-flash'), 1600); } return; }
    if (a === 'tmod') { const m = t.dataset.m; EK.acik['m' + m] = EK.acik['m' + m] === false; ekRenderTree(); return; }
    if (a === 'tunit') {
      const id = +t.dataset.u;
      if (!EK.unit || EK.unit.id !== id) { ekOpenUnit(id); return; }
      EK.acik['u' + id] = !(EK.acik['u' + id] != null ? EK.acik['u' + id] : true); ekRenderTree(); return;
    }
    if (a === 'tsec') {
      const id = +t.dataset.u, s = +t.dataset.s;
      ekTopTab('kitap');
      if (!EK.unit || EK.unit.id !== id) ekOpenUnit(id, s); else ekGoPage(EK.secPage[s] || 0);
      return;
    }
    return;
  }
  // Kitap içindeki kelimeler
  const w = e.target.closest('#ek-book .ek-w, #ek-book .ek-g[data-w], #ek-adm-preview .ek-w, #ek-cards .ek-w');
  if (w && !e.target.closest('input,textarea,button')) {
    if (e.target.closest('#ek-adm-preview')) return;
    ekShowWord(w.dataset.w);
  }
});
document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'ek-search') ekSearch(e.target.value);
  if (e.target && e.target.dataset && e.target.dataset.ekSlider) ekGoPage(+e.target.value);
});
document.addEventListener('change', function (e) {
  if (e.target && e.target.dataset && e.target.dataset.ekZoom) { EK.zoom = +e.target.value || 100; ekPaginate(); ekRender(); }
});
document.addEventListener('keydown', function (e) {
  const pg = document.getElementById('page-grammar');
  if (!pg || !pg.classList.contains('active') || !EK.pages.length) return;
  if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
    if (e.key === 'Enter' && e.target.classList.contains('ek-blank')) { ekCheckAct(e.target.dataset.a); }
    return;
  }
  if (e.key === 'ArrowRight') { ekStep(1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { ekStep(-1); e.preventDefault(); }
  if (e.key === 'Escape') { const w = document.getElementById('ek-wrap'); if (w && w.classList.contains('ek-fs')) { w.classList.remove('ek-fs'); setTimeout(() => { ekPaginate(); ekRender(); }, 40); } }
});
let _ekRsz = null;
window.addEventListener('resize', function () {
  clearTimeout(_ekRsz);
  _ekRsz = setTimeout(() => {
    const pg = document.getElementById('page-grammar');
    if (pg && pg.classList.contains('active') && EK.pages.length) { ekPaginate(); ekGoPage(EK.cur); }
  }, 250);
});

/* ============================================================
   YÖNETİM: E-KİTAP EDİTÖRÜ
   ============================================================ */
const EKA = { editId: null, topics: [], lastParse: null };

async function ekAdmInit() {
  await ekTopicsFetch();
  ekAdmList();
}
async function ekAdmList() {
  const box = document.getElementById('ek-adm-list'); if (!box) return;
  document.getElementById('ek-adm-editor').style.display = 'none';
  box.style.display = '';
  box.innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
  let rows = [];
  try { const { data } = await sb.from('ek_units').select('id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, kontrol_say, updated_at, toc').order('modul_no').order('unite_no'); rows = data || []; } catch (e) {}
  let h = `<div class="mail-actions" style="margin-bottom:14px;"><button class="set-btn" onclick="ekAdmNew()">+ Yeni ünite (içe aktar)</button></div>`;
  if (!rows.length) h += '<div class="profile-empty">Henüz ünite yok. "Yeni ünite" ile içerik formatındaki metni yapıştırarak başla.</div>';
  rows.forEach(r => {
    const ders = (r.toc || []).filter(t => t.tur === 'ders').length;
    h += `<div class="cw-row">
      <div class="cw-main"><b>Modül ${r.modul_no} · Ünite ${r.unite_no}</b> — ${ekEsc(r.unite_ad || '')}
        <span class="cw-cat">${ekEsc(r.seviye || '')}</span>
        <span class="cw-cat" style="background:${r.yayinda ? '#dcfce7' : '#fef3c7'}">${r.yayinda ? 'Yayında' : 'Taslak'}</span>
        ${r.kontrol_say ? `<span class="cw-cat" style="background:#fee2e2">${r.kontrol_say} etkinlik kontrol edilecek</span>` : ''}
        <div class="err-meta">${ders} ders · son güncelleme ${new Date(r.updated_at).toLocaleString('tr-TR')}</div></div>
      <div class="cw-acts">
        <button class="mail-act" onclick="ekAdmEdit(${r.id})">Düzenle</button>
        <button class="mail-act" onclick="ekAdmToggle(${r.id}, ${!r.yayinda})">${r.yayinda ? 'Yayından kaldır' : 'Yayınla'}</button>
        <button class="mail-act red" onclick="ekAdmDelete(${r.id})">Sil</button>
      </div></div>`;
  });
  box.innerHTML = h;
}
function ekAdmOpenEditor(src, id) {
  EKA.editId = id || null;
  document.getElementById('ek-adm-list').style.display = 'none';
  document.getElementById('ek-adm-editor').style.display = '';
  document.getElementById('ek-src').value = src || '';
  document.getElementById('ek-adm-title').textContent = id ? 'Üniteyi düzenle' : 'Yeni ünite';
  document.getElementById('ek-adm-report').innerHTML = '';
  document.getElementById('ek-adm-preview').innerHTML = '<div class="profile-empty">Önizleme için "Kontrol et ve önizle"ye bas.</div>';
}
function ekAdmNew() { ekAdmOpenEditor('', null); }
async function ekAdmEdit(id) {
  try { const { data } = await sb.from('ek_units').select('kaynak').eq('id', id).single(); ekAdmOpenEditor(data ? data.kaynak : '', id); }
  catch (e) { uiAlert('Ünite açılamadı.'); }
}
function ekAdmCheck() {
  const src = document.getElementById('ek-src').value;
  const p = ekParse(src); EKA.lastParse = p;
  const bilinen = new Set(EKA.topics.map(t => t.kod));
  const bilinmeyen = [...p.konular].filter(k => !bilinen.has(k));
  const rep = document.getElementById('ek-adm-report');
  let h = `<div class="ek-rep-sum">
    <span>${p.sections.filter(s => s.tur === 'ders').length} ders</span><span>${p.actSay} etkinlik</span>
    <span class="${p.errors.length ? 'bad' : 'good'}">${p.errors.length} hata</span><span>${p.warnings.length + bilinmeyen.length} uyarı</span>
    ${p.kontrolSay ? `<span class="warn">${p.kontrolSay} etkinlik kontrol edilecek</span>` : ''}</div>`;
  p.errors.forEach(x => { h += `<div class="ek-rep-row bad"><b>Satır ${x.ln}</b> ${ekEsc(x.msg)}</div>`; });
  p.warnings.forEach(x => { h += `<div class="ek-rep-row warn"><b>Satır ${x.ln}</b> ${ekEsc(x.msg)}</div>`; });
  if (bilinmeyen.length) h += `<div class="ek-rep-row warn"><b>Konu</b> Konu listesinde olmayan kodlar: ${bilinmeyen.map(ekEsc).join(', ')} — Konu Yönetimi'nden ekleyebilirsin.</div>`;
  rep.innerHTML = h;
  // Önizleme (akışlı, sayfasız)
  const prev = document.getElementById('ek-adm-preview');
  prev.innerHTML = '';
  ekBuildSections({ sections: p.sections }, 'admin').forEach(s => s.els.forEach(x => {
    if (x.pb) prev.appendChild(ekEl('<div class="ek-pb-mark">— elle sayfa sonu —</div>'));
    else prev.appendChild(x.el);
  }));
  prev.querySelectorAll('.ek-act').forEach(el => {
    const reg = EK_ACT[el.dataset.act];
    if (reg && reg.act && reg.act.kontrol) el.classList.add('ek-kontrol');
  });
  return p;
}
async function ekAdmSave(yayinla) {
  const p = ekAdmCheck();
  if (p.errors.length) { uiAlert('Önce ' + p.errors.length + ' hatayı düzeltmelisin (raporda satır numaralarıyla listelendi).'); return; }
  const src = document.getElementById('ek-src').value;
  const toc = p.sections.map(s => ({ tur: s.tur, no: s.no, ad: s.ad }));
  if (p.actSay) toc.push({ tur: 'anahtar', no: null, ad: 'Cevap anahtarı' });
  const row = {
    modul_no: p.meta.modul_no, modul_ad: p.meta.modul_ad || null, unite_no: p.meta.unite_no, unite_ad: p.meta.unite_ad || null,
    seviye: p.meta.seviye || null, kaynak: src, toc, konular: [...p.konular], kontrol_say: p.kontrolSay,
    updated_at: new Date().toISOString()
  };
  if (yayinla !== undefined) row.yayinda = !!yayinla;
  try {
    let res;
    if (EKA.editId) res = await sb.from('ek_units').update(row).eq('id', EKA.editId).select('id').single();
    else res = await sb.from('ek_units').upsert(row, { onConflict: 'modul_no,unite_no' }).select('id').single();
    if (res.error) throw res.error;
    EKA.editId = res.data.id;
    toast(yayinla ? 'Ünite kaydedildi ve yayınlandı.' : 'Ünite taslak olarak kaydedildi.');
    EK.loaded = false; if (EK.unit && EK.unit.id === EKA.editId) { EK.unit = null; EK.pages = []; }
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
}
async function ekAdmToggle(id, yayinda) {
  try { await sb.from('ek_units').update({ yayinda }).eq('id', id); EK.loaded = false; ekAdmList(); } catch (e) {}
}
async function ekAdmDelete(id) {
  if (!(await uiConfirm('Bu ünite ve tüm içeriği silinsin mi? Bu işlem geri alınamaz.', 'Üniteyi Sil', { danger: true }))) return;
  try { await sb.from('ek_units').delete().eq('id', id); EK.loaded = false; if (EK.unit && EK.unit.id === id) EK.unit = null; ekAdmList(); } catch (e) {}
}
function ekAdmInsert(txt) {
  const ta = document.getElementById('ek-src'); if (!ta) return;
  const s = ta.selectionStart, e2 = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e2);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + txt.length;
}
async function ekAdmImage(ev) {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  if (f.size > 3 * 1024 * 1024) { uiAlert('Görsel en fazla 3 MB olabilir.'); return; }
  const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ad = Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
  try {
    const { error } = await sb.storage.from('docs').upload('ekitap/' + ad, f, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    ekAdmInsert('\n![](' + ad + ')\n');
    toast('Görsel yüklendi ve eklendi.');
  } catch (e) { uiAlert('Görsel yüklenemedi: ' + ((e && e.message) || e)); }
  ev.target.value = '';
}
function ekAdmCopyFormat() {
  const liste = EKA.topics.map(t => `${t.kod} | ${t.ad}`).join('\n');
  try { navigator.clipboard.writeText(liste); toast('Konu listesi kopyalandı (AI talimatındaki yere yapıştır).'); } catch (e) { uiAlert(liste); }
}

/* ============================================================
   YÖNETİM: KONU YÖNETİMİ
   ============================================================ */
async function ekTopicsFetch() {
  try { const { data } = await sb.from('topics').select('*').order('sort').order('kod'); EKA.topics = data || []; } catch (e) { EKA.topics = []; }
}
async function ekTopicsInit() { await ekTopicsFetch(); ekTopicsRender(); }
function ekTopicsRender() {
  const box = document.getElementById('ek-topics-list'); if (!box) return;
  const sel = document.getElementById('tp-ust');
  if (sel) sel.innerHTML = '<option value="">— Üst konu yok —</option>' + EKA.topics.map(t => `<option value="${ekEsc(t.kod)}">${ekEsc(t.ad)} (${ekEsc(t.kod)})</option>`).join('');
  if (!EKA.topics.length) { box.innerHTML = '<div class="profile-empty">Henüz konu yok. Aşağıdan tek tek veya toplu ekleyebilirsin.</div>'; return; }
  const cocuk = {}; EKA.topics.forEach(t => { const u = t.ust_kod || ''; (cocuk[u] = cocuk[u] || []).push(t); });
  const kodlar = new Set(EKA.topics.map(t => t.kod));
  const satir = (t, d) => `<div class="cw-row" style="padding-left:${12 + d * 22}px">
      <div class="cw-main"><b>${ekEsc(t.ad)}</b> <span class="cw-cat">${ekEsc(t.kod)}</span>${t.seviye ? `<span class="cw-cat">${ekEsc(t.seviye)}</span>` : ''}</div>
      <div class="cw-acts"><button class="mail-act" onclick="ekTopicEdit('${ekEsc(t.kod)}')">Düzenle</button>
        <button class="mail-act red" onclick="ekTopicDelete('${ekEsc(t.kod)}')">Sil</button></div></div>`;
  const agac = (u, d) => (cocuk[u] || []).map(t => satir(t, d) + agac(t.kod, d + 1)).join('');
  let h = agac('', 0);
  // Üst kodu listede olmayanlar (yetim)
  EKA.topics.filter(t => t.ust_kod && !kodlar.has(t.ust_kod)).forEach(t => { h += satir(t, 0); });
  box.innerHTML = `<div class="err-meta" style="margin-bottom:8px">${EKA.topics.length} konu</div>` + h;
}
function ekTopicEdit(kod) {
  const t = EKA.topics.find(x => x.kod === kod); if (!t) return;
  document.getElementById('tp-kod').value = t.kod;
  document.getElementById('tp-ad').value = t.ad || '';
  document.getElementById('tp-ust').value = t.ust_kod || '';
  document.getElementById('tp-sev').value = t.seviye || '';
  document.getElementById('tp-kod').focus();
}
function ekKodTemizle(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
async function ekTopicSave() {
  const kod = ekKodTemizle(document.getElementById('tp-kod').value);
  const ad = document.getElementById('tp-ad').value.trim();
  if (!kod || !ad) { uiAlert('Kod ve ad zorunlu.'); return; }
  const row = { kod, ad, ust_kod: document.getElementById('tp-ust').value || null, seviye: document.getElementById('tp-sev').value || null };
  try {
    const { error } = await sb.from('topics').upsert(row, { onConflict: 'kod' });
    if (error) throw error;
    ['tp-kod', 'tp-ad'].forEach(id => document.getElementById(id).value = '');
    toast('Konu kaydedildi.'); await ekTopicsInit();
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e)); }
}
async function ekTopicDelete(kod) {
  const alt = EKA.topics.filter(t => t.ust_kod === kod).length;
  if (!(await uiConfirm(`"${kod}" konusu silinsin mi?` + (alt ? ` ${alt} alt konunun üst bağlantısı kalkacak.` : ''), 'Konuyu Sil', { danger: true }))) return;
  try {
    if (alt) await sb.from('topics').update({ ust_kod: null }).eq('ust_kod', kod);
    await sb.from('topics').delete().eq('kod', kod);
    await ekTopicsInit();
  } catch (e) {}
}
async function ekTopicBulk() {
  const txt = document.getElementById('tp-bulk').value;
  const rows = []; const hatali = [];
  txt.split('\n').forEach((l, i) => {
    const s = l.trim(); if (!s) return;
    const p = s.split('|').map(x => x.trim());
    if (i === 0 && /^kod$/i.test(p[0])) return;
    const kod = ekKodTemizle(p[0]);
    if (!kod || !p[1]) { hatali.push(i + 1); return; }
    const ust = p[2] && p[2] !== '-' ? ekKodTemizle(p[2]) : null;
    rows.push({ kod, ad: p[1], ust_kod: ust, seviye: p[3] ? p[3].toUpperCase() : null, sort: i });
  });
  if (!rows.length) { uiAlert('Geçerli satır yok. Biçim: kod | ad | üst kod | seviye'); return; }
  try {
    const { error } = await sb.from('topics').upsert(rows, { onConflict: 'kod' });
    if (error) throw error;
    document.getElementById('tp-bulk').value = '';
    await uiAlert(rows.length + ' konu eklendi/güncellendi.' + (hatali.length ? ' Atlanan satırlar: ' + hatali.join(', ') : ''), 'Toplu Ekleme');
    await ekTopicsInit();
  } catch (e) { uiAlert('Eklenemedi: ' + ((e && e.message) || e)); }
}

if (typeof window !== 'undefined') {
  Object.assign(window, { ekOpen, ekAdmInit, ekAdmNew, ekAdmEdit, ekAdmCheck, ekAdmSave, ekAdmToggle, ekAdmDelete, ekAdmInsert,
    ekAdmImage, ekAdmCopyFormat, ekAdmList, ekTopicsInit, ekTopicSave, ekTopicDelete, ekTopicBulk, ekTopicEdit, ekParse });
}
