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
let processedWorkbook  = null;
let downloadFileName   = "Reporte_Movimientos.xlsx";
let selectedReportMode = "auto"; // "auto" | "movimientos" | "transacciones"


/* =====================================================
   SECCION 4: REFERENCIAS AL DOM
   ===================================================== */
const processorCard   = document.getElementById("processorCard");
const dropzone        = document.getElementById("dropzone");
const fileInput       = document.getElementById("fileInput");
const stateIdle       = document.getElementById("stateIdle");
const stateLoading    = document.getElementById("stateLoading");
const stateSuccess    = document.getElementById("stateSuccess");
const stateError      = document.getElementById("stateError");
const headerBrand     = document.getElementById("headerBrand");
const saldoToggleCard = document.getElementById("saldoToggleCard");
const saldoToggle     = document.getElementById("saldoToggle");
const saldoTxNotice   = document.getElementById("saldoTxNotice");
const iibbToggleCard  = document.getElementById("iibbToggleCard");
const iibbToggle      = document.getElementById("iibbToggle");
const iibbMovNotice   = document.getElementById("iibbMovNotice");
const alicuotaWrap    = document.getElementById("alicuotaWrap");
const alicuotaSelect  = document.getElementById("alicuotaSelect");
const typeBtnAuto     = document.getElementById("typeBtnAuto");
const typeBtnMov      = document.getElementById("typeBtnMov");
const typeBtnTx       = document.getElementById("typeBtnTx");
const downloadBtn     = document.getElementById("downloadBtn");
const resetBtn        = document.getElementById("resetBtn");
const errorResetBtn   = document.getElementById("errorResetBtn");
const errorMessage    = document.getElementById("errorMessage");
const successMeta     = document.getElementById("successMeta");
const loadingStatus   = document.getElementById("loadingStatus");
const loadingSteps    = [
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
 * Actualiza el modo seleccionado en la interfaz (auto, movimientos, transacciones)
 * y ajusta la disponibilidad visual del toggle de saldo.
 */
function setReportMode(mode) {
  selectedReportMode = mode;
  [typeBtnAuto, typeBtnMov, typeBtnTx].forEach(btn => {
    if (!btn) return;
    const isActive = btn.dataset.type === mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");
  });

  if (mode === "transacciones") {
    // Saldo no aplica a Transacciones
    if (saldoToggleCard) saldoToggleCard.classList.add("disabled");
    if (saldoTxNotice) saldoTxNotice.style.display = "inline-flex";
    if (saldoToggle) saldoToggle.disabled = true;

    // Retención IIBB sí aplica a Transacciones
    if (iibbToggleCard) iibbToggleCard.classList.remove("disabled");
    if (iibbMovNotice) iibbMovNotice.style.display = "none";
    if (iibbToggle) iibbToggle.disabled = false;
    if (alicuotaWrap) alicuotaWrap.style.display = (iibbToggle && iibbToggle.checked) ? "flex" : "none";
  } else if (mode === "movimientos") {
    // Saldo sí aplica a Movimientos
    if (saldoToggleCard) saldoToggleCard.classList.remove("disabled");
    if (saldoTxNotice) saldoTxNotice.style.display = "none";
    if (saldoToggle) saldoToggle.disabled = false;

    // Retención IIBB no aplica a Movimientos
    if (iibbToggleCard) iibbToggleCard.classList.add("disabled");
    if (iibbMovNotice) iibbMovNotice.style.display = "inline-flex";
    if (iibbToggle) iibbToggle.disabled = true;
    if (alicuotaWrap) alicuotaWrap.style.display = "none";
  } else {
    // Modo automático: ambos toggles habilitados
    if (saldoToggleCard) saldoToggleCard.classList.remove("disabled");
    if (saldoTxNotice) saldoTxNotice.style.display = "none";
    if (saldoToggle) saldoToggle.disabled = false;

    if (iibbToggleCard) iibbToggleCard.classList.remove("disabled");
    if (iibbMovNotice) iibbMovNotice.style.display = "none";
    if (iibbToggle) iibbToggle.disabled = false;
    if (alicuotaWrap) alicuotaWrap.style.display = (iibbToggle && iibbToggle.checked) ? "flex" : "none";
  }
}

/**
 * Reinicia la aplicación al estado inicial manteniendo el modo seleccionado.
 */
function reset() {
  processedWorkbook = null;
  fileInput.value = "";
  successMeta.innerHTML = "";
  if (saldoToggle) saldoToggle.checked = false;
  if (iibbToggle) iibbToggle.checked = false;
  if (alicuotaWrap) alicuotaWrap.style.display = "none";
  if (alicuotaSelect) alicuotaSelect.value = "0.0350";
  setReportMode(selectedReportMode);
  showState("idle");
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
function calculateRetencionIIBB(worksheet, alicuotaRate) {
  if (!worksheet || !worksheet["!ref"]) return { calculatedCount: 0, pendingCount: 0 };
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

  // Si no se encontró columna de Fecha Liberación por nombre exacto, buscar alguna columna con "liberacion" o "acreditacion"
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

  // Si no se encontró columna de Retención IIBB en el archivo, crear una nueva columna al final
  if (iibbCol === -1) {
    iibbCol = range.e.c + 1;
    range.e.c = iibbCol;
    const headerAddr = XLSX.utils.encode_cell({ r: headerRow, c: iibbCol });
    worksheet[headerAddr] = { t: "s", v: "Retencion IIBB", w: "Retencion IIBB" };
    worksheet["!ref"] = XLSX.utils.encode_range(range);
  }

  if (brutoCol === -1 || netoCol === -1) {
    console.warn("[ReportePro] No se encontraron columnas de Monto Bruto o Monto Neto para calcular Retención IIBB.");
    return { calculatedCount: 0, pendingCount: 0 };
  }

  const now = new Date();
  const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let calculatedCount = 0;
  let pendingCount = 0;

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

    // Obtener cualquier valor previo de retención existente en la fila
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
    if (dateCol !== -1) {
      const dateAddr = XLSX.utils.encode_cell({ r, c: dateCol });
      const dateCell = worksheet[dateAddr];
      const parsedD = dateCell ? parseAccreditationDate(dateCell.v) : null;
      if (parsedD) {
        isAcreditada = (parsedD.getTime() <= todayCutoff.getTime());
      } else {
        isAcreditada = false;
      }
    }

    if (isAcreditada) {
      const retencion = Math.round(montoBruto * alicuotaRate * 100) / 100;
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
      // Venta pendiente de acreditación o futura: debe quedar vacía y no descontar del neto
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

  return { calculatedCount, pendingCount };
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

    // Determinar tipo de reporte activo (según selector o detección automática)
    let resolvedReportType = selectedReportMode;
    if (resolvedReportType === "auto") {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      resolvedReportType = detectReportType(firstSheet);
    }
    const isTransacciones = (resolvedReportType === "transacciones");

    // Opciones del cálculo de Retención IIBB (solo Transacciones)
    const shouldCalculateIIBB = isTransacciones && (iibbToggle ? iibbToggle.checked : false);
    const selectedAlicuota    = alicuotaSelect ? parseFloat(alicuotaSelect.value) : 0.0350;
    const alicuotaRate        = isNaN(selectedAlicuota) ? 0.0350 : selectedAlicuota;
    let totalIIBBCalculated   = 0;
    let totalIIBBPending      = 0;

    // PASO 2: Aplicación de reglas y transformaciones
    await advanceStep(1, "Aplicando traducciones y reglas...", 700);
    let totalTranslations = 0;
    let totalRenames = 0;
    let totalDeleted = 0;
    let cuilValue = null;

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];

      // Limpieza de filas excedentes/footers
      cleanFooterRows(ws);

      // Extracción de CUIL/CUIT
      if (!cuilValue) {
        cuilValue = extractCuilCuit(ws);
      }

      // Regla A: Traducciones de tipo
      const { translationCount } = applyTranslations(ws);
      totalTranslations += translationCount;

      // Regla B: Renombrado de columnas
      const { renameCount } = applyColumnRenames(ws);
      totalRenames += renameCount;

      // Cálculo de Retención IIBB Convenio (solo Transacciones si el switch está activo)
      if (shouldCalculateIIBB) {
        const { calculatedCount, pendingCount } = calculateRetencionIIBB(ws, alicuotaRate);
        totalIIBBCalculated += calculatedCount;
        totalIIBBPending += pendingCount;
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

    // Nombre del archivo de salida
    const cuilSuffix = cuilValue ? `_${cuilValue}` : "";
    if (isTransacciones) {
      downloadFileName = `Reporte_Transacciones${cuilSuffix}.xlsx`;
    } else {
      downloadFileName = `Reporte_Movimientos${cuilSuffix}.xlsx`;
    }

    const typeBadge = isTransacciones
      ? `<span class="badge badge--type-tx">Reporte de Transacciones</span>`
      : `<span class="badge badge--type-mov">Reporte de Movimientos</span>`;

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
        <span class="success-meta-value">${escapeHtml(downloadFileName)}</span>
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
        <span class="success-meta-value">${escapeHtml(cuilValue)}</span>
      </div>` : ""}
      <div class="success-meta-row">
        <span class="success-meta-label">Columna Saldo:</span>
        <span>${isTransacciones ? "Omitida (no aplica a Transacciones)" : ((saldoToggle && saldoToggle.checked) ? "Calculada e incorporada" : "No solicitada")}</span>
      </div>
      <div class="success-meta-row">
        <span class="success-meta-label">Retención IIBB:</span>
        <span>${!isTransacciones ? "Omitida (no aplica a Movimientos)" : (shouldCalculateIIBB ? `Calculada al ${(alicuotaRate * 100).toFixed(2).replace('.', ',')}% (${totalIIBBCalculated} venta(s) acreditada(s)${totalIIBBPending > 0 ? `, ${totalIIBBPending} pendiente(s)` : ""})` : "No solicitada")}</span>
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
    }
  });
}

/* --- Botones de Descarga y Reinicio --- */
downloadBtn.addEventListener("click", downloadFile);
resetBtn.addEventListener("click", reset);
errorResetBtn.addEventListener("click", reset);

/* --- Botones de Selección de Modo --- */
if (typeBtnAuto) typeBtnAuto.addEventListener("click", () => setReportMode("auto"));
if (typeBtnMov)  typeBtnMov.addEventListener("click", () => setReportMode("movimientos"));
if (typeBtnTx)   typeBtnTx.addEventListener("click", () => setReportMode("transacciones"));

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
