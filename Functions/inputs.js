// =====================================================================================
// PalCompose - inputs.js
// Campi della sidebar Settings: validazione e applicazione delle modifiche
// =====================================================================================

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
