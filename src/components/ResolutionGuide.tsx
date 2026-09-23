import { Link, useLocation } from 'react-router-dom';

const GUIDES:Record<string,{title:string;why:string;steps:string[];done:string}>={
  accepted_not_activated:{title:'Account activation needed',why:'This student was accepted but has not completed JPAC account activation.',steps:['Use Resend login email to issue a fresh secure setup link.','Ask the student or guardian to complete account setup and log in.','Refresh the student status after login.'],done:'Resolved when the login invitation/account status shows Accepted.'},
  missing_consent:{title:'Consent required',why:'The student has active course access but JPAC does not have completed Academy consent.',steps:['Open the student consent record below.','Have the student or guardian complete the required JPAC policy consent.','Confirm the consent status changes to Complete.'],done:'Resolved when Consent Status is Complete.'},
  payment_unverified:{title:'Payment or scholarship verification needed',why:'The student has course access without verified payment or an awarded scholarship.',steps:['Review the student payment ledger below.','If tuition was paid, add or verify the payment record.','If access is scholarship-based, confirm the scholarship has been awarded instead of creating a payment record.'],done:'Resolved when JPAC has either a verified payment or an Awarded scholarship.'},
  scholarship_review:{title:'Scholarship review waiting',why:'A scholarship request is waiting for a staff decision.',steps:['Review the student scholarship request and supporting information.','Set the scholarship decision to Awarded, Denied, or the appropriate review status.','If awarded, return to Enrollment Manager and confirm course access.'],done:'Resolved when the scholarship is no longer in Requested or Under Review status.'},
  assignment_review:{title:'Assignment awaiting assessment',why:'The student has submitted work that is waiting for instructor review.',steps:['Teacher Studio should open with this student selected.','Open the pending submission and review the evidence and rubric.','Enter a valid score and feedback, then choose Complete Assessment or Return for Revision.'],done:'Resolved when no submission remains in Submitted or Under Review status.'},
  active_without_course:{title:'Active student has no active course',why:'The student is marked active but does not currently have an active course enrollment.',steps:['Choose the correct course in Enrollment Manager.','Verify the payment or approved access reason.','Grant course access and confirm the enrollment becomes Active.'],done:'Resolved when an active enrollment exists for the student.'},
  onboarding_incomplete:{title:'Onboarding incomplete',why:'One or more required onboarding checkpoints are still incomplete.',steps:['Review the student profile and onboarding status.','Confirm account activation, completed consent, verified payment or awarded scholarship, and active course enrollment.','Resolve each missing checkpoint using the Enrollment, Payment, Consent, and Profile shortcuts above.'],done:'Resolved automatically when all onboarding requirements are satisfied.'}
};

export function ResolutionGuide(){
  const location=useLocation();
  const params=new URLSearchParams(location.search);
  const key=params.get('resolve')||'';
  const guide=GUIDES[key];
  if(!guide)return null;
  const email=params.get('email')||localStorage.getItem('jpac.activeStudentEmail')||'';
  const student=params.get('student')||email||'this student';
  return <section className="card card-pad" style={{marginBottom:20,border:'1px solid rgba(245,196,81,.45)'}} aria-label="Resolution guide">
    <div className="eyebrow">Guided resolution</div>
    <h2 style={{marginTop:6}}>{guide.title}</h2>
    <p><strong>Student:</strong> {student}</p>
    <p className="muted">{guide.why}</p>
    <div style={{display:'grid',gap:10,margin:'16px 0'}}>{guide.steps.map((step,index)=><div key={step} style={{display:'flex',gap:10,alignItems:'flex-start'}}><strong>{index+1}.</strong><span>{step}</span></div>)}</div>
    <p><strong>How JPAC knows it is fixed:</strong> {guide.done}</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}><Link className="button button-secondary" to="/">Back to Operations Center</Link>{email&&<Link className="button button-secondary" to={`/staff/student-profiles?email=${encodeURIComponent(email)}`}>Student Profiles</Link>}</div>
  </section>;
}
