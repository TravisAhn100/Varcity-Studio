'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,RotateCcw,Plus,Minus,MoveHorizontal,Shirt,ChevronDown} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import Viewer from '../src/viewer/Viewer';
import {initialConfig,type Config,type Region,regions,hasFabricCollar,changeConstruction,constructionLabel,hardwareLabel} from '../src/data/config';
import {STORAGE_KEY,decodeDesigns,encodeDesigns,saveSlot,deleteSlot,cloneConfig,type DesignSlots} from '../src/data/designs';
import VarsityStar from '../src/components/VarsityStar';
import ConstructionControls from '../src/components/ConstructionControls';
import MaterialEditor from '../src/components/MaterialEditor';
import References from '../src/components/References';
import DesignLibrary,{type LibraryMode} from '../src/components/DesignLibrary';

function readSavedDesigns(){
 try{return decodeDesigns(window.localStorage.getItem(STORAGE_KEY));}
 catch{return {slots:decodeDesigns(null).slots,warning:'Browser storage is unavailable. Enable it to save designs.'};}
}
export default function App(){
 const [loaded]=useState(readSavedDesigns);
 const [slots,setSlots]=useState<DesignSlots>(loaded.slots);
 const slotsRef=useRef(slots);slotsRef.current=slots;
 const [step,setStep]=useState<'start'|'customize'>('start');
 const [config,setConfig]=useState<Config>(()=>cloneConfig(initialConfig));
 const [region,setRegion]=useState<Region>('body');
 const [modal,setModal]=useState<'sizes'|'examples'|null>(null);
 const [libraryMode,setLibraryMode]=useState<LibraryMode>(null);
 const [constructionOpen,setConstructionOpen]=useState(false);
 const [editingId,setEditingId]=useState<number|null>(null);
 const [baseline,setBaseline]=useState(JSON.stringify(initialConfig));
 const [message,setMessage]=useState(loaded.warning);
 const [pending,setPending]=useState<(()=>void)|null>(null);
 const [command,setCommand]=useState({angle:0,serial:0,zoom:1});
 const dirty=editingId!==null&&JSON.stringify(config)!==baseline;
 const viewingDesigns=libraryMode==='view'||libraryMode==='compare';
 const index=regions.findIndex(r=>r.id===region);
 const labelFor=(r:Region)=>r==='snaps'?hardwareLabel(config.construction):regions.find(x=>x.id===r)!.label;
 const navigate=(action:()=>void)=>{if(dirty)setPending(()=>action);else action();};
 const setChoice=(material:string,code:string)=>setConfig(c=>({...c,[region==='collar'&&hasFabricCollar(c.construction)?'fabricCollar':region]:{material,code}}));
 const persist=(next:DesignSlots)=>{
  try{window.localStorage.setItem(STORAGE_KEY,encodeDesigns(next));slotsRef.current=next;setSlots(next);return true;}
  catch{setMessage('Your design could not be saved. Browser storage may be full or disabled. Your current jacket is still here.');return false;}
 };
 const saveCurrent=(id:number)=>{
  if(!persist(saveSlot(slotsRef.current,id,config)))return false;
  setEditingId(id);setBaseline(JSON.stringify(config));setMessage(`Design ${id} saved in this browser.`);return true;
 };
 const editDesign=(id:number)=>navigate(()=>{
  const saved=slotsRef.current[id-1];if(!saved)return;
  const next=cloneConfig(saved.config);setConfig(next);setBaseline(JSON.stringify(next));setEditingId(id);
  setRegion('body');setStep('customize');setLibraryMode(null);setConstructionOpen(false);setMessage('');
 });
 const removeDesign=(id:number)=>{
  if(persist(deleteSlot(slotsRef.current,id))){if(editingId===id){setEditingId(null);setBaseline(JSON.stringify(config));}setMessage(`Design ${id} deleted. The slot is ready for another jacket.`);}
 };
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 const goView=(angle:number,zoom=1)=>setCommand(c=>({angle,serial:c.serial+1,zoom}));
 return <div className="app-shell">
  <header className="main-header">
   <button className="wordmark" onClick={()=>navigate(()=>setStep('start'))} aria-label="Varsity home"><VarsityStar className="nav-star"/><span className="brand-name">varsity</span></button>
   <nav className="design-navigation" aria-label="Design library"><button onClick={()=>navigate(()=>setLibraryMode('library'))}>MY DESIGNS</button><span aria-hidden="true">·</span><button onClick={()=>navigate(()=>setLibraryMode('select'))}>COMPARE</button></nav>
   <button className="text-link" onClick={()=>setModal('examples')}>Real examples <ArrowUpRight size={16}/></button>
  </header>
  <main className="workspace">
   <div className="configurator-top">
    <div className="configurator-heading"><span className="eyebrow">THE ORIGINAL / 01</span><span className="studio-dot">LIVE 3D PREVIEW</span><div className="construction-heading-actions">
     <button aria-expanded={constructionOpen} aria-controls="construction-options" onClick={()=>setConstructionOpen(x=>!x)}>CONSTRUCTION <ChevronDown size={15} className={constructionOpen?'chevron-open':''}/></button><span aria-hidden="true">·</span><button onClick={()=>setModal('sizes')}>{config.size} / SIZE REFERENCE</button>
    </div></div>
    {constructionOpen&&<ConstructionControls value={config.construction} onChange={patch=>setConfig(c=>changeConstruction(c,patch))}/>}
   </div>
   <section className="stage">
    <div className="watermark" aria-hidden="true">VARSITY</div>
    {!viewingDesigns&&<Viewer config={config} command={command} onSelect={r=>{if(step==='customize')setRegion(r);}}/>}
    <div className="viewer-tools"><button aria-label="Zoom in" onClick={()=>goView(command.angle,.85)}><Plus size={17}/></button><button aria-label="Zoom out" onClick={()=>goView(command.angle,1.15)}><Minus size={17}/></button><button aria-label="Reset camera" onClick={()=>setCommand(c=>({angle:0,serial:c.serial+1,zoom:0}))}><RotateCcw size={16}/></button></div>
    <div className="stage-bottom"><div className="view-buttons">{[['Front',0],['Back',Math.PI],['Left ¾',-Math.PI/4],['Right ¾',Math.PI/4]].map(([label,angle])=><button key={label} aria-pressed={command.angle===angle} onClick={()=>setCommand(c=>({angle:Number(angle),serial:c.serial+1,zoom:0}))}>{label}</button>)}</div><span className="drag-hint"><MoveHorizontal size={15}/> Drag to rotate · Scroll to zoom</span></div>
    <div className="model-bar"><span>VIEW ON</span><div>{(['none','male','female'] as const).map(m=><button key={m} aria-pressed={config.mannequin===m} onClick={()=>setConfig(c=>({...c,mannequin:m}))}>{m==='none'?'Jacket only':m==='male'?'Male':'Female'}</button>)}</div><span className="model-note">{config.mannequin==='none'?'360° studio view':'Approximate mannequin'}</span></div>
   </section>
   <aside className="control-panel">
    {step==='start'?<div className="intro"><span className="eyebrow">MADE TO BE YOURS</span><h1>Your jacket.<br/>Your signature.</h1><p>Make it your own with original fabrics, colors, and the details that matter. Save your favorites. Compare them together.</p><div className="intro-spec"><Shirt size={21}/><div><strong>Create. Save. Compare.</strong><span>Three designs. Every detail yours.</span></div></div><button className="primary" onClick={()=>setStep('customize')}><span><VarsityStar className="cta-star"/> Make Your Jacket</span><ArrowRight size={19}/></button><span className="small-note">Manufacturer fabrics. A real-time preview.</span><div className="intro-bottom"><span>01 / CREATE</span><span>02 / SAVE</span><span>03 / COMPARE</span></div></div>:<>
    <div className="panel-heading"><span className="eyebrow">{editingId?`DESIGN ${editingId} / ${dirty?'UNSAVED CHANGES':'SAVED'}`:'YOUR JACKET'}</span><h1>Make it personal.</h1><p className="construction-summary">{constructionLabel(config.construction)}</p></div>
    <div className="region-grid" aria-label="Jacket regions">{regions.map((r,i)=><button key={r.id} aria-pressed={region===r.id} onClick={()=>setRegion(r.id)}><span>{String(i+1).padStart(2,'0')}</span>{labelFor(r.id)}{region===r.id&&<span className="selected-dot"/>}</button>)}</div>
    <MaterialEditor config={config} region={region} onChoose={setChoice}/>
    <div className="editor-progress"><span>STEP {index+1} / 7</span><div>{index>0&&<button className="previous-step" onClick={()=>setRegion(regions[index-1].id)}>Back</button>}<button className="primary" onClick={()=>{if(index<6)setRegion(regions[index+1].id);else{setMessage('');setLibraryMode('save');}}}>{index===6?'Save your design':`Next: ${labelFor(regions[index+1].id)}`} <ArrowRight size={16}/></button></div></div>
    <div className="panel-footer"><span>Designed by you.</span><span>VARSITY / 1.1.0</span></div>
   </>}
  </aside></main>
  <footer className="site-footer"><span>VARSITY DESIGN STUDIO</span><span>Materials referenced from <a href="https://gwa.kr/goods/catalog?code=00010004" target="_blank" rel="noreferrer">과잠팩토리 ↗</a></span><span>PROTOTYPE / 2026</span></footer>
  <References modal={modal} setModal={setModal} config={config} onSize={size=>setConfig(c=>({...c,size}))}/>
  <DesignLibrary mode={libraryMode} onMode={setLibraryMode} slots={slots} editingId={editingId} onSave={id=>{if(saveCurrent(id))setLibraryMode('library');}} onEdit={editDesign} onDelete={removeDesign} message={message}/>
  <Dialog open={pending!==null} onOpenChange={open=>{if(!open)setPending(null);}}><DialogContent className="unsaved-dialog"><DialogTitle>Save changes to Design {editingId}?</DialogTitle><DialogDescription>Your saved jacket has unsaved changes.</DialogDescription>{message&&<p role="status">{message}</p>}<div className="unsaved-actions"><button onClick={()=>setPending(null)}>Keep editing</button><button onClick={()=>{const action=pending;setConfig(JSON.parse(baseline));setPending(null);action?.();}}>Discard</button><button className="primary" onClick={()=>{if(editingId&&saveCurrent(editingId)){const action=pending;setPending(null);action?.();}}}>Save</button></div></DialogContent></Dialog>
 </div>;
}
