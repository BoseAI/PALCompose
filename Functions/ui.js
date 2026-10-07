// =====================================================================================
// PalCompose - ui.js
// Interfaccia: sidebar, pulsanti con icone, popup, caricamento, passaggio al 3D
// =====================================================================================

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
      html += "<li><span class=\"caseId\">" + b.id + "</span><span class=\"caseType " + b.depositType + "\">" + b.depositType + "</span>" +
              "<span class=\"caseData\">X " + centerX + " · Y " + centerY + " · " + b.angle + "°</span></li>";
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
    if (!strings[key] || el.id === "SidebarContent") continue; // la lista casse la scrive updateSidebar
    if (el.textContent !== strings[key]) el.textContent = strings[key];
  }
}

function updateToggleSidebarButton() {
  toggleSidebarBtn.classList.remove("defaultnormale", "defaultabilitato");
  if (SidebarVisible) { toggleSidebarBtn.classList.add("defaultabilitato");} 
  else { toggleSidebarBtn.classList.add("defaultnormale"); }
}

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

// Passaggio alla vista 3D: rotellina subito, stato in sessionStorage e anche in window.name
// (window.name resta tra una pagina e l'altra anche se il browser integrato non conserva sessionStorage)
function goTo3D() {
  state.Init = false;
  var json = JSON.stringify(state);
  try { sessionStorage.setItem("state", json); } catch (e) { }
  window.name = "PALSTATE:" + json;
  showLoadingOverlay("Loading 3D view...");
  setTimeout(function () { window.location.href = "3D.html"; }, 30); // lascia disegnare la rotellina
}

function showLoadingOverlay(text) {
  if (!document.getElementById("pcSpinStyle")) {
    var st = document.createElement("style");
    st.id = "pcSpinStyle";
    st.textContent = "@keyframes pcSpin{to{transform:rotate(360deg)}}";
    document.head.appendChild(st);
  }
  var o = document.createElement("div");
  o.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:3000;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;background:rgba(230,234,238,0.85);font:600 18px Arial,sans-serif;color:#023047";
  o.innerHTML = "<div style='width:64px;height:64px;border:7px solid #c9d2da;border-top-color:#09CCB5;border-radius:50%;" +
    "animation:pcSpin 0.9s linear infinite;margin-bottom:18px'></div><div></div>";
  o.lastChild.textContent = text;
  document.body.appendChild(o);
}

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

var  WARNING_SVG = 
  "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">" +
    "<path d=\"M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z\"/>" +
  "</svg>";

// Il pannello comandi deve stare nell'altezza disponibile, senza barra di scorrimento:
// se il contenuto e' piu' alto, viene rimpicciolito in proporzione (zoom CSS sul contenuto)
function fitControlsPanel() {
  var panel = document.getElementById("controls");
  if (!panel) return;
  var inner = document.getElementById("controlsInner");
  if (!inner) {
    inner = document.createElement("div");
    inner.id = "controlsInner";
    inner.style.display = "flex";            // stessa impaginazione a colonna del pannello originale
    inner.style.flexDirection = "column";    // (e i margini dei figli restano inclusi nella misura)
    while (panel.firstChild) inner.appendChild(panel.firstChild);
    panel.appendChild(inner);
  }
  // alcune icone sono dimensionate in percentuale della larghezza: l'altezza non scala in modo
  // proporzionale allo zoom, quindi si misura e si corregge per qualche passo
  var zoom = 1, avail = panel.clientHeight - 2;
  inner.style.zoom = 1;
  for (var i = 0; i < 8 && avail > 0; i++) {
    var need = inner.getBoundingClientRect().height;
    if (need <= avail) break;
    zoom = Math.max(0.5, zoom * avail / need * 0.995);
    inner.style.zoom = zoom.toFixed(3);
  }
}

