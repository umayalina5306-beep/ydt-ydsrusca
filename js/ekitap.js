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
function ekParse(src, opt) {
  opt = opt || {};
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const res = { meta: {}, sections: [], errors: [], warnings: [], konular: new Set(), kontrolSay: 0, actSay: 0, bolumNo: new Set(), kuralRef: [] };
  const err = (ln, msg) => res.errors.push({ ln, msg });
  const warn = (ln, msg) => res.warnings.push({ ln, msg });
  let sec = null, i = 0, curLn = 1;
  const P = b => { if (b && b.ln == null) b.ln = curLn; sec.blocks.push(b); };
  const ensureSec = (ln) => {
    if (!sec) {
      if (!opt.set) warn(ln, 'İçerik bir "# Ders N | Ad" başlığından önce başlıyor; "Giriş" bölümü olarak eklendi.');
      sec = opt.set ? { tur: 'set', no: null, ad: res.meta.baslik || 'Çalışma seti', altbaslik: '', konular: [], blocks: [] }
                    : { tur: 'giris', no: null, ad: 'Giriş', altbaslik: '', konular: [], blocks: [] };
      res.sections.push(sec);
    }
  };
  while (i < lines.length) {
    const raw = lines[i], line = raw.trim(), ln = i + 1; curLn = ln;
    if (!line) { i++; continue; }
    // Ünite üst bilgileri
    let mm;
    if ((mm = line.match(/^@mod[üu]l\s+(\d+)\s*\|\s*(.+)$/i))) { res.meta.modul_no = +mm[1]; res.meta.modul_ad = mm[2].trim(); i++; continue; }
    if ((mm = line.match(/^@[üu]nite\s+(\d+)\s*\|\s*(.+)$/i))) { res.meta.unite_no = +mm[1]; res.meta.unite_ad = mm[2].trim(); i++; continue; }
    if ((mm = line.match(/^@set\s+(.+)$/i))) { res.meta.baslik = mm[1].trim(); i++; continue; }
    if ((mm = line.match(/^@a[çc][ıi]klama\s+(.+)$/i))) { res.meta.aciklama = mm[1].trim(); i++; continue; }
    if ((mm = line.match(/^@kitap\s+(\d+)\s*\.\s*(\d+)/i))) { res.meta.kitap = { m: +mm[1], u: +mm[2] }; i++; continue; }
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
    if (/^---\s*sayfa\s*---$/i.test(line)) { P({ t: 'pagebreak' }); i++; continue; }
    // Başlıklar
    if ((mm = line.match(/^##\s+(\d+(?:\.\d+)*)\s+(.+)$/))) {
      if (res.bolumNo.has(mm[1])) warn(ln, 'Bölüm numarası ' + mm[1] + ' tekrar kullanılmış.');
      res.bolumNo.add(mm[1]); P({ t: 'h2', no: mm[1], text: mm[2].trim() }); i++; continue;
    }
    if ((mm = line.match(/^##\s+(.+)$/))) { P({ t: 'h2', no: '', text: mm[1].trim() }); i++; continue; }
    if ((mm = line.match(/^###\s+(.+)$/))) { P({ t: 'h3', text: mm[1].trim() }); i++; continue; }
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
        if (act) { P(act); res.actSay++; if (act.kontrol) res.kontrolSay++; (act.konu || []).forEach(k => res.konular.add(k)); }
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
        P({ t: 'kartlar', cards, son: j + 1 });
      } else if (tip === 'kutular') {
        const kutular = body.map(l => l.trim()).filter(Boolean).map(l => {
          const q = l.match(/^\[(мн|м|ж|с)\]\s*(.*)$/); if (!q) return null;
          const p = q[2].split('|').map(x => x.trim());
          return { c: EK_CINS[q[1]], baslik: p[0] || '', aciklama: p[1] || '', ornek: p.slice(2) };
        }).filter(Boolean);
        P({ t: 'kutular', kutular });
      } else if (tip === 'kelimeler') {
        const kel = body.map(l => l.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); return { ic: p[0] || '', ru: p[1] || '', tr: p[2] || '' }; });
        P({ t: 'kelimeler', kel });
      } else if (tip === 'örnek') {
        const ornek = body.map(l => l.trim()).filter(Boolean).map(l => { const k = l.indexOf(' = '); return k > -1 ? { ru: l.slice(0, k).trim(), tr: l.slice(k + 3).trim() } : { ru: l, tr: '' }; });
        P({ t: 'ornek', ornek });
      } else {
        P({ t: 'kutu', tur: tip, baslik: rest || EK_KUTULAR[tip], body: ekParseSimple(body) });
      }
      i = j + 1; continue;
    }
    // Düz içerik (paragraf, liste, tablo, görsel) — bir sonraki özel satıra kadar
    const chunk = [], chunkLn = i + 1;
    while (i < lines.length) {
      const s = lines[i].trim();
      if (/^(#|@|:::|---\s*sayfa)/i.test(s)) break;
      chunk.push(lines[i]); i++;
    }
    ekParseSimple(chunk, chunkLn).forEach(b => P(b));
  }
  // Doğrulamalar
  if (opt.set) {
    if (!res.meta.baslik) err(1, '"@set Başlık" satırı eksik.');
    if (!res.meta.seviye) warn(1, '"@seviye" satırı eksik.');
    if (!res.actSay) err(1, 'Sette hiç etkinlik yok.');
    if (res.kuralRef.length && !res.meta.kitap) warn(res.kuralRef[0].ln, '"kural:" kullanılmış ama "@kitap M.Ü" satırı yok; "Kuralı gör" butonu kitabı açamaz.');
    return res;
  }
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
function ekParseSimple(lines, baseLn) {
  const out = []; let para = [], list = null, pBas = 0;
  const L = k => baseLn ? baseLn + k : undefined;
  const flushP = () => { if (para.length) { out.push({ t: 'p', text: para.join(' '), ln: L(pBas) }); para = []; } };
  const flushL = () => { if (list) { out.push(list); list = null; } };
  for (let k = 0; k < lines.length; k++) {
    const s = lines[k].trim();
    if (!s) { flushP(); flushL(); continue; }
    let m;
    if (s.startsWith('|')) {
      flushP(); flushL();
      const rows = [], tBas = k;
      while (k < lines.length && lines[k].trim().startsWith('|')) {
        const r = lines[k].trim();
        if (!/^\|[\s:|-]+\|?$/.test(r)) rows.push(r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        k++;
      }
      k--; out.push({ t: 'table', rows, ln: L(tBas) }); continue;
    }
    if ((m = s.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) { flushP(); flushL(); out.push({ t: 'img', alt: m[1], src: m[2], ln: L(k) }); continue; }
    if ((m = s.match(/^[-•]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [], ln: L(k) }; } list.items.push(m[1]); continue; }
    if ((m = s.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [], ln: L(k) }; } list.items.push(m[1]); continue; }
    flushL(); if (!para.length) pBas = k; para.push(s);
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
  const o = { ln: it.ln, prompt: [], opts: [], ans: null, tf: null, alan: {}, adimlar: [], raw: (it.lines || []).slice() };
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
const EK_SCOPE = { reader: [], admin: [], gw: [] };
let _ekScope = 'reader';
let _ekCurKey = '';

function ekBlankInput(ctx, alts) {
  const reg = EK_ACT[ctx.act];
  const bi = reg.blanks.length;
  reg.blanks.push({ alts, item: ctx.item == null ? -1 : ctx.item });
  // Kiril harfleri (ы, ж, ш…) '0' karakterinden geniştir → 1.35 kat pay
  const w = Math.max(4, Math.min(26, Math.ceil(Math.max(...alts.map(a => a.length)) * 1.35) + 2));
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
      const k = { ozet: 'ÜNİTE ÖZETİ', okuma: 'OKUMA', test: 'ÜNİTE TESTİ', anahtar: 'CEVAP ANAHTARI', giris: 'GİRİŞ', set: 'ÇALIŞMA SETİ' }[sec.tur] || '';
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
  const reg = EK_ACT[id] = { blanks: [], items: [], act, key: _ekCurKey, scope: _ekScope };
  EK_SCOPE[_ekScope].push(id);
  const motor = ekEngineKind(act) && ekEngineInit(reg, ekEngineKind(act));
  const faz2 = !motor && (EK_FAZ2.has(act.tip) || (act.tip === 'es-zit' && !act.items.some(it => it.opts.length)));
  const a = act.alanlar;
  let h = `<div class="ek-act" data-act="${id}">
    <div class="ek-act-h"><span class="ek-ic">${EK_IC.etkinlik}</span><span class="ek-act-tip">${EK_TIPLER[act.tip]}</span>
      ${faz2 ? '<span class="ek-act-soon">Etkileşim yakında</span>' : ''}</div>
    <div class="ek-act-y">${ekInline(a['yönerge'] || a['görev'] || '')}</div>`;
  if (a['durum']) h += `<div class="ek-act-durum">${ekInline(a['durum'])}</div>`;
  if (a['örnekler']) h += `<div class="ek-act-ornekler">${ekInline(a['örnekler'])}</div>`;
  if (a['ses']) h += `<div class="ek-act-ses"><button class="ek-say ek-say-lg" data-ek="speak" data-t="${ekEsc(a['ses'])}">${EK_IC.ses}<span>Dinle</span></button></div>`;
  if (act.metin) h += act.tip === 'kanit-goster' ? ekKanitHTML(id, act.metin)
    : `<div class="ek-act-metin">${act.metin.split(/\n\s*\n/).map(p => `<p>${ekInline(p.replace(/\n/g, ' '))}</p>`).join('')}</div>`;
  if (a['kontrol-listesi']) h += `<ul class="ek-act-kl">${a['kontrol-listesi'].split('|').map(x => `<li>${ekInline(x.trim())}</li>`).join('')}</ul>`;

  if (motor) { h += `<div class="ek-act-body">${ekEngineBody(id)}</div></div>`; return ekEl(h); }
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
      ${act.tip === 'kanit-goster' ? `<button class="ek-btn ghost" data-ek="kanitchk" data-a="${id}">Kanıtı kontrol et</button>` : ''}
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
  if (toplam) ekLog(actId, dogru === toplam);
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
  ekFeedback(actId, n, ok); ekLog(actId, ok);
}
function ekTF(actId, n, v) {
  const reg = EK_ACT[actId]; const it = reg && reg.items[n]; if (!it) return;
  const ok = (v === '1') === it.tf;
  document.querySelectorAll(`.ek-act[data-act="${actId}"] .ek-it[data-i="${n}"] .ek-opt`).forEach(b => {
    b.classList.remove('ok', 'no'); if (b.dataset.v === v) b.classList.add(ok ? 'ok' : 'no');
  });
  ekFeedback(actId, n, ok); ekLog(actId, ok);
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
   FAZ 2 · ETKİLEŞİM MOTORLARI
   sıralama · eşleştirme · gruplama · metinde tıklama · adım adım · telaffuz
   Hepsi tıklayarak (dokunmatik uyumlu) ve sürükle-bırakla çalışır.
   ============================================================ */
const EK_MOTOR = {
  'cumle-sirala': 'order', 'dinle-sirala': 'order', 'diyalog-sirala': 'order', 'kelime-olustur': 'order',
  'eslestir': 'match', 'es-zit': 'match', 'kurala-bagla': 'group', 'kelime-ailesi': 'group',
  'hata-bul': 'text', 'metin-analiz': 'text', 'hata-duzelt': 'text', 'adim-adim': 'adim', 'telaffuz': 'tel'
};
let EK_DRAG = null;
function ekTemizMetin(s) {
  return String(s || '').replace(/\{(?:мн|м|ж|с)\*?(?:=[^:{}]+)?:([^{}]+)\}/g, (m, x) => x.replace(/\[([^\]]*)\]/g, '$1'))
    .replace(/\{=[^:{}]+:([^{}]+)\}/g, '$1').replace(/\*\*|==/g, '');
}
function ekFarkliKaristir(n) {
  const base = [...Array(n).keys()]; if (n < 2) return base;
  for (let t = 0; t < 6; t++) { const k = ekKaristir(base); if (k.some((v, i) => v !== i)) return k; }
  return base.reverse();
}
function ekEngineKind(act) {
  const k = EK_MOTOR[act.tip]; if (!k) return null;
  if (act.tip === 'es-zit' && act.items.some(it => it.opts.length)) return null;   // seçmeli biçimli eş/zıt
  return k;
}
/* Etkinlik verisinden motor durumunu kur; kurulamazsa null (önizlemeye düşer) */
function ekEngineInit(reg, kind) {
  const act = reg.act, lead = (act.lead || []).map(l => l.trim()).filter(Boolean);
  const eng = { kind, items: [] };
  if (kind === 'order') {
    const kaynak = act.items.length ? act.items : [{ prompt: lead, alan: {}, raw: lead }];
    kaynak.forEach(it => {
      let parts = [], correct = null, target = null;
      if (act.tip === 'kelime-olustur') {
        const s = it.alan['parçalar'] || ''; const [l, r] = s.split('=>');
        parts = String(l || '').split(',').map(x => x.trim()).filter(Boolean);
        target = (r || '').trim() || parts.join('');
      } else if (act.tip === 'diyalog-sirala') {
        parts = it.prompt.map(x => x.trim()).filter(x => /^-\s*/.test(x)).map(x => x.replace(/^-\s*/, ''));
        correct = parts.slice();
      } else {
        parts = it.prompt.join(' ').split('|').map(x => x.trim()).filter(Boolean);
        correct = parts.slice();
      }
      if (parts.length < 2) return;
      eng.items.push({ parts, correct, target, pool: ekFarkliKaristir(parts.length), ans: [], ses: it.alan['ses'], ipucu: it.alan['ipucu'], neden: it.alan['neden'], dialog: act.tip === 'diyalog-sirala' });
    });
  } else if (kind === 'match') {
    const pairs = lead.filter(l => / = /.test(l)).map(l => { const i = l.indexOf(' = '); return [l.slice(0, i).trim(), l.slice(i + 3).trim()]; });
    if (pairs.length < 2) return null;
    eng.items.push({ lefts: pairs.map(p => p[0]), rights: pairs.map(p => p[1]), order: ekFarkliKaristir(pairs.length), slots: pairs.map(() => null), sel: null });
  } else if (kind === 'group') {
    const groups = [], chips = [];
    lead.forEach(l => { const m = l.match(/^\[([^\]]+)\]\s*(.*)$/); if (!m) return; groups.push(m[1].trim());
      m[2].split(',').map(x => x.trim()).filter(Boolean).forEach(t => chips.push({ t, g: groups.length - 1 })); });
    if (groups.length < 2 || !chips.length) return null;
    eng.items.push({ groups, chips, order: ekKaristir([...chips.keys()]), place: chips.map(() => null), sel: null });
  } else if (kind === 'text') {
    const kaynak = act.items.length ? act.items : [{ prompt: lead, alan: {} }];
    kaynak.forEach(it => {
      const txt = ekTemizMetin(it.prompt.join(' '));
      const toks = []; const re = /\[\[([^\]]+)\]\]|([A-Za-zА-Яа-яЁёÇĞİÖŞÜçğıöşü]+(?:-[A-Za-zА-Яа-яЁёÇĞİÖŞÜçğıöşü]+)*)/g;
      let m, last = 0;
      while ((m = re.exec(txt))) {
        if (m.index > last) toks.push({ t: txt.slice(last, m.index), w: false });
        if (m[1] !== undefined) { const p = m[1].split('=>'); toks.push({ t: p[0].trim(), w: true, target: true, fix: p[1] ? p[1].trim() : null }); }
        else toks.push({ t: m[2], w: true, target: false });
        last = re.lastIndex;
      }
      if (last < txt.length) toks.push({ t: txt.slice(last), w: false });
      if (!toks.some(t => t.target)) return;
      eng.items.push({ toks, sel: new Set(), fixv: {}, checked: false, neden: it.alan['neden'], duzelt: act.tip === 'hata-duzelt' });
    });
  } else if (kind === 'adim') {
    act.items.forEach(it => {
      const steps = []; let cur = null;
      (it.raw || []).forEach(l => {
        const s = l.trim(); if (!s) return; let m;
        if ((m = s.match(/^adım:\s*(.*)$/i))) { if (cur) steps.push(cur); cur = { text: m[1], opts: [] }; }
        else if ((m = s.match(/^\[( |x|X)\]\s*(.*)$/)) && cur) cur.opts.push({ t: m[2], ok: m[1].toLowerCase() === 'x' });
        else if (cur && !/^[a-zçğıöşü-]+:/i.test(s)) cur.text += ' ' + s;
      });
      if (cur) steps.push(cur);
      steps.forEach(st => { st.blanks = []; const re = /\{\{([^}]+)\}\}/g; let m; while ((m = re.exec(st.text))) st.blanks.push(m[1].split('|').map(x => x.trim())); });
      if (steps.length) eng.items.push({ steps, done: 0, wrong: null });
    });
  } else if (kind === 'tel') {
    act.items.forEach(it => { const t = ekTemizMetin(it.prompt.join(' ').trim()); if (t) eng.items.push({ t, url: null, rec: null, self: null }); });
  }
  if (!eng.items.length) return null;
  reg.eng = eng;
  return eng;
}
function ekChip(t, attrs, cls) { return `<span class="ek-chip ek-chip-btn ${cls || ''}" draggable="true" ${attrs}>${ekInline(t)}</span>`; }
function ekEngInner(id, n) {
  const reg = EK_ACT[id], eng = reg.eng, st = eng.items[n];
  const A = `data-a="${id}" data-i="${n}"`;
  if (eng.kind === 'order') {
    const lineCls = st.dialog ? 'ek-chip-line' : '';
    const ans = st.ans.map(k => ekChip(st.parts[k], `data-ek="ord" ${A} data-k="${k}" data-w="ans"`, lineCls)).join('');
    const pool = st.pool.map(k => ekChip(st.parts[k], `data-ek="ord" ${A} data-k="${k}" data-w="pool"`, lineCls)).join('');
    return `<div class="ek-ord-ans${st.dialog ? ' dlg' : ''}" data-dz="ans">${ans || `<span class="ek-dz-ph">${st.dialog ? 'Satırları buraya doğru sırayla yerleştir' : 'Parçaları buraya sırayla yerleştir'}</span>`}</div>
      <div class="ek-ord-pool${st.dialog ? ' dlg' : ''}" data-dz="pool">${pool}</div>`;
  }
  if (eng.kind === 'match') {
    const yerlesen = new Set(st.slots.filter(x => x != null));
    const rows = st.lefts.map((l, i) => {
      const k = st.slots[i];
      return `<div class="ek-mt-row"><span class="ek-mt-l">${ekInline(l)}</span>
        <span class="ek-mt-slot${k == null ? '' : ' full'}" data-ek="mslot" ${A} data-s="${i}" data-dz="slot">${k == null ? '<span class="ek-dz-ph">buraya</span>' : ekChip(st.rights[k], `data-ek="mpick" ${A} data-k="${k}" data-w="slot"`)}</span></div>`;
    }).join('');
    const pool = st.order.filter(k => !yerlesen.has(k)).map(k => ekChip(st.rights[k], `data-ek="mpick" ${A} data-k="${k}" data-w="pool"`, st.sel === k ? 'sel' : '')).join('');
    return `<div class="ek-mt-rows">${rows}</div><div class="ek-mt-pool" data-dz="pool">${pool || '<span class="ek-dz-ph">Hepsi yerleştirildi</span>'}</div>`;
  }
  if (eng.kind === 'group') {
    const boxes = st.groups.map((g, gi) => `<div class="ek-gr-box" data-ek="gbox" ${A} data-g="${gi}" data-dz="g">
        <div class="ek-gr-h">${ekInline(g)}</div>
        <div class="ek-gr-items">${st.chips.map((c, k) => st.place[k] === gi ? ekChip(c.t, `data-ek="gpick" ${A} data-k="${k}" data-w="g"`) : '').join('') || '<span class="ek-dz-ph">buraya bırak</span>'}</div></div>`).join('');
    const pool = st.order.filter(k => st.place[k] == null).map(k => ekChip(st.chips[k].t, `data-ek="gpick" ${A} data-k="${k}" data-w="pool"`, st.sel === k ? 'sel' : '')).join('');
    return `<div class="ek-gr-boxes">${boxes}</div><div class="ek-gr-pool" data-dz="pool">${pool || '<span class="ek-dz-ph">Hepsi yerleştirildi</span>'}</div>`;
  }
  if (eng.kind === 'text') {
    return `<div class="ek-tx">${st.toks.map((t, k) => {
      if (!t.w) return ekEsc(t.t);
      const secili = st.sel.has(k);
      let cls = 'ek-tok' + (secili ? ' sel' : '');
      if (st.checked) { if (secili && t.target) cls += ' ok'; else if (secili) cls += ' no'; else if (t.target) cls += ' miss'; }
      let h = `<span class="${cls}" data-ek="tok" ${A} data-k="${k}">${ekEsc(t.t)}</span>`;
      if (st.duzelt && secili) h += ` <input class="ek-blank ek-fix" data-a="${id}" data-i="${n}" data-k="${k}" value="${ekEsc(st.fixv[k] || '')}" placeholder="doğrusu" autocomplete="off" spellcheck="false" style="width:${Math.max(6, t.t.length + 2)}ch">`;
      return h;
    }).join('')}</div>`;
  }
  if (eng.kind === 'adim') {
    return st.steps.map((s, k) => {
      if (k > st.done) return '';
      const solved = k < st.done;
      let body;
      if (s.opts.length) {
        body = `<div class="ek-opts">${s.opts.map((o, j) => `<button class="ek-opt${solved && o.ok ? ' ok' : ''}${st.wrong === k + ':' + j ? ' no' : ''}" data-ek="stepopt" ${A} data-s="${k}" data-o="${j}"${solved ? ' disabled' : ''}>${ekInline(o.t)}</button>`).join('')}</div>`;
      } else if (s.blanks.length) {
        let bi = 0;
        const t = s.text.replace(/\{\{([^}]+)\}\}/g, () => `<input class="ek-blank${solved ? ' ok' : ''}" data-sb="${bi++}" ${solved ? 'disabled' : ''} autocomplete="off" spellcheck="false" style="width:9ch">`);
        body = `<div class="ek-step-t">${t}</div>${solved ? '' : `<button class="ek-btn sm" data-ek="stepchk" ${A} data-s="${k}">Kontrol et</button>`}`;
      } else body = solved ? '' : `<button class="ek-btn sm" data-ek="stepnext" ${A} data-s="${k}">Devam</button>`;
      return `<div class="ek-step${solved ? ' solved' : ''}"><div class="ek-step-h"><span class="ek-step-no">${k + 1}</span>${s.opts.length || !s.blanks.length ? ekInline(s.text) : 'Yazın'}</div>${body}</div>`;
    }).join('') + (st.done >= st.steps.length ? '<div class="ek-ok-t" style="margin-top:6px">Tüm adımlar tamamlandı.</div>' : '');
  }
  if (eng.kind === 'tel') {
    return `<div class="ek-tel">
      <button class="ek-say" data-ek="speak" data-t="${ekEsc(st.t)}" title="Dinle">${EK_IC.ses}</button>
      <span class="ek-tel-t">${ekInline(st.t)}</span>
      <button class="ek-btn sm${st.rec ? ' rec' : ''}" data-ek="rec" ${A}>${st.rec ? 'Durdur' : (st.url ? 'Tekrar kaydet' : 'Kaydet')}</button>
      ${st.url ? `<button class="ek-btn sm ghost" data-ek="play" ${A}>Kaydımı dinle</button>
        <span class="ek-tel-self">${st.self == null ? `<button class="ek-btn sm ghost" data-ek="self" ${A} data-v="1">İyi söyledim</button><button class="ek-btn sm ghost" data-ek="self" ${A} data-v="0">Tekrar çalışmalıyım</button>` : (st.self ? '<span class="ek-ok-t">İyi</span>' : '<span class="ek-no-t">Tekrar çalışılacak</span>')}</span>` : ''}
    </div>`;
  }
  return '';
}
function ekEngineBody(id) {
  const reg = EK_ACT[id], eng = reg.eng, cok = eng.items.length > 1;
  let h = '';
  eng.items.forEach((st, n) => {
    let bas = '';
    if (st.ses) bas += `<button class="ek-say" data-ek="speak" data-t="${ekEsc(st.ses)}" title="Dinle">${EK_IC.ses}</button>`;
    if (st.ipucu) bas += `<span class="ek-it-ipucu" style="margin:0">İpucu: ${ekInline(st.ipucu)}</span>`;
    h += `<div class="ek-it" data-i="${n}">${(cok || bas) ? `<div class="ek-it-q">${cok ? `<span class="ek-it-no">${n + 1}.</span>` : ''}${bas}</div>` : ''}
      <div class="ek-eng ek-eng-${eng.kind}" data-a="${id}" data-i="${n}">${ekEngInner(id, n)}</div><div class="ek-it-fb"></div></div>`;
  });
  if (eng.kind !== 'adim' && eng.kind !== 'tel') {
    h += `<div class="ek-act-f"><button class="ek-btn" data-ek="echeck" data-a="${id}">Kontrol et</button>
      <button class="ek-btn ghost" data-ek="eshow" data-a="${id}">Cevapları göster</button>
      <button class="ek-btn ghost" data-ek="ereset" data-a="${id}">Sıfırla</button><span class="ek-act-skor" id="ek-skor-${id}"></span></div>`;
  }
  return h;
}
function ekEngRefresh(id, n) {
  const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`);
  if (box) { box.innerHTML = ekEngInner(id, n); box.classList.remove('ok', 'no'); }
  const fb = document.querySelector(`.ek-act[data-act="${id}"] .ek-it[data-i="${n}"] .ek-it-fb`); if (fb) fb.innerHTML = '';
}
function ekEngFb(id, n, ok, msg) {
  const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`); if (box) { box.classList.toggle('ok', ok); box.classList.toggle('no', !ok); }
  const fb = document.querySelector(`.ek-act[data-act="${id}"] .ek-it[data-i="${n}"] .ek-it-fb`);
  const reg = EK_ACT[id], st = reg.eng.items[n], kural = reg.act.kural;
  if (fb) fb.innerHTML = ok ? '<span class="ek-ok-t">Doğru</span>' : `<span class="ek-no-t">${msg || 'Yanlış'}</span>` +
    (st.neden ? `<div class="ek-neden">${ekInline(st.neden)}</div>` : '') +
    (kural ? `<button class="ek-btn ghost sm" data-ek="kural" data-no="${ekEsc(kural)}">Kuralı gör (${ekEsc(kural)})</button>` : '');
}
/* Kontrol */
function ekEngCheck(id) {
  const reg = EK_ACT[id]; if (!reg || !reg.eng) return;
  const eng = reg.eng; let hepsi = true, dogruSay = 0, toplam = 0;
  eng.items.forEach((st, n) => {
    let ok = false, msg = '';
    if (eng.kind === 'order') {
      if (st.target != null) ok = ekNorm(st.ans.map(k => st.parts[k]).join('')) === ekNorm(st.target);
      else ok = st.ans.length === st.correct.length && st.ans.every((k, j) => ekNorm(st.parts[k]) === ekNorm(st.correct[j]));
      if (!ok && st.target == null && st.pool.length) msg = 'Eksik parça var';
      toplam++; if (ok) dogruSay++;
    } else if (eng.kind === 'match') {
      const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`);
      st.slots.forEach((k, i) => { toplam++; const d = k === i; if (d) dogruSay++;
        const el = box && box.querySelectorAll('.ek-mt-slot')[i]; if (el) { el.classList.toggle('ok', d); el.classList.toggle('no', !d); } });
      ok = st.slots.every((k, i) => k === i); if (!ok && st.slots.some(k => k == null)) msg = 'Boş kalan eşleşme var';
      ekEngFbOnly(id, n, ok, msg); if (!ok) hepsi = false; return;
    } else if (eng.kind === 'group') {
      const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`);
      st.chips.forEach((c, k) => { toplam++; const d = st.place[k] === c.g; if (d) dogruSay++;
        const el = box && box.querySelector(`.ek-chip[data-k="${k}"]`); if (el && st.place[k] != null) { el.classList.toggle('ok', d); el.classList.toggle('no', !d); } });
      ok = st.chips.every((c, k) => st.place[k] === c.g); if (!ok && st.place.some(x => x == null)) msg = 'Yerleştirilmemiş öğe var';
      ekEngFbOnly(id, n, ok, msg); if (!ok) hepsi = false; return;
    } else if (eng.kind === 'text') {
      st.checked = true;
      const hedef = st.toks.map((t, k) => t.target ? k : -1).filter(k => k >= 0);
      ok = hedef.every(k => st.sel.has(k)) && [...st.sel].every(k => st.toks[k].target);
      if (ok && st.duzelt) ok = hedef.every(k => st.toks[k].fix == null || ekNorm(st.fixv[k]) === ekNorm(st.toks[k].fix));
      toplam++; if (ok) dogruSay++;
      const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`); if (box) box.innerHTML = ekEngInner(id, n);
      if (st.duzelt && box) hedef.forEach(k => { const inp = box.querySelector(`.ek-fix[data-k="${k}"]`); if (inp && st.toks[k].fix != null) inp.classList.add(ekNorm(st.fixv[k]) === ekNorm(st.toks[k].fix) ? 'ok' : 'no'); });
      if (!ok && hedef.some(k => !st.sel.has(k))) msg = 'Bulunmamış olanlar var';
    }
    if (!ok) hepsi = false;
    ekEngFb(id, n, ok, msg);
  });
  const sk = document.getElementById('ek-skor-' + id); if (sk) sk.textContent = dogruSay + ' / ' + toplam + ' doğru';
  ekLog(id, hepsi);
}
function ekEngFbOnly(id, n, ok, msg) { ekEngFb(id, n, ok, msg); }
function ekEngShow(id) {
  const reg = EK_ACT[id]; if (!reg || !reg.eng) return;
  reg.eng.items.forEach((st, n) => {
    if (reg.eng.kind === 'order') {
      if (st.target != null) {           // hedefi oluşturan parçaları bul
        const bul = (kalan, kullan) => { if (!kalan) return kullan; for (let k = 0; k < st.parts.length; k++) { if (kullan.includes(k)) continue; const p = st.parts[k];
          if (ekNorm(kalan).startsWith(ekNorm(p))) { const r = bul(kalan.slice(p.length), kullan.concat(k)); if (r) return r; } } return null; };
        const yol = bul(st.target, []) || [];
        st.ans = yol; st.pool = [...st.parts.keys()].filter(k => !yol.includes(k));
      } else { st.ans = st.correct.map(c => st.parts.findIndex((p, k) => p === c)); st.pool = []; }
    } else if (reg.eng.kind === 'match') { st.slots = st.lefts.map((l, i) => i); st.sel = null; }
    else if (reg.eng.kind === 'group') { st.place = st.chips.map(c => c.g); st.sel = null; }
    else if (reg.eng.kind === 'text') { st.sel = new Set(st.toks.map((t, k) => t.target ? k : -1).filter(k => k >= 0)); st.toks.forEach((t, k) => { if (t.fix) st.fixv[k] = t.fix; }); st.checked = false; }
    ekEngRefresh(id, n);
    const box = document.querySelector(`.ek-eng[data-a="${id}"][data-i="${n}"]`); if (box) box.classList.add('shown');
  });
}
function ekEngReset(id) {
  const reg = EK_ACT[id]; if (!reg) return;
  ekEngineInit(reg, reg.eng.kind);
  reg.eng.items.forEach((st, n) => ekEngRefresh(id, n));
  const sk = document.getElementById('ek-skor-' + id); if (sk) sk.textContent = '';
  document.querySelectorAll(`.ek-eng[data-a="${id}"]`).forEach(b => b.classList.remove('shown'));
}
/* Tıklama etkileşimleri */
function ekEngClick(t) {
  const id = t.dataset.a, n = +t.dataset.i, reg = EK_ACT[id]; if (!reg || !reg.eng) return false;
  const st = reg.eng.items[n], a = t.dataset.ek, k = +t.dataset.k;
  if (a === 'ord') {
    if (t.dataset.w === 'pool') { st.pool = st.pool.filter(x => x !== k); st.ans.push(k); }
    else { st.ans = st.ans.filter(x => x !== k); st.pool.push(k); }
  } else if (a === 'mpick') {
    if (t.dataset.w === 'slot') { const i = st.slots.indexOf(k); if (i > -1) st.slots[i] = null; st.sel = null; }
    else st.sel = st.sel === k ? null : k;
  } else if (a === 'mslot') {
    if (t.closest('.ek-chip')) return true;
    const s = +t.dataset.s; if (st.sel == null) return true;
    st.slots[s] = st.sel; st.sel = null;
  } else if (a === 'gpick') {
    if (t.dataset.w === 'g') { st.place[k] = null; st.sel = null; }
    else st.sel = st.sel === k ? null : k;
  } else if (a === 'gbox') {
    if (t.closest('.ek-chip') || st.sel == null) return true;
    st.place[st.sel] = +t.dataset.g; st.sel = null;
  } else if (a === 'tok') {
    if (st.sel.has(k)) st.sel.delete(k); else st.sel.add(k); st.checked = false;
  } else if (a === 'stepopt') {
    const s = +t.dataset.s, o = +t.dataset.o, step = st.steps[s];
    if (step.opts[o].ok) { st.done = s + 1; st.wrong = null; if (st.done >= st.steps.length) ekLog(id, true); }
    else { st.wrong = s + ':' + o; ekLog(id, false); }
  } else if (a === 'stepchk') {
    const s = +t.dataset.s, step = st.steps[s];
    const box = t.closest('.ek-step'); const ins = box ? [...box.querySelectorAll('input[data-sb]')] : [];
    const ok = ins.length && ins.every((inp, j) => (step.blanks[j] || []).some(x => ekNorm(x) === ekNorm(inp.value)));
    if (ok) { st.done = s + 1; if (st.done >= st.steps.length) ekLog(id, true); }
    else { ins.forEach((inp, j) => inp.classList.toggle('no', !(step.blanks[j] || []).some(x => ekNorm(x) === ekNorm(inp.value)))); ekLog(id, false); return true; }
  } else if (a === 'stepnext') { st.done = +t.dataset.s + 1; }
  else if (a === 'rec') { ekRecord(id, n); return true; }
  else if (a === 'play') { if (st.url) new Audio(st.url).play().catch(() => {}); return true; }
  else if (a === 'self') { st.self = t.dataset.v === '1'; ekLog(id, st.self); }
  else return false;
  ekEngRefresh(id, n);
  return true;
}
async function ekRecord(id, n) {
  const st = EK_ACT[id].eng.items[n];
  if (st.rec) { try { st.rec.stop(); } catch (e) {} return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { if (typeof toast === 'function') toast('Bu tarayıcı ses kaydını desteklemiyor.'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream), parca = [];
    r.ondataavailable = e => { if (e.data && e.data.size) parca.push(e.data); };
    r.onstop = () => { stream.getTracks().forEach(tr => tr.stop()); st.url = URL.createObjectURL(new Blob(parca, { type: r.mimeType || 'audio/webm' })); st.rec = null; st.self = null; ekEngRefresh(id, n); };
    st.rec = r; r.start(); ekEngRefresh(id, n);
    setTimeout(() => { if (st.rec === r) { try { r.stop(); } catch (e) {} } }, 10000);
  } catch (e) { if (typeof toast === 'function') toast('Mikrofona erişilemedi. Tarayıcı izinlerini kontrol et.'); }
}
/* Kanıt gösterme: metindeki cümleler tıklanabilir */
function ekKanitHTML(id, metin) {
  const cumleler = metin.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  EK_ACT[id].kanit = { cumleler, sel: null };
  return `<div class="ek-act-metin ek-kanit-metin">${cumleler.map((c, k) => `<span class="ek-kanit-c" data-ek="kanit" data-a="${id}" data-k="${k}">${ekEsc(c)}</span>`).join(' ')}</div>
    <div class="ek-act-not">Cevabını verdikten sonra metinde kanıt olan cümleye tıkla.</div>`;
}
function ekKanitCheck(id) {
  const reg = EK_ACT[id]; if (!reg || !reg.kanit) return;
  const it = reg.items.find(x => x.alan['kanıt']); if (!it) return;
  const kn = reg.kanit; const el = document.querySelectorAll(`.ek-kanit-c[data-a="${id}"]`);
  const ok = kn.sel != null && ekNorm(kn.cumleler[kn.sel]).includes(ekNorm(it.alan['kanıt']));
  el.forEach((e, k) => { e.classList.remove('ok', 'no'); if (k === kn.sel) e.classList.add(ok ? 'ok' : 'no'); });
  const sk = document.getElementById('ek-skor-' + id); if (sk) sk.textContent = ok ? 'Kanıt doğru' : (kn.sel == null ? 'Önce bir cümle seç' : 'Kanıt bu cümlede değil');
  if (kn.sel != null) ekLog(id, ok);
}
/* Sürükle-bırak */
document.addEventListener('dragstart', function (e) {
  const c = e.target.closest && e.target.closest('.ek-eng .ek-chip-btn'); if (!c) return;
  EK_DRAG = { a: c.dataset.a, i: +c.dataset.i, k: +c.dataset.k, ek: c.dataset.ek };
  try { e.dataTransfer.setData('text/plain', 'ek'); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
  c.classList.add('dragging');
});
document.addEventListener('dragend', function (e) { const c = e.target.closest && e.target.closest('.ek-chip-btn'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.dz-over').forEach(x => x.classList.remove('dz-over')); });
document.addEventListener('dragover', function (e) {
  if (!EK_DRAG) return; const dz = e.target.closest && e.target.closest('[data-dz]'); if (!dz) return;
  const eng = dz.closest('.ek-eng'); if (!eng || eng.dataset.a !== EK_DRAG.a || +eng.dataset.i !== EK_DRAG.i) return;
  e.preventDefault(); document.querySelectorAll('.dz-over').forEach(x => x !== dz && x.classList.remove('dz-over')); dz.classList.add('dz-over');
});
document.addEventListener('drop', function (e) {
  if (!EK_DRAG) return; const dz = e.target.closest && e.target.closest('[data-dz]'); if (!dz) return;
  const engEl = dz.closest('.ek-eng'); if (!engEl || engEl.dataset.a !== EK_DRAG.a || +engEl.dataset.i !== EK_DRAG.i) return;
  e.preventDefault();
  const { a: id, i: n, k } = EK_DRAG; EK_DRAG = null;
  const reg = EK_ACT[id]; const st = reg.eng.items[n], z = dz.dataset.dz;
  if (reg.eng.kind === 'order') {
    st.ans = st.ans.filter(x => x !== k); st.pool = st.pool.filter(x => x !== k);
    if (z === 'ans') { const hedef = e.target.closest('.ek-chip-btn'); const hk = hedef ? +hedef.dataset.k : null; const pos = hk != null && hk !== k ? st.ans.indexOf(hk) : -1;
      if (pos > -1) st.ans.splice(pos, 0, k); else st.ans.push(k); }
    else st.pool.push(k);
  } else if (reg.eng.kind === 'match') {
    const i = st.slots.indexOf(k); if (i > -1) st.slots[i] = null;
    if (z === 'slot') st.slots[+dz.dataset.s] = k;
    st.sel = null;
  } else if (reg.eng.kind === 'group') {
    st.place[k] = z === 'g' ? +dz.dataset.g : null; st.sel = null;
  }
  ekEngRefresh(id, n);
});
/* Cevap kaydı (zayıf konu analizi için) */
function ekLog(id, dogru) {
  const reg = EK_ACT[id];
  if (reg && reg.scope === 'gw') { gwLog(reg, id, dogru); return; }
  if (!reg || reg.scope !== 'reader' || !EK.unit) return;
  reg.cozuldu = reg.cozuldu || dogru;
  const el = document.querySelector(`.ek-act[data-act="${id}"]`); if (el && dogru) el.classList.add('ek-cozuldu');
  if (typeof currentUser === 'undefined' || !currentUser || typeof sb === 'undefined') return;
  if (typeof logActivity === 'function') { try { logActivity('ekActs', 1); } catch (x) {} }
  sb.from('ek_answers').insert({ user_id: currentUser.id, unit_id: EK.unit.id, act_key: reg.key, tip: reg.act.tip, konular: reg.act.konu || [], dogru: !!dogru }).then(() => {}, () => {});
}

/* ============================================================
   OKUYUCU
   ============================================================ */
const EK = { list: [], unit: null, parsed: null, sections: [], pages: [], anchors: {}, secPage: [], cur: 0, single: false, zoom: 100, acik: {}, tab: 'kelime', loaded: false, saveT: null,
  tool: 'sec', color: 'y', ann: [], annHist: [], annFut: [], bid: {}, notes: [], cstats: {}, deck: null };

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
          <div class="ek-book" id="ek-book"><div class="ek-empty">Yükleniyor…</div></div>
          <div class="ek-bottom">
            <button class="ek-nav-btn" data-ek="prev"><svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>Önceki Sayfa</button>
            <input type="range" class="ek-slider" id="ek-slider" min="0" max="0" value="0" data-ek-slider="1">
            <span class="ek-bottom-n" id="ek-bottom-n">–</span>
            <span class="ek-bt-git" title="Sayfaya git"><input type="number" id="ek-rb-input" min="1" placeholder="Sayfa" aria-label="Sayfa numarası" autocomplete="off"><button class="ek-git-b" data-ek="gopg" aria-label="Git"><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="18" y2="12"/><polyline points="13 7 18 12 13 17"/></svg></button></span>
            <select class="ek-zoom" id="ek-zoom" data-ek-zoom="1" title="Yakınlaştır"><option value="90">%90</option><option value="100" selected>%100</option><option value="110">%110</option><option value="125">%125</option></select>
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
            <div id="ek-word"></div>
          </div>
        </aside>
      </div>
    </div>
    <div class="ek-view" id="ek-v-notlar" style="display:none"></div>
    <div class="ek-view" id="ek-v-kartlar" style="display:none"><div id="ek-cards"></div></div>
    <div class="ek-measure" id="ek-measure" aria-hidden="true"></div>
  </div>`;
}

/* Gramer sayfası açıldığında */
async function ekOpen() {
  if (EK._acilis) { EK._tekrar = true; return; }
  EK._acilis = true;
  try { await _ekOpen(); } finally {
    EK._acilis = false;
    if (EK._tekrar) { EK._tekrar = false; if (EK.pending) ekOpen(); }
  }
}
async function _ekOpen() {
  const host = document.getElementById('ek-host'); if (!host) return;
  if (!document.getElementById('ek-wrap')) {
    host.innerHTML = ekShellHTML();
  }
  const tree = document.getElementById('ek-tree'); if (tree) tree.style.display = '';
  if (!EK.loaded) await ekLoadList();
  ekRenderTree();
  if (!EK.list.length) {
    document.getElementById('ek-book').innerHTML = '<div class="ek-empty">Henüz yayınlanmış ünite yok.</div>';
    return;
  }
  if (EK.pending) {
    const pd = EK.pending; EK.pending = null;
    if (EK.list.some(x => x.id === pd.unitId)) {
      if (!EK.unit || EK.unit.id !== pd.unitId) await ekOpenUnit(pd.unitId, pd.sec != null ? pd.sec : undefined);
      else if (pd.sec != null) setTimeout(() => { ekPaginate(); ekGoPage(EK.secPage[pd.sec] || 0); }, 30);
      else setTimeout(() => { ekPaginate(); ekRender(); }, 30);
      if (pd.no) setTimeout(() => ekGoKural(pd.no), 350);
      return;
    }
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
  ekKelimeTopla(); ekKelimeListe();
  ekBidMap(); EK.deck = null;
  await Promise.all([ekAnnLoad(id), ekNotesLoad(id), ekCardStatsLoad(id)]);
  ekAnnRender();
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
  const out = secs.map((s, si) => {
    const tEl = ekBlockEl({ t: 'sectitle' }, s, si); tEl.dataset.bid = si + '-t'; if (s.ln) tEl.dataset.ln = s.ln;
    const els = [{ el: tEl, pb: false }];
    let actNo = 0;
    s.blocks.forEach((b, bi) => {
      if (b.t === 'pagebreak') { els.push({ pb: true, ln: b.ln }); return; }
      if (b.t === 'act') _ekCurKey = 's' + si + 'a' + (actNo++);
      const el = ekBlockEl(b, s, si);
      if (el) { el.dataset.bid = si + '-' + bi; if (b.ln) el.dataset.ln = b.ln; els.push({ el, pb: false }); }
    });
    return { sec: s, els };
  });
  return out;
}
function ekPageSize() {
  const wrap = document.getElementById('ek-wrap'), book = document.getElementById('ek-book');
  if (!wrap || !book) return null;
  const fs = wrap.classList.contains('ek-fs');
  const bw = book.clientWidth || 900;
  EK.single = bw < 700;
  const w = EK.single ? Math.min(bw - 8, 640) : Math.floor((bw - 8) / 2);
  wrap.classList.toggle('ek-narrow', w < 470);
  const h = Math.max(520, Math.min(fs ? 2000 : 1150, window.innerHeight - (fs ? 120 : 240)));
  wrap.style.setProperty('--ek-pg-h', h + 'px');
  wrap.style.setProperty('--ek-fs', (EK.zoom / 100) + '');
  return { w, h };
}
function ekPaginate() {
  const meas = document.getElementById('ek-measure'); const sz = ekPageSize();
  if (!meas || !sz || !EK.sections.length) return;
  meas.style.width = sz.w + 'px';
  meas.innerHTML = '';
  // Not ve çizimler sayfa taşma ölçümünü etkilemesin: ölçüm sırasında çıkar, sonra yeniden çiz
  EK.sections.forEach(s => s.els.forEach(x => { if (x.el) x.el.querySelectorAll('.ek-sticky, .ek-pen').forEach(n => n.remove()); }));
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
  if (EK.ann && EK.ann.length) ekAnnRender();
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
  EK.pages.forEach(pp => pp.querySelectorAll(':scope > .ek-ribbons, :scope > .ek-kose').forEach(o => o.remove()));
  if (sol) sol.appendChild(ekEl(ekRibbonHTML()));
  // Sayfa köşeleri: alt dış köşeye tıklayınca sayfa çevrilir (yalnızca Seç aracında görünür)
  if (sol && EK.cur > 0) sol.appendChild(ekEl('<button class="ek-kose sol" data-ek="prev" title="Önceki sayfa" aria-label="Önceki sayfa"></button>'));
  const sonSayfa = EK.single ? sol : EK.pages[EK.cur + 1];
  if (sonSayfa && EK.cur + (EK.single ? 1 : 2) < n) sonSayfa.appendChild(ekEl('<button class="ek-kose sag" data-ek="next" title="Sonraki sayfa" aria-label="Sonraki sayfa"></button>'));
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
function ekWordCardHTML(w) {
  const CINS = { 'м': ['m', 'eril'], 'ж': ['f', 'dişil'], 'с': ['n', 'nötr'], 'мн': ['p', 'çoğul'], 'м/ж': ['mf', 'ortak'] };
  const c = CINS[w.cinsiyet];
  const roz = [];
  if (w.level) roz.push(`<span class="ek-wc-b lvl">${ekEsc(w.level)}</span>`);
  if (w.cat) roz.push(`<span class="ek-wc-b">${ekEsc(w.cat)}</span>`);
  if (c) roz.push(`<span class="ek-wc-b ek-g-${c[0]}b">${ekEsc(w.cinsiyet)} · ${c[1]}</span>`);
  if (w.tip) roz.push(`<span class="ek-wc-b">${ekEsc(w.tip)}</span>`);
  if (w.padej) roz.push(`<span class="ek-wc-b">${ekEsc(w.padej)}</span>`);
  const kayitli = typeof isWordSaved === 'function' && isWordSaved(w.ru);
  return `<div class="ek-wc">
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
function ekShowWord(k, hedef) {
  if (hedef) {
    const box = document.getElementById(hedef); if (!box) return;
    const w = ekFindWord(k);
    box.innerHTML = w ? ekWordCardHTML(w) : `<div class="ek-wc"><div class="ek-wc-ru">${ekEsc(k)}</div><div class="ek-side-empty">Bu kelime henüz sözlükte kayıtlı değil.</div></div>`;
    return;
  }
  ekSideTab('kelime');
  const key = ekKelAnahtar(k);
  EK.kelSira = (EK.kelSira || []).filter(x => x !== key); EK.kelSira.unshift(key);
  EK.kelAcik = key;
  if (!(EK.kelimeler || []).some(x => x.key === key)) (EK.kelimeler = EK.kelimeler || []).push({ key, k, w: ekFindWord(k) });
  ekKelimeListe(true);
}
function ekKelAnahtar(k) { const w = ekFindWord(k); return w ? 'w:' + w.ru : 't:' + String(k).toLowerCase().replace(/ё/g, 'е'); }
function ekKelimeTopla() {
  const gor = new Map(), onbellek = {};
  (EK.sections || []).forEach(s => s.els.forEach(x => {
    if (!x.el) return;
    x.el.querySelectorAll('[data-w]').forEach(n => {
      const k = n.dataset.w; if (!k) return;
      const lk = k.toLowerCase();
      const w = lk in onbellek ? onbellek[lk] : (onbellek[lk] = ekFindWord(k));
      if (!w && lk.replace(/[^а-яё]/g, '').length <= 2) return;   // kuralda geçen tek harfler / ekler kelime değil
      const key = w ? 'w:' + w.ru : 't:' + lk.replace(/ё/g, 'е');
      if (!gor.has(key)) gor.set(key, { key, k, w });
    });
  }));
  EK.kelimeler = [...gor.values()]; EK.kelSira = []; EK.kelAcik = null;
}
function ekKelimeListe(kaydir) {
  const box = document.getElementById('ek-word'); if (!box) return;
  const tum = EK.kelimeler || [];
  if (!tum.length) { box.innerHTML = '<div class="ek-side-empty">Bu ünitede kelime bulunamadı.</div>'; return; }
  const sira = (EK.kelSira || []).map(key => tum.find(x => x.key === key)).filter(Boolean);
  const kalan = tum.filter(x => !(EK.kelSira || []).includes(x.key));
  box.innerHTML = `<div class="ek-kl-bas">Bu ünitedeki kelimeler <span>${tum.length}</span></div>` + sira.concat(kalan).map(x => {
    const acik = EK.kelAcik === x.key;
    return `<div class="ek-kl-row${acik ? ' acik' : ''}${x.w ? '' : ' yok'}">
      <button class="ek-kl-h" data-ek="klrow" data-key="${ekEsc(x.key)}"><b>${ekEsc(x.w ? x.w.ru : x.k)}</b><span>${ekEsc(x.w ? (x.w.tr || '') : 'sözlükte yok')}</span></button>
      ${acik ? `<div class="ek-kl-b">${x.w ? ekWordCardHTML(x.w) : '<div class="ek-side-empty">Bu kelime henüz sözlükte kayıtlı değil.</div>'}</div>` : ''}</div>`;
  }).join('');
  if (kaydir) { const sb2 = document.getElementById('ek-side-kelime'); if (sb2) sb2.scrollTop = 0; }
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
  const stickies = [...document.querySelectorAll('#ek-book .ek-sticky')];
  let h = `<div class="ek-side-sec">Bu sayfadaki notlar (${kutular.length + stickies.length})</div>`;
  if (!kutular.length && !stickies.length) h += '<div class="ek-side-empty">Bu sayfalarda not yok.</div>';
  kutular.forEach((k, i) => {
    const tur = k.dataset.kutu;
    const bas = (k.querySelector('.ek-box-h') || {}).textContent || '';
    const oz = ((k.querySelector('.ek-box-b') || {}).textContent || '').trim().slice(0, 90);
    h += `<button class="ek-sn ek-sn-${ekEsc(tur)}" data-ek="snote" data-k="${i}"><b>${ekEsc(bas)}</b><span>${ekEsc(oz)}${oz.length >= 90 ? '…' : ''}</span></button>`;
  });
  stickies.forEach(st => {
    const a = (EK.ann || []).find(x => x.id === st.dataset.sid); if (!a) return;
    h += `<button class="ek-sn ek-sn-st c-${a.color || 'y'}" data-ek="stgo" data-sid="${a.id}"><b>Yapışkan not</b><span>${ekEsc((a.text || 'Boş not').slice(0, 90))}</span></button>`;
  });
  const si = ekCurSection();
  const benim = (EK.notes || []).filter(n => +n.sec_idx === si);
  h += `<div class="ek-side-sec" style="margin-top:14px">Bu derse ait notlarım (${benim.length})</div>`;
  benim.forEach(n => { h += `<button class="ek-sn ek-sn-my" data-ek="nopen" data-id="${n.id}"><b>${ekEsc(n.baslik || 'Başlıksız not')}${n.kart_aktif ? ' <em class="ek-nl-kart">kart</em>' : ''}</b><span>${ekEsc((n.metin || '').slice(0, 90))}</span></button>`; });
  h += `<button class="ek-btn ghost" style="width:100%;margin-top:6px" data-ek="nnew">+ Yeni Not</button>`;
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
  if (v === 'notlar') ekRenderNotesTab();
  if (v === 'kartlar') ekRenderCards();
}
/* ============================================================
   FAZ 3 · İŞARETLEME (fosfor, altını çiz, yapışkan not, silgi, geri/ileri al)
   İşaretlemeler içerik bloğuna (data-bid) + blok içi metin konumuna bağlanır;
   zoom/ekran boyutu değişse de yerinde kalır.
   ============================================================ */
const EK_RENK = { y: '#fde68a', p: '#fbcfe8', g: '#bbf7d0', b: '#bfdbfe', k: '#cbd5e1' };
function ekBidMap() {
  EK.bid = {};
  EK.sections.forEach(s => s.els.forEach(x => { if (x.el && x.el.dataset.bid) EK.bid[x.el.dataset.bid] = x.el; }));
}
function ekTextNodes(root) {
  const out = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) {
    return n.parentElement && n.parentElement.closest('.ek-sticky') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
  let n; while ((n = w.nextNode())) out.push(n);
  return out;
}
function ekOffset(block, node, off) {
  const r = document.createRange(); r.setStart(block, 0); r.setEnd(node, off);
  let t = 0;
  for (const n of ekTextNodes(block)) {
    if (n === node) return t + off;
    const c = r.comparePoint(n, n.nodeValue.length);
    if (c === 0) t += n.nodeValue.length; else if (c > 0) break;
  }
  return t;
}
function ekWrapRange(block, s, e, ann) {
  let t = 0;
  for (const n of ekTextNodes(block)) {
    const len = n.nodeValue.length, a = Math.max(s, t), b = Math.min(e, t + len);
    if (a < b && n.nodeValue.slice(a - t, b - t).trim()) {
      let hedef = n;
      if (b - t < len) hedef.splitText(b - t);
      if (a - t > 0) hedef = hedef.splitText(a - t);
      const sp = document.createElement('span');
      sp.className = 'ek-ann ek-ann-' + ann.type; sp.dataset.aid = ann.id;
      sp.style.setProperty('--ek-ac', EK_RENK[ann.color] || EK_RENK.y);
      hedef.parentNode.insertBefore(sp, hedef); sp.appendChild(hedef);
    }
    t += len;
  }
}
function ekAnnRender() {
  if (!EK.bid) return;
  Object.values(EK.bid).forEach(bl => {
    bl.querySelectorAll('.ek-sticky, .ek-pen').forEach(x => x.remove());
    bl.querySelectorAll('.ek-ann').forEach(sp => sp.replaceWith(...sp.childNodes));
    bl.normalize();
  });
  (EK.ann || []).forEach(a => {
    const bl = EK.bid[a.bid]; if (!bl) return;
    if (a.type === 'st') { bl.appendChild(ekStickyEl(a)); return; }
    if (a.type === 'pen') { bl.appendChild(ekPenSvg(a)); return; }
    const metin = ekTextNodes(bl).map(n => n.nodeValue).join('');
    let s = a.s, e = a.e;
    if (metin.slice(s, e) !== a.txt) { const i = metin.indexOf(a.txt); if (i < 0) return; s = i; e = i + a.txt.length; }
    ekWrapRange(bl, s, e, a);
  });
  ekRenderSideNotes();
}
function ekStickyEl(a) {
  const egim = ((parseInt(String(a.id).slice(-3), 36) || 0) % 9 - 4) * 0.6;   // her not kendine özgü hafif eğik
  const gen = a.w ? Math.max(EK_ST_MIN, Math.min(EK_ST_MAX, a.w)) : 0;
  const el = ekEl(`<div class="ek-sticky c-${a.color || 'y'}${a.min ? ' min' : ''}" data-sid="${a.id}" style="left:${(a.x * 100).toFixed(2)}%;top:${Math.round(a.y)}px;--egim:${egim.toFixed(1)}deg${gen && !a.min ? ';width:' + gen + 'px' : ''}">
    ${a.min ? `<button class="ek-st-mini" data-ek="stmin" data-sid="${a.id}" title="Notu aç${a.text ? ': ' + ekEsc(String(a.text).slice(0, 60)) : ''}"><svg viewBox="0 0 24 24"><path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/><line x1="8.5" y1="9" x2="15.5" y2="9"/><line x1="8.5" y1="12.5" x2="13" y2="12.5"/></svg></button>` : `
    <div class="ek-st-h" data-sthandle="1"><span class="ek-st-grip">⋮⋮</span>
      <button class="ek-st-b" data-ek="stmin" data-sid="${a.id}" title="Küçült"><svg viewBox="0 0 24 24"><line x1="6" y1="12" x2="18" y2="12"/></svg></button>
      <button class="ek-st-b" data-ek="stdel" data-sid="${a.id}" title="Sil"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>
    <textarea class="ek-st-t" data-sid="${a.id}" placeholder="Notunu yaz…" spellcheck="false"></textarea>
    <span class="ek-st-rs" data-strs="1" title="Genişlet / daralt"></span>`}</div>`);
  const ta = el.querySelector('textarea'); if (ta) ta.value = a.text || '';
  return el;
}
function ekAnnPush() { EK.annHist.push(JSON.stringify(EK.ann)); if (EK.annHist.length > 60) EK.annHist.shift(); EK.annFut = []; ekUndoState(); }
function ekUndo() { if (!EK.annHist.length) return; EK.annFut.push(JSON.stringify(EK.ann)); EK.ann = JSON.parse(EK.annHist.pop()); ekAnnRender(); ekAnnSave(); ekUndoState(); }
function ekRedo() { if (!EK.annFut.length) return; EK.annHist.push(JSON.stringify(EK.ann)); EK.ann = JSON.parse(EK.annFut.pop()); ekAnnRender(); ekAnnSave(); ekUndoState(); }
function ekUndoState() {
  const u = document.querySelector('[data-ek="undo"]'), r = document.querySelector('[data-ek="redo"]');
  if (u) u.disabled = !EK.annHist.length; if (r) r.disabled = !EK.annFut.length;
}
function ekAnnId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
async function ekAnnLoad(unitId) {
  EK.ann = []; EK.annHist = []; EK.annFut = [];
  try { const l = localStorage.getItem('ek_ann_' + unitId); if (l) EK.ann = JSON.parse(l) || []; } catch (e) {}
  if (typeof currentUser !== 'undefined' && currentUser) {
    try { const { data } = await sb.from('ek_annotations').select('data').eq('user_id', currentUser.id).eq('unit_id', unitId).maybeSingle();
      if (data && Array.isArray(data.data)) EK.ann = data.data; } catch (e) {}
  }
  ekUndoState();
}
function ekAnnSave() {
  if (!EK.unit) return; const id = EK.unit.id, veri = EK.ann.slice();
  try { localStorage.setItem('ek_ann_' + id, JSON.stringify(veri)); } catch (e) {}
  clearTimeout(EK.annT);
  EK.annT = setTimeout(() => {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    sb.from('ek_annotations').upsert({ user_id: currentUser.id, unit_id: id, data: veri, updated_at: new Date().toISOString() }, { onConflict: 'user_id,unit_id' }).then(() => {}, () => {});
  }, 900);
}
/* Ayraçlar: Araçlar (aşağı açılan liste) + Tam ekran */
const EK_ARAC = [
  ['sec', 'Seç', '<path d="M5 3l14 8-6 2-2 6z"/>', false],
  ['hl', 'Fosforla', '<path d="M4 20h8"/><path d="M14.5 4.5l5 5L10 19H5v-5z"/>', true],
  ['ul', 'Altı Çiz', '<path d="M7 4v7a5 5 0 0 0 10 0V4"/><line x1="5" y1="20" x2="19" y2="20"/>', true],
  ['pen', 'Kalem', '<path d="M4 20l1.5-5L16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z"/><path d="M14 6.5l3 3"/>', true],
  ['note', 'Not Ekle', '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>', true],
  ['erase', 'Silgi', '<path d="M7 20h10"/><path d="M16.5 3.5l4 4L10 18l-5-5z"/>', false]
];
const EK_RENKLER = [['k', '#1e293b', 'Koyu'], ['y', '#fcd34d', 'Sarı'], ['p', '#f9a8d4', 'Pembe'], ['g', '#86efac', 'Yeşil'], ['b', '#93c5fd', 'Mavi']];
function ekRibbonHTML() {
  const wr = document.getElementById('ek-wrap'), fs = !!(wr && wr.classList.contains('ek-fs'));
  const ak = EK_ARAC.find(x => x[0] === EK.tool) || EK_ARAC[0], renk = (EK_RENKLER.find(r => r[0] === EK.color) || EK_RENKLER[1])[1];
  const menu = EK.tbMenu ? `<div class="ek-tm" role="menu">${EK_ARAC.map(([v, ad, ic, rk]) => `
      <div class="ek-tm-r"><button class="ek-tm-i${EK.tool === v ? ' active' : ''}" data-ek="tmi" data-v="${v}" role="menuitem" title="${rk ? 'Tıkla: renk seç · Çift tıkla: mevcut renkle başla' : ad}"><svg viewBox="0 0 24 24">${ic}</svg><span>${ad}</span>${rk && EK.tool === v ? `<i class="ek-tm-dot" style="--c:${renk}"></i>` : ''}</button>
      ${rk && EK.renkSatir === v ? `<div class="ek-tm-renk">${EK_RENKLER.map(([k, c, t]) => `<button class="ek-color${EK.color === k ? ' active' : ''}" data-ek="tcol" data-v="${k}" style="--c:${c}" title="${t}"></button>`).join('')}</div>` : ''}</div>`).join('')}
      <div class="ek-tm-sep"></div>
      <div class="ek-tm-ur"><button class="ek-tm-i" data-ek="undo" title="Geri al (Ctrl+Z)"${EK.annHist.length ? '' : ' disabled'}><svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg><span>Geri al</span></button>
      <button class="ek-tm-i" data-ek="redo" title="İleri al (Ctrl+Y)"${EK.annFut.length ? '' : ' disabled'}><svg viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/></svg><span>İleri al</span></button></div>
    </div>` : '';
  return `<div class="ek-ribbons">
    <button class="ek-rb${EK.tbMenu || EK.tool !== 'sec' ? ' active' : ''}" data-ek="tbtog" title="Araçlar" aria-expanded="${EK.tbMenu ? 'true' : 'false'}"><svg viewBox="0 0 24 24">${ak[2]}</svg>${ak[3] && EK.tool !== 'sec' ? `<i class="ek-rb-dot" style="--c:${renk}"></i>` : ''}</button>
    <button class="ek-rb${fs ? ' active' : ''}" data-ek="fs" title="${fs ? 'Tam ekrandan çık' : 'Tam ekran'}"><svg viewBox="0 0 24 24">${fs ? '<polyline points="9 4 9 9 4 9"/><polyline points="15 4 15 9 20 9"/><polyline points="9 20 9 15 4 15"/><polyline points="15 20 15 15 20 15"/>' : '<polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/>'}</svg></button>
    ${menu}</div>`;
}
function ekRibbonsYenile() {
  const o = document.querySelector('#ek-book .ek-ribbons'); if (!o) return;
  o.replaceWith(ekEl(ekRibbonHTML()));
}
function ekMenuKapat() { if (!EK.tbMenu && !EK.renkSatir) return; EK.tbMenu = false; EK.renkSatir = null; ekRibbonsYenile(); }
document.addEventListener('mousedown', function (e) { if (EK.tbMenu && !(e.target.closest && e.target.closest('.ek-ribbons'))) ekMenuKapat(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && EK.tbMenu) ekMenuKapat(); });
function ekSetTool(v) {
  const once = EK.tool; EK.tool = v;
  document.querySelectorAll('.ek-tool').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  const bk = document.getElementById('ek-book'); if (bk) bk.className = bk.className.replace(/\bek-tool-\w+/g, '').trim() + ' ek-tool-' + v;
  if (v === 'pen' && EK.color === 'y') ekSetColor('k');
  const ipucu = { pen: 'Sayfanın üzerine çiz. Bitince Seç aracına dön.', hl: 'Fosforlamak istediğin metni fareyle seç.', ul: 'Altını çizmek istediğin metni fareyle seç.', note: 'Notu bırakmak istediğin yere tıkla.', erase: 'Silmek istediğin işarete veya nota tıkla.' }[v];
  if (ipucu && once !== v && typeof toast === 'function') toast(ipucu);
  ekRibbonsYenile();
}
function ekSetColor(v) { EK.color = v; ekRibbonsYenile(); }
/* Fosfor / altını çiz: seçim bırakılınca */
document.addEventListener('mouseup', function (e) {
  if (!['hl', 'ul'].includes(EK.tool)) return;
  const book = document.getElementById('ek-book'); if (!book || !book.contains(e.target)) return;
  setTimeout(() => {
    const sel = window.getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    const sEl = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    const bl = sEl && sEl.closest('#ek-book [data-bid]'); if (!bl) return;
    if (bl.classList.contains('ek-act') || bl.closest('.ek-act')) { if (typeof toast === 'function') toast('Etkinliklerin içinde işaretleme yapılamaz.'); sel.removeAllRanges(); return; }
    const s = ekOffset(bl, r.startContainer, r.startOffset);
    const eIn = bl.contains(r.endContainer);
    const e2 = eIn ? ekOffset(bl, r.endContainer, r.endOffset) : ekTextNodes(bl).reduce((t, n) => t + n.nodeValue.length, 0);
    const txt = ekTextNodes(bl).map(n => n.nodeValue).join('').slice(s, e2);
    sel.removeAllRanges();
    if (!txt.trim() || e2 <= s) return;
    ekAnnPush();
    EK.ann.push({ id: ekAnnId(), type: EK.tool, bid: bl.dataset.bid, s, e: e2, txt, color: EK.color });
    ekAnnRender(); ekAnnSave();
  }, 0);
});
/* Yapışkan not konumu: sayfanın içinde kalacak şekilde (sırta / sayfa dışına taşmaz) */
function ekStYer(page, cx, cy, gen, yuk) {
  gen = gen || 186; yuk = yuk || 112;
  const pr = page.getBoundingClientRect();
  const L = Math.max(pr.left + 6, Math.min(cx, pr.right - gen - 6));
  const T = Math.max(pr.top + 6, Math.min(cy, pr.bottom - yuk - 6));
  const bs = [...page.querySelectorAll('.ek-pg-body > [data-bid]')]; if (!bs.length) return null;
  const bl = bs.find(b => b.getBoundingClientRect().bottom > T) || bs[bs.length - 1];
  const rc = bl.getBoundingClientRect();
  return { bl, x: (L - rc.left) / rc.width, y: T - rc.top };
}
function ekStSayfa(cx) {   // bırakılan noktanın sayfası; sırt/boşluk ise en yakın sayfa
  const ps = [...document.querySelectorAll('#ek-book .ek-page:not(.ek-page-blank)')];
  return ps.find(p => { const r = p.getBoundingClientRect(); return cx >= r.left && cx <= r.right; })
    || ps.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return Math.min(Math.abs(cx - ra.left), Math.abs(cx - ra.right)) - Math.min(Math.abs(cx - rb.left), Math.abs(cx - rb.right)); })[0];
}
/* Yapışkan not bırakma ve silgi */
function ekBookClick(e) {
  const book = document.getElementById('ek-book'); if (!book || !book.contains(e.target)) return false;
  if (EK.tool === 'erase') {
    const sp = e.target.closest('.ek-ann'), st = e.target.closest('.ek-sticky'), pn = e.target.closest('.ek-pen-p');
    const id = sp ? sp.dataset.aid : (st ? st.dataset.sid : (pn ? pn.dataset.aid : null));
    if (id) { ekAnnPush(); EK.ann = EK.ann.filter(a => a.id !== id); ekAnnRender(); ekAnnSave(); }
    return true;
  }
  if (EK.tool === 'note') {
    if (e.target.closest('.ek-sticky, .ek-ribbons, .ek-kose')) return true;
    const page = e.target.closest('.ek-page'); if (!page) return true;
    const yer = ekStYer(page, e.clientX, e.clientY); if (!yer) return true;
    ekAnnPush();
    const a = { id: ekAnnId(), type: 'st', bid: yer.bl.dataset.bid, x: yer.x, y: yer.y, text: '', color: EK.color, min: false };
    EK.ann.push(a); ekAnnRender(); ekAnnSave(); ekSetTool('sec');
    setTimeout(() => { const t = document.querySelector(`.ek-st-t[data-sid="${a.id}"]`); if (t) t.focus(); }, 30);
    return true;
  }
  return false;
}
/* Yapışkan notu sağa doğru genişletme (sınırlı) */
const EK_ST_MIN = 150, EK_ST_MAX = 340;
let _ekStRs = null;
document.addEventListener('pointerdown', function (e) {
  const h = e.target.closest && e.target.closest('.ek-st-rs'); if (!h) return;
  const st = h.closest('.ek-sticky'), pg = st.closest('.ek-page');
  const r = st.getBoundingClientRect(), pr = pg ? pg.getBoundingClientRect() : null;
  _ekStRs = { el: st, id: st.dataset.sid, sx: e.clientX, w0: st.offsetWidth, maks: Math.min(EK_ST_MAX, pr ? pr.right - r.left - 8 : EK_ST_MAX) };
  st.classList.add('resizing'); e.preventDefault(); e.stopPropagation();
}, true);
document.addEventListener('pointermove', function (e) {
  if (!_ekStRs) return;
  const w = Math.round(Math.max(EK_ST_MIN, Math.min(_ekStRs.maks, _ekStRs.w0 + e.clientX - _ekStRs.sx)));
  _ekStRs.el.style.width = w + 'px'; _ekStRs.w = w;
});
document.addEventListener('pointerup', function () {
  if (!_ekStRs) return;
  const d = _ekStRs; _ekStRs = null; d.el.classList.remove('resizing');
  const a = EK.ann.find(x => x.id === d.id); if (!a || !d.w || d.w === a.w) return;
  ekAnnPush(); a.w = d.w; ekAnnSave();
});
/* Yapışkan notu sürükleme */
let _ekStDrag = null;
document.addEventListener('pointerdown', function (e) {
  const h = e.target.closest && e.target.closest('.ek-st-h'); if (!h || e.target.closest('button')) return;
  const st = h.closest('.ek-sticky'); const r = st.getBoundingClientRect();
  _ekStDrag = { el: st, id: st.dataset.sid, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
  st.classList.add('dragging'); e.preventDefault();
});
document.addEventListener('pointermove', function (e) {
  if (!_ekStDrag) return;
  _ekStDrag.el.style.transform = `translate(${e.clientX - _ekStDrag.sx}px, ${e.clientY - _ekStDrag.sy}px)`;
});
document.addEventListener('pointerup', function (e) {
  if (!_ekStDrag) return;
  const d = _ekStDrag; _ekStDrag = null;
  const nx = d.ox + (e.clientX - d.sx), ny = d.oy + (e.clientY - d.sy);
  const sr = d.el.getBoundingClientRect(); d.el.classList.remove('dragging');
  const page = ekStSayfa(nx + sr.width / 2);
  const yer = page && ekStYer(page, nx, ny, sr.width, sr.height);
  const a = EK.ann.find(x => x.id === d.id);
  if (!a || !yer) { d.el.style.transform = ''; return; }
  ekAnnPush();
  a.bid = yer.bl.dataset.bid; a.x = yer.x; a.y = yer.y;
  ekAnnRender(); ekAnnSave();
});

/* ============================================================
   FAZ 3 · KULLANICININ KONU NOTLARI
   ============================================================ */
async function ekNotesLoad(unitId) {
  EK.notes = [];
  if (typeof currentUser === 'undefined' || !currentUser) return;
  try { const { data } = await sb.from('ek_notes').select('*').eq('user_id', currentUser.id).eq('unit_id', unitId).order('updated_at', { ascending: false }); EK.notes = data || []; } catch (e) {}
}
function ekSecAd(si) { const t = (EK.unit && EK.unit.toc || [])[si]; if (!t) return 'Genel'; return t.tur === 'ders' ? 'Ders ' + t.no + ' · ' + t.ad : t.ad; }
function ekRenderNotesTab(acId) {
  const box = document.getElementById('ek-v-notlar'); if (!box) return;
  if (typeof currentUser === 'undefined' || !currentUser) { box.innerHTML = '<div class="ek-soon"><h3>Notlarım</h3><p>Kendi notlarını tutmak için giriş yapmalısın.</p></div>'; return; }
  const gruplar = {};
  (EK.notes || []).forEach(n => { (gruplar[n.sec_idx] = gruplar[n.sec_idx] || []).push(n); });
  let liste = '';
  Object.keys(gruplar).sort((a, b) => a - b).forEach(si => {
    liste += `<div class="ek-nl-sec">${ekEsc(ekSecAd(+si))}</div>`;
    gruplar[si].forEach(n => { liste += `<div class="ek-nl-w"><button class="ek-nl-it${String(n.id) === String(acId) ? ' active' : ''}" data-ek="nopen" data-id="${n.id}"><b>${ekEsc(n.baslik || 'Başlıksız not')}${n.kart_aktif ? ' <em class="ek-nl-kart">kart</em>' : ''}</b><span>${ekEsc((n.metin || '').slice(0, 80))}</span></button><button class="ek-nl-del" data-ek="ndel" data-id="${n.id}" title="Notu sil" aria-label="Notu sil"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>`; });
  });
  if (!liste) liste = '<div class="ek-side-empty">Bu ünitede henüz notun yok.</div>';
  const n = acId === 'yeni' ? { id: 'yeni', sec_idx: Math.max(0, ekCurSection()), baslik: '', metin: '' } : (EK.notes || []).find(x => String(x.id) === String(acId));
  const toc = (EK.unit && EK.unit.toc) || [];
  const ed = n ? `<div class="ek-ne">
      <select id="ek-ne-sec" class="ek-ne-in">${toc.map((t, i) => t.tur === 'anahtar' ? '' : `<option value="${i}"${i === +n.sec_idx ? ' selected' : ''}>${ekEsc(ekSecAd(i))}</option>`).join('')}</select>
      <input id="ek-ne-bas" class="ek-ne-in" placeholder="Not başlığı" value="${ekEsc(n.baslik || '')}" autocomplete="off" data-lpignore="true" data-form-type="other">
      <textarea id="ek-ne-met" class="ek-ne-ta" placeholder="Bu konu hakkındaki notlarını buraya yaz…">${ekEsc(n.metin || '')}</textarea>
      <label class="ek-ne-kart"><input type="checkbox" id="ek-ne-kart"${n.kart_aktif ? ' checked' : ''} onchange="document.getElementById('ek-ne-kartalan').style.display=this.checked?'':'none'"> Bu notu çalışma kartı olarak da kullan</label>
      <div id="ek-ne-kartalan" class="ek-ne-kartalan"${n.kart_aktif ? '' : ' style="display:none"'}>
        <textarea id="ek-ne-on" class="ek-ne-in" rows="5" placeholder="Kartın ön yüzü (soru, kelime…)">${ekEsc(n.kart_on || '')}</textarea>
        <textarea id="ek-ne-arka" class="ek-ne-in" rows="5" placeholder="Kartın arka yüzü (cevap, açıklama…)">${ekEsc(n.kart_arka || '')}</textarea>
      </div>
      <div class="ek-ne-f"><button class="ek-btn" data-ek="nsave" data-id="${n.id}">Kaydet</button>
        ${n.id !== 'yeni' ? `<button class="ek-btn ghost" data-ek="ndel" data-id="${n.id}">Sil</button>` : `<button class="ek-btn ghost" data-ek="nvazgec">Vazgeç</button>`}
        <button class="ek-btn ghost" data-ek="ngo" data-s="${n.sec_idx}">Kitapta bu derse git</button></div></div>`
    : '<div class="ek-ne ek-ne-bos"><p>Soldan bir not seç veya yeni not oluştur.</p></div>';
  box.innerHTML = `<div class="ek-notes"><div class="ek-nl"><div class="ek-nl-h"><h3>Notlarım</h3><button class="ek-btn sm" data-ek="nnew">+ Yeni Not</button></div>${liste}</div>${ed}</div>`;
}
async function ekNoteSave(id) {
  if (!currentUser || !EK.unit) return;
  const row = { user_id: currentUser.id, unit_id: EK.unit.id, sec_idx: +document.getElementById('ek-ne-sec').value || 0,
    baslik: document.getElementById('ek-ne-bas').value.trim() || null, metin: document.getElementById('ek-ne-met').value, updated_at: new Date().toISOString() };
  const kartEl = document.getElementById('ek-ne-kart');
  if (kartEl) { row.kart_aktif = kartEl.checked; row.kart_on = document.getElementById('ek-ne-on').value.trim() || null; row.kart_arka = document.getElementById('ek-ne-arka').value.trim() || null; }
  if (row.kart_aktif && !row.kart_on) { if (typeof uiAlert === 'function') uiAlert('Kart olarak kullanmak için ön yüzü doldur.'); return; }
  try {
    const yaz = rw => id === 'yeni' ? sb.from('ek_notes').insert(rw).select('id').single() : sb.from('ek_notes').update(rw).eq('id', id).select('id').single();
    let r = await yaz(row);
    if (r.error && /kart_/.test(r.error.message || '')) {   // kartlar_gunluk.sql çalıştırılmamış
      delete row.kart_aktif; delete row.kart_on; delete row.kart_arka; r = await yaz(row);
      if (!r.error && typeof uiAlert === 'function') uiAlert('Not kaydedildi ama kart alanları için kartlar_gunluk.sql çalıştırılmalı.');
    }
    if (r.error) throw r.error;
    EK.deck = null;
    await ekNotesLoad(EK.unit.id); ekRenderNotesTab(r.data.id); ekRenderSideNotes();
    if (typeof toast === 'function') toast('Not kaydedildi.');
  } catch (e) { if (typeof uiAlert === 'function') uiAlert('Not kaydedilemedi: ' + ((e && e.message) || e)); }
}
async function ekNoteDelete(id) {
  if (typeof uiConfirm === 'function' && !(await uiConfirm('Bu not silinsin mi?', 'Notu Sil', { danger: true }))) return;
  try { await sb.from('ek_notes').delete().eq('id', id); await ekNotesLoad(EK.unit.id); ekRenderNotesTab(); ekRenderSideNotes(); } catch (e) {}
}

/* ============================================================
   FAZ 4 · ÇALIŞMA KARTLARI (kaydırmalı deste)
   sola = Tekrar (destenin sonuna) · sağa = Tamamladım (turdan çıkar)
   ============================================================ */
async function ekCardStatsLoad(unitId) {
  EK.cstats = {};
  try { const l = JSON.parse(localStorage.getItem('ek_cs') || '{}'); Object.keys(l).forEach(k => { if (k.startsWith(unitId + ':')) EK.cstats[k] = l[k]; }); } catch (e) {}
  if (typeof currentUser === 'undefined' || !currentUser) return;
  try { const { data } = await sb.from('ek_card_stats').select('*').eq('user_id', currentUser.id).like('card_key', unitId + ':%'); (data || []).forEach(r => { EK.cstats[r.card_key] = r; }); } catch (e) {}
}
function ekCardStat(key, yon) {
  const s = Object.assign({ tekrar: 0, tamam: 0, ardisik: 0 }, EK.cstats[key] || {});
  const now = Date.now();
  if (yon === 'L') { s.tekrar++; s.ardisik = 0; s.sonraki = new Date(now + 10 * 60000).toISOString(); }
  else { s.tamam++; s.ardisik++; s.sonraki = new Date(now + Math.min(60, Math.pow(2, s.ardisik - 1)) * 86400000).toISOString(); }
  s.son = new Date(now).toISOString(); EK.cstats[key] = s;
  try { const l = JSON.parse(localStorage.getItem('ek_cs') || '{}'); l[key] = { tekrar: s.tekrar, tamam: s.tamam, ardisik: s.ardisik, son: s.son, sonraki: s.sonraki }; localStorage.setItem('ek_cs', JSON.stringify(l)); } catch (e) {}
  if (typeof currentUser !== 'undefined' && currentUser) {
    sb.from('ek_card_stats').upsert({ user_id: currentUser.id, card_key: key, tekrar: s.tekrar, tamam: s.tamam, ardisik: s.ardisik, son: s.son, sonraki: s.sonraki }, { onConflict: 'user_id,card_key' }).then(() => {}, () => {});
  }
}
function ekHash(s) { let h = 5381; s = String(s || ''); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function ekDeckCards(kapsam) {
  const out = []; if (!EK.parsed || !EK.unit) return out;
  EK.parsed.sections.forEach((s, si) => {
    if (kapsam !== 'unit' && si !== +kapsam) return;
    let ci = 0;
    s.blocks.forEach(b => { if (b.t === 'kartlar') b.cards.forEach(c => { ci++; out.push({ key: EK.unit.id + ':' + si + ':h' + ekHash(c.on + '|' + c.arka), on: c.on, arka: c.arka, si }); }); });
  });
  // Öğrencinin "kart olarak kullan" dediği kendi notları
  (EK.notes || []).forEach(n => {
    if (n.kart_aktif && n.kart_on && (kapsam === 'unit' || +n.sec_idx === +kapsam))
      out.push({ key: 'n:' + n.id, on: n.kart_on, arka: n.kart_arka || '', si: +n.sec_idx || 0, kendi: true });
  });
  return out;
}
function ekDeckStart(yalnizZor) {
  const kapsam = (document.getElementById('ek-dk-kapsam') || {}).value || 'unit';
  const mod = (document.getElementById('ek-dk-mod') || {}).value || 'konu';
  let cards = ekDeckCards(kapsam);
  if (yalnizZor && EK.deck) cards = EK.deck.cards.filter((c, i) => EK.deck.zor.has(i));
  let sira = [...cards.keys()];
  if (mod === 'karisik') sira = ekKaristir(sira);
  else if (mod === 'akilli') {
    const now = Date.now();
    const puan = i => { const s = EK.cstats[cards[i].key]; if (!s) return [1, 0, 0];
      const t = s.sonraki ? new Date(s.sonraki).getTime() : 0; return [t <= now ? 0 : 2, t, -(s.tekrar || 0)]; };
    sira.sort((a, b) => { const x = puan(a), y = puan(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  }
  EK.deck = { cards, queue: sira, done: [], hist: [], zor: new Set(), flipped: false, kapsam, mod, unitId: EK.unit ? EK.unit.id : null };
  ekRenderCards();
}
function ekRenderCards() {
  const box = document.getElementById('ek-cards'); if (!box || !EK.parsed) return;
  const tumu = ekDeckCards('unit');
  if (!tumu.length) { box.innerHTML = '<div class="ek-soon"><h3>Çalışma kartları</h3><p>Bu ünitede henüz kart yok.</p></div>'; return; }
  if (!EK.deck || EK.deck.unitId !== EK.unit.id) { EK.deck = null; ekDeckStart(); return; }
  const d = EK.deck, n = d.cards.length, bitti = d.done.length, kalan = d.queue.length;
  const toc = EK.unit.toc || [];
  const dersler = toc.map((t, i) => ({ t, i })).filter(x => ekDeckCards(x.i).length);
  let h = `<div class="ek-dk">
    <div class="ek-dk-top">
      <div class="ek-dk-ctl">
        <select id="ek-dk-kapsam" class="ek-ne-in" data-ek-dk="1"><option value="unit"${d.kapsam === 'unit' ? ' selected' : ''}>Tüm ünite (${tumu.length} kart)</option>
          ${dersler.map(x => `<option value="${x.i}"${String(d.kapsam) === String(x.i) ? ' selected' : ''}>${ekEsc(ekSecAd(x.i))}</option>`).join('')}</select>
        <select id="ek-dk-mod" class="ek-ne-in" data-ek-dk="1">
          <option value="konu"${d.mod === 'konu' ? ' selected' : ''}>Konu sırası</option>
          <option value="akilli"${d.mod === 'akilli' ? ' selected' : ''}>Akıllı tekrar</option>
          <option value="karisik"${d.mod === 'karisik' ? ' selected' : ''}>Karışık</option></select>
        <button class="ek-btn ghost sm" data-ek="dstart">Yeniden başlat</button>
      </div>
      <div class="ek-dk-prog"><div class="ek-dk-bar"><i style="width:${n ? (bitti / n * 100) : 0}%"></i></div>
        <span>${bitti}/${n} tamamlandı • ${kalan} kart kaldı</span></div>
    </div>`;
  if (!kalan) {
    h += `<div class="ek-dk-end"><h3>Tebrikler! Bu turdaki bütün kartları tamamladın.</h3>
      <p>${d.zor.size ? d.zor.size + ' kartta zorlandın (en az bir kez Tekrar dedin).' : 'Hiçbir kartta takılmadın.'}</p>
      <div class="ek-ne-f ek-dk-end-b"><button class="ek-btn" data-ek="dstart">Yeniden başlat</button>
      ${d.zor.size ? '<button class="ek-btn ghost" data-ek="dzor">Sadece zorlandıklarım</button>' : ''}</div></div>`;
  } else {
    const c = d.cards[d.queue[0]];
    h += `<div class="ek-dk-area">
      ${kalan > 2 ? '<div class="ek-dc ek-dc-b2"></div>' : ''}${kalan > 1 ? '<div class="ek-dc ek-dc-b1"></div>' : ''}
      <div class="ek-dc ek-dc-top${d.flipped ? ' flipped' : ''}" id="ek-dc-top">
        <span class="ek-dc-lbl l">Tekrar</span><span class="ek-dc-lbl r">Tamamladım</span>
        <div class="ek-dc-ders">${ekEsc(ekSecAd(c.si))}</div>
        ${c.kendi ? '<span class="ek-dc-kendi">Kendi kartın</span>' : ''}<div class="ek-dc-face">${ekInline(d.flipped ? c.arka : c.on)}</div>
        <div class="ek-dc-hint">${d.flipped ? 'Arka yüz' : 'Çevirmek için tıkla'}</div>
      </div></div>
      <div class="ek-dk-btns">
        <button class="ek-btn ghost" data-ek="dleft"${kalan <= 1 ? ' disabled title="Son kartı tamamlayarak bitir"' : ''}>← Tekrar</button>
        <button class="ek-btn ghost" data-ek="dflip">Çevir</button>
        <button class="ek-btn" data-ek="dright">Tamamladım →</button>
      </div>
      <div class="ek-dk-sub"><button class="ek-lnk" data-ek="dundo"${d.hist.length ? '' : ' disabled'}>Son hareketi geri al</button> · Klavye: ← Tekrar · → Tamamladım · Boşluk Çevir</div>`;
  }
  h += `<details class="ek-dk-all"><summary>Tüm kartlar ve çalışma geçmişi (${tumu.length})</summary><div class="ek-cards-grid">${tumu.map(c => {
    const s = EK.cstats[c.key];
    return `<button class="ek-fc" data-ek="flip"><div class="ek-fc-on">${ekInline(c.on)}</div><div class="ek-fc-arka">${ekInline(c.arka)}</div>
      <div class="ek-fc-st">${s ? `${s.tamam || 0} kez tamam · ${s.tekrar || 0} kez tekrar` : 'Henüz çalışılmadı'}</div></button>`; }).join('')}</div></details></div>`;
  box.innerHTML = h;
}
function ekDeckMove(yon) {
  const d = EK.deck; if (!d || !d.queue.length) return;
  if (yon === 'L' && d.queue.length <= 1) { if (typeof toast === 'function') toast('Son kart: tamamlayarak turu bitir.'); return; }
  const top = document.getElementById('ek-dc-top');
  const uygula = () => {
    const idx = d.queue.shift();
    if (yon === 'L') { d.queue.push(idx); d.zor.add(idx); } else d.done.push(idx);
    d.hist.push({ yon, idx }); d.flipped = false;
    ekCardStat(d.cards[idx].key, yon); ekRenderCards();
    if (typeof logActivity === 'function') { try { logActivity('cards', 1); } catch (x) {} }
  };
  if (top) { top.classList.add(yon === 'L' ? 'fly-l' : 'fly-r'); setTimeout(uygula, 230); } else uygula();
}
function ekDeckUndo() {
  const d = EK.deck; if (!d || !d.hist.length) return;
  const son = d.hist.pop();
  if (son.yon === 'L') d.queue.pop(); else d.done.pop();
  d.queue.unshift(son.idx); d.flipped = false; ekRenderCards();
}
/* Kartı parmakla / fareyle kaydırma */
let _ekSw = null;
document.addEventListener('pointerdown', function (e) {
  const c = e.target.closest && e.target.closest('#ek-dc-top'); if (!c) return;
  _ekSw = { el: c, x: e.clientX, dx: 0 }; c.setPointerCapture && c.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', function (e) {
  if (!_ekSw) return; _ekSw.dx = e.clientX - _ekSw.x;
  _ekSw.el.style.transform = `translateX(${_ekSw.dx}px) rotate(${_ekSw.dx / 22}deg)`;
  _ekSw.el.classList.toggle('lean-l', _ekSw.dx < -40); _ekSw.el.classList.toggle('lean-r', _ekSw.dx > 40);
});
document.addEventListener('pointerup', function (e) {
  if (!_ekSw) return; const s = _ekSw; _ekSw = null;
  if (Math.abs(s.dx) < 6) { s.el.style.transform = ''; EK.deck.flipped = !EK.deck.flipped; ekRenderCards(); return; }
  if (s.dx > 100) ekDeckMove('R');
  else if (s.dx < -100 && EK.deck.queue.length > 1) ekDeckMove('L');
  else { if (s.dx < -100) { if (typeof toast === 'function') toast('Son kart: tamamlayarak turu bitir.'); }
    s.el.style.transform = ''; s.el.classList.remove('lean-l', 'lean-r'); }
});

/* ---------- Olay yönetimi (tek dinleyici) ---------- */
document.addEventListener('click', function (e) {
  if (EK.rbAcik && !e.target.closest('.ek-ribbon')) { EK.rbAcik = false; document.querySelectorAll('.ek-ribbon.acik').forEach(r => r.classList.remove('acik')); }
  const pdB = e.target.closest('#ek-pd-grid .ek-pg-body > [data-ln]');
  if (pdB && !e.target.closest('.ek-pd-x')) ekPdSec(pdB);
  const t = e.target.closest('[data-ek]');
  if (t) {
    const a = t.dataset.ek;
    if (a === 'speak') { e.stopPropagation(); if (typeof speak === 'function') speak(t.dataset.t); return; }
    if (a === 'choose') { ekChoose(t.dataset.a, +t.dataset.i, +t.dataset.o); return; }
    if (a === 'tf') { ekTF(t.dataset.a, +t.dataset.i, t.dataset.v); return; }
    if (a === 'check') { ekCheckAct(t.dataset.a); return; }
    if (a === 'reveal') { ekRevealAct(t.dataset.a); return; }
    if (a === 'ornek') { const d = t.nextElementSibling; if (d) d.style.display = d.style.display === 'none' ? '' : 'none'; return; }
    if (a === 'kural') { if (t.closest('#gw-run')) gwKural(t.dataset.no); else ekGoKural(t.dataset.no); return; }
    if (a === 'tool') { ekSetTool(t.dataset.v); return; }
    if (a === 'color') { ekSetColor(t.dataset.v); return; }
    if (a === 'undo') { ekUndo(); return; }
    if (a === 'redo') { ekRedo(); return; }
    if (a === 'stdel') { ekAnnPush(); EK.ann = EK.ann.filter(x => x.id !== t.dataset.sid); ekAnnRender(); ekAnnSave(); return; }
    if (a === 'stmin') { const x = EK.ann.find(y => y.id === t.dataset.sid); if (x) { x.min = !x.min; ekAnnRender(); ekAnnSave(); } return; }
    if (a === 'stgo') { const st = document.querySelector(`#ek-book .ek-sticky[data-sid="${t.dataset.sid}"]`); if (st) { st.classList.add('ek-flash'); setTimeout(() => st.classList.remove('ek-flash'), 1500); } return; }
    if (a === 'nnew') { ekTopTab('notlar'); ekRenderNotesTab('yeni'); return; }
    if (a === 'nopen') { ekTopTab('notlar'); ekRenderNotesTab(t.dataset.id); return; }
    if (a === 'nsave') { ekNoteSave(t.dataset.id); return; }
    if (a === 'ndel') { ekNoteDelete(t.dataset.id); return; }
    if (a === 'nvazgec') { ekRenderNotesTab(); return; }
    if (a === 'ngo') { ekTopTab('kitap'); setTimeout(() => ekGoPage(EK.secPage[+t.dataset.s] || 0), 60); return; }
    if (a === 'dleft') { ekDeckMove('L'); return; }
    if (a === 'dright') { ekDeckMove('R'); return; }
    if (a === 'dflip') { if (EK.deck) { EK.deck.flipped = !EK.deck.flipped; ekRenderCards(); } return; }
    if (a === 'dundo') { ekDeckUndo(); return; }
    if (a === 'dstart') { ekDeckStart(); return; }
    if (a === 'dzor') { ekDeckStart(true); return; }
    if (['ord', 'mpick', 'mslot', 'gpick', 'gbox', 'tok', 'stepopt', 'stepchk', 'stepnext', 'rec', 'play', 'self'].includes(a)) { ekEngClick(t); return; }
    if (a === 'echeck') { ekEngCheck(t.dataset.a); return; }
    if (a === 'eshow') { ekEngShow(t.dataset.a); return; }
    if (a === 'ereset') { ekEngReset(t.dataset.a); return; }
    if (a === 'kanit') { const r = EK_ACT[t.dataset.a]; if (r && r.kanit) { r.kanit.sel = +t.dataset.k;
      document.querySelectorAll(`.ek-kanit-c[data-a="${t.dataset.a}"]`).forEach((e2, k) => { e2.classList.remove('ok', 'no'); e2.classList.toggle('sel', k === r.kanit.sel); }); } return; }
    if (a === 'kanitchk') { ekKanitCheck(t.dataset.a); return; }
    if (a === 'prev') { ekStep(-1); return; }
    if (a === 'next') { ekStep(1); return; }
    if (a === 'ribbon') { EK.rbAcik = !EK.rbAcik; const r = t.closest('.ek-ribbon'); if (r) r.classList.toggle('acik', EK.rbAcik); if (EK.rbAcik) setTimeout(() => { const i = document.getElementById('ek-rb-input'); if (i) i.focus(); }, 30); return; }
    if (a === 'gopg') { const i = document.getElementById('ek-rb-input'); const v = parseInt(i && i.value, 10); if (v) { EK.rbAcik = false; ekGoPage(v - 1); } return; }
    if (a === 'tbtog') { EK.tbMenu = !EK.tbMenu; EK.renkSatir = null; ekRibbonsYenile(); return; }
    if (a === 'tmi') {
      const v = t.dataset.v, rk = (EK_ARAC.find(x => x[0] === v) || [])[3], simdi = Date.now();
      const cift = EK._tmSon && EK._tmSon.v === v && simdi - EK._tmSon.t < 400; EK._tmSon = { v, t: simdi };
      if (!rk || cift) { ekSetTool(v); EK.tbMenu = false; EK.renkSatir = null; ekRibbonsYenile(); return; }
      EK.renkSatir = EK.renkSatir === v ? null : v; ekSetTool(v); return;
    }
    if (a === 'tcol') { EK.color = t.dataset.v; EK.tbMenu = false; EK.renkSatir = null; ekRibbonsYenile(); return; }
    if (a === 'fs') { const w = document.getElementById('ek-wrap'); if (w) { w.classList.toggle('ek-fs'); setTimeout(() => { ekPaginate(); ekRender(); }, 40); } return; }
    if (a === 'stab') { ekSideTab(t.dataset.v); return; }
    if (a === 'ttab') { ekTopTab(t.dataset.v); return; }
    if (a === 'sword') { ekShowWord(t.dataset.w); return; }
    if (a === 'klrow') { EK.kelAcik = EK.kelAcik === t.dataset.key ? null : t.dataset.key; ekKelimeListe(); return; }
    if (a === 'saveword') { if (typeof _wAddWordToSaved === 'function') _wAddWordToSaved(t.dataset.w); const hd = t.closest('#gw-word') ? 'gw-word' : undefined; setTimeout(() => ekShowWord(t.dataset.w, hd), 400); return; }
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
  if (ekBookClick(e)) return;
  // Çalışma setlerindeki kelimeler (kendi paneline)
  const gwW = e.target.closest('#gw-run .ek-w, #gw-run .ek-g[data-w]');
  if (gwW && !e.target.closest('input,textarea,button,.ek-eng,.ek-kanit-metin')) { ekShowWord(gwW.dataset.w, 'gw-word'); return; }
  // Kitap içindeki kelimeler
  if (e.target.closest('.ek-eng, .ek-kanit-metin, .ek-sticky') || EK.tool !== 'sec') return;
  const w = e.target.closest('#ek-book .ek-w, #ek-book .ek-g[data-w], #ek-adm-preview .ek-w, #ek-cards .ek-w');
  if (w && !e.target.closest('input,textarea,button')) {
    if (e.target.closest('#ek-adm-preview')) return;
    ekShowWord(w.dataset.w);
  }
});
document.addEventListener('input', function (e) {
  if (e.target && e.target.classList && e.target.classList.contains('ek-fix')) {
    const r = EK_ACT[e.target.dataset.a]; if (r && r.eng) r.eng.items[+e.target.dataset.i].fixv[+e.target.dataset.k] = e.target.value;
  }
  if (e.target && e.target.classList && e.target.classList.contains('ek-st-t')) {
    const x = (EK.ann || []).find(y => y.id === e.target.dataset.sid); if (x) { x.text = e.target.value; ekAnnSave(); }
  }
  if (e.target && e.target.id === 'ek-search') ekSearch(e.target.value);
  if (e.target && e.target.dataset && e.target.dataset.ekSlider) ekGoPage(+e.target.value);
});
document.addEventListener('change', function (e) {
  if (e.target && e.target.dataset && e.target.dataset.ekZoom) { EK.zoom = +e.target.value || 100; ekPaginate(); ekRender(); }
  if (e.target && e.target.dataset && e.target.dataset.ekDk) { ekDeckStart(); }
});
document.addEventListener('keydown', function (e) {
  const pg = document.getElementById('page-grammar');
  if (!pg || !pg.classList.contains('active') || !EK.pages.length) return;
  const kv = document.getElementById('ek-v-kartlar');
  if (kv && kv.style.display !== 'none' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) {
    if (e.key === 'ArrowLeft') { ekDeckMove('L'); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { ekDeckMove('R'); e.preventDefault(); }
    else if (e.key === ' ') { if (EK.deck) { EK.deck.flipped = !EK.deck.flipped; ekRenderCards(); } e.preventDefault(); }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) {
    if (e.key.toLowerCase() === 'z') { ekUndo(); e.preventDefault(); return; }
    if (e.key.toLowerCase() === 'y') { ekRedo(); e.preventDefault(); return; }
  }
  if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
    if (e.key === 'Enter' && e.target.classList.contains('ek-blank')) { ekCheckAct(e.target.dataset.a); }
    if (e.key === 'Enter' && e.target.id === 'ek-rb-input') { const v = parseInt(e.target.value, 10); if (v) { EK.rbAcik = false; ekGoPage(v - 1); } }
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

/* ---------- Yönetim: Sayfa düzeni görünümü (elle sayfa sonu düzenleme) ---------- */
const EK_ONAYAR = [
  { k: 'genis', ad: 'Geniş ekran (~1920 px)', w: 660, h: 830 },
  { k: 'masa', ad: 'Masaüstü (~1600 px)', w: 500, h: 750 },
  { k: 'dizustu', ad: 'Dizüstü (~1366 px)', w: 383, h: 520, dar: true }
];
function ekAdmGorunum(v) {
  EKA.gorunum = v;
  document.querySelectorAll('.ek-pd-tabs .mail-tab').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  ekAdmCheck();
}
function ekAdmSayfalar(p) {
  const prev = document.getElementById('ek-adm-preview'); if (!prev) return;
  const oa = EK_ONAYAR.find(x => x.k === EKA.onayar) || EK_ONAYAR[1];
  const secs = ekBuildSections({ sections: p.sections }, 'admin');
  prev.classList.add('ek-pd-mod');
  prev.innerHTML = `<div class="ek-pd-bar">
      <select class="pq-input" onchange="EKA.onayar=this.value; ekAdmCheck()">${EK_ONAYAR.map(o => `<option value="${o.k}"${o.k === oa.k ? ' selected' : ''}>${o.ad}</option>`).join('')}</select>
      <span class="ek-pd-not">Otomatik sayfa sonları ekran boyutuna göre değişir; <b>elle eklenen</b> sayfa sonları her ekranda geçerlidir.</span></div>
    <div class="ek-pd-sec" id="ek-pd-sec">Düzenlemek için bir bloğa tıkla.</div>
    <div class="ek-wrap ek-pd-wrap${oa.dar ? ' ek-narrow' : ''}" style="--ek-pg-h:${oa.h}px;--ek-fs:1">
      <div class="ek-pd-grid" id="ek-pd-grid"></div><div class="ek-measure" id="ek-pd-meas"></div></div>`;
  const meas = document.getElementById('ek-pd-meas'), grid = document.getElementById('ek-pd-grid');
  meas.style.width = oa.w + 'px';
  const bas = `Modül ${p.meta.modul_no || ''} · Ünite ${p.meta.unite_no || ''} — ${p.meta.unite_ad || p.meta.baslik || ''}`;
  const sayfalar = []; let pg = null, body = null;
  const yeni = (neden, ln, ad) => {
    pg = ekEl(`<div class="ek-page"><div class="ek-pg-head"><span>${ekEsc(bas)}</span><span class="ek-pg-no"></span></div><div class="ek-pg-body"></div></div>`);
    body = pg.querySelector('.ek-pg-body'); meas.appendChild(pg); sayfalar.push({ pg, neden, ln, ad });
  };
  secs.forEach(s => {
    yeni('bolum', null, s.sec.tur === 'ders' ? 'Ders ' + s.sec.no : s.sec.ad);
    s.els.forEach(x => {
      if (x.pb) { if (body.children.length) yeni('elle', x.ln); return; }
      body.appendChild(x.el);
      if (body.scrollHeight > body.clientHeight + 2 && body.children.length > 1) { body.removeChild(x.el); yeni('oto'); body.appendChild(x.el); }
      if (body.children.length === 1 && body.scrollHeight > body.clientHeight + 2) x.el.classList.add('ek-tall');
    });
  });
  const z = Math.min(1, Math.max(0.3, (grid.clientWidth - 16) / (2 * oa.w + 16)));
  sayfalar.forEach((s, k) => {
    s.pg.querySelector('.ek-pg-no').textContent = k + 1;
    s.pg.style.width = oa.w + 'px';
    const etiket = s.neden === 'bolum' ? `Yeni bölüm: ${ekEsc(s.ad)}` : s.neden === 'elle'
      ? `Elle sayfa sonu <button class="ek-pd-x" onclick="ekPdKaldir(${s.ln})" title="Bu sayfa sonunu kaldır">Kaldır</button>` : 'Otomatik';
    const kap = ekEl(`<div class="ek-pd-pg"><div class="ek-pd-lbl ek-pd-${s.neden}"><b>Sayfa ${k + 1}</b> · ${etiket}</div><div class="ek-pd-z" style="zoom:${z}"></div></div>`);
    kap.querySelector('.ek-pd-z').appendChild(s.pg);
    grid.appendChild(kap);
  });
  meas.remove();
  if (EKA.secLn) { const el = grid.querySelector(`.ek-pg-body > [data-ln="${EKA.secLn}"]`); if (el) ekPdSec(el, true); }
}
function ekPdSec(el, sessiz) {
  document.querySelectorAll('#ek-pd-grid .ek-pd-sel').forEach(x => x.classList.remove('ek-pd-sel'));
  el.classList.add('ek-pd-sel'); EKA.secLn = +el.dataset.ln;
  const ilk = el.parentElement.firstElementChild === el, baslik = /-t$/.test(el.dataset.bid || '');
  const bar = document.getElementById('ek-pd-sec'); if (!bar) return;
  bar.innerHTML = `<b>Seçili blok</b> · kaynak satırı ${el.dataset.ln}
    ${ilk || baslik ? '<span class="ek-pd-not">(zaten sayfanın başında)</span>' : `<button class="mail-act" onclick="ekPdBol(${el.dataset.ln})">Bu bloktan yeni sayfa başlat</button>`}
    <button class="mail-act" onclick="ekPdGoster(${el.dataset.ln})">Kaynakta göster</button>`;
  if (!sessiz) bar.scrollIntoView({ block: 'nearest' });
}
function ekPdKaynak(fn) {
  const ta = document.getElementById('ek-src'); if (!ta) return;
  const L = ta.value.split('\n'); fn(L); ta.value = L.join('\n'); ekAdmCheck();
}
function ekPdBol(ln) {
  if (!ln) return;
  EKA.secLn = ln + 1;   // blok bir satır aşağı kayar; seçim onu izlesin
  ekPdKaynak(L => L.splice(ln - 1, 0, '---sayfa---'));
  if (typeof toast === 'function') toast('Sayfa sonu eklendi. Kalıcı olması için kaydetmeyi unutma.');
}
function ekPdKaldir(ln) {
  if (EKA.secLn && EKA.secLn > ln) EKA.secLn -= 1;
  ekPdKaynak(L => { if (/^---\s*sayfa\s*---$/i.test((L[ln - 1] || '').trim())) L.splice(ln - 1, 1); });
  if (typeof toast === 'function') toast('Sayfa sonu kaldırıldı. Kalıcı olması için kaydetmeyi unutma.');
}
function ekPdGoster(ln) {
  const ta = document.getElementById('ek-src'); if (!ta) return;
  const L = ta.value.split('\n'); let bas = 0; for (let i = 0; i < ln - 1 && i < L.length; i++) bas += L[i].length + 1;
  ta.focus(); ta.setSelectionRange(bas, bas + (L[ln - 1] || '').length);
  const satirY = parseFloat(getComputedStyle(ta).lineHeight) || 20; ta.scrollTop = Math.max(0, (ln - 4) * satirY);
}

/* ---------- Kalem (serbest çizim) ---------- */
const EK_KALEM_RENK = { k: '#1e293b', y: '#d97706', p: '#db2777', g: '#16a34a', b: '#2563eb' };
function ekPenD(pts) { return pts.map((q, i) => (i ? 'L' : 'M') + (q[0] * 1000).toFixed(1) + ' ' + (q[1] * 1000).toFixed(1)).join(' '); }
function ekPenSvg(a) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ek-pen'); svg.setAttribute('viewBox', '0 0 1000 1000'); svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('class', 'ek-pen-p'); path.setAttribute('vector-effect', 'non-scaling-stroke'); path.setAttribute('d', ekPenD(a.pts || []));
  path.dataset.aid = a.id;
  path.style.cssText = `fill:none;stroke:${EK_KALEM_RENK[a.color] || EK_KALEM_RENK.k};stroke-width:${a.w || 2.5}px;stroke-linecap:round;stroke-linejoin:round`;
  svg.appendChild(path); return svg;
}
let _ekPen = null;
function ekPenNokta(e) {
  const d = _ekPen; if (!d) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  (evs.length ? evs : [e]).forEach(ev => {
    const cx = Math.max(d.br.left + 2, Math.min(d.br.right - 2, ev.clientX)), cy = Math.max(d.br.top + 2, Math.min(d.br.bottom - 2, ev.clientY));
    if (d.son && Math.hypot(cx - d.son[0], cy - d.son[1]) < 1.5) return;
    if (d.a.pts.length > 3000) return;
    d.son = [cx, cy];
    d.a.pts.push([+((cx - d.rc.left) / d.rc.width).toFixed(4), +((cy - d.rc.top) / d.rc.height).toFixed(4)]);
  });
  d.path.setAttribute('d', ekPenD(d.a.pts));
}
document.addEventListener('pointerdown', function (e) {
  if (EK.tool !== 'pen' || e.button > 0) return;
  const book = document.getElementById('ek-book'); if (!book || !book.contains(e.target)) return;
  const page = e.target.closest('.ek-page'); if (!page || page.classList.contains('ek-page-blank') || e.target.closest('.ek-sticky, .ek-ribbons')) return;
  let bl = e.target.closest('.ek-pg-body > [data-bid]');
  if (!bl) { const bs = [...page.querySelectorAll('.ek-pg-body > [data-bid]')]; bl = bs.find(b => b.getBoundingClientRect().bottom > e.clientY) || bs[bs.length - 1]; }
  if (!bl) return;
  e.preventDefault();
  const a = { id: ekAnnId(), type: 'pen', bid: bl.dataset.bid, pts: [], color: EK.color, w: 2.5 };
  const svg = ekPenSvg(a); bl.appendChild(svg);
  _ekPen = { a, rc: bl.getBoundingClientRect(), br: book.getBoundingClientRect(), path: svg.firstChild, svg, son: null };
  ekPenNokta(e);
}, true);
document.addEventListener('pointermove', function (e) { if (_ekPen) { e.preventDefault(); ekPenNokta(e); } });
function ekPenBitir() {
  const d = _ekPen; if (!d) return; _ekPen = null;
  if (d.a.pts.length < 2) { d.svg.remove(); return; }
  d.svg.remove();
  ekAnnPush(); EK.ann.push(d.a); ekAnnRender(); ekAnnSave();
}
document.addEventListener('pointerup', ekPenBitir);
document.addEventListener('pointercancel', ekPenBitir);

/* ============================================================
   GRAMER ÇALIŞMALARI · ÇALIŞMA SETLERİ
   E-kitabın etkinlik motorlarıyla, kitaptan bağımsız alıştırmalar
   ============================================================ */
const GW = { list: [], loaded: false, set: null, parsed: null, cozulen: {}, seviye: '', topics: null };

/* Dışarıdan e-kitabı belirli bir derste/bölümde aç (video kartı, çalışma seti) */
function ekOpenRef(unitId, sec, no) {
  EK.pending = { unitId: +unitId, sec: (sec === '' || sec == null) ? null : +sec, no: no || '' };
  if (typeof showPage === 'function') showPage('learn');
  if (typeof learnNav === 'function') learnNav('grammar');
}
async function gwKural(no) {
  const k = GW.parsed && GW.parsed.meta.kitap;
  if (!k) { if (typeof toast === 'function') toast('Bu set bir e-kitap ünitesine bağlı değil.'); return; }
  if (!EK.loaded) await ekLoadList();
  const u = EK.list.find(x => x.modul_no === k.m && x.unite_no === k.u);
  if (!u) { if (typeof toast === 'function') toast('Bağlı e-kitap ünitesi henüz yayında değil.'); return; }
  ekOpenRef(u.id, null, no);
}

async function gwInit() {
  if (!GW.loaded) {
    try {
      const { data } = await sb.from('gw_sets').select('id, baslik, aciklama, seviye, konular, kitap_ref, act_say, yayinda, sort')
        .order('sort').order('id');
      GW.list = data || [];
    } catch (e) { GW.list = []; }
    if (!GW.topics) { try { const { data } = await sb.from('topics').select('kod, ad'); GW.topics = {}; (data || []).forEach(t => GW.topics[t.kod] = t.ad); } catch (e) { GW.topics = {}; } }
    await gwCozulenYukle();
    GW.loaded = true;
  }
  // Konu filtresi seçenekleri
  const ks = document.getElementById('gw-konu');
  if (ks && ks.options.length <= 1) {
    const kodlar = [...new Set(GW.list.flatMap(s => s.konular || []))];
    ks.innerHTML = '<option value="">Tüm konular</option>' + kodlar.map(k => `<option value="${ekEsc(k)}">${ekEsc(GW.topics[k] || k)}</option>`).join('');
  }
  gwFiltre();
}
async function gwCozulenYukle() {
  GW.cozulen = {};
  if (typeof currentUser === 'undefined' || !currentUser) return;
  try {
    const { data } = await sb.from('ek_answers').select('set_id, act_key').eq('user_id', currentUser.id).eq('dogru', true).not('set_id', 'is', null).limit(5000);
    (data || []).forEach(r => { (GW.cozulen[r.set_id] = GW.cozulen[r.set_id] || new Set()).add(r.act_key); });
  } catch (e) {}
}
function gwSeviye(v) { GW.seviye = v; gwFiltre(); }
function gwFiltre() {
  const box = document.getElementById('gw-list'); if (!box) return;
  const sevBox = document.getElementById('gw-seviye');
  const sevs = [...new Set(GW.list.map(s => s.seviye).filter(Boolean))].sort();
  if (sevBox) sevBox.innerHTML = sevs.length > 1 ? ['', ...sevs].map(v => `<button class="rec-chip ${GW.seviye === v ? 'active' : ''}" onclick="gwSeviye('${v}')">${v || 'Tümü'}</button>`).join('') : '';
  const ara = ((document.getElementById('gw-ara') || {}).value || '').trim().toLocaleLowerCase('tr');
  const konu = (document.getElementById('gw-konu') || {}).value || '';
  const liste = GW.list.filter(s => (!GW.seviye || s.seviye === GW.seviye) && (!konu || (s.konular || []).includes(konu)) &&
    (!ara || (s.baslik + ' ' + (s.aciklama || '')).toLocaleLowerCase('tr').includes(ara)));
  if (!GW.list.length) { box.innerHTML = '<div class="profile-empty">Henüz alıştırma seti eklenmedi.</div>'; return; }
  if (!liste.length) { box.innerHTML = '<div class="profile-empty">Bu filtreye uyan set yok.</div>'; return; }
  box.innerHTML = '<div class="gw-grid">' + liste.map(s => {
    const n = s.act_say || 0, c = GW.cozulen[s.id] ? GW.cozulen[s.id].size : 0, yz = n ? Math.min(100, Math.round(c / n * 100)) : 0;
    const dugme = !c ? 'Başla' : (c >= n ? 'Tekrar çöz' : 'Devam et');
    return `<button class="gw-set${c >= n && n ? ' bitti' : ''}" onclick="gwOpen(${s.id})">
      <div class="gw-set-top">${s.seviye ? `<span class="gw-lvl">${ekEsc(s.seviye)}</span>` : ''}${s.yayinda ? '' : '<span class="gw-taslak">taslak</span>'}<span class="gw-n">${n} etkinlik</span></div>
      <div class="gw-set-t">${ekEsc(s.baslik)}</div>
      ${s.aciklama ? `<div class="gw-set-a">${ekEsc(s.aciklama)}</div>` : ''}
      <div class="gw-set-k">${(s.konular || []).slice(0, 4).map(k => `<span>${ekEsc(GW.topics[k] || k)}</span>`).join('')}</div>
      <div class="gw-bar"><i style="width:${yz}%"></i></div>
      <div class="gw-set-f"><span>${c}/${n} tamamlandı</span><b>${dugme} →</b></div>
    </button>`;
  }).join('') + '</div>';
}
async function gwOpen(id) {
  const run = document.getElementById('gw-run'); if (!run) return;
  let row = null;
  try { const { data } = await sb.from('gw_sets').select('*').eq('id', id).single(); row = data; } catch (e) {}
  if (!row) { if (typeof uiAlert === 'function') uiAlert('Set açılamadı.'); return; }
  GW.set = row; GW.parsed = ekParse(row.kaynak, { set: true });
  const secs = ekBuildSections(GW.parsed, 'gw');
  const k = GW.parsed.meta.kitap;
  run.innerHTML = `<div class="gw-run-h">
      <button class="works-back" onclick="gwBack()">← Alıştırma setleri</button>
      <div class="gw-run-t"><span>${row.seviye ? ekEsc(row.seviye) + ' · ' : ''}Alıştırma seti</span><h2>${ekEsc(row.baslik)}</h2>
        ${row.aciklama ? `<p>${ekEsc(row.aciklama)}</p>` : ''}</div>
      <div class="gw-run-p"><div class="gw-bar"><i id="gw-run-bar"></i></div><span id="gw-run-say"></span>
        ${k ? `<button class="ek-btn ghost sm" onclick="gwKural('')">📖 İlgili e-kitap ünitesi</button>` : ''}</div>
    </div>
    <div class="gw-run-b"><div class="gw-sheet" id="gw-sheet"></div>
      <aside class="gw-side"><div class="gw-side-h">Kelime</div><div id="gw-word"><div class="ek-side-empty">Etkinliklerdeki bir Rusça kelimeye tıkla; bilgileri burada görünecek.</div></div></aside></div>`;
  const sheet = document.getElementById('gw-sheet');
  secs.forEach(s => {
    const els = s.sec.tur === 'set' ? s.els.slice(1) : s.els;
    if (s.sec.tur === 'anahtar') {
      const d = ekEl('<details class="gw-key"><summary>Cevap anahtarı</summary><div class="gw-key-b"></div></details>');
      els.slice(1).forEach(x => { if (x.el) d.querySelector('.gw-key-b').appendChild(x.el); });
      sheet.appendChild(d); return;
    }
    els.forEach(x => { if (!x.pb && x.el) sheet.appendChild(x.el); });
  });
  const coz = GW.cozulen[row.id] || new Set();
  sheet.querySelectorAll('.ek-act').forEach(el => { const r = EK_ACT[el.dataset.act]; if (r && coz.has(r.key)) el.classList.add('ek-cozuldu'); });
  gwIlerleme();
  document.getElementById('page-grammarworks').classList.add('gw-running');
  run.style.display = '';
  run.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90);
}
function gwIlerleme() {
  if (!GW.set) return;
  const n = GW.parsed ? GW.parsed.actSay : 0, c = GW.cozulen[GW.set.id] ? GW.cozulen[GW.set.id].size : 0;
  const bar = document.getElementById('gw-run-bar'), say = document.getElementById('gw-run-say');
  if (bar) bar.style.width = (n ? Math.min(100, Math.round(c / n * 100)) : 0) + '%';
  if (say) say.textContent = `${Math.min(c, n)}/${n} etkinlik tamamlandı`;
}
function gwLog(reg, id, dogru) {
  if (!GW.set) return;
  reg.cozuldu = reg.cozuldu || dogru;
  const el = document.querySelector(`.ek-act[data-act="${id}"]`); if (el && dogru) el.classList.add('ek-cozuldu');
  if (dogru) { (GW.cozulen[GW.set.id] = GW.cozulen[GW.set.id] || new Set()).add(reg.key); gwIlerleme(); }
  if (typeof currentUser === 'undefined' || !currentUser || typeof sb === 'undefined') return;
  if (typeof logActivity === 'function') { try { logActivity('ekActs', 1); } catch (x) {} }
  sb.from('ek_answers').insert({ user_id: currentUser.id, set_id: GW.set.id, unit_id: null, act_key: reg.key, tip: reg.act.tip, konular: reg.act.konu || [], dogru: !!dogru }).then(() => {}, () => {});
}
function gwBack() {
  const run = document.getElementById('gw-run'); if (run) { run.style.display = 'none'; run.innerHTML = ''; }
  const pg = document.getElementById('page-grammarworks'); if (pg) pg.classList.remove('gw-running');
  GW.set = null; gwFiltre();
}

/* ============================================================
   YÖNETİM: E-KİTAP EDİTÖRÜ
   ============================================================ */
const EKA = { editId: null, topics: [], lastParse: null, mode: 'unit', gorunum: 'akis', onayar: 'masa', secLn: null };
const EKA_TBL = () => EKA.mode === 'set' ? 'gw_sets' : 'ek_units';

async function ekAdmInit() {
  await ekTopicsFetch();
  ekAdmList();
}
function ekAdmTab(m) { EKA.mode = m; ekAdmList(); }
function ekAdmTabsRender() {
  const t = document.getElementById('ek-adm-tabs'); if (!t) return;
  t.style.display = '';
  t.innerHTML = `<button class="mail-tab ${EKA.mode === 'unit' ? 'active' : ''}" onclick="ekAdmTab('unit')">E-Kitap üniteleri</button>
    <button class="mail-tab ${EKA.mode === 'set' ? 'active' : ''}" onclick="ekAdmTab('set')">Gramer Çalışmaları setleri</button>`;
}
async function ekAdmList() {
  const box = document.getElementById('ek-adm-list'); if (!box) return;
  document.getElementById('ek-adm-editor').style.display = 'none';
  box.style.display = '';
  ekAdmTabsRender();
  if (EKA.mode === 'set') return gwAdmList(box);
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
async function gwAdmList(box) {
  box.innerHTML = '<div class="admin-loading">Yükleniyor...</div>';
  let rows = [];
  try { const { data } = await sb.from('gw_sets').select('id, baslik, seviye, konular, act_say, kontrol_say, yayinda, updated_at, sort').order('sort').order('id'); rows = data || []; } catch (e) {}
  let h = `<div class="mail-actions" style="margin-bottom:14px;"><button class="set-btn" onclick="ekAdmNew()">+ Yeni çalışma seti</button></div>`;
  if (!rows.length) h += '<div class="profile-empty">Henüz çalışma seti yok. Setler Eğitim → Çalışmalar → Gramer Çalışmaları sayfasında görünür.</div>';
  rows.forEach((r, i) => {
    h += `<div class="cw-row">
      <div class="cw-main"><b>${ekEsc(r.baslik)}</b> <span class="cw-cat">${ekEsc(r.seviye || '')}</span>
        <span class="cw-cat" style="background:${r.yayinda ? '#dcfce7' : '#fef3c7'}">${r.yayinda ? 'Yayında' : 'Taslak'}</span>
        ${r.kontrol_say ? `<span class="cw-cat" style="background:#fee2e2">${r.kontrol_say} etkinlik kontrol edilecek</span>` : ''}
        <div class="err-meta">${r.act_say || 0} etkinlik · ${(r.konular || []).map(ekEsc).join(', ')} · son güncelleme ${new Date(r.updated_at).toLocaleString('tr-TR')}</div></div>
      <div class="cw-acts">
        <button class="mail-act" title="Yukarı" onclick="gwAdmMove(${r.id}, -1)" ${i === 0 ? 'disabled' : ''}>🔼</button>
        <button class="mail-act" title="Aşağı" onclick="gwAdmMove(${r.id}, 1)" ${i === rows.length - 1 ? 'disabled' : ''}>🔽</button>
        <button class="mail-act" onclick="ekAdmEdit(${r.id})">Düzenle</button>
        <button class="mail-act" onclick="ekAdmToggle(${r.id}, ${!r.yayinda})">${r.yayinda ? 'Yayından kaldır' : 'Yayınla'}</button>
        <button class="mail-act red" onclick="ekAdmDelete(${r.id})">Sil</button>
      </div></div>`;
  });
  box.innerHTML = h;
  EKA.setRows = rows;
}
async function gwAdmMove(id, yon) {
  const rows = (EKA.setRows || []).slice(); const i = rows.findIndex(r => r.id === id), j = i + yon;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  try { for (let k = 0; k < rows.length; k++) if (rows[k].sort !== k) await sb.from('gw_sets').update({ sort: k }).eq('id', rows[k].id); } catch (e) {}
  GW.loaded = false; ekAdmList();
}
const GW_SABLON = `@set Başlık (ör. Çoğul ekleri — 1. alıştırma)
@seviye A1
@konu isim-cogul
@kitap 1.2
@açıklama Kısa açıklama (liste kartında görünür)

:::etkinlik bosluk
yönerge: Parantezdeki ismi çoğul yapın.
konu: isim-cogul
kural: 1.1
---
1. На полке стоят {{книги}} (книга).
:::
`;
function ekAdmOpenEditor(src, id) {
  EKA.editId = id || null;
  const t = document.getElementById('ek-adm-tabs'); if (t) t.style.display = 'none';
  document.getElementById('ek-adm-list').style.display = 'none';
  document.getElementById('ek-adm-editor').style.display = '';
  document.getElementById('ek-src').value = src || '';
  document.getElementById('ek-adm-title').textContent = EKA.mode === 'set' ? (id ? 'Çalışma setini düzenle' : 'Yeni çalışma seti') : (id ? 'Üniteyi düzenle' : 'Yeni ünite');
  document.getElementById('ek-adm-report').innerHTML = '';
  document.getElementById('ek-adm-preview').innerHTML = '<div class="profile-empty">Önizleme için "Kontrol et ve önizle"ye bas.</div>';
}
function ekAdmNew() { ekAdmOpenEditor(EKA.mode === 'set' ? GW_SABLON : '', null); }
async function ekAdmEdit(id) {
  try { const { data } = await sb.from(EKA_TBL()).select('kaynak').eq('id', id).single(); ekAdmOpenEditor(data ? data.kaynak : '', id); }
  catch (e) { uiAlert('Açılamadı.'); }
}
function ekAdmCheck() {
  const src = document.getElementById('ek-src').value;
  // Metnin türünü kendisi tanı: "@set" → çalışma seti, "@modül/@ünite" → e-kitap ünitesi (sekmeden bağımsız)
  const setMi = /^\s*@set\s/mi.test(src), uniteMi = /^\s*@(mod[üu]l|[üu]nite)\s/mi.test(src);
  let turNotu = '';
  if (setMi !== uniteMi) {
    const yeni = setMi ? 'set' : 'unit';
    if (yeni !== EKA.mode) {
      if (EKA.editId) turNotu = `<div class="ek-rep-row bad"><b>Tür</b> Bu metin ${setMi ? 'bir çalışma seti' : 'bir e-kitap ünitesi'} gibi görünüyor ama açık kayıt ${EKA.mode === 'set' ? 'bir çalışma seti' : 'bir ünite'}. Yeni kayıt olarak eklemek için listeye dönüp "Yeni" ile aç.</div>`;
      else { EKA.mode = yeni; turNotu = `<div class="ek-rep-row good"><b>Tür</b> Metin ${setMi ? '<b>çalışma seti</b> olarak tanındı; Gramer Çalışmaları setlerine' : '<b>e-kitap ünitesi</b> olarak tanındı; E-kitap ünitelerine'} kaydedilecek.</div>`;
        document.getElementById('ek-adm-title').textContent = setMi ? 'Yeni çalışma seti' : 'Yeni ünite'; }
    }
  } else if (setMi && uniteMi) turNotu = '<div class="ek-rep-row bad"><b>Tür</b> Metinde hem "@set" hem "@modül/@ünite" satırı var; birini sil.</div>';
  const p = ekParse(src, { set: EKA.mode === 'set' }); EKA.lastParse = p;
  if (turNotu.includes('bad')) p.errors.push({ ln: 1, msg: 'Metin türü ile açık kayıt uyuşmuyor.' });
  const bilinen = new Set(EKA.topics.map(t => t.kod));
  const bilinmeyen = [...p.konular].filter(k => !bilinen.has(k));
  const rep = document.getElementById('ek-adm-report');
  let h = `<div class="ek-rep-sum">
    <span>${EKA.mode === 'set' ? 'Çalışma seti' : p.sections.filter(s => s.tur === 'ders').length + ' ders'}</span><span>${p.actSay} etkinlik</span>
    <span class="${p.errors.length ? 'bad' : 'good'}">${p.errors.length} hata</span><span>${p.warnings.length + bilinmeyen.length} uyarı</span>
    ${p.kontrolSay ? `<span class="warn">${p.kontrolSay} etkinlik kontrol edilecek</span>` : ''}</div>`;
  h += turNotu;
  p.errors.forEach(x => { if (x.msg !== 'Metin türü ile açık kayıt uyuşmuyor.') h += `<div class="ek-rep-row bad"><b>Satır ${x.ln}</b> ${ekEsc(x.msg)}</div>`; });
  p.warnings.forEach(x => { h += `<div class="ek-rep-row warn"><b>Satır ${x.ln}</b> ${ekEsc(x.msg)}</div>`; });
  if (bilinmeyen.length) h += `<div class="ek-rep-row warn"><b>Konu</b> Konu listesinde olmayan kodlar: ${bilinmeyen.map(ekEsc).join(', ')} — İçerik Merkezi → Konular sekmesinden ekleyebilirsin.</div>`;
  rep.innerHTML = h;
  // Önizleme (akışlı, sayfasız)
  const prev = document.getElementById('ek-adm-preview');
  prev.innerHTML = '';
  if (EKA.mode === 'set' && p.meta.baslik) prev.appendChild(ekEl(`<div class="ek-lesson-head ek-lesson-head-alt"><div><div class="ek-lesson-k">ÇALIŞMA SETİ</div><div class="ek-lesson-ad">${ekEsc(p.meta.baslik)}</div></div></div>`));
  ekBuildSections({ sections: p.sections }, 'admin').forEach(s => (s.sec.tur === 'set' ? s.els.slice(1) : s.els).forEach(x => {
    if (x.pb) prev.appendChild(ekEl('<div class="ek-pb-mark">— elle sayfa sonu —</div>'));
    else prev.appendChild(x.el);
  }));
  prev.querySelectorAll('.ek-act').forEach(el => {
    const reg = EK_ACT[el.dataset.act];
    if (reg && reg.act && reg.act.kontrol) el.classList.add('ek-kontrol');
  });
  prev.classList.remove('ek-pd-mod');
  if (EKA.gorunum === 'sayfa') ekAdmSayfalar(p);
  return p;
}
async function ekAdmSave(yayinla) {
  const p = ekAdmCheck();
  if (p.errors.length) { uiAlert('Önce ' + p.errors.length + ' hatayı düzeltmelisin (raporda satır numaralarıyla listelendi).'); return; }
  const src = document.getElementById('ek-src').value;
  if (EKA.mode === 'set') return gwAdmSave(p, src, yayinla);
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
async function gwAdmSave(p, src, yayinla) {
  const k = p.meta.kitap;
  const row = { baslik: p.meta.baslik, aciklama: p.meta.aciklama || null, seviye: p.meta.seviye || null, konular: [...p.konular],
    kitap_ref: k ? k.m + '.' + k.u : null, kaynak: src, act_say: p.actSay, kontrol_say: p.kontrolSay, updated_at: new Date().toISOString() };
  if (yayinla !== undefined) row.yayinda = !!yayinla;
  try {
    let res;
    if (EKA.editId) res = await sb.from('gw_sets').update(row).eq('id', EKA.editId).select('id').single();
    else {
      row.sort = (EKA.setRows || []).length;
      res = await sb.from('gw_sets').insert(row).select('id').single();
    }
    if (res.error) throw res.error;
    EKA.editId = res.data.id; GW.loaded = false;
    toast(yayinla ? 'Çalışma seti kaydedildi ve yayınlandı.' : 'Çalışma seti taslak olarak kaydedildi.');
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e) + ' (gramer_calismalari.sql çalıştırıldı mı?)'); }
}
async function ekAdmToggle(id, yayinda) {
  try { await sb.from(EKA_TBL()).update({ yayinda }).eq('id', id); EK.loaded = false; GW.loaded = false; ekAdmList(); } catch (e) {}
}
async function ekAdmDelete(id) {
  const set = EKA.mode === 'set';
  if (!(await uiConfirm(set ? 'Bu çalışma seti ve öğrencilerin bu setteki cevap kayıtları silinsin mi? Bu işlem geri alınamaz.'
                            : 'Bu ünite ve tüm içeriği silinsin mi? Bu işlem geri alınamaz.', set ? 'Seti Sil' : 'Üniteyi Sil', { danger: true }))) return;
  try {
    await sb.from(EKA_TBL()).delete().eq('id', id);
    if (set) GW.loaded = false; else { EK.loaded = false; if (EK.unit && EK.unit.id === id) EK.unit = null; }
    ekAdmList();
  } catch (e) {}
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
   YÖNETİM: ÖZET NOTLARI (Konu Yönetimi içinde)
   Video "Konu" kartları bu notlardan doldurulur.
   ============================================================ */
const OZ = { rows: [] };
function ozTemizle(html) {
  const d = document.createElement('div'); d.innerHTML = html || '';
  const izin = new Set(['B','STRONG','I','EM','U','BR','P','DIV','SPAN','UL','OL','LI','FONT','MARK','SUB','SUP']);
  (function gez(el) {
    [...el.children].forEach(ch => {
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|NOSCRIPT)$/.test(ch.tagName)) { ch.remove(); return gez(el); }
      if (!izin.has(ch.tagName)) { ch.replaceWith(...ch.childNodes); return gez(el); }
      [...ch.attributes].forEach(a => {
        const ad = a.name.toLowerCase();
        if (ad === 'style') { const s = (a.value.match(/(?:^|;)\s*(color|background-color)\s*:\s*[#\w(),.\s%]+/gi) || []).join(';'); s ? ch.setAttribute('style', s.replace(/^;/, '')) : ch.removeAttribute('style'); }
        else if (ad !== 'color') ch.removeAttribute(a.name);
      });
      gez(ch);
    });
  })(d);
  return d.innerHTML.trim();
}
async function ozInit() {
  try { const { data } = await sb.from('ozet_notlar').select('*').order('konu', { nullsFirst: true }).order('sort').order('id'); OZ.rows = data || []; }
  catch (e) { OZ.rows = []; }
  const sel = document.getElementById('oz-konu');
  if (sel) { const v = sel.value; sel.innerHTML = '<option value="">Konu (isteğe bağlı)</option>' + EKA.topics.map(t => `<option value="${ekEsc(t.kod)}">${ekEsc(t.ad)} (${ekEsc(t.kod)})</option>`).join(''); sel.value = v; }
  ozRender();
}
function ozRender() {
  const box = document.getElementById('oz-list'); if (!box) return;
  const ara = ((document.getElementById('oz-ara') || {}).value || '').trim().toLocaleLowerCase('tr');
  const ad = {}; EKA.topics.forEach(t => ad[t.kod] = t.ad);
  const liste = OZ.rows.filter(r => !ara || (r.baslik + ' ' + (r.govde || '').replace(/<[^>]+>/g, ' ')).toLocaleLowerCase('tr').includes(ara));
  if (!OZ.rows.length) { box.innerHTML = '<div class="profile-empty">Henüz özet notu yok.</div>'; return; }
  if (!liste.length) { box.innerHTML = '<div class="profile-empty">Aramaya uyan not yok.</div>'; return; }
  const grup = {}; liste.forEach(r => { (grup[r.konu || ''] = grup[r.konu || ''] || []).push(r); });
  box.innerHTML = Object.keys(grup).sort().map(k => `<div class="oz-grup">${k ? ekEsc(ad[k] || k) : 'Konusuz'} <span>${grup[k].length}</span></div>` +
    grup[k].map(r => `<div class="oz-row${r.aktif === false ? ' pasif' : ''}">
      <button class="oz-row-h" onclick="this.parentElement.classList.toggle('open')"><b>${ekEsc(r.baslik)}</b>${r.aktif === false ? ' <em>gizli</em>' : ''}<span>▾</span></button>
      <div class="oz-row-b">${r.govde || ''}</div>
      <div class="oz-row-f">
        <button class="mail-act" onclick="ozEdit(${r.id})">Düzenle</button>
        <button class="mail-act" onclick="ozToggle(${r.id}, ${r.aktif === false})">${r.aktif === false ? 'Göster' : 'Gizle'}</button>
        <button class="mail-act red" onclick="ozDelete(${r.id})">Sil</button>
      </div></div>`).join('')).join('');
}
function ozCmd(cmd, val) {
  const g = document.getElementById('oz-govde'); if (!g) return;
  g.focus();
  try { document.execCommand('styleWithCSS', false, cmd === 'hiliteColor' || cmd === 'foreColor'); } catch (e) {}
  try { document.execCommand(cmd, false, val || null); } catch (e) {}
}
function ozClear() {
  ['oz-id', 'oz-baslik'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const g = document.getElementById('oz-govde'); if (g) g.innerHTML = '';
  const b = document.getElementById('oz-kaydet'); if (b) b.textContent = 'Not ekle';
}
function ozEdit(id) {
  const r = OZ.rows.find(x => x.id === id); if (!r) return;
  document.getElementById('oz-id').value = r.id;
  document.getElementById('oz-baslik').value = r.baslik || '';
  document.getElementById('oz-konu').value = r.konu || '';
  document.getElementById('oz-govde').innerHTML = r.govde || '';
  document.getElementById('oz-kaydet').textContent = 'Güncelle';
  document.getElementById('oz-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function ozSave() {
  const id = document.getElementById('oz-id').value;
  const baslik = document.getElementById('oz-baslik').value.trim();
  const govde = ozTemizle(document.getElementById('oz-govde').innerHTML);
  if (!baslik) { uiAlert('Başlık yaz.'); return; }
  if (!govde.replace(/<[^>]+>/g, '').trim()) { uiAlert('Not metni boş olamaz.'); return; }
  const row = { baslik, govde, konu: document.getElementById('oz-konu').value || null, updated_at: new Date().toISOString() };
  try {
    const { error } = id ? await sb.from('ozet_notlar').update(row).eq('id', id) : await sb.from('ozet_notlar').insert(row);
    if (error) throw error;
    toast(id ? 'Özet notu güncellendi.' : 'Özet notu eklendi.'); ozClear(); await ozInit();
  } catch (e) { uiAlert('Kaydedilemedi: ' + ((e && e.message) || e) + ' (ozet_notlari.sql çalıştırıldı mı?)'); }
}
async function ozToggle(id, aktif) { try { await sb.from('ozet_notlar').update({ aktif }).eq('id', id); await ozInit(); } catch (e) {} }
async function ozDelete(id) {
  if (!(await uiConfirm('Bu özet notu silinsin mi? Bu nottan doldurulmuş video kartları etkilenmez.', 'Notu Sil', { danger: true }))) return;
  try { await sb.from('ozet_notlar').delete().eq('id', id); await ozInit(); } catch (e) {}
}

/* ============================================================
   YÖNETİM: KONU YÖNETİMİ
   ============================================================ */
async function ekTopicsFetch() {
  try { const { data } = await sb.from('topics').select('*').order('sort').order('kod'); EKA.topics = data || []; } catch (e) { EKA.topics = []; }
}
async function ekTopicsInit() { await Promise.all([ekTopicsFetch(), ekKullanimYukle(), mfYukle()]); ekTopicsRender(); mfBagla(); mfRender(); }
async function ekKullanimYukle() {
  const k = {}; const ekle = (kod, tur, ad) => { if (!kod) return; const o = k[kod] = k[kod] || { u: [], s: [], n: [] }; o[tur].push(ad); };
  const al = q => q.then(r => (r && r.data) || [], () => []);
  try {
    const [u, s, n] = await Promise.all([al(sb.from('ek_units').select('modul_no, unite_no, unite_ad, konular')),
      al(sb.from('gw_sets').select('baslik, konular')), al(sb.from('ozet_notlar').select('baslik, konu'))]);
    u.forEach(r => (r.konular || []).forEach(x => ekle(x, 'u', `Modül ${r.modul_no} · Ünite ${r.unite_no} ${r.unite_ad || ''}`)));
    s.forEach(r => (r.konular || []).forEach(x => ekle(x, 's', r.baslik)));
    n.forEach(r => ekle(r.konu, 'n', r.baslik));
  } catch (e) {}
  EKA.kullanim = k;
}
const IC = { tab: 'konular' };
function icInit() { icTab(IC.tab); }
async function icTab(t) {
  IC.tab = t;
  document.querySelectorAll('#ic-tabs .mail-tab').forEach(b => b.classList.toggle('active', b.dataset.v === t));
  const hedef = { konular: 'ic-konular', ozet: 'ic-ozet', unite: 'ic-ekitap', set: 'ic-ekitap', kartlar: 'ic-kartlar' }[t];
  ['ic-konular', 'ic-ozet', 'ic-ekitap', 'ic-kartlar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = id === hedef ? '' : 'none'; });
  if (t === 'kartlar') return icKartInit();
  if (t === 'konular') await ekTopicsInit();
  else if (t === 'ozet') { await ekTopicsFetch(); ozInit(); }
  else { await ekTopicsFetch(); EKA.mode = t === 'set' ? 'set' : 'unit'; ekAdmList(); }
}
/* İçerik Merkezi → Kartlar: hazırladığımız çalışma kartlarını incele / sil */
const ICK = { units: [], row: null, parsed: null };
async function icKartInit() {
  try { const { data } = await sb.from('ek_units').select('id, modul_no, unite_no, unite_ad').order('modul_no').order('unite_no'); ICK.units = data || []; } catch (e) { ICK.units = []; }
  const sel = document.getElementById('ic-kart-unite'); if (!sel) return;
  const v = sel.value;
  sel.innerHTML = ICK.units.length ? ICK.units.map(u => `<option value="${u.id}">Modül ${u.modul_no} · Ünite ${u.unite_no} — ${ekEsc(u.unite_ad || '')}</option>`).join('') : '<option value="">Henüz ünite yok</option>';
  if (v && ICK.units.some(u => String(u.id) === v)) sel.value = v;
  icKartYukle();
}
async function icKartYukle() {
  const sel = document.getElementById('ic-kart-unite'), box = document.getElementById('ic-kart-list'), oz = document.getElementById('ic-kart-ozet');
  if (!sel || !box) return;
  if (!sel.value) { box.innerHTML = '<div class="profile-empty">Kart görmek için önce bir e-kitap ünitesi ekle.</div>'; if (oz) oz.textContent = ''; return; }
  try { const { data } = await sb.from('ek_units').select('id, kaynak').eq('id', sel.value).single(); ICK.row = data; } catch (e) { ICK.row = null; }
  if (!ICK.row) { box.innerHTML = '<div class="profile-empty">Ünite yüklenemedi.</div>'; return; }
  ICK.parsed = ekParse(ICK.row.kaynak);
  let h = '', top = 0;
  ICK.parsed.sections.forEach((s, si) => {
    const kart = []; s.blocks.forEach((b, bi) => { if (b.t === 'kartlar') b.cards.forEach((k, ci) => kart.push({ k, bi, ci })); });
    if (!kart.length) return;
    top += kart.length;
    h += `<div class="ic-k-sec">${s.tur === 'ders' ? 'Ders ' + s.no + ' · ' : ''}${ekEsc(s.ad)} <span>${kart.length} kart</span></div><div class="ic-k-grid">` +
      kart.map(x => `<div class="ic-k"><div class="ic-k-y"><small>Ön</small>${ekInline(x.k.on)}</div><div class="ic-k-y arka"><small>Arka</small>${ekInline(x.k.arka)}</div>
        <div class="ic-k-f">${x.k.konu ? `<span class="cw-cat">${ekEsc(x.k.konu)}</span>` : '<span></span>'}<button class="mail-act red" onclick="icKartSil(${si}, ${x.bi}, ${x.ci})">Sil</button></div></div>`).join('') + '</div>';
  });
  if (oz) oz.textContent = top + ' kart';
  box.innerHTML = h || '<div class="profile-empty">Bu ünitede hazırlanmış kart yok. Kartlar ünite metnine :::kartlar bloğuyla eklenir.</div>';
}
async function icKartSil(si, bi, ci) {
  const b = ICK.parsed && ICK.parsed.sections[si] && ICK.parsed.sections[si].blocks[bi];
  if (!b || b.t !== 'kartlar' || !b.ln || !b.son) return;
  const k = b.cards[ci];
  if (!(await uiConfirm(`"${String(k.on).replace(/[{}\[\]]/g, '').slice(0, 60)}" kartı üniteden silinsin mi?`, 'Kartı Sil', { danger: true }))) return;
  const L = ICK.row.kaynak.split('\n');
  const kalan = b.cards.filter((_, i) => i !== ci);
  const ic = kalan.map(x => ['ön: ' + x.on, 'arka: ' + x.arka].concat(x.konu ? ['konu: ' + x.konu] : []).join('\n')).join('\n---\n');
  L.splice(b.ln - 1, b.son - b.ln + 1, ...(kalan.length ? [L[b.ln - 1]].concat(ic.split('\n'), [':::']) : []));
  const yeni = L.join('\n'), kontrol = ekParse(yeni);
  if (kontrol.errors.length > ICK.parsed.errors.length) { uiAlert('Kart silinirken metin bozuldu; işlem iptal edildi.'); return; }
  try {
    const { error } = await sb.from('ek_units').update({ kaynak: yeni, updated_at: new Date().toISOString() }).eq('id', ICK.row.id);
    if (error) throw error;
    toast('Kart silindi.'); EK.loaded = false; if (EK.unit && EK.unit.id === ICK.row.id) { EK.unit = null; EK.pages = []; }
    icKartYukle();
  } catch (e) { uiAlert('Silinemedi: ' + ((e && e.message) || e)); }
}
function ekTopicYeni() {
  ['tp-kod', 'tp-ad'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const k = document.getElementById('tp-kod'); if (k) { k.readOnly = false; k.focus(); }
}
function ekTopicsRender() {
  const box = document.getElementById('ek-topics-list'); if (!box) return;
  const sel = document.getElementById('tp-ust');
  if (sel) sel.innerHTML = '<option value="">— Üst konu yok —</option>' + EKA.topics.map(t => `<option value="${ekEsc(t.kod)}">${ekEsc(t.ad)} (${ekEsc(t.kod)})</option>`).join('');
  if (!EKA.topics.length) { box.innerHTML = '<div class="profile-empty">Henüz konu yok. Aşağıdan tek tek veya toplu ekleyebilirsin.</div>'; return; }
  const cocuk = {}; EKA.topics.forEach(t => { const u = t.ust_kod || ''; (cocuk[u] = cocuk[u] || []).push(t); });
  const kodlar = new Set(EKA.topics.map(t => t.kod));
  const satir = (t, d) => `<div class="cw-row" style="padding-left:${12 + d * 22}px">
      <div class="cw-main"><b>${ekEsc(t.ad)}</b> <span class="cw-cat">${ekEsc(t.kod)}</span>${t.seviye ? `<span class="cw-cat">${ekEsc(t.seviye)}</span>` : ''}${ekKullanimHTML(t.kod)}</div>
      <div class="cw-acts"><button class="mail-act" onclick="ekTopicEdit('${ekEsc(t.kod)}')">Düzenle</button>
        <button class="mail-act red" onclick="ekTopicDelete('${ekEsc(t.kod)}')">Sil</button></div></div>`;
  const agac = (u, d) => (cocuk[u] || []).map(t => satir(t, d) + agac(t.kod, d + 1)).join('');
  let h = agac('', 0);
  // Üst kodu listede olmayanlar (yetim)
  EKA.topics.filter(t => t.ust_kod && !kodlar.has(t.ust_kod)).forEach(t => { h += satir(t, 0); });
  box.innerHTML = `<div class="err-meta" style="margin-bottom:8px">${EKA.topics.length} konu</div>` + h;
}
function ekKullanimHTML(kod) {
  const ku = (EKA.kullanim || {})[kod];
  const ch = ku ? [['u', 'ünite'], ['s', 'set'], ['n', 'özet notu']].filter(([x]) => ku[x].length)
    .map(([x, ad]) => `<span class="ic-say" title="${ekEsc(ku[x].join('\n'))}">${ku[x].length} ${ad}</span>`).join('') : '';
  return ch || '<span class="ic-say bos">henüz kullanılmıyor</span>';
}
function ekTopicEdit(kod) {
  const t = EKA.topics.find(x => x.kod === kod); if (!t) return;
  document.getElementById('tp-kod').value = t.kod;
  document.getElementById('tp-kod').readOnly = true;
  document.getElementById('tp-ad').value = t.ad || '';
  document.getElementById('tp-ust').value = t.ust_kod || '';
  document.getElementById('tp-sev').value = t.seviye || '';
  document.getElementById('tp-kod').focus();
}
function ekKodTemizle(s) {
  return String(s || '').trim().replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
async function ekTopicSave() {
  const kod = ekKodTemizle(document.getElementById('tp-kod').value);
  const ad = document.getElementById('tp-ad').value.trim();
  if (!kod || !ad) { uiAlert('Kod ve ad zorunlu.'); return; }
  const row = { kod, ad, ust_kod: document.getElementById('tp-ust').value || null, seviye: document.getElementById('tp-sev').value || null };
  try {
    const { error } = await sb.from('topics').upsert(row, { onConflict: 'kod' });
    if (error) throw error;
    ['tp-kod', 'tp-ad'].forEach(id => document.getElementById(id).value = ''); document.getElementById('tp-kod').readOnly = false;
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

/* ============================================================
   İÇERİK MERKEZİ → MÜFREDAT AĞACI
   Modül → Ünite → Ders → Konu. Ayrı tablo yok: bilgiler ünite
   metnindeki @modül / @ünite / @seviye / # Ders / @konu satırlarından
   okunur ve her düzenleme yine o satırlara yazılır (kitap = ağaç).
   ============================================================ */
const MF = { rows: [], kapali: new Set(), ekle: null, plan: null };
const MF_TUR = { ders: 'Ders', ozet: 'Özet', okuma: 'Okuma', test: 'Test' };
async function mfYukle() {
  try {
    const { data } = await sb.from('ek_units').select('id, modul_no, modul_ad, unite_no, unite_ad, seviye, yayinda, kaynak').order('modul_no').order('unite_no');
    MF.rows = (data || []).map(r => Object.assign(r, { p: ekParse(r.kaynak || '') }));
  } catch (e) { MF.rows = []; }
  MF.vid = {};
  try { const { data } = await sb.from('content_videos').select('mf_ref').eq('active', true); (data || []).forEach(v => { if (v.mf_ref) MF.vid[v.mf_ref] = (MF.vid[v.mf_ref] || 0) + 1; }); } catch (e) {}
}
function mfTopic(kod) { return (EKA.topics || []).find(t => t.kod === kod); }
function mfModuller() {
  const m = new Map();
  MF.rows.forEach(r => { if (!m.has(r.modul_no)) m.set(r.modul_no, { no: r.modul_no, ad: r.modul_ad || '', units: [] }); m.get(r.modul_no).units.push(r); });
  return [...m.values()].sort((a, b) => a.no - b.no);
}
function mfAtananlar() {
  const s = new Set();
  MF.rows.forEach(r => r.p.sections.forEach(sec => {
    sec.konular.forEach(k => s.add(k));
    sec.blocks.forEach(b => { if (b.t === 'act') (b.konu || []).forEach(k => s.add(k)); });
  }));
  return s;
}
function mfChip(kod, u, si, pasif) {
  const t = mfTopic(kod);
  const ad = t ? t.ad : kod;
  return `<span class="mf-chip${t ? '' : ' yok'}${pasif ? ' pasif' : ''}" ${pasif ? '' : 'draggable="true"'} data-kod="${ekEsc(kod)}" data-u="${u == null ? '' : u}" data-s="${si == null ? '' : si}"
    title="${ekEsc(kod)}${t ? '' : ' — konu listesinde yok'}${pasif ? ' — yalnızca bir etkinliğin konu: alanında geçiyor' : ''}">${ekEsc(ad)}${pasif || u == null ? '' : `<button class="mf-x" data-mf="kcikar" title="Bu dersten çıkar">×</button>`}</span>`;
}
function mfRender() {
  const box = document.getElementById('mf-tree'); if (!box) return;
  const mods = mfModuller();
  if (!mods.length) { box.innerHTML = '<div class="profile-empty">Henüz ünite yok. "+ Yeni modül" ile ilk modülü ve ünitesini oluştur ya da "Toplu müfredat" ile tüm ağacı tek seferde kur.</div>'; mfAtanmamisRender(); return; }
  const sel = '<option value="">Konu seç…</option>' + (EKA.topics || []).map(t => `<option value="${ekEsc(t.kod)}">${ekEsc(t.ad)} (${ekEsc(t.kod)})</option>`).join('');
  let h = '';
  mods.forEach(m => {
    const mk = 'm' + m.no, mKapali = MF.kapali.has(mk);
    const adlar = new Set(m.units.map(u => u.modul_ad || ''));
    const dSay = m.units.reduce((a, u) => a + u.p.sections.filter(s => s.tur === 'ders').length, 0);
    h += `<div class="mf-node mf-mod">
      <div class="mf-row mf-l0"><button class="mf-tg" data-mf="tg" data-k="${mk}">${mKapali ? '▸' : '▾'}</button>
        <span class="mf-tag">Modül ${m.no}</span><b class="mf-ad">${ekEsc(m.ad || '(adsız)')}</b>
        <span class="mf-meta">${m.units.length} ünite · ${dSay} ders</span>
        ${adlar.size > 1 ? '<span class="mf-uyari" title="Bu modüldeki ünitelerde farklı modül adları yazılı. Adı değiştirince hepsi eşitlenir.">ad uyuşmuyor</span>' : ''}
        <span class="mf-acts"><button class="mail-act" data-mf="madi" data-m="${m.no}">Adını değiştir</button><button class="mail-act" data-mf="uyeni" data-m="${m.no}">+ Ünite</button></span></div>`;
    if (!mKapali) {
      h += '<div class="mf-kids">';
      m.units.forEach(u => {
        const uk = 'u' + u.id, uKapali = MF.kapali.has(uk);
        const secs = u.p.sections.map((s, si) => ({ s, si })).filter(x => MF_TUR[x.s.tur] && x.s.ln);
        const hata = u.p.errors.length;
        h += `<div class="mf-node">
          <div class="mf-row mf-l1"><button class="mf-tg" data-mf="tg" data-k="${uk}">${uKapali ? '▸' : '▾'}</button>
            <span class="mf-tag">Ünite ${u.unite_no}</span><b class="mf-ad">${ekEsc(u.unite_ad || '(adsız)')}</b>
            <button class="mf-sev" data-mf="sev" data-u="${u.id}" title="Seviyeyi değiştir">${ekEsc(u.seviye || 'seviye?')}</button>
            <span class="cw-cat" style="background:${u.yayinda ? '#dcfce7' : '#fef3c7'}">${u.yayinda ? 'Yayında' : 'Taslak'}</span>
            ${hata ? `<span class="mf-uyari">${hata} metin hatası</span>` : ''}
            <span class="mf-acts"><button class="mail-act" data-mf="uadi" data-u="${u.id}">Adını değiştir</button><button class="mail-act" data-mf="dyeni" data-u="${u.id}">+ Ders</button><button class="mail-act" data-mf="metin" data-u="${u.id}">Metni aç</button></span></div>`;
        if (!uKapali) {
          h += '<div class="mf-kids">';
          if (!secs.length) h += '<div class="mf-bos">Bu ünitede henüz ders yok. "+ Ders" ile ekle.</div>';
          secs.forEach(({ s, si }) => {
            const etk = new Set(); s.blocks.forEach(b => { if (b.t === 'act') (b.konu || []).forEach(k => { if (!s.konular.includes(k)) etk.add(k); }); });
            const acik = MF.ekle === u.id + ':' + si;
            h += `<div class="mf-row mf-l2 mf-ders" data-u="${u.id}" data-s="${si}">
              <div class="mf-ders-bas"><span class="mf-tag ${s.tur}">${MF_TUR[s.tur]}${s.no != null ? ' ' + s.no : ''}</span><b class="mf-ad">${ekEsc(s.ad)}</b>
                <span class="mf-meta">${s.blocks.filter(b => b.t === 'act').length} etkinlik${s.tur === 'ders' && (MF.vid || {})[u.modul_no + '.' + u.unite_no + '.' + s.no] ? ' · ' + MF.vid[u.modul_no + '.' + u.unite_no + '.' + s.no] + ' video' : ''}</span>
                <span class="mf-acts"><button class="mail-act" data-mf="dadi" data-u="${u.id}" data-s="${si}">Adını değiştir</button><button class="mail-act" data-mf="kac" data-u="${u.id}" data-s="${si}">+ Konu</button>${!s.blocks.length ? `<button class="mail-act red" data-mf="dsil" data-u="${u.id}" data-s="${si}">Sil</button>` : ''}</span></div>
              <div class="mf-konular">${s.konular.map(k => mfChip(k, u.id, si)).join('')}${[...etk].map(k => mfChip(k, u.id, si, true)).join('')}${!s.konular.length && !etk.size ? '<span class="mf-bos">Konu atanmadı — buraya konu sürükle ya da "+ Konu"</span>' : ''}</div>
              ${acik ? `<div class="mf-ekle"><select class="pq-input mf-ekle-sel">${sel}</select><span>ya da</span><input class="pq-input mf-ekle-yeni" placeholder="Yeni konu adı" autocomplete="off" data-lpignore="true" data-form-type="other"><button class="set-btn" data-mf="kekle" data-u="${u.id}" data-s="${si}">Ekle</button><button class="set-btn ghost" data-mf="kac" data-u="${u.id}" data-s="${si}">Kapat</button></div>` : ''}
            </div>`;
          });
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  box.innerHTML = h;
  mfAtanmamisRender();
}
function mfAtanmamisRender() {
  const box = document.getElementById('mf-atanmamis'); if (!box) return;
  const at = mfAtananlar(); const T = EKA.topics || [];
  const cocuk = {}; T.forEach(t => { if (t.ust_kod) (cocuk[t.ust_kod] = cocuk[t.ust_kod] || []).push(t.kod); });
  const atanmis = kod => at.has(kod) || (cocuk[kod] || []).some(atanmis);
  const liste = T.filter(t => !atanmis(t.kod));
  const say = document.getElementById('mf-atanmamis-say'); if (say) say.textContent = liste.length ? liste.length + ' konu' : '';
  if (!liste.length) { box.innerHTML = '<div class="mf-bos">Tüm konular en az bir derse bağlı.</div>'; return; }
  const dersler = []; MF.rows.forEach(u => u.p.sections.forEach((s, si) => { if (MF_TUR[s.tur] && s.ln) dersler.push(`<option value="${u.id}:${si}">M${u.modul_no} · Ü${u.unite_no} · ${MF_TUR[s.tur]}${s.no != null ? ' ' + s.no : ''} — ${ekEsc(s.ad)}</option>`); }));
  box.innerHTML = `<div class="mf-konular mf-havuz">${liste.map(t => mfChip(t.kod, null, null)).join('')}</div>
    ${dersler.length ? `<div class="mf-ekle"><select id="mf-havuz-konu" class="pq-input">${liste.map(t => `<option value="${ekEsc(t.kod)}">${ekEsc(t.ad)}</option>`).join('')}</select><span>→</span><select id="mf-havuz-ders" class="pq-input">${dersler.join('')}</select><button class="set-btn" data-mf="havuzata">Derse ata</button></div>` : ''}`;
}

/* ---- Metin üzerinde düzenleme yardımcıları ---- */
function mfAralik(p, si, L) {
  const st = p.sections[si].ln; let en = L.length;
  for (let k = si + 1; k < p.sections.length; k++) if (p.sections[k].ln) { en = p.sections[k].ln - 1; break; }
  return [st, en]; // 1 tabanlı, ikisi dahil
}
function mfKonuYaz(src, si, liste) {
  const p = ekParse(src), L = src.replace(/\r/g, '').split('\n'), s = p.sections[si];
  if (!s || !s.ln) return src;
  const [st, en] = mfAralik(p, si, L);
  const sil = []; let blok = false;
  for (let i = st; i < en; i++) {
    const t = L[i].trim();
    if (blok) { if (t === ':::') blok = false; continue; }
    if (/^:::\s*\S/.test(t)) { blok = true; continue; }
    if (/^@konu\s/i.test(t)) sil.push(i);
  }
  sil.reverse().forEach(i => L.splice(i, 1));
  const tekil = [...new Set(liste.filter(Boolean))];
  if (tekil.length) L.splice(st, 0, '@konu ' + tekil.join(', '));
  return L.join('\n');
}
function mfBaslikYaz(src, re, yeni) {
  const L = src.replace(/\r/g, '').split('\n'); const i = L.findIndex(l => re.test(l.trim()));
  if (i > -1) L[i] = yeni; else L.unshift(yeni);
  return L.join('\n');
}
function mfSeviyeYaz(src, sev) {
  const L = src.replace(/\r/g, '').split('\n'); const i = L.findIndex(l => /^@seviye\s/i.test(l.trim()));
  if (i > -1) L[i] = '@seviye ' + sev;
  else { const u = L.findIndex(l => /^@[üu]nite\s/i.test(l.trim())); L.splice(u > -1 ? u + 1 : 0, 0, '@seviye ' + sev); }
  return L.join('\n');
}
function mfDersAdYaz(src, si, ad) {
  const p = ekParse(src), s = p.sections[si]; if (!s || !s.ln) return src;
  const L = src.replace(/\r/g, '').split('\n');
  L[s.ln - 1] = L[s.ln - 1].replace(/\|.*$/, '| ' + ad);
  return L.join('\n');
}
function mfDersEkleYaz(src, ad, konular) {
  const p = ekParse(src), L = src.replace(/\r/g, '').split('\n');
  const dersler = p.sections.map((s, si) => ({ s, si })).filter(x => x.s.tur === 'ders' && x.s.ln);
  const no = dersler.reduce((a, x) => Math.max(a, x.s.no || 0), 0) + 1;
  let yer;
  if (dersler.length) yer = mfAralik(p, dersler[dersler.length - 1].si, L)[1];
  else { const ilk = p.sections.find(s => s.ln); yer = ilk ? ilk.ln - 1 : L.length; }
  while (yer > 0 && !L[yer - 1].trim()) yer--;
  const ek = (yer > 0 ? [''] : []).concat(['# Ders ' + no + ' | ' + ad]).concat(konular && konular.length ? ['@konu ' + konular.join(', ')] : []).concat(yer < L.length && !L[yer].trim() ? [] : ['']);
  L.splice(yer, 0, ...ek);
  return { src: L.join('\n'), no };
}
function mfIskelet(mNo, mAd, uNo, uAd, sev) { return `@modül ${mNo} | ${mAd}\n@ünite ${uNo} | ${uAd}\n@seviye ${sev || 'A1'}\n`; }
function mfAdTemiz(s) { return String(s || '').replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function mfSatir(src, eski) {
  const p = ekParse(src);
  if (eski && p.errors.length > eski.errors.length) return { hata: 'Bu değişiklik metinde yeni bir hata oluşturuyor; işlem iptal edildi.' };
  const toc = p.sections.map(s => ({ tur: s.tur, no: s.no, ad: s.ad }));
  if (p.actSay) toc.push({ tur: 'anahtar', no: null, ad: 'Cevap anahtarı' });
  return { p, row: { modul_no: p.meta.modul_no, modul_ad: p.meta.modul_ad || null, unite_no: p.meta.unite_no, unite_ad: p.meta.unite_ad || null,
    seviye: p.meta.seviye || null, kaynak: src, toc, konular: [...p.konular], kontrol_say: p.kontrolSay, updated_at: new Date().toISOString() } };
}
async function mfYaz(u, yeniSrc) {
  if (yeniSrc === u.kaynak) return true;
  const r = mfSatir(yeniSrc, u.p);
  if (r.hata) { uiAlert(r.hata); return false; }
  const { error } = await sb.from('ek_units').update(r.row).eq('id', u.id);
  if (error) { uiAlert('Kaydedilemedi: ' + (error.message || error)); return false; }
  Object.assign(u, r.row, { p: r.p });
  EK.loaded = false; if (EK.unit && EK.unit.id === u.id) { EK.unit = null; EK.pages = []; }
  return true;
}
async function mfYeniUnite(mNo, mAd, uNo, uAd, sev) {
  const src = mfIskelet(mNo, mAd, uNo, uAd, sev);
  const r = mfSatir(src);
  r.row.yayinda = false;
  const { data, error } = await sb.from('ek_units').insert(r.row).select('id').single();
  if (error) { uiAlert('Ünite oluşturulamadı: ' + (error.message || error)); return null; }
  const u = Object.assign({ id: data.id, yayinda: false }, r.row, { p: r.p });
  MF.rows.push(u); MF.rows.sort((a, b) => a.modul_no - b.modul_no || a.unite_no - b.unite_no);
  EK.loaded = false;
  return u;
}
async function mfKonuOlustur(ad, sev) {
  const kod = ekKodTemizle(ad); if (!kod) return null;
  if (mfTopic(kod)) return kod;
  const { error } = await sb.from('topics').insert({ kod, ad: mfAdTemiz(ad), seviye: sev || null });
  if (error) { uiAlert('Konu oluşturulamadı: ' + (error.message || error)); return null; }
  EKA.topics.push({ kod, ad: mfAdTemiz(ad), seviye: sev || null, ust_kod: null });
  return kod;
}
async function mfYenile() { await Promise.all([ekTopicsFetch(), ekKullanimYukle()]); ekTopicsRender(); mfRender(); }

/* ---- Eylemler ---- */
function mfU(id) { return MF.rows.find(r => String(r.id) === String(id)); }
async function mfEylem(e) {
  const b = e.target.closest('[data-mf]'); if (!b) return;
  const a = b.dataset.mf, u = b.dataset.u ? mfU(b.dataset.u) : null, si = b.dataset.s !== undefined && b.dataset.s !== '' ? +b.dataset.s : null;
  if (a === 'tg') { const k = b.dataset.k; MF.kapali.has(k) ? MF.kapali.delete(k) : MF.kapali.add(k); return mfRender(); }
  if (a === 'kac') { const k = u.id + ':' + si; MF.ekle = MF.ekle === k ? null : k; mfRender(); const inp = document.querySelector('.mf-ekle-sel'); if (inp) inp.focus(); return; }
  if (a === 'madi') {
    const no = +b.dataset.m, units = MF.rows.filter(r => r.modul_no === no);
    const ad = mfAdTemiz(await uiPrompt('Modül ' + no + ' için yeni ad:', { title: 'Modül adı', value: units[0] && units[0].modul_ad || '' })); if (!ad) return;
    for (const r of units) if (!(await mfYaz(r, mfBaslikYaz(r.kaynak, /^@mod[üu]l\s/i, `@modül ${no} | ${ad}`)))) break;
    toast('Modül adı güncellendi.'); return mfRender();
  }
  if (a === 'uadi') {
    const ad = mfAdTemiz(await uiPrompt('Ünite ' + u.unite_no + ' için yeni ad:', { title: 'Ünite adı', value: u.unite_ad || '' })); if (!ad) return;
    if (await mfYaz(u, mfBaslikYaz(u.kaynak, /^@[üu]nite\s/i, `@ünite ${u.unite_no} | ${ad}`))) toast('Ünite adı güncellendi.');
    return mfRender();
  }
  if (a === 'sev') {
    const sev = String(await uiPrompt('Seviye (A1, A2, B1, B2, C1):', { title: 'Ünite seviyesi', value: u.seviye || '' }) || '').trim().toUpperCase();
    if (!sev) return;
    if (!/^(A1|A2|B1|B2|C1|C2)$/.test(sev)) { uiAlert('Seviye A1, A2, B1, B2, C1 ya da C2 olmalı.'); return; }
    if (await mfYaz(u, mfSeviyeYaz(u.kaynak, sev))) toast('Seviye güncellendi.');
    return mfRender();
  }
  if (a === 'dadi') {
    const s = u.p.sections[si];
    const ad = mfAdTemiz(await uiPrompt((MF_TUR[s.tur] || '') + (s.no != null ? ' ' + s.no : '') + ' için yeni ad:', { title: 'Ders adı', value: s.ad || '' })); if (!ad) return;
    if (await mfYaz(u, mfDersAdYaz(u.kaynak, si, ad))) toast('Ders adı güncellendi.');
    return mfRender();
  }
  if (a === 'dyeni') {
    const ad = mfAdTemiz(await uiPrompt('Yeni dersin adı:', { title: 'Ders ekle', placeholder: 'ör. İsimlerde çoğul' })); if (!ad) return;
    const r = mfDersEkleYaz(u.kaynak, ad);
    if (await mfYaz(u, r.src)) { toast('Ders ' + r.no + ' eklendi.'); MF.kapali.delete('u' + u.id); }
    return mfRender();
  }
  if (a === 'dsil') {
    const s = u.p.sections[si];
    if (s.blocks.length) { uiAlert('İçeriği olan bir ders buradan silinemez; ünite metninden silebilirsin.'); return; }
    if (!(await uiConfirm(`"${s.ad}" dersi silinsin mi?`, 'Dersi Sil', { danger: true }))) return;
    const L = u.kaynak.replace(/\r/g, '').split('\n'), [st, en] = mfAralik(u.p, si, L);
    L.splice(st - 1, en - st + 1);
    if (await mfYaz(u, L.join('\n'))) toast('Ders silindi.');
    return mfRender();
  }
  if (a === 'uyeni') {
    const no = +b.dataset.m, units = MF.rows.filter(r => r.modul_no === no);
    const ad = mfAdTemiz(await uiPrompt('Modül ' + no + ' içine eklenecek ünitenin adı:', { title: 'Ünite ekle' })); if (!ad) return;
    const son = units[units.length - 1];
    const uNo = MF.rows.filter(r => r.modul_no === no).reduce((x, r) => Math.max(x, r.unite_no), 0) + 1;
    if (await mfYeniUnite(no, (son && son.modul_ad) || '', uNo, ad, son && son.seviye)) toast('Ünite ' + uNo + ' taslak olarak eklendi.');
    return mfRender();
  }
  if (a === 'metin') { await icTab('unite'); return ekAdmEdit(u.id); }
  if (a === 'kcikar') {
    const c = b.closest('.mf-chip'), kod = c.dataset.kod, uu = mfU(c.dataset.u), s2 = +c.dataset.s;
    if (await mfYaz(uu, mfKonuYaz(uu.kaynak, s2, uu.p.sections[s2].konular.filter(k => k !== kod)))) toast('Konu dersten çıkarıldı.');
    return mfRender();
  }
  if (a === 'kekle') {
    const kutu = b.closest('.mf-ekle'), secim = kutu.querySelector('.mf-ekle-sel').value, yeni = kutu.querySelector('.mf-ekle-yeni').value.trim();
    let kod = secim;
    if (yeni) { kod = await mfKonuOlustur(yeni, u.seviye); if (!kod) return; }
    if (!kod) { uiAlert('Bir konu seç ya da yeni konu adı yaz.'); return; }
    if (await mfYaz(u, mfKonuYaz(u.kaynak, si, u.p.sections[si].konular.concat(kod)))) { toast('Konu derse atandı.'); MF.ekle = null; }
    await ekKullanimYukle(); ekTopicsRender(); return mfRender();
  }
  if (a === 'havuzata') {
    const kod = document.getElementById('mf-havuz-konu').value, hedef = document.getElementById('mf-havuz-ders').value.split(':');
    const uu = mfU(hedef[0]), s2 = +hedef[1]; if (!uu || !kod) return;
    if (await mfYaz(uu, mfKonuYaz(uu.kaynak, s2, uu.p.sections[s2].konular.concat(kod)))) toast('Konu derse atandı.');
    await ekKullanimYukle(); ekTopicsRender(); return mfRender();
  }
}
async function mfTasi(kod, kU, kS, hU, hS) {
  const h = mfU(hU); if (!h) return;
  if (kU && String(kU) === String(hU) && kS === hS) return;
  if (kU && String(kU) === String(hU)) {
    let src = mfKonuYaz(h.kaynak, kS, h.p.sections[kS].konular.filter(k => k !== kod));
    src = mfKonuYaz(src, hS, ekParse(src).sections[hS].konular.concat(kod));
    if (await mfYaz(h, src)) toast('Konu taşındı.');
  } else {
    if (!(await mfYaz(h, mfKonuYaz(h.kaynak, hS, h.p.sections[hS].konular.concat(kod))))) return mfRender();
    if (kU) { const k = mfU(kU); if (k) await mfYaz(k, mfKonuYaz(k.kaynak, kS, k.p.sections[kS].konular.filter(x => x !== kod))); }
    toast(kU ? 'Konu taşındı.' : 'Konu derse atandı.');
  }
  await ekKullanimYukle(); ekTopicsRender(); mfRender();
}
function mfBagla() {
  const kok = document.getElementById('ic-konular'); if (!kok || kok.dataset.mf) return;
  kok.dataset.mf = '1';
  kok.addEventListener('click', e => { if (e.target.closest('#mf-tree, #mf-atanmamis')) mfEylem(e); });
  kok.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('.mf-chip[draggable="true"]'); if (!c) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ kod: c.dataset.kod, u: c.dataset.u, s: c.dataset.s === '' ? null : +c.dataset.s }));
    e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag');
  });
  kok.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('.mf-chip'); if (c) c.classList.remove('drag'); });
  kok.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('.mf-ders'); if (!d) return; e.preventDefault(); d.classList.add('ust'); });
  kok.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('.mf-ders'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('ust'); });
  kok.addEventListener('drop', e => {
    const d = e.target.closest && e.target.closest('.mf-ders'); if (!d) return;
    e.preventDefault(); d.classList.remove('ust');
    let v; try { v = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (x) { return; }
    if (!v || !v.kod) return;
    mfTasi(v.kod, v.u || null, v.s, d.dataset.u, +d.dataset.s);
  });
}
async function mfYeniModul() {
  const mAd = mfAdTemiz(await uiPrompt('Yeni modülün adı:', { title: 'Modül ekle', placeholder: 'ör. Temel Dilbilgisi' })); if (!mAd) return;
  const uAd = mfAdTemiz(await uiPrompt('Bu modülün ilk ünitesinin adı:', { title: 'İlk ünite', placeholder: 'ör. İsimler' })); if (!uAd) return;
  const mNo = MF.rows.reduce((a, r) => Math.max(a, r.modul_no || 0), 0) + 1;
  if (await mfYeniUnite(mNo, mAd, 1, uAd, 'A1')) toast('Modül ' + mNo + ' oluşturuldu (ünite taslak).');
  mfRender();
}
function mfTumu(ac) {
  MF.kapali.clear();
  if (!ac) MF.rows.forEach(r => { MF.kapali.add('u' + r.id); });
  mfRender();
}

/* ---- Toplu müfredat: dışa aktar / içe al ---- */
function mfDisaAktar() {
  let t = '';
  mfModuller().forEach(m => {
    t += `@modül ${m.no} | ${m.ad}\n`;
    m.units.forEach(u => {
      t += `@ünite ${u.unite_no} | ${u.unite_ad || ''}${u.seviye ? ' | ' + u.seviye : ''}\n`;
      u.p.sections.forEach(s => {
        if (s.tur !== 'ders' || !s.ln) return;
        t += `# Ders ${s.no} | ${s.ad}\n`;
        s.konular.forEach(k => { const tp = mfTopic(k); t += tp ? `${k} | ${tp.ad}\n` : `${k}\n`; });
      });
      t += '\n';
    });
  });
  const ta = document.getElementById('mf-toplu'); if (ta) { ta.value = t.trim() + '\n'; ta.focus(); }
  mfPlanTemizle();
}
function mfTopluCoz(txt) {
  const out = [], hatalar = []; let m = null, u = null, d = null;
  String(txt || '').replace(/\r/g, '').split('\n').forEach((raw, i) => {
    const s = raw.trim().replace(/^[-•*]\s+/, ''), ln = i + 1; let q;
    if (!s || s.startsWith('//')) return;
    if ((q = s.match(/^@mod[üu]l\s+(\d+)\s*(?:\|\s*(.*))?$/i))) { m = { no: +q[1], ad: mfAdTemiz(q[2] || '') }; u = d = null; return; }
    if ((q = s.match(/^@[üu]nite\s+(\d+)\s*(?:\|\s*(.*))?$/i))) {
      if (!m) { hatalar.push(`Satır ${ln}: ünite bir "@modül" satırından önce geliyor.`); return; }
      const p = (q[2] || '').split('|').map(x => x.trim());
      const sev = p.length > 1 && /^(A1|A2|B1|B2|C1|C2)$/i.test(p[p.length - 1]) ? p.pop().toUpperCase() : '';
      u = { m, no: +q[1], ad: mfAdTemiz(p.join(' ')), sev, dersler: [] }; out.push(u); d = null; return;
    }
    if ((q = s.match(/^#\s*Ders\s+(\d+)\s*(?:\|\s*(.*))?$/i))) {
      if (!u) { hatalar.push(`Satır ${ln}: ders bir "@ünite" satırından önce geliyor.`); return; }
      d = { no: +q[1], ad: mfAdTemiz(q[2] || ''), konular: [] }; u.dersler.push(d); return;
    }
    if (/^[@#]/.test(s)) { hatalar.push(`Satır ${ln}: tanınmayan satır "${s.slice(0, 40)}".`); return; }
    if (!d) { hatalar.push(`Satır ${ln}: konu satırı bir "# Ders" satırının altında olmalı.`); return; }
    const p = s.split('|').map(x => x.trim());
    let kod, ad;
    if (p.length > 1) { kod = ekKodTemizle(p[0]); ad = p.slice(1).join(' ').trim() || p[0]; }
    else if (/^[a-z0-9-]+$/.test(s)) { kod = s; ad = (mfTopic(s) || {}).ad || s; }
    else { kod = ekKodTemizle(s); ad = s; }
    if (!kod) { hatalar.push(`Satır ${ln}: konu kodu üretilemedi.`); return; }
    d.konular.push({ kod, ad });
  });
  return { units: out, hatalar };
}
function mfPlanTemizle() { MF.plan = null; const r = document.getElementById('mf-toplu-rapor'); if (r) r.innerHTML = ''; }
function mfTopluOnizle() {
  const ta = document.getElementById('mf-toplu'); if (!ta) return;
  const degistir = document.getElementById('mf-toplu-degistir') && document.getElementById('mf-toplu-degistir').checked;
  let { units, hatalar } = mfTopluCoz(ta.value);
  const rap = document.getElementById('mf-toplu-rapor');
  if (hatalar.length || !units.length) {
    rap.innerHTML = (hatalar.length ? hatalar : ['Metinde hiç ünite yok.']).map(x => `<div class="ek-rep-row bad">${ekEsc(x)}</div>`).join('');
    MF.plan = null; return;
  }
  const plan = { yaz: [], yeni: [], konu: new Map(), satir: [] };
  const modAd = new Map(); units.forEach(x => { if (x.m.ad) modAd.set(x.m.no, x.m.ad); });
  const islenen = new Set(), calis = new Map();
  // Aynı ünite listede iki kez geçerse dersleri birleştir
  const tek = []; units.forEach(x => { const o = tek.find(y => y.m.no === x.m.no && y.no === x.no); if (o) { if (x.ad) o.ad = x.ad; if (x.sev) o.sev = x.sev; o.dersler = o.dersler.concat(x.dersler); } else tek.push(x); });
  units = tek;
  const uygula = (src, x, notlar) => {
    if (x.ad) { const p0 = ekParse(src); if (p0.meta.unite_ad !== x.ad) { src = mfBaslikYaz(src, /^@[üu]nite\s/i, `@ünite ${x.no} | ${x.ad}`); notlar.push('ünite adı → ' + x.ad); } }
    if (x.sev) { const p0 = ekParse(src); if (p0.meta.seviye !== x.sev) { src = mfSeviyeYaz(src, x.sev); notlar.push('seviye → ' + x.sev); } }
    x.dersler.forEach(d => {
      let p = ekParse(src), si = p.sections.findIndex(s => s.tur === 'ders' && s.no === d.no && s.ln);
      if (si < 0) {
        const r = mfDersEkleYaz(src, d.ad || ('Ders ' + d.no), []);
        src = r.src; p = ekParse(src); si = p.sections.findIndex(s => s.tur === 'ders' && s.no === r.no && s.ln);
        notlar.push(`Ders ${r.no} eklenecek` + (r.no !== d.no ? ` (listede ${d.no} yazıyordu, sıradaki numara ${r.no})` : ''));
      } else if (d.ad && p.sections[si].ad !== d.ad) { src = mfDersAdYaz(src, si, d.ad); notlar.push(`Ders ${d.no} adı → ${d.ad}`); p = ekParse(src); }
      const eski = p.sections[si].konular, liste = d.konular.map(k => k.kod);
      const son = degistir ? liste : [...new Set(eski.concat(liste))];
      if (son.join(',') !== eski.join(',')) {
        src = mfKonuYaz(src, si, son);
        const ek = son.filter(k => !eski.includes(k)).length, cik = eski.filter(k => !son.includes(k)).length;
        notlar.push(`Ders ${d.no}: ` + [ek ? ek + ' konu eklenecek' : '', cik ? cik + ' konu çıkarılacak' : ''].filter(Boolean).join(', ') || `Ders ${d.no}: konu sırası değişecek`);
      }
      d.konular.forEach(k => { if (!mfTopic(k.kod) && !plan.konu.has(k.kod)) plan.konu.set(k.kod, { ad: k.ad, sev: x.sev || null }); });
    });
    return src;
  };
  units.forEach(x => {
    const mAd = modAd.get(x.m.no) || '';
    const var0 = MF.rows.find(r => r.modul_no === x.m.no && r.unite_no === x.no);
    const notlar = [];
    if (var0) {
      islenen.add(var0.id);
      const c = calis.get(var0.id) || { u: var0, src: var0.kaynak, notlar: [] }; calis.set(var0.id, c);
      if (mAd && ekParse(c.src).meta.modul_ad !== mAd) { c.src = mfBaslikYaz(c.src, /^@mod[üu]l\s/i, `@modül ${x.m.no} | ${mAd}`); c.notlar.push('modül adı → ' + mAd); }
      c.src = uygula(c.src, x, c.notlar);
    } else {
      if (!x.ad) { plan.satir.push(`<span class="bad">Modül ${x.m.no} · Ünite ${x.no} yok ve adı yazılmamış; atlanacak.</span>`); return; }
      const src = uygula(mfIskelet(x.m.no, mAd || ('Modül ' + x.m.no), x.no, x.ad, x.sev || 'A1'), Object.assign({}, x, { ad: '', sev: '' }), notlar);
      plan.yeni.push({ src });
      plan.satir.push(`<b>Modül ${x.m.no} · Ünite ${x.no}</b> — yeni ünite (taslak) oluşturulacak` + (notlar.length ? '; ' + notlar.map(ekEsc).join('; ') : ''));
    }
  });
  // Modül adı değiştiyse listede olmayan diğer ünitelerine de yaz
  modAd.forEach((ad, no) => MF.rows.filter(r => r.modul_no === no && !islenen.has(r.id) && r.modul_ad !== ad).forEach(r => {
    calis.set(r.id, { u: r, src: mfBaslikYaz(r.kaynak, /^@mod[üu]l\s/i, `@modül ${no} | ${ad}`), notlar: ['modül adı → ' + ad] });
  }));
  const ust = [];
  [...calis.values()].sort((a, b) => a.u.modul_no - b.u.modul_no || a.u.unite_no - b.u.unite_no).forEach(c => {
    if (c.src === c.u.kaynak) return;
    plan.yaz.push({ u: c.u, src: c.src });
    ust.push(`<b>Modül ${c.u.modul_no} · Ünite ${c.u.unite_no}</b> — ${c.notlar.map(ekEsc).join('; ')}`);
  });
  plan.satir = ust.concat(plan.satir);
  plan.konu.forEach((v, k) => plan.satir.push(`Yeni konu: <b>${ekEsc(v.ad)}</b> <span class="cw-cat">${ekEsc(k)}</span>`));
  MF.plan = plan;
  const bos = !plan.yaz.length && !plan.yeni.length && !plan.konu.size;
  rap.innerHTML = bos ? '<div class="ek-rep-row good">Ağaç zaten bu listeyle aynı; yapılacak değişiklik yok.</div>'
    : `<div class="ek-rep-sum"><span>${plan.yaz.length} ünite güncellenecek</span><span>${plan.yeni.length} yeni ünite</span><span>${plan.konu.size} yeni konu</span></div>`
      + plan.satir.map(x => `<div class="ek-rep-row">${x}</div>`).join('')
      + `<button class="set-btn" style="margin-top:10px" onclick="mfTopluUygula()">Değişiklikleri uygula</button>`;
  if (bos) MF.plan = null;
}
async function mfTopluUygula() {
  const plan = MF.plan; if (!plan) return;
  const rows = []; plan.konu.forEach((v, kod) => rows.push({ kod, ad: v.ad, seviye: v.sev }));
  try {
    if (rows.length) { const { error } = await sb.from('topics').upsert(rows, { onConflict: 'kod' }); if (error) throw error; }
    let ok = 0;
    for (const x of plan.yaz) if (await mfYaz(x.u, x.src)) ok++;
    for (const x of plan.yeni) {
      const r = mfSatir(x.src); r.row.yayinda = false;
      const { error } = await sb.from('ek_units').insert(r.row); if (error) throw error; ok++;
    }
    MF.plan = null; document.getElementById('mf-toplu-rapor').innerHTML = '';
    EK.loaded = false;
    await mfYukle(); await mfYenile();
    toast(ok + ' ünite güncellendi' + (rows.length ? ', ' + rows.length + ' konu eklendi.' : '.'));
  } catch (e) { uiAlert('Uygulanamadı: ' + ((e && e.message) || e)); await mfYukle(); mfRender(); }
}

/* ============================================================
   VİDEO DERSLER — müfredata bağlı liste (Modül → Ünite → Ders)
   content_videos.mf_ref: "M.Ü.D" (ör. 1.2.3) ya da "M.Ü" (tüm ünite)
   ============================================================ */
const VD = { units: [], views: {}, filtre: '', q: '', sira: 'onerilen', acik: new Set(['m1', 'u1.1']), yuklendi: false, _yukleniyor: null };
const VD_KAT = [['k:soru', 'Soru Çözümleri'], ['k:deneme', 'Deneme Çözümleri']];
function vdKat(s) { return VD_KAT.find(k => k[0] === s) || null; }
function vdRef(s) {
  if (/^k:/.test(String(s || ''))) return null;
  const p = String(s || '').split('.').map(x => parseInt(x, 10));
  if (!(p[0] > 0)) return null;
  return { m: p[0], u: p[1] > 0 ? p[1] : null, d: p[2] > 0 ? p[2] : null };
}
function vdUnite(m, u) { return VD.units.find(x => x.modul_no === m && x.unite_no === u); }
function vdModAd(m) { const x = VD.units.find(y => y.modul_no === m && y.modul_ad); return x ? x.modul_ad : ''; }
function vdDersAd(m, u, d) { const un = vdUnite(m, u); const t = un && (un.toc || []).find(z => z.tur === 'ders' && z.no === d); return t ? t.ad : ''; }
function vdModuller() {
  const mods = new Map();
  VD.units.forEach(u => { if (!mods.has(u.modul_no)) mods.set(u.modul_no, []); mods.get(u.modul_no).push(u); });
  // Videolarda geçip ünitesi henüz olmayan modül/üniteler de ağaçta görünsün
  (videos || []).forEach(v => { const r = vdRef(v.mf); if (r && !mods.has(r.m)) mods.set(r.m, []); });
  return [...mods.entries()].sort((a, b) => a[0] - b[0]);
}
function vdEslesir(v, f) {
  if (!f) return true;
  if (f === 'yok') return !vdRef(v.mf) && !vdKat(v.mf);
  if (f.startsWith('k:')) return v.mf === f;
  const r = vdRef(v.mf); if (!r) return false;
  const p = f.slice(1).split('.').map(Number);
  if (r.m !== p[0]) return false;
  if (p.length > 1 && r.u !== p[1]) return false;
  if (p.length > 2 && r.d !== p[2]) return false;
  return true;
}
function vdDurum(v) {
  const x = VD.views[v.id];
  if (!x) return 'yok';
  if (x.tamam) return 'tamam';
  return x.pos > 5 ? 'devam' : 'yok';
}
function vdSure(sn) { sn = Math.round(sn || 0); if (!sn) return ''; const h = Math.floor(sn / 3600), m = Math.floor(sn % 3600 / 60), s = sn % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); }
function vdThumb(v) {
  if (v.thumb) return v.thumb;
  if (!v.video_id) return '';
  if (v.source === 'stream') return 'https://videodelivery.net/' + encodeURIComponent(v.video_id) + '/thumbnails/thumbnail.jpg?time=2s&height=360';
  return 'https://i.ytimg.com/vi/' + encodeURIComponent(v.video_id) + '/hqdefault.jpg';
}
async function vdYukle(zorla) {
  if (VD._yukleniyor) return VD._yukleniyor;
  VD._yukleniyor = (async () => {
    if (!VD.yuklendi || zorla) {
      try {
        const admin = typeof currentProfile !== 'undefined' && currentProfile && currentProfile.is_admin;
        let q = sb.from('ek_units').select('modul_no, modul_ad, unite_no, unite_ad, toc, yayinda').order('modul_no').order('unite_no');
        if (!admin) q = q.eq('yayinda', true);
        const { data } = await q; VD.units = data || [];
      } catch (e) { VD.units = []; }
    }
    VD.views = {};
    if (typeof currentUser !== 'undefined' && currentUser) {
      try {
        const { data } = await sb.from('video_views').select('video_id, completed, last_pos_sec').eq('user_id', currentUser.id).limit(5000);
        (data || []).forEach(r => {
          const o = VD.views[r.video_id] = VD.views[r.video_id] || { tamam: false, pos: 0 };
          if (r.completed) o.tamam = true;
          o.pos = Math.max(o.pos, r.last_pos_sec || 0);
        });
      } catch (e) {}
    }
    VD.yuklendi = true;
  })();
  try { await VD._yukleniyor; } finally { VD._yukleniyor = null; }
}
async function vdOpen(zorla) { await vdYukle(zorla); vdRender(); }

function vdIzlenenMi(f) {
  const wp = document.getElementById('page-watch'); if (!wp || !wp.classList.contains('active') || !VD.izlenen) return false;
  const v = { mf: VD.izlenen }; if (f === 'yok' || !f) return false;
  if (f.startsWith('k:')) return VD.izlenen === f;
  const r = vdRef(VD.izlenen); if (!r) return false;
  const p = f.slice(1).split('.').map(Number);
  return f[0] === 'd' ? r.m === p[0] && r.u === p[1] && r.d === p[2] : f[0] === 'u' ? r.m === p[0] && r.u === p[1] && !r.d : f[0] === 'm' ? r.m === p[0] && !r.u : false;
}
function vdTreeHTML() {
  const _izl = (() => { const wp = document.getElementById('page-watch'); return !!(wp && wp.classList.contains('active')); })();
  const _fs = VD.filtre; if (_izl) VD.filtre = '\u0000';
  try { return vdTreeHTML2(); } finally { VD.filtre = _fs; }
}
function vdTreeHTML2() {
  const _r = vdRef(VD.izlenen); if (_r && document.getElementById('page-watch') && document.getElementById('page-watch').classList.contains('active')) { VD.acik.add('m' + _r.m); if (_r.u) VD.acik.add('u' + _r.m + '.' + _r.u); }
  const say = f => (videos || []).filter(v => vdEslesir(v, f)).length;
  const ok = '<svg class="vd-chev" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>';
  let h = `<div class="vd-tree-bas">Kurs İçeriği</div>
    <button class="vd-tn vd-l0${!VD.filtre ? ' active' : ''}" data-vd="f" data-f=""><span class="vd-tn-ad">Tüm videolar</span><em>${(videos || []).length}</em></button>`;
  vdModuller().forEach(([m, units]) => {
    const mk = 'm' + m, acik = VD.acik.has(mk);
    h += `<div class="vd-node${acik ? ' acik' : ''}">
      <div class="vd-tn-r"><button class="vd-tg" data-vd="tg" data-k="${mk}" aria-label="Aç/kapat">${ok}</button>
      <button class="vd-tn vd-l1${VD.filtre === mk ? ' active' : ''}" data-vd="f" data-f="${mk}"><span class="vd-tn-ad"><b>Modül ${m}</b>${vdModAd(m) ? ' — ' + ekEsc(vdModAd(m)) : ''}</span><em>${say(mk)}</em></button></div>`;
    if (acik) {
      h += '<div class="vd-kids">';
      const uNo = new Set(units.map(u => u.unite_no));
      (videos || []).forEach(v => { const r = vdRef(v.mf); if (r && r.m === m && r.u) uNo.add(r.u); });
      [...uNo].sort((a, b) => a - b).forEach(u => {
        const un = vdUnite(m, u), uk = 'u' + m + '.' + u, uAcik = VD.acik.has(uk);
        const dersler = un ? (un.toc || []).filter(t => t.tur === 'ders') : [];
        h += `<div class="vd-node${uAcik ? ' acik' : ''}">
          <div class="vd-tn-r"><button class="vd-tg" data-vd="tg" data-k="${uk}" aria-label="Aç/kapat"${dersler.length ? '' : ' style="visibility:hidden"'}>${ok}</button>
          <button class="vd-tn vd-l2${VD.filtre === uk ? ' active' : ''}${vdIzlenenMi(uk) ? ' izleniyor' : ''}" data-vd="f" data-f="${uk}"><span class="vd-tn-ad"><b>Ünite ${u}</b>${un && un.unite_ad ? ' — ' + ekEsc(un.unite_ad) : ''}</span><em>${say(uk)}</em></button></div>`;
        if (uAcik && dersler.length) {
          h += '<div class="vd-kids vd-dersler">';
          dersler.forEach(t => { const dk = 'd' + m + '.' + u + '.' + t.no;
            h += `<button class="vd-tn vd-l3${VD.filtre === dk ? ' active' : ''}${vdIzlenenMi(dk) ? ' izleniyor' : ''}" data-vd="f" data-f="${dk}"><i class="vd-dot"></i><span class="vd-tn-ad">Ders ${t.no} — ${ekEsc(t.ad)}</span><em>${say(dk)}</em></button>`; });
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  h += '<div class="vd-tree-bas vd-dis">Müfredat dışı</div>';
  VD_KAT.forEach(([k, ad]) => { h += `<button class="vd-tn vd-l0${VD.filtre === k ? ' active' : ''}${vdIzlenenMi(k) ? ' izleniyor' : ''}" data-vd="f" data-f="${k}"><span class="vd-tn-ad">${ad}</span><em>${say(k)}</em></button>`; });
  const bag = say('yok');
  if (bag) h += `<button class="vd-tn vd-l0${VD.filtre === 'yok' ? ' active' : ''}" data-vd="f" data-f="yok"><span class="vd-tn-ad">Diğer videolar</span><em>${bag}</em></button>`;
  return h;
}
function vdKartHTML(v) {
  const i = videos.indexOf(v);
  const hasPrem = typeof userHasPremium === 'function' && userHasPremium();
  const kilit = v.locked && !hasPrem;
  const r = vdRef(v.mf), dur = vdDurum(v), th = vdThumb(v), sure = vdSure(v.dur);
  const chip = (f, t, cls) => `<button class="vd-chip ${cls}" data-vd="f" data-f="${f}" title="Bu bölümdeki videoları göster">${t}</button>`;
  const kat = vdKat(v.mf);
  const chips = kat ? chip(kat[0], kat[1], 'kat') : r ? chip('m' + r.m, 'Modül ' + r.m, 'mod') + (r.u ? chip('u' + r.m + '.' + r.u, 'Ünite ' + r.u, 'un') : '') + (r.d ? chip('d' + r.m + '.' + r.u + '.' + r.d, 'Ders ' + r.d, 'un') : '') : `<span class="vd-chip bos">${ekEsc(v.level || '')}${v.level ? ' · ' : ''}Genel</span>`;
  const durumH = kilit ? '<span class="vd-st kilit"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Premium</span>'
    : dur === 'tamam' ? '<span class="vd-st ok"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9.5"/></svg>Tamamlandı</span>'
    : dur === 'devam' ? '<span class="vd-st devam"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9"/></svg>Devam ediyor</span>'
    : '<span class="vd-st yok"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="10 8.5 15.5 12 10 15.5"/></svg>İzlenmedi</span>';
  const altBaslik = r && r.d ? vdDersAd(r.m, r.u, r.d) : '';
  return `<article class="vd-card${kilit ? ' kilitli' : ''}">
    <button class="vd-thumb" data-vd="play" data-i="${i}" aria-label="${ekEsc(v.title || 'Video')} — oynat">
      ${th ? `<img src="${ekEsc(th)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <span class="vd-play">${kilit ? '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' : '<svg viewBox="0 0 24 24"><polygon points="7.5 4 20 12 7.5 20"/></svg>'}</span>
      ${sure ? `<span class="vd-sure">${sure}</span>` : ''}
      ${dur === 'devam' && v.dur ? `<span class="vd-ilerleme"><i style="width:${Math.min(100, Math.round((VD.views[v.id].pos || 0) / v.dur * 100))}%"></i></span>` : ''}
    </button>
    <div class="vd-body">
      <h3 class="vd-title" data-vd="play" data-i="${i}">${ekEsc(v.title || '')}</h3>
      ${altBaslik ? `<div class="vd-ders">${ekEsc(altBaslik)}</div>` : ''}
      <p class="vd-desc">${ekEsc(v.desc || '')}</p>
      <div class="vd-foot"><div class="vd-chips">${chips}</div>${durumH}</div>
    </div></article>`;
}
function vdListe() {
  const q = VD.q.trim().toLocaleLowerCase('tr');
  let l = (videos || []).filter(v => vdEslesir(v, VD.filtre));
  if (q) l = l.filter(v => {
    const r = vdRef(v.mf);
    const ek = r ? [vdModAd(r.m), r.u ? (vdUnite(r.m, r.u) || {}).unite_ad : '', r.d ? vdDersAd(r.m, r.u, r.d) : ''].join(' ') : '';
    return [v.title, v.desc, v.level, ek].join(' ').toLocaleLowerCase('tr').includes(q);
  });
  const anahtar = v => { const r = vdRef(v.mf); return r ? [r.m, r.u || 0, r.d || 0] : (vdKat(v.mf) ? [9000 + VD_KAT.indexOf(vdKat(v.mf)), 0, 0] : [9999, 0, 0]); };
  const muf = (a, b) => { const x = anahtar(a), y = anahtar(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || (a.num || 0) - (b.num || 0); };
  const s = VD.sira;
  if (s === 'onerilen') {   // önce yarım kalanlar, sonra izlenmeyenler (müfredat sırası), en sonda tamamlananlar
    const p = v => ({ devam: 0, yok: 1, tamam: 2 })[vdDurum(v)];
    l.sort((a, b) => p(a) - p(b) || muf(a, b));
  } else if (s === 'mufredat') l.sort(muf);
  else if (s === 'sira') l.sort((a, b) => (a.num || 0) - (b.num || 0));
  else if (s === 'ad') l.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'tr'));
  else if (s === 'sure') l.sort((a, b) => (a.dur || 1e9) - (b.dur || 1e9));
  return l;
}
function vdBaslikFiltre() {
  const f = VD.filtre; if (!f) return '';
  if (f === 'yok') return 'Müfredata bağlanmamış diğer videolar';
  if (f.startsWith('k:')) return (vdKat(f) || [0, 'Kategori'])[1];
  const p = f.slice(1).split('.').map(Number);
  let t = 'Modül ' + p[0] + (vdModAd(p[0]) ? ' — ' + vdModAd(p[0]) : '');
  if (p.length > 1) { const un = vdUnite(p[0], p[1]); t += ' › Ünite ' + p[1] + (un && un.unite_ad ? ' — ' + un.unite_ad : ''); }
  if (p.length > 2) { const d = vdDersAd(p[0], p[1], p[2]); t += ' › Ders ' + p[2] + (d ? ' — ' + d : ''); }
  return t;
}
function vdRender() {
  const pg = document.getElementById('page-video'); if (!pg) return;
  if (!document.getElementById('vd-grid')) {
    pg.innerHTML = `<div class="vd-wrap">
      <header class="vd-head"><h2>Video <span>Dersler</span></h2><p>Adım adım Rusça öğren. A1'den başlayıp YDT/YDS seviyesine ulaş.</p></header>
      <div class="vd-lock" id="vd-lock" style="display:none"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        <span><b>Premium içerik</b> Kilitli videoları izlemek için premium üyelik gerekiyor.</span><button class="vd-lock-b" onclick="showPage('pricing')">Planları gör</button></div>
      <div class="vd-bar">
        <label class="vd-ara"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
          <input id="vd-q" type="search" placeholder="Video, ders veya konu ara…" autocomplete="off" data-lpignore="true" data-form-type="other"></label>
        <div class="vd-dd" id="vd-dd"><button type="button" class="vd-dd-b" data-vd="dd" aria-haspopup="listbox" aria-expanded="false"><span>Sıralama:</span><b id="vd-dd-v"></b>
          <svg class="vd-dd-ok" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button><div class="vd-dd-m" role="listbox" id="vd-dd-m"></div></div>
      </div>
      <div class="vd-filtre" id="vd-filtre"></div>
      <div class="vd-grid" id="vd-grid"></div>
    </div>`;
    const qi = document.getElementById('vd-q'); qi.addEventListener('input', () => { VD.q = qi.value; VD.sayfa = 1; vdRenderGrid(); });
    vdDdCiz();
    pg.addEventListener('click', vdTik);
  }
  const lk = document.getElementById('vd-lock');
  if (lk) lk.style.display = (videos || []).some(v => v.locked) && !(typeof userHasPremium === 'function' && userHasPremium()) ? '' : 'none';
  vdRenderTree(); vdRenderGrid();
}
const VD_SIRA = [['onerilen', 'Önerilen', 'Yarım kalanlar önce'], ['mufredat', 'Müfredat sırası', 'Modül › Ünite › Ders'], ['sira', 'Video sırası', 'Eklenme sırası'],
  ['ad', 'Ada göre', 'A’dan Z’ye'], ['sure', 'Süreye göre', 'Kısadan uzuna']];
function vdDdCiz() {
  const v = document.getElementById('vd-dd-v'), m = document.getElementById('vd-dd-m'), d = document.getElementById('vd-dd');
  if (d) { d.classList.remove('acik'); const b = d.querySelector('.vd-dd-b'); if (b) b.setAttribute('aria-expanded', 'false'); }
  if (v) v.textContent = (VD_SIRA.find(x => x[0] === VD.sira) || VD_SIRA[0])[1];
  if (m) m.innerHTML = VD_SIRA.map(([k, ad, alt]) => `<button type="button" class="vd-dd-o${VD.sira === k ? ' sec' : ''}" role="option" aria-selected="${VD.sira === k}" data-vd="sira" data-v="${k}">
    <span><b>${ad}</b><small>${alt}</small></span>${VD.sira === k ? '<svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17 19 7"/></svg>' : ''}</button>`).join('');
}
document.addEventListener('mousedown', function (e) { const d = document.getElementById('vd-dd'); if (d && d.classList.contains('acik') && !d.contains(e.target)) { d.classList.remove('acik'); } });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { const d = document.getElementById('vd-dd'); if (d) d.classList.remove('acik'); } });
function vdRenderTree() { const t = document.getElementById('vd-tree'); if (t) t.innerHTML = vdTreeHTML(); }
const VD_SAYFA_BOY = 12;
function vdSayfaHTML(c, top, n) {
  const ok = d => `<svg viewBox="0 0 24 24"><polyline points="${d}"/></svg>`;
  const no = []; const ekle = x => { if (!no.includes(x)) no.push(x); };
  ekle(1); for (let i = c - 1; i <= c + 1; i++) if (i > 1 && i < top) ekle(i); ekle(top);
  let h = '', onc = 0;
  no.sort((a, b) => a - b).forEach(x => { if (x - onc > 1) h += '<span class="vd-pg-gap">…</span>'; h += `<button class="vd-pg-n${x === c ? ' sec' : ''}" data-vd="pg" data-p="${x}"${x === c ? ' aria-current="page"' : ''}>${x}</button>`; onc = x; });
  const bas = (c - 1) * VD_SAYFA_BOY + 1, son = Math.min(n, c * VD_SAYFA_BOY);
  return `<div class="vd-pager" role="navigation" aria-label="Sayfalar"><span class="vd-pg-bilgi">${bas}–${son} / ${n} video</span>
    <div class="vd-pg-ic"><button class="vd-pg-n ok" data-vd="pg" data-p="${c - 1}"${c <= 1 ? ' disabled' : ''} aria-label="Önceki sayfa">${ok('15 18 9 12 15 6')}</button>${h}
    <button class="vd-pg-n ok" data-vd="pg" data-p="${c + 1}"${c >= top ? ' disabled' : ''} aria-label="Sonraki sayfa">${ok("9 6 15 12 9 18")}</button></div></div>`;
}
function vdRenderGrid() {
  const g = document.getElementById('vd-grid'); if (!g) return;
  const l = vdListe(), fb = document.getElementById('vd-filtre'), bas = vdBaslikFiltre();
  if (fb) fb.innerHTML = bas ? `<span>${ekEsc(bas)}</span><em>${l.length} video</em><button class="vd-temizle" data-vd="f" data-f="">Filtreyi kaldır ×</button>` : '';
  const SAY = VD_SAYFA_BOY, top = Math.max(1, Math.ceil(l.length / SAY));
  VD.sayfa = Math.min(Math.max(1, VD.sayfa || 1), top);
  const parca = l.slice((VD.sayfa - 1) * SAY, VD.sayfa * SAY);
  g.innerHTML = l.length ? parca.map(vdKartHTML).join('') + (top > 1 ? vdSayfaHTML(VD.sayfa, top, l.length) : '')
    : `<div class="vd-bos"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><polygon points="10 9 15 12 10 15"/></svg>
        <b>${(videos || []).length ? 'Bu seçimde video yok' : 'Henüz video eklenmedi'}</b><span>${VD.q ? 'Aramayı değiştirmeyi dene.' : (VD.filtre ? 'Başka bir modül, ünite ya da ders seç.' : '')}</span></div>`;
}
function vdTik(e) {
  const t = e.target.closest('[data-vd]'); if (!t) return;
  const a = t.dataset.vd;
  if (a === 'f') {
    const wp = document.getElementById('page-watch');
    if (wp && wp.classList.contains('active') && typeof _wKonumGit === 'function') { _wKonumGit(t.dataset.f); return; }
    vdFiltre(t.dataset.f); return; }
  if (a === 'pg') { VD.sayfa = +t.dataset.p || 1; vdRenderGrid(); const g = document.getElementById('vd-grid'); if (g) g.scrollTop = 0; return; }
  if (a === 'tg') { const k = t.dataset.k; VD.acik.has(k) ? VD.acik.delete(k) : VD.acik.add(k); vdRenderTree(); return; }
  if (a === 'play') { if (typeof playVideo === 'function') playVideo(+t.dataset.i); return; }
  if (a === 'dd') { const d = document.getElementById('vd-dd'); const ac = !d.classList.contains('acik'); d.classList.toggle('acik', ac); t.setAttribute('aria-expanded', ac); return; }
  if (a === 'sira') { VD.sira = t.dataset.v; VD.sayfa = 1; vdDdCiz(); vdRenderGrid(); const g = document.getElementById('vd-grid'); if (g) g.scrollTop = 0; }
}
function vdFiltre(f) {
  VD.filtre = f || ''; VD.sayfa = 1;
  if (f && f !== 'yok' && !f.startsWith('k:')) { const p = f.slice(1).split('.'); VD.acik.add('m' + p[0]); if (p.length > 1) VD.acik.add('u' + p[0] + '.' + p[1]); }
  vdRenderTree(); vdRenderGrid();
  const g = document.getElementById('page-video'); if (g && g.getBoundingClientRect().top < 0) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.addEventListener('click', function (e) { const t = e.target.closest && e.target.closest('#vd-tree [data-vd]'); if (t) vdTik(e); });

/* Yönetim: video formundaki müfredat seçimi */
async function vdAdmMufredat(secili) {
  const sel = document.getElementById('cv-mf'); if (!sel) return;
  let units = [];
  try { const { data } = await sb.from('ek_units').select('modul_no, modul_ad, unite_no, unite_ad, toc').order('modul_no').order('unite_no'); units = data || []; } catch (e) {}
  let h = '<option value="">— Müfredata bağlama (genel video) —</option><optgroup label="Müfredat dışı">' + VD_KAT.map(k => `<option value="${k[0]}">${k[1]}</option>`).join('') + '</optgroup>';
  units.forEach(u => {
    h += `<optgroup label="Modül ${u.modul_no}${u.modul_ad ? ' — ' + ekEsc(u.modul_ad) : ''} · Ünite ${u.unite_no}${u.unite_ad ? ' — ' + ekEsc(u.unite_ad) : ''}">
      <option value="${u.modul_no}.${u.unite_no}">Ünitenin tamamı (Ünite ${u.unite_no})</option>`;
    (u.toc || []).filter(t => t.tur === 'ders').forEach(t => { h += `<option value="${u.modul_no}.${u.unite_no}.${t.no}">Ders ${t.no} — ${ekEsc(t.ad)}</option>`; });
    h += '</optgroup>';
  });
  const v = secili !== undefined ? secili : sel.value;
  sel.innerHTML = h;
  if (v && ![...sel.options].some(o => o.value === v)) sel.insertAdjacentHTML('beforeend', `<option value="${ekEsc(v)}">${ekEsc(v)} (ağaçta yok)</option>`);
  sel.value = v || '';
}
if (typeof window !== 'undefined') Object.assign(window, { vdOpen, vdRender, vdFiltre, vdAdmMufredat, VD });

if (typeof window !== 'undefined') {
  Object.assign(window, { mfYeniModul, mfTumu, mfDisaAktar, mfTopluOnizle, mfTopluUygula, mfPlanTemizle, icKartInit, icKartYukle, icKartSil, icInit, icTab, ekTopicYeni, ekAdmGorunum, ekAdmSayfalar, ekPdBol, ekPdKaldir, ekPdGoster, ozInit, ozRender, ozCmd, ozClear, ozEdit, ozSave, ozToggle, ozDelete, ekOpenRef, gwInit, gwOpen, gwBack, gwFiltre, gwSeviye, gwKural, gwAdmMove, ekAdmTab, ekOpen, ekAdmInit, ekAdmNew, ekAdmEdit, ekAdmCheck, ekAdmSave, ekAdmToggle, ekAdmDelete, ekAdmInsert,
    ekAdmImage, ekAdmCopyFormat, ekAdmList, ekTopicsInit, ekTopicSave, ekTopicDelete, ekTopicBulk, ekTopicEdit, ekParse });
}
