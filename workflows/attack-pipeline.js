export const meta = {
  name: 'attack-pipeline',
  description: 'Attack phase: N tool-agents → orchestrators (1/5) → master-attack → persistence-controller (retry as many times as needed — bounded by exhaustion + budget)',
  phases: [
    { title: 'Tool-agents', detail: 'N attack tool-agents in parallel' },
    { title: 'Orchestrateurs', detail: 'ceil(N/5) small conclusions' },
    { title: 'Master', detail: 'big attack conclusion' },
    { title: 'Persistance', detail: 'anti-false-negative, retry with a new angle until exhausted/budget' },
  ],
}

// args = { rules, target, tools, mode }  — leads decided by the super-agent-principal
// Robustness: a complex args object sometimes arrives as a JSON STRING; normalize it once.
const A = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch { return {} } })() : (args ?? {})
const rules = A.rules ?? '(rules.yaml missing)'
const target = A.target ?? '(target missing)'
const tools = A.tools ?? []

// Retry depth. Bug bounty wants DEEP retry — the breakthroughs come from many think-differently
// rounds, so normal/beaucoup are UNBOUNDED (bounded instead by real exhaustion + budget + a safety
// backstop). 'peu' keeps a small finite cap for token-conscious runs.
function maxRetryFor(mode) { return mode === 'peu' ? 3 : Infinity }
const mode = A.mode ?? 'normal'
const MAX_RETRY = maxRetryFor(mode)
const HARD_CAP = 50            // anti-runaway backstop only — NOT the intended limit
const BUDGET_FLOOR = 40_000    // stop retrying if exploratory tokens run low

function chunk5(arr) { const o = []; for (let i = 0; i < arr.length; i += 5) o.push(arr.slice(i, i + 5)); return o }

const ATTACK_MASTER = { type: 'object', properties: {
  findings: { type: 'array', items: { type: 'object', properties: {
    lead: { type: 'string' },
    verdict: { type: 'string', enum: ['confirmed', 'negative', 'ambiguous'] },
    evidence: { type: 'string' }, confidence: { type: 'number' }, retry_hint: { type: 'string' },
  }, required: ['lead', 'verdict'] } },
  summary: { type: 'string' },
}, required: ['findings'] }

const CONTROLLER_OUT = { type: 'object', properties: {
  passthrough: { type: 'array', items: { type: 'object' } },
  retry: { type: 'array', items: { type: 'object', properties: {
    lead: { type: 'string' }, adjustment: { type: 'string' },
  } } },
  exhausted: { type: 'boolean' },   // true ONLY when no genuinely NEW angle is left → accept negatives
}, required: ['passthrough', 'retry'] }

// --- attack loop with persistence-controller (retry as many times as needed) -----
// Principle: a SUSPECT negative is NOT re-run identically. Each retry reinjects a genuinely
// DIFFERENT approach/angle ("think differently"). We keep going — the breakthroughs come from deep
// retry — and stop ONLY when the controller is genuinely EXHAUSTED (no new angle left), the budget
// floor is hit, or the anti-runaway HARD_CAP is reached. Never on a small fixed count.
async function runAttackRound(activeTools, roundLabel, differentApproach) {
  phase('Tool-agents')
  const thinkDiff = differentApproach
    ? `\nTHINK DIFFERENTLY — take this genuinely different angle, do NOT repeat the previous ` +
      `attempt: ${differentApproach}`
    : ''
  const toolResults = await parallel(activeTools.map((t) => () =>
    agent(`Run the attack "${t}" on ${target}. rules.yaml (authorization/limits/stop):\n${rules}${thinkDiff}`,
      { label: `atk:${t}:${roundLabel}`, phase: 'Tool-agents', agentType: 'tool-agent' })
  ))
  phase('Orchestrateurs')
  const pools = chunk5(toolResults.filter(Boolean))
  const small = await parallel(pools.map((pool, i) => () =>
    agent(`Cross-reference these attack results into a small conclusion. No self-censorship.\n${JSON.stringify(pool)}`,
      { label: `orch:${i + 1}:${roundLabel}`, phase: 'Orchestrateurs', agentType: 'squad-orchestrator' })
  ))
  phase('Master')
  return await agent(
    `Aggregate into a big attack conclusion. For each negative/ambiguous, give a retry_hint. ` +
    `'confirmed' requires proof of real effect, not a cosmetic 200.\n${JSON.stringify(small.filter(Boolean))}`,
    { label: `master-attack:${roundLabel}`, phase: 'Master', agentType: 'master-attack', schema: ATTACK_MASTER }
  )
}

let activeTools = tools
let differentApproach = ''   // reinjected each retry so the model takes a new angle, not the same test
const seenAngles = new Set() // dedup: a repeated angle means we've genuinely run out of new ones
const definitive = []
let attempt = 0

while (attempt < MAX_RETRY && attempt < HARD_CAP && activeTools.length) {
  attempt++
  const master = await runAttackRound(activeTools, `t${attempt}`, differentApproach)

  phase('Persistance')
  const capLabel = Number.isFinite(MAX_RETRY) ? `/${MAX_RETRY}` : ' (unbounded — retry until exhausted)'
  const verdict = await agent(
    `You are the persistence-controller (attempt ${attempt}${capLabel}). Judge each negative/ambiguous: ` +
    `reliable → passthrough; suspect → do NOT re-run the same test — instead produce a genuinely ` +
    `DIFFERENT approach/angle to reinject (think differently: another encoding, another primitive, a ` +
    `different chain, a different assumption), without ever exceeding rules.yaml. Keep proposing NEW ` +
    `angles for as long as you have any — do NOT stop on a count. Set exhausted:true ONLY when you ` +
    `genuinely have no new approach left; then the negative is accepted as final.\n${rules}\n` +
    JSON.stringify(master),
    { label: `persistence:t${attempt}`, phase: 'Persistance', agentType: 'persistence-controller', schema: CONTROLLER_OUT }
  )

  definitive.push(...(verdict?.passthrough ?? []))
  const retry = verdict?.retry ?? []
  if (verdict?.exhausted || !retry.length) { log(`Exhausted after ${attempt} attempt(s) — no new angle.`); break }

  const nextAngle = retry.map((r) => r.adjustment).filter(Boolean).join(' | ')
  if (!nextAngle || seenAngles.has(nextAngle)) { log(`No genuinely NEW angle at attempt ${attempt} — exhausted.`); break }
  seenAngles.add(nextAngle)
  if (budget?.total && budget.remaining() < BUDGET_FLOOR) { log(`Budget floor reached at attempt ${attempt} — stopping retries.`); break }

  // Re-run the SAME real tools (leads are not tool ids). Only the ANGLE changes, via differentApproach.
  activeTools = tools
  differentApproach = nextAngle
  log(`Attempt ${attempt}: reinjected a NEW different angle — retrying (deep retry, as needed).`)
}

log(`Attack done after ${attempt} attempt(s): ${definitive.length} definitive verdicts.`)
return { findings: definitive, attempts: attempt }
