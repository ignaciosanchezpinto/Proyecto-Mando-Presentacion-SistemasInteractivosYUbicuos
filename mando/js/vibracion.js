/**
 * vibracion.js
 * Avisos de vibración en minutos fijos durante la presentación.
 *
 * Avisos predeterminados: 5, 10 y 15 minutos.
 *   - A los 5 min:  dos pulsos cortos  → aviso informativo
 *   - A los 10 min: dos pulsos cortos  → aviso informativo
 *   - A los 15 min: tres pulsos largos → aviso urgente (tiempo casi agotado)
 *
 * API: navigator.vibrate() — disponible en Android/Chrome.
 * En iOS no está soportada; se muestra un toast como fallback visual.
 */

// ── MINUTOS DE AVISO (fijos) ──────────────────
const AVISOS_MINUTOS = [5, 10, 15];

// ── PATRONES DE VIBRACIÓN ─────────────────────
const PATRON_NORMAL  = [200, 100, 200];           // dos pulsos cortos
const PATRON_URGENTE = [400, 150, 400, 150, 400]; // tres pulsos largos

// ── INICIAR AVISOS ────────────────────────────
function iniciarVibracion(tsInicio) {
  cancelarVibracion();

  const ahora = Date.now();

  AVISOS_MINUTOS.forEach((minuto, indice) => {
    const msDesdeAhora = (tsInicio + minuto * 60 * 1000) - ahora;
    if (msDesdeAhora <= 0) return; // ya pasó (reconexión tardía)

    const esUltimo = indice === AVISOS_MINUTOS.length - 1;
    const patron   = esUltimo ? PATRON_URGENTE : PATRON_NORMAL;
    const mensaje  = esUltimo
      ? `⏰ ¡${minuto} min! Tiempo casi agotado`
      : `⏰ ${minuto} min transcurridos`;

    const id = setTimeout(() => {
      vibrar(patron);
      toast(mensaje, 3000);
    }, msDesdeAhora);

    estado.vibracionTimeouts.push(id);
  });
}

// ── CANCELAR TODOS LOS AVISOS ─────────────────
function cancelarVibracion() {
  estado.vibracionTimeouts.forEach(id => clearTimeout(id));
  estado.vibracionTimeouts = [];
}

// ── EJECUTAR VIBRACIÓN ────────────────────────
function vibrar(patron) {
  if ('vibrate' in navigator) {
    navigator.vibrate(patron);
  }
  // Si no está disponible (iOS), el toast ya sirve de aviso visual
}

// Función vacía para que mando.js no falle al llamarla
function iniciarPanelVibracion() {}
