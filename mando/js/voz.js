/**
 * voz.js
 * Gestiona los comandos de voz mediante la Web Speech API.
 * Implementa reconocimiento continuo y filtrado de comandos para control de presentaciones.
 */

// Instancia del motor de reconocimiento y bandera de estado
let reconocimiento = null;
let bloqueandoComando = false; // MECANISMO DE DEBOUNCE: Evita que el mismo comando se dispare varias veces por resultados intermedios

// Diccionario de comandos: Mapea frases de voz con eventos de Socket.io
const COMANDOS = {
  'siguiente':       () => socket.emit('siguiente-diapositiva'),
  'avanzar':         () => socket.emit('siguiente-diapositiva'),
  'adelante':        () => socket.emit('siguiente-diapositiva'),
  'anterior':        () => socket.emit('anterior-diapositiva'),
  'atrás':           () => socket.emit('anterior-diapositiva'),
  'retroceder':      () => socket.emit('anterior-diapositiva'),
  'portada':         () => socket.emit('ir-a-diapositiva', 0),
  'ir a la portada': () => socket.emit('ir-a-diapositiva', 0),
  'inicio':          () => socket.emit('ir-a-diapositiva', 0),
  'black out':       () => socket.emit('toggle-blackout'),
  'pantalla negra':  () => socket.emit('toggle-blackout'),
  'salir':           () => { socket.emit('salir-presentacion'); detenerVoz(); },
  'cerrar':          () => { socket.emit('salir-presentacion'); detenerVoz(); },
  'fin':             () => { socket.emit('salir-presentacion'); detenerVoz(); },
};

// Mapeo para normalización de números (Conversión de texto a dígito)
const NUMEROS_TEXTO = {
  'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
  'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
  'dieciséis': 16, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18,
  'diecinueve': 19, 'veinte': 20
};

/**
 * Ejecuta la acción asociada a un comando y gestiona el bloqueo temporal.
 */
function ejecutarComando(cmd, accion) {
  bloqueandoComando = true; // Activa el bloqueo para evitar duplicados
  accion(); // Ejecuta la función del mapa de comandos
  socket.emit('notif-voz', cmd); // Notifica al servidor para feedback visual
  document.getElementById('transcripcion').textContent = `✓ ${cmd}`;
  toast(`🎤 "${cmd}"`);
  // Tiempo de enfriamiento (cooldown) de 1.5s antes de permitir otro comando
  setTimeout(() => { bloqueandoComando = false; }, 1500);
}

/**
 * Configura e inicia el motor de reconocimiento de voz.
 */
function iniciarVoz() {
  // Compatibilidad entre navegadores (Chrome usa webkitSpeechRecognition)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Web Speech API no disponible en este navegador');
    return;
  }

  reconocimiento = new SR();
  reconocimiento.lang = 'es-ES'; // Configuración de idioma
  reconocimiento.continuous = true; // Mantiene el micro abierto tras detectar una frase
  reconocimiento.interimResults = true; // Permite ver resultados provisionales mientras se habla

  // Evento principal: Se dispara cuando el motor detecta audio
  reconocimiento.onresult = (event) => {
    let texto = '';
    // Recorremos los resultados desde el último índice procesado
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (!event.results[i].isFinal) continue; // Filtramos para quedarnos solo con la frase confirmada (isFinal)
      texto += event.results[i][0].transcript;
    }
    
    texto = texto.toLowerCase().trim();
    if (!texto || bloqueandoComando) return; // Si no hay texto o el sistema está en "cooldown", salimos

    // Normalización: Sustitución de palabras numéricas por dígitos usando RegEx
    for (const [palabra, numero] of Object.entries(NUMEROS_TEXTO)) {
      texto = texto.replace(new RegExp(`\\b${palabra}\\b`, 'g'), numero);
    }

    document.getElementById('transcripcion').textContent = texto;

    // Procesamiento de Comando Dinámico mediante Expresión Regular: "ir a diapositiva X"
    const coincidencia = texto.match(/diapositiva (\d+)/);
    if (coincidencia) {
      const numDiapositiva = parseInt(coincidencia[1], 10);
      const indice = numDiapositiva - 1; // Ajuste de índice base 0
      if (indice >= 0 && indice < estado.totalDiapositivas) {
        bloqueandoComando = true;
        socket.emit('ir-a-diapositiva', indice);
        socket.emit('notif-voz', `ir a diapositiva ${numDiapositiva}`);
        document.getElementById('transcripcion').textContent = `✓ diapositiva ${numDiapositiva}`;
        toast(`🎤 Diapositiva ${numDiapositiva}`);
        setTimeout(() => { bloqueandoComando = false; }, 1500);
      } else {
        toast(`⚠️ La diapositiva ${numDiapositiva} no existe`);
      }
      return;
    }

    // Búsqueda de comandos estáticos en el diccionario COMANDOS
    for (const [cmd, accion] of Object.entries(COMANDOS)) {
      if (texto.includes(cmd)) {
        ejecutarComando(cmd, accion);
        break; // Detenemos la búsqueda tras la primera coincidencia encontrada
      }
    }
  };

  // Gestión de errores de la API
  reconocimiento.onerror = (e) => {
    if (e.error === 'no-speech') return; // Ignorar si es simplemente silencio
    toast(`Error de voz: ${e.error}`);
    console.warn('[Voz] Error:', e.error);
  };

  // Re-inicio automático: Si la voz sigue activa pero la API se detiene, la reiniciamos
  reconocimiento.onend = () => {
    if (estado.vozActiva) reconocimiento.start();
  };

  reconocimiento.start();
  estado.vozActiva = true;
  actualizarVoz(); // Actualiza el estado visual de la interfaz (ej. color de icono)
}

/**
 * Detiene el reconocimiento y libera los recursos.
 */
function detenerVoz() {
  if (reconocimiento) {
    reconocimiento.abort(); // Detiene el micro inmediatamente
    reconocimiento = null;
  }
  estado.vozActiva = false;
  actualizarVoz();
}