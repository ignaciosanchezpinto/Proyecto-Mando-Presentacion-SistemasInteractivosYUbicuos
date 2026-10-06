/**
 * estado.js
 * Centraliza el estado de la aplicación (Single Source of Truth).
 * Gestiona la reactividad de la interfaz de usuario y asegura la consistencia
 * de los datos entre los diferentes sensores y la comunicación por sockets.
 */

// ── ESTADO GLOBAL ─────────────────────────────
/**
 * Objeto que mantiene el contexto actual del mando.
 * Es fundamental en sistemas ubicuos para la persistencia y gestión de recursos.
 */
const estado = {
  diapositivaActual: 0,
  totalDiapositivas: 0,
  blackout: false,      // Estado de la pantalla negra en la presentación
  punteroActivo: false, // Control del cursor remoto
  vozActiva: false,    // Estado del reconocimiento de voz
  tiempoInicio: null,
  timerInterval: null,
  
  // Parámetros de Inclinación (Device Orientation)
  bloqueoGesto: false,
  umbralGesto: 30,   // Sensibilidad en grados para disparar el cambio de slide
  bloqueoMs: 900,    // Ventana de tiempo (debounce) para evitar rebotes de señal
  
  // Gestión de entrada del puntero:
  // 'giro' utiliza el giroscopio; 'tactil' utiliza la pantalla del móvil
  modoPuntero: 'giro',
  
  camaraActiva: false, // Estado del procesamiento de visión artificial
  
  // Colección de IDs de temporizadores para una limpieza segura de recursos
  vibracionTimeouts: [],
};

// ── TIMER (Cronómetro de Presentación) ─────────────────────────────
/**
 * Inicia el conteo de tiempo y sincroniza las alertas hápticas.
 * @param {number} ts - Timestamp de inicio (opcional).
 */
function iniciarTimer(ts) {
  estado.tiempoInicio = ts || Date.now();
  
  // Limpieza de intervalos previos para evitar fugas de memoria
  if (estado.timerInterval) clearInterval(estado.timerInterval);
  
  estado.timerInterval = setInterval(() => {
    const seg = Math.floor((Date.now() - estado.tiempoInicio) / 1000);
    const mm  = String(Math.floor(seg / 60)).padStart(2, '0');
    const ss  = String(seg % 60).padStart(2, '0');
    // Actualización de la vista del cronómetro
    document.getElementById('timer').textContent = `${mm}:${ss}`;
  }, 1000);

  // Lógica de feedback ubicuo: Alertas táctiles programadas
  iniciarVibracion(estado.tiempoInicio);
}

// ── ACTUALIZAR UI: SLIDE ──────────────────────
/**
 * Sincroniza los contadores visuales de diapositivas.
 */
function actualizarSlide(indice) {
  estado.diapositivaActual = indice;
  document.getElementById('num-slide').textContent   = indice + 1;
  document.getElementById('total-slide').textContent = `/ ${estado.totalDiapositivas}`;
  document.getElementById('info-slide').textContent  = `${indice + 1} / ${estado.totalDiapositivas}`;
}

// ── ACTUALIZAR UI: BLACKOUT ───────────────────
/**
 * Refleja el estado del blackout en la interfaz del mando.
 */
function actualizarBlackout() {
  const btn = document.getElementById('btn-blackout');
  btn.classList.toggle('activo', estado.blackout);
  document.getElementById('estado-blackout').textContent = estado.blackout ? 'ON' : 'OFF';
}

// ── ACTUALIZAR UI: PUNTERO ────────────────────
/**
 * Gestiona la visibilidad y el estado del módulo de puntero.
 */
function actualizarPuntero() {
  const btn = document.getElementById('btn-puntero');
  btn.classList.toggle('activo', estado.punteroActivo);
  document.getElementById('estado-puntero').textContent = estado.punteroActivo ? 'ON' : 'OFF';

  const zona = document.getElementById('zona-puntero');
  if (estado.punteroActivo) {
    zona.classList.remove('oculto');
  } else {
    zona.classList.add('oculto');
    // Al desactivar, restauramos el modo por defecto para la próxima activación
    estado.modoPuntero = 'giro';
    actualizarBotonesModoPuntero();
  }
}

// ── ACTUALIZAR UI: VOZ ────────────────────────
/**
 * Actualiza los indicadores visuales y el popup de transcripción de voz.
 */
function actualizarVoz() {
  const btn = document.getElementById('btn-voz');
  btn.classList.toggle('escuchando', estado.vozActiva);
  document.getElementById('estado-voz').textContent = estado.vozActiva ? 'ON' : 'OFF';
  document.getElementById('icono-voz').textContent  = estado.vozActiva ? '🔴' : '🎤';

  const popup = document.getElementById('popup-voz');
  if (estado.vozActiva) popup.classList.remove('oculto');
  else                   popup.classList.add('oculto');
}

// ── ACTUALIZAR UI: BOTONES MODO PUNTERO ───────
/**
 * Cambia la estética de los botones para indicar si el puntero es inercial o táctil.
 */
function actualizarBotonesModoPuntero() {
  const btnGiro   = document.getElementById('btn-modo-giro');
  const btnTactil = document.getElementById('btn-modo-tactil');
  if (!btnGiro || !btnTactil) return;

  if (estado.modoPuntero === 'giro') {
    btnGiro.classList.add('activo');
    btnTactil.classList.remove('activo');
    document.getElementById('area-puntero').classList.add('oculto');
  } else {
    btnTactil.classList.add('activo');
    btnGiro.classList.remove('activo');
    document.getElementById('area-puntero').classList.remove('oculto');
  }
}

// ── TOAST (Notificaciones de interfaz) ──────────────────────
/**
 * Muestra mensajes temporales en pantalla para dar feedback al usuario.
 */
let _toastTimer = null;
function toast(msg, ms = 1800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), ms);
}

// ── ACTUALIZAR UI: CÁMARA ─────────────────────
/**
 * Gestiona los cambios visuales cuando el procesamiento de imagen está activo.
 */
function actualizarCamaraUI() {
  const btn = document.getElementById('btn-camara');
  const contenedor = document.getElementById('contenedor-camara');
  const txt = document.getElementById('estado-camara');

  if (!btn || !contenedor) return;

  if (estado.camaraActiva) {
    btn.classList.add('activo');
    contenedor.classList.remove('oculto');
    if (txt) txt.textContent = "ON";
    document.body.classList.add('camara-on');
  } else {
    btn.classList.remove('activo');
    contenedor.classList.add('oculto');
    if (txt) txt.textContent = "OFF";
    document.body.classList.remove('camara-on');
  }
}

// ── HELPER: COMPROBAR EXCLUSIVIDAD (Mecanismo de Exclusión Mutua) ─────
/**
 * Implementa la lógica de gestión de recursos. Evita que múltiples sensores
 * pesados (Voz, Cámara, Puntero) se ejecuten a la vez para prevenir latencia
 * y saturación de la CPU en el dispositivo móvil.
 */
function puedeActivar(herramientaActual) {
  if (estado.punteroActivo && herramientaActual !== 'puntero') {
    toast("⚠️ Desactiva el Puntero primero");
    return false;
  }
  if (estado.vozActiva && herramientaActual !== 'voz') {
    toast("⚠️ Desactiva la Voz primero");
    return false;
  }
  if (estado.camaraActiva && herramientaActual !== 'camara') {
    toast("⚠️ Desactiva la Cámara primero");
    return false;
  }
  return true;
}