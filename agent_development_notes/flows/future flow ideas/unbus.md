# Unfinished Business Document (unbus)

## What It Is

A per-chunk tracking file that captures all deferred work items — things that are typed, designed, or stubbed but not fully implemented. Prevents work from getting lost in the noise as the project grows across multiple chunks.

## File System Location

```
agent_user_bin/ver_mm_chunk_nn_phased_development/
  ver_{mm}_chunk_nn_phased_development/
    ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
      ver_{mm}_chunk_{nn}_unfinished_business.md    ← lives here
      ver_{mm}_chunk_{nn}_spec.md
      ver_{mm}_chunk_{nn}_phase_overview.md
      ver_{mm}_chunk_{nn}_phase_00.md
      ...
```

> `{mm}` and `{nn}` are substituted with the 2-digit version and chunk numbers (e.g., `ver_01_chunk_02_unfinished_business.md`). Bare `mm` and `nn` without braces are literal folder name tokens.

## Entry Format

Each entry in the table tracks:

| Column | Purpose |
|--------|---------|
| **Item** | What feature/work was deferred |
| **What exists** | What was built (types, stubs, design decisions) |
| **What's missing** | What still needs implementation |
| **Target chunk** | Which future chunk should finish this |

## Created During

- Identified during chunk_02 (networking-ready conversion) planning when multiple design decisions produced types/stubs with implementation deferred to later chunks (UI, functionality, networking).

## Workflow Integration Notes

Future `/create-phase-plan` workflow should include:

1. **Pre-scan step**: Before generating phases, read `ver_{mm}_chunk_{nn}_unfinished_business.md` from ALL preceding chunks (not just the current one). Any items targeting the current chunk MUST appear as phase deliverables.

2. **Post-completion step**: When a chunk completes, its unfinished_business.md should be reviewed. Items that were completed should be marked `[x]`. Items still open should be verified that they appear in a future chunk's target.

3. **Cross-chunk referencing**: Each chunk's unfinished_business.md only lists items deferred FROM that chunk. To see all open items targeting chunk_04, for example, an agent would scan unfinished_business files from chunks 01, 02, 03.

4. **Suggested workflow addition** (for `/create-phase-plan`):
```markdown
## 0. Pre-Flight: Unfinished Business Scan
- Scan all `ver_{mm}_chunk_*_unfinished_business.md` files
- Collect items where Target chunk matches the current chunk
- These items MUST be included as deliverables in the phase plan
```
