import * as THREE from 'three';
import { state } from './state.js';
import { onWindowResize } from './events.js';

export function toggleCamera() {
    const target = state.controls.target.clone();
    const pos = state.activeCamera.position.clone();
    const quat = state.activeCamera.quaternion.clone();

    if (state.activeCamera === state.cameraPersp) {
        state.activeCamera = state.cameraOrtho;
        document.getElementById('btn-cam').innerText = "Cam: Ortho";
    } else {
        state.activeCamera = state.cameraPersp;
        document.getElementById('btn-cam').innerText = "Cam: Persp";
    }

    state.activeCamera.position.copy(pos);
    state.activeCamera.quaternion.copy(quat);
    state.camera = state.activeCamera;
    state.controls.object = state.activeCamera;
    state.controls.target.copy(target);
    state.controls.update();

    state.transformControl.camera = state.activeCamera;
    onWindowResize();
}

export function focusSurObjets(objects) {
    if (!objects || objects.length === 0) return;
    const box = new THREE.Box3();
    objects.forEach(obj => {
        obj.updateMatrixWorld(true);
        if (obj.geometry) {
            obj.geometry.computeBoundingBox();
            const tempBox = new THREE.Box3().copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
            box.union(tempBox);
        }
    });
    if (box.isEmpty()) return;
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = state.activeCamera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
    cameraZ *= 2.5;

    const direction = new THREE.Vector3().subVectors(state.activeCamera.position, state.controls.target).normalize();
    if (direction.lengthSq() < 0.1 || Math.abs(direction.y) > 0.98) { direction.set(1, 1, 1).normalize(); }

    const newPos = center.clone().add(direction.multiplyScalar(cameraZ));
    state.activeCamera.position.copy(newPos);
    state.activeCamera.lookAt(center);
    state.controls.target.copy(center);
    state.controls.update();

    state.viewCubeCamera.position.copy(state.activeCamera.position).sub(state.controls.target).setLength(5);
    state.viewCubeCamera.lookAt(0, 0, 0);
}

export function setupViewCube() {
    state.viewCubeScene = new THREE.Scene();
    state.viewCubeCamera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 10);
    state.viewCubeCamera.position.set(0, 0, 5);
    state.viewCubeCamera.lookAt(0, 0, 0);
    state.viewCubeScene.add(state.viewCubeCamera);

    const light = new THREE.AmbientLight(0xffffff, 1);
    state.viewCubeScene.add(light);

    const commonMat = { transparent: true, opacity: 0.6, depthTest: false };
    const materials = [
        creerMatFace("DROITE", "#555", commonMat), creerMatFace("GAUCHE", "#555", commonMat),
        creerMatFace("HAUT", "#555", commonMat), creerMatFace("BAS", "#555", commonMat),
        creerMatFace("FACE", "#555", commonMat), creerMatFace("DOS", "#555", commonMat)
    ];

    const geo = new THREE.BoxGeometry(2, 2, 2);
    state.viewCubeMesh = new THREE.Mesh(geo, materials);
    state.viewCubeMesh.geometry.computeBoundingBox();
    state.viewCubeScene.add(state.viewCubeMesh);

    creerFlecheGUI("UP", 0, 1.6, -1, 0);
    creerFlecheGUI("DOWN", 0, -1.6, -1, Math.PI);
    creerFlecheGUI("RIGHT", 1.6, 0, -1, -Math.PI / 2);
    creerFlecheGUI("LEFT", -1.6, 0, -1, Math.PI / 2);
    creerFlecheCoudeeGUI("ROLL_LEFT", 1.6, 1.3, -1, false);
    creerFlecheCoudeeGUI("ROLL_RIGHT", 1.1, 1.6, -1, true);
}

function creerMatFace(text, bgColor, commonProps) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 128, 128);
    ctx.lineWidth = 8; ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = "#fff"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 64);
    const tex = new THREE.CanvasTexture(canvas); return new THREE.MeshBasicMaterial({ map: tex, ...commonProps });
}

function creerFlecheGUI(name, x, y, z, rotZ_icon) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = "rgba(80,80,80,0.8)";
    ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
    ctx.translate(32, 32); ctx.rotate(rotZ_icon);
    ctx.fillStyle = "#fff"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("▲", 0, -2);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), mat);
    mesh.position.set(x, y, z); mesh.userData = { isArrow: true, type: name };
    state.viewCubeCamera.add(mesh); state.viewCubeArrows.push(mesh);
}

function creerFlecheCoudeeGUI(name, x, y, z, flip) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = "rgba(80,80,80,0.8)";
    ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 35px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(flip ? "↷" : "↶", 32, 34);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), mat);
    mesh.position.set(x, y, z); mesh.userData = { isArrow: true, type: name };
    state.viewCubeCamera.add(mesh); state.viewCubeArrows.push(mesh);
}

export function animerVueVers(position, newUp) {
    if (state.isAnimatingView) return;
    state.isAnimatingView = true;
    const startPos = state.activeCamera.position.clone();
    const startUp = state.activeCamera.up.clone();
    const targetPos = position.clone().normalize().multiplyScalar(startPos.length());
    const targetUp = newUp ? newUp.clone().normalize() : startUp;
    let t = 0; const duree = 500; const start = performance.now();
    function loop(time) {
        let elapsed = time - start; t = Math.min(1, elapsed / duree);
        const k = 1 - Math.pow(1 - t, 3);
        state.activeCamera.position.lerpVectors(startPos, targetPos, k);
        if (newUp) state.activeCamera.up.lerpVectors(startUp, targetUp, k);
        state.activeCamera.lookAt(0, 0, 0); state.controls.target.set(0, 0, 0);
        if (t < 1) requestAnimationFrame(loop);
        else { state.isAnimatingView = false; state.controls.update(); }
    }
    requestAnimationFrame(loop);
}

export function handleArrowClick(type) {
    const pos = state.activeCamera.position.clone(); const up = state.activeCamera.up.clone();
    const camDir = new THREE.Vector3(); state.activeCamera.getWorldDirection(camDir);
    const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
    const angle = Math.PI / 2;
    if (type === 'LEFT') { pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); up.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); }
    else if (type === 'RIGHT') { pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle); up.applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle); }
    else if (type === 'UP') { pos.applyAxisAngle(right, angle); up.applyAxisAngle(right, angle); }
    else if (type === 'DOWN') { pos.applyAxisAngle(right, -angle); up.applyAxisAngle(right, -angle); }
    else if (type === 'ROLL_LEFT') { up.applyAxisAngle(camDir, angle); }
    else if (type === 'ROLL_RIGHT') { up.applyAxisAngle(camDir, -angle); }
    animerVueVers(pos, up);
}
