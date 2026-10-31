/**
 * ============================================================================
 * BEZZA PAY — GENERADOR DE COMPROBANTES DE RETENCIONES IIBB (MENSUAL)
 * Archivo: retenciones.js
 * Descripción: Procesa el reporte de transacciones con retenciones IIBB,
 *              agrupa las ventas acreditadas por mes calendario cerrado
 *              (excluyendo el mes en curso por defecto) y genera constancias
 *              minimalistas en formato PDF e Imagen PNG de alta resolución.
 * ============================================================================
 */

/* ============================================================================
   SECCIÓN 1: RECURSOS VECTORIALES Y CONSTANTES
   ============================================================================ */

const BEZZA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 57.9">
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

const BEZZA_LOGO_URI = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(BEZZA_LOGO_SVG);

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let logoImage = null;
let logoReady = false;
let cachedPdfLogoDataUrl = null;
let cachedPdfGradDataUrl = null;

function initLogo() {
  logoImage = new Image();
  logoImage.onload = () => {
    logoReady = true;
    try {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 232;
      c.getContext("2d").drawImage(logoImage, 0, 0, c.width, c.height);
      cachedPdfLogoDataUrl = c.toDataURL("image/png");
    } catch (e) {}
    renderAllCanvases();
  };
  logoImage.src = BEZZA_LOGO_URI;
}

function getGradientPngDataUrl() {
  if (cachedPdfGradDataUrl) return cachedPdfGradDataUrl;
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 24;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, "#c514a7");
  grad.addColorStop(1, "#f20027");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  cachedPdfGradDataUrl = c.toDataURL("image/png");
  return cachedPdfGradDataUrl;
}

/* ============================================================================
   SECCIÓN 2: ESTADO Y ELEMENTOS DEL DOM
   ============================================================================ */

let currentWorkbook = null;
let currentFileName = "";
let allExtractedRecords = []; // Todas las ventas acreditadas del archivo
let activeMonthlyConstancias = []; // Meses filtrados listos para mostrar
let activeModalMonthKey = null;

const dom = {
  cardContainer: document.getElementById("retCardContainer"),
  stateIdle: document.getElementById("retStateIdle"),
  stateResults: document.getElementById("retStateResults"),
  dropzone: document.getElementById("retDropzone"),
  fileInput: document.getElementById("retFileInput"),
  toggleIdle: document.getElementById("includeCurrentMonthToggle"),
  toggleResults: document.getElementById("includeCurrentMonthToggleResults"),
  razonSocialInput: document.getElementById("retRazonSocial"),
  cuitInput: document.getElementById("retCuit"),
  btnDownloadAllPdf: document.getElementById("btnDownloadAllPdf"),
  btnDownloadAllPdfText: document.getElementById("btnDownloadAllPdfText"),
  btnDownloadAllPng: document.getElementById("btnDownloadAllPng"),
  btnDownloadAllPngText: document.getElementById("btnDownloadAllPngText"),
  btnReset: document.getElementById("btnRetReset"),
  omittedNotice: document.getElementById("retOmittedNotice"),
  emptyMonths: document.getElementById("retEmptyMonths"),
  emptyDesc: document.getElementById("retEmptyDesc"),
  monthsGrid: document.getElementById("retMonthsGrid"),
  modal: document.getElementById("retModal"),
  modalClose: document.getElementById("retModalClose"),
  modalTitle: document.getElementById("retModalTitle"),
  modalImg: document.getElementById("retModalImg"),
  btnModalPdf: document.getElementById("btnRetModalPdf"),
  btnModalPng: document.getElementById("btnRetModalPng"),
  toast: document.getElementById("retToast"),
};

/* ============================================================================
   SECCIÓN 3: UTILIDADES DE FORMATO Y FECHAS
   ============================================================================ */

function normalizeStr(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatCuit(cuitRaw) {
  if (!cuitRaw) return "";
  const digits = String(cuitRaw).replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return String(cuitRaw).trim();
}

function formatArs(num) {
  const val = typeof num === "number" && !isNaN(num) ? num : 0;
  const abs = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));
  return val < 0 ? `-$ ${abs}` : `$ ${abs}`;
}

function formatPercent(num) {
  const val = typeof num === "number" && !isNaN(num) ? num : 0;
  return `${val.toFixed(2).replace(".", ",")} %`;
}

function parseMoneyValue(v) {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  let str = String(v).replace(/[$\s]/g, "").trim();
  if (!str) return 0;
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function excelSerialToLocalDate(serial) {
  const wholeDays = Math.floor(serial);
  const frac = serial - wholeDays;
  const utcMs = (wholeDays - 25569) * 86400 * 1000;
  const temp = new Date(utcMs);
  const totalSeconds = Math.round(frac * 86400);
  return new Date(
    temp.getUTCFullYear(),
    temp.getUTCMonth(),
    temp.getUTCDate(),
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60
  );
}

function parseCellDate(v) {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" || (!isNaN(v) && !isNaN(parseFloat(v)) && /^\d+(\.\d+)?$/.test(String(v).trim()))) {
    const num = typeof v === "number" ? v : parseFloat(v);
    if (num > 10000) return excelSerialToLocalDate(num);
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
  }
  return null;
}

/**
 * Obtiene el rango completo del mes calendario (siempre del día 01 al último día del mes).
 */
function getMonthFullPeriod(anio, mes) {
  const lastDay = new Date(anio, mes, 0).getDate();
  const mm = String(mes).padStart(2, "0");
  const ddLast = String(lastDay).padStart(2, "0");
  const monthName = MONTH_NAMES_ES[mes - 1] || `Mes ${mm}`;
  return {
    periodKey: `${anio}-${mm}`,
    monthTitle: `${monthName} ${anio}`,
    startDateStr: `01/${mm}/${anio}`,
    endDateStr: `${ddLast}/${mm}/${anio}`,
    rangeStr: `01/${mm}/${anio} al ${ddLast}/${mm}/${anio}`,
  };
}

let toastTimeout = null;
function showToast(msg) {
  if (!dom.toast) return;
  dom.toast.textContent = msg;
  dom.toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 2600);
}

/* ============================================================================
   SECCIÓN 4: LECTURA DEL EXCEL Y AGRUPACIÓN MENSUAL DE RETENCIONES
   ============================================================================ */

function handleExcelFile(file) {
  if (!file) return;
  dom.fileInput.value = "";
  const isValid = file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isValid) {
    alert(`El archivo "${file.name}" no es un archivo Excel (.xlsx) válido.`);
    return;
  }

  currentFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      currentWorkbook = XLSX.read(data, { type: "array", cellNF: true });
      extractRecordsFromWorkbook(currentWorkbook, file.name);
      rebuildMonthlyConstancias();
      dom.stateIdle.hidden = true;
      dom.stateResults.hidden = false;
    } catch (err) {
      console.error("[Retenciones] Error al leer el archivo:", err);
      alert("No se pudo procesar el archivo Excel. Verificá que sea un reporte válido.");
    }
  };
  reader.readAsArrayBuffer(file);
}

function extractRecordsFromWorkbook(workbook, fileName) {
  allExtractedRecords = [];
  let detectedCuit = "";
  let detectedRazonSocial = "";

  // Intentar detectar CUIT desde el nombre del archivo (ej: Reporte_Transacciones_30-71211108-5.xlsx)
  const fileMatchCuit = String(fileName).match(/(20|23|24|27|30|33|34)[- ]?\d{8}[- ]?\d|\b\d{11}\b/);
  if (fileMatchCuit) {
    detectedCuit = formatCuit(fileMatchCuit[0]);
  }

  const now = new Date();
  const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const headerRow = range.s.r;

    let dateLibCol = -1;
    let dateFallbackCol = -1;
    let brutoCol = -1;
    let iibbCol = -1;
    let cuitCol = -1;
    let razonCol = -1;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (!cell || cell.v === undefined) continue;
      const norm = normalizeStr(cell.v);

      if (dateLibCol === -1 && (norm.includes("liberacion") || norm.includes("acreditacion")) && norm.includes("fecha")) {
        dateLibCol = c;
      }
      if (dateFallbackCol === -1 && (norm === "fecha" || norm.includes("fecha"))) {
        dateFallbackCol = c;
      }
      if (brutoCol === -1 && (norm === "monto bruto" || (norm.includes("monto") && norm.includes("bruto")))) {
        brutoCol = c;
      }
      if (iibbCol === -1 && (
        norm === "retencion iibb" ||
        norm === "retencion iibb convenio" ||
        norm === "ret. iibb" ||
        (norm.includes("retencion") && norm.includes("iibb") && !norm.includes("penalidad") && !norm.includes("descripcion"))
      )) {
        iibbCol = c;
      }
      if (cuitCol === -1 && (norm === "cuit" || norm === "cuil" || norm.includes("cuit") || norm.includes("cuil"))) {
        cuitCol = c;
      }
      if (razonCol === -1 && (norm === "razon social" || norm === "titular" || norm === "comercio nombre" || norm === "nombre comercio")) {
        razonCol = c;
      }
    }

    const effectiveDateCol = dateLibCol !== -1 ? dateLibCol : dateFallbackCol;
    if (effectiveDateCol === -1 || brutoCol === -1) continue;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      // Ignorar fila TOTAL o Filtros aplicados
      const firstCell = ws[XLSX.utils.encode_cell({ r, c: range.s.c })];
      if (firstCell && firstCell.v !== undefined) {
        const firstVal = String(firstCell.v).trim().toLowerCase();
        if (firstVal === "total" || firstVal === "totales" || firstVal.startsWith("filtros aplicados")) {
          continue;
        }
      }

      if (!detectedCuit && cuitCol !== -1) {
        const cCell = ws[XLSX.utils.encode_cell({ r, c: cuitCol })];
        if (cCell && cCell.v !== undefined && String(cCell.v).trim() !== "") {
          detectedCuit = formatCuit(cCell.v);
        }
      }

      if (!detectedRazonSocial && razonCol !== -1) {
        const rCell = ws[XLSX.utils.encode_cell({ r, c: razonCol })];
        if (rCell && rCell.v !== undefined && String(rCell.v).trim() !== "") {
          detectedRazonSocial = String(rCell.v).trim().toUpperCase();
        }
      }

      const dateCell = ws[XLSX.utils.encode_cell({ r, c: effectiveDateCol })];
      const parsedDate = dateCell ? parseCellDate(dateCell.v) : null;
      if (!parsedDate || parsedDate.getTime() > todayCutoff.getTime()) {
        // Solo ventas efectivamente acreditadas
        continue;
      }

      const brutoCell = ws[XLSX.utils.encode_cell({ r, c: brutoCol })];
      const montoBruto = brutoCell ? parseMoneyValue(brutoCell.v) : 0;

      let retencionIIBB = 0;
      if (iibbCol !== -1) {
        const iibbCell = ws[XLSX.utils.encode_cell({ r, c: iibbCol })];
        retencionIIBB = iibbCell ? parseMoneyValue(iibbCell.v) : 0;
      }

      allExtractedRecords.push({
        date: parsedDate,
        anio: parsedDate.getFullYear(),
        mes: parsedDate.getMonth() + 1,
        montoBruto,
        retencionIIBB,
      });
    }
  }

  dom.cuitInput.value = detectedCuit || "";
  dom.razonSocialInput.value = detectedRazonSocial || "";
}

/**
 * Agrupa los registros por mes calendario y aplica la regla de excluir el mes actual
 * si aún no finalizó (a menos que el switch opcional esté activado).
 */
function rebuildMonthlyConstancias() {
  const includeCurrent = dom.toggleResults ? dom.toggleResults.checked : false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const isCurrentMonthFinished = (now.getDate() === lastDayOfCurrentMonth && now.getHours() >= 23);
  const currentPeriodKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const monthsMap = new Map();
  let omittedCurrentMonthCount = 0;
  const currentMonthName = `${MONTH_NAMES_ES[currentMonth - 1]} ${currentYear}`;

  for (const rec of allExtractedRecords) {
    const pKey = `${rec.anio}-${String(rec.mes).padStart(2, "0")}`;

    // Excluir mes actual si no terminó y el switch no está activo
    if (pKey >= currentPeriodKey && !isCurrentMonthFinished && !includeCurrent) {
      omittedCurrentMonthCount++;
      continue;
    }

    if (!monthsMap.has(pKey)) {
      const periodInfo = getMonthFullPeriod(rec.anio, rec.mes);
      monthsMap.set(pKey, {
        ...periodInfo,
        anio: rec.anio,
        mes: rec.mes,
        ventasCount: 0,
        totalBruto: 0,
        totalRetenido: 0,
      });
    }

    const mData = monthsMap.get(pKey);
    mData.ventasCount++;
    mData.totalBruto = Math.round((mData.totalBruto + rec.montoBruto) * 100) / 100;
    mData.totalRetenido = Math.round((mData.totalRetenido + rec.retencionIIBB) * 100) / 100;
  }

  // Calcular alícuota efectiva de cada mes y ordenar cronológicamente
  activeMonthlyConstancias = Array.from(monthsMap.values())
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .map((m) => {
      let alicuotaPct = 0;
      if (m.totalBruto > 0 && m.totalRetenido > 0) {
        alicuotaPct = Math.round((m.totalRetenido / m.totalBruto) * 10000) / 100;
      }
      return {
        ...m,
        alicuotaPct,
      };
    });

  // Mostrar aviso si se omitieron operaciones del mes en curso
  if (omittedCurrentMonthCount > 0 && !includeCurrent) {
    dom.omittedNotice.hidden = false;
    dom.omittedNotice.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span><strong>${currentMonthName}</strong> omitido por estar en curso (${omittedCurrentMonthCount} venta${omittedCurrentMonthCount === 1 ? "" : "s"} acreditada${omittedCurrentMonthCount === 1 ? "" : "s"}).</span>
    `;
  } else {
    dom.omittedNotice.hidden = true;
  }

  // Actualizar textos de botones globales
  const count = activeMonthlyConstancias.length;
  if (dom.btnDownloadAllPdfText) {
    dom.btnDownloadAllPdfText.textContent = count > 1 ? `Descargar Todas (${count} PDF)` : "Descargar PDF";
  }
  if (dom.btnDownloadAllPngText) {
    dom.btnDownloadAllPngText.textContent = count > 1 ? `Descargar Todas (${count} PNG)` : "Descargar PNG";
  }
  if (dom.btnDownloadAllPdf) dom.btnDownloadAllPdf.disabled = count === 0;
  if (dom.btnDownloadAllPng) dom.btnDownloadAllPng.disabled = count === 0;

  // Renderizar tarjetas o estado vacío
  if (count === 0) {
    dom.emptyMonths.hidden = false;
    dom.monthsGrid.innerHTML = "";
    if (omittedCurrentMonthCount > 0) {
      dom.emptyDesc.textContent = `El archivo contiene ${omittedCurrentMonthCount} venta(s) acreditada(s) de ${currentMonthName}, pero el mes actual aún no finalizó. Activá "Incluir mes en curso" arriba a la derecha si necesitás generar la constancia igualmente.`;
    } else {
      dom.emptyDesc.textContent = "No se encontraron ventas acreditadas válidas en este archivo.";
    }
  } else {
    dom.emptyMonths.hidden = true;
    buildMonthCardsDOM();
    renderAllCanvases();
  }
}

/* ============================================================================
   SECCIÓN 5: CONSTRUCCIÓN DE TARJETAS Y RENDERIZADO EN CANVAS 2D (RETINA 2X)
   ============================================================================ */

function buildMonthCardsDOM() {
  dom.monthsGrid.innerHTML = activeMonthlyConstancias.map((m) => `
    <div class="ret-month-card" data-period="${m.periodKey}">
      <div class="ret-month-card__header">
        <div class="ret-month-card__title-group">
          <span class="ret-month-card__badge">${m.monthTitle}</span>
          <span class="ret-month-card__period">${m.rangeStr}</span>
        </div>
        <div class="ret-month-card__actions">
          <button type="button" class="btn-comp btn-comp--primary btn-ret-sm" data-action="pdf" data-period="${m.periodKey}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>PDF</span>
          </button>
          <button type="button" class="btn-comp btn-comp--secondary btn-ret-sm" data-action="png" data-period="${m.periodKey}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>PNG</span>
          </button>
          <button type="button" class="btn-comp btn-comp--outline btn-ret-sm" data-action="copy" data-period="${m.periodKey}" title="Copiar imagen al portapapeles">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copiar</span>
          </button>
        </div>
      </div>
      <div class="ret-canvas-wrap" data-action="zoom" data-period="${m.periodKey}" title="Clic para ampliar vista previa">
        <canvas id="canvas-${m.periodKey}"></canvas>
      </div>
    </div>
  `).join("");
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function truncateCanvasText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + "...").width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + "...";
}

/**
 * Renderiza la constancia minimalista de un mes en un elemento <canvas> en calidad Retina 2x.
 */
function renderConstanciaCanvas(canvas, monthData) {
  if (!canvas || !monthData) return;
  const ctx = canvas.getContext("2d");

  const W = 760;
  const H = 410;
  const SCALE = 2;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  ctx.save();
  ctx.scale(SCALE, SCALE);

  // 1. Fondo blanco y marco perimetral
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#EDEDF2";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, W, H);

  // 2. Barra superior con degradado Bezza Pay (#c514a7 -> #f20027)
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#c514a7");
  grad.addColorStop(1, "#f20027");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 7);

  // 3. Encabezado Minimalista: Logo Bezza Pay + Título "COMPROBANTE DE RETENCIONES IIBB"
  const padX = 34;
  const logoW = 98;
  const logoH = 47.3;

  if (logoReady && logoImage) {
    ctx.drawImage(logoImage, padX, 26, logoW, logoH);
  } else {
    ctx.font = '900 22px "Public Sans", sans-serif';
    ctx.fillStyle = "#D00070";
    ctx.textAlign = "left";
    ctx.fillText("bezza pay", padX, 56);
  }

  // Línea vertical junto al logo
  ctx.beginPath();
  ctx.moveTo(padX + logoW + 18, 28);
  ctx.lineTo(padX + logoW + 18, 72);
  ctx.strokeStyle = "#E5E5EE";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Título principal
  ctx.textAlign = "left";
  ctx.font = '800 18px "Public Sans", sans-serif';
  ctx.fillStyle = "#111111";
  ctx.fillText("COMPROBANTE DE RETENCIONES IIBB", padX + logoW + 34, 56);

  // Línea separadora de encabezado
  ctx.beginPath();
  ctx.moveTo(padX, 92);
  ctx.lineTo(W - padX, 92);
  ctx.strokeStyle = "#F0EFF6";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Bloque minimalista de datos del comercio (Razón Social, CUIT, Período)
  const infoY = 110;
  const infoH = 74;
  const innerW = W - padX * 2;

  drawRoundedRect(ctx, padX, infoY, innerW, infoH, 10);
  ctx.fillStyle = "#FAF9FE";
  ctx.fill();
  ctx.strokeStyle = "#EDEDF6";
  ctx.lineWidth = 1;
  ctx.stroke();

  const razonVal = (dom.razonSocialInput.value || "").trim().toUpperCase() || "-";
  const cuitVal = formatCuit((dom.cuitInput.value || "").trim()) || "-";

  // Columna 1: Razón Social
  ctx.textAlign = "left";
  ctx.font = '700 10.5px "Public Sans", sans-serif';
  ctx.fillStyle = "#D00070";
  ctx.fillText("RAZÓN SOCIAL", padX + 20, infoY + 27);

  ctx.font = '800 14.5px "Public Sans", sans-serif';
  ctx.fillStyle = "#111111";
  ctx.fillText(truncateCanvasText(ctx, razonVal, 290), padX + 20, infoY + 51);

  // Columna 2: CUIT / CUIL
  const col2X = padX + 330;
  ctx.font = '700 10.5px "Public Sans", sans-serif';
  ctx.fillStyle = "#D00070";
  ctx.fillText("CUIT / CUIL", col2X, infoY + 27);

  ctx.font = '800 14.5px "Public Sans", sans-serif';
  ctx.fillStyle = "#111111";
  ctx.fillText(cuitVal, col2X, infoY + 51);

  // Columna 3: Período (inicio a fin de mes)
  const col3X = padX + 495;
  ctx.font = '700 10.5px "Public Sans", sans-serif';
  ctx.fillStyle = "#D00070";
  ctx.fillText("PERÍODO", col3X, infoY + 27);

  ctx.font = '800 14px "Public Sans", sans-serif';
  ctx.fillStyle = "#111111";
  ctx.fillText(monthData.rangeStr, col3X, infoY + 51);

  // 5. Tabla Consolidada del Mes (Estética Bezza Pay: cabecera #D00070 y columna Total Retenido #E8CAD0)
  const tableY = 206;
  const headH = 38;
  const rowH = 48;

  const cols = [
    { label: "Período", width: 192, align: "center", val: monthData.rangeStr },
    { label: "Ventas Acreditadas", width: 126, align: "center", val: String(monthData.ventasCount) },
    { label: "Total Monto Bruto", width: 150, align: "right", val: formatArs(monthData.totalBruto) },
    { label: "Alícuota", width: 84, align: "center", val: formatPercent(monthData.alicuotaPct) },
    { label: "Total Retenido", width: 140, align: "right", val: formatArs(monthData.totalRetenido), isHighlight: true },
  ];

  // Fondo cabecera #D00070
  ctx.fillStyle = "#D00070";
  ctx.fillRect(padX, tableY, innerW, headH);

  // Dibujar celdas de cabecera y fila de datos
  let curX = padX;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];

    // Fondo de celda de datos
    ctx.fillStyle = col.isHighlight ? "#E8CAD0" : "#FFFFFF";
    ctx.fillRect(curX, tableY + headH, col.width, rowH);

    // Bordes de celda de datos
    ctx.strokeStyle = "#E6E4EC";
    ctx.lineWidth = 1;
    ctx.strokeRect(curX, tableY + headH, col.width, rowH);

    // Separador sutil en cabecera
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(curX, tableY);
      ctx.lineTo(curX, tableY + headH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Texto de cabecera
    ctx.font = '700 12px "Public Sans", sans-serif';
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(col.label, curX + col.width / 2, tableY + 23);

    // Texto de fila de datos
    ctx.font = col.isHighlight ? '800 14px "Public Sans", sans-serif' : '600 13.5px "Public Sans", sans-serif';
    ctx.fillStyle = "#111111";

    if (col.align === "right") {
      ctx.textAlign = "right";
      ctx.fillText(col.val, curX + col.width - 14, tableY + headH + 29);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(col.val, curX + col.width / 2, tableY + headH + 29);
    }

    curX += col.width;
  }

  // 6. Barra final minimalista de Total Retenido
  const totalBoxY = 316;
  const totalBoxH = 58;

  drawRoundedRect(ctx, padX, totalBoxY, innerW, totalBoxH, 10);
  ctx.fillStyle = "#D00070";
  ctx.fill();

  ctx.textAlign = "left";
  ctx.font = '800 13px "Public Sans", sans-serif';
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("TOTAL RETENCIÓN IIBB", padX + 22, totalBoxY + 34);

  ctx.textAlign = "right";
  ctx.font = '900 22px "Public Sans", sans-serif';
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(formatArs(monthData.totalRetenido), padX + innerW - 22, totalBoxY + 37);

  ctx.restore();
}

function renderAllCanvases() {
  for (const m of activeMonthlyConstancias) {
    const canvas = document.getElementById(`canvas-${m.periodKey}`);
    if (canvas) {
      renderConstanciaCanvas(canvas, m);
    }
  }
}

/* ============================================================================
   SECCIÓN 6: EXPORTACIÓN A PDF E IMAGEN PNG
   ============================================================================ */

/**
 * Dibuja una página de Comprobante de Retenciones IIBB dentro de un documento jsPDF.
 */
function renderMonthPageInPdf(doc, monthData, logoDataUrl, gradDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const marginX = 12;
  const innerW = pageWidth - marginX * 2;

  // 1. Barra superior con degradado Bezza Pay (#c514a7 -> #f20027)
  if (gradDataUrl) {
    doc.addImage(gradDataUrl, "PNG", 0, 0, pageWidth, 3.2);
  } else {
    doc.setFillColor(208, 0, 112);
    doc.rect(0, 0, pageWidth, 3.2, "F");
  }

  // 2. Encabezado: Logo Bezza Pay + Título
  const logoW = 26;
  const logoH = 12.54;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", marginX, 8, logoW, logoH);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(208, 0, 112);
    doc.text("bezza pay", marginX, 16);
  }

  // Divisor vertical
  doc.setDrawColor(226, 226, 234);
  doc.setLineWidth(0.35);
  doc.line(marginX + logoW + 4.5, 8.5, marginX + logoW + 4.5, 20);

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(17, 17, 17);
  doc.text("COMPROBANTE DE RETENCIONES IIBB", marginX + logoW + 9, 15.8);

  // Línea separadora
  doc.setDrawColor(235, 234, 242);
  doc.setLineWidth(0.3);
  doc.line(marginX, 24.5, pageWidth - marginX, 24.5);

  // 3. Bloque de datos del comercio (Razón Social, CUIT, Período)
  const boxY = 29;
  const boxH = 20;
  doc.setFillColor(250, 249, 254);
  doc.setDrawColor(237, 237, 246);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, boxY, innerW, boxH, 2.5, 2.5, "FD");

  const razonVal = (dom.razonSocialInput.value || "").trim().toUpperCase() || "-";
  const cuitVal = formatCuit((dom.cuitInput.value || "").trim()) || "-";

  // Razón Social
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(208, 0, 112);
  doc.text("RAZÓN SOCIAL", marginX + 5, boxY + 7.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text(razonVal.slice(0, 38), marginX + 5, boxY + 14.2);

  // CUIT / CUIL
  const col2X = marginX + 86;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(208, 0, 112);
  doc.text("CUIT / CUIL", col2X, boxY + 7.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text(cuitVal, col2X, boxY + 14.2);

  // Período
  const col3X = marginX + 132;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(208, 0, 112);
  doc.text("PERÍODO", col3X, boxY + 7.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.8);
  doc.setTextColor(17, 17, 17);
  doc.text(monthData.rangeStr, col3X, boxY + 14.2);

  // 4. Tabla de Resumen Consolidado del Mes
  doc.autoTable({
    startY: 54,
    margin: { left: marginX, right: marginX },
    head: [["Período", "Ventas Acreditadas", "Total Monto Bruto", "Alícuota", "Total Retenido"]],
    body: [[
      monthData.rangeStr,
      String(monthData.ventasCount),
      formatArs(monthData.totalBruto),
      formatPercent(monthData.alicuotaPct),
      formatArs(monthData.totalRetenido),
    ]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 4,
      textColor: [17, 17, 17],
      lineColor: [230, 228, 236],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [208, 0, 112],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.2,
      halign: "center",
      lineColor: [185, 0, 98],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 48 },
      1: { halign: "center", cellWidth: 34 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "center", cellWidth: 26 },
      4: { halign: "right", cellWidth: 38, fillColor: [232, 202, 208], fontStyle: "bold" },
    },
  });

  // 5. Barra final de Total Retención IIBB
  const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 6 : 82;
  const totalBarH = 14;

  doc.setFillColor(208, 0, 112);
  doc.roundedRect(marginX, finalY, innerW, totalBarH, 2.5, 2.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL RETENCIÓN IIBB", marginX + 6, finalY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(formatArs(monthData.totalRetenido), pageWidth - marginX - 6, finalY + 9.3, { align: "right" });
}

function getFileCuitSuffix() {
  const cuitDigits = (dom.cuitInput.value || "").replace(/\D/g, "");
  return cuitDigits ? `_${cuitDigits}` : "";
}

function downloadSingleMonthPdf(periodKey) {
  const monthData = activeMonthlyConstancias.find((m) => m.periodKey === periodKey);
  if (!monthData) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [210, 112],
    compress: true,
  });

  const gradDataUrl = getGradientPngDataUrl();
  renderMonthPageInPdf(doc, monthData, cachedPdfLogoDataUrl, gradDataUrl);
  doc.save(`Comprobante_Retenciones_IIBB${getFileCuitSuffix()}_${monthData.periodKey}.pdf`);
  showToast(`PDF de ${monthData.monthTitle} descargado`);
}

function downloadAllMonthsPdf() {
  if (activeMonthlyConstancias.length === 0) return;
  if (activeMonthlyConstancias.length === 1) {
    downloadSingleMonthPdf(activeMonthlyConstancias[0].periodKey);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [210, 112],
    compress: true,
  });

  const gradDataUrl = getGradientPngDataUrl();
  activeMonthlyConstancias.forEach((m, idx) => {
    if (idx > 0) doc.addPage([210, 112], "landscape");
    renderMonthPageInPdf(doc, m, cachedPdfLogoDataUrl, gradDataUrl);
  });

  doc.save(`Comprobantes_Retenciones_IIBB${getFileCuitSuffix()}.pdf`);
  showToast(`Se descargaron ${activeMonthlyConstancias.length} constancias en PDF`);
}

function downloadSingleMonthPng(periodKey) {
  const monthData = activeMonthlyConstancias.find((m) => m.periodKey === periodKey);
  const canvas = document.getElementById(`canvas-${periodKey}`);
  if (!monthData || !canvas) return;

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `Comprobante_Retenciones_IIBB${getFileCuitSuffix()}_${monthData.periodKey}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Imagen PNG de ${monthData.monthTitle} descargada`);
}

function downloadAllMonthsPng() {
  if (activeMonthlyConstancias.length === 0) return;
  activeMonthlyConstancias.forEach((m, idx) => {
    setTimeout(() => {
      downloadSingleMonthPng(m.periodKey);
    }, idx * 250);
  });
}

async function copyMonthPngToClipboard(periodKey) {
  const monthData = activeMonthlyConstancias.find((m) => m.periodKey === periodKey);
  const canvas = document.getElementById(`canvas-${periodKey}`);
  if (!monthData || !canvas) return;

  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast(`Comprobante de ${monthData.monthTitle} copiado al portapapeles`);
  } catch (err) {
    console.warn("[Retenciones] No se pudo copiar al portapapeles:", err);
    showToast("Tu navegador no permitió copiar directo. Descargá el PNG.");
  }
}

function openZoomModal(periodKey) {
  const monthData = activeMonthlyConstancias.find((m) => m.periodKey === periodKey);
  const canvas = document.getElementById(`canvas-${periodKey}`);
  if (!monthData || !canvas) return;

  activeModalMonthKey = periodKey;
  dom.modalTitle.textContent = `Comprobante de Retenciones IIBB — ${monthData.monthTitle}`;
  dom.modalImg.src = canvas.toDataURL("image/png");
  dom.modal.classList.add("open");
  dom.modal.setAttribute("aria-hidden", "false");
}

function closeZoomModal() {
  dom.modal.classList.remove("open");
  dom.modal.setAttribute("aria-hidden", "true");
  activeModalMonthKey = null;
}

function resetView() {
  currentWorkbook = null;
  allExtractedRecords = [];
  activeMonthlyConstancias = [];
  dom.monthsGrid.innerHTML = "";
  dom.stateResults.hidden = true;
  dom.stateIdle.hidden = false;
}

/* ============================================================================
   SECCIÓN 7: EVENTOS E INICIALIZACIÓN
   ============================================================================ */

initLogo();

// Sincronizar los dos switches de "Incluir mes en curso"
dom.toggleIdle.addEventListener("change", () => {
  dom.toggleResults.checked = dom.toggleIdle.checked;
});

dom.toggleResults.addEventListener("change", () => {
  dom.toggleIdle.checked = dom.toggleResults.checked;
  if (currentWorkbook) {
    rebuildMonthlyConstancias();
  }
});

// Actualizar previsualizaciones en vivo al editar Razón Social o CUIT
dom.razonSocialInput.addEventListener("input", renderAllCanvases);
dom.cuitInput.addEventListener("input", renderAllCanvases);
dom.cuitInput.addEventListener("blur", () => {
  dom.cuitInput.value = formatCuit(dom.cuitInput.value);
  renderAllCanvases();
});

// Selección de archivo por clic o teclado
dom.dropzone.addEventListener("click", (e) => {
  if (e.target !== dom.fileInput) dom.fileInput.click();
});
dom.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    dom.fileInput.click();
  }
});
dom.fileInput.addEventListener("change", () => {
  if (dom.fileInput.files[0]) handleExcelFile(dom.fileInput.files[0]);
});

// Drag & Drop en toda la tarjeta
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

let dragCounter = 0;
dom.cardContainer.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  dom.cardContainer.classList.add("drag-over");
});
dom.cardContainer.addEventListener("dragover", (e) => {
  e.preventDefault();
  dom.cardContainer.classList.add("drag-over");
});
dom.cardContainer.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0 || !dom.cardContainer.contains(e.relatedTarget)) {
    dragCounter = 0;
    dom.cardContainer.classList.remove("drag-over");
  }
});
dom.cardContainer.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dom.cardContainer.classList.remove("drag-over");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleExcelFile(e.dataTransfer.files[0]);
  }
});

// Botones globales
dom.btnDownloadAllPdf.addEventListener("click", downloadAllMonthsPdf);
dom.btnDownloadAllPng.addEventListener("click", downloadAllMonthsPng);
dom.btnReset.addEventListener("click", resetView);

// Delegación de eventos en las tarjetas mensuales
dom.monthsGrid.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-action");
  const periodKey = actionEl.getAttribute("data-period");
  if (!periodKey) return;

  if (action === "pdf") downloadSingleMonthPdf(periodKey);
  else if (action === "png") downloadSingleMonthPng(periodKey);
  else if (action === "copy") copyMonthPngToClipboard(periodKey);
  else if (action === "zoom") openZoomModal(periodKey);
});

// Modal
dom.modalClose.addEventListener("click", closeZoomModal);
dom.modal.addEventListener("click", (e) => {
  if (e.target === dom.modal) closeZoomModal();
});
dom.btnModalPdf.addEventListener("click", () => {
  if (activeModalMonthKey) downloadSingleMonthPdf(activeModalMonthKey);
});
dom.btnModalPng.addEventListener("click", () => {
  if (activeModalMonthKey) downloadSingleMonthPng(activeModalMonthKey);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dom.modal.classList.contains("open")) {
    closeZoomModal();
  }
});

