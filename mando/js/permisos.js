/**
 * permisos.js
 * Gestiona el flujo de solicitud de permisos al usuario
 * antes de acceder a los sensores del dispositivo.
 *
 * Permisos solicitados:
 *  1. DeviceOrientationEvent (movimiento) — iOS requiere permiso explícito
 *  2. Micrófono — para Web Speech API
 *  3. Sensor de proximidad — sin permiso explícito, solo comprobación
 */

async function solicitarPermisos() {
  // ── 1. MOVIMIENTO Y ORIENTACIÓN ───────────
  // iOS 13+ requiere llamar a requestPermission() explícitamente
  // En Android no existe ese método, se añade el listener directamente
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const resultado = await DeviceOrientationEvent.requestPermission();
      if (resultado === 'granted') {
        activarSensorOrientacion();
        setPermiso('perm-movimiento', 'concedido');
      } else {
        setPermiso('perm-movimiento', 'denegado');
      }
    } catch (e) {
      console.warn('[Permisos] DeviceOrientation:', e);
      setPermiso('perm-movimiento', 'denegado');
    }
  } else if (typeof DeviceOrientationEvent !== 'undefined') {
    // Android: sin permiso explícito
    activarSensorOrientacion();
    setPermiso('perm-movimiento', 'concedido');
  } else {
    setPermiso('perm-movimiento', 'denegado');
  }

  // ── 2. MICRÓFONO ──────────────────────────
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    setPermiso('perm-microfono', 'concedido');
  } catch (e) {
    console.warn('[Permisos] Micrófono:', e);
    setPermiso('perm-microfono', 'denegado');
  }

  // ── PASAR A PANTALLA MANDO ────────────────
  document.getElementById('pantalla-permisos').classList.remove('activa');
  document.getElementById('pantalla-mando').classList.add('activa');
  socket.emit('solicitar-estado');
}

// ── HELPER: actualizar badge de permiso ───────
function setPermiso(id, resultado) {
  const el = document.getElementById(id);
  const textos = { concedido: 'Concedido', denegado: 'No disponible' };
  el.textContent = textos[resultado] ?? resultado;
  el.className   = `estado ${resultado}`;
}

// ── EVENTO DEL BOTÓN ─────────────────────────
document.getElementById('btn-permisos').addEventListener('click', solicitarPermisos);
