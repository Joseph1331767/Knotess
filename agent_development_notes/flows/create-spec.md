# Create-Spec Workflow

> Generate a spec document for a phased-development chunk using the interview-style decision-locking format. The spec is a reviewable artifact where the user locks design decisions before phase planning.

> **Variable convention:** Bare `mm`, `nn` are literal label tokens. Braced `{mm}`, `{nn}` are substitution slots — replace with 2-digit indices for version and chunk. `[descriptor]` is the chunk's slug (e.g., `networking_ready`, `functionality`).

---

## 1. Determine Target Chunk

- Identify the target `{mm}` (version) and `{nn}` (chunk) from conversation context or explicit user instruction.
- Confirm the chunk directory already exists:
  ```
  agent_user_bin/ver_mm_chunk_nn_phased_development/
    ver_{mm}_chunk_nn_phased_development/
      ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
  ```
- If it does not exist, ask the user — the chunk folder should have been created during design-thoughts or earlier planning.

---

## 2. Read Required Context

### 2A. Read the Design-Thoughts Document
- Locate the latest `ver_{mm}_chunk_{nn}_design_thoughts_{ii}.md` in the chunk directory.
- This is the **primary input** — the spec converts design-thoughts proposals into locked decisions.
- If no design-thoughts file exists, **stop and instruct the user** to run the create-thoughts workflow first.

### 2B. Read All Unfinished Business Files
- Scan all `*_unfinished_business.md` files across the version.
- Extract items targeting this chunk — they MUST appear as covered decisions in the spec.

### 2C. Read Prior Specs (for consistency)
- If earlier chunks have specs (e.g., `ver_{mm}_chunk_{nn-1}_spec.md`), read them to:
  - Avoid contradicting earlier locked decisions.
  - Carry forward established patterns and conventions.
  - Reference prior section IDs where relevant.

### 2D. Conversation History
- Review conversation for any decisions the user has already communicated verbally.
- Pre-fill those as the recommended option where applicable.

---

## 3. Identify Decision Points

From the design-thoughts document, extract every feature, behavior, or architectural choice that has more than one reasonable approach. Group them into **lettered sections** by topic area:

- Section A, B, C... — each covering a coherent topic (e.g., "Mark Selection", "Text Tool", "Image Import")
- Within each section, number decisions: A1, A2, B1, B2, etc.

---

## 4. Compose the Spec Document

Create:
```
ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
  ver_{mm}_chunk_{nn}_spec.md
```

### Document Structure (mirror the reference spec)

```markdown
# ver_{mm}_chunk_{nn} — [Descriptor] Spec

> **Goal**: [One-line goal statement for the chunk.]

---

## Locked Design Decisions

### Section A: [Topic Name]

**A1. [Decision title]** → **(X) [Chosen option summary]**
- [Rationale, tradeoffs, and any notes]

[Repeat for each decision within this section]

---

### Section B: [Topic Name]

[Same pattern]

---

[Continue for all sections...]

---

## New Types Summary

[If this chunk introduces or modifies types, include a TypeScript code block
showing the interfaces — same format as the reference spec.]

---

## Ready for `/create-phase-plan`

All [N] decisions locked. Proceed to phase planning when ready.
```

---

## 5. Decision Format Rules

Each decision follows this exact pattern:

```markdown
**[ID]. [Question / Decision title]** → **(X) [Chosen option]**
- [Explanation / rationale]
```

### Interview-Style Presentation (for initial draft)

When the spec is **first created** and decisions are NOT yet locked, present each decision as a **multiple-choice question with recommendation**:

```markdown
**A1. [Question]**

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | [Option A description] | [Pros/cons] |
| **(b)** | [Option B description] | [Pros/cons] |
| **(c)** | [Option C description] | [Pros/cons] |

> **Recommendation: (b)** — [Why this is the recommended choice]
```

- The number of options is **dynamic** — use as many as are genuinely distinct (2–5 typically).
- Always include a recommendation with reasoning.
- Flag any **tradeoffs** the user should weigh.
- If a decision is obvious / has only one sane option, still list it with a single option and mark it as recommended — the user can confirm or challenge.

### After User Review

Once the user picks options (or accepts recommendations), convert the interview questions into the locked format:

```markdown
**A1. [Question]** → **(b) [Chosen option summary]**
- [Final rationale incorporating user's reasoning if they commented]
```

Remove the options table and replace with the locked single-line format.

---

## 6. Carried-Forward Enforcement

- Every item from unfinished_business targeting this chunk **must** map to at least one decision in the spec.
- If an unfinished_business item has no corresponding decision, create one — even if it's a simple "include this feature: yes/no" confirmation.
- At the end of the spec, add a checklist:

```markdown
## Unfinished Business Coverage

- [x] [Item from unfinished_business] → covered by [Section.ID]
- [x] [Next item] → covered by [Section.ID]
```

---

## 7. Present for Review

- Present the spec to the user with `notify_user`, `PathsToReview` pointing to the spec file.
- Set `BlockedOnUser: true`.
- Message should include:
  - Count of decision sections and total decisions.
  - Call out any decisions where the recommendation is uncertain or the tradeoff is significant.
  - Remind the user to answer each decision point.

---

## 8. Iterate Until Locked

- User reviews and responds with their choices (e.g., "A1: b, A2: a, B1: your recommendation").
- Update the spec in-place — convert answered questions from interview format to locked format.
- Re-present any remaining unlocked decisions.
- Continue until **all decisions are locked**.

---

## 9. Lock and Handoff

Once all decisions are locked:
- Remove any remaining interview-format tables (all should be locked single-line format).
- Ensure the `## Ready for /create-phase-plan` footer is present with the total decision count.
- The spec is now the **authoritative input** for `/create-phase-plan`.
- The spec file is **never deleted** — it remains as the design contract for the chunk.
