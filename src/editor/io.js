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

function importRecursif(root) {
    degrouperSelection();
    state.scene.add(root);
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse(c => { if (c.isMesh) meshes.push(c); });
    const nouveauxObjets = [];
    meshes.forEach(m => {
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        m.getWorldPosition(p);
        m.getWorldQuaternion(q);
        m.getWorldScale(s);
        let type = 'BoxGeometry';
        let geo = new THREE.BoxGeometry(1, 1, 1);
        if (m.geometry.type.includes('Cylinder')) {
            type = 'CylinderGeometry';
            geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        }
        else { if (m.geometry.type.includes('Plane')) s.z *= 0.05; }

        if (m.geometry.parameters) {
            if (m.geometry.parameters.width) s.x *= m.geometry.parameters.width;
            if (m.geometry.parameters.height) s.y *= m.geometry.parameters.height;
            if (m.geometry.parameters.depth) s.z *= m.geometry.parameters.depth;
            if (m.geometry.parameters.radiusTop) { const r = m.geometry.parameters.radiusTop * 2; s.x *= r; s.z *= r; }
            if (m.geometry.parameters.radialSegments) {
                if (m.geometry.parameters.radialSegments === 3) { geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3); }
                else { geo = new THREE.CylinderGeometry(0.5, 0.5, 1, m.geometry.parameters.radialSegments); }
            }
        }
        let mat = m.material; if (Array.isArray(mat)) mat = mat[0];
        const obj = creerObjet(geo, type, 'import', mat, { position: p, quaternion: q, scale: s });
        nouveauxObjets.push(obj);
    });
    state.scene.remove(root);
    updateSelection([]);
    if (nouveauxObjets.length > 0) {
        import('./camera.js').then(cam => cam.focusSurObjets(nouveauxObjets));
    }
}

export function exporterCode() {
    const etaitGroupe = !!state.selectionGroup;
    degrouperSelection();
    let js = "";
    state.objetsEditables.forEach((obj, i) => {
        const p = obj.position, r = obj.rotation, s = obj.scale;
        let hexVal = obj.material.color.getHex();
        if (!state.showColors && obj.userData.savedColor !== undefined) { hexVal = obj.userData.savedColor; }
        const c = '0x' + hexVal.toString(16);
        const t = obj.userData.type;
        const n = obj.name.replace(/[^a-zA-Z0-9]/g, '_') || 'obj' + i;
        let geometryCode;
        if (t === 'BoxGeometry') { geometryCode = 'new THREE.BoxGeometry(1, 1, 1)'; }
        else if (t === 'CylinderGeometry') {
            const segs = obj.geometry.parameters && obj.geometry.parameters.radialSegments ? obj.geometry.parameters.radialSegments : 32;
            geometryCode = `new THREE.CylinderGeometry(0.5, 0.5, 1, ${segs})`;
        }
        js += `
            // ${n}
            {
                const g = ${geometryCode};
                const m = new THREE.MeshToonMaterial({color:${c}});
                const o = new THREE.Mesh(g,m);
                o.position.set(${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)});
                o.rotation.set(${r.x.toFixed(3)},${r.y.toFixed(3)},${r.z.toFixed(3)});
                o.scale.set(${s.x.toFixed(3)},${s.y.toFixed(3)},${s.z.toFixed(3)});
                o.castShadow=true; o.receiveShadow=true;
                const edges = new THREE.EdgesGeometry(g);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
                o.add(line);
                scene.add(o);
            }`;
    });
    if (etaitGroupe) grouperSelection();
    const html = `<!DOCTYPE html><html><head><title>Export</title><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script></head><body style="margin:0"><script>
            const scene=new THREE.Scene();scene.background=new THREE.Color(0x222222);
            const camera=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,0.1,1000);camera.position.set(8,8,8);
            const r=new THREE.WebGLRenderer({antialias:true});r.setSize(window.innerWidth,window.innerHeight);r.shadowMap.enabled=true;document.body.appendChild(r.domElement);
            new THREE.OrbitControls(camera,r.domElement);
            scene.add(new THREE.AmbientLight(0xffffff,0.6));
            const d=new THREE.DirectionalLight(0xffffff,0.8);d.position.set(10,20,10);d.castShadow=true;scene.add(d);
            scene.add(new THREE.GridHelper(20,20,0x444444,0x333333));
            ${js}
            function animate(){requestAnimationFrame(animate);r.render(scene,camera);}animate();
            window.onresize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();r.setSize(window.innerWidth,window.innerHeight);};
            <\/script></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'export.html';
    a.click();
}
