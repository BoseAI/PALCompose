// =====================================================================================
// PalCompose - layer-tools.js
// Strato complementare: specchiature, punteggi di simmetria, ottimizzazione e riordino presa
// =====================================================================================

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
