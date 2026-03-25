import * as THREE from 'https://esm.sh/three@0.128.0';
import { GLTFLoader } from 'https://esm.sh/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

console.log("Delivery Seguro 3D - v2 Local / Web Loaded correctly no cache");

// --- CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 10, // Aumentado para alargar as ruas (Antes era 5)
    CAMERA: { OFFSET_Y: 14, OFFSET_Z: 16, FOV_MIN: 60, FOV_MAX: 85 }, // Offset Y alçado para não furar prédios e dar visao melhor
    VEHICLES: {
        car: { maxSpeed: 0.6, accel: 0.003, brake: 0.03, turn: 0.04, height: 1.0, color: 0x1d4ed8, width: 2, length: 4, modelPath: 'assets/models/carro.glb' },
        truck: { maxSpeed: 0.4, accel: 0.0015, brake: 0.02, turn: 0.02, height: 2.2, color: 0xef4444, width: 3, length: 6, modelPath: 'assets/models/caminhao.glb' },
        moto: { maxSpeed: 0.8, accel: 0.005, brake: 0.05, turn: 0.06, height: 0.6, color: 0x22c55e, width: 1, length: 2, modelPath: 'assets/models/moto.glb' }
    }
};

function generateCityGrid(size) {
    const map = Array.from({length: size}, () => Array(size).fill(3));
    const step = 10; // Prédios largos, e blocos espaçosos
    
    for(let i = 8; i < size; i += step) {
        for(let c = 0; c < size; c++) {
            map[i][c] = 1;
            if(i+1 < size) map[i+1][c] = 1;
            if(i > 0 && map[i-1][c] === 3) map[i-1][c] = 2;
            if(i+2 < size && map[i+2][c] === 3) map[i+2][c] = 2;
        }
        for(let r = 0; r < size; r++) {
            map[r][i] = 1;
            if(i+1 < size) map[r][i+1] = 1;
            if(i > 0 && map[r][i-1] === 3) map[r][i-1] = 2;
            if(i+2 < size && map[r][i+2] === 3) map[r][i+2] = 2;
        }
    }
    
    return map;
}

const MAPS = [
    generateCityGrid(80),   // Mapa 1: Bairro Expansivo (80x80)
    generateCityGrid(120)   // Mapa 2: Metrópole Gigante (120x120) - Escala colossal
];

const ACHIEVEMENTS_DEF = {
    primeiraEntrega: { icon: '📦', name: 'Primeiro Passo', desc: 'Concluir a primeira entrega com sucesso.' },
    escudoPrata: { icon: '🛡️', name: 'Escudo de Prata', desc: 'Entrega sem bater.' },
    cidadaoExemplar: { icon: '🚦', name: 'Cidadão Exemplar', desc: 'Passou em sinais verdes.' },
    anjoDaGuarda: { icon: '🚶', name: 'Anjo da Guarda', desc: 'Não atropelou ninguém.' },
    equilibrista: { icon: '🏍️', name: 'Equilibrista', desc: 'Entrega de moto ilesa.' }
};

class Input {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', e => { if (e.code) this.keys[e.code.toLowerCase()] = true; });
        window.addEventListener('keyup', e => { if (e.code) this.keys[e.code.toLowerCase()] = false; });
    }
    isPressed(key) { return !!this.keys[key.toLowerCase()]; }
}

class AudioEngine {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        
        this.engineSound = new THREE.PositionalAudio(this.listener);
        this.hornSound = new THREE.PositionalAudio(this.listener);
        this.crashSound = new THREE.PositionalAudio(this.listener);
        this.musicSafe = new THREE.Audio(this.listener);
        this.musicTense = new THREE.Audio(this.listener);
        
        const loader = new THREE.AudioLoader();
        loader.load('assets/sounds/engine_loop.mp3', buf => {
            this.engineSound.setBuffer(buf); this.engineSound.setLoop(true); this.engineSound.setVolume(0.5);
        }, undefined, () => {});
        loader.load('assets/sounds/horn.mp3', buf => this.hornSound.setBuffer(buf), undefined, () => {});
        loader.load('assets/sounds/crash.wav', buf => this.crashSound.setBuffer(buf), undefined, () => {});
        loader.load('assets/sounds/music_safe.mp3', buf => {
            this.musicSafe.setBuffer(buf); this.musicSafe.setLoop(true); this.musicSafe.setVolume(0.5);
        }, undefined, () => {});
        loader.load('assets/sounds/music_tense.mp3', buf => {
            this.musicTense.setBuffer(buf); this.musicTense.setLoop(true); this.musicTense.setVolume(0);
        }, undefined, () => {});
        
        this.enabled = false;
    }

    start() {
        if (this.enabled) return;
        this.enabled = true;
        if(this.engineSound.buffer) this.engineSound.play();
        if(this.musicSafe.buffer) this.musicSafe.play();
        if(this.musicTense.buffer) this.musicTense.play();
    }

    setVolumes(master, music, sfx) {
        this.listener.setMasterVolume(master);
        if(this.musicSafe.isPlaying) this.musicSafe.setVolume(music);
        if(this.engineSound.isPlaying) this.engineSound.setVolume(sfx * 0.5);
        if(this.crashSound.isPlaying) this.crashSound.setVolume(sfx);
        if(this.hornSound.isPlaying) this.hornSound.setVolume(sfx);
    }

    update(speedRatio, infractions) {
        if (!this.enabled) return;
        if(this.engineSound.isPlaying) this.engineSound.setPlaybackRate(0.8 + speedRatio * 1.5);
        
        let tenseTarget = (speedRatio > 0.8 || infractions > 0) ? 1.0 : 0.0;
        if (this.musicSafe.isPlaying && this.musicTense.isPlaying) {
            const mVol = document.getElementById('music-vol') ? parseFloat(document.getElementById('music-vol').value) : 0.5;
            const curTense = this.musicTense.getVolume();
            const curSafe = this.musicSafe.getVolume();
            this.musicTense.setVolume(curTense + (tenseTarget * mVol - curTense) * 0.05);
            this.musicSafe.setVolume(curSafe + ((1 - tenseTarget) * mVol - curSafe) * 0.05);
        }
    }

    playHorn() { if(this.enabled && this.hornSound.buffer && !this.hornSound.isPlaying) this.hornSound.play(); }
    playCrash() { if(this.enabled && this.crashSound.buffer) { if(this.crashSound.isPlaying) this.crashSound.stop(); this.crashSound.play(); } }
    stopMotor() { if(this.engineSound.isPlaying) this.engineSound.pause(); }
}

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
    }

    emit(x, y, z, type = 'smoke', count = 1) {
        if(this.pool.length > 200) return; 

        let color = 0xdddddd;
        let size = 0.15;
        let decay = 0.02;
        let velocity = new THREE.Vector3((Math.random()-0.5)*0.03, 0.05 + Math.random()*0.05, (Math.random()-0.5)*0.03);

        if(type === 'dust') { color = 0x8b4513; size = 0.2; decay = 0.03; }
        if(type === 'sparks') { color = 0xfacc15; size = 0.1; decay = 0.05; velocity.multiplyScalar(3); }
        
        const geo = new THREE.SphereGeometry(size, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7 });
        
        for(let i=0; i<count; i++) {
            const p = new THREE.Mesh(geo, mat);
            p.position.set(x + (Math.random()-0.5)*0.3, y, z + (Math.random()-0.5)*0.3);
            
            this.scene.add(p);
            this.pool.push({
                mesh: p,
                vel: velocity.clone().add(new THREE.Vector3((Math.random()-0.5)*0.02, 0, (Math.random()-0.5)*0.02)),
                life: 1.0,
                decay: decay,
                type: type
            });
        }
    }

    update() {
        for(let i=this.pool.length-1; i>=0; i--) {
            const p = this.pool[i];
            p.life -= p.decay;
            p.mesh.position.add(p.vel);
            p.mesh.scale.multiplyScalar(1.05);
            p.mesh.material.opacity = p.life;
            
            if(p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.pool.splice(i, 1);
            }
        }
    }
}

class Game3D {
    constructor() {
        this.input = new Input();
        this.state = 'MENU';
        this.score = 100;
        this.infractionsLog = { bumps: 0, redlights: 0, pedestrians: 0 };
        this.achievements = JSON.parse(localStorage.getItem('deliveryAchievements')) || {
            primeiraEntrega: false, escudoPrata: false, cidadaoExemplar: false, anjoDaGuarda: false, equilibrista: false
        };
        
        this.vehicleType = 'car';
        this.selectedMapIdx = 0;
        this.physics = null;
        this.startTime = 0;
        this.colliders = [];
        this.trafficLights = [];
        this.pedestrians = [];
        this.loader = new GLTFLoader();
        this.wheelRotation = 0;
        this.frameCounter = 0;

        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        this.initThree();
        this.particles = new ParticleSystem(this.scene);
        this.audio = new AudioEngine(this.camera);
        this.initDOM();
        
        this.runAppLoop = () => {
            this.loop();
            requestAnimationFrame(this.runAppLoop);
        };
        requestAnimationFrame(this.runAppLoop);
    }

    loop() {
        if(this.state === 'PLAYING' || this.state === 'MENU') {
            this.updatePhysics();
            this.updateAI();
            this.drawMinimap();
            if(this.particles) this.particles.update();
        }
        this.renderer.render(this.scene, this.camera);
    }

    initThree() {
        const container = document.getElementById('canvas-container');
        if(!container) return; 
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); 

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
        sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);
        
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);

        const rim = new THREE.DirectionalLight(0xffffff, 0.4);
        rim.position.set(-50, 50, -50);
        this.scene.add(rim);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    buildMap() {
        // Limpa mapa anterior
        while(this.mapGroup.children.length > 0){ 
            this.mapGroup.remove(this.mapGroup.children[0]); 
        }
        this.colliders = [];
        this.trafficLights = [];
        this.pedestrians = [];

        const map = MAPS[this.selectedMapIdx];
        const ts = CONFIG.TILE_SIZE;
        let bCount = 0;
        let sCount = 0;
        map.forEach(row => row.forEach(tile => { 
            if(tile === 3) bCount++; 
            if(tile === 2) sCount++;
        }));
        
        // 1. EDIFÍCIOS VOLUMÉTRICOS
        const bGeo = new THREE.BoxGeometry(ts * 0.9, 1, ts * 0.9);
        const bMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0, roughness: 0.8 });
        const bInst = new THREE.InstancedMesh(bGeo, bMat, bCount);
        bInst.castShadow = true;
        bInst.receiveShadow = true;
        
        // 2. CALÇADAS (Volumétricas!)
        const sGeo = new THREE.BoxGeometry(ts, 0.2, ts);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x475569 }); // Cinza claro pra destacar
        const sInst = new THREE.InstancedMesh(sGeo, sMat, sCount);
        sInst.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let bIdx = 0;
        let sIdx = 0;
        this.goalPos = null;

        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[0].length; c++) {
                const tile = map[r][c];
                const x = c * ts;
                const z = r * ts;

                if (tile === 3) {
                    const h = 8 + Math.random() * 25; 
                    dummy.position.set(x, h/2, z);
                    dummy.scale.set(1, h, 1);
                    dummy.updateMatrix();
                    bInst.setMatrixAt(bIdx++, dummy.matrix);
                    
                    const box = new THREE.Box3();
                    box.setFromCenterAndSize(new THREE.Vector3(x, h/2, z), new THREE.Vector3(ts, h, ts));
                    this.colliders.push(box);
                } else if (tile === 2) {
                    dummy.position.set(x, 0.1, z);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    sInst.setMatrixAt(sIdx++, dummy.matrix);
                }
                
                // Pedestres
                if (tile === 2 && Math.random() < 0.1) {
                    this.pedestrians.push({
                        x: x + (Math.random()-0.5)*ts,
                        z: z + (Math.random()-0.5)*ts,
                        mesh: null 
                    });
                }
            }
        }
        this.mapGroup.add(bInst);
        this.mapGroup.add(sInst);

        // Chão/Ground
        const w = map[0].length * ts;
        const h = map.length * ts;
        const groundGeo = new THREE.PlaneGeometry(w, h);
        const groundMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(w/2 - ts/2, 0, h/2 - ts/2);
        ground.receiveShadow = true;
        this.mapGroup.add(ground);
        
        // Render Pedestres
        if(THREE.CylinderGeometry) {
            const pGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
            const pMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b });
            this.pedestrians.forEach(p => {
                const mesh = new THREE.Mesh(pGeo, pMat);
                mesh.position.set(p.x, 1, p.z);
                mesh.castShadow = true;
                this.mapGroup.add(mesh);
                p.mesh = mesh;
            });
        }

        // ---------------------------------------------------------
        // GERADOR DE SEMÁFOROS (Somente em cruzamentos reais)
        // ---------------------------------------------------------
        const createTrafficLightModel = () => {
            const group = new THREE.Group();
            const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 3;
            group.add(pole);
            const boxGeo = new THREE.BoxGeometry(0.7, 2.0, 0.7);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(0, 5, 0.3);
            group.add(box);
            const lampGeo = new THREE.SphereGeometry(0.25, 12, 12);
            const red = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff0000, emissiveIntensity: 0 }));
            const yellow = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x222200, emissive: 0xffff00, emissiveIntensity: 0 }));
            const green = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x00ff00, emissiveIntensity: 0 }));
            red.position.set(0, 5.8, 0.9);
            yellow.position.set(0, 5, 0.9);
            green.position.set(0, 4.2, 0.9);
            
            group.add(red, yellow, green);
            return { group, red, yellow, green };
        };

        const step = 10;
        for (let r = 8; r < map.length - 2; r += step) {
            for (let c = 8; c < map[0].length - 2; c += step) {
                // Posicionamento nos cantos das calçadas (Right-hand lane corners)
                const configs = [
                    { x: (c - 0.7) * ts, z: (r - 0.7) * ts, ang: 0, off: false, tx: (c + 0.5) * ts, tz: (r - 1) * ts }, 
                    { x: (c + 1.7) * ts, z: (r + 1.7) * ts, ang: Math.PI, off: false, tx: (c + 0.5) * ts, tz: (r + 2) * ts },
                    { x: (c - 0.7) * ts, z: (r + 1.7) * ts, ang: -Math.PI/2, off: true, tx: (c - 1) * ts, tz: (r + 1.5) * ts },
                    { x: (c + 1.7) * ts, z: (r - 0.7) * ts, ang: Math.PI/2, off: true, tx: (c + 2) * ts, tz: (r + 0.5) * ts }
                ];

                configs.forEach(conf => {
                    const tl = createTrafficLightModel();
                    tl.group.position.set(conf.x, 0, conf.z);
                    tl.group.rotation.y = conf.ang;
                    this.mapGroup.add(tl.group);
                    this.trafficLights.push({
                        x: conf.x, z: conf.z, state: conf.off ? 'RED' : 'GREEN', 
                        timer: 0, meshGroup: tl.group, lamps: { red: tl.red, yellow: tl.yellow, green: tl.green },
                        triggerBox: new THREE.Box3().setFromCenterAndSize(
                            new THREE.Vector3(conf.tx, 1, conf.tz),
                            new THREE.Vector3(ts, 2, ts)
                        ),
                        punishedForCycle: false
                    });
                });
            }
        }
    }

    spawnPlayer() {
        if(this.playerMesh) {
            this.scene.remove(this.playerMesh);
        }
        
        const stats = CONFIG.VEHICLES[this.vehicleType];
        
        let spawnX = 5, spawnZ = 5;
        const cMap = MAPS[this.selectedMapIdx];
        outer: for(let r=0; r<cMap.length; r++) {
            for(let c=0; c<cMap[0].length; c++) {
                if(cMap[r][c] === 1) { spawnX = c; spawnZ = r; break outer; }
            }
        }
        
        this.physics = {
            x: spawnX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            z: spawnZ * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            angle: 0,
            speed: 0,
            drift: 0,
            stats: stats
        };
        
        // O carro precisa existir visualmente nas suas posições declaradas!
        // --- FALLBACK PRECIOSO ---
        const createScooter = (st) => {
            const g = new THREE.Group();
            const matBody = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.2 });
            const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const matChrome = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.05 });
            const matSkin = new THREE.MeshStandardMaterial({ color: 0xf5c6a0, roughness: 0.7 });
            const matJacket = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 });
            const matHelmet = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
            const matBox = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.1, roughness: 0.6 });

            // --- CORPO DA SCOOTER ---
            // Carenagem principal (arredondada)
            const carenGeo = new THREE.BoxGeometry(0.9, 0.6, 1.4);
            const caren = new THREE.Mesh(carenGeo, matBody);
            caren.position.set(0, 0.7, -0.1);
            caren.castShadow = true;
            g.add(caren);

            // Plataforma de pés
            const platGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
            const plat = new THREE.Mesh(platGeo, matBlack);
            plat.position.set(0, 0.35, 0);
            g.add(plat);

            // Paralama traseiro
            const fenderGeo = new THREE.BoxGeometry(0.5, 0.3, 0.6);
            const fender = new THREE.Mesh(fenderGeo, matBody);
            fender.position.set(0, 0.55, 0.7);
            g.add(fender);

            // Assento
            const seatGeo = new THREE.BoxGeometry(0.5, 0.15, 0.7);
            const seat = new THREE.Mesh(seatGeo, matBlack);
            seat.position.set(0, 1.05, 0.4);
            g.add(seat);

            // --- GUIDÃO E COLUNA ---
            // Coluna de direção
            const colGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
            const col = new THREE.Mesh(colGeo, matChrome);
            col.position.set(0, 1.1, -0.6);
            col.rotation.x = -0.3;
            g.add(col);

            // Guidão (barra horizontal)
            const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
            const bar = new THREE.Mesh(barGeo, matChrome);
            bar.rotation.z = Math.PI / 2;
            bar.position.set(0, 1.45, -0.7);
            g.add(bar);

            // Retrovisores
            const mirGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const mirL = new THREE.Mesh(mirGeo, matChrome);
            const mirR = new THREE.Mesh(mirGeo, matChrome);
            mirL.position.set(-0.5, 1.5, -0.7);
            mirR.position.set(0.5, 1.5, -0.7);
            g.add(mirL, mirR);

            // --- RODAS ---
            const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
            const wF = new THREE.Mesh(wGeo, matBlack);
            wF.rotation.z = Math.PI / 2;
            wF.position.set(0, 0.35, -0.9);
            wF.name = 'FrontWheel';
            g.add(wF);

            const wR = new THREE.Mesh(wGeo, matBlack);
            wR.rotation.z = Math.PI / 2;
            wR.position.set(0, 0.35, 0.9);
            wR.name = 'BackWheel';
            g.add(wR);

            // --- ENTREGADOR ---
            // Corpo/Torso
            const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.35);
            const torso = new THREE.Mesh(torsoGeo, matJacket);
            torso.position.set(0, 1.5, 0.2);
            torso.castShadow = true;
            g.add(torso);

            // Cabeça com Capacete
            const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
            const head = new THREE.Mesh(headGeo, matHelmet);
            head.position.set(0, 1.95, 0.15);
            head.castShadow = true;
            g.add(head);

            // Visor do Capacete
            const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
            const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.7 }));
            visor.position.set(0, 1.92, -0.02);
            g.add(visor);

            // Braços
            const armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
            const armL = new THREE.Mesh(armGeo, matJacket);
            const armR = new THREE.Mesh(armGeo, matJacket);
            armL.position.set(-0.35, 1.4, 0);
            armR.position.set(0.35, 1.4, 0);
            armL.rotation.x = -0.5;
            armR.rotation.x = -0.5;
            g.add(armL, armR);

            // --- BAÚL DE ENTREGA ---
            const boxGeo = new THREE.BoxGeometry(0.7, 0.5, 0.5);
            const box = new THREE.Mesh(boxGeo, matBox);
            box.position.set(0, 1.45, 0.85);
            box.castShadow = true;
            g.add(box);

            // Logo no baú (faixa)
            const logoGeo = new THREE.BoxGeometry(0.72, 0.12, 0.01);
            const logo = new THREE.Mesh(logoGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
            logo.position.set(0, 1.5, 1.11);
            g.add(logo);

            // --- LUZES ---
            // Farol frontal
            const hlGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const hl = new THREE.Mesh(hlGeo, new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 2 }));
            hl.position.set(0, 0.9, -0.85);
            g.add(hl);

            // Lanterna traseira
            const tlGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
            const tail = new THREE.Mesh(tlGeo, new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 }));
            tail.name = 'brakelight_rear';
            tail.position.set(0, 0.65, 1.0);
            g.add(tail);

            return g;
        };

        const createCar = (st) => {
            const g = new THREE.Group();
            const matPaint = new THREE.MeshStandardMaterial({ color: st.color, metalness: 0.85, roughness: 0.15 });
            const matBlack = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
            const matGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.45, metalness: 0.9, roughness: 0.05 });
            const matChrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 });

            // --- CARROCERIA PRINCIPAL ---
            // Base do corpo (mais largo no meio, mais baixo)
            const bodyGeo = new THREE.BoxGeometry(st.width * 0.95, 0.5, st.length * 0.95);
            const body = new THREE.Mesh(bodyGeo, matPaint);
            body.position.y = 0.65;
            body.castShadow = true;
            g.add(body);

            // Capô (frente, mais baixo que o corpo)
            const hoodGeo = new THREE.BoxGeometry(st.width * 0.9, 0.15, st.length * 0.3);
            const hood = new THREE.Mesh(hoodGeo, matPaint);
            hood.position.set(0, 0.82, -st.length * 0.3);
            hood.castShadow = true;
            g.add(hood);

            // Porta-malas (traseira, um pouco mais alto)
            const trunkGeo = new THREE.BoxGeometry(st.width * 0.9, 0.2, st.length * 0.25);
            const trunk = new THREE.Mesh(trunkGeo, matPaint);
            trunk.position.set(0, 0.8, st.length * 0.32);
            trunk.castShadow = true;
            g.add(trunk);

            // --- CABINE (Vidros) ---
            // Teto
            const roofGeo = new THREE.BoxGeometry(st.width * 0.82, 0.12, st.length * 0.38);
            const roof = new THREE.Mesh(roofGeo, matPaint);
            roof.position.set(0, 1.3, 0.05);
            roof.castShadow = true;
            g.add(roof);

            // Para-brisa frontal (inclinado)
            const wsGeo = new THREE.BoxGeometry(st.width * 0.78, 0.4, 0.08);
            const ws = new THREE.Mesh(wsGeo, matGlass);
            ws.position.set(0, 1.1, -st.length * 0.14);
            ws.rotation.x = 0.35;
            g.add(ws);

            // Vidro traseiro (inclinado)
            const rwGeo = new THREE.BoxGeometry(st.width * 0.75, 0.35, 0.08);
            const rw = new THREE.Mesh(rwGeo, matGlass);
            rw.position.set(0, 1.1, st.length * 0.17);
            rw.rotation.x = -0.35;
            g.add(rw);

            // Janelas laterais (esquerda e direita)
            const swGeo = new THREE.BoxGeometry(0.06, 0.3, st.length * 0.32);
            const swL = new THREE.Mesh(swGeo, matGlass);
            const swR = new THREE.Mesh(swGeo, matGlass);
            swL.position.set(-st.width * 0.42, 1.08, 0.02);
            swR.position.set(st.width * 0.42, 1.08, 0.02);
            g.add(swL, swR);

            // --- PARA-CHOQUES ---
            const bmpGeo = new THREE.BoxGeometry(st.width * 0.98, 0.18, 0.15);
            const bmpF = new THREE.Mesh(bmpGeo, matBlack);
            const bmpR = new THREE.Mesh(bmpGeo, matBlack);
            bmpF.position.set(0, 0.45, -st.length/2 + 0.05);
            bmpR.position.set(0, 0.45, st.length/2 - 0.05);
            g.add(bmpF, bmpR);

            // Grelha frontal
            const grillGeo = new THREE.BoxGeometry(st.width * 0.6, 0.2, 0.05);
            const grill = new THREE.Mesh(grillGeo, matBlack);
            grill.position.set(0, 0.6, -st.length/2 + 0.02);
            g.add(grill);

            // --- RETROVISORES ---
            const mirGeo = new THREE.BoxGeometry(0.12, 0.1, 0.15);
            const mirL = new THREE.Mesh(mirGeo, matPaint);
            const mirR = new THREE.Mesh(mirGeo, matPaint);
            mirL.position.set(-st.width/2 - 0.08, 0.95, -st.length * 0.12);
            mirR.position.set(st.width/2 + 0.08, 0.95, -st.length * 0.12);
            g.add(mirL, mirR);

            // --- RODAS ---
            const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
            const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12);
            const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
            const hubMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
            
            [{x: st.width/2, z: st.length/2 - 0.6}, {x: -st.width/2, z: st.length/2 - 0.6},
             {x: st.width/2, z: -st.length/2 + 0.6}, {x: -st.width/2, z: -st.length/2 + 0.6}].forEach((o, i) => {
                const w = new THREE.Mesh(wGeo, wMat);
                w.rotation.z = Math.PI/2;
                w.name = (i < 2 ? "FrontWheel" : "BackWheel");
                w.position.set(o.x, 0.38, o.z);
                g.add(w);
                // Calota
                const hub = new THREE.Mesh(hubGeo, hubMat);
                hub.rotation.z = Math.PI/2;
                hub.position.set(o.x > 0 ? o.x + 0.02 : o.x - 0.02, 0.38, o.z);
                g.add(hub);
            });

            // --- FARÓIS ---
            const hlGeo = new THREE.SphereGeometry(0.13, 8, 8);
            const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 2 });
            const hlL = new THREE.Mesh(hlGeo, hlMat);
            const hlR = new THREE.Mesh(hlGeo, hlMat);
            hlL.position.set(-st.width/3, 0.7, -st.length/2 + 0.02);
            hlR.position.set(st.width/3, 0.7, -st.length/2 + 0.02);
            g.add(hlL, hlR);

            // --- LANTERNAS TRASEIRAS ---
            const tlGeo = new THREE.BoxGeometry(0.25, 0.15, 0.08);
            const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
            const tlL = new THREE.Mesh(tlGeo, tlMat);
            const tlR = new THREE.Mesh(tlGeo, tlMat);
            tlL.name = 'brakelight_left'; tlR.name = 'brakelight_right';
            tlL.position.set(-st.width/3, 0.7, st.length/2 - 0.02);
            tlR.position.set(st.width/3, 0.7, st.length/2 - 0.02);
            g.add(tlL, tlR);

            return g;
        };

        const createTruck = (st) => {
            const g = new THREE.Group();
            const matPaint = new THREE.MeshStandardMaterial({ color: st.color, metalness: 0.7, roughness: 0.3 });
            const matBlack = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
            const matGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, metalness: 0.8, roughness: 0.1 });
            const matWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });

            // Cabine
            const cabGeo = new THREE.BoxGeometry(st.width * 0.85, 1.4, st.length * 0.3);
            const cab = new THREE.Mesh(cabGeo, matPaint);
            cab.position.set(0, 1.1, -st.length * 0.3);
            cab.castShadow = true;
            g.add(cab);

            // Para-brisa cabine
            const wsGeo = new THREE.BoxGeometry(st.width * 0.75, 0.6, 0.06);
            const ws = new THREE.Mesh(wsGeo, matGlass);
            ws.position.set(0, 1.5, -st.length * 0.46);
            g.add(ws);

            // Janelas laterais cabine
            const swGeo = new THREE.BoxGeometry(0.06, 0.5, st.length * 0.2);
            const swL = new THREE.Mesh(swGeo, matGlass);
            const swR = new THREE.Mesh(swGeo, matGlass);
            swL.position.set(-st.width * 0.44, 1.5, -st.length * 0.3);
            swR.position.set(st.width * 0.44, 1.5, -st.length * 0.3);
            g.add(swL, swR);

            // Baú de carga
            const boxGeo = new THREE.BoxGeometry(st.width * 0.95, 1.8, st.length * 0.55);
            const box = new THREE.Mesh(boxGeo, matWhite);
            box.position.set(0, 1.3, st.length * 0.18);
            box.castShadow = true;
            g.add(box);

            // Faixa decorativa no baú
            const stripeGeo = new THREE.BoxGeometry(st.width * 0.96, 0.15, 0.05);
            const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
            stripe.position.set(0, 1.2, st.length * 0.46);
            g.add(stripe);

            // Para-choques
            const bmpGeo = new THREE.BoxGeometry(st.width, 0.25, 0.2);
            const bmpF = new THREE.Mesh(bmpGeo, matBlack);
            bmpF.position.set(0, 0.5, -st.length/2 + 0.05);
            g.add(bmpF);

            // Grelha radiador
            const grillGeo = new THREE.BoxGeometry(st.width * 0.7, 0.5, 0.06);
            const grill = new THREE.Mesh(grillGeo, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 }));
            grill.position.set(0, 0.7, -st.length/2 + 0.02);
            g.add(grill);

            // 6 Rodas (duplas na traseira)
            const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
            const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
            // Dianteiras
            [{x: st.width/2, z: -st.length/2 + 1}, {x: -st.width/2, z: -st.length/2 + 1}].forEach((o, i) => {
                const w = new THREE.Mesh(wGeo, wMat);
                w.rotation.z = Math.PI/2;
                w.name = 'FrontWheel';
                w.position.set(o.x, 0.5, o.z);
                g.add(w);
            });
            // Traseiras (duplas)
            [{x: st.width/2, z: st.length/2 - 0.8}, {x: -st.width/2, z: st.length/2 - 0.8},
             {x: st.width/2 + 0.15, z: st.length/2 - 0.8}, {x: -st.width/2 - 0.15, z: st.length/2 - 0.8}].forEach((o) => {
                const w = new THREE.Mesh(wGeo, wMat);
                w.rotation.z = Math.PI/2;
                w.name = 'BackWheel';
                w.position.set(o.x, 0.5, o.z);
                g.add(w);
            });

            // Faróis
            const hlGeo = new THREE.BoxGeometry(0.35, 0.25, 0.08);
            const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 2 });
            const hlL = new THREE.Mesh(hlGeo, hlMat);
            const hlR = new THREE.Mesh(hlGeo, hlMat);
            hlL.position.set(-st.width/3, 0.8, -st.length/2 + 0.02);
            hlR.position.set(st.width/3, 0.8, -st.length/2 + 0.02);
            g.add(hlL, hlR);

            // Lanternas traseiras (altas, verticais)
            const tlGeo = new THREE.BoxGeometry(0.15, 0.5, 0.08);
            const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
            const tlL = new THREE.Mesh(tlGeo, tlMat);
            const tlR = new THREE.Mesh(tlGeo, tlMat);
            tlL.name = 'brakelight_left'; tlR.name = 'brakelight_right';
            tlL.position.set(-st.width * 0.45, 1.5, st.length/2 - 0.02);
            tlR.position.set(st.width * 0.45, 1.5, st.length/2 - 0.02);
            g.add(tlL, tlR);

            // Retrovisores
            const mirGeo = new THREE.BoxGeometry(0.15, 0.12, 0.2);
            const mirL = new THREE.Mesh(mirGeo, matBlack);
            const mirR = new THREE.Mesh(mirGeo, matBlack);
            mirL.position.set(-st.width/2 - 0.12, 1.6, -st.length * 0.35);
            mirR.position.set(st.width/2 + 0.12, 1.6, -st.length * 0.35);
            g.add(mirL, mirR);

            return g;
        };

        const createDetailedVehicleFallback = (st, type) => {
            if (type === 'moto') return createScooter(st);
            if (type === 'truck') return createTruck(st);
            return createCar(st);
        };

        // Carrega o modelo Real ou usa o detalhado como fallback instantâneo
        this.playerMesh = createDetailedVehicleFallback(stats, this.vehicleType);
        this.playerMesh.position.set(this.physics.x, 0, this.physics.z);
        this.scene.add(this.playerMesh);

        // Inicializa luzes de freio do fallback
        this.brakeLights = [];
        this.playerMesh.traverse(c => {
            if(c.name && c.name.toLocaleLowerCase().includes('brakelight')) {
                this.brakeLights.push(c);
            }
        });

        this.loader.load(stats.modelPath, (gltf) => {
            this.scene.remove(this.playerMesh);
            this.playerMesh = gltf.scene;
            this.playerMesh.traverse(child => {
                if(child.isMesh) {
                    child.castShadow = true;
                    if(child.material) {
                        // Aplica Materiais PBR Conforme Documentação
                        const isGlass = child.name.toLocaleLowerCase().includes('glass') || child.name.toLocaleLowerCase().includes('vidro');
                        const isTire = child.name.toLocaleLowerCase().includes('wheel') || child.name.toLocaleLowerCase().includes('tire') || child.name.toLocaleLowerCase().includes('roda');
                        
                        if(isGlass) {
                            child.material.transparent = true;
                            child.material.opacity = 0.4;
                            child.material.metalness = 0.9;
                            child.material.roughness = 0.1;
                        } else if(isTire) {
                            child.material.metalness = 0;
                            child.material.roughness = 0.9;
                        } else {
                            child.material.metalness = 0.8;
                            child.material.roughness = 0.2;
                        }
                    }
                }
            });
            this.playerMesh.position.set(this.physics.x, 0, this.physics.z);
            this.scene.add(this.playerMesh);

            // Luzes de Freio (Tags Reativas)
            this.brakeLights = [];
            this.playerMesh.traverse(c => {
                if(c.name.toLocaleLowerCase().includes('brakelight') || c.name.toLocaleLowerCase().includes('lanterna')) {
                    this.brakeLights.push(c);
                    c.material.emissive = new THREE.Color(0xff0000);
                    c.material.emissiveIntensity = 0;
                }
            });

            // Recalcular Hitbox baseada no modelo real
            const box = new THREE.Box3().setFromObject(this.playerMesh);
            const size = new THREE.Vector3();
            box.getSize(size);
            this.physics.stats.width = size.x;
            this.physics.stats.height = size.y;
            this.physics.stats.length = size.z;
            
        }, undefined, (err) => {
            console.warn("Modelo .glb não encontrado, usando fallback processual.");
        });

        // Faróis Dinâmicos
        const fl = new THREE.SpotLight(0xffffee, 3, 50, Math.PI/6, 0.5);
        fl.position.set(0, 1.2, -stats.length/2);
        fl.target.position.set(0, 0, -stats.length/2 - 15);
        this.playerMesh.add(fl);
        this.playerMesh.add(fl.target);
    }

    initDOM() {
        const attachClick = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; }
        
        document.querySelectorAll('.veh-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.veh-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.vehicleType = b.dataset.veh;
                this.spawnPlayer();
            };
        });
        
        document.querySelectorAll('.map-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.map-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.buildMap();
                this.spawnPlayer();
                this.spawnRandomObjective();
            };
        });

        attachClick('start-btn', () => this.checkTutorial());
        attachClick('restart-btn', () => this.changeState('MENU'));
        attachClick('restart-btn-succ', () => this.changeState('MENU'));
        attachClick('menu-btn-fail', () => this.changeState('MENU'));
        attachClick('menu-btn-success', () => this.changeState('MENU'));
        
        attachClick('settings-btn', () => {
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('settings-screen').classList.remove('hidden');
        });
        attachClick('close-settings-btn', () => {
            document.getElementById('settings-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.remove('hidden');
        });
        attachClick('trophies-btn', () => {
            this.renderTrophies();
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('trophies-screen').classList.remove('hidden');
        });
        attachClick('close-trophies-btn', () => {
            document.getElementById('trophies-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.remove('hidden');
        });

        const mv = document.getElementById('master-vol'), mu = document.getElementById('music-vol'), sx = document.getElementById('sfx-vol');
        if(mv && mu && sx) {
            mv.oninput = e => this.audio.setVolumes(e.target.value, mu.value, sx.value);
            mu.oninput = e => this.audio.setVolumes(mv.value, e.target.value, sx.value);
            sx.oninput = e => this.audio.setVolumes(mv.value, mu.value, e.target.value);
        }

        document.querySelectorAll('.next-tut-btn').forEach(b => {
            b.onclick = () => {
                b.parentElement.parentElement.classList.add('hidden');
                document.getElementById('tutorial-' + b.dataset.next).classList.remove('hidden');
            };
        });
        document.querySelectorAll('.skip-tut-btn').forEach(b => { b.onclick = () => this.startDelivery(); });
        const ftut = document.querySelector('.finish-tut-btn'); if(ftut) ftut.onclick = () => this.startDelivery();

        // Inicializar Mundo pela primeira vez!
        this.buildMap();
        this.spawnPlayer();
        this.spawnRandomObjective();
        
        // Força a camera a ir pro carro de menu
        this.camera.position.set(this.physics.x, 10, this.physics.z + 15);
        this.camera.lookAt(this.physics.x, 0, this.physics.z);
    }

    checkTutorial() {
        if (!localStorage.getItem('tutorialSeen3D')) {
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('tutorial-1').classList.remove('hidden');
            localStorage.setItem('tutorialSeen3D', 'true');
        } else {
            this.startDelivery();
        }
    }

    spawnRandomObjective() {
        if(this.goalMesh) {
            this.mapGroup.remove(this.goalMesh);
        }

        const map = MAPS[this.selectedMapIdx];
        const ts = CONFIG.TILE_SIZE;
        const validTiles = [];
        
        // Coletar todos os tiles de calçada (ID 2)
        for(let r=0; r<map.length; r++) {
            for(let c=0; c<map[0].length; c++) {
                if(map[r][c] === 2) {
                    // Calcular distância em relação ao player (Spawn) em tiles
                    const playerTileX = Math.floor(this.physics.x / ts);
                    const playerTileZ = Math.floor(this.physics.z / ts);
                    const distTile = Math.hypot(c - playerTileX, r - playerTileZ);
                    
                    if(distTile > 15) { // Distância mínima de 15 tiles
                        validTiles.push({ r, c });
                    }
                }
            }
        }
        
        if(validTiles.length > 0) {
            const pick = validTiles[Math.floor(Math.random() * validTiles.length)];
            const x = pick.c * ts;
            const z = pick.r * ts;
            
            const gGeo = new THREE.CylinderGeometry(ts/3, ts/3, 20, 16);
            const gMat = new THREE.MeshPhongMaterial({ 
                color: 0xfacc15, 
                transparent: true, 
                opacity: 0.5, 
                emissive: 0xfacc15,
                emissiveIntensity: 2
            });
            const goal = new THREE.Mesh(gGeo, gMat);
            goal.position.set(x, 10, z);
            
            this.mapGroup.add(goal);
            this.goalMesh = goal;
            this.goalPos = { x, z, radius: ts };
        }
    }

    startDelivery() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('level-start-screen').classList.remove('hidden');
        
        this.score = 100;
        this.infractionsLog = { bumps: 0, redlights: 0, pedestrians: 0 };
        this.audio.start();
        this.buildMap();
        this.spawnPlayer();
        this.spawnRandomObjective();

        // Mostrar Mensagem de Nova Entrega
        const msg = document.createElement('div');
        msg.innerHTML = "📍 NOVA ENTREGA LOCALIZADA:<br><small>SIGA O GPS NO MINI-MAPA</small>";
        msg.style.cssText = "position:absolute; top:20%; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.9); color:#facc15; padding:20px 40px; border-radius:15px; text-align:center; font-weight:800; border:2px solid #facc15; z-index:1000; animation: fadeOut 3s forwards; pointer-events:none; font-family:'Outfit',sans-serif;";
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 4000);

        let count = 3;
        const counter = document.getElementById('start-countdown');
        counter.innerText = count;
        
        const tick = setInterval(() => {
            count--;
            if(count > 0) {
                counter.innerText = count;
            } else {
                clearInterval(tick);
                document.getElementById('level-start-screen').classList.add('hidden');
                this.startTime = Date.now();
                this.changeState('PLAYING');
            }
        }, 1000);
    }

    changeState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');

        if (newState === 'MENU') {
            document.getElementById('menu-screen').classList.remove('hidden');
            this.audio.stopMotor();
        }
        if (newState === 'PLAYING') {
            document.getElementById('hud').classList.remove('hidden');
            if(!this.audio.engineSound.isPlaying && this.audio.enabled) this.audio.engineSound.play();
        }
        if (newState === 'GAME_OVER') {
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.audio.stopMotor();
        }
        if (newState === 'SUCCESS') {
            document.getElementById('success-screen').classList.remove('hidden');
            this.audio.stopMotor();
            this.processEndgame();
        }
    }

    processEndgame() {
        document.getElementById('final-score').innerText = this.score;
        let stars = 0;
        if(this.score >= 90) stars = 3;
        else if(this.score >= 60) stars = 2;
        else if(this.score > 0) stars = 1;
        
        const scnt = document.getElementById('star-rating');
        if(scnt) {
            scnt.innerHTML = '';
            for(let i=0; i<3; i++) { scnt.innerHTML += i < stars ? '★' : '<span style="color:#555">★</span>'; }
        }
        
        if (!this.achievements.primeiraEntrega) this.unlockAchievement('primeiraEntrega');
        if (this.infractionsLog.bumps === 0 && !this.achievements.escudoPrata) this.unlockAchievement('escudoPrata');
        if (this.infractionsLog.redlights === 0 && !this.achievements.cidadaoExemplar) this.unlockAchievement('cidadaoExemplar');
        if (this.infractionsLog.pedestrians === 0 && !this.achievements.anjoDaGuarda) this.unlockAchievement('anjoDaGuarda');
        if (this.vehicleType === 'moto' && this.infractionsLog.bumps === 0 && !this.achievements.equilibrista) this.unlockAchievement('equilibrista');
    }

    unlockAchievement(id) {
        this.achievements[id] = true;
        localStorage.setItem('deliveryAchievements', JSON.stringify(this.achievements));
        
        const def = ACHIEVEMENTS_DEF[id];
        const aname = document.getElementById('ach-name');
        if(aname) aname.innerText = def.name;
        const banner = document.getElementById('achievement-banner');
        if(banner) {
            banner.classList.remove('hidden');
            setTimeout(() => banner.classList.add('show'), 100);
            setTimeout(() => {
                banner.classList.remove('show');
                setTimeout(() => banner.classList.add('hidden'), 500);
            }, 4000);
        }
    }

    renderTrophies() {
        const container = document.getElementById('trophies-list');
        if(!container) return;
        container.innerHTML = '';
        for(let k in ACHIEVEMENTS_DEF) {
            const unlocked = this.achievements[k];
            const t = ACHIEVEMENTS_DEF[k];
            container.innerHTML += `
                <div class="trophy-item ${unlocked ? '' : 'locked'}">
                    <div style="font-size:32px">${t.icon}</div>
                    <div>
                        <div style="font-weight:bold">${t.name}</div>
                        <div style="font-size:12px; color:#aaa">${t.desc}</div>
                    </div>
                </div>
            `;
        }
    }

    updatePhysics() {
        if(!this.physics || !this.playerMesh) return;
        const p = this.physics;
        const stats = p.stats;
        
        if (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp')) p.speed += stats.accel;
        else if (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown')) p.speed -= stats.brake;
        else { p.speed *= 0.98; if(Math.abs(p.speed) < 0.01) p.speed = 0; }
        
        if (this.input.isPressed('KeyH')) this.audio.playHorn();
        
        if (p.speed > stats.maxSpeed) p.speed = stats.maxSpeed;
        if (p.speed < -stats.maxSpeed * 0.4) p.speed = -stats.maxSpeed * 0.4;
        
        const speedRatio = Math.abs(p.speed) / stats.maxSpeed;
        
        let turn = stats.turn / (1 + speedRatio);
        if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) p.angle += turn;
        if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) p.angle -= turn;
        
        // Efeitos de Partículas Dinâmicos
        this.frameCounter++;
        if(this.frameCounter % 3 === 0) {
            const exhaustX = p.x + Math.sin(p.angle) * stats.length/2;
            const exhaustZ = p.z + Math.cos(p.angle) * stats.length/2;
            
            // Fumaça de escapamento
            if(this.input.isPressed('KeyW') || Math.abs(p.speed) < 0.1) {
                this.particles.emit(exhaustX, 0.5, exhaustZ, 'smoke', 1);
            }
            
            // Poeira de pneus (Freio ou Calçada)
            const map = MAPS[this.selectedMapIdx];
            const tileX = Math.floor(p.x / CONFIG.TILE_SIZE);
            const tileZ = Math.floor(p.z / CONFIG.TILE_SIZE);
            const currentTile = (tileX >= 0 && tileX < map[0].length && tileZ >= 0 && tileZ < map.length) ? map[tileZ][tileX] : 0;

            if((this.input.isPressed('KeyS') && Math.abs(p.speed) > 0.3) || currentTile === 2) {
                this.particles.emit(p.x, 0.2, p.z, 'dust', 1);
            }
        }
        
        // ----------------------------------------
        // ANIMAÇÃO DE SUSPENSÃO E DINÂMICA (Game Feel)
        // ----------------------------------------
        // Roll (Curva): Inclina pro lado oposto ao giro (Carro/Caminhão)
        // Lean (Moto): Inclina pro MESMO lado do giro
        let rollTarget = 0;
        let pitchTarget = 0;
        let leanFactor = this.vehicleType === 'moto' ? -0.3 : 0.08;
        
        if (speedRatio > 0.1) {
            if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) rollTarget = leanFactor;
            if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) rollTarget = -leanFactor;
            
            // Pitch (Frenagem/Aceleração)
            if (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown')) pitchTarget = 0.05; 
            if (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp')) pitchTarget = -0.02;
        }

        // Luzes de Freio Reativas
        if (this.brakeLights) {
            const isBraking = this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown');
            this.brakeLights.forEach(l => l.material.emissiveIntensity = isBraking ? 3 : 0.2);
        }

        // Interpolação suave
        this.playerMesh.rotation.z += (rollTarget - this.playerMesh.rotation.z) * 0.1;
        this.playerMesh.rotation.x += (pitchTarget - this.playerMesh.rotation.x) * 0.1;

        // Rotação de Rodas (Visual)
        this.wheelRotation += p.speed * 2;
        this.playerMesh.traverse(child => {
            const name = child.name.toLocaleLowerCase();
            if(name.includes('wheel') || name.includes('roda')) {
                child.rotation.x = this.wheelRotation;
                // Rodas dianteiras esterçam
                if(name.includes('front') || name.includes('diant')) {
                    let steering = 0;
                    if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) steering = 0.4;
                    if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) steering = -0.4;
                    child.rotation.y = steering;
                }
            }
        });

        // Movimento vetorial baseado no Angulo do veículo
        const nextX = p.x - Math.sin(p.angle) * p.speed;
        const nextZ = p.z - Math.cos(p.angle) * p.speed;
        
        // Checagem segura de colisao (AABB)
        const carBox = new THREE.Box3();
        carBox.setFromCenterAndSize(
            new THREE.Vector3(nextX, stats.height/2, nextZ),
            new THREE.Vector3(stats.width, stats.height, stats.length)
        );
        
        let hit = false;
        for (let b of this.colliders) {
            if (carBox.intersectsBox(b)) { hit = true; break; }
        }
        
        if (hit) {
            p.speed *= -0.5;
            this.score -= 10;
            this.infractionsLog.bumps++;
            this.audio.playCrash();
            
            // Faíscas de Impacto
            this.particles.emit(nextX, 1, nextZ, 'sparks', 10);
            
            const flash = document.getElementById('damage-flash');
            if(flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 100); }
            if (this.score <= 0) {
                document.getElementById('fail-reason').innerText = "Veículo destruído por múltiplas colisões!";
                this.changeState('GAME_OVER');
                return;
            }
        } else {
            p.x = nextX;
            p.z = nextZ;
        }

        // Aplicar a Física pro Modelo Visual
        this.playerMesh.position.set(p.x, stats.height/2, p.z);
        this.playerMesh.rotation.y = p.angle;
        
        // Conclusao Missao
        if (this.goalPos) {
            const dist = Math.hypot(p.x - this.goalPos.x, p.z - this.goalPos.z);
            if (dist < 10) {
                this.changeState('SUCCESS');
                return;
            }
        }
        
        // Pedestres Ray/Area check
        this.pedestrians.forEach(ped => {
            const d = Math.hypot(p.x - ped.x, p.z - ped.z);
            if(d < 3 && !ped.hit) {
                ped.hit = true;
                this.score -= 30;
                this.infractionsLog.pedestrians++;
                const wn = document.getElementById('pedestrian-warning');
                if(wn) { wn.classList.remove('hidden'); setTimeout(() => wn.classList.add('hidden'), 1000); }
            }
        });

        // ----------------------------------------
        // ATUALIZAÇÃO DA CÂMERA FOLLOW (TERCEIRA PESSOA GTA)
        // ----------------------------------------
        const targetFov = CONFIG.CAMERA.FOV_MIN + (CONFIG.CAMERA.FOV_MAX - CONFIG.CAMERA.FOV_MIN) * speedRatio;
        this.camera.fov += (targetFov - this.camera.fov) * 0.05;
        this.camera.updateProjectionMatrix();

        // O offsetZ positivo coloca a câmera ATRÁS do carro (que move na direcao negativa Z)
        const camTargetX = p.x + Math.sin(p.angle) * CONFIG.CAMERA.OFFSET_Z;
        const camTargetZ = p.z + Math.cos(p.angle) * CONFIG.CAMERA.OFFSET_Z;
        
        // Câmera persegue suavemente a traseira do carro do alto (Y)
        this.camera.position.x += (camTargetX - this.camera.position.x) * 0.1;
        this.camera.position.z += (camTargetZ - this.camera.position.z) * 0.1;
        this.camera.position.y += (CONFIG.CAMERA.OFFSET_Y - this.camera.position.y) * 0.1;
        
        // Câmera DEVE olhar exatamente para a posição do carro levemente superior para nao clipar o chao
        this.camera.lookAt(p.x, stats.height + 1, p.z);

        // Atualização dos números da HUD HTML
        const spdHtml = document.getElementById('speed-val');
        const scHtml = document.getElementById('score-val');
        const barHtml = document.getElementById('integrity-bar');
        if(spdHtml) spdHtml.innerText = Math.floor(Math.abs(p.speed) * 150);
        if(scHtml) scHtml.innerText = this.score;
        if(barHtml) barHtml.style.width = Math.max(0, this.score) + '%';
        
        this.audio.update(speedRatio, this.infractionsLog.bumps);
    }
    
    updateAI() {
        this.trafficLights.forEach(tl => {
            tl.timer += 1/60; // Baseado em 60fps
            
            // Ciclo: Verde (10s), Amarelo (3s), Vermelho (10s)
            if (tl.state === 'GREEN' && tl.timer >= 10) { tl.state = 'YELLOW'; tl.timer = 0; }
            else if (tl.state === 'YELLOW' && tl.timer >= 3) { tl.state = 'RED'; tl.timer = 0; }
            else if (tl.state === 'RED' && tl.timer >= 10) { tl.state = 'GREEN'; tl.timer = 0; tl.punishedForCycle = false; }
            
            // Atualiza brilho emissivo
            tl.lamps.red.material.emissiveIntensity = tl.state === 'RED' ? 2 : 0;
            tl.lamps.yellow.material.emissiveIntensity = tl.state === 'YELLOW' ? 2 : 0;
            tl.lamps.green.material.emissiveIntensity = tl.state === 'GREEN' ? 2 : 0;
            
            // Detecção de Infração por Trigger Zone
            if (tl.state === 'RED' && this.state === 'PLAYING' && this.physics) {
                const carPos = new THREE.Vector3(this.physics.x, 1, this.physics.z);
                if (tl.triggerBox.containsPoint(carPos) && Math.abs(this.physics.speed) > 0.05 && !tl.punishedForCycle) {
                    this.score -= 20;
                    this.infractionsLog.redlights++;
                    tl.punishedForCycle = true;
                    this.audio.playHorn(); // Aviso sonoro de infração
                    const w = document.getElementById('traffic-warning');
                    if(w) { w.classList.remove('hidden'); setTimeout(()=>w.classList.add('hidden'), 1500); }
                }
            }
        });
        
        if(this.state === 'PLAYING' && this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const m = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const s = Math.floor((elapsed % 60000)/1000).toString().padStart(2, '0');
            const tv = document.getElementById('timer-val');
            if(tv) tv.innerText = `${m}:${s}`;
        }
    }

    drawMinimap() {
        if (!this.minimapCtx || !this.physics) return;
        const ctx = this.minimapCtx;
        const p = this.physics;
        const map = MAPS[this.selectedMapIdx];
        const ts = CONFIG.TILE_SIZE;
        const size = 200;
        const center = size / 2;
        const zoom = 4; // Zoom level (pixels per meter roughly)

        ctx.clearRect(0, 0, size, size);

        // Clip circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, center - 4, 0, Math.PI * 2);
        ctx.clip();

        // Rotate map around player
        ctx.translate(center, center);
        ctx.rotate(p.angle); // Map rotates with player angle to keep player facing up
        
        // Draw Map Tiles (Optimization: only draw visible tiles area)
        const radius = (center / zoom) + 10;
        const mapRowStart = Math.max(0, Math.floor((p.z / ts) - (radius / ts)));
        const mapRowEnd = Math.min(map.length, Math.ceil((p.z / ts) + (radius / ts)));
        const mapColStart = Math.max(0, Math.floor((p.x / ts) - (radius / ts)));
        const mapColEnd = Math.min(map[0].length, Math.ceil((p.x / ts) + (radius / ts)));

        for (let r = mapRowStart; r < mapRowEnd; r++) {
            for (let c = mapColStart; c < mapColEnd; c++) {
                const tile = map[r][c];
                if (tile === 1 || tile === 2 || tile === 4) { // Roads, sidewalks, goal row
                    ctx.fillStyle = (tile === 4) ? '#22c55e' : (tile === 1 ? '#444' : '#222');
                    ctx.fillRect(
                        (c * ts - p.x) * zoom,
                        (r * ts - p.z) * zoom,
                        ts * zoom,
                        ts * zoom
                    );
                } else if (tile === 3) { // Buildings
                    ctx.fillStyle = '#111';
                    ctx.fillRect(
                        (c * ts - p.x) * zoom,
                        (r * ts - p.z) * zoom,
                        ts * zoom,
                        ts * zoom
                    );
                }
            }
        }

        // Draw Goal if outside visible range (compass style)
        if(this.goalPos) {
            const dx = (this.goalPos.x - p.x) * zoom;
            const dz = (this.goalPos.z - p.z) * zoom;
            const dist = Math.hypot(dx, dz);
            
            if (dist > (center - 15)) {
                const angle = Math.atan2(dz, dx);
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * (center - 15), Math.sin(angle) * (center - 15), 5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#facc15';
                ctx.shadowBlur = 10; ctx.shadowColor = '#facc15';
                ctx.beginPath();
                ctx.arc(dx, dz, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();

        // Draw Player Arrow (Fixed at center, pointing up)
        ctx.save();
        ctx.translate(center, center);
        ctx.fillStyle = '#4facfe';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 4);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    loop() {
        if (!this.scene) return;
        
        if (this.state === 'PLAYING') {
            this.updatePhysics();
            this.updateAI();
            this.drawMinimap();
        } else if (this.state === 'MENU' && this.physics && this.camera) {
            // Câmera Rotacionando no Carro quando está no Menu
            const time = Date.now() * 0.0005;
            this.camera.position.x = this.physics.x + Math.sin(time) * 15;
            this.camera.position.z = this.physics.z + Math.cos(time) * 15;
            this.camera.position.y = 8;
            this.camera.lookAt(this.physics.x, 0, this.physics.z);
        }
        
        if (this.score <= 0 && this.state === 'PLAYING') {
            const fail = document.getElementById('fail-reason');
            if(fail) fail.innerText = "Você zerou seus pontos com infrações constantes.";
            this.changeState('GAME_OVER');
        }

        if(this.renderer && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Inicia o jogo depois que carregar a DOM pra previnir undefined em elementos HTMl
window.addEventListener('DOMContentLoaded', () => {
    new Game3D();
});
