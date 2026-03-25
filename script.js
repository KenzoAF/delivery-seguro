import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// --- CONFIGURAÇÕES ---
const CONFIG = {
    TILE_SIZE: 5,
    CAMERA: { OFFSET_Y: 2.5, OFFSET_Z: 6, FOV_MIN: 60, FOV_MAX: 90 },
    VEHICLES: {
        car: { maxSpeed: 0.4, accel: 0.0011, brake: 0.02, turn: 0.03, height: 0.5, color: 0x1d4ed8 },
        truck: { maxSpeed: 0.25, accel: 0.0007, brake: 0.015, turn: 0.015, height: 1.2, color: 0xef4444 },
        moto: { maxSpeed: 0.55, accel: 0.0018, brake: 0.03, turn: 0.045, height: 0.4, color: 0x22c55e }
    }
};

const MAPS = [
    // MAPA 1
    [
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
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1],
        [3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3]
    ],
    // MAPA 2 (Menor para teste de manobras)
    [
        [3,3,3,1,1,1,3,3,3,3,1,1,1,3,3,3],
        [3,2,2,1,1,1,2,2,3,2,1,1,1,2,2,3],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [3,2,2,1,1,1,2,2,3,2,1,1,1,2,2,4],
        [3,3,3,1,1,1,3,3,3,3,1,1,1,3,3,3]
    ]
];

// Achievements Definition
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
        this.sfxVol = sfx;
        this.engineSound.setVolume(sfx * 0.5);
        this.crashSound.setVolume(sfx);
        this.hornSound.setVolume(sfx);
    }

    update(speedRatio, infractions) {
        if (!this.enabled) return;
        if(this.engineSound.isPlaying) this.engineSound.setPlaybackRate(0.8 + speedRatio * 1.5);
        
        let tenseTarget = (speedRatio > 0.8 || infractions > 0) ? 1.0 : 0.0;
        if (this.musicSafe.isPlaying && this.musicTense.isPlaying) {
            const mVol = document.getElementById('music-vol').value;
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
        
        requestAnimationFrame(() => this.loop());
    }

    initThree() {
        const container = document.getElementById('canvas-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
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
        // Clear old map
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
                    const h = 10 + Math.random() * 15;
                    dummy.position.set(x, h/2, z);
                    dummy.scale.set(1, h, 1);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(idx++, dummy.matrix);
                    
                    const box = new THREE.Box3();
                    box.setFromCenterAndSize(new THREE.Vector3(x, h/2, z), new THREE.Vector3(ts, h, ts));
                    this.colliders.push(box);
                }
                if (tile === 4) {
                    const gGeo = new THREE.CylinderGeometry(ts/3, ts/3, 20, 16);
                    const gMat = new THREE.MeshPhongMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5, emissive: 0x22c55e });
                    const goal = new THREE.Mesh(gGeo, gMat);
                    goal.position.set(x, 10, z);
                    this.mapGroup.add(goal);
                    this.goalPos = { x, z, radius: ts };
                }
                
                // Add some pedestrians on sidewalks
                if (tile === 2 && Math.random() < 0.1) {
                    this.pedestrians.push({
                        x: x + (Math.random()-0.5)*ts,
                        z: z + (Math.random()-0.5)*ts,
                        mesh: null // Instantiated below
                    });
                }
            }
        }
        this.mapGroup.add(instMesh);

        // Ground setup
        const w = map[0].length * ts;
        const h = map.length * ts;
        const groundGeo = new THREE.PlaneGeometry(w, h);
        const groundMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(w/2 - ts/2, 0, h/2 - ts/2);
        ground.receiveShadow = true;
        this.mapGroup.add(ground);
        
        // Setup Pedestrian Meshes
        const pGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const pMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b });
        this.pedestrians.forEach(p => {
            const mesh = new THREE.Mesh(pGeo, pMat);
            mesh.position.set(p.x, 1, p.z);
            mesh.castShadow = true;
            this.mapGroup.add(mesh);
            p.mesh = mesh;
        });

        // Setup Traffic Lights (Simplificado)
        // Add one light at the center of the map mostly for mechanics testing
        this.trafficLights.push({
            x: w/2, z: h/2, state: 'GREEN', timer: 0, mesh: null
        });
        
        this.trafficLights.forEach(tl => {
            const tlGeo = new THREE.BoxGeometry(1, 4, 1);
            const tlMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
            const m = new THREE.Mesh(tlGeo, tlMat);
            m.position.set(tl.x, 2, tl.z);
            this.mapGroup.add(m);
            tl.mesh = m;
        });
    }

    spawnPlayer() {
        if(this.playerMesh) this.scene.remove(this.playerMesh);
        
        const stats = CONFIG.VEHICLES[this.vehicleType];
        this.physics = {
            x: 5 * CONFIG.TILE_SIZE,
            z: 5 * CONFIG.TILE_SIZE,
            angle: 0,
            speed: 0,
            drift: 0,
            stats: stats
        };
        
        const pGeo = new THREE.BoxGeometry(2, stats.height, 4);
        const pMat = new THREE.MeshPhongMaterial({ color: stats.color });
        this.playerMesh = new THREE.Mesh(pGeo, pMat);
        this.playerMesh.castShadow = true;
        this.scene.add(this.playerMesh);
        
        // Add fake headlights
        const fl = new THREE.PointLight(0xffffee, 1, 20);
        fl.position.set(0, 0, -2.5);
        this.playerMesh.add(fl);
    }

    initDOM() {
        // Vehicle Selection
        document.querySelectorAll('.veh-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.veh-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.vehicleType = b.dataset.veh;
                this.spawnPlayer();
            };
        });
        
        // Map Selection
        document.querySelectorAll('.map-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.map-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.selectedMapIdx = parseInt(b.dataset.map);
                this.buildMap();
            };
        });

        // Main Actions
        document.getElementById('start-btn').onclick = () => this.checkTutorial();
        document.getElementById('restart-btn').onclick = () => { this.changeState('MENU'); }
        document.getElementById('restart-btn-succ').onclick = () => { this.changeState('MENU'); }
        document.getElementById('menu-btn-fail').onclick = () => this.changeState('MENU');
        document.getElementById('menu-btn-success').onclick = () => this.changeState('MENU');
        
        // Settings / Trophies
        document.getElementById('settings-btn').onclick = () => {
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('settings-screen').classList.remove('hidden');
        };
        document.getElementById('close-settings-btn').onclick = () => {
            document.getElementById('settings-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.remove('hidden');
        };
        document.getElementById('trophies-btn').onclick = () => {
            this.renderTrophies();
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('trophies-screen').classList.remove('hidden');
        };
        document.getElementById('close-trophies-btn').onclick = () => {
            document.getElementById('trophies-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.remove('hidden');
        };

        // Audio listeners
        document.getElementById('master-vol').oninput = e => this.audio.setVolumes(e.target.value, document.getElementById('music-vol').value, document.getElementById('sfx-vol').value);
        document.getElementById('music-vol').oninput = e => this.audio.setVolumes(document.getElementById('master-vol').value, e.target.value, document.getElementById('sfx-vol').value);
        document.getElementById('sfx-vol').oninput = e => this.audio.setVolumes(document.getElementById('master-vol').value, document.getElementById('music-vol').value, e.target.value);

        // Tutorial logic
        document.querySelectorAll('.next-tut-btn').forEach(b => {
            b.onclick = () => {
                b.parentElement.parentElement.classList.add('hidden');
                document.getElementById('tutorial-' + b.dataset.next).classList.remove('hidden');
            };
        });
        document.querySelectorAll('.skip-tut-btn').forEach(b => {
            b.onclick = () => this.startDelivery();
        });
        document.querySelector('.finish-tut-btn').onclick = () => this.startDelivery();

        // Initial setup for background view
        this.buildMap();
        this.spawnPlayer();
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
        const cd = document.getElementById('level-start-screen');
        cd.classList.remove('hidden');
        
        // Reset Logic
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
                cd.classList.add('hidden');
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
        scnt.innerHTML = '';
        for(let i=0; i<3; i++) {
            scnt.innerHTML += i < stars ? '★' : '<span style="color:#555">★</span>';
        }
        
        // Check achievements
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
        
        document.getElementById('ach-name').innerText = def.name;
        const banner = document.getElementById('achievement-banner');
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('show'), 100);
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => banner.classList.add('hidden'), 500);
        }, 4000);
    }

    renderTrophies() {
        const container = document.getElementById('trophies-list');
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
        
        // Simular Roll nas curvas
        let rollTarget = 0;
        if (speedRatio > 0.3) {
            if (this.input.isPressed('KeyA') || this.input.isPressed('ArrowLeft')) rollTarget = 0.1;
            if (this.input.isPressed('KeyD') || this.input.isPressed('ArrowRight')) rollTarget = -0.1;
        }
        this.playerMesh.rotation.z += (rollTarget - this.playerMesh.rotation.z) * 0.1;

        // Move
        const nextX = p.x - Math.sin(p.angle) * p.speed;
        const nextZ = p.z - Math.cos(p.angle) * p.speed;
        
        // Collision AABB
        const carBox = new THREE.Box3();
        carBox.setFromCenterAndSize(
            new THREE.Vector3(nextX, stats.height/2, nextZ),
            new THREE.Vector3(2, stats.height, 4) // Car dims roughly
        );
        
        let hit = false;
        for (let b of this.colliders) {
            if (carBox.intersectsBox(b)) {
                hit = true; break;
            }
        }
        
        if (hit) {
            p.speed *= -0.5; // Bounce
            this.score -= 10;
            this.infractionsLog.bumps++;
            this.audio.playCrash();
            const flash = document.getElementById('damage-flash');
            flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 100);
            if (this.score <= 0) {
                document.getElementById('fail-reason').innerText = "Veículo destruído por múltiplas colisões!";
                this.changeState('GAME_OVER');
                return;
            }
        } else {
            p.x = nextX;
            p.z = nextZ;
        }

        // Apply Transform
        this.playerMesh.position.set(p.x, stats.height/2, p.z);
        this.playerMesh.rotation.y = p.angle;
        
        // Check Goal
        if (this.goalPos) {
            const dist = Math.hypot(p.x - this.goalPos.x, p.z - this.goalPos.z);
            if (dist < 10) {
                this.changeState('SUCCESS');
                return;
            }
        }
        
        // Check Pedestrians
        this.pedestrians.forEach(ped => {
            const d = Math.hypot(p.x - ped.x, p.z - ped.z);
            if(d < 3 && !ped.hit) {
                ped.hit = true;
                this.score -= 30;
                this.infractionsLog.pedestrians++;
                const wn = document.getElementById('pedestrian-warning');
                wn.classList.remove('hidden'); setTimeout(() => wn.classList.add('hidden'), 1000);
            }
        });

        // Update Cam
        const targetFov = CONFIG.CAMERA.FOV_MIN + (CONFIG.CAMERA.FOV_MAX - CONFIG.CAMERA.FOV_MIN) * speedRatio;
        this.camera.fov += (targetFov - this.camera.fov) * 0.05;
        this.camera.updateProjectionMatrix();

        const camTargetX = p.x + Math.sin(p.angle) * CONFIG.CAMERA.OFFSET_Z;
        const camTargetZ = p.z + Math.cos(p.angle) * CONFIG.CAMERA.OFFSET_Z;
        
        this.camera.position.x += (camTargetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (stats.height + CONFIG.CAMERA.OFFSET_Y - this.camera.position.y) * 0.1;
        this.camera.position.z += (camTargetZ - this.camera.position.z) * 0.1;
        
        this.camera.lookAt(p.x, stats.height/2, p.z);

        // UI Update
        document.getElementById('speed-val').innerText = Math.floor(Math.abs(p.speed) * 150);
        document.getElementById('score-val').innerText = this.score;
        document.getElementById('integrity-bar').style.width = Math.max(0, this.score) + '%';
        
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
            
            // Ver se player passou no vermelho
            if(tl.state === 'RED' && this.state === 'PLAYING') {
                const dist = Math.hypot(this.physics.x - tl.x, this.physics.z - tl.z);
                if(dist < 5 && Math.abs(this.physics.speed) > 0.1 && !tl.punishedForCycle) {
                    this.score -= 20;
                    this.infractionsLog.redlights++;
                    tl.punishedForCycle = true;
                    const w = document.getElementById('traffic-warning');
                    w.classList.remove('hidden'); setTimeout(()=>w.classList.add('hidden'), 1000);
                }
            }
            if(tl.state === 'GREEN') tl.punishedForCycle = false;
        });
        
        if(this.state === 'PLAYING' && this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const m = Math.floor(elapsed / 60000).toString().padStart(2, '0');
            const s = Math.floor((elapsed % 60000)/1000).toString().padStart(2, '0');
            document.getElementById('timer-val').innerText = `${m}:${s}`;
        }
    }

    loop() {
        if (this.state === 'PLAYING') {
            this.updatePhysics();
            this.updateAI();
        } else if (this.state === 'MENU' && this.playerMesh) {
            // Rotating camera around car in menu
            const time = Date.now() * 0.0005;
            this.camera.position.x = this.physics.x + Math.sin(time) * 10;
            this.camera.position.z = this.physics.z + Math.cos(time) * 10;
            this.camera.position.y = 5;
            this.camera.lookAt(this.physics.x, 0, this.physics.z);
        }
        
        if (this.score <= 0 && this.state === 'PLAYING') {
            document.getElementById('fail-reason').innerText = "Você zerou seus pontos com infrações constantes.";
            this.changeState('GAME_OVER');
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop);
    }
}

new Game3D();
