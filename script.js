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
            if(this.engineSound) { this.engineSound.setBuffer(buf); this.engineSound.setLoop(true); this.engineSound.setVolume(0.5); }
        }, undefined, () => {});
        loader.load('assets/sounds/horn.mp3', buf => this.hornSound.setBuffer(buf), undefined, () => {});
        loader.load('assets/sounds/crash.wav', buf => this.crashSound.setBuffer(buf), undefined, () => {});
        loader.load('assets/sounds/music_safe.mp3', buf => {
            if(this.musicSafe) { this.musicSafe.setBuffer(buf); this.musicSafe.setLoop(true); this.musicSafe.setVolume(0.5); }
        }, undefined, () => {});
        loader.load('assets/sounds/music_tense.mp3', buf => {
            if(this.musicTense) { this.musicTense.setBuffer(buf); this.musicTense.setLoop(true); this.musicTense.setVolume(0); }
        }, undefined, () => {});
        
        this.enabled = false;
    }

    start() {
        if (this.enabled) return;
        this.enabled = true;
        if(this.engineSound && this.engineSound.buffer) this.engineSound.play();
        if(this.musicSafe && this.musicSafe.buffer) this.musicSafe.play();
        if(this.musicTense && this.musicTense.buffer) this.musicTense.play();
    }

    setVolumes(master, music, sfx) {
        this.listener.setMasterVolume(master);
        if(this.musicSafe && this.musicSafe.isPlaying) this.musicSafe.setVolume(music);
        if(this.engineSound && this.engineSound.isPlaying) this.engineSound.setVolume(sfx * 0.5);
        if(this.crashSound && this.crashSound.isPlaying) this.crashSound.setVolume(sfx);
        if(this.hornSound && this.hornSound.isPlaying) this.hornSound.setVolume(sfx);
    }

    update(speedRatio, infractions) {
        if (!this.enabled) return;
        if(this.engineSound && this.engineSound.isPlaying) this.engineSound.setPlaybackRate(0.8 + speedRatio * 1.5);
        
        let tenseTarget = (speedRatio > 0.8 || infractions > 0) ? 1.0 : 0.0;
        if (this.musicSafe && this.musicSafe.isPlaying && this.musicTense && this.musicTense.isPlaying) {
            const mVol = document.getElementById('music-vol') ? parseFloat(document.getElementById('music-vol').value) : 0.5;
            const curTense = this.musicTense.getVolume();
            const curSafe = this.musicSafe.getVolume();
            this.musicTense.setVolume(curTense + (tenseTarget * mVol - curTense) * 0.05);
            this.musicSafe.setVolume(curSafe + ((1 - tenseTarget) * mVol - curSafe) * 0.05);
        }
    }

    playHorn() { if(this.enabled && this.hornSound && this.hornSound.buffer && !this.hornSound.isPlaying) this.hornSound.play(); }
    playCrash() { if(this.enabled && this.crashSound && this.crashSound.buffer) { if(this.crashSound.isPlaying) this.crashSound.stop(); this.crashSound.play(); } }
    stopMotor() { if(this.engineSound && this.engineSound.isPlaying) this.engineSound.pause(); }
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
                if(p.mesh.geometry) p.mesh.geometry.dispose();
                if(p.mesh.material) p.mesh.material.dispose();
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
        if(this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
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
            const obj = this.mapGroup.children[0];
            this.mapGroup.remove(obj); 
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) {
                if(Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
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
        
        // 2. CALÇADAS
        const sGeo = new THREE.BoxGeometry(ts, 0.2, ts);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x475569 }); 
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
                    const walkAngle = Math.random() * Math.PI * 2;
                    this.pedestrians.push({
                        x: x + (Math.random()-0.5)*ts,
                        z: z + (Math.random()-0.5)*ts,
                        walkAngle: walkAngle,
                        walkSpeed: 0.01 + Math.random() * 0.015,
                        mesh: null,
                        hit: false
                    });
                }
            }
        }
        this.mapGroup.add(bInst);
        this.mapGroup.add(sInst);

        // BARREIRAS DE MAPA (Limites Físicos)
        const mapWidth = map[0].length * ts;
        const mapHeight = map.length * ts;
        this.colliders.push(
            new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(0, 50, mapHeight + 10)), // Esquerda
            new THREE.Box3(new THREE.Vector3(mapWidth, 0, -10), new THREE.Vector3(mapWidth + 10, 50, mapHeight + 10)), // Direita
            new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(mapWidth + 10, 50, 0)), // Topo
            new THREE.Box3(new THREE.Vector3(-10, 0, mapHeight), new THREE.Vector3(mapWidth + 10, 50, mapHeight + 10)) // Fundo
        );

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
        const shirtColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf97316];
        const createPedestrianModel = () => {
            const g = new THREE.Group();
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.7 });
            const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
            const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
            const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
            const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
            const head = new THREE.Mesh(headGeo, skinMat);
            head.position.y = 1.65; head.castShadow = true; g.add(head);
            const torsoGeo = new THREE.BoxGeometry(0.45, 0.55, 0.3);
            const torso = new THREE.Mesh(torsoGeo, shirtMat);
            torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
            const legGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);
            const legL = new THREE.Mesh(legGeo, pantsMat);
            const legR = new THREE.Mesh(legGeo, pantsMat);
            legL.position.set(-0.12, 0.6, 0); legR.position.set(0.12, 0.6, 0);
            g.add(legL, legR);
            return g;
        };

        this.pedestrians.forEach(p => {
            const mesh = createPedestrianModel();
            mesh.position.set(p.x, 0, p.z);
            mesh.rotation.y = Math.random() * Math.PI * 2;
            this.mapGroup.add(mesh);
            p.mesh = mesh;
        });

        // SEMÁFOROS
        const createTrafficLightModel = () => {
            const group = new THREE.Group();
            const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 3; group.add(pole);
            const boxGeo = new THREE.BoxGeometry(0.7, 2.0, 0.7);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(0, 5, 0.3); group.add(box);
            const lampGeo = new THREE.SphereGeometry(0.25, 12, 12);
            const red = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff0000, emissiveIntensity: 0 }));
            const yellow = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x222200, emissive: 0xffff00, emissiveIntensity: 0 }));
            const green = new THREE.Mesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x00ff00, emissiveIntensity: 0 }));
            red.position.set(0, 5.8, 0.9); yellow.position.set(0, 5, 0.9); green.position.set(0, 4.2, 0.9);
            group.add(red, yellow, green);
            return { group, red, yellow, green };
        };

        const step = 10;
        for (let r = 8; r < map.length - 2; r += step) {
            for (let c = 8; c < map[0].length - 2; c += step) {
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
        if(this.playerMesh) { this.scene.remove(this.playerMesh); }
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
            angle: Math.PI,
            speed: 0,
            stats: stats
        };
        const createCar = (st) => {
            const g = new THREE.Group();
            const matPaint = new THREE.MeshStandardMaterial({ color: st.color, metalness: 0.85, roughness: 0.15 });
            const bodyGeo = new THREE.BoxGeometry(st.width, st.height, st.length);
            const body = new THREE.Mesh(bodyGeo, matPaint);
            body.position.y = st.height/2; body.castShadow = true; g.add(body);
            return g;
        };
        this.playerMesh = createCar(stats);
        this.playerMesh.position.set(this.physics.x, 0, this.physics.z);
        this.scene.add(this.playerMesh);
        this.loader.load(stats.modelPath, (gltf) => {
            this.scene.remove(this.playerMesh);
            this.playerMesh = gltf.scene;
            this.playerMesh.position.set(this.physics.x, 0, this.physics.z);
            this.scene.add(this.playerMesh);
        }, undefined, () => {});
    }

    initDOM() {
        const attachClick = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; }
        document.querySelectorAll('.veh-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.veh-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active'); this.vehicleType = b.dataset.veh; this.spawnPlayer();
            };
        });
        attachClick('start-btn', () => this.checkTutorial());
        attachClick('restart-btn', () => this.changeState('MENU'));
        attachClick('restart-btn-succ', () => this.changeState('MENU'));
        this.buildMap(); this.spawnPlayer(); this.spawnRandomObjective();
    }

    checkTutorial() {
        if (!localStorage.getItem('tutorialSeen3D')) {
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('tutorial-1').classList.remove('hidden');
            localStorage.setItem('tutorialSeen3D', 'true');
        } else { this.startDelivery(); }
    }

    spawnRandomObjective() {
        if(this.goalMesh) this.mapGroup.remove(this.goalMesh);
        const map = MAPS[this.selectedMapIdx];
        const ts = CONFIG.TILE_SIZE;
        const validTiles = [];
        for(let r=0; r<map.length; r++) {
            for(let c=0; c<map[0].length; c++) {
                if(map[r][c] === 2) validTiles.push({ r, c });
            }
        }
        if(validTiles.length > 0) {
            const pick = validTiles[Math.floor(Math.random() * validTiles.length)];
            const x = pick.c * ts; const z = pick.r * ts;
            const gGeo = new THREE.CylinderGeometry(ts/3, ts/3, 20, 16);
            const gMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, transparent: true, opacity: 0.5, emissive: 0xfacc15, emissiveIntensity: 2 });
            const goal = new THREE.Mesh(gGeo, gMat); goal.position.set(x, 10, z);
            this.mapGroup.add(goal); this.goalMesh = goal; this.goalPos = { x, z, radius: ts };
        }
    }

    startDelivery() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('level-start-screen').classList.remove('hidden');
        this.score = 100; this.infractionsLog = { bumps: 0, redlights: 0, pedestrians: 0 };
        this.audio.start(); this.buildMap(); this.spawnPlayer(); this.spawnRandomObjective();
        let count = 3;
        const counter = document.getElementById('start-countdown');
        counter.innerText = count;
        const tick = setInterval(() => {
            count--; if(count > 0) counter.innerText = count;
            else { clearInterval(tick); document.getElementById('level-start-screen').classList.add('hidden'); this.startTime = Date.now(); this.changeState('PLAYING'); }
        }, 1000);
    }

    changeState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');
        if (newState === 'MENU') { document.getElementById('menu-screen').classList.remove('hidden'); this.audio.stopMotor(); }
        if (newState === 'PLAYING') { document.getElementById('hud').classList.remove('hidden'); if(!this.audio.engineSound.isPlaying && this.audio.enabled) this.audio.engineSound.play(); }
        if (newState === 'GAME_OVER') { document.getElementById('game-over-screen').classList.remove('hidden'); this.audio.stopMotor(); }
        if (newState === 'SUCCESS') { document.getElementById('success-screen').classList.remove('hidden'); this.audio.stopMotor(); this.processEndgame(); }
    }

    processEndgame() { document.getElementById('final-score').innerText = this.score; }
    unlockAchievement(id) { this.achievements[id] = true; localStorage.setItem('deliveryAchievements', JSON.stringify(this.achievements)); }
    renderTrophies() { /* ... */ }

    updatePhysics() {
        if(!this.physics || !this.playerMesh) return;
        const p = this.physics; const stats = p.stats;
        if (this.input.isPressed('KeyW') || this.input.isPressed('ArrowUp')) p.speed += stats.accel;
        else if (this.input.isPressed('KeyS') || this.input.isPressed('ArrowDown')) p.speed -= stats.brake;
        else { p.speed *= 0.98; if(Math.abs(p.speed) < 0.01) p.speed = 0; }
        if (p.speed > stats.maxSpeed) p.speed = stats.maxSpeed;
        if (p.speed < -stats.maxSpeed * 0.4) p.speed = -stats.maxSpeed * 0.4;
        const speedRatio = Math.abs(p.speed) / (stats.maxSpeed || 1);
        let turn = stats.turn / (1 + speedRatio);
        if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) p.angle += turn;
        if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) p.angle -= turn;
        const nextX = p.x - Math.sin(p.angle) * p.speed;
        const nextZ = p.z - Math.cos(p.angle) * p.speed;
        const carBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, stats.height/2, nextZ), new THREE.Vector3(stats.width, stats.height, stats.length));
        let hit = false;
        for (let b of this.colliders) { if (carBox.intersectsBox(b)) { hit = true; break; } }
        if (hit) { p.speed *= -0.5; this.score -= 10; this.infractionsLog.bumps++; this.audio.playCrash(); }
        else { p.x = nextX; p.z = nextZ; }
        this.playerMesh.position.set(p.x, stats.height/2, p.z);
        this.playerMesh.rotation.y = p.angle;
        if (this.goalPos && Math.hypot(p.x - this.goalPos.x, p.z - this.goalPos.z) < 10) this.changeState('SUCCESS');
        this.camera.position.set(p.x + Math.sin(p.angle) * CONFIG.CAMERA.OFFSET_Z, CONFIG.CAMERA.OFFSET_Y, p.z + Math.cos(p.angle) * CONFIG.CAMERA.OFFSET_Z);
        this.camera.lookAt(p.x, stats.height, p.z);
        const spdHtml = document.getElementById('speed-val');
        const scHtml = document.getElementById('score-val');
        if(spdHtml) spdHtml.innerText = Math.floor(Math.abs(p.speed) * 150);
        if(scHtml) scHtml.innerText = this.score;
        this.audio.update(speedRatio, this.infractionsLog.bumps);
    }
    
    updateAI() {
        this.trafficLights.forEach(tl => {
            tl.timer += 1/60; 
            if (tl.state === 'GREEN' && tl.timer >= 10) { tl.state = 'YELLOW'; tl.timer = 0; }
            else if (tl.state === 'YELLOW' && tl.timer >= 3) { tl.state = 'RED'; tl.timer = 0; }
            else if (tl.state === 'RED' && tl.timer >= 10) { tl.state = 'GREEN'; tl.timer = 0; tl.punishedForCycle = false; }
            tl.lamps.red.material.emissiveIntensity = tl.state === 'RED' ? 2 : 0;
            tl.lamps.yellow.material.emissiveIntensity = tl.state === 'YELLOW' ? 2 : 0;
            tl.lamps.green.material.emissiveIntensity = tl.state === 'GREEN' ? 2 : 0;
            if (tl.state === 'RED' && this.state === 'PLAYING' && this.physics) {
                const carPos = new THREE.Vector3(this.physics.x, 1, this.physics.z);
                if (tl.triggerBox.containsPoint(carPos) && Math.abs(this.physics.speed) > 0.05 && !tl.punishedForCycle) {
                    const carHeading = new THREE.Vector3(-Math.sin(this.physics.angle), 0, -Math.cos(this.physics.angle));
                    const lightHeading = new THREE.Vector3(-Math.sin(tl.meshGroup.rotation.y), 0, -Math.cos(tl.meshGroup.rotation.y));
                    if (carHeading.dot(lightHeading) > 0.6) {
                        this.score -= 20; this.infractionsLog.redlights++; tl.punishedForCycle = true;
                        const w = document.getElementById('traffic-warning');
                        if(w) { w.classList.remove('hidden'); setTimeout(()=>w.classList.add('hidden'), 1500); }
                    }
                }
            }
        });
        this.pedestrians.forEach(ped => {
            if(ped.hit || !ped.mesh) return;
            const nx = ped.x + Math.sin(ped.walkAngle) * ped.walkSpeed;
            const nz = ped.z + Math.cos(ped.walkAngle) * ped.walkSpeed;
            ped.x = nx; ped.z = nz; ped.mesh.position.set(ped.x, 0, ped.z);
        });
    }

    drawMinimap() {
        if (!this.minimapCtx || !this.physics) return;
        const ctx = this.minimapCtx; const p = this.physics;
        const ts = CONFIG.TILE_SIZE; const size = 200; const center = size / 2; const zoom = 4;
        ctx.clearRect(0, 0, size, size); ctx.save(); ctx.translate(center, center); ctx.rotate(p.angle);
        ctx.fillStyle = '#4facfe'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
}

window.addEventListener('DOMContentLoaded', () => { new Game3D(); });
