import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { state } from './editor/state.js';
import { setupViewCube } from './editor/camera.js';
import { onWindowResize, onPointerDown, onPointerUp, onPointerMove, onKeyDown, commencerDrag, terminerDrag } from './editor/events.js';
import { updateUI, renderTree, toggleTree, majNom, majPositionParInput, majCouleur } from './ui/ui.js';
import { undo, redo } from './editor/history.js';
import { ajouterAction, dupliquerSelection, supprimerSelection } from './editor/objects.js';
import { setMode, toggleSnap, toggleSpace, toggleColors, toggleWireframes } from './editor/utils.js';
import { toggleCamera } from './editor/camera.js';
import { ouvrirModalImport, fermerModalImport, executerImport, exporterCode, fermerModalExport, copierExport } from './editor/io.js';

function init() {
    const container = document.getElementById('canvas-container');

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x222222);

    const aspect = window.innerWidth / window.innerHeight;
    state.cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    state.cameraPersp.position.set(8, 8, 8);
    state.cameraPersp.lookAt(0, 0, 0);

    const frustumSize = 15;
    state.cameraOrtho = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 1000
    );
    state.cameraOrtho.position.set(8, 8, 8);
    state.cameraOrtho.lookAt(0, 0, 0);

    state.activeCamera = state.cameraPersp;
    state.camera = state.activeCamera;

    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    state.renderer.autoClear = false;
    container.appendChild(state.renderer.domElement);

    setupEnvironment();
    setupViewCube();

    state.controls = new OrbitControls(state.activeCamera, state.renderer.domElement);
    state.controls.enableDamping = true;

    state.transformControl = new TransformControls(state.activeCamera, state.renderer.domElement);
    state.transformControl.setMode('translate');

    document.getElementById('local-toggle').checked = state.isLocalSpace;
    state.transformControl.setSpace(state.isLocalSpace ? 'local' : 'world');

    state.transformControl.addEventListener('dragging-changed', function (event) {
        state.controls.enabled = !event.value;
        if (event.value) commencerDrag();
        else terminerDrag();
    });
    state.transformControl.addEventListener('change', () => {
        if (state.selectionActuelle.length > 0) import('./ui/ui.js').then(m => m.updateUIFromSelection());
    });
    state.scene.add(state.transformControl);

    window.addEventListener('resize', onWindowResize);
    state.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    state.renderer.domElement.addEventListener('pointerup', onPointerUp);
    state.renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown);

    // Global exposed functions for HTML buttons
    window.undo = undo;
    window.redo = redo;
    window.ajouterAction = ajouterAction;
    window.setMode = setMode;
    window.toggleCamera = toggleCamera;
    window.toggleSnap = toggleSnap;
    window.toggleSpace = toggleSpace;
    window.toggleColors = toggleColors;
    window.toggleWireframes = toggleWireframes;
    window.ouvrirModalImport = ouvrirModalImport;
    window.fermerModalImport = fermerModalImport;
    window.executerImport = executerImport;
    window.exporterCode = exporterCode;
    window.fermerModalExport = fermerModalExport;
    window.copierExport = copierExport;
    window.toggleTree = toggleTree;
    window.dupliquerSelection = dupliquerSelection;
    window.supprimerSelection = supprimerSelection;
    window.majNom = majNom;
    window.majPositionParInput = majPositionParInput;
    window.majCouleur = majCouleur;

    animate();
    renderTree();
    updateUI();
}

function setupEnvironment() {
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    state.scene.add(dir);
    const grid = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    state.scene.add(grid);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.2 }));
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    state.scene.add(plane);
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();

    state.viewCubeCamera.position.copy(state.activeCamera.position).sub(state.controls.target);
    state.viewCubeCamera.position.setLength(5);
    state.viewCubeCamera.up.copy(state.activeCamera.up);
    state.viewCubeCamera.lookAt(0, 0, 0);

    state.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    state.renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
    state.renderer.setScissorTest(true);
    state.renderer.clear();
    state.renderer.render(state.scene, state.activeCamera);

    const vcSize = state.viewCubeDim;
    const vcX = window.innerWidth - 300 - vcSize - 20;
    const vcY = window.innerHeight - vcSize - 80;
    state.renderer.setViewport(vcX, vcY, vcSize, vcSize);
    state.renderer.setScissor(vcX, vcY, vcSize, vcSize);
    state.renderer.setScissorTest(true);
    state.renderer.clearDepth();
    state.renderer.render(state.viewCubeScene, state.viewCubeCamera);
}

init();
