// =====================================================================================
// PalCompose - 3d/scene3d.js
// Vista 3D: scena, pallet, casse dei depositi, etichette, telecamera.
// Espone window.PC3D, usato da robot3d.js (robot e nastro) e sim3d.js (simulazione).
// =====================================================================================
(function () {
  "use strict";

  if (typeof THREE === "undefined") { show3DError("3D library not loaded", "libs/three/three.bundle.js"); return; }

  // Stato dal 2D: sessionStorage, oppure window.name se il browser non conserva sessionStorage tra le pagine
  var state = null;
  try { state = JSON.parse(sessionStorage.getItem("state") || "null"); } catch (e) { state = null; }
  if (!state && typeof window.name === "string" && window.name.indexOf("PALSTATE:") === 0) {
    try { state = JSON.parse(window.name.substring(9)); } catch (e) { state = null; }
  }

  // ===== BOTTONE 2D =====
  (function () {
    var button = document.getElementById("2D");
    var svgNormal = document.getElementById("svgNormal2D"), svgPressed = document.getElementById("svgPressed2D");
    function press() { svgNormal.style.display = "block"; svgPressed.style.display = "none"; }
    function release() { svgNormal.style.display = "none"; svgPressed.style.display = "block"; }
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    release();
    button.onclick = function () {
      var l = document.getElementById("loader3D");
      l.className = ""; l.style.display = "flex"; document.getElementById("loaderText").textContent = "Loading...";
      window.location.href = "Index.html";
    };
  })();

  if (!state || !state.boxes) {
    show3DError("No configuration data", "Return to 2D and press 3D again");
    return;
  }

  // ===== COSTANTI (mm) =====
  var MM = 0.001;              // la scena è in metri, i dati in millimetri
  var PALLET_HEIGHT = 144;
  var CASE_HEIGHT = 300;       // altezza cassa (non disponibile dal PLC)
  var CASE_GAP = 6;            // fessura visiva tra casse adiacenti
  var palletW = state.palletReal.w, palletH = state.palletReal.h;
  var span = Math.max(palletW, palletH) * MM;

  // ===== RENDERER / SCENA =====
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (e) { show3DError("3D not supported by this browser (WebGL not available)", e && e.message); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6eaee);
  scene.fog = new THREE.Fog(0xe6eaee, span * 6, span * 14);
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 200);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;   // non sotto il pavimento
  controls.minDistance = span * 0.4;
  controls.maxDistance = span * 10;

  // Inquadrature: solo pallet oppure pallet + robot + nastro
  var VIEWS = {
    pallet: { pos: [span * 0.9, span * 1.1, span * 1.4], target: [0, (PALLET_HEIGHT + CASE_HEIGHT / 2) * MM, 0] },
    top:    { pos: [0, span * 2.2, 0.0001], target: [0, PALLET_HEIGHT * MM, 0] },
    cell:   { pos: [span * 1.6, span * 2.1, span * 2.6], target: [-span * 0.55, 0.5, -span * 0.35] }
  };
  function setView(name) {
    var v = VIEWS[name];
    camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
    controls.target.set(v.target[0], v.target[1], v.target[2]);
    controls.update();
  }
  setView("pallet");

  // ===== LUCI =====
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.35));
  var sun = new THREE.DirectionalLight(0xfff4e5, 2.6);
  sun.position.set(span * 1.2, span * 2.5, span * 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  function setShadowArea(radius) {
    var sc = sun.shadow.camera;
    sc.left = sc.bottom = -radius; sc.right = sc.top = radius; sc.near = 0.1; sc.far = span * 12;
    sc.updateProjectionMatrix();
  }
  setShadowArea(span * 1.5);
  scene.add(sun);

  // ===== PAVIMENTO =====
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(span * 20, span * 20),
                             new THREE.MeshStandardMaterial({ color: 0xd5dae0, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  var grid = new THREE.GridHelper(span * 8, 32, 0xb9c0c8, 0xc9cfd6);
  grid.position.y = 0.0005;
  scene.add(grid);

  // ===== TEXTURE PROCEDURALI =====
  function canvasTexture(size, paint) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    paint(c.getContext("2d"), size);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function rand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function paintKraft(g, s, seed) {
    var r = rand(seed || 7);
    g.fillStyle = "#b8864a"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 1800; i++) {                       // fibre del cartone
      g.fillStyle = r() < 0.5 ? "rgba(120,80,35,0.10)" : "rgba(255,235,200,0.10)";
      g.fillRect(r() * s, r() * s, 1 + r() * 3, 1);
    }
    g.strokeStyle = "rgba(90,58,25,0.55)"; g.lineWidth = s * 0.02;  // bordo scuro per leggere gli spigoli
    g.strokeRect(0, 0, s, s);
  }
  function paintTape(g, s, alongX) {
    var tw = s * 0.2;
    g.fillStyle = "rgba(222,190,135,0.9)";
    if (alongX) g.fillRect(0, (s - tw) / 2, s, tw); else g.fillRect((s - tw) / 2, 0, tw, s);
    g.strokeStyle = "rgba(150,110,60,0.5)"; g.lineWidth = 1.5;
    if (alongX) { g.strokeRect(-2, (s - tw) / 2, s + 4, tw); } else { g.strokeRect((s - tw) / 2, -2, tw, s + 4); }
    g.strokeStyle = "rgba(110,72,30,0.6)"; g.lineWidth = 2;   // linea di chiusura dei lembi
    g.beginPath();
    if (alongX) { g.moveTo(0, s / 2); g.lineTo(s, s / 2); } else { g.moveTo(s / 2, 0); g.lineTo(s / 2, s); }
    g.stroke();
  }
  // Etichetta rettangolare (texture 512x256 = proporzione 2:1, si adatta a laterale e ad angolo)
  function paintLabel(g, w, h) {
    g.fillStyle = "#fbfbf7"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#9aa1a8"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#222";
    var r = rand(11);
    for (var bx = w * 0.06; bx < w * 0.94; bx += 3 + Math.floor(r() * 4)) g.fillRect(bx, h * 0.52, 1 + Math.floor(r() * 3), h * 0.34);
    g.fillRect(w * 0.06, h * 0.12, w * 0.5, h * 0.09);
    g.fillRect(w * 0.06, h * 0.27, w * 0.32, h * 0.07);
    g.fillRect(w * 0.62, h * 0.12, w * 0.3, h * 0.22);
    g.fillStyle = "#fbfbf7"; g.fillRect(w * 0.64, h * 0.14, w * 0.26, h * 0.18);
    g.fillStyle = "#222"; g.font = "bold " + Math.round(h * 0.14) + "px Arial"; g.fillText("SSCC", w * 0.66, h * 0.29);
  }
  // rettangolo arrotondato compatibile anche con browser senza ctx.roundRect
  function roundRectPath(g, x, y, w, h, r) {
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  // ===== PALLET (legno, generato) =====
  var woodTex = canvasTexture(256, function (g, s) {
    var r = rand(3);
    g.fillStyle = "#c9a36e"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 70; i++) {
      g.strokeStyle = "rgba(" + (110 + r() * 40 | 0) + "," + (75 + r() * 25 | 0) + ",40," + (0.15 + r() * 0.25) + ")";
      g.lineWidth = 0.5 + r() * 2;
      var y0 = r() * s;
      g.beginPath(); g.moveTo(0, y0);
      g.bezierCurveTo(s * 0.3, y0 + (r() - 0.5) * 12, s * 0.7, y0 + (r() - 0.5) * 12, s, y0 + (r() - 0.5) * 6);
      g.stroke();
    }
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  var woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
  var blockMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xd8c8a8, roughness: 0.9 });

  var pallet = new THREE.Group();
  function addBoard(cx, cy, cz, sx, sy, sz, mat) {   // mm, centro in coordinate pallet (x destra, z verso l'operatore)
    var m = new THREE.Mesh(new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM), mat);
    m.position.set(cx * MM, cy * MM, cz * MM);
    m.castShadow = m.receiveShadow = true;
    pallet.add(m);
  }
  (function buildPallet() {
    var T = 22, BLOCK = 78;
    var colsX = [-palletW / 2 + 72.5, 0, palletW / 2 - 72.5];   // file di blocchi lungo X
    var rowsZ = [-palletH / 2 + 50, 0, palletH / 2 - 50];       // file di blocchi lungo Z
    rowsZ.forEach(function (z) { addBoard(0, T / 2, z, palletW, T, 100, woodMat); });                 // assi inferiori
    colsX.forEach(function (x) { rowsZ.forEach(function (z) { addBoard(x, T + BLOCK / 2, z, 145, BLOCK, 100, blockMat); }); }); // blocchi
    colsX.forEach(function (x) { addBoard(x, T + BLOCK + T / 2, 0, 145, T, palletH, woodMat); });     // traverse
    var n = 5, widths = [145, 100, 145, 100, 145];                                                  // assi superiori
    var free = (palletH - widths.reduce(function (a, b) { return a + b; }, 0)) / (n - 1);
    var z = -palletH / 2;
    for (var i = 0; i < n; i++) { addBoard(0, PALLET_HEIGHT - T / 2, z + widths[i] / 2, palletW, T, widths[i], woodMat); z += widths[i] + free; }
  })();
  scene.add(pallet);

  // ===== CASSE =====
  // Ogni deposito è diviso nelle casse che lo compongono (stessa logica di getCaseGrid nel 2D)
  function getCaseGrid(box) {
    var cw = state.boxSize.w, ch = state.boxSize.h;
    if (!(cw > 0) || !(ch > 0)) return null;
    function fit(a, b, rotated) {
      var nx = Math.round(box.w / a), ny = Math.round(box.h / b);
      if (nx < 1 || ny < 1) return null;
      return { nx: nx, ny: ny, cw: a, ch: b, rotated: rotated, err: Math.abs(box.w - nx * a) + Math.abs(box.h - ny * b) };
    }
    var f1 = fit(cw, ch, false), f2 = fit(ch, cw, true);
    var best = !f1 ? f2 : !f2 ? f1 : (f2.err < f1.err ? f2 : f1);
    if (!best || best.err > Math.max(cw, ch) * 0.25 || best.nx * best.ny > 100) return null;
    return best;
  }

  // Rotazione della singola cassa: quella del deposito, +90° se le casse sono girate rispetto al deposito (picking wheel)
  function getCaseAngle(box, grid) {
    var a = Number(box.angle) || 0;
    if (grid && grid.rotated !== (a % 180 === 90)) a = (a + 90) % 360;
    return a;
  }

  var caseW = state.boxSize.w, caseD = state.boxSize.h;
  var kraft = canvasTexture(256, function (g, s) { paintKraft(g, s, 7); });
  var kraftTop = canvasTexture(256, function (g, s) { paintKraft(g, s, 9); paintTape(g, s, caseW >= caseD); });
  var matSide = new THREE.MeshStandardMaterial({ map: kraft, roughness: 0.9 });
  var caseMaterials = [matSide, matSide,                                               // +x, -x
                       new THREE.MeshStandardMaterial({ map: kraftTop, roughness: 0.85 }), matSide, // +y, -y
                       matSide, matSide];                                                       // +z, -z
  var caseGeo = new THREE.BoxGeometry((caseW - CASE_GAP) * MM, CASE_HEIGHT * MM, (caseD - CASE_GAP) * MM);

  // Depositi in ordine di numero (= ordine di deposito del robot), ciascuno con le sue casse
  // (posizione relativa al centro del deposito, in mm) e il suo intervallo nelle InstancedMesh
  var deposits = state.boxes.slice().sort(function (a, b) { return a.id - b.id; }).map(function (box) {
    var dep = {
      box: box, id: box.id,
      cx: box.x + box.w / 2 - palletW / 2 + state.Offset.x,          // centro sul pallet (mm, coordinate scena)
      cz: -(box.y + box.h / 2 - palletH / 2 + state.Offset.y),
      cases: [], fallback: null
    };
    var g = getCaseGrid(box);
    if (!g) return dep;
    var stepX = box.w / g.nx, stepZ = box.h / g.ny;
    var yaw = getCaseAngle(box, g) * Math.PI / 180;
    for (var i = 0; i < g.nx; i++) {
      for (var j = 0; j < g.ny; j++) {
        dep.cases.push({ dx: -box.w / 2 + stepX * (i + 0.5), dz: box.h / 2 - stepZ * (j + 0.5), yaw: yaw });
      }
    }
    return dep;
  });

  var caseCount = 0;
  deposits.forEach(function (d) { d.instStart = caseCount; caseCount += d.cases.length; });

  // ===== ETICHETTE SULLE CASSE =====
  // Cassa a 0° vista dall'alto: lato destro = +X, lato basso (2D) = +Z.
  // CornerLabelling = true  -> etichetta piegata sull'angolo destra/basso (metà su +Z, metà su +X)
  // CornerLabelling = false -> etichetta laterale al centro del lato destro (+X)
  var labelParts = (function () {
    var LABEL_H = 100, LABEL_SIDE_LEN = 150, LABEL_CORNER_LEN = 100, OUT = 0.8; // mm
    var cw = caseW - CASE_GAP, cd = caseD - CASE_GAP;
    var cy = CASE_HEIGHT * 0.12;                       // centro etichetta rispetto al centro cassa
    var lh = Math.min(LABEL_H, CASE_HEIGHT * 0.6);
    var c = document.createElement("canvas"); c.width = 512; c.height = 256;
    paintLabel(c.getContext("2d"), 512, 256);
    var labelTex = new THREE.CanvasTexture(c); labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    function plane(len, u0, u1) {                      // piano con una porzione orizzontale della texture
      var geo = new THREE.PlaneGeometry(len * MM, lh * MM);
      var uv = geo.attributes.uv;
      for (var i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
      return geo;
    }
    var parts = [], rot = new THREE.Matrix4();
    if (state.CornerLabelling) {
      var lc = Math.min(LABEL_CORNER_LEN, cw * 0.9, cd * 0.9);
      parts.push({ geo: plane(lc, 0, 0.5), local: new THREE.Matrix4().makeTranslation((cw / 2 - lc / 2) * MM, cy * MM, (cd / 2 + OUT) * MM) });
      rot.makeRotationY(Math.PI / 2);
      parts.push({ geo: plane(lc, 0.5, 1), local: new THREE.Matrix4().makeTranslation((cw / 2 + OUT) * MM, cy * MM, (cd / 2 - lc / 2) * MM).multiply(rot.clone()) });
    } else {
      var ls = Math.min(LABEL_SIDE_LEN, cd * 0.85);
      rot.makeRotationY(Math.PI / 2);
      parts.push({ geo: plane(ls, 0, 1), local: new THREE.Matrix4().makeTranslation((cw / 2 + OUT) * MM, cy * MM, 0).multiply(rot.clone()) });
    }
    parts.forEach(function (p) { p.mat = labelMat; });
    return parts;
  })();

  // Casse sul pallet: una InstancedMesh per le casse e una per ogni pezzo di etichetta.
  // Le istanze sono ordinate per deposito: mostrare i primi N depositi = impostare count.
  var up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  function caseMatrix(x, y, z, yaw) {               // mm -> matrice in metri
    return new THREE.Matrix4().compose(new THREE.Vector3(x * MM, y * MM, z * MM), new THREE.Quaternion().setFromAxisAngle(up, yaw), one);
  }
  var instanced = [];
  if (caseCount) {
    var casesMesh = new THREE.InstancedMesh(caseGeo, caseMaterials, caseCount);
    casesMesh.castShadow = casesMesh.receiveShadow = true;
    instanced.push(casesMesh);
    var labelMeshes = labelParts.map(function (p) { var m = new THREE.InstancedMesh(p.geo, p.mat, caseCount); m.receiveShadow = true; return m; });
    instanced = instanced.concat(labelMeshes);
    deposits.forEach(function (d) {
      d.cases.forEach(function (c, k) {
        var m = caseMatrix(d.cx + c.dx, PALLET_HEIGHT + CASE_HEIGHT / 2, d.cz + c.dz, c.yaw);
        casesMesh.setMatrixAt(d.instStart + k, m);
        labelParts.forEach(function (p, n) { labelMeshes[n].setMatrixAt(d.instStart + k, m.clone().multiply(p.local)); });
      });
    });
    instanced.forEach(function (m) { scene.add(m); });
  }
  // depositi che non si riescono a dividere in casse: un unico blocco
  deposits.forEach(function (d) {
    if (d.cases.length) return;
    var m = new THREE.Mesh(new THREE.BoxGeometry((d.box.w - CASE_GAP) * MM, CASE_HEIGHT * MM, (d.box.h - CASE_GAP) * MM), caseMaterials);
    m.position.set(d.cx * MM, (PALLET_HEIGHT + CASE_HEIGHT / 2) * MM, d.cz * MM);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    d.fallback = m;
  });

  // Gruppo con le casse di un deposito (origine = centro del deposito, a meta' altezza cassa):
  // usato dalla simulazione per il deposito sul nastro e in presa al robot
  function buildDepositGroup(d) {
    var g = new THREE.Group();
    if (!d.cases.length) {
      var f = new THREE.Mesh(new THREE.BoxGeometry((d.box.w - CASE_GAP) * MM, CASE_HEIGHT * MM, (d.box.h - CASE_GAP) * MM), caseMaterials);
      f.castShadow = true; g.add(f);
      return g;
    }
    d.cases.forEach(function (c) {
      var holder = new THREE.Group();
      holder.position.set(c.dx * MM, 0, c.dz * MM);
      holder.rotation.y = c.yaw;
      var m = new THREE.Mesh(caseGeo, caseMaterials);
      m.castShadow = true;
      holder.add(m);
      labelParts.forEach(function (p) {
        var lm = new THREE.Mesh(p.geo, p.mat);
        lm.applyMatrix4(p.local);
        holder.add(lm);
      });
      g.add(holder);
    });
    return g;
  }

  // ===== ETICHETTE DEPOSITI (numero + tipo) =====
  var TYPE_COLORS = { A: "#ffb703", B: "#219ebc", AB: "#09b5a0" };
  var labels = new THREE.Group();
  deposits.forEach(function (d) {
    var box = d.box;
    var c = document.createElement("canvas"); c.width = 160; c.height = 72;
    var g = c.getContext("2d");
    g.fillStyle = TYPE_COLORS[box.depositType] || "#666";
    g.beginPath(); roundRectPath(g, 4, 4, 152, 64, 14); g.fill();
    g.lineWidth = 3; g.strokeStyle = "#023047"; g.stroke();
    g.fillStyle = "#023047"; g.font = "bold 38px Arial"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(box.id + " " + box.depositType, 80, 38);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
    var h = Math.min(box.w, box.h, 220) * 0.45 * MM;
    sp.scale.set(h * 160 / 72, h, 1);
    sp.position.set(d.cx * MM, (PALLET_HEIGHT + CASE_HEIGHT) * MM + h * 0.8, d.cz * MM);
    sp.renderOrder = 10;
    labels.add(sp);
    d.sprite = sp;
  });
  scene.add(labels);

  // Mostra solo i primi n depositi (n = tutti se omesso)
  function setPlacedCount(n) {
    if (n === undefined || n > deposits.length) n = deposits.length;
    var visibleCases = n > 0 ? deposits[n - 1].instStart + deposits[n - 1].cases.length : 0;
    instanced.forEach(function (m) { m.count = visibleCases; });
    deposits.forEach(function (d, i) {
      if (d.fallback) d.fallback.visible = i < n;
      d.sprite.visible = i < n;
    });
  }

  document.getElementById("info3D").textContent =
    (state.LayerType === "LayerB" ? "Layer B" : "Layer A") + " · " + deposits.length + " deposits · " + caseCount + " cases";

  // ===== RENDERING =====
  // Scena statica: si ridisegna solo quando la vista cambia. Durante la simulazione il ciclo e' continuo.
  var renderPending = false, frameHandlers = [], continuous = false, lastTime = 0;
  function hideLoader() { var l = document.getElementById("loader3D"); if (l && l.className !== "error") l.style.display = "none"; }
  function render() { renderPending = false; renderer.render(scene, camera); hideLoader(); }
  function requestRender() { if (!renderPending && !continuous) { renderPending = true; requestAnimationFrame(render); } }
  function loop(now) {
    if (!continuous) return;
    var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    frameHandlers.forEach(function (f) { f(dt); });
    renderer.render(scene, camera);
    hideLoader();
    requestAnimationFrame(loop);
  }
  function setContinuous(on) {
    if (on === continuous) return;
    continuous = on;
    lastTime = 0;
    if (on) requestAnimationFrame(loop); else requestRender();
  }
  controls.addEventListener("change", requestRender);
  requestRender();

  var topView = false;
  document.getElementById("btnTopView").onclick = function () {
    topView = !topView;
    setView(topView ? "top" : (window.PC3D.robotVisible ? "cell" : "pallet"));
    this.className = (topView ? "defaultabilitato" : "defaultnormale") + " txtBtn";
    requestRender();
  };
  document.getElementById("btnLabels").onclick = function () {
    labels.visible = !labels.visible;
    this.className = (labels.visible ? "defaultabilitato" : "defaultnormale") + " txtBtn";
    requestRender();
  };

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    requestRender();
  });

  window.PC3D = {
    THREE: THREE, scene: scene, camera: camera, controls: controls, renderer: renderer,
    MM: MM, PALLET_HEIGHT: PALLET_HEIGHT, CASE_HEIGHT: CASE_HEIGHT,
    palletW: palletW, palletH: palletH, span: span, state: state,
    deposits: deposits, labels: labels, robotVisible: false, views: VIEWS,
    setPlacedCount: setPlacedCount, buildDepositGroup: buildDepositGroup,
    setView: setView, setShadowArea: setShadowArea,
    requestRender: requestRender, setContinuous: setContinuous,
    onFrame: function (f) { frameHandlers.push(f); }
  };
})();
