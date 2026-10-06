/**
 * socket.js
 * Gestiona la comunicación bidireccional mediante Socket.IO.
 * Actúa como el puente de sincronización entre el servidor de la presentación
 * y la interfaz del mando móvil.
 */

// Inicialización de la instancia de Socket.IO
const socket = io();

// ── GESTIÓN DE LA CONEXIÓN (Ciclo de vida) ──────────────────────────────────

/**
 * Evento que se dispara al establecer conexión con el servidor.
 * Actualiza la UI y sincroniza el estado actual para que el mando 
 * no empiece "a ciegas".
 */
socket.on('connect', () => {
  document.getElementById('estado-conexion').textContent = 'Conectado';
  document.getElementById('estado-conexion').className   = 'badge verde';
  
  // Solicita al servidor los datos actuales de la sesión (Slide, Timer, Blackout)
  socket.emit('solicitar-estado');
});

/**
 * Evento disparado al perder la conexión con el servidor.
 * Cambia el indicador visual a rojo para alertar al usuario.
 */
socket.on('disconnect', () => {
  document.getElementById('estado-conexion').textContent = 'Sin conexión';
  document.getElementById('estado-conexion').className   = 'badge rojo';
});

// ── EVENTOS ENTRANTES DEL SERVIDOR (Sincronización de Estado) ────────────

/**
 * Recibe el estado completo de la sesión. 
 * Útil para reconexiones o cuando el mando se abre a mitad de una charla.
 */
socket.on('estado-inicial', (e) => {
  estado.totalDiapositivas = e.totalDiapositivas;
  actualizarSlide(e.diapositivaActual);
  estado.blackout = e.blackout;
  actualizarBlackout(); // Sincroniza el estado visual del botón Blackout
  
  // Si ya hay una presentación en marcha, recupera el cronómetro
  if (e.tiempoInicio) iniciarTimer(e.tiempoInicio);
});

/**
 * Evento disparado cuando se inicia una nueva presentación desde el PC.
 * Resetea el mando al estado inicial (Diapositiva 0 y Timer nuevo).
 */
socket.on('presentacion-iniciada', (e) => {
  estado.totalDiapositivas = e.totalDiapositivas;
  actualizarSlide(0);
  iniciarTimer(e.tiempoInicio);
});

/**
 * Actualiza el índice de la diapositiva en el mando.
 * Asegura que el número de slide que ve el ponente sea el mismo que ve el público.
 */
socket.on('cambio-diapositiva', (indice) => {
  actualizarSlide(indice);
});

/**
 * Sincroniza el estado del Blackout.
 * Permite que si el Blackout se activa por voz o desde el PC, el mando se actualice.
 */
socket.on('blackout-estado', (activo) => {
  estado.blackout = activo;
  actualizarBlackout();
});

/**
 * Actualiza el estado del puntero láser.
 */
socket.on('puntero-estado', ({ activo }) => {
  estado.punteroActivo = activo;
  actualizarPuntero();
});

/**
 * Rutina de limpieza al finalizar la presentación.
 * Detiene todos los procesos activos en el móvil para ahorrar batería y recursos.
 */
socket.on('salir-presentacion', () => {
  // Detiene el cronómetro
  if (estado.timerInterval) clearInterval(estado.timerInterval);
  
  // Cancela cualquier vibración (háptica) en curso
  cancelarVibracion();
  
  // Resetea la interfaz del mando
  document.getElementById('timer').textContent = '00:00';
  actualizarSlide(0);
});