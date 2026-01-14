import * as THREE from 'three';

export const state = {
    scene: null,
    renderer: null,
    controls: null,
    transformControl: null,
    camera: null,
    cameraPersp: null,
    cameraOrtho: null,
    activeCamera: null,

    viewCubeScene: null,
    viewCubeCamera: null,
    viewCubeMesh: null,
    viewCubeDim: 150,
    isAnimatingView: false,
    viewCubeArrows: [],

    objetsEditables: [],
    selectionActuelle: [],
    selectionGroup: null,

    raycaster: new THREE.Raycaster(),
    souris: new THREE.Vector2(),
    mouseOnDown: new THREE.Vector2(),
    snapEnabled: false,

    showColors: true,
    showWireframes: true,
    isLocalSpace: false,

    historyStack: [],
    historyIndex: -1,
    dragStartData: null,
};

export function setSelection(newSelection) {
    state.selectionActuelle = newSelection;
}

export function pushToObjetsEditables(obj) {
    state.objetsEditables.push(obj);
}

export function removeFromObjetsEditables(obj) {
    state.objetsEditables = state.objetsEditables.filter(o => o !== obj);
}
