// =====================================================================================
// PalCompose - interaction.js
// Interazione: trascinamento, rotazione, spostamento con frecce, allineamento, scambio ID
// =====================================================================================

function getCanvasPoint(e) {
  var  rect = canvas.getBoundingClientRect();
  var  scaleX = canvas.width  / rect.width;
  var  scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}

function canvasToPalletMM(px, py) {
  var x = (px - palletOffset.x) / SCALE_CONST;
  var y = (palletOffset.y + mmToPx(state.pallet.h) - py) / SCALE_CONST;
  return {
    x: x,
    y: y
  };
}

function normalizeCoord(value) {
  if (TenthOfAMillimeter) { return Math.floor(value * 10) / 10; } // tronca al decimo 
  else {
    var decimal = value - Math.floor(value);
    if (decimal >= 0.45 && decimal < 0.55) { return Math.floor(value) + 0.5; } // se è circa .5 (es: 0.5234 -> 0.5)
    return Math.round(value); // altrimenti intero più vicino
  }
}

function startDrag(e) {
    if (e.pointerId) canvas.setPointerCapture(e.pointerId);
    var point = getCanvasPoint(e);
    var px = point.x;
    var py = point.y;
    var  p = canvasToPalletMM(px, py);
    var found = null;
    for (var i = state.boxes.length - 1; i >= 0; i--) { // Trova la cassa sotto il mouse
      var  b = state.boxes[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { found = b; break; }
    }
    if (found) {
      state.selectedId = found.id;
      state.dragging = true;
      // Offset tra punto cliccato e angolo superiore sinistro della cassa
      state.dragOffset.x = p.x - found.x;
      state.dragOffset.y = p.y - found.y;
      canvas.style.cursor = "grabbing";
    } 
    else { state.selectedId = null; }
    updateRotationButtons();
    draw();
}

function dragBox(e) {
  if (!state.dragging || !state.selectedId) return;
  var point = getCanvasPoint(e); // coordinate canvas
  var px = point.x;
  var py = point.y;
  var mouseP = canvasToPalletMM(px, py); // converte in coordinate pallet
  var b = null;
  for (var i = 0; i < state.boxes.length; i++) {
    if (state.boxes[i].id === state.selectedId) { b = state.boxes[i]; break; }
  }
  if (!b) return;
  var target = {
    id: b.id,
    type: b.depositType,
    w: b.w,
    h: b.h,
    angle: b.angle,
    x: normalizeCoord(mouseP.x - state.dragOffset.x),
    y: normalizeCoord(mouseP.y - state.dragOffset.y),
    depositType: b.depositType
  };
  if (canPlace(target, b.id)) { b.x = target.x; b.y = target.y; requestDraw(); }
}

function endDrag(e) {
  if (e.pointerId) canvas.releasePointerCapture(e.pointerId);
  state.dragging = false;
  canvas.style.cursor = "grab";
}

function updateRotationButtons() {
  var b = null;
  for (var i = 0; i < state.boxes.length; i++) {
    if (state.boxes[i].id === state.selectedId) { b = state.boxes[i]; break; }
  }
  var angles = [0, 90, 180, 270];
  for (var j = 0; j < angles.length; j++) {
    var angle = angles[j];
    var btn = document.getElementById("rot" + angle);
    if (!btn) continue;
    btn.disabled = !b || b.angle === angle;
  }
}

function rotateSelected(angle) {
  var b = state.boxes.find(box => box.id === state.selectedId);
  if (!b || b.angle === angle) return;
  var backup = { ...b };
  var prevAngle = b.angle;
  b.angle = angle;
  if ((angle - prevAngle + 360) % 180 === 90) { // ruota 90° o 270°
    var cx = b.x + b.w / 2;
    var cy = b.y + b.h / 2;
    [b.w, b.h] = [b.h, b.w];
    b.x = Math.round(cx - b.w / 2);
    b.y = Math.round(cy - b.h / 2);
  }
  // Cerca la posizione libera più vicina scorrendo solo il perimetro di ogni anello
  function findNearbyValidPosition(box, maxOffset) {
    var q = TenthOfAMillimeter ? 10 : 1;
    var step = 1 / q;
    var maxK = Math.round(maxOffset / step);
    function snap(v) { return Math.round(v * q) / q; } // evita rumore in virgola mobile
    function tryAt(dx, dy) {
      var c = { ...box, x: snap(box.x + dx), y: snap(box.y + dy) };
      return canPlace(c, box.id) ? c : null;
    }
    for (var k = 1; k <= maxK; k++) {
      var r = k * step;
      for (var i = -k; i <= k; i++) { // lato alto e basso dell'anello
        var d = i * step;
        var c1 = tryAt(d, r) || tryAt(d, -r);
        if (c1) return c1;
      }
      for (var j = -k + 1; j <= k - 1; j++) { // lato destro e sinistro dell'anello
        var e = j * step;
        var c2 = tryAt(r, e) || tryAt(-r, e);
        if (c2) return c2;
      }
    }
    return null;
  }
  if (!canPlace(b, b.id)) { // verifica collisione e cerca posizione vicina
    let candidate = findNearbyValidPosition(b, 200);
    if (candidate) { b.x = candidate.x; b.y = candidate.y;} 
    else { Object.assign(b, backup); } // nessuna posizione valida 
  }
  updateRotationButtons();
  draw();
}

function getBoxesBoundingBox() {
  if (state.boxes.length === 0) return null;
  var minX = 1e9; // sostituisce Infinity per compatibilità
  var minY = 1e9;
  var maxX = -1e9;
  var maxY = -1e9;
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if ((b.x + b.w) > maxX) maxX = b.x + b.w;
    if ((b.y + b.h) > maxY) maxY = b.y + b.h;
  }
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function snapBoxesToCorner(corner) {
  var bbox = getBoxesBoundingBox();
  if (!bbox) return;
  var dx = 0;
  var dy = 0;
  switch (corner) {
    case "bottom-left":
      dx = -bbox.x;
      dy = -bbox.y;
      state.Offset.x = 0;
      state.Offset.y = 0;
      break;
    case "bottom-right":
      dx = state.pallet.w - (bbox.x + bbox.w);
      dy = -bbox.y;
      state.Offset.x = 0;
      state.Offset.y = 0;
      break;
    case "top-left":
      dx = -bbox.x;
      dy = state.pallet.h - (bbox.y + bbox.h);
      state.Offset.x = 0;
      state.Offset.y = 0;
      break;
    case "top-right":
      dx = state.pallet.w - (bbox.x + bbox.w);
      dy = state.pallet.h - (bbox.y + bbox.h);
      state.Offset.x = 0;
      state.Offset.y = 0;
      break;
    case "centre":
      dx = -bbox.x;
      dy = -bbox.y;
      break;
  }
  for (var i = 0; i < state.boxes.length; i++) { // applica lo spostamento reale alle casse
    state.boxes[i].x += dx;
    state.boxes[i].y += dy;
  }
  if(corner == "centre"){
    var bb = getBoxesBoundingBox();
    var palletW = mmToPx(state.palletReal.w);
    var palletH = mmToPx(state.palletReal.h);
    var boxesW = mmToPx(bb.w);
    var boxesH = mmToPx(bb.h);
    var dxOff = (palletW - boxesW) / 2;
    var dyOff = (palletH - boxesH) / 2;
    state.Offset.x = Math.round(dxOff);
    state.Offset.y = Math.round(dyOff);
  }
  draw();
}

function moveSelected(dx, dy) {
  var b = null;
  for (var i = 0; i < state.boxes.length; i++) {
    if (state.boxes[i].id === state.selectedId) { b = state.boxes[i]; break; }
  }
  if (!b) return;
  dy = -dy;
  var target = {
    id: b.id,
    x: b.x + dx,
    y: b.y + dy,
    w: b.w,
    h: b.h,
    angle: b.angle,
    depositType: b.depositType
  };
  if (canPlace(target, b.id)) {
    b.x = target.x;
    b.y = target.y;
    requestDraw();
  }
  else{
    var baseX = target.x;
    var baseY = target.y;
    for (var i = 0; i < 2; i++) {
      var newX = baseX;
      var newY = baseY;
      if (dx != 0) {
        if (dx > 0 && i == 0) { newX += 1; newY += 1; }
        else if (dx > 0 && i == 1) { newX += 1; newY -= 1; }
        else if (dx < 0 && i == 0) { newX -= 1; newY += 1; }
        else if (dx < 0 && i == 1) { newX -= 1; newY -= 1; }
      }
      else if (dy != 0) {
        if (dy > 0 && i == 0) { newY += 1; newX += 1; }
        else if (dy > 0 && i == 1) { newY += 1; newX -= 1; }
        else if (dy < 0 && i == 0) { newY -= 1; newX += 1; }
        else if (dy < 0 && i == 1) { newY -= 1; newX -= 1; }
      }
      var newTarget = { ...target, x: newX, y: newY };
      if (canPlace(newTarget, b.id)) {
        b.x = newX;
        b.y = newY;
        requestDraw();
        break;
      }
    }
  }
}

function bindHoldButton(btn, dx, dy) {
  if(!TenthOfAMillimeter){ dx = dx * 10; dy = dy * 10; }
  var intervalId = null;
  var BASE_DELAY = 2; // fattore di scala temporale
  function stepOnce() { moveSelected(dx, dy); }
  function start() {
    stop(); // sicurezza: evita doppio interval
    stepOnce(); // movimento immediato al click
    var  maxStep = Number(speedSlider.max);
    var  currentStep = Math.round(state.speedRatio);
    var  delay = Math.max(1,(maxStep - currentStep + 1) * BASE_DELAY);
    intervalId = setInterval(stepOnce, delay);
  }
  function stop() { if (intervalId !== null) { clearInterval(intervalId); intervalId = null; } }
  btn.style.touchAction = "none"; // il browser non deve prendere in carico il tocco (scroll)
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("pointercancel", stop);       // tocco annullato dal sistema
  btn.addEventListener("lostpointercapture", stop);  // puntatore perso
  window.addEventListener("blur", stop);             // la pagina perde il focus
}

var swapMode = false;
var swapSelection = [];

function setupSwapButton(button, svgNormal, svgPressed) {
  if (typeof svgNormal === 'string') svgNormal = document.getElementById(svgNormal);
  if (typeof svgPressed === 'string') svgPressed = document.getElementById(svgPressed);
  function toggleSwap() { swapMode = !swapMode; swapSelection = []; updateSwapButtonVisual(); }
  function updateSwapButtonVisual() {
    if (swapMode) {
      state.selectedId = null;
      svgNormal.style.display = 'block';
      svgPressed.style.display = 'none';
      button.classList.add("defaultabilitato");
      button.classList.remove("defaultnormale");
    }
    else {
      swapSelection = [];
      selectHighestIdBox()
      svgNormal.style.display = 'none';
      svgPressed.style.display = 'block';
      button.classList.remove("defaultabilitato");
      button.classList.add("defaultnormale");
    }
    draw();
  }
  button.addEventListener('mousedown', toggleSwap);
  button.addEventListener('mouseup', updateSwapButtonVisual);
  button.addEventListener('mouseleave', updateSwapButtonVisual);
  button.addEventListener('touchstart', function(e) { e.preventDefault(); toggleSwap(); });
  button.addEventListener('touchend', function(e) { e.preventDefault(); updateSwapButtonVisual(); });
  swapMode = false;
  updateSwapButtonVisual();
}

function handleSwap(e) {
  if (!swapMode) return;
  var point = getCanvasPoint(e);
  var px = point.x;
  var py = point.y;
  var p = canvasToPalletMM(px, py);
  var clickedBox = null;
  for (var i = state.boxes.length - 1; i >= 0; i--) {
    var b = state.boxes[i];
    if (p.x >= b.x && p.x <= b.x + b.w &&
        p.y >= b.y && p.y <= b.y + b.h) {
      clickedBox = b;
      break;
    }
  }
  if (!clickedBox) return;
  if (swapSelection.indexOf(clickedBox) === -1) { swapSelection.push(clickedBox); }
  if (swapSelection.length === 2) {
    var box1 = swapSelection[0];
    var box2 = swapSelection[1];
    var tempId = box1.id;
    box1.id = box2.id;
    box2.id = tempId;
    swapSelection = [];
  }
  state.selectedId = null;
  draw();
}

function updateRange() {
  var  min = parseFloat(speedSlider.min);
  var  max = parseFloat(speedSlider.max);
  var  val = parseFloat(speedSlider.value);
  var  percent = ((val - min) / (max - min)) * 100;
  var  thumbWidth = 18; // in px, deve essere uguale al CSS
  var  sliderWidth = speedSlider.offsetWidth;
  var  thumbOffset = (thumbWidth / sliderWidth) * 100;
  // percent corretto per gradiente
  var  correctedPercent = percent * (1 - thumbOffset / 100) + thumbOffset / 2;
  speedSlider.style.background = 
    "linear-gradient(" +
      "to right," +
      "#09CCB5 0%," +
      "#09CCB5 " + correctedPercent + "%," +
      "#4D4D4D " + correctedPercent + "%," +
      "#4D4D4D 100%" +
    ")";
}
