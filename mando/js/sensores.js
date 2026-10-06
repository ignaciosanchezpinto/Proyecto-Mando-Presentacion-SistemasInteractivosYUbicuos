/**
 * sensores.js
 * Procesa los datos inerciales del hardware (acelerómetro y giroscopio).
 * Implementa filtros de suavizado, detección de gestos cinéticos y 
 * lógica de control para el puntero y la navegación.
 */

// Configuración del Filtro de Paso Bajo (Low-Pass Filter)
const ALPHA = 0.15; // Factor de suavizado: valores bajos = más suavidad pero más latencia
let filtroX = null;
let filtroY = null;
let gammaAnterior = null;
let betaAnterior  = null;

// ── BLACKOUT POR AGITACIÓN (DeviceMotion API) ─────
const UMBRAL_AGITACION = 30; // Umbral de aceleración en m/s² para detectar la sacudida
let ultimoBlackoutAgitacion = 0; // Marca de tiempo para el debounce del blackout
let bloqueadoPorAgitacion = 0; // Timestamp hasta el cual se ignoran otros sensores tras agitar

/**
 * Procesa los datos del acelerómetro para detectar gestos de agitación.
 */
function manejarMovimiento(event) {
  if (!event.accelerationIncludingGravity) return;

  // Obtenemos la aceleración en los tres ejes físicos
  const { x, y, z } = event.accelerationIncludingGravity;
  
  // Cálculo de la magnitud del vector aceleración (Norma Euclídea)
  const aceleracion = Math.sqrt(x * x + y * y + z * z);

  const ahora = Date.now();
  // Validación del gesto: aceleración superior al umbral y respeto al tiempo de enfriamiento (2s)
  if (aceleracion > UMBRAL_AGITACION && (ahora - ultimoBlackoutAgitacion) > 2000) {
    // Bloqueamos la navegación por inclinación durante 3s para evitar saltos accidentales al agitar
    bloqueadoPorAgitacion = ahora + 3000;
    ultimoBlackoutAgitacion = ahora;
    
    socket.emit('toggle-blackout'); // Conmuta el estado de pantalla negra en el servidor
    toast('📳 Blackout por agitación');
  }
}

/**
 * Procesa los datos del giroscopio para la navegación y el puntero láser.
 */
function manejarOrientacion(event) {
  // Exclusión mutua: si la cámara o voz están procesando, ignoramos la orientación para ahorrar CPU
  if (estado.camaraActiva || estado.vozActiva) return;

  const gamma = event.gamma ?? 0; // Rotación en eje longitudinal (izquierda/derecha)
  const beta  = event.beta  ?? 0; // Rotación en eje transversal (adelante/atrás)

  // ─ Feedback Visual: Actualiza la posición del cursor de inclinación en la UI del móvil ─
  const pct = Math.min(100, Math.max(0, ((gamma + 60) / 120) * 100));
  document.getElementById('cursor-inclinacion').style.left = `${pct}%`;

  // ─ Lógica de Navegación por Inclinación (Gesto Discreto) ─
  // Verificamos bloqueos: por tiempo, por agitación reciente o si el modo blackout está activo
  const bloqueado = estado.bloqueoGesto || Date.now() < bloqueadoPorAgitacion || estado.blackout;
  
  if (!bloqueado && !estado.punteroActivo) {
    // Detección de umbrales para cambio de diapositiva
    if (gamma < -estado.umbralGesto) {
      socket.emit('anterior-diapositiva');
      toast('← Anterior');
      bloquearGesto();
    } else if (gamma > estado.umbralGesto) {
      socket.emit('siguiente-diapositiva');
      toast('Siguiente →');
      bloquearGesto();
    }
  }

  // ─ Lógica del Puntero Láser (Movimiento Continuo) ─
  if (estado.punteroActivo && estado.modoPuntero === 'giro') {

    // Filtro de ruido/Gimbal Lock: Ignora lecturas con saltos bruscos e irreales (>30°)
    const saltoBeta  = betaAnterior  !== null && Math.abs(beta  - betaAnterior)  > 30;
    const saltoGamma = gammaAnterior !== null && Math.abs(gamma - gammaAnterior) > 30;
    betaAnterior  = beta;
    gammaAnterior = gamma;
    if (saltoBeta || saltoGamma) return;

    // Normalización de coordenadas: Mapeamos los grados del sensor a porcentaje (0-100%)
    // Eje X (Gamma): Rango útil de -40° a 40°
    const gLimpio = Math.min(40, Math.max(-40, gamma));
    const px = ((gLimpio + 40) / 80) * 100;

    // Eje Y (Beta): Rango útil de 15° a 75° (postura natural del móvil)
    const bLimpio = Math.min(75, Math.max(15, beta));
    const py = ((bLimpio - 15) / 60) * 100;

    // Aplicación del Filtro de Paso Bajo (Suavizado Exponencial)
    // Reduce el temblor de la mano del ponente en la pantalla del proyector
    if (filtroX === null) {
      filtroX = px;
      filtroY = py;
    } else {
      filtroX = ALPHA * px + (1 - ALPHA) * filtroX;
      filtroY = ALPHA * py + (1 - ALPHA) * filtroY;
    }

    // Emisión de coordenadas suavizadas al servidor
    socket.emit('puntero-mover', {
      x: Math.min(100, Math.max(0, filtroX)),
      y: Math.min(100, Math.max(0, filtroY))
    });

  } else {
    // Reset de filtros al desactivar el puntero para evitar saltos al reactivarlo
    filtroX = null;
    filtroY = null;
    gammaAnterior = null;
    betaAnterior  = null;
  }
}

/**
 * Implementa un bloqueo temporal (debounce) para la navegación por gestos.
 */
function bloquearGesto() {
  estado.bloqueoGesto = true;
  setTimeout(() => { estado.bloqueoGesto = false; }, estado.bloqueoMs);
}

// ── DEVICEPROXIMITY (Sensor de proximidad infrarrojo) ───────────────────────────
/**
 * Detecta si el terminal está cerca de un objeto (ej. guardado en el bolsillo) 
 * para conmutar el estado Blackout de forma implícita.
 */
function manejarProximidad(event) {
  const cerca = event.near ?? (typeof event.value !== 'undefined' ? event.value < 5 : false);
  if (cerca && !estado.blackout) {
    socket.emit('toggle-blackout');
    toast('Blackout activado 🖐');
  } else if (!cerca && estado.blackout) {
    socket.emit('toggle-blackout');
    toast('Blackout desactivado');
  }
}

// ── REGISTRO DE EVENTOS (Lifecycle) ───────────────────────
/**
 * Inicializa los listeners de los sensores de movimiento y orientación.
 */
function activarSensorOrientacion() {
  window.addEventListener('deviceorientation', manejarOrientacion);
  window.addEventListener('devicemotion', manejarMovimiento);
}