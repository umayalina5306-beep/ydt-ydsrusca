/* ============================================================
   YDT-YDS Rusça · Genel arayüz parçaları
   - Üst bar hesap menüsü (Profilim / Yönetim / Çıkış listesi)
   - Sağ kenar araç sekmesi: Odak Zamanlayıcı + Sınavlara Kalan Süre
   ============================================================ */
(function () {
  const sv = (d, w) => '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const IC = {
    saat: sv('<circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 14.5"/><line x1="9.5" y1="2.5" x2="14.5" y2="2.5"/><line x1="12" y1="2.5" x2="12" y2="5"/>', 22),
    takvim: sv('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/><circle cx="8.5" cy="13.5" r=".6" fill="currentColor"/><circle cx="12" cy="13.5" r=".6" fill="currentColor"/><circle cx="15.5" cy="13.5" r=".6" fill="currentColor"/><circle cx="8.5" cy="17" r=".6" fill="currentColor"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>', 22),
    kapat: sv('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', 18),
    bilgi: sv('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>', 16)
  };

  /* ---------- Hesap menüsü ---------- */
  function hesapKapat() {
    const h = document.getElementById('hesap'); if (!h) return;
    h.classList.remove('acik');
    const b = h.querySelector('.hesap-b'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  function hesapMenu(e) {
    if (e) e.stopPropagation();
    const h = document.getElementById('hesap'); if (!h) return;
    const ac = !h.classList.contains('acik');
    if (ac) {
      const av = document.getElementById('account-avatar'), hav = document.getElementById('hm-av');
      if (av && hav) hav.innerHTML = av.innerHTML;
      const ad = document.getElementById('account-name'), rol = document.getElementById('account-plan');
      const had = document.getElementById('hm-ad'), hrol = document.getElementById('hm-rol');
      if (had && ad) had.textContent = ad.textContent;
      if (hrol && rol) hrol.textContent = rol.textContent;
      dockKapat();
    }
    h.classList.toggle('acik', ac);
    const b = h.querySelector('.hesap-b'); if (b) b.setAttribute('aria-expanded', ac ? 'true' : 'false');
  }
  function hesapGit(sayfa) { hesapKapat(); if (typeof showPage === 'function') showPage(sayfa); }
  document.addEventListener('mousedown', function (e) { const h = document.getElementById('hesap'); if (h && h.classList.contains('acik') && !h.contains(e.target)) hesapKapat(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hesapKapat(); dockKapat(); } });

  /* ---------- Sağ kenar araç sekmesi ---------- */
  let acikPanel = null;
  function dockKur() {
    if (document.getElementById('yan-dock')) return;
    const d = document.createElement('div');
    d.id = 'yan-dock';
    d.innerHTML =
      '<div class="yd-sekme" role="toolbar" aria-label="Araçlar">' +
      '  <button type="button" class="yd-b" data-p="pomo" title="Odak Zamanlayıcı" aria-label="Odak Zamanlayıcı">' + IC.saat + '<i class="yd-nokta"></i></button>' +
      '  <span class="yd-ayrac"></span>' +
      '  <button type="button" class="yd-b" data-p="sinav" title="Sınavlara Kalan Süre" aria-label="Sınavlara Kalan Süre">' + IC.takvim + '</button>' +
      '</div>' +
      '<div class="yd-panel" id="yd-pomo" role="dialog" aria-label="Odak Zamanlayıcı">' +
      '  <div class="yd-bas">' + IC.saat + '<span>Odak Zamanlayıcı</span><button type="button" class="yd-x" aria-label="Kapat">' + IC.kapat + '</button></div>' +
      '  <div class="yd-govde" id="yd-pomo-g"><div class="yd-bos">Zamanlayıcı yükleniyor…</div></div>' +
      '</div>' +
      '<div class="yd-panel" id="yd-sinav" role="dialog" aria-label="Sınavlara Kalan Süre">' +
      '  <div class="yd-bas">' + IC.takvim + '<span>Sınavlara Kalan Süre</span><button type="button" class="yd-x" aria-label="Kapat">' + IC.kapat + '</button></div>' +
      '  <div class="yd-govde" id="yd-sinav-g"></div>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      const b = e.target.closest('.yd-b'); if (b) { dockAc(b.dataset.p); return; }
      if (e.target.closest('.yd-x')) dockKapat();
    });
    pomoTasi();
    sinavCiz();
  }
  function dockAc(p) {
    if (acikPanel === p) { dockKapat(); return; }
    hesapKapat();
    acikPanel = p;
    document.querySelectorAll('#yan-dock .yd-panel').forEach(x => x.classList.toggle('acik', x.id === 'yd-' + p));
    document.querySelectorAll('#yan-dock .yd-b').forEach(x => x.classList.toggle('aktif', x.dataset.p === p));
    if (p === 'pomo') pomoTasi();
    if (p === 'sinav') sinavCiz();
  }
  function dockKapat() {
    acikPanel = null;
    document.querySelectorAll('#yan-dock .yd-panel').forEach(x => x.classList.remove('acik'));
    document.querySelectorAll('#yan-dock .yd-b').forEach(x => x.classList.remove('aktif'));
  }
  document.addEventListener('mousedown', function (e) { const d = document.getElementById('yan-dock'); if (acikPanel && d && !d.contains(e.target)) dockKapat(); });

  /* Mevcut pomodoro (extras.js) öğelerini panele taşı: kimlikleri korunduğu için zamanlayıcı aynen çalışır */
  function pomoTasi() {
    const g = document.getElementById('yd-pomo-g'), pan = document.getElementById('pomo-panel');
    if (!g || !pan || g.dataset.tasindi) return;
    g.innerHTML = '';
    [...pan.children].forEach(ch => { if (!ch.classList.contains('pomo-head')) g.appendChild(ch); });
    const ipucu = g.querySelector('.pomo-hint'); if (ipucu) ipucu.innerHTML = IC.bilgi + '<span>' + ipucu.textContent + '</span>';
    g.dataset.tasindi = '1';
    const w = document.getElementById('pomo-wrap'); if (w) w.classList.add('yd-gizli');
  }
  /* Zamanlayıcı çalışıyorsa sekmedeki saat simgesinde küçük altın nokta */
  setInterval(function () {
    const b = document.getElementById('pomo-startbtn'), n = document.querySelector('#yan-dock .yd-nokta');
    if (n) n.classList.toggle('gor', !!(b && /duraklat/i.test(b.textContent || '')));
    if (!document.getElementById('yd-pomo-g') || !document.getElementById('yd-pomo-g').dataset.tasindi) pomoTasi();
  }, 1000);

  /* Sınav listesi */
  const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function sinavCiz() {
    const g = document.getElementById('yd-sinav-g'); if (!g) return;
    const t = (typeof _examDates !== 'undefined' && _examDates) || {};
    const liste = [['YDT', t.ydt], ['YDS', t.yds], ['E-YDS', t.eyds]];
    g.innerHTML = liste.map(([ad, tarih]) => {
      let gun = 'Açıklanmadı', alt = 'Tarih henüz belli değil', cls = 'bos';
      if (tarih) {
        const kalan = Math.ceil((new Date(tarih + 'T09:00:00') - new Date()) / 864e5);
        const d = new Date(tarih + 'T09:00:00');
        alt = d.getDate() + ' ' + AY[d.getMonth()] + ' ' + d.getFullYear();
        if (kalan < 0) { gun = 'Geçti'; cls = 'gecti'; } else if (kalan === 0) { gun = 'Bugün'; cls = 'yakin'; } else { gun = kalan + ' gün'; cls = kalan <= 30 ? 'yakin' : ''; }
      }
      return '<div class="yd-sinav ' + cls + '"><span class="yd-s-ic">' + IC.takvim + '</span><div><small>' + ad + '</small><b>' + gun + '</b><span>' + alt + '</span></div></div>';
    }).join('');
  }
  // Sınav tarihleri sunucudan gelince panel de güncellensin
  if (typeof window.renderExamCountdowns === 'function') {
    const eski = window.renderExamCountdowns;
    window.renderExamCountdowns = function () { try { eski.apply(this, arguments); } catch (e) {} sinavCiz(); };
    try { renderExamCountdowns = window.renderExamCountdowns; } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(dockKur, 0)); else setTimeout(dockKur, 0);
  setTimeout(sinavCiz, 1500);

  Object.assign(window, { hesapMenu, hesapKapat, hesapGit, dockAc, dockKapat });
})();
