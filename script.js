// Variables globales
let stream = null;
let isGameActive = false;
let model = null;
let isPredicting = false;
let correctAttempts = 0;
let canvas = null;
let ctx = null;

// Elementos del DOM
const lobbyScreen = document.getElementById('lobbyScreen');
const startGameButton = document.getElementById('startGameButton');
const gameContent = document.getElementById('gameContent');
const startButton = document.getElementById('startButton');
const cameraSection = document.getElementById('cameraSection');
const cameraView = document.getElementById('cameraView');
const gateDoors = document.getElementById('gateDoors');
const hallwayReveal = document.getElementById('hallwayReveal');
const statusMessage = document.getElementById('statusMessage');
const instructionsPanel = document.getElementById('instructionsPanel');
const canvasElement = document.getElementById('canvas');
// Elementos de audio (opcionales)
// const doorOpenSound = document.getElementById('doorOpenSound');
// const ambientSound = document.getElementById('ambientSound');
// const errorSound = document.getElementById('errorSound');

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('La Puerta Secreta - Juego cargado');
    setupEventListeners();
    playAmbientSound();
});

// Configurar event listeners
function setupEventListeners() {
    startGameButton.addEventListener('click', showGameScreen);
    startButton.addEventListener('click', initializeGame);
}

// Mostrar pantalla del juego
function showGameScreen() {
    lobbyScreen.style.display = 'none';
    gameContent.style.display = 'grid';
}

// Reproducir sonido ambiental de fondo
function playAmbientSound() {
    // Sonidos deshabilitados - archivos no disponibles
    // if (ambientSound) {
    //     ambientSound.volume = 0.3;
    //     ambientSound.play().catch(error => {
    //         console.log('Sonido ambiental no disponible:', error);
    //     });
    // }
}

// Inicializar el juego
async function initializeGame() {
    if (isGameActive) {
        showStatus('El juego ya está en curso');
        return;
    }

    try {
        showStatus('Solicitando permisos de cámara...');
        
        // Solicitar permisos de cámara únicamente
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        // Asignar stream a la cámara
        cameraView.srcObject = stream;
        
        // Configurar canvas para predicciones
        canvas = canvasElement;
        canvas.width = 224;
        canvas.height = 224;
        ctx = canvas.getContext('2d');
        
        // Mostrar sección de cámara
        cameraSection.classList.add('active');
        
        // Ocultar instrucciones
        instructionsPanel.style.display = 'none';
        
        // Cambiar texto del botón
        startButton.innerHTML = '<span class="btn-icon">👁</span><span class="btn-text">Observando...</span>';
        startButton.disabled = true;
        
        isGameActive = true;
        
        showStatus('Cámara activada. Muestra la llave ante el ojo mágico');
        
        // Inicializar el modelo de Teachable Machine
        // Esta función se implementará cuando se integre el modelo
        initializeTeachableMachine();
        
        // Inicializar asistente de voz VAPI
        // Esta función se implementará posteriormente
        initializeVAPIAssistant();
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        showStatus('No se pudo acceder a la cámara. Verifica los permisos.');
        playErrorSound();
    }
}

// Inicializar Teachable Machine POSE (Detector de Movimientos)
async function initializeTeachableMachine() {
    console.log('🔄 Cargando modelo POSE de Teachable Machine...');
    
    // Esperar a que tmPose esté disponible
    let attempts = 0;
    while (typeof tmPose === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof tmPose === 'undefined') {
        console.error('❌ tmPose no disponible');
        showStatus('Error: Librerías no cargadas. Recarga la página.');
        return;
    }
    
    try {
        // URL de tu modelo de detector de movimiento (POSE)
        const modelURL = 'https://teachablemachine.withgoogle.com/models/EMAIk78Xa/';
        
        console.log('📦 Cargando modelo POSE desde:', modelURL);
        
        // Cargar el modelo POSE
        model = await tmPose.load(modelURL + 'model.json', modelURL + 'metadata.json');
        console.log('✅ Modelo POSE cargado exitosamente');
        console.log('📊 Clases del modelo:', model.getClassLabels());
        
        // Esperar a que el video esté listo
        if (cameraView.readyState >= 2) {
            console.log('📹 Video listo, iniciando predicciones...');
            startPredictionLoop();
        } else {
            cameraView.addEventListener('loadeddata', () => {
                console.log('📹 Video listo, iniciando predicciones...');
                startPredictionLoop();
            }, { once: true });
        }
        
    } catch (error) {
        console.error('❌ Error al cargar modelo POSE:', error);
        showStatus('Error al cargar el modelo. Verifica la URL.');
    }
}

// Loop de predicción para Teachable Machine POSE
function startPredictionLoop() {
    async function predict() {
        if (!isGameActive || !model) return;
        
        try {
            // Estimar la pose primero
            const { pose, posenetOutput } = await model.estimatePose(cameraView);
            
            // Hacer predicción basada en la pose
            const prediction = await model.predict(posenetOutput);
            
            // Mostrar probabilidades ocasionalmente para debug
            if (Math.random() < 0.02) {
                console.log('📊 Probabilidades:', prediction.map(p => 
                    `${p.className}: ${(p.probability * 100).toFixed(1)}%`
                ).join(', '));
            }
            
            // Buscar las clases (ajusta según los nombres de tu modelo)
            const correctClass = prediction.find(p => 
                p.className.toLowerCase().includes('clave') ||
                p.className.toLowerCase().includes('ok') ||
                p.className.toLowerCase().includes('correcto') ||
                p.className.toLowerCase().includes('llave') ||
                p.className.toLowerCase().includes('mano') ||
                p.className.toLowerCase().includes('pecho')
            );
            
            const incorrectClass = prediction.find(p => 
                p.className.toLowerCase().includes('incorrecto') ||
                p.className.toLowerCase().includes('no') ||
                p.className.toLowerCase().includes('error') ||
                p.className.toLowerCase().includes('normal')
            );
            
            // Si detecta la clase correcta con probabilidad >= 0.80
            if (correctClass && correctClass.probability >= 0.80 && !isPredicting) {
                isPredicting = true;
                console.log(`✅ Gesto correcto detectado! Clase: ${correctClass.className}, Probabilidad: ${(correctClass.probability * 100).toFixed(2)}%`);
                onKeyDetected(true);
            }
            // Si detecta incorrecta
            else if (incorrectClass && incorrectClass.probability >= 0.80 && !isPredicting) {
                isPredicting = true;
                console.log(`❌ Gesto incorrecto detectado! Clase: ${incorrectClass.className}, Probabilidad: ${(incorrectClass.probability * 100).toFixed(2)}%`);
                onKeyDetected(false);
            }
            
            // Continuar prediciendo
            if (isGameActive) {
                requestAnimationFrame(predict);
            }
            
        } catch (error) {
            console.error('❌ Error en predicción POSE:', error);
            showStatus('Error en detección. Verifica tu modelo.');
            isGameActive = false;
        }
    }
    
    predict();
}

// MediaPipe desactivado - usando solo Teachable Machine POSE
async function initializeMediaPipeHands() {
    console.log('⚠️ MediaPipe desactivado. Usando solo Teachable Machine POSE');
    return;
    
    // Código de MediaPipe comentado
    /*
    console.log('🔄 Cargando MediaPipe Pose...');
    showStatus('Cargando detector de pose...');
    
    // Reactivar el juego
    isGameActive = true;
    
    try {
        // Verificar si MediaPipe Pose está disponible
        if (typeof Pose === 'undefined') {
            console.error('❌ MediaPipe Pose no está disponible');
            showStatus('Error: MediaPipe no cargado. Usa ESPACIO para simular.');
            activateKeyboardMode();
            return;
        }
        
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });
        
        pose.onResults(onPoseResults);
        
        // Procesar video
        const camera = new Camera(cameraView, {
            onFrame: async () => {
                if (isGameActive) {
                    await pose.send({ image: cameraView });
                }
            },
            width: 640,
            height: 480
        });
        
        camera.start();
        console.log('✅ MediaPipe Pose activado');
        console.log('🫡 Pon tu mano derecha en el pecho (como el himno nacional)');
        showStatus('Detector activado. Pon tu mano derecha en el pecho.');
        
    } catch (error) {
        console.error('❌ Error al inicializar MediaPipe:', error);
        showStatus('Error. Usa ESPACIO para simular detección.');
        activateKeyboardMode();
    }
}

// Procesar resultados de MediaPipe Pose
function onPoseResults(results) {
    if (!isGameActive || isPredicting) return;
    
    if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;
        
        // Puntos clave:
        // 16 = Muñeca derecha (right wrist)
        // 12 = Hombro derecho (right shoulder)
        // 11 = Hombro izquierdo (left shoulder)
        
        const rightWrist = landmarks[16];
        const rightShoulder = landmarks[12];
        const leftShoulder = landmarks[11];
        
        if (!rightWrist || !rightShoulder || !leftShoulder) return;
        
        // Calcular el centro del pecho (entre los dos hombros)
        const chestCenterX = (rightShoulder.x + leftShoulder.x) / 2;
        const chestCenterY = (rightShoulder.y + leftShoulder.y) / 2;
        
        // Calcular distancia de la muñeca derecha al centro del pecho
        const distanceToChest = Math.sqrt(
            Math.pow(rightWrist.x - chestCenterX, 2) + 
            Math.pow(rightWrist.y - chestCenterY, 2)
        );
        
        // Verificar que la mano esté a la altura del pecho (no muy arriba ni muy abajo)
        const heightDiff = Math.abs(rightWrist.y - chestCenterY);
        
        // Debug ocasional
        if (Math.random() < 0.02) {
            console.log(`📊 Distancia al pecho: ${distanceToChest.toFixed(3)}, Altura: ${heightDiff.toFixed(3)}`);
        }
        
        // Si la mano derecha está cerca del pecho (gesto del himno)
        if (distanceToChest < 0.15 && heightDiff < 0.1) {
            isPredicting = true;
            console.log('✅ ¡Mano derecha en el pecho detectada! (Gesto del himno)');
            onKeyDetected(true);
        }
    }
}

    */
}

// Modo de teclado como último respaldo
function activateKeyboardMode() {
    console.log('⌨️ MODO TECLADO ACTIVADO');
    console.log('   ESPACIO = Abrir puerta');
    console.log('   X = Llave incorrecta');
    
    document.addEventListener('keydown', (e) => {
        if (!isGameActive || isPredicting) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            isPredicting = true;
            console.log('✅ TECLADO: Llave correcta');
            onKeyDetected(true);
        } else if (e.code === 'KeyX') {
            e.preventDefault();
            isPredicting = true;
            console.log('❌ TECLADO: Llave incorrecta');
            onKeyDetected(false);
        }
    });
}

// Manejar detección de llave
function onKeyDetected(isCorrectKey) {
    if (!isGameActive) return;
    
    if (isCorrectKey) {
        // ✅ LLAVE CORRECTA (OK)
        correctAttempts++;
        console.log(`🎉 Intentos correctos: ${correctAttempts}`);
        
        showStatus('¡Llave correcta detectada! Abriendo la puerta...');
        openGate();
        notifyVAPIAssistant('key_correct');
        
        // Detener el juego después de abrir la puerta
        setTimeout(() => {
            isPredicting = false;
        }, 2000);
        
    } else {
        // ❌ LLAVE INCORRECTA
        showStatus('Llave incorrecta. La puerta permanece sellada.');
        playErrorSound();
        notifyVAPIAssistant('key_incorrect');
        
        // Permitir otro intento después de 2 segundos
        setTimeout(() => {
            isPredicting = false;
        }, 2000);
    }
}

// ============================================
// INTEGRACIÓN DE TEACHABLE MACHINE
// ============================================
// Para integrar tu modelo de detección de imágenes:
// 1. Entrena tu modelo en https://teachablemachine.withgoogle.com/
// 2. Exporta el modelo y obtén la URL
// 3. Agrega estos scripts en index.html antes de </body>:
//    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
//    <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js"></script>
// 4. Descomenta y completa el código en initializeKeyDetection() y startPredictionLoop()
// 5. La función onKeyDetected(true) abrirá la puerta cuando detectes la llave correcta
// ============================================

// Abrir la puerta
function openGate() {
    // Añadir clase de animación
    gateDoors.classList.add('opening');
    
    // Reproducir sonido de puerta
    playDoorOpenSound();
    
    // Mostrar pasillo después de la animación
    setTimeout(() => {
        hallwayReveal.classList.add('visible');
        showStatus('¡Has cruzado el umbral! Los secretos te aguardan...');
        
        // Detener el juego
        stopGame();
    }, 1500);
}

// Detener el juego
function stopGame() {
    isGameActive = false;
    
    // Detener stream de cámara
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    // Ocultar cámara después de un tiempo
    setTimeout(() => {
        cameraSection.classList.remove('active');
    }, 3000);
}

// Reproducir sonido de puerta abriéndose
function playDoorOpenSound() {
    // Sonido deshabilitado - archivo no disponible
    // if (doorOpenSound) {
    //     doorOpenSound.volume = 0.7;
    //     doorOpenSound.play().catch(error => {
    //         console.log('Sonido de puerta no disponible:', error);
    //     });
    // }
    console.log('🔊 Sonido de puerta (deshabilitado)');
}

// Reproducir sonido de error
function playErrorSound() {
    // Sonido deshabilitado - archivo no disponible
    // if (errorSound) {
    //     errorSound.volume = 0.5;
    //     errorSound.play().catch(error => {
    //         console.log('Sonido de error no disponible:', error);
    //     });
    // }
    console.log('🔊 Sonido de error (deshabilitado)');
}

// Mostrar mensaje de estado
function showStatus(message) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show');
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 4000);
}

// Inicializar asistente de voz VAPI
// Esta función será implementada cuando se integre VAPI
function initializeVAPIAssistant() {
    console.log('Preparando integración con VAPI...');
    
    // NOTA: Aquí se inicializará el asistente de voz VAPI
    // Ejemplo de integración:
    // const vapi = new Vapi('API_KEY');
    // vapi.start({
    //     assistant: 'ASSISTANT_ID',
    //     onMessage: handleVAPIMessage,
    //     onError: handleVAPIError
    // });
}

// Notificar al asistente VAPI sobre eventos del juego
function notifyVAPIAssistant(event) {
    console.log('Notificando a VAPI:', event);
    
    // NOTA: Esta función enviará eventos al asistente de voz
    // Ejemplo:
    // vapi.send({
    //     type: 'game_event',
    //     event: event,
    //     timestamp: Date.now()
    // });
    
    // Mensajes que el asistente podría decir:
    switch(event) {
        case 'game_start':
            console.log('VAPI: "Bienvenido al desafío del castillo. Muestra la llave para abrir la puerta."');
            break;
        case 'key_correct':
            console.log('VAPI: "¡Excelente! Has encontrado la llave correcta. La puerta se abre ante ti."');
            break;
        case 'key_incorrect':
            console.log('VAPI: "Esa no es la llave correcta. Intenta de nuevo."');
            break;
        case 'game_complete':
            console.log('VAPI: "¡Felicidades! Has completado el desafío. Los secretos del castillo son tuyos."');
            break;
    }
}

// Manejar mensajes del asistente VAPI
function handleVAPIMessage(message) {
    // NOTA: Esta función procesará mensajes del asistente de voz
    console.log('Mensaje de VAPI:', message);
}

// Manejar errores de VAPI
function handleVAPIError(error) {
    console.error('Error de VAPI:', error);
    showStatus('Error en el asistente de voz');
}

// Limpiar recursos al cerrar la página
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    // if (ambientSound) ambientSound.pause();
});

// Funciones de utilidad para debugging
window.debugOpenGate = () => {
    console.log('Debug: Forzando apertura de puerta');
    openGate();
};

window.debugSimulateKey = (isCorrect) => {
    console.log('Debug: Simulando llave', isCorrect ? 'correcta' : 'incorrecta');
    simulateKeyDetection(isCorrect);
};
