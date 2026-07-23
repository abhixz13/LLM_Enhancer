export const meta = {
  name: 'main-loop',
  description: 'Master loop: super-agent-principal drives Recon⇄Attack; crazy-pipeline in parallel; super-agent-global correlates',
  phases: [
    { title: 'Recon', detail: 'main recon workflow' },
    { title: 'Attaque', detail: 'main attack workflow (post-persistence)' },
    { title: 'Créatif', detail: 'crazy agents pool in parallel' },
    { title: 'Corrélation', detail: 'super-agent-global crosses creative ⇄ main' },
    { title: 'Pilotage', detail: 'super-agent-principal: continue / stop / pivot' },
  ],
}

// args = { rules, target, reconTools, attackTools, mode, baseFou, learning }
// reconTools/attackTools come from scope-analyst (allowed_tools.recon / allowed_tools.attack),
// passed through pentest-intake. mode/baseFou/learning come from the pentest-intake questionnaire.
// Robustness: a complex args object sometimes arrives as a JSON STRING; normalize it once so
// every downstream read (A.X) works whether args is a proper object or a serialized string.
const A = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch { return {} } })() : (args ?? {})
const rules = A.rules ?? '(rules.yaml missing)'
const target = A.target ?? '(target missing)'
const mode = A.mode ?? 'normal'          // peu | normal | beaucoup (default)
const baseFou = A.baseFou ?? 3
const learningOn = A.learning ?? true
// Tool selection is driven by the scope-analyst (allowed_tools). Fall back to a tiny safe
// default only when nothing was passed, so the loop stays runnable but never invents scope.
const reconTools = A.reconTools ?? ['crt_sh']
const attackTools = A.attackTools ?? []

// 1) MAIN RECON — tools come straight from the allowed recon set.
phase('Recon')
const recon = await workflow('recon-pipeline', { rules, target, tools: reconTools })

// 2) The super-agent-principal decides the attacks from the big recon conclusion
phase('Attaque')
const attackPlan = await agent(
  `You are the Super-Agent Principal. From this big recon conclusion, decide the attack ` +
  `leads and the useful tools (inclusive policy). Stay within rules.yaml.\n` +
  `${JSON.stringify(recon?.bigConclusion)}\n--- RULES ---\n${rules}`,
  { label: 'principal:plan', phase: 'Attaque', agentType: 'super-agent-principal' }
)

// 3) MAIN ATTACK (already contains the persistence-controller; retry depth = mode)
//    Tools come from the allowed attack set (the principal plan refines which of them to use).
const attack = await workflow('attack-pipeline', { rules, target, mode, tools: attackTools })

// 4) CREATIVE in parallel — FIREWALL: the crazy agents must NEVER receive any interpretation,
//    verdict, entry_points or feasibility judgement from the main recon. They see ONLY the
//    factual raw_surface (hosts, endpoints, auth_model, id_formats, tech) so their creativity
//    stays free of the main pipeline's defeatist bias.
//    Crazy pool size derived from the budget mode (peu / normal / beaucoup).
phase('Créatif')
const rawSurface = recon?.bigConclusion?.raw_surface ?? recon?.bigConclusion
const crazy = await workflow('crazy-pipeline', { rules, rawSurface, mode, baseFou })

// 5) CORRELATION — the super-agent-global crosses the two worlds (never the main agent itself)
phase('Corrélation')
const correlation = await agent(
  `You are the Super-Agent Global. Cross the state of the MAIN attack and the raw CREATIVE ` +
  `conclusion. Redistribute only the relevant correlations (your filter kicks in AFTER generation).\n` +
  `--- MAIN ---\n${JSON.stringify(attack?.findings)}\n--- CREATIVE ---\n${JSON.stringify(crazy?.creativeConclusion)}`,
  { label: 'global:corr', phase: 'Corrélation', agentType: 'super-agent-global' }
)

// 6) STEERING — the main agent decides continue / stop / pivot (a legitimate stop only
//    after validation of the negatives by the persistence-controller)
phase('Pilotage')
const decision = await agent(
  `Super-Agent Principal: given the findings (post-persistence) and the Global's correlations, ` +
  `decide continue / stop / pivot. Never conclude "closed" on an unverified negative.\n` +
  `--- FINDINGS ---\n${JSON.stringify(attack?.findings)}\n--- CORRELATIONS ---\n${JSON.stringify(correlation)}`,
  { label: 'principal:decision', phase: 'Pilotage', agentType: 'super-agent-principal' }
)

// 7) LEARNING (tier 2) — the skill-writer reformats the inbox of raw discoveries into clean,
//    reusable skills. Writes ONLY in skills/learned/ (run immutability).
let learned = null
if (learningOn) {
  phase('Apprentissage')
  learned = await agent(
    `You are the skill-writer. Go back over the inbox skills/learned/_inbox/: reformat each ` +
    `raw discovery captured during this campaign into a clean, reusable SKILL.md in ` +
    `skills/learned/<slug>/. Deduplicate against the existing bank. NEVER write anywhere ` +
    `other than under learned/. Then empty the processed inbox.\n--- RULES ---\n${rules}`,
    { label: 'skill-writer', phase: 'Apprentissage', agentType: 'skill-writer' }
  )
}

// 8) REPORT — ALWAYS assemble a report object summarizing the whole campaign, even when there
//    are zero confirmed findings. The orchestrator turns this `report` into a written report via
//    the report-writing skill ALWAYS, even on zero findings (a clean "no confirmed vuln, here is
//    the coverage" report is itself a deliverable). Never skip reporting on an empty result set.
const confirmedFindings = (attack?.findings ?? []).filter((f) => f && f.verdict === 'confirmed')
const report = {
  target,
  mode,
  reconCoverage: {
    toolsRequested: reconTools,
    toolCount: recon?.toolCount ?? 0,
    poolCount: recon?.poolCount ?? 0,
    bigConclusionPresent: Boolean(recon?.bigConclusion),
  },
  attackAttempts: {
    toolsRequested: attackTools,
    attempts: attack?.attempts ?? 0,
    verdictCount: (attack?.findings ?? []).length,
    confirmedCount: confirmedFindings.length,
    plan: attackPlan,
  },
  crazyConclusion: crazy?.creativeConclusion ?? null,
  correlation,
  decision,
  confirmedFindings,           // may be empty — the report is produced regardless
  hasConfirmedFindings: confirmedFindings.length > 0,
}

return { recon, attack, crazy, correlation, decision, learned, report }
