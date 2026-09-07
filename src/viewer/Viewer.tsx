import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGarment,makeMannequin} from './garment';
import {MaterialLibrary} from './materialLibrary';
import {Config,Region,resolveChoice} from '../data/config';
export type ViewCommand={angle:number;serial:number;zoom?:number};
export default function Viewer({config,command,onSelect}:{config:Config;command:ViewCommand;onSelect:(r:Region)=>void}){
 const host=useRef<HTMLDivElement>(null);const engine=useRef<any>(null);const [error,setError]=useState('');const [textureError,setTextureError]=useState('');const select=useRef(onSelect);select.current=onSelect;
 useEffect(()=>{if(!host.current)return;const node=host.current;let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D preview needs WebGL. Try a browser with hardware acceleration enabled.');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;node.appendChild(renderer.domElement);
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,40);camera.position.set(0,.3,7.1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=10;controls.minPolarAngle=.55;controls.maxPolarAngle=2.2;
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();
 scene.add(new THREE.HemisphereLight(0xffffff,0xadb0aa,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
 const {group,parts}=makeGarment();scene.add(group);const mannequins={male:makeMannequin(false),female:makeMannequin(true)};Object.values(mannequins).forEach(m=>{m.visible=false;scene.add(m);});
 const floor=new THREE.Mesh(new THREE.CircleGeometry(5,64),new THREE.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.99;floor.receiveShadow=true;scene.add(floor);
 const resize=()=>{const {width,height}=node.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
 function render(){renderer.render(scene,camera);}controls.addEventListener('change',render);
 const observer=new ResizeObserver(resize);observer.observe(node);
 let down=[0,0];const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=node.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(group.children).find(h=>h.object.userData.region);if(hit)select.current(hit.object.userData.region);};
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.setAttribute('aria-label','Rotatable 3D varsity jacket. Drag to rotate or use the view buttons.');
 const library=new MaterialLibrary(render,code=>setTextureError(code),renderer.capabilities.getMaxAnisotropy());
 engine.current={scene,camera,controls,parts,mannequins,render,library,oldMannequin:'none'};resize();
 return()=>{observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>m.dispose());}});library.dispose();env.dispose();pmrem.dispose();renderer.dispose();node.removeChild(renderer.domElement);engine.current=null;};
 },[]);
 useEffect(()=>{const e=engine.current;if(!e)return;setTextureError('');
 const mapping:Record<string,Region>={body:'body',leftSleeve:'sleeves',rightSleeve:'sleeves',collar:'collar',leftCuff:'cuffs',rightCuff:'cuffs',waistband:'waistband',leftPocketTrim:'pocketTrim',rightPocketTrim:'pocketTrim',snaps:'snaps'};
 const materials:Partial<Record<Region,THREE.Material>>={};Object.values(mapping).forEach(region=>{if(!materials[region])materials[region]=e.library.get(resolveChoice(config[region]),region);});
 e.library.prune(new Set(Object.values(materials)));
 e.parts.forEach((meshes:THREE.Mesh[],id:string)=>meshes.forEach(m=>m.material=materials[mapping[id]]!));Object.entries(e.mannequins).forEach(([id,m])=>{(m as THREE.Group).visible=id===config.mannequin;});
 if(e.oldMannequin!==config.mannequin){e.controls.target.set(0,config.mannequin==='none'?0:-.5,0);e.camera.position.set(0,.3,config.mannequin==='none'?7.1:9.1);e.oldMannequin=config.mannequin;e.controls.update();}e.render();
 },[config]);
 useEffect(()=>{const e=engine.current;if(!e)return;const distance=command.zoom?THREE.MathUtils.clamp(e.camera.position.distanceTo(e.controls.target)*command.zoom,4,10):(config.mannequin==='none'?7.1:9.1);const a=command.angle;e.camera.position.set(Math.sin(a)*distance,e.controls.target.y+.3,Math.cos(a)*distance);e.controls.update();e.render();},[command]);
 return <div className="canvas-host" ref={host}>{textureError&&<p className="texture-error" role="status">Texture for {textureError} could not load. Showing its reference color; reload to retry.</p>}{error&&<div className="viewer-error" role="alert"><p>{error}</p><img src="/references/regular.jpg" alt="Manufacturer front and back construction reference"/></div>}</div>;
}
