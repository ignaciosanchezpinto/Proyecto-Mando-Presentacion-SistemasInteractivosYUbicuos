/**
 * puntero.js
 * Gestiona el área táctil del puntero láser.
 */

// Función principal que inicializa los escuchadores de eventos del puntero
function iniciarPuntero() {
  // Referencias a los elementos visuales del trackpad y botones de modo
  const areaPuntero  = document.getElementById('area-puntero');
  const btnModoGiro  = document.getElementById('btn-modo-giro');
  const btnModoTactil = document.getElementById('btn-modo-tactil');

  // ── SELECTOR DE MODO: GIROSCOPIO ───────────────────────
  // Configura el puntero para que se mueva físicamente al mover el brazo/muñeca
  btnModoGiro.addEventListener('click', () => {
    estado.modoPuntero = 'giro'; // Cambiamos el estado global a modo físico
    actualizarBotonesModoPuntero(); // Reflejamos el cambio en la interfaz
    toast('Modo: Giroscopio'); // Notificación visual rápida
  });

  // ── SELECTOR DE MODO: TÁCTIL ───────────────────────
  // Configura el puntero para que se use como un "trackpad" de portátil
  btnModoTactil.addEventListener('click', () => {
    estado.modoPuntero = 'tactil'; // Cambiamos el estado global a modo dedo
    actualizarBotonesModoPuntero(); // Reflejamos el cambio en la interfaz
    toast('Modo: Táctil'); // Notificación visual rápida
  });

  // ── EVENTOS TOUCH (Móvil) ──────────────────────────────────
  
  // Se dispara al poner el dedo sobre el área del puntero
  areaPuntero.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Evita que la página haga scroll mientras mueves el puntero
    
    // Automatismo de usabilidad: Si el usuario toca el área, asumimos que quiere usar el modo táctil
    if (estado.modoPuntero !== 'tactil') {
      estado.modoPuntero = 'tactil';
      actualizarBotonesModoPuntero();
    }
    // Enviamos la posición inicial de donde se ha puesto el dedo
    enviarPosicionTouch(e.touches[0], areaPuntero);
  }, { passive: false });

  // Se dispara constantemente mientras el dedo se desliza por la zona
  areaPuntero.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Mantenemos el bloqueo del scroll del navegador
    
    // Seguridad: si el puntero no está activado globalmente, no enviamos coordenadas
    if (!estado.punteroActivo) return;
    
    // Enviamos las coordenadas actuales al servidor
    enviarPosicionTouch(e.touches[0], areaPuntero);
  }, { passive: false });

  // ── EVENTOS MOUSE (Para depuración y pruebas en ordenador) ─────────────
  
  // Permite probar el movimiento del puntero con el ratón en el PC de desarrollo
  areaPuntero.addEventListener('mousemove', (e) => {
    if (!estado.punteroActivo) return;
    enviarPosicionMouse(e, areaPuntero);
  });

  // Activa el modo táctil al hacer clic (simulando el comportamiento del dedo)
  areaPuntero.addEventListener('mousedown', (e) => {
    if (estado.modoPuntero !== 'tactil') {
      estado.modoPuntero = 'tactil';
      actualizarBotonesModoPuntero();
    }
    enviarPosicionMouse(e, areaPuntero);
  });
}

// ── HELPERS DE POSICIÓN ───────────────────────

/**
 * Calcula las coordenadas relativas (%) del toque en el móvil.
 * Transforma píxeles de pantalla en un valor de 0 a 100 para que sea independiente
 * del tamaño de la pantalla del tribunal.
 */
function enviarPosicionTouch(touch, elemento) {
  const rect = elemento.getBoundingClientRect(); // Obtenemos dimensiones del área táctil
  
  // Cálculo matemático para obtener el porcentaje dentro del cuadro
  const x = ((touch.clientX - rect.left) / rect.width)  * 100;
  const y = ((touch.clientY - rect.top)  / rect.height) * 100;
  
  // Enviamos la señal al servidor limitando los valores entre 0 y 100
  socket.emit('puntero-mover', {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y))
  });
}

/**
 * Lo mismo que el anterior, pero adaptado para los eventos de ratón (mouse).
 */
function enviarPosicionMouse(event, elemento) {
  const rect = elemento.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width)  * 100;
  const y = ((event.clientY - rect.top)  / rect.height) * 100;
  
  socket.emit('puntero-mover', {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y))
  });
}