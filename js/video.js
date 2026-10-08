/* ============================================================
   YDT-YDS Rusça · Video Dersler (liste, müfredat ağacı, sayfalama)
   ekitap.js'ten sonra yüklenir (ekEsc gibi ortak yardımcıları kullanır)
   ============================================================ */
/* ------------------------------------------------------------
   VİDEO DERSLER — müfredata bağlı liste (Modül → Ünite → Ders)
   content_videos.mf_ref: "M.Ü.D" (ör. 1.2.3) ya da "M.Ü" (tüm ünite)
   ============================================================ */
const VD = { units: [], views: {}, filtre: '', q: '', sira: 'sira', acik: new Set(['m1', 'u1.1']), yuklendi: false, _yukleniyor: null };
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
const VD_SIRA = [['sira', 'Video sırası', 'Yönetimde belirlenen sıra'], ['mufredat', 'Müfredat sırası', 'Modül › Ünite › Ders'], ['onerilen', 'Kaldığım yerden', 'Yarım kalanlar önce'],
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
