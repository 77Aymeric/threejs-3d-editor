import * as THREE from 'three';
import { state } from '../editor/state.js';
import { updateSelection } from '../editor/selection.js';

export function toggleTree() {
    const panel = document.getElementById('ui-tree-panel');
    const btn = document.getElementById('tree-toggle-btn');
    panel.classList.toggle('collapsed');
    btn.innerText = panel.classList.contains('collapsed') ? '▶' : '◀';
}

export function renderTree() {
    const list = document.getElementById('tree-list');
    if (!list) return;
    list.innerHTML = '';
    const objCount = document.getElementById('obj-count');
    if (objCount) objCount.innerText = state.objetsEditables.length;

    state.objetsEditables.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = 'tree-item';
        if (state.selectionActuelle.includes(obj)) item.classList.add('selected');

        item.draggable = true;
        item.ondragstart = (e) => { e.dataTransfer.setData('text/plain', index); };
        item.ondragover = (e) => { e.preventDefault(); item.classList.add('drag-over'); };
        item.ondragleave = () => { item.classList.remove('drag-over'); };
        item.ondrop = (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            deplacerObjetListe(fromIndex, index);
        };
        item.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                updateSelection([obj], e.shiftKey);
            }
        };

        const spanName = document.createElement('span');
        spanName.innerText = obj.name;
        spanName.style.flexGrow = "1";
        spanName.ondblclick = () => activerRenommageTree(spanName, obj);
        item.appendChild(spanName);
        list.appendChild(item);
    });
}

function deplacerObjetListe(from, to) {
    if (from === to) return;
    const movedItem = state.objetsEditables.splice(from, 1)[0];
    state.objetsEditables.splice(to, 0, movedItem);
    renderTree();
}

function activerRenommageTree(span, obj) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = obj.name;
    input.className = 'text-black px-1 rounded h-6 text-sm w-full';
    const valider = () => {
        obj.name = input.value || obj.name;
        renderTree();
        updateUI();
    };
    input.onblur = valider;
    input.onkeydown = (e) => { if (e.key === 'Enter') valider(); };
    span.replaceWith(input);
    input.focus();
}

export function updateUI() {
    const count = state.selectionActuelle.length;
    const props = document.getElementById('object-properties');
    const noSel = document.getElementById('no-selection');
    const grpName = document.getElementById('group-name');
    const countDisplay = document.getElementById('selection-count');

    if (count > 0) {
        if (props) props.style.display = 'flex';
        if (noSel) noSel.style.display = 'none';
        if (countDisplay) countDisplay.innerText = count;
        if (grpName) grpName.style.display = (count === 1) ? 'block' : 'none';
        if (count === 1) {
            const inputName = document.getElementById('input-name');
            if (inputName) inputName.value = state.selectionActuelle[0].name;
        }
        updateUIFromSelection();
    } else {
        if (props) props.style.display = 'none';
        if (noSel) noSel.style.display = 'block';
    }
}

export function updateUIFromSelection() {
    let refObj = state.selectionGroup || state.selectionActuelle[0];
    if (!refObj) return;
    const p = refObj.position;
    const posX = document.getElementById('pos-x');
    const posY = document.getElementById('pos-y');
    const posZ = document.getElementById('pos-z');
    if (posX) posX.value = parseFloat(p.x.toFixed(2));
    if (posY) posY.value = parseFloat(p.y.toFixed(2));
    if (posZ) posZ.value = parseFloat(p.z.toFixed(2));

    let colorHex;
    if (state.selectionActuelle[0].userData.savedColor !== undefined && !state.showColors) {
        colorHex = state.selectionActuelle[0].userData.savedColor;
    } else if (state.selectionActuelle[0].material) {
        colorHex = state.selectionActuelle[0].material.color.getHex();
    }

    if (colorHex !== undefined) {
        let hexStr = colorHex.toString(16);
        while (hexStr.length < 6) hexStr = "0" + hexStr;
        const inputColor = document.getElementById('input-color');
        if (inputColor) inputColor.value = '#' + hexStr;
    }
}

export function majNom(val) {
    if (state.selectionActuelle.length === 1) {
        state.selectionActuelle[0].name = val;
        renderTree();
    }
}

export function majPositionParInput() {
    const x = parseFloat(document.getElementById('pos-x').value);
    const y = parseFloat(document.getElementById('pos-y').value);
    const z = parseFloat(document.getElementById('pos-z').value);
    let target = state.selectionGroup || state.selectionActuelle[0];
    if (target) {
        target.position.set(x, y, z);
    }
}

export function majCouleur(val) {
    state.selectionActuelle.forEach(obj => {
        const hexVal = new THREE.Color(val).getHex();
        if (!state.showColors) {
            obj.userData.savedColor = hexVal;
        } else {
            obj.material.color.setHex(hexVal);
            obj.userData.savedColor = hexVal;
        }
    });
}
