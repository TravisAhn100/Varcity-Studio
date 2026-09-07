import {type Construction} from '../data/config';

export default function ConstructionControls({value,onChange}:{value:Construction;onChange:(patch:Partial<Construction>)=>void}){
 return <div className="construction-options" id="construction-options">
  <fieldset><legend>Shoulder</legend><div>{(['regular','raglan'] as const).map(x=><button key={x} aria-pressed={value.shoulder===x} onClick={()=>onChange({shoulder:x})}>{x==='regular'?'Regular':'Raglan'}</button>)}</div></fieldset>
  <fieldset><legend>Closure</legend><div>{(['snaps','zipper','placket'] as const).map(x=><button key={x} aria-pressed={value.closure===x} onClick={()=>onChange({closure:x})} title={x==='placket'?'Zipper with covering placket and snaps':undefined}>{x==='snaps'?'Snaps':x==='zipper'?'Zipper':'Zip + placket'}</button>)}</div></fieldset>
  <fieldset><legend>Collar</legend><div>{(['varsity','high-neck'] as const).map(x=><button key={x} aria-pressed={value.collar===x} onClick={()=>onChange({collar:x})}>{x==='varsity'?'Varsity':'High neck'}</button>)}</div></fieldset>
 </div>;
}
