// ================================
// CONFIGURACIÓN DEL SISTEMA
// ================================
const APP_CONFIG = {
    name: 'PasoReal Pro',
    version: '2.0.0',
    features: {
        ai: true,
        fitness: true,
        social: true,
        vr: true,
        offline: true
    },
    api: {
        baseUrl: 'https://api.pasoreal.pro',
        endpoints: {
            routes: '/routes',
            users: '/users',
            stats: '/stats',
            ai: '/ai/analyze'
        }
    },
    storage: {
        user: 'pasoreal_user_v2',
        settings: 'pasoreal_settings_v2',
        routes: 'pasoreal_routes_v2'
    }
};

// ================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ================================
class AppState {
    constructor() {
        this.user = null;
        this.settings = {};
        this.routes = [];
        this.currentRoute = null;
        this.stats = {
            totalSteps: 0,
            totalDistance: 0,
            totalCalories: 0,
            currentStreak: 0,
            level: 1,
            xp: 0
        };
        this.notifications = [];
        this.isOnline = navigator.onLine;
        this.isLoading = true;
        this.currentScreen = 'login';
        
        // Sistema de eventos
        this.events = new EventTarget();
    }
    
    setUser(user) {
        this.user = user;
        this.saveToStorage();
        this.events.dispatchEvent(new CustomEvent('user:updated', { detail: user }));
    }
    
    updateStats(stats) {
        this.stats = { ...this.stats, ...stats };
        this.saveToStorage();
        this.events.dispatchEvent(new CustomEvent('stats:updated', { detail: this.stats }));
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        if (this.notifications.length > 50) this.notifications.pop();
        this.saveToStorage();
        this.events.dispatchEvent(new CustomEvent('notification:added', { detail: notification }));
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(APP_CONFIG.storage.user, JSON.stringify({
                user: this.user,
                settings: this.settings,
                stats: this.stats,
                notifications: this.notifications
            }));
        } catch (e) {
            console.error('Error saving to storage:', e);
        }
    }
    
    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem(APP_CONFIG.storage.user));
            if (data) {
                this.user = data.user || null;
                this.settings = data.settings || {};
                this.stats = data.stats || this.stats;
                this.notifications = data.notifications || [];
            }
        } catch (e) {
            console.error('Error loading from storage:', e);
        }
    }
    
    clear() {
        this.user = null;
        this.settings = {};
        this.stats = {
            totalSteps: 0,
            totalDistance: 0,
            totalCalories: 0,
            currentStreak: 0,
            level: 1,
            xp: 0
        };
        this.notifications = [];
        localStorage.removeItem(APP_CONFIG.storage.user);
    }
}

// ================================
// SISTEMA DE RUTAS 360°
// ================================
class RouteManager {
    constructor() {
        this.routes = new Map();
        this.categories = {
            popular: [],
            recommended: [],
            nature: [],
            urban: [],
            historical: [],
            challenging: []
        };
        this.loadRoutes();
    }
    
    async loadRoutes() {
        try {
            // Cargar rutas precargadas
            this.preloadRoutes();
            
            // Intentar cargar rutas desde API
            if (navigator.onLine) {
                const response = await fetch(`${APP_CONFIG.api.baseUrl}${APP_CONFIG.api.endpoints.routes}`);
                if (response.ok) {
                    const data = await response.json();
                    this.processRoutes(data);
                }
            }
        } catch (error) {
            console.warn('Could not load routes from API, using cached routes');
        }
    }
    
    preloadRoutes() {
        // Rutas de ejemplo con metadata enriquecida
        const sampleRoutes = [
            {
                id: 'malecon-la-paz',
                name: 'Malecón de La Paz',
                location: 'La Paz, Baja California Sur',
                description: 'Un recorrido panorámico junto al Mar de Cortés',
                difficulty: 'Fácil',
                duration: 45,
                distance: 3.2,
                elevation: 12,
                calories: 180,
                pointsOfInterest: 8,
                videoUrl: 'https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/8aa913ae75d3814cce9a27bd280d2c4a/manifest/video.m3u8',
                thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop',
                coordinates: {
                    start: [24.15555, -110.3224],
                    end: [24.1679, -110.3091]
                },
                tags: ['playa', 'ciudad', 'fácil', 'familiar'],
                weather: 'soleado',
                bestTime: 'mañana',
                aiFeatures: {
                    guidedTour: true,
                    fitnessTips: true,
                    historicalFacts: true
                },
                achievements: [
                    {
                        id: 'first-malecon',
                        title: 'Explorador del Malecón',
                        description: 'Completa tu primer recorrido en el Malecón',
                        xp: 100
                    }
                ]
            },
            // Agregar más rutas aquí...
        ];
        
        this.processRoutes(sampleRoutes);
    }
    
    processRoutes(routes) {
        routes.forEach(route => {
            this.routes.set(route.id, route);
            
            // Categorizar rutas
            if (route.tags.includes('popular')) this.categories.popular.push(route.id);
            if (route.tags.includes('nature')) this.categories.nature.push(route.id);
            if (route.tags.includes('urban')) this.categories.urban.push(route.id);
            if (route.tags.includes('historical')) this.categories.historical.push(route.id);
            if (route.difficulty === 'Difícil') this.categories.challenging.push(route.id);
        });
        
        // Generar recomendaciones
        this.generateRecommendations();
    }
    
    generateRecommendations() {
        // Lógica simple de recomendación
        this.categories.recommended = [
            ...this.categories.popular.slice(0, 2),
            ...this.categories.nature.slice(0, 1),
            ...this.categories.urban.slice(0, 1)
        ];
    }
    
    getRoute(id) {
        return this.routes.get(id);
    }
    
    getRoutesByCategory(category, limit = 10) {
        const routeIds = this.categories[category] || [];
        return routeIds.slice(0, limit).map(id => this.getRoute(id));
    }
    
    searchRoutes(query) {
        const results = [];
        for (const [id, route] of this.routes) {
            if (
                route.name.toLowerCase().includes(query.toLowerCase()) ||
                route.location.toLowerCase().includes(query.toLowerCase()) ||
                route.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            ) {
                results.push(route);
            }
        }
        return results;
    }
}

// ================================
// SISTEMA DE FITNESS
// ================================
class FitnessTracker {
    constructor() {
        this.steps = 0;
        this.distance = 0;
        this.calories = 0;
        this.activeTime = 0;
        this.startTime = null;
        this.isActive = false;
        this.goals = {
            dailySteps: 10000,
            dailyDistance: 8,
            dailyCalories: 500,
            weeklyActiveDays: 5
        };
        
        // Configurar sensor de pasos si está disponible
        if ('accelerometer' in window) {
            this.setupMotionTracking();
        }
    }
    
    setupMotionTracking() {
        try {
            this.accelerometer = new Accelerometer({ frequency: 60 });
            this.accelerometer.addEventListener('reading', () => {
                this.detectStep();
            });
            this.accelerometer.start();
        } catch (error) {
            console.warn('Accelerometer not available:', error);
        }
    }
    
    detectStep() {
        // Algoritmo simple de detección de pasos
        const acceleration = Math.sqrt(
            Math.pow(this.accelerometer.x, 2) +
            Math.pow(this.accelerometer.y, 2) +
            Math.pow(this.accelerometer.z, 2)
        );
        
        // Lógica de detección de pasos mejorada
        const threshold = 11.5;
        if (acceleration > threshold && this.isActive) {
            this.addStep();
        }
    }
    
    addStep() {
        this.steps++;
        this.distance = this.steps * 0.00075; // 0.75m por paso
        this.calories = this.steps * 0.04; // 0.04 calorías por paso
        
        // Actualizar UI
        this.updateDisplay();
        
        // Disparar evento
        appState.events.dispatchEvent(new CustomEvent('fitness:step', {
            detail: { steps: this.steps, distance: this.distance, calories: this.calories }
        }));
        
        // Verificar logros
        this.checkAchievements();
    }
    
    startSession() {
        this.isActive = true;
        this.startTime = Date.now();
        
        appState.events.dispatchEvent(new CustomEvent('fitness:session-start'));
    }
    
    pauseSession() {
        this.isActive = false;
        if (this.startTime) {
            this.activeTime += Date.now() - this.startTime;
            this.startTime = null;
        }
        
        appState.events.dispatchEvent(new CustomEvent('fitness:session-pause'));
    }
    
    endSession() {
        this.pauseSession();
        
        // Guardar sesión
        this.saveSession();
        
        appState.events.dispatchEvent(new CustomEvent('fitness:session-end', {
            detail: {
                steps: this.steps,
                distance: this.distance,
                calories: this.calories,
                activeTime: this.activeTime
            }
        }));
        
        // Resetear para próxima sesión
        this.resetSession();
    }
    
    resetSession() {
        this.steps = 0;
        this.distance = 0;
        this.calories = 0;
        this.activeTime = 0;
        this.startTime = null;
        this.isActive = false;
    }
    
    saveSession() {
        const session = {
            date: new Date().toISOString(),
            steps: this.steps,
            distance: this.distance,
            calories: this.calories,
            activeTime: this.activeTime
        };
        
        // Guardar en estado de la app
        appState.updateStats({
            totalSteps: appState.stats.totalSteps + this.steps,
            totalDistance: appState.stats.totalDistance + this.distance,
            totalCalories: appState.stats.totalCalories + this.calories
        });
        
        // Guardar en localStorage
        try {
            const sessions = JSON.parse(localStorage.getItem('fitness_sessions') || '[]');
            sessions.push(session);
            localStorage.setItem('fitness_sessions', JSON.stringify(sessions));
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }
    
    checkAchievements() {
        const achievements = [];
        
        // Logro: Primeros 1000 pasos
        if (this.steps >= 1000 && this.steps - 1 < 1000) {
            achievements.push({
                id: 'first-1000-steps',
                title: 'Primeros 1000 Pasos',
                description: '¡Completaste tus primeros 1000 pasos en una sesión!',
                xp: 50
            });
        }
        
        // Logro: 5km recorridos
        if (this.distance >= 5 && this.distance - 0.00075 < 5) {
            achievements.push({
                id: '5k-distance',
                title: 'Explorador de 5K',
                description: 'Recorriste 5 kilómetros en una sesión',
                xp: 100
            });
        }
        
        // Agregar logros al estado de la app
        achievements.forEach(achievement => {
            appState.addNotification({
                type: 'achievement',
                title: '🎉 ¡Logro Desbloqueado!',
                message: achievement.title,
                time: new Date().toLocaleTimeString(),
                read: false,
                data: achievement
            });
            
            appState.updateStats({
                xp: appState.stats.xp + achievement.xp
            });
        });
    }
    
    updateDisplay() {
        // Actualizar elementos del DOM
        const elements = {
            steps: document.getElementById('stepsToday'),
            distance: document.getElementById('distanceToday'),
            calories: document.getElementById('caloriesToday'),
            activeTime: document.getElementById('activeTime')
        };
        
        if (elements.steps) {
            elements.steps.textContent = this.steps.toLocaleString();
        }
        
        if (elements.distance) {
            elements.distance.textContent = this.distance.toFixed(1);
        }
        
        if (elements.calories) {
            elements.calories.textContent = Math.round(this.calories);
        }
        
        if (elements.activeTime) {
            const minutes = Math.floor(this.activeTime / 60000);
            elements.activeTime.textContent = minutes;
        }
    }
}

// ================================
// SISTEMA DE IA
// ================================
class AISystem {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        this.insights = [];
        this.coachPersonality = 'motivational';
        this.initialize();
    }
    
    async initialize() {
        try {
            // Cargar modelo de TensorFlow.js
            await this.loadModel();
            this.isInitialized = true;
            console.log('AI System initialized');
        } catch (error) {
            console.error('Failed to initialize AI system:', error);
            this.isInitialized = false;
        }
    }
    
    async loadModel() {
        // Cargar modelo de detección de poses
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableTracking: true,
            trackerType: poseDetection.TrackerType.Box
        };
        
        this.model = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig
        );
    }
    
    async analyzePose(image) {
        if (!this.isInitialized || !this.model) return null;
        
        try {
            const poses = await this.model.estimatePoses(image);
            return poses[0] || null;
        } catch (error) {
            console.error('Error analyzing pose:', error);
            return null;
        }
    }
    
    async getWorkoutRecommendations(userData) {
        // Analizar datos del usuario y recomendar rutina
        const recommendations = [];
        
        if (userData.steps < 5000) {
            recommendations.push({
                type: 'beginner',
                message: 'Te recomendamos rutas cortas para comenzar',
                routes: ['malecon-la-paz', 'centro-historico']
            });
        }
        
        if (userData.daysActive < 3) {
            recommendations.push({
                type: 'consistency',
                message: '¡Mantén la consistencia! Intenta caminar 3 días esta semana',
                challenge: 'weekly-consistency'
            });
        }
        
        return recommendations;
    }
    
    async generatePersonalizedRoute(userPreferences) {
        // Generar ruta personalizada basada en preferencias
        const baseRoute = await this.findOptimalRoute(userPreferences);
        
        // Mejorar la ruta con IA
        const enhancedRoute = {
            ...baseRoute,
            aiEnhancements: {
                pacing: this.calculateOptimalPacing(userPreferences.fitnessLevel),
                restPoints: this.identifyRestPoints(baseRoute),
                photoOpportunities: this.findPhotoOpportunities(baseRoute),
                difficultyAdjustment: this.adjustDifficulty(baseRoute, userPreferences)
            }
        };
        
        return enhancedRoute;
    }
    
    calculateOptimalPacing(fitnessLevel) {
        const paces = {
            beginner: 4, // km/h
            intermediate: 5,
            advanced: 6,
            athlete: 7
        };
        
        return paces[fitnessLevel] || 5;
    }
    
    async getRealTimeFeedback(poseData) {
        if (!poseData) return null;
        
        const feedback = [];
        
        // Analizar postura
        const postureScore = this.analyzePosture(poseData);
        if (postureScore < 0.7) {
            feedback.push({
                type: 'posture',
                message: 'Mantén la espalda recta y los hombros relajados',
                severity: 'warning'
            });
        }
        
        // Analizar movimiento
        const movementEfficiency = this.analyzeMovement(poseData);
        if (movementEfficiency < 0.6) {
            feedback.push({
                type: 'efficiency',
                message: 'Puedes mejorar tu eficiencia de movimiento',
                suggestion: 'Intenta mantener un ritmo constante'
            });
        }
        
        return feedback;
    }
    
    analyzePosture(poseData) {
        // Análisis simple de postura
        const keypoints = poseData.keypoints;
        const spineAngle = this.calculateAngle(
            keypoints[5], // hombro izquierdo
            keypoints[6], // hombro derecho
            keypoints[11] // cadera izquierda
        );
        
        return Math.min(1, Math.abs(spineAngle - 180) / 30);
    }
    
    calculateAngle(a, b, c) {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };
        
        const dotProduct = ab.x * bc.x + ab.y * bc.y;
        const magnitudeAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
        const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
        
        const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
        return angle * (180 / Math.PI);
    }
    
    async chatWithCoach(message, context) {
        // Sistema de chat con el coach IA
        const responses = {
            greeting: [
                "¡Hola! Soy tu coach de fitness virtual. ¿En qué puedo ayudarte hoy?",
                "¡Buen día! Listo para ayudarte en tu entrenamiento.",
                "¡Hola! Veo que estás progresando bien. ¿Qué necesitas?"
            ],
            motivation: [
                "¡Tú puedes! Cada paso te acerca a tu meta.",
                "Recuerda por qué empezaste. ¡Sigue adelante!",
                "El progreso no siempre es lineal, pero cada esfuerzo cuenta."
            ],
            tips: [
                "Mantén una postura recta para evitar lesiones.",
                "Respira profundamente durante el ejercicio.",
                "Hidrátate regularmente durante tu entrenamiento."
            ]
        };
        
        // Determinar tipo de mensaje
        const messageLower = message.toLowerCase();
        let responseType = 'general';
        
        if (messageLower.includes('hola') || messageLower.includes('buenos')) {
            responseType = 'greeting';
        } else if (messageLower.includes('motivación') || messageLower.includes('ánimo')) {
            responseType = 'motivation';
        } else if (messageLower.includes('consejo') || messageLower.includes('tip')) {
            responseType = 'tips';
        }
        
        // Seleccionar respuesta aleatoria
        const possibleResponses = responses[responseType] || responses.general;
        const response = possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
        
        // Agregar personalización basada en contexto
        const personalizedResponse = await this.personalizeResponse(response, context);
        
        return {
            message: personalizedResponse,
            type: 'ai',
            timestamp: new Date().toISOString()
        };
    }
    
    async personalizeResponse(response, context) {
        // Personalizar respuesta basada en el contexto del usuario
        if (!context || !context.user) return response;
        
        const user = context.user;
        let personalized = response;
        
        if (user.name) {
            personalized = personalized.replace('¡Hola!', `¡Hola ${user.name}!`);
        }
        
        if (context.recentActivity) {
            if (context.recentActivity.steps > 8000) {
                personalized += " ¡Excelente trabajo hoy! Has superado tu meta diaria.";
            } else if (context.recentActivity.steps < 3000) {
                personalized += " Recuerda que cada pequeño paso cuenta. ¡Sigue así!";
            }
        }
        
        return personalized;
    }
}

// ================================
// SISTEMA DE REALIDAD VIRTUAL
// ================================
class VRSystem {
    constructor() {
        this.isVRMode = false;
        this.isFullscreen = false;
        this.videoPlayer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.currentRoute = null;
        
        this.stats = {
            playbackSpeed: 1.0,
            currentTime: 0,
            duration: 0,
            orientation: { alpha: 0, beta: 0, gamma: 0 }
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Escuchar eventos de orientación
        if (typeof DeviceOrientationEvent !== 'undefined') {
            window.addEventListener('deviceorientation', (event) => {
                this.stats.orientation = {
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma
                };
                
                if (this.controls) {
                    this.updateCameraOrientation();
                }
            });
        }
        
        // Escuchar cambios de tamaño
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Escuchar teclas para controles
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
    }
    
    async loadRoute(routeId) {
        const route = routeManager.getRoute(routeId);
        if (!route) {
            throw new Error(`Route ${routeId} not found`);
        }
        
        this.currentRoute = route;
        
        // Inicializar A-Frame
        await this.initializeAFrame();
        
        // Cargar video 360°
        await this.load360Video(route.videoUrl);
        
        return true;
    }
    
    async initializeAFrame() {
        return new Promise((resolve) => {
            // Esperar a que A-Frame esté listo
            if (document.querySelector('a-scene')) {
                this.scene = document.querySelector('a-scene');
                this.camera = document.querySelector('a-camera');
                this.controls = this.camera.components['look-controls'];
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    this.scene = document.querySelector('a-scene');
                    this.camera = document.querySelector('a-camera');
                    this.controls = this.camera.components['look-controls'];
                    resolve();
                });
            }
        });
    }
    
    async load360Video(videoUrl) {
        const video = document.getElementById('vr-video');
        if (!video) return;
        
        // Configurar video
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = true; // iOS requiere mute automático
        
        // Esperar a que el video esté listo
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                this.stats.duration = video.duration;
                resolve();
            };
            video.onerror = reject;
        });
        
        // Conectar con A-Frame
        const videoSphere = document.querySelector('a-videosphere');
        if (videoSphere) {
            videoSphere.setAttribute('src', `#${video.id}`);
        }
    }
    
    updateCameraOrientation() {
        if (!this.camera || !this.controls) return;
        
        const { alpha, beta, gamma } = this.stats.orientation;
        
        // Suavizar movimiento
        const smoothFactor = 0.1;
        const currentRotation = this.camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        
        const newRotation = {
            x: currentRotation.x * (1 - smoothFactor) + (beta || 0) * smoothFactor,
            y: currentRotation.y * (1 - smoothFactor) + (alpha || 0) * smoothFactor,
            z: currentRotation.z * (1 - smoothFactor) + (gamma || 0) * smoothFactor
        };
        
        this.camera.setAttribute('rotation', newRotation);
    }
    
    play() {
        const video = document.getElementById('vr-video');
        if (video) {
            video.play();
            video.playbackRate = this.stats.playbackSpeed;
        }
    }
    
    pause() {
        const video = document.getElementById('vr-video');
        if (video) {
            video.pause();
        }
    }
    
    setPlaybackSpeed(speed) {
        this.stats.playbackSpeed = speed;
        const video = document.getElementById('vr-video');
        if (video) {
            video.playbackRate = speed;
        }
    }
    
    toggleVRMode() {
        this.isVRMode = !this.isVRMode;
        
        if (this.isVRMode) {
            this.enterVR();
        } else {
            this.exitVR();
        }
    }
    
    enterVR() {
        // Solicitar permisos de orientación
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        this.enableVRControls();
                    }
                })
                .catch(console.error);
        } else {
            this.enableVRControls();
        }
    }
    
    enableVRControls() {
        if (this.controls) {
            this.controls.pointerLockEnabled = true;
        }
        
        // Entrar a pantalla completa
        this.enterFullscreen();
    }
    
    exitVR() {
        if (this.controls) {
            this.controls.pointerLockEnabled = false;
        }
        
        // Salir de pantalla completa
        this.exitFullscreen();
    }
    
    enterFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { // Firefox
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { // Chrome, Safari y Opera
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE/Edge
            element.msRequestFullscreen();
        }
        
        this.isFullscreen = true;
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari y Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
        
        this.isFullscreen = false;
    }
    
    onWindowResize() {
        if (this.scene && this.scene.renderer) {
            this.scene.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    onKeyDown(event) {
        // Controles de teclado para debug
        switch(event.key) {
            case ' ':
                event.preventDefault();
                this.play();
                break;
            case 'Escape':
                this.exitVR();
                break;
            case '+':
            case '=':
                this.setPlaybackSpeed(Math.min(3, this.stats.playbackSpeed + 0.1));
                break;
            case '-':
                this.setPlaybackSpeed(Math.max(0.1, this.stats.playbackSpeed - 0.1));
                break;
        }
    }
    
    addPointOfInterest(position, title, description) {
        // Agregar punto de interés en la escena
        const entity = document.createElement('a-entity');
        entity.setAttribute('geometry', 'primitive: sphere; radius: 0.5');
        entity.setAttribute('material', 'color: #0ea5e9; transparent: true; opacity: 0.7');
        entity.setAttribute('position', position);
        entity.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; dur: 1000; dir: alternate; loop: true');
        
        // Tooltip
        const text = document.createElement('a-text');
        text.setAttribute('value', title);
        text.setAttribute('position', '0 1.5 0');
        text.setAttribute('align', 'center');
        entity.appendChild(text);
        
        this.scene.appendChild(entity);
        return entity;
    }
}

// ================================
// INTERFAZ DE USUARIO
// ================================
class UIManager {
    constructor() {
        this.currentScreen = 'login';
        this.previousScreen = null;
        this.modalStack = [];
        this.notificationTimeout = null;
        this.initUI();
    }
    
    initUI() {
        this.setupScreenTransitions();
        this.setupEventListeners();
        this.setupAnimations();
        this.loadUserPreferences();
    }
    
    setupScreenTransitions() {
        // Configurar transiciones entre pantallas
        const screens = document.querySelectorAll('.screen, .screen-section');
        screens.forEach(screen => {
            screen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }
    
    setupEventListeners() {
        // Navegación
        document.addEventListener('click', (e) => {
            const screenLink = e.target.closest('[data-screen]');
            if (screenLink) {
                e.preventDefault();
                const screenId = screenLink.dataset.screen;
                this.navigateTo(screenId);
            }
        });
        
        // Botones de retroceso
        document.addEventListener('click', (e) => {
            const backBtn = e.target.closest('[data-back]');
            if (backBtn) {
                e.preventDefault();
                this.navigateBack();
            }
        });
        
        // Cerrar modales
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || 
                e.target.classList.contains('close-modal') ||
                e.target.closest('.close-modal')) {
                this.closeModal();
            }
        });
        
        // Notificaciones
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-btn')) {
                this.toggleNotifications();
            }
        });
    }
    
    setupAnimations() {
        // Configurar animaciones de entrada
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observar elementos animables
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
    
    navigateTo(screenId, params = {}) {
        // Guardar pantalla anterior
        this.previousScreen = this.currentScreen;
        this.currentScreen = screenId;
        
        // Ocultar pantalla actual
        const currentActive = document.querySelector('.screen.active, .screen-section.active');
        if (currentActive) {
            currentActive.classList.remove('active');
            currentActive.classList.add('exiting');
            
            setTimeout(() => {
                currentActive.classList.remove('exiting');
            }, 300);
        }
        
        // Mostrar nueva pantalla
        const targetScreen = document.getElementById(`${screenId}Screen`) || 
                             document.getElementById(screenId);
        
        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.classList.add('entering');
            
            setTimeout(() => {
                targetScreen.classList.remove('entering');
            }, 300);
            
            // Ejecutar callbacks específicos de la pantalla
            this.onScreenEnter(screenId, params);
        }
        
        // Actualizar URL (para PWA)
        if (history.pushState) {
            history.pushState({ screen: screenId }, '', `#${screenId}`);
        }
        
        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('screen:change', {
            detail: { from: this.previousScreen, to: screenId, params }
        }));
    }
    
    navigateBack() {
        if (this.previousScreen) {
            this.navigateTo(this.previousScreen);
        } else {
            this.navigateTo('home');
        }
    }
    
    onScreenEnter(screenId, params) {
        switch(screenId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'explore':
                this.loadExploreScreen();
                break;
            case 'vr':
                this.loadVRScreen(params);
                break;
            case 'aiCoach':
                this.openAICoach();
                break;
        }
    }
    
    loadDashboard() {
        // Cargar datos del dashboard
        this.updateUserGreeting();
        this.updateStatsDisplay();
        this.loadRecommendedRoutes();
        this.loadRecentAchievements();
        this.updateWeather();
        
        // Iniciar actualizaciones en tiempo real
        this.startRealTimeUpdates();
    }
    
    updateUserGreeting() {
        const greeting = document.getElementById('userGreeting');
        const motivation = document.getElementById('userMotivation');
        
        if (!greeting || !motivation) return;
        
        const hour = new Date().getHours();
        let timeGreeting = '';
        
        if (hour < 12) timeGreeting = 'Buenos días';
        else if (hour < 19) timeGreeting = 'Buenas tardes';
        else timeGreeting = 'Buenas noches';
        
        if (appState.user && appState.user.name) {
            greeting.textContent = `${timeGreeting}, ${appState.user.name.split(' ')[0]}!`;
        } else {
            greeting.textContent = `${timeGreeting}, Explorador!`;
        }
        
        // Motivaciones aleatorias
        const motivations = [
            'El mundo te espera',
            'Cada paso es un progreso',
            'Hoy es un gran día para explorar',
            'Tu salud es tu riqueza',
            'Aventura te llama'
        ];
        
        motivation.textContent = motivations[Math.floor(Math.random() * motivations.length)];
    }
    
    updateStatsDisplay() {
        // Actualizar estadísticas en el dashboard
        const elements = {
            stepsToday: document.getElementById('stepsToday'),
            distanceToday: document.getElementById('distanceToday'),
            caloriesToday: document.getElementById('caloriesToday'),
            currentStreak: document.getElementById('currentStreak'),
            xpPoints: document.getElementById('xpPoints')
        };
        
        Object.keys(elements).forEach(key => {
            if (elements[key] && appState.stats[key]) {
                elements[key].textContent = appState.stats[key].toLocaleString();
            }
        });
    }
    
    async loadRecommendedRoutes() {
        const container = document.getElementById('recommendedRoutes');
        if (!container) return;
        
        const routes = routeManager.getRoutesByCategory('recommended', 5);
        
        container.innerHTML = routes.map(route => `
            <div class="route-card" data-route="${route.id}">
                <div class="route-image" style="background-image: url('${route.thumbnail}')">
                    <div class="route-difficulty">${route.difficulty}</div>
                </div>
                <div class="route-info">
                    <div class="route-header">
                        <div>
                            <h3 class="route-title">${route.name}</h3>
                            <p class="route-location">${route.location}</p>
                        </div>
                    </div>
                    <div class="route-meta">
                        <span><i class="fas fa-clock"></i> ${route.duration} min</span>
                        <span><i class="fas fa-road"></i> ${route.distance} km</span>
                        <span><i class="fas fa-mountain"></i> ${route.elevation} m</span>
                    </div>
                    <div class="route-stats">
                        <div class="route-stat">
                            <span class="route-stat-value">${route.calories}</span>
                            <span class="route-stat-label">Calorías</span>
                        </div>
                        <div class="route-stat">
                            <span class="route-stat-value">${route.pointsOfInterest}</span>
                            <span class="route-stat-label">Puntos de interés</span>
                        </div>
                    </div>
                    <button class="route-action" onclick="startRoute('${route.id}')">
                        <i class="fas fa-play"></i> Comenzar Ruta
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    loadRecentAchievements() {
        const container = document.getElementById('recentAchievements');
        if (!container) return;
        
        // Logros de ejemplo
        const achievements = [
            {
                id: 'first-steps',
                title: 'Primeros Pasos',
                description: 'Completaste tu primera ruta',
                icon: 'fa-shoe-prints',
                unlocked: true
            },
            {
                id: 'week-warrior',
                title: 'Guerrero de la Semana',
                description: '5 días consecutivos activo',
                icon: 'fa-calendar-check',
                unlocked: true
            },
            {
                id: 'distance-master',
                title: 'Maestro de la Distancia',
                description: 'Recorriste 50km total',
                icon: 'fa-route',
                unlocked: false,
                progress: 65
            },
            {
                id: 'early-bird',
                title: 'Madrugador',
                description: '3 rutas antes de las 8 AM',
                icon: 'fa-sun',
                unlocked: false,
                progress: 33
            }
        ];
        
        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-card ${achievement.unlocked ? '' : 'locked'}">
                <div class="achievement-icon">
                    <i class="fas ${achievement.icon}"></i>
                </div>
                <h4 class="achievement-title">${achievement.title}</h4>
                <p class="achievement-desc">${achievement.description}</p>
                ${!achievement.unlocked && achievement.progress ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-fill" 
                             style="width: ${achievement.progress}%"></div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    async updateWeather() {
        const weatherCard = document.getElementById('weatherCard');
        if (!weatherCard) return;
        
        try {
            // Usar API de OpenWeatherMap o similar
            const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Mexico City&units=metric&lang=es&appid=YOUR_API_KEY');
            if (response.ok) {
                const data = await response.json();
                
                const temp = Math.round(data.main.temp);
                const description = data.weather[0].description;
                const icon = this.getWeatherIcon(data.weather[0].icon);
                
                weatherCard.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <div>
                        <span class="weather-temp">${temp}°C</span>
                        <span class="weather-location">${description}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.warn('Could not fetch weather:', error);
            // Usar datos por defecto
            weatherCard.innerHTML = `
                <i class="fas fa-sun"></i>
                <div>
                    <span class="weather-temp">25°C</span>
                    <span class="weather-location">Soleado</span>
                </div>
            `;
        }
    }
    
    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fa-sun',
            '01n': 'fa-moon',
            '02d': 'fa-cloud-sun',
            '02n': 'fa-cloud-moon',
            '03d': 'fa-cloud',
            '03n': 'fa-cloud',
            '04d': 'fa-cloud',
            '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain',
            '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-sun-rain',
            '10n': 'fa-cloud-moon-rain',
            '11d': 'fa-bolt',
            '11n': 'fa-bolt',
            '13d': 'fa-snowflake',
            '13n': 'fa-snowflake',
            '50d': 'fa-smog',
            '50n': 'fa-smog'
        };
        
        return iconMap[iconCode] || 'fa-cloud';
    }
    
    startRealTimeUpdates() {
        // Actualizar estadísticas cada 10 segundos
        setInterval(() => {
            this.updateStatsDisplay();
        }, 10000);
        
        // Actualizar saludo cada hora
        setInterval(() => {
            this.updateUserGreeting();
        }, 3600000);
        
        // Actualizar clima cada 30 minutos
        setInterval(() => {
            this.updateWeather();
        }, 1800000);
    }
    
    showNotification(title, message, type = 'info', duration = 5000) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${title}</strong>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        // Agregar al DOM
        const container = document.getElementById('notificationContainer') || 
                         this.createNotificationContainer();
        container.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Configurar cierre
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // Cerrar automáticamente
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(container);
        return container;
    }
    
    hideNotification(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    openModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.add('active');
        this.modalStack.push(modalId);
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        if (this.modalStack.length === 0) return;
        
        const modalId = this.modalStack.pop();
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Restaurar scroll del body
        if (this.modalStack.length === 0) {
            document.body.style.overflow = '';
        }
    }
    
    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('active');
    }
    
    showLoading(message = 'Cargando...') {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.classList.add('active');
            const text = loading.querySelector('#loadingText');
            if (text) {
                text.textContent = message;
            }
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.classList.remove('active');
        }
    }
    
    loadUserPreferences() {
        // Cargar tema
        const theme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Cargar preferencias de notificaciones
        const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        if (!notificationsEnabled) {
            // Deshabilitar notificaciones push
        }
    }
}

// ================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ================================
let appState;
let routeManager;
let fitnessTracker;
let aiSystem;
let vrSystem;
let uiManager;

async function initializeApp() {
    try {
        // Mostrar pantalla de carga
        uiManager?.showLoading('Inicializando sistema...');
        
        // Inicializar componentes
        appState = new AppState();
        appState.loadFromStorage();
        
        routeManager = new RouteManager();
        fitnessTracker = new FitnessTracker();
        aiSystem = new AISystem();
        vrSystem = new VRSystem();
        uiManager = new UIManager();
        
        // Configurar eventos globales
        setupGlobalEvents();
        
        // Verificar autenticación
        if (appState.user) {
            await handleAutoLogin();
        } else {
            showLoginScreen();
        }
        
        // Inicializar Service Worker
        initializeServiceWorker();
        
        // Configurar analíticas
        setupAnalytics();
        
        // Configurar actualizaciones en segundo plano
        setupBackgroundUpdates();
        
        console.log('PasoReal Pro initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showErrorScreen(error);
    } finally {
        uiManager?.hideLoading();
    }
}

function setupGlobalEvents() {
    // Estado de red
    window.addEventListener('online', () => {
        appState.isOnline = true;
        uiManager.showNotification('Conectado', 'Estás en línea', 'success');
    });
    
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        uiManager.showNotification('Sin conexión', 'Modo offline activado', 'warning');
    });
    
    // Gestión de memoria
    window.addEventListener('load', () => {
        // Limpiar caché viejo
        clearOldCache();
    });
    
    window.addEventListener('beforeunload', () => {
        // Guardar estado antes de salir
        appState.saveToStorage();
    });
}

async function handleAutoLogin() {
    try {
        // Verificar token de sesión
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('No token found');
        }
        
        // Validar token con servidor
        const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        // Cargar datos del usuario
        const userData = await response.json();
        appState.setUser(userData);
        
        // Mostrar dashboard
        uiManager.navigateTo('dashboard');
        
    } catch (error) {
        console.warn('Auto-login failed:', error);
        appState.clear();
        showLoginScreen();
    }
}

function showLoginScreen() {
    uiManager.navigateTo('login');
}

function showErrorScreen(error) {
    // Mostrar pantalla de error
    const errorScreen = document.createElement('div');
    errorScreen.className = 'error-screen';
    errorScreen.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Algo salió mal</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()" class="btn-primary">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `;
    
    document.body.innerHTML = '';
    document.body.appendChild(errorScreen);
}

async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('ServiceWorker registered:', registration);
            
            // Verificar actualizaciones
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nueva actualización disponible
                        showUpdateNotification();
                    }
                });
            });
            
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
}

function showUpdateNotification() {
    if (Notification.permission === 'granted') {
        const notification = new Notification('PasoReal Pro Actualizado', {
            body: 'Hay una nueva versión disponible. Recarga para actualizar.',
            icon: 'icons/icon-192.png',
            tag: 'update'
        });
        
        notification.onclick = () => {
            window.location.reload();
        };
    }
}

function setupAnalytics() {
    // Configurar Google Analytics o similar
    if (typeof gtag !== 'undefined') {
        gtag('config', 'GA_MEASUREMENT_ID', {
            app_name: APP_CONFIG.name,
            app_version: APP_CONFIG.version
        });
    }
}

function setupBackgroundUpdates() {
    // Sincronizar datos en segundo plano
    setInterval(async () => {
        if (appState.isOnline && appState.user) {
            await syncData();
        }
    }, 300000); // Cada 5 minutos
    
    // Actualizar notificaciones push
    if ('PushManager' in window) {
        setupPushNotifications();
    }
}

async function syncData() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        // Sincronizar estadísticas
        const response = await fetch(`${APP_CONFIG.api.baseUrl}/sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stats: appState.stats,
                routes: Array.from(routeManager.routes.values())
            })
        });
        
        if (response.ok) {
            console.log('Data synchronized successfully');
        }
    } catch (error) {
        console.warn('Sync failed:', error);
    }
}

function setupPushNotifications() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            // Suscribir al usuario
            subscribeToPushNotifications();
        }
    });
}

async function subscribeToPushNotifications() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
    });
    
    // Enviar suscripción al servidor
    await fetch(`${APP_CONFIG.api.baseUrl}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
    });
}

function clearOldCache() {
    // Limpiar caché viejo de localStorage
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('pasoreal_cache_')) {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item.timestamp && item.timestamp < oneWeekAgo) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Ignorar errores de parseo
            }
        }
    }
}

// ================================
// FUNCIONES GLOBALES EXPORTADAS
// ================================
window.startRoute = async function(routeId) {
    try {
        uiManager.showLoading('Cargando experiencia 360°...');
        
        // Cargar ruta
        await vrSystem.loadRoute(routeId);
        
        // Iniciar tracker de fitness
        fitnessTracker.startSession();
        
        // Navegar a pantalla VR
        uiManager.navigateTo('vr');
        
        // Reproducir automáticamente
        setTimeout(() => {
            vrSystem.play();
        }, 1000);
        
    } catch (error) {
        console.error('Failed to start route:', error);
        uiManager.showNotification('Error', 'No se pudo cargar la ruta', 'error');
    } finally {
        uiManager.hideLoading();
    }
};

window.openAICoach = function() {
    uiManager.openModal('aiCoachModal');
};

window.toggleVR = function() {
    vrSystem.toggleVRMode();
};

window.endRoute = function() {
    fitnessTracker.endSession();
    uiManager.navigateTo('routeSummary');
};

// ================================
// INICIALIZAR APLICACIÓN
// ================================
document.addEventListener('DOMContentLoaded', initializeApp);

// Manejar tecla ESC para salir de VR
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && vrSystem.isVRMode) {
        vrSystem.toggleVRMode();
    }
});

