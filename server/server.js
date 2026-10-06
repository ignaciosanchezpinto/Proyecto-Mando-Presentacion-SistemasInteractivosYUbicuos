const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

function obtenerIPLocal() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ── 1. CARPETAS ESTÁTICAS (EL FALLO ESTABA AQUÍ) ──────────────

// Esta línea permite que el navegador entre a la carpeta dashboard y pille el CSS
app.use(express.static(path.join(__dirname, '../dashboard')));

// Estas ya las tenías y están bien
app.use('/mando', express.static(path.join(__dirname, '../mando')));
app.use('/presentacion', express.static(path.join(__dirname, '../presentacion')));

// ── 2. RUTAS DE ARCHIVOS ──────────────────────────────────────

// Cuando entras a la raíz, mandamos el HTML del dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dashboard.html'));
});

// Ruta para las diapositivas
app.get('/presentacion', (req, res) => {
    res.sendFile(path.join(__dirname, '../presentacion/index.html'));
});

// ── 3. LÓGICA DE SOCKETS (Se mantiene igual) ──────────────────
let estadoSistema = {
  diapositivaActual: 0,
  totalDiapositivas: 0,
  blackout: false,
  punteroActivo: false,
  punteroX: 0,
  punteroY: 0,
  tiempoInicio: null,
  presentacionActiva: false
};

io.on('connection', (socket) => {
  console.log(`[+] Cliente conectado: ${socket.id}`);
  socket.emit('estado-inicial', estadoSistema);

  socket.on('siguiente-diapositiva', () => {
    if (estadoSistema.diapositivaActual < estadoSistema.totalDiapositivas - 1) {
      estadoSistema.diapositivaActual++;
      io.emit('cambio-diapositiva', estadoSistema.diapositivaActual);
    }
  });

  socket.on('anterior-diapositiva', () => {
    if (estadoSistema.diapositivaActual > 0) {
      estadoSistema.diapositivaActual--;
      io.emit('cambio-diapositiva', estadoSistema.diapositivaActual);
    }
  });
  socket.on('ir-a-diapositiva', (indice) => {
    if (indice >= 0 && indice < estadoSistema.totalDiapositivas) {
      estadoSistema.diapositivaActual = indice;
      io.emit('cambio-diapositiva', indice);
    }
  });

  socket.on('toggle-blackout', () => {
    estadoSistema.blackout = !estadoSistema.blackout;
    io.emit('blackout-estado', estadoSistema.blackout);
  });

  socket.on('puntero-activar', () => {
    estadoSistema.punteroActivo = true;
    io.emit('puntero-estado', { activo: true });
  });

  socket.on('puntero-desactivar', () => {
    estadoSistema.punteroActivo = false;
    io.emit('puntero-estado', { activo: false });
  });

  socket.on('puntero-mover', (data) => {
    estadoSistema.punteroX = data.x;
    estadoSistema.punteroY = data.y;
    socket.broadcast.emit('puntero-posicion', { x: data.x, y: data.y });
  });
  socket.on('salir-presentacion', () => {
    estadoSistema.presentacionActiva = false;
    estadoSistema.punteroActivo = false;
    io.emit('salir-presentacion');
  });

  socket.on('iniciar-presentacion', (totalSlides) => {
    estadoSistema.totalDiapositivas = totalSlides;
    estadoSistema.diapositivaActual = 0;
    estadoSistema.presentacionActiva = true;
    estadoSistema.tiempoInicio = Date.now();
    io.emit('presentacion-iniciada', estadoSistema);
    console.log(`[▶] Presentación iniciada — ${totalSlides} diapositivas`);
  });

  socket.on('solicitar-estado', () => {
    socket.emit('estado-inicial', estadoSistema);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Cliente desconectado: ${socket.id}`);
  });
});

const PORT = 3000;
const IP_AUTO = obtenerIPLocal();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVIDOR P2-SIU LISTO`);
  console.log(`------------------------------------------`);
  console.log(`🏠 Dashboard:  http://localhost:${PORT}`);
  console.log(`💻 Proyector:  http://localhost:${PORT}/presentacion`);
  console.log(`📱 Mando:      http://${IP_AUTO}:${PORT}/mando`);
  console.log(`------------------------------------------\n`);
});