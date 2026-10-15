#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Dominio estático gratuito asignado en tu cuenta de Ngrok
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'chive-candle-poem.ngrok-free.dev';
const PORT = process.env.PORT || '3000';

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

function cleanup() {
  console.log('\n[INFO] Cerrando Bot y Túnel Ngrok...');
  try { serverProc.kill(); } catch (e) {}
  try { ngrokProc.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

serverProc.on('close', (code) => {
  console.log(`[INFO] Servidor finalizado con código ${code}`);
  cleanup();
});

ngrokProc.on('close', (code) => {
  console.log(`[INFO] Túnel Ngrok finalizado con código ${code}`);
  cleanup();
});
