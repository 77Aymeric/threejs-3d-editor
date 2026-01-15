import * as THREE from 'three';
import { state } from './state.js';
import { updateSelection } from './selection.js';
import { applyColorState, applyWireframeState } from './utils.js';
import { pushHistory } from './history.js';

export function ajouterAction(type) {
    let geo, baseName, geometryType;
    if (type === 'cube') {
        geo = new THREE.BoxGeometry(1, 1, 1);
        baseName = 'cube';
        geometryType = 'BoxGeometry';
    } else if (type === 'sphere') {
        geo = new THREE.SphereGeometry(0.5, 32, 32);
        baseName = 'sphere';
        geometryType = 'SphereGeometry';
    } else if (type === 'triangle') {
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
        baseName = 'triangle';
        geometryType = 'CylinderGeometry';
    } else {
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        baseName = 'cylindre';
        geometryType = 'CylinderGeometry';
    }
    creerObjet(geo, geometryType, baseName);
}

export function creerObjet(geometry, type, baseName, existingMat, existingTransform) {
    let material = existingMat ? existingMat.clone() : new THREE.MeshToonMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    mesh.add(line);

    if (existingTransform) {
        mesh.position.copy(existingTransform.position);
        mesh.quaternion.copy(existingTransform.quaternion);
        mesh.scale.copy(existingTransform.scale);
    } else {
        mesh.position.y = 0.5;
    }

    mesh.userData = { type: type, id: Date.now() + Math.random() };
    mesh.name = baseName || "obj_" + mesh.userData.id.toString().slice(-4);

    state.scene.add(mesh);
    state.objetsEditables.push(mesh);

    applyColorState(mesh);
    applyWireframeState(mesh);

    if (!existingTransform) {
        pushHistory({ type: 'add', object: mesh });
        updateSelection([mesh]);
    }
    return mesh;
}

export function dupliquerSelection() {
    if (state.selectionActuelle.length === 0) return;
    const clones = [];
    state.selectionActuelle.forEach(original => {
        const geo = original.geometry.clone();
        const mat = original.material.clone();
        const clone = new THREE.Mesh(geo, mat);

        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        clone.add(line);

        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        original.getWorldPosition(p);
        original.getWorldQuaternion(q);
        original.getWorldScale(s);

        clone.position.copy(p);
        clone.quaternion.copy(q);
        clone.scale.copy(s);

        clone.userData = { type: original.userData.type, id: Date.now() + Math.random() };
        if (original.userData.savedColor) clone.userData.savedColor = original.userData.savedColor;
        clone.name = original.name + "_copy";

        state.scene.add(clone);
        state.objetsEditables.push(clone);
        clones.push(clone);

        applyColorState(clone);
        applyWireframeState(clone);
    });
    updateSelection(clones);
}

export function supprimerSelection() {
    if (state.selectionActuelle.length === 0) return;
    const toRemove = [...state.selectionActuelle];
    pushHistory({ type: 'remove', object: toRemove });
    // Note: degrouperSelection handles detaching
    import('./selection.js').then(m => m.degrouperSelection());
    toRemove.forEach(obj => {
        state.scene.remove(obj);
        state.objetsEditables = state.objetsEditables.filter(o => o !== obj);
    });
    updateSelection([]);
}

export function toutEffacer() {
    if (state.objetsEditables.length === 0) return;
    if (!confirm('Voulez-vous vraiment tout effacer ? Cette action est irréversible (sauf via Ctrl+Z).')) return;

    const toRemove = [...state.objetsEditables];
    pushHistory({ type: 'remove', object: toRemove });

    import('./selection.js').then(m => m.updateSelection([]));

    toRemove.forEach(obj => {
        state.scene.remove(obj);
    });
    // Vider le tableau en gardant la référence
    state.objetsEditables.length = 0;
}
