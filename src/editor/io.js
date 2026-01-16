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

    // 1. Identifier la fonction exportée comme point d'entrée prioritaire
    let entryPoint = null;
    const exportMatch = code.match(/export\s+(?:default\s+)?function\s+([a-zA-Z0-9_$]+)/);
    if (exportMatch) entryPoint = exportMatch[1];

    // 2. Supprimer les mots-clés export pour la compatibilité new Function
    code = code.replace(/export\s+default\s+/g, '').replace(/export\s+/g, '');

    // 3. Si pas d'export explicite, prendre la première fonction
    if (!entryPoint) {
        const match = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (match) entryPoint = match[1];
    }

    // 4. Ajouter l'appel final
    if (entryPoint) {
        code += `\nreturn ${entryPoint}();`;
    }
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

        const objName = m.name || (m.userData && m.userData.name) || 'imported';
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
    js += "    const group = new THREE.Group();\n\n";

    // 1. Analyser les ressources uniques (Géométries et Matériaux)
    const geometries = new Map(); // key -> { varName, code }
    const materials = new Map();  // colorHex -> varName

    let geoCounter = 0;
    let matCounter = 0;

    const getGeometryKey = (obj) => {
        // En cas de clone, obj.geometry.type peut être générique, on se fie à userData.type s'il existe
        const type = obj.userData.type || obj.geometry.type;
        if (type.includes('Cylinder') || type.includes('Cone')) {
            const segs = obj.geometry.parameters && obj.geometry.parameters.radialSegments ? obj.geometry.parameters.radialSegments : 32;
            return `${type}_${segs}`;
        }
        return type;
    };

    const getGeometryCode = (type, key) => {
        if (type.includes('Box')) return 'new THREE.BoxGeometry(1, 1, 1)';
        if (type.includes('Sphere')) return 'new THREE.SphereGeometry(0.5, 32, 32)';
        if (type.includes('Plane')) return 'new THREE.PlaneGeometry(1, 1)';
        if (type.includes('Ring')) return 'new THREE.RingGeometry(0.2, 0.5, 32)';
        if (type.includes('Cylinder')) {
            const segs = key.split('_')[1] || 32;
            return `new THREE.CylinderGeometry(0.5, 0.5, 1, ${segs})`;
        }
        if (type.includes('Cone')) {
            const segs = key.split('_')[1] || 32;
            return `new THREE.ConeGeometry(0.5, 1, ${segs})`;
        }
        return 'new THREE.BoxGeometry(1, 1, 1)';
    };

    // Collecter les ressources
    state.objetsEditables.forEach(obj => {
        // Matériau (MeshToonMaterial)
        if (obj.material && obj.material.color) {
            let hexVal = obj.material.color.getHex();
            if (!state.showColors && obj.userData.savedColor !== undefined) { hexVal = obj.userData.savedColor; }
            const colorKey = hexVal;

            if (!materials.has(colorKey)) {
                matCounter++;
                const varName = `mat${matCounter}`;
                materials.set(colorKey, varName);
            }
        }

        // Géométrie
        if (obj.geometry) {
            const type = obj.userData.type || obj.geometry.type;
            const geoKey = getGeometryKey(obj);
            if (!geometries.has(geoKey)) {
                geoCounter++;
                const varName = `geo${geoCounter}`;
                geometries.set(geoKey, {
                    varName: varName,
                    code: getGeometryCode(type, geoKey)
                });
            }
        }
    });

    // 2. Générer les définitions
    js += "    // Géométries partagées\n";
    geometries.forEach((value, key) => {
        js += `    const ${value.varName} = ${value.code};\n`;
        js += `    const edges_${value.varName} = new THREE.EdgesGeometry(${value.varName});\n`;
    });
    js += "\n";

    js += "    // Matériaux partagés\n";
    materials.forEach((varName, colorVal) => {
        const c = '0x' + colorVal.toString(16).padStart(6, '0');
        js += `    const ${varName} = new THREE.MeshToonMaterial({ color: ${c} });\n`;
    });
    js += "\n";

    // Matériau pour les arêtes (commun)
    js += "    const matEdges = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });\n\n";

    // Helper compact
    js += "    const add = (g, m, e, p, s, r) => {\n";
    js += "        const o = new THREE.Mesh(g, m);\n";
    js += "        if (p) o.position.set(p[0], p[1], p[2]);\n";
    js += "        if (s) o.scale.set(s[0], s[1], s[2]);\n";
    js += "        if (r) o.rotation.set(r[0], r[1], r[2]);\n";
    js += "        o.castShadow = true; o.receiveShadow = true;\n";
    js += "        o.add(new THREE.LineSegments(e, matEdges));\n";
    js += "        group.add(o);\n";
    js += "    };\n\n";

    // 3. Générer les objets
    state.objetsEditables.forEach((obj, i) => {
        const p = obj.position, r = obj.rotation, s = obj.scale;

        let hexVal = 0xffffff;
        if (obj.material && obj.material.color) {
            hexVal = obj.material.color.getHex();
            if (!state.showColors && obj.userData.savedColor !== undefined) { hexVal = obj.userData.savedColor; }
        }

        const matVar = materials.get(hexVal) || 'new THREE.MeshBasicMaterial({ color: 0xff00ff })';
        const geoKey = getGeometryKey(obj);
        const geoEntry = geometries.get(geoKey);
        const geoVar = geoEntry ? geoEntry.varName : 'new THREE.BoxGeometry(1,1,1)';
        const edgesVar = geoEntry ? `edges_${geoEntry.varName}` : `new THREE.EdgesGeometry(${geoVar})`;

        const x = parseFloat(p.x.toFixed(3)), y = parseFloat(p.y.toFixed(3)), z = parseFloat(p.z.toFixed(3));
        const sx = parseFloat(s.x.toFixed(3)), sy = parseFloat(s.y.toFixed(3)), sz = parseFloat(s.z.toFixed(3));
        const rx = parseFloat(r.x.toFixed(3)), ry = parseFloat(r.y.toFixed(3)), rz = parseFloat(r.z.toFixed(3));

        let args = `${geoVar}, ${matVar}, ${edgesVar}, [${x}, ${y}, ${z}], [${sx}, ${sy}, ${sz}]`;
        if (rx !== 0 || ry !== 0 || rz !== 0) {
            args += `, [${rx}, ${ry}, ${rz}]`;
        }

        js += `    add(${args});\n`;
    });

    js += "    return group;\n";
    js += "}";

    if (etaitGroupe) grouperSelection();

    const area = document.getElementById('export-area');
    area.value = js;
    document.getElementById('modal-export').style.display = 'flex';
}

