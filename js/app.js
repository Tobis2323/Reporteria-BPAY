/* =====================================================
   REPORTE PRO - app.js
   Herramienta interna de procesamiento de reportes
   =====================================================

   GUIA DE CONFIGURACION DE REGLAS:
   - Regla A (Traducciones de tipo):
       -> Agrega una linea en TYPE_TRANSLATIONS:
          "VALOR_ORIGINAL": "Traduccion en espanol"

   - Regla B (Renombrado de columnas):
       -> Agrega una linea en COLUMN_RENAMES:
          "nombre en minuscula sin acentos": "Nombre Nuevo"

   - Regla C (Columnas a eliminar):
       -> Agrega el nombre en minuscula sin acentos en:
          COLUMNS_TO_DELETE_MOVIMIENTOS o COLUMNS_TO_DELETE_TRANSACCIONES

   - Regla C Dinámica (Eliminar solo si están completamente vacías):
       -> Agrega el nombre en COLUMNS_TO_DELETE_IF_EMPTY:
          Se eliminan únicamente si no hay datos en ninguna fila. Si al menos una fila tiene datos, se conserva.

   ===================================================== */

/* =====================================================
   SECCION 1: UTILIDADES DE TEXTO Y SEGURIDAD
   ===================================================== */

/**
 * Normaliza un texto para comparaciones seguras e inmunes a diferencias de formato:
 * - Elimina acentos y diacríticos (á -> a, ó -> o, etc.)
 * - Convierte a minúsculas
 * - Reemplaza guiones bajos por espacios
 * - Colapsa espacios múltiples y quita espacios en los extremos
 */
function normalizeString(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos y diacríticos
    .replace(/_/g, " ")             // guiones bajos a espacios
    .replace(/\s+/g, " ")           // colapsar espacios
    .trim()
    .toLowerCase();
}

/**
 * Escapa caracteres especiales de HTML para prevenir inyecciones XSS.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Determina si una celda se considera vacía o sin datos relevantes.
 * Es vacía si no existe, es null/undefined, string vacío/espacios, o valor 0 / "-" / "0.00".
 */
function isCellEmpty(cell) {
  if (!cell || cell.v === undefined || cell.v === null) return true;
  const str = String(cell.v).trim();
  if (str === "" || str === "-" || str === "--" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
    return true;
  }
  if (str === "0" || str === "0.00" || str === "$0.00" || str === "$ 0.00") {
    return true;
  }
  if (typeof cell.v === "number" && cell.v === 0) {
    return true;
  }
  return false;
}


/* =====================================================
   SECCION 2: CONFIGURACION DE REGLAS Y DICCIONARIOS
   ===================================================== */

/**
 * REGLA A: Traducciones de tipos de movimiento / transacción.
 * Modifica únicamente los valores de la columna "Tipo".
 */
const TYPE_TRANSLATIONS = {
  "ADJUSTMENT_CREDIT":  "Ajuste de credito",
  "ADJUSTMENT_DEBIT":   "Ajuste de debito",
  "CASHIN":             "Ingreso de dinero",
  "CASHOUT":            "Retiro de dinero",
  "CASHOUT_REVERSAL":   "Reversa de retiro",
  "SALES":              "Ventas",
  "VENTA":              "Ventas",
  "VENTAS":             "Ventas",
  "RECHARGE":           "Recarga",
  "TAX_CREDIT":         "Impuesto al credito",
  "TAX_DEBIT":          "Impuesto al debito",
};

/**
 * REGLA B: Renombrado de encabezados de columnas.
 * Claves normalizadas en minúsculas y sin acentos.
 */
const COLUMN_RENAMES = {
  "costo arancel monto":                  "Comision sin IVA",
  "costo arancel iva monto":              "IVA de la comision",
  "costo financiero total monto":         "CFT sin IVA",
  "costo financiero total iva monto":     "IVA del CFT",
  "id external":                          "ID VENTA / ID COELSA",
  "liberacion categorico":                "Plazo de acreditación",
  "retencion iibb convenio":              "Retencion IIBB",
  "retencion iibb penalidad":             "Retencion IIBB Penalidad",
  "retencion ganancia":                   "Retencion Ganancias",
  "retencion ganancias":                  "Retencion Ganancias",
  "monto neto":                           "Monto Neto",
  "monto bruto":                          "Monto Bruto",
};

/**
 * REGLA C: Columnas a eliminar según tipo de reporte.
 * Se procesan de derecha a izquierda para no alterar los índices.
 */

// Columnas a eliminar en Reportes de Movimientos:
const COLUMNS_TO_DELETE_MOVIMIENTOS = [
  "telefono",
  "titular numero telefono",
  "subtipo",
];

// Columnas a eliminar en Reportes de Transacciones:
// 1. Comercio Codigo / Código de Comercio
// 2. Sucursal
// 3. Moneda
// 4. Condicion_IVA
// 5. Mensaje Respuesta
// 6. Geolocalización
// 7. Rubro
// 8. Cordobesa
const COLUMNS_TO_DELETE_TRANSACCIONES = [
  "comercio codigo",
  "codigo de comercio",
  "sucursal",
  "moneda",
  "condicion iva",
  "mensaje respuesta",
  "geolocalizacion",
  "rubro",
  "retencion iibb penalidad descripcion",
  "cordobesa",
  "es cordobesa",
  "tarjeta cordobesa",
  "estado",
];

/**
 * REGLA C DINÁMICA: Columnas que se eliminan ÚNICAMENTE si están 100% vacías en todas las filas.
 * Si al menos una sola fila contiene un dato o importe válido, la columna SE CONSERVA.
 */
const COLUMNS_TO_DELETE_IF_EMPTY = [
  "retencion ganancia",
  "retencion ganancias",
  "retencion iibb penalidad",
  "retencion ingresos brutos penalidad",
  "documento tarjeta habiente",
  "documento tarjetahabiente",
];

/**
 * Posibles nombres de encabezados que contienen CUIL o CUIT.
 */
const CUIL_COLUMN_NAMES = [
  "cuil", "cuit", "cuil/cuit", "cuil_cuit",
];

/**
 * Indicadores clave en cabeceras para clasificar automáticamente un reporte de Transacciones.
 */
const TRANSACTION_INDICATORS = [
  "comercio codigo",
  "codigo de comercio",
  "tipo venta",
  "marca tarjeta",
  "numero tarjeta",
  "num autorizacion",
  "modo entrada",
  "lector",
  "usuario app",
  "fecha liberacion",
];

/**
 * Columnas monetarias a sumarizar en la fila final de TOTALES.
 */
const TOTAL_SUM_COLUMNS = [
  "monto bruto",
  "comision sin iva",
  "iva de la comision",
  "cft sin iva",
  "iva del cft",
  "retencion iibb",
  "retencion iibb convenio",
  "retencion iibb penalidad",
  "retencion ganancia",
  "retencion ganancias",
  "monto neto",
];


/* =====================================================
   SECCION 3: ESTADO GLOBAL DE LA APLICACION
   ===================================================== */
let processedWorkbook   = null;
let processedReportMeta = null;
let downloadFileName    = "Reporte_Movimientos.xlsx";
let downloadPdfFileName = "Reporte_Movimientos.pdf";
let selectedReportMode  = "auto"; // "auto" | "movimientos" | "transacciones"
let selectedSistema    = "sirtac"; // "sirtac" (predeterminado) | "sircreb" | "sircupa"
let selectedIibbMethod = "auto"; // "auto" (predeterminado) | "manual"
let isBotOnline        = false;
let botCheckTimer      = null;

// URLs del servicio Bot API (Local, Túnel Ngrok dedicado en tu PC, y Nube Render de respaldo)
const RENDER_BOT_URL = "https://sircreb-bot.onrender.com";
const LOCAL_BOT_URL  = "http://127.0.0.1:3000";
const NGROK_BOT_URL  = window.NGROK_BOT_URL || "https://chive-candle-poem.ngrok-free.dev";
let BOT_API_BASE     = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? LOCAL_BOT_URL
  : (window.SIRCREB_BOT_URL || NGROK_BOT_URL || RENDER_BOT_URL);

// Base de datos de alícuotas centralizada en Google Sheets
const GOOGLE_SHEETS_ID     = window.GOOGLE_SHEETS_ID || "1_Scfvop57BcCcVaFbe_-ARYPvtrQzvU0bPtcwmLkj2E";
const GOOGLE_SHEETS_DB_URL = window.GOOGLE_SHEETS_DB_URL || "https://script.google.com/macros/s/AKfycbzNCH9FQlW-HPJ5W0Do91z1RBjrHvrPk-lUqpx50eCEIhFWUxH0lSWZyHQ7oixX4Wi5/exec";




/* =====================================================
   SECCION 4: REFERENCIAS AL DOM
   ===================================================== */
const processorCard       = document.getElementById("processorCard");
const dropzone            = document.getElementById("dropzone");
const fileInput           = document.getElementById("fileInput");
const stateIdle           = document.getElementById("stateIdle");
const stateLoading        = document.getElementById("stateLoading");
const stateSuccess        = document.getElementById("stateSuccess");
const stateError          = document.getElementById("stateError");
const headerBrand         = document.getElementById("headerBrand");
const saldoToggleCard     = document.getElementById("saldoToggleCard");
const saldoToggle         = document.getElementById("saldoToggle");
const saldoTxNotice       = document.getElementById("saldoTxNotice");
const iibbToggleCard      = document.getElementById("iibbToggleCard");
const iibbToggle          = document.getElementById("iibbToggle");
const iibbMovNotice       = document.getElementById("iibbMovNotice");
const alicuotaWrap        = document.getElementById("alicuotaWrap");
const btnIibbModeAuto     = document.getElementById("btnIibbModeAuto");
const btnIibbModeManual   = document.getElementById("btnIibbModeManual");
const iibbAutoPanel       = document.getElementById("iibbAutoPanel");
const iibbManualPanel     = document.getElementById("iibbManualPanel");
const alicuotaSelect      = document.getElementById("alicuotaSelect");
const botStatusPill       = document.getElementById("botStatusPill");
const botStatusDot        = document.getElementById("botStatusDot");
const botStatusLabel      = document.getElementById("botStatusLabel");
const botHint             = document.getElementById("botHint");
const sisBtnSirtac        = document.getElementById("sisBtnSirtac");
const sisBtnSircreb       = document.getElementById("sisBtnSircreb");
const sisBtnSircupa       = document.getElementById("sisBtnSircupa");
const downloadBtn         = document.getElementById("downloadBtn");
const downloadPdfBtn      = document.getElementById("downloadPdfBtn");
const resetBtn            = document.getElementById("resetBtn");
const errorResetBtn       = document.getElementById("errorResetBtn");
const errorMessage        = document.getElementById("errorMessage");
const successMeta         = document.getElementById("successMeta");
const loadingStatus       = document.getElementById("loadingStatus");
const loadingSteps        = [
  document.getElementById("step1"),
  document.getElementById("step2"),
  document.getElementById("step3"),
  document.getElementById("step4"),
];


/* =====================================================
   SECCION 5: CONTROL DE INTERFAZ Y ESTADOS VISUALES
   ===================================================== */

/**
 * Cambia la pantalla visible del procesador (idle, loading, success, error).
 */
function showState(stateName) {
  stateIdle.hidden    = (stateName !== "idle");
  stateLoading.hidden = (stateName !== "loading");
  stateSuccess.hidden = (stateName !== "success");
  stateError.hidden   = (stateName !== "error");
}

/**
 * Reinicia las clases de los pasos de la pantalla de carga.
 */
function resetSteps() {
  loadingSteps.forEach(s => s.classList.remove("active", "done"));
}

/**
 * Avanza el paso activo en la pantalla de carga con retardo visual.
 */
async function advanceStep(stepIndex, label, delayMs) {
  return new Promise(resolve => {
    if (stepIndex > 0) {
      loadingSteps[stepIndex - 1].classList.remove("active");
      loadingSteps[stepIndex - 1].classList.add("done");
    }
    loadingSteps[stepIndex].classList.add("active");
    loadingStatus.textContent = label;
    setTimeout(resolve, delayMs);
  });
}

/**
 * Configura los controles para detección 100% automática del tipo de reporte.
 */
function setReportMode(mode = "auto") {
  selectedReportMode = "auto";
  if (saldoToggleCard) saldoToggleCard.classList.remove("disabled");
  if (saldoTxNotice) saldoTxNotice.style.display = "none";
  if (saldoToggle) saldoToggle.disabled = false;

  if (iibbToggleCard) iibbToggleCard.classList.remove("disabled");
  if (iibbMovNotice) iibbMovNotice.style.display = "none";
  if (iibbToggle) iibbToggle.disabled = false;
  if (alicuotaWrap) alicuotaWrap.style.display = (iibbToggle && iibbToggle.checked) ? "flex" : "none";
}

/**
 * Reinicia la aplicación al estado inicial.
 */
function reset() {
  processedWorkbook = null;
  processedReportMeta = null;
  fileInput.value = "";
  successMeta.innerHTML = "";
  if (saldoToggle) saldoToggle.checked = false;
  if (iibbToggle) iibbToggle.checked = false;
  if (alicuotaWrap) alicuotaWrap.style.display = "none";
  if (alicuotaSelect) alicuotaSelect.value = "0.0350";
  setIibbMethod("auto");
  setSistema("sirtac");
  setReportMode("auto");
  showState("idle");
}

/**
 * Despierta el Bot y le pide precargar Chrome + la página de COMARB en segundo plano,
 * para que la consulta posterior no pague el arranque en frío. No bloquea al usuario.
 */
function warmBot() {
  fetch(`${BOT_API_BASE}/api/health?warm=1`, {
    method: "GET",
    headers: { "ngrok-skip-browser-warning": "true" },
  }).catch(() => {});
}

/**
 * Evita superponer chequeos de salud (se ejecutan cada 8 s).
 */
let healthCheckInFlight = null;
function checkBotHealth() {
  if (!healthCheckInFlight) {
    healthCheckInFlight = runBotHealthCheck().finally(() => { healthCheckInFlight = null; });
  }
  return healthCheckInFlight;
}

/**
 * Comprueba el estado de conexión con el Bot local o en la nube SIRTAC / SIRCREB / SIRCUPA.
 */
async function runBotHealthCheck() {
  const candidateUrls = [];
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    candidateUrls.push(LOCAL_BOT_URL);
  }
  // Prioridad 1: Bot dedicado en tu PC vía Ngrok
  if (NGROK_BOT_URL) {
    candidateUrls.push(NGROK_BOT_URL);
  }
  // Prioridad 2: Respaldo en la nube (Render) si tu PC está apagada
  candidateUrls.push(RENDER_BOT_URL);

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${url}/api/health`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === "online") {
          BOT_API_BASE = url;
          isBotOnline = true;
          const isDedicated = url.includes("ngrok") || url.includes("localhost") || url.includes("127.0.0.1");
          if (botStatusPill) {
            botStatusPill.classList.add("online");
            botStatusPill.classList.toggle("dedicated", isDedicated);
            botStatusPill.classList.toggle("cloud", !isDedicated);
          }
          let label = "Bot Conectado";
          if (url.includes("ngrok")) {
            label = "Bot Dedicado (Online ⚡)";
          } else if (url.includes("render")) {
            label = "Bot en la Nube (Online 🤖)";
          } else {
            label = "Bot Local (Online ⚡)";
          }
          if (botStatusLabel) botStatusLabel.textContent = label;
          if (botHint) botHint.style.display = "none";
          return true;
        }
      }
    } catch (e) {
      // Intentar con siguiente candidato
    }
  }

  isBotOnline = false;
  if (botStatusPill) botStatusPill.classList.remove("online");
  if (botStatusLabel) botStatusLabel.textContent = "Bot Desconectado (o iniciando)";
  if (botHint) botHint.style.display = "inline";
  return false;
}

/**
 * Alterna entre modo Automático y Manual para el cálculo de Retención IIBB.
 */
function setIibbMethod(method) {
  selectedIibbMethod = (method || "auto").toLowerCase();
  const isAuto = (selectedIibbMethod === "auto");

  if (btnIibbModeAuto) {
    btnIibbModeAuto.classList.toggle("active", isAuto);
    btnIibbModeAuto.setAttribute("aria-checked", isAuto ? "true" : "false");
  }
  if (btnIibbModeManual) {
    btnIibbModeManual.classList.toggle("active", !isAuto);
    btnIibbModeManual.setAttribute("aria-checked", !isAuto ? "true" : "false");
  }

  if (iibbAutoPanel)   iibbAutoPanel.style.display   = isAuto ? "flex" : "none";
  if (iibbManualPanel) iibbManualPanel.style.display = isAuto ? "none" : "flex";

  if (isAuto) {
    checkBotHealth();
  }
}

/**
 * Selecciona el sistema a consultar (sirtac, sircreb, sircupa).
 */
function setSistema(sistemaName) {
  selectedSistema = (sistemaName || "sirtac").toLowerCase();
  const buttons = [
    { el: sisBtnSirtac, name: "sirtac" },
    { el: sisBtnSircreb, name: "sircreb" },
    { el: sisBtnSircupa, name: "sircupa" },
  ];

  buttons.forEach(({ el, name }) => {
    if (!el) return;
    const isActive = (name === selectedSistema);
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-checked", isActive ? "true" : "false");
  });
}


/* =====================================================
   SECCION 6: LOGICA DE DETECCION Y TRANSFORMACION EXCEL
   ===================================================== */

/**
 * Inspecciona las cabeceras de la primera fila de la hoja para
 * determinar automáticamente si es Reporte de Transacciones o de Movimientos.
 */
function detectReportType(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return "movimientos";
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  let txMatchCount = 0;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const headerNorm = normalizeString(cell.v);
    if (TRANSACTION_INDICATORS.some(ind => headerNorm.includes(ind))) {
      txMatchCount++;
    }
  }

  return txMatchCount >= 2 ? "transacciones" : "movimientos";
}

/**
 * Extrae el CUIL o CUIT del archivo para nombrarlo dinámicamente.
 */
function extractCuilCuit(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return null;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  // Buscar columna CUIL/CUIT en la fila de encabezados
  let colIndex = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const headerNorm = normalizeString(cell.v);
    if (CUIL_COLUMN_NAMES.some(name => headerNorm === name || headerNorm.startsWith(name))) {
      colIndex = c;
      break;
    }
  }
  if (colIndex === -1) return null;

  // Retornar el primer valor no vacío de esa columna
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIndex });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const val = String(cell.v).trim();
    if (val && val !== "0") return val;
  }
  return null;
}

/**
 * REGLA A: Aplica las traducciones a la columna "Tipo".
 */
function applyTranslations(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return { worksheet, translationCount: 0 };
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;
  let tipoColIndex = -1;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (cell && normalizeString(cell.v) === "tipo") {
      tipoColIndex = c;
      break;
    }
  }

  if (tipoColIndex === -1) {
    console.warn("[ReportePro] No se encontro la columna 'Tipo'. Omitiendo Regla A.");
    return { worksheet, translationCount: 0 };
  }

  const normTranslations = {};
  for (const [k, v] of Object.entries(TYPE_TRANSLATIONS)) {
    normTranslations[normalizeString(k)] = v;
  }

  let count = 0;
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: tipoColIndex });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const originalNorm = normalizeString(cell.v);
    const trans = normTranslations[originalNorm];
    if (trans) {
      cell.v = trans;
      cell.w = trans;
      count++;
    }
  }

  return { worksheet, translationCount: count };
}

/**
 * REGLA B: Renombra las cabeceras de columnas según el diccionario.
 */
function applyColumnRenames(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return { worksheet, renameCount: 0 };
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;
  let count = 0;

  // Normalizar diccionario de renombres para tolerar mayúsculas, guiones bajos, espacios y acentos
  const normRenames = {};
  for (const [k, v] of Object.entries(COLUMN_RENAMES)) {
    normRenames[normalizeString(k)] = v;
  }

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const headerNorm = normalizeString(cell.v);
    const compactHeader = headerNorm.replace(/\s+/g, "");

    // Coincidencia directa o compacta (sin espacios)
    let newName = normRenames[headerNorm];
    if (!newName) {
      for (const [k, v] of Object.entries(normRenames)) {
        if (k.replace(/\s+/g, "") === compactHeader) {
          newName = v;
          break;
        }
      }
    }

    if (newName) {
      cell.v = newName;
      cell.w = newName;
      count++;
    } else if (typeof cell.v === "string" && cell.v.includes("_")) {
      const cleanedHeader = cell.v.replace(/_/g, " ").replace(/\s+/g, " ").trim();
      cell.v = cleanedHeader;
      cell.w = cleanedHeader;
    }
  }

  return { worksheet, renameCount: count };
}

/**
 * REGLA C: Elimina columnas completas según el tipo de reporte.
 * Desplaza las celdas hacia la izquierda y ajusta anchos y rangos.
 */
function deleteColumns(worksheet, reportType = "movimientos") {
  if (!worksheet || !worksheet["!ref"]) return { worksheet, deletedCount: 0 };
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  const targetList = (reportType === "transacciones")
    ? COLUMNS_TO_DELETE_TRANSACCIONES
    : COLUMNS_TO_DELETE_MOVIMIENTOS;

  const colsToDelete = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const headerNorm = normalizeString(cell.v);
    const compactHeader = headerNorm.replace(/\s+/g, "");

    // 1. Verificación de eliminación obligatoria según tipo de reporte
    const isStaticDelete = targetList.some(target => {
      const norm = normalizeString(target);
      return headerNorm === norm || compactHeader === norm.replace(/\s+/g, "");
    });

    if (isStaticDelete) {
      colsToDelete.push(c);
      continue;
    }

    // 2. Verificación de eliminación condicional (solo si todas las celdas de la columna están vacías)
    const isConditionalCandidate = COLUMNS_TO_DELETE_IF_EMPTY.some(target => {
      const norm = normalizeString(target);
      return headerNorm === norm || compactHeader === norm.replace(/\s+/g, "");
    });

    if (isConditionalCandidate) {
      let hasAnyData = false;
      for (let r = headerRow + 1; r <= range.e.r; r++) {
        const dataAddr = XLSX.utils.encode_cell({ r, c });
        const dataCell = worksheet[dataAddr];
        if (!isCellEmpty(dataCell)) {
          hasAnyData = true;
          break;
        }
      }
      // Si ninguna celda tiene datos, se elimina la columna
      if (!hasAnyData) {
        colsToDelete.push(c);
      }
    }
  }

  if (colsToDelete.length === 0) return { worksheet, deletedCount: 0 };

  colsToDelete.sort((a, b) => b - a);
  let currentEnd = range.e.c;

  for (const delCol of colsToDelete) {
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = delCol; c < currentEnd; c++) {
        const fromAddr = XLSX.utils.encode_cell({ r, c: c + 1 });
        const toAddr   = XLSX.utils.encode_cell({ r, c });
        if (worksheet[fromAddr] !== undefined) {
          worksheet[toAddr] = worksheet[fromAddr];
        } else {
          delete worksheet[toAddr];
        }
      }
      delete worksheet[XLSX.utils.encode_cell({ r, c: currentEnd })];
    }

    if (worksheet["!cols"] && worksheet["!cols"].length > delCol) {
      worksheet["!cols"].splice(delCol, 1);
    }

    if (worksheet["!merges"]) {
      worksheet["!merges"] = worksheet["!merges"]
        .filter(m => m.s.c !== delCol && m.e.c !== delCol)
        .map(m => ({
          s: { r: m.s.r, c: m.s.c > delCol ? m.s.c - 1 : m.s.c },
          e: { r: m.e.r, c: m.e.c > delCol ? m.e.c - 1 : m.e.c },
        }));
    }

    currentEnd--;
  }

  range.e.c = currentEnd;
  worksheet["!ref"] = XLSX.utils.encode_range(range);

  return { worksheet, deletedCount: colsToDelete.length };
}

/**
 * Autoajusta los anchos de columna al tamaño real del contenido.
 */
function autoFitColumns(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const MIN_WIDTH = 10;
  const MAX_WIDTH = 42;
  const PADDING   = 2;

  const colWidths = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = MIN_WIDTH;

    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined || cell.v === null || cell.v === "") continue;

      let displayText = "";
      if (typeof XLSX.utils.format_cell === "function") {
        try {
          displayText = XLSX.utils.format_cell(cell);
        } catch (e) {
          displayText = String(cell.w || cell.v);
        }
      } else {
        displayText = String(cell.w || cell.v);
      }

      const lines = displayText.split(/\r?\n/);
      for (const line of lines) {
        const len = line.trim().length + PADDING;
        if (len > maxLen) maxLen = len;
      }
    }

    colWidths.push({ wch: Math.min(Math.ceil(maxLen), MAX_WIDTH) });
  }

  worksheet["!cols"] = colWidths;
}

/**
 * Corrige los formatos numéricos y de fecha de las celdas:
 * - Fechas -> dd/mm/yyyy hh:mm:ss
 * - Monedas/Montos -> $#,##0.00
 * - Documentos/DNI -> Número entero (cell.t = "n", z = "0")
 */
function fixCellFormats(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  const dateCols = [];
  const moneyCols = [];
  const integerCols = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const h = worksheet[addr];
    if (!h || h.v === undefined) continue;
    const name = normalizeString(h.v);

    if (name.includes("fecha")) {
      dateCols.push(c);
    } else if (
      name.includes("monto") ||
      name.includes("neto") ||
      name.includes("bruto") ||
      name.includes("comision") ||
      name.includes("iva") ||
      name.includes("cft") ||
      name.includes("arancel") ||
      name.includes("costo") ||
      name.includes("retencion")
    ) {
      if (!name.includes("condicion") && !name.includes("descripcion")) {
        moneyCols.push(c);
      }
    } else if (
      name.includes("documento") ||
      name.includes("tarjeta habiente") ||
      name.includes("tarjetahabiente") ||
      name.includes("dni") ||
      name === "cuotas" ||
      name === "cuota" ||
      name.includes("cuota")
    ) {
      integerCols.push(c);
    }
  }

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Formatear columnas de fecha
    for (const c of dateCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined || cell.v === "") continue;

      delete cell.w;
      cell.z = "dd/mm/yyyy hh:mm:ss";
    }

    // Formatear columnas de dinero
    for (const c of moneyCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined || cell.v === "") continue;

      if (typeof cell.v === "string") {
        const cleaned = cell.v.replace(/[$\s]/g, "").replace(",", ".");
        const num = parseFloat(cleaned);
        if (!isNaN(num)) {
          cell.v = num;
          cell.t = "n";
        }
      }

      delete cell.w;
      cell.z = "$#,##0.00";
    }

    // Formatear columnas de documento / cuotas / enteros (Número entero sin decimales)
    for (const c of integerCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined || cell.v === null || cell.v === "" || cell.v === " ") continue;

      if (typeof cell.v === "string") {
        const cleaned = cell.v.trim().replace(/[.\s]/g, "");
        if (/^\d+$/.test(cleaned)) {
          const num = parseInt(cleaned, 10);
          if (!isNaN(num)) {
            cell.v = num;
            cell.t = "n";
          }
        }
      } else if (typeof cell.v === "number") {
        cell.t = "n";
      } else if (cell.v instanceof Date) {
        // En caso de que SheetJS lo haya interpretado como Date debido al formato de fecha del archivo original
        const utcMs = cell.v.getTime();
        const serial = Math.round((utcMs / 86400000) + 25569);
        cell.v = serial;
        cell.t = "n";
      }

      if (cell.t === "n") {
        delete cell.w;
        cell.z = "0"; // Formato numérico entero nativo en Excel ("Número" con 0 decimales)
      }
    }
  }
}

/**
 * Parsea un valor de fecha a timestamp numérico para ordenamiento.
 */
function parseDateValue(v) {
  if (v === undefined || v === null || v === "") return Infinity;
  if (typeof v === "number") return isNaN(v) ? Infinity : v;
  if (v instanceof Date) return isNaN(v.getTime()) ? Infinity : v.getTime();
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return Infinity;
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmy) {
      let yr = parseInt(dmy[3], 10);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10), parseInt(dmy[4] || 0, 10), parseInt(dmy[5] || 0, 10), parseInt(dmy[6] || 0, 10));
      return isNaN(d.getTime()) ? Infinity : d.getTime();
    }
    const ymd = s.match(/^(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymd) {
      let yr = parseInt(ymd[1], 10);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10), parseInt(ymd[4] || 0, 10), parseInt(ymd[5] || 0, 10), parseInt(ymd[6] || 0, 10));
      return isNaN(d.getTime()) ? Infinity : d.getTime();
    }
    const t = Date.parse(s);
    if (!isNaN(t)) return t;
  }
  return Infinity;
}

/**
 * Ordena las filas del reporte cronológicamente por la columna "Fecha".
 */
function sortRowsByDate(worksheet, ascending = true) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  // Priorizar coincidencia exacta de "fecha"
  let fechaCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell && cell.v !== undefined) {
      const name = normalizeString(cell.v);
      if (name === "fecha") {
        fechaCol = c;
        break;
      }
    }
  }
  if (fechaCol === -1) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (cell && cell.v !== undefined) {
        const name = normalizeString(cell.v);
        if (name.includes("fecha")) {
          fechaCol = c;
          break;
        }
      }
    }
  }

  if (fechaCol === -1) return;

  const rowData = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const cells = {};
    let hasAnyData = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (worksheet[addr] !== undefined) {
        cells[c] = worksheet[addr];
        hasAnyData = true;
      }
    }
    if (hasAnyData) {
      const dateCell = cells[fechaCol];
      const parsedDate = parseDateValue(dateCell ? dateCell.v : undefined);
      rowData.push({ originalRow: r, cells, parsedDate });
    }
  }

  rowData.sort((a, b) => {
    if (a.parsedDate === b.parsedDate) return a.originalRow - b.originalRow;
    return ascending ? (a.parsedDate - b.parsedDate) : (b.parsedDate - a.parsedDate);
  });

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete worksheet[XLSX.utils.encode_cell({ r, c })];
    }
  }

  for (let i = 0; i < rowData.length; i++) {
    const targetR = headerRow + 1 + i;
    const row = rowData[i];
    for (const [colStr, cell] of Object.entries(row.cells)) {
      worksheet[XLSX.utils.encode_cell({ r: targetR, c: parseInt(colStr, 10) })] = cell;
    }
  }

  range.e.r = headerRow + rowData.length;
  worksheet["!ref"] = XLSX.utils.encode_range(range);
}

/**
 * Calcula y agrega la columna "Saldo" al final de la tabla (solo en Movimientos).
 */
function appendSaldoColumn(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  // Encontrar columna "Monto Neto"
  let netoCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (cell && cell.v !== undefined) {
      const name = normalizeString(cell.v);
      if (name === "monto neto" || (name.includes("neto") && !name.includes("bruto"))) {
        netoCol = c;
        break;
      }
    }
  }

  if (netoCol === -1) {
    console.warn("[ReportePro] No se encontro la columna 'Monto Neto' para calcular Saldo.");
    return;
  }

  const saldoCol = range.e.c + 1;
  const headerAddr = XLSX.utils.encode_cell({ r: headerRow, c: saldoCol });
  worksheet[headerAddr] = {
    t: "s",
    v: "Saldo",
    w: "Saldo",
  };

  let saldoAcumulado = 0;
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const addrNeto = XLSX.utils.encode_cell({ r, c: netoCol });
    const cellNeto = worksheet[addrNeto];

    let montoNeto = 0;
    if (cellNeto && cellNeto.v !== undefined && cellNeto.v !== null) {
      if (typeof cellNeto.v === "number") {
        montoNeto = isNaN(cellNeto.v) ? 0 : cellNeto.v;
      } else if (typeof cellNeto.v === "string") {
        const cleaned = cellNeto.v.replace(/[$\s]/g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) montoNeto = parsed;
      }
    }

    saldoAcumulado = Math.round((saldoAcumulado + montoNeto) * 100) / 100;

    const addrSaldo = XLSX.utils.encode_cell({ r, c: saldoCol });
    worksheet[addrSaldo] = {
      t: "n",
      v: saldoAcumulado,
      z: "$#,##0.00",
    };
  }

  range.e.c = saldoCol;
  worksheet["!ref"] = XLSX.utils.encode_range(range);
}

/**
 * Convierte un número serial de fecha de Excel a un objeto Date en hora local.
 * Considera el desfase de 1899-12-30 y el año bisiesto ficticio de 1900 en Excel.
 */
function excelSerialToLocalDate(serial) {
  const wholeDays = Math.floor(serial);
  const frac = serial - wholeDays;
  const utcMs = (wholeDays - 25569) * 86400 * 1000;
  const temp = new Date(utcMs);
  const yr = temp.getUTCFullYear();
  const mo = temp.getUTCMonth();
  const da = temp.getUTCDate();
  const totalSeconds = Math.round(frac * 86400);
  const hr = Math.floor(totalSeconds / 3600);
  const mi = Math.floor((totalSeconds % 3600) / 60);
  const se = totalSeconds % 60;
  return new Date(yr, mo, da, hr, mi, se);
}

/**
 * Parsea el valor de una celda a Date para comparaciones de fecha de acreditación.
 */
function parseAccreditationDate(v) {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" || (!isNaN(v) && !isNaN(parseFloat(v)) && /^\d+(\.\d+)?$/.test(String(v).trim()))) {
    const num = typeof v === "number" ? v : parseFloat(v);
    if (num > 10000) {
      return excelSerialToLocalDate(num);
    }
  }
  if (typeof v === "string") {
    const s = v.trim();
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmy) {
      let yr = parseInt(dmy[3], 10);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10), parseInt(dmy[4] || 0, 10), parseInt(dmy[5] || 0, 10), parseInt(dmy[6] || 0, 10));
      return isNaN(d.getTime()) ? null : d;
    }
    const ymd = s.match(/^(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymd) {
      let yr = parseInt(ymd[1], 10);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10), parseInt(ymd[4] || 0, 10), parseInt(ymd[5] || 0, 10), parseInt(ymd[6] || 0, 10));
      return isNaN(d.getTime()) ? null : d;
    }
    const t = Date.parse(s);
    if (!isNaN(t)) return new Date(t);
  }
  return null;
}

/**
 * Calcula la Retención IIBB Convenio sobre Monto Bruto para transacciones acreditadas (Fecha Liberación <= hoy)
 * y descuenta dicho importe de la columna Monto Neto.
 * Para ventas con acreditación futura (o pendientes no vencidas), la celda queda vacía y no descuenta.
 */
/**
 * Extrae los períodos únicos (año y mes) de ventas acreditadas en el archivo.
 */
function extractUniqueAccreditationPeriods(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return [];
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  // Buscar columna de Fecha de Liberación / Acreditación
  let dateCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const name = normalizeString(cell.v);
    if (name.includes("fecha") && (name.includes("liberacion") || name.includes("acreditacion"))) {
      dateCol = c;
      break;
    }
  }

  if (dateCol === -1) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined) continue;
      const name = normalizeString(cell.v);
      if (name.includes("fecha")) {
        dateCol = c;
        break;
      }
    }
  }

  if (dateCol === -1) return [];

  const now = new Date();
  const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const periodsMap = new Map();

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: dateCol });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const parsedD = parseAccreditationDate(cell.v);
    if (parsedD && parsedD.getTime() <= todayCutoff.getTime()) {
      const anio = parsedD.getFullYear();
      const mes  = parsedD.getMonth() + 1;
      const key  = `${anio}-${String(mes).padStart(2, '0')}`;
      if (!periodsMap.has(key)) {
        periodsMap.set(key, { anio, mes, key });
      }
    }
  }

  return Array.from(periodsMap.values());
}

const BOT_REQUEST_TIMEOUT_MS = 90000;           // Cubre arranque de Chrome + varios períodos
const BOT_RETRYABLE_STATUS   = [502, 503, 504]; // Render devuelve estos códigos mientras despierta o redeploya

/**
 * Consulta la API local o en la nube del Bot para obtener las alícuotas mensuales del CUIT.
 * Intenta primero con BOT_API_BASE (dedicado en tu PC si está activo) y como respaldo automático
 * con Render si la PC está apagada.
 */
async function fetchBotAlicuotas(sistema, cuit, periods) {
  const periodKeys = periods.map(p => p.key).join(",");
  const endpointsToTry = [BOT_API_BASE];
  if (BOT_API_BASE !== RENDER_BOT_URL) {
    endpointsToTry.push(RENDER_BOT_URL);
  }

  let lastError = null;
  for (const baseUrl of endpointsToTry) {
    const isDedicatedHost = baseUrl.includes("ngrok") || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
    const defaultSourceTag = isDedicatedHost ? "bot_local" : "bot_cloud";
    const url = `${baseUrl}/api/alicuotas?sistema=${encodeURIComponent(sistema)}&cuit=${encodeURIComponent(cuit)}&periodos=${encodeURIComponent(periodKeys)}`;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BOT_REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          headers: { "ngrok-skip-browser-warning": "true" },
          signal: controller.signal,
        });
        if (!res.ok) {
          if (BOT_RETRYABLE_STATUS.includes(res.status) && attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Error HTTP ${res.status}`);
        }
        const data = await res.json();
        data._botSource = data.source || defaultSourceTag;
        return data;
      } catch (err) {
        lastError = err;
        if (err.name === "AbortError") {
          break;
        }
        if (err instanceof TypeError && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError || new Error(`No se pudo consultar el Bot.`);
}

const MESES_MAP = {
  "enero": "01", "ene": "01",
  "febrero": "02", "feb": "02",
  "marzo": "03", "mar": "03",
  "abril": "04", "abr": "04",
  "mayo": "05", "may": "05",
  "junio": "06", "jun": "06",
  "julio": "07", "jul": "07",
  "agosto": "08", "ago": "08",
  "septiembre": "09", "setiembre": "09", "sep": "09", "set": "09",
  "octubre": "10", "oct": "10",
  "noviembre": "11", "nov": "11",
  "diciembre": "12", "dic": "12"
};

function normalizePeriodoKey(val) {
  if (!val) return "";
  const str = String(val).trim();

  // Si viene como Date(2026,7,1) desde Google Visualization
  const matchDate = str.match(/Date\((\d{4}),\s*(\d+),\s*(\d+)\)/);
  if (matchDate) {
    const y = matchDate[1];
    const m = String(parseInt(matchDate[2], 10) + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  // Si viene como YYYY-MM o YYYY/MM
  const matchIso = str.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (matchIso) return `${matchIso[1]}-${matchIso[2].padStart(2, "0")}`;

  // Si viene como MM/YYYY o MM-YYYY
  const matchInv = str.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (matchInv) return `${matchInv[2]}-${matchInv[1].padStart(2, "0")}`;

  // Si viene como texto en español "agosto 2026"
  const lower = str.toLowerCase();
  for (const [nombre, num] of Object.entries(MESES_MAP)) {
    if (lower.includes(nombre)) {
      const ym = lower.match(/\b(20\d\d)\b/);
      if (ym) return `${ym[1]}-${num}`;
    }
  }

  return str;
}

/**
 * Consulta la base de datos de Google Sheets para un CUIT, sistema y lista de períodos.
 * Utiliza Google Visualization Query API (SQL de Google) para consultar 300.000+ filas en ~1 segundo.
 */
async function fetchSheetsAlicuotas(sistema, cuit, periods) {
  if (!GOOGLE_SHEETS_ID && !GOOGLE_SHEETS_DB_URL) return null;
  const digits = String(cuit).replace(/\D/g, "");
  const sisNorm = (sistema || "sirtac").toLowerCase().trim();
  const periodKeysRequested = periods ? periods.map(p => p.key) : [];
  let gvizAnswered = false; // true si GViz respondió correctamente (aunque sin filas para el CUIT)

  // 1. Intento ultra-rápido con Google Visualization API (Directo sobre las 300.000 filas)
  if (GOOGLE_SHEETS_ID) {
    try {
      const querySql = `SELECT A, B, C, D, E, F WHERE A = ${digits} OR A = '${digits}' OR A = '${cuit}'`;
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(querySql)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(gvizUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
        if (match) {
          const gvizData = JSON.parse(match[1]);
          if (gvizData.status === "ok") gvizAnswered = true;
          if (gvizData.status === "ok" && gvizData.table && gvizData.table.rows && gvizData.table.rows.length > 0) {
            const periodosFound = {};
            let razonSocialFound = null;

            for (const r of gvizData.table.rows) {
              if (!r.c) continue;
              const rowRazon = r.c[1] ? String(r.c[1].v || "").trim() : "";
              const rawMes = r.c[2] ? (r.c[2].f || r.c[2].v) : "";
              const pKey = normalizePeriodoKey(rawMes);
              const rowLetra = r.c[3] ? String(r.c[3].v || "A").trim() : "A";
              const rawAli = r.c[4] ? (r.c[4].v !== undefined ? r.c[4].v : r.c[4].f) : 0;
              const rowSis = r.c[5] ? String(r.c[5].v || "sirtac").toLowerCase().trim() : "sirtac";

              // Filtrar por sistema si coincide
              if (rowSis === sisNorm) {
                if (rowRazon && !razonSocialFound) razonSocialFound = rowRazon;

                let numVal = 0;
                if (rawAli !== undefined && rawAli !== null && rawAli !== "") {
                  const parsed = parseFloat(String(rawAli).replace("%", "").replace(",", "."));
                  if (!isNaN(parsed)) numVal = parsed;
                }

                if (periodKeysRequested.length === 0 || periodKeysRequested.includes(pKey)) {
                  periodosFound[pKey] = {
                    status: numVal === 0 ? "not_included" : "ok",
                    alicuota: numVal,
                    rate: Math.round((numVal / 100) * 10000) / 10000,
                    letra: rowLetra,
                    razonSocial: rowRazon,
                    origen: "google_sheets"
                  };
                }
              }
            }

            if (Object.keys(periodosFound).length > 0) {
              return {
                success: true,
                cuit,
                sistema: sisNorm,
                razonSocial: razonSocialFound,
                periodos: periodosFound
              };
            }
          }
        }
      }
    } catch (gvizErr) {
      console.warn("[Sheets DB] Falló consulta directa GViz, intentando respaldo Apps Script:", gvizErr);
    }
  }

  // Si GViz respondió bien pero no tenía los datos, Apps Script (que lee la misma hoja) tampoco los tendrá:
  // se evita esperar hasta 20 s en vano y se pasa directo al Bot.
  if (gvizAnswered) return null;

  // 2. Respaldo secundario con Apps Script (solo si GViz falló)
  if (GOOGLE_SHEETS_DB_URL) {
    const periodKeys = periods ? periods.map(p => p.key).join(",") : "";
    const url = `${GOOGLE_SHEETS_DB_URL}?cuit=${encodeURIComponent(cuit)}&sistema=${encodeURIComponent(sistema)}&periodos=${encodeURIComponent(periodKeys)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.periodos && Object.keys(data.periodos).length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn("[Sheets DB] Error o timeout en respaldo Apps Script:", e);
    }
  }

  return null;
}

/**
 * Guarda en segundo plano nuevos registros obtenidos del Bot en Google Sheets (sin demorar al usuario).
 */
function saveToSheetsBackground(sistema, cuit, botPeriodos, razonSocial) {
  if (!GOOGLE_SHEETS_DB_URL || !botPeriodos) return;
  const registros = [];
  for (const [periodKey, pData] of Object.entries(botPeriodos)) {
    if (!pData || pData.status === "error") continue;
    registros.push({
      cuit: cuit,
      razonSocial: pData.razonSocial || razonSocial || "",
      periodo: periodKey,
      periodoText: periodKey,
      letra: pData.letra || "A",
      alicuota: (pData.alicuota !== undefined && pData.alicuota !== null) ? pData.alicuota : 0,
      sistema: sistema
    });
  }

  if (registros.length === 0) return;

  fetch(GOOGLE_SHEETS_DB_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ registros })
  }).then(() => {
    console.log(`[Sheets DB] ${registros.length} registro(s) sincronizado(s) con Google Sheets.`);
  }).catch(err => {
    console.warn("[Sheets DB] No se pudo guardar en segundo plano:", err);
  });
}

/**
 * Calcula la Retención IIBB Convenio sobre Monto Bruto para transacciones acreditadas (Fecha Liberación <= hoy)
 * y descuenta dicho importe de la columna Monto Neto.
 * Soporta alícuotas dinámicas mensuales provistas por el Bot SIRTAC/SIRCREB/SIRCUPA
 * con respaldo automático a la alícuota manual si ocurre algún error en períodos puntuales.
 */
function calculateRetencionIIBB(worksheet, alicuotasMap, manualRate = 0.0350, method = "auto", sistema = "sirtac") {
  if (!worksheet || !worksheet["!ref"]) {
    return { calculatedCount: 0, pendingCount: 0, periodStats: {}, warnings: [] };
  }
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  // 1. Identificar columnas clave
  let brutoCol = -1;
  let iibbCol  = -1;
  let netoCol  = -1;
  let dateCol  = -1;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const name = normalizeString(cell.v);

    if (brutoCol === -1 && (name === "monto bruto" || (name.includes("monto") && name.includes("bruto")))) {
      brutoCol = c;
    }
    if (iibbCol === -1 && (
      name === "retencion iibb" ||
      name === "retencion iibb convenio" ||
      (name.includes("retencion") && name.includes("iibb") && !name.includes("penalidad") && !name.includes("descripcion"))
    )) {
      iibbCol = c;
    }
    if (netoCol === -1 && (name === "monto neto" || (name.includes("neto") && !name.includes("bruto")))) {
      netoCol = c;
    }
    if (dateCol === -1 && (
      name === "fecha liberacion" ||
      name === "fecha de liberacion" ||
      (name.includes("fecha") && name.includes("liberacion"))
    )) {
      dateCol = c;
    }
  }

  // Búsqueda flexible de columna fecha liberación / acreditación
  if (dateCol === -1) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined) continue;
      const name = normalizeString(cell.v);
      if ((name.includes("fecha") || name.includes("plazo")) && (name.includes("liberacion") || name.includes("acreditacion"))) {
        dateCol = c;
        break;
      }
    }
  }

  // Si no se encontró columna de Retención IIBB, crearla al final
  if (iibbCol === -1) {
    iibbCol = range.e.c + 1;
    range.e.c = iibbCol;
    const headerAddr = XLSX.utils.encode_cell({ r: headerRow, c: iibbCol });
    worksheet[headerAddr] = { t: "s", v: "Retencion IIBB", w: "Retencion IIBB" };
    worksheet["!ref"] = XLSX.utils.encode_range(range);
  }

  if (brutoCol === -1 || netoCol === -1) {
    console.warn("[ReportePro] No se encontraron columnas de Monto Bruto o Monto Neto para calcular Retención IIBB.");
    return { calculatedCount: 0, pendingCount: 0, periodStats: {}, warnings: [] };
  }

  const now = new Date();
  const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let calculatedCount = 0;
  let pendingCount    = 0;
  const periodStats   = {}; // periodKey -> { count, rate, alicuota, status, letra, error }
  const warnings      = [];

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const brutoAddr = XLSX.utils.encode_cell({ r, c: brutoCol });
    const netoAddr  = XLSX.utils.encode_cell({ r, c: netoCol });
    const iibbAddr  = XLSX.utils.encode_cell({ r, c: iibbCol });

    const brutoCell = worksheet[brutoAddr];
    const netoCell  = worksheet[netoAddr];
    const iibbCell  = worksheet[iibbAddr];

    // Obtener Monto Bruto
    let montoBruto = 0;
    if (brutoCell && brutoCell.v !== undefined && brutoCell.v !== null) {
      if (typeof brutoCell.v === "number") {
        montoBruto = isNaN(brutoCell.v) ? 0 : brutoCell.v;
      } else {
        const cleaned = String(brutoCell.v).replace(/[$\s]/g, "").replace(",", ".");
        const p = parseFloat(cleaned);
        if (!isNaN(p)) montoBruto = p;
      }
    }

    // Obtener Monto Neto actual
    let montoNeto = 0;
    if (netoCell && netoCell.v !== undefined && netoCell.v !== null) {
      if (typeof netoCell.v === "number") {
        montoNeto = isNaN(netoCell.v) ? 0 : netoCell.v;
      } else {
        const cleaned = String(netoCell.v).replace(/[$\s]/g, "").replace(",", ".");
        const p = parseFloat(cleaned);
        if (!isNaN(p)) montoNeto = p;
      }
    }

    // Obtener retención previa si ya existía
    let prevRetencion = 0;
    if (iibbCell && iibbCell.v !== undefined && iibbCell.v !== null && iibbCell.v !== "") {
      if (typeof iibbCell.v === "number") {
        prevRetencion = isNaN(iibbCell.v) ? 0 : iibbCell.v;
      } else {
        const cleaned = String(iibbCell.v).replace(/[$\s]/g, "").replace(",", ".");
        const p = parseFloat(cleaned);
        if (!isNaN(p)) prevRetencion = p;
      }
    }

    // Verificar fecha de acreditación (Fecha Liberación <= hoy)
    let isAcreditada = true;
    let parsedD = null;
    if (dateCol !== -1) {
      const dateAddr = XLSX.utils.encode_cell({ r, c: dateCol });
      const dateCell = worksheet[dateAddr];
      parsedD = dateCell ? parseAccreditationDate(dateCell.v) : null;
      if (parsedD) {
        isAcreditada = (parsedD.getTime() <= todayCutoff.getTime());
      } else {
        isAcreditada = false;
      }
    }

    if (isAcreditada) {
      // Determinar la alícuota aplicable para este registro
      let rateToApply = 0.0;
      let alicPct = 0.0;
      let periodKey = parsedD ? `${parsedD.getFullYear()}-${String(parsedD.getMonth() + 1).padStart(2, '0')}` : "general";
      let statusToRecord = "manual";
      let letraToRecord = null;
      let errorDetail = null;
      let origenToRecord = null;

      if (method === "manual") {
        rateToApply = manualRate;
        alicPct = manualRate * 100;
        statusToRecord = "manual";
      } else {
        // Modo Automático (sin alícuota de respaldo: si hay error o no retiene, es 0%)
        if (alicuotasMap && alicuotasMap[periodKey] !== undefined) {
          const pData = alicuotasMap[periodKey];
          if (typeof pData === "number") {
            rateToApply = pData;
            alicPct = pData * 100;
            statusToRecord = "ok";
          } else if (typeof pData === "object" && pData !== null) {
            origenToRecord = pData.origen || null;
            if (pData.status === "ok") {
              rateToApply = pData.rate;
              alicPct = pData.alicuota;
              statusToRecord = "ok";
              letraToRecord = pData.letra;
            } else if (pData.status === "not_included") {
              rateToApply = 0.0;
              alicPct = 0.0;
              statusToRecord = "not_included";
              letraToRecord = "A";
            } else if (pData.status === "error") {
              rateToApply = 0.0;
              alicPct = 0.0;
              statusToRecord = "error";
              errorDetail = pData.error;
              if (!warnings.some(w => w.periodKey === periodKey)) {
                warnings.push({ periodKey, error: pData.error || "No se encontró información en el padrón" });
              }
            }
          }
        } else {
          // Período no encontrado o consulta fallida
          rateToApply = 0.0;
          alicPct = 0.0;
          statusToRecord = "error";
          errorDetail = "No se obtuvo alícuota del padrón";
          if (!warnings.some(w => w.periodKey === periodKey)) {
            warnings.push({ periodKey, error: "No se pudo consultar el padrón para este período" });
          }
        }
      }

      // Registrar estadísticas por período
      if (!periodStats[periodKey]) {
        periodStats[periodKey] = {
          count: 0,
          rate: rateToApply,
          alicuota: alicPct,
          status: statusToRecord,
          letra: letraToRecord,
          error: errorDetail,
          origen: origenToRecord,
        };
      }
      periodStats[periodKey].count++;

      const retencion = Math.round(montoBruto * rateToApply * 100) / 100;
      const nuevoNeto = Math.round((montoNeto + prevRetencion - retencion) * 100) / 100;

      worksheet[iibbAddr] = {
        t: "n",
        v: retencion,
        z: "$#,##0.00",
      };

      worksheet[netoAddr] = {
        t: "n",
        v: nuevoNeto,
        z: "$#,##0.00",
      };

      calculatedCount++;
    } else {
      // Venta pendiente de acreditación o futura: no se descuenta
      const nuevoNeto = Math.round((montoNeto + prevRetencion) * 100) / 100;
      worksheet[netoAddr] = {
        t: "n",
        v: nuevoNeto,
        z: "$#,##0.00",
      };

      worksheet[iibbAddr] = {
        t: "s",
        v: "",
      };

      pendingCount++;
    }
  }

  return { calculatedCount, pendingCount, periodStats, warnings };
}

/**
 * Aplica fondo #D00070 con tipografía blanca y negrita a la primera fila de encabezado.
 */
function applyHeaderStyle(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    let cell = worksheet[addr];
    if (!cell) {
      cell = { t: "s", v: "" };
      worksheet[addr] = cell;
    }

    cell.s = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: "D00070" },
      },
      font: {
        name: "Calibri",
        sz: 11,
        bold: true,
        color: { rgb: "FFFFFF" },
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
      },
    };
  }
}

/**
 * Aplica estilos visuales de filas y columnas:
 * - Zebra striping: Filas intercaladas en Blanco (#FFFFFF) y Gris claro (#F2F2F2)
 * - Columna "Monto Neto" destacada en rosa suave (#E8CAD0)
 */
function applyRowAndColumnStyles(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  // Encontrar columna "Monto Neto" / "Monto_Neto"
  let netoCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (cell && cell.v !== undefined) {
      const name = normalizeString(cell.v);
      if (name === "monto neto" || (name.includes("neto") && !name.includes("bruto"))) {
        netoCol = c;
        break;
      }
    }
  }

  const COLOR_WHITE = "FFFFFF";
  const COLOR_LIGHT_GRAY = "F2F2F2";
  const COLOR_MONTO_NETO = "E8CAD0";

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const isEvenRow = (r - (headerRow + 1)) % 2 === 0;
    const rowColor = isEvenRow ? COLOR_WHITE : COLOR_LIGHT_GRAY;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      let cell = worksheet[addr];

      if (!cell || cell.v === undefined || cell.v === null || cell.v === "") {
        cell = { t: "s", v: " " };
        worksheet[addr] = cell;
      }

      const bgColor = (c === netoCol) ? COLOR_MONTO_NETO : rowColor;
      const prevAlign = cell.s && cell.s.alignment ? cell.s.alignment : undefined;

      cell.s = {
        fill: {
          patternType: "solid",
          fgColor: { rgb: bgColor },
        },
        font: {
          name: "Calibri",
          sz: 11,
          color: { rgb: "111111" },
        },
      };

      if (prevAlign) {
        cell.s.alignment = prevAlign;
      }
    }
  }
}

/**
 * Elimina filas de filtros o totales al pie del reporte que no corresponden a datos.
 */
function cleanFooterRows(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const rowsToDelete = new Set();

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const val = String(cell.v).trim().toLowerCase();
        const isFiltros = val.startsWith("filtros aplicados") || val.includes("filtros aplicados");
        const isTotal = (c === 0 && (val === "total" || val.startsWith("total ") || val === "totales")) || val === "total" || val === "totales";
        if (isFiltros || isTotal) {
          rowsToDelete.add(r);
          break;
        }
      }
    }
  }

  if (rowsToDelete.size === 0) return;

  for (const r of rowsToDelete) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete worksheet[XLSX.utils.encode_cell({ r, c })];
    }
  }

  let maxR = range.s.r;
  for (const key of Object.keys(worksheet)) {
    if (key.startsWith("!")) continue;
    try {
      const coord = XLSX.utils.decode_cell(key);
      if (coord.r > maxR) maxR = coord.r;
    } catch (e) {}
  }
  range.e.r = maxR;
  worksheet["!ref"] = XLSX.utils.encode_range(range);
}

/**
 * Agrega una fila final con el cálculo de TOTALES para las columnas monetarias clave,
 * aplicando exactamente el mismo estilo visual del encabezado (fondo #D00070, tipografía blanca y negrita).
 */
function appendTotalRow(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;
  const dataEndRow = range.e.r;

  // Si no hay filas de datos, salir
  if (dataEndRow <= headerRow) return;

  // Identificar qué columnas deben sumarse según sus encabezados
  const sumCols = new Map();

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = worksheet[addr];
    if (!cell || cell.v === undefined) continue;
    const headerNorm = normalizeString(cell.v);
    const compactHeader = headerNorm.replace(/\s+/g, "");

    const isMatch = TOTAL_SUM_COLUMNS.some(target => {
      const norm = normalizeString(target);
      return headerNorm === norm || compactHeader === norm.replace(/\s+/g, "");
    });

    if (isMatch) {
      sumCols.set(c, { sum: 0 });
    }
  }

  // Sumar los valores numéricos fila por fila
  for (let r = headerRow + 1; r <= dataEndRow; r++) {
    for (const [colIndex, data] of sumCols.entries()) {
      const addr = XLSX.utils.encode_cell({ r, c: colIndex });
      const cell = worksheet[addr];
      if (!cell || cell.v === undefined || cell.v === null) continue;

      let val = 0;
      if (typeof cell.v === "number") {
        val = isNaN(cell.v) ? 0 : cell.v;
      } else if (typeof cell.v === "string") {
        const cleaned = cell.v.replace(/[$\s]/g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) val = parsed;
      }

      data.sum = Math.round((data.sum + val) * 100) / 100;
    }
  }

  const totalRowIndex = dataEndRow + 1;
  const HEADER_BG_COLOR = "D00070";
  const HEADER_FONT_COLOR = "FFFFFF";

  for (let c = range.s.c; c <= range.e.c; c++) {
    const totalAddr = XLSX.utils.encode_cell({ r: totalRowIndex, c });
    let cell;

    if (c === range.s.c) {
      // Primera columna: Etiqueta TOTAL
      cell = {
        t: "s",
        v: "TOTAL",
        w: "TOTAL",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: HEADER_BG_COLOR } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: HEADER_FONT_COLOR } },
          alignment: { vertical: "center", horizontal: "center" },
        },
      };
    } else if (sumCols.has(c)) {
      // Columnas con suma calculada
      const colData = sumCols.get(c);
      cell = {
        t: "n",
        v: colData.sum,
        z: "$#,##0.00",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: HEADER_BG_COLOR } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: HEADER_FONT_COLOR } },
          alignment: { vertical: "center", horizontal: "right" },
        },
      };
    } else {
      // Columnas sin suma: celda vacía con el estilo de fondo del encabezado
      cell = {
        t: "s",
        v: " ",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: HEADER_BG_COLOR } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: HEADER_FONT_COLOR } },
          alignment: { vertical: "center", horizontal: "center" },
        },
      };
    }

    worksheet[totalAddr] = cell;
  }

  // Actualizar el rango final de la hoja para incluir la fila de TOTAL
  range.e.r = totalRowIndex;
  worksheet["!ref"] = XLSX.utils.encode_range(range);
}


/* =====================================================
   SECCION 7: PROCESAMIENTO PRINCIPAL Y DESCARGA
   ===================================================== */

/**
 * Pipeline principal de procesamiento del archivo subido.
 */
async function processFile(file) {
  showState("loading");
  resetSteps();
  processedWorkbook = null;

  try {
    // PASO 1: Lectura del archivo Excel
    await advanceStep(0, "Leyendo archivo Excel...", 600);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellNF: true,
      cellStyles: true,
    });

    // Determinar tipo de reporte automáticamente a partir del contenido
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const resolvedReportType = detectReportType(firstSheet);
    const isTransacciones = (resolvedReportType === "transacciones");

    // Opciones del cálculo de Retención IIBB (solo Transacciones)
    const shouldCalculateIIBB = isTransacciones && (iibbToggle ? iibbToggle.checked : false);
    const manualAlicuota      = alicuotaSelect ? parseFloat(alicuotaSelect.value) : 0.0350;
    const manualRate          = isNaN(manualAlicuota) ? 0.0350 : manualAlicuota;
    const isAutoMethod        = (selectedIibbMethod === "auto");
    let totalIIBBCalculated   = 0;
    let totalIIBBPending      = 0;
    let iibbPeriodStats       = {};
    let iibbWarnings          = [];
    let botRazonSocial        = null;
    let botUsed               = false;

    // Extracción temprana de CUIL/CUIT para consulta automática al Bot
    let cuilValue = null;
    for (const sheetName of workbook.SheetNames) {
      cuilValue = extractCuilCuit(workbook.Sheets[sheetName]);
      if (cuilValue) break;
    }

    // Consulta al Padrón (Google Sheets DB + Bot SIRTAC / SIRCREB / SIRCUPA de respaldo)
    let alicuotasMap = null;
    if (shouldCalculateIIBB && isAutoMethod) {
      if (cuilValue) {
        // Recopilar períodos únicos de ventas acreditadas
        const allPeriodsMap = new Map();
        for (const sheetName of workbook.SheetNames) {
          const sheetPeriods = extractUniqueAccreditationPeriods(workbook.Sheets[sheetName]);
          sheetPeriods.forEach(p => allPeriodsMap.set(p.key, p));
        }
        const uniquePeriods = Array.from(allPeriodsMap.values());

        if (uniquePeriods.length > 0) {
          alicuotasMap = {};
          let fromSheetsCount = 0;

          // Despertar el Bot y precargar COMARB en paralelo mientras se consulta la base de datos
          warmBot();

          // 1. Paso rápido: Consultar primero en la base de datos de Google Sheets
          await advanceStep(0, `Consultando base de datos para CUIT ${cuilValue}...`, 300);
          try {
            const sheetsResponse = await fetchSheetsAlicuotas(selectedSistema, cuilValue, uniquePeriods);
            if (sheetsResponse && sheetsResponse.periodos) {
              for (const p of uniquePeriods) {
                if (sheetsResponse.periodos[p.key]) {
                  alicuotasMap[p.key] = sheetsResponse.periodos[p.key];
                  fromSheetsCount++;
                }
              }
              if (sheetsResponse.razonSocial && !botRazonSocial) {
                botRazonSocial = sheetsResponse.razonSocial;
              }
            }
          } catch (sheetsErr) {
            console.warn("[ReportePro] Error al consultar Google Sheets DB:", sheetsErr);
          }

          // 2. Determinar qué períodos faltan
          const pendingPeriods = uniquePeriods.filter(p => !alicuotasMap[p.key]);

          if (pendingPeriods.length > 0) {
            const statusMsg = fromSheetsCount > 0
              ? `⚡ ${fromSheetsCount} período(s) en BD. Consultando ${pendingPeriods.length} faltante(s) al Bot ${selectedSistema.toUpperCase()}...`
              : `Consultando alícuotas ${selectedSistema.toUpperCase()} para CUIT ${cuilValue}...`;
            await advanceStep(0, statusMsg, 400);

            try {
              const botResponse = await fetchBotAlicuotas(selectedSistema, cuilValue, pendingPeriods);
              if (botResponse && botResponse.periodos) {
                const isDedicatedHost = BOT_API_BASE.includes("ngrok") || BOT_API_BASE.includes("localhost") || BOT_API_BASE.includes("127.0.0.1");
                const botOrigen = botResponse._botSource || (isDedicatedHost ? "bot_local" : "bot_cloud");
                for (const [key, val] of Object.entries(botResponse.periodos)) {
                  alicuotasMap[key] = { ...val, origen: botOrigen };
                }
                if (botResponse.razonSocial && !botRazonSocial) {
                  botRazonSocial = botResponse.razonSocial;
                }
                botUsed = true;

                // Guardar en Google Sheets en segundo plano sin demorar al usuario
                saveToSheetsBackground(selectedSistema, cuilValue, botResponse.periodos, botRazonSocial);
              }
            } catch (botErr) {
              console.warn("[ReportePro] Falla en consulta al Bot:", botErr);
              const isBlockError = botErr.message && (
                botErr.message.includes('bloqueo por IP') ||
                botErr.message.includes('selectores conocidos') ||
                botErr.message.includes('Waiting for selector') ||
                botErr.message.includes('TimeoutError')
              );
              const errMsg = isBlockError
                ? `COARB bloqueó la consulta desde la nube (IP de Render). Activá el Bot local (localhost:3000) para continuar.`
                : `No se pudo consultar el padrón (${botErr.message})`;
              iibbWarnings.push({ periodKey: "Conexión", error: errMsg });
            }
          } else {
            // Todos los períodos estaban en la base de datos
            botUsed = true;
            await advanceStep(0, `⚡ Alícuotas recuperadas de la base de datos (${fromSheetsCount}/${uniquePeriods.length} períodos)`, 300);
          }
        }
      } else {
        iibbWarnings.push({ periodKey: "CUIT no encontrado", error: "No se encontró CUIT en el archivo o nombre para la consulta automática." });
      }
    }

    // PASO 2: Aplicación de reglas y transformaciones
    await advanceStep(1, "Aplicando traducciones y reglas...", 700);
    let totalTranslations = 0;
    let totalRenames = 0;
    let totalDeleted = 0;

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];

      // Limpieza de filas excedentes/footers
      cleanFooterRows(ws);

      // Regla A: Traducciones de tipo
      const { translationCount } = applyTranslations(ws);
      totalTranslations += translationCount;

      // Regla B: Renombrado de columnas
      const { renameCount } = applyColumnRenames(ws);
      totalRenames += renameCount;

      // Cálculo de Retención IIBB Convenio (solo Transacciones si el switch está activo)
      if (shouldCalculateIIBB) {
        const { calculatedCount, pendingCount, periodStats, warnings } = calculateRetencionIIBB(
          ws,
          alicuotasMap,
          manualRate,
          selectedIibbMethod,
          selectedSistema
        );
        totalIIBBCalculated += calculatedCount;
        totalIIBBPending += pendingCount;
        Object.assign(iibbPeriodStats, periodStats);
        warnings.forEach(w => {
          if (!iibbWarnings.some(item => item.periodKey === w.periodKey)) {
            iibbWarnings.push(w);
          }
        });
      }

      // Regla C: Eliminación de columnas según tipo de reporte
      const { deletedCount } = deleteColumns(ws, resolvedReportType);
      totalDeleted += deletedCount;

      // Corrección de formatos de celda (Fechas -> dd/mm/yyyy hh:mm:ss, Montos -> $#,##0.00)
      fixCellFormats(ws);

      // Orden cronológico ascendente por Fecha
      sortRowsByDate(ws, true);

      // Columna Saldo: en Transacciones se omite siempre
      const shouldAddSaldo = !isTransacciones && (saldoToggle ? saldoToggle.checked : false);
      if (shouldAddSaldo) {
        appendSaldoColumn(ws);
      }

      // Estilos visuales (Zebra striping y destaque de Monto Neto)
      applyRowAndColumnStyles(ws);

      // Fila final de Totales con estilo de encabezado (#D00070)
      appendTotalRow(ws);

      // Autoajuste de anchos de columna al contenido visible (incluyendo totales)
      autoFitColumns(ws);

      // Estilo del encabezado (#D00070)
      applyHeaderStyle(ws);
    }

    await advanceStep(2, "Renombrando y filtrando columnas...", 500);
    await advanceStep(3, "Generando archivo de descarga...", 600);

    loadingSteps[3].classList.remove("active");
    loadingSteps[3].classList.add("done");

    // Guardar el workbook procesado para descarga directa
    processedWorkbook = workbook;

    // Nombres de los archivos de salida (.xlsx y .pdf)
    const cuilSuffix = cuilValue ? `_${cuilValue}` : "";
    if (isTransacciones) {
      downloadFileName    = `Reporte_Transacciones${cuilSuffix}.xlsx`;
      downloadPdfFileName = `Reporte_Transacciones${cuilSuffix}.pdf`;
    } else {
      downloadFileName    = `Reporte_Movimientos${cuilSuffix}.xlsx`;
      downloadPdfFileName = `Reporte_Movimientos${cuilSuffix}.pdf`;
    }

    // Extraer rango de fechas (período) y razón social/titular si existe en la hoja
    const firstProcessedSheet = workbook.Sheets[workbook.SheetNames[0]];
    const periodText = extractReportDateRange(firstProcessedSheet);
    const sheetTitular = extractTitularFromSheet(firstProcessedSheet);
    let detectedTitular = sheetTitular || botRazonSocial;
    if (sheetTitular && botRazonSocial && normalizeString(sheetTitular) !== normalizeString(botRazonSocial)) {
      detectedTitular = `${sheetTitular} (${botRazonSocial})`;
    }

    processedReportMeta = {
      reportType: resolvedReportType,
      isTransacciones,
      cuilValue,
      razonSocial: detectedTitular,
      periodText,
      originalFileName: file.name,
      excelFileName: downloadFileName,
      pdfFileName: downloadPdfFileName,
    };

    const typeBadge = isTransacciones
      ? `<span class="badge badge--type-tx">Reporte de Transacciones</span>`
      : `<span class="badge badge--type-mov">Reporte de Movimientos</span>`;

    // Generar bloque de resumen de Retención IIBB
    let iibbSummaryHtml = "";
    if (!isTransacciones) {
      iibbSummaryHtml = `<span>Omitida (no aplica a Movimientos)</span>`;
    } else if (!shouldCalculateIIBB) {
      iibbSummaryHtml = `<span>No solicitada</span>`;
    } else if (selectedIibbMethod === "manual") {
      iibbSummaryHtml = `
        <div>
          <div>Calculada para <strong>${totalIIBBCalculated}</strong> venta(s) acreditada(s)${totalIIBBPending > 0 ? `, ${totalIIBBPending} pendiente(s)` : ""}</div>
          <div style="font-size: 12px; color: var(--color-text-2); margin-top: 2px;">
            Método: <strong>Manual (${(manualRate * 100).toFixed(2).replace('.', ',')}%)</strong>
          </div>
        </div>
      `;
    } else {
      const periodsEntries = Object.entries(iibbPeriodStats);
      let periodsListHtml = "";

      if (periodsEntries.length > 0) {
        periodsListHtml = `
          <div class="period-breakdown">
            <div class="period-breakdown__title">Alícuotas consultadas por período (${selectedSistema.toUpperCase()}):</div>
            <div class="period-breakdown__list">
              ${periodsEntries.map(([pkey, pdata]) => {
                let badgeClass = "period-item__badge--ok";
                let statusLabel = `${(pdata.alicuota).toFixed(2).replace('.', ',')}%`;
                if (pdata.letra) statusLabel += ` (${pdata.letra})`;
                if (pdata.status === "not_included") {
                  badgeClass = "period-item__badge--zero";
                  statusLabel = "0,00% (No retiene)";
                } else if (pdata.status === "error") {
                  badgeClass = "period-item__badge--err";
                  statusLabel = "0,00% (Error al consultar)";
                }

                let sourceBadge = "";
                if (pdata.origen === "google_sheets") {
                  sourceBadge = ` <span style="font-size: 10px; background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 4px; padding: 1px 5px; margin-left: 4px; font-weight: 600;" title="Obtenido de la base de datos Google Sheets">⚡ BD</span>`;
                } else if (pdata.origen === "bot_local") {
                  sourceBadge = ` <span style="font-size: 10px; background: rgba(245, 158, 11, 0.14); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 4px; padding: 1px 5px; margin-left: 4px; font-weight: 600;" title="Consultado con tu Bot hosteado en tu PC (ultra rápido)">⚡ Bot</span>`;
                } else if (pdata.origen === "bot" || pdata.origen === "bot_cloud") {
                  sourceBadge = ` <span style="font-size: 10px; background: rgba(208, 0, 112, 0.10); color: #d00070; border: 1px solid rgba(208, 0, 112, 0.20); border-radius: 4px; padding: 1px 5px; margin-left: 4px; font-weight: 600;" title="Consultado en vivo con el Bot en la nube (Render)">🤖 Bot</span>`;
                }

                return `
                  <div class="period-item">
                    <span class="period-item__label">Período ${escapeHtml(pkey)}:${sourceBadge}</span>
                    <span>${pdata.count} venta(s) &nbsp; <span class="period-item__badge ${badgeClass}">${statusLabel}</span></span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      let warningsHtml = "";
      if (iibbWarnings.length > 0) {
        warningsHtml = `
          <div class="iibb-warning-banner">
            <div class="iibb-warning-banner__header">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Observación en consulta automática (${selectedSistema.toUpperCase()}):</span>
            </div>
            <ul class="iibb-warning-banner__list">
              ${iibbWarnings.map(w => `<li><strong>${escapeHtml(w.periodKey)}:</strong> ${escapeHtml(w.error)}. <strong>No se aplicó retención para las ventas de este período.</strong></li>`).join("")}
            </ul>
          </div>
        `;
      }

      iibbSummaryHtml = `
        <div>
          <div>Calculada para <strong>${totalIIBBCalculated}</strong> venta(s) acreditada(s)${totalIIBBPending > 0 ? `, ${totalIIBBPending} pendiente(s)` : ""}</div>
          <div style="font-size: 12px; color: var(--color-text-2); margin-top: 2px;">
            Método: <strong>Automático (${selectedSistema.toUpperCase()})</strong>
          </div>
          ${periodsListHtml}
          ${warningsHtml}
        </div>
      `;
    }

    // Renderizar metadata de éxito
    successMeta.innerHTML = `
      <div class="success-meta-row">
        <span class="success-meta-label">Tipo de reporte:</span>
        <span>${typeBadge}</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Archivo original:</span>
        <span>${escapeHtml(file.name)}</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Descarga como:</span>
        <span class="success-meta-value">${escapeHtml(downloadFileName)} / .pdf</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Traducciones aplicadas:</span>
        <span>${totalTranslations} celda(s)</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Columnas renombradas:</span>
        <span>${totalRenames} columna(s)</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Columnas eliminadas:</span>
        <span>${totalDeleted} columna(s)</span>
      </div>
      ${cuilValue ? `<div class="success-meta-row">
        <span class="success-meta-label">CUIL/CUIT detectado:</span>
        <span class="success-meta-value">${escapeHtml(cuilValue)}${botRazonSocial ? ` (${escapeHtml(botRazonSocial)})` : ""}</span>
      </div>` : ""}
      <div class="success-meta-row">
        <span class="success-meta-label">Columna Saldo:</span>
        <span>${isTransacciones ? "Omitida (no aplica a Transacciones)" : ((saldoToggle && saldoToggle.checked) ? "Calculada e incorporada" : "No solicitada")}</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Retención IIBB:</span>
        <div>${iibbSummaryHtml}</div>
      </div>
    `;

    await new Promise(r => setTimeout(r, 300));
    showState("success");

  } catch (err) {
    console.error("[ReportePro] Error al procesar:", err);
    errorMessage.textContent =
      err.message || "No se pudo procesar el archivo. Asegurate de que sea un .xlsx valido.";
    showState("error");
  }
}

/**
 * Dispara la descarga directa del archivo generado hacia la carpeta predeterminada
 * del navegador (Descargas / Downloads).
 */
function downloadFile() {
  if (!processedWorkbook) return;

  try {
    const wbArray = XLSX.write(processedWorkbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });
    const blob = new Blob([wbArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Soporte para navegadores heredados
    if (typeof navigator.msSaveOrOpenBlob === "function") {
      navigator.msSaveOrOpenBlob(blob, downloadFileName);
      return;
    }

    // Descarga directa e inmediata a través de elemento <a> con atributo download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  } catch (err) {
    console.error("[ReportePro] Error al descargar el archivo:", err);
    alert("No se pudo descargar el archivo automáticamente.\nError: " + err.message);
  }
}


/* =====================================================
   SECCION 7B: MOTOR DE EXPORTACION A PDF (ESTETICA BEZZA PAY)
   ===================================================== */

/**
 * SVG Oficial de Bezza Pay incrustado en texto plano (libre de restricciones CORS).
 */
const BEZZA_PDF_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 57.9">
<style>
  .st0{fill:#CAF14D;}
  .st1{fill:#D00070;}
</style>
<g>
  <path class="st0" d="M119.3,22.1h-8.5c0-7-5.6-12.6-12.6-12.7V0.9C109.9,1,119.3,10.4,119.3,22.1"/>
  <path class="st1" d="M46.9,21c-0.9-1.7-2-3-3.4-3.9c-1.4-0.9-3-1.3-4.7-1.3c-2,0-3.7,0.4-5.2,1.3c-1.5,0.9-2.7,2.1-3.6,3.6c-0.9,1.5-1.3,3.3-1.3,5.3s0.4,3.7,1.3,5.3c0.8,1.5,2,2.7,3.5,3.6c1.5,0.9,3.2,1.3,5.1,1.3c1.5,0,2.9-0.2,4.1-0.6c1.2-0.4,2.2-1,3.1-1.8c0.9-0.8,1.6-1.7,2.1-2.8L43.1,29c-0.4,0.7-0.9,1.3-1.5,1.8c-0.7,0.5-1.5,0.7-2.6,0.7c-1.2,0-2.4-0.4-3.3-1.1c-1-0.8-1.5-1.8-1.7-3.1h14.2C48.1,24.8,47.7,22.7,46.9,21 M34.3,23.5c0.1-0.8,0.4-1.5,0.9-2c0.5-0.5,1-0.8,1.7-1.1c0.6-0.2,1.2-0.3,1.8-0.3c0.6,0,1.2,0.1,1.7,0.3c0.6,0.2,1.1,0.6,1.5,1.1c0.4,0.5,0.7,1.1,0.8,1.9L34.3,23.5L34.3,23.5z"/>
  <polygon class="st1" points="67.7,19.9 68.4,16.2 52.4,16.2 51.7,20.5 61.2,20.5 49.8,31.9 49.2,35.6 65.1,35.6 65.8,31.4 56.3,31.4"/>
  <polygon class="st1" points="69.4,20.5 78.9,20.5 67.5,31.9 66.8,35.6 82.8,35.6 83.5,31.4 74,31.4 85.4,19.9 86,16.2 70.1,16.2"/>
  <path class="st1" d="M102.7,20.1c-0.6-1.4-1.6-2.4-2.9-3.1c-1.3-0.7-2.9-1.1-4.9-1.1c-1.6,0-3,0.2-4.1,0.7c-1.1,0.5-2,1.2-2.7,1.9c-0.7,0.8-1.2,1.6-1.6,2.4l4.5,1.5c0.5-0.7,1-1.3,1.7-1.7s1.4-0.5,2.2-0.5c1.1,0,1.9,0.3,2.4,1c0.6,0.6,0.9,1.5,1.1,2.7h-4.6c-2.5,0-4.4,0.5-5.8,1.6c-1.4,1-2.1,2.6-2.1,4.7c0,1.9,0.6,3.3,1.9,4.4c1.3,1,3.1,1.5,5.4,1.5c1.3,0,2.4-0.2,3.3-0.7c0.9-0.5,1.5-1.1,2-2v2.2h4.9V24.8C103.6,23,103.4,21.4,102.7,20.1 M98.6,27.8c0,0.7-0.2,1.3-0.6,1.9s-0.9,1.1-1.6,1.5c-0.7,0.4-1.4,0.6-2.2,0.6c-0.9,0-1.7-0.2-2.2-0.5c-0.5-0.3-0.8-0.8-0.8-1.3c0-0.7,0.3-1.3,1-1.7c0.6-0.4,1.8-0.6,3.5-0.6L98.6,27.8L98.6,27.8L98.6,27.8z"/>
  <path class="st1" d="M23.2,21.4c1-0.6,1.7-1.4,2.2-2.3c0.5-0.9,0.8-1.9,0.8-2.9c0-1.7-0.4-3.1-1.2-4.3s-1.9-2-3.3-2.6c-1.4-0.6-3-0.9-4.9-0.9H6.2v8.9l3.5,2.2h-1H2.5H2.2L0,23.8h6.2v8.5c0,1.8,1.5,3.3,3.3,3.3h8.7c1.8,0,3.4-0.3,4.7-0.9c1.3-0.6,2.4-1.5,3.1-2.6c0.7-1.2,1.1-2.6,1.1-4.2c0-1.5-0.3-2.8-1-3.8C25.4,22.9,24.4,22.1,23.2,21.4 M11.3,12.7h5.2c1.3,0,2.3,0.3,3.1,0.9c0.7,0.6,1.1,1.4,1.1,2.5c0,1.1-0.3,1.9-1,2.5c-0.7,0.6-1.6,0.9-2.7,0.9h-5.7V12.7z M20.6,30c-0.7,0.6-1.7,1-3,1h-6.3v-7h5.9c1.4,0,2.5,0.3,3.3,1c0.8,0.6,1.2,1.5,1.2,2.6C21.7,28.5,21.3,29.3,20.6,30"/>
  <path class="st1" d="M70.4,57l1.9-13.8h2.1l-0.2,1.7c0.2-0.3,0.5-0.6,0.8-0.9c0.3-0.3,0.7-0.6,1.2-0.7c0.5-0.2,1-0.3,1.5-0.3c0.8,0,1.5,0.2,2,0.6c0.5,0.4,1,1,1.2,1.8c0.2,0.8,0.3,1.8,0.1,3c-0.2,1.2-0.5,2.2-0.9,3.1c-0.5,0.8-1,1.4-1.7,1.9c-0.7,0.4-1.5,0.6-2.3,0.6c-0.4,0-0.8-0.1-1.1-0.2c-0.3-0.1-0.6-0.3-0.8-0.5c-0.2-0.2-0.4-0.4-0.6-0.7c-0.1-0.2-0.3-0.5-0.4-0.7L72.5,57L70.4,57L70.4,57z M75.8,52.3c0.8,0,1.4-0.3,2-0.9s1-1.6,1.1-2.9c0.2-1.2,0-2.1-0.3-2.7c-0.4-0.7-1-1-1.8-1c-0.9,0-1.6,0.3-2.1,1c-0.5,0.7-0.9,1.6-1,2.7c-0.1,0.7-0.1,1.4,0,1.9c0.1,0.6,0.3,1.1,0.7,1.4C74.8,52.1,75.2,52.3,75.8,52.3z"/>
  <path class="st1" d="M85.4,53.9c-0.6,0-1.2-0.1-1.7-0.4c-0.5-0.2-0.8-0.6-1-1.1c-0.2-0.5-0.3-1-0.2-1.7c0.2-1.2,0.7-2,1.6-2.6c0.9-0.6,2.2-0.9,3.9-0.9l1.6,0l0.1-0.8c0.1-0.6,0-1.1-0.4-1.4c-0.3-0.3-0.8-0.5-1.4-0.5c-0.5,0-1,0.1-1.5,0.4c-0.5,0.3-0.8,0.7-1,1.2h-1.8c0.1-0.6,0.4-1.2,0.8-1.7c0.4-0.5,1-0.9,1.6-1.1c0.7-0.3,1.4-0.4,2.2-0.4c0.9,0,1.7,0.1,2.2,0.4c0.5,0.3,1,0.7,1.2,1.2c0.2,0.5,0.3,1.1,0.2,1.8l-1.1,7.4h-1.8l0.1-1.9c-0.5,0.8-1,1.4-1.7,1.6C86.8,53.8,86.1,53.9,85.4,53.9z M86.3,52.4c0.3,0,0.6-0.1,0.9-0.2c0.3-0.1,0.6-0.3,0.9-0.5c0.3-0.2,0.5-0.4,0.7-0.7c0.2-0.3,0.3-0.5,0.3-0.8l0.2-1.7l-1.3,0c-0.7,0-1.3,0.1-1.7,0.2c-0.5,0.1-0.9,0.4-1.2,0.7c-0.3,0.3-0.5,0.7-0.6,1.2c-0.1,0.6,0,1,0.4,1.3C85.3,52.3,85.7,52.4,86.3,52.4z"/>
  <path class="st1" d="M93.9,57.1c-0.6,0-1.2-0.1-1.6-0.3l0.2-1.4l1,0c0.5,0,0.9,0,1.2-0.1c0.3-0.1,0.5-0.3,0.7-0.5c0.1-0.2,0.3-0.4,0.3-0.5l0.4-0.9l-2.4-10.2h2.1l1.7,7.8l3.9-7.8h2.1l-5.8,11.1C97.4,55,97,55.6,96.5,56c-0.4,0.4-0.8,0.7-1.3,0.8C94.9,57,94.4,57.1,93.9,57.1z"/>
</g>
</svg>`;

let cachedPdfLogoDataUrl = null;
let cachedPdfGradientDataUrl = null;

/**
 * Rasteriza el SVG de Bezza Pay a un PNG en alta resolución (4x) para insertarlo en jsPDF.
 */
function getBezzaLogoPngDataUrl() {
  if (cachedPdfLogoDataUrl) return Promise.resolve(cachedPdfLogoDataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 232;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cachedPdfLogoDataUrl = canvas.toDataURL("image/png");
        resolve(cachedPdfLogoDataUrl);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(BEZZA_PDF_LOGO_SVG);
  });
}

/**
 * Genera una imagen PNG con el degradado oficial de Bezza Pay (#c514a7 -> #f20027)
 * para la barra superior de cada página del PDF.
 */
function getBezzaGradientPngDataUrl() {
  if (cachedPdfGradientDataUrl) return cachedPdfGradientDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, "#c514a7");
  grad.addColorStop(1, "#f20027");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  cachedPdfGradientDataUrl = canvas.toDataURL("image/png");
  return cachedPdfGradientDataUrl;
}

/**
 * Formatea un CUIL/CUIT numérico de 11 dígitos como XX-XXXXXXXX-X.
 */
function formatCuitForPdf(cuitRaw) {
  if (!cuitRaw) return "";
  const digits = String(cuitRaw).replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return String(cuitRaw).trim();
}

/**
 * Extrae el rango de fechas (Período) del reporte a partir de la columna "Fecha".
 */
function extractReportDateRange(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return "";
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  let fechaCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell && cell.v !== undefined) {
      const name = normalizeString(cell.v);
      if (name === "fecha") {
        fechaCol = c;
        break;
      }
    }
  }
  if (fechaCol === -1) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (cell && cell.v !== undefined) {
        const name = normalizeString(cell.v);
        if (name.includes("fecha")) {
          fechaCol = c;
          break;
        }
      }
    }
  }
  if (fechaCol === -1) return "";

  let minDate = null;
  let maxDate = null;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Ignorar fila TOTAL
    const firstCell = worksheet[XLSX.utils.encode_cell({ r, c: range.s.c })];
    if (firstCell && String(firstCell.v).trim().toUpperCase() === "TOTAL") continue;

    const cell = worksheet[XLSX.utils.encode_cell({ r, c: fechaCol })];
    if (!cell || cell.v === undefined || cell.v === null) continue;
    const d = parseAccreditationDate(cell.v);
    if (d && !isNaN(d.getTime())) {
      if (!minDate || d.getTime() < minDate.getTime()) minDate = d;
      if (!maxDate || d.getTime() > maxDate.getTime()) maxDate = d;
    }
  }

  if (!minDate || !maxDate) return "";

  const fmtDate = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const sMin = fmtDate(minDate);
  const sMax = fmtDate(maxDate);
  return sMin === sMax ? `Fecha: ${sMin}` : `Período: ${sMin} al ${sMax}`;
}

/**
 * Intenta extraer el nombre del titular o razón social si existe una columna correspondiente en la hoja.
 */
function extractTitularFromSheet(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return null;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;

  const candidateNames = ["razon social", "titular", "nombre titular", "comercio nombre", "nombre comercio"];
  let colIdx = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell || cell.v === undefined) continue;
    const norm = normalizeString(cell.v);
    if (candidateNames.includes(norm)) {
      colIdx = c;
      break;
    }
  }
  if (colIdx === -1) return null;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const firstCell = worksheet[XLSX.utils.encode_cell({ r, c: range.s.c })];
    if (firstCell && String(firstCell.v).trim().toUpperCase() === "TOTAL") continue;
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: colIdx })];
    if (cell && cell.v !== undefined && String(cell.v).trim() !== "") {
      return String(cell.v).trim();
    }
  }
  return null;
}

/**
 * Formatea un número como moneda ARS ($ 1.234,56) para mostrar en la tabla PDF.
 */
function formatPdfCurrency(num) {
  if (num === undefined || num === null || isNaN(num)) return "";
  const absFormatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  return num < 0 ? `-$ ${absFormatted}` : `$ ${absFormatted}`;
}

/**
 * Diccionario de abreviaturas de cabeceras para optimizar el espacio horizontal en el PDF.
 */
const PDF_HEADER_ABBREVIATIONS = {
  "documento tarjeta habiente": "Doc. Tarjeta",
  "documento tarjetahabiente":  "Doc. Tarjeta",
  "plazo de acreditacion":      "Acreditación",
  "fecha liberacion":           "Fecha Lib.",
  "fecha de liberacion":        "Fecha Lib.",
  "num. autorizacion":          "Autorización",
  "num autorizacion":           "Autorización",
  "numero autorizacion":        "Autorización",
  "id movimiento":              "ID Mov.",
  "id venta / id coelsa":       "ID Venta / COELSA",
  "comision sin iva":           "Comisión s/IVA",
  "iva de la comision":         "IVA Comisión",
  "retencion iibb penalidad":   "Ret. IIBB Pen.",
  "retencion ganancias":        "Ret. Ganancias",
  "retencion ganancia":         "Ret. Ganancias",
  "retencion iibb":             "Ret. IIBB",
  "numero tarjeta":             "N° Tarjeta",
  "marca tarjeta":              "Marca",
  "modo entrada":               "Entrada",
  "forma pago":                 "Forma Pago",
  "tipo venta":                 "Tipo Venta",
  "usuario app":                "Usuario App",
};

/**
 * Columnas que se omiten en la tabla del PDF porque su valor ya se informa en el encabezado superior.
 */
const PDF_COLUMNS_TO_HIDE = [
  "cuit",
  "cuil",
  "cuil/cuit",
  "cuil cuit",
  "razon social",
  "titular",
  "nombre titular",
  "comercio nombre",
  "nombre comercio",
  "cordobesa",
  "es cordobesa",
  "tarjeta cordobesa",
  "estado",
];

/**
 * Formatea una celda de la hoja procesada para su visualización en la tabla PDF.
 * Limpia guiones bajos ("2_DIAS" -> "2 DIAS") para evitar quiebres forzados.
 */
function formatWorksheetCellForPdf(cell, colMeta, compactDates = false) {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  const rawStr = String(cell.v).trim();
  if (rawStr === "") return "";

  // 1. Columnas monetarias
  if (colMeta.isMoneyCol || cell.z === "$#,##0.00") {
    if (typeof cell.v === "number" && !isNaN(cell.v)) {
      return formatPdfCurrency(cell.v);
    }
    const cleaned = rawStr.replace(/[$\s]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return formatPdfCurrency(parsed);
    }
    return rawStr;
  }

  // 2. Columnas de fecha
  if (colMeta.isDateCol || cell.z === "dd/mm/yyyy hh:mm:ss") {
    const d = parseAccreditationDate(cell.v);
    if (d && !isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      if (hh === "00" && mi === "00" && ss === "00" && !rawStr.includes(":")) {
        return `${dd}/${mm}/${yyyy}`;
      }
      return compactDates ? `${dd}/${mm}/${yyyy} ${hh}:${mi}` : `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    }
    return rawStr.replace(/_/g, " ");
  }

  // 3. Columnas enteras (DNI, Cuotas, etc.)
  if (colMeta.isIntegerCol || cell.z === "0") {
    if (typeof cell.v === "number" && !isNaN(cell.v)) {
      return String(Math.round(cell.v));
    }
  }

  // 4. Columnas de CUIL/CUIT
  if (colMeta.isCuitCol) {
    return formatCuitForPdf(rawStr);
  }

  // 5. Texto general: limpiar guiones bajos ("2_DIAS" -> "2 DIAS") y espacios múltiples
  return String(cell.w !== undefined ? cell.w : cell.v)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dibuja el encabezado compacto y el pie de página corporativo de Bezza Pay en una página del PDF.
 */
function drawBezzaPdfHeaderAndFooter(doc, pageNumber, totalPages, meta, logoDataUrl, gradDataUrl, emissionDateStr) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 8;

  // 1. Barra superior con degradado Bezza Pay (#c514a7 -> #f20027)
  if (gradDataUrl) {
    doc.addImage(gradDataUrl, "PNG", 0, 0, pageWidth, 3.2);
  } else {
    doc.setFillColor(208, 0, 112);
    doc.rect(0, 0, pageWidth, 3.2, "F");
  }

  // 2. Logo Bezza Pay a la izquierda
  const logoX = marginX;
  const logoY = 5.8;
  const logoW = 24;
  const logoH = 11.58;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(208, 0, 112);
    doc.text("bezza pay", logoX, logoY + 8);
  }

  // Línea divisoria vertical junto al logo
  doc.setDrawColor(226, 226, 234);
  doc.setLineWidth(0.3);
  doc.line(logoX + logoW + 3.5, 6.2, logoX + logoW + 3.5, 17.5);

  // 3. Título del reporte a la izquierda (centrado verticalmente junto al logo)
  const titleX = logoX + logoW + 7;
  const reportTitle = meta && meta.isTransacciones
    ? "REPORTE DE TRANSACCIONES"
    : "REPORTE DE MOVIMIENTOS";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 17, 17);
  doc.text(reportTitle, titleX, 13.5);

  // 4. Bloque compacto de metadatos a la derecha (CUIT/Titular + Período)
  const rightX = pageWidth - marginX;
  let rightLine1 = "";
  if (meta && meta.cuilValue) {
    const cuitFormatted = formatCuitForPdf(meta.cuilValue);
    if (meta.razonSocial) {
      rightLine1 = `${meta.razonSocial.toUpperCase()}   |   CUIT/CUIL: ${cuitFormatted}`;
    } else {
      rightLine1 = `CUIT / CUIL: ${cuitFormatted}`;
    }
  } else if (meta && meta.razonSocial) {
    rightLine1 = `TITULAR: ${meta.razonSocial.toUpperCase()}`;
  }

  if (rightLine1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(17, 17, 17);
    doc.text(rightLine1, rightX, (meta && meta.periodText) ? 10.8 : 13.5, { align: "right" });
  }

  if (meta && meta.periodText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 115);
    doc.text(meta.periodText, rightX, 15.6, { align: "right" });
  }

  // Línea separadora inferior del encabezado
  doc.setDrawColor(230, 228, 238);
  doc.setLineWidth(0.35);
  doc.line(marginX, 19.8, pageWidth - marginX, 19.8);

  // 5. Pie de página con numeración ("Página X de Y")
  const footerLineY = pageHeight - 10.2;
  const footerTextY = pageHeight - 5.5;

  doc.setDrawColor(230, 228, 238);
  doc.setLineWidth(0.25);
  doc.line(marginX, footerLineY, pageWidth - marginX, footerLineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 65);
  doc.text(`Página ${pageNumber} de ${totalPages}`, rightX, footerTextY, { align: "right" });
}

/**
 * Genera y descarga el reporte procesado en formato PDF (Hoja ancha adaptable A4 / A3 / Widescreen)
 * manteniendo la estética y paleta de colores de Bezza Pay y evitando cortes a mitad de palabra.
 */
async function downloadPdfFile() {
  if (!processedWorkbook) return;

  const originalBtnHtml = downloadPdfBtn ? downloadPdfBtn.innerHTML : "";
  if (downloadPdfBtn) {
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.innerHTML = `<span>Generando PDF...</span>`;
  }

  try {
    const jspdfNs = window.jspdf;
    if (!jspdfNs || !jspdfNs.jsPDF) {
      throw new Error("La librería jsPDF no se cargó correctamente. Verificá tu conexión o recargá la página.");
    }

    const { jsPDF } = jspdfNs;

    // Instancia auxiliar de medición para calcular el ancho exacto requerido por las columnas
    const measureDoc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    if (typeof measureDoc.autoTable !== "function") {
      throw new Error("El complemento jsPDF-AutoTable no está disponible.");
    }

    const [logoDataUrl, gradDataUrl] = await Promise.all([
      getBezzaLogoPngDataUrl(),
      Promise.resolve(getBezzaGradientPngDataUrl()),
    ]);

    const now = new Date();
    const emissionDateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} hs`;

    const sheetNames = processedWorkbook.SheetNames;
    const preparedSheets = [];
    let maxRequiredPageWidth = 297; // Mínimo A4 Horizontal (297 mm)

    for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
      const ws = processedWorkbook.Sheets[sheetNames[sIdx]];
      if (!ws || !ws["!ref"]) continue;

      const range = XLSX.utils.decode_range(ws["!ref"]);
      const headerRow = range.s.r;
      const rawColCount = range.e.c - range.s.c + 1;
      const compactDates = rawColCount > 10;

      // 1. Filtrar columnas (ocultando CUIT y Razón Social que ya figuran en el encabezado) y clasificar las visibles
      const visibleCols = [];
      const headers = [];
      const colMeta = [];

      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow, c });
        const cell = ws[addr];
        const rawHeaderText = cell && cell.v !== undefined ? String(cell.v).replace(/_/g, " ").replace(/\s+/g, " ").trim() : "";
        const norm = normalizeString(rawHeaderText);

        // Si es la primera columna (donde va la etiqueta "TOTAL" al pie), nunca ocultarla;
        // si no es la primera columna y está en PDF_COLUMNS_TO_HIDE (CUIT, Razón Social, etc.), omitirla de la tabla PDF
        if (c > range.s.c && PDF_COLUMNS_TO_HIDE.includes(norm)) {
          continue;
        }

        const displayHeader = PDF_HEADER_ABBREVIATIONS[norm] || rawHeaderText;

        const isNetoCol = norm === "monto neto" || (norm.includes("neto") && !norm.includes("bruto"));
        const isMoneyCol = (
          norm.includes("monto") ||
          norm.includes("neto") ||
          norm.includes("bruto") ||
          norm.includes("comision") ||
          norm.includes("iva") ||
          norm.includes("cft") ||
          norm.includes("arancel") ||
          norm.includes("costo") ||
          norm.includes("retencion") ||
          norm === "saldo"
        ) && !norm.includes("condicion") && !norm.includes("descripcion");

        const isDateCol = norm.includes("fecha");
        const isCuitCol = norm.includes("cuit") || norm.includes("cuil");
        const isIntegerCol = (
          norm.includes("documento") ||
          norm.includes("tarjeta habiente") ||
          norm.includes("tarjetahabiente") ||
          norm.includes("dni") ||
          norm.includes("cuota")
        );
        const isSingleLineCol = (
          isMoneyCol ||
          isDateCol ||
          isCuitCol ||
          isIntegerCol ||
          norm === "id" ||
          norm === "id movimiento" ||
          norm.includes("numero tarjeta") ||
          norm.includes("autorizacion") ||
          norm === "lector" ||
          norm === "modo entrada" ||
          norm === "estado" ||
          norm === "tipo" ||
          norm === "plazo de acreditacion"
        );
        const isCenterCol = (
          isDateCol ||
          isCuitCol ||
          isIntegerCol ||
          norm === "id" ||
          norm === "id movimiento" ||
          norm.includes("numero tarjeta") ||
          norm.includes("autorizacion") ||
          norm === "lector" ||
          norm.includes("plazo") ||
          norm.includes("marca") ||
          norm === "modo entrada" ||
          norm === "tipo" ||
          norm === "tipo venta" ||
          norm === "estado"
        );

        visibleCols.push(c);
        headers.push(displayHeader);
        colMeta.push({
          norm,
          isNetoCol,
          isMoneyCol,
          isDateCol,
          isCuitCol,
          isIntegerCol,
          isSingleLineCol,
          isCenterCol,
        });
      }

      const colCount = visibleCols.length;
      if (colCount === 0) continue;

      // 2. Extraer filas de datos y fila TOTAL sólo para las columnas visibles
      const bodyRows = [];
      for (let r = headerRow + 1; r <= range.e.r; r++) {
        const rowValues = [];
        let hasContent = false;

        // Verificar si la fila original es la fila TOTAL (etiqueta en range.s.c)
        const firstOrigCell = ws[XLSX.utils.encode_cell({ r, c: range.s.c })];
        const isOrigTotalRow = firstOrigCell && String(firstOrigCell.v).trim().toUpperCase() === "TOTAL";

        for (let idx = 0; idx < colCount; idx++) {
          const c = visibleCols[idx];
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          let formatted = formatWorksheetCellForPdf(cell, colMeta[idx], compactDates);
          if (isOrigTotalRow && idx === 0) {
            formatted = "TOTAL";
          }
          if (formatted !== "") hasContent = true;
          rowValues.push(formatted);
        }
        if (hasContent) {
          bodyRows.push(rowValues);
        }
      }

      const isLastRowTotal = bodyRows.length > 0 && String(bodyRows[bodyRows.length - 1][0]).trim().toUpperCase() === "TOTAL";

      // 3. Definir tipografía cómoda y legible (ya que la hoja se adapta en ancho cuando hay muchas columnas)
      let fontSize = 8.2;
      let headFontSize = 8.5;
      let cellPadding = 2.0;

      if (colCount > 16) {
        fontSize = 7.4;
        headFontSize = 7.8;
        cellPadding = 1.7;
      } else if (colCount > 11) {
        fontSize = 7.8;
        headFontSize = 8.2;
        cellPadding = 1.8;
      }

      // 4. Calcular el ancho mínimo por columna (minCellWidth) para PROHIBIR cortes a mitad de palabra
      const columnStyles = {};
      let sheetTotalMinWidth = 0;

      for (let i = 0; i < colCount; i++) {
        const meta = colMeta[i];
        const headerStr = headers[i] || "";

        // A) Ancho de la palabra más larga del encabezado (o del encabezado entero si es corto)
        measureDoc.setFont("helvetica", "bold");
        measureDoc.setFontSize(headFontSize);
        const headerWords = headerStr.split(/\s+/).filter(Boolean);
        let maxHeaderTokenW = 0;
        for (const hw of headerWords) {
          const w = measureDoc.getTextWidth(hw);
          if (w > maxHeaderTokenW) maxHeaderTokenW = w;
        }
        const fullHeaderW = measureDoc.getTextWidth(headerStr);
        // Si el encabezado tiene 1 o 2 palabras cortas, intentar que entre en 1 línea; si tiene más, al menos la palabra más larga
        const targetHeaderW = headerStr.length <= 14 ? fullHeaderW : Math.max(maxHeaderTokenW, fullHeaderW * 0.58);

        // B) Ancho requerido por el contenido de las celdas de esa columna
        measureDoc.setFont("helvetica", meta.isNetoCol ? "bold" : "normal");
        measureDoc.setFontSize(fontSize);

        let maxFullCellW = 0;
        let maxWordCellW = 0;

        for (let rIdx = 0; rIdx < bodyRows.length; rIdx++) {
          const valStr = bodyRows[rIdx][i];
          if (!valStr) continue;

          // En la fila TOTAL el texto es bold
          if (isLastRowTotal && rIdx === bodyRows.length - 1) {
            measureDoc.setFont("helvetica", "bold");
          } else {
            measureDoc.setFont("helvetica", meta.isNetoCol ? "bold" : "normal");
          }

          const fullW = measureDoc.getTextWidth(valStr);
          if (fullW > maxFullCellW) maxFullCellW = fullW;

          const words = valStr.split(/\s+/).filter(Boolean);
          for (const word of words) {
            const ww = measureDoc.getTextWidth(word);
            if (ww > maxWordCellW) maxWordCellW = ww;
          }
        }

        // Si es columna de una sola línea (importes, fechas, IDs, tarjetas, códigos), exigir el ancho total de la celda;
        // si es columna de texto multi-palabra (Forma Pago, Usuario App, Marca), exigir al menos la palabra más larga
        // (y al menos el 75% de la frase completa para que a lo sumo ocupe 2 líneas limpias sin cortar sílabas).
        const contentMinW = meta.isSingleLineCol
          ? maxFullCellW
          : Math.max(maxWordCellW, Math.min(maxFullCellW, Math.max(maxWordCellW * 1.35, maxFullCellW * 0.72)));

        const requiredColW = Math.max(targetHeaderW, contentMinW) + (cellPadding * 2) + 2.2;
        sheetTotalMinWidth += requiredColW;

        columnStyles[i] = {
          halign: meta.isMoneyCol ? "right" : (meta.isCenterCol ? "center" : "left"),
          minCellWidth: Math.round(requiredColW * 10) / 10,
        };
      }

      // Margen izquierdo (8mm) + margen derecho (8mm) + holgura extra para distribución fluida
      const requiredPageW = Math.ceil(sheetTotalMinWidth + 16 + colCount * 1.2);
      if (requiredPageW > maxRequiredPageWidth) {
        maxRequiredPageWidth = requiredPageW;
      }

      preparedSheets.push({
        headers,
        bodyRows,
        colMeta,
        columnStyles,
        isLastRowTotal,
        fontSize,
        headFontSize,
        cellPadding,
      });
    }

    // 5. Determinar dimensiones de página (A4 Horizontal 297x210 o Hoja Ancha Adaptable Widescreen/A3 cuando hay muchas columnas)
    const finalPageWidth = Math.max(297, maxRequiredPageWidth);
    const finalPageHeight = finalPageWidth > 297
      ? Math.min(297, Math.max(210, Math.round(finalPageWidth * 0.56)))
      : 210;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [finalPageWidth, finalPageHeight],
      compress: true,
    });

    for (let idx = 0; idx < preparedSheets.length; idx++) {
      const sheetData = preparedSheets[idx];
      if (idx > 0) {
        doc.addPage([finalPageWidth, finalPageHeight], "landscape");
      }

      doc.autoTable({
        startY: 22.2,
        margin: { top: 22.2, right: 8, bottom: 12.5, left: 8 },
        tableWidth: "auto",
        head: [sheetData.headers],
        body: sheetData.bodyRows,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: sheetData.fontSize,
          cellPadding: sheetData.cellPadding,
          textColor: [17, 17, 17],
          lineColor: [230, 228, 236],
          lineWidth: 0.12,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [208, 0, 112], // #D00070 Magenta oficial Bezza Pay
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: sheetData.headFontSize,
          halign: "center",
          valign: "middle",
          lineColor: [185, 0, 98],
          lineWidth: 0.15,
        },
        alternateRowStyles: {
          fillColor: [242, 242, 242], // #F2F2F2 Filas intercaladas
        },
        columnStyles: sheetData.columnStyles,
        didParseCell: function (data) {
          if (data.section === "body") {
            const isTotalRow = sheetData.isLastRowTotal && data.row.index === sheetData.bodyRows.length - 1;
            if (isTotalRow) {
              // Fila final TOTAL con estilo idéntico al encabezado (#D00070, letras blancas y negrita)
              data.cell.styles.fillColor = [208, 0, 112];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.lineColor = [185, 0, 98];
              if (data.column.index === 0) {
                data.cell.styles.halign = "center";
              }
            } else {
              // Destacar columna Monto Neto en rosa suave (#E8CAD0)
              const cMeta = sheetData.colMeta[data.column.index];
              if (cMeta && cMeta.isNetoCol) {
                data.cell.styles.fillColor = [232, 202, 208];
                data.cell.styles.fontStyle = "bold";
              }
            }
          }
        },
      });
    }

    // Estampar encabezado compacto y pie de página con numeración exacta ("Página X de Y") en todas las hojas
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawBezzaPdfHeaderAndFooter(
        doc,
        p,
        totalPages,
        processedReportMeta,
        logoDataUrl,
        gradDataUrl,
        emissionDateStr
      );
    }

    doc.save(downloadPdfFileName);
  } catch (err) {
    console.error("[ReportePro] Error al generar el PDF:", err);
    alert("No se pudo generar el archivo PDF.\nError: " + err.message);
  } finally {
    if (downloadPdfBtn) {
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.innerHTML = originalBtnHtml;
    }
  }
}


/* =====================================================
   SECCION 8: GESTION DE EVENTOS Y ENTRADAS DEL USUARIO
   ===================================================== */

/**
 * Valida que el archivo sea un Excel XLSX e inicia el procesamiento.
 */
function handleFile(file) {
  fileInput.value = "";
  const isValidName = file.name.toLowerCase().endsWith(".xlsx");
  const isValidMime = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isValidName && !isValidMime) {
    errorMessage.textContent = `Tipo de archivo no valido: "${escapeHtml(file.name)}". Por favor carga un archivo .xlsx.`;
    showState("error");
    return;
  }

  processFile(file);
}

/* --- Drag & Drop Global y en Tarjeta --- */
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

let dragCounter = 0;

processorCard.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  processorCard.classList.add("drag-over");
});

processorCard.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!processorCard.classList.contains("drag-over")) {
    processorCard.classList.add("drag-over");
  }
});

processorCard.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0 || !processorCard.contains(e.relatedTarget)) {
    dragCounter = 0;
    processorCard.classList.remove("drag-over");
  }
});

processorCard.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  processorCard.classList.remove("drag-over");
  if (dropzone) dropzone.classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
});

/* --- Eventos de Clic y Selección de Archivo --- */
dropzone.addEventListener("click", (e) => {
  if (e.target !== fileInput) fileInput.click();
});
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

/* --- Evento del Switch Retención IIBB --- */
if (iibbToggle) {
  iibbToggle.addEventListener("change", () => {
    if (alicuotaWrap) {
      alicuotaWrap.style.display = iibbToggle.checked ? "flex" : "none";
      if (iibbToggle.checked) {
        checkBotHealth();
        // El usuario probablemente va a cargar un archivo: ir despertando el Bot
        if (selectedIibbMethod === "auto") warmBot();
      }
    }
  });
}

/* --- Eventos de Selección de Sistema (SIRTAC / SIRCREB / SIRCUPA) --- */
if (sisBtnSirtac)  sisBtnSirtac.addEventListener("click", () => setSistema("sirtac"));
if (sisBtnSircreb) sisBtnSircreb.addEventListener("click", () => setSistema("sircreb"));
if (sisBtnSircupa) sisBtnSircupa.addEventListener("click", () => setSistema("sircupa"));

/* --- Eventos de Modo de Retención IIBB (Automático vs Manual) --- */
if (btnIibbModeAuto)   btnIibbModeAuto.addEventListener("click", () => setIibbMethod("auto"));
if (btnIibbModeManual) btnIibbModeManual.addEventListener("click", () => setIibbMethod("manual"));

/* --- Botones de Descarga y Reinicio --- */
downloadBtn.addEventListener("click", downloadFile);
if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", downloadPdfFile);
resetBtn.addEventListener("click", reset);
errorResetBtn.addEventListener("click", reset);

/* --- Clic en Marca/Logo para reiniciar --- */
if (headerBrand) {
  headerBrand.addEventListener("click", () => {
    if (!stateIdle.hidden) return;
    reset();
  });

  headerBrand.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!stateIdle.hidden) return;
      reset();
    }
  });
}

/* --- Inicialización de chequeo del Bot al cargar la página --- */
checkBotHealth();
// Chequeo periódico de salud cada 20 s (mantiene el estado activo sin sobrecargar el túnel)
setInterval(checkBotHealth, 20000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkBotHealth();
  }
});
