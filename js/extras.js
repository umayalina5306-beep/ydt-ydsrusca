// ============================================================
//  ODAK MODU + POMODORO  (backend gerektirmez, tamamen tarayıcıda)
//  Sağ altta bir buton ekler; tıklayınca panel açılır.
// ============================================================
(function () {
  let mode = "work";          // work | break
  let workMin = 25, breakMin = 5;
  let remaining = workMin * 60;
  let timer = null;
  let focusOn = false;

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function render() {
    const t = document.getElementById("pomo-time");
    if (t) t.textContent = fmt(remaining);
    const label = document.getElementById("pomo-mode");
    if (label) label.textContent = mode === "work" ? "Çalışma" : "Mola";
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timer); timer = null;
      // Süre bitti: modu değiştir
      if (mode === "work") {
        if (typeof window.logActivity === "function") { window.logActivity("pomodoros", 1); window.logActivity("focusMin", workMin); }
        mode = "break"; remaining = breakMin * 60;
      }
      else { mode = "work"; remaining = workMin * 60; }
      alert(mode === "break" ? "Çalışma bitti! 5 dakika mola ver. ☕" : "Mola bitti! Çalışmaya devam. 💪");
      const btn = document.getElementById("pomo-startbtn");
      if (btn) btn.textContent = "Başlat";
    }
    render();
  }

  function startPause() {
    const btn = document.getElementById("pomo-startbtn");
    if (timer) { clearInterval(timer); timer = null; btn.textContent = "Devam"; }
    else { timer = setInterval(tick, 1000); btn.textContent = "Duraklat"; }
  }

  function reset() {
    clearInterval(timer); timer = null;
    mode = "work"; remaining = workMin * 60;
    const btn = document.getElementById("pomo-startbtn");
    if (btn) btn.textContent = "Başlat";
    render();
  }

  function setDurations() {
    const w = parseInt(document.getElementById("pomo-work").value, 10);
    const b = parseInt(document.getElementById("pomo-break").value, 10);
    if (w >= 1 && w <= 90) workMin = w;
    if (b >= 1 && b <= 30) breakMin = b;
    reset();
  }

  function toggleFocus() {
    focusOn = !focusOn;
    document.body.classList.toggle("focus-mode", focusOn);
    const b = document.getElementById("focus-toggle");
    if (b) b.textContent = focusOn ? "Odak modu: AÇIK" : "Odak modu: kapalı";
  }

  function togglePanel() {
    const p = document.getElementById("pomo-panel");
    if (p) p.classList.toggle("open");
  }

  function build() {
    const wrap = document.createElement("div");
    wrap.id = "pomo-wrap";
    wrap.innerHTML =
      '<button id="pomo-fab" title="Odak / Pomodoro"><span class="pomo-fab-icon">⏱️</span></button>' +
      '<div id="pomo-panel">' +
      '  <div class="pomo-head"><span>Odak & Pomodoro</span><button id="pomo-x">✕</button></div>' +
      '  <div id="pomo-mode" class="pomo-mode">Çalışma</div>' +
      '  <div id="pomo-time" class="pomo-time">25:00</div>' +
      '  <div class="pomo-btns">' +
      '    <button id="pomo-startbtn" class="pomo-btn primary">Başlat</button>' +
      '    <button id="pomo-resetbtn" class="pomo-btn">Sıfırla</button>' +
      '  </div>' +
      '  <div class="pomo-row"><label>Çalışma (dk)</label><input id="pomo-work" type="number" min="1" max="90" value="25"></div>' +
      '  <div class="pomo-row"><label>Mola (dk)</label><input id="pomo-break" type="number" min="1" max="30" value="5"></div>' +
      '  <button id="focus-toggle" class="pomo-btn focus">Odak modu: kapalı</button>' +
      '  <div class="pomo-hint">Odak modu sayfadaki dikkat dağıtıcıları sessizleştirir.</div>' +
      '</div>';
    document.body.appendChild(wrap);

    document.getElementById("pomo-fab").onclick = togglePanel;
    document.getElementById("pomo-x").onclick = togglePanel;
    document.getElementById("pomo-startbtn").onclick = startPause;
    document.getElementById("pomo-resetbtn").onclick = reset;
    document.getElementById("pomo-work").onchange = setDurations;
    document.getElementById("pomo-break").onchange = setDurations;
    document.getElementById("focus-toggle").onclick = toggleFocus;
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
