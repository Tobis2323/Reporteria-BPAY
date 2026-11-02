/* =====================================================
   CONSOLIDADOR DE MOVIMIENTOS Y TRANSACCIONES - consolidador.js
   Herramienta interna de conciliación Bezza Pay
   ===================================================== */

(function () {
  "use strict";

  /* =====================================================
     1. ESTADO GLOBAL
     ===================================================== */
  const state = {
    movFile: null,
    txFile: null,
    movData: null, // { fileName, cuit, rows, minDate, maxDate }
    txData: null,  // { fileName, cuit, razonSocial, rows, minDate, maxDate }
    consolidated: null, // { creditoList, debitoList, pendingTxs, stats }
    activeTab: "credito", // "credito" | "debito" | "pendientes"
    statusFilter: "all",  // "all" | "exact" | "diff" | "missing"
    searchQuery: "",
    openIds: new Set(),
  };

  /* =====================================================
     2. REFERENCIAS AL DOM
     ===================================================== */
  const headerBrand           = document.getElementById("headerBrand");
  const slotMovimientos       = document.getElementById("slotMovimientos");
  const slotTransacciones     = document.getElementById("slotTransacciones");
  const inputMovimientos      = document.getElementById("inputMovimientos");
  const inputTransacciones    = document.getElementById("inputTransacciones");
  const descMovimientos       = document.getElementById("descMovimientos");
  const descTransacciones     = document.getElementById("descTransacciones");
  const badgeMovimientos      = document.getElementById("badgeMovimientos");
  const badgeTransacciones    = document.getElementById("badgeTransacciones");
  const consolidadorError     = document.getElementById("consolidadorError");
  const consolidadorErrorText = document.getElementById("consolidadorErrorText");
  const consolidadorWorkspace = document.getElementById("consolidadorWorkspace");
  const merchantTitle         = document.getElementById("merchantTitle");
  const merchantMeta          = document.getElementById("merchantMeta");
  const btnResetFiles         = document.getElementById("btnResetFiles");
  const kpiGrid               = document.getElementById("kpiGrid");
  const tabBtnCredito         = document.getElementById("tabBtnCredito");
  const tabBtnDebito          = document.getElementById("tabBtnDebito");
  const tabBtnPendientes      = document.getElementById("tabBtnPendientes");
  const countTabCredito       = document.getElementById("countTabCredito");
  const countTabDebito        = document.getElementById("countTabDebito");
  const countTabPendientes    = document.getElementById("countTabPendientes");
  const filterBar             = document.getElementById("filterBar");
  const statusFilterPills     = document.getElementById("statusFilterPills");
  const pillCountAll          = document.getElementById("pillCountAll");
  const pillCountExact        = document.getElementById("pillCountExact");
  const pillCountDiff         = document.getElementById("pillCountDiff");
  const pillCountMissing      = document.getElementById("pillCountMissing");
  const searchInput           = document.getElementById("searchInput");
  const btnToggleExpandAll    = document.getElementById("btnToggleExpandAll");
  const acreditacionesList    = document.getElementById("acreditacionesList");
  const pendientesPanel       = document.getElementById("pendientesPanel");

  /* =====================================================
     3. UTILIDADES DE FORMATO Y FECHAS
     ===================================================== */
  function normalizeString(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNumber(val) {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    let s = String(val).replace(/[$\s]/g, "").trim();
    if (!s || s === "-") return 0;
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function formatARS(num, includeSign = false) {
    const n = typeof num === "number" && !isNaN(num) ? num : 0;
    const absVal = Math.abs(n);
    const formatted = absVal.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (n < -0.004) return `-$ ${formatted}`;
    if (includeSign && n > 0.004) return `+$ ${formatted}`;
    return `$ ${formatted}`;
  }

  function formatCuit(cuitStr) {
    const digits = String(cuitStr || "").replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
    }
    return cuitStr || "—";
  }

  /**
   * Convierte un serial de Excel o texto de fecha a un objeto Date en hora local
   * preservando año, mes, día, hora, minuto y segundo exactos del reporte.
   */
  function parseExcelDateTime(val) {
    if (val === undefined || val === null || val === "") return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

    if (typeof val === "number" && val > 20000 && val < 90000) {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dInfo = new Date(utcValue * 1000);
      const fractionalDay = val - Math.floor(val) + 0.0000001;
      let totalSeconds = Math.floor(86400 * fractionalDay);
      const seconds = totalSeconds % 60;
      totalSeconds -= seconds;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor(totalSeconds / 60) % 60;
      return new Date(
        dInfo.getUTCFullYear(),
        dInfo.getUTCMonth(),
        dInfo.getUTCDate(),
        hours,
        minutes,
        seconds
      );
    }

    const str = String(val).trim();
    if (!str) return null;

    // Formato DD/MM/YYYY [HH:mm[:ss]] o DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      const hh = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const mm = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      return new Date(year, month, day, hh, mm, ss);
    }

    // Formato YYYY-MM-DD [HH:mm[:ss]]
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const hh = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
      const mm = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
      const ss = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
      return new Date(year, month, day, hh, mm, ss);
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  function formatDateShort(d) {
    if (!d) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  function formatDateWithDay(d) {
    if (!d) return "—";
    return `${DAY_NAMES_SHORT[d.getDay()]} ${formatDateShort(d)}`;
  }

  function formatDateTime(d) {
    if (!d) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${DAY_NAMES_SHORT[d.getDay()]} ${formatDateShort(d)} • ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
  }

  function formatDateKey(d) {
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /**
   * Calcula la cantidad de días hábiles (Lunes a Viernes) transcurridos entre dos fechas.
   */
  function countBusinessDaysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (e <= s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur < e) {
      cur.setDate(cur.getDate() + 1);
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  }

  function formatPlazoClean(plazoRaw) {
    if (!plazoRaw) return "—";
    const s = String(plazoRaw).trim().toUpperCase();
    if (s === "INMEDIATO") return "INMEDIATO";
    return s.replace(/_/g, " ").replace("DIAS", "DÍAS");
  }

  function formatMedioPagoCompact(formaPago, marcaTarjeta) {
    let f = String(formaPago || "").trim()
      .replace(/\b1\s*CUOTAS?\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const m = String(marcaTarjeta || "").trim();
    if (!f && !m) return "—";
    if (!m || normalizeString(f).includes(normalizeString(m))) return f;
    if (!f) return m;
    return `${f} • ${m}`;
  }

  /* =====================================================
     4. DETECCIÓN Y LECTURA DE ARCHIVOS EXCEL
     ===================================================== */
  const TX_HEADERS_HINTS = [
    "fecha liberacion",
    "plazo de acreditacion",
    "liberacion categorico",
    "tipo venta",
    "marca tarjeta",
    "numero tarjeta",
    "num autorizacion",
    "forma pago",
    "modo entrada",
  ];

  const MOV_HEADERS_HINTS = [
    "cuit destino",
    "id venta / id coelsa",
    "id external",
    "cvu/cbu",
    "cuenta",
    "destino",
  ];

  function detectSheetReportType(rawRows) {
    if (!rawRows || rawRows.length === 0) return null;
    const headerRow = rawRows[0].map((h) => normalizeString(h));
    let txScore = 0;
    let movScore = 0;

    for (const h of headerRow) {
      if (TX_HEADERS_HINTS.some((hint) => h === hint || h.includes(hint))) txScore++;
      if (MOV_HEADERS_HINTS.some((hint) => h === hint || h.includes(hint))) movScore++;
    }

    if (txScore > movScore && txScore >= 1) return "transacciones";
    if (movScore > txScore && movScore >= 1) return "movimientos";
    return null;
  }

  function findColumnIndex(headersNorm, candidates) {
    for (const cand of candidates) {
      const idx = headersNorm.findIndex((h) => h === cand || h.includes(cand));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function parseMovimientosSheet(rawRows, fileName) {
    const headersNorm = rawRows[0].map((h) => normalizeString(h));
    const idxIdMov   = findColumnIndex(headersNorm, ["id movimiento", "id mov"]);
    const idxCuit    = headersNorm.findIndex((h) => h === "cuit" || h === "cuil");
    const idxTipo    = findColumnIndex(headersNorm, ["tipo"]);
    const idxFecha   = findColumnIndex(headersNorm, ["fecha"]);
    const idxBruto   = findColumnIndex(headersNorm, ["monto bruto"]);
    const idxNeto    = findColumnIndex(headersNorm, ["monto neto"]);
    const idxCom     = findColumnIndex(headersNorm, ["comision sin iva", "costo arancel monto"]);
    const idxIvaCom  = findColumnIndex(headersNorm, ["iva de la comision", "costo arancel iva monto"]);
    const idxCft     = findColumnIndex(headersNorm, ["cft sin iva", "costo financiero total monto"]);
    const idxIvaCft  = findColumnIndex(headersNorm, ["iva del cft", "costo financiero total iva monto"]);
    const idxIdVenta = findColumnIndex(headersNorm, ["id venta", "id coelsa", "id external"]);
    const idxDesc    = findColumnIndex(headersNorm, ["descripcion"]);

    let detectedCuit = "";
    const fnMatch = (fileName || "").match(/(\d{11})/);
    if (fnMatch) detectedCuit = fnMatch[1];

    const rows = [];
    let minDate = null;
    let maxDate = null;

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const firstCellNorm = normalizeString(row[0]);
      if (
        firstCellNorm === "total" ||
        firstCellNorm === "totales" ||
        firstCellNorm.startsWith("filtros aplicados")
      ) {
        continue;
      }

      const idMov = idxIdMov !== -1 ? String(row[idxIdMov] ?? "").trim() : "";
      if (!idMov || normalizeString(idMov) === "total") continue;

      if (!detectedCuit && idxCuit !== -1 && row[idxCuit]) {
        const digits = String(row[idxCuit]).replace(/\D/g, "");
        if (digits.length === 11) detectedCuit = digits;
      }

      const rawTipo = idxTipo !== -1 ? String(row[idxTipo] ?? "").trim() : "";
      const tipoNorm = normalizeString(rawTipo);
      const isVenta =
        tipoNorm === "ventas" ||
        tipoNorm === "venta" ||
        tipoNorm === "sales" ||
        tipoNorm === "sale";

      const fechaObj = idxFecha !== -1 ? parseExcelDateTime(row[idxFecha]) : null;
      if (fechaObj) {
        if (!minDate || fechaObj < minDate) minDate = fechaObj;
        if (!maxDate || fechaObj > maxDate) maxDate = fechaObj;
      }

      rows.push({
        rowIndex: r,
        idMovimiento: idMov,
        tipo: rawTipo,
        isVenta,
        fecha: fechaObj,
        fechaKey: formatDateKey(fechaObj),
        montoBruto: idxBruto !== -1 ? parseNumber(row[idxBruto]) : 0,
        montoNeto: idxNeto !== -1 ? parseNumber(row[idxNeto]) : 0,
        comisionSinIva: idxCom !== -1 ? parseNumber(row[idxCom]) : 0,
        ivaComision: idxIvaCom !== -1 ? parseNumber(row[idxIvaCom]) : 0,
        cftSinIva: idxCft !== -1 ? parseNumber(row[idxCft]) : 0,
        ivaCft: idxIvaCft !== -1 ? parseNumber(row[idxIvaCft]) : 0,
        idVentaCoelsa: idxIdVenta !== -1 ? String(row[idxIdVenta] ?? "").trim() : "",
        descripcion: idxDesc !== -1 ? String(row[idxDesc] ?? "").trim() : "",
      });
    }

    return {
      fileName,
      cuit: detectedCuit,
      rows,
      ventasRows: rows.filter((x) => x.isVenta),
      minDate,
      maxDate,
    };
  }

  function parseTransaccionesSheet(rawRows, fileName) {
    const headersNorm = rawRows[0].map((h) => normalizeString(h));
    const idxId       = headersNorm.findIndex((h) => h === "id" || h === "id transaccion" || h === "id operacion");
    const idxRazon    = findColumnIndex(headersNorm, ["razon social", "comercio", "nombre comercio"]);
    const idxCuit     = headersNorm.findIndex((h) => h === "cuit" || h === "cuil");
    const idxTipo     = headersNorm.findIndex((h) => h === "tipo");
    const idxPlazo    = findColumnIndex(headersNorm, ["plazo de acreditacion", "liberacion categorico", "plazo"]);
    const idxTipoVta  = findColumnIndex(headersNorm, ["tipo venta"]);
    const idxFecha    = headersNorm.findIndex((h) => h === "fecha" || h === "fecha venta" || h === "fecha de venta");
    const idxFechaLib = findColumnIndex(headersNorm, ["fecha liberacion", "fecha de liberacion"]);
    const idxIdMov    = findColumnIndex(headersNorm, ["id movimiento", "id mov"]);
    const idxForma    = findColumnIndex(headersNorm, ["forma pago", "forma de pago", "medio de pago"]);
    const idxCuotas   = findColumnIndex(headersNorm, ["cuotas"]);
    const idxBruto    = findColumnIndex(headersNorm, ["monto bruto"]);
    const idxCom      = findColumnIndex(headersNorm, ["comision sin iva", "costo arancel monto"]);
    const idxIvaCom   = findColumnIndex(headersNorm, ["iva de la comision", "costo arancel iva monto"]);
    const idxCft      = findColumnIndex(headersNorm, ["cft sin iva", "costo financiero total monto"]);
    const idxIvaCft   = findColumnIndex(headersNorm, ["iva del cft", "costo financiero total iva monto"]);
    const idxIibb     = findColumnIndex(headersNorm, ["retencion iibb", "retencion ingresos brutos"]);
    const idxNeto     = findColumnIndex(headersNorm, ["monto neto"]);
    const idxMarca    = findColumnIndex(headersNorm, ["marca tarjeta", "tarjeta"]);
    const idxEstado   = findColumnIndex(headersNorm, ["estado"]);

    let detectedCuit = "";
    let detectedRazon = "";
    const fnMatch = (fileName || "").match(/(\d{11})/);
    if (fnMatch) detectedCuit = fnMatch[1];

    const rows = [];
    let minDate = null;
    let maxDate = null;

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const firstCellNorm = normalizeString(row[0]);
      if (
        firstCellNorm === "total" ||
        firstCellNorm === "totales" ||
        firstCellNorm.startsWith("filtros aplicados")
      ) {
        continue;
      }

      // Si existe columna Estado, omitir operaciones rechazadas/anuladas
      if (idxEstado !== -1 && row[idxEstado]) {
        const estNorm = normalizeString(row[idxEstado]);
        if (estNorm && estNorm !== "aprobada" && estNorm !== "approved" && estNorm !== "acreditada") {
          continue;
        }
      }

      const idTx = idxId !== -1 ? String(row[idxId] ?? "").trim() : String(r);
      if (!idTx || normalizeString(idTx) === "total") continue;

      if (!detectedRazon && idxRazon !== -1 && row[idxRazon]) {
        const rz = String(row[idxRazon]).trim();
        if (rz && normalizeString(rz) !== "total") detectedRazon = rz;
      }
      if (!detectedCuit && idxCuit !== -1 && row[idxCuit]) {
        const digits = String(row[idxCuit]).replace(/\D/g, "");
        if (digits.length === 11) detectedCuit = digits;
      }

      const fechaVenta = idxFecha !== -1 ? parseExcelDateTime(row[idxFecha]) : null;
      const fechaLib   = idxFechaLib !== -1 ? parseExcelDateTime(row[idxFechaLib]) : null;

      if (fechaVenta) {
        if (!minDate || fechaVenta < minDate) minDate = fechaVenta;
        if (!maxDate || fechaVenta > maxDate) maxDate = fechaVenta;
      }

      const plazoRaw  = idxPlazo !== -1 ? String(row[idxPlazo] ?? "").trim() : "";
      const formaPago = idxForma !== -1 ? String(row[idxForma] ?? "").trim() : "";
      const marca     = idxMarca !== -1 ? String(row[idxMarca] ?? "").trim() : "";
      const idMov     = idxIdMov !== -1 ? String(row[idxIdMov] ?? "").trim() : "";
      const cuotas    = idxCuotas !== -1 ? parseInt(row[idxCuotas], 10) || 1 : 1;

      const montoBruto     = idxBruto !== -1 ? parseNumber(row[idxBruto]) : 0;
      const comisionSinIva = idxCom !== -1 ? parseNumber(row[idxCom]) : 0;
      const ivaComision    = idxIvaCom !== -1 ? parseNumber(row[idxIvaCom]) : 0;
      const cftSinIva      = idxCft !== -1 ? parseNumber(row[idxCft]) : 0;
      const ivaCft         = idxIvaCft !== -1 ? parseNumber(row[idxIvaCft]) : 0;
      const retencionIibb  = idxIibb !== -1 ? parseNumber(row[idxIibb]) : 0;
      const montoNeto      = idxNeto !== -1 ? parseNumber(row[idxNeto]) : 0;

      // Neto antes de IIBB (Bruto - Comisiones - IVA - CFT)
      const netoSinIibb = Math.round((montoBruto - comisionSinIva - ivaComision - cftSinIva - ivaCft) * 100) / 100;

      const plazoNorm = normalizeString(plazoRaw);
      const formaNorm = normalizeString(formaPago);
      const isDeferred =
        (plazoNorm !== "" && plazoNorm !== "inmediato") ||
        formaNorm.includes("credito") ||
        formaNorm.includes("naranja") ||
        formaNorm.includes("cuota");

      rows.push({
        rowIndex: r,
        id: idTx,
        idMovimiento: idMov,
        fechaVenta,
        fechaVentaKey: formatDateKey(fechaVenta),
        fechaLib,
        fechaLibKey: formatDateKey(fechaLib),
        plazoRaw,
        plazoClean: formatPlazoClean(plazoRaw),
        tipoVenta: idxTipoVta !== -1 ? String(row[idxTipoVta] ?? "").trim() : "",
        formaPago,
        marcaTarjeta: marca,
        cuotas,
        montoBruto,
        comisionSinIva,
        ivaComision,
        cftSinIva,
        ivaCft,
        retencionIibb,
        montoNeto,
        netoSinIibb,
        isDeferred,
      });
    }

    return {
      fileName,
      cuit: detectedCuit,
      razonSocial: detectedRazon,
      rows,
      minDate,
      maxDate,
    };
  }

  /* =====================================================
     5. MOTOR DE CONSOLIDACIÓN HÍBRIDO
     ===================================================== */

  /**
   * Busca un subconjunto de transacciones candidatas cuya suma de:
   * - comisionSinIva coincida con targetCom (tolerancia ±0.05), O
   * - montoNeto coincida con targetNeto (tolerancia ±0.05), O
   * - netoSinIibb coincida con targetNeto (o con tasa IIBB estándar)
   * Prioriza agrupar primero por día de venta (ya que los lotes acreditan días completos)
   * y luego a nivel individual si quedan hasta 18 transacciones candidatas.
   */
  function findBestCandidateSubset(candidates, mov) {
    if (!candidates || candidates.length === 0) return null;

    const targetNeto = mov.montoNeto;
    const targetCom  = mov.comisionSinIva;

    // 1. Probar si el total de candidatas con igual Fecha Liberación coincide
    const exactLibDateMatches = candidates.filter((t) => t.fechaLibKey && t.fechaLibKey === mov.fechaKey);
    if (exactLibDateMatches.length > 0) {
      const sumCom = exactLibDateMatches.reduce((a, t) => a + t.comisionSinIva, 0);
      const sumNeto = exactLibDateMatches.reduce((a, t) => a + t.montoNeto, 0);
      if (
        (targetCom > 0 && Math.abs(sumCom - targetCom) <= 0.08) ||
        Math.abs(sumNeto - targetNeto) <= 0.08
      ) {
        return exactLibDateMatches;
      }
    }

    // 2. Agrupar candidatas por fechaVentaKey y probar combinaciones de días completos
    const bySaleDate = new Map();
    for (const tx of candidates) {
      const k = tx.fechaVentaKey || "unknown";
      if (!bySaleDate.has(k)) bySaleDate.set(k, []);
      bySaleDate.get(k).push(tx);
    }
    const dayGroups = Array.from(bySaleDate.values());
    if (dayGroups.length > 0 && dayGroups.length <= 12) {
      const totalMasks = 1 << dayGroups.length;
      for (let mask = 1; mask < totalMasks; mask++) {
        let sumCom = 0;
        let sumNeto = 0;
        const subset = [];
        for (let i = 0; i < dayGroups.length; i++) {
          if (mask & (1 << i)) {
            for (const tx of dayGroups[i]) {
              sumCom += tx.comisionSinIva;
              sumNeto += tx.montoNeto;
              subset.push(tx);
            }
          }
        }
        if (
          (targetCom > 0 && Math.abs(sumCom - targetCom) <= 0.08) ||
          Math.abs(sumNeto - targetNeto) <= 0.08
        ) {
          return subset;
        }
      }
    }

    // 3. Si hay <= 16 transacciones individuales candidatas, probar subconjuntos individuales
    if (candidates.length <= 16) {
      const n = candidates.length;
      const totalMasks = 1 << n;
      for (let mask = 1; mask < totalMasks; mask++) {
        let sumCom = 0;
        let sumNeto = 0;
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            sumCom += candidates[i].comisionSinIva;
            sumNeto += candidates[i].montoNeto;
          }
        }
        if (
          (targetCom > 0 && Math.abs(sumCom - targetCom) <= 0.06) ||
          Math.abs(sumNeto - targetNeto) <= 0.06
        ) {
          const subset = [];
          for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) subset.push(candidates[i]);
          }
          return subset;
        }
      }
    }

    return null;
  }

  function consolidateData(movData, txData) {
    const txByMovId = new Map();
    const usedTxIds = new Set();

    for (const tx of txData.rows) {
      if (tx.idMovimiento) {
        if (!txByMovId.has(tx.idMovimiento)) txByMovId.set(tx.idMovimiento, []);
        txByMovId.get(tx.idMovimiento).push(tx);
      }
    }

    const rawItems = [];

    // Paso 1: Vincular por ID Movimiento directo
    for (const mov of movData.ventasRows) {
      const directTxs = txByMovId.get(mov.idMovimiento) || [];
      if (directTxs.length > 0) {
        directTxs.forEach((t) => usedTxIds.add(t.id));
        rawItems.push({
          mov,
          txs: directTxs,
          matchMethod: "id_movimiento",
          matchLabel: "Vinculado por ID Movimiento",
        });
      } else {
        rawItems.push({
          mov,
          txs: [],
          matchMethod: "none",
          matchLabel: "Sin vinculación directa",
        });
      }
    }

    // Paso 2: Para acreditaciones sin ID Movimiento en Transacciones, estimar por Fecha Liberación / Plazo (±2 días) y suma
    for (const item of rawItems) {
      if (item.txs.length > 0) continue;
      const mov = item.mov;
      if (!mov.fecha) continue;

      const movTime = mov.fecha.getTime();
      const unlinkedTxs = txData.rows.filter((t) => !usedTxIds.has(t.id));

      // 2a. Probar coincidencia inmediata (±20 minutos de la venta)
      const immediateCand = unlinkedTxs.find((t) => {
        if (!t.fechaVenta) return false;
        const diffMin = Math.abs(t.fechaVenta.getTime() - movTime) / 60000;
        if (diffMin > 20) return false;
        return (
          Math.abs(t.montoNeto - mov.montoNeto) <= 0.08 ||
          (mov.comisionSinIva > 0 && Math.abs(t.comisionSinIva - mov.comisionSinIva) <= 0.08)
        );
      });

      if (immediateCand) {
        usedTxIds.add(immediateCand.id);
        item.txs = [immediateCand];
        item.matchMethod = "estimated_immediate";
        item.matchLabel = "Estimado por Fecha/Hora y Monto";
        continue;
      }

      // 2b. Probar lote diferido cuya Fecha Liberación esté a ±2 días de la fecha del movimiento
      const deferredCandidates = unlinkedTxs.filter((t) => {
        if (!t.isDeferred) return false;
        if (t.fechaLib) {
          const diffDays = Math.abs(t.fechaLib.getTime() - movTime) / 86400000;
          if (diffDays <= 2.5) return true;
        }
        if (t.fechaVenta) {
          const diffSaleDays = (movTime - t.fechaVenta.getTime()) / 86400000;
          if (diffSaleDays >= 0.5 && diffSaleDays <= 12) return true;
        }
        return false;
      });

      const subset = findBestCandidateSubset(deferredCandidates, mov);
      if (subset && subset.length > 0) {
        subset.forEach((t) => usedTxIds.add(t.id));
        item.txs = subset;
        item.matchMethod = "estimated_batch";
        item.matchLabel = "Estimado por Plazo / Fecha (±2 días) y Suma";
      }
    }

    // Paso 3: Construir el diagnóstico detallado de cada acreditación y clasificar en Crédito (Diferido) vs Débito/QR (Inmediato)
    const creditoList = [];
    const debitoList  = [];

    for (const item of rawItems) {
      const { mov, txs } = item;
      const txCount = txs.length;

      const sumBruto    = Math.round(txs.reduce((a, t) => a + t.montoBruto, 0) * 100) / 100;
      const sumCom      = Math.round(txs.reduce((a, t) => a + t.comisionSinIva, 0) * 100) / 100;
      const sumIvaCom   = Math.round(txs.reduce((a, t) => a + t.ivaComision, 0) * 100) / 100;
      const sumCft      = Math.round(txs.reduce((a, t) => a + t.cftSinIva + t.ivaCft, 0) * 100) / 100;
      const sumIibb     = Math.round(txs.reduce((a, t) => a + t.retencionIibb, 0) * 100) / 100;
      const sumNeto     = Math.round(txs.reduce((a, t) => a + t.montoNeto, 0) * 100) / 100;
      const sumSinIibb  = Math.round(txs.reduce((a, t) => a + t.netoSinIibb, 0) * 100) / 100;

      const diffNeto    = Math.round((mov.montoNeto - sumNeto) * 100) / 100;
      const diffCom     = Math.round((mov.comisionSinIva - sumCom) * 100) / 100;
      const diffIvaCom  = Math.round((mov.ivaComision - sumIvaCom) * 100) / 100;
      const comMatches  = txCount > 0 && Math.abs(diffCom) <= 0.06 && Math.abs(diffIvaCom) <= 0.06;

      // Retención implícita descontada en Movimientos = sumSinIibb - mov.montoNeto
      const implicitMovIibb = txCount > 0 ? Math.round((sumSinIibb - mov.montoNeto) * 100) / 100 : 0;
      const txIibbRatePct   = sumBruto > 0 ? Math.round((sumIibb / sumBruto) * 10000) / 100 : 0;
      const movIibbRatePct  = sumBruto > 0 ? Math.round((implicitMovIibb / sumBruto) * 10000) / 100 : 0;

      // Determinar categoría: Crédito / Plazo Diferido vs Débito / QR Inmediato
      let isCreditoBatch = false;
      if (txCount > 1) {
        isCreditoBatch = true;
      } else if (txCount === 1) {
        isCreditoBatch = txs[0].isDeferred;
      } else {
        // Sin ventas encontradas: evaluar si ocurrió cerca de medianoche (00:00 a 01:30) o si la comisión es de tarjeta de crédito (> 2.5%)
        const hour = mov.fecha ? mov.fecha.getHours() : 12;
        const estGross = mov.montoNeto + mov.comisionSinIva + mov.ivaComision;
        const comPct = estGross > 0 ? (mov.comisionSinIva / estGross) * 100 : 0;
        isCreditoBatch = hour === 0 || comPct > 2.4;
      }

      // Determinar los 3 estados posibles: "exact" | "diff" | "missing"
      let status = "missing";
      let statusTitle = "Sin ventas en rango";
      let statusSubnote = "No se hallaron ventas en Transacciones";
      let diagMessage = "";

      if (txCount === 0) {
        status = "missing";
        // Verificar si la acreditación ocurrió al principio del reporte y sus ventas son de días anteriores al inicio del archivo de Transacciones
        const isBeforeTxStart =
          txData.minDate &&
          mov.fecha &&
          (mov.fecha.getTime() - txData.minDate.getTime()) / 86400000 <= 5;
        if (isBeforeTxStart) {
          statusSubnote = "Ventas previas al rango del reporte";
          diagMessage = `No se encontraron ventas asociadas al movimiento #${mov.idMovimiento} dentro del archivo de Transacciones cargado (que inicia el ${formatDateShort(txData.minDate)}). Al tratarse de una acreditación diferida del ${formatDateTime(mov.fecha)}, las ventas originales se realizaron en días hábiles previos al inicio del reporte de Transacciones.`;
        } else {
          diagMessage = `No se encontró ninguna venta ni combinación de ventas en el Reporte de Transacciones que conforme esta acreditación de ${formatARS(mov.montoNeto)} (Comisión: ${formatARS(mov.comisionSinIva)}). Se recomienda verificar si faltan filas en el reporte o si hubo un error de liquidación.`;
        }
      } else if (Math.abs(diffNeto) <= 0.05) {
        status = "exact";
        statusTitle = "Coincidencia Exacta";
        statusSubnote = txCount === 1 ? "1 venta verificada al centavo" : `${txCount} ventas cuadran al centavo`;
        diagMessage = `El monto acreditado en Movimientos (${formatARS(mov.montoNeto)}) coincide exactamente al centavo con la suma de los Montos Netos de las ${txCount} ${txCount === 1 ? "venta" : "ventas"} en el Reporte de Transacciones.`;
      } else {
        status = "diff";
        statusTitle = `Diferencia: ${formatARS(diffNeto, true)}`;
        if (comMatches) {
          statusSubnote = `Comisiones 100% OK • Dif. IIBB (${movIibbRatePct.toFixed(2)}% vs ${txIibbRatePct.toFixed(2)}%)`;
          diagMessage = `Las ${txCount} ${txCount === 1 ? "venta identificada pertenece" : "ventas identificadas pertenecen"} con certeza a esta acreditación: la Comisión sin IVA (${formatARS(sumCom)}) y el IVA Comisión (${formatARS(sumIvaCom)}) coinciden exactamente al centavo. La diferencia de ${formatARS(diffNeto, true)} en el Monto Neto se explica porque en Movimientos se descontó ${formatARS(implicitMovIibb)} (${movIibbRatePct.toFixed(2)}% sobre el Bruto de ${formatARS(sumBruto)}), mientras que en el archivo de Transacciones figura una Retención IIBB de ${formatARS(sumIibb)} (${txIibbRatePct.toFixed(2)}%).`;
        } else {
          statusSubnote = `Desfase en neto y comisiones (${formatARS(diffCom, true)})`;
          diagMessage = `Existe una diferencia de ${formatARS(diffNeto, true)} entre el Monto Neto acreditado en Movimientos (${formatARS(mov.montoNeto)}) y la suma de las ventas encontradas en Transacciones (${formatARS(sumNeto)}), además de una diferencia de ${formatARS(diffCom, true)} en comisiones. Revisá el detalle de operaciones del lote.`;
        }
      }

      // Agrupar ventas del lote por día de venta para mostrar el desglose de plazos y días hábiles reales
      const dayGroupsMap = new Map();
      const plazosSet = new Set();
      let minSaleDate = null;
      let maxSaleDate = null;

      for (const tx of txs) {
        if (tx.plazoClean && tx.plazoClean !== "—") plazosSet.add(tx.plazoClean);
        if (tx.fechaVenta) {
          if (!minSaleDate || tx.fechaVenta < minSaleDate) minSaleDate = tx.fechaVenta;
          if (!maxSaleDate || tx.fechaVenta > maxSaleDate) maxSaleDate = tx.fechaVenta;
        }
        const key = tx.fechaVentaKey || "sin-fecha";
        if (!dayGroupsMap.has(key)) {
          dayGroupsMap.set(key, {
            dateKey: key,
            dateObj: tx.fechaVenta,
            count: 0,
            sumBruto: 0,
            sumNeto: 0,
            plazos: new Set(),
            businessDays: mov.fecha && tx.fechaVenta ? countBusinessDaysBetween(tx.fechaVenta, mov.fecha) : null,
          });
        }
        const g = dayGroupsMap.get(key);
        g.count++;
        g.sumBruto = Math.round((g.sumBruto + tx.montoBruto) * 100) / 100;
        g.sumNeto  = Math.round((g.sumNeto + tx.montoNeto) * 100) / 100;
        if (tx.plazoClean) g.plazos.add(tx.plazoClean);
      }

      const dayGroups = Array.from(dayGroupsMap.values()).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      );

      let salesRangeText = "Sin ventas vinculadas";
      if (txCount > 0 && minSaleDate && maxSaleDate) {
        if (formatDateKey(minSaleDate) === formatDateKey(maxSaleDate)) {
          salesRangeText = txCount === 1
            ? `Venta del ${formatDateTime(minSaleDate)}`
            : `Ventas del ${formatDateWithDay(minSaleDate)}`;
        } else {
          salesRangeText = `Ventas del ${formatDateWithDay(minSaleDate)} al ${formatDateWithDay(maxSaleDate)}`;
        }
      }

      const enriched = {
        id: mov.idMovimiento,
        mov,
        txs,
        txCount,
        isCreditoBatch,
        matchMethod: item.matchMethod,
        matchLabel: item.matchLabel,
        status,
        statusTitle,
        statusSubnote,
        diagMessage,
        sumBruto,
        sumCom,
        sumIvaCom,
        sumCft,
        sumIibb,
        sumNeto,
        sumSinIibb,
        diffNeto,
        diffCom,
        diffIvaCom,
        comMatches,
        implicitMovIibb,
        txIibbRatePct,
        movIibbRatePct,
        plazos: Array.from(plazosSet),
        salesRangeText,
        dayGroups,
      };

      if (isCreditoBatch) {
        creditoList.push(enriched);
      } else {
        debitoList.push(enriched);
      }
    }

    // Ordenar de más reciente a más antigua o cronológico (cronológico ascendente como vienen los reportes)
    creditoList.sort((a, b) => (a.mov.fecha?.getTime() || 0) - (b.mov.fecha?.getTime() || 0));
    debitoList.sort((a, b) => (a.mov.fecha?.getTime() || 0) - (b.mov.fecha?.getTime() || 0));

    // Transacciones que aún no tienen movimiento en el archivo de Movimientos (pendientes de acreditar)
    const pendingTxs = txData.rows.filter((t) => !usedTxIds.has(t.id));

    return {
      creditoList,
      debitoList,
      pendingTxs,
    };
  }

  /* =====================================================
     6. RENDERIZADO DE INTERFAZ DINÁMICA
     ===================================================== */

  function renderWorkspace() {
    if (!state.movData || !state.txData) {
      consolidadorWorkspace.hidden = true;
      return;
    }

    consolidadorError.hidden = true;
    state.consolidated = consolidateData(state.movData, state.txData);

    // Abrir por defecto el primer lote de crédito para que el usuario vea inmediatamente cómo se despliega
    state.openIds.clear();
    if (state.consolidated.creditoList.length > 0) {
      const firstWithTxs = state.consolidated.creditoList.find((x) => x.txCount > 0) || state.consolidated.creditoList[0];
      state.openIds.add(firstWithTxs.id);
    }

    consolidadorWorkspace.hidden = false;

    const razon = state.txData.razonSocial || "Comercio Bezza Pay";
    const cuit  = formatCuit(state.txData.cuit || state.movData.cuit);
    const minD  = state.txData.minDate || state.movData.minDate;
    const maxD  = state.movData.maxDate || state.txData.maxDate;

    merchantTitle.textContent = razon;
    merchantMeta.textContent = `CUIT: ${cuit} • Período analizado: ${formatDateShort(minD)} al ${formatDateShort(maxD)} • ${state.movData.ventasRows.length} acreditaciones en Movimientos / ${state.txData.rows.length} ventas en Transacciones`;

    renderKpis();
    updateTabCounters();
    renderActiveView();
  }

  function renderKpis() {
    const { creditoList, debitoList, pendingTxs } = state.consolidated;
    const allList = [...creditoList, ...debitoList];

    const credExact   = creditoList.filter((x) => x.status === "exact").length;
    const credDiff    = creditoList.filter((x) => x.status === "diff").length;
    const credMissing = creditoList.filter((x) => x.status === "missing").length;
    const sumCredMov  = creditoList.reduce((a, x) => a + x.mov.montoNeto, 0);

    const exactTotal   = allList.filter((x) => x.status === "exact").length;
    const diffTotal    = allList.filter((x) => x.status === "diff").length;
    const diffComOk    = allList.filter((x) => x.status === "diff" && x.comMatches).length;
    const missingTotal = allList.filter((x) => x.status === "missing").length;

    const sumPendingNeto = pendingTxs.reduce((a, t) => a + t.montoNeto, 0);

    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <span class="kpi-card__label">Lotes Crédito / Diferido</span>
        <div class="kpi-card__value">${creditoList.length} lotes</div>
        <div class="kpi-card__sub">Total acreditado: <strong>${formatARS(sumCredMov)}</strong> (${credExact} exactos, ${credDiff} con dif., ${credMissing} sin ventas)</div>
      </div>
      <div class="kpi-card kpi-card--exact">
        <span class="kpi-card__label">Coincidencia Exacta</span>
        <div class="kpi-card__value">${exactTotal} acreditaciones</div>
        <div class="kpi-card__sub">El Monto Neto de Movimientos cuadra al centavo con las ventas</div>
      </div>
      <div class="kpi-card kpi-card--diff">
        <span class="kpi-card__label">Con Diferencia de Monto</span>
        <div class="kpi-card__value">${diffTotal} acreditaciones</div>
        <div class="kpi-card__sub">${diffComOk === diffTotal && diffTotal > 0 ? "100% coinciden en comisiones (diferencia por alícuota IIBB)" : `${diffComOk} coinciden en comisiones (dif. IIBB)`}</div>
      </div>
      <div class="kpi-card ${missingTotal > 0 ? "kpi-card--missing" : ""}">
        <span class="kpi-card__label">Sin Ventas / Pendientes</span>
        <div class="kpi-card__value">${missingTotal} sin rango • ${pendingTxs.length} pend.</div>
        <div class="kpi-card__sub">Pendientes de liberar al cierre: <strong>${formatARS(sumPendingNeto)}</strong></div>
      </div>
    `;
  }

  function updateTabCounters() {
    const { creditoList, debitoList, pendingTxs } = state.consolidated;
    countTabCredito.textContent    = creditoList.length;
    countTabDebito.textContent     = debitoList.length;
    countTabPendientes.textContent = pendingTxs.length;

    tabBtnCredito.classList.toggle("active", state.activeTab === "credito");
    tabBtnDebito.classList.toggle("active", state.activeTab === "debito");
    tabBtnPendientes.classList.toggle("active", state.activeTab === "pendientes");
  }

  function getFilteredItems(baseList) {
    const q = normalizeString(state.searchQuery);
    return baseList.filter((item) => {
      if (state.statusFilter !== "all" && item.status !== state.statusFilter) {
        return false;
      }
      if (!q) return true;
      const idMovMatch = normalizeString(item.id).includes(q);
      const dateMatch  = normalizeString(formatDateTime(item.mov.fecha)).includes(q);
      const amtMatch   = String(item.mov.montoNeto).includes(q) || normalizeString(formatARS(item.mov.montoNeto)).includes(q);
      const txMatch    = item.txs.some(
        (t) =>
          normalizeString(t.id).includes(q) ||
          normalizeString(t.formaPago).includes(q) ||
          normalizeString(t.marcaTarjeta).includes(q) ||
          normalizeString(formatDateShort(t.fechaVenta)).includes(q)
      );
      return idMovMatch || dateMatch || amtMatch || txMatch;
    });
  }

  function renderActiveView() {
    if (!state.consolidated) return;

    if (state.activeTab === "pendientes") {
      filterBar.hidden = true;
      acreditacionesList.hidden = true;
      pendientesPanel.hidden = false;
      renderPendientesView();
      return;
    }

    filterBar.hidden = false;
    acreditacionesList.hidden = false;
    pendientesPanel.hidden = true;

    const currentList =
      state.activeTab === "credito"
        ? state.consolidated.creditoList
        : state.consolidated.debitoList;

    // Actualizar contadores de píldoras de estado para la pestaña activa
    pillCountAll.textContent     = currentList.length;
    pillCountExact.textContent   = currentList.filter((x) => x.status === "exact").length;
    pillCountDiff.textContent    = currentList.filter((x) => x.status === "diff").length;
    pillCountMissing.textContent = currentList.filter((x) => x.status === "missing").length;

    const filtered = getFilteredItems(currentList);

    if (filtered.length === 0) {
      acreditacionesList.innerHTML = `
        <div class="empty-state-box">
          No se encontraron acreditaciones para los filtros seleccionados en esta vista.
        </div>
      `;
      return;
    }

    acreditacionesList.innerHTML = filtered.map((item) => buildAcreditacionCardHtml(item)).join("");
  }

  function buildAcreditacionCardHtml(item) {
    const isOpen = state.openIds.has(item.id);
    const statusClass =
      item.status === "exact"
        ? "acred-card--exact"
        : item.status === "diff"
        ? "acred-card--diff"
        : "acred-card--missing";

    const badgeClass =
      item.status === "exact"
        ? "status-badge--exact"
        : item.status === "diff"
        ? "status-badge--diff"
        : "status-badge--missing";

    const plazosHtml = item.plazos.length > 0
      ? item.plazos.map((p) => `<span class="acred-plazo-pill">Plazo: ${escapeHtml(p)}</span>`).join("")
      : `<span class="acred-plazo-pill">Sin plazo</span>`;

    const countLabel =
      item.txCount === 0
        ? "0 ventas en archivo"
        : item.txCount === 1
        ? "1 venta"
        : `${item.txCount} ventas`;

    return `
      <article class="acred-card ${statusClass} ${isOpen ? "is-open" : ""}" data-acred-id="${escapeHtml(item.id)}">
        <div class="acred-card__summary" data-toggle-id="${escapeHtml(item.id)}">
          <div class="acred-col-main">
            <div class="acred-date">${escapeHtml(formatDateTime(item.mov.fecha))}</div>
            <div class="acred-id-row">
              <span class="acred-id-badge">ID Mov #${escapeHtml(item.id)}</span>
              <span class="acred-method-tag">${escapeHtml(item.matchLabel)}</span>
            </div>
          </div>

          <div class="acred-col-meta">
            <div class="acred-tx-pill-row">
              <span class="acred-count-pill">${escapeHtml(countLabel)}</span>
              ${plazosHtml}
            </div>
            <div class="acred-sales-range">${escapeHtml(item.salesRangeText)}</div>
          </div>

          <div class="acred-col-amounts">
            <div class="acred-amount-box">
              <span class="acred-amount-label">Acreditado (Mov)</span>
              <span class="acred-amount-val acred-amount-val--mov">${escapeHtml(formatARS(item.mov.montoNeto))}</span>
            </div>
            <div class="acred-amount-box">
              <span class="acred-amount-label">Suma Ventas (Tx)</span>
              <span class="acred-amount-val">${item.txCount > 0 ? escapeHtml(formatARS(item.sumNeto)) : "—"}</span>
            </div>
          </div>

          <div class="acred-col-status">
            <span class="status-badge ${badgeClass}">
              <span class="status-dot status-dot--${escapeHtml(item.status)}"></span>
              ${escapeHtml(item.statusTitle)}
            </span>
            <span class="status-subnote">${escapeHtml(item.statusSubnote)}</span>
          </div>

          <div class="acred-chevron" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        ${isOpen ? buildAcreditacionDetailsHtml(item) : ""}
      </article>
    `;
  }

  function buildAcreditacionDetailsHtml(item) {
    const bannerClass =
      item.status === "exact"
        ? "diag-banner--exact"
        : item.status === "diff"
        ? "diag-banner--diff"
        : "diag-banner--missing";

    const bannerIcon =
      item.status === "exact"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : item.status === "diff"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

    if (item.txCount === 0) {
      return `
        <div class="acred-card__details">
          <div class="diag-banner ${bannerClass}">
            ${bannerIcon}
            <div>${escapeHtml(item.diagMessage)}</div>
          </div>
          <div class="reconcile-grid">
            <div class="reconcile-box">
              <span class="reconcile-box__label">Fecha Acreditación</span>
              <span class="reconcile-box__val">${escapeHtml(formatDateTime(item.mov.fecha))}</span>
              <span class="reconcile-box__sub">ID Venta/COELSA: ${escapeHtml(item.mov.idVentaCoelsa || "—")}</span>
            </div>
            <div class="reconcile-box">
              <span class="reconcile-box__label">Comisión en Movimientos</span>
              <span class="reconcile-box__val">${escapeHtml(formatARS(item.mov.comisionSinIva))}</span>
              <span class="reconcile-box__sub">Sin IVA</span>
            </div>
            <div class="reconcile-box">
              <span class="reconcile-box__label">IVA Comisión en Movimientos</span>
              <span class="reconcile-box__val">${escapeHtml(formatARS(item.mov.ivaComision))}</span>
              <span class="reconcile-box__sub">21% sobre comisión</span>
            </div>
            <div class="reconcile-box reconcile-box--highlight">
              <span class="reconcile-box__label">Monto Acreditado (Mov)</span>
              <span class="reconcile-box__val">${escapeHtml(formatARS(item.mov.montoNeto))}</span>
              <span class="reconcile-box__sub">Sin ventas en el archivo Tx</span>
            </div>
          </div>
        </div>
      `;
    }

    const comSubHtml = item.comMatches
      ? `<span class="reconcile-box__sub reconcile-box__sub--ok">✔ Coincide exacto con Movimientos (${escapeHtml(formatARS(item.mov.comisionSinIva))} + IVA ${escapeHtml(formatARS(item.mov.ivaComision))})</span>`
      : `<span class="reconcile-box__sub reconcile-box__sub--warn">En Movimientos: ${escapeHtml(formatARS(item.mov.comisionSinIva))} + IVA ${escapeHtml(formatARS(item.mov.ivaComision))}</span>`;

    const dayChipsHtml = item.dayGroups
      .map((g) => {
        const plazosStr = Array.from(g.plazos).join(", ");
        const delayLabel =
          g.businessDays !== null
            ? g.businessDays === 0
              ? "Acreditado en el día"
              : `Acreditó en ${g.businessDays} ${g.businessDays === 1 ? "día hábil" : "días hábiles"}`
            : "";
        return `
          <div class="day-chip">
            <span class="day-chip__date">${escapeHtml(formatDateWithDay(g.dateObj))}</span>
            <span class="day-chip__meta">${g.count} ${g.count === 1 ? "venta" : "ventas"} • Bruto ${escapeHtml(formatARS(g.sumBruto))} • Plazo config: ${escapeHtml(plazosStr)}</span>
            ${delayLabel ? `<span class="day-chip__delay">${escapeHtml(delayLabel)}</span>` : ""}
          </div>
        `;
      })
      .join("");

    const rowsHtml = item.txs
      .map((tx, idx) => {
        const bDays =
          item.mov.fecha && tx.fechaVenta
            ? countBusinessDaysBetween(tx.fechaVenta, item.mov.fecha)
            : null;
        const bDaysText =
          bDays === null ? "—" : bDays === 0 ? "En el momento" : `${bDays} d. háb.`;

        return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td><strong>#${escapeHtml(tx.id)}</strong></td>
            <td>${escapeHtml(formatDateTime(tx.fechaVenta))}</td>
            <td class="center">${escapeHtml(formatDateShort(tx.fechaLib))}</td>
            <td class="center">${escapeHtml(tx.plazoClean)}</td>
            <td class="center">${escapeHtml(bDaysText)}</td>
            <td>${escapeHtml(formatMedioPagoCompact(tx.formaPago, tx.marcaTarjeta))}</td>
            <td class="center">${tx.cuotas}</td>
            <td class="num">${escapeHtml(formatARS(tx.montoBruto))}</td>
            <td class="num">${escapeHtml(formatARS(tx.comisionSinIva))}</td>
            <td class="num">${escapeHtml(formatARS(tx.ivaComision))}</td>
            <td class="num">${escapeHtml(formatARS(tx.retencionIibb))}</td>
            <td class="num cell-neto">${escapeHtml(formatARS(tx.montoNeto))}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="acred-card__details">
        <div class="diag-banner ${bannerClass}">
          ${bannerIcon}
          <div>${escapeHtml(item.diagMessage)}</div>
        </div>

        <div class="reconcile-grid">
          <div class="reconcile-box">
            <span class="reconcile-box__label">Monto Bruto Total (${item.txCount} vtas)</span>
            <span class="reconcile-box__val">${escapeHtml(formatARS(item.sumBruto))}</span>
            <span class="reconcile-box__sub">Neto antes de IIBB: ${escapeHtml(formatARS(item.sumSinIibb))}</span>
          </div>

          <div class="reconcile-box">
            <span class="reconcile-box__label">Comisión + IVA (Ventas)</span>
            <span class="reconcile-box__val">${escapeHtml(formatARS(item.sumCom + item.sumIvaCom))}</span>
            ${comSubHtml}
          </div>

          <div class="reconcile-box">
            <span class="reconcile-box__label">Retención IIBB (Transacciones)</span>
            <span class="reconcile-box__val">${escapeHtml(formatARS(item.sumIibb))} (${item.txIibbRatePct.toFixed(2)}%)</span>
            <span class="reconcile-box__sub">Ret. implícita Mov: ${escapeHtml(formatARS(item.implicitMovIibb))} (${item.movIibbRatePct.toFixed(2)}%)</span>
          </div>

          <div class="reconcile-box reconcile-box--highlight">
            <span class="reconcile-box__label">Acreditado en Movimientos</span>
            <span class="reconcile-box__val">${escapeHtml(formatARS(item.mov.montoNeto))}</span>
            <span class="reconcile-box__sub">Suma Neto Tx: ${escapeHtml(formatARS(item.sumNeto))}</span>
          </div>

          <div class="reconcile-box">
            <span class="reconcile-box__label">Diferencia (Mov - Tx)</span>
            <span class="reconcile-box__val">${escapeHtml(formatARS(item.diffNeto, true))}</span>
            <span class="reconcile-box__sub ${Math.abs(item.diffNeto) <= 0.05 ? "reconcile-box__sub--ok" : "reconcile-box__sub--warn"}">
              ${Math.abs(item.diffNeto) <= 0.05 ? "✔ Cuadra al centavo" : item.comMatches ? "Explicada 100% por diferencia IIBB" : "Revisar diferencia"}
            </span>
          </div>
        </div>

        ${
          item.dayGroups.length > 0
            ? `
          <div class="day-groups-wrap">
            <span class="day-groups-title">Composición del lote por fecha de venta y demora real</span>
            <div class="day-groups-list">${dayChipsHtml}</div>
          </div>
        `
            : ""
        }

        <div class="tx-table-wrapper">
          <table class="tx-table">
            <thead>
              <tr>
                <th class="center">#</th>
                <th>ID Venta</th>
                <th>Fecha y Hora Venta</th>
                <th class="center">Fecha Lib.</th>
                <th class="center">Plazo Config.</th>
                <th class="center">Demora Real</th>
                <th>Forma Pago / Tarjeta</th>
                <th class="center">Cuotas</th>
                <th class="num">Monto Bruto</th>
                <th class="num">Comisión s/IVA</th>
                <th class="num">IVA Com.</th>
                <th class="num">Ret. IIBB</th>
                <th class="num">Monto Neto</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="8">TOTAL DEL LOTE (${item.txCount} ${item.txCount === 1 ? "operación" : "operaciones"})</td>
                <td class="num">${escapeHtml(formatARS(item.sumBruto))}</td>
                <td class="num">${escapeHtml(formatARS(item.sumCom))}</td>
                <td class="num">${escapeHtml(formatARS(item.sumIvaCom))}</td>
                <td class="num">${escapeHtml(formatARS(item.sumIibb))}</td>
                <td class="num">${escapeHtml(formatARS(item.sumNeto))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  function renderPendientesView() {
    const pending = state.consolidated.pendingTxs;
    if (pending.length === 0) {
      pendientesPanel.innerHTML = `
        <div class="empty-state-box">
          Todas las ventas del Reporte de Transacciones ya se encuentran acreditadas en el Reporte de Movimientos.
        </div>
      `;
      return;
    }

    const sumBruto = pending.reduce((a, t) => a + t.montoBruto, 0);
    const sumCom   = pending.reduce((a, t) => a + t.comisionSinIva, 0);
    const sumIva   = pending.reduce((a, t) => a + t.ivaComision, 0);
    const sumNeto  = pending.reduce((a, t) => a + t.montoNeto, 0);

    const rowsHtml = pending
      .map(
        (tx, idx) => `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>#${escapeHtml(tx.id)}</strong></td>
          <td>${escapeHtml(formatDateTime(tx.fechaVenta))}</td>
          <td class="center"><strong>${escapeHtml(formatDateWithDay(tx.fechaLib))}</strong></td>
          <td class="center">${escapeHtml(tx.plazoClean)}</td>
          <td>${escapeHtml(formatMedioPagoCompact(tx.formaPago, tx.marcaTarjeta))}</td>
          <td class="center">${tx.cuotas}</td>
          <td class="num">${escapeHtml(formatARS(tx.montoBruto))}</td>
          <td class="num">${escapeHtml(formatARS(tx.comisionSinIva))}</td>
          <td class="num">${escapeHtml(formatARS(tx.ivaComision))}</td>
          <td class="num cell-neto">${escapeHtml(formatARS(tx.montoNeto))}</td>
        </tr>
      `
      )
      .join("");

    pendientesPanel.innerHTML = `
      <div class="pendientes-header">
        <div>
          <h3>Ventas Pendientes de Acreditar (${pending.length} operaciones)</h3>
          <p>Estas ventas figuran en el Reporte de Transacciones pero su Fecha de Liberación es posterior al cierre del Reporte de Movimientos.</p>
        </div>
      </div>
      <div class="tx-table-wrapper">
        <table class="tx-table">
          <thead>
            <tr>
              <th class="center">#</th>
              <th>ID Venta</th>
              <th>Fecha y Hora Venta</th>
              <th class="center">Fecha Liberación Estimada</th>
              <th class="center">Plazo</th>
              <th>Forma Pago / Tarjeta</th>
              <th class="center">Cuotas</th>
              <th class="num">Monto Bruto</th>
              <th class="num">Comisión s/IVA</th>
              <th class="num">IVA Com.</th>
              <th class="num">Monto Neto Est.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7">TOTAL PENDIENTE DE ACREDITAR (${pending.length} ventas)</td>
              <td class="num">${escapeHtml(formatARS(sumBruto))}</td>
              <td class="num">${escapeHtml(formatARS(sumCom))}</td>
              <td class="num">${escapeHtml(formatARS(sumIva))}</td>
              <td class="num">${escapeHtml(formatARS(sumNeto))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  /* =====================================================
     7. GESTIÓN DE ARCHIVOS SUBIDOS
     ===================================================== */
  function showError(msg) {
    consolidadorErrorText.textContent = msg;
    consolidadorError.hidden = false;
  }

  function updateSlotUi(slotType) {
    if (slotType === "movimientos") {
      if (state.movData) {
        slotMovimientos.classList.add("is-loaded");
        descMovimientos.innerHTML = `${state.movData.ventasRows.length} acreditaciones de ventas detectadas (${formatDateShort(state.movData.minDate)} al ${formatDateShort(state.movData.maxDate)})`;
        badgeMovimientos.hidden = false;
        badgeMovimientos.textContent = `✔ ${state.movData.fileName}`;
      } else {
        slotMovimientos.classList.remove("is-loaded");
        descMovimientos.innerHTML = `Arrastrá o hacé clic para subir <strong>Reporte_Movimientos.xlsx</strong>`;
        badgeMovimientos.hidden = true;
      }
    } else if (slotType === "transacciones") {
      if (state.txData) {
        slotTransacciones.classList.add("is-loaded");
        descTransacciones.innerHTML = `${state.txData.rows.length} ventas aprobadas detectadas (${formatDateShort(state.txData.minDate)} al ${formatDateShort(state.txData.maxDate)})`;
        badgeTransacciones.hidden = false;
        badgeTransacciones.textContent = `✔ ${state.txData.fileName}`;
      } else {
        slotTransacciones.classList.remove("is-loaded");
        descTransacciones.innerHTML = `Arrastrá o hacé clic para subir <strong>Reporte_Transacciones.xlsx</strong>`;
        badgeTransacciones.hidden = true;
      }
    }
  }

  async function handleFilesSelected(fileList, preferredType) {
    consolidadorError.hidden = true;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!rawRows || rawRows.length < 2) {
          showError(`El archivo "${file.name}" está vacío o no tiene filas de datos.`);
          continue;
        }

        const detectedType = detectSheetReportType(rawRows) || preferredType;

        if (detectedType === "movimientos") {
          state.movFile = file;
          state.movData = parseMovimientosSheet(rawRows, file.name);
          updateSlotUi("movimientos");
        } else if (detectedType === "transacciones") {
          state.txFile = file;
          state.txData = parseTransaccionesSheet(rawRows, file.name);
          updateSlotUi("transacciones");
        } else {
          showError(`No se pudo identificar si "${file.name}" es un Reporte de Movimientos o de Transacciones.`);
        }
      } catch (err) {
        console.error("[Consolidador] Error leyendo archivo:", err);
        showError(`Error al leer "${file.name}": ${err.message || "Formato inválido"}`);
      }
    }

    if (state.movData && state.txData) {
      renderWorkspace();
    }
  }

  function resetAll() {
    state.movFile = null;
    state.txFile = null;
    state.movData = null;
    state.txData = null;
    state.consolidated = null;
    state.openIds.clear();
    inputMovimientos.value = "";
    inputTransacciones.value = "";
    updateSlotUi("movimientos");
    updateSlotUi("transacciones");
    consolidadorError.hidden = true;
    consolidadorWorkspace.hidden = true;
  }

  /* =====================================================
     8. EVENTOS DE INTERFAZ
     ===================================================== */
  if (headerBrand) {
    headerBrand.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Eventos de los dos slots de carga
  function bindUploadSlot(slotEl, inputEl, preferredType) {
    slotEl.addEventListener("click", () => inputEl.click());
    slotEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inputEl.click();
      }
    });
    inputEl.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(e.target.files, preferredType);
      }
    });
    slotEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      slotEl.classList.add("drag-over");
    });
    slotEl.addEventListener("dragleave", () => {
      slotEl.classList.remove("drag-over");
    });
    slotEl.addEventListener("drop", (e) => {
      e.preventDefault();
      slotEl.classList.remove("drag-over");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files, preferredType);
      }
    });
  }

  bindUploadSlot(slotMovimientos, inputMovimientos, "movimientos");
  bindUploadSlot(slotTransacciones, inputTransacciones, "transacciones");

  if (btnResetFiles) {
    btnResetFiles.addEventListener("click", resetAll);
  }

  // Cambio de pestaña interna (Crédito / Débito / Pendientes)
  [tabBtnCredito, tabBtnDebito, tabBtnPendientes].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      updateTabCounters();
      renderActiveView();
    });
  });

  // Píldoras de filtro por estado
  if (statusFilterPills) {
    statusFilterPills.addEventListener("click", (e) => {
      const pill = e.target.closest(".filter-pill");
      if (!pill) return;
      state.statusFilter = pill.dataset.status || "all";
      statusFilterPills.querySelectorAll(".filter-pill").forEach((p) => {
        p.classList.toggle("active", p === pill);
      });
      renderActiveView();
    });
  }

  // Buscador en vivo
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value || "";
      renderActiveView();
    });
  }

  // Expandir / Contraer todas las tarjetas visibles
  if (btnToggleExpandAll) {
    btnToggleExpandAll.addEventListener("click", () => {
      if (!state.consolidated) return;
      const baseList =
        state.activeTab === "credito"
          ? state.consolidated.creditoList
          : state.consolidated.debitoList;
      const visible = getFilteredItems(baseList);
      const allOpen = visible.length > 0 && visible.every((item) => state.openIds.has(item.id));
      if (allOpen) {
        visible.forEach((item) => state.openIds.delete(item.id));
        btnToggleExpandAll.textContent = "Expandir todas";
      } else {
        visible.forEach((item) => state.openIds.add(item.id));
        btnToggleExpandAll.textContent = "Contraer todas";
      }
      renderActiveView();
    });
  }

  // Delegación de clic para abrir/cerrar el detalle de una acreditación
  if (acreditacionesList) {
    acreditacionesList.addEventListener("click", (e) => {
      const summaryEl = e.target.closest("[data-toggle-id]");
      if (!summaryEl) return;
      const id = summaryEl.getAttribute("data-toggle-id");
      if (!id) return;
      if (state.openIds.has(id)) {
        state.openIds.delete(id);
      } else {
        state.openIds.add(id);
      }
      renderActiveView();
    });
  }
})();
