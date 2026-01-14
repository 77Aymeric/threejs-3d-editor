import * as THREE from 'three';
import { state } from './state';
import { updateSelection } from './selection';
import { handleArrowClick, animerVueVers } from './camera';
import { setMode, toggleColors, toggleWireframes, toggleSpace, toggleSnap } from './utils';
import { undo, redo, pushHistory } from './history';
import { supprimerSelection, dupliquerSelection } from './objects';
import { ouvrirModalImport } from './io';

export function onPointerDown(event) {
    state.mouseOnDown.x = event.clientX;
    state.mouseOnDown.y = event.clientY;

    const vcMouse = getMouseForViewCube(event);
    if (vcMouse) {
        state.raycaster.setFromCamera(vcMouse, state.viewCubeCamera);
        const arrowHits = state.raycaster.intersectObjects(state.viewCubeArrows);
        if (arrowHits.length > 0) {
            handleArrowClick(arrowHits[0].object.userData.type);
            return;
        }
        const hits = state.raycaster.intersectObject(state.viewCubeMesh);
        if (hits.length > 0) {
            const faceIndex = hits[0].face.materialIndex;
            const dist = state.activeCamera.position.length();
            let target = new THREE.Vector3();
            let newUp = new THREE.Vector3(0, 1, 0);
            switch (faceIndex) {
                case 0: target.set(dist, 0, 0); break;
                case 1: target.set(-dist, 0, 0); break;
                case 2: target.set(0, dist, 0); newUp.set(0, 0, -1); break;
                case 3: target.set(0, -dist, 0); newUp.set(0, 0, 1); break;
                case 4: target.set(0, 0, dist); break;
                case 5: target.set(0, 0, -dist); break;
            }
            animerVueVers(target, newUp);
            return;
        }
    }
}

export function onPointerUp(event) {
    const dx = event.clientX - state.mouseOnDown.x;
    const dy = event.clientY - state.mouseOnDown.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) return;

    if (event.target.closest('#ui-sidebar') || event.target.closest('#ui-toolbar') || event.target.closest('#ui-tree-panel')) return;

    if (state.transformControl.dragging) return;

    state.souris.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.souris.y = -(event.clientY / window.innerHeight) * 2 + 1;
    state.raycaster.setFromCamera(state.souris, state.activeCamera);
    const intersects = state.raycaster.intersectObjects(state.objetsEditables);

    if (intersects.length > 0) {
        updateSelection([intersects[0].object], event.shiftKey);
    } else {
        if (!event.shiftKey) updateSelection([]);
    }
}

export function onPointerMove(event) {
    const vcMouse = getMouseForViewCube(event);
    if (vcMouse) {
        state.raycaster.setFromCamera(vcMouse, state.viewCubeCamera);
        const arrowHits = state.raycaster.intersectObjects(state.viewCubeArrows);
        state.viewCubeArrows.forEach(a => a.material.opacity = 0.8);
        if (arrowHits.length > 0) {
            document.body.style.cursor = 'pointer';
            arrowHits[0].object.material.opacity = 1.0;
            return;
        }
        const hits = state.raycaster.intersectObject(state.viewCubeMesh);
        if (hits.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    } else {
        document.body.style.cursor = 'default';
    }
}

export function onKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    const k = event.key.toLowerCase();
    if (k === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
    }
    if (k === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        redo();
        return;
    }
    switch (k) {
        case 'z': setMode('translate'); break;
        case 'r': setMode('rotate'); break;
        case 's': setMode('scale'); break;
        case 'delete':
        case 'backspace': supprimerSelection(); break;
        case 'escape': updateSelection([]); break;
        case 'd':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                dupliquerSelection();
            }
            break;
    }
}

export function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    state.cameraPersp.aspect = aspect;
    state.cameraPersp.updateProjectionMatrix();

    const frustumSize = 15;
    state.cameraOrtho.left = -frustumSize * aspect / 2;
    state.cameraOrtho.right = frustumSize * aspect / 2;
    state.cameraOrtho.top = frustumSize / 2;
    state.cameraOrtho.bottom = -frustumSize / 2;
    state.cameraOrtho.updateProjectionMatrix();

    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function getMouseForViewCube(event) {
    const vcSize = state.viewCubeDim;
    const vcXScreen = window.innerWidth - 300 - vcSize - 20;
    const vcYScreen = 80;
    const mx = event.clientX - vcXScreen;
    const my = event.clientY - vcYScreen;
    if (mx >= 0 && mx <= vcSize && my >= 0 && my <= vcSize) {
        return new THREE.Vector2((mx / vcSize) * 2 - 1, -(my / vcSize) * 2 + 1);
    }
    return null;
}

export function commencerDrag() {
    state.dragStartData = state.selectionActuelle.map(obj => ({
        uuid: obj.uuid,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3()
    }));
    state.selectionActuelle.forEach((obj, i) => {
        obj.getWorldPosition(state.dragStartData[i].position);
        obj.getWorldQuaternion(state.dragStartData[i].quaternion);
        obj.getWorldScale(state.dragStartData[i].scale);
    });
}

export function terminerDrag() {
    if (!state.dragStartData) return;
    const afterData = state.selectionActuelle.map(obj => {
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        obj.getWorldPosition(p);
        obj.getWorldQuaternion(q);
        obj.getWorldScale(s);
        return { uuid: obj.uuid, position: p, quaternion: q, scale: s };
    });
    pushHistory({
        type: 'transform_multi',
        objects: [...state.selectionActuelle],
        before: state.dragStartData,
        after: afterData
    });
    state.dragStartData = null;
}
