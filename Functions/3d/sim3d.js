// =====================================================================================
// PalCompose - 3d/sim3d.js
// Simulazione del ciclo di pallettizzazione: il robot prende ogni deposito dal nastro e lo
// posa sul pallet nell'ordine dei numeri, entrando dal lato di approccio (Approach X/Y).
// Con la sequenza di prelievo ottimizzata prende A e B insieme e li posa uno dopo l'altro.
// Tutto e' calcolato in funzione del tempo: si puo' fermare, andare avanti e indietro.
// =====================================================================================
(function () {
  "use strict";
  var P = window.PC3D;
  if (!P || !P.cell) return;
  var THREE = P.THREE, MM = P.MM, C = P.cell;
  var deps = P.deposits, N = deps.length;
  var CH = P.CASE_HEIGHT, PH = P.PALLET_HEIGHT;

  // ===== UNITA' DI PRESA =====
  // Di norma il robot prende un deposito alla volta. Con la sequenza di prelievo ottimizzata (testa A + B
  // indipendente) due depositi consecutivi A e B arrivano insieme: il primo ha presa "AB", il secondo "Nothing".
  // Il robot li prende entrambi, posa il primo (rilascia solo quel canale), risale e posa il secondo.
  var split = Number(P.state.PickType) === 1 || Number(P.state.PickType) === 3;
  function isPairStart(k) {
    var a = deps[k] && deps[k].box, b = deps[k + 1] && deps[k + 1].box;
    return split && !!a && !!b && a.picktype === "AB" && b.picktype === "Nothing" &&
      (a.depositType === "A" || a.depositType === "B") && (b.depositType === "A" || b.depositType === "B") &&
      a.depositType !== b.depositType;
  }
  // Posizione (mm, scena) del deposito "altro" rispetto al primo mentre sono in presa:
  // testa standard (tipo 1): A davanti, B dietro lungo X della testa; in linea (tipo 3): A a sinistra, B a destra.
  // Il vettore e' nel riferimento del deposito a 0 gradi e ruota con l'angolo del primo deposito (2D: Y verso l'alto).
  function pairOffset(first) {
    var A = P.state.DepDimA || { x: 0, y: 0 }, B = P.state.DepDimB || { x: 0, y: 0 };
    var vx = 0, vy = 0;
    if (Number(P.state.PickType) === 1) vx = -(A.x + B.x) / 2; else vy = -(A.y + B.y) / 2;
    if (first.depositType === "B") { vx = -vx; vy = -vy; }
    var t = (Number(first.angle) || 0) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    return { x: vx * c - vy * s, z: -(vx * s + vy * c) };
  }
  var units = [];
  for (var k = 0; k < N; k++) {
    if (isPairStart(k)) {
      var off = pairOffset(deps[k].box), b1 = deps[k].box, b2 = deps[k + 1].box;
      // ingombro dei due depositi in presa (primo al centro): la testa si centra su questo rettangolo
      var x0 = Math.min(-b1.w / 2, off.x - b2.w / 2), x1 = Math.max(b1.w / 2, off.x + b2.w / 2);
      var z0 = Math.min(-b1.h / 2, off.z - b2.h / 2), z1 = Math.max(b1.h / 2, off.z + b2.h / 2);
      var ctr = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
      units.push({ deps: [k, k + 1], rel: [{ x: -ctr.x, z: -ctr.z }, { x: off.x - ctr.x, z: off.z - ctr.z }], size: { w: x1 - x0, h: z1 - z0 } });
      k++;
    } else {
      units.push({ deps: [k], rel: [{ x: 0, z: 0 }], size: { w: deps[k].box.w, h: deps[k].box.h } });
    }
  }
  var U = units.length;

  // ===== FASI DEL CICLO (secondi a velocita' 1x) =====
  // put: deposito posato (indice nell'unita'); carry: depositi ancora in presa durante la fase
  var PHASES_SINGLE = [
    { name: "Pick: down", dur: 0.6 }, { name: "Pick: grip", dur: 0.25 }, { name: "Pick: up", dur: 0.6 },
    { name: "Transfer", dur: 1.8 }, { name: "Approach", dur: 0.7 }, { name: "Place", dur: 0.5 },
    { name: "Release", dur: 0.25 }, { name: "Up", dur: 0.6 }, { name: "Return", dur: 1.6 }
  ];
  var PHASES_PAIR = [
    { name: "Pick A+B: down", dur: 0.6 }, { name: "Pick A+B: grip", dur: 0.25 }, { name: "Pick A+B: up", dur: 0.6 },
    { name: "Transfer", dur: 1.8 }, { name: "Approach", dur: 0.7 }, { name: "Place", dur: 0.5 },
    { name: "Release", dur: 0.25 }, { name: "Up", dur: 0.6 },
    { name: "Move", dur: 0.9 }, { name: "Approach", dur: 0.7 }, { name: "Place", dur: 0.5 },
    { name: "Release", dur: 0.25 }, { name: "Up", dur: 0.6 }, { name: "Return", dur: 1.6 }
  ];
  function dur(list) { return list.reduce(function (s, p) { return s + p.dur; }, 0); }
  function starts(list) { var t = 0; return list.map(function (p) { var s0 = t; t += p.dur; return s0; }); }
  var START_SINGLE = starts(PHASES_SINGLE), START_PAIR = starts(PHASES_PAIR);
  var LEAD = 1.5;                                   // arrivo del primo deposito sul nastro
  var unitStart = [], TOTAL = LEAD;
  units.forEach(function (u) {
    u.phases = u.deps.length > 1 ? PHASES_PAIR : PHASES_SINGLE;
    u.starts = u.deps.length > 1 ? START_PAIR : START_SINGLE;
    u.cycle = dur(u.phases);
    unitStart.push(TOTAL); TOTAL += u.cycle;
  });
  var CONVEY_FROM = 3;                              // l'unita' successiva avanza sul nastro dal Transfer alla fine del ciclo

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

  // Punti di riferimento del centro testa (= centro dell'ingombro in presa, base casse, mm)
  var pickLow = { x: C.pick.x, y: C.pick.y, z: C.pick.z };
  var pickHigh = { x: C.pick.x, y: C.safeY, z: C.pick.z };
  // centro testa quando il deposito j dell'unita' u e' nella sua posizione finale
  function headAt(u, j, y, app) {
    var d = deps[u.deps[j]], r = u.rel[j];
    return { x: d.cx - r.x + (app ? approach.x : 0), y: y, z: d.cz - r.z + (app ? approach.z : 0) };
  }

  // Percorso del centro testa nella fase i dell'unita' u (f = 0..1)
  function pathAt(u, i, f) {
    var e = ease(f);
    var low = function (j) { return headAt(u, j, PH, false); };
    var appLow = function (j) { return headAt(u, j, PH + APPROACH_LIFT, true); };
    var appHigh = function (j) { return headAt(u, j, C.safeY, true); };
    var high = function (j) { return headAt(u, j, C.safeY, false); };
    switch (i) {
      case 0: return lerp3(pickHigh, pickLow, e);
      case 1: return pickLow;
      case 2: return lerp3(pickLow, pickHigh, e);
      case 3: return arc3(pickHigh, appHigh(0), e);
      case 4: return lerp3(appHigh(0), appLow(0), e);
      case 5: return lerp3(appLow(0), low(0), e);
      case 6: return low(0);
      case 7: return lerp3(low(0), high(0), e);
    }
    if (u.deps.length === 1) return arc3(high(0), pickHigh, e);
    switch (i) {
      case 8: return lerp3(high(0), appHigh(1), e);
      case 9: return lerp3(appHigh(1), appLow(1), e);
      case 10: return lerp3(appLow(1), low(1), e);
      case 11: return low(1);
      case 12: return lerp3(low(1), high(1), e);
      default: return arc3(high(1), pickHigh, e);
    }
  }
  // fase in cui il deposito j dell'unita' viene rilasciato (da quella successiva e' sul pallet)
  function releasePhase(u, j) { return j === 0 ? 6 : 11; }

  // Gruppi 3D dei depositi (creati quando servono): sul nastro o in presa
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
  // mostra i depositi dell'unita' attorno al centro testa h (solo quelli indicati da "which")
  function showUnit(u, h, which) {
    u.deps.forEach(function (k, j) {
      if (which && !which[j]) return;
      showGroup(k, { x: h.x + u.rel[j].x, y: h.y, z: h.z + u.rel[j].z });
    });
  }
  function onConveyor(u, f) {
    showUnit(u, { x: C.pick.x, y: C.pick.y, z: lerp(C.conveyor.zStart + 300, C.pick.z, ease(f)) });
  }

  // ===== STATO A UN ISTANTE =====
  var time = 0;
  function info(t) {
    if (U === 0) return { k: -1 };
    if (t < LEAD) return { k: 0, lead: true, f: t / LEAD };
    if (t >= TOTAL) return { k: U - 1, done: true };
    var k = U - 1;
    while (k > 0 && unitStart[k] > t) k--;
    var u = units[k], c = t - unitStart[k], i = 0;
    while (i < u.phases.length - 1 && c >= u.starts[i + 1]) i++;
    return { k: k, i: i, c: c, f: (c - u.starts[i]) / u.phases[i].dur };
  }

  function setTime(t) {
    time = Math.max(0, Math.min(TOTAL, t));
    Object.keys(groups).forEach(function (k) { groups[k].visible = false; });
    var s = info(time), grip = pickHigh, placed = 0, label = "";
    if (s.k < 0) { label = "No deposits"; }
    else if (s.lead) {
      onConveyor(units[0], s.f);
      label = "Deposit " + (units[0].deps[0] + 1) + "/" + N + " · Infeed";
      C.setGripperSize(units[0].size.w, units[0].size.h);
    } else if (s.done) {
      placed = N; label = "Completed · " + N + "/" + N;
    } else {
      var u = units[s.k];
      grip = pathAt(u, s.i, s.f);
      placed = u.deps[0];
      var held = u.deps.map(function (k, j) {
        if (s.i >= releasePhase(u, j) + 1) { placed = k + 1; return false; }
        return true;
      });
      if (s.i <= 1) showUnit(u, pickLow);                    // sul nastro, in attesa di presa
      else showUnit(u, grip, held);                          // in presa (solo quelli non ancora rilasciati)
      if (s.k + 1 < U && s.i >= CONVEY_FROM) {               // l'unita' successiva avanza sul nastro
        var a = u.starts[CONVEY_FROM];
        onConveyor(units[s.k + 1], (s.c - a) / (u.cycle - a));
      }
      var cur = u.deps.length > 1 && s.i >= 8 ? u.deps[1] : u.deps[0];
      label = "Deposit " + (cur + 1) + "/" + N + (u.deps.length > 1 ? " (A+B pick)" : "") + " · " + u.phases[s.i].name;
      C.setGripperSize(u.size.w, u.size.h);
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
  function depositStart(k) { return k <= 0 ? 0 : unitStart[k]; }
  function currentIndex() { var s = info(time); return s.k < 0 ? 0 : (s.lead ? 0 : (s.done ? U : s.k)); }

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
    setTime(k + 1 >= U ? TOTAL : depositStart(k + 1));
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
