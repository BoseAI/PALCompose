// =====================================================================================
// PalCompose - save.js
// Salvataggio: popup di salvataggio e generazione dati per il PLC
// =====================================================================================

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
