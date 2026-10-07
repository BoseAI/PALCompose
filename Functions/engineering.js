// =====================================================================================
// PalCompose - engineering.js
// Modalita' tecnico: modifica dalla pagina dei dati che normalmente arrivano dal PLC.
// Attiva solo con PALCOMPOSE_CONFIG.engineeringMode = true (config.js) o con ?eng=1.
// =====================================================================================

// Campi modificabili. scale = fattore tra il valore mostrato (mm) e quello del PLC (decimi di mm)
var ENGINEERING_FIELDS = [
  { group: "Layer" },
  { key: "LayerType", label: "Layer", type: "select", options: [["LayerA", "Layer A"], ["LayerB", "Layer B"]],
    hint: "Layer being edited. When saving it can be mirrored onto the other layer." },
  { key: "CornerLabelling", label: "Corner label", type: "check",
    hint: "On: label on the case corner (right/bottom). Off: label on the right side." },
  { group: "Pallet (mm)" },
  { key: "PalletX", label: "Pallet X", scale: 10, min: 100, hint: "Pallet length." },
  { key: "PalletY", label: "Pallet Y", scale: 10, min: 100, hint: "Pallet width." },
  { group: "Case (mm)" },
  { key: "CaseX", label: "Case X", scale: 10, min: 10, hint: "Single case, side along X (case at 0°)." },
  { key: "CaseY", label: "Case Y", scale: 10, min: 10, hint: "Single case, side along Y (case at 0°)." },
  { group: "Deposit" },
  { key: "NBoxX", label: "Cases per deposit X", min: 1, step: 1, hint: "Cases picked and placed together, along X." },
  { key: "NBoxY", label: "Cases per deposit Y", min: 1, step: 1, hint: "Cases picked and placed together, along Y." },
  { key: "PickType", label: "Pick type", type: "select", options: [
      [0, "0 - A only"], [1, "1 - A + B (split X)"], [2, "2 - AB only"], [3, "3 - A + B (split Y)"]],
    hint: "0/2: whole deposit in one pick. 1/3: deposit split in part A and part B (along X or Y)." },
  { key: "PickingWheel", label: "Picking wheel rotated", type: "check", on: 90, off: 0,
    hint: "Cases arrive rotated by 90°: deposit X and Y are swapped." },
  { key: "NBoxCHA", label: "Cases in A (split)", min: 0, step: 1, hint: "Pick type 1/3 only: cases of the deposit in part A." },
  { key: "NBoxCHB", label: "Cases in B (split)", min: 0, step: 1, readOnly: true, hint: "Calculated: remaining cases (part B)." },
  { group: "Offsets (mm)" },
  { key: "OffsetDepositX", label: "Deposit offset X", scale: 10, hint: "Shift of the whole composition on the pallet, X." },
  { key: "OffsetDepositY", label: "Deposit offset Y", scale: 10, hint: "Shift of the whole composition on the pallet, Y." },
  { key: "ApproachX", label: "Approach X", scale: 10, hint: "The head comes in from this X offset before placing." },
  { key: "ApproachY", label: "Approach Y", scale: 10, hint: "The head comes in from this Y offset before placing." }
];

// Casse sull'asse diviso (stessa regola di updateDepositDimensions in plc.js)
function engineeringSplitTotal(pickType, nx, ny, wheel) {
  if (pickType === 1) return wheel ? ny : nx;
  if (pickType === 3) return wheel ? nx : ny;
  return 0;
}

// Stato corrente -> dati nel formato del PLC (come RuntimeLayerData.js)
function stateToPlcData() {
  return {
    LayerType: state.LayerType || "LayerA",
    NBoxA: state.NBoxA, NBoxB: state.NBoxB,
    PalletX: Math.round(state.palletReal.w * 10), PalletY: Math.round(state.palletReal.h * 10),
    NBoxX: state.Nbox.x, NBoxY: state.Nbox.y,
    OffsetDepositX: Math.round(state.Offset.x * 10), OffsetDepositY: Math.round(state.Offset.y * 10),
    PickType: state.PickType,
    CaseX: Math.round(state.boxSize.w * 10), CaseY: Math.round(state.boxSize.h * 10),
    PickingWheel: state.PickingWheel ? 90 : 0,
    NBoxCHA: state.NboxCH.a, NBoxCHB: state.NboxCH.b,
    ApproachX: Math.round(state.Approach.x * 10), ApproachY: Math.round(state.Approach.y * 10),
    CornerLabelling: state.CornerLabelling ? 1 : 0,
    boxes: []
  };
}

// Applica i nuovi dati. keepCases = true: i depositi restano nella stessa posizione (centro),
// ricalcolati con le nuove dimensioni; quelli che non stanno piu' sul pallet o si sovrappongono vengono tolti.
function applyEngineeringData(data, keepCases) {
  var old = state.boxes.map(function (b) { return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, angle: b.angle, depositType: b.depositType, picktype: b.picktype }; });
  updatePalletFromPLC(data);
  if (!keepCases || old.length === 0) return;
  var removed = 0;
  state.boxes = [];
  old.forEach(function (o) {
    var typeCode = mapDepositTypeReverse(o.depositType);
    var size = getDepositBoxSize(typeCode, o.angle === 90 || o.angle === 270);
    if (!(size.w > 0) || !(size.h > 0)) { removed++; return; }
    var box = { id: state.boxes.length + 1, x: o.cx - size.w / 2, y: o.cy - size.h / 2, w: size.w, h: size.h,
                angle: o.angle, depositType: o.depositType, picktype: o.picktype };
    if (canPlace(box, box.id)) state.boxes.push(box); else removed++;
  });
  selectHighestIdBox();
  draw();
  if (removed > 0) {
    showHMIPopup({
      title: titlePopup[0],
      message: removed + " deposit(s) no longer fit with the new data and were removed",
      headerColor: "#4d4d4d",
      buttons: [{ text: buttonTextPopup[0], class: "confirm-btn", onClick: function () {} }]
    });
  }
}

function showEngineeringPopup() {
  var data = stateToPlcData();
  var overlay = document.createElement("div");
  overlay.className = "hm-popup-overlay";
  var html = "<div class=\"hm-popup eng-popup\" style=\"--header-bg:#023047\">" +
    "<div class=\"hm-popup-header\"><div class=\"hm-popup-title\">PLC data (engineering mode)</div></div>" +
    "<div class=\"eng-body\">";
  ENGINEERING_FIELDS.forEach(function (f) {
    if (f.group) { html += "<div class=\"eng-group\">" + f.group + "</div>"; return; }
    var v = data[f.key];
    html += "<label class=\"eng-field\"><div class=\"eng-text\"><span>" + f.label + "</span>" +
            (f.hint ? "<small>" + f.hint + "</small>" : "") + "</div>";
    if (f.type === "select") {
      html += "<select data-key=\"" + f.key + "\">" + f.options.map(function (o) {
        return "<option value=\"" + o[0] + "\"" + (String(o[0]) === String(v) ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select>";
    } else if (f.type === "check") {
      var on = f.on !== undefined ? v === f.on || (f.on !== 1 && v !== f.off) : Number(v) === 1;
      html += "<input type=\"checkbox\" data-key=\"" + f.key + "\"" + (on ? " checked" : "") + ">";
    } else {
      html += "<input type=\"number\" data-key=\"" + f.key + "\" value=\"" + (f.scale ? v / f.scale : v) + "\"" +
              (f.min !== undefined ? " min=\"" + f.min + "\"" : "") + " step=\"" + (f.step || "any") + "\"" +
              (f.readOnly ? " readonly tabindex=\"-1\"" : "") + ">";
    }
    html += "</label>";
  });
  html += "</div><div class=\"eng-note\"><b>Apply</b>: applies the data and keeps the deposits where they are (deposits that no longer fit are removed). " +
    "<b>Apply &amp; clear</b>: applies the data and empties the pallet.</div><div class=\"hm-popup-footer\">" +
    "<button class=\"hm-btn primary\" data-act=\"keep\">Apply</button>" +
    "<button class=\"hm-btn primary\" data-act=\"clear\">Apply &amp; clear</button>" +
    "<button class=\"hm-btn primary\" data-act=\"cancel\">Cancel</button></div></div>";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // Casse in B calcolate; campi A/B attivi solo con presa divisa
  function el(key) { return overlay.querySelector("[data-key=\"" + key + "\"]"); }
  function refreshSplit() {
    var pick = Number(el("PickType").value);
    var total = engineeringSplitTotal(pick, parseInt(el("NBoxX").value, 10) || 1, parseInt(el("NBoxY").value, 10) || 1, el("PickingWheel").checked);
    var split = total > 0;
    var a = el("NBoxCHA"), b = el("NBoxCHB");
    a.disabled = b.disabled = !split;
    a.closest(".eng-field").classList.toggle("eng-off", !split);
    b.closest(".eng-field").classList.toggle("eng-off", !split);
    if (split) {
      var na = Math.max(1, Math.min(total - 1, parseInt(a.value, 10) || 1));
      if (total < 2) na = total;
      a.value = na;
      b.value = total - na;
    }
  }
  ["PickType", "NBoxX", "NBoxY", "NBoxCHA", "PickingWheel"].forEach(function (k) {
    el(k).addEventListener("input", refreshSplit);
    el(k).addEventListener("change", refreshSplit);
  });
  refreshSplit();

  overlay.querySelector(".hm-popup-footer").onclick = function (e) {
    var act = e.target.closest("button") && e.target.closest("button").getAttribute("data-act");
    if (!act) return;
    document.body.removeChild(overlay);
    if (act === "cancel") return;
    var out = stateToPlcData();
    ENGINEERING_FIELDS.forEach(function (f) {
      if (!f.key) return;
      var el = overlay.querySelector("[data-key=\"" + f.key + "\"]");
      if (f.type === "select") out[f.key] = isNaN(Number(el.value)) ? el.value : Number(el.value);
      else if (f.type === "check") out[f.key] = el.checked ? (f.on !== undefined ? f.on : 1) : (f.off !== undefined ? f.off : 0);
      else {
        var n = parseFloat(el.value);
        if (isNaN(n)) n = 0;
        if (f.min !== undefined && n < f.min) n = f.min;
        out[f.key] = f.scale ? Math.round(n * f.scale) : Math.round(n);
      }
    });
    applyEngineeringData(out, act === "keep");
  };
}

// Pulsante "PLC data" accanto a "Settings" e indicazione nel titolo (solo in modalita' tecnico)
function setupEngineeringMode() {
  if (!ENGINEERING_MODE) return;
  var settings = document.getElementById("toggleSidebar");
  var btn = document.createElement("button");
  btn.id = "engineeringBtn";
  btn.className = "defaultnormale";
  btn.textContent = "PLC data";
  var row = document.createElement("div");
  row.className = "eng-toolbar";
  settings.parentNode.insertBefore(row, settings);
  row.appendChild(settings);
  row.appendChild(btn);
  btn.onclick = showEngineeringPopup;
  var badge = document.createElement("span");
  badge.className = "eng-badge";
  badge.textContent = "ENGINEERING MODE";
  document.body.appendChild(badge);   // fuori dal titolo: il titolo viene riscritto all'arrivo dei dati
}
