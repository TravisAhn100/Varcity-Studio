import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGarment,makeMannequin} from './garment';
import {MaterialLibrary} from './materialLibrary';
import {Config,Region,resolveChoice,regionChoice,constructionKey} from '../data/config';
import type {CameraSync} from './cameraSync';
export type ViewCommand={angle:number;serial:number;zoom?:number};
export default function Viewer({config,command,onSelect,cameraSync}:{config:Config;command:ViewCommand;onSelect:(r:Region)=>void;cameraSync?:CameraSync}){
 const host=useRef<HTMLDivElement>(null);const engine=useRef<any>(null);const [error,setError]=useState('');const [textureError,setTextureError]=useState('');const select=useRef(onSelect);select.current=onSelect;
 useEffect(()=>{if(!host.current)return;const node=host.current;let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D preview needs WebGL. Try a browser with hardware acceleration enabled.');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.1;node.appendChild(renderer.domElement);
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,40);camera.position.set(0,.3,7.1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=10;controls.minPolarAngle=.55;controls.maxPolarAngle=2.2;
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.08);scene.environment=env.texture;scene.environmentIntensity=.65;room.dispose();
 RectAreaLightUniformsLib.init();
 scene.add(new THREE.HemisphereLight(0xffffff,0xc7c9cd,.6));
 const area=(intensity:number,width:number,height:number,pos:number[])=>{const light=new THREE.RectAreaLight(0xffffff,intensity,width,height);light.position.set(pos[0],pos[1],pos[2]);light.lookAt(0,0,0);scene.add(light);};
 area(5,4,5,[-3,3.5,5]);area(2,4,4,[3,1.5,4]);area(3,3,4,[2,3,-4]);
 const light=new THREE.DirectionalLight(0xffffff,1.1);light.position.set(-3,5,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-3;light.shadow.camera.right=3;light.shadow.camera.top=3;light.shadow.camera.bottom=-4;light.shadow.camera.near=.5;light.shadow.camera.far=16;light.shadow.bias=-.0002;light.shadow.normalBias=.018;light.shadow.radius=3;scene.add(light);
 const {group,parts}=makeGarment();scene.add(group);const mannequins:Partial<Record<'male'|'female',THREE.Group>>={};
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.24;floor.receiveShadow=true;scene.add(floor);
 const shadowPixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,r=((x-31.5)/31.5)**2+((y-31.5)/31.5)**2;shadowPixels[i+3]=Math.round(Math.max(0,1-r)**2*52);}
 const shadowMap=new THREE.DataTexture(shadowPixels,64,64);shadowMap.needsUpdate=true;shadowMap.magFilter=THREE.LinearFilter;
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-1.237;scene.add(contact);
 const resize=()=>{const {width,height}=node.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
 let disposed=false,syncing=false;const syncOwner={};
 function render(){if(!disposed)renderer.render(scene,camera);}
 const syncChange=()=>{render();if(!syncing)cameraSync?.publish(syncOwner,{position:camera.position.toArray(),target:controls.target.toArray()});};
 controls.addEventListener('change',syncChange);
 const unsubscribe=cameraSync?.subscribe(syncOwner,pose=>{syncing=true;camera.position.fromArray(pose.position);controls.target.fromArray(pose.target);controls.update();render();syncing=false;});
 const observer=new ResizeObserver(resize);observer.observe(node);
 let down=[0,0];const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=node.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(engine.current.group.children).find(h=>h.object.userData.region);if(hit)select.current(hit.object.userData.region);};
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.setAttribute('aria-label','Rotatable 3D varsity jacket. Drag to rotate or use the view buttons.');
 const library=new MaterialLibrary(render,code=>setTextureError(code),renderer.capabilities.getMaxAnisotropy());
 engine.current={scene,camera,controls,group,parts,construction:'regular/snaps/varsity:none',mannequins,floor,contact,render,library,oldMannequin:'none'};resize();
 return()=>{disposed=true;unsubscribe?.();observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>m.dispose());}});library.dispose();shadowMap.dispose();env.dispose();pmrem.dispose();renderer.dispose();node.removeChild(renderer.domElement);engine.current=null;};
 },[]);
 useEffect(()=>{const e=engine.current;if(!e)return;setTextureError('');
 if(e.construction!==constructionKey(config.construction)+':'+config.mannequin){e.scene.remove(e.group);e.group.traverse((m:THREE.Object3D)=>{if(m instanceof THREE.Mesh){m.geometry.dispose();if(m.userData.ownedMaterial)(m.material as THREE.Material).dispose();}});const garment=makeGarment(config.construction,config.mannequin);e.group=garment.group;e.parts=garment.parts;e.construction=constructionKey(config.construction)+':'+config.mannequin;e.scene.add(e.group);}
 const mapping:Record<string,Region>={body:'body',leftSleeve:'sleeves',rightSleeve:'sleeves',collar:'collar',leftCuff:'cuffs',rightCuff:'cuffs',waistband:'waistband',leftPocketTrim:'pocketTrim',rightPocketTrim:'pocketTrim',snaps:'snaps'};
 const materials:Partial<Record<Region,THREE.Material>>={};e.parts.forEach((_meshes:THREE.Mesh[],id:string)=>{const region=mapping[id];if(!materials[region])materials[region]=e.library.get(resolveChoice(regionChoice(config,region)),region);});
 e.library.prune(new Set(Object.values(materials)));
 e.parts.forEach((meshes:THREE.Mesh[],id:string)=>meshes.forEach(m=>{if(!m.userData.materialAssigned){(m.material as THREE.Material).dispose();m.userData.materialAssigned=true;}m.material=materials[mapping[id]]!;}));if(config.mannequin!=='none'&&!e.mannequins[config.mannequin]){const mannequin=makeMannequin(config.mannequin==='female');e.mannequins[config.mannequin]=mannequin;e.scene.add(mannequin);}Object.entries(e.mannequins).forEach(([id,m])=>{(m as THREE.Group).visible=id===config.mannequin;});
 if(e.oldMannequin!==config.mannequin){e.floor.position.y=config.mannequin==='none'?-1.24:-3.04;e.contact.position.y=e.floor.position.y+.003;e.contact.scale.set(config.mannequin==='none'?1:.7,config.mannequin==='none'?1:.65,1);e.controls.target.set(0,config.mannequin==='none'?0:-.5,0);e.camera.position.set(0,.3,config.mannequin==='none'?7.1:9.1);e.oldMannequin=config.mannequin;e.controls.update();}e.render();
 },[config]);
 useEffect(()=>{const e=engine.current;if(!e)return;const distance=command.zoom?THREE.MathUtils.clamp(e.camera.position.distanceTo(e.controls.target)*command.zoom,4,10):(config.mannequin==='none'?7.1:9.1);const a=command.angle;e.camera.position.set(Math.sin(a)*distance,e.controls.target.y+.3,Math.cos(a)*distance);e.controls.update();e.render();},[command]);
 return <div className="canvas-host" ref={host}>{textureError&&<p className="texture-error" role="status">Texture for {textureError} could not load. Showing its reference color; reload to retry.</p>}{error&&<div className="viewer-error" role="alert"><p>{error}</p><img src="/references/regular.jpg" alt="Manufacturer front and back construction reference"/></div>}</div>;
}
