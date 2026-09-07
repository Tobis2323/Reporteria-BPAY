# Reportería Bezza Pay 📊

Herramienta interna web para procesar, limpiar, traducir y dar formato profesional a reportes financieros de **Movimientos** y **Transacciones** en formato Excel (`.xlsx`).

## ✨ Características Principales

- **100% Client-Side & Seguro**: Los archivos se procesan íntegramente en la memoria del navegador del usuario. Cero envío de datos a servidores externos.
- **Detección Inteligente de Reportes**: Reconoce automáticamente si el archivo corresponde a *Movimientos* o *Transacciones* mediante el análisis de cabeceras.
- **Regla A - Traducción de Códigos**: Traduce códigos técnicos (`ADJUSTMENT_CREDIT`, `CASHIN`, `CASHOUT`, `SALES`, etc.) a términos comprensibles en español.
- **Regla B - Estandarización de Columnas**: Renombra columnas de costos y aranceles a terminología contable clara (*Comisión sin IVA*, *IVA de la comisión*, *CFT sin IVA*, etc.).
- **Regla C - Depuración de Columnas**: Elimina columnas redundantes o innecesarias según el tipo de reporte.
- **Cálculo de Saldo Acumulado**: Opción para calcular automáticamente el saldo progresivo histórico fila a fila según el monto neto (solo Movimientos).
- **Orden Cronológico**: Reordena las operaciones automáticamente de forma ascendente por fecha.
- **Estilo Corporativo Bezza Pay**: Exporta el `.xlsx` con encabezados corporativos (`#D00070`), filas cebradas alternadas (`#FFFFFF` / `#F2F2F2`), resalte de *Monto Neto* y formato monetario nativo (`$#,##0.00`).
- **Descarga Nativa de Archivos**: Integración con la *File System Access API* (`window.showSaveFilePicker`) para elegir carpeta y nombre de guardado nativo en el sistema operativo.

## 🚀 Despliegue en GitHub Pages

1. Ve a **Settings** > **Pages** en este repositorio.
2. En **Build and deployment** > **Source**, selecciona `Deploy from a branch`.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda los cambios. En unos minutos estará disponible en `https://<tu-usuario>.github.io/Reporteria-BPAY/`.

## 🛠️ Tecnologías

- **HTML5 & Vanilla CSS3** (Public Sans, diseño plano moderno, sin frameworks pesados).
- **Vanilla JavaScript ES6+** (FileReader API, File System Access API, Blob API).
- **xlsx-js-style** (Motor de compresión y parseo OpenXML con soporte nativo de estilos de celda).
