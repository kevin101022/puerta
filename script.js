// Variables globales
let stream = null;
let isGameActive = false;
let isPredicting = false;
let correctAttempts = 0;

// Variables para Teachable Machine
let model, webcam, ctx, labelContainer, maxPredictions;
const URL = "https://teachablemachine.withgoogle.com/models/YsCOZ0rkm/";

// Elementos del DOM
const gameContent = document.getElementById('gameContent');
const startButton = document.getElementById('startButton');
const cameraSection = document.getElementById('cameraSection');
const cameraView = document.getElementById('cameraView');
const gateDoors = document.getElementById('gateDoors');
const hallwayReveal = document.getElementById('hallwayReveal');
const statusMessage = document.getElementById('statusMessage');
const instructionsPanel = document.getElementById('instructionsPanel');

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('La Puerta Secreta - Juego cargado');
    setupEventListeners();
    playAmbientSound();
});

// Configurar event listeners
function setupEventListeners() {
    startButton.addEventListener('click', initializeGame);
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
        
        // Mostrar sección de cámara
        cameraSection.classList.add('active');
        
        // Ocultar instrucciones
        instructionsPanel.style.display = 'none';
        
        // Cambiar texto del botón
        startButton.innerHTML = '<span class="btn-icon">👁</span><span class="btn-text">Observando...</span>';
        startButton.disabled = true;
        
        isGameActive = true;
        
        showStatus('Cámara activada. Muestra la llave ante el ojo mágico');
        
        // Inicializar modelo de Teachable Machine
        await initPoseDetection();
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        showStatus('No se pudo acceder a la cámara. Verifica los permisos.');
        playErrorSound();
    }
}

// ============================================
// DETECCIÓN DE POSTURAS CON TEACHABLE MACHINE
// ============================================

async function initPoseDetection() {
    try {
        showStatus('Cargando modelo de detección de posturas...');
        
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Cargar el modelo
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        console.log('✅ Modelo de posturas cargado correctamente');
        console.log('Clases detectables:', maxPredictions);
        
        // Configurar webcam para detección de posturas
        const size = 600;
        const flip = true; // Voltear la cámara
        webcam = new tmPose.Webcam(size, size, flip);
        await webcam.setup();
        await webcam.play();
        
        // Mantener el video visible (sin canvas)
        cameraView.style.display = 'block';
        
        showStatus('¡Modelo listo! Muestra la postura "Clave" para abrir la puerta');
        
        // Iniciar loop de predicción
        window.requestAnimationFrame(poseDetectionLoop);
        
    } catch (error) {
        console.error('❌ Error al cargar el modelo:', error);
        showStatus('Error al cargar el modelo de detección. Verifica la conexión.');
    }
}

async function poseDetectionLoop() {
    if (!isGameActive || !webcam) return;
    
    try {
        webcam.update();
        await predictPose();
    } catch (error) {
        console.error('Error en loop:', error);
    }
    
    window.requestAnimationFrame(poseDetectionLoop);
}

async function predictPose() {
    if (!model || !webcam || isPredicting) return;
    
    try {
        const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
        const prediction = await model.predict(posenetOutput);
        
        // Analizar predicciones (sin dibujar nada)
        for (let i = 0; i < maxPredictions; i++) {
            const className = prediction[i].className;
            const probability = prediction[i].probability.toFixed(2);
            const percentage = (probability * 100).toFixed(0);
            
            // Mostrar en consola para debugging
            if (probability > 0.5) {
                console.log(`${className}: ${percentage}%`);
            }
            
            // Detectar clase "Clave" con confianza >= 90%
            if (className === "Clave" && probability >= 0.90) {
                console.log(`🎉 ¡POSTURA CLAVE DETECTADA! Confianza: ${percentage}%`);
                isPredicting = true;
                onKeyDetected(true);
            }
            // Detectar clase "Incorrecto"
            else if (className === "Incorrecto" && probability >= 0.70) {
                console.log(`❌ Postura incorrecta detectada. Confianza: ${percentage}%`);
                isPredicting = true;
                onKeyDetected(false);
            }
        }
        
    } catch (error) {
        console.error('Error en predicción:', error);
    }
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
        
        // Detener el juego después de abrir la puerta
        setTimeout(() => {
            isPredicting = false;
        }, 2000);
        
    } else {
        // ❌ LLAVE INCORRECTA
        showStatus('Llave incorrecta. La puerta permanece sellada.');
        playErrorSound();
        
        // Permitir otro intento después de 2 segundos
        setTimeout(() => {
            isPredicting = false;
        }, 2000);
    }
}

// ============================================
// INTEGRACIÓN DE TU NUEVO MODELO
// ============================================
// Aquí puedes implementar tu nueva lógica de detección
// Usa onKeyDetected(true) para abrir la puerta cuando detectes la llave correcta
// Usa onKeyDetected(false) para indicar llave incorrecta
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
    
    // Detener webcam de Teachable Machine
    if (webcam) {
        webcam.stop();
        webcam = null;
    }
    
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

// Limpiar recursos al cerrar la página
window.addEventListener('beforeunload', () => {
    if (webcam) {
        webcam.stop();
    }
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
