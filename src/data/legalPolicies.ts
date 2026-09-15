// This checkout had no static legal pages. These explicit placeholders remain
// visible until JPAC administrators publish reviewed policy text.
export const legalPolicyTemplates = [
  { slug: 'terms', title: 'Terms of Service', body: 'JPAC Academy Terms of Service template. Final terms have not been published. Contact JPAC staff for the current approved terms before enrollment.' },
  { slug: 'privacy', title: 'Privacy Policy', body: 'JPAC Academy Privacy Policy template. Final details about information collection, use, retention, and privacy requests have not been published. Contact JPAC staff for the current approved privacy information.' },
  { slug: 'childrens-privacy', title: 'Children’s Privacy / COPPA Notice', body: 'JPAC Academy Children’s Privacy notice template. Final parent/guardian procedures and children’s privacy information have not been published. A parent or guardian should contact JPAC staff for approved instructions before a child begins coursework.' },
  { slug: 'acceptable-use', title: 'Acceptable Use Policy', body: 'JPAC Academy Acceptable Use Policy template. Final community, conduct, and platform-use requirements have not been published. Contact JPAC staff for approved guidance.' },
  { slug: 'refund', title: 'Refund Policy', body: 'JPAC Academy Refund Policy template. Final refund eligibility, timeframes, and request procedures have not been published. Confirm the applicable terms with JPAC staff before making a payment.' },
  { slug: 'media-release', title: 'Media Release', body: 'JPAC Academy Media Release template. This page does not collect or grant media permission. Contact JPAC staff for the applicable approved release and parent/guardian instructions.' },
  { slug: 'ai', title: 'AI Policy', body: 'JPAC Academy AI Policy template. Final guidance for permitted AI use, attribution, and coursework has not been published. Contact JPAC staff for approved instructions.' },
] as const;
export type LegalPolicy = { slug: string; title: string; effective_date: string | null; body: string; published: boolean };
