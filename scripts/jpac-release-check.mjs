#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, normalize } from 'node:path';

const cwd = process.cwd();

function git(args, options = {}) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || 'Unknown Git error';
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

function gitRefExists(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function nulList(args) {
  const output = git(args.concat('-z'));
  return output ? output.split('\0').filter(Boolean) : [];
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => value.replaceAll('\\', '/'))) ].sort();
}

function section(title) {
  console.log(`\n## ${title}`);
}

function list(label, values) {
  console.log(`${label}: ${values.length}`);
  for (const value of values) console.log(`  - ${value}`);
}

function matchesAny(files, predicate) {
  return files.filter(predicate);
}

const mainRef = gitRefExists('refs/remotes/origin/main') ? 'refs/remotes/origin/main' : 'main';
const branch = git(['branch', '--show-current']) || '(detached HEAD)';
const commit = git(['rev-parse', 'HEAD']);
const mainCommit = git(['rev-parse', mainRef]);
const committedAgainstMain = nulList(['diff', '--name-only', `${mainRef}...HEAD`]);
const staged = nulList(['diff', '--cached', '--name-only']);
const unstaged = nulList(['diff', '--name-only']);
const untracked = nulList(['ls-files', '--others', '--exclude-standard']);
const releaseScope = uniqueSorted([...committedAgainstMain, ...staged, ...unstaged, ...untracked]);

const packageFiles = matchesAny(releaseScope, (file) => file === 'package.json');
const lockfiles = matchesAny(releaseScope, (file) => /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)$/i.test(file));
const workspaceFiles = matchesAny(releaseScope, (file) => /(^|\/)pnpm-workspace\.yaml$/i.test(file));
const supabaseFiles = matchesAny(releaseScope, (file) => file.startsWith('supabase/'));
const sqlFiles = matchesAny(releaseScope, (file) => extname(file).toLowerCase() === '.sql');
const databaseLifecycleFiles = matchesAny(releaseScope, (file) => /(^|\/)(migrations?|rollbacks?|validation)(\/|$)/i.test(file));
const configFiles = matchesAny(releaseScope, (file) => /(^|\/)(\.github\/|vercel\.json$|vite\.config\.|tsconfig(?:\.[^/]+)?\.json$|eslint|prettier|[^/]+\.config\.[cm]?[jt]s$)/i.test(file));
const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp3', '.wav', '.m4a', '.mp4', '.mov', '.webm', '.pdf']);
const mediaStorageFiles = matchesAny(releaseScope, (file) => mediaExtensions.has(extname(file).toLowerCase()) || /(^|\/)(media|storage|uploads?)(\/|$)|(^|\/)[^/]*(media|storage|upload)[^/]*\.[^/]+$/i.test(file));

const protectedPatterns = [
  ['xp_ledger', /\bxp_ledger\b/i],
  ['awardXP', /\bawardXP\b/i],
  ['mastery', /\bmastery\b/i],
  ['certificate', /\bcertificates?\b/i],
  ['enrollments', /\benrollments?\b/i],
  ['lesson_progress', /\blesson_progress\b/i],
  ['markLessonProgress', /\bmarkLessonProgress\b/i],
  ['jpac_sync_enrollment_progress', /\bjpac_sync_enrollment_progress\b/i],
  ['jpac_enforce_canonical_enrollment_progress', /\bjpac_enforce_canonical_enrollment_progress\b/i],
  ['submission review RPC', /\b(?:jpac|creator_tool)[a-z0-9_]*review[a-z0-9_]*submission|submission[a-z0-9_]*review[a-z0-9_]*(?:rpc|function)/i],
  ['curriculum publishing', /\bpublish(?:ed|ing)?\b.{0,50}\bcurriculum\b|\bcurriculum\b.{0,50}\bpublish(?:ed|ing)?\b/is],
  ['published status', /(?:status.{0,20}published|\.eq\(\s*['"]status['"]\s*,\s*['"]published['"])/i],
  ['service_role', /\bservice_role\b/i],
  ['createClient with service key', /createClient[\s\S]{0,240}(?:service[_ -]?role|service[_ -]?key)/i],
  ['storage upload', /(?:\.storage|storage\.)[\s\S]{0,160}\.upload\s*\(/i],
  ['media upload', /\b(?:media|audio|video|image)[_ -]?upload\b|\bupload[_ -]?(?:media|audio|video|image)\b/i],
];

const keywordFindings = [];
for (const file of releaseScope) {
  const localPath = normalize(file);
  if (!existsSync(localPath) || statSync(localPath).size > 1_000_000) continue;
  const content = readFileSync(localPath);
  if (content.includes(0)) continue;
  const text = content.toString('utf8');
  const scope = /^(docs\/|scripts\/jpac-release-check\.mjs$)/.test(file) ? 'documentation/tooling' : 'implementation';
  for (const [keyword, pattern] of protectedPatterns) {
    if (pattern.test(text)) keywordFindings.push({ file, keyword, scope });
  }
}

console.log('# JPAC Release Check');
console.log(`Generated: ${new Date().toISOString()}`);

section('Git context');
console.log(`Current branch: ${branch}`);
console.log(`Current commit: ${commit}`);
console.log(`Main reference: ${mainRef}`);
console.log(`Main commit: ${mainCommit}`);

section('File inventory');
list('Committed changes against main', committedAgainstMain);
list('Staged files', staged);
list('Unstaged tracked files', unstaged);
list('Untracked files', untracked);
list('Combined release scope', releaseScope);

section('Release boundary checks');
list('package.json changes', packageFiles);
list('Lockfile changes', lockfiles);
console.log(`pnpm-workspace.yaml present: ${existsSync('pnpm-workspace.yaml') ? 'YES' : 'NO'}`);
list('pnpm-workspace.yaml changes', workspaceFiles);
list('Supabase changes', supabaseFiles);
list('SQL changes', sqlFiles);
list('Migration/rollback/validation changes', databaseLifecycleFiles);
list('Configuration changes', configFiles);
list('Media/storage changes', mediaStorageFiles);

section('Protected academic keyword scan');
console.log(`Matches: ${keywordFindings.length}`);
for (const finding of keywordFindings) console.log(`  - [${finding.scope}] ${finding.keyword}: ${finding.file}`);
const implementationFindings = keywordFindings.filter((finding) => finding.scope === 'implementation');
console.log(`Implementation matches requiring manual review: ${implementationFindings.length}`);
console.log('Note: documentation/tooling matches are reported for transparency but do not by themselves indicate runtime changes.');

section('Suggested lane');
let lane = 'frontend-only release';
if (sqlFiles.length || databaseLifecycleFiles.length || supabaseFiles.length) lane = 'SQL/migration release';
else if (packageFiles.length || lockfiles.length || workspaceFiles.length || configFiles.length) lane = 'package/config release';
else if (releaseScope.length && releaseScope.every((file) => file.startsWith('docs/') || file.startsWith('scripts/'))) lane = 'docs-only release';
if (implementationFindings.length) lane += ' + protected academic review required';
console.log(lane);

section('Result');
console.log(releaseScope.length ? 'REVIEW REQUIRED: inspect the reported release scope and approve the applicable lane.' : 'INFO: no changed files detected.');
console.log('This command is read-only. It does not run SQL, stage files, commit, push, or modify database records.');
