export const meta = {
  name: 'recon-pipeline',
  description: 'Recon phase: N tool-agents (1 per useful tool) → orchestrators (1 per pool of 5) → master-recon',
  phases: [
    { title: 'Tool-agents', detail: 'N recon tool-agents in parallel' },
    { title: 'Orchestrateurs', detail: 'ceil(N/5) small conclusions' },
    { title: 'Master', detail: 'big recon conclusion' },
  ],
}

// --- expected args -------------------------------------------------------
// args = { rules, target, tools }  where tools = list of tool_id deemed useful.
// Inclusive policy: keep even the tools with low perceived usefulness.
// Robustness: a complex args object sometimes arrives as a JSON STRING; normalize it once.
const A = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch { return {} } })() : (args ?? {})
const rules = A.rules ?? '(rules.yaml missing)'
const target = A.target ?? '(target missing)'
const tools = A.tools ?? []   // e.g.: ['crt_sh','subfinder','httpx','katana','waybackurls', ...]

// --- helper: chunk by 5 (orchestrator fan-in ratio) -----------
function chunk5(arr) {
  const out = []
  for (let i = 0; i < arr.length; i += 5) out.push(arr.slice(i, i + 5))
  return out
}

const TOOL_RESULT = { type: 'object', properties: {
  tool: { type: 'string' }, status: { type: 'string' },
  findings: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
}, required: ['tool', 'status'] }

const SMALL_CONCLUSION = { type: 'object', properties: {
  corroborated: { type: 'array', items: { type: 'string' } },
  leads: { type: 'array', items: { type: 'string' } },
  blocked_signals: { type: 'array', items: { type: 'string' } },
  summary: { type: 'string' },
}, required: ['summary'] }

// --- guard: no tools to deploy → skip the whole pipeline gracefully -----
if (!Array.isArray(tools) || tools.length === 0) {
  log('Recon skipped: args.tools is empty — no tool to deploy, returning an empty conclusion.')
  return { bigConclusion: null, toolCount: 0, poolCount: 0 }
}

// --- phase 1: 1 tool-agent per tool (Haiku) -----------------------------
phase('Tool-agents')
const toolResults = await parallel(tools.map((t) => () =>
  agent(
    `Run the tool "${t}" on ${target}. Respect rules.yaml (authorization, limits, stop-conditions):\n${rules}`,
    { label: `tool:${t}`, phase: 'Tool-agents', agentType: 'tool-agent', schema: TOOL_RESULT }
  )
))

// --- phase 2: 1 orchestrator per pool of 5 (Sonnet) --------------------
phase('Orchestrateurs')
const pools = chunk5(toolResults.filter(Boolean))
const smallConclusions = await parallel(pools.map((pool, i) => () =>
  agent(
    `Cross-reference these ${pool.length} tool-agent results into a small recon conclusion.\n` +
    `Report any blocked_signal as-is. No relevance filter.\n` +
    JSON.stringify(pool),
    { label: `orch:${i + 1}/${pools.length}`, phase: 'Orchestrateurs', agentType: 'squad-orchestrator', schema: SMALL_CONCLUSION }
  )
))

// --- phase 3: master-recon → big conclusion (strong) -------------------
phase('Master')
const bigConclusion = await agent(
  `Aggregate these small conclusions into a big Recon conclusion (surface: hosts, endpoints, ` +
  `auth_model, id_formats, tech). Clearly mark the RAW SURFACE (reusable by the crazy ` +
  `agents) vs the interpretation.\n` + JSON.stringify(smallConclusions.filter(Boolean)),
  { label: 'master-recon', phase: 'Master', agentType: 'master-recon' }
)

log(`Recon done: ${tools.length} tools → ${pools.length} orchestrators → 1 big conclusion`)
return { bigConclusion, toolCount: tools.length, poolCount: pools.length }
