# Phased Development Workflow

Use this workflow to reliably execute technical phases while preventing architectural drift.

> **Variable convention:** Bare `mm`, `nn`, `xx` are literal label tokens. Braced `{mm}`, `{nn}`, `{xx}` are substitution slots — replace with the 2-digit index for version, chunk, and phase respectively.

---

## 1. Context & Repository Discovery

- Locate the active phased development directory:
  ```
  agent_user_bin/ver_mm_chunk_nn_phased_development/
    ver_{mm}_chunk_nn_phased_development/
      ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
  ```
- If this is a fresh session or context is low, read `ver_{mm}_chunk_{nn}_phase_overview.md` to re-align on the total project map.
- Determine the current `{mm}` (version) and `{nn}` (chunk) from conversation context or from existing directory names.

---

## 2. Identify the Active Phase

- Scan phase files in sequential order (`ver_{mm}_chunk_{nn}_phase_00.md`, `...phase_01.md`, etc.).
- The **Active Phase** is the first file that has any of the following:
  - Uncompleted deliverables (`[ ]` or `[~]`)
  - Unverified Gap or Gate checklist items
  - Failed or pending verification tests

---

## 3. Synchronize Internal Tracking

- Read the Active Phase file in full.
- Update `task.md` (the internal agent tracker) to mirror the phase's Deliverables and Gates.
- Use `task_boundary` to set the agent's project state to the active phase.

---

## 4. The Implementation Loop

### 4.0 phase completion check
- warning check - are the previous phase file check boxes marked completed, if not why? and inform the user. 

### 4.1 Pre-Flight Checks
- Review the phase's **Gap Checklist** and **Gate Checklist** before writing any code.
- If gaps indicate a breakdown in requirements or earlier foundations, resolve them first.

### 4.2 Communication
- If you need user input or clarification, use `notify_user` with a concise bulleted list of questions. Set `BlockedOnUser: true` if you cannot proceed without answers.

### 4.3 Micro-Tasking
- Break the phase's deliverables into small, atomic workloads.
- Implement one or more deliverables per cycle.
- **After each deliverable, update BOTH:**
  1. `task.md` — the agent's internal tracker
  2. The phase file (`ver_{mm}_chunk_{nn}_phase_{xx}.md`) — the **source of truth**

### 4.4 Checkbox Protocol (CRITICAL)

The phase file's checkboxes are the **canonical record** of progress. Both the user and the agent rely on them to know what's done, what's in progress, and what's left.

**Rules:**
1. **Update checkboxes in the phase file IMMEDIATELY after completing each deliverable or sub-task.** Do not defer checkbox updates to the end of a session or batch.
2. Use the following symbols consistently:
   - `[ ]` = Not started
   - `[~]` = In progress / partially complete
   - `[x]` = Completed
3. **Granularity matters.** If a deliverable has sub-tasks (indented checkboxes), update each sub-task individually as it is completed. Do NOT mark only the parent deliverable — mark both the sub-task AND the parent (once all sub-tasks are done).
4. **Never skip ahead.** If you implement deliverable D02 before D01, go back and mark D01 first before proceeding, or mark D01 as `[~]` with a note explaining the ordering decision.
5. **Sync on resume.** When resuming work on a phase in a new session, read the phase file first and verify which checkboxes are marked. Do not re-implement work that's already checked.
6. **Gap and Gate checklists follow the same rules.** Mark each item `[x]` as it is verified.

**Bad Example (what was happening):**
```markdown
## Deliverables
- [ ] [D00-01] Create design tokens file      ← file exists but never checked off
- [ ] [D00-02] Create profile types            ← file exists but never checked off
- [ ] [D00-03] Update IPC channels             ← file exists but never checked off
```

**Good Example (expected behavior):**
```markdown
## Deliverables
- [x] [D00-01] Create design tokens file
  - [x] Color palette
  - [x] Spacing scale
  - [x] Typography
- [~] [D00-02] Create profile types
  - [x] UserProfile interface
  - [ ] ProfileList type                       ← still pending
- [ ] [D00-03] Update IPC channels             ← not started yet
```

---

## 5. Verification & Handoff

### 5.1 Automated Verification
- Run the tests specified in the phase file's `{xx}.8 Verification Tests` section.
- All automated tests MUST reside in:
  ```
  ver_{mm}_chunk_{nn}_tests/ver_{mm}_chunk_{nn}_phase_{xx}.test.ts
  ```
- Ensure tests are passing and visible in the repository before marking the phase complete.

### 5.2 Update Test Results
- Record outcomes in the phase file's `{xx}.9 Test Results` table:
  - ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial
- **Update the table as each test is run**, not all at once at the end.

### 5.3 Manual Handoff
- If the phase requires human verification (e.g., "User must confirm UI layout"):
  1. Use `notify_user` with `PathsToReview` pointing to the phase file and a concise bulleted list of focus points.
  2. **Wait** for user confirmation before marking the gate as passed.
  3. Once the user confirms, update the corresponding verification checkboxes and gate items in the phase file.

---

## 6. Progression

- A phase is complete **only** when its `{xx}.10 Completion Criteria` are fully satisfied:
  - All deliverables marked `[x]`
  - All Gap and Gate items marked `[x]`
  - All verification tests passing
  - Test results table updated with actual outcomes
- Update the `ver_{mm}_chunk_{nn}_phase_overview.md` status table: `⬜ Pending` → `✅ Complete`.
- update the phase_ii file as well,Mark the Completion Criteria checkboxes themselves as `[x]` in the phase file.
- Only then advance to the next sequential phase file.
