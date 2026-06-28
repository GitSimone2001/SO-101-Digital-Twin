import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RobotArm, HOME as home } from './robotArm.js';
import * as CANNON from './cannon.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2, 2, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const world = new CANNON.World();
world.gravity.set(0, -9.81, 0);

const groundMaterial = new CANNON.Material('groundMaterial');
const worldFloorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
worldFloorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(worldFloorBody);

const sphereRadius = 0.025;
const spherePhysMat = new CANNON.Material('sphereMaterial');
const worldSphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(sphereRadius),
    material: spherePhysMat,
    position: new CANNON.Vec3(0, 5, 0.25)
});
world.addBody(worldSphereBody);
world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, spherePhysMat, {
    friction: 0.3,
    restitution: 0.6
}));

function makeFloorTexture() {
    const size = 512;
    const tiles = 8;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#c1714f';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 30000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    const cell = size / tiles;
    ctx.strokeStyle = '#7a7a7a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= tiles; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
}

const floorTex = makeFloorTexture();
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(4, 4);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 64),
    new THREE.MeshPhongMaterial({ map: floorTex, specular: 0x888888, shininess: 10 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const TARGET_RADIUS = 0.06;
const BALL_SPAWN_HEIGHT = 0.40;

const targetMesh = new THREE.Mesh(
    new THREE.CircleGeometry(TARGET_RADIUS, 48),
    new THREE.MeshPhongMaterial({ color: 0xff2222, shininess: 60, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide })
);
targetMesh.rotation.x = -Math.PI / 2;
targetMesh.position.y = 0.006;
targetMesh.renderOrder = 1;
scene.add(targetMesh);

const mirror = new Reflector(new THREE.CircleGeometry(0.24, 64), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x888888,
    clipBias: 0.005,
});
mirror.position.set(0, 0.005, 0);
mirror.rotation.x = -Math.PI / 2;
scene.add(mirror);

// sun disc placed along the dirLight direction so it reads as the light source
const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffbe6 })
);
sunMesh.position.set(5, 15, 5).normalize().multiplyScalar(60);
scene.add(sunMesh);

const visualSphere = new THREE.Mesh(
    new THREE.SphereGeometry(sphereRadius, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.5, shininess: 60 })
);
visualSphere.castShadow = true;
scene.add(visualSphere);

const sphereLight = new THREE.PointLight(0xffaa00, 4, 10);
// no shadow — point-light shadow maps cause hard self-shadowing lines between robot joints
sphereLight.castShadow = false;
visualSphere.add(sphereLight);

const ambientLight = new THREE.AmbientLight(0xd0e8ff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffbe6, 3.0);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -3;
dirLight.shadow.camera.right = 3;
dirLight.shadow.camera.top = 3;
dirLight.shadow.camera.bottom = -3;
scene.add(dirLight);

const presets = {
    studio: {
        bg: 0xffffff,
        ambientColor: 0xe8eeff, ambientIntensity: 0.6,
        dirColor: 0xfffbe6, dir: 3.0,
        sunColor: 0xfffbe6,
    },
    warm: {
        bg: 0xff9944,
        ambientColor: 0xffe0a0, ambientIntensity: 0.8,
        dirColor: 0xff8800, dir: 2.0,
        sunColor: 0xff8800,
    },
    cold: {
        bg: 0x87CEEB,
        ambientColor: 0xa0c8ff, ambientIntensity: 0.9,
        dirColor: 0xd0e8ff, dir: 2.5,
        sunColor: 0xe0f0ff,
    },
    dark: {
        bg: 0x111122,
        ambientColor: 0x334466, ambientIntensity: 0.2,
        dirColor: 0x6688aa, dir: 0.4,
        sunColor: 0x334466,
    },
};

const presetBtns = document.querySelectorAll('.light-btn[data-preset]');
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = presets[btn.dataset.preset];
        scene.background.set(p.bg);
        ambientLight.color.set(p.ambientColor);
        ambientLight.intensity = p.ambientIntensity;
        dirLight.color.set(p.dirColor);
        dirLight.intensity = p.dir;
        sunMesh.material.color.set(p.sunColor);
    });
});

document.getElementById('btn-reset').addEventListener('click', () => { robotArm.reset(); respawn(); });

let score = 0;
const scoreValueEl = document.getElementById('score-value');
const scoreFlashEl = document.getElementById('score-flash');

function triggerScoreFlash() {
    scoreFlashEl.classList.remove('flash');
    void scoreFlashEl.offsetWidth; // force reflow to restart animation
    scoreFlashEl.classList.add('flash');
}

const sphereBtn = document.getElementById('btn-sphere');
sphereBtn.addEventListener('click', () => {
    const on = sphereBtn.classList.toggle('active');
    sphereLight.visible = on;
    visualSphere.material.emissiveIntensity = on ? 1.5 : 0;
    visualSphere.material.color.set(on ? 0xffaa00 : 0x222222);
});

const loadingOverlay = document.getElementById('loading-overlay');
const robotArm = new RobotArm(scene, () => {
    loadingOverlay.classList.add('hidden');
    setTimeout(() => loadingOverlay.remove(), 400);
});

const liveBtn = document.getElementById('btn-live');
const liveStatus = document.getElementById('live-status');

liveBtn.addEventListener('click', () => {
    robotArm.liveMode = !robotArm.liveMode;
    liveBtn.classList.toggle('active', robotArm.liveMode);
    liveStatus.textContent = robotArm.liveMode ? 'on' : 'off';
});

function connectBridge() {
    const ws = new WebSocket('ws://localhost:8765');
    ws.onopen = () => { liveStatus.textContent = robotArm.liveMode ? 'on' : 'connected'; };
    ws.onmessage = (e) => {
        if (robotArm.liveMode) robotArm.applyRealAngles(JSON.parse(e.data));
    };
    ws.onclose = () => {
        liveStatus.textContent = robotArm.liveMode ? 'reconnecting…' : 'off';
        setTimeout(connectBridge, 2000);
    };
    ws.onerror = () => ws.close();
}
connectBridge();

const hudEls = {
    shoulder: document.getElementById('j-shoulder'),
    upper:    document.getElementById('j-upper'),
    lower:    document.getElementById('j-lower'),
    wpitch:   document.getElementById('j-wpitch'),
    wroll:    document.getElementById('j-wroll'),
    jaw:      document.getElementById('j-jaw'),
};
const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(3);
const hudCache = {};
const syncHud = (key, val) => {
    const s = fmt(val);
    if (s !== hudCache[key]) hudEls[key].textContent = hudCache[key] = s;
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


const clock = new THREE.Clock();
let isAttachedToJaw = false;
let celebrating = false;

const HOME_THETA = Math.PI / 2;
const SPAWN_ARC  = 3.6;
const JAW_GRASP_MIN = home.jaw + 0.600;
const JAW_GRASP_MAX = home.jaw + 0.640;

// scratch objects for getGraspPos — reused each frame to avoid per-call allocation
const _jawPos    = new THREE.Vector3();
const _jawQuat   = new THREE.Quaternion();
const _jawOffset = new THREE.Vector3();

function randomXZ(maxRadius) {
    const minRadius = 0.15 * maxRadius;
    const r = Math.sqrt(minRadius * minRadius + Math.random() * (maxRadius * maxRadius - minRadius * minRadius));
    const theta = HOME_THETA + (Math.random() - 0.5) * SPAWN_ARC;
    return { x: r * Math.cos(theta), z: r * Math.sin(theta) };
}

function respawn() {
    const ball = randomXZ(0.27);
    worldSphereBody.position.set(ball.x, BALL_SPAWN_HEIGHT, ball.z);
    worldSphereBody.velocity.set(0, 0, 0);
    worldSphereBody.angularVelocity.set(0, 0, 0);
    worldSphereBody.type = CANNON.Body.DYNAMIC;
    isAttachedToJaw = false;
    celebrating = false;

    const target = randomXZ(0.27);
    targetMesh.position.set(target.x, 0.006, target.z);
    targetMesh.material.color.set(0xff2222);
}

function getGraspPos() {
    robotArm.jawPivot.getWorldPosition(_jawPos);
    robotArm.jawPivot.getWorldQuaternion(_jawQuat);
    _jawOffset.set(-0.035, 0.02, 0.07).applyQuaternion(_jawQuat); // offset measured from jaw GLB in Blender
    return _jawPos.add(_jawOffset);
}

respawn();

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    robotArm.update();

    if (isAttachedToJaw)
        robotArm.jawPivot.rotation.y = Math.max(robotArm.jawPivot.rotation.y, JAW_GRASP_MIN);

    syncHud('shoulder', robotArm.shoulderPivot.rotation.z   - home.shoulder);
    syncHud('upper',    robotArm.upperArmPivot.rotation.y   - home.upper);
    syncHud('lower',    robotArm.lowerArmPivot.rotation.z   - home.lower);
    syncHud('wpitch',   robotArm.wristPitchPivot.rotation.y - home.wpitch);
    syncHud('wroll',    robotArm.wristRollPivot.rotation.y  - home.wroll);
    syncHud('jaw',      robotArm.jawPivot.rotation.y        - home.jaw);

    if (!isAttachedToJaw) {
        world.step(1 / 60, dt, 3);
        visualSphere.position.copy(worldSphereBody.position);
        visualSphere.quaternion.copy(worldSphereBody.quaternion);

        const jawHud = robotArm.jawPivot.rotation.y - home.jaw;
        const jawOpen = Math.abs(jawHud - 0.620) <= 0.020;
        if (jawOpen && visualSphere.position.distanceTo(getGraspPos()) < sphereRadius && !celebrating) {
            isAttachedToJaw = true;
            worldSphereBody.type = CANNON.Body.KINEMATIC;
            worldSphereBody.velocity.set(0, 0, 0);
        }

        if (!celebrating) {
            const dx = worldSphereBody.position.x - targetMesh.position.x;
            const dz = worldSphereBody.position.z - targetMesh.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < TARGET_RADIUS && worldSphereBody.position.y < sphereRadius * 2) {
                celebrating = true;
                score++;
                scoreValueEl.textContent = score;
                triggerScoreFlash();
                targetMesh.material.color.set(0x00cc44);
                setTimeout(respawn, 800);
            }
        }
    } else {
        if (robotArm.jawPivot.rotation.y > JAW_GRASP_MAX) {
            isAttachedToJaw = false;
            worldSphereBody.type = CANNON.Body.DYNAMIC;
            worldSphereBody.velocity.set(0, 0, 0);
            worldSphereBody.angularVelocity.set(0, 0, 0);
        } else {
            const graspPos = getGraspPos();
            visualSphere.position.copy(graspPos);
            worldSphereBody.position.copy(graspPos);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

const sphereLightSlider = document.getElementById('sphere-light-slider');
const sphereLightValue  = document.getElementById('sphere-light-value');
sphereLightSlider.addEventListener('input', () => {
    sphereLight.intensity = Number(sphereLightSlider.value);
    sphereLightValue.textContent = sphereLightSlider.value;
});

const shininessSlider = document.getElementById('shininess-slider');
const shininessValue  = document.getElementById('shininess-value');
shininessSlider.addEventListener('input', () => {
    floor.material.shininess = Number(shininessSlider.value);
    shininessValue.textContent = shininessSlider.value;
});

animate();
