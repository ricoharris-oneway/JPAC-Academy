import{useMemo,useState}from'react';
import{buildLevelCurriculumExport,buildModuleCurriculumExport,copyCurriculumExport,curriculumExportFilename,downloadCurriculumExport,serializeCurriculumExport}from'../lib/curriculumExport';
import type{CurriculumExportInput,CurriculumExportScopeType,CurriculumLevelExportInput}from'../types/curriculumExport';

export function CurriculumExportDialog({input,levelInput,onClose}:{input:CurriculumExportInput;levelInput:CurriculumLevelExportInput;onClose:()=>void}){
  const[scope,setScope]=useState<CurriculumExportScopeType>('module');const[includeIds,setIncludeIds]=useState(false);const[message,setMessage]=useState('');
  const value=useMemo(()=>scope==='module'?buildModuleCurriculumExport(input,includeIds):buildLevelCurriculumExport(levelInput,includeIds),[scope,input,levelInput,includeIds]);
  const json=useMemo(()=>serializeCurriculumExport(value),[value]);
  const summary=scope==='module'?`${input.course.title} / ${input.level.title} / Module ${input.module.level_module_number}`:`${input.course.title} / ${input.level.title} / ${levelInput.modules.length} modules`;
  async function copy(){try{await copyCurriculumExport(json);setMessage('JSON copied.')}catch{setMessage('Copy failed. Select the preview and copy manually.')}}
  return <div className="e4-export-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="card e4-export-dialog" role="dialog" aria-modal="true" aria-labelledby="curriculum-export-title">
      <div className="section-head"><div><div className="eyebrow">Read-only JSON • Contract v1.1.0</div><h2 id="curriculum-export-title">Export curriculum</h2></div><button type="button" className="button button-secondary" onClick={onClose}>Close</button></div>
      <fieldset className="e4-export-scope"><legend>Export scope</legend><label><input type="radio" name="curriculum-export-scope" value="module" checked={scope==='module'} onChange={()=>setScope('module')}/><span>Current module</span></label><label><input type="radio" name="curriculum-export-scope" value="level" checked={scope==='level'} onChange={()=>setScope('level')}/><span>Current level</span></label></fieldset>
      <p className="e4-export-summary"><strong>Exporting:</strong> {summary}</p>
      <label className="e4-export-toggle"><input type="checkbox" checked={includeIds} onChange={event=>setIncludeIds(event.target.checked)}/><span>Include database IDs <small>Admin reuse only</small></span></label>
      {value.warnings.length>0&&<div className="e4-export-warnings" aria-label="Export warnings"><strong>{value.warnings.length} export warning{value.warnings.length===1?'':'s'}</strong><ul>{value.warnings.map((warning,index)=><li key={`${warning.level_number}-${warning.module_number}-${warning.code}-${index}`}><b>Module {warning.module_number} · {warning.code}</b>: {warning.message}</li>)}</ul></div>}
      <label className="e4-export-preview">JSON preview<textarea readOnly spellCheck={false} value={json}/></label>
      {message&&<div role="status" className="admin-message">{message}</div>}
      <div className="e4-actions"><button type="button" className="button button-secondary" onClick={()=>void copy()}>Copy JSON</button><button type="button" className="button button-primary" onClick={()=>downloadCurriculumExport(curriculumExportFilename(value),json)}>Download JSON</button></div>
    </section>
  </div>
}
