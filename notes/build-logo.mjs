import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('./logo-contours.json',import.meta.url),'utf8'));
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.()})}readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.()})}};
const group=new THREE.Group();group.name='UOSSA_AESUO_3D_relief';
const palette={gold:'#DBA923',green:'#07562F',red:'#BC163C'};
for(const [name,items]of Object.entries(data)){
 const shapes=items.map(item=>{const shape=new THREE.Shape(item.outer.map(([x,y])=>new THREE.Vector2(x,y)));shape.holes=item.holes.map(points=>new THREE.Path(points.map(([x,y])=>new THREE.Vector2(x,y))));return shape});
 const depth=name==='gold'?.18:.13;
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.009,bevelSegments:2,steps:1,curveSegments:1});geometry.translate(0,0,-depth/2);
 const material=new THREE.MeshStandardMaterial({color:palette[name],metalness:name==='gold'?.62:.22,roughness:name==='gold'?.3:.38});
 const mesh=new THREE.Mesh(geometry,material);mesh.name=`UOSSA_${name}_enamel`;group.add(mesh);
}
const result=await new GLTFExporter().parseAsync(group,{binary:true});
await writeFile(new URL('../public/models/uossa-logo-relief.glb',import.meta.url),Buffer.from(result));
console.log(JSON.stringify({bytes:result.byteLength,meshes:group.children.length,triangles:group.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)}));
