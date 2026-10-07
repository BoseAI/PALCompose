// =====================================================================================
// PalCompose - draw.js
// Disegno 2D sul canvas: pallet, assi, depositi, casse, etichette, testi
// =====================================================================================

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

// Informazioni del deposito nell'angolo in alto a sinistra (come prima), spostate verso l'interno
// della fascia dell'etichetta così non la coprono con nessuna rotazione
var ANGLE_ARROWS = { 0: "\u2192", 90: "\u2191", 180: "\u2190", 270: "\u2193" };

function drawBoxText(box) {
  var w = mmToPx(box.w), h = mmToPx(box.h);
  var labelBand = Math.max(3, mmToPx(LABEL_THICK)) + 6;
  var x0 = mmToPx(box.x) + labelBand;
  var y0 = -mmToPx(box.y + box.h) + labelBand;        // bordo alto del deposito (la Y cresce verso il basso)
  var lines = [
    { text: box.id + "  " + box.depositType + "  " + (ANGLE_ARROWS[box.angle] || ""), bold: true },
    { text: "X: " + Math.ceil(box.x + box.w / 2) },
    { text: "Y: " + Math.ceil(box.y + box.h / 2) },
    { text: "Rot: " + box.angle + "\u00B0" }
  ];
  var boldSize = 38, size = 30;
  // deposito stretto o basso: il testo si riduce per restarci dentro
  ctx.font = "bold " + boldSize + "px Arial";
  var tw = ctx.measureText(lines[0].text).width;
  ctx.font = size + "px Arial";
  for (var i = 1; i < lines.length; i++) tw = Math.max(tw, ctx.measureText(lines[i].text).width);
  var totalH = boldSize + 3 * size + 3 * 4;
  var k = Math.min(1, (w - 2 * labelBand) / tw, (h - 2 * labelBand) / totalH);
  if (!(k > 0.4)) k = 0.4;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#023047";
  var y = y0;
  for (var j = 0; j < lines.length; j++) {
    var fs = (lines[j].bold ? boldSize : size) * k;
    ctx.font = (lines[j].bold ? "bold " : "") + fs + "px Arial";
    ctx.fillText(lines[j].text, x0, y);
    y += fs + 4 * k;
  }
  ctx.restore();
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
