import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/* =====================================================
   CONFIGURACIÓN Y DETECCIÓN DEL NAVEGADOR
   ===================================================== */

const PORT = parseInt(process.env.PORT || '3000', 10);

const POSSIBLE_BROWSER_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Users\\' + (process.env.USERNAME || '') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

function getBrowserPath() {
  for (const p of POSSIBLE_BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'No se encontró una instalación compatible de Google Chrome o Microsoft Edge en tu sistema. ' +
    'Por favor instala Google Chrome o configura la variable CHROME_PATH.'
  );
}

/* =====================================================
   UTILIDADES DE CUIT Y VALIDACIÓN
   ===================================================== */

/**
 * Formatea un CUIT a formato estándar con guiones: XX-XXXXXXXX-X
 */
export function formatCuit(cuitRaw) {
  if (!cuitRaw) return '';
  const digits = String(cuitRaw).replace(/\D/g, '');
  if (digits.length !== 11) return String(cuitRaw).trim();
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/**
 * Valida un CUIT con el algoritmo argentino de módulo 11.
 */
export function isValidCuit(cuitRaw) {
  const digits = String(cuitRaw).replace(/\D/g, '');
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }
  const mod = sum % 11;
  const check = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return check === parseInt(digits[10], 10);
}

/* =====================================================
   CACHE EN MEMORIA DE CONSULTAS
   ===================================================== */

const alicuotaCache = new Map();

function getCacheKey(sistema, cuitFormatted, anio, mes) {
  return `${sistema.toLowerCase()}:${cuitFormatted}:${anio}-${String(mes).padStart(2, '0')}`;
}

/* =====================================================
   MOTOR DE CONSULTA AUTOMATIZADA CON PUPPETEER
   ===================================================== */

const COMARB_URL = 'https://sircreb.comarb.gob.ar/sircreb/contribuyente/';

// Tiempos configurables por variables de entorno
const BROWSER_IDLE_MS         = parseInt(process.env.BROWSER_IDLE_MS || '600000', 10);       // Chrome abierto 10 min tras la última consulta
const PAGE_LOAD_TIMEOUT_MS    = parseInt(process.env.PAGE_LOAD_TIMEOUT_MS || '45000', 10);   // Carga inicial del sitio de COMARB (sitio estatal con latencia variable)
const FORM_READY_TIMEOUT_MS   = parseInt(process.env.FORM_READY_TIMEOUT_MS || '15000', 10);  // Render del formulario (SPA React)
const API_RESPONSE_TIMEOUT_MS = parseInt(process.env.API_RESPONSE_TIMEOUT_MS || '20000', 10); // reCAPTCHA + respuesta de consulta_padron

// Selectores del campo CUIT en orden de prioridad
// (la página de COARB cambió su DOM; probamos los más probables en orden)
const CUIT_SELECTORS = ['#cuit', 'input[name="cuit"]', 'input[id*="cuit" i]', 'input[placeholder*="CUIT" i]', 'input[type="text"]'];
const CUIT_SELECTOR_ANY = CUIT_SELECTORS.join(', ');
// El botón tiene classes "boton btn btn-primary" (confirmado en DOM live)
const SUBMIT_SELECTOR = 'button.boton.btn-primary, button.boton';

// En modo CLI no tiene sentido precargar pestañas ni mantener Chrome abierto
const IS_CLI_MODE = process.argv.includes('--cuit') || process.argv.includes('-c');

let sharedBrowser = null;
let browserLaunchPromise = null; // Evita lanzar dos Chrome si llegan consultas simultáneas
let browserCloseTimeout = null;
let warmPagePromise = null;      // Pestaña precargada en COMARB lista para la próxima consulta
let activeQueries = 0;           // Consultas en curso (el cierre por inactividad las respeta)

// User-Agent de Chrome real para evadir detección de bot
const STEALTH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.connected) return sharedBrowser;

  if (!browserLaunchPromise) {
    const executablePath = getBrowserPath();
    browserLaunchPromise = puppeteer
      .launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--window-size=1366,768',
          // Anti-detección: flags que reducen la huella de automatización
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-extensions',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-web-security',
          '--lang=es-AR,es',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
      })
      .then((browser) => {
        sharedBrowser = browser;
        browser.on('disconnected', () => {
          if (sharedBrowser === browser) sharedBrowser = null;
          warmPagePromise = null;
        });
        return browser;
      })
      .finally(() => {
        browserLaunchPromise = null;
      });
  }
  return browserLaunchPromise;
}

function cancelBrowserClose() {
  if (browserCloseTimeout) {
    clearTimeout(browserCloseTimeout);
    browserCloseTimeout = null;
  }
}

/**
 * Programa el cierre de Chrome tras BROWSER_IDLE_MS sin consultas.
 * Nunca cierra el navegador mientras haya consultas en curso.
 */
function scheduleBrowserClose() {
  if (IS_CLI_MODE) return;
  cancelBrowserClose();
  if (activeQueries > 0) return;
  browserCloseTimeout = setTimeout(async () => {
    browserCloseTimeout = null;
    if (activeQueries > 0) return;
    const browser = sharedBrowser;
    sharedBrowser = null;
    warmPagePromise = null;
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }, BROWSER_IDLE_MS);
}

/**
 * Aplica anti-detección, cabeceras y bloqueo de recursos pesados a una pestaña.
 */
async function setupPage(page) {
  // --- Anti-detección: sobreescribir fingerprints de automatización ---
  await page.evaluateOnNewDocument(() => {
    // Eliminar el flag navigator.webdriver que delata a Puppeteer
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Simular plugins reales de Chrome
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    // Simular idioma argentino
    Object.defineProperty(navigator, 'language', { get: () => 'es-AR' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es'] });
    // Ocultar que es headless
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });

  // Usar User-Agent de Chrome real
  await page.setUserAgent(STEALTH_UA);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-AR,es;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  await page.setViewport({ width: 1366, height: 768 });

  // Bloquear solo imágenes, fuentes pesadas y medios (sin bloquear hojas de estilo o scripts esenciales)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resource = req.resourceType();
    if (['image', 'font', 'media'].includes(resource)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/**
 * Abre una pestaña nueva, navega a COMARB y espera a que el formulario esté listo.
 */
async function createReadyPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await setupPage(page);

    // domcontentloaded es mucho más rápido que networkidle2 (no espera analytics/reCAPTCHA en segundo plano)
    await page.goto(COMARB_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT_MS });

    // La página es una SPA (React): esperamos a que se renderice CUALQUIERA de los selectores conocidos
    // en una sola espera (antes se probaban uno por uno con 5s cada uno)
    try {
      await page.waitForSelector(CUIT_SELECTOR_ANY, { timeout: FORM_READY_TIMEOUT_MS });
    } catch (e) {
      // Volcar el HTML del body para diagnóstico
      const bodySnippet = await page
        .evaluate(() => document.body?.innerHTML?.substring(0, 1500) || 'sin body')
        .catch(() => 'sin body');
      console.error('[SIRCREB Bot] HTML recibido (primeros 1500 chars):', bodySnippet);
      throw new Error('No se encontró el campo CUIT en ninguno de los selectores conocidos. Posible bloqueo por IP o cambio en la página de COARB.');
    }
    return page;
  } catch (err) {
    try { await page.close(); } catch (e) {}
    throw err;
  }
}

/**
 * Deja una pestaña precargada en COMARB para que la próxima consulta solo complete el formulario.
 */
function prewarmPage() {
  if (IS_CLI_MODE || warmPagePromise) return;
  const promise = createReadyPage();
  warmPagePromise = promise;
  promise.catch((err) => {
    if (warmPagePromise === promise) warmPagePromise = null;
    console.warn('[SIRCREB Bot] No se pudo precargar la página de COMARB:', err.message);
  });
}

/**
 * Obtiene una pestaña con el formulario listo: usa la precargada si está disponible, si no crea una.
 */
async function acquireReadyPage() {
  const pending = warmPagePromise;
  warmPagePromise = null;
  if (pending) {
    try {
      const page = await pending;
      if (!page.isClosed() && (await page.$(CUIT_SELECTOR_ANY))) {
        console.log('[SIRCREB Bot] Usando pestaña precargada.');
        return page;
      }
      try { await page.close(); } catch (e) {}
    } catch (e) {
      // La precarga falló o el navegador se cerró: se crea una pestaña nueva
    }
  }
  return createReadyPage();
}

/**
 * Realiza la consulta de uno o varios períodos para un CUIT y sistema determinado.
 * @param {string} sistema - 'sirtac' (default), 'sircreb', o 'sircupa'
 * @param {string} cuit - CUIT a consultar
 * @param {Array<{ anio: number, mes: number }>} periodos - Lista de períodos a consultar
 */
export async function queryComarbPadron(sistema = 'sirtac', cuit, periodos = []) {
  const sisNorm = (sistema || 'sirtac').toLowerCase().trim();
  if (!['sirtac', 'sircreb', 'sircupa'].includes(sisNorm)) {
    throw new Error(`Sistema no soportado: "${sistema}". Los valores válidos son "sirtac", "sircreb" o "sircupa".`);
  }

  const cuitFormatted = formatCuit(cuit);
  if (!isValidCuit(cuitFormatted)) {
    throw new Error(`CUIT inválido: "${cuit}". Verifique que contenga 11 dígitos con dígito verificador correcto.`);
  }

  const results = {
    cuit: cuitFormatted,
    sistema: sisNorm,
    razonSocial: null,
    periodos: {},
  };

  // Identificar qué períodos ya están en caché y cuáles requieren consulta web
  const pendingPeriods = [];
  for (const p of periodos) {
    const periodKey = `${p.anio}-${String(p.mes).padStart(2, '0')}`;
    const cacheKey = getCacheKey(sisNorm, cuitFormatted, p.anio, p.mes);
    if (alicuotaCache.has(cacheKey)) {
      const cached = alicuotaCache.get(cacheKey);
      results.periodos[periodKey] = cached;
      if (cached.razonSocial && !results.razonSocial) {
        results.razonSocial = cached.razonSocial;
      }
    } else {
      pendingPeriods.push(p);
    }
  }

  if (pendingPeriods.length === 0) {
    return results;
  }

  activeQueries++;
  cancelBrowserClose();
  let page = null;

  try {
    // Usar la pestaña precargada (si existe) o abrir una nueva con el formulario listo
    page = await acquireReadyPage();

    // El formulario ya está renderizado: elegir el selector de CUIT de mayor prioridad presente
    let foundCuitSelector = null;
    for (const sel of CUIT_SELECTORS) {
      if (await page.$(sel)) {
        foundCuitSelector = sel;
        break;
      }
    }
    if (!foundCuitSelector) {
      throw new Error('No se encontró el campo CUIT en ninguno de los selectores conocidos. Posible bloqueo por IP o cambio en la página de COARB.');
    }

    // 1. Seleccionar el sistema (SIRTAC, SIRCREB, SIRCUPA)
    // Los radio buttons usan IDs numéricos: 1=SIRCREB, 2=SIRCUPA, 3=SIRTAC
    // Nota: #1 #2 #3 no son selectores CSS válidos → usar [id="N"]
    const sistemaIdMap = { sircreb: '[id="1"]', sircupa: '[id="2"]', sirtac: '[id="3"]' };
    const radioSelector = sistemaIdMap[sisNorm];
    if (!radioSelector) {
      throw new Error(`No se encontró la opción para el sistema ${sisNorm} en la página.`);
    }
    const radio = await page.$(radioSelector);
    if (radio) {
      await radio.click();
    } else {
      throw new Error(`No se encontró el radio button ${radioSelector} para el sistema ${sisNorm}.`);
    }

    // 2. Ingresar CUIT con formato XX-XXXXXXXX-X (usando el selector que funcionó)
    const cuitInput = await page.$(foundCuitSelector);
    if (!cuitInput) {
      throw new Error('No se encontró el campo de CUIT en la página.');
    }
    await cuitInput.click({ clickCount: 3 });
    await cuitInput.type(cuitFormatted, { delay: 10 });

    /**
     * Cierra el modal previo si quedó abierto, selecciona el período, hace clic en Consultar
     * y devuelve el JSON de consulta_padron (o null si no hubo respuesta a tiempo).
     */
    const submitPeriod = async (p) => {
      // 1. Cerrar modal anterior si quedó abierto
      const closeBtn = await page.$('.btn-close, button.close, .modal-header button, .modal button');
      if (closeBtn) {
        try { await closeBtn.click(); } catch (e) {}
        await new Promise((r) => setTimeout(r, 200));
      }

      // 2. Seleccionar año y mes (la página actualizada usa id="anio" e id="mes")
      await page.select('#anio', String(p.anio));
      await page.select('#mes', String(p.mes));

      await page.evaluate(() => {
        document.querySelector('#mes')?.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('#anio')?.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await new Promise((r) => setTimeout(r, 150));

      // 3. Registrar la espera ANTES del clic para no perder la respuesta.
      // Resuelve apenas llega la respuesta (sin polling) y cubre reCAPTCHA + API.
      const apiResponsePromise = page
        .waitForResponse((response) => response.url().includes('consulta_padron'), {
          timeout: API_RESPONSE_TIMEOUT_MS,
        })
        .then(async (response) => {
          const buffer = await response.buffer();
          const text = new TextDecoder('iso-8859-1').decode(buffer);
          return JSON.parse(text);
        })
        .catch((e) => {
          if (e?.name !== 'TimeoutError') {
            console.error('[SIRCREB Bot] Error al decodificar respuesta:', e);
          }
          return null;
        });

      // 4. Clic en Consultar (el botón tiene classes "boton btn btn-primary", confirmado en DOM live)
      const submitBtn = await page.$(SUBMIT_SELECTOR);
      if (!submitBtn) {
        throw new Error('No se encontró el botón Consultar');
      }
      await submitBtn.click();

      return apiResponsePromise;
    };

    // 3. Iterar por cada período pendiente en la misma sesión
    for (const p of pendingPeriods) {
      const periodKey = `${p.anio}-${String(p.mes).padStart(2, '0')}`;

      try {
        let apiResponse = await submitPeriod(p);
        let domAlert = null;

        if (!apiResponse) {
          domAlert = await page.evaluate(() => {
            const alert = document.querySelector('.modal, .alert, .invalid-feedback');
            return alert ? alert.innerText.trim() : null;
          });
        }

        const isTransient =
          (apiResponse?.error && String(apiResponse.error.detail || '').toLowerCase().includes('error inesperado')) ||
          (domAlert && domAlert.toLowerCase().includes('error inesperado'));

        if (isTransient) {
          console.warn(`[SIRCREB Bot] Error transitorio en ${periodKey}, reintentando una vez...`);
          await new Promise((r) => setTimeout(r, 1200));
          apiResponse = await submitPeriod(p);
          if (!apiResponse) {
            domAlert = await page.evaluate(() => {
              const alert = document.querySelector('.modal, .alert, .invalid-feedback');
              return alert ? alert.innerText.trim() : null;
            });
          }
        }

        if (!apiResponse) {
          results.periodos[periodKey] = {
            status: 'error',
            error: domAlert || 'Tiempo de espera agotado sin respuesta del servidor de Comarb.',
            alicuota: null,
            rate: null,
          };
          continue;
        }

        // Analizar respuesta de la API
        if (apiResponse.error) {
          const detail = apiResponse.error.detail || 'Error en consulta';
          const notIncludedPhrases = [
            'no se encuentra incluido',
            'no deberian realizarle retenciones',
            'no deberían realizarle retenciones',
            'no figura en el padron',
            'no figura en el padrón',
          ];
          const isNotIncluded = notIncludedPhrases.some((phrase) =>
            detail.toLowerCase().includes(phrase)
          );

          if (isNotIncluded) {
            // El contribuyente NO está en el padrón -> Alícuota 0.0% (No retiene)
            const itemResult = {
              status: 'not_included',
              alicuota: 0.0,
              rate: 0.0,
              letra: 'A',
              detail,
              razonSocial: results.razonSocial,
            };
            results.periodos[periodKey] = itemResult;
            alicuotaCache.set(getCacheKey(sisNorm, cuitFormatted, p.anio, p.mes), itemResult);
          } else {
            // Error genuino (ej. padrón no publicado aún para este mes, error de validación, etc.)
            results.periodos[periodKey] = {
              status: 'error',
              error: detail,
              alicuota: null,
              rate: null,
            };
          }
        } else {
          // Consulta exitosa con datos de alícuota
          let alicNum = 0;
          if (apiResponse.alicuota !== undefined && apiResponse.alicuota !== null) {
            alicNum = typeof apiResponse.alicuota === 'string'
              ? parseFloat(apiResponse.alicuota)
              : Number(apiResponse.alicuota);
          }
          if (isNaN(alicNum)) alicNum = 0;

          if (apiResponse.razonSocial && !results.razonSocial) {
            results.razonSocial = apiResponse.razonSocial;
          }

          const itemResult = {
            status: 'ok',
            alicuota: alicNum,
            rate: Math.round((alicNum / 100) * 10000) / 10000, // Ej: 3.5% -> 0.035
            letra: apiResponse.letra || null,
            razonSocial: apiResponse.razonSocial || results.razonSocial,
            regimen: apiResponse.esConvenio === 'S' ? 'CONVENIO MULTILATERAL' : 'LOCAL',
            jurisdiccionSede: apiResponse.idJurisdiccionSede || null,
          };

          results.periodos[periodKey] = itemResult;
          alicuotaCache.set(getCacheKey(sisNorm, cuitFormatted, p.anio, p.mes), itemResult);
        }

      } catch (periodErr) {
        results.periodos[periodKey] = {
          status: 'error',
          error: periodErr.message || 'Error inesperado al procesar el período.',
          alicuota: null,
          rate: null,
        };
      }
    }

  } finally {
    activeQueries--;
    if (page) {
      try {
        await page.close();
      } catch (e) {}
    }
    // Dejar una pestaña lista para la próxima consulta y programar el cierre por inactividad
    prewarmPage();
    scheduleBrowserClose();
  }

  return results;
}

/* =====================================================
   SERVIDOR HTTP REST API
   ===================================================== */

const server = http.createServer(async (req, res) => {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning, *');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, *',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Endpoint de salud / estado
  // Con ?warm=1 además lanza Chrome y precarga COMARB en segundo plano (no bloquea la respuesta)
  if (pathname === '/api/health') {
    const warm = reqUrl.searchParams.get('warm') === '1';
    if (warm) {
      cancelBrowserClose();
      try {
        prewarmPage();
      } catch (e) {
        console.warn('[SIRCREB Bot] No se pudo iniciar la precarga:', e.message);
      }
      scheduleBrowserClose();
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'SIRCREB/SIRTAC/SIRCUPA Bot API',
        source: process.env.RENDER ? 'bot_cloud' : 'bot_local',
        defaultSistema: 'sirtac',
        supportedSistemas: ['sirtac', 'sircreb', 'sircupa'],
        version: '1.1.0',
        browserReady: !!(sharedBrowser && sharedBrowser.connected),
        warmPage: !!warmPagePromise,
        activeQueries,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Endpoint principal de consulta de alícuotas
  if (pathname === '/api/alicuotas' || pathname === '/api/sircreb') {
    const sistema = reqUrl.searchParams.get('sistema') || 'sirtac';
    const cuit = reqUrl.searchParams.get('cuit');
    const periodosParam = reqUrl.searchParams.get('periodos') || reqUrl.searchParams.get('periodo');

    if (!cuit) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: 'Parámetro requerido faltante: "cuit"' }));
      return;
    }

    if (!periodosParam) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          success: false,
          error: 'Parámetro requerido faltante: "periodos" (formato: YYYY-MM o lista separada por comas ej: 2024-04,2024-05)',
        })
      );
      return;
    }

    // Parsear lista de períodos (ej: "2024-04,2024-05")
    const periodStrs = periodosParam.split(',').map((s) => s.trim()).filter(Boolean);
    const parsedPeriods = [];

    for (const str of periodStrs) {
      const parts = str.split(/[\-\/]/);
      if (parts.length === 2) {
        const anio = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10);
        if (!isNaN(anio) && !isNaN(mes) && mes >= 1 && mes <= 12) {
          parsedPeriods.push({ anio, mes });
        }
      }
    }

    if (parsedPeriods.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          success: false,
          error: 'Ningún período válido provisto. El formato esperado es YYYY-MM (ej: 2024-05).',
        })
      );
      return;
    }

    try {
      console.log(`[SIRCREB Bot] Consultando sistema=${sistema}, cuit=${cuit}, periodos=${periodStrs.join(', ')}`);
      const data = await queryComarbPadron(sistema, cuit, parsedPeriods);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, source: process.env.RENDER ? 'bot_cloud' : 'bot_local', ...data }));
    } catch (err) {
      console.error('[SIRCREB Bot] Error al procesar consulta:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message || 'Error interno del bot' }));
    }
    return;
  }

  // Servir archivos estáticos del procesador web (HTML, CSS, JS, imágenes)
  let filePath = join(__dirname, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
  if (existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase();
    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (readErr) {
      console.error('[Static Server] Error al leer archivo:', readErr);
    }
  }

  // Ruta no encontrada
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: false, error: 'Ruta no encontrada. Usa /api/health o /api/alicuotas.' }));
});

/* =====================================================
   MODO CLI O SERVIDOR
   ===================================================== */

// Verificar si se llamó por línea de comandos con parámetros
const args = process.argv.slice(2);
const cliCuitIdx = args.findIndex((a) => a === '--cuit' || a === '-c');
const cliPeriodosIdx = args.findIndex((a) => a === '--periodos' || a === '-p');
const cliSistemaIdx = args.findIndex((a) => a === '--sistema' || a === '-s');

if (cliCuitIdx !== -1 && cliPeriodosIdx !== -1) {
  const cliCuit = args[cliCuitIdx + 1];
  const cliPeriodosStr = args[cliPeriodosIdx + 1];
  const cliSistema = cliSistemaIdx !== -1 ? args[cliSistemaIdx + 1] : 'sirtac';

  const periodStrs = cliPeriodosStr.split(',').map((s) => s.trim()).filter(Boolean);
  const parsed = periodStrs.map((str) => {
    const parts = str.split(/[\-\/]/);
    return { anio: parseInt(parts[0], 10), mes: parseInt(parts[1], 10) };
  });

  console.log(`[CLI] Ejecutando consulta directa: Sistema=${cliSistema}, CUIT=${cliCuit}, Periodos=${cliPeriodosStr}...`);
  queryComarbPadron(cliSistema, cliCuit, parsed)
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[CLI Error]', err.message);
      process.exit(1);
    });
} else {
  // Iniciar servidor HTTP (0.0.0.0 para aceptar conexiones locales y de la nube como Render)
  server.listen(PORT, '0.0.0.0', () => {
    console.log('=====================================================');
    console.log(`  🤖 SIRCREB / SIRTAC / SIRCUPA Bot API Activo`);
    console.log(`  🚀 Escuchando en: http://0.0.0.0:${PORT}`);
    console.log(`  ⚡ Sistema predeterminado: SIRTAC`);
    console.log(`  🔍 Endpoints disponibles:`);
    console.log(`     - GET /api/health`);
    console.log(`     - GET /api/alicuotas?sistema=sirtac&cuit=...&periodos=...`);
    console.log('=====================================================');
  });
}
