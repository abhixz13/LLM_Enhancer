# TOOLS_CATALOG — universal tool menu

**Universal** catalog of recon/attack/cross-cutting tools. It is the *menu* from which the
`scope-analyst` picks to build the `tools.allowed` of a `rules.yaml`. **No tool is
"forbidden" in itself** — it is `rules.yaml` (hence the program's scope) that judges the authorization.

Each tool carries **authorization metadata** so the scope-analyst can filter:

- `class`: `recon` | `attack` | `transversal`
- `aggressiveness`: `passive` | `active-light` | `active-heavy` — many programs
  forbid `active-heavy` (mass scanners, fuzzing).
- `volume`: `low` | `medium` | `high` — a `high` profile often violates a "single-digit" cap.
- `notes`: usage constraints.

> ⚠️ An `active-heavy` / `volume: high` tool (sqlmap, mass ffuf, nuclei, gobuster…) is
> frequently **out of a program's rules**. The scope-analyst only adds it to `allowed` if the
> program explicitly authorizes it (the `scope-analyst` decides per program — see `rules/SCHEMA.md`).

## Recon

| id | tool | class | aggressiveness | volume | notes |
|---|---|---|---|---|---|
| `crt_sh` | crt.sh (CT logs) | recon | passive | low | Certificate Transparency, 100% passive |
| `subfinder` | subfinder | recon | active-light | medium | passive+DNS subdomain enumeration |
| `amass` | amass | recon | active-light | medium | can scale up in volume (active mode) |
| `httpx` | httpx | recon | active-light | medium | HTTP probe, respect rate-limit |
| `naabu` | naabu | recon | active-heavy | high | port scan — often out of scope |
| `katana` | katana | recon | active-light | medium | crawler |
| `nmap` | nmap | recon | active-heavy | high | active scan — forbidden on internal |
| `waybackurls` | waybackurls | recon | passive | low | historical URLs (archive) |
| `gau` | gau / gauplus | recon | passive | low | aggregates Wayback+CommonCrawl+OTX |
| `httprobe` | httprobe | recon | active-light | medium | mass live-host verification |
| `oneforall` | OneForAll | recon | active-light | medium | multi-source subdomain enumeration |
| `scilla` | Scilla | recon | active-light | medium | DNS/subdomain/port/directory enumeration |
| `cariddi` | Cariddi | recon | active-light | medium | endpoint crawl + secret detection |
| `meg` | meg | recon | active-light | medium | mass fetch of paths across N hosts |
| `haylxon` | haylxon | recon | active-light | medium | mass screenshots (visual recon) |
| `shodan` | Shodan | recon | passive | low | exposed services, origin IP behind CDN |
| `censys` | Censys | recon | passive | low | recon of exposed IPs/services |
| `dorkagent` | DorkAgent | recon | passive | low | automated Google dorking + LLM triage |
| `js-recon` | JS Recon (ext) | recon | passive | low | scan HTML/JS for secrets/tokens |

## Attack

| id | tool | class | aggressiveness | volume | notes |
|---|---|---|---|---|---|
| `burp` | Burp Suite | attack | active-light | low | interception proxy, manual testing |
| `nuclei` | nuclei | attack | active-heavy | high | template scanner — often out of scope |
| `sqlmap` | sqlmap | attack | active-heavy | high | automated SQL injection — often forbidden |
| `ffuf` | ffuf | attack | active-heavy | high | fuzzing — `constraints` mandatory if authorized |
| `gobuster` | gobuster | attack | active-heavy | high | directory enumeration — often forbidden |
| `dalfox` | dalfox | attack | active-light | medium | XSS |
| `jwt_tool` | jwt_tool | attack | passive | low | JWT analysis — on one's own tokens |
| `interactsh` | Interactsh / Burp Collaborator | attack | active-light | low | OOB detection (blind SSRF/RCE via DNS/HTTP callbacks) |
| `gxss` | Gxss | attack | active-light | medium | param reflection testing (XSS candidates) |
| `bucketloot` | BucketLoot | attack | active-light | medium | scan S3/GCS/DO buckets + secret extraction |
| `nessus` | Nessus | attack | active-heavy | high | general-purpose vuln scanner — often out of scope |

## Transversal

| id | tool | class | aggressiveness | volume | notes |
|---|---|---|---|---|---|
| `mitmproxy` | mitmproxy | transversal | passive | low | interception / replay |
| `browser-mcp` | driven browser (MCP) | transversal | active-light | low | behind Burp, real signed client |
| `frida` | Frida | transversal | active-light | low | native hook / re-signing (own device) |
| `objection` | objection | transversal | active-light | low | cert-pinning bypass (own device) |
| `caido` | Caido | transversal | active-light | medium | web proxy (Burp alt) |
| `zap` | OWASP ZAP | transversal | active-light | medium | web proxy/scanner (Burp alt) |
| `gf` | gf (gf-patterns) | transversal | passive | low | grep filtering of patterns (SSRF/XSS/…) on URLs |
| `qsreplace` | qsreplace | transversal | passive | low | substitution of query-string values |
| `ip-rotator` | requests-ip-rotator | transversal | active-light | medium | IP rotation (AWS API GW), rate-limit bypass |
| `ghidra` | Ghidra / Gore | transversal | passive | low | reverse engineering (binaries, Go support) |

## How a tool-agent runs a tool

A `tool-agent` does not merely *say* "run the tool" — it **actually executes** it with a
concrete method, chosen from the tool's nature. In every case it honors the `rules.yaml`
`constraints` (mode, `max_requests`) and `limits` (volume caps), and it **never fabricates
results**: if it cannot run, it returns `status: blocked`/`unavailable` with a note.

Method by tool category (`run` hint):

| category | example tools | run method |
|---|---|---|
| Installed CLI | `subfinder`, `httpx`, `nuclei`, `naabu`, `katana`, `amass`, `ffuf`, `sqlmap`, `dalfox`, `nmap`, `gau`, `gobuster` | Invoke via **Bash** with the tool's standard command-line. Apply rate/volume flags to respect `constraints.mode`, `constraints.max_requests` and `limits.volume` (e.g. bounded concurrency, capped request count). Capture stdout/stderr as the raw output. |
| Passive web / OSINT source | `crt_sh`, `waybackurls`, `gau`, `shodan`, `censys`, `dorkagent`, `js-recon` | Query the source through the **available fetch method** (an HTTP request to the source's own API/endpoint, or the source's read-only CLI). Traffic goes to the third-party source only — **never to the target's own hosts**. |
| Browser / proxy | `burp`, `browser-mcp`, `caido`, `zap`, `mitmproxy` | Drive it through the **available MCP/browser tool** (e.g. the driven-browser MCP, or the proxy's own control interface). Interact as a real signed client behind the proxy. |
| Not available in this environment | (any of the above when the binary is missing, no network, or the MCP/proxy is offline) | Do **not** simulate. Return `status: blocked`/`unavailable` with a note stating why (binary not installed, network unreachable, MCP not connected, or a `stop_condition` was hit). |

**Pre-flight (every category):** first check the tool is in `tools.allowed`; if absent →
`status: blocked`, run nothing. Then confirm the run method is actually available (binary on
PATH, network reachable, MCP connected). Only then execute, within limits, and return the real
captured output.

## Extending the catalog

Add a row with the `class` / `aggressiveness` / `volume` / `notes` metadata. Do NOT
mark a tool as "forbidden" here — authorization is decided by `rules.yaml`, per program.
