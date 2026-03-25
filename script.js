import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

console.log("Delivery Seguro 3D - v2 Local / Web Loaded correctly no cache");

// --- CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 10, // Aumentado para alargar as ruas (Antes era 5)
    CAMERA: { OFFSET_Y: 14, OFFSET_Z: 16, FOV_MIN: 60, FOV_MAX: 85 }, // Offset Y alçado para não furar prédios e dar visao melhor
    VEHICLES: {
        car: { maxSpeed: 0.6, accel: 0.003, brake: 0.03, turn: 0.04, height: 1.0, color: 0x1d4ed8, width: 2, length: 4 },
        truck: { maxSpeed: 0.4, accel: 0.0015, brake: 0.02, turn: 0.02, height: 2.2, color: 0xef4444, width: 3, length: 6 },
        moto: { maxSpeed: 0.8, accel: 0.005, brake: 0.05, turn: 0.06, height: 0.6, color: 0x22c55e, width: 1, length: 2 }
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
    
    // Inserir destino na extremidade oposta da cidade
    let goalPlaced = false;
    for(let r = size - 3; r >= 0 && !goalPlaced; r--) {
        for(let c = size - 3; c >= 0 && !goalPlaced; c--) {
            if(map[r][c] === 1) {
                map[r][c] = 4;
                goalPlaced = true;
            }
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

        this.initThree();
        this.audio = new AudioEngine(this.camera);
        this.initDOM();
        
        // Loop a prova de falhas com Arrow Function pura pro requestAnimationFrame!
        this.runAppLoop = () => {
            this.loop();
            requestAnimationFrame(this.runAppLoop);
        };
        requestAnimationFrame(this.runAppLoop);
    }

    initThree() {
        const container = document.getElementById('canvas-container');
        if(!container) return; // Prevent crashes if HTML missing
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Céu azul

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        // Melhora sombras web
        sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
        sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);
        
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);
        
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
        
        map.forEach(row => row.forEach(tile => { if(tile === 3) bCount++; }));
        
        const bGeo = new THREE.BoxGeometry(ts, 1, ts);
        const bMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
        const instMesh = new THREE.InstancedMesh(bGeo, bMat, bCount);
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        let idx = 0;
        this.goalPos = null;

        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[0].length; c++) {
                const tile = map[r][c];
                const x = c * ts;
                const z = r * ts;

                if (tile === 3) {
                    const h = 10 + Math.random() * 20; // Prédios mais altos variados
                    dummy.position.set(x, h/2, z);
                    dummy.scale.set(1, h, 1);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(idx++, dummy.matrix);
                    
                    const box = new THREE.Box3();
                    box.setFromCenterAndSize(new THREE.Vector3(x, h/2, z), new THREE.Vector3(ts, h, ts));
                    this.colliders.push(box);
                }
                if (tile === 4) { // Destino Final
                    const gGeo = new THREE.CylinderGeometry(ts/3, ts/3, 20, 16);
                    const gMat = new THREE.MeshPhongMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5, emissive: 0x22c55e });
                    const goal = new THREE.Mesh(gGeo, gMat);
                    goal.position.set(x, 10, z); // Flutuando
                    this.mapGroup.add(goal);
                    this.goalPos = { x, z, radius: ts };
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
        this.mapGroup.add(instMesh);

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
        
        // Render Pedestres Seguro
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

        // Semáforos dummy pra lógica visual
        this.trafficLights.push({
            x: ts * 7, z: ts * 7, state: 'GREEN', timer: 0, mesh: null
        });
        
        this.trafficLights.forEach(tl => {
            const tlGeo = new THREE.BoxGeometry(1, 6, 1);
            const tlMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
            const m = new THREE.Mesh(tlGeo, tlMat);
            m.position.set(tl.x, 3, tl.z);
            this.mapGroup.add(m);
            tl.mesh = m;
        });
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
        const pGeo = new THREE.BoxGeometry(stats.width, stats.height, stats.length);
        const pMat = new THREE.MeshPhongMaterial({ color: stats.color });
        this.playerMesh = new THREE.Mesh(pGeo, pMat);
        this.playerMesh.castShadow = true;
        
        // Força a posição imediata para o carro aparacer no mapa no local correto!!
        this.playerMesh.position.set(this.physics.x, stats.height/2, this.physics.z);
        this.scene.add(this.playerMesh);
        
        const fl = new THREE.PointLight(0xffffee, 1.5, 30);
        fl.position.set(0, 0, -(stats.length/2) - 1);
        this.playerMesh.add(fl);
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
                this.selectedMapIdx = parseInt(b.dataset.map);
                this.buildMap();
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

    startDelivery() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('level-start-screen').classList.remove('hidden');
        
        this.score = 100;
        this.infractionsLog = { bumps: 0, redlights: 0, pedestrians: 0 };
        this.audio.start();
        this.buildMap();
        this.spawnPlayer();
        
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
        
        // Simular Roll (Inclinação da carroceria na curva)
        let rollTarget = 0;
        if (speedRatio > 0.3) {
            if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) rollTarget = 0.1;
            if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) rollTarget = -0.1;
        }
        this.playerMesh.rotation.z += (rollTarget - this.playerMesh.rotation.z) * 0.1;

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
            p.speed *= -0.5; // Kika pra trás nas batidas
            this.score -= 10;
            this.infractionsLog.bumps++;
            this.audio.playCrash();
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
            tl.timer++;
            if(tl.timer > 300) {
                tl.timer = 0;
                tl.state = tl.state === 'GREEN' ? 'RED' : 'GREEN';
                if(tl.mesh) tl.mesh.material.color.setHex(tl.state === 'GREEN' ? 0x22c55e : 0xef4444);
            }
            
            if(tl.state === 'RED' && this.state === 'PLAYING' && this.physics) {
                const dist = Math.hypot(this.physics.x - tl.x, this.physics.z - tl.z);
                if(dist < 5 && Math.abs(this.physics.speed) > 0.1 && !tl.punishedForCycle) {
                    this.score -= 20;
                    this.infractionsLog.redlights++;
                    tl.punishedForCycle = true;
                    const w = document.getElementById('traffic-warning');
                    if(w) { w.classList.remove('hidden'); setTimeout(()=>w.classList.add('hidden'), 1000); }
                }
            }
            if(tl.state === 'GREEN') tl.punishedForCycle = false;
        });
        
        if(this.state === 'PLAYING' && this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const m = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const s = Math.floor((elapsed % 60000)/1000).toString().padStart(2, '0');
            const tv = document.getElementById('timer-val');
            if(tv) tv.innerText = `${m}:${s}`;
        }
    }

    loop() {
        if (!this.scene) return;
        
        if (this.state === 'PLAYING') {
            this.updatePhysics();
            this.updateAI();
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
