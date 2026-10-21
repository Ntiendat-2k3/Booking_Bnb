#!/usr/bin/env node
/*
 * trace-check.mjs — Workflow Pre-code v4. Zero-dependency, Node >= 18. `git` cần cho scope/baseline.
 *
 *   node trace-check.mjs init-ui <name>                 tạo doc/<name>/ui/task-ui.md
 *   node trace-check.mjs init <name>                    thêm scaffold SRS/API vào doc/<name>/ (giữ ui/)
 *   node trace-check.mjs new-task <featureDir> <NN>     thêm execution/task-<NN>/
 *   node trace-check.mjs check <featureDir> [--gate1] [--phase=PH-01.1]
 *   node trace-check.mjs sync <featureDir>              sinh _index-*.md + khối AUTO trong progress.md
 *   node trace-check.mjs scope <featureDir> <PH-ID> [--base=HEAD]
 *   node trace-check.mjs baseline <featureDir> <gate1-tag>
 *
 * Exit code: 0 = OK, 1 = có ERROR.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW = path.resolve(HERE, '..');
const DOC_ROOT = path.resolve(WORKFLOW, '..');
const TEMPLATES = path.join(WORKFLOW, '2-srs-api', 'templates', 'feature');
const UI_TEMPLATE = path.join(WORKFLOW, '1-figma', 'task-ui.md');

const RE = {
  REQ: /REQ-[A-Z0-9]+-\d+/g,
  BR: /\bBR-\d+/g,
  RISK: /RISK-\d+/g,
  API: /API-\d+/g,
  TASK: /TASK-\d+/g,
};
const TC_RE = /^TC-(\d+)\.(\d+)-(\d+)$/;
const TYPES = ['Positive', 'Negative', 'Boundary', 'Integration', 'Regression'];
const TC_STATUS = ['UNTESTED', 'PASS', 'FAIL', 'BLOCKED'];

/* ---------- helpers ---------- */
const read = (p) => fs.readFileSync(p, 'utf8');
const has = (p) => fs.existsSync(p);
const uniq = (a) => [...new Set(a)];
const ids = (s, re) => uniq((s || '').match(re) || []);
const idsTrace = (s) => [...ids(s, RE.REQ), ...ids(s, RE.RISK)];
const pad = (n) => String(n).padStart(2, '0');
const nat = (id) => {
  const m = id.match(/(\d+)\.(\d+)/);
  return Number(m[1]) * 1000 + Number(m[2]);
};
const die = (m) => {
  console.error(`ERROR ${m}`);
  process.exit(1);
};
const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const splitRow = (l) =>
  l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** Bảng markdown đứng ngay sau marker `<!-- table:NAME -->` → mảng object theo header. */
function table(md, name) {
  if (md == null) return null;
  const L = md.split(/\r?\n/);
  const i = L.findIndex((l) => l.trim() === `<!-- table:${name} -->`);
  if (i < 0) return null;
  let j = i + 1;
  while (j < L.length && !L[j].trim().startsWith('|')) j++;
  const rows = [];
  for (; j < L.length && L[j].trim().startsWith('|'); j++) rows.push(splitRow(L[j]));
  if (rows.length < 2) return [];
  const H = rows[0];
  return rows
    .slice(2)
    .map((r) => Object.fromEntries(H.map((h, k) => [h, r[k] ?? ''])))
    .filter((o) => Object.values(o).some((v) => v && v !== '-'));
}

/** `- **Key:** value` → value (dòng đầu tiên khớp trong block). */
function kvLine(block, key) {
  const m = block.match(new RegExp('^-\\s+\\*\\*' + key + ':\\*\\*[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim() : null;
}

function targetFiles(block) {
  const out = [];
  let on = false;
  for (const l of block.split(/\r?\n/)) {
    if (/^-\s+\*\*Target Files:\*\*/.test(l)) {
      on = true;
      continue;
    }
    if (!on) continue;
    const m = l.match(/^\s+-\s+`([^`]+)`/);
    if (m) out.push(m[1]);
    else if (l.trim() && !/^\s/.test(l)) break;
  }
  return out;
}

function parsePhases(md, taskId) {
  const marks = [...md.matchAll(/^###\s+(PH-\d+\.\d+)\s*[—-]\s*(.*)$/gm)];
  return marks.map((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : md.length;
    const block = md.slice(m.index, end).split(/^##\s/m)[0];
    return {
      id: m[1],
      name: m[2].trim(),
      task: taskId,
      req: idsTrace(kvLine(block, 'REQ')),
      br: ids(kvLine(block, 'BR'), RE.BR),
      api: ids(kvLine(block, 'API'), RE.API),
      gate3: (kvLine(block, 'Gate3') || '').toLowerCase().split(/\s/)[0],
      targets: targetFiles(block),
      hasDod: /^-\s+\*\*DoD:\*\*/m.test(block),
    };
  });
}

/* ---------- load ---------- */
function load(dirArg) {
  const dir = path.resolve(dirArg || '.');
  const F = { dir, name: path.basename(dir), errors: [], warns: [], tasks: [] };
  const E = (c, m) => F.errors.push(`ERROR ${c} ${m}`);
  const W = (c, m) => F.warns.push(`WARN  ${c} ${m}`);
  Object.assign(F, { E, W });
  const rd = (rel) => {
    const p = path.join(dir, rel);
    if (!has(p)) {
      E('S00', `thiếu file: ${rel}`);
      return null;
    }
    return read(p);
  };
  const tb = (md, rel, name) => {
    if (md == null) return [];
    const t = table(md, name);
    if (t === null) {
      E('S01', `${rel}: thiếu marker <!-- table:${name} -->`);
      return [];
    }
    return t;
  };

  const srs = rd('srs/README.md');
  const plan = rd('plan.md');
  F.req = tb(srs, 'srs/README.md', 'req');
  F.oq = tb(srs, 'srs/README.md', 'oq');
  F.trace = tb(plan, 'plan.md', 'trace');
  F.gap = tb(plan, 'plan.md', 'gap');
  F.br = tb(plan, 'plan.md', 'br');
  F.api = tb(plan, 'plan.md', 'api');
  F.risk = tb(plan, 'plan.md', 'risk');
  F.decomp = tb(plan, 'plan.md', 'decomp');
  F.pqg = plan ? (plan.match(/\*\*PQG:\*\*\s*(\w+)/) || [])[1] || 'MISSING' : 'MISSING';
  F.checkCmd = plan ? (plan.match(/\*\*CHECK_CMD:\*\*\s*(.+)/) || [])[1] || '' : '';

  const ex = path.join(dir, 'execution');
  const dirs = has(ex)
    ? fs.readdirSync(ex).filter((n) => /^task-\d+$/.test(n)).sort()
    : [];
  if (!dirs.length) E('S02', 'execution/: chưa có task-NN');
  for (const d of dirs) {
    const num = d.slice(5);
    const tmd = rd(`execution/${d}/task.md`);
    const cmd = rd(`execution/${d}/testcase.md`);
    if (tmd == null) continue;
    const head = tmd.split(/^##\s+Phases/m)[0];
    const t = {
      dir: d,
      num,
      id: `TASK-${num}`,
      declId: (kvLine(head, 'Task ID') || '').trim(),
      name: ((tmd.match(/^#\s+TASK-\d+\s*[—-]\s*(.+)$/m) || [])[1] || '').trim(),
      req: ids(kvLine(head, 'REQ'), RE.REQ),
      depends: ids(kvLine(head, 'Depends'), RE.TASK),
      single: kvLine(head, 'Single-phase reason'),
      apis: ids((table(tmd, 'task-api') || []).map((r) => r.API).join(' '), RE.API),
      phases: parsePhases(tmd, `TASK-${num}`),
      tcs: [],
    };
    t.tcs = tb(cmd, `execution/${d}/testcase.md`, 'tc').map((c) => {
      const m = TC_RE.exec(c.TC);
      return {
        ...c,
        _ph: m ? `PH-${m[1]}.${m[2]}` : '',
        _trace: idsTrace(c.Trace),
        _br: ids(c.BR, RE.BR),
        _api: ids(c.API, RE.API),
        _st: (c.Status || '').toUpperCase(),
        task: t,
      };
    });
    F.tasks.push(t);
  }
  return F;
}

/* ---------- status (trace ngược) ---------- */
function statusOf(tcs) {
  if (!tcs.length) return 'TODO';
  const s = tcs.map((t) => t._st);
  if (s.includes('FAIL')) return 'FAIL';
  if (s.includes('BLOCKED')) return 'BLOCKED';
  if (s.every((x) => x === 'PASS')) return 'DONE';
  if (s.some((x) => x === 'PASS')) return 'IN PROGRESS';
  return 'TODO';
}
const cnt = (tcs) => `${tcs.filter((t) => t._st === 'PASS').length}/${tcs.length}`;

function computeStatus(F) {
  const all = F.tasks.flatMap((t) => t.tcs);
  const S = { req: {}, risk: {}, phase: {}, task: {} };
  for (const r of F.req) S.req[r.REQ] = statusOf(all.filter((c) => c._trace.includes(r.REQ)));
  for (const k of F.risk) S.risk[k.RISK] = statusOf(all.filter((c) => c._trace.includes(k.RISK)));
  for (const t of F.tasks) {
    for (const p of t.phases) S.phase[p.id] = statusOf(t.tcs.filter((c) => c._ph === p.id));
    const ps = t.phases.map((p) => S.phase[p.id]);
    S.task[t.id] = !ps.length
      ? 'TODO'
      : ps.every((x) => x === 'DONE')
        ? 'DONE'
        : ps.includes('FAIL')
          ? 'FAIL'
          : ps.includes('BLOCKED')
            ? 'BLOCKED'
            : ps.some((x) => x !== 'TODO')
              ? 'IN PROGRESS'
              : 'TODO';
  }
  return S;
}

/* ---------- check ---------- */
function runChecks(F, o = {}) {
  const { E, W } = F;
  const REQ = new Set(F.req.map((r) => r.REQ));
  const BR = new Map(F.br.map((b) => [b.BR, b]));
  const API = new Map(F.api.map((a) => [a.API, a]));
  const RISK = new Map(F.risk.map((r) => [r.RISK, r]));
  const TASK = new Map(F.tasks.map((t) => [t.id, t]));
  const allPh = F.tasks.flatMap((t) => t.phases);
  const PH = new Map(allPh.map((p) => [p.id, p]));
  const allTc = F.tasks.flatMap((t) => t.tcs);

  const dup = (arr, code, label) => {
    const s = new Set();
    for (const x of arr) {
      if (s.has(x)) E(code, `${label} trùng: ${x}`);
      s.add(x);
    }
  };
  dup(F.req.map((r) => r.REQ), 'D01', 'REQ');
  dup(F.br.map((r) => r.BR), 'D02', 'BR');
  dup(F.risk.map((r) => r.RISK), 'D03', 'RISK');
  dup(F.api.map((r) => r.API), 'D04', 'API');
  dup(allPh.map((p) => p.id), 'D05', 'Phase');
  dup(allTc.map((c) => c.TC), 'D06', 'TC');

  // REQ: trace forward đầy đủ (R20, R21)
  for (const r of REQ) {
    const tr = F.trace.find((x) => x.REQ === r);
    if (!tr) E('T01', `${r}: thiếu dòng trong plan table:trace`);
    else if (!tr.PlanSec || tr.PlanSec === '-' || /PENDING/i.test(tr.PlanSec))
      E('T01', `${r}: PlanSec trống/PENDING`);
    if (!F.gap.some((x) => x.REQ === r)) E('T02', `${r}: thiếu dòng trong plan table:gap`);
    if (!F.tasks.some((t) => t.req.includes(r))) E('T03', `${r}: chưa Task nào xử lý`);
    if (!allPh.some((p) => p.req.includes(r))) E('T04', `${r}: chưa Phase nào xử lý`);
    const tcs = allTc.filter((c) => c._trace.includes(r));
    if (!tcs.length) {
      E('T05', `${r}: chưa có TC`);
      continue;
    }
    if (!tcs.some((c) => ['Positive', 'Integration'].includes(c.Type)))
      E('T06', `${r}: thiếu TC Positive/Integration (R21)`);
    if (
      !tcs.some((c) => ['Negative', 'Boundary'].includes(c.Type)) &&
      (!tr || !tr.NegNA || tr.NegNA === '-')
    )
      E('T07', `${r}: thiếu TC Negative/Boundary và không có NegNA (R21)`);
  }
  for (const x of F.trace)
    if (!REQ.has(x.REQ)) E('T01', `plan table:trace: ${x.REQ} không có trong srs`);

  // BR (R22)
  for (const b of F.br) {
    if (!REQ.has(b.REQ)) E('B01', `${b.BR}: REQ không tồn tại (${b.REQ})`);
    if (!allTc.some((c) => c._br.includes(b.BR))) E('B02', `${b.BR}: chưa có TC (R22)`);
  }

  // Risk (R23)
  for (const k of F.risk) {
    if (!['HIGH', 'MED', 'LOW'].includes(k.Level)) E('K01', `${k.RISK}: Level phải HIGH|MED|LOW`);
    if (k.Level === 'HIGH' || k.Level === 'MED') {
      if (!k.Mitigation || k.Mitigation === '-') E('K02', `${k.RISK}: thiếu Mitigation`);
      if (!TASK.has(k.Owner)) E('K03', `${k.RISK}: Owner phải là TASK-xx tồn tại (đang: '${k.Owner}')`);
      if (!allTc.some((c) => c._trace.includes(k.RISK))) E('K04', `${k.RISK}: chưa có TC verify (R23)`);
    }
  }

  // API (R24, R60)
  for (const a of F.api) {
    if (!['VERIFIED', 'OPEN', 'NA'].includes(a.State)) E('A01', `${a.API}: State phải VERIFIED|OPEN|NA`);
    if (a.State !== 'NA' && !allTc.some((c) => c._api.includes(a.API))) E('A02', `${a.API}: chưa có TC (R24)`);
    if (a.State === 'OPEN') W('A03', `${a.API}: contract OPEN → chưa được code phần phụ thuộc (R60)`);
  }

  // OQ (R25) + PQG
  for (const q of F.oq) {
    if (!REQ.has(q.REQ)) E('Q01', `${q.OQ}: REQ không tồn tại (${q.REQ})`);
    if (q.Blocking === 'YES' && q.Status !== 'RESOLVED')
      (o.gate1 ? E : W)('Q02', `${q.OQ}: Blocking nhưng chưa RESOLVED (R25)`);
  }
  if (o.gate1 && F.pqg !== 'PASS') E('G01', `PQG=${F.pqg}, cần PASS trước Gate 1 (R03)`);

  // Plan §6 ↔ task-NN (R01)
  for (const d of F.decomp) {
    const t = TASK.get(d.TASK);
    if (!t) {
      E('C01', `${d.TASK}: có trong plan §6 nhưng chưa có execution/task-NN`);
      continue;
    }
    const dr = ids(d.REQ, RE.REQ).sort().join();
    if (dr !== [...t.req].sort().join())
      E('C02', `${d.TASK}: REQ lệch plan §6 (plan: ${dr || '-'} | task: ${t.req.join(',') || '-'}) (R01)`);
    if (ids(d.Depends, RE.TASK).sort().join() !== [...t.depends].sort().join())
      E('C03', `${d.TASK}: Depends lệch plan §6`);
    if (Number(d.Phases) && Number(d.Phases) !== t.phases.length)
      W('C04', `${d.TASK}: plan §6 dự kiến ${d.Phases} Phase, task có ${t.phases.length}`);
  }
  for (const t of F.tasks)
    if (!F.decomp.some((d) => d.TASK === t.id)) E('C01', `${t.id}: không có trong plan §6 (R01)`);

  // Task / Phase (R10, R11, R26)
  for (const t of F.tasks) {
    if (t.declId !== t.id) E('P01', `${t.dir}: **Task ID** phải là ${t.id} (đang: '${t.declId}')`);
    for (const r of t.req) if (!REQ.has(r)) E('P02', `${t.id}: ${r} không có trong srs`);
    if (!t.req.length) E('P02', `${t.id}: mồ côi, thiếu REQ`);
    for (const dep of t.depends) if (!TASK.has(dep)) E('P03', `${t.id}: Depends ${dep} không tồn tại`);
    const n = t.phases.length;
    if (n === 0) E('P04', `${t.id}: chưa có Phase (R10)`);
    else if (n > 5) E('P04', `${t.id}: ${n} Phase > 5 → tách Task (R10)`);
    else if (n === 1 && (!t.single || t.single === '-'))
      E('P04', `${t.id}: 1 Phase cần "Single-phase reason" (R10)`);
    const taskApi = new Set(t.apis);
    for (const a of t.apis) if (!API.has(a)) E('P08', `${t.id}: ${a} không có trong plan §5.3`);
    for (const p of t.phases) {
      if (!p.id.startsWith(`PH-${t.num}.`)) E('P13', `${p.id}: prefix phải là PH-${t.num}.`);
      if (!p.req.length) E('P05', `${p.id}: mồ côi, thiếu REQ/RISK (R26)`);
      for (const x of p.req) {
        if (x.startsWith('RISK-') ? !RISK.has(x) : !t.req.includes(x))
          E('P06', `${p.id}: ${x} không hợp lệ hoặc không thuộc ${t.id}`);
      }
      for (const b of p.br) {
        const bb = BR.get(b);
        if (!bb) E('P07', `${p.id}: ${b} không có trong plan §4`);
        else if (!p.req.includes(bb.REQ)) E('P07', `${p.id}: ${b} thuộc ${bb.REQ} nhưng Phase không xử lý REQ đó`);
      }
      for (const a of p.api) if (!taskApi.has(a)) E('P08', `${p.id}: ${a} chưa khai báo trong table:task-api của ${t.id}`);
      if (!['strict', 'auto'].includes(p.gate3)) E('P09', `${p.id}: Gate3 phải strict|auto (đang: '${p.gate3}')`);
      if (p.gate3 === 'auto' && p.req.some((x) => RISK.get(x)?.Level === 'HIGH'))
        E('P10', `${p.id}: xử lý RISK HIGH → Gate3 phải strict (R52)`);
      if (!p.targets.length) E('P11', `${p.id}: thiếu Target Files (R11)`);
      if (!p.hasDod) E('P12', `${p.id}: thiếu DoD (R11)`);
      if (!t.tcs.some((c) => c._ph === p.id)) E('T12', `${p.id}: chưa có TC (R12)`);
    }
  }

  // TC (R26–R28)
  for (const c of allTc) {
    const m = TC_RE.exec(c.TC);
    if (!m) {
      E('C10', `TC-ID sai format: '${c.TC}' (TC-<NN>.<n>-<seq>)`);
      continue;
    }
    if (m[1] !== c.task.num) E('C11', `${c.TC}: nằm trong ${c.task.id}/testcase.md nhưng ID thuộc task ${m[1]}`);
    const p = PH.get(c._ph);
    if (!p) E('C12', `${c.TC}: Phase ${c._ph} không tồn tại`);
    if (!c._trace.length) E('C13', `${c.TC}: mồ côi, Trace trống (R26)`);
    for (const x of c._trace) if (!REQ.has(x) && !RISK.has(x)) E('C13', `${c.TC}: ${x} không tồn tại`);
    for (const b of c._br) if (!BR.has(b)) E('C15', `${c.TC}: ${b} không có trong plan §4`);
    for (const a of c._api) if (!API.has(a)) E('C16', `${c.TC}: ${a} không có trong plan §5.3`);
    if (p) {
      for (const x of c._trace) if (!p.req.includes(x)) E('C14', `${c.TC}: ${x} không nằm trong REQ của ${p.id}`);
      for (const b of c._br) if (!p.br.includes(b)) E('C15', `${c.TC}: ${b} không nằm trong BR của ${p.id}`);
      for (const a of c._api) if (!p.api.includes(a)) E('C16', `${c.TC}: ${a} không nằm trong API của ${p.id}`);
    }
    if (!TYPES.includes(c.Type)) E('C17', `${c.TC}: Type '${c.Type}' không hợp lệ`);
    if (!TC_STATUS.includes(c._st)) E('C18', `${c.TC}: Status '${c.Status}' không hợp lệ`);
    if (c._st === 'PASS' && (!c.Evidence || c.Evidence === '-'))
      E('C19', `${c.TC}: PASS nhưng thiếu Evidence (R27)`);
  }

  // --phase: điều kiện được phép bắt đầu Phase
  if (o.phase) {
    const p = PH.get(o.phase);
    if (!p) E('X01', `Phase không tồn tại: ${o.phase}`);
    else {
      const t = TASK.get(p.task);
      const S = computeStatus(F);
      if (F.pqg !== 'PASS') E('X05', `PQG=${F.pqg}`);
      for (const dep of t.depends) if (S.task[dep] !== 'DONE') E('X02', `${o.phase}: ${dep} chưa DONE`);
      for (const q of t.phases)
        if (nat(q.id) < nat(p.id) && S.phase[q.id] !== 'DONE')
          E('X03', `${o.phase}: ${q.id} chưa DONE (status: ${S.phase[q.id]})`);
      for (const a of p.api) if (API.get(a)?.State === 'OPEN') E('X04', `${o.phase}: ${a} contract OPEN (R60)`);
    }
  }
}

function report(F, label) {
  for (const l of [...F.errors, ...F.warns]) console.log(l);
  console.log(
    `${F.errors.length ? 'FAIL' : 'OK'} ${label}: ${F.errors.length} error, ${F.warns.length} warn`,
  );
  return F.errors.length ? 1 : 0;
}

/* ---------- sync (sinh file, không sửa tay) ---------- */
const row = (a) => `| ${a.join(' | ')} |`;
const tbl = (head, rows) =>
  [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

function cmdSync(dirArg) {
  const F = load(dirArg);
  if (F.errors.length) process.exit(report(F, 'sync (lỗi cấu trúc)'));
  const S = computeStatus(F);
  const allTc = F.tasks.flatMap((t) => t.tcs);
  const allPh = F.tasks.flatMap((t) => t.phases);
  const HDR = `<!-- GENERATED bởi trace-check.mjs sync — KHÔNG sửa tay (R27) -->`;

  const idxTasks = [
    `# INDEX — TASKS · ${F.name}`,
    HDR,
    '',
    tbl(
      ['TASK', 'Name', 'Depends', 'Phases', 'REQ', 'Files'],
      F.tasks.map((t) => [
        t.id,
        t.name,
        t.depends.join(', ') || 'none',
        t.phases.map((p) => p.id).join(', '),
        t.req.join(', '),
        `[task](execution/${t.dir}/task.md) · [tc](execution/${t.dir}/testcase.md)`,
      ]),
    ),
    '',
  ].join('\n');

  const idxTc = [
    `# INDEX — TEST CASE & TRACE · ${F.name}`,
    HDR,
    '',
    '## Trace matrix: REQ → TASK → PHASE → TC',
    tbl(
      ['REQ', 'TASK', 'PHASE', 'TC', 'PASS/Total', 'Status'],
      F.req.map((r) => {
        const tcs = allTc.filter((c) => c._trace.includes(r.REQ));
        return [
          r.REQ,
          F.tasks.filter((t) => t.req.includes(r.REQ)).map((t) => t.id).join(', ') || '—',
          allPh.filter((p) => p.req.includes(r.REQ)).map((p) => p.id).join(', ') || '—',
          tcs.map((c) => c.TC).join(', ') || '—',
          cnt(tcs),
          S.req[r.REQ],
        ];
      }),
    ),
    '',
    '## Business Rule coverage',
    tbl(
      ['BR', 'REQ', 'TC', 'PASS/Total'],
      F.br.map((b) => {
        const tcs = allTc.filter((c) => c._br.includes(b.BR));
        return [b.BR, b.REQ, tcs.map((c) => c.TC).join(', ') || '—', cnt(tcs)];
      }),
    ),
    '',
    '## Risk coverage',
    tbl(
      ['RISK', 'Level', 'Owner', 'TC', 'PASS/Total', 'Status'],
      F.risk.map((k) => {
        const tcs = allTc.filter((c) => c._trace.includes(k.RISK));
        return [k.RISK, k.Level, k.Owner, tcs.map((c) => c.TC).join(', ') || '—', cnt(tcs), S.risk[k.RISK]];
      }),
    ),
    '',
    '## API coverage',
    tbl(
      ['API', 'Endpoint', 'State', 'TC', 'PASS/Total'],
      F.api.map((a) => {
        const tcs = allTc.filter((c) => c._api.includes(a.API));
        return [a.API, a.Endpoint, a.State, tcs.map((c) => c.TC).join(', ') || '—', cnt(tcs)];
      }),
    ),
    '',
    '## Test theo Task',
    tbl(
      ['TASK', 'Total', 'PASS', 'FAIL', 'BLOCKED', 'UNTESTED'],
      F.tasks.map((t) => {
        const n = (s) => t.tcs.filter((c) => c._st === s).length;
        return [t.id, t.tcs.length, n('PASS'), n('FAIL'), n('BLOCKED'), n('UNTESTED')];
      }),
    ),
    '',
  ].join('\n');

  const bad = allTc.filter((c) => c._st === 'FAIL' || c._st === 'BLOCKED');
  const doneReq = F.req.filter((r) => S.req[r.REQ] === 'DONE').length;
  const auto = [
    '### Task',
    tbl(
      ['TASK', 'Depends', 'Phase DONE/Total', 'TC PASS/Total', 'Status'],
      F.tasks.map((t) => [
        t.id,
        t.depends.join(', ') || 'none',
        `${t.phases.filter((p) => S.phase[p.id] === 'DONE').length}/${t.phases.length}`,
        cnt(t.tcs),
        S.task[t.id],
      ]),
    ),
    '',
    '### Phase',
    tbl(
      ['PHASE', 'Gate3', 'TC PASS/Total', 'Status'],
      allPh.map((p) => [p.id, p.gate3, cnt(allTc.filter((c) => c._ph === p.id)), S.phase[p.id]]),
    ),
    '',
    '### Tổng',
    `- REQ DONE: ${doneReq}/${F.req.length}`,
    `- TC PASS: ${cnt(allTc)}`,
    `- Risk HIGH/MED chưa DONE: ${F.risk.filter((k) => k.Level !== 'LOW' && S.risk[k.RISK] !== 'DONE').map((k) => k.RISK).join(', ') || 'none'}`,
    `- FAIL/BLOCKED: ${bad.map((c) => `${c.TC}(${c._st})`).join(', ') || 'none'}`,
  ].join('\n');

  const exDir = path.join(F.dir, 'execution');
  fs.writeFileSync(path.join(exDir, '_index-tasks.md'), idxTasks);
  fs.writeFileSync(path.join(exDir, '_index-testcase.md'), idxTc);
  const pp = path.join(exDir, 'progress.md');
  if (!has(pp)) die('thiếu execution/progress.md');
  const B = '<!-- AUTO:BEGIN -->';
  const Z = '<!-- AUTO:END -->';
  const md = read(pp);
  const i = md.indexOf(B);
  const j = md.indexOf(Z);
  if (i < 0 || j < 0) die('progress.md thiếu marker AUTO:BEGIN/AUTO:END');
  fs.writeFileSync(pp, md.slice(0, i + B.length) + '\n' + auto + '\n' + md.slice(j));
  console.log('OK sync: _index-tasks.md, _index-testcase.md, progress.md (AUTO)');
}

/* ---------- scope (Gate 2) & baseline (R30) ---------- */
function cmdScope(dirArg, phId, base = 'HEAD') {
  const F = load(dirArg);
  const p = F.tasks.flatMap((t) => t.phases).find((x) => x.id === phId);
  if (!p) die(`Phase không tồn tại: ${phId}`);
  const root = git(['rev-parse', '--show-toplevel'], F.dir).trim();
  const rel = path.relative(root, F.dir).split(path.sep).join('/');
  const changed = uniq(
    [
      ...git(['diff', '--name-only', base], root).split('\n'),
      ...git(['ls-files', '--others', '--exclude-standard'], root).split('\n'),
    ].filter(Boolean),
  );
  const match = (f, t) =>
    t.endsWith('/**') ? f.startsWith(t.slice(0, -2)) : t.endsWith('/') ? f.startsWith(t) : f === t;
  const out = changed.filter((f) => !f.startsWith(rel + '/') && !p.targets.some((t) => match(f, t)));
  if (out.length) {
    console.log(`FAIL scope ${phId}: ${out.length} file ngoài Target Files (R40)`);
    out.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log(`OK scope ${phId}: ${changed.length} file thay đổi, tất cả trong Target Files hoặc thư mục feature`);
}

function cmdBaseline(dirArg, tag) {
  const F = load(dirArg);
  const root = git(['rev-parse', '--show-toplevel'], F.dir).trim();
  const rel = path.relative(root, F.dir).split(path.sep).join('/');
  const specs = [`${rel}/srs`, `${rel}/plan.md`, ...F.tasks.map((t) => `${rel}/execution/${t.dir}/task.md`)];
  let changed;
  try {
    changed = uniq(
      [
        ...git(['diff', '--name-only', tag, '--', ...specs], root).split('\n'),
        ...git(['ls-files', '--others', '--exclude-standard', '--', ...specs], root).split('\n'),
      ].filter(Boolean),
    );
  } catch (e) {
    die(`git lỗi (tag '${tag}' có tồn tại?): ${String(e.stderr || e.message).trim()}`);
  }
  if (!changed.length) return console.log(`OK baseline ${tag}: srs/, plan.md, task.md không đổi`);
  const pp = path.join(F.dir, 'execution', 'progress.md');
  const approved = has(pp) ? (table(read(pp), 'cr') || []).filter((c) => c.State === 'APPROVED') : [];
  console.log(`${approved.length ? 'WARN ' : 'FAIL'} baseline ${tag}: ${changed.length} file baseline đã đổi (R30)`);
  changed.forEach((f) => console.log(`  - ${f}`));
  if (approved.length) {
    console.log(`  CR APPROVED: ${approved.map((c) => c.CR).join(', ')} → chạy check --gate1 rồi tag mới gate1/${F.name}-cr<NN>`);
    return;
  }
  process.exit(1);
}

/* ---------- scaffold ---------- */
function copyTree(src, dst, vars, rename = (n) => n) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, rename(e.name));
    if (e.isDirectory()) copyTree(s, d, vars, rename);
    else {
      let txt = read(s);
      for (const [k, v] of Object.entries(vars)) txt = txt.split(`{{${k}}}`).join(v);
      fs.writeFileSync(d, txt);
    }
  }
}

function cmdInitUi(name) {
  if (!name) die('thiếu <name>');
  const dst = /[\\/]/.test(name) ? path.resolve(name) : path.join(DOC_ROOT, name);
  const uiDir = path.join(dst, 'ui');
  const out = path.join(uiDir, 'task-ui.md');
  if (has(out)) die(`đã tồn tại: ${out}`);
  fs.mkdirSync(uiDir, { recursive: true });
  let txt = read(UI_TEMPLATE).split('{{FEATURE}}').join(path.basename(dst));
  fs.writeFileSync(out, txt);
  console.log(`OK init-ui: ${out}\nBước tiếp: chạy 1-figma/prompt-figma.md.`);
}

function cmdInit(name) {
  if (!name) die('thiếu <name>');
  const dst = /[\\/]/.test(name) ? path.resolve(name) : path.join(DOC_ROOT, name);
  if (has(dst)) {
    const existingBaseline = ['plan.md', 'srs', 'execution'].filter((x) => has(path.join(dst, x)));
    if (existingBaseline.length) die(`SRS/API scaffold đã tồn tại trong ${dst}: ${existingBaseline.join(', ')}`);
    const entries = fs.readdirSync(dst);
    if (entries.some((x) => x !== 'ui')) die(`folder đã tồn tại và có dữ liệu ngoài ui/: ${dst}`);
  }
  copyTree(TEMPLATES, dst, { FEATURE: path.basename(dst), NN: '01' }, (n) => n.replace(/^task-NN$/, 'task-01'));
  console.log(`OK init: ${dst}\nGiữ nguyên ui/ (nếu có). Bước tiếp: đặt SRS vào srs/, rồi chạy 2-srs-api/prompt-precode.md.`);
}

function cmdNewTask(dirArg, nn) {
  if (!dirArg || !nn) die('cú pháp: new-task <featureDir> <NN>');
  const n = pad(Number(nn));
  const dst = path.join(path.resolve(dirArg), 'execution', `task-${n}`);
  if (has(dst)) die(`đã tồn tại: ${dst}`);
  copyTree(path.join(TEMPLATES, 'execution', 'task-NN'), dst, { NN: n, FEATURE: path.basename(path.resolve(dirArg)) });
  console.log(`OK new-task: ${dst}`);
}

/* ---------- main ---------- */
const [, , cmd, ...rest] = process.argv;
const flags = Object.fromEntries(
  rest.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  }),
);
const args = rest.filter((a) => !a.startsWith('--'));

switch (cmd) {
  case 'init-ui':
    cmdInitUi(args[0]);
    break;
  case 'init':
    cmdInit(args[0]);
    break;
  case 'new-task':
    cmdNewTask(args[0], args[1]);
    break;
  case 'check': {
    const F = load(args[0]);
    runChecks(F, { gate1: !!flags.gate1, phase: flags.phase });
    process.exit(report(F, `check${flags.gate1 ? ' --gate1' : ''}${flags.phase ? ` --phase=${flags.phase}` : ''}`));
    break;
  }
  case 'sync':
    cmdSync(args[0]);
    break;
  case 'scope':
    cmdScope(args[0], args[1], flags.base || 'HEAD');
    break;
  case 'baseline':
    cmdBaseline(args[0], args[1]);
    break;
  default:
    console.log(read(fileURLToPath(import.meta.url)).split('*/')[0].replace(/^#!.*\n\/\*\n?/, ''));
    process.exit(cmd ? 1 : 0);
}
