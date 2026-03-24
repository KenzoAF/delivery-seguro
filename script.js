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

        // --- SISTEMA DE SEMÁFOROS ---
        this.trafficLights = [];
        this.lightTimer = 0;
        this.initTrafficLights();

        // --- SISTEMA DE PEDESTRES ---
        this.pedestrians = [];
        this.initPedestrians();
    }

    initTrafficLights() {
        this.trafficLights.push({ x: 7 * this.tileSize, y: 3 * this.tileSize, state: 'GREEN', direction: 'HORIZONTAL' });
        this.trafficLights.push({ x: 8 * this.tileSize + 64, y: 3 * this.tileSize, state: 'RED', direction: 'VERTICAL' });
        this.trafficLights.push({ x: 23 * this.tileSize, y: 3 * this.tileSize, state: 'GREEN', direction: 'HORIZONTAL' });
        this.trafficLights.push({ x: 24 * this.tileSize + 64, y: 3 * this.tileSize, state: 'RED', direction: 'VERTICAL' });
        this.trafficLights.push({ x: 7 * this.tileSize, y: 15 * this.tileSize, state: 'GREEN', direction: 'HORIZONTAL' });
        this.trafficLights.push({ x: 8 * this.tileSize + 64, y: 15 * this.tileSize, state: 'RED', direction: 'VERTICAL' });
    }

    initPedestrians() {
        // Criar pedestres em áreas de calçadas
        for (let i = 0; i < 20; i++) {
            let placed = false;
            while (!placed) {
                const r = Math.floor(Math.random() * this.rows);
                const c = Math.floor(Math.random() * this.cols);
                if (this.grid[r][c] === 2) { // CALÇADA
                    this.pedestrians.push({
                        x: c * this.tileSize + this.tileSize/2,
                        y: r * this.tileSize + this.tileSize/2,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        size: 8,
                        color: `hsl(${Math.random() * 360}, 80%, 60%)`
                    });
                    placed = true;
                }
            }
        }
    }

    update() {
        this.lightTimer++;
        if (this.lightTimer > 300) { 
            this.lightTimer = 0;
            this.trafficLights.forEach(light => {
                if (light.state === 'GREEN') light.state = 'YELLOW';
                else if (light.state === 'YELLOW') light.state = 'RED';
                else if (light.state === 'RED') light.state = 'GREEN';
            });
        } else if (this.lightTimer === 240) { 
            this.trafficLights.forEach(light => {
                if (light.state === 'GREEN') light.state = 'YELLOW';
            });
        }

        // --- ATUALIZAR PEDESTRES ---
        this.pedestrians.forEach(ped => {
            const nextX = ped.x + ped.vx;
            const nextY = ped.y + ped.vy;

            const c = Math.floor(nextX / this.tileSize);
            const r = Math.floor(nextY / this.tileSize);

            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                const tile = this.grid[r][c];
                
                // Pedestres DEVEM ficar na calçada (2). 
                // Se o próximo tile for rua (1), grama (0) ou prédio (3), eles batem e voltam.
                if (tile !== 2) {
                    ped.vx *= -1; 
                    ped.vy *= -1; 
                } else {
                    ped.x = nextX;
                    ped.y = nextY;
                }
            } else {
                ped.vx *= -1; ped.vy *= -1; // Limites do mapa
            }

            // Aleatoriedade sutil para simular caminhada (sempre na calçada)
            if (Math.random() < 0.02) {
                ped.vx = (Math.random() - 0.5) * 1.5;
                ped.vy = (Math.random() - 0.5) * 1.5;
            }
        });
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

                // Linhas de rua
                if (tile === 1) {
                    ctx.strokeStyle = '#eab308';
                    ctx.lineWidth = 2;
                    if ((r === 3 || r === 9 || r === 15 || r === 21) && c % 1 === 0) {
                        ctx.setLineDash([20, 10]);
                        ctx.beginPath(); ctx.moveTo(tx, ty+this.tileSize); ctx.lineTo(tx+this.tileSize, ty+this.tileSize); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    if (c === 7 || c === 23) {
                        ctx.setLineDash([20, 10]);
                        ctx.beginPath(); ctx.moveTo(tx+this.tileSize, ty); ctx.lineTo(tx+this.tileSize, ty+this.tileSize); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }
        }

        // --- DESENHAR SEMÁFOROS ---
        this.trafficLights.forEach(light => {
            ctx.fillStyle = '#1e293b'; // Poste/Caixa
            ctx.fillRect(light.x - 10, light.y - 40, 20, 80);

            let color = '#ef4444'; // Vermelho
            if (light.state === 'GREEN') color = '#22c55e';
            if (light.state === 'YELLOW') color = '#eab308';

            ctx.fillStyle = color;
            ctx.shadowBlur = 15; ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(light.x, light.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
        });

        // --- DESENHAR PEDESTRES ---
        this.pedestrians.forEach(ped => {
            ctx.fillStyle = ped.color;
            ctx.beginPath();
            ctx.arc(ped.x, ped.y, ped.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Cabeça/Sombra estilizada (efeito Top-Down)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(ped.x, ped.y, ped.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        });
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

    checkPedestrianCollision(px, py, radius) {
        for (let ped of this.pedestrians) {
            const dist = Math.hypot(px - ped.x, py - ped.y);
            if (dist < radius + ped.size) {
                return true; // Atropelamento!
            }
        }
        return false;
    }
    
    checkTrafficLightViolation(x, y) {
        for (let light of this.trafficLights) {
            if (light.state === 'RED') {
                const dist = Math.hypot(x - light.x, y - light.y);
                if (dist < 40) return true; // Vioulo
            }
        }
        return false;
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
            this.speed = -this.speed * 0.5;
            this.integrity -= 0.2;
            const flash = document.getElementById('damage-flash');
            if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 80); }
            return 'WALL_HIT';
        } else if (collisionType === 'SIDEWALK') {
            this.speed *= 0.90; this.x = nextX; this.y = nextY;
        } else {
            this.x = nextX; this.y = nextY;
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
            if (!document.getElementById('fail-reason').innerText) {
                document.getElementById('fail-reason').innerText = "Cargo destroyed due to collisions!";
            }
        }
        if (newState === 'SUCCESS') document.getElementById('success-screen').classList.remove('hidden');
    }

    update() {
        if (this.state !== 'PLAYING') return;

        if (this.map.update) this.map.update();

        const res = this.player.update(this.input, this.map);
        
        if (res === 'WALL_HIT') {
            this.sound.playBump();
        } else if (res === 'SIDEWALK_HIT') {
            document.getElementById('fail-reason').innerText = "You drove on the sidewalk! Respect pedestrians.";
            this.changeState('GAME_OVER');
            return;
        }

        if (this.map.checkPedestrianCollision && this.map.checkPedestrianCollision(this.player.x, this.player.y, 12)) {
            document.getElementById('fail-reason').innerText = "ACCIDENT! You hit a pedestrian.";
            this.changeState('GAME_OVER');
            return;
        }

        if (this.map.checkTrafficLightViolation && this.map.checkTrafficLightViolation(this.player.x, this.player.y)) {
            this.player.integrity -= 0.005; 
            const flash = document.getElementById('damage-flash');
            if (flash) { flash.style.opacity = '0.4'; setTimeout(() => flash.style.opacity = '0', 50); }
        }

        if (this.player.integrity <= 0) {
            document.getElementById('fail-reason').innerText = "Parcel destroyed with collisions or fines!";
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
