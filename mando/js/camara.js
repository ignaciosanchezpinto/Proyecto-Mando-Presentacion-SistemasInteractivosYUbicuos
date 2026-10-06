/**
 * camara.js
 * Implementa el módulo de Visión Artificial para interacción manos libres.
 * Utiliza MediaPipe Hands para la detección de landmarks y lógica de 
 * clasificación de gestos basada en la geometría de la mano.
 */
let camaraMedia = null;
let handsInstance = null;

// Parámetros de estabilidad: evita que un parpadeo de la cámara dispare una acción
const FRAMES_NECESARIOS = 5; // Número de frames que el gesto debe ser idéntico para validarse
let frameActual = 0;
let gestoActual = -1;

/**
 * Conmuta el estado de la cámara (Encendido/Apagado).
 */
async function toggleCamara() {
  if (estado.camaraActiva) {
    detenerCamara();
  } else {
    await iniciarCamara();
  }
}

/**
 * Configura MediaPipe Hands y arranca el flujo de vídeo.
 */
async function iniciarCamara() {
  const video = document.getElementById('video-mando');

  try {
    // Inicialización de la instancia de MediaPipe desde el CDN
    handsInstance = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    // Configuración del modelo: complejidad equilibrada para dispositivos móviles
    handsInstance.setOptions({
      maxNumHands: 1,           // Solo procesamos una mano para ahorrar recursos
      modelComplexity: 1,      // 0 o 1 es lo ideal para tiempo real en móviles
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // Callback principal: Se ejecuta cada vez que MediaPipe procesa un frame
    handsInstance.onResults((results) => {
      if (!estado.camaraActiva) return;
      
      // Si el sistema está en cooldown (bloqueo), reseteamos el acumulador
      if (estado.bloqueoGesto) {
        gestoActual = -1;
        frameActual = 0;
        return;
      }

      // Si no hay manos detectadas, reseteamos el acumulador
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        gestoActual = -1;
        frameActual = 0;
        return;
      }

      const hand = results.multiHandLandmarks[0];

      // Lógica de clasificación de gestos mediante comparación de coordenadas:
      // Se comparan las y-coordinates de las puntas de los dedos (índice, medio, anular, meñique)
      // con sus bases respectivas. En coordenadas de pantalla, un valor menor de 'y' significa 
      // que el punto está más alto (dedo levantado).
      const puntas = [8, 12, 16, 20];
      const bases  = [6, 10, 14, 18];
      let dedos = 0;
      for (let i = 0; i < puntas.length; i++) {
        if (hand[puntas[i]].y < hand[bases[i]].y) dedos++;
      }

      // Simplificación del modelo de gestos:
      let gesto;
      if (dedos <= 1) gesto = 0; // Puño cerrado (✊)
      else            gesto = 4; // Mano abierta / Palma (✋)

      // Algoritmo de Persistencia Temporal:
      // Solo ejecutamos la acción si el gesto se mantiene estable durante N frames.
      if (gesto === gestoActual) {
        frameActual++;
      } else {
        gestoActual = gesto;
        frameActual = 1;
      }

      // Si no hemos llegado al umbral de frames, esperamos al siguiente resultado
      if (frameActual < FRAMES_NECESARIOS) return;
      frameActual = 0; // Reset tras ejecución exitosa

      // Ejecución de comandos según el gesto validado
      if (gesto === 0) {
        socket.emit('anterior-diapositiva');
        toast('✊ Anterior');
        bloquearGestoCamara();
      } else if (gesto === 4) {
        socket.emit('siguiente-diapositiva');
        toast('✋ Siguiente');
        bloquearGestoCamara();
      }
    });

    // Configuración de la captura de vídeo mediante MediaDevices API
    camaraMedia = new Camera(video, {
      onFrame: async () => {
        // Envía el frame actual del video a MediaPipe para su análisis
        if (handsInstance) await handsInstance.send({ image: video });
      },
      width: 640,
      height: 480
    });

    estado.camaraActiva = true;
    actualizarCamaraUI();

    await camaraMedia.start();

  } catch (err) {
    console.error("❌ Error cámara:", err);
    toast('❌ Error al iniciar la cámara');
    estado.camaraActiva = false;
    actualizarCamaraUI();
  }
}

/**
 * Detiene el stream de vídeo y libera los recursos del modelo.
 */
function detenerCamara() {
  if (camaraMedia) {
    camaraMedia.stop();
    camaraMedia = null;
  }
  handsInstance = null;
  gestoActual = -1;
  frameActual = 0;
  estado.camaraActiva = false;
  actualizarCamaraUI();
}

/**
 * Implementa una ventana de tiempo (cooldown) para evitar que un solo
 * gesto mantenido en el tiempo dispare múltiples cambios de diapositiva.
 */
function bloquearGestoCamara() {
  estado.bloqueoGesto = true;
  setTimeout(() => { estado.bloqueoGesto = false; }, 1500);
}