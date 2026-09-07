# Dockerfile para Render.com (Node.js + Google Chrome para Puppeteer)
FROM node:20-slim

# Instalar dependencias del sistema y Google Chrome estable para Puppeteer
RUN apt-get update && apt-get install -y wget gnupg ca-certificates --no-install-recommends && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg && \
    sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install -y google-chrome-stable fonts-freefont-ttf libxss1 --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno para que Puppeteer use el Chrome instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el resto del código del proyecto
COPY . .

# Exponer el puerto predeterminado (Render asignará la variable de entorno PORT)
EXPOSE 3000

CMD ["npm", "start"]
