import {useState,useMemo} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {type DesignSlots,toggleComparison} from '../data/designs';
import {constructionLabel,hardwareLabel} from '../data/config';
import {createCameraSync} from '../viewer/cameraSync';
import Viewer,{type ViewCommand} from '../viewer/Viewer';
import DesignThumbnail from './DesignThumbnail';

export type LibraryMode='library'|'save'|'select'|'view'|'compare'|null;
const views:[string,number][]=[['Front',0],['Back',Math.PI],['Left ¾',-Math.PI/4],['Right ¾',Math.PI/4]];
const ignoreSelection=()=>{};
export default function DesignLibrary({mode,onMode,slots,editingId,onSave,onEdit,onDelete,message}:{mode:LibraryMode;onMode:(m:LibraryMode)=>void;slots:DesignSlots;editingId:number|null;onSave:(id:number)=>void;onEdit:(id:number)=>void;onDelete:(id:number)=>void;message:string}){
 const [ids,setIds]=useState<number[]>([]),[viewId,setViewId]=useState(1);
 const [confirm,setConfirm]=useState<{kind:'replace'|'delete';id:number}|null>(null);
 const [command,setCommand]=useState<ViewCommand>({angle:0,serial:0,zoom:0});
 const sync=useMemo(()=>createCameraSync(),[]);
 const chosen=ids.filter(id=>slots[id-1]);
 const viewing=mode==='view',comparing=mode==='compare';
 const shown=(viewing?[viewId]:comparing?chosen:[]).map(id=>slots[id-1]).filter(s=>s!==null);
 const leave=(m:LibraryMode)=>{setConfirm(null);onMode(m);};
 const compare=()=>{if(chosen.length===2){setCommand(c=>({angle:0,serial:c.serial+1,zoom:0}));leave('compare');}};
 return <Dialog open={mode!==null} onOpenChange={open=>{if(!open)leave(null);}}>
  <DialogContent className={`design-dialog ${viewing||comparing?'design-view-dialog':''}`}>
   <DialogTitle>{mode==='save'?'Save your design.':viewing?`Design ${viewId}`:comparing?'Compare jackets.':mode==='select'?'Choose two designs.':'My designs.'}</DialogTitle>
   <DialogDescription>{viewing||comparing?'Drag to rotate. Shared views keep both jackets at the same angle.':'Three permanent slots, saved in this browser. Your fabrics and construction stay with each design.'}</DialogDescription>
   {message&&<p className="save-message" role="status">{message}</p>}
   {viewing||comparing?<>
    <div className="library-toolbar"><button onClick={()=>leave('library')}>← My designs</button><div className="view-buttons">{views.map(([label,angle])=><button key={label} aria-pressed={command.angle===angle} onClick={()=>setCommand(c=>({angle,serial:c.serial+1,zoom:0}))}>{label}</button>)}</div></div>
    <div className={`comparison-models ${viewing?'single-design':''}`}>
     {shown.map(saved=><article className="comparison-model" key={saved.id}>
      <div className="comparison-heading"><h2>Design {saved.id}</h2><button onClick={()=>onEdit(saved.id)}>Edit Design {saved.id} ↗</button></div>
      <div className="saved-viewer"><Viewer config={{...saved.config,mannequin:'none'}} command={command} onSelect={ignoreSelection} cameraSync={comparing?sync:undefined}/></div>
      <p className="comparison-codes">{saved.config.body.code} <span>/</span> {saved.config.sleeves.code}</p>
     </article>)}
    </div>
    <div className="comparison-details"><table><caption className="sr-only">Saved design differences</caption><thead><tr><th>Details</th>{shown.map(s=><th key={s.id}>Design {s.id}</th>)}</tr></thead><tbody>
     {[
      ['Body',...shown.map(s=>s.config.body.code)],
      ['Sleeves',...shown.map(s=>s.config.sleeves.code)],
      ['Shoulder',...shown.map(s=>s.config.construction.shoulder==='raglan'?'Raglan':'Regular')],
      ['Closure',...shown.map(s=>hardwareLabel(s.config.construction))],
      ['Collar',...shown.map(s=>s.config.construction.collar==='high-neck'?'High neck':'Varsity')],
      ['Size',...shown.map(s=>s.config.size)]
     ].map(([label,...values])=><tr key={label} className={values.length===2&&values[0]!==values[1]?'different':''}><th scope="row">{label}</th>{values.map((v,i)=><td key={i}>{v}</td>)}</tr>)}
    </tbody></table></div>
   </>:<>
    {confirm&&<div className="slot-confirm" role="alert"><p>{confirm.kind==='replace'?`Replace Design ${confirm.id} with the current jacket?`:`Delete Design ${confirm.id}?`}</p><div><button onClick={()=>setConfirm(null)}>Cancel</button><button className="danger-action" onClick={()=>{if(confirm.kind==='replace')onSave(confirm.id);else{onDelete(confirm.id);setIds(ids=>ids.filter(x=>x!==confirm.id));}setConfirm(null);}}>{confirm.kind==='replace'?'Replace':'Delete'}</button></div></div>}
    <div className="design-slots">{slots.map((saved,i)=><article className={`design-slot ${chosen.includes(i+1)?'compare-selected':''}`} key={i}>
     <h2>Design {i+1}</h2>
     {saved?<>
      <button className="thumbnail-button" aria-label={`View Design ${i+1}`} onClick={()=>{setViewId(i+1);leave('view');}}><DesignThumbnail config={saved.config}/></button>
      <strong className="slot-codes">{saved.config.body.code} / {saved.config.sleeves.code}</strong><p className="slot-summary">{constructionLabel(saved.config.construction)}</p><span className="slot-status">Saved · {new Date(saved.savedAt).toLocaleDateString()}</span>
      <div className="slot-actions"><button onClick={()=>{setViewId(i+1);leave('view');}}>View</button><button onClick={()=>onEdit(i+1)}>Edit</button><button onClick={()=>{if(mode==='save'&&editingId===i+1)onSave(i+1);else setConfirm({kind:'replace',id:i+1});}}>{mode==='save'&&editingId===i+1?'Save changes':'Replace'}</button><button onClick={()=>setConfirm({kind:'delete',id:i+1})}>Delete</button></div>
      <label className="compare-choice"><input type="checkbox" checked={chosen.includes(i+1)} disabled={chosen.length===2&&!chosen.includes(i+1)} onChange={()=>setIds(toggleComparison(chosen,i+1))}/> Compare Design {i+1}</label>
     </>:<><div className="empty-design" aria-hidden="true">+</div><p>Empty</p><button className="save-slot-button" onClick={()=>onSave(i+1)}>Save current jacket</button></>}
    </article>)}</div>
    <div className="library-bottom"><p>{slots.filter(Boolean).length<2?'Save at least two designs to compare.':`${chosen.length} / 2 selected for comparison`}</p><button className="primary" disabled={chosen.length!==2} onClick={compare}>Compare jackets →</button></div>
   </>}
  </DialogContent>
 </Dialog>;
}
