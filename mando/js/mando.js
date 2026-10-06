/**
 * mando.js — Punto de entrada del mando
 *
 * Este archivo únicamente inicializa los módulos.
 * La lógica está repartida en:
 *
 *   estado.js   → Estado global y funciones de actualización de UI
 *   socket.js   → Conexión y eventos Socket.IO
 *   sensores.js → DeviceOrientationEvent + DeviceProximityEvent
 *   puntero.js  → Área táctil del puntero (fix giroscopio vs táctil)
 *   voz.js      → Web Speech API y comandos de voz
 *   botones.js  → Eventos de los botones de la interfaz
 *   permisos.js → Flujo de solicitud de permisos al usuario
 */

window.addEventListener('DOMContentLoaded', () => {
  iniciarBotones();
  iniciarPuntero();
  console.log('[Mando] Listo. Pulsa "Solicitar permisos" para comenzar.');
});
