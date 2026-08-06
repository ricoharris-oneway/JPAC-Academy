import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = [
  '202608060001_block_a1_wix_identity_sync.sql',
  '202608060002_block_a2_assignment_bridge.sql',
  '202608060003_block_a2_completion.sql',
  '202608060004_block_a3_approval_automation.sql',
  '202608060005_block_a3_teacher_review_compatibility.sql',
  '202608060006_block_a4_completion_reliability.sql',
  '202608060007_block_a5_progress_xp_engine.sql',
  '202608060008_block_a5_progress_payload_guard.sql',
  '202608060009_block_a6_certificate_graduation.sql',
  '202608060010_notification_routing.sql',
  '202608060011_block_a7_completion_validation.sql',
  '202608060012_block_a8_operations_monitoring.sql'
];

const header = `-- ============================================================================\n-- JPAC ACADEMY — MASTER BLOCK A SQL INSTALLER\n-- Generated from the canonical migrations listed below.\n-- Run once in Supabase Dashboard > SQL Editor > New query.\n-- Safe to rerun: migrations use IF NOT EXISTS, CREATE OR REPLACE, and UPSERTs.\n-- Generated: ${new Date().toISOString()}\n-- ============================================================================\n\n`;

const sections = [];
for (const name of migrations) {
  const path = resolve(root, 'supabase', 'migrations', name);
  const sql = await readFile(path, 'utf8');
  sections.push(`\n-- ============================================================================\n-- BEGIN ${name}\n-- ============================================================================\n\n${sql.trim()}\n\n-- ============================================================================\n-- END ${name}\n-- ============================================================================\n`);
}

const footer = `\n-- ============================================================================\n-- INSTALLATION VERIFICATION\n-- ============================================================================\n\nselect * from public.jpac_block_a_readiness_report();\n`;

const output = resolve(root, 'supabase', 'BLOCK_A_MASTER_INSTALLER.sql');
await writeFile(output, header + sections.join('\n') + footer, 'utf8');
console.log(`Generated ${output} from ${migrations.length} migrations.`);
