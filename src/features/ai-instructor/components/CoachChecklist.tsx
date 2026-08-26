import{useState}from'react';
import type{CoachChecklistItem}from'../types';

export function CoachChecklist({items,label='Completeness check only'}:{items:CoachChecklistItem[];label?:string}){
  const[message,setMessage]=useState('');if(!items.length)return null;
  async function copy(){try{await navigator.clipboard.writeText(items.map(item=>`- ${item.label}`).join('\n'));setMessage('Checklist copied.')}catch{setMessage('Copy was blocked by this browser.')}}
  return <div className="coach-checklist"><div className="coach-checklist-head"><strong>{label}</strong><button type="button" onClick={()=>void copy()}>Copy checklist</button></div><ul>{items.map(item=><li key={item.id} className={item.complete?'complete':''}><span aria-hidden="true">{item.complete?'✓':'○'}</span>{item.label}</li>)}</ul>{message&&<small role="status">{message}</small>}</div>;
}
