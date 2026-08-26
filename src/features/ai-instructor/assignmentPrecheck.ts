import type{AssignmentPrecheckResult,CoachChecklistItem}from'./types';

const clean=(value:string)=>value.replace(/^[-*\d.)\s]+/,'').trim();
const meaningful=(value:string)=>value.length>5;

function instructionItems(instructions:string){
  return instructions.split(/\r?\n|(?<=[.!?])\s+/).map(clean).filter(meaningful).slice(0,5).map((label,index):CoachChecklistItem=>({id:`instruction-${index}`,label,source:'instructions'}));
}

function rubricItems(rubric:unknown){
  if(!rubric||typeof rubric!=='object')return[];
  const criteria=(rubric as{criteria?:unknown}).criteria;
  if(!Array.isArray(criteria))return[];
  return criteria.slice(0,5).flatMap((criterion,index):CoachChecklistItem[]=>{
    if(typeof criterion==='string'&&meaningful(criterion))return[{id:`rubric-${index}`,label:`Review rubric: ${criterion}`,source:'rubric'}];
    if(!criterion||typeof criterion!=='object')return[];
    const record=criterion as Record<string,unknown>;const name=String(record.name||record.title||record.criterion||'').trim();
    return meaningful(name)?[{id:`rubric-${index}`,label:`Review rubric: ${name}`,source:'rubric'}]:[];
  });
}

export function buildAssignmentChecklist(instructions?:string,rubric?:unknown){
  const items=[...instructionItems(instructions||''),...rubricItems(rubric)];
  return items.length?items:[{id:'safe-fallback',label:'Review the authored assignment directions before preparing your work.',source:'safety' as const}];
}

export function runAssignmentCompletenessCheck(input:{instructions?:string;rubric?:unknown;hasPreparedEvidence?:boolean}):AssignmentPrecheckResult{
  const items=buildAssignmentChecklist(input.instructions,input.rubric).map(item=>({...item,complete:false}));
  if(input.hasPreparedEvidence)items.unshift({id:'evidence-ready',label:'A practice file is selected in this browser session.',source:'safety',complete:true});
  const hasRequirements=Boolean(input.instructions?.trim())||rubricItems(input.rubric).length>0;
  const ready=hasRequirements&&Boolean(input.hasPreparedEvidence);
  return{label:'Completeness check only',status:ready?'ready_to_review':'needs_attention',items,summary:ready?'A file is prepared. Review every authored requirement before you choose to submit.':'Review the authored requirements and prepare your work. JPAC Coach does not submit or grade it.'};
}
