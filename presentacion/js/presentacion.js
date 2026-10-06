/**
 * presentacion.js
 * Cliente Socket.IO para la pantalla del proyector.
 */

const socket = io();

// ── DOM ───────────────────────────────────────
const pantallaInicio  = document.getElementById('pantalla-inicio');
const slidesContainer = document.getElementById('slides-container');
const blackoutOverlay = document.getElementById('blackout-overlay');
const punteroLaser    = document.getElementById('puntero-laser');
const hudSlide        = document.getElementById('hud-slide');
const hudTimer        = document.getElementById('hud-timer');
const hudConexion     = document.getElementById('hud-conexion');
const notifVoz        = document.getElementById('notif-voz');

// ── ESTADO ────────────────────────────────────
let diapositivaActual = 0;
const slides = Array.from(document.querySelectorAll('.slide'));

// ── TIMER ─────────────────────────────────────
let tiempoInicio = null;
let timerInterval = null;

function iniciarTimer(ts) {
  tiempoInicio = ts || Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const seg = Math.floor((Date.now() - tiempoInicio) / 1000);
    const mm = String(Math.floor(seg / 60)).padStart(2, '0');
    const ss = String(seg % 60).padStart(2, '0');
    hudTimer.textContent = `${mm}:${ss}`;
  }, 1000);
}

// ── DIAPOSITIVAS ──────────────────────────────
function mostrarDiapositiva(indice) {
  if (indice < 0 || indice >= slides.length) return;
  slides[diapositivaActual].classList.remove('activa');
  diapositivaActual = indice;
  slides[diapositivaActual].classList.add('activa');
  hudSlide.textContent = `${diapositivaActual + 1} / ${slides.length}`;
}

// ── NOTIF VOZ ─────────────────────────────────
let notifTimer = null;
function mostrarNotif(texto) {
  notifVoz.textContent = `🎤 "${texto}"`;
  notifVoz.classList.add('visible');
  if (notifTimer) clearTimeout(notifTimer);
  notifTimer = setTimeout(() => notifVoz.classList.remove('visible'), 2200);
}

// ── ARRANQUE: la presentación se anuncia al servidor UNA sola vez ──
// No esperamos a 'estado-inicial' para evitar el bucle
// estado-inicial → iniciar-presentacion → presentacion-iniciada → estado-inicial...
window.addEventListener('load', () => {
  hudSlide.textContent = `1 / ${slides.length}`;
  // Pequeño delay para asegurar que el socket ya está conectado
  setTimeout(() => {
    socket.emit('iniciar-presentacion', slides.length);
  }, 300);
});

// ── SOCKET EVENTOS ────────────────────────────
socket.on('connect', () => {
  hudConexion.className = 'dot verde';
});

socket.on('disconnect', () => {
  hudConexion.className = 'dot rojo';
});

socket.on('estado-inicial', (estado) => {
  // Solo sincronizamos estado visual, NO volvemos a emitir iniciar-presentacion
  if (estado.presentacionActiva) {
    pantallaInicio.classList.add('oculto');
    slidesContainer.classList.add('visible');
    mostrarDiapositiva(estado.diapositivaActual);
    if (estado.tiempoInicio) iniciarTimer(estado.tiempoInicio);
  }
  if (estado.blackout) blackoutOverlay.classList.add('activo');
  if (estado.punteroActivo) punteroLaser.classList.add('activo');

  // Restaurar posición del puntero si ya había una
  if (estado.punteroX != null && estado.punteroY != null) {
    punteroLaser.style.left = `${estado.punteroX}%`;
    punteroLaser.style.top  = `${estado.punteroY}%`;
  }
});

socket.on('presentacion-iniciada', (estado) => {
  pantallaInicio.classList.add('oculto');
  slidesContainer.classList.add('visible');
  mostrarDiapositiva(0);
  iniciarTimer(estado.tiempoInicio);
});

socket.on('cambio-diapositiva', (indice) => {
  mostrarDiapositiva(indice);
});

socket.on('blackout-estado', (activo) => {
  blackoutOverlay.classList.toggle('activo', activo);
});

socket.on('puntero-estado', ({ activo }) => {
  punteroLaser.classList.toggle('activo', activo);
});

socket.on('puntero-posicion', ({ x, y }) => {
  punteroLaser.style.left = `${x}%`;
  punteroLaser.style.top  = `${y}%`;
});

socket.on('notif-voz', (comando) => {
  mostrarNotif(comando);
});

socket.on('salir-presentacion', () => {
  if (timerInterval) clearInterval(timerInterval);
  pantallaInicio.classList.remove('oculto');
  slidesContainer.classList.remove('visible');
  slides.forEach(s => s.classList.remove('activa'));
  blackoutOverlay.classList.remove('activo');
  punteroLaser.classList.remove('activo');
  hudTimer.textContent = '00:00';
});

// ── TECLADO (respaldo para pruebas en PC) ─────
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') socket.emit('siguiente-diapositiva');
  if (e.key === 'ArrowLeft')                   socket.emit('anterior-diapositiva');
  if (e.key === 'b' || e.key === 'B')          socket.emit('toggle-blackout');
  if (e.key === 'Escape')                       socket.emit('salir-presentacion');
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
});