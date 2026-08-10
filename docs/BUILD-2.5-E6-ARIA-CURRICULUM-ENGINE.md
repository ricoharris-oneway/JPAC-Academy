# Build 2.5 Phase E6 — ARIA Curriculum Intelligence Engine

## Reused architecture

E6 extends the E5 source, request, and proposal tables. It does not replace canonical courses, levels, modules, lessons, activities, or the specialized `curriculum_module_revisions` Module 2 workflow.

## Knowledge ingestion

Administrators upload PDF, DOCX, TXT, or Markdown through the private ARIA Knowledge Library. The server validates type and size, computes SHA-256, rejects exact duplicates, stores the unchanged original in the private `curriculum-sources` bucket, extracts plain text, normalizes whitespace, creates bounded sections, stores section hashes/provenance, and marks the source ready. A source must then be explicitly approved before retrieval.

PDF image scans are rejected when they contain insufficient extractable text. OCR and Google Drive ingestion remain future integrations; no Drive access is fabricated.

## Retrieval and source authority

The server retrieves at most eight approved and ready sections for a proposal. It applies course and level scope, uses the existing PostgreSQL `search_vector` for full-text prefiltering, and then ranks the bounded candidates using headings, topics, keywords, curriculum terminology, administrator goals, content matches, and scope specificity. Each excerpt is capped at 1,800 characters before provider submission. No student submission, media, grade, private evidence content, storage path, or private file URL is loaded.

Every retrieved section retains source and section UUIDs, source title/version, section heading/key, classification, relevance details, and its bounded excerpt. Provider citations are allow-listed against those exact section UUIDs and enriched from server-owned provenance rather than trusting provider-supplied source labels.

Authority remains: published curriculum/evidence protections, approved JPAC curriculum, approved ARIA/teaching standards, approved rubric/practice/performance standards, staged curriculum, administrator instruction, then AI suggestion. Provider citations are filtered against section IDs actually included in context. Unsupported recommendations are labeled `AI RECOMMENDATION — NO DIRECT JPAC SOURCE`.

## Providers

Set `CURRICULUM_AI_PROVIDER=openai` with `OPENAI_API_KEY` and optional `OPENAI_CURRICULUM_MODEL`, or `CURRICULUM_AI_PROVIDER=gemini` with `GEMINI_API_KEY` and optional `GEMINI_CURRICULUM_MODEL`. All calls execute in server functions with a bounded context and timeout. With no valid configuration, ARIA falls back to the explicitly labeled `jpac-safe-development-mock · grounded-rules-v3`; the UI states that no LLM generated the proposal.

Structured proposals use `KEEP`, `IMPROVE`, `ADD`, or `REPLACE_IN_FUTURE_VERSION`. Lesson proposals may include title, learning objective, instructional content, practice, ARIA evidence targets, JPAC Lab integration, career connection, rationale, field-level changes, conflicts, confidence, and section-level source support. Each source citation names the recommendation fields it supports and provides an administrator-expandable excerpt.

## Proposal and version safety

Every generation creates a `curriculum_change_requests` row and `curriculum_proposals` row. Verified source citations are recorded in `curriculum_proposal_sources`. Full Course Rebuild creates a `draft` `curriculum_versions` record and review-only `curriculum_version_items`.

No E6 API updates canonical curriculum. There is no publication RPC, trigger, or browser service key. Version review stops at draft in the current UI. Approval, staging, and controlled publication require a separately reviewed future workflow.

## Manual deployment

1. Review and apply `202608090009_phase_e6_aria_curriculum_engine.sql`.
2. Run `202608090009_phase_e6_aria_curriculum_engine_validation.sql`.
3. Confirm the bucket is private, E6 tables have RLS, anonymous privileges are absent, and historical counts are unchanged.
4. Deploy preview server functions with no provider key to validate mock fallback first.
5. Add one approved provider configuration only in server environment variables.
6. Upload a small trusted test source, inspect extracted sections in Supabase, approve it, and verify the next proposal cites it.

The rollback refuses to remove E6 structures after any durable source, file, citation, or version record exists.
