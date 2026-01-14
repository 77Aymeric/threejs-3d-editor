import * as THREE from 'three';
import { state } from './state';
import { updateUI, renderTree } from '../ui/ui';
import { updateGizmo, degrouperSelection, grouperSelection } from './selection';

export function pushHistory(action) {
    if (state.historyIndex < state.historyStack.length - 1) {
        state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
    }
    state.historyStack.push(action);
    state.historyIndex++;
}

export function applyHistoryAction(action, mode) {
    degrouperSelection();

    if (action.type === 'add') {
        const target = action.object;
        if (mode === 'undo') {
            state.scene.remove(target);
            state.objetsEditables = state.objetsEditables.filter(o => o !== target);
            state.selectionActuelle = [];
        } else {
            state.scene.add(target);
            if (!state.objetsEditables.includes(target)) state.objetsEditables.push(target);
        }
    }
    else if (action.type === 'remove') {
        const target = action.object;
        const list = Array.isArray(target) ? target : [target];
        if (mode === 'undo') {
            list.forEach(o => {
                state.scene.add(o);
                if (!state.objetsEditables.includes(o)) state.objetsEditables.push(o);
            });
            state.selectionActuelle = [...list];
        } else {
            list.forEach(o => {
                state.scene.remove(o);
                state.objetsEditables = state.objetsEditables.filter(x => x !== o);
            });
            state.selectionActuelle = [];
        }
    }
    else if (action.type === 'transform_multi') {
        const dataState = mode === 'undo' ? action.before : action.after;
        action.objects.forEach((obj, i) => {
            const data = dataState[i];
            obj.position.copy(data.position);
            obj.quaternion.copy(data.quaternion);
            obj.scale.copy(data.scale);
        });
        state.selectionActuelle = [...action.objects];
    }
    else if (action.type === 'color_change') {
        const color = mode === 'undo' ? action.before : action.after;
        action.objects.forEach(obj => obj.material.color.setHex(color));
    }

    grouperSelection();
    updateGizmo();
    updateUI();
    renderTree();
}

export function undo() {
    if (state.historyIndex < 0) return;
    const action = state.historyStack[state.historyIndex];
    state.historyIndex--;
    applyHistoryAction(action, 'undo');
}

export function redo() {
    if (state.historyIndex >= state.historyStack.length - 1) return;
    state.historyIndex++;
    const action = state.historyStack[state.historyIndex];
    applyHistoryAction(action, 'redo');
}
