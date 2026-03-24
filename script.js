/**
 * SAFE DELIVERY - CORE ENGINE (GTA 1 OPEN WORLD INSPIRED)
 * Um simulador de condução urbana em perspectiva top-down com mundo aberto em grid.
 */

// --- CONSTANTES E CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 128,          // Tamanho de cada bloco (em pixels)
    RESOLUTION: { w: 1280, h: 720 },
    CAMERA_SMOOTH: 0.1,      // Velocidade de arraste da câmera

    // FÍSICA DO CARRO
    CAR: {
        MAX_SPEED: 12.0,     
        ACCEL_TIME: 6.0,     // 6 segundos para velocidade máxima
        TORQUE: 12.0 / (6.0 * 60), // Ganho por frame
        BRAKE: 0.35,         
        FRICTION_AIR: 0.98,  
        WIDTH: 52,
        HEIGHT: 26,
        TURN_POWER_BASE: 0.05,
        DRIFT_FACTOR: 0.92   
    },

    // CÂMERA
    CAMERA: {
        ZOOM_MIN: 0.8,       // Zoom out em alta velocidade
        ZOOM_MAX: 1.4,       // Zoom in parado
    }
};

/**
 * Teclado
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
 * Sintetizador de Som
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
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    }
}

/**
 * Mapa da Cidade (Mundo Aberto por Grid)
 * 0: Grama, 1: Asfalto, 2: Calçada, 3: Prédio (Sólido)
 */
class CityMap {
    constructor() {
        this.tileSize = CONFIG.TILE_SIZE;
        
        // Grid 32x24 (4096x3072 pixels) - Mapa Expandido
        this.grid = [
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,3,3,3,3,3,3,3],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3],
        ];

        this.rows = this.grid.length;
        this.cols = this.grid[0].length;
        this.worldWidth = this.cols * this.tileSize;
        this.worldHeight = this.rows * this.tileSize;
    }

    draw(ctx) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                const tx = c * this.tileSize;
                const ty = r * this.tileSize;

                if (tile === 0) ctx.fillStyle = '#14532d';
                else if (tile === 1) ctx.fillStyle = '#1e293b';
                else if (tile === 2) ctx.fillStyle = '#94a3b8';
                else if (tile === 3) ctx.fillStyle = '#020617';

                ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

                if (tile === 3) {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(tx + 12, ty + 12, this.tileSize - 24, this.tileSize - 24);
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx + 12, ty + 12, this.tileSize - 24, this.tileSize - 24);
                }

                // Linhas de rua coerentes (Ajustadas para os múltiplos cruzamentos)
                if (tile === 1) {
                    ctx.strokeStyle = '#eab308';
                    ctx.lineWidth = 2;
                    // Linhas horizontais (nas ruas horizontais r=3,4,9,10,15,16,21,22)
                    if ((r === 3 || r === 9 || r === 15 || r === 21) && c % 1 === 0) {
                        ctx.setLineDash([20, 10]);
                        ctx.beginPath(); ctx.moveTo(tx, ty+this.tileSize); ctx.lineTo(tx+this.tileSize, ty+this.tileSize); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    // Linhas verticais (nas colunas c=7, c=23)
                    if (c === 7 || c === 23) {
                        ctx.setLineDash([20, 10]);
                        ctx.beginPath(); ctx.moveTo(tx+this.tileSize, ty); ctx.lineTo(tx+this.tileSize, ty+this.tileSize); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }
        }
    }

    checkCollision(x, y) {
        const c = Math.floor(x / this.tileSize);
        const r = Math.floor(y / this.tileSize);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 'WALL';
        
        const tile = this.grid[r][c];
        if (tile === 3) return 'WALL';
        if (tile === 2) return 'SIDEWALK';
        return 'ROAD';
    }
}

class PlayerVehicle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.integrity = 1.0;
        this.width = CONFIG.CAR.WIDTH;
        this.height = CONFIG.CAR.HEIGHT;
        this.drift = 0;
    }

    update(input, map) {
        const speedRatio = Math.abs(this.speed) / CONFIG.CAR.MAX_SPEED;
        if (input.isPressed('KeyW')) { this.speed += CONFIG.CAR.TORQUE; }
        else if (input.isPressed('KeyS')) { this.speed -= CONFIG.CAR.BRAKE; }
        else { this.speed *= CONFIG.CAR.FRICTION_AIR; if (Math.abs(this.speed) < 0.05) this.speed = 0; }

        if (this.speed > CONFIG.CAR.MAX_SPEED) this.speed = CONFIG.CAR.MAX_SPEED;
        if (this.speed < -CONFIG.CAR.MAX_SPEED * 0.3) this.speed = -CONFIG.CAR.MAX_SPEED * 0.3;

        let turnPower = CONFIG.CAR.TURN_POWER_BASE / (1 + speedRatio * 1.5);
        if (input.isPressed('KeyA')) this.angle -= turnPower;
        if (input.isPressed('KeyD')) this.angle += turnPower;

        if (speedRatio > 0.5 && (input.isPressed('KeyA') || input.isPressed('KeyD'))) { this.drift += 0.015 * speedRatio; }
        this.drift *= CONFIG.CAR.DRIFT_FACTOR;

        const moveAngle = this.angle + (this.drift * (input.isPressed('KeyA') ? -1 : 1));
        this.velocity.x = Math.cos(moveAngle) * this.speed;
        this.velocity.y = Math.sin(moveAngle) * this.speed;

        const nextX = this.x + this.velocity.x;
        const nextY = this.y + this.velocity.y;
        const collisionType = map.checkCollision(nextX, nextY);

        if (collisionType === 'WALL') {
            this.speed = -this.speed * 0.3; // Bate e volta um pouco
            this.integrity -= 0.15;
            const flash = document.getElementById('damage-flash');
            if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 80); }
            return 'WALL_HIT'; // NÃO atualiza this.x e this.y (trava)
        } else if (collisionType === 'SIDEWALK') {
            return 'SIDEWALK_HIT'; 
        } else {
            this.x = nextX;
            this.y = nextY;
        }
        return 'OK';
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fillStyle = '#000000'; ctx.fillRect(0, -this.height / 2 + 2, 10, this.height - 4);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(this.width / 2 - 4, -this.height / 2 + 3, 4, 3); ctx.fillRect(this.width / 2 - 4, this.height / 2 - 6, 4, 3);
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
        this.map = new CityMap();
        this.player = null;
        this.camera = { x: 0, y: 0, zoom: 1.0 };
        
        // Coordenadas da Entrega Redirecionadas (Extremidade Inferior)
        this.delivery = { x: 3072, y: 2700, radius: 45 }; 

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
            this.player = new PlayerVehicle(1024, 512); 
            this.player.integrity = 1.0;
            this.startTime = Date.now(); // Salvar o tempo de início
            this.changeState('PLAYING');
        };
        document.getElementById('restart-btn').onclick = () => this.changeState('MENU');
        document.getElementById('continue-btn').onclick = () => this.changeState('MENU');
    }

    changeState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');

        if (newState === 'MENU') document.getElementById('menu-screen').classList.remove('hidden');
        if (newState === 'PLAYING') document.getElementById('hud').classList.remove('hidden');
        if (newState === 'GAME_OVER') {
            document.getElementById('game-over-screen').classList.remove('hidden');
            document.getElementById('fail-reason').innerText = "Carga destruída com as colisões!";
        }
        if (newState === 'SUCCESS') document.getElementById('success-screen').classList.remove('hidden');
    }

    update() {
        if (this.state !== 'PLAYING') return;

        const res = this.player.update(this.input, this.map);
        
        if (res === 'WALL_HIT') {
            this.sound.playBump();
        } else if (res === 'SIDEWALK_HIT') {
            // Se subir na calçada, perde o jogo.
            document.getElementById('fail-reason').innerText = "Você subiu na calçada! Respeite os pedestres.";
            this.changeState('GAME_OVER');
            return;
        }

        if (this.player.integrity <= 0) {
            document.getElementById('fail-reason').innerText = "Carga destruída com as colisões!";
            this.changeState('GAME_OVER');
            return;
        }

        const distToDelivery = Math.hypot(this.player.x - this.delivery.x, this.player.y - this.delivery.y);
        if (distToDelivery < this.delivery.radius) {
            this.changeState('SUCCESS');
        }

        const speedRatio = Math.abs(this.player.speed) / CONFIG.CAR.MAX_SPEED;
        const targetZoom = CONFIG.CAMERA.ZOOM_MAX - (CONFIG.CAMERA.ZOOM_MAX - CONFIG.CAMERA.ZOOM_MIN) * speedRatio;
        this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;

        this.camera.x += (this.player.x - this.camera.x) * CONFIG.CAMERA_SMOOTH;
        this.camera.y += (this.player.y - this.camera.y) * CONFIG.CAMERA_SMOOTH;

        const halfWidth = (this.canvas.width / 2) / this.camera.zoom;
        const halfHeight = (this.canvas.height / 2) / this.camera.zoom;

        if (this.camera.x < halfWidth) this.camera.x = halfWidth;
        if (this.camera.y < halfHeight) this.camera.y = halfHeight;
        if (this.camera.x > this.map.worldWidth - halfWidth) this.camera.x = this.map.worldWidth - halfWidth;
        if (this.camera.y > this.map.worldHeight - halfHeight) this.camera.y = this.map.worldHeight - halfHeight;

        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('integrity-bar').style.width = (this.player.integrity * 100) + '%';
        document.getElementById('speed-val').innerText = Math.floor(Math.abs(this.player.speed) * 15);

        // ATUALIZAÇÃO DO CRONÔMETRO
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            document.getElementById('timer-val').innerText = `${minutes}:${seconds}`;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Passar câmera para o centro da viewport
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Render Canvas Bounds (Debug se necessário)
        this.map.draw(this.ctx);

        // Desenhar Ponto de Entrega
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(this.delivery.x, this.delivery.y, this.delivery.radius, 0, Math.PI*2);
        this.ctx.fill();

        if (this.player) this.player.draw(this.ctx);

        this.ctx.restore();

        // DESENHAR SETA GPS FIXA NA HUD OU NA BORDA DA TELA
        if (this.state === 'PLAYING' && this.player) {
            this.drawGPSArrow();
        }
    }

    drawGPSArrow() {
        const angleToDelivery = Math.atan2(this.delivery.y - this.player.y, this.delivery.x - this.player.x);
        
        // Posição fixa no topo esquerdo do HUD ou logo acima do carro na rotação do canvas
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, 80); // Alto da tela central
        this.ctx.rotate(angleToDelivery);

        this.ctx.fillStyle = '#22c55e';
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#22c55e';
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(-10, -10);
        this.ctx.lineTo(-10, 10);
        this.ctx.fill();

        this.ctx.restore();
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
