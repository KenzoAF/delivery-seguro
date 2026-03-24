/**
 * SAFE DELIVERY - CORE ENGINE (GTA 1 INSPIRED)
 * Um simulador de condução urbana em perspectiva top-down.
 */

// --- CONSTANTES E CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 128,          // Tiles maiores para mais detalhes
    RESOLUTION: { w: 1280, h: 720 },
    CAMERA_SMOOTH: 0.1,      // Fator de suavização da câmera

    // FÍSICA DO CARRO (Ajustada para os requisitos)
    CAR: {
        MAX_SPEED: 12.0,     // Mais rápido para suportar o zoom out
        ACCEL_TIME: 6.0,     // 6 segundos para velocidade máxima
        TORQUE: 12.0 / (6.0 * 60), // Ganho por frame (~0.033)
        BRAKE: 0.35,         
        FRICTION_AIR: 0.98,  // Deslize inercial
        WIDTH: 60,
        HEIGHT: 32,
        // Direção Inverse à velocidade
        TURN_POWER_BASE: 0.06,
        DRIFT_FACTOR: 0.92   // Derrapagem
    },

    // CAMERAS
    CAMERA: {
        ZOOM_MIN: 0.8,       // Alta velocidade (Zoom Out)
        ZOOM_MAX: 1.5,       // Parado (Zoom In)
        THRESHOLD_SPEED: 12.0 // Velocidade para o zoom out máximo
    },

    // CLIMA
    WEATHER: {
        SUNNY: { friction: 1.0, visibility: 1.0 },
        RAINY: { friction: 0.7, visibility: 0.8 }
    }
};

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
        // 0: Grama, 1: Asfalto, 2: Calçada, 3: Prédio/Muro, 4: Barreira Invisível (Borda)
        this.grid = [
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4], // Prédios no topo
            [4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4],
            [4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4],
            [4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        ];
    }

    draw(ctx) {
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                const tile = this.grid[r][c];
                const tx = c * this.tileSize;
                const ty = r * this.tileSize;

                if (tile === 4) continue; // Pula renderização da borda

                if (tile === 0) ctx.fillStyle = '#14532d'; // Grama Escura
                else if (tile === 1) ctx.fillStyle = '#1e293b'; // Asfalto
                else if (tile === 2) ctx.fillStyle = '#cbd5e1'; // Calçada Clara
                else if (tile === 3) ctx.fillStyle = '#020617'; // Prédios

                ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

                // Relevo de Prédios (Altos) - Estética 3D básica de GTA 1
                if (tile === 3) {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(tx + 10, ty + 10, this.tileSize - 20, this.tileSize - 20);
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tx + 10, ty + 10, this.tileSize - 20, this.tileSize - 20);
                }

                // Linha central na rua
                if (tile === 1 && r === 3) {
                    ctx.strokeStyle = '#eab308'; // Amarela contínua
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty + this.tileSize);
                    ctx.lineTo(tx + this.tileSize, ty + this.tileSize);
                    ctx.stroke();
                }
            }
        }
    }

    checkCollision(x, y) {
        const c = Math.floor(x / this.tileSize);
        const r = Math.floor(y / this.tileSize);
        if (r < 0 || r >= this.grid.length || c < 0 || c >= this.grid[0].length) return 'WALL';
        
        const tile = this.grid[r][c];
        if (tile === 3 || tile === 4) return 'WALL'; // Colisão Sólida
        if (tile === 2) return 'SIDEWALK'; // Tocou calçada
        return 'ROAD';
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

        this.width = CONFIG.CAR.WIDTH;
        this.height = CONFIG.CAR.HEIGHT;
        this.drift = 0;
    }

    update(input, weather, map) {
        const weatherMod = CONFIG.WEATHER[weather] || CONFIG.WEATHER.SUNNY;
        const speedRatio = Math.abs(this.speed) / CONFIG.CAR.MAX_SPEED;

        // 1. ACELERAÇÃO PROGRESSIVA (6 SEGUNDOS PARA MAX)
        if (input.isPressed('KeyW')) {
            this.speed += CONFIG.CAR.TORQUE * weatherMod.friction;
        } else if (input.isPressed('KeyS')) {
            this.speed -= CONFIG.CAR.BRAKE * weatherMod.friction;
        } else {
            this.speed *= CONFIG.CAR.FRICTION_AIR; // Inércia gradual
            if (Math.abs(this.speed) < 0.05) this.speed = 0;
        }

        if (this.speed > CONFIG.CAR.MAX_SPEED) this.speed = CONFIG.CAR.MAX_SPEED;
        if (this.speed < -CONFIG.CAR.MAX_SPEED * 0.3) this.speed = -CONFIG.CAR.MAX_SPEED * 0.3;

        // 2. TURN POWER INVERSO À VELOCIDADE
        let turnPower = CONFIG.CAR.TURN_POWER_BASE / (1 + speedRatio * 2);

        if (input.isPressed('KeyA')) this.angle -= turnPower;
        if (input.isPressed('KeyD')) this.angle += turnPower;

        // 3. DRIFT LATERAL
        if (speedRatio > 0.5 && (input.isPressed('KeyA') || input.isPressed('KeyD'))) {
            this.drift += 0.015 * speedRatio;
        }
        this.drift *= CONFIG.CAR.DRIFT_FACTOR; 

        // 4. MOVIMENTO
        const moveAngle = this.angle + (this.drift * (input.isPressed('KeyA') ? -1 : 1));
        this.velocity.x = Math.cos(moveAngle) * this.speed;
        this.velocity.y = Math.sin(moveAngle) * this.speed;

        const nextX = this.x + this.velocity.x;
        const nextY = this.y + this.velocity.y;

        // 5. COLISÕES DE ACORDO COM MAPA
        const type = map.checkCollision(nextX, nextY);

        if (type === 'WALL') {
            this.speed = 0; 
            this.applyPackageDamage(0.25); 
            return 'CRASH'; 
        } else if (type === 'SIDEWALK') {
            this.speed *= 0.85; 
            this.x += this.velocity.x * 0.5; 
            this.y += this.velocity.y * 0.5;
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        return 'OK';
    }

    applyPackageDamage(amount) {
        this.integrity -= amount;
        if (this.integrity < 0) this.integrity = 0;

        const flash = document.getElementById('damage-flash');
        if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => flash.style.opacity = '0', 80);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createLinearGradient(-this.width / 2, 0, this.width / 2, 0);
        gradient.addColorStop(0, '#1d4ed8');
        gradient.addColorStop(1, '#60a5fa');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.fillStyle = '#020617';
        ctx.fillRect(-2, -this.height / 2 + 3, 15, this.height - 6);

        ctx.fillStyle = '#fef08a';
        ctx.fillRect(this.width / 2 - 4, -this.height / 2 + 2, 4, 4);
        ctx.fillRect(this.width / 2 - 4, this.height / 2 - 6, 4, 4);

        ctx.restore();
    }
}

/**
 * ENGINE DO JOGO
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new Input();
        this.sound = new SoundSynth();

        this.state = 'MENU';
        this.camera = { x: 0, y: 0, zoom: 1.0 };
        this.map = new CityMap();
        this.player = null;

        this.init();
        this.loop();
    }

    init() {
        this.canvas.width = CONFIG.RESOLUTION.w;
        this.canvas.height = CONFIG.RESOLUTION.h;
        this.bindUI();
    }

    bindUI() {
        document.getElementById('start-btn').onclick = () => {
            this.sound.init();
            this.player = new PlayerVehicle(200, 400); 
            this.changeState('PLAYING');
        };
        document.getElementById('restart-btn').onclick = () => location.reload();
        document.getElementById('continue-btn').onclick = () => location.reload();
    }

    changeState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');

        if (newState === 'MENU') document.getElementById('menu-screen').classList.remove('hidden');
        if (newState === 'PLAYING') document.getElementById('hud').classList.remove('hidden');
        if (newState === 'GAME_OVER') document.getElementById('game-over-screen').classList.remove('hidden');
    }

    update() {
        if (this.state !== 'PLAYING') return;

        const status = this.player.update(this.input, 'SUNNY', this.map);
        if (status === 'CRASH') {
            this.fail('Colisão violenta com estrutura. Pacote destruído.');
            return;
        }

        if (this.player.integrity <= 0) {
            this.fail('Carga totalmente destruída.');
            return;
        }

        const speedRatio = Math.abs(this.player.speed) / CONFIG.CAR.MAX_SPEED;
        const targetZoom = CONFIG.CAMERA.ZOOM_MAX - (CONFIG.CAMERA.ZOOM_MAX - CONFIG.CAMERA.ZOOM_MIN) * speedRatio;
        this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05; 

        this.camera.x += (this.player.x - this.camera.x) * CONFIG.CAMERA_SMOOTH;
        this.camera.y += (this.player.y - this.camera.y) * CONFIG.CAMERA_SMOOTH;

        this.updateHUD();
    }

    updateHUD() {
        const intBar = document.getElementById('integrity-bar');
        const speedVal = document.getElementById('speed-val');
        
        intBar.style.width = (this.player.integrity * 100) + '%';
        speedVal.innerText = Math.floor(Math.abs(this.player.speed) * 15);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.map.draw(this.ctx);

        if (this.player) this.player.draw(this.ctx);

        this.ctx.restore();
    }

    fail(reason) {
        document.getElementById('fail-reason').innerText = reason;
        this.changeState('GAME_OVER');
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => {
    new Game();
};
