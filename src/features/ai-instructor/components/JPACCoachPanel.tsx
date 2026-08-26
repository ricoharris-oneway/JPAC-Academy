import{useState}from'react';
import{Link}from'react-router-dom';
import{getCoachGuidance}from'../ruleBasedCoach';
import type{CoachContext}from'../types';
import{CoachChecklist}from'./CoachChecklist';
import{CoachSafetyNotice}from'./CoachSafetyNotice';

export function JPACCoachPanel({context,compact=false}:{context:CoachContext;compact?:boolean}){
  const[expanded,setExpanded]=useState(!compact);const guidance=getCoachGuidance(context);
  return <aside className={`jpac-coach-panel ${compact?'compact':''}`} aria-label="JPAC Coach guidance"><div className="coach-panel-heading"><div className="coach-avatar" aria-hidden="true">J</div><div><span>{guidance.label}</span><h2>{guidance.headline}</h2></div>{compact&&<button type="button" className="coach-expand" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Hide':'Show'} guidance</button>}</div>{expanded&&<div className="coach-panel-body"><p>{guidance.explanation}</p><div className="coach-next-step"><strong>Recommended next step</strong><span>{guidance.nextStep}</span></div>{guidance.precheck&&<p className="coach-precheck-summary"><strong>{guidance.precheck.label}:</strong> {guidance.precheck.summary}</p>}<CoachChecklist items={guidance.checklist}/>{guidance.revisionSteps.length>0&&<div className="coach-revision-plan"><strong>Teacher-feedback revision plan</strong><ol>{guidance.revisionSteps.map(step=><li key={step}>{step.replace(/^\d+\.\s*/, '')}</li>)}</ol></div>}<div className="coach-actions">{guidance.nextLink&&<Link className="button button-primary" to={guidance.nextLink.to}>{guidance.nextLink.label}</Link>}{guidance.practiceLink&&guidance.practiceLink.to!==guidance.nextLink?.to&&<Link className="button button-secondary" to={guidance.practiceLink.to}>{guidance.practiceLink.label}</Link>}</div></div>}<CoachSafetyNotice/></aside>;
}
