/**
 * Comprobantes Bezza Pay — Generador de Comprobantes de Transferencia
 * Permite cargar datos en cualquier orden o pegar texto libre/desordenado,
 * y genera una imagen PNG de alta resolución lista para enviar por WhatsApp o guardar.
 */

// SVG Oficial de Bezza Pay en formato data-uri para evitar cualquier bloqueo CORS en Canvas
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

// Pre-cargar la imagen del logo
let logoImage = null;
let logoReady = false;

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

// Elementos del DOM
const el = {
  rawInput: document.getElementById('rawInput'),
  btnParse: document.getElementById('btnParse'),
  btnPasteClipboard: document.getElementById('btnPasteClipboard'),
  btnClear: document.getElementById('btnClear'),
  parseStatusMsg: document.getElementById('parseStatusMsg'),
  
  // Origen
  origenNombre: document.getElementById('origenNombre'),
  origenCuit: document.getElementById('origenCuit'),
  origenCvu: document.getElementById('origenCvu'),
  origenCvuCounter: document.getElementById('origenCvuCounter'),
  
  // Destino
  destinoNombre: document.getElementById('destinoNombre'),
  destinoCuit: document.getElementById('destinoCuit'),
  destinoCvu: document.getElementById('destinoCvu'),
  destinoCvuCounter: document.getElementById('destinoCvuCounter'),
  
  btnSwap: document.getElementById('btnSwap'),
  
  // Operación
  monto: document.getElementById('monto'),
  fechaHora: document.getElementById('fechaHora'),
  idCoelsa: document.getElementById('idCoelsa'),
  
  // Salida
  receiptCanvas: document.getElementById('receiptCanvas'),
  btnDownloadPng: document.getElementById('btnDownloadPng'),
  btnCopyImage: document.getElementById('btnCopyImage'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  toast: document.getElementById('toast'),
  
  // Modal
  compModal: document.getElementById('compModal'),
  compModalImg: document.getElementById('compModalImg'),
  compModalClose: document.getElementById('compModalClose'),
  btnModalDownload: document.getElementById('btnModalDownload'),
};

/**
 * Formatea un CUIT a formato estándar con guiones: XX-XXXXXXXX-X
 */
function formatCuit(cuitRaw) {
  if (!cuitRaw) return '';
  const digits = String(cuitRaw).replace(/\D/g, '');
  if (digits.length !== 11) return String(cuitRaw).trim();
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/**
 * Formatea un valor numérico a moneda argentina: $ 150.000,00
 */
function formatCurrency(valRaw) {
  if (valRaw === undefined || valRaw === null || valRaw === '') return '$ 0,00';
  let str = String(valRaw).trim();
  
  // Si ya tiene signo $, limpiarlo temporalmente
  str = str.replace(/^\$\s*/, '');
  
  // Detectar separadores decimales y miles (ej: 150.000,50 o 150000.50 o 150000)
  let num = 0;
  if (str.includes(',') && str.includes('.')) {
    // Formato 150.000,50
    str = str.replace(/\./g, '').replace(',', '.');
    num = parseFloat(str) || 0;
  } else if (str.includes(',')) {
    // Formato 150000,50
    str = str.replace(',', '.');
    num = parseFloat(str) || 0;
  } else if (str.includes('.')) {
    // Si tiene un punto y 3 digitos después (ej: 150.000) es separador de miles
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
 * Obtiene la fecha y hora actual en formato estándar
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
 * Genera un ID COELSA aleatorio de 22 dígitos o estándar
 */
function generateCoelsaId() {
  let result = '000';
  for (let i = 0; i < 19; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

/**
 * PARSER INTELIGENTE DE TEXTO DESORDENADO
 * Analiza texto desestructurado (WhatsApp, correos, chats, logs)
 * y extrae los 9 campos requeridos sin importar el orden ni el formato.
 */
function parseUnstructuredText(text) {
  if (!text || !text.trim()) return {};
  
  const raw = text.trim();
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = {};
  
  // 1. Extraer todos los CVUs de 22 dígitos encontrados
  const cvuMatches = raw.match(/\b\d{22}\b/g) || [];
  
  // 2. Extraer todos los CUITs de 11 dígitos o con guiones
  // Formato XX-XXXXXXXX-X o 11 dígitos juntos
  const cuitPattern = /\b(20|23|24|27|30|33|34)[- ]?\d{8}[- ]?\d\b|\b\d{11}\b/g;
  const cuitMatches = (raw.match(cuitPattern) || []).map(c => c.replace(/\D/g, '')).filter(c => c.length === 11);
  
  // 3. Extraer Monto ($)
  // Busca patrones como $ 150.000,00 | $150000 | Monto: 150000 | Importe: 45.000 | 125000 ARS
  const montoRegex = /(?:monto|importe|total|pesos|\$|ars|transf(?:iri[oó]|erencia)?\s*(?:de)?)\s*[:=\-]?\s*\$?\s*([\d\.\,]+)/i;
  const montoMatch = raw.match(montoRegex);
  if (montoMatch && montoMatch[1]) {
    result.monto = formatCurrency(montoMatch[1]);
  } else {
    // Si hay un número con símbolo de pesos suelto
    const looseMonto = raw.match(/\$\s*([\d\.\,]+)/);
    if (looseMonto && looseMonto[1]) {
      result.monto = formatCurrency(looseMonto[1]);
    }
  }
  
  // 4. Extraer ID COELSA / ID Externo
  // El usuario indica que 'ID externo' se refiere al ID COELSA (alfanumérico o numérico de 22 caracteres)
  const coelsaRegex = /(?:id\s*externo|id_externo|externo|id\s*coelsa|coelsa|id\s*transacci[oó]n|transacci[oó]n|c[oó]digo|id)[:=\-\s]+([A-Za-z0-9_\-]{8,25})/i;
  const coelsaMatch = raw.match(coelsaRegex);
  if (coelsaMatch && coelsaMatch[1]) {
    result.idCoelsa = coelsaMatch[1].trim();
  } else {
    // Buscar si hay tokens alfanuméricos de 22 caracteres (letras y números)
    const all22 = raw.match(/\b[A-Za-z0-9]{22}\b/g) || [];
    const nonCvuCandidate = all22.find(c => !cvuMatches.includes(c));
    if (nonCvuCandidate) {
      result.idCoelsa = nonCvuCandidate;
    } else if (cvuMatches.length > 2) {
      // Si se ingresan 3 secuencias de 22 dígitos, la 3ra seguramente es el ID COELSA
      result.idCoelsa = cvuMatches[2];
    } else {
      // Buscar si hay un número largo de 15 a 25 dígitos que no sea el CVU
      const longNumMatches = raw.match(/\b\d{15,25}\b/g) || [];
      const candidate = longNumMatches.find(n => !cvuMatches.includes(n));
      if (candidate) {
        result.idCoelsa = candidate;
      }
    }
  }
  
  // 5. Extraer Fecha y Hora
  const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s*(?:a\s*las\s*)?[-–—@]?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:hs|hrs|am|pm))?)?)/i;
  const dateMatch = raw.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    let dStr = dateMatch[1].trim();
    if (!/hs|hrs|am|pm/i.test(dStr) && /\d{1,2}:\d{2}/.test(dStr)) {
      dStr += ' hs';
    }
    result.fechaHora = dStr;
  }
  
  // 6. Clasificar Origen y Destino por etiquetas o líneas
  // Primero buscamos líneas o secciones con palabras clave 'origen' / 'de' y 'destino' / 'para' / 'a'
  lines.forEach(line => {
    const l = line.toLowerCase();
    
    // Titular / Nombre Origen (convertido a mayúsculas)
    if (/^(?:titular\s*origen|nombre\s*origen|originante|de|emisor)[:=\-\s]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:titular\s*origen|nombre\s*origen|originante|de|emisor)[:=\-\s]+(.+)$/i);
      if (match && match[1]) result.origenNombre = cleanName(match[1]);
    } else if (l.includes('origen') && /titular|nombre/i.test(line)) {
      const match = line.match(/(?:titular|nombre)[^:]*[:=\-\s]+([^,\n\r]+)/i);
      if (match && match[1]) result.origenNombre = cleanName(match[1]);
    }
    
    // Titular / Nombre Destino (convertido a mayúsculas)
    if (/^(?:titular\s*destino|nombre\s*destino|destinatario|para|receptor|hacia)[:=\-\s]+(.+)$/i.test(line)) {
      const match = line.match(/^(?:titular\s*destino|nombre\s*destino|destinatario|para|receptor|hacia)[:=\-\s]+(.+)$/i);
      if (match && match[1]) result.destinoNombre = cleanName(match[1]);
    } else if (l.includes('destino') && /titular|nombre/i.test(line)) {
      const match = line.match(/(?:titular|nombre)[^:]*[:=\-\s]+([^,\n\r]+)/i);
      if (match && match[1]) result.destinoNombre = cleanName(match[1]);
    }
    
    // ID Externo / COELSA explícito en la línea
    if (/(?:id\s*externo|id_externo|externo|id\s*coelsa|coelsa)/i.test(line)) {
      const match = line.match(/(?:id\s*externo|id_externo|externo|id\s*coelsa|coelsa|id\s*transacci[oó]n)[:=\-\s]+([A-Za-z0-9_\-]{8,25})/i);
      if (match && match[1]) result.idCoelsa = match[1].trim();
    }
    
    // CVU explícito por línea
    if (/cvu.*origen|origen.*cvu|cuenta.*origen/i.test(line)) {
      const m = line.match(/\b\d{22}\b/);
      if (m) result.origenCvu = m[0];
    }
    if (/cvu.*destino|destino.*cvu|cuenta.*destino/i.test(line)) {
      const m = line.match(/\b\d{22}\b/);
      if (m) result.destinoCvu = m[0];
    }
    
    // CUIT explícito por línea
    if (/cuit.*origen|origen.*cuit|cuil.*origen/i.test(line)) {
      const m = line.match(/\b(20|23|24|27|30|33|34)[- ]?\d{8}[- ]?\d\b|\b\d{11}\b/);
      if (m) result.origenCuit = formatCuit(m[0]);
    }
    if (/cuit.*destino|destino.*cuit|cuil.*destino/i.test(line)) {
      const m = line.match(/\b(20|23|24|27|30|33|34)[- ]?\d{8}[- ]?\d\b|\b\d{11}\b/);
      if (m) result.destinoCuit = formatCuit(m[0]);
    }
  });
  
  // 7. Si no se asignaron CVUs explícitamente, usar el orden de aparición
  if (!result.origenCvu && cvuMatches.length > 0) {
    result.origenCvu = cvuMatches[0];
  }
  if (!result.destinoCvu && cvuMatches.length > 1) {
    result.destinoCvu = cvuMatches[1];
  }
  
  // 8. Si no se asignaron CUITs explícitamente, usar el orden de aparición
  if (!result.origenCuit && cuitMatches.length > 0) {
    result.origenCuit = formatCuit(cuitMatches[0]);
  }
  if (!result.destinoCuit && cuitMatches.length > 1) {
    result.destinoCuit = formatCuit(cuitMatches[1]);
  }
  
  // 9. Si faltan nombres, inferir nombres de personas o empresas en el texto
  if (!result.origenNombre || !result.destinoNombre) {
    inferNames(raw, result);
  }
  
  return result;
}

/**
 * Limpia un nombre extraído para remover etiquetas o números residuales y convertirlo a MAYÚSCULAS
 */
function cleanName(rawName) {
  let name = rawName.replace(/(?:cuit|cuil|cvu|cbu|monto|fecha|coelsa|id|externo)[\s\S]*/i, '');
  name = name.replace(/[;,\(\)\{\}\[\]\<\>]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name.toUpperCase();
}

/**
 * Infiere nombres si no tenían etiquetas estrictas
 */
function inferNames(raw, result) {
  // Patrón "de [Nombre] ... para [Nombre]" o "[Nombre] transfirió a [Nombre]"
  const deParaPattern = /(?:desde|de)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})\s+(?:hacia|para|a)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})/i;
  const match = raw.match(deParaPattern);
  if (match) {
    if (!result.origenNombre) result.origenNombre = cleanName(match[1]);
    if (!result.destinoNombre) result.destinoNombre = cleanName(match[2]);
  }
}

/**
 * Llena el formulario con los datos procesados y activa efecto visual
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
  
  // Si no se detectó fecha u hora, sugerir la actual
  if (!el.fechaHora.value.trim()) {
    el.fechaHora.value = getCurrentDateTimeString();
    highlight(el.fechaHora);
  }
  
  // Si no se detectó ID Coelsa, sugerir uno
  if (!el.idCoelsa.value.trim()) {
    el.idCoelsa.value = generateCoelsaId();
    highlight(el.idCoelsa);
  }
  
  updateCounters();
  renderComprobante();
  
  // Mostrar mensaje de estado
  if (fieldsCount > 0) {
    showStatusMsg(`¡Se detectaron y cargaron ${fieldsCount} campos con éxito!`, 'success');
  } else {
    showStatusMsg(`No se pudieron reconocer campos clave. Podés completarlos manualmente en el formulario.`, 'warning');
  }
}

function highlight(inputEl) {
  inputEl.classList.remove('highlight');
  void inputEl.offsetWidth; // trigger reflow
  inputEl.classList.add('highlight');
}

function showStatusMsg(msg, type = 'success') {
  el.parseStatusMsg.textContent = msg;
  el.parseStatusMsg.className = `parse-feedback ${type}`;
}

function updateCounters() {
  const oLen = (el.origenCvu.value || '').replace(/\D/g, '').length;
  el.origenCvuCounter.textContent = `${oLen}/22`;
  el.origenCvuCounter.className = `form-label-counter ${oLen === 22 ? 'valid' : ''}`;
  
  const dLen = (el.destinoCvu.value || '').replace(/\D/g, '').length;
  el.destinoCvuCounter.textContent = `${dLen}/22`;
  el.destinoCvuCounter.className = `form-label-counter ${dLen === 22 ? 'valid' : ''}`;
}

/**
 * Invierte los datos de Origen y Destino
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
 * Carga un ejemplo realista de prueba
 */
function loadMockExample() {
  const mockText = `Comprobante de Transferencia Inmediata
Monto: $ 185.450,00
Fecha: ${getCurrentDateTimeString()}
Titular Origen: JUAN CARLOS RODRÍGUEZ
CUIT Origen: 20-33445566-7
CVU Origen: 0000003100019283746501
Titular Destino: MARÍA BELÉN ÁLVAREZ
CUIT Destino: 27-41029384-5
CVU Destino: 0000004400083920194827
ID COELSA: ${generateCoelsaId()}`;

  el.rawInput.value = mockText;
  const parsed = parseUnstructuredText(mockText);
  populateForm(parsed);
  showToast('Datos de ejemplo cargados');
}

/**
 * Limpia el formulario
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
  el.fechaHora.value = getCurrentDateTimeString();
  el.idCoelsa.value = generateCoelsaId();
  el.parseStatusMsg.style.display = 'none';
  updateCounters();
  renderComprobante();
  showToast('Formulario limpio');
}

/**
 * MOTOR DE RENDERIZADO DEL COMPROBANTE EN CANVAS (ALTA RESOLUCIÓN)
 * Genera una tarjeta de comprobante bancario nítida y moderna con los colores oficiales de Bezza Pay.
 */
function renderComprobante() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Dimensiones lógicas: Formato alargado rectangular como pantalla de celular (Smartphone 540x880)
  const W = 540;
  const H = 880;
  const SCALE = 2;
  
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  
  ctx.save();
  ctx.scale(SCALE, SCALE);
  
  // Limpiar lienzo
  ctx.clearRect(0, 0, W, H);
  
  // 1. Fondo de la tarjeta (TOTALMENTE RECTO Y PUNTIAGUDO, SIN NINGÚN REDONDEO)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  
  // Borde exterior totalmente recto
  ctx.strokeStyle = '#EDEDF2';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, W, H);
  
  // 2. Barra de acento superior recta con degradado oficial de Bezza Pay
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#c514a7');
  grad.addColorStop(1, '#f20027');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 7);
  
  // 3. Encabezado de Marca: Logo Bezza Pay agrandado y con padding inferior
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
  
  // Subtítulo con separación / padding bottom respecto al logo
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
  
  // 4. Hero: Ícono de éxito con colores de la gama #CAF14D, Monto y Fecha
  const heroCenterX = W / 2;
  
  // Círculo de éxito (gama #CAF14D)
  const circleY = 196;
  const circleR = 27;
  ctx.beginPath();
  ctx.arc(heroCenterX, circleY, circleR, 0, Math.PI * 2);
  ctx.fillStyle = '#F4FBD6'; // fondo suave de la gama lima #CAF14D
  ctx.fill();
  ctx.strokeStyle = '#CAF14D'; // borde lima oficial Bezza Pay
  ctx.lineWidth = 2.4;
  ctx.stroke();
  
  // Tilde en gama #CAF14D (verde lima intenso para contraste nítido y perfecta legibilidad)
  ctx.beginPath();
  ctx.moveTo(heroCenterX - 10, circleY - 1);
  ctx.lineTo(heroCenterX - 3, circleY + 7);
  ctx.lineTo(heroCenterX + 11, circleY - 6);
  ctx.strokeStyle = '#4F7300';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // Texto "¡Transferencia Exitosa!"
  ctx.textAlign = 'center';
  ctx.font = '800 21px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText('¡Transferencia Exitosa!', heroCenterX, 250);
  
  // Monto grande
  const montoVal = el.monto.value.trim() ? formatCurrency(el.monto.value) : '$ 0,00';
  ctx.font = '900 38px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(montoVal, heroCenterX, 300);
  
  // Fecha y hora
  const fechaVal = el.fechaHora.value.trim() || getCurrentDateTimeString();
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#666677';
  ctx.fillText(fechaVal, heroCenterX, 334);
  
  // 5. UN SOLO CUADRO CONTINUO BIEN CENTRADO Y SIN ESPACIO SOBRANTE EN LA BASE
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
  
  // --- BLOQUE 1: DATOS DEL ORIGEN (en color #D00070 y en MAYÚSCULAS) ---
  ctx.textAlign = 'left';
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#d00070';
  ctx.letterSpacing = '1px';
  ctx.fillText('DATOS DEL ORIGEN', boxX + 22, boxY + 40);
  ctx.letterSpacing = '0px';
  
  // Nombre Titular Origen (siempre en mayúsculas)
  const origenNom = (el.origenNombre.value.trim() || 'TITULAR DE ORIGEN').toUpperCase();
  ctx.font = '800 16px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(truncateText(ctx, origenNom, boxW - 44), boxX + 22, boxY + 72);
  
  // CUIT / CUIL Origen
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
  
  // --- BLOQUE 2: DATOS DEL DESTINO (en color #D00070, con CVU / CBU y en MAYÚSCULAS) ---
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#d00070';
  ctx.letterSpacing = '1px';
  ctx.fillText('DATOS DEL DESTINO', boxX + 22, boxY + 192);
  ctx.letterSpacing = '0px';
  
  // Nombre Titular Destino (siempre en mayúsculas)
  const destinoNom = (el.destinoNombre.value.trim() || 'TITULAR DE DESTINO').toUpperCase();
  ctx.font = '800 16px "Public Sans", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(truncateText(ctx, destinoNom, boxW - 44), boxX + 22, boxY + 224);
  
  // CUIT / CUIL Destino
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('CUIT / CUIL:', boxX + 22, boxY + 254);
  ctx.font = '700 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(formatCuit(el.destinoCuit.value.trim() || 'XX-XXXXXXXX-X'), boxX + 114, boxY + 254);
  
  // CVU / CBU Destino (Con B larga)
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
  
  // --- BLOQUE 3: DETALLES DE LA OPERACIÓN (Únicamente ID COELSA) ---
  ctx.font = '800 11px "Public Sans", sans-serif';
  ctx.fillStyle = '#666677';
  ctx.letterSpacing = '1px';
  ctx.fillText('DETALLES DE LA OPERACIÓN', boxX + 22, boxY + 344);
  ctx.letterSpacing = '0px';
  
  const idCoelsaVal = el.idCoelsa.value.trim() || 'COELSA-0000000000000000';
  
  ctx.font = '500 13px "Public Sans", sans-serif';
  ctx.fillStyle = '#777788';
  ctx.fillText('ID COELSA', boxX + 22, boxY + 378);
  
  ctx.textAlign = 'right';
  ctx.font = '700 13px "Public Sans", monospace';
  ctx.fillStyle = '#111111';
  ctx.fillText(idCoelsaVal, boxX + boxW - 22, boxY + 378);
  
  ctx.restore();
}

/**
 * Dibuja un rectángulo con esquinas redondeadas
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
 * Trunca texto agregando puntos suspensivos si excede el ancho
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
 * Fallback para el logo si la imagen tarda en inicializar
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
 * Descarga el comprobante en formato PNG
 */
function downloadReceiptPng() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  const idCoelsa = (el.idCoelsa.value.trim() || 'COELSA').replace(/[^a-zA-Z0-9_-]/g, '');
  const titularDestino = (el.destinoNombre.value.trim() || 'usuario').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Comprobante-BezzaPay-${titularDestino}-${idCoelsa.slice(-8)}.png`;
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('¡Comprobante PNG descargado con éxito!');
}

/**
 * Copia la imagen PNG directamente al portapapeles del sistema (ideal para pegar en WhatsApp Web)
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
 * Abre el comprobante en tamaño completo dentro de un modal
 */
function openFullscreenModal() {
  const canvas = el.receiptCanvas;
  if (!canvas) return;
  
  el.compModalImg.src = canvas.toDataURL('image/png');
  el.compModal.classList.add('open');
}

function closeFullscreenModal() {
  el.compModal.classList.remove('open');
}

/**
 * Toast flotante
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

/**
 * Vinculación de Eventos
 */
function initEvents() {
  // Botón procesar datos desordenados
  el.btnParse.addEventListener('click', () => {
    const text = el.rawInput.value;
    const data = parseUnstructuredText(text);
    populateForm(data);
  });
  
  // Procesamiento automático al pegar en el textarea
  el.rawInput.addEventListener('paste', () => {
    setTimeout(() => {
      const text = el.rawInput.value;
      const data = parseUnstructuredText(text);
      populateForm(data);
    }, 50);
  });
  
  // Botón pegar del portapapeles
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
  
  // Botón limpiar formulario
  el.btnClear.addEventListener('click', clearAll);
  
  // Botón invertir origen y destino
  el.btnSwap.addEventListener('click', swapOriginDestination);
  
  // Conversión automática a MAYÚSCULAS en tiempo real para nombres
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

  // Eventos de inputs individuales para actualización en tiempo real
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
  
  // Auto formateo de CUITs al salir del foco
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
  
  // Auto formateo de Monto al salir del foco
  el.monto.addEventListener('blur', () => {
    if (el.monto.value) {
      el.monto.value = formatCurrency(el.monto.value);
      renderComprobante();
    }
  });
  
  // Botones de acción del comprobante
  el.btnDownloadPng.addEventListener('click', downloadReceiptPng);
  el.btnCopyImage.addEventListener('click', copyReceiptToClipboard);
  el.btnFullscreen.addEventListener('click', openFullscreenModal);
  
  // Modal
  el.compModalClose.addEventListener('click', closeFullscreenModal);
  el.compModal.addEventListener('click', (e) => {
    if (e.target === el.compModal) closeFullscreenModal();
  });
  el.btnModalDownload.addEventListener('click', downloadReceiptPng);
}

// Inicialización general
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar fecha y hora actual por defecto
  if (!el.fechaHora.value) {
    el.fechaHora.value = getCurrentDateTimeString();
  }
  // Inicializar ID Coelsa por defecto
  if (!el.idCoelsa.value) {
    el.idCoelsa.value = generateCoelsaId();
  }
  
  initEvents();
  loadLogo();
  updateCounters();
  
  // Cargar ejemplo inicial para que la vista previa nazca llena y atractiva
  loadMockExample();
});
