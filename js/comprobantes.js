/**
 * ============================================================================
 * BEZZA PAY — GENERADOR DE COMPROBANTES DE TRANSFERENCIA
 * Archivo: comprobantes.js
 * Descripción: Motor inteligente de carga desestructurada y renderizado
 *              gráfico en Canvas 2D de alta resolución (Retina 2x).
 * Dependencias: Ninguna (100% Vanilla JavaScript ES6+)
 * ============================================================================
 */

/* ============================================================================
   SECCIÓN 1: CONSTANTES Y RECURSOS VECTORIALES (LOGO ANTI-CORS)
   ============================================================================ */

/**
 * SVG Oficial de Bezza Pay incrustado en texto plano.
 * Se utiliza como Data-URI para garantizar que el elemento <canvas> nunca se
 * contamine por políticas de seguridad de origen cruzado (CORS).
 */
const BEZZA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 57.9">
<style>
  .st0{fill:#CAF14D;}
  .st1{fill:#D00070;}
</style>
<g>
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
</g>
</svg>`;

const BEZZA_LOGO_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BEZZA_LOGO_SVG);

// Variables de estado del logo en memoria
let logoImage = null;
let logoReady = false;

/**
 * Pre-carga la imagen vectorial en un objeto Image() de JavaScript
 * y dispara el renderizado en cuanto está lista en memoria.
 */
function loadLogo() {
  logoImage = new Image();
  logoImage.onload = () => {
    logoReady = true;
    renderComprobante();
  };
  logoImage.onerror = () => {
    logoReady = false;
    renderComprobante();
  };
  logoImage.src = BEZZA_LOGO_URI;
}


/* ============================================================================
   SECCIÓN 2: SELECTORES Y CACHÉ DE ELEMENTOS DEL DOM
   ============================================================================ */

/**
 * Diccionario centralizado de elementos del DOM.
 * Evita llamadas redundantes a document.getElementById() mejorando el rendimiento.
 */
const el = {
  // Área de pegado desestructurado
  rawInput: document.getElementById('rawInput'),
  btnParse: document.getElementById('btnParse'),
  btnPasteClipboard: document.getElementById('btnPasteClipboard'),
  btnClear: document.getElementById('btnClear'),
  parseStatusMsg: document.getElementById('parseStatusMsg'),
  
  // Datos del Emisor (Origen)
  origenNombre: document.getElementById('origenNombre'),
  origenCuit: document.getElementById('origenCuit'),
  origenCvu: document.getElementById('origenCvu'),
  origenCvuCounter: document.getElementById('origenCvuCounter'),
  
  // Datos del Receptor (Destino)
  destinoNombre: document.getElementById('destinoNombre'),
  destinoCuit: document.getElementById('destinoCuit'),
  destinoCvu: document.getElementById('destinoCvu'),
  destinoCvuCounter: document.getElementById('destinoCvuCounter'),
  
  // Acción de intercambio
  btnSwap: document.getElementById('btnSwap'),
  
  // Datos de la Operación
  monto: document.getElementById('monto'),
  fechaHora: document.getElementById('fechaHora'),
  idCoelsa: document.getElementById('idCoelsa'),
  
  // Salida Gráfica y Acciones
  receiptCanvas: document.getElementById('receiptCanvas'),
  btnDownloadPng: document.getElementById('btnDownloadPng'),
  btnCopyImage: document.getElementById('btnCopyImage'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  toast: document.getElementById('toast'),
  
  // Modal de pantalla completa
  compModal: document.getElementById('compModal'),
  compModalImg: document.getElementById('compModalImg'),
  compModalClose: document.getElementById('compModalClose'),
  btnModalDownload: document.getElementById('btnModalDownload'),
};


/* ============================================================================
   SECCIÓN 3: UTILIDADES Y FORMATEADORES DE DATOS
   ============================================================================ */

/**
 * Normaliza un CUIT/CUIL numérico al formato estándar argentino: XX-XXXXXXXX-X
 * @param {string|number} cuitRaw - Cadena o número de CUIT.
 * @returns {string} CUIT formateado con guiones o el valor original si no tiene 11 dígitos.
 */
function formatCuit(cuitRaw) {
  if (!cuitRaw) return '';
  const digits = String(cuitRaw).replace(/\D/g, '');
  if (digits.length !== 11) return String(cuitRaw).trim();
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/**
 * Formatea un valor numérico a moneda argentina ($ 150.000,00)
 * Maneja formatos mixtos con punto o coma decimal y separadores de miles.
 * @param {string|number} valRaw - Valor crudo a formatear.
 * @returns {string} Cadena en formato ARS ($ #.##0,00).
 */
function formatCurrency(valRaw) {
  if (valRaw === undefined || valRaw === null || valRaw === '') return '$ 0,00';
  let str = String(valRaw).trim();
  
  // Limpiar signo $ previo si existiera
  str = str.replace(/^\$\s*/, '');
  
  // Interpretar separadores numéricos
  let num = 0;
  if (str.includes(',') && str.includes('.')) {
    // Formato latino: 150.000,50
    str = str.replace(/\./g, '').replace(',', '.');
    num = parseFloat(str) || 0;
  } else if (str.includes(',')) {
    // Formato con coma: 150000,50
    str = str.replace(',', '.');
    num = parseFloat(str) || 0;
  } else if (str.includes('.')) {
    // Detectar si el punto es de miles (ej: 150.000) o decimal (ej: 150.50)
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      num = parseFloat(parts[0] + parts[1]) || 0;
    } else {
      num = parseFloat(str) || 0;
    }
  } else {
    num = parseFloat(str) || 0;
  }
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Genera la fecha y hora actual en formato de comprobante bancario: DD/MM/AAAA HH:mm hs
 * @returns {string} Fecha y hora actual formateada.
 */
function getCurrentDateTimeString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes} hs`;
}

/**
 * Parsea fechas escritas en lenguaje natural (ej: "20 de octubre a las 13:44")
 * @param {string} text - Texto libre donde buscar la fecha.
 * @returns {string|null} Fecha formateada o null si no se reconoce el patrón.
 */
function parseSpanishDate(text) {
  const spanishMonths = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
    noviembre: '11', diciembre: '12'
  };
  
  const mMatch = text.match(/(\d{1,2})\s+de\s+([a-zA-Záéíóúñ]+)(?:\s+de\s+(\d{4}))?\s*(?:a\s+las\s+)?(\d{1,2}:\d{2}(?::\d{2})?)/i);
  if (mMatch) {
    const day = mMatch[1].padStart(2, '0');
    const monthName = mMatch[2].toLowerCase();
    const month = spanishMonths[monthName] || '01';
    const year = mMatch[3] || new Date().getFullYear();
    const time = mMatch[4];
    return `${day}/${month}/${year} ${time} hs`;
  }
  return null;
}

/**
 * Limpia un nombre extraído para remover etiquetas o números residuales y convertirlo a MAYÚSCULAS.
 * @param {string} rawName - Nombre sin procesar.
 * @returns {string} Nombre sanitizado en mayúsculas.
 */
function cleanName(rawName) {
  if (!rawName) return '';
  let name = rawName.split(/\r?\n/)[0];
  name = name.replace(/(?:cuit|cuil|cvu|cbu|monto|fecha|coelsa|id|externo|bruto|arancel)[\s\S]*/i, '');
  name = name.replace(/[;,\(\)\{\}\[\]\<\>]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name.toUpperCase();
}


/* ============================================================================
   SECCIÓN 4: MOTOR INTELIGENTE DE PARSEO DE TEXTO DESORDENADO (REGEX)
   ============================================================================ */

/**
 * Analiza texto libre, extractos bancarios, mensajes de WhatsApp o resúmenes,
 * extrayendo automáticamente los campos requeridos mediante expresiones regulares
 * contextuales y algoritmos de descarte heurístico.
 * @param {string} text - Texto completo sin estructurar.
 * @returns {Object} Objeto con los campos reconocidos.
 */
function parseUnstructuredText(text) {
  if (!text || !text.trim()) return {};
  
  const raw = text.trim();
  const result = {};
  
  // 1. Extraer Razón Social (Emisor / Origen)
  const rsRegex = /(?:raz[oó]n\s*social|nombre\s*emisor|titular\s*origen)\s*[:=\-]?\s*[\r\n]+\s*([^\r\n]+)|(?:raz[oó]n\s*social|nombre\s*emisor|titular\s*origen)\s*[:=\-]\s*([^\r\n]+)/i;
  const rsMatch = raw.match(rsRegex);
  if (rsMatch) {
    result.origenNombre = cleanName(rsMatch[1] || rsMatch[2]);
  }
  
  // CUIT consecuente de Razón Social / Emisor
  const cuitOrigenBlockMatch = raw.match(/(?:raz[oó]n\s*social|nombre\s*emisor|titular\s*origen)[\s\S]*?cuit\s*[:=\-]?\s*[\r\n]*\s*(\b\d{11}\b|\b\d{2}[- ]\d{8}[- ]\d\b)/i);
  if (cuitOrigenBlockMatch) {
    result.origenCuit = formatCuit(cuitOrigenBlockMatch[1]);
  }
  
  // 2. Extraer Titular de cuenta destino / Destinatario
  const destNomRegex = /(?:titular\s*(?:de\s*cuenta\s*)?destino|destinatario|receptor|nombre\s*destino)\s*[:=\-]?\s*[\r\n]+\s*([^\r\n]+)|(?:titular\s*(?:de\s*cuenta\s*)?destino|destinatario|receptor|nombre\s*destino)\s*[:=\-]\s*([^\r\n]+)/i;
  const destNomMatch = raw.match(destNomRegex);
  if (destNomMatch) {
    result.destinoNombre = cleanName(destNomMatch[1] || destNomMatch[2]);
  }
  
  // 3. Extraer "Descripción" o "Concepto" como fallback para titular de destino
  const descMatch = raw.match(/(?:descripci[oó]n|concepto)\s*[:=\-]?\s*[\r\n]+\s*([^\r\n]+)|(?:descripci[oó]n|concepto)\s*[:=\-]\s*([^\r\n]+)/i);
  if (descMatch && !result.destinoNombre) {
    result.destinoNombre = cleanName(descMatch[1] || descMatch[2]);
  }
  
  // Fallback si viene "Comercio vendedor" y no se detectó emisor
  if (!result.origenNombre) {
    const cvMatch = raw.match(/comercio\s*vendedor\s*[:=\-]?\s*[\r\n]*\s*([^\r\n]+)/i);
    if (cvMatch && cvMatch[1]) {
      result.origenNombre = cleanName(cvMatch[1]);
    }
  }
  
  // 4. CVUs: Diferenciar "CVU" (emisor) de "CVU / CBU" (destino) mediante Lookaheads
  // Caso A: CVU / CBU explícito para destino
  const cvuDestRegex = /(?:cvu\s*\/\s*cbu|cbu\s*\/\s*cvu|cbu|cuenta\s*destino|cvu\s*destino)\s*[:=\-]?\s*[\r\n]*\s*(\b\d{22}\b)/i;
  const cvuDestMatch = raw.match(cvuDestRegex);
  if (cvuDestMatch) {
    result.destinoCvu = cvuDestMatch[1];
  }
  
  // Caso B: CVU sólo (Emisor), sin barra ni mención de CBU
  const cvuOrigRegex = /(?:^|[\r\n])\s*cvu(?!\s*[\/|\\]|\s*cbu)\s*[:=\-]?\s*[\r\n]*\s*(\b\d{22}\b)/i;
  const cvuOrigMatch = raw.match(cvuOrigRegex);
  if (cvuOrigMatch) {
    result.origenCvu = cvuOrigMatch[1];
  }
  
  // 5. CUITs / CUILs de Destino
  const cuitDestRegex = /(?:cuil\s*\/\s*cuit|cuit\s*\/\s*cuil|cuit\s*destino|cuil\s*destino)\s*[:=\-]?\s*[\r\n]*\s*(\b\d{11}\b|\b\d{2}[- ]\d{8}[- ]\d\b)/i;
  const cuitDestMatch = raw.match(cuitDestRegex);
  if (cuitDestMatch) {
    result.destinoCuit = formatCuit(cuitDestMatch[1]);
  }
  
  // 6. Extraer ID Externo / Transacción COELSA
  const coelsaRegex = /(?:id\s*externo|id_externo|id\s*coelsa|coelsa|id\s*transacci[oó]n|n[°º]\s*de\s*coelsa)\s*[:=\-]?\s*[\r\n]*\s*([A-Za-z0-9_\-]{8,35})/i;
  const coelsaMatch = raw.match(coelsaRegex);
  if (coelsaMatch && coelsaMatch[1]) {
    result.idCoelsa = coelsaMatch[1].trim();
  }
  
  // 7. Extraer Fecha y Hora
  const dateNumRegex = /(?:fecha|fecha\s*y\s*hora)\s*[:=\-]?\s*[\r\n]*\s*(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s*(?:a\s*las\s*)?[-–—@]?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:hs|hrs|am|pm))?)?)/i;
  const dateNumMatch = raw.match(dateNumRegex);
  if (dateNumMatch && dateNumMatch[1]) {
    let dStr = dateNumMatch[1].trim();
    if (!/hs|hrs|am|pm/i.test(dStr) && /\d{1,2}:\d{2}/.test(dStr)) {
      dStr += ' hs';
    }
    result.fechaHora = dStr;
  } else {
    const parsedSpanishDate = parseSpanishDate(raw);
    if (parsedSpanishDate) {
      result.fechaHora = parsedSpanishDate;
    }
  }
  
  // 8. Extraer Monto
  const brutoMatch = raw.match(/(?:bruto)\s*[:=\-]?\s*\$?\s*([\d\.\,]+)/i);
  if (brutoMatch && brutoMatch[1]) {
    result.monto = formatCurrency(brutoMatch[1]);
  } else {
    const montoRegex = /(?:monto|importe|total|transf(?:iri[oó]|erencia)?\s*(?:de)?)\s*[:=\-]?\s*\$?\s*[-–—]?\s*\$?\s*([\d\.\,]+)/i;
    const montoMatch = raw.match(montoRegex);
    if (montoMatch && montoMatch[1]) {
      result.monto = formatCurrency(montoMatch[1]);
    } else {
      const looseMonto = raw.match(/(?:^|[\r\n])\s*\$\s*[-–—]?\s*([\d\.\,]+)/m);
      if (looseMonto && looseMonto[1]) {
        result.monto = formatCurrency(looseMonto[1]);
      }
    }
  }
  
  // 9. Nombres en lenguaje coloquial (ej: "de Juan Carlos ... a Maria Álvarez")
  if (!result.origenNombre) {
    const deMatch = raw.match(/(?:^|[\r\n\s])de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})\s+(?:cuit|cuil|cvu|cbu)/i);
    if (deMatch) result.origenNombre = cleanName(deMatch[1]);
  }
  if (!result.destinoNombre) {
    const aMatch = raw.match(/(?:^|[\r\n\s])(?:a|para|hacia)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})\s+(?:cuit|cuil|cvu|cbu)/i);
    if (aMatch) result.destinoNombre = cleanName(aMatch[1]);
  }
  if (!result.origenNombre || !result.destinoNombre) {
    const deParaPattern = /(?:desde|de)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})\s+(?:hacia|para|a)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})/i;
    const match = raw.match(deParaPattern);
    if (match) {
      if (!result.origenNombre) result.origenNombre = cleanName(match[1]);
      if (!result.destinoNombre) result.destinoNombre = cleanName(match[2]);
    }
  }

  // 10. Fallbacks heurísticos globales para CVUs faltantes
  const allCvus = raw.match(/\b\d{22}\b/g) || [];
  if (!result.origenCvu && !result.destinoCvu) {
    if (allCvus.length >= 1) result.origenCvu = allCvus[0];
    if (allCvus.length >= 2) result.destinoCvu = allCvus[1];
  } else if (result.origenCvu && !result.destinoCvu) {
    const candidateDest = allCvus.find(c => c !== result.origenCvu);
    if (candidateDest) result.destinoCvu = candidateDest;
  } else if (!result.origenCvu && result.destinoCvu) {
    const candidateOrig = allCvus.find(c => c !== result.destinoCvu);
    if (candidateOrig) result.origenCvu = candidateOrig;
  }
  
  // 11. Fallbacks heurísticos globales para CUITs faltantes
  const cuitPattern = /\b(20|23|24|27|30|33|34)[- ]?\d{8}[- ]?\d\b|\b\d{11}\b/g;
  const allCuits = (raw.match(cuitPattern) || []).map(c => c.replace(/\D/g, '')).filter(c => c.length === 11);
  if (!result.origenCuit && !result.destinoCuit) {
    if (allCuits.length >= 1) result.origenCuit = formatCuit(allCuits[0]);
    if (allCuits.length >= 2) result.destinoCuit = formatCuit(allCuits[1]);
  } else if (result.origenCuit && !result.destinoCuit) {
    const cleanOrig = result.origenCuit.replace(/\D/g, '');
    const candidateDest = allCuits.find(c => c !== cleanOrig);
    if (candidateDest) result.destinoCuit = formatCuit(candidateDest);
  } else if (!result.origenCuit && result.destinoCuit) {
    const cleanDest = result.destinoCuit.replace(/\D/g, '');
    const candidateOrig = allCuits.find(c => c !== cleanDest);
    if (candidateOrig) result.origenCvu = formatCuit(candidateOrig);
  }
  
  return result;
}


/* ============================================================================
   SECCIÓN 5: GESTIÓN DEL FORMULARIO Y ESTADOS DE INTERFAZ
   ============================================================================ */

/**
 * Inserta los datos parseados en los inputs, lanza animaciones visuales
 * y actualiza la previsualización del comprobante.
 * @param {Object} data - Objeto con los datos extraídos.
 */
function populateForm(data) {
  let fieldsCount = 0;
  
  if (data.origenNombre) { el.origenNombre.value = data.origenNombre.toUpperCase(); highlight(el.origenNombre); fieldsCount++; }
  if (data.origenCuit) { el.origenCuit.value = formatCuit(data.origenCuit); highlight(el.origenCuit); fieldsCount++; }
  if (data.origenCvu) { el.origenCvu.value = data.origenCvu; highlight(el.origenCvu); fieldsCount++; }
  
  if (data.destinoNombre) { el.destinoNombre.value = data.destinoNombre.toUpperCase(); highlight(el.destinoNombre); fieldsCount++; }
  if (data.destinoCuit) { el.destinoCuit.value = formatCuit(data.destinoCuit); highlight(el.destinoCuit); fieldsCount++; }
  if (data.destinoCvu) { el.destinoCvu.value = data.destinoCvu; highlight(el.destinoCvu); fieldsCount++; }
  
  if (data.monto) { el.monto.value = data.monto; highlight(el.monto); fieldsCount++; }
  if (data.fechaHora) { el.fechaHora.value = data.fechaHora; highlight(el.fechaHora); fieldsCount++; }
  if (data.idCoelsa) { el.idCoelsa.value = data.idCoelsa; highlight(el.idCoelsa); fieldsCount++; }
  
  updateCounters();
  renderComprobante();
  
  // Feedback informativo para el usuario
  if (fieldsCount > 0) {
    showStatusMsg(`¡Se detectaron y cargaron ${fieldsCount} campos con éxito!`, 'success');
  } else {
    showStatusMsg(`No se pudieron reconocer campos clave. Podés completarlos manualmente en el formulario.`, 'warning');
  }
}

/**
 * Aplica una animación CSS de destello en un input forzando un reflow inmediato del DOM.
 * @param {HTMLElement} inputEl - Elemento input a resaltar.
 */
function highlight(inputEl) {
  inputEl.classList.remove('highlight');
  void inputEl.offsetWidth; // Forzar reflow para reiniciar la animación CSS
  inputEl.classList.add('highlight');
}

/**
 * Muestra el mensaje de estado del parser (éxito o advertencia).
 * @param {string} msg - Mensaje de texto.
 * @param {'success'|'warning'} type - Tipo de notificación.
 */
function showStatusMsg(msg, type = 'success') {
  el.parseStatusMsg.textContent = msg;
  el.parseStatusMsg.className = `parse-feedback ${type}`;
}

/**
 * Valida y actualiza en tiempo real los contadores numéricos de longitud de los CVUs (X/22).
 */
function updateCounters() {
  const oLen = (el.origenCvu.value || '').replace(/\D/g, '').length;
  el.origenCvuCounter.textContent = `${oLen}/22`;
  el.origenCvuCounter.className = `form-label-counter ${oLen === 22 ? 'valid' : ''}`;
  
  const dLen = (el.destinoCvu.value || '').replace(/\D/g, '').length;
  el.destinoCvuCounter.textContent = `${dLen}/22`;
  el.destinoCvuCounter.className = `form-label-counter ${dLen === 22 ? 'valid' : ''}`;
}

/**
 * Invierte rápidamente los datos de Origen y Destino
 * (útil si el comprobante original venía en sentido opuesto).
 */
function swapOriginDestination() {
  const tmpNombre = el.origenNombre.value.toUpperCase();
  const tmpCuit = el.origenCuit.value;
  const tmpCvu = el.origenCvu.value;
  
  el.origenNombre.value = el.destinoNombre.value.toUpperCase();
  el.origenCuit.value = el.destinoCuit.value;
  el.origenCvu.value = el.destinoCvu.value;
  
  el.destinoNombre.value = tmpNombre;
  el.destinoCuit.value = tmpCuit;
  el.destinoCvu.value = tmpCvu;
  
  highlight(el.origenNombre);
  highlight(el.origenCuit);
  highlight(el.origenCvu);
  highlight(el.destinoNombre);
  highlight(el.destinoCuit);
  highlight(el.destinoCvu);
  
  updateCounters();
  renderComprobante();
  showToast('Origen y Destino invertidos');
}

/**
 * Limpia todos los campos del formulario y restablece el lienzo del comprobante.
 */
function clearAll() {
  el.rawInput.value = '';
  el.origenNombre.value = '';
  el.origenCuit.value = '';
  el.origenCvu.value = '';
  el.destinoNombre.value = '';
  el.destinoCuit.value = '';
  el.destinoCvu.value = '';
  el.monto.value = '';
  el.fechaHora.value = '';
  el.idCoelsa.value = '';
  el.parseStatusMsg.style.display = 'none';
  updateCounters();
  renderComprobante();
  showToast('Formulario limpio');
}


/* ============================================================================
   SECCIÓN 6: MOTOR DE RENDERIZADO EN CANVAS 2D (ALTA RESOLUCIÓN)
   ============================================================================ */

/**
 * Dibuja un rectángulo con esquinas redondeadas en el contexto Canvas 2D.
 * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado 2D.
 * @param {number} x - Posición X inicial.
 * @param {number} y - Posición Y inicial.
 * @param {number} width - Ancho del rectángulo.
 * @param {number} height - Alto del rectángulo.
 * @param {number} radius - Radio de curvatura de las esquinas.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Trunca una cadena agregando puntos suspensivos (...) si supera el ancho máximo en píxeles.
 * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado 2D.
 * @param {string} text - Texto a evaluar.
 * @param {number} maxWidth - Ancho máximo permitido en píxeles.
 * @returns {string} Texto ajustado al ancho disponible.
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
}

/**
 * Renderizado de contingencia (fallback) si el logo vectorial demora en inicializarse.
 * @param {CanvasRenderingContext2D} ctx - Contexto de renderizado 2D.
 * @param {number} x - Posición X.
 * @param {number} y - Posición Y.
 */
function drawLogoFallback(ctx, x, y) {
  ctx.font = '900 24px "Public Sans", sans-serif';
  const grad = ctx.createLinearGradient(x, y, x + 120, y);
  grad.addColorStop(0, '#c514a7');
  grad.addColorStop(1, '#f20027');
  ctx.fillStyle = grad;
  ctx.textAlign = 'left';
  ctx.fillText('bezza pay', x, y + 28);
}

/**
 * MOTOR PRINCIPAL DE RENDERIZADO DEL COMPROBANTE
 * Sintetiza la tarjeta de transferencia bancaria sobre el Canvas utilizando
 * coordenadas exactas y una escala Retina 2x (1080x1760 px físicos) para máxima nitidez.
 */
function renderComprobante() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Dimensiones lógicas: Formato vertical de smartphone (540 x 880)
  const W = 540;
  const H = 880;
  const SCALE = 2; // Multiplicador para 300+ DPI
  
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  
  ctx.save();
  ctx.scale(SCALE, SCALE);
  
  // Limpiar lienzo
  ctx.clearRect(0, 0, W, H);
  
  // 1. Fondo principal de la tarjeta (borde recto y nítido)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  
  // Borde perimetral
  ctx.strokeStyle = '#EDEDF2';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, W, H);
  
  // 2. Barra de acento superior con degradado oficial Bezza Pay
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#c514a7');
  grad.addColorStop(1, '#f20027');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 7);
  
  // 3. Encabezado de Marca: Logo Bezza Pay y Subtítulo
  const logoX = 36;
  const logoY = 34;
  const logoW = 108;
  const logoH = 52.1;
  
  if (logoReady && logoImage) {
    try {
      ctx.drawImage(logoImage, logoX, logoY, logoW, logoH);
    } catch (e) {
      drawLogoFallback(ctx, logoX, logoY);
    }
  } else {
    drawLogoFallback(ctx, logoX, logoY);
  }
  
  // Subtítulo con espaciado de tracking
  ctx.textAlign = 'left';
  ctx.font = '700 11.5px "Public Sans", sans-serif';
  ctx.fillStyle = '#888899';
  ctx.letterSpacing = '1px';
  ctx.fillText('COMPROBANTE DE TRANSFERENCIA', logoX, 114);
  ctx.letterSpacing = '0px';
  
  // Línea divisoria superior
  ctx.beginPath();
  ctx.moveTo(36, 134);
  ctx.lineTo(W - 36, 134);
  ctx.strokeStyle = '#F0EFF6';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // 4. Hero de Estado: Círculo de éxito, Monto y Fecha
  const heroCenterX = W / 2;
  
  // Círculo de éxito en tono verde lima suave (#CAF14D)
  const circleY = 196;
  const circleR = 27;
  ctx.beginPath();
  ctx.arc(heroCenterX, circleY, circleR, 0, Math.PI * 2);
  ctx.fillStyle = '#F4FBD6';
  ctx.fill();
  ctx.strokeStyle = '#CAF14D';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  
  // Tilde vectorial en verde oscuro (#4F7300) para contraste de accesibilidad
  ctx.beginPath();
  ctx.moveTo(heroCenterX - 10, circleY - 1);
  ctx.lineTo(heroCenterX - 3, circleY + 7);
  ctx.lineTo(heroCenterX + 11, circleY - 6);
  ctx.strokeStyle = '#4F7300';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // Título de éxito
  ctx.textAlign = 'center';
  ctx.font = '800 21px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText('¡Transferencia exitosa!', heroCenterX, 250);
  
  // Monto destacado
  const montoVal = el.monto.value.trim() ? formatCurrency(el.monto.value) : '$ 0,00';
  ctx.font = '900 38px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(montoVal, heroCenterX, 300);
  
  // Fecha y hora
  const fechaVal = el.fechaHora.value.trim() || '-';
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#666677';
  ctx.fillText(fechaVal, heroCenterX, 334);
  
  // 5. Tarjeta continua de datos de la transferencia
  const boxX = 32;
  const boxW = W - 64;
  const boxY = 370;
  const boxH = 422;
  
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fillStyle = '#FAF9FE';
  ctx.fill();
  ctx.strokeStyle = '#EDEDF6';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  
  // --- BLOQUE 1: DATOS DEL ORIGEN (#D00070) ---
  ctx.textAlign = 'left';
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#d00070';
  ctx.letterSpacing = '1px';
  ctx.fillText('DATOS DEL ORIGEN', boxX + 22, boxY + 40);
  ctx.letterSpacing = '0px';
  
  // Nombre Titular Origen (siempre mayúsculas con truncado)
  const origenNom = (el.origenNombre.value.trim() || 'TITULAR DE ORIGEN').toUpperCase();
  ctx.font = '800 16px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(truncateText(ctx, origenNom, boxW - 44), boxX + 22, boxY + 72);
  
  // CUIT Origen
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('CUIT / CUIL:', boxX + 22, boxY + 102);
  ctx.font = '700 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(formatCuit(el.origenCuit.value.trim() || 'XX-XXXXXXXX-X'), boxX + 114, boxY + 102);
  
  // CVU Origen
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('CVU:', boxX + 22, boxY + 130);
  ctx.font = '600 12.5px "Public Sans", monospace';
  ctx.fillStyle = '#222222';
  ctx.fillText(el.origenCvu.value.trim() || '0000000000000000000000', boxX + 114, boxY + 130);
  
  // Línea separadora tenue 1
  ctx.beginPath();
  ctx.moveTo(boxX + 18, boxY + 158);
  ctx.lineTo(boxX + boxW - 18, boxY + 158);
  ctx.strokeStyle = '#EDEDF6';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // --- BLOQUE 2: DATOS DEL DESTINO (#D00070) ---
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#d00070';
  ctx.letterSpacing = '1px';
  ctx.fillText('DATOS DEL DESTINO', boxX + 22, boxY + 192);
  ctx.letterSpacing = '0px';
  
  // Nombre Titular Destino (siempre mayúsculas con truncado)
  const destinoNom = (el.destinoNombre.value.trim() || 'TITULAR DE DESTINO').toUpperCase();
  ctx.font = '800 16px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(truncateText(ctx, destinoNom, boxW - 44), boxX + 22, boxY + 224);
  
  // CUIT Destino
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('CUIT / CUIL:', boxX + 22, boxY + 254);
  ctx.font = '700 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(formatCuit(el.destinoCuit.value.trim() || 'XX-XXXXXXXX-X'), boxX + 114, boxY + 254);
  
  // CVU / CBU Destino
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('CVU / CBU:', boxX + 22, boxY + 282);
  ctx.font = '600 12.5px "Public Sans", monospace';
  ctx.fillStyle = '#222222';
  ctx.fillText(el.destinoCvu.value.trim() || '0000000000000000000000', boxX + 114, boxY + 282);
  
  // Línea separadora tenue 2
  ctx.beginPath();
  ctx.moveTo(boxX + 18, boxY + 310);
  ctx.lineTo(boxX + boxW - 18, boxY + 310);
  ctx.strokeStyle = '#EDEDF6';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // --- BLOQUE 3: DETALLES DE LA OPERACIÓN (ID COELSA) ---
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#666677';
  ctx.letterSpacing = '1px';
  ctx.fillText('DETALLES DE LA OPERACIÓN', boxX + 22, boxY + 344);
  ctx.letterSpacing = '0px';
  
  const idCoelsaVal = el.idCoelsa.value.trim() || '-';
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('ID COELSA', boxX + 22, boxY + 378);
  
  ctx.textAlign = 'right';
  ctx.font = '700 13px "Public Sans", monospace';
  ctx.fillStyle = '#111111';
  ctx.fillText(idCoelsaVal, boxX + boxW - 22, boxY + 378);
  
  ctx.restore();
}


/* ============================================================================
   SECCIÓN 7: ACCIONES DE EXPORTACIÓN Y PORTAPAPELES
   ============================================================================ */

/**
 * Descarga el comprobante como archivo de imagen PNG de alta resolución.
 */
function downloadReceiptPng() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  const idCoelsa = el.idCoelsa.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const titularDestino = (el.destinoNombre.value.trim() || 'usuario').replace(/[^a-zA-Z0-9]/g, '_');
  const suffix = idCoelsa ? idCoelsa.slice(-8) : Date.now().toString().slice(-8);
  const filename = `Comprobante-BezzaPay-${titularDestino}-${suffix}.png`;
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('¡Comprobante PNG descargado con éxito!');
}

/**
 * Copia la imagen PNG directamente al portapapeles del sistema operativo
 * mediante la Async Clipboard API (ClipboardItem), ideal para pegar directo en WhatsApp Web.
 */
async function copyReceiptToClipboard() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      downloadReceiptPng();
      showToast('Portapapeles no soportado, se descargó la imagen.');
      return;
    }
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        downloadReceiptPng();
        return;
      }
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showToast('¡Imagen copiada! Pegala directo en WhatsApp con Ctrl+V.');
      } catch (err) {
        console.warn('Error en clipboard write, descargando imagen:', err);
        downloadReceiptPng();
        showToast('Se descargó la imagen PNG.');
      }
    }, 'image/png');
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    downloadReceiptPng();
  }
}

/**
 * Abre el comprobante en un modal flotante en tamaño completo.
 */
function openFullscreenModal() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  el.compModalImg.src = canvas.toDataURL('image/png');
  el.compModal.classList.add('open');
}

/**
 * Cierra el modal de pantalla completa.
 */
function closeFullscreenModal() {
  el.compModal.classList.remove('open');
}

/**
 * Muestra una notificación temporal flotante (Toast).
 * @param {string} message - Texto de la notificación.
 */
let toastTimeout = null;
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  el.toast.textContent = message;
  el.toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    el.toast.classList.remove('show');
  }, 3200);
}


/* ============================================================================
   SECCIÓN 8: CONTROLADORES DE EVENTOS E INICIALIZACIÓN
   ============================================================================ */

/**
 * Registra todos los escuchadores de eventos del DOM (clicks, inputs, paste, blur).
 */
function initEvents() {
  // 1. Botón procesar texto desordenado
  el.btnParse.addEventListener('click', () => {
    const text = el.rawInput.value;
    const data = parseUnstructuredText(text);
    populateForm(data);
  });
  
  // 2. Procesamiento automático al pegar (evento paste) en el textarea
  el.rawInput.addEventListener('paste', () => {
    setTimeout(() => {
      const text = el.rawInput.value;
      const data = parseUnstructuredText(text);
      populateForm(data);
    }, 50);
  });
  
  // 3. Botón para leer directamente desde el portapapeles
  el.btnPasteClipboard.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          el.rawInput.value = text;
          const data = parseUnstructuredText(text);
          populateForm(data);
          showToast('Texto pegado desde el portapapeles');
        } else {
          showToast('El portapapeles está vacío');
        }
      } else {
        showToast('Permiso de portapapeles no disponible. Pegá con Ctrl+V');
        el.rawInput.focus();
      }
    } catch (e) {
      showToast('Presioná Ctrl+V en el campo de texto');
      el.rawInput.focus();
    }
  });
  
  // 4. Botón limpiar formulario
  el.btnClear.addEventListener('click', clearAll);
  
  // 5. Botón invertir origen y destino
  el.btnSwap.addEventListener('click', swapOriginDestination);
  
  // 6. Conversión automática a MAYÚSCULAS en tiempo real respetando la posición del cursor
  el.origenNombre.addEventListener('input', () => {
    const start = el.origenNombre.selectionStart;
    const end = el.origenNombre.selectionEnd;
    el.origenNombre.value = el.origenNombre.value.toUpperCase();
    el.origenNombre.setSelectionRange(start, end);
  });

  el.destinoNombre.addEventListener('input', () => {
    const start = el.destinoNombre.selectionStart;
    const end = el.destinoNombre.selectionEnd;
    el.destinoNombre.value = el.destinoNombre.value.toUpperCase();
    el.destinoNombre.setSelectionRange(start, end);
  });

  // 7. Reactividad en tiempo real: redibujar canvas con cualquier cambio en inputs
  const liveInputs = [
    el.origenNombre, el.origenCuit, el.origenCvu,
    el.destinoNombre, el.destinoCuit, el.destinoCvu,
    el.monto, el.fechaHora, el.idCoelsa
  ];
  
  liveInputs.forEach(input => {
    input.addEventListener('input', () => {
      updateCounters();
      renderComprobante();
    });
  });
  
  // 8. Auto-formateo de CUITs al perder el foco (blur)
  el.origenCuit.addEventListener('blur', () => {
    if (el.origenCuit.value) {
      el.origenCuit.value = formatCuit(el.origenCuit.value);
      renderComprobante();
    }
  });
  el.destinoCuit.addEventListener('blur', () => {
    if (el.destinoCuit.value) {
      el.destinoCuit.value = formatCuit(el.destinoCuit.value);
      renderComprobante();
    }
  });
  
  // 9. Auto-formateo de Monto al perder el foco (blur)
  el.monto.addEventListener('blur', () => {
    if (el.monto.value) {
      el.monto.value = formatCurrency(el.monto.value);
      renderComprobante();
    }
  });
  
  // 10. Botones de acción del comprobante
  el.btnDownloadPng.addEventListener('click', downloadReceiptPng);
  el.btnCopyImage.addEventListener('click', copyReceiptToClipboard);
  el.btnFullscreen.addEventListener('click', openFullscreenModal);
  
  // 11. Modal de pantalla completa
  el.compModalClose.addEventListener('click', closeFullscreenModal);
  el.compModal.addEventListener('click', (e) => {
    if (e.target === el.compModal) closeFullscreenModal();
  });
  el.btnModalDownload.addEventListener('click', downloadReceiptPng);
}

/**
 * Punto de entrada: Inicialización cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  loadLogo();
  updateCounters();
  renderComprobante();
});
