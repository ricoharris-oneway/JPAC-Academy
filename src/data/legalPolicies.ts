export type PolicySection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalPolicy = { slug: string; title: string; summary: string; sections: PolicySection[] };

export const policyMeta = {
  organization: 'J. Moné’s Performing Arts Center Inc.',
  product: 'JPAC Academy',
  website: 'www.jmonespac.org',
  effectiveDate: 'October 7, 2026',
  contact: 'admissions@jmonespac.org',
  address: 'Public business mailing address pending final publication',
  phone: 'Public business telephone pending final publication',
};

export const legalPolicies: LegalPolicy[] = [
  { slug: 'terms', title: 'Terms of Service', summary: 'Rules for using JPAC Academy accounts, courses, creative tools, and services.', sections: [
    { heading: '1. Agreement and scope', paragraphs: [
      'JPAC Academy is an educational and creative-training service operated by J. Moné’s Performing Arts Center Inc. These Terms apply to Academy accounts, courses, assignments, creative tools, coaching features, events, and related services.',
      'An adult student accepts these Terms by creating an account or using the service. For a minor student, a parent or legal guardian must review and accept required terms and permissions on the student’s behalf.'
    ]},
    { heading: '2. Accounts and access', bullets: [
      'Provide accurate account and enrollment information and update it when it changes.',
      'Keep login credentials private and use only the account assigned to you.',
      'Do not impersonate another person, share accounts, or bypass access controls.',
      'JPAC may require age, identity, parent/guardian, payment, scholarship, or enrollment verification before enabling specific features.'
    ]},
    { heading: '3. Enrollment, payments, and refunds', paragraphs: [
      'Course access is controlled by JPAC enrollment records. Fees, billing intervals, discounts, scholarships, waivers, and included programs are communicated at checkout or in the enrollment confirmation. Payment or an approved waiver does not grant access to unrelated courses unless JPAC states otherwise.',
      'Refunds and cancellations are governed by the Refund Policy.'
    ]},
    { heading: '4. Student work and Academy content', paragraphs: [
      'Students retain ownership of original creative work they create. By submitting work to JPAC, the student grants JPAC a limited permission to store, review, display, play, transmit, annotate, and otherwise use the work as reasonably necessary for instruction, feedback, assessment, portfolio support, safety review, and approved educational showcases.',
      'Public or promotional use is separate and is governed by the Media Release Policy and the student’s or parent/guardian’s optional promotional permission. JPAC retains ownership of its curriculum, software, templates, branding, graphics, and other original Academy materials.'
    ]},
    { heading: '5. Student responsibilities', bullets: [
      'Follow instructor directions, safety rules, and the Acceptable Use Policy.',
      'Submit only work you created or have permission to use.',
      'Use AI and creative tools in accordance with the AI Policy and course-specific instructions.',
      'Do not use JPAC services for unlawful, harmful, deceptive, exploitative, or rights-infringing activity.'
    ]},
    { heading: '6. Availability and enforcement', paragraphs: [
      'JPAC may update, suspend, replace, or discontinue features when reasonably necessary for safety, maintenance, curriculum changes, or operations. JPAC may restrict or suspend access for serious or repeated policy violations, nonpayment, fraud, misuse, or legal requirements.'
    ]},
    { heading: '7. Educational-results disclaimer', paragraphs: [
      'JPAC Academy provides education and creative development. JPAC does not guarantee employment, income, auditions, awards, third-party certification, academic credit, or any particular professional or artistic outcome.'
    ]},
    { heading: '8. Applicable law and contact', paragraphs: [
      'These Terms are governed by applicable United States federal law and the laws of the State of Georgia, without limiting rights that cannot legally be waived. Questions may be sent to admissions@jmonespac.org.'
    ]}
  ]},

  { slug: 'privacy', title: 'Privacy Policy', summary: 'How JPAC Academy collects, uses, shares, protects, retains, and responds to requests about personal information.', sections: [
    { heading: '1. Scope', paragraphs: [
      'This Privacy Policy applies to JPAC Academy services operated by J. Moné’s Performing Arts Center Inc. It covers information collected through Academy accounts, enrollment, coursework, communications, creative submissions, support, payment verification, and related digital services.'
    ]},
    { heading: '2. Information we collect', bullets: [
      'Account and identity information, such as name, email, role, login status, and account identifiers.',
      'Student information, such as birthdate or age, school or grade information, learning goals, enrollment status, course access, progress, achievements, and support needs.',
      'Parent or guardian information, such as name, relationship, email, phone number, consent choices, and support information when applicable.',
      'Learning records, including lessons viewed, assignments, submissions, scores, instructor feedback, portfolio items, practice activity, and certificates.',
      'Creative media, including audio, video, photographs, images, documents, recordings, and other files submitted for instruction.',
      'Payment and access-verification records, including payment status, payment method category, amount, date, scholarship or waiver status, and transaction references. JPAC Academy does not intentionally store full payment-card numbers in its learning ledger.',
      'AI-supported learning activity, such as prompts, responses, course context, safety flags, and feedback when an AI feature is used.',
      'Technical and security information, such as device/browser information, IP address, timestamps, authentication events, error data, and security logs.'
    ]},
    { heading: '3. How we use information', bullets: [
      'Create and secure accounts and verify identity, age, enrollment, and access.',
      'Provide courses, instruction, feedback, coaching, assignments, progress tracking, certificates, and student support.',
      'Communicate with students and authorized parents or guardians about learning, scheduling, enrollment, payments, consent, safety, and support.',
      'Process or verify payments, scholarships, waivers, refunds, and course access.',
      'Improve curriculum, accessibility, reliability, safety, and Academy operations.',
      'Prevent fraud, abuse, unauthorized access, or violations of law or policy.'
    ]},
    { heading: '4. Sharing and service providers', paragraphs: [
      'JPAC may share information with authorized JPAC employees, instructors, contractors, and service providers only as reasonably necessary for their responsibilities. Providers may support hosting, authentication, storage, email, payments, video, analytics, communications, or AI features.',
      'JPAC does not sell student personal information. JPAC does not use children’s personal information for targeted advertising. Information may be disclosed when required by law or reasonably necessary to protect safety, prevent fraud, or defend legal rights.'
    ]},
    { heading: '5. Student media and AI', paragraphs: [
      'Student media may be used internally for instruction, feedback, assessment, portfolio review, or showcase preparation. Public or promotional use requires the separate permission described in the Media Release Policy.',
      'When AI-supported features are used, information necessary to provide the feature may be processed by JPAC and approved technology providers. Students should not enter passwords, financial account information, government identifiers, or unrelated highly sensitive information into AI prompts.'
    ]},
    { heading: '6. Retention and security', paragraphs: [
      'JPAC retains personal information only as long as reasonably necessary for the purpose for which it was collected, including education, safety, account administration, payment and accounting records, dispute resolution, and legal obligations. Information that is no longer reasonably necessary is deleted, de-identified, or otherwise disposed of consistent with applicable requirements.',
      'JPAC uses reasonable administrative, technical, and organizational safeguards designed to protect personal information. No online system can guarantee absolute security.'
    ]},
    { heading: '7. Privacy requests', paragraphs: [
      'Students and authorized parents or guardians may request access, correction, or deletion of personal information, subject to identity verification and lawful retention requirements. A parent or guardian may also withdraw consent where consent is required for continued collection or use. Requests may be sent to admissions@jmonespac.org.'
    ]},
    { heading: '8. Children under 13', paragraphs: [
      'JPAC provides additional protections for children under 13. The Children’s Privacy / COPPA Notice explains parental notice and consent, parent access and deletion rights, limits on collection and disclosure, and the process for withdrawing consent.'
    ]},
    { heading: '9. Operator contact', paragraphs: [
      'Operator: J. Moné’s Performing Arts Center Inc. · JPAC Academy. Website: www.jmonespac.org. Email: admissions@jmonespac.org.',
      'Before this policy is marked final and published, JPAC must add its public business mailing address and public telephone number to this section.'
    ]},
    { heading: '10. Policy changes', paragraphs: [
      'JPAC may update this policy as services or legal requirements change. Material changes affecting previously granted parental consent will be communicated and new consent obtained when required.'
    ]}
  ]},

  { slug: 'children-privacy', title: 'Children’s Privacy / COPPA Notice', summary: 'Special privacy notice and parent rights for children under 13 using JPAC Academy.', sections: [
    { heading: '1. Who this notice covers', paragraphs: [
      'JPAC Academy serves minors and may offer services to children under 13. When the Children’s Online Privacy Protection Act and COPPA Rule apply, JPAC provides direct notice to the parent or legal guardian and obtains verifiable parental consent before collecting, using, or disclosing the child’s personal information, except for limited circumstances permitted by law.'
    ]},
    { heading: '2. Information JPAC may collect', bullets: [
      'Name, birthdate or age, account information, student email when appropriate, and parent or guardian contact information.',
      'Enrollment, course participation, progress, assignments, scores, feedback, achievements, and support records.',
      'Audio, video, photographs, images, recordings, documents, or other creative work submitted for instruction.',
      'Technical and security information needed to operate and protect the service.',
      'AI-supported learning interactions when the required parental consent is in place.'
    ]},
    { heading: '3. Why JPAC uses this information', bullets: [
      'Provide and personalize instruction, assignments, feedback, and student support.',
      'Create and secure the student account and verify access.',
      'Communicate with the child’s authorized parent or guardian.',
      'Track educational progress and document completed work.',
      'Protect safety, troubleshoot the service, and comply with law.'
    ]},
    { heading: '4. Direct notice and parental consent', paragraphs: [
      'Before collecting personal information from a child under 13, JPAC will provide the parent or guardian with notice describing the information JPAC seeks to collect, how it will be used, whether it will be disclosed, and how consent may be provided. JPAC may collect a parent’s online contact information solely to request consent when permitted by law.',
      'JPAC will use a consent method reasonably designed to verify that the person providing consent is the child’s parent or legal guardian. The verification method may vary based on the information involved and the planned use or disclosure.'
    ]},
    { heading: '5. Parent choices and rights', bullets: [
      'Review the personal information JPAC has collected from the child.',
      'Request correction of inaccurate information.',
      'Request deletion of the child’s personal information, subject to lawful retention requirements.',
      'Refuse or withdraw consent to further collection or use.',
      'Choose between internal educational use and non-integral third-party disclosure where separate choice is required.',
      'Decline optional promotional media use without preventing ordinary course participation.'
    ]},
    { heading: '6. Sharing, minimization, and retention', paragraphs: [
      'JPAC may disclose a child’s information to service providers that support Academy operations when the disclosure is reasonably necessary to provide the service and is described to the parent. JPAC does not sell children’s personal information and does not use it for targeted advertising.',
      'JPAC will not require a child to provide more personal information than is reasonably necessary for an activity. Children’s information is retained only as long as reasonably necessary for the purpose for which it was collected and is then deleted or securely disposed of as required.'
    ]},
    { heading: '7. Security and parent contact', paragraphs: [
      'JPAC maintains reasonable procedures designed to protect the confidentiality, security, and integrity of children’s personal information and limits access to people and providers who need it for authorized responsibilities.',
      'Questions or parent privacy requests may be sent to admissions@jmonespac.org. Operator: J. Moné’s Performing Arts Center Inc. · JPAC Academy · www.jmonespac.org.',
      'Before this notice is marked final and published, JPAC must add its public business mailing address and public telephone number here.'
    ]}
  ]},

  { slug: 'acceptable-use', title: 'Acceptable Use Policy', summary: 'Safety, conduct, content, academic-integrity, and technology rules for the JPAC Academy community.', sections: [
    { heading: '1. Respect and safety', bullets: [
      'Treat students, families, instructors, staff, and community members respectfully.',
      'Do not bully, harass, threaten, discriminate against, exploit, or endanger another person.',
      'Do not upload unlawful, abusive, dangerous, or otherwise inappropriate content.',
      'Do not reveal another person’s private information or pressure anyone to share it.'
    ]},
    { heading: '2. Creative work and academic integrity', bullets: [
      'Submit only content that is appropriate for the learning activity and that you have the right to use.',
      'Respect copyright, trademark, privacy, publicity, and other intellectual-property rights.',
      'Do not knowingly submit plagiarized work or falsely claim another person’s work as your own.',
      'Follow instructor rules about outside assistance and AI use.'
    ]},
    { heading: '3. Accounts and system security', bullets: [
      'Do not share passwords, impersonate another person, or use another person’s account.',
      'Do not probe, scrape, reverse engineer, overload, disrupt, or attempt to bypass security or access controls.',
      'Do not upload malicious code or tools intended to compromise accounts or systems.',
      'Do not use unauthorized automated systems to collect data or operate the service.'
    ]},
    { heading: '4. AI and communications', bullets: [
      'Use AI and creative tools for approved learning and creative purposes, not for harassment, deception, impersonation, cheating, or unsafe activity.',
      'Do not upload highly sensitive information that is not necessary for the educational task.',
      'Use community, messaging, critique, and collaboration features only for appropriate educational and creative participation.'
    ]},
    { heading: '5. Enforcement and reporting', paragraphs: [
      'JPAC may remove content, limit features, require corrective action, contact a parent or guardian, suspend an account, remove access, or take other reasonable measures when needed for safety, law, or policy enforcement.',
      'Report policy or safety concerns to a JPAC instructor or staff member or email admissions@jmonespac.org.'
    ]}
  ]},

  { slug: 'refund-policy', title: 'Refund Policy', summary: 'Rules for cancellations, refunds, recurring charges, scholarships, and course-access changes.', sections: [
    { heading: '1. Scope', paragraphs: [
      'This Refund Policy applies to fees paid directly for JPAC Academy enrollment or course access unless a different written refund term is shown at checkout, in an enrollment agreement, or for a specific event or service.'
    ]},
    { heading: '2. Standard refund window', paragraphs: [
      'A family or adult student may request a full refund within 7 calendar days of the applicable purchase if the student has not completed more than 20% of the paid course and has not submitted a graded assignment for that course. JPAC may also issue a refund for a confirmed duplicate or erroneous charge.',
      'After the 7-day window, or after the participation threshold above is exceeded, payments are generally nonrefundable except where required by law or where JPAC determines that a documented billing or access error warrants an adjustment.'
    ]},
    { heading: '3. Recurring plans and cancellations', paragraphs: [
      'If an enrollment uses recurring billing, cancellation stops future scheduled charges after the cancellation becomes effective. Cancellation does not automatically create a prorated refund for a billing period that has already begun unless JPAC states otherwise or applicable law requires it.'
    ]},
    { heading: '4. Transfers, scholarships, and waived access', paragraphs: [
      'When appropriate, JPAC may offer a course transfer or access correction instead of a refund, subject to program availability and approval.',
      'Scholarship, waived, complimentary, or fully discounted amounts are not refundable because no corresponding amount was paid. For a partially discounted enrollment, only the amount actually paid is eligible for refund review.'
    ]},
    { heading: '5. How to request a refund', paragraphs: [
      'Send the student name, course or program, purchase date, payment reference if available, and reason for the request to admissions@jmonespac.org. JPAC may request additional information necessary to verify the transaction.',
      'Approved refunds are returned to the original payment method when practical. JPAC aims to initiate approved refunds within 5–10 business days, but a bank or payment processor may require additional time to post the credit.'
    ]},
    { heading: '6. Access after refund', paragraphs: [
      'When a paid enrollment is fully refunded, related paid course access may be ended unless JPAC separately approves continued access through a scholarship, waiver, transfer, or other written arrangement.'
    ]}
  ]},

  { slug: 'media-release', title: 'Media Release Policy', summary: 'Explains internal educational media use and separate optional permission for public or promotional use.', sections: [
    { heading: '1. Internal educational use', paragraphs: [
      'Performing-arts and creative-technology courses may require students to record, upload, perform, photograph, or otherwise submit creative work. Internal educational permission allows JPAC to receive, store, play, review, annotate, and share student media with authorized instructors, staff, the student, and the student’s authorized parent or guardian as reasonably necessary for assignments, assessment, feedback, portfolio development, safety review, and showcase preparation.',
      'When media is necessary to complete a selected course, internal educational use may be required for participation in that specific activity.'
    ]},
    { heading: '2. Optional promotional permission', paragraphs: [
      'Promotional permission is separate from internal educational use and is optional. If granted, JPAC may use approved photographs, video, audio, performances, artwork, creative projects, approved names, likeness, voice, and testimonials in JPAC websites, social media, flyers, advertising, fundraising materials, showcases, presentations, and other promotional communications.',
      'Declining optional promotional permission does not prevent a student from taking courses or receiving ordinary instructional services.'
    ]},
    { heading: '3. Editing and production', paragraphs: [
      'JPAC may crop, caption, edit, combine, format, or adapt approved promotional media for production quality, length, accessibility, and platform requirements, provided the use is not intentionally misleading or defamatory. Material AI alteration of a student’s likeness for promotional use should receive specific project permission before publication.'
    ]},
    { heading: '4. Ownership, compensation, and withdrawal', paragraphs: [
      'Unless JPAC and the student or family agree otherwise in writing, promotional permission does not create a right to payment or royalties. Students retain ownership of their original creative work subject to the permissions granted for approved uses.',
      'For a minor, a parent or legal guardian must grant required permission. A student or authorized parent/guardian may withdraw future promotional permission by contacting admissions@jmonespac.org. Withdrawal applies prospectively and may not require recall of materials already lawfully printed, distributed, or incorporated into completed productions where removal is impractical or not legally required.'
    ]}
  ]},

  { slug: 'ai-policy', title: 'AI Policy', summary: 'Rules for safe, transparent, human-supervised AI-supported learning and creative work at JPAC Academy.', sections: [
    { heading: '1. Purpose of AI at JPAC', paragraphs: [
      'JPAC may use artificial intelligence to support tutoring, brainstorming, lesson assistance, creative ideation, practice feedback, accessibility, content organization, administrative support, and other educational functions. AI is a support tool and does not replace instructors, parents, professional judgment, or student creativity.'
    ]},
    { heading: '2. Human oversight', paragraphs: [
      'AI output may be incomplete, inaccurate, biased, or inappropriate. Students should verify important information and ask a teacher or trusted adult when uncertain. JPAC does not rely solely on generative AI to make high-impact decisions about admission, discipline, final grades, safety determinations, scholarships, or student eligibility without meaningful human review.'
    ]},
    { heading: '3. Student rules for AI use', bullets: [
      'Follow instructor directions about when AI assistance is allowed and when work must be completed independently.',
      'Do not present AI-generated material as entirely your own when a course requires disclosure or attribution.',
      'Do not use AI for harassment, harmful impersonation, deception, cheating, or unsafe activity.',
      'Do not enter passwords, financial account data, government identifiers, or unrelated highly sensitive personal information into AI tools.',
      'Respect copyright, privacy, publicity, and other rights when using AI-generated or AI-assisted media.'
    ]},
    { heading: '4. Student data and AI providers', paragraphs: [
      'JPAC seeks to minimize personal information sent to AI providers and to use approved providers and configurations appropriate for the educational purpose. AI providers may process information as service providers when necessary to return a requested feature. JPAC does not sell student personal information for AI advertising.',
      'For children under 13, AI-supported features that collect personal information are subject to the Children’s Privacy / COPPA Notice and required parental consent.'
    ]},
    { heading: '5. AI feedback and assessment', paragraphs: [
      'AI may help organize practice suggestions or preliminary feedback, but verified instructor assessment controls official approval, revision requests, and mastery decisions when a course requires instructor review.'
    ]},
    { heading: '6. Synthetic media and enforcement', paragraphs: [
      'Students may not create or share deceptive synthetic media that falsely depicts a real person in a harmful, fraudulent, or misleading context. Promotional AI alteration of a student’s likeness is governed by the Media Release Policy.',
      'JPAC may restrict AI features, remove content, require resubmission, contact a parent or guardian, or take other reasonable action when AI use violates Academy policy or creates a safety concern. Questions may be sent to admissions@jmonespac.org.'
    ]}
  ]}
];

export const policyBySlug = new Map(legalPolicies.map((policy) => [policy.slug, policy]));
