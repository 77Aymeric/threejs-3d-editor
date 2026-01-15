import * as THREE from 'three';
import { state } from './state.js';
import { updateSelection, degrouperSelection, grouperSelection } from './selection.js';
import { creerObjet } from './objects.js';

export function ouvrirModalImport() {
    document.getElementById('modal-import').style.display = 'flex';
}

export function fermerModalImport() {
    document.getElementById('modal-import').style.display = 'none';
}

export function executerImport() {
    let code = document.getElementById('import-area').value.trim();
    if (!code) return;

    // Supprimer 'export' ou 'export default' au début si présent
    code = code.replace(/^(export\s+default\s+|export\s+)/, '');

    const match = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (match && code.endsWith('}')) code += `\nreturn ${match[1]}();`;
    try {
        const func = new Function('THREE', code);
        const res = func(THREE);
        if (res && res.isObject3D) {
            importRecursif(res);
            fermerModalImport();
            document.getElementById('import-area').value = '';
        }
        else alert("Code invalide");
    } catch (e) {
        console.error(e);
        alert("Erreur: " + e.message);
    }
}

export function importRecursif(root) {
    degrouperSelection();
    state.scene.add(root);
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse(c => {
        if (c.isMesh) meshes.push(c);
    });

    const nouveauxObjets = [];
    meshes.forEach(m => {
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        m.getWorldPosition(p);
        m.getWorldQuaternion(q);
        m.getWorldScale(s);

        let type = 'BoxGeometry';
        let geo = new THREE.BoxGeometry(1, 1, 1);

        const gType = m.geometry.type;
        const pms = m.geometry.parameters || {};

        if (gType.includes('Cylinder')) {
            type = 'CylinderGeometry';
            const rad = pms.radialSegments || 32;
            geo = new THREE.CylinderGeometry(0.5, 0.5, 1, rad);
        } else if (gType.includes('Sphere')) {
            type = 'SphereGeometry';
            geo = new THREE.SphereGeometry(0.5, 32, 32);
        } else if (gType.includes('Plane')) {
            type = 'PlaneGeometry';
            geo = new THREE.PlaneGeometry(1, 1);
        } else if (gType.includes('Cone')) {
            type = 'ConeGeometry';
            const rad = pms.radialSegments || 32;
            geo = new THREE.ConeGeometry(0.5, 1, rad);
        } else if (gType.includes('Ring')) {
            type = 'RingGeometry';
            geo = new THREE.RingGeometry(0.2, 0.5, 32);
        } else if (gType.includes('Box')) {
            type = 'BoxGeometry';
            geo = new THREE.BoxGeometry(1, 1, 1);
        } else {
            // Default or fallback to cloning the original geometry if unknown
            geo = m.geometry.clone();
            type = gType;
        }

        // Adjust scale based on original parameters to maintain visual size with unit geometry (0.5 radius / 1 unit size)
        if (pms) {
            if (gType.includes('Box')) {
                if (pms.width !== undefined) s.x *= pms.width;
                if (pms.height !== undefined) s.y *= pms.height;
                if (pms.depth !== undefined) s.z *= pms.depth;
            } else if (gType.includes('Sphere')) {
                const r = pms.radius !== undefined ? pms.radius : 1;
                const d = r * 2;
                s.x *= d; s.y *= d; s.z *= d;
            } else if (gType.includes('Cylinder')) {
                if (pms.height !== undefined) s.y *= pms.height;
                const rt = pms.radiusTop !== undefined ? pms.radiusTop : 1;
                const rb = pms.radiusBottom !== undefined ? pms.radiusBottom : 1;
                const avgD = (rt + rb); // (rt+rb)/2 * 2
                s.x *= avgD; s.z *= avgD;
            } else if (gType.includes('Cone')) {
                if (pms.height !== undefined) s.y *= pms.height;
                const r = pms.radius !== undefined ? pms.radius : 1;
                const d = r * 2;
                s.x *= d; s.z *= d;
            } else if (gType.includes('Plane')) {
                if (pms.width !== undefined) s.x *= pms.width;
                if (pms.height !== undefined) s.y *= pms.height;
            } else if (gType.includes('Ring')) {
                const or = pms.outerRadius !== undefined ? pms.outerRadius : 1;
                const d = or * 2;
                s.x *= d; s.y *= d;
            }
        }

        let mat = m.material;
        if (Array.isArray(mat)) mat = mat[0];
        // Clone material to keep colors
        const newMat = mat.clone();

        const objName = m.name || (m.userData && m.userData.name) || 'import';
        const obj = creerObjet(geo, type, objName, newMat, { position: p, quaternion: q, scale: s });
        nouveauxObjets.push(obj);
    });

    state.scene.remove(root);
    updateSelection([]);
    if (nouveauxObjets.length > 0) {
        import('./camera.js').then(cam => cam.focusSurObjets(nouveauxObjets));
    }
}

export function fermerModalExport() {
    document.getElementById('modal-export').style.display = 'none';
}

export function copierExport() {
    const area = document.getElementById('export-area');
    area.select();
    area.setSelectionRange(0, 99999);
    try {
        navigator.clipboard.writeText(area.value);
        const btn = document.querySelector('#modal-export .btn-success');
        const oldText = btn.innerText;
        btn.innerText = "Copié !";
        setTimeout(() => btn.innerText = oldText, 2000);
    } catch (e) {
        document.execCommand('copy');
    }
}

export function exporterCode() {
    const etaitGroupe = !!state.selectionGroup;
    degrouperSelection();

    let js = "export function creerModele() {\n";
    js += "    const group = new THREE.Group();\n";

    state.objetsEditables.forEach((obj, i) => {
        const p = obj.position, r = obj.rotation, s = obj.scale;
        let hexVal = obj.material.color.getHex();
        if (!state.showColors && obj.userData.savedColor !== undefined) { hexVal = obj.userData.savedColor; }
        const c = '0x' + hexVal.toString(16).padStart(6, '0');
        const t = obj.userData.type;
        const n = obj.name.replace(/[^a-zA-Z0-9]/g, '_') || 'obj' + i;

        let geometryCode;
        if (t === 'BoxGeometry') {
            geometryCode = 'new THREE.BoxGeometry(1, 1, 1)';
        } else if (t === 'SphereGeometry') {
            geometryCode = 'new THREE.SphereGeometry(0.5, 32, 32)';
        } else if (t === 'CylinderGeometry') {
            const segs = obj.geometry.parameters && obj.geometry.parameters.radialSegments ? obj.geometry.parameters.radialSegments : 32;
            geometryCode = `new THREE.CylinderGeometry(0.5, 0.5, 1, ${segs})`;
        } else if (t === 'ConeGeometry') {
            const segs = obj.geometry.parameters && obj.geometry.parameters.radialSegments ? obj.geometry.parameters.radialSegments : 32;
            geometryCode = `new THREE.ConeGeometry(0.5, 1, ${segs})`;
        } else if (t === 'RingGeometry') {
            geometryCode = 'new THREE.RingGeometry(0.2, 0.5, 32)';
        } else if (t === 'PlaneGeometry') {
            geometryCode = 'new THREE.PlaneGeometry(1, 1)';
        } else {
            geometryCode = 'new THREE.BoxGeometry(1, 1, 1)';
        }

        js += `
    // ${n}
    {
        const g = ${geometryCode};
        const m = new THREE.MeshToonMaterial({ color: ${c} });
        const o = new THREE.Mesh(g, m);
        o.position.set(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)});
        o.rotation.set(${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)});
        o.scale.set(${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)});
        o.castShadow = true; 
        o.receiveShadow = true;
        
        const edges = new THREE.EdgesGeometry(g);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        o.add(line);
        group.add(o);
    }\n`;
    });

    js += "    return group;\n";
    js += "}";

    if (etaitGroupe) grouperSelection();

    const area = document.getElementById('export-area');
    area.value = js;
    document.getElementById('modal-export').style.display = 'flex';
}

