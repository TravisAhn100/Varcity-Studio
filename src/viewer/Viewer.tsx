import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGarment,makeMannequin} from './garment';
import {Config,Region,resolveChoice} from '../data/config';
export type ViewCommand={angle:number;serial:number;zoom?:number};
function surface(kind:string){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d')!;const image=ctx.createImageData(256,256);let seed=12345;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){seed=(seed*1664525+1013904223)>>>0;const n=seed/4294967296;let v=128+(n-.5)*70;
 if(kind==='corduroy'||kind==='rib-knit')v=128+100*Math.cos(x*Math.PI/8)+(n-.5)*15;
 if(kind==='premium'||kind==='leather')v=130+35*Math.sin(x*.6+Math.sin(y*.5)*2)*Math.cos(y*.5)+(n-.5)*30;
 const i=(y*256+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}
 ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,3);return texture;
}
function ribMap(color:string){const c=document.createElement('canvas');c.width=32;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,32,128);ctx.fillStyle='#eeeadd';ctx.fillRect(0,26,32,12);ctx.fillRect(0,58,32,12);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export default function Viewer({config,command,onSelect}:{config:Config;command:ViewCommand;onSelect:(r:Region)=>void}){
 const host=useRef<HTMLDivElement>(null);const engine=useRef<any>(null);const [error,setError]=useState('');const select=useRef(onSelect);select.current=onSelect;
 useEffect(()=>{if(!host.current)return;const node=host.current;let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D preview needs WebGL. Try a browser with hardware acceleration enabled.');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;node.appendChild(renderer.domElement);
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
 engine.current={scene,camera,controls,parts,mannequins,render,materials:[],textures:[],oldMannequin:'none'};resize();
 return()=>{observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>m.dispose());}});engine.current?.textures.forEach((t:THREE.Texture)=>t.dispose());env.dispose();pmrem.dispose();renderer.dispose();node.removeChild(renderer.domElement);engine.current=null;};
 },[]);
 useEffect(()=>{const e=engine.current;if(!e)return;e.materials.forEach((m:THREE.Material)=>m.dispose());e.textures.forEach((t:THREE.Texture)=>t.dispose());e.materials=[];e.textures=[];
 const mapping:Record<string,Region>={body:'body',leftSleeve:'sleeves',rightSleeve:'sleeves',collar:'collar',leftCuff:'cuffs',rightCuff:'cuffs',waistband:'waistband',leftPocketTrim:'pocketTrim',rightPocketTrim:'pocketTrim',snaps:'snaps'};
 const materials:Partial<Record<Region,THREE.Material>>={};Object.values(mapping).forEach(region=>{if(materials[region])return;const choice=resolveChoice(config[region]);const kind=choice.kind;const bump=surface(kind);e.textures.push(bump);const mat=new THREE.MeshPhysicalMaterial({color:choice.baseColor,roughness:kind==='metal'?.23:kind==='premium'?.32:kind==='leather'?.47:.93,metalness:kind==='metal'?.85:0,bumpMap:kind==='metal'?null:bump,bumpScale:kind==='corduroy'?.035:kind==='premium'?.015:.009,sheen:kind==='wool'?.7:.15,sheenRoughness:.9,clearcoat:kind==='premium'?.22:0,side:THREE.DoubleSide});
 if(kind==='rib-knit'){const map=ribMap(choice.baseColor);e.textures.push(map);mat.color.set('#ffffff');mat.map=map;}
 materials[region]=mat;e.materials.push(mat);});
 e.parts.forEach((meshes:THREE.Mesh[],id:string)=>meshes.forEach(m=>m.material=materials[mapping[id]]!));Object.entries(e.mannequins).forEach(([id,m])=>{(m as THREE.Group).visible=id===config.mannequin;});
 if(e.oldMannequin!==config.mannequin){e.controls.target.set(0,config.mannequin==='none'?0:-.5,0);e.camera.position.set(0,.3,config.mannequin==='none'?7.1:9.1);e.oldMannequin=config.mannequin;e.controls.update();}e.render();
 },[config]);
 useEffect(()=>{const e=engine.current;if(!e)return;const distance=command.zoom?THREE.MathUtils.clamp(e.camera.position.distanceTo(e.controls.target)*command.zoom,4,10):(config.mannequin==='none'?7.1:9.1);const a=command.angle;e.camera.position.set(Math.sin(a)*distance,e.controls.target.y+.3,Math.cos(a)*distance);e.controls.update();e.render();},[command]);
 return <div className="canvas-host" ref={host}>{error&&<div className="viewer-error" role="alert"><p>{error}</p><img src="/references/regular.jpg" alt="Manufacturer front and back construction reference"/></div>}</div>;
}
