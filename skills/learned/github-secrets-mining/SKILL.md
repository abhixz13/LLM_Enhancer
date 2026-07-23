---
name: github-secrets-mining
description: Use to search for exposed secrets (API keys, tokens, creds) in a target's public assets — GitHub repos, deleted/dangling files, misconfigured cloud buckets. High-ROI technique. To be strictly scoped within the authorized scope.
---

# github-secrets-mining — secrets in public assets

Acts only on **public assets of the in-scope target**. A found secret ≠ the right to use it:
document and report, never access real data with it (stop-condition).

## Sources to cover
- **Public GitHub repos** of the target organization (and forks/employees if in-scope).
- **Deleted files / dangling blobs**: git history often keeps removed secrets.
  Unpack `.pack` files, restore unreferenced blobs.
- **Misconfigured cloud buckets**: S3 / GCS / DO Spaces → `BucketLoot` extracts assets + secrets
  by regex.
- **Front-end JS**: `JS Recon` / manual bundle analysis for hardcoded tokens/keys.

## Method
1. Map the in-scope public assets (GitHub orgs, subdomains, buckets).
2. Scan the full history (not just HEAD): removed secrets = often still valid.
3. Triage the hits (live vs expired keys) **without using them on real data**.
4. Prove the impact minimally and admissibly, then report.

## Guardrails
- `rules.yaml` first: stay in-scope, respect the volume, do not enumerate internal
  resources.
- **Stop-condition**: if a key grants access to a third party's real data → STOP + report, do not
  explore.
