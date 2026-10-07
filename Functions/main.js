///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                           INITIALIZATION                                                                  //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


let  palletImg = new Image(); // --- PALLET SVG IMAGE ---
palletImg.src = "./Assets/2D/Pallet_2D.svg";



var SCALE_CONST = 1;
var BOX_FONT_SIZE = 26; // o 24
var SidebarVisible = false;
var TenthOfAMillimeter = false;
var mouse = { x:0, y:0, down:false };
var palletOffset = { x: 0, y: 0 };
var state = {
  pallet:{w:1200,h:800},
  palletReal:{w:1200,h:800},
  scale:SCALE_CONST,
  boxSize:{w:300,h:300},
  boxes:[],
  selectedId:null,
  dragging:false,
  dragOffset:{x:0,y:0},
  speedRatio:5,
  Offset:{x:0,y:0},
  Nbox:{x:0,y:0},
  NboxCH:{a:0,b:0},
  PickType:0,
  LayerType:"",
  DepDimA:{x:0,y:0},
  DepDimB:{x:0,y:0},
  DepDimAB:{x:0,y:0},
  PickingWheel:false,
  Approach:{x:0,y:0},
  NBoxA:0,
  NBoxB:0,
  CornerLabelling:false, // true = etichetta ad angolo (destra + basso con cassa a 0°), false = laterale (lato destro)
  Init:true,
};
var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                           CANVAS FUNCTIONS                                                                //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function updateCanvasSize() {
  canvas.width  = mmToPx(state.pallet.w) + 500;
  canvas.height = mmToPx(state.pallet.h) + 500;
}

function mmToPx(mm) { return mm * state.scale; } // Conversion mm ↔ px

function pxToMm(px) { return px / state.scale; } // Conversion mm ↔ px

function drawAxes() {
  var  margin = -15; // distanza dal bordo
  var  arrowSize = 20;
  ctx.save();
  ctx.strokeStyle = "#000000ff"; // colore asse X
  ctx.fillStyle = "#000000ff";
  ctx.lineWidth = 3;
  ctx.beginPath(); // Asse X (orizzontale)
  ctx.moveTo(margin, margin);
  ctx.lineTo(mmToPx(state.pallet.w) - margin, margin);
  ctx.stroke();
  ctx.beginPath(); // freccia asse X
  ctx.moveTo(mmToPx(state.pallet.w) - margin + 5, margin);
  ctx.lineTo(mmToPx(state.pallet.w) - margin - arrowSize, margin - arrowSize / 2);
  ctx.lineTo(mmToPx(state.pallet.w) - margin - arrowSize, margin + arrowSize / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // Asse Y (verticale)
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, mmToPx(state.pallet.h) - margin);
  ctx.stroke();
  ctx.beginPath(); // freccia asse Y
  ctx.moveTo(margin, mmToPx(state.pallet.h) - margin + 5);
  ctx.lineTo(margin - arrowSize / 2, mmToPx(state.pallet.h) - margin - arrowSize);
  ctx.lineTo(margin + arrowSize / 2, mmToPx(state.pallet.h) - margin - arrowSize);
  ctx.closePath();
  ctx.fill();
  ctx.font = "20px Arial";
  ctx.fillText("X", mmToPx(state.pallet.w) - margin - 15, margin - 15); // X normale
  ctx.save();
  ctx.translate(margin -10, mmToPx(state.pallet.h) - margin - 10); // punto di origine
  ctx.rotate(-Math.PI); // ruota di -90 gradi
  ctx.fillText("Y", 0, 0); // Y dritta
  ctx.restore();
  ctx.restore();
}

function drawPalletOutline() {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3; 
  ctx.setLineDash([30, 15]);
  ctx.strokeRect(0, 0, mmToPx(state.pallet.w), mmToPx(state.pallet.h));
  ctx.setLineDash([]);   
  ctx.restore();
}

function drawPallet() {
  if (palletImg.complete) {ctx.drawImage(palletImg,-state.Offset.x,-state.Offset.y,mmToPx(state.palletReal.w),mmToPx(state.palletReal.h));}
}

function drawBox(box) {
  let index = state.boxes.findIndex(b => b.id === box.id);
  let boxNext = state.boxes[index + 1];
  let isCollision = false;
  if (state.PickType == 3 && boxNext && box.picktype == "AB" && (box.depositType == "A" || box.depositType == "B" )&& boxNext.picktype == "Nothing") { isCollision = pairHasCollision(box, boxNext, state.boxes, index); }
  var centerX = mmToPx(box.x + box.w / 2);
  var centerY = mmToPx(box.y + box.h / 2);
  ctx.save();
  ctx.translate(centerX, centerY);
  if (isCollision && box.id != state.selectedId) { ctx.fillStyle = "rgba(255,0,0,1)"; }
  else if (swapMode && swapSelection.length > 0) { ctx.fillStyle = box.id === swapSelection[0].id ? "rgba(9,181,160,1)" : "rgba(255,183,3,1)"; } 
  else { ctx.fillStyle = box.id === state.selectedId ? "rgba(142,202,230,1)" : "rgba(255,183,3,1)"; }
  var w = mmToPx(box.w);
  var h = mmToPx(box.h);
  ctx.save(); // ombra solo sul contorno del deposito
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  drawCaseGrid(box, w, h);
  ctx.strokeStyle = "#023047";
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

// Divide il deposito nelle casse che lo compongono (stessa logica nella vista 3D)
function getCaseGrid(box) {
  var cw = state.boxSize.w, ch = state.boxSize.h;
  if (!(cw > 0) || !(ch > 0)) return null;
  function fit(a, b, rotated) {
    var nx = Math.round(box.w / a), ny = Math.round(box.h / b);
    if (nx < 1 || ny < 1) return null;
    return { nx: nx, ny: ny, rotated: rotated, err: Math.abs(box.w - nx * a) + Math.abs(box.h - ny * b) };
  }
  var f1 = fit(cw, ch, false), f2 = fit(ch, cw, true);
  var best = !f1 ? f2 : !f2 ? f1 : (f2.err < f1.err ? f2 : f1);
  if (!best || best.err > Math.max(cw, ch) * 0.25 || best.nx * best.ny > 100) return null;
  return best;
}

// Etichetta sulla cassa (mm): rettangolare, sul lato destro della cassa a 0° oppure piegata sull'angolo destra/basso
var LABEL_SIDE_LEN = 150;   // etichetta laterale: lunghezza sul lato
var LABEL_CORNER_LEN = 100; // etichetta ad angolo: lunghezza su ciascuno dei due lati
var LABEL_THICK = 14;       // spessore con cui è disegnata nella vista dall'alto

// Rotazione della singola cassa: quella del deposito, +90° se le casse sono girate rispetto al deposito (picking wheel)
function getCaseAngle(box, grid) {
  var a = Number(box.angle) || 0;
  if (grid && grid.rotated !== (a % 180 === 90)) a = (a + 90) % 360;
  return a;
}

// Disegna l'etichetta nel sistema della cassa già centrato e ruotato (lw x lh = dimensioni della cassa a 0°, px)
function drawCaseLabel(lw, lh) {
  var t = Math.max(3, mmToPx(LABEL_THICK));
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#023047";
  ctx.lineWidth = 1.5;
  if (state.CornerLabelling) {
    var lc = Math.min(mmToPx(LABEL_CORNER_LEN), lw * 0.9, lh * 0.9);
    ctx.beginPath(); // L sull'angolo destra/basso
    ctx.moveTo(lw / 2, -lh / 2);
    ctx.lineTo(lw / 2, -lh / 2 + lc);
    ctx.lineTo(lw / 2 - t, -lh / 2 + lc);
    ctx.lineTo(lw / 2 - t, -lh / 2 + t);
    ctx.lineTo(lw / 2 - lc, -lh / 2 + t);
    ctx.lineTo(lw / 2 - lc, -lh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  else {
    var ls = Math.min(mmToPx(LABEL_SIDE_LEN), lh * 0.85);
    ctx.fillRect(lw / 2 - t, -ls / 2, t, ls);
    ctx.strokeRect(lw / 2 - t, -ls / 2, t, ls);
  }
}

// Casse con effetto cartone: luce dall'alto, bordo, nastro adesivo lungo il lato lungo
function drawCaseGrid(box, w, h) {
  var g = getCaseGrid(box);
  var nx = g ? g.nx : 1, ny = g ? g.ny : 1;
  var caseRad = getCaseAngle(box, g) * Math.PI / 180;
  var caseQuarter = (getCaseAngle(box, g) % 180 === 90);
  var cw = w / nx, ch = h / ny;
  var inset = Math.min(2, cw * 0.05, ch * 0.05);
  var shade = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
  shade.addColorStop(0, "rgba(0,0,0,0.10)");
  shade.addColorStop(1, "rgba(255,255,255,0.30)");
  var tapeAlongX = cw >= ch;
  var tape = Math.min(cw, ch) * 0.16;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(2,48,71,0.45)";
  for (var i = 0; i < nx; i++) {
    for (var j = 0; j < ny; j++) {
      var x = -w / 2 + i * cw, y = -h / 2 + j * ch;
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.fillStyle = shade;
      ctx.fillRect(-cw / 2 + inset, -ch / 2 + inset, cw - 2 * inset, ch - 2 * inset);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      if (tapeAlongX) ctx.fillRect(-cw / 2 + inset, -tape / 2, cw - 2 * inset, tape);
      else ctx.fillRect(-tape / 2, -ch / 2 + inset, tape, ch - 2 * inset);
      ctx.strokeRect(-cw / 2 + inset, -ch / 2 + inset, cw - 2 * inset, ch - 2 * inset);
      ctx.rotate(caseRad); // l'etichetta segue la rotazione della cassa
      drawCaseLabel(caseQuarter ? ch - 2 * inset : cw - 2 * inset, caseQuarter ? cw - 2 * inset : ch - 2 * inset);
      ctx.strokeStyle = "rgba(2,48,71,0.45)";
      ctx.lineWidth = 1;
      ctx.restore();
    }
  }
}

function drawBoxText(box) {
  var  lineHeight = BOX_FONT_SIZE + 2;
  // Testi principali (non ruotati)
  var  textX = mmToPx(box.x) + 4;
  var  textY = mmToPx(box.y + box.h) - 120;
  ctx.fillStyle = "#000";
  // Testi principali (più grandi e in grassetto)
  ctx.font = "bold " + (BOX_FONT_SIZE + 4) + "px Arial";
  switch (box.depositType) { 
    case "A":  ctx.fillText(box.id + "  A", textX, -textY - 3*lineHeight); break;
    case "B":  ctx.fillText(box.id + "  B", textX, -textY - 3*lineHeight); break;
    case "AB": ctx.fillText(box.id + " AB", textX, -textY - 3*lineHeight); break;
  }
  switch (box.angle) { 
    case 0: ctx.fillText(">", textX + 70, -textY - 3*lineHeight); break;
    case 90: ctx.fillText("^", textX + 70, -textY - 3*lineHeight); break;
    case 180: ctx.fillText("<", textX + 70, -textY - 3*lineHeight); break;
    case 270: ctx.fillText("v", textX + 70, -textY - 3*lineHeight); break;
  }
  // Altri testi
  ctx.font = BOX_FONT_SIZE + "px Arial";
  ctx.fillText("X: " + Math.ceil(box.x + box.w / 2), textX, -textY - 2*lineHeight);
  ctx.fillText("Y: " + Math.ceil(box.y + box.h / 2), textX, -textY - lineHeight);
  ctx.fillText("Rot: " + box.angle + "°", textX, -textY);
}

// Ridisegno raggruppato al prossimo frame: per eventi frequenti (trascinamento, D-pad)
var drawPending = false;
function requestDraw() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(function() { drawPending = false; draw(); });
}

function draw() {
  var  offsetXPerc = 0.1; 
  var  offsetYPerc = 0.1;    
  palletOffset.x = canvas.width * offsetXPerc;
  palletOffset.y = canvas.height * offsetYPerc - (mmToPx(state.pallet.h) / 12); 
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(palletOffset.x, + palletOffset.y + mmToPx(state.pallet.h));
  ctx.scale(SCALE_CONST, - SCALE_CONST); // Y reverse for Pallet
  drawPallet()
  drawPalletOutline();
  drawAxes()
  state.boxes.forEach(function(box) {
    drawBox(box);
    ctx.restore(); 
    ctx.save();
    ctx.scale(1, -1); 
    drawBoxText(box);
    ctx.restore(); 
  });
  ctx.restore(); 
  updateSidebar();
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                           CASES FUNCTIONS                                                                //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                           PLACEMENT CONTROL                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                          MOUSE & TOUCH MOVEMENT                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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

// Touch / Pointer
canvas.addEventListener("pointerdown", startDrag);
canvas.addEventListener("pointermove", dragBox);
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                ROTAZIONE                                                                 //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var angles = [0, 90, 180, 270];

for (var i = 0; i < angles.length; i++) {
  (function(angle) {
    var btn = document.getElementById("rot" + angle);
    if (!btn) return;
    btn.onclick = function() {
      rotateSelected(angle);
    };
  })(angles[i]);
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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                          COMPOSITION MOVEMENT                                                             //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                          COMPOSITION MOVEMENT                                                             //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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

bindHoldButton(document.getElementById("btnUp"),0,-0.1);
bindHoldButton(document.getElementById("btnDown"),0,0.1);
bindHoldButton(document.getElementById("btnLeft"),-0.1,0);
bindHoldButton(document.getElementById("btnRight"),0.1,0);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                               SIDEBAR                                                                     //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var lastSidebarHTML = null;
function updateSidebar() {
  updateOffsetField();
  sideCompositionW.value = state.pallet.w;
  sideCompositionH.value = state.pallet.h;
  var html = "";
  if (state.boxes.length === 0) { html += "<p>" + strings.noBoxes + "</p>";} 
  else {
    html += "<ul>";
    for (var i = 0; i < state.boxes.length; i++) {
      var b = state.boxes[i];
      var centerX = Math.ceil(b.x + b.w / 2);
      var centerY = Math.ceil(b.y + b.h / 2);
      html += "<li>ID: " + b.id + " X:" + centerX + "mm, Y:" + centerY + ",mm " + strings.angle + ":" + b.angle + "°, " + strings.type + ":" + b.depositType + " </li>";
    }
    html += "</ul>";
  }
  if (html !== lastSidebarHTML) { SidebarContent.innerHTML = html; lastSidebarHTML = html; }
}

function updateOffsetField() {
  strings.offsetDepX = "Offset Dep. X: " + state.Offset.x;
  strings.offsetDepY = "Offset Dep. Y: " + state.Offset.y;
  var elements = document.querySelectorAll('[data-key]:not(fieldset)');
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var key = el.getAttribute("data-key");
    if (!strings[key]) continue;
    if (el.textContent !== strings[key]) el.textContent = strings[key];
  }
}

function updateToggleSidebarButton() {
  toggleSidebarBtn.classList.remove("defaultnormale", "defaultabilitato");
  if (SidebarVisible) { toggleSidebarBtn.classList.add("defaultabilitato");} 
  else { toggleSidebarBtn.classList.add("defaultnormale"); }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                               HTML DEFINITIONS - EVENTS                                                                     //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Inizializza un pulsante con SVG normale e premuto.
 * @param {HTMLElement} button - Il bottone
 * @param {HTMLImageElement|string} svgNormal - SVG normale (id, elemento o src)
 * @param {HTMLImageElement|string} svgPressed - SVG premuto (id, elemento o src)
 */
function setupButtonWithSVG(button, svgNormal, svgPressed) {
  // Ottieni elementi <img> se sono stringhe/id
  if (typeof svgNormal === 'string') svgNormal = document.getElementById(svgNormal);
  if (typeof svgPressed === 'string') svgPressed = document.getElementById(svgPressed);
  function press() { svgNormal.style.display = 'block'; svgPressed.style.display = 'none'; }
  function release() { svgNormal.style.display = 'none'; svgPressed.style.display = 'block'; }
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  svgPressed.style.display = 'block';
  svgNormal.style.display = 'none';
}

var  sidePalletW       = document.getElementById("sidePalletW");
var  sidePalletH       = document.getElementById("sidePalletH");
var  sideCompositionW  = document.getElementById("sideCompositionW");
var  sideCompositionH  = document.getElementById("sideCompositionH");
var  sideBoxW          = document.getElementById("sideBoxW");
var  sideBoxH          = document.getElementById("sideBoxH");
var  ApproachX         = document.getElementById("ApproachX");
var  ApproachY         = document.getElementById("ApproachY");
var  sideMargin        = document.getElementById("sideMargin");
var  DepositA          = document.getElementById("DepositA");
var  DepositB          = document.getElementById("DepositB");
var  DepositAB         = document.getElementById("DepositAB");
var  autoFillBtn       = document.getElementById("AutoFill");
var  TreD              = document.getElementById("3D");
var  clearPalletBtn    = document.getElementById("ClearPallet");
var  SaveBtn           = document.getElementById("Save");
var  speedSlider       = document.getElementById("speedRatio");
var  speedVal          = document.getElementById("speedRatioVal");
var  DeleteDeposit     = document.getElementById("DeleteDeposit");
var  CentreBoxs        = document.getElementById("centerBoxesBtn");
var  SidebarContent    = document.getElementById("SidebarContent");
var  snapBottomLeft    = document.getElementById("snapBottomLeft");
var  snapBottomRight   = document.getElementById("snapBottomRight");
var  snapTopLeft       = document.getElementById("snapTopLeft");
var  snapTopRight      = document.getElementById("snapTopRight");
var  toggleSidebarBtn  = document.getElementById("toggleSidebar");
var  swapBtn           = document.getElementById("swapBtn");
var  prevPallet     = { w: state.pallet.w, h: state.pallet.h };
var  prevPalletReal = { w: state.pallet.w, h: state.pallet.h };
var  prevBox        = { w: sideBoxW.valueAsNumber, h: sideBoxH.valueAsNumber };

var titlePopup = [
  "Warning",
  "Save Configuration",
  "Importing Data<br>Error Code",
  "Save<br>Procedure",
  "Save<br>Aborted",
  "Invalid Value"
];

var messagesPopup = [
  "It is not possible to delete the box, you must select one first",
  "It is no longer possible to place boxes",
  "By changing these dimensions, all placed boxes will be removed. Do you want to continue?",
  "It is not possible to clear the pallet, you must place at least one box",
  "By changing these dimensions, all placed boxes will be modified, if possible. Do you want to continue?",
  "Unable to apply the new width: box conflict detected!",
  "Unable to apply the new height: box conflict detected!",
  "saving procedure in progress...",
  "Exit procedure in progress...",
  "The value entered must be between 700 and 1300",
  "The value entered must be between 10 and 900"
];

var  buttonTextPopup = [
  "OK",
  "Confirm",
  "Cancel",
  "Save and Exit",
  "Discard and Exit",
  "Continue",
  "Exit"
];

var  legendStirng = [
  "Pallet Size (mm)",
  "Max Composition (mm)",
  "Case Size (mm)",
  "Approach (mm)",     
  "Actions",     
  "Position",                   
  "Case Rotation", 
  "Move Case",
];

var  strings = {
  palletSize: { legend: legendStirng[0], },
  maxComposition: { legend: legendStirng[1], },
  caseSize: {
    legend: legendStirng[2],
    compositionMarign: "Margin:"
  },
  approach: { legend: legendStirng[3], },
  actions: { legend: legendStirng[4], },
  position: { legend: legendStirng[5], },
  caseRotation: { legend: legendStirng[6], },
  moveCase: { legend: legendStirng[7], },
  placedCasesTitle: "Placed Cases",
  noBoxes: "No boxes placed yet",
  settingsBtn: "Settings",
  speedLabel: "Fast: ",
  angle: "Angle",
  type: "Type",
  offset: "Offset",
  offsetDepX: "Offset Dep. X:",
  offsetDepY: "Offset Dep. Y:",
  option:{
1: "Optimize Pick-Up Sequence",
2: "Save <b>DIAGONALLY</b> mirrored on layer ",
3: "Save <b>HORIZONTALLY</b> mirrored on layer ",
4: "Save <b>VERTICALLY</b> mirrored on layer ",

  }
};

setupButtonWithSVG(DepositA, 'svgNormalA', 'svgPressedA');
setupButtonWithSVG(DepositB, 'svgNormalB', 'svgPressedB');
setupButtonWithSVG(DepositAB, 'svgNormalAB', 'svgPressedAB');
setupButtonWithSVG(DeleteDeposit, 'svgNormalDeleteDeposit', 'svgPressedDeleteDeposit');
setupButtonWithSVG(clearPalletBtn, 'svgNormalDeletePallet', 'svgPressedDeletePallet');
setupButtonWithSVG(CentreBoxs, 'svgNormalCentreBox', 'svgPressedCentreBox');
setupButtonWithSVG(snapTopLeft, 'svgNormalsnapTopLeft', 'svgPressedsnapTopLeft');
setupButtonWithSVG(snapTopRight, 'svgNormalsnapTopRight', 'svgPressedsnapTopRight');
setupButtonWithSVG(snapBottomLeft, 'svgNormalsnapBottomLeft', 'svgPressedsnapBottomLeft');
setupButtonWithSVG(snapBottomRight, 'svgNormalsnapBottomRight', 'svgPressedsnapBottomRight');
setupButtonWithSVG(autoFillBtn, 'svgNormalAutoFill', 'svgPressedAutoFill');
setupButtonWithSVG(SaveBtn, 'svgNormalSave', 'svgPressedSave');
setupButtonWithSVG(TreD, 'svgNormal3D', 'svgPressed3D');
 
// Funzioni al click
DepositA.onclick         = function() { placeNextBox("A");};
DepositB.onclick         = function() { placeNextBox("B"); };
DepositAB.onclick        = function() { placeNextBox("AB"); };
DeleteDeposit.onclick    = function() { deleteSelectedBox(); };
autoFillBtn.onclick      = function() { autoFill();  };
TreD.onclick             = function() { state.Init = false; sessionStorage.setItem("state", JSON.stringify(state)); window.location.href = "3D.html";  };
clearPalletBtn.onclick   = function() { clearPallet(); };
CentreBoxs.onclick       = function() { snapBoxesToCorner("centre"); };
snapTopLeft.onclick      = function() { snapBoxesToCorner("top-left"); };
snapTopRight.onclick     = function() { snapBoxesToCorner("top-right"); };
snapBottomLeft.onclick   = function() { snapBoxesToCorner("bottom-left"); };
snapBottomRight.onclick  = function() { snapBoxesToCorner("bottom-right"); };
toggleSidebarBtn.onclick = function() { SidebarVisible = !SidebarVisible; if (SidebarVisible) { Sidebar.classList.add("open"); }  else { Sidebar.classList.remove("open"); } updateToggleSidebarButton(); };


// Allinea campi, bottoni deposito e titolo allo stato corrente (dati PLC o stato ripristinato dalla vista 3D)
function applyStateToUI() {
  sidePalletW.value      = state.palletReal.w;
  sidePalletH.value      = state.palletReal.h;
  sideCompositionW.value = state.pallet.w;
  sideCompositionH.value = state.pallet.h;
  sideBoxW.value         = state.boxSize.w
  sideBoxH.value         = state.boxSize.h
  prevBox.w              = state.boxSize.w
  prevBox.h              = state.boxSize.h
  ApproachX.value        = state.Approach.x;
  ApproachY.value        = state.Approach.y;

  var  isADisabled  = !(state.PickType !== 2);
  var  isBDisabled  = !(state.PickType == 1 || state.PickType == 3);
  var  isABDisabled = !(state.PickType > 0);
  updateDepositButtons(isADisabled, isBDisabled, isABDisabled);

  var header = document.getElementById("pageTitle");
  header.textContent = state.LayerType === "LayerA" ? "PalComposeTOOL – Configuration Layer A" : "PalComposeTOOL – Configuration Layer B";
}

function updatePalletFromPLC(pallet) {
  let FixedMaxComposition = 1500;
  let FixedDimDepMin = 60;
  let SetupMaxX = 500;
  let SetupMaxY = 500;

  state.palletReal.w = Number(pallet.PalletX) / 10;
  state.palletReal.h = Number(pallet.PalletY) / 10;
  state.NboxCH.a     = Number(pallet.NBoxCHA);
  state.NboxCH.b     = Number(pallet.NBoxCHB);
  state.Nbox.x       = Number(pallet.NBoxX);
  state.Nbox.y       = Number(pallet.NBoxY);
  state.LayerType    = pallet.LayerType;
  state.PickType     = Number(pallet.PickType);
  state.boxSize.w    = Math.round(Number(pallet.CaseX) / 10 - 0.1);
  state.boxSize.h    = Math.round(Number(pallet.CaseY) / 10 - 0.1);
  state.Offset.x     = Number(pallet.OffsetDepositX) / 10; 
  state.Offset.y     = Number(pallet.OffsetDepositY) / 10; 
  state.PickType     = Number(pallet.PickType); 
  // true quando il picking wheel è ruotato (diverso da 0 e da 180); dato assente o non numerico = non ruotato
  var pickingWheelAngle = Number(pallet.PickingWheel);
  state.PickingWheel = !isNaN(pickingWheelAngle) && pickingWheelAngle !== 0 && pickingWheelAngle !== 180;
  state.Approach.x   = Number(pallet.ApproachX) / 10; 
  state.Approach.y   = Number(pallet.ApproachY) / 10; 
  state.NBoxA        = Number(pallet.NBoxA); 
  state.NBoxB        = Number(pallet.NBoxB); 
  state.CornerLabelling = Number(pallet.CornerLabelling) === 1;

  state.pallet.w     = Math.min(state.palletReal.w,FixedMaxComposition);
  state.pallet.h     = Math.min(state.palletReal.h,FixedMaxComposition);

  applyStateToUI();

  state.boxes = [];
  state.selectedId = null;

  var nBox = pallet.boxes.length;
  let StringErorr;
  let Error = 0;

  Error = updateDepositDimensions();
  if (Error > 0){
    StringErorr = "Ch.A Rows Number (" + state.NboxCH.a + ") Ch.B Rows Number (" + state.NboxCH.b + ") <> Cases Number";
    switch(Error){
      case 1:
      case 4:
        StringErorr = StringErorr + " X (" + state.Nbox.x + ")";
      break;
      case 2:
      case 3:
        StringErorr = StringErorr + " Y (" + state.Nbox.y + ")";
      break;
    }
  }
  else{
    if(state.DepDimA.x < FixedDimDepMin){
      Error = 11;
      StringErorr = "A Deposit X Dimension < " + FixedDimDepMin;
    }
    if(state.DepDimA.y < FixedDimDepMin){
      Error = 12;
      StringErorr = "A Deposit Y Dimension < " + FixedDimDepMin;
    }
    if((state.PickType == 1) || (state.PickType == 3)){
      if(state.DepDimB.x < FixedDimDepMin){
        Error = 13;
        StringErorr = "B Deposit X Dimension < " + FixedDimDepMin;
      }
      if(state.DepDimB.y < FixedDimDepMin){
        Error = 14;
        StringErorr = "B Deposit Y Dimension < " + FixedDimDepMin;
      }
      if(state.DepDimAB.x < FixedDimDepMin){
        Error = 15;
        StringErorr = "AB Deposit X Dimension < " + FixedDimDepMin;
      }
      if(state.DepDimAB.y < FixedDimDepMin){
        Error = 16;
        StringErorr = "AB Deposit Y Dimension < " + FixedDimDepMin;
      }      
    }
  }
  if (Error == 0) {
    for (var i = 0; i < nBox; i++) {
      var b = pallet.boxes[i];
      var angle = Number(b.PositionR);
      const Type = mapDepositType(b.DepositType);
      if (Type == 21) { // Deposit type check
        Error = 21;
        StringErorr = "Deposit nr. " + (i + 1) + ": Undefined Deposit Type";
        break;
      }
      if (!(angle === 0 || angle === 90 || angle === 180 || angle === 270)) { // Angle check
        Error = 22;
        StringErorr = "Deposit nr. " + (i + 1) + ": Wrong R Coordinate (" + angle + ")";
        break;
      }
      var isRotated = (angle === 90 || angle === 270);
      const { w, h } = getDepositBoxSize(b.DepositType, isRotated);
      if ((Number(b.PositionX) - w / 2) < -0.5) { // X min
        Error = 23;
        StringErorr = "Deposit nr. " + (i + 1) + ": Too Low X Coordinate (" + Number(b.PositionX) + "<" + w / 2 + ")";
        break;
      } 
      if ((Number(b.PositionX) + w / 2) > FixedMaxComposition + 0.5) { // X max
        Error = 24;
        StringErorr = "Deposit nr. " + (i + 1) + ": Too High X Coordinate (" + Number(b.PositionX) + ">" + (FixedMaxComposition - w / 2) + ")";
        break;
      }
      if ((Number(b.PositionY) - h / 2) < -0.5) { // Y min
        Error = 25;
        StringErorr = "Deposit nr. " + (i + 1) + ": Too Low Y Coordinate (" + Number(b.PositionY) + "<" + h / 2 + ")";
        break;
      }
      if ((Number(b.PositionY) + h / 2) > FixedMaxComposition + 0.5) { // Y max
        Error = 26;
        StringErorr = "Deposit nr. " + (i + 1) + ": Too High Y Coordinate (" + Number(b.PositionY) + ">" + (FixedMaxComposition - h / 2) + ")";
        break;
      }
      // Update pallet size
      state.pallet.w = Math.min( Math.max(state.pallet.w, (Number(b.PositionX) + w / 2) + 1), FixedMaxComposition );
      state.pallet.h = Math.min( Math.max(state.pallet.h, (Number(b.PositionY) + h / 2) + 1), FixedMaxComposition );
      let x = Number(b.PositionX) - w / 2;
      let y = Number(b.PositionY) - h / 2;
      if (w % 2 !== 0) { x -= 0.5; } // sposta di mezzo millimetro a sinistra se larghezza dispari
      if (h % 2 !== 0) { y -= 0.5; } // sposta di mezzo millimetro in basso per altezze dispari

      for (let j = 0; j < state.boxes.length; j++) {
        const other = state.boxes[j];
        const isColliding =
          x < other.x + other.w &&
          x + w > other.x &&
          y < other.y + other.h &&
          y + h > other.y;
        if (isColliding) {
          Error = 27; 
          StringErorr = "Deposit nr. " + (i + 1) + " collides with deposit nr. " + (j + 1);
          break;
        }
      }
      if (Error !== 0) break;
      state.boxes.push({ // Add box
        id: b.id,
        x: x,
        y: y,
        w: w,
        h: h,
        angle: angle,
        depositType: Type,
        picktype: mapDepositType(b.PickType)
      });
    }
  }
  if (Error !== 0) {
    const buttons = [];
    if (Error > 20) {
      buttons.push({
        text: buttonTextPopup[5],
        class: "confirm-btn",
        onClick: function () {
          updateSidebar();
          draw();
        }
      });
    }
    buttons.push({
      text: buttonTextPopup[6],
      class: "cancel-btn",
      onClick: function () {
      }
    });
    showHMIPopup({
      title: titlePopup[2] + Error,
      message: StringErorr,
      headerColor: "#EA053A",
      buttons: buttons
    });
  } 
  else {
    updateSidebar();
    selectHighestIdBox()
    draw();
    console.log(state)
  }
}

// Risultato verso FactoryTalk: con l'ActiveX PalComposeBrowser va direttamente al VBA (evento MessageReceived),
// con il browser standard di FT viene scaricato come RuntimeData.csv e letto dal VBA nella cartella Download
function sendResultToHMI(csvContent) {
  if (window.PalComposeHost) { window.PalComposeHost.send(csvContent); return; }
  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "RuntimeData.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

var MAX_BOXES_PLC = 60; // posizioni disponibili per layer nel PLC (vedi CreateLayerStructure nel VBA)

SaveBtn.onclick          = function() {
  let symmetryValuesResult = calculateMirrorScores(state.boxes);
  showSavePopup({
    title: titlePopup[1],
    headerColor: "#ff9800",
    checkboxes: [
      { label: strings.option[1], value: 0 },
      { label: state.LayerType === "LayerA" ? strings.option[2] + "B" : strings.option[2] + "A", value: 0 },
      { label: state.LayerType === "LayerA" ? strings.option[3] + "B" : strings.option[3] + "A", value: 0 },
      { label: state.LayerType === "LayerA" ? strings.option[4] + "B" : strings.option[4] + "A", value: 0 },
    ],
    symmetryValues: symmetryValuesResult,
    buttons: [
      {
        text: buttonTextPopup[3],
        class: "primary",
        onClick: function() {
          if (state.boxes.length > MAX_BOXES_PLC) {
            showHMIPopup({
              title: titlePopup[0],
              message: "The PLC accepts at most " + MAX_BOXES_PLC + " deposits per layer (" + state.boxes.length + " placed)",
              headerColor: "#4d4d4d",
              buttons: [ { text: buttonTextPopup[0], class: "confirm-btn", onClick: function () {} } ]
            });
            return;
          }
          var checkboxes = document.querySelectorAll(".hm-checkbox input");
          var states = [];
          for (var i = 0; i < checkboxes.length; i++) {
            var cb = checkboxes[i];
            var labelEl = cb.nextSibling.nextSibling; 
            var label = labelEl && labelEl.textContent ? labelEl.textContent : "";
            states.push({
              index: i,
              label: label,
              checked: cb.checked
            });
          }
          // Approach in mm letto dai campi (stessi valori usati per riordino e CSV)
          var approachXmm = parseFloat(ApproachX.value) || 0;
          var approachYmm = parseFloat(ApproachY.value) || 0;
          var ComplementaryLayer = [];
          for (var j = 0; j < state.boxes.length; j++) {
            ComplementaryLayer.push({
              id: state.boxes[j].id,
              x: state.boxes[j].x,
              y: state.boxes[j].y,
              w: state.boxes[j].w,
              h: state.boxes[j].h,
              angle: state.boxes[j].angle,
              depositType: state.boxes[j].depositType
            });
          }
          if (states[1] && states[1].checked) { ComplementaryLayer = mirrorBoxesDiagonal(ComplementaryLayer); } 
          else if (states[2] && states[2].checked) { ComplementaryLayer = mirrorBoxesHorizontal(ComplementaryLayer); } 
          else if (states[3] && states[3].checked) { ComplementaryLayer = mirrorBoxesVertical(ComplementaryLayer); }
          else { ComplementaryLayer = []; }
          // Se la specchiatura non è possibile (casse fuori dal pallet o in collisione) esco con un avviso
          if (!ComplementaryLayer) {
            showHMIPopup({
              title: titlePopup[0],
              message: "Mirror not possible: boxes out of pallet or colliding",
              headerColor: "#4d4d4d",
              buttons: [
                { text: buttonTextPopup[0], class: "confirm-btn", onClick: function () {} }
              ]
            });
            return;
          }
          ComplementaryLayer = ReorderLayerWithCollisionCheck(ComplementaryLayer, approachXmm, approachYmm);
          draw()
          const palletModel = {
            "CommonVariable": {
              "NBoxA": state.boxes.length,
              "NBoxB": state.boxes.length,
              "PalletX": Math.round(state.palletReal.w * 10),
              "PalletY": Math.round(state.palletReal.h * 10),
              "OffsetDepositX": Math.round(state.Offset.x * 10),
              "OffsetDepositY": Math.round(state.Offset.y * 10),
              "CaseX": Math.round(sideBoxW.value * 10),
              "CaseY": Math.round(sideBoxH.value * 10),
              "ApproachX": Math.round(approachXmm * 10),
              "ApproachY": Math.round(approachYmm * 10),
            },
            "LayerA": [],
            "LayerB": []
          };
          // --- Popola LayerA o LayerB in base a state.LayerType ---
          if (state.LayerType == "LayerA") {
            palletModel.LayerB = ComplementaryLayer.map((b) => ({
              id: b.id,
              PositionX: Math.round(b.x + b.w / 2),
              PositionY: Math.round(b.y + b.h / 2),
              PositionR: b.angle,
              PickType: mapDepositTypeReverse(b.depositType),
              DepositType: mapDepositTypeReverse(b.depositType)
            }));
            palletModel.LayerA = state.boxes.map((b) => ({
              id:  b.id,
              PositionX: Math.round(b.x + b.w / 2),
              PositionY: Math.round(b.y + b.h / 2),
              PositionR: b.angle,
              PickType: mapDepositTypeReverse(b.depositType),
              DepositType: mapDepositTypeReverse(b.depositType)
            }));
            palletModel.CommonVariable.NBoxA = state.boxes.length;
            palletModel.CommonVariable.NBoxB = ComplementaryLayer.length === 0 ? state.NBoxB : ComplementaryLayer.length;
            if (states[0] && states[0].checked){ palletModel.LayerA = OptimizeMultiPickUpLayer(palletModel.LayerA, state.boxes); palletModel.LayerB = OptimizeMultiPickUpLayer(palletModel.LayerB, ComplementaryLayer);}
          } else {
            palletModel.LayerA = ComplementaryLayer.map((b) => ({
              id:  b.id,
              PositionX: Math.round(b.x + b.w / 2),
              PositionY: Math.round(b.y + b.h / 2),
              PositionR: b.angle,
              PickType: mapDepositTypeReverse(b.depositType),
              DepositType: mapDepositTypeReverse(b.depositType)
            }));
            palletModel.LayerB = state.boxes.map((b) => ({
              id:  b.id,
              PositionX: Math.round(b.x + b.w / 2),
              PositionY: Math.round(b.y + b.h / 2),
              PositionR: b.angle,
              PickType: mapDepositTypeReverse(b.depositType),
              DepositType: mapDepositTypeReverse(b.depositType)
            }));
            palletModel.CommonVariable.NBoxA = ComplementaryLayer.length === 0 ? state.NBoxA : ComplementaryLayer.length;
            palletModel.CommonVariable.NBoxB = state.boxes.length;
            if (states[0] && states[0].checked){ palletModel.LayerA = OptimizeMultiPickUpLayer(palletModel.LayerA, ComplementaryLayer); palletModel.LayerB = OptimizeMultiPickUpLayer(palletModel.LayerB, state.boxes);}
          }
          // --- Generazione CSV ---
          let csvContent = "Saved,TRUE\n";
          csvContent += "Type,Id,PositionX,PositionY,PositionR,PickupType,DepositType\n";
          for (const key in palletModel.CommonVariable) { csvContent += `CommonVariable,${key},${palletModel.CommonVariable[key]},,,\n`; }
          palletModel.LayerA.forEach(box => { csvContent += `LayerA,${box.id},${box.PositionX},${box.PositionY},${box.PositionR},${box.PickType},${box.DepositType}\n`; }); // Layer A
          palletModel.LayerB.forEach(box => { csvContent += `LayerB,${box.id},${box.PositionX},${box.PositionY},${box.PositionR},${box.PickType},${box.DepositType}\n`; }); // Layer B
          sendResultToHMI(csvContent);
          showHMIPopup({
            title: titlePopup[3],
            message: messagesPopup[7],
            headerColor: "#4d4d4d",
            buttons: []
          });
        }
      },
      {
        text: buttonTextPopup[4],
        class: "primary",
        onClick: function() {
          sendResultToHMI("Saved,FALSE");
          showHMIPopup({
            title: titlePopup[4],
            message: messagesPopup[8],
            headerColor: "#4d4d4d",
            buttons: []
          });
        }
      },
      {
        text: buttonTextPopup[2],
        class: "primary",
        onClick: function() {
          console.log(state);
        }
      }
    ]
  });
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                 POP UP                                                                    //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function showHMIPopup(config) {
  var title       = config.title;
  var message     = config.message;
  var headerColor = config.headerColor;
  var buttons     = config.buttons;
  var overlay = document.createElement("div");
  overlay.className = "hm-popup-overlay";
  var popup = document.createElement("div");
  popup.className = "hm-popup";
  popup.style.setProperty("--header-bg", headerColor);
  var buttonsHTML = "";
  for (var i = 0; i < buttons.length; i++) { var btn = buttons[i]; buttonsHTML += "<button class=\"hm-btn " + (btn.class || "") + "\" data-index=\"" + i + "\">" + btn.text + "</button>"; }
  popup.innerHTML = "<div class=\"hm-popup-header\">" + WARNING_SVG + "<div class=\"hm-popup-title\">" + title + "</div>" + "</div>" + "<div class=\"hm-popup-body\">" + message + "</div>" + "<div class=\"hm-popup-footer\">" + buttonsHTML + "</div>";
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  var popupButtons = popup.getElementsByTagName("button");
  for (var j = 0; j < popupButtons.length; j++) {
    (function(index) { 
      var btnEl = popupButtons[index];
      btnEl.onclick = function() { buttons[index].onClick(); document.body.removeChild(overlay); };
    })(j);
  }
}

function showSavePopup(config) {
  var title          = config.title;
  var headerColor    = config.headerColor || "#333";
  var checkboxes     = config.checkboxes || [];
  var buttons        = config.buttons || [];
  var symmetryValues = config.symmetryValues || [0,0,0]; // [diagonal, horizontal, vertical]
  var overlay = document.createElement("div");
  overlay.className = "hm-popup-overlay";
  var popup = document.createElement("div");
  popup.className = "hm-popup";
  popup.style.setProperty("--header-bg", headerColor);
  var checkboxHTML = ""; // Checkbox + barre HTML
  for (var i = 0; i < checkboxes.length; i++) {
    var cb = checkboxes[i];
    checkboxHTML += "<label class=\"hm-checkbox\" data-index=\"" + i + "\">" + "<input type=\"checkbox\">" + "<span class=\"hm-checkbox-box CheckBoxDisabled\"></span>" + "<span class=\"hm-checkbox-label\">" + cb.label + "</span>" + "</label>";
    if (i >= 1 && i <= 3) { // Barre solo per le ultime 3 checkbox (diagonale, orizzontale, verticale)
      var value = symmetryValues[i-1];
      checkboxHTML += `
        <div class="symmetry-bar">
          <div class="bar">
            <div class="fill" style="width:${value}%;"></div>
            <span class="bar-text">${value}%</span>
          </div>
        </div>`;
    }
  }
  var buttonsHTML = "";
  for (var j = 0; j < buttons.length; j++) {
    var btn = buttons[j];
    buttonsHTML += "<button class=\"hm-btn " + (btn.class || "") + "\" data-index=\"" + j + "\">" + btn.text + "</button>";
  }
  // HTML del popup
  popup.innerHTML = "<div class=\"hm-popup-header\"><div class=\"hm-popup-title\">" + title + "</div></div>" + "<div class=\"hm-popup-body\"><div class=\"hm-checkbox-group\">" + checkboxHTML + "</div></div>" + "<div class=\"hm-popup-footer\">" + buttonsHTML + "</div>";
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  // Gestione checkbox (mutua esclusione dalla seconda in poi)
  var inputs = popup.getElementsByTagName("input");
  for (var k = 0; k < inputs.length; k++) {
    (function(index) {
      var input = inputs[index];
      input.onchange = function() {
        var box = input.nextSibling;
        if (input.checked) { box.className = "hm-checkbox-box CheckBoxEnabled"; } 
        else { box.className = "hm-checkbox-box CheckBoxDisabled"; }
        if (index > 0 && input.checked) {
          for (var m = 0; m < inputs.length; m++) {
            if (m > 0 && m !== index) { inputs[m].checked = false; inputs[m].nextSibling.className = "hm-checkbox-box CheckBoxDisabled"; }
          }
        }
      };
    })(k);
  }
  var popupButtons = popup.getElementsByTagName("button"); // Gestione bottoni
  for (var n = 0; n < popupButtons.length; n++) {
    (function(index) {
      var btnEl = popupButtons[index];
      btnEl.onclick = function() {
        var selected = [];
        for (var p = 0; p < inputs.length; p++) {
          var cb = inputs[p];
          if (cb.checked) {
            var labelSpan = cb.nextSibling.nextSibling;
            selected.push({
              index: p,
              label: labelSpan.textContent,
              checked: cb.checked
            });
          }
        }
        try {
          if (buttons[index].onClick) { buttons[index].onClick(selected); }
        } catch (err) {
          console.error("Errore durante il salvataggio:", err);
        } finally {
          if (overlay.parentNode) { document.body.removeChild(overlay); }
        }
      };
    })(n);
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                          SWAP ID FUNCTION                                                                //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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

canvas.addEventListener("pointerdown", handleSwap); // pointer/touch


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                              UPDATE SLIDER                                                                //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                              MANAGEMENT TEXT                                                              //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var fieldsets = document.querySelectorAll('fieldset[data-key]');
for (var i = 0; i < fieldsets.length; i++) {
  var fieldset = fieldsets[i];
  var key = fieldset.dataset.key;
  var data = strings[key];
  if (!data) continue;
  var legend = fieldset.querySelector('legend');
  if (legend && data.legend) { legend.textContent = data.legend; }
  var inputs = fieldset.querySelectorAll('input[data-key]');
  for (var j = 0; j < inputs.length; j++) {
    var input = inputs[j];
    var k = input.dataset.key;
    if (!data[k]) continue;
    var label = input.parentNode;
    while (label && label.tagName !== "LABEL") { label = label.parentNode; }
    if (!label) continue;
    // evita di inserire il testo due volte
    if (label.firstChild && label.firstChild.nodeType !== 3) { label.insertBefore(document.createTextNode(data[k]), input); }
  }
}

var els = document.querySelectorAll('[data-key]:not(fieldset)');
for (var i = 0; i < els.length; i++) {
  var el = els[i];
  var key = el.dataset.key;
  if (!strings[key]) continue;
  el.textContent = strings[key];
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                              INPUT FIELDS                                                                 //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


sideMargin.onchange = function () {
  var value = parseFloat(this.value);
  if (isNaN(value)) value = 0;
  if (value < 0) value = 0;
  if (value > 20) value = 20;
  value = Math.round(value * 10) / 10;
  this.value = value;
  updateSidebar();
};

sideCompositionW.onchange = function() {
  var newW = Math.round(+sideCompositionW.value - 0.1);
  if (sideCompositionW.value !== prevPallet.w) {
    if (newW <= state.palletReal.w){
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[2],
        headerColor: "#EA053A",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              state.boxes = [];
              prevPallet.w = sideCompositionW.value;
              state.pallet.w = newW;
              draw();
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() {
            sideCompositionW.value = prevPallet.w;
            }
          }
        ]
      });  
    }
    else{
      prevPallet.w = sideCompositionW.value;
      state.pallet.w = newW;
      draw();
    }
  }
};

sideCompositionH.onchange = function() {
  var newH = Math.round(+sideCompositionH.value - 0.1);
  if (sideCompositionH.value !== prevPallet.h) {
    if (newH <= state.palletReal.h){
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[2],
        headerColor: "#EA053A",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              state.boxes = [];
              prevPallet.h = sideCompositionH.value;
              state.pallet.h = newH;
              draw();
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() {
            sideCompositionH.value = prevPallet.h;
            }
          }
        ]
      }); 
    } 
    else{
      prevPallet.h = sideCompositionH.value;
      state.pallet.h = newH;
      draw();
    }
  }
};

sidePalletW.onchange = function() {
  var value = +sidePalletW.value;
  if (value >= 700 && value <= 1300) { 
    var newW = Math.round(value - 0.1);
    if (sidePalletW.value !== prevPalletReal.w) {
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[2],
        headerColor: "#EA053A",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              //state.boxes = [];
              prevPalletReal.w = sidePalletW.value;
              state.palletReal.w = newW;
              draw();
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() {
              sidePalletW.value = prevPalletReal.w;
            }
          }
        ]
      }); 
    }
  }
  else{
    showHMIPopup({
      title: titlePopup[5],
      message: messagesPopup[9],
      headerColor: "#EA053A",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function() {
            sidePalletW.value = prevPalletReal.w;
            draw();
          }
        },
      ]
    });
  }
};

sidePalletH.onchange = function() {
  var value = +sidePalletH.value;
  if (value >= 700 && value <= 1300) { 
    var newH = Math.round(+sidePalletH.value - 0.1);
    if (sidePalletH.value !== prevPalletReal.h) {
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[2],
        headerColor: "#EA053A",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              //state.boxes = [];
              prevPalletReal.h = sidePalletH.value;
              state.palletReal.h = newH;
              draw();
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() {
              sidePalletH.value = prevPalletReal.h;
            }
          }
        ]
      }); 
    }
  }
  else{
    showHMIPopup({
      title: titlePopup[5],
      message: messagesPopup[9],
      headerColor: "#EA053A",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function() {
            sidePalletH.value = prevPalletReal.h;
            draw();
          }
        },
      ]
    });
  }
};


sideBoxW.onchange = function() {
  var value = +sideBoxW.value;
  if (value >= 10 && value <= 900) { 
    var newW = Math.round(value - 0.1);
    if (value === Number(prevBox.w)) return;
    if (state.boxes.length > 0){
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[4],
        headerColor: "#763343",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              if (value < Number(prevBox.w)) { // caso 1: nuova larghezza minore → applica subito
                state.boxSize.w = newW;
                const result = updateDepositDimensions();
                for (var i = 0; i < state.boxes.length; i++) {
                  var b = state.boxes[i];         
                  var angle = b.angle;
                  var isRotated = (angle === 90 || angle === 270);
                  const { w, h } = getDepositBoxSize(mapDepositTypeReverse(b.depositType), isRotated);
                  b.w = w;
                  b.h = h;
                }
                prevBox.w = value;
                draw();
                return;
              } // caso 2: nuova larghezza maggiore → controllo conflitti
              var stateBackup = {
                ...state,
                boxSize: { ...state.boxSize },
                Nbox: { ...state.Nbox },
                NboxCH: { ...state.NboxCH },
                DepDimA: { ...state.DepDimA },
                DepDimB: { ...state.DepDimB },
                DepDimAB: { ...state.DepDimAB },
                boxes: state.boxes.map(b => ({ ...b }))
              };
              try {
                state.boxSize.w = newW;
                const result = updateDepositDimensions();
                state.boxes = [];
                for (let i = 0; i < stateBackup.boxes.length; i++) {
                  var b = { ...stateBackup.boxes[i] }; // nuovo oggetto indipendente
                  var angle = b.angle;
                  var isRotated = (angle === 90 || angle === 270);
                  const { w, h } = getDepositBoxSize(mapDepositTypeReverse(b.depositType), isRotated);
                  b.w = w;
                  b.h = h;
                  state.boxes.push(b);
                }
                for (var i = 0; i < state.boxes.length; i++) {
                  if (!canPlace(state.boxes[i], state.boxes[i].id, state.boxes)) { throw new Error("Conflict detected"); }
                }
                prevBox.w = value;
                draw();
              } 
              catch (err) {
                console.log(err);
                state = { // rollback totale
                  ...stateBackup,
                  boxes: stateBackup.boxes.map(b => ({ ...b }))
                };
                sideBoxW.value = prevBox.w;
                showHMIPopup({
                  title: titlePopup[0],
                  message: messagesPopup[6],
                  headerColor: "#4d4d4d",
                  buttons: [
                    { text: buttonTextPopup[0], class: "confirm-btn", onClick: function() {} }
                  ]
                });
                draw();
              }     
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() { sideBoxW.value = prevBox.w; }
          }
        ]
      });
    }
  }
  else{
    showHMIPopup({
      title: titlePopup[5],
      message: messagesPopup[10],
      headerColor: "#EA053A",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function() { sideBoxW.value = prevBox.w; }
        },
      ]
    });
  }
};

sideBoxH.onchange = function() {
  var value = +sideBoxH.value;
  if (value >= 10 && value <= 900) { 
    var newH = Math.round(value - 0.1);
    if (value === Number(prevBox.h)) return;
    if (state.boxes.length > 0 ){
      showHMIPopup({
        title: titlePopup[0],
        message: messagesPopup[4],
        headerColor: "#EA053A",
        buttons: [
          {
            text: buttonTextPopup[1],
            class: "confirm-btn",
            onClick: function() {
              if (value < Number(prevBox.h)) { // caso 1: nuova altezza minore → applica subito
                state.boxSize.h = newH;
                const result = updateDepositDimensions();
                for (let i = 0; i < state.boxes.length; i++) {
                  var b = state.boxes[i];         
                  var angle = b.angle;
                  var isRotated = (angle === 90 || angle === 270);
                  const { w, h } = getDepositBoxSize(mapDepositTypeReverse(b.depositType), isRotated);
                  b.w = w;
                  b.h = h;
                }
                prevBox.h = value;
                draw();
                return;
              } // caso 2: nuova altezza maggiore → controllo conflitti
              var stateBackup = {
                ...state,
                boxSize: { ...state.boxSize },
                Nbox: { ...state.Nbox },
                NboxCH: { ...state.NboxCH },
                DepDimA: { ...state.DepDimA },
                DepDimB: { ...state.DepDimB },
                DepDimAB: { ...state.DepDimAB },
                boxes: state.boxes.map(b => ({ ...b }))
              };
              try {
                state.boxSize.h = newH;
                const result = updateDepositDimensions();
                state.boxes = [];
                for (let i = 0; i < stateBackup.boxes.length; i++) {
                  var b = { ...stateBackup.boxes[i] }; // nuovo oggetto indipendente
                  var angle = b.angle;
                  var isRotated = (angle === 90 || angle === 270);
                  const { w, h } = getDepositBoxSize(mapDepositTypeReverse(b.depositType), isRotated);
                  b.w = w;
                  b.h = h;
                  state.boxes.push(b);
                }
                for (var i = 0; i < state.boxes.length; i++) {
                  if (!canPlace(state.boxes[i], state.boxes[i].id, state.boxes)) { throw new Error("Conflict detected"); }
                }
                prevBox.h = value;
                draw();
              } 
              catch (err) {
                console.log(err);
                state = { // rollback totale
                  ...stateBackup,
                  boxes: stateBackup.boxes.map(b => ({ ...b }))
                };
                sideBoxH.value = prevBox.h;
                showHMIPopup({
                  title: titlePopup[0],
                  message: messagesPopup[6],
                  headerColor: "#4d4d4d",
                  buttons: [
                    { text: buttonTextPopup[0], class: "confirm-btn", onClick: function() {} }
                  ]
                });
                draw();
              }
            }
          },
          {
            text: buttonTextPopup[2],
            class: "cancel-btn",
            onClick: function() {  sideBoxH.value = prevBox.h; }
          }
        ]
      });
    }
  }
  else{
    showHMIPopup({
      title: titlePopup[5],
      message: messagesPopup[10],
      headerColor: "#EA053A",
      buttons: [
        {
          text: buttonTextPopup[0],
          class: "confirm-btn",
          onClick: function() { sideBoxH.value = prevBox.h; }
        },
      ]
    });
  }
};

ApproachX.onchange = function () {
  var value = parseFloat(this.value);
  if (isNaN(value)) value = 0;
  if (value < -100) value = -100;
  if (value > 100) value = 100;
  value = parseFloat(value.toFixed(1));
  this.value = value; 
  state.Approach.x = value;
};

ApproachY.onchange = function () {
  var value = parseFloat(this.value);
  if (isNaN(value)) value = 0;
  if (value < -100) value = -100;
  if (value > 100) value = 100;
  value = parseFloat(value.toFixed(1));
  this.value = value; 
  state.Approach.y = value;
};

speedSlider.oninput = function() {
  state.speedRatio = +speedSlider.value;
  speedVal.textContent = state.speedRatio;
  updateRange();
};

palletImg.onload = function() { draw(); };

var  WARNING_SVG = 
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">" +
    "<path d=\"M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z\"/>" +
  "</svg>";

updateCanvasSize();
updateRotationButtons();
updateToggleSidebarButton();
updateRange();
setupSwapButton(swapBtn, 'svgNormalSwapCase', 'svgPressedSwapCase');


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                          UPDATE PALLET CONFIGURATION                                                            //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function oneDec(n) { return Math.round(n * 10) / 10; }

function updateDepositDimensions() {
  let errorCode = 0;
  switch (state.PickType) {
    case 0:
      if(!state.PickingWheel){
        state.DepDimA.x  = oneDec(state.boxSize.w * state.Nbox.x);
        state.DepDimA.y  = oneDec(state.boxSize.h * state.Nbox.y);
      }
      else{
        state.DepDimA.x  = oneDec(state.boxSize.h * state.Nbox.y);
        state.DepDimA.y  = oneDec(state.boxSize.w * state.Nbox.x);        
      }
      state.DepDimB.x  = 0;
      state.DepDimB.y  = 0;
      state.DepDimAB.x = state.DepDimA.x;
      state.DepDimAB.y = state.DepDimA.y;
      break;
    case 1:
      if(!state.PickingWheel){
        state.DepDimA.x  = oneDec(state.boxSize.w * state.NboxCH.a);
        state.DepDimA.y  = oneDec(state.boxSize.h * state.Nbox.y);
        state.DepDimB.x  = oneDec(state.boxSize.w * (state.Nbox.x - state.NboxCH.a));
        state.DepDimAB.x = oneDec(state.boxSize.w * state.Nbox.x);
        if ((state.NboxCH.a + state.NboxCH.b) !== state.Nbox.x) { errorCode = 1;}
      }
      else{
        state.DepDimA.x  = oneDec(state.boxSize.h * state.NboxCH.a);
        state.DepDimA.y  = oneDec(state.boxSize.w * state.Nbox.x);
        state.DepDimB.x  = oneDec(state.boxSize.h * (state.Nbox.y - state.NboxCH.a));
        state.DepDimAB.x = oneDec(state.boxSize.h * state.Nbox.y);
        if ((state.NboxCH.a + state.NboxCH.b) !== state.Nbox.y) { errorCode = 2; }
      }
      state.DepDimB.y  = state.DepDimA.y;
      state.DepDimAB.y = state.DepDimA.y;
      break;
    case 2:
      if(!state.PickingWheel){
        state.DepDimAB.x = oneDec(state.boxSize.w * state.Nbox.x);
        state.DepDimAB.y = oneDec(state.boxSize.h * state.Nbox.y);

      }
      else{
        state.DepDimAB.x = oneDec(state.boxSize.h * state.Nbox.y);
        state.DepDimAB.y = oneDec(state.boxSize.w * state.Nbox.x);
      }
      state.DepDimA.x = state.DepDimAB.x
      state.DepDimA.y = state.DepDimAB.y
      break;
    case 3:
      if(!state.PickingWheel){
        state.DepDimA.x  = oneDec(state.boxSize.w * state.Nbox.x);
        state.DepDimA.y  = oneDec(state.boxSize.h * state.NboxCH.a);
        state.DepDimB.y  = oneDec(state.boxSize.h * (state.Nbox.y - state.NboxCH.a));
        state.DepDimAB.y = oneDec(state.boxSize.h * state.Nbox.y);
        if ((state.NboxCH.a + state.NboxCH.b) !== state.Nbox.y) { errorCode = 3; }
      }
      else{
        state.DepDimA.x  = oneDec(state.boxSize.h * state.Nbox.y);
        state.DepDimA.y  = oneDec(state.boxSize.w * state.NboxCH.a);
        state.DepDimB.y  = oneDec(state.boxSize.w * (state.Nbox.x - state.NboxCH.a));
        state.DepDimAB.y = oneDec(state.boxSize.w * state.Nbox.x);
        if ((state.NboxCH.a + state.NboxCH.b) !== state.Nbox.x) { errorCode = 4; }
      }
      state.DepDimB.x  = state.DepDimA.x;
      state.DepDimAB.x = state.DepDimA.x;
      break;
  }
  return errorCode;
}

function getDepositBoxSize(depositType, isRotated) {
  let w, h;
  switch (Number(depositType)) {
    case 0: // AB
      if (!isRotated) {
        w = state.DepDimAB.x;
        h = state.DepDimAB.y;
      } else {
        w = state.DepDimAB.y;
        h = state.DepDimAB.x;
      }
      break;
    case 2: // A
      if (!isRotated) {
        w = state.DepDimA.x;
        h = state.DepDimA.y;
      } else {
        w = state.DepDimA.y;
        h = state.DepDimA.x;
      }
      break;
    case 3: // B
      if (!isRotated) {
        w = state.DepDimB.x;
        h = state.DepDimB.y;
      } else {
        w = state.DepDimB.y;
        h = state.DepDimB.x;
      }
      break;
  }
  return { w, h };
}

function mapDepositType(val) {
  switch (Number(val)) {
    case 0: return "AB";
    case 1: return "Nothing";
    case 2: return "A";
    case 3: return "B";
    default: return 21;
  }
}

function mapDepositTypeReverse(val) {
  switch (val) {
    case "AB": return 0;
    case "A":  return 2;
    case "B":  return 3;
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                  FUNZIONI DI SPECCHIATURA DELLA CONFIGURAZIONE                                                //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function mirrorBoxesVertical() {
  var bbox = getBoxesBoundingBox();
  if (!bbox) return null;
  var mirrored = [];
  var top = bbox.y;
  var bottom = bbox.y + bbox.h;
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    var copy = {};
    for (var key in b) if (b.hasOwnProperty(key)) copy[key] = b[key];
    copy.y = top + (bottom - (b.y + b.h));
    copy.PositionY = copy.y + b.h / 2;
    mirrored.push(copy);
  }

  for (var i = 0; i < mirrored.length; i++) {
    var r = mirrored[i];
    if (r.x < 0 || r.y < 0 || r.x + r.w > state.pallet.w || r.y + r.h > state.pallet.h) {
      const errors = [];
      if (r.x < 0) { errors.push(`sinistra fuori di ${-r.x}`); }
      if (r.y < 0) { errors.push(`alto fuori di ${-r.y}`); }
      if (r.x + r.w > state.pallet.w) { errors.push(`destra fuori di ${(r.x + r.w) - state.pallet.w}`);}
      if (r.y + r.h > state.pallet.h) { errors.push(`basso fuori di ${(r.y + r.h) - state.pallet.h}`);}
      console.log(`Box ${r.id} fuori dal pallet (${errors.join(", ")}) | ` + `x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`);
      return null;
    }
    for (var j = i + 1; j < mirrored.length; j++) {
      var s = mirrored[j];
      if (rectsOverlap(r, s)) {
        var overlapX = Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x);
        var overlapY = Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y);
        console.log(`Conflitto tra box ${r.id} e box ${s.id}`);
        console.log(`   Box ${r.id} → x:${r.x}, y:${r.y}, w:${r.w}, h:${r.h}`);
        console.log(`   Box ${s.id} → x:${s.x}, y:${s.y}, w:${s.w}, h:${s.h}`);
        console.log(`   Sovrapposizione → X:${overlapX}, Y:${overlapY}`);
        return null;
      }
    }
  }
  console.log("Mirror verticale completato senza conflitti");
  return mirrored;
}

function mirrorBoxesHorizontal() {
  var bbox = getBoxesBoundingBox();
  if (!bbox) return null;
  var mirrored = [];
  var left = bbox.x;
  var right = bbox.x + bbox.w;
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    var copy = {};
    for (var key in b) if (b.hasOwnProperty(key)) copy[key] = b[key];
    copy.x = left + (right - (b.x + b.w));
    copy.PositionX = copy.x + b.w / 2;
    mirrored.push(copy);
  }
  for (var i = 0; i < mirrored.length; i++) {
    var r = mirrored[i];
    if (r.x < 0 || r.y < 0 || r.x + r.w > state.pallet.w || r.y + r.h > state.pallet.h) {
      const errors = [];
      if (r.x < 0) { errors.push(`sinistra fuori di ${-r.x}`); }
      if (r.y < 0) { errors.push(`alto fuori di ${-r.y}`); }
      if (r.x + r.w > state.pallet.w) { errors.push(`destra fuori di ${(r.x + r.w) - state.pallet.w}`); }
      if (r.y + r.h > state.pallet.h) { errors.push(`basso fuori di ${(r.y + r.h) - state.pallet.h}`); }
      console.log(`Box ${r.id} fuori dal pallet (${errors.join(", ")}) | ` +`x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`);
      return null;
    }
    for (var j = i + 1; j < mirrored.length; j++) {
      var s = mirrored[j];
      if (rectsOverlap(r, s)) {
        console.log(`Conflitto tra box ${r.id} e box ${s.id}`);
        console.log(`   Box ${r.id} → x:${r.x}, y:${r.y}, w:${r.w}, h:${r.h}`);
        console.log(`   Box ${s.id} → x:${s.x}, y:${s.y}, w:${s.w}, h:${s.h}`);
        var overlapX = Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x);
        var overlapY = Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y);
        console.log(`   Sovrapposizione → X: ${overlapX}, Y: ${overlapY}`);
        return null;
      }
    }
  }
  console.log("Mirror orizzontale completato senza conflitti");
  return mirrored;
}

function mirrorBoxesDiagonal() {
  var bbox = getBoxesBoundingBox();
  if (!bbox) return null;
  var mirrored = [];
  var left = bbox.x;
  var right = bbox.x + bbox.w;
  var top = bbox.y;
  var bottom = bbox.y + bbox.h;
  for (var i = 0; i < state.boxes.length; i++) {
    var b = state.boxes[i];
    var copy = {};
    for (var key in b) if (b.hasOwnProperty(key)) copy[key] = b[key];
    copy.x = left + (right - (b.x + b.w));
    copy.y = top + (bottom - (b.y + b.h));
    copy.PositionX = copy.x + b.w / 2;
    copy.PositionY = copy.y + b.h / 2;
    mirrored.push(copy);
  }
  for (var i = 0; i < mirrored.length; i++) {
    var r = mirrored[i];
    if (r.x < 0 || r.y < 0 || r.x + r.w > state.pallet.w || r.y + r.h > state.pallet.h) {
      const errors = [];
      if (r.x < 0) { errors.push(`sinistra fuori di ${-r.x}`); }
      if (r.y < 0) { errors.push(`alto fuori di ${-r.y}`); }
      if (r.x + r.w > state.pallet.w) { errors.push(`destra fuori di ${(r.x + r.w) - state.pallet.w}`); }
      if (r.y + r.h > state.pallet.h) { errors.push(`basso fuori di ${(r.y + r.h) - state.pallet.h}`); }
      console.log( `Box ${r.id} fuori dal pallet (${errors.join(", ")}) | ` + `x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`);
      return null;
    }
    for (var j = i + 1; j < mirrored.length; j++) {
      var s = mirrored[j];
      if (rectsOverlap(r, s)) {
        var overlapX = Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x);
        var overlapY = Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y);
        console.log(`Conflitto tra box ${r.id} e box ${s.id}`);
        console.log(`   Box ${r.id} → x:${r.x}, y:${r.y}, w:${r.w}, h:${r.h}`);
        console.log(`   Box ${s.id} → x:${s.x}, y:${s.y}, w:${s.w}, h:${s.h}`);
        console.log(`   Sovrapposizione → X:${overlapX}, Y:${overlapY}`);
        return null;
      }
    }
  }
  console.log("Mirror diagonale completato senza conflitti");
  return mirrored;
}

function calculateMirrorScores(originalBoxes) {
  var backup = state.boxes;
  state.boxes = originalBoxes;
  var mirroredH = mirrorBoxesHorizontal();
  var mirroredV = mirrorBoxesVertical();
  var mirroredD = mirrorBoxesDiagonal();
  state.boxes = backup;
  var scoreH = mirroredH ? calculateSimilarity(originalBoxes, mirroredH) : 0;
  var scoreV = mirroredV ? calculateSimilarity(originalBoxes, mirroredV) : 0;
  var scoreD = mirroredD ? calculateSimilarity(originalBoxes, mirroredD) : 0;
  return [Math.round(scoreD * 100), Math.round(scoreH* 100), Math.round(scoreV* 100)];
}

function calculateSimilarity(original, mirrored) {
  var totalOriginalArea = 0;
  var totalOverlapArea = 0;
  for (var i = 0; i < original.length; i++) { totalOriginalArea += original[i].w * original[i].h; }
  for (var i = 0; i < original.length; i++) {
    for (var j = 0; j < mirrored.length; j++) { totalOverlapArea += intersectionArea(original[i], mirrored[j]);}
  }
  if (totalOriginalArea === 0) return 0;
  return totalOverlapArea / totalOriginalArea;
}

function intersectionArea(a, b) {
  var overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  var overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return 0;
  return overlapX * overlapY;
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                 FUNZIONI DI OTTIMIZZAZIONE                                                    //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function invertAngle(angle) {
  switch(angle) {
    case 0: return 180;
    case 180: return 0;
    case 90: return 270;
    case 270: return 90;
    default: return angle;
  }
}

function areAnglesPaired(a, b) {
  const groupA = (a % 180 === 0) ? 0 : 1;
  const groupB = (b % 180 === 0) ? 0 : 1;
  return groupA === groupB;
}

function getCombinedFootprint(positionR, RifA, layerComplete, i) {
  let CombinedX, CombinedY, CombinedW, CombinedH;
  switch (positionR) {
    case 0: // A sopra B
      CombinedX = layerComplete[i].x;
      CombinedY = RifA ? (layerComplete[i].y - layerComplete[i+1].h) : layerComplete[i].y;
      CombinedW = layerComplete[i].w ;
      CombinedH = layerComplete[i].h + layerComplete[i+1].h;
      break;
    case 180: // B sopra A
      CombinedX = layerComplete[i].x;
      CombinedY = RifA ? layerComplete[i].y : (layerComplete[i].y - layerComplete[i+1].h);
      CombinedW = layerComplete[i].w ;
      CombinedH = layerComplete[i].h + layerComplete[i+1].h;
      break
    case 90: // A ruotata con B ruotata a destra
      CombinedX = RifA ? layerComplete[i].x : (layerComplete[i].x - layerComplete[i+1].w);
      CombinedY = layerComplete[i].y;
      CombinedW = layerComplete[i].w + layerComplete[i+1].w;
      CombinedH = layerComplete[i].h;
      break;
    case 270: // A ruotata con B ruotata a sinistra
      CombinedX = RifA ? (layerComplete[i].x - layerComplete[i+1].w) : layerComplete[i].x;
      CombinedY = layerComplete[i].y;
      CombinedW = layerComplete[i].w + layerComplete[i+1].w;
      CombinedH = layerComplete[i].h;
      break;
  }
  return { x: CombinedX, y: CombinedY, w: CombinedW, h: CombinedH };
}

  function collide(a, b) {
    const aLeft   = a.x;
    const aRight  = a.x + a.w;
    const aBottom = a.y;
    const aTop    = a.y + a.h;
    const bLeft   = b.x;
    const bRight  = b.x + b.w;
    const bBottom = b.y;
    const bTop    = b.y + b.h;
    const overlapX = !(bRight <= aLeft || aRight <= bLeft);
    const overlapY = !(bTop <= aBottom || aTop <= bBottom);
    const isColliding = overlapX && overlapY;
    return isColliding;
  }


function pairHasCollision(boxPrev, boxCurr, LayerComplete, i) {
  let RifA = mapDepositType(boxPrev.depositType) == "A";
  let SameAngle = areAnglesPaired(boxPrev.angle, boxCurr.angle);
  let w = boxCurr.w;
  let h = boxCurr.h;
  if (!SameAngle) [w, h] = [h, w];
  let combined = getCombinedFootprint(boxPrev.angle, RifA, LayerComplete, i);
  for (let k = 0; k < LayerComplete.length; k++) {
    if (k === i || k === i - 1) continue;
    if (collide(combined, LayerComplete[k])) { return true; }
  }
  return false;
}


function OptimizeMultiPickUpLayer(layer, LayerComplete) {
  function invertAngle(angle) {
    switch (angle) {
      case 0: return 180;
      case 180: return 0;
      case 90: return 270;
      case 270: return 90;
      default: return angle;
    }
  }
  layer = layer.slice().sort(function(a, b) { return a.id - b.id; });
  LayerComplete.sort((a, b) => a.id - b.id);
  if (state.PickType === 1 || state.PickType === 3) {
    for (let i = 1; i < layer.length; i++) {
      const curr = layer[i].PickType;
      const prev = layer[i - 1].PickType;
      if ((curr === 2 && prev === 3) || (curr === 3 && prev === 2)) {
        const boxPrev = layer[i - 1];
        const boxCurr = layer[i];
        boxPrev.PickType = 0;
        boxCurr.PickType = 1;
        if(state.PickType == 3 && false){
          let RifA = mapDepositType(boxPrev.DepositType) == "A" ? true : false; 
          let SameAngle = areAnglesPaired(boxPrev.PositionR, boxCurr.PositionR)
          let w = boxCurr.w;
          let h = boxCurr.h;
          if (!SameAngle) [w, h] = [h, w];
          let combined = getCombinedFootprint(boxPrev.PositionR, RifA, LayerComplete, i-1);
          let hasCollision = false;
          for (let k = 0; k < i - 1; k++) {
            if (collide(combined, LayerComplete[k])) { hasCollision = true; console.log("TRUE"); break; }
          }
          if (hasCollision) { boxPrev.PositionR = invertAngle(boxPrev.PositionR); } // provo inversione angolo prima cassa
        }
        i++; // salto la coppia successiva
      }
    }
  }
  return layer;
}

function ReorderLayerWithCollisionCheck(layer, approachX, approachY) {
  // Il segno dell'approccio decide da che lato arriva la cassa:
  //   approccio < 0  -> arriva dal lato basso/sinistro (le prime casse sono in alto/destra)
  //   approccio > 0  -> arriva dal lato alto/destro   (le prime casse sono in basso/sinistra)
  //   approccio = 0  -> trattato come negativo (come nella versione precedente)
  const FAR = 1e6; // punto di ingresso "all'infinito" sul lato da cui arriva la cassa
  const entryX = approachX > 0 ? FAR : -FAR;
  const entryY = approachY > 0 ? FAR : -FAR;

  // Lavoro su copie: l'array originale non viene modificato
  const original  = layer.map(b => ({ ...b })).sort((a, b) => a.id - b.id);
  const reordered = layer.map(b => ({ ...b })).sort((a, b) => a.id - b.id);
  const MAX_ITER = 5000; // limite di sicurezza contro i cicli infiniti
  let guard = 0;
  for (let i = reordered.length - 1; i >= 0; i--) {
    let stabilized = false;
    while (!stabilized) {
      if (++guard > MAX_ITER) {
        console.warn("Reorder: ciclo non risolvibile, ordine originale mantenuto");
        return original;
      }
      stabilized = true;
      const box = reordered[i];
      // Rettangolo spazzato dalla cassa dal lato di ingresso fino alla sua posizione
      const sweepMinX = Math.min(entryX, box.x);
      const sweepMaxX = Math.max(entryX, box.x + box.w);
      const sweepMinY = Math.min(entryY, box.y);
      const sweepMaxY = Math.max(entryY, box.y + box.h);
      for (let j = 0; j < i; j++) {
        const other = reordered[j];
        const overlapX = !(other.x + other.w <= sweepMinX || sweepMaxX <= other.x);
        const overlapY = !(other.y + other.h <= sweepMinY || sweepMaxY <= other.y);
        if (overlapX && overlapY) {
          const tmp = box.id;
          box.id = other.id;
          other.id = tmp;
          reordered.sort((a, b) => a.id - b.id);
          stabilized = false;
          break;
        }
      }
    }
  }
  return reordered;
}