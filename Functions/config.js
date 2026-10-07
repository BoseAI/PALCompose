// =====================================================================================
// PalCompose - config.js
// Impostazioni dell'applicazione (caricato per primo)
// =====================================================================================

var PALCOMPOSE_CONFIG = {
  // Modalita' tecnico: abilita il pulsante "PLC data" per modificare dalla pagina i dati che normalmente
  // arrivano dal PLC (dimensioni pallet e cassa, casse per deposito, tipo di presa, ...).
  // Serve per provare configurazioni in locale, anche senza PLC.
  // IN PRODUZIONE DEVE ESSERE false.
  // Si puo' attivare anche solo per una sessione aprendo la pagina con "Index.html?eng=1".
  engineeringMode: false,

  // Dati di partenza in modalita' tecnico quando non arrivano dati dal PLC
  // (stesse unita' del PLC: dimensioni in decimi di millimetro)
  defaultPlcData: {
    LayerType: "LayerA",
    NBoxA: 0, NBoxB: 0,
    PalletX: 12000, PalletY: 8000,
    NBoxX: 1, NBoxY: 1,
    OffsetDepositX: 0, OffsetDepositY: 0,
    PickType: 0,
    CaseX: 3000, CaseY: 2000,
    PickingWheel: 0,
    NBoxCHA: 1, NBoxCHB: 0,
    ApproachX: 0, ApproachY: 0,
    CornerLabelling: 0,
    boxes: []
  }
};

// Stato effettivo della modalita' tecnico (configurazione oppure parametro ?eng=1 nell'indirizzo)
var ENGINEERING_MODE = PALCOMPOSE_CONFIG.engineeringMode || /[?&]eng=1\b/.test(window.location.search);
