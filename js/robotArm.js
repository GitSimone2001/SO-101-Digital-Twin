import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const plaMaterial = new THREE.MeshPhongMaterial({
    color: 0x3a3a3a,
    shininess: 20,
});

export const HOME = {
    shoulder: -1.599,
    upper:    -0.380,
    lower:     1.571,
    wpitch:   -2.900,
    wroll:     1.570,
    jaw:      -0.200,
};

const LIMITS = {
    shoulder: { min: HOME.shoulder - 2.0, max: HOME.shoulder + 2.0 },
    upper:    { min: HOME.upper,           max: HOME.upper + 3.8 },
    lower:    { min: HOME.lower - 3.2,     max: HOME.lower },
    wpitch:   { min: HOME.wpitch - 0.42,   max: HOME.wpitch + 3.04 },
    wroll:    { min: -Infinity,            max: Infinity },
    jaw:      { min: HOME.jaw,             max: HOME.jaw + 2.0 },
};

// physHome = encoder reading (degrees) when arm is physically at home pose
// sign = -1 if the joint moves the wrong way in live mode
const JOINT_MAP = [
    { key: 'shoulder_pan',  pivot: 'shoulderPivot',   axis: 'z', simHome: HOME.shoulder, sign: +1, physHome:   2.5 },
    { key: 'shoulder_lift', pivot: 'upperArmPivot',   axis: 'y', simHome: HOME.upper,    sign: +1, physHome: -110.8 },
    { key: 'elbow_flex',    pivot: 'lowerArmPivot',   axis: 'z', simHome: HOME.lower,    sign: +1, physHome:  96.3 },
    { key: 'wrist_flex',    pivot: 'wristPitchPivot', axis: 'y', simHome: HOME.wpitch,   sign: -1, physHome:  83.2 },
    { key: 'wrist_roll',    pivot: 'wristRollPivot',  axis: 'y', simHome: HOME.wroll,    sign: -1, physHome:  -3.9 },
    { key: 'gripper',       pivot: 'jawPivot',        axis: 'y', simHome: HOME.jaw,      sign: +1, physHome: -58.4 },
];

export class RobotArm {
    constructor(scene, onLoaded) {
        this.group = new THREE.Group();
        scene.add(this.group);

        const loader = new GLTFLoader();
        const MM_TO_METERS = 0.001;
        let loadedCount = 0;

        const loadPart = (parentPivot, filename, absolutePos) => {
            loader.load(`./assets/models/${filename}`, (gltf) => {
                const mesh = gltf.scene;
                mesh.scale.setScalar(MM_TO_METERS);
                mesh.position.copy(absolutePos);
                // add to scene then attach — preserves Blender world orientation
                // independent of the pivot's local rotation
                scene.add(mesh);
                parentPivot.attach(mesh);
                mesh.traverse((child) => {
                    if (child.material !== undefined) {
                        child.castShadow = true;
                        child.receiveShadow = false;
                        child.material = plaMaterial;
                        if (child.geometry) child.geometry.computeVertexNormals();
                    }
                });
                // reset to home only after all 7 parts are loaded — doing it earlier
                // corrupts local transforms of parts that load afterwards
                if (++loadedCount === 7) { this.reset(); onLoaded?.(); }
            });
        };

        // pivot positions matched from Blender world coordinates
        this.basePivot = new THREE.Group();
        const basePos = new THREE.Vector3(0, -0.000361, 0);
        this.basePivot.position.copy(basePos);
        this.basePivot.quaternion.set(0.707, 0, -0, 0.707);
        this.group.add(this.basePivot);
        loadPart(this.basePivot, 'Base.glb', basePos);

        this.shoulderPivot = new THREE.Group();
        const shoulderPos = new THREE.Vector3(0, 0.076211, 0.04654);
        this.shoulderPivot.position.copy(shoulderPos);
        this.shoulderPivot.quaternion.set(0.493, 0.507, -0.507, 0.493);
        this.group.add(this.shoulderPivot);
        loadPart(this.shoulderPivot, 'Pivot.glb', shoulderPos);

        this.upperArmPivot = new THREE.Group();
        const upperArmPos = new THREE.Vector3(-0.0317, 0.12339, 0.07919);
        this.upperArmPivot.position.copy(upperArmPos);
        this.upperArmPivot.quaternion.set(0.500, -0.500, 0.500, 0.500);
        this.group.add(this.upperArmPivot);
        loadPart(this.upperArmPivot, 'Upper Arm.glb', upperArmPos);

        this.lowerArmPivot = new THREE.Group();
        const lowerArmPos = new THREE.Vector3(-0.02905, 0.1498, -0.033314);
        this.lowerArmPivot.position.copy(lowerArmPos);
        this.lowerArmPivot.quaternion.set(-0.500, 0.500, -0.500, 0.500);
        this.group.add(this.lowerArmPivot);
        loadPart(this.lowerArmPivot, 'Lower Arm.glb', lowerArmPos);

        this.wristPitchPivot = new THREE.Group();
        const wristPitchPos = new THREE.Vector3(-0.016231, 0.15302, 0.10095);
        this.wristPitchPivot.position.copy(wristPitchPos);
        this.wristPitchPivot.quaternion.set(-1.000, 0.000, -0.000, 0.000);
        this.group.add(this.wristPitchPivot);
        loadPart(this.wristPitchPivot, 'Wrist Pitch.glb', wristPitchPos);

        this.wristRollPivot = new THREE.Group();
        const wristRollPos = new THREE.Vector3(0.000119, 0.21451, 0.10083);
        this.wristRollPivot.position.copy(wristRollPos);
        this.wristRollPivot.quaternion.set(0.000, 0.707, -0.000, 0.707);
        this.group.add(this.wristRollPivot);
        loadPart(this.wristRollPivot, 'Wrist Roll.glb', wristRollPos);

        this.jawPivot = new THREE.Group();
        const jawPos = new THREE.Vector3(0.0204, 0.23709, 0.080685);
        this.jawPivot.position.copy(jawPos);
        this.jawPivot.quaternion.set(-0.500, 0.500, 0.500, 0.500);
        this.group.add(this.jawPivot);
        loadPart(this.jawPivot, 'Jaw.glb', jawPos);

        this.basePivot.attach(this.shoulderPivot);
        this.shoulderPivot.attach(this.upperArmPivot);
        this.upperArmPivot.attach(this.lowerArmPivot);
        this.lowerArmPivot.attach(this.wristPitchPivot);
        this.wristPitchPivot.attach(this.wristRollPivot);
        this.wristRollPivot.attach(this.jawPivot);

        this._box = new THREE.Box3();
        this._joints = [
            { pivot: this.shoulderPivot,   axis: 'z', neg: 'a', pos: 'd', lim: LIMITS.shoulder },
            { pivot: this.upperArmPivot,   axis: 'y', neg: 's', pos: 'w', lim: LIMITS.upper    },
            { pivot: this.lowerArmPivot,   axis: 'z', neg: 'i', pos: 'k', lim: LIMITS.lower    },
            { pivot: this.wristPitchPivot, axis: 'y', neg: 'j', pos: 'l', lim: LIMITS.wpitch   },
            { pivot: this.wristRollPivot,  axis: 'y', neg: 'u', pos: 'o', lim: LIMITS.wroll    },
            { pivot: this.jawPivot,        axis: 'y', neg: 'q', pos: 'e', lim: LIMITS.jaw      },
        ];

        this.keys = {};
        this.liveMode = false;
        window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
        window.addEventListener('keyup',   (e) => { this.keys[e.key.toLowerCase()] = false; });
    }

    applyRealAngles(angles) {
        for (const { key, pivot, axis, simHome, sign, physHome } of JOINT_MAP) {
            const deg = angles[key];
            if (deg === undefined) continue;
            this[pivot].rotation[axis] = simHome + sign * (deg - physHome) * (Math.PI / 180);
        }
    }

    update() {
        if (this.liveMode) return;
        const speed = 0.02;

        // 1cm tolerance handles bounding-box over-approximation on rotated meshes;
        // only the upperArm subtree is checked since base/shoulder stay near y=0
        const hitFloor = () => {
            this.group.updateMatrixWorld(true);
            this._box.setFromObject(this.upperArmPivot);
            return this._box.min.y < -0.01;
        };

        for (const { pivot, axis, neg, pos, lim } of this._joints) {
            const prev = pivot.rotation[axis];
            if (this.keys[neg]) pivot.rotation[axis] -= speed;
            if (this.keys[pos]) pivot.rotation[axis] += speed;
            pivot.rotation[axis] = THREE.MathUtils.clamp(pivot.rotation[axis], lim.min, lim.max);
            if (pivot.rotation[axis] !== prev && hitFloor()) pivot.rotation[axis] = prev;
        }
    }

    reset() {
        this.shoulderPivot.rotation.z   = HOME.shoulder;
        this.upperArmPivot.rotation.y   = HOME.upper;
        this.lowerArmPivot.rotation.z   = HOME.lower;
        this.wristPitchPivot.rotation.y = HOME.wpitch;
        this.wristRollPivot.rotation.y  = HOME.wroll;
        this.jawPivot.rotation.y        = HOME.jaw;
    }
}
