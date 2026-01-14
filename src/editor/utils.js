import * as THREE from 'three';
import { state } from './state';

export function applyColorState(obj) {
    if (!state.showColors) {
        if (!obj.userData.savedColor) {
            obj.userData.savedColor = obj.material.color.getHex();
        }
        obj.material.color.setHex(0x808080);
    } else {
        if (obj.userData.savedColor !== undefined) {
            obj.material.color.setHex(obj.userData.savedColor);
        }
    }
}

export function applyWireframeState(obj) {
    obj.traverse(child => {
        if (child.isLine || child.isLineSegments) {
            child.visible = state.showWireframes;
        }
    });
}

export function toggleColors(active) {
    state.showColors = active;
    state.objetsEditables.forEach(obj => applyColorState(obj));
}

export function toggleWireframes(active) {
    state.showWireframes = active;
    state.objetsEditables.forEach(obj => applyWireframeState(obj));
}

export function toggleSpace(active) {
    state.isLocalSpace = active;
    state.transformControl.setSpace(state.isLocalSpace ? 'local' : 'world');
    if (state.transformControl.object) {
        const obj = state.transformControl.object;
        state.transformControl.detach();
        state.transformControl.attach(obj);
    }
}

export function setMode(mode) {
    state.transformControl.setMode(mode);
    state.transformControl.setSpace(state.isLocalSpace ? 'local' : 'world');
}

export function toggleSnap(active) {
    state.snapEnabled = active;
    state.transformControl.setTranslationSnap(active ? 0.5 : null);
    state.transformControl.setRotationSnap(active ? Math.PI / 4 : null);
}
