# Bezza Pay — Suite de Reportería y Operaciones

Herramienta interna web de alta eficiencia diseñada para optimizar los flujos operativos y financieros de **Bezza Pay**. Integra procesamiento de reportes contables en Excel, generación instantánea de comprobantes bancarios en alta resolución y automatización de consultas tributarias.

---

## 🚀 Módulos del Sistema

### 1. Reportería Financiera Excel (`index.html` / `app.js`)
Procesa, depura, traduce y formatea reportes masivos de **Movimientos** y **Transacciones** bancarias en formato `.xlsx`.

* **100% Client-Side & Seguro**: Los archivos se procesan en la memoria local del navegador sin ser transferidos a servidores externos.
* **Detección Automática**: Reconoce el tipo de reporte (*Movimientos* o *Transacciones*) analizando las cabeceras de origen.
* **Regla A (Traducción de Códigos)**: Convierte códigos crudos (`ADJUSTMENT_CREDIT`, `CASHIN`, `CASHOUT`, `SALES`) a denominaciones comprensibles en español.
* **Regla B (Estandarización Contable)**: Renombra columnas de costos, comisiones e impuestos (*Comisión sin IVA*, *IVA de la comisión*, *CFT sin IVA*).
* **Regla C (Depuración Selectiva)**: Elimina columnas innecesarias o vacías según el perfil del reporte.
* **Cálculo de Saldo Acumulado**: Genera dinámicamente el saldo progresivo histórico fila a fila en base al monto neto.
* **Orden Cronológico**: Reordena las filas de manera ascendente por marca temporal.
* **Estilo Corporativo Bezza Pay**: Aplica paleta oficial (`#D00070`), filas cebradas alternadas y formato monetario nativo (`$#,##0.00`).
* **Descarga Nativa**: Integración con la *File System Access API* (`window.showSaveFilePicker`).

---

### 2. Generador de Comprobantes de Transferencia (`comprobantes.html` / `comprobantes.js`)
Crea comprobantes oficiales en imagen PNG de alta definición a partir de datos estructurados o texto libre y desordenado.

* **Parser Inteligente con Regex**: Analiza mensajes de WhatsApp, extractos o correos y extrae automáticamente emisor, receptor, CUITs, CVUs, montos y códigos COELSA sin importar el orden ni el formato.
* **Motor Gráfico Canvas 2D**: Dibuja la tarjeta bancaria pixel por pixel mediante la API nativa de Canvas, garantizando consistencia visual idéntica en cualquier pantalla.
* **Resolución Retina 2x (300+ DPI)**: Escala física a `1080 x 1760 px` para máxima nitidez en smartphones e impresión.
* **Arquitectura Anti-CORS**: El logo corporativo SVG está embebido como Data-URI para impedir bloqueos de origen cruzado en el Canvas.
* **Copiado Directo a WhatsApp**: Utiliza la *Async Clipboard API* (`ClipboardItem`) para copiar el PNG a la memoria y pegarlo directamente con `Ctrl + V` en WhatsApp Web o Slack sin generar archivos residuales.
* **Intercambio Dinámico**: Botón de inversión instantánea entre titular de origen y destino.

---

### 3. Bot Fiscal SIRCREB / SIRTAC / SIRCUPA (`sircreb-server.js` / `start-host.js`)
Servicio complementario automatizado para la consulta masiva de alícuotas tributarias provinciales por CUIT.

* Ejecución desatendida mediante **Puppeteer Core**.
* Servidor local Node.js para responder consultas en tiempo real desde la interfaz web.
* Script de inicio rápido en Windows (`iniciar-bot.bat`).

---

## 📁 Estructura del Repositorio

```text
Chamba/Reportes/
├── assets/                  # Recursos gráficos oficiales
│   ├── BezzaPaySVG.svg      # Isotipo y logotipo oficial vectorial
│   └── Logo.png             # Favicon e isotipo en mapa de bits
├── css/                     # Hojas de estilo visuales
│   ├── style.css            # Estilos globales y compartidos de la suite
│   └── comprobantes.css     # Estilos y grilla responsive del módulo de comprobantes
├── js/                      # Lógica de cliente y scripts interactivos
│   ├── app.js               # Lógica del procesador de Excel y reglas de negocio
│   ├── comprobantes.js      # Lógica del parser de texto y motor Canvas 2D
│   └── xlsx-style.js        # Motor OpenXML con soporte para estilos de celda
├── server/                  # Backend de automatización fiscal
│   ├── sircreb-server.js    # Servidor y bot de consulta automatizada de alícuotas
│   └── start-host.js        # Orquestador del túnel y servidor local
├── index.html               # Interfaz principal del módulo de Reportería
├── comprobantes.html        # Interfaz del Generador de Comprobantes
├── iniciar-bot.bat          # Acceso directo para ejecución del bot en Windows
├── Dockerfile               # Configuración de despliegue en contenedor
├── package.json             # Configuración del entorno Node.js y dependencias
└── README.md                # Documentación técnica del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnologías |
| :--- | :--- |
| **Arquitectura Web** | HTML5 Semántico, Vanilla CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript ES6+. |
| **Motor Gráfico** | HTML5 Canvas 2D API (`CanvasRenderingContext2D`), SVG Vectorial inline. |
| **APIs del Navegador** | Async Clipboard API (`navigator.clipboard.write`), File System Access API, FileReader API, Intl API (`es-AR`). |
| **Procesamiento Excel**| `xlsx-js-style` (Generación de hojas de cálculo con estilos visuales en el cliente). |
| **Automatización** | Node.js (v18+), Puppeteer Core. |

---

## 💻 Instrucciones de Uso

### Uso de la Suite Web (Sin Servidor)
Ambos módulos web son completamente estáticos y autónomos:
1. Para el procesador de reportes Excel: abrir [index.html](file:///c:/Users/braia/Desktop/Tode/Chamba/Reportes/index.html) en cualquier navegador moderno (Chrome, Edge, Firefox).
2. Para el generador de comprobantes: abrir [comprobantes.html](file:///c:/Users/braia/Desktop/Tode/Chamba/Reportes/comprobantes.html) directamente.

### Ejecución del Bot de Alícuotas (Opcional)
Si se requiere consultar padrones tributarios de manera automatizada:
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor de consultas
npm start

# O mediante el ejecutable en Windows:
iniciar-bot.bat
```

---

## 🔒 Privacidad y Seguridad de la Información

Por diseño, **esta herramienta no almacena credenciales ni envía datos bancarios o fiscales a servidores de terceros**. Todo el parseo de cadenas, el cómputo de saldos y la síntesis gráfica del comprobante se efectúan en la memoria volátil del dispositivo local del operador, cumpliendo con las buenas prácticas de seguridad de la información.
