# 🎓 Sistema Interactivo Ubicuo — Control de Presentación

**Grupo 82 · Sistemas Interactivos y Ubicuos · UC3M**  
Rodrigo Mohedano García · Ignacio Sánchez Pinto · Alfonso Oliva Olaya

---

## ¿Qué es esto?

Sistema distribuido en tiempo real que permite controlar una presentación desde un móvil usando gestos, movimiento y voz, sin tocar el ordenador del proyector.

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- Navegador Chrome en Android (para el mando)
- Todos los dispositivos conectados a la **misma red WiFi**, o el móvil conectado por USB

---

## Instalación

```bash
# 1. Descomprime el zip y entra en la carpeta del servidor
cd server

# 2. Instala las dependencias
npm install
```

---

## Arrancar el sistema

```bash
# Dentro de la carpeta server/
node server.js
```

Verás algo así en la terminal:

```
🚀 SERVIDOR P2-SIU LISTO
------------------------------------------
🏠 Dashboard:  http://localhost:3000
💻 Proyector:  http://localhost:3000/presentacion
📱 Mando:      http://192.168.x.x:3000/mando
------------------------------------------
```

---

## Uso

1. **Proyector** — Abre `http://localhost:3000/presentacion` en el ordenador conectado al proyector (pantalla completa con `F`)

2. **Mando** — Abre la URL del mando en el móvil Android con Chrome. Tienes dos opciones:
   - **Por WiFi** (misma red): `http://192.168.x.x:3000/mando` (IP que aparece en la terminal)
   - **Por USB** (sin WiFi): Conecta el móvil al ordenador con un cable USB, activa la **Depuración USB** en las opciones de desarrollador del móvil, y abre `http://localhost:3000/mando` directamente en Chrome del móvil. Chrome redirige el tráfico por el cable automáticamente.

3. **Dashboard** — Accede a `http://localhost:3000` para ver el panel de control

En el mando, pulsa **"Solicitar permisos y conectar"** para activar los sensores.

---

## Cómo activar la Depuración USB en Android

1. Ve a **Ajustes → Acerca del teléfono**
2. Pulsa **7 veces** sobre **Número de compilación** hasta que aparezca "Eres desarrollador"
3. Ve a **Ajustes → Opciones de desarrollador**
4. Activa **Depuración USB**
5. Conecta el móvil al ordenador con un cable USB y acepta el diálogo de confirmación
6. Abre Chrome en el móvil y navega a `http://localhost:3000/mando`

---

## Estructura del proyecto

```
proyecto/
├── server/
│   └── server.js          # Servidor Node.js + Socket.IO
├── mando/
│   ├── index.html         # Interfaz del mando (móvil)
│   ├── css/mando.css
│   └── js/
│       ├── estado.js      # Estado global
│       ├── socket.js      # Conexión Socket.IO
│       ├── sensores.js    # Giroscopio, acelerómetro, proximidad
│       ├── puntero.js     # Área táctil del puntero
│       ├── camara.js      # Gestos con MediaPipe
│       ├── voz.js         # Comandos de voz
│       ├── botones.js     # Eventos de botones
│       ├── vibracion.js   # Alertas hápticas
│       ├── permisos.js    # Gestión de permisos
│       └── mando.js       # Punto de entrada
├── presentacion/
│   ├── index.html         # Pantalla del proyector
│   ├── css/presentacion.css
│   └── js/presentacion.js
└── dashboard/
    ├── dashboard.html
    └── css/dashboard.css
```

---

## Interacciones disponibles

| Gesto / Acción | Resultado | API |
|---|---|---|
| Inclinar móvil derecha | Siguiente diapositiva | DeviceOrientation |
| Inclinar móvil izquierda | Diapositiva anterior | DeviceOrientation |
| Mover móvil (puntero ON) | Puntero láser en pantalla | DeviceOrientation |
| Agitar el móvil | Activar/desactivar Blackout | DeviceMotion |
| Mano abierta (cámara) | Siguiente diapositiva | MediaPipe Hands |
| Puño cerrado (cámara) | Diapositiva anterior | MediaPipe Hands |
| "siguiente" / "anterior" | Navegar diapositiva | Web Speech API |
| "diapositiva tres" | Ir a diapositiva 3 | Web Speech API |
| "black out" | Activar/desactivar Blackout | Web Speech API |
| "salir" | Cerrar presentación | Web Speech API |
| Vibración a 5/10/15 min | Aviso háptico al ponente | Vibration API |

---

## Notas importantes

- El mando requiere **Chrome en Android**. En iOS la Web Speech API y DeviceMotion tienen restricciones.
- La cámara de gestos requiere buena iluminación para funcionar correctamente.
- Si el puntero láser no aparece centrado, ajusta el ángulo del móvil — está calibrado para sostenerlo inclinado ~45° hacia el proyector.