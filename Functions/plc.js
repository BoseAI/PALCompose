// =====================================================================================
// PalCompose - plc.js
// Dati PLC: lettura configurazione, dimensioni depositi, conversioni tipi, invio risultato
// =====================================================================================

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
