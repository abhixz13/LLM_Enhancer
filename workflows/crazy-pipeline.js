export const meta = {
  name: 'crazy-pipeline',
  description: 'Creative pool: crazy agents ideate → crazy Recon → crazy Attack, using the SAME workforce as the main recon/attack pipeline (N tool-agents → ceil(N/5) orchestrators → master → persistence with think-differently retry)',
  phases: [
    { title: 'Ideation', detail: 'crazy agents generate extreme hypotheses + propose the tools to run' },
    { title: 'Crazy Recon', detail: 'full workforce: N tool-agents → orchestrators → master-recon' },
    { title: 'Crazy Attack', detail: 'full workforce → master-attack' },
    { title: 'Persistence', detail: 'think-differently retry, up to maxRetry attempts' },
  ],
}

// FIREWALL: the crazy agents receive ONLY the raw surface + rules.yaml.
// Never the angles already tested, nor the verdicts ("exhausted"/"negative"/"closed"), nor the patched catalog.
// args = { rules, rawSurface, mode, baseFou }
// Robustness: a complex args object sometimes arrives as a JSON STRING; normalize it once.
const A = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch { return {} } })() : (args ?? {})
const rules = A.rules ?? '(rules.yaml missing)'
const rawSurface = A.rawSurface ?? '(raw surface missing)'

// --- Budget: the mode drives the crazy pool size; retry is DEEP (unbounded) except in 'peu' -----
// The breakthroughs come from deep think-differently retry + crazy ideas, so we don't cap on a count.
function foPlan(mode, base) {
  if (mode === 'peu') return { poolSize: Math.max(1, Math.floor(base / 2)), maxRetry: 3 }
  if (mode === 'beaucoup') return { poolSize: 2 * base, maxRetry: Infinity }
  return { poolSize: base, maxRetry: Infinity } // normal (default): unbounded, bounded by exhaustion+budget
}
const mode = A.mode ?? 'normal'
const baseFou = A.baseFou ?? 3
let { poolSize, maxRetry } = foPlan(mode, baseFou)
const HARD_CAP = 50            // anti-runaway backstop only
const BUDGET_FLOOR = 40_000    // stop retrying if exploratory tokens run low
if (budget?.total && budget.remaining() < 50_000) poolSize = Math.max(1, Math.floor(poolSize / 2))

function chunk5(arr) { const o = []; for (let i = 0; i < arr.length; i += 5) o.push(arr.slice(i, i + 5)); return o }

// Crazy agents must propose real work for the full workforce: the idea + which tools to run.
const HYPOTHESES = { type: 'object', properties: {
  hypotheses: { type: 'array', items: { type: 'object', properties: {
    idea: { type: 'string' }, why_novel: { type: 'string' }, how_to_test: { type: 'string' },
    recon_tools: { type: 'array', items: { type: 'string' } },
    attack_tools: { type: 'array', items: { type: 'string' } },
  }, required: ['idea', 'how_to_test'] } },
}, required: ['hypotheses'] }

// --- phase 1: ideation (independent crazy agents, no memory, genuinely creative) -------------
phase('Ideation')
const pools = await parallel(Array.from({ length: poolSize }, (_, i) => () =>
  agent(
    `You are crazy agent #${i + 1} — a fresh-eyes red-teamer whose ONLY product is genuinely ` +
    `creative, out-of-the-box, unusual attack ideas. Be bold and weird: unexpected chainings, abuse ` +
    `of legitimate features, angles the docs implicitly assume are safe. No relevance filter — an ` +
    `idea that "surely won't work" is still valuable. For each idea, also propose the recon_tools ` +
    `and attack_tools to run so a full squad can chase it. Stay strictly within the authorized scope.` +
    `\n\n--- RAW SURFACE (all you get) ---\n${rawSurface}\n\n--- RULES ---\n${rules}`,
    { label: `fou:${i + 1}`, phase: 'Ideation', agentType: 'agent-fou', schema: HYPOTHESES }
  )
))
const hypotheses = pools.filter(Boolean).flatMap((p) => p.hypotheses ?? [])
const reconTools = [...new Set(hypotheses.flatMap((h) => h.recon_tools ?? []))]
const attackTools = [...new Set(hypotheses.flatMap((h) => h.attack_tools ?? []))]
const angle = JSON.stringify(hypotheses)
log(`Budget "${mode}" → ${poolSize} crazy agents. ${hypotheses.length} hypotheses · ${reconTools.length} recon tools · ${attackTools.length} attack tools.`)

// --- shared full-workforce stage (identical formula to recon/attack-pipeline) ---------------
// N tool-agents (1 per tool, inclusive) → ceil(N/5) orchestrators → master.
async function fullWorkforce(kind, tools, masterType, extra) {
  // Empty tool list → skip this phase gracefully (crazy agents proposed nothing to run for it).
  if (!Array.isArray(tools) || tools.length === 0) {
    log(`Crazy ${kind} skipped: no tool proposed by the crazy agents for this phase.`)
    return null
  }
  phase(kind === 'recon' ? 'Crazy Recon' : 'Crazy Attack')
  const toolResults = await parallel(tools.map((t) => () =>
    agent(`Run "${t}" on the crazy angle (creative hypotheses below). Stay within rules.yaml.\n` +
      `${extra ?? ''}\n--- CRAZY ANGLE ---\n${angle}\n--- RULES ---\n${rules}`,
      { label: `crazy-${kind}:${t}`, phase: kind === 'recon' ? 'Crazy Recon' : 'Crazy Attack', agentType: 'tool-agent' })
  ))
  const small = await parallel(chunk5(toolResults.filter(Boolean)).map((pool, i) => () =>
    agent(`Cross-reference these crazy ${kind} results into a small conclusion. No self-censorship.\n${JSON.stringify(pool)}`,
      { label: `crazy-orch:${kind}:${i + 1}`, phase: kind === 'recon' ? 'Crazy Recon' : 'Crazy Attack', agentType: 'squad-orchestrator' })
  ))
  return await agent(`Aggregate these small conclusions into a big crazy ${kind} conclusion.\n${JSON.stringify(small.filter(Boolean))}`,
    { label: `crazy-master-${kind}`, phase: kind === 'recon' ? 'Crazy Recon' : 'Crazy Attack', agentType: masterType })
}

// --- phase 2: crazy Recon (full workforce) --------------------------------------------------
const crazyRecon = await fullWorkforce('recon', reconTools, 'master-recon')

// --- phase 3: crazy Attack (full workforce) + phase 4: think-differently persistence loop ----
let activeTools = attackTools
let differentApproach = ''   // reinjected each retry: "think differently"
const seenAngles = new Set()
const definitive = []
let attempt = 0
while (attempt < maxRetry && attempt < HARD_CAP && activeTools.length) {
  attempt++
  const master = await fullWorkforce('attack', activeTools, 'master-attack',
    differentApproach ? `THINK DIFFERENTLY — take this genuinely different angle, do NOT repeat the ` +
      `previous attempt: ${differentApproach}` : '')

  phase('Persistence')
  const capLabel = Number.isFinite(maxRetry) ? `/${maxRetry}` : ' (unbounded — retry until exhausted)'
  const verdict = await agent(
    `You are the persistence-controller (creative, attempt ${attempt}${capLabel}). For each suspect ` +
    `negative, do NOT re-run the same test: produce a genuinely DIFFERENT approach/angle to reinject ` +
    `(think differently). Keep proposing NEW angles for as long as you have any — do NOT stop on a ` +
    `count. Set exhausted:true ONLY when no new approach is left. Reliable negatives pass through. ` +
    `Never exceed rules.yaml.\n` +
    `--- CRAZY RECON ---\n${JSON.stringify(crazyRecon)}\n--- MASTER ---\n${JSON.stringify(master)}\n--- RULES ---\n${rules}`,
    { label: `crazy-persistence:t${attempt}`, phase: 'Persistence', agentType: 'persistence-controller' }
  )
  definitive.push(...(verdict?.passthrough ?? []))
  const retry = verdict?.retry ?? []
  if (verdict?.exhausted || !retry.length) { log(`Crazy exhausted after ${attempt} attempt(s).`); break }
  const nextAngle = retry.map((r) => r.adjustment).filter(Boolean).join(' | ')
  if (!nextAngle || seenAngles.has(nextAngle)) { log(`No new crazy angle at attempt ${attempt} — exhausted.`); break }
  seenAngles.add(nextAngle)
  if (budget?.total && budget.remaining() < BUDGET_FLOOR) { log(`Budget floor reached at crazy attempt ${attempt} — stopping.`); break }
  // Re-run the SAME attack tools (leads are not tool ids). Only the ANGLE changes.
  activeTools = attackTools
  differentApproach = nextAngle
  log(`Crazy attempt ${attempt}: reinjected a NEW different angle — retrying (deep retry, as needed).`)
}

// The raw creative conclusion THEN goes, without a relevance filter, to the super-agent-global.
const creativeConclusion = { crazyRecon, findings: definitive, attempts: attempt, hypothesesCount: hypotheses.length }
log(`Creative pool done: ${definitive.length} findings after ${attempt} attempt(s), reported raw.`)
return { creativeConclusion, hypothesesCount: hypotheses.length }
