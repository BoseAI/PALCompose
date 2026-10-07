// =====================================================================================
// PalCompose - 3d/sim3d.js
// Simulazione del ciclo di pallettizzazione: il robot prende ogni deposito dal nastro e lo
// posa sul pallet nell'ordine dei numeri, entrando dal lato di approccio (Approach X/Y).
// Tutto e' calcolato in funzione del tempo: si puo' fermare, andare avanti e indietro.
// =====================================================================================
(function () {
  "use strict";
  var P = window.PC3D;
  if (!P || !P.cell) return;
  var THREE = P.THREE, MM = P.MM, C = P.cell;
  var deps = P.deposits, N = deps.length;
  var CH = P.CASE_HEIGHT, PH = P.PALLET_HEIGHT;

  // ===== FASI DEL CICLO (secondi a velocita' 1x) =====
  var PHASES = [
    { name: "Pick: down",       dur: 0.6 },
    { name: "Pick: grip",       dur: 0.25 },
    { name: "Pick: up",         dur: 0.6 },
    { name: "Transfer",         dur: 1.8 },
    { name: "Approach",         dur: 0.7 },
    { name: "Place",            dur: 0.5 },
    { name: "Release",          dur: 0.25 },
    { name: "Up",               dur: 0.6 },
    { name: "Return",           dur: 1.6 }
  ];
  var LEAD = 1.5;                                   // arrivo del primo deposito sul nastro
  var CYCLE = PHASES.reduce(function (s, p) { return s + p.dur; }, 0);
  var TOTAL = LEAD + N * CYCLE;
  var phaseStart = []; (function () { var t = 0; PHASES.forEach(function (p) { phaseStart.push(t); t += p.dur; }); })();
  var CONVEY_FROM = 3, CONVEY_TO = 8;               // il deposito successivo avanza sul nastro dalla fase 3 alla fine della 8

  var approach = { x: Number(P.state.Approach && P.state.Approach.x) || 0, z: -(Number(P.state.Approach && P.state.Approach.y) || 0) };
  var APPROACH_LIFT = 40;                           // mm sopra la posizione finale durante l'avvicinamento

  function ease(f) { f = Math.max(0, Math.min(1, f)); return f * f * (3 - 2 * f); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function lerp3(a, b, f) { return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f) }; }
  // Spostamento ad arco attorno all'asse J1 del robot (come un robot reale), non in linea retta
  function arc3(a, b, f) {
    var bx = C.base.x, bz = C.base.z;
    var aa = Math.atan2(a.z - bz, a.x - bx), ab = Math.atan2(b.z - bz, b.x - bx);
    var da = ab - aa;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    var ra = Math.hypot(a.x - bx, a.z - bz), rb = Math.hypot(b.x - bx, b.z - bz);
    var ang = aa + da * f, r = lerp(ra, rb, f);
    return { x: bx + r * Math.cos(ang), y: lerp(a.y, b.y, f), z: bz + r * Math.sin(ang) };
  }

  // Punti di riferimento: base del deposito (centro, mm)
  var pickLow = { x: C.pick.x, y: C.pick.y, z: C.pick.z };
  var pickHigh = { x: C.pick.x, y: C.safeY, z: C.pick.z };
  function placeLow(d) { return { x: d.cx, y: PH, z: d.cz }; }
  function placeAppLow(d) { return { x: d.cx + approach.x, y: PH + APPROACH_LIFT, z: d.cz + approach.z }; }
  function placeAppHigh(d) { return { x: d.cx + approach.x, y: C.safeY, z: d.cz + approach.z }; }

  // Percorso della base del deposito/pinza nella fase i del deposito d (f = 0..1)
  function pathAt(d, i, f) {
    var e = ease(f);
    switch (i) {
      case 0: return lerp3(pickHigh, pickLow, e);
      case 1: return pickLow;
      case 2: return lerp3(pickLow, pickHigh, e);
      case 3: return arc3(pickHigh, placeAppHigh(d), e);
      case 4: return lerp3(placeAppHigh(d), placeAppLow(d), e);
      case 5: return lerp3(placeAppLow(d), placeLow(d), e);
      case 6: return placeLow(d);
      case 7: return lerp3(placeLow(d), { x: d.cx, y: C.safeY, z: d.cz }, e);
      default: return arc3({ x: d.cx, y: C.safeY, z: d.cz }, pickHigh, e);
    }
  }

  // Gruppi 3D dei depositi (creati quando servono): uno sul nastro e uno in presa
  var groups = {};
  function groupFor(k) {
    if (!groups[k]) { groups[k] = P.buildDepositGroup(deps[k]); groups[k].visible = false; P.scene.add(groups[k]); }
    return groups[k];
  }
  function showGroup(k, pos) {
    var g = groupFor(k);
    g.position.set(pos.x * MM, (pos.y + CH / 2) * MM, pos.z * MM);
    g.visible = true;
    return g;
  }

  // ===== STATO A UN ISTANTE =====
  var time = 0;
  function info(t) {
    if (N === 0) return { k: -1 };
    if (t < LEAD) return { k: 0, lead: true, f: t / LEAD };
    var u = t - LEAD, k = Math.min(N - 1, Math.floor(u / CYCLE));
    var c = Math.min(CYCLE, u - k * CYCLE), i = 0;
    while (i < PHASES.length - 1 && c >= phaseStart[i + 1]) i++;
    return { k: k, i: i, c: c, f: (c - phaseStart[i]) / PHASES[i].dur, done: u >= N * CYCLE };
  }

  function setTime(t) {
    time = Math.max(0, Math.min(TOTAL, t));
    Object.keys(groups).forEach(function (k) { groups[k].visible = false; });
    var s = info(time), grip = pickHigh, placed = 0, label = "";
    if (s.k < 0) { label = "No deposits"; }
    else if (s.lead) {
      showGroup(0, { x: C.pick.x, y: C.pick.y, z: lerp(C.conveyor.zStart + 300, C.pick.z, ease(s.f)) });
      label = "Deposit 1/" + N + " · Infeed";
    } else if (s.done) {
      placed = N; label = "Completed · " + N + "/" + N;
    } else {
      var d = deps[s.k];
      grip = pathAt(d, s.i, s.f);
      placed = s.k + (s.i >= 7 ? 1 : 0);
      if (s.i <= 1) showGroup(s.k, pickLow);                 // sul nastro, in attesa di presa
      else if (s.i <= 6) showGroup(s.k, grip);               // in presa
      if (s.k + 1 < N && s.i >= CONVEY_FROM) {               // il deposito successivo avanza sul nastro
        var a = phaseStart[CONVEY_FROM], b = phaseStart[CONVEY_TO] + PHASES[CONVEY_TO].dur;
        showGroup(s.k + 1, { x: C.pick.x, y: C.pick.y, z: lerp(C.conveyor.zStart + 300, C.pick.z, ease((s.c - a) / (b - a))) });
      }
      label = "Deposit " + (s.k + 1) + "/" + N + " · " + PHASES[s.i].name;
      C.setGripperSize(d.box.w, d.box.h);
    }
    C.setWristTarget(grip.x, grip.y + CH + C.GRIP_H, grip.z, 0);
    P.setPlacedCount(placed);
    ui.status.textContent = label;
    ui.slider.value = TOTAL > 0 ? Math.round(time / TOTAL * 1000) : 0;
    P.requestRender();
  }

  // ===== RIPRODUZIONE =====
  var playing = false, speed = 1;
  P.onFrame(function (dt) {
    if (!playing) return;
    setTime(time + dt * speed);
    if (time >= TOTAL) setPlaying(false);
  });
  function setPlaying(on) {
    playing = on && N > 0;
    if (playing && time >= TOTAL) setTime(0);
    ui.play.textContent = playing ? "❚❚" : "▶";
    ui.play.className = (playing ? "defaultabilitato" : "defaultnormale") + " simBtn";
    P.setContinuous(playing);
  }
  function depositStart(k) { return k <= 0 ? 0 : LEAD + k * CYCLE; }
  function currentIndex() { var s = info(time); return s.k < 0 ? 0 : (s.lead ? 0 : (s.done ? N : s.k)); }

  // ===== INTERFACCIA =====
  var ui = {
    bar: document.getElementById("simBar"),
    toggle: document.getElementById("btnRobot"),
    play: document.getElementById("simPlay"),
    slider: document.getElementById("simSlider"),
    status: document.getElementById("simStatus"),
    speed: document.getElementById("simSpeed")
  };
  ui.play.onclick = function () { setPlaying(!playing); };
  document.getElementById("simStart").onclick = function () { setPlaying(false); setTime(0); };
  document.getElementById("simEnd").onclick = function () { setPlaying(false); setTime(TOTAL); };
  document.getElementById("simPrev").onclick = function () {
    setPlaying(false);
    var k = currentIndex(), s = info(time);
    // se si e' gia' oltre l'inizio del deposito corrente si torna al suo inizio, altrimenti al precedente
    var startK = depositStart(k);
    setTime(time - startK > 0.3 && !s.done ? startK : depositStart(Math.max(0, k - 1)));
  };
  document.getElementById("simNext").onclick = function () {
    setPlaying(false);
    var k = currentIndex();
    setTime(k + 1 >= N ? TOTAL : depositStart(k + 1));
  };
  ui.slider.oninput = function () { setPlaying(false); setTime(ui.slider.value / 1000 * TOTAL); };
  ui.speed.onchange = function () { speed = Number(ui.speed.value) || 1; };

  ui.toggle.onclick = function () {
    var on = !P.robotVisible;
    P.robotVisible = on;
    C.setVisible(on);
    ui.bar.style.display = on ? "flex" : "none";
    ui.toggle.className = (on ? "defaultabilitato" : "defaultnormale") + " txtBtn";
    P.setShadowArea(on ? P.span * 3.4 : P.span * 1.5);
    if (on) { P.setView("cell"); setTime(0); }
    else {
      setPlaying(false);
      Object.keys(groups).forEach(function (k) { groups[k].visible = false; });
      P.setPlacedCount();
      P.setView("pallet");
      P.requestRender();
    }
  };
})();
