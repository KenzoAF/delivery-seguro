/**
 * SAFE DELIVERY - CORE ENGINE
 * Um simulador de condução urbana em perspectiva top-down.
 */

// --- CONSTANTES E CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 128,          // Tiles maiores para mais detalhes
    RESOLUTION: { w: 1280, h: 720 },
    CAMERA_SMOOTH: 0.1,      // Fator de suavização da câmera
    
    // FÍSICA DO CARRO
    CAR: {
        MAX_SPEED: 8.0,
        TORQUE: 0.15,        // Aceleração linear
        BRAKE: 0.35,         // Força de frenagem
        FRICTION_AIR: 0.98,  // Arrasto do ar
        G_THRESHOLD: 0.7,    // Velocidade onde o G começa a afetar a carga
        WIDTH: 60,
        HEIGHT: 32,
        // Direção
        TURN_POWER: 0.05,
        UNDERSTEER_MIN: 0.6, // Começa a perder controle a 60% da velocidade
        DRIFT_FACTOR: 0.94   // Perda de aderência lateral
    },
    
    // CLIMA
    WEATHER: {
        SUNNY: { friction: 1.0, visibility: 1.0 },
        RAINY: { friction: 0.7, visibility: 0.8 }
    }
};

// --- IMAGENS / TEXTURAS (Placeholder or Generated) ---
// Utilizando gradientes e desenhos nativos do Canvas para performance e estética fluida

// --- CLASSES DE LÓGICA ---

/**
 * Gerenciador de Entrada (Teclado)
 */
class Input {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
    }
    
    isPressed(code) {
        return !!this.keys[code];
    }
}

/**
 * Sintetizador de Efeitos Sonoros
 */
class SoundSynth {
    constructor() { this.ctx = null; }

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playBump() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }

    playInfraction() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
}

/**
 * Mapa da Cidade baseado em Grid
 */
class CityMap {
    constructor() {
        this.tileSize = CONFIG.TILE_SIZE;
        // 0: Grama, 1: Asfalto, 2: Calçada, 3: Prédio/Muro
        this.grid = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
    }

    draw(ctx) {
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                const tile = this.grid[r][c];
                const tx = c * this.tileSize;
                const ty = r * this.tileSize;

                if (tile === 0) ctx.fillStyle = '#064e3b';
                else if (tile === 1) ctx.fillStyle = '#1e293b';
                else if (tile === 2) ctx.fillStyle = '#64748b';
                else ctx.fillStyle = '#0f172a';

                ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

                if (tile === 1 && r === 2) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([40, 40]);
                    ctx.beginPath();
                    ctx.moveTo(tx, ty + this.tileSize);
                    ctx.lineTo(tx + this.tileSize, ty + this.tileSize);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
    }

    checkCollision(x, y) {
        const c = Math.floor(x / this.tileSize);
        const r = Math.floor(y / this.tileSize);
        if (r < 0 || r >= this.grid.length || c < 0 || c >= this.grid[0].length) return false;
        return this.grid[r][c] === 3;
    }
}

/**
 * Entidade do Veículo do Jogador
 */
class PlayerVehicle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.integrity = 1.0;
        this.infractions = 0;
        
        // Propriedades físicas dinâmicas
        this.width = CONFIG.CAR.WIDTH;
        this.height = CONFIG.CAR.HEIGHT;
        this.drift = 0;
    }

    update(input, weather) {
        const weatherMod = CONFIG.WEATHER[weather] || CONFIG.WEATHER.SUNNY;
        const speedRatio = Math.abs(this.speed) / CONFIG.CAR.MAX_SPEED;

        // 1. Aceleração e Frenagem (Torque Linear)
        if (input.isPressed('KeyW')) { // Controle manual de volta
            // Aceleração progressiva (menos torque em velocidades altas)
            const torque = CONFIG.CAR.TORQUE * (1 - (speedRatio * 0.5));
            this.speed += torque * weatherMod.friction;
        } else if (input.isPressed('KeyS')) {
            this.speed -= CONFIG.CAR.BRAKE * weatherMod.friction;
        } else {
            // Inércia natural
            this.speed *= CONFIG.CAR.FRICTION_AIR;
            if (Math.abs(this.speed) < 0.05) this.speed = 0;
        }

        // Limite de Velocidade
        if (this.speed > CONFIG.CAR.MAX_SPEED) this.speed = CONFIG.CAR.MAX_SPEED;
        if (this.speed < -CONFIG.CAR.MAX_SPEED * 0.4) this.speed = -CONFIG.CAR.MAX_SPEED * 0.4;

        // 2. Direção Baseada em Velocidade (Agilidade vs Subesterço)
        let turnPower = CONFIG.CAR.TURN_POWER;
        
        if (speedRatio < 0.4) {
            // Curvas precisas em baixa velocidade
            turnPower *= 1.2;
        } else if (speedRatio > CONFIG.CAR.UNDERSTEER_MIN) {
            // Subesterço em alta velocidade
            const understeer = 1.0 - (speedRatio - CONFIG.CAR.UNDERSTEER_MIN) * 1.5;
            turnPower *= Math.max(0.3, understeer);
            
            // Drift Lateral se curvar bruscamente
            if (input.isPressed('KeyA') || input.isPressed('KeyD')) {
                this.drift += 0.02 * speedRatio;
            }
        }
        
        this.drift *= 0.9; // Recuperação gradual do drift

        if (input.isPressed('KeyA')) this.angle -= turnPower;
        if (input.isPressed('KeyD')) this.angle += turnPower;

        // Freio de mão (Space)
        if (input.isPressed('Space')) {
            this.speed *= 0.92;
            this.drift += 0.05 * speedRatio;
        }

        // 3. Aplicação do Movimento
        const moveAngle = this.angle + (this.drift * (input.isPressed('KeyA') ? -1 : 1));
        this.velocity.x = Math.cos(moveAngle) * this.speed;
        this.velocity.y = Math.sin(moveAngle) * this.speed;

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // 4. Verificação de Dano por Imprudência (G-Force)
        if (speedRatio > CONFIG.CAR.G_THRESHOLD && (input.isPressed('KeyA') || input.isPressed('KeyD'))) {
            this.applyPackageDamage(0.001 * speedRatio);
        }
    }

    applyPackageDamage(amount) {
        this.integrity -= amount;
        if (this.integrity < 0) this.integrity = 0;
        
        // Feedback Visual
        const flash = document.getElementById('damage-flash');
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 50);
        
        if (this.integrity < 0.3) {
            document.getElementById('integrity-bar').classList.add('integrity-warn');
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Sombra Projetada
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-this.width/2 + 5, -this.height/2 + 5, this.width, this.height, 6);
        ctx.fill();

        // Chassi (Gradiente Premium)
        const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        gradient.addColorStop(0, '#2563eb');
        gradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 6);
        ctx.fill();

        // Vidros
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(-2, -this.height/2 + 4, 15, this.height - 8);

        // Faróis (Luz Emitida)
        ctx.fillStyle = '#fff9e6';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff9e6';
        ctx.fillRect(this.width/2 - 2, -this.height/2 + 2, 4, 6);
        ctx.fillRect(this.width/2 - 2, this.height/2 - 8, 4, 6);
        
        // Lanternas Traseiras (Freio)
        ctx.shadowBlur = (this.speed < 0 || this.drift > 0.05) ? 20 : 0;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-this.width/2 - 1, -this.height/2 + 4, 3, 4);
        ctx.fillRect(-this.width/2 - 1, this.height/2 - 8, 3, 4);

        ctx.restore();
    }
}

/**
 * Semáforo Inteligente
 */
class TrafficLight {
    constructor(x, y, orient = 'V') {
        this.x = x;
        this.y = y;
        this.orient = orient; // 'V'ertical ou 'H'orizontal
        this.state = 'GREEN';
        this.timers = { GREEN: 8000, YELLOW: 3000, RED: 6000 };
        this.lastSwitch = Date.now();
        this.stopLine = { x: x, y: y, w: 120, h: 20 }; // Linha de detecção
    }

    update() {
        const elapsed = Date.now() - this.lastSwitch;
        if (elapsed > this.timers[this.state]) {
            if (this.state === 'GREEN') this.state = 'YELLOW';
            else if (this.state === 'YELLOW') this.state = 'RED';
            else this.state = 'GREEN';
            this.lastSwitch = Date.now();
        }
    }

    checkViolation(player) {
        if (this.state !== 'RED') return false;
        
        // Detecção baseada no centro do carro atravessando a "linha de pare"
        // Simplificado: check se o centro está em uma box específica do semáforo
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 80) {
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Linha de Pare
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-60, -100, 120, 10);

        // Poste
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(40, -40, 20, 80);
        
        // Caixa de luzes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(40, -40, 20, 45);

        // Luzes Individualizadas
        const colors = { GREEN: '#22c55e', YELLOW: '#eab308', RED: '#ef4444', OFF: '#334155' };
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = (this.state === 'RED') ? colors.RED : colors.OFF;
        if (this.state === 'RED') { ctx.shadowBlur = 10; ctx.shadowColor = colors.RED; }
        ctx.beginPath(); ctx.arc(50, -32, 5, 0, Math.PI * 2); ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = (this.state === 'YELLOW') ? colors.YELLOW : colors.OFF;
        if (this.state === 'YELLOW') { ctx.shadowBlur = 10; ctx.shadowColor = colors.YELLOW; }
        ctx.beginPath(); ctx.arc(50, -18, 5, 0, Math.PI * 2); ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = (this.state === 'GREEN') ? colors.GREEN : colors.OFF;
        if (this.state === 'GREEN') { ctx.shadowBlur = 10; ctx.shadowColor = colors.GREEN; }
        ctx.beginPath(); ctx.arc(50, -4, 5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
}

/**
 * Inteligência Artificial (NPCs)
 */
class NPCVehicle {
    constructor(path, speed) {
        this.path = path; // Array de {x, y}
        this.nodeIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.speed = speed;
        this.angle = 0;
        this.width = 56;
        this.height = 30;
        this.color = '#94a3b8';
        this.isStopped = false;
    }

    update(player, lights) {
        const target = this.path[this.nodeIndex];
        const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);
        
        if (distToTarget < 20) {
            this.nodeIndex = (this.nodeIndex + 1) % this.path.length;
        }

        // 1. Orientação
        const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        this.angle = targetAngle;

        // 2. Detecção de Obstáculos (Raycasting Simples)
        this.isStopped = false;
        
        // Parar se semáforo à frente estiver vermelho
        lights.forEach(l => {
            const distToLight = Math.hypot(l.x - this.x, l.y - this.y);
            if (distToLight < 150 && l.state === 'RED' && Math.abs(this.angle - Math.atan2(l.y - this.y, l.x - this.x)) < 0.5) {
                this.isStopped = true;
            }
        });

        // Parar se o jogador estiver muito perto à frente
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (distToPlayer < 100 && Math.abs(this.angle - Math.atan2(player.y - this.y, player.x - this.x)) < 0.5) {
            this.isStopped = true;
        }

        if (!this.isStopped) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 4);
        ctx.fill();
        
        if (this.isStopped) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
            ctx.fillRect(-this.width/2, -this.height/2 + 4, 2, 4);
            ctx.fillRect(-this.width/2, this.height/2 - 8, 2, 4);
        }
        
        ctx.restore();
    }
}

/**
 * Pedestres (IA de Passarela)
 */
class Pedestrian {
    constructor(x, y, range) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.range = range;
        this.speed = 0.8;
        this.dir = 1;
        this.state = 'WALKING'; // WALKING, WAITING
        this.waitTimer = 0;
    }

    update() {
        if (this.state === 'WAITING') {
            this.waitTimer--;
            if (this.waitTimer <= 0) this.state = 'WALKING';
            return;
        }

        this.y += this.speed * this.dir;
        
        if (Math.abs(this.y - this.startY) > this.range) {
            this.dir *= -1;
            this.state = 'WAITING';
            this.waitTimer = 100 + Math.random() * 200;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 5; ctx.shadowColor = '#fef08a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// --- ENGINE DO JOGO ---

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new Input();
        this.sound = new SoundSynth();
        
        this.state = 'MENU';
        this.camera = { x: 0, y: 0 };
        this.weather = 'SUNNY';
        this.levelIndex = 0;
        this.score = 0;
        
        this.entities = {
            player: null,
            npcs: [],
            lights: [],
            pedestrians: []
        };

        this.init();
        this.loop();
    }

    init() {
        this.canvas.width = CONFIG.RESOLUTION.w;
        this.canvas.height = CONFIG.RESOLUTION.h;
        this.bindUI();
    }

    bindUI() {
        const startBtn = document.getElementById('start-btn');
        startBtn.onclick = () => {
            if (startBtn.disabled) return;
            startBtn.disabled = true;
            this.sound.init(); // Ativa o áudio com interação
            this.changeState('LEVEL_START');
        };
        
        document.getElementById('tutorial-btn').onclick = () => this.changeState('TUTORIAL');
        document.getElementById('back-to-menu-btn').onclick = () => this.changeState('MENU');
        document.getElementById('restart-btn').onclick = () => location.reload();
        document.getElementById('continue-btn').onclick = () => location.reload();
    }

    changeState(newState) {
        console.log("MUDANÇA DE ESTADO:", newState);
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');

        switch(newState) {
            case 'MENU':
                document.getElementById('menu-screen').classList.remove('hidden');
                break;
            case 'TUTORIAL':
                document.getElementById('tutorial-screen').classList.remove('hidden');
                break;
            case 'LEVEL_START':
                document.getElementById('level-start-screen').classList.remove('hidden');
                this.loadLevel(this.levelIndex);
                this.startCountdown();
                break;
            case 'PLAYING':
                document.getElementById('hud').classList.remove('hidden');
                this.startTime = Date.now(); // Inicia o cronômetro da entrega
                break;
            case 'GAME_OVER':
                document.getElementById('game-over-screen').classList.remove('hidden');
                break;
            case 'SUCCESS':
                document.getElementById('success-screen').classList.remove('hidden');
                this.calculateResults();
                break;
        }
    }

    loadLevel(idx) {
        // Reset entidades
        this.entities.map = new CityMap();
        this.entities.player = new PlayerVehicle(200, 400);
        this.entities.npcs = [
            new NPCVehicle([{x: -200, y: 350}, {x: 3000, y: 350}], 2),
            new NPCVehicle([{x: 1000, y: 650}, {x: -500, y: 650}], 1.5)
        ];
        this.entities.lights = [
            new TrafficLight(800, 500),
            new TrafficLight(1800, 500)
        ];
        this.entities.pedestrians = [
            new Pedestrian(1200, 400, 200),
            new Pedestrian(2200, 400, 200)
        ];
        
        // Clima baseado no nível
        this.weather = (idx > 1) ? 'RAINY' : 'SUNNY';
        document.getElementById('rain-overlay').classList.toggle('hidden', this.weather !== 'RAINY');
        
        const names = ["BAIRRO TRANQUILO", "CENTRO COMERCIAL", "RODOVIA NA CHUVA"];
        document.getElementById('level-title').innerText = `MISSÃO ${idx + 1}`;
        document.getElementById('level-desc').innerText = names[idx % names.length];
    }

    startCountdown() {
        let count = 3;
        const el = document.getElementById('start-countdown');
        el.innerText = count;
        const timer = setInterval(() => {
            count--;
            console.log("Contagem regressiva:", count);
            if (count <= 0) {
                console.log("Contagem zerou, iniciando jogo...");
                clearInterval(timer);
                this.changeState('PLAYING');
            } else {
                el.innerText = count;
            }
        }, 1000);
    }

    update() {
        if (this.state !== 'PLAYING') return;

        const { player, npcs, lights, pedestrians } = this.entities;

        // 1. Atualizar Player
        player.update(this.input, this.weather);

        // Colisão com cenário (Map)
        if (this.entities.map && this.entities.map.checkCollision(player.x, player.y)) {
            player.speed *= -0.5; // Recuo por batida
            player.applyPackageDamage(0.05); // Dano à carga
            if (this.sound) this.sound.playBump(); // Som de batida
            // Afastar um pouco para não travar na parede
            player.x -= player.velocity.x * 1.5;
            player.y -= player.velocity.y * 1.5;
        }

        // 2. Atualizar IA e Trânsito
        npcs.forEach(n => n.update(player, lights));
        lights.forEach(l => {
            l.update();
            if (l.checkViolation(player)) {
                player.infractions++;
                if (this.sound) this.sound.playInfraction(); // Som de multa
                document.getElementById('traffic-warning').classList.remove('hidden');
                setTimeout(() => document.getElementById('traffic-warning').classList.add('hidden'), 2000);
            }
        });
        pedestrians.forEach(p => p.update());

        // 3. Sistema de Câmera (Smooth Following)
        this.camera.x += (player.x - CONFIG.RESOLUTION.w/2 - this.camera.x) * CONFIG.CAMERA_SMOOTH;
        this.camera.y += (player.y - CONFIG.RESOLUTION.h/2 - this.camera.y) * CONFIG.CAMERA_SMOOTH;

        // 4. Detecção de Colisões Fatais
        npcs.forEach(n => {
            const dist = Math.hypot(player.x - n.x, player.y - n.y);
            if (dist < 45) {
                this.fail('Colisão frontal com veículo civil.');
            }
        });

        pedestrians.forEach(p => {
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < 30) {
                this.fail('Acidente fatal com pedestre.');
            }
        });

        // 5. Checar Condição de Vitória (Simplified: reached X position)
        if (player.x > 2500) {
            this.changeState('SUCCESS');
        }

        // 6. Checar Integridade
        if (player.integrity <= 0) {
            this.fail('Integridade do pacote totalmente comprometida.');
        }

        this.updateHUD();
    }

    fail(reason) {
        document.getElementById('fail-reason').innerText = reason;
        this.changeState('GAME_OVER');
    }

    updateHUD() {
        const { player } = this.entities;
        const intBar = document.getElementById('integrity-bar');
        const speedVal = document.getElementById('speed-val');
        const timerVal = document.getElementById('timer-val');
        
        // Atualizar Cronômetro
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            timerVal.innerText = `${minutes}:${seconds}`;
        }
        
        const percentage = (player.integrity * 100).toFixed(0);
        intBar.style.width = percentage + '%';
        
        // Cor dinâmica da barra
        if (percentage > 70) intBar.style.background = 'var(--success-gradient)';
        else if (percentage > 30) intBar.style.background = 'var(--warning-gradient)';
        else intBar.style.background = 'var(--danger-gradient)';

        // Velocímetro color-coded
        const speedKph = Math.floor(Math.abs(player.speed) * 20);
        speedVal.innerText = speedKph;
        if (speedKph > 120) speedVal.style.color = 'var(--danger)';
        else if (speedKph > 80) speedVal.style.color = 'var(--warning)';
        else speedVal.style.color = 'var(--success)';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Renderizar Ambiente (Tile Map)
        if (this.entities.map) this.entities.map.draw(this.ctx);

        // Renderizar Entidades
        if (this.entities.lights) this.entities.lights.forEach(l => l.draw(this.ctx));
        if (this.entities.pedestrians) this.entities.pedestrians.forEach(p => p.draw(this.ctx));
        if (this.entities.npcs) this.entities.npcs.forEach(n => n.draw(this.ctx));
        if (this.entities.player) this.entities.player.draw(this.ctx);

        this.ctx.restore();

        // Pós-processamento de chuva
        if (this.weather === 'RAINY') this.drawRain();
    }

    drawEnvironment() {
        // Asfalto
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(-500, 300, 5000, 400);
        
        // Grama / Calçada
        this.ctx.fillStyle = '#064e3b';
        this.ctx.fillRect(-500, 0, 5000, 300);
        this.ctx.fillRect(-500, 700, 5000, 300);

        // Central Line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([40, 40]);
        this.ctx.beginPath();
        this.ctx.moveTo(-500, 500);
        this.ctx.lineTo(4500, 500);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawRain() {
        this.ctx.strokeStyle = 'rgba(186, 215, 255, 0.15)';
        this.ctx.lineWidth = 1;
        for(let i=0; i<40; i++) {
            const rx = Math.random() * this.canvas.width;
            const ry = Math.random() * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(rx, ry);
            this.ctx.lineTo(rx - 10, ry + 25);
            this.ctx.stroke();
        }
    }

    calculateResults() {
        const { player } = this.entities;
        const integrity = (player.integrity * 100).toFixed(0);
        const infractions = player.infractions;
        
        document.getElementById('final-integrity').innerText = integrity + '%';
        document.getElementById('final-infractions').innerText = infractions;
        
        let stars = '';
        if (integrity > 90 && infractions < 20) stars = '★★★';
        else if (integrity > 60 && infractions < 100) stars = '★★☆';
        else stars = '★☆☆';
        
        document.getElementById('star-rating').innerText = stars;
    }

    loop() {
        try {
            this.update();
            this.draw();
        } catch (e) {
            console.error("ERRO FATAL NO LOOP:", e);
        }
        requestAnimationFrame(() => this.loop());
    }
}

// Inicializar aplicação
window.onload = () => {
    new Game();
};
