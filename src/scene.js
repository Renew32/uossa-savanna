import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { START_Z, TRAVEL, END_Z, ROAD_HALF_WIDTH, roadX, roadSlope, roadHeight, terrainHeight, roadDistance, SIDE_PATHS, EXIT_SCREENS } from './route.js';
// Public files, under the site's base path ("/" locally, "/uossa-savanna/" on GitHub Pages).
const asset = (path) => import.meta.env.BASE_URL + path;

// Executive-board photos along the bureau road (same order as the HTML captions), then the group photo.
export const BUREAU_IMAGES = [asset('bureau/02.webp'),asset('bureau/03.webp'),asset('bureau/04.webp')];
const GROUP_PHOTO = asset('bureau-2026-2027.webp'), LOGO = asset('uossa-logo-2026.jpg');

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
  const dummy = new THREE.Object3D();
  const HIDDEN = -200;
  const add = o => {scene.add(o);return o;};
  const paths = Object.entries(SIDE_PATHS), pathLength = paths.reduce((sum, [, p]) => sum + p.L, 0);
  // A random point beside one of the side roads (picked in proportion to their length).
  const sidePoint = {};
  function besideSideRoad(dist) {
    let r = rand() * pathLength, path = paths[0][1];
    for (const [, p] of paths) { if (r < p.L) { path = p; break; } r -= p.L; }
    const a = path.at(rand() * path.L, sidePoint), side = rand() > .5 ? 1 : -1;
    return [a.x + a.dz * side * dist, a.z - a.dx * side * dist];
  }

  // Distant photographic atmosphere only; the road and the near landscape are meshes.
  const panorama = new THREE.TextureLoader().load(asset('textures/safari-sunset.webp'),ready,undefined,ready);panorama.colorSpace=THREE.SRGBColorSpace;
  const skyMat = new THREE.ShaderMaterial({toneMapped:false,side:THREE.BackSide,depthWrite:false,uniforms:{map:{value:panorama},time:{value:0},pointer:{value:new THREE.Vector2()}},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D map;uniform float time;uniform vec2 pointer;varying vec3 direction;void main(){vec3 d=normalize(direction);vec2 uv=vec2(fract(.5+atan(d.x,-d.z)/6.28318),.5+asin(clamp(d.y,-1.,1.))/3.14159265);vec3 col=texture2D(map,uv).rgb;gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const sky = add(new THREE.Mesh(new THREE.SphereGeometry(440,40,24),skyMat));sky.frustumCulled=false;

  // The ground reaches far enough around both side roads that its edge never shows.
  const GROUND = { x0: -250, x1: 210, z0: 130, z1: END_Z - 165 };
  const groundW = GROUND.x1 - GROUND.x0, groundD = GROUND.z0 - GROUND.z1;
  const groundGeometry = new THREE.PlaneGeometry(groundW,groundD,mobile?76:136,mobile?92:160);groundGeometry.rotateX(-Math.PI/2);groundGeometry.translate((GROUND.x0+GROUND.x1)/2,0,(GROUND.z0+GROUND.z1)/2);
  const gp=groundGeometry.attributes.position;
  for(let i=0;i<gp.count;i++)gp.setY(i,terrainHeight(gp.getX(i),gp.getZ(i)));
  groundGeometry.computeVertexNormals();
  const assetTextures=[];
  const texture=(path,color=false)=>{const t=new THREE.TextureLoader().load(path,()=>{needsRender=true;if(!stopped)renderer.initTexture(t)});t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());assetTextures.push(t);return t;};
  const soil=texture(asset('textures/diff.jpg'),true),normal=texture(asset('textures/normal.jpg'));
  for(const t of [soil,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(groundW/4,groundD/4)}
  const terrainMat = new THREE.MeshStandardMaterial({color:'#b1a47d',map:soil,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),roughness:1,envMapIntensity:.1});
  terrainMat.onBeforeCompile = shader => {
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrain=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;').replace('#include <color_fragment>',`#include <color_fragment>\nfloat grain=fract(sin(dot(floor(vTerrain.xz*9.),vec2(127.1,311.7)))*43758.5453);float patches=sin(vTerrain.x*.21+sin(vTerrain.z*.1))*sin(vTerrain.z*.27);diffuseColor.rgb*=.79+.17*grain+.17*patches;`);
  };
  add(new THREE.Mesh(groundGeometry,terrainMat));

  // Broad red-earth tracks, twin worn ruts and ragged shoulders. The same curves drive the camera.
  // A side road never writes depth and fades out inside the main road, so at each junction the
  // main road stays whole and the side road simply emerges from its shoulder.
  function roadMaterial(sideRoad){
    return new THREE.ShaderMaterial({transparent:true,depthWrite:!sideRoad,side:THREE.DoubleSide,defines:sideRoad?{SIDE_ROAD:1}:{},uniforms:{soil:{value:soil}},
      vertexShader:`varying vec2 vUv;varying float depth;varying vec3 vWorld;void main(){vUv=uv;vWorld=position;vec4 mv=modelViewMatrix*vec4(position,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform sampler2D soil;varying vec2 vUv;varying float depth;varying vec3 vWorld;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float grain=hash(floor(vUv*vec2(190.,70.)));float coarse=hash(floor(vUv*vec2(19.,12.)));float rut1=exp(-pow((vUv.x-.29-sin(vUv.y*.51)*.012)/(.04+.012*sin(vUv.y*.73)),2.));float rut2=exp(-pow((vUv.x-.71-sin(vUv.y*.51)*.012)/(.04+.01*cos(vUv.y*.83)),2.));float ridges=sin(vUv.y*105.)*.015;float edge=abs(vUv.x-.5)*2.;float alpha=1.-smoothstep(.78+coarse*.07,1.,edge);
#ifdef SIDE_ROAD
float t=(${START_Z.toFixed(1)}-vWorld.z)*.026;alpha*=smoothstep(1.,2.2,abs(vWorld.x-(9.*sin(t)-4.5*sin(2.*t))));if(alpha<.01)discard;
#endif
vec3 clay=mix(vec3(.42,.255,.12),vec3(.67,.445,.25),grain*.5+coarse*.25);clay-=(rut1+rut2)*vec3(.085,.065,.033);clay=mix(clay,texture2D(soil,vec2(vUv.x*1.3,vUv.y)).rgb*vec3(1.1,.91,.72),.82);clay-=(rut1+rut2)*.065;clay+=ridges*.3;float fog=1.-exp(-pow(depth*.0045,2.));gl_FragColor=vec4(mix(clay,vec3(.445,.413,.31),fog),alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  }
  // sampler(s) gives the centre line and its direction; the strip is built across its right-hand normal.
  function roadStrip(sampler, sFrom, sTo, rows, lift, columns=20){
    const positions=[], uvs=[], indices=[], c={x:0,z:0,dx:0,dz:-1};
    for(let i=0;i<=rows;i++){
      const s=sFrom+i/rows*(sTo-sFrom);sampler(s,c);
      for(let j=0;j<=columns;j++){
        const across=j/columns*2-1, offset=across*ROAD_HALF_WIDTH;
        const x=c.x-c.dz*offset, zz=c.z+c.dx*offset;
        positions.push(x,roadHeight(zz)+lift+0.035*(1-across*across),zz);uvs.push(j/columns,s/4);
        if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1)}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  const mainAt=(s,out)=>{const z=65-s,k=roadSlope(z),n=Math.hypot(k,1);out.x=roadX(z);out.z=z;out.dx=-k/n;out.dz=-1/n;return out};
  const mainLength=65-(END_Z-110);
  const road=add(new THREE.Mesh(roadStrip(mainAt,0,mainLength,Math.round(mainLength/.79),.008),roadMaterial(false)));road.renderOrder=1;
  const sideRoadMat=roadMaterial(true);
  // Side roads are only seen up close on their own stretch: a lighter mesh is enough.
  for(const [,path] of paths){const m=add(new THREE.Mesh(roadStrip(path.at,0,path.L,Math.ceil(path.L),.008,12),sideRoadMat));m.renderOrder=.9;}

  // ── Boards along the side roads, laid out first so the vegetation can keep their views clear. ──
  const lateral=mobile?3.9:4.6, boards=[], cones=[];
  for(const [name,path] of paths){
    path.boards.forEach((b,i)=>{
      const a=path.at(b.s,{}),x=a.x+a.dz*lateral*b.side,z=a.z-a.dx*lateral*b.side,face=path.at(b.s-9,{}),eye=path.at(b.s-11,{});
      boards.push({name,x,z,width:4.4,post:1.15,faceX:face.x,faceZ:face.z,src:BUREAU_IMAGES[i],s:b.s,side:b.side});
      cones.push({ax:eye.x,az:eye.z,bx:x,bz:z,r:2.9});
    });
    const f=path.finale,width=name==='bureau'?7.2:6.4;
    boards.push({name,finale:true,x:f.x,z:f.z,width,post:name==='bureau'?1.35:1.3,faceX:f.x-f.dx*10,faceZ:f.z-f.dz*10,src:name==='bureau'?GROUP_PHOTO:null});
    cones.push({ax:f.x-f.dx*19,az:f.z-f.dz*19,bx:f.x,bz:f.z,r:width/2+.8});
  }
  // Signposts stand in the wedge between the main road and each side road, facing the crossroads.
  const posts=paths.map(([name,path])=>{const a=path.at(20,{}),x=(a.x+roadX(a.z))/2,z=a.z,fx=roadX(path.forkZ);cones.push({ax:fx,az:path.forkZ,bx:x,bz:z,r:1.8});return{name,x,z,faceX:fx,faceZ:path.forkZ}});
  // True when a prop at (x, z) would stand between a board and the spot it is looked at from.
  function blocksView(x,z,half,fromEye){
    for(const c of cones){
      const vx=c.bx-c.ax,vz=c.bz-c.az,t=((x-c.ax)*vx+(z-c.az)*vz)/(vx*vx+vz*vz);
      if(t<(fromEye?0:.35)||t>1)continue;
      const px=c.ax+vx*t-x,pz=c.az+vz*t-z,r=1+(c.r-1)*t+half;
      if(px*px+pz*pz<r*r)return true;
    }
    return false;
  }
  const mainZ=(from,to)=>from-rand()*(from-to);

  // Grass tufts placed against the road curves, never through a driving corridor.
  const grassGeometry=new THREE.InstancedBufferGeometry();
  grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,-.018,.5,0,.018,.5,0,0,1,0],3));grassGeometry.setIndex([0,1,2,2,1,3,2,3,4]);
  const mainGrass=mobile?2800:7900, grassCount=mainGrass+(mobile?800:2200), offsets=new Float32Array(grassCount*3),sizes=new Float32Array(grassCount),angles=new Float32Array(grassCount);
  for(let i=0;i<grassCount;i++){
    let spot=null;
    for(let k=0;k<5&&!spot;k++){
      let x,z;
      if(i<mainGrass){z=mainZ(52,END_Z-95);x=roadX(z)+(rand()>.5?1:-1)*(3.25+Math.pow(rand(),1.7)*69);}
      else [x,z]=besideSideRoad(3.25+Math.pow(rand(),1.7)*30);
      if(roadDistance(x,z)>=3.25)spot=[x,z];
    }
    offsets.set(spot?[spot[0],terrainHeight(spot[0],spot[1]),spot[1]]:[0,HIDDEN,0],i*3);sizes[i]=.10+rand()*.24;angles[i]=rand()*Math.PI*2;
  }
  grassGeometry.setAttribute('offset',new THREE.InstancedBufferAttribute(offsets,3));grassGeometry.setAttribute('size',new THREE.InstancedBufferAttribute(sizes,1));grassGeometry.setAttribute('angle',new THREE.InstancedBufferAttribute(angles,1));
  const grassMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},pointer:{value:new THREE.Vector2()}},vertexShader:`attribute vec3 offset;attribute float size;attribute float angle;uniform float time;uniform vec2 pointer;varying float h;varying float depth;varying float variation;void main(){vec3 p=position;p.y*=size;float wind=sin(time*1.1+offset.x*.22+offset.z*.15)*.18+pointer.x*.035;p.x+=position.y*position.y*wind;p.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;p+=offset;vec4 mv=modelViewMatrix*vec4(p,1.);h=position.y;variation=fract(offset.x*.74+offset.z*.37);depth=-mv.z;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float h;varying float depth;varying float variation;void main(){vec3 col=mix(vec3(.16,.17,.045),vec3(.69,.52,.20),h);col*=.75+variation*.4;float fog=1.-exp(-pow(depth*.0045,2.));gl_FragColor=vec4(mix(col,vec3(.445,.413,.31),fog),1.);}`});
  const grass=add(new THREE.Mesh(grassGeometry,grassMat));grass.frustumCulled=false;

  // Photographic alpha-tested vegetation, instanced in world space for real parallax.
  // Depth-writing cutouts avoid translucent sorting and limit mobile overdraw.
  function vegetation(path,mainCount,isTree,sideCount){
    const map=texture(path,true),geo=new THREE.InstancedBufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geo.setIndex([0,1,2,2,1,3]);
    const count=mainCount+sideCount, clear=isTree?9:3.15;
    const offsets=new Float32Array(count*3),scales=new Float32Array(count*2),variants=new Float32Array(count);
    for(let i=0;i<count;i++){
      let spot=null,h=1,w=1;
      for(let k=0;k<6&&!spot;k++){
        h=isTree?4.5+rand()*5:.48+Math.pow(rand(),1.7)*.75;w=h*(isTree?1.35+rand()*.45:1.6+rand()*.8);
        let x,z;
        if(i<mainCount){z=mainZ(45,END_Z-120);x=roadX(z)+(i%2?1:-1)*(isTree?9+Math.pow(rand(),1.6)*65:3.15+Math.pow(rand(),2)*24);}
        else [x,z]=besideSideRoad(isTree?9+Math.pow(rand(),1.6)*30:3.15+Math.pow(rand(),2)*24);
        if(roadDistance(x,z)<clear)continue;
        if((isTree||h>.8)&&blocksView(x,z,w*(isTree?.4:.5),isTree))continue;
        spot=[x,z];
      }
      offsets.set(spot?[spot[0],terrainHeight(spot[0],spot[1])-.08,spot[1]]:[0,HIDDEN,0],i*3);scales.set([w,h],i*2);variants[i]=rand();
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
  const treeCards=vegetation(asset('textures/acacia.webp'),mobile?62:113,true,mobile?22:40);
  const grassCards=vegetation(asset('textures/grass.webp'),mobile?4750:13500,false,mobile?1600:4800);
  const rocks=add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#918268',map:soil,roughness:1}),mobile?65:160));
  for(let i=0;i<rocks.count;i++){const z=mainZ(40,END_Z-90),x=roadX(z)+(rand()>.5?1:-1)*(3.25+rand()*9),ok=roadDistance(x,z)>=3.25;dummy.position.set(x,ok?terrainHeight(x,z):HIDDEN,z);dummy.rotation.set(rand(),rand()*6.28,rand());const s=.07+Math.pow(rand(),3)*.45;dummy.scale.set(s*1.6,s*.5,s);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix)}rocks.computeBoundingSphere();

  // The supplied emblem is a true bevelled, three-material GLB, not a camera-facing image.
  const monument=add(new THREE.Group());let logo=null;
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.9,.7,48),new THREE.MeshStandardMaterial({color:'#253325',roughness:.65,metalness:.15}));pedestal.position.y=-2.97;monument.add(pedestal);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.68,.026,6,64),new THREE.MeshStandardMaterial({color:'#d9ae45',metalness:.7,roughness:.3}));rim.rotation.x=Math.PI/2;rim.position.y=-2.62;monument.add(rim);
  new GLTFLoader().load(asset('models/uossa-logo-relief.glb'),gltf=>{
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

  // ── Boards and signposts: frames, rims and wooden legs are merged into three draw calls. ──
  const woodMat=new THREE.MeshStandardMaterial({color:'#4a3420',roughness:.9});
  const frameMat=new THREE.MeshStandardMaterial({color:'#17311f',roughness:.7,metalness:.1});
  const goldMat=new THREE.MeshStandardMaterial({color:'#d4a94c',metalness:.75,roughness:.32});
  const frameParts=[],rimParts=[],woodParts=[],up=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1);
  // Photos and sign plates are skipped beyond this distance, where the haze makes them specks.
  const farProps=[],FAR_PROPS=140*140;
  const placed=(geo,base,x,y,z)=>geo.translate(x,y,z).applyMatrix4(base);
  const baseMatrix=(x,y,z,faceX,faceZ)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(up,Math.atan2(faceX-x,faceZ-z)),one);
  const photoLoader=new THREE.TextureLoader();
  function photoTexture(src){const map=photoLoader.load(src,()=>{needsRender=true;if(!stopped)renderer.initTexture(map)});map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());assetTextures.push(map);return map;}
  function canvasTexture(width,height,draw){
    const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());assetTextures.push(t);
    const paint=()=>{if(stopped)return;g.clearRect(0,0,width,height);draw(g);t.needsUpdate=true;needsRender=true;};
    paint();document.fonts?.ready.then(paint);return {texture:t,paint};
  }
  // The inscription road ends at a sign rather than a photo: logo and title on the board.
  function inscriptionSign(){
    const logoImage=new Image();
    const sign=canvasTexture(1024,576,g=>{
      g.fillStyle='#173b29';g.fillRect(0,0,1024,576);g.strokeStyle='#d9ae4f';g.lineWidth=10;g.strokeRect(26,26,972,524);
      if(logoImage.complete&&logoImage.naturalWidth){const h=400,w=h*logoImage.naturalWidth/logoImage.naturalHeight;g.drawImage(logoImage,70,88,w,h);}
      g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle='#f6ead0';g.font='700 92px Barlow, "Arial Narrow", sans-serif';
      g.fillText('INSCRIPTION',420,236);g.font='700 64px Barlow, "Arial Narrow", sans-serif';g.fillText('& RECENSEMENT',420,318);
      g.fillStyle='#e8bd6f';g.font='italic 500 76px Cormorant, Georgia, serif';g.fillText('2026–2027',420,418);
    });
    logoImage.onload=sign.paint;logoImage.src=LOGO;return sign.texture;
  }
  for(const b of boards){
    const height=b.width*607/1080,cy=b.post+height/2,y=terrainHeight(b.x,b.z),base=baseMatrix(b.x,y,b.z,b.faceX,b.faceZ);
    frameParts.push(placed(new THREE.BoxGeometry(b.width+.34,height+.34,.12),base,0,cy,0));
    // The gold rim shows only around the front of the photo; from behind the board is plain green.
    rimParts.push(placed(new THREE.BoxGeometry(b.width+.12,height+.12,.1),base,0,cy,.02));
    for(const sx of [-1,1])woodParts.push(placed(new THREE.CylinderGeometry(.06,.075,b.post+.25,8),base,sx*b.width*.36,(b.post+.25)/2-.12,-.02));
    const photo=add(new THREE.Mesh(new THREE.PlaneGeometry(b.width,height),new THREE.MeshBasicMaterial({map:b.src?photoTexture(b.src):inscriptionSign(),toneMapped:false,color:'#eeeeee'})));
    photo.applyMatrix4(base);photo.position.add(new THREE.Vector3(0,cy,.08).applyQuaternion(photo.quaternion));farProps.push(photo);
    b.center=new THREE.Vector3(b.x,y+cy,b.z);
  }
  // Two arrows per signpost, painted on one canvas so each post is a single textured plane.
  const signLabels={bureau:['LE BUREAU','LA ROUTE'],inscription:['LA ROUTE','INSCRIPTION']};
  function arrowSign(g,ox,oy,text,pointLeft){
    g.save();g.translate(ox,oy);g.beginPath();
    if(pointLeft){g.moveTo(8,75);g.lineTo(80,8);g.lineTo(632,8);g.lineTo(632,142);g.lineTo(80,142);}
    else{g.moveTo(632,75);g.lineTo(560,8);g.lineTo(8,8);g.lineTo(8,142);g.lineTo(560,142);}
    g.closePath();g.fillStyle='#173b29';g.fill();g.lineWidth=7;g.strokeStyle='#d9ae4f';g.stroke();
    g.fillStyle='#f6ead0';g.font='700 66px Barlow, "Arial Narrow", sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText(text,pointLeft?350:290,80);g.restore();
  }
  for(const p of posts){
    const y=terrainHeight(p.x,p.z),base=baseMatrix(p.x,y,p.z,p.faceX,p.faceZ);
    woodParts.push(placed(new THREE.CylinderGeometry(.07,.09,3.1,10),base,0,1.55,0));
    const [top,bottom]=signLabels[p.name];
    const {texture:map}=canvasTexture(1044,370,g=>{arrowSign(g,0,0,top,true);arrowSign(g,402,219,bottom,false);});
    const plate=add(new THREE.Mesh(new THREE.PlaneGeometry(2.85,1.01),new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.8})));
    plate.applyMatrix4(base);plate.position.add(new THREE.Vector3(0,2.25,.1).applyQuaternion(plate.quaternion));farProps.push(plate);
  }
  for(const [parts,mat] of [[frameParts,frameMat],[rimParts,goldMat],[woodParts,woodMat]]){add(new THREE.Mesh(mergeGeometries(parts),mat));parts.forEach(g=>g.dispose());}

  // ── Camera stops along each side road: one per scroll screen of its HTML layer. ──
  // Each stop frames its board at a chosen screen position (beside its caption card on
  // a wide screen, centred above it on a phone held upright).
  const sides={};
  function computeStops(){
    const portrait=mobile&&innerWidth<innerHeight, near=portrait?10.5:7.5, f=portrait?0:.32, fy=portrait?.2:.05;
    for(const [name,path] of paths){
      const stops=[{s:0}];
      for(const b of boards.filter(b=>b.name===name&&!b.finale))stops.push({s:Math.max(.5,b.s-near+(b.side>0?-.5:.5)),target:b.center,f:b.side>0?-f:f,fy});
      const fin=boards.find(b=>b.name===name&&b.finale),sF=path.finale.s-(name==='bureau'?(portrait?17.5:12):(portrait?16:11.5));
      // The final caption card is taller, so the last board sits higher on screen.
      stops.push({s:sF,target:fin.center,f:0,fy:portrait?.44:.2});
      for(let k=1;k<=EXIT_SCREENS;k++)stops.push({s:sF+(path.L-sF)*k/EXIT_SCREENS});
      sides[name]={path,stops};
    }
  }
  computeStops();
  const tanHalfV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  // A look-at point that puts `target` at screen position (f, fy) seen from `eye`.
  function aim(out,eye,target,f,fy){
    const vx=target.x-eye.x,vz=target.z-eye.z,dist=Math.hypot(vx,vz),a=Math.atan(f*tanHalfV*camera.aspect),c=Math.cos(a),s=Math.sin(a);
    return out.set(eye.x+vx*c+vz*s,target.y-dist*fy*tanHalfV,eye.z-vx*s+vz*c);
  }

  const dustCount=mobile?100:320, positions=new Float32Array(dustCount*3),seeds=new Float32Array(dustCount);
  for(let i=0;i<dustCount;i++){const z=mainZ(40,END_Z-80);positions.set([roadX(z)+(rand()-.5)*22,1+rand()*7,z],i*3);seeds[i]=rand()}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));dustGeo.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
  const dustMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},dpr:{value:quality}},vertexShader:`attribute float seed;uniform float time;uniform float dpr;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.23+seed*60.)*.4;p.y+=sin(time*.32+seed*90.)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(38./-mv.z,1.,3.)*dpr;alpha=(.3+seed*.6)*(1.-smoothstep(10.,65.,-mv.z));}`,fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.76,.40,(1.-smoothstep(.1,.5,d))*alpha*.5);}`});add(new THREE.Points(dustGeo,dustMat));

  const pointer=new THREE.Vector2(), look=new THREE.Vector3(), sidePos=new THREE.Vector3(), sideLook=new THREE.Vector3(), aimPoint=new THREE.Vector3(), aimDelta=new THREE.Vector3(), here={}, ahead={};
  let lastTime=0,previousProgress=-1,elapsed=0,frames=0,slow=0;
  const frameSamples=[],diagnostic={frames:0,drawCalls:0,triangles:0,pixelRatio:quality,mobile,calm,frameSamples,camera:camera.position};window.__UOSSA_PERF__=diagnostic;  const resize=()=>{needsRender=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);placeMonument();computeStops()};window.addEventListener('resize',resize);
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
      const aheadZ=z-16;look.set(roadX(aheadZ),roadHeight(aheadZ)+1.58,aheadZ);
      const sd=state.side;
      if(sd&&sd.route&&sd.blend>0&&!calm&&sides[sd.route]){
        // Scroll sets the target stop; the camera eases towards it along the side road.
        const {path,stops}=sides[sd.route],uMax=stops.length-1;
        sd.uMax=uMax;
        if(sd.snap){sd.u=sd.target;sd.snap=false}
        sd.u+=(sd.target-sd.u)*(1-Math.exp(-Math.min(dt,.1)*4.5));
        const u=Math.min(Math.max(sd.u,0),uMax),i0=Math.min(Math.floor(u),uMax-1),fr=u-i0,s=stops[i0].s+(stops[i0+1].s-stops[i0].s)*fr;
        const a=path.at(s,here),b=path.at(s+16,ahead);
        sidePos.set(a.x+(mobile?0:pointer.x*.11),roadHeight(a.z)+cameraHeight,a.z);
        sideLook.set(b.x,roadHeight(b.z)+1.58,b.z);
        aimDelta.set(0,0,0);let wSum=0;
        for(let i=0;i<stops.length;i++){
          const stop=stops[i];if(!stop.target)continue;
          const x=(u-i)/.75;if(x<=-1||x>=1)continue;
          const w=(1-x*x)**2;aimDelta.addScaledVector(aim(aimPoint,sidePos,stop.target,stop.f,stop.fy).sub(sideLook),w);wSum+=w;
        }
        if(wSum>1)aimDelta.multiplyScalar(1/wSum);
        sideLook.add(aimDelta);
        const e=sd.blend*sd.blend*(3-2*sd.blend);
        camera.position.lerp(sidePos,e);look.lerp(sideLook,e);
        sd.s=s;sd.arrived=sd.target>=uMax-.015&&u>=uMax-.015;
      }
      camera.lookAt(look);
      for(const o of farProps)o.visible=o.position.distanceToSquared(camera.position)<FAR_PROPS;
      // The view steers into bends; no arbitrary orbiting or vertical roller-coaster motion.
      sky.position.copy(camera.position);
      skyMat.uniforms.time.value=t;skyMat.uniforms.pointer.value.copy(pointer);grassMat.uniforms.time.value=t;grassMat.uniforms.pointer.value.copy(pointer);dustMat.uniforms.time.value=t;treeCards.uniforms.time.value=t;grassCards.uniforms.time.value=t;
      if(logo){monument.rotation.y=-.20+(calm?0:pointer.x*.14+Math.sin(t*.28)*.045);monument.rotation.x=calm?0:Math.sin(t*.19)*.018}
      renderer.render(scene,camera);diagnostic.frames++;diagnostic.drawCalls=renderer.info.render.calls;diagnostic.triangles=renderer.info.render.triangles;previousProgress=p;needsRender=false;
      if(diagnostic.frames%120===0||calm){const sorted=[...frameSamples].sort((a,b)=>a-b);canvas.dataset.performance=JSON.stringify({frames:diagnostic.frames,samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)]||0,p95Ms:sorted[Math.floor(sorted.length*.95)]||0,drawCalls:diagnostic.drawCalls,triangles:diagnostic.triangles,pixelRatio:quality,mobile,calm,camera:[camera.position.x,camera.position.y,camera.position.z],roadCenter:roadX(z),progress:p,side:sd?.route?{route:sd.route,s:sd.s,blend:sd.blend}:null});}
    },
    dispose(){stopped=true;window.removeEventListener('resize',resize);canvas.removeEventListener('webglcontextlost',onLost);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));o.dispose?.()});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());assetTextures.forEach(t=>t.dispose());panorama.dispose();environment.dispose();renderer.dispose();delete window.__UOSSA_PERF__;}
  };
}
