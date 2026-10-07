// =====================================================================================
// PalCompose - app.js
// Avvio: collegamento degli eventi e inizializzazione (caricato per ultimo)
// =====================================================================================

palletImg.src = "./Assets/2D/Pallet_2D.svg";

// Touch / Pointer
canvas.addEventListener("pointerdown", startDrag);

canvas.addEventListener("pointermove", dragBox);
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
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

bindHoldButton(document.getElementById("btnUp"),0,-0.1);
bindHoldButton(document.getElementById("btnDown"),0,0.1);
bindHoldButton(document.getElementById("btnLeft"),-0.1,0);
bindHoldButton(document.getElementById("btnRight"),0.1,0);
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
TreD.onclick             = function() { goTo3D(); };
clearPalletBtn.onclick   = function() { clearPallet(); };
CentreBoxs.onclick       = function() { snapBoxesToCorner("centre"); };
snapTopLeft.onclick      = function() { snapBoxesToCorner("top-left"); };
snapTopRight.onclick     = function() { snapBoxesToCorner("top-right"); };
snapBottomLeft.onclick   = function() { snapBoxesToCorner("bottom-left"); };
snapBottomRight.onclick  = function() { snapBoxesToCorner("bottom-right"); };
toggleSidebarBtn.onclick = function() { SidebarVisible = !SidebarVisible; if (SidebarVisible) { Sidebar.classList.add("open"); }  else { Sidebar.classList.remove("open"); } updateToggleSidebarButton(); };
canvas.addEventListener("pointerdown", handleSwap); // pointer/touch
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

speedSlider.oninput = function() {
  state.speedRatio = +speedSlider.value;
  speedVal.textContent = state.speedRatio;
  updateRange();
};

palletImg.onload = function() { draw(); };
updateCanvasSize();
updateRotationButtons();
updateToggleSidebarButton();
updateRange();
setupSwapButton(swapBtn, 'svgNormalSwapCase', 'svgPressedSwapCase');
fitControlsPanel();
window.addEventListener("resize", fitControlsPanel);
