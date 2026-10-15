#!/usr/bin/env node
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Dominio estático gratuito asignado en tu cuenta de Ngrok
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'chive-candle-poem.ngrok-free.dev';
const PORT = process.env.PORT || '3000';

function freePortAndNgrok(port) {
  if (process.platform !== 'win32') return;
  try {
    // 1. Matar procesos huérfanos de ngrok si quedaron abiertos
    try {
      execSync('taskkill /F /IM ngrok.exe /T', { stdio: 'ignore' });
    } catch (e) {}

    // 2. Liberar el puerto si quedó tomado por una instancia previa
    try {
      const stdout = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`) && parts[3] === 'LISTENING') {
          const pid = parts[4];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            console.log(`[INFO] Liberando puerto ${port} (cerrando proceso previo PID ${pid})...`);
            try { execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' }); } catch (e) {}
          }
        }
      }
    } catch (e) {}
  } catch (e) {}
}

function findNgrokPath() {
  const possiblePaths = [
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'ngrok.exe') : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'ngrok', 'ngrok.exe') : null,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, 'ngrok', 'ngrok.exe') : null,
    'ngrok.exe',
    'ngrok',
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return 'ngrok';
}

console.log('=====================================================');
console.log('  🚀 INICIANDO BOT DEDICADO SIRTAC / SIRCREB');
console.log('  🏢 Bezza Pay - Host Local con Túnel Ngrok');
console.log('=====================================================');
console.log(`  🌐 Dominio público: https://${NGROK_DOMAIN}`);
console.log(`  🔌 Puerto local:    ${PORT}`);
console.log('=====================================================\n');

// Liberar procesos previos si la ventana se cerró abruptamente
freePortAndNgrok(PORT);

// 1. Iniciar servidor local
const serverPath = join(__dirname, 'sircreb-server.js');
const serverProc = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  env: { ...process.env, PORT },
  stdio: 'inherit',
});

// 2. Iniciar túnel de Ngrok hacia el puerto 3000
const ngrokBin = findNgrokPath();
const ngrokArgs = ['http', `--url=${NGROK_DOMAIN}`, PORT];

const ngrokProc = spawn(ngrokBin, ngrokArgs, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

let isCleaningUp = false;
function cleanup(exitCode = 0) {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n[INFO] Cerrando Bot y Túnel Ngrok...');
  try { serverProc.kill(); } catch (e) {}
  try { ngrokProc.kill(); } catch (e) {}
  process.exit(exitCode);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('exit', () => cleanup(0));

serverProc.on('close', (code) => {
  console.log(`[INFO] Servidor finalizado con código ${code}`);
  cleanup(code || 0);
});

ngrokProc.on('close', (code) => {
  console.log(`[INFO] Túnel Ngrok finalizado con código ${code}`);
  cleanup(code || 0);
});
