// =====================================================================================
// PalCompose - state.js
// Stato dell'applicazione, elementi della pagina e testi dell'interfaccia
// =====================================================================================

let  palletImg = new Image(); // --- PALLET SVG IMAGE ---
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
