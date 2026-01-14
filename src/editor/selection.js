import * as THREE from 'three';
import { state } from './state';
import { updateUI, renderTree } from '../ui/ui';
import { applyColorState, applyWireframeState } from './utils';

export function updateSelection(nouveauxObjets, append = false) {
    degrouperSelection();
    if (append) {
        nouveauxObjets.forEach(obj => {
            const idx = state.selectionActuelle.indexOf(obj);
            if (idx === -1) state.selectionActuelle.push(obj);
            else state.selectionActuelle.splice(idx, 1);
        });
    } else {
        state.selectionActuelle = [...nouveauxObjets];
    }
    grouperSelection();
    updateGizmo();
    updateUI();
    renderTree();
}

export function grouperSelection() {
    if (state.selectionActuelle.length <= 1) return;
    state.selectionGroup = new THREE.Group();
    state.scene.add(state.selectionGroup);
    const center = new THREE.Vector3();
    if (state.selectionActuelle.length > 0) {
        state.selectionActuelle.forEach(o => center.add(o.position));
        center.divideScalar(state.selectionActuelle.length);
    }
    state.selectionGroup.position.copy(center);
    state.selectionActuelle.forEach(obj => {
        state.selectionGroup.attach(obj);
    });
}

export function degrouperSelection() {
    if (!state.selectionGroup) return;
    const children = [...state.selectionGroup.children];
    children.forEach(child => {
        state.scene.attach(child);
    });
    state.scene.remove(state.selectionGroup);
    state.selectionGroup = null;
}

export function updateGizmo() {
    state.transformControl.detach();
    if (state.selectionActuelle.length === 1) {
        state.transformControl.attach(state.selectionActuelle[0]);
    } else if (state.selectionActuelle.length > 1 && state.selectionGroup) {
        state.transformControl.attach(state.selectionGroup);
    }
    state.transformControl.setSpace(state.isLocalSpace ? 'local' : 'world');
}
