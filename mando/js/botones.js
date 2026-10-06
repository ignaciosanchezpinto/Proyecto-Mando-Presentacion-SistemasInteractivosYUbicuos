/**
 * botones.js
 * Gestiona los controladores de eventos (event listeners) de la interfaz táctil.
 * Implementa la lógica de control de exclusividad para asegurar que el uso de
 * periféricos (micro, cámara, sensores) no sature los recursos del dispositivo.
 */

function iniciarBotones() {
  // ── NAVEGACIÓN (Controladores de interacción directa) ──
  /**
   * Envía comandos de navegación básicos. 
   * Proporciona feedback inmediato mediante 'toast' para mejorar la UX.
   */
  document.getElementById('btn-anterior').addEventListener('click', () => {
    socket.emit('anterior-diapositiva');
    toast('← Anterior');
  });

  document.getElementById('btn-siguiente').addEventListener('click', () => {
    socket.emit('siguiente-diapositiva');
    toast('Siguiente →');
  });

  // ── BLACKOUT (Conmutación de estado visual) ──
  document.getElementById('btn-blackout').addEventListener('click', () => {
    socket.emit('toggle-blackout');
  });

  // ── PUNTERO (Gestión de modalidad exclusiva) ──
  /**
   * Activa/Desactiva el puntero láser. 
   * Utiliza el helper 'puedeActivar' para evitar conflictos con otros sensores.
   */
  document.getElementById('btn-puntero').addEventListener('click', () => {
    if (estado.punteroActivo) {
      socket.emit('puntero-desactivar');
      toast('Puntero desactivado');
    } else {
      // Mecanismo de seguridad: solo activa si no hay otras funciones pesadas corriendo
      if (puedeActivar('puntero')) {
        socket.emit('puntero-activar');
        toast('Puntero activado 🔴');
      }
    }
  });

  // ── VOZ (Gestión de modalidad exclusiva) ──
  /**
   * Controla el ciclo de vida de la Web Speech API desde la interfaz.
   */
  document.getElementById('btn-voz').addEventListener('click', () => {
    if (estado.vozActiva) {
      detenerVoz();
      toast('Voz desactivada');
    } else {
      if (puedeActivar('voz')) {
        iniciarVoz();
        toast('Escuchando... 🎤');
      }
    }
  });

  // ── CÁMARA (Gestión de modalidad exclusiva) ──
  /**
   * Controla el acceso al stream de vídeo y procesamiento de MediaPipe.
   */
  document.getElementById('btn-camara').addEventListener('click', () => {
    if (estado.camaraActiva) {
      toggleCamara(); // Lógica de parada definida en camara.js
    } else {
      if (puedeActivar('camara')) {
        toggleCamara(); // Lógica de arranque definida en camara.js
      }
    }
  });

  // ── SALIR (Rutina de desconexión y limpieza) ──
  /**
   * Finaliza la sesión de forma controlada.
   * Asegura que todos los procesos en segundo plano se detengan para liberar recursos.
   */
  document.getElementById('btn-salir').addEventListener('click', () => {
    if (confirm('¿Salir de la presentación?')) {
      // Notifica al servidor el cierre de la sesión
      socket.emit('salir-presentacion');
      
      // Detiene explícitamente los motores de sensores para evitar procesos huérfanos
      detenerVoz();
      if (estado.camaraActiva) detenerCamara();
      
      toast('Presentación cerrada');
    }
  });
}