import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { START_Z, TRAVEL, ROAD_HALF_WIDTH, roadX, roadSlope, roadHeight, terrainHeight } from './route.js';

export function createSavanna(canvas, state, { mobile, calm, onReady }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:!mobile, powerPreference:'high-performance'}); }
  catch { document.documentElement.classList.add('no-webgl'); onReady(); return {render(){},dispose(){}}; }
  document.documentElement.classList.remove('no-webgl');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  let quality = Math.min(devicePixelRatio, mobile ? 1.15 : 1.55);
  renderer.setPixelRatio(quality); renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#b2ac91', 0.0045);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 560);
  scene.add(new THREE.HemisphereLight('#ffe5b6','#4d462c',1.35));
  const sunLight = new THREE.DirectionalLight('#ffd19a',2.25); sunLight.position.set(-35,35,-70); scene.add(sunLight);
  const fill = new THREE.DirectionalLight('#d5e8ed',1.5); fill.position.set(15,10,35); scene.add(fill);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(); const environment = pmrem.fromScene(room,.04); room.dispose(); pmrem.dispose();
  scene.environment = environment.texture;
  let stopped = false, needsRender = true, loaded = 0;
  function ready(){needsRender=true;if(++loaded>=2&&!stopped)onReady();}
  let seed = 8291;
  const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const add = o => {scene.add(o);return o;};

  // Distant photographic atmosphere only; the road and the near landscape are meshes.
  const panorama = new THREE.TextureLoader().load('/textures/safari-sunset.webp',ready,undefined,ready);panorama.colorSpace=THREE.SRGBColorSpace;
  const skyMat = new THREE.ShaderMaterial({toneMapped:false,side:THREE.BackSide,depthWrite:false,uniforms:{map:{value:panorama},time:{value:0},pointer:{value:new THREE.Vector2()}},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D map;uniform float time;uniform vec2 pointer;varying vec3 direction;void main(){vec3 d=normalize(direction);vec2 uv=vec2(fract(.5+atan(d.x,-d.z)/6.28318),.5+asin(clamp(d.y,-1.,1.))/3.14159265);vec3 col=texture2D(map,uv).rgb;gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const sky = add(new THREE.Mesh(new THREE.SphereGeometry(440,40,24),skyMat));sky.frustumCulled=false;

  const groundGeometry = new THREE.PlaneGeometry(300,440,mobile?52:90,mobile?90:150);groundGeometry.rotateX(-Math.PI/2);groundGeometry.translate(0,0,-100);
  const gp=groundGeometry.attributes.position;
  for(let i=0;i<gp.count;i++)gp.setY(i,terrainHeight(gp.getX(i),gp.getZ(i)));
  groundGeometry.computeVertexNormals();
  const assetTextures=[];
  const texture=(path,color=false)=>{const t=new THREE.TextureLoader().load(path,()=>{needsRender=true});t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());assetTextures.push(t);return t;};
  const soil=texture('/textures/diff.jpg',true),normal=texture('/textures/normal.jpg');
  for(const t of [soil,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(75,110)}
  const terrainMat = new THREE.MeshStandardMaterial({color:'#b1a47d',map:soil,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),roughness:1,envMapIntensity:.1});
  terrainMat.onBeforeCompile = shader => {
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrain=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;').replace('#include <color_fragment>',`#include <color_fragment>\nfloat grain=fract(sin(dot(floor(vTerrain.xz*9.),vec2(127.1,311.7)))*43758.5453);float patches=sin(vTerrain.x*.21+sin(vTerrain.z*.1))*sin(vTerrain.z*.27);diffuseColor.rgb*=.79+.17*grain+.17*patches;`);
  };
  add(new THREE.Mesh(groundGeometry,terrainMat));

  // Broad red-earth track, twin worn ruts and ragged shoulders. The same curve drives the camera.
  const rows=420, columns=20, roadPositions=[], roadUV=[], roadIndices=[];
  for(let i=0;i<=rows;i++){
    const z=65-i/rows*330, center=roadX(z), slope=roadSlope(z), norm=Math.sqrt(1+slope*slope);
    for(let j=0;j<=columns;j++){
      const across=j/columns*2-1, offset=across*ROAD_HALF_WIDTH;
      const x=center+offset/norm, zz=z-offset*slope/norm;
      roadPositions.push(x,roadHeight(zz)+.008+0.035*(1-across*across),zz);roadUV.push(j/columns,(65-z)/4);
      if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+columns+1;roadIndices.push(a,b,a+1,b,b+1,a+1)}
    }
  }
  const roadGeo=new THREE.BufferGeometry();roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(roadPositions,3));roadGeo.setAttribute('uv',new THREE.Float32BufferAttribute(roadUV,2));roadGeo.setIndex(roadIndices);roadGeo.computeVertexNormals();
  const roadMat=new THREE.ShaderMaterial({transparent:true,depthWrite:true,side:THREE.DoubleSide,uniforms:{time:{value:0},soil:{value:soil}},vertexShader:`varying vec2 vUv;varying float depth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform sampler2D soil;varying vec2 vUv;varying float depth;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float grain=hash(floor(vUv*vec2(190.,70.)));float coarse=hash(floor(vUv*vec2(19.,12.)));float rut1=exp(-pow((vUv.x-.29-sin(vUv.y*.51)*.012)/(.04+.012*sin(vUv.y*.73)),2.));float rut2=exp(-pow((vUv.x-.71-sin(vUv.y*.51)*.012)/(.04+.01*cos(vUv.y*.83)),2.));float ridges=sin(vUv.y*105.)*.015;float edge=abs(vUv.x-.5)*2.;float alpha=1.-smoothstep(.78+coarse*.07,1.,edge);vec3 clay=mix(vec3(.42,.255,.12),vec3(.67,.445,.25),grain*.5+coarse*.25);clay-=(rut1+rut2)*vec3(.085,.065,.033);clay=mix(clay,texture2D(soil,vec2(vUv.x*1.3,vUv.y)).rgb*vec3(1.1,.91,.72),.82);clay-=(rut1+rut2)*.065;clay+=ridges*.3;float fog=1.-exp(-pow(depth*.0045,2.));gl_FragColor=vec4(mix(clay,vec3(.445,.413,.31),fog),alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const road=add(new THREE.Mesh(roadGeo,roadMat));road.renderOrder=1;

  // Grass tufts placed against the road curve, never through its driving corridor.
  const grassGeometry=new THREE.InstancedBufferGeometry();
  grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,-.018,.5,0,.018,.5,0,0,1,0],3));grassGeometry.setIndex([0,1,2,2,1,3,2,3,4]);
  const grassCount=mobile?2500:7000, offsets=new Float32Array(grassCount*3),sizes=new Float32Array(grassCount),angles=new Float32Array(grassCount);
  for(let i=0;i<grassCount;i++){
    const z=52-rand()*302,sign=rand()>.5?1:-1, distance=3.25+Math.pow(rand(),1.7)*69;
    const x=roadX(z)+sign*distance;offsets.set([x,terrainHeight(x,z),z],i*3);sizes[i]=.10+rand()*.24;angles[i]=rand()*Math.PI*2;
  }
  grassGeometry.setAttribute('offset',new THREE.InstancedBufferAttribute(offsets,3));grassGeometry.setAttribute('size',new THREE.InstancedBufferAttribute(sizes,1));grassGeometry.setAttribute('angle',new THREE.InstancedBufferAttribute(angles,1));
  const grassMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},pointer:{value:new THREE.Vector2()}},vertexShader:`attribute vec3 offset;attribute float size;attribute float angle;uniform float time;uniform vec2 pointer;varying float h;varying float depth;varying float variation;void main(){vec3 p=position;p.y*=size;float wind=sin(time*1.1+offset.x*.22+offset.z*.15)*.18+pointer.x*.035;p.x+=position.y*position.y*wind;p.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;p+=offset;vec4 mv=modelViewMatrix*vec4(p,1.);h=position.y;variation=fract(offset.x*.74+offset.z*.37);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float h;varying float depth;varying float variation;void main(){vec3 col=mix(vec3(.16,.17,.045),vec3(.69,.52,.20),h);col*=.75+variation*.4;float fog=1.-exp(-pow(depth*.0045,2.));gl_FragColor=vec4(mix(col,vec3(.445,.413,.31),fog),1.);}`});
  const grass=add(new THREE.Mesh(grassGeometry,grassMat));grass.frustumCulled=false;

  // Photographic alpha-tested vegetation, instanced in world space for real parallax.
  // Depth-writing cutouts avoid translucent sorting and limit mobile overdraw.
  function vegetation(path,count,isTree){
    const map=texture(path,true),geo=new THREE.InstancedBufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geo.setIndex([0,1,2,2,1,3]);
    const offsets=new Float32Array(count*3),scales=new Float32Array(count*2),variants=new Float32Array(count);
    for(let i=0;i<count;i++){
      const z=45-rand()*325,side=i%2?1:-1,dist=isTree?9+Math.pow(rand(),1.6)*65:3.15+Math.pow(rand(),2)*24,x=roadX(z)+side*dist;
      offsets.set([x,terrainHeight(x,z)-.08,z],i*3);const h=isTree?4.5+rand()*5:.48+Math.pow(rand(),1.7)*.75;scales.set([h*(isTree?1.35+rand()*.45:1.6+rand()*.8),h],i*2);variants[i]=rand();
    }
    geo.setAttribute('offset',new THREE.InstancedBufferAttribute(offsets,3));geo.setAttribute('scale',new THREE.InstancedBufferAttribute(scales,2));geo.setAttribute('variant',new THREE.InstancedBufferAttribute(variants,1));
    const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{map:{value:map},time:{value:0},tree:{value:isTree?1:0}},vertexShader:`attribute vec3 offset;attribute vec2 scale;attribute float variant;uniform float time;uniform float tree;varying vec2 vUv;varying float depth;varying float shade;void main(){vUv=uv;if(variant>.5)vUv.x=1.-vUv.x;vec3 right=normalize(vec3(viewMatrix[0][0],0.,viewMatrix[2][0]));vec3 p=offset+right*position.x*scale.x+vec3(0.,position.y*scale.y,0.);p.x+=sin(time*.8+offset.z*.6)*pow(position.y,2.)*mix(.065,.018,tree);vec4 mv=viewMatrix*vec4(p,1.);depth=-mv.z;shade=.84+variant*.18;gl_Position=projectionMatrix*mv;if(depth>125.&&tree<.5)gl_Position=vec4(2.,2.,2.,1.);}`,fragmentShader:`uniform sampler2D map;uniform float tree;varying vec2 vUv;varying float depth;varying float shade;void main(){vec4 tex=texture2D(map,vUv);if(tex.a<mix(.55,.72,tree))discard;vec3 col=tex.rgb*shade*mix(vec3(.72,.60,.40),vec3(.70,.80,.72),tree);col*=mix(.52,1.,smoothstep(0.,.48,vUv.y));float fog=1.-exp(-pow(depth*.0045,2.));gl_FragColor=vec4(mix(col,vec3(.445,.413,.31),fog),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
    if(isTree){
      const shadowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute vec3 offset;attribute vec2 scale;varying vec2 vUv;varying float depth;void main(){vUv=uv;vec3 p=offset+vec3(position.x*scale.x*.8,.10,(position.y-.3)*scale.y*.7);vec4 mv=viewMatrix*vec4(p,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv;varying float depth;void main(){float radius=length((vUv-.5)*2.);float alpha=(1.-smoothstep(.05,1.,radius))*.3*(1.-smoothstep(65.,130.,depth));gl_FragColor=vec4(.035,.028,.015,alpha);}`});
      const shadow=add(new THREE.Mesh(geo,shadowMat));shadow.frustumCulled=false;shadow.renderOrder=2;
    }
    const mesh=add(new THREE.Mesh(geo,mat));mesh.frustumCulled=false;return mat;
  }
  const treeCards=vegetation('/textures/acacia.webp',mobile?55:100,true);
  const grassCards=vegetation('/textures/grass.webp',mobile?4200:12000,false);
  const rocks=add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#918268',map:soil,roughness:1}),mobile?65:160));
  for(let i=0;i<rocks.count;i++){const z=40-rand()*300,x=roadX(z)+(rand()>.5?1:-1)*(3.25+rand()*9);dummy.position.set(x,terrainHeight(x,z),z);dummy.rotation.set(rand(),rand()*6.28,rand());const s=.07+Math.pow(rand(),3)*.45;dummy.scale.set(s*1.6,s*.5,s);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix)}rocks.computeBoundingSphere();

  // The supplied emblem is a true bevelled, three-material GLB, not a camera-facing image.
  const monument=add(new THREE.Group());let logo=null;
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.9,.7,48),new THREE.MeshStandardMaterial({color:'#253325',roughness:.65,metalness:.15}));pedestal.position.y=-2.97;monument.add(pedestal);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.68,.026,6,64),new THREE.MeshStandardMaterial({color:'#d9ae45',metalness:.7,roughness:.3}));rim.rotation.x=Math.PI/2;rim.position.y=-2.62;monument.add(rim);
  new GLTFLoader().load('/models/uossa-logo-relief.glb',gltf=>{
    if(stopped){gltf.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});return;}
    logo=gltf.scene;logo.traverse(o=>{if(o.material)o.material.envMapIntensity=1.1});monument.add(logo);ready();
  },undefined,()=>{document.documentElement.classList.add('logo-fallback');monument.visible=false;ready()});
  const backing=new THREE.Mesh(new THREE.CylinderGeometry(3.08,3.08,.09,80),new THREE.MeshStandardMaterial({color:'#e1d1a8',metalness:.08,roughness:.76}));backing.rotation.x=Math.PI/2;backing.scale.x=.86;backing.position.set(0,0,-.22);monument.add(backing);
  const border=new THREE.Mesh(new THREE.TorusGeometry(3.03,.022,6,96),new THREE.MeshStandardMaterial({color:'#b79645',metalness:.7,roughness:.3}));border.scale.x=.86;border.position.z=-.155;monument.add(border);
  const monumentZ=20;
  function placeMonument(){
    const narrow=innerWidth<=760, compact=innerHeight<620;
    const scale=narrow?(compact?.35:.52):Math.min(1.08,camera.aspect*.75);
    monument.scale.setScalar(scale);monument.position.set(roadX(monumentZ)+(narrow?1.65:Math.min(5.3,camera.aspect*4)),roadHeight(monumentZ)+(narrow?(compact?4.5:5.0):3.32*scale),monumentZ);
    pedestal.visible=!narrow;rim.visible=!narrow;
  }
  placeMonument();

  const dustCount=mobile?100:320, positions=new Float32Array(dustCount*3),seeds=new Float32Array(dustCount);
  for(let i=0;i<dustCount;i++){const z=40-rand()*290;positions.set([roadX(z)+(rand()-.5)*22,1+rand()*7,z],i*3);seeds[i]=rand()}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));dustGeo.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
  const dustMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},dpr:{value:quality}},vertexShader:`attribute float seed;uniform float time;uniform float dpr;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.23+seed*60.)*.4;p.y+=sin(time*.32+seed*90.)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(38./-mv.z,1.,3.)*dpr;alpha=(.3+seed*.6)*(1.-smoothstep(10.,65.,-mv.z));}`,fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.76,.40,(1.-smoothstep(.1,.5,d))*alpha*.5);}`});add(new THREE.Points(dustGeo,dustMat));

  const pointer=new THREE.Vector2(), look=new THREE.Vector3();
  let lastTime=0,previousProgress=-1,elapsed=0,frames=0,slow=0;
  const frameSamples=[],diagnostic={frames:0,drawCalls:0,triangles:0,pixelRatio:quality,mobile,calm,frameSamples};window.__UOSSA_PERF__=diagnostic;
  const resize=()=>{needsRender=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);placeMonument()};window.addEventListener('resize',resize);
  const onLost=e=>{e.preventDefault();canvas.style.opacity='0';document.documentElement.classList.add('no-webgl')};canvas.addEventListener('webglcontextlost',onLost);
  return {
    render(time){
      if(stopped)return;const p=state.progress;
      if(calm&&!needsRender&&Math.abs(p-previousProgress)<.00001)return;
      const dt=lastTime?time-lastTime:1/60;lastTime=time;
      if(dt>0&&dt<.2){frameSamples.push(dt*1000);if(frameSamples.length>600)frameSamples.shift();frames++;elapsed+=dt;if(dt>.022)slow++}
      if(elapsed>4){if(slow/frames>.28&&quality>.8){quality=Math.max(.8,quality-.2);renderer.setPixelRatio(quality);diagnostic.pixelRatio=quality}frames=0;elapsed=0;slow=0}
      const t=calm?0:time, travel=calm?0:p,z=START_Z-travel*TRAVEL;
      pointer.lerp(state.pointer,.04);
      const cameraHeight=mobile?2.2:2.35;
      camera.position.set(roadX(z)+(calm||mobile?0:pointer.x*.11),roadHeight(z)+cameraHeight,z);
      const ahead=z-16;look.set(roadX(ahead),roadHeight(ahead)+1.58,ahead);camera.lookAt(look);
      // The view steers into bends; no arbitrary orbiting or vertical roller-coaster motion.
      sky.position.copy(camera.position);
      skyMat.uniforms.time.value=t;skyMat.uniforms.pointer.value.copy(pointer);grassMat.uniforms.time.value=t;grassMat.uniforms.pointer.value.copy(pointer);dustMat.uniforms.time.value=t;treeCards.uniforms.time.value=t;grassCards.uniforms.time.value=t;
      if(logo){monument.rotation.y=-.20+(calm?0:pointer.x*.14+Math.sin(t*.28)*.045);monument.rotation.x=calm?0:Math.sin(t*.19)*.018}
      renderer.render(scene,camera);diagnostic.frames++;diagnostic.drawCalls=renderer.info.render.calls;diagnostic.triangles=renderer.info.render.triangles;previousProgress=p;needsRender=false;
      if(diagnostic.frames%120===0||calm){const sorted=[...frameSamples].sort((a,b)=>a-b);canvas.dataset.performance=JSON.stringify({frames:diagnostic.frames,samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)]||0,p95Ms:sorted[Math.floor(sorted.length*.95)]||0,drawCalls:diagnostic.drawCalls,triangles:diagnostic.triangles,pixelRatio:quality,mobile,calm,camera:[camera.position.x,camera.position.y,camera.position.z],roadCenter:roadX(z),progress:p});}
    },
    dispose(){stopped=true;window.removeEventListener('resize',resize);canvas.removeEventListener('webglcontextlost',onLost);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));o.dispose?.()});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());assetTextures.forEach(t=>t.dispose());panorama.dispose();environment.dispose();renderer.dispose();delete window.__UOSSA_PERF__;}
  };
}
