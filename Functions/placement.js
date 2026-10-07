// =====================================================================================
// PalCompose - placement.js
// Posizionamento casse: deposito singolo, autoriempimento, controllo collisioni
// =====================================================================================

function nextId(){return state.boxes.length + 1;}

function selectHighestIdBox() {
  if (!state.boxes || state.boxes.length === 0) { state.selectedId = null; return; }
  var highestBox = state.boxes.reduce(function(max, box) { return (box.id > max.id) ? box : max; });
  state.selectedId = highestBox.id;
}

function placeNextBox(type, suppressAlert) {
  var w, h;
  var placed = null;
  switch (type) {
    case "AB":
      w = state.DepDimAB.x;
      h = state.DepDimAB.y;
      break;
    case "A":
      w = state.DepDimA.x;
      h = state.DepDimA.y;
      break;
    case "B":
      w = state.DepDimB.x;
      h = state.DepDimB.y;
      break;
  }
  var rotations = [ { w: w, h: h, angle: 0 }, { w: h, h: w, angle: 90 } ];
  for (var i = 0; i < rotations.length; i++) {
    var rot = rotations[i];
    var factor = TenthOfAMillimeter ? 10 : 1;
    var step = 1 / factor;
    placed = findFirstFit(rot, 0, factor, function(idx) { return idx * step; }, function(x, y) {
      var candidate = {
        x: x,
        y: y,
        w: rot.w,
        h: rot.h,
        angle: rot.angle,
        depositType: type,
        picktype: type
      };
      return canPlace(candidate) ? candidate : null;
    });
    if (placed) break;
  }
  if (!placed) {
    if (!suppressAlert) {    
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[1],
        headerColor: "#4d4d4d",
        buttons: [
          {
            text: buttonTextPopup[0],
            class: "confirm-btn",
            onClick: function () {}
          }
        ]
      });
    }
    return false;
  }
  let NextID = nextId();
  state.boxes.push({
    id: NextID,
    x: placed.x,
    y: placed.y,
    w: placed.w,
    h: placed.h,
    angle: placed.angle,
    depositType: type  
  });
  state.selectedId = NextID;
  draw();
  return true;
}

function deleteSelectedBox() {
  if (!state.selectedId) { 
    showHMIPopup({
      title: titlePopup[0],
      message: messagesPopup[0],
      headerColor: "#4d4d4d",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function () {}
        }
      ]
    });
    return;  
  }
  const deletedId = state.selectedId;
  state.boxes = state.boxes.filter(b => b.id !== deletedId);
  state.boxes.forEach(b => { if (b.id > deletedId) { b.id -= 1; } });
  selectHighestIdBox();
  if (state.boxes.length === 0) { state.Offset.x = 0; state.Offset.y = 0; }
  draw();
}

function clearPallet() {
  if (state.boxes.length === 0) {
    showHMIPopup({
      title: titlePopup[0],
      message: messagesPopup[3],
      headerColor: "#4d4d4d",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function () {}
        }
      ]
    });
    return;
  }
  state.boxes = [];
  state.selectedId = null;
  state.Offset.x = 0;
  state.Offset.y = 0;
  draw();
}

function getGap() { return Math.round(+sideMargin.value - 0.1) || 0; } // Gap minimo tra casse (mm)

function getDepositDims(type) {
  switch (type) {
    case "A":  return state.DepDimA;
    case "B":  return state.DepDimB;
    case "AB": return state.DepDimAB;
    default:   return null;
  }
}

function autoFill() {
  var gap = getGap();
  var PickType = state.PickType;
  let approachX = state.Approach.x;
  let approachY = state.Approach.y;
  var factor = TenthOfAMillimeter ? 10 : 1; // risoluzione della ricerca (come placeNextBox)
  function getNextDepositType(lastType) { // decide il prossimo tipo da piazzare
    if (PickType === 1 || PickType === 3) { // sequenza fissa A → B → A → B …
      if (!lastType || lastType === "B") return "A";
      if (lastType === "A") return "B";
    } 
    else { // Logica classica
      switch (PickType) {
        case 0: return "A";
        case 2: return "AB";
        default: return null;
      }
    }
    return null;
  }
  var lastDepositType = null;
  var placedSomething = true;
  while (placedSomething) {
    placedSomething = false;
    var depositType = getNextDepositType(lastDepositType);
    if (!depositType) break;
    lastDepositType = depositType;
    var dim = getDepositDims(depositType);
    // Dimensioni non valide (es. dati PLC non ancora ricevuti): evita casse di dimensione zero all'infinito
    if (!dim || !(dim.x > 0) || !(dim.y > 0)) break;
    var rotations = [ { w: dim.x, h: dim.y, angle: 0 }, { w: dim.y, h: dim.x, angle: 90 } ];
    for (var r = 0; r < rotations.length; r++) {
      var rot = rotations[r];
      var candidate = findFirstFit(rot, gap, factor, function(idx) { return idx / factor; }, function(x, y) {
        var c = {
          x: x,
          y: y,
          w: rot.w,
          h: rot.h,
          angle: rot.angle,
          depositType: depositType
        };
        return canPlaceWithGap(c, null, gap) ? c : null;
      });
      if (candidate) {
        state.boxes.push({
          id: nextId(),
          x: candidate.x,
          y: candidate.y,
          w: candidate.w,
          h: candidate.h,
          angle: candidate.angle,
          depositType: depositType,
          picktype: depositType
        });
        placedSomething = true;
        break;
      }
    }
  }
  // Riordino secondo approccio
  if (approachX !== 0 || approachY !== 0) {
    state.boxes = reorderBoxesByApproach(state.boxes, approachX, approachY);
  }
  // Compatamento casse ruotate
  (function alignRotatedColumns() {
    var rotated = state.boxes.filter(b => b.angle === 90);
    if (!rotated.length) return;
    var tol = 1;
    var columns = {};
    rotated.forEach(b => {
      var key = Math.round(b.x / tol);
      if (!columns[key]) columns[key] = [];
      columns[key].push(b);
    });
    var bbox = getBoxesBoundingBox();
    var topLimit = bbox ? bbox.y + bbox.h : state.pallet.h;
    for (var k in columns) {
      var col = columns[k];
      if (col.length <= 1) continue;
      col.sort((a, b) => a.y - b.y);
      var bottomBox = col[0];
      var topBox = col[col.length - 1];
      var usedHeight = col.reduce((sum, b) => sum + b.h, 0);
      var spaceAvailable = topLimit - bottomBox.y;
      var gapEquo = (spaceAvailable - usedHeight) / (col.length - 1);
      var yPos = bottomBox.y + bottomBox.h + gapEquo;
      for (var i = 1; i < col.length - 1; i++) {
        col[i].y = yPos;
        yPos += col[i].h + gapEquo;
      }
      topBox.y = bottomBox.y + usedHeight + gapEquo * (col.length - 1) - topBox.h;
      if (topBox.y + topBox.h > state.pallet.h) {
        var delta = topBox.y + topBox.h - state.pallet.h;
        col.forEach(b => b.y -= delta);
      }
    }
  })();
  selectHighestIdBox()
  draw();
  function reorderBoxesByApproach(boxes, approachX, approachY) {
    const reordered = [...boxes];
    reordered.sort((a, b) => {
      if (approachX !== 0 && a.x !== b.x) return approachX < 0 ? b.x - a.x : a.x - b.x;
      if (approachY !== 0 && a.y !== b.y) return approachY < 0 ? b.y - a.y : a.y - b.y;
      return 0;
    });
    reordered.forEach((box, index) => box.id = index + 1);
    return reordered;
  }
}

/**
 * Disabilita i bottoni DepositA, DepositB, DepositAB
 * @param {boolean} disableA
 * @param {boolean} disableB
 * @param {boolean} disableAB
 */
function updateDepositButtons(disableA, disableB, disableAB) {
  var  buttons = [
    { id: "DepositA", disable: disableA },
    { id: "DepositB", disable: disableB },
    { id: "DepositAB", disable: disableAB }
  ];
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    var element = document.getElementById(btn.id);
    if (!element) {continue;}
    element.disabled = btn.disable;
    element.style.opacity = btn.disable ? "0.5" : "1";
    element.style.pointerEvents = btn.disable ? "none" : "auto";
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function canPlace(r, ignore) {
  let gap =  0;
   // bordo pallet
  if ( r.x < 0 || r.y < 0 || r.x + r.w > state.pallet.w || r.y + r.h > state.pallet.h) { return false; }
  // collisione casse
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    if (b.id === ignore) { continue; }
    if (rectsOverlap(expandRect(r, gap), expandRect(b, gap))) { return false; }
  }
  return true;
}

// Indici di griglia candidati: 0 e il primo indice dopo ogni bordo (±1 per l'arrotondamento in virgola mobile)
function gridCandidates(edges, factor, maxIdx) {
  var seen = { 0: true };
  var list = [0];
  for (var i = 0; i < edges.length; i++) {
    var k = Math.ceil(edges[i] * factor);
    for (var d = -1; d <= 1; d++) {
      var idx = k + d;
      if (idx < 0 || idx > maxIdx || seen[idx]) continue;
      seen[idx] = true;
      list.push(idx);
    }
  }
  return list.sort(function(a, b) { return a - b; });
}

/**
 * Prima posizione libera (y crescente, poi x crescente) sulla griglia del pallet.
 * Stesso risultato della scansione millimetro per millimetro, ma prova solo le posizioni
 * a ridosso dei bordi delle casse già piazzate: la prima posizione libera può essere
 * solo a 0 o subito dopo il bordo (+gap) di un'altra cassa.
 * @param {{w:number,h:number}} rot - dimensioni della cassa
 * @param {number} gap - distanza minima tra casse
 * @param {number} factor - 1 = millimetro, 10 = decimo di millimetro
 * @param {function(number):number} toCoord - indice di griglia → coordinata (mm)
 * @param {function(number,number):object|null} tryAt - ritorna la cassa candidata se libera
 */
function findFirstFit(rot, gap, factor, toCoord, tryAt) {
  var maxYi = (state.pallet.h - rot.h) * factor;
  var maxXi = (state.pallet.w - rot.w) * factor;
  if (maxYi < 0 || maxXi < 0) return null;
  var ys = gridCandidates(state.boxes.map(function(b) { return b.y + b.h + gap; }), factor, maxYi);
  var xs = gridCandidates(state.boxes.map(function(b) { return b.x + b.w + gap; }), factor, maxXi);
  for (var i = 0; i < ys.length; i++) {
    for (var j = 0; j < xs.length; j++) {
      var found = tryAt(toCoord(xs[j]), toCoord(ys[i]));
      if (found) return found;
    }
  }
  return null;
}

function expandRect(r, gap) {
  return {
    x: r.x - gap / 2,
    y: r.y - gap / 2,
    w: r.w + gap,
    h: r.h + gap
  };
}

function canPlaceWithGap(r, ignoreId, gap) {
  if (
    r.x < 0 ||
    r.y < 0 ||
    r.x + r.w > state.pallet.w ||
    r.y + r.h > state.pallet.h
  ) return false;
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    if (b.id === ignoreId) continue;
    if (rectsOverlap(expandRect(r, gap), expandRect(b, gap))) { return false;}
  }
  return true;
}
