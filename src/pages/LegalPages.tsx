import { Link, Navigate, useParams } from 'react-router-dom';
import { legalPolicies, policyBySlug, policyMeta } from '../data/legalPolicies';
import '../styles/legal-consent.css';

function LegalHeader({ title, summary }: { title: string; summary: string }) {
  return <header className="legal-header"><Link to="/legal" className="legal-brand">JPAC Academy · Legal &amp; Policies</Link><h1>{title}</h1><p>{summary}</p></header>;
}

export function LegalIndexPage() {
  return <main className="legal-page"><LegalHeader title="Legal & Policies" summary="Plain-language policy templates for JPAC Academy students and families."/><div className="legal-notice">These templates explain JPAC’s intended practices and are not final legal advice. JPAC will finalize effective dates and contact details before launch.</div><div className="policy-grid">{legalPolicies.map((policy) => <Link className="policy-card" to={`/legal/${policy.slug}`} key={policy.slug}><h2>{policy.title}</h2><p>{policy.summary}</p><span>Read policy →</span></Link>)}</div><PolicyFooter/></main>;
}

export function LegalPolicyPage() {
  const { slug } = useParams(); const policy = slug ? policyBySlug.get(slug) : undefined;
  if (!policy) return <Navigate to="/legal" replace/>;
  return <main className="legal-page"><LegalHeader title={policy.title} summary={policy.summary}/><div className="policy-meta"><span><strong>Effective Date:</strong> {policyMeta.effectiveDate}</span><span><strong>Organization:</strong> {policyMeta.organization}</span></div><article className="policy-document">{policy.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}</article><PolicyFooter/></main>;
}

function PolicyFooter() { return <footer className="policy-footer"><h2>Questions or requests</h2><p>{policyMeta.organization}<br/>{policyMeta.website}<br/>{policyMeta.contact}<br/>{policyMeta.address}</p><Link to="/legal">View all policies</Link></footer>; }
