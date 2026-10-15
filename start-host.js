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

// Liberar procesos previos si la ventana se cerró abruptamente
freePortAndNgrok(PORT);

// 1. Imprimir encabezado estético de Bezza Pay en español
const border = '═'.repeat(69);
console.clear();
console.log('\x1b[38;2;208;0;112m╔' + border + '╗\x1b[0m');
console.log('\x1b[38;2;208;0;112m║\x1b[0m  \x1b[1m\x1b[37m⚡ BEZZA PAY - BOT DEDICADO DE PADRONES (SIRTAC / SIRCREB)          \x1b[0m\x1b[38;2;208;0;112m║\x1b[0m');
console.log('\x1b[38;2;208;0;112m╠' + border + '╣\x1b[0m');
console.log('\x1b[38;2;208;0;112m║\x1b[0m  🟢 \x1b[1mEstado:\x1b[0m          \x1b[32mEN LÍNEA (Listo para recibir consultas)         \x1b[0m\x1b[38;2;208;0;112m║\x1b[0m');
console.log(`\x1b[38;2;208;0;112m║\x1b[0m  🌐 \x1b[1mEnlace Público:\x1b[0m  \x1b[36mhttps://${NGROK_DOMAIN.padEnd(40)}\x1b[0m\x1b[38;2;208;0;112m║\x1b[0m`);
console.log(`\x1b[38;2;208;0;112m║\x1b[0m  🔌 \x1b[1mPuerto Local:\x1b[0m    \x1b[33mhttp://localhost:${PORT.padEnd(38)}\x1b[0m\x1b[38;2;208;0;112m║\x1b[0m`);
console.log('\x1b[38;2;208;0;112m║\x1b[0m  📊 \x1b[1mPanel Ngrok:\x1b[0m     \x1b[90mhttp://127.0.0.1:4040                           \x1b[0m\x1b[38;2;208;0;112m║\x1b[0m');
console.log('\x1b[38;2;208;0;112m╠' + border + '╣\x1b[0m');
console.log('\x1b[38;2;208;0;112m║\x1b[0m  💡 Mantén esta ventana abierta durante tu jornada laboral.          \x1b[38;2;208;0;112m║\x1b[0m');
console.log('\x1b[38;2;208;0;112m║\x1b[0m  💡 Para detener el bot, presiona \x1b[1mCtrl + C\x1b[0m o cierra esta ventana.    \x1b[38;2;208;0;112m║\x1b[0m');
console.log('\x1b[38;2;208;0;112m╚' + border + '╝\x1b[0m\n');
console.log('\x1b[1m📋 REGISTRO DE ACTIVIDAD EN TIEMPO REAL:\x1b[0m');
console.log('\x1b[90m----------------------------------------------------------------------\x1b[0m');

// 2. Iniciar servidor local
const serverPath = join(__dirname, 'sircreb-server.js');
const serverProc = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  env: { ...process.env, PORT, SILENT_BANNER: '1' },
  stdio: 'inherit',
});

// 3. Iniciar túnel de Ngrok hacia el puerto 3000 de forma silenciosa
const ngrokBin = findNgrokPath();
const ngrokArgs = ['http', `--url=${NGROK_DOMAIN}`, PORT, '--log=stdout', '--log-level=error'];

const ngrokProc = spawn(ngrokBin, ngrokArgs, {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

ngrokProc.stdout.on('data', (d) => {
  const msg = d.toString().trim();
  if (msg) console.error(`\x1b[31m[Ngrok]\x1b[0m ${msg}`);
});

ngrokProc.stderr.on('data', (d) => {
  const msg = d.toString().trim();
  if (msg) console.error(`\x1b[31m[Ngrok]\x1b[0m ${msg}`);
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
