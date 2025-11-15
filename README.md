# 🏰 La Puerta Secreta - Detección de Posturas

Juego interactivo medieval que utiliza **Teachable Machine** para detectar posturas corporales y controlar la apertura de una puerta mágica.

## 🎮 Cómo Funciona

El proyecto utiliza el modelo de detección de posturas de Teachable Machine para reconocer dos clases:

### ✅ Postura "Clave" (≥90% confianza)
- Cuando el modelo detecta la postura "Clave" con una confianza del 90% o superior
- La puerta del castillo se abre automáticamente
- Se muestra un mensaje de éxito
- Se revela el pasillo oscuro detrás de la puerta

### ❌ Postura "Incorrecto" (≥70% confianza)
- Cuando el modelo detecta la postura "Incorrecto"
- La puerta permanece cerrada
- Se muestra un mensaje de error
- El jugador puede intentar nuevamente después de 2 segundos

## 🚀 Características

- **Detección en tiempo real**: Utiliza la cámara web para detectar posturas corporales
- **Visualización de esqueleto**: Muestra los puntos clave y líneas del cuerpo (como Teachable Machine)
- **Detección instantánea**: Sin cooldown, respuesta inmediata a las posturas
- **Interfaz medieval inmersiva**: Diseño temático con animaciones y efectos visuales
- **Integración con VAPI**: Asistente de voz AI para interacción adicional

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Edge)
- Cámara web funcional
- Conexión a internet (para cargar las librerías)

## 🎯 Cómo Usar

1. Abre `index.html` en tu navegador
2. Haz clic en "Empezar" en la pantalla de bienvenida
3. Haz clic en "Iniciar Prueba" para activar la cámara
4. Permite el acceso a la cámara cuando se solicite
5. Realiza la postura "Clave" frente a la cámara
6. ¡Observa cómo se abre la puerta del castillo!

## 🔧 Tecnologías Utilizadas

- **TensorFlow.js**: Framework de machine learning
- **Teachable Machine Pose**: Modelo de detección de posturas
- **HTML5 Canvas**: Renderizado de video y keypoints
- **CSS3**: Animaciones y efectos visuales
- **JavaScript ES6+**: Lógica del juego

## 📊 Modelo de Teachable Machine

URL del modelo: `https://teachablemachine.withgoogle.com/models/YsCOZ0rkm/`

El modelo ha sido entrenado para reconocer:
- **Clase 1**: "Clave" - Postura correcta para abrir la puerta
- **Clase 2**: "Incorrecto" - Postura incorrecta

## 🎨 Personalización

Puedes modificar los umbrales de detección en `script.js`:

```javascript
// Umbral para postura "Clave"
if (className === "Clave" && probability >= 0.90) { ... }

// Umbral para postura "Incorrecto"
if (className === "Incorrecto" && probability >= 0.70) { ... }
```

## 🐛 Debugging

El proyecto incluye funciones de debugging en la consola:

```javascript
// Forzar apertura de puerta
window.debugOpenGate();

// Simular detección de llave
window.debugSimulateKey(true);  // Llave correcta
window.debugSimulateKey(false); // Llave incorrecta
```

## 📝 Notas

- El modelo se carga automáticamente desde Teachable Machine
- Solo se muestra el esqueleto (puntos y líneas verdes) sin el video de fondo
- Los keypoints se dibujan en verde con líneas conectándolos (igual que Teachable Machine)
- La detección es instantánea sin cooldown para respuesta inmediata

## 🎭 Créditos

Proyecto creado con Teachable Machine de Google y diseño medieval inmersivo.
