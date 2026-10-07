// =====================================================================================
// PalCompose - 3d/robot3d.js
// Robot pallettizzatore a 4 assi (stile FANUC M-410, costruito nel codice) e nastro a rulli.
// Il robot e' nell'angolo in alto a sinistra del pallet (vista 2D), il nastro alla sua sinistra.
// Cinematica: J1 rotazione base, J2/J3 braccio a parallelogramma, polso sempre verticale, J4 rotazione pinza.
// Tutte le misure sono in mm; la scena e' in metri (PC3D.MM).
// =====================================================================================
(function () {
  "use strict";
  var P = window.PC3D;
  if (!P) return;
  var THREE = P.THREE, MM = P.MM;

  // ===== DIMENSIONI ROBOT (mm, ordine di grandezza di un M-410: sbraccio ~3 m) =====
  var H0 = 900;      // altezza asse spalla (J2) da terra
  var A1 = 320;      // distanza orizzontale asse J1 - asse J2
  var L1 = 1350;     // braccio (J2 -> J3)
  var L2 = 1450;     // avambraccio (J3 -> polso)
  var GRIP_H = 290;  // dal punto polso alla superficie di presa (sotto la pinza)

  // Posizione: angolo in alto a sinistra del pallet in 2D = (-X, -Z) in 3D
  var BASE = { x: -P.palletW / 2 - 950, z: -P.palletH / 2 - 950 };

  // Nastro di alimentazione: a sinistra del robot, le casse avanzano verso +Z fino al punto di presa
  var maxDep = 0;
  P.deposits.forEach(function (d) { maxDep = Math.max(maxDep, d.box.w, d.box.h); });
  var CONV = {
    x: BASE.x - 1450,
    width: Math.max(700, maxDep + 160),
    top: 750,
    zStart: BASE.z - 2700,
    zEnd: BASE.z + 250 + Math.max(350, maxDep / 2 + 100)
  };
  var PICK = { x: CONV.x, y: CONV.top, z: BASE.z + 250 };   // centro del deposito al punto di presa (base cassa)

  // ===== MATERIALI =====
  var yellow = new THREE.MeshStandardMaterial({ color: 0xF2C200, metalness: 0.25, roughness: 0.45 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: 0.4, roughness: 0.55 });
  var steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.7, roughness: 0.35 });
  var rubber = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.8 });

  function box(sx, sy, sz, mat) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  function cyl(r, h, mat, seg) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r * MM, r * MM, h * MM, seg || 32), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  function at(obj, x, y, z) { obj.position.set(x * MM, y * MM, z * MM); return obj; }

  // ===== ROBOT =====
  var robot = new THREE.Group();
  at(robot, BASE.x, 0, BASE.z);

  robot.add(at(box(950, 60, 950, dark), 0, 30, 0));                 // piastra a pavimento
  robot.add(at(cyl(400, 380, yellow), 0, 250, 0));                   // base fissa J1

  var turret = new THREE.Group();                                    // ruota con J1
  at(turret, 0, 440, 0);
  robot.add(turret);
  turret.add(at(box(780, 500, 640, yellow), 40, 250, 0));            // corpo girevole
  turret.add(at(box(320, 320, 520, dark), -420, 380, 0));            // contrappeso
  var shoulderJoint = cyl(170, 700, dark);                           // asse J2
  shoulderJoint.rotation.x = Math.PI / 2;
  turret.add(at(shoulderJoint, A1, H0 - 440, 0));

  // aste orientate lungo X locale: si posizionano tra due punti del piano della torretta
  function link(thickY, thickZ, mat) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(1, thickY * MM, thickZ * MM), mat);
    m.castShadow = m.receiveShadow = true;
    turret.add(m);
    return m;
  }
  function placeLink(m, x1, y1, x2, y2) {                            // coordinate nel piano torretta (mm, y da terra)
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    m.scale.x = len * MM;
    m.position.set((x1 + x2) / 2 * MM, ((y1 + y2) / 2 - 440) * MM, m.userData.z || 0);
    m.rotation.z = Math.atan2(dy, dx);
  }
  var upperArm = link(240, 220, yellow);
  var foreArm = link(190, 190, yellow);
  var paraRod = link(70, 70, steel); paraRod.userData.z = 150 * MM;  // asta del parallelogramma (di lato)
  var elbowJoint = cyl(130, 300, dark); elbowJoint.rotation.x = Math.PI / 2; turret.add(elbowJoint);

  // Polso + pinza: restano verticali, ruotano solo attorno a Y (J4)
  var wrist = new THREE.Group();
  robot.add(wrist);
  wrist.add(at(box(210, 220, 210, yellow), 0, -110, 0));
  wrist.add(at(cyl(120, 30, dark), 0, -235, 0));                     // flangia
  var plate = at(box(600, 40, 500, dark), 0, -270, 0);               // piastra pinza (dimensionata sul deposito)
  wrist.add(plate);
  var fingers = [];
  for (var i = 0; i < 4; i++) { var f = box(40, 160, 40, steel); wrist.add(f); fingers.push(f); }
  var wristJoint = cyl(110, 260, dark); wristJoint.rotation.x = Math.PI / 2; turret.add(wristJoint);

  // Dimensiona la pinza sul deposito (mm, assi della scena)
  function setGripperSize(w, d) {
    plate.scale.set((w + 40) / 600, 1, (d + 40) / 500);
    var hx = (w / 2 + 20) * MM, hz = (d / 2 + 20) * MM;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s, k) { fingers[k].position.set(s[0] * hx, -330 * MM, s[1] * hz); });
  }
  setGripperSize(600, 500);

  // Posa: wx, wy, wz = punto polso (mm, scena), toolYaw = rotazione pinza (rad, scena)
  function setWristTarget(wx, wy, wz, toolYaw) {
    var dx = wx - BASE.x, dz = wz - BASE.z;
    var theta = Math.atan2(-dz, dx);
    turret.rotation.y = theta;
    var r = Math.sqrt(dx * dx + dz * dz) - A1, h = wy - H0;
    var D = Math.sqrt(r * r + h * h);
    var Dc = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 1, D));       // fuori portata: braccio teso
    if (D > 0) { r *= Dc / D; h *= Dc / D; }
    var phi = Math.atan2(h, r) + Math.acos((L1 * L1 + Dc * Dc - L2 * L2) / (2 * L1 * Dc));   // gomito in alto
    var sx = A1, sy = H0;
    var ex = sx + L1 * Math.cos(phi), ey = sy + L1 * Math.sin(phi);
    var px = sx + r, py = sy + h;                                            // polso effettivo
    placeLink(upperArm, sx, sy, ex, ey);
    placeLink(foreArm, ex, ey, px, py);
    var fx = (px - ex) / L2, fy = (py - ey) / L2;                            // parallelogramma
    placeLink(paraRod, sx - fx * 260, sy - fy * 260, ex - fx * 260, ey - fy * 260);
    elbowJoint.position.set(ex * MM, (ey - 440) * MM, 0);
    wristJoint.position.set(px * MM, (py - 440) * MM, 0);
    // polso nel sistema del robot (non ruotato): stesso punto, ruotato di theta
    var c = Math.cos(theta), s = Math.sin(theta);
    wrist.position.set(px * c * MM, py * MM, -px * s * MM);
    wrist.rotation.y = toolYaw || 0;
  }
  P.scene.add(robot);

  // ===== NASTRO A RULLI =====
  var conveyor = new THREE.Group();
  (function buildConveyor() {
    var len = CONV.zEnd - CONV.zStart, zc = (CONV.zStart + CONV.zEnd) / 2, w = CONV.width;
    [-1, 1].forEach(function (s) {
      conveyor.add(at(box(50, 120, len, dark), CONV.x + s * (w / 2 + 25), CONV.top - 50, zc));       // sponde
    });
    for (var z = CONV.zStart + 60; z < CONV.zEnd - 30; z += 110) {
      var r = cyl(30, w, steel, 16); r.rotation.z = Math.PI / 2;
      conveyor.add(at(r, CONV.x, CONV.top - 30, z));                                               // rulli
    }
    for (var zl = CONV.zStart + 150; zl < CONV.zEnd; zl += 900) {
      [-1, 1].forEach(function (s) { conveyor.add(at(box(60, CONV.top - 110, 60, dark), CONV.x + s * (w / 2 + 25), (CONV.top - 110) / 2, zl)); });
    }
    conveyor.add(at(box(w + 100, 160, 40, rubber), CONV.x, CONV.top + 40, CONV.zEnd + 20));       // fermo di fine corsa
  })();
  P.scene.add(conveyor);

  // posizione di riposo: sopra il punto di presa
  var SAFE_Y = Math.max(CONV.top, P.PALLET_HEIGHT) + P.CASE_HEIGHT + 300;
  setWristTarget(PICK.x, SAFE_Y + P.CASE_HEIGHT + GRIP_H, PICK.z, 0);

  function setVisible(v) { robot.visible = conveyor.visible = v; }

  // Inquadratura della cella: robot, nastro e pallet, vista da davanti a destra
  var midX = (BASE.x + CONV.x + P.palletW / 2) / 2 * MM, midZ = (BASE.z + P.palletH / 2) / 2 * MM;
  var cellSize = (P.palletW / 2 - CONV.x + 600) * MM;
  P.views.cell = { pos: [midX + cellSize * 0.75, cellSize * 1.15, midZ + cellSize * 1.35], target: [midX, 0.9, midZ] };
  setVisible(false);

  P.cell = {
    base: BASE, conveyor: CONV, pick: PICK, safeY: SAFE_Y, GRIP_H: GRIP_H,
    setWristTarget: setWristTarget, setGripperSize: setGripperSize, setVisible: setVisible
  };
})();
