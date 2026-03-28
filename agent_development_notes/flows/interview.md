, # Interview Workflow

> A generalized development interview where the AI interviews the user on design decisions for any provided (or inferred) documents. Treats the user as a highly intelligent noob — explains concepts clearly, offers expert-level recommendations, and locks in decisions upon completion.

---

## 0. File System Conventions

> **Variable convention:** Bare `mm`, `nn` are literal label tokens in directory names. Braced `{mm}`, `{nn}` are substitution slots — replace with 2-digit indices. `[descriptor]` is a slug like `networking_ready`, `functionality`.
>
> All project documents live under:
> ```
> agent_user_bin/ver_mm_chunk_nn_phased_development/
>   ver_{mm}_chunk_nn_phased_development/
>     ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
> ```
>first chunk in this dir > agent_user_bin\ver_nn_chunk_nn_phased_development\ver_01_chunk_nn_phased_development\ver_01_chunk_01_phased_development_asset_lib.
- the 'nn' and 'mm' are string literals not injections in parent folders. 
---

## 1. Identify Interview Target

### If the user provides files:
- Read each provided file in full.
- These are the **interview subjects** — every open question, placeholder, ambiguous choice, or un-locked decision in these files becomes an interview question.

### If the user provides NO files:
- Infer what needs interviewing by:
  1. Checking the **active document** in the user's editor.
  2. Scanning the current chunk directory for files with open questions, `[ ]` checkboxes, `TODO` markers, or open-ended prose (design_thoughts, specs, phase files).
  3. Checking `*_unfinished_business.md` files for items targeting the current chunk.
- Present the inferred file(s) to the user for confirmation before proceeding.

---

## 1.5 Create Interview Log File

Once the target chunk is identified, create a persistent interview log file in the chunk directory:

```
ver_{mm}_chunk_{nn}_phased_development_[descriptor]/
  ver_{mm}_chunk_{nn}_interview_{ii}_{description}.md
```

- `{ii}` = interview iteration number (01, 02, ...) — increment if multiple interviews are run on the same chunk.
- `{description}` = short kebab-case slug describing the interview subject (e.g., `design-decisions`, `scope-refinement`, `hotkey-mapping`).

**Examples:**
- `ver_01_chunk_03_interview_01_design-decisions.md`
- `ver_01_chunk_03_interview_02_scope-refinement.md`

The interview log file should:
- Be created at the **start** of the interview (not the end).
- Record all questions, options, recommendations, and the user's locked answers as they come in.
- Serve as a persistent historical record of the design conversation.
- Use the same locked-decision format as specs: `**[ID]. [Question]** → **(x) [Choice]**`
- Remain in the chunk folder permanently — it is NOT deleted after the interview.

---

## 2. Extract Decision Points

Read the target file(s) and extract every point that requires a user decision. Categorize them:

- **Architectural** — how components are structured, data flows, patterns
- **Behavioral** — how features behave from the user's perspective
- **Technical** — implementation choices, libraries, algorithms
- **Scope** — what's in/out, what gets deferred
- **Convention** — naming, file structure, hotkeys, defaults

For each decision point, note:
- What the current state is (if anything exists)
- What the design-thoughts or spec says (if anything)
- What constraints exist from prior locked decisions

---

## 3. Compose Interview Questions

### Presentation Format

Present questions **one section at a time** (batched by topic, not one-by-one). Each question follows this format:

```markdown
**[ID]. [Question — stated clearly for someone who may not know the technical term]**

[1-2 sentence context paragraph explaining WHY this decision matters, in plain language.]

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | [Option description] | [Pros / cons] |
| **(b)** | [Option description] | [Pros / cons] |
| **(c)** | [Option description] | [Pros / cons] |
[...as many options as are genuinely distinct — typically 2–5]

> **Top Recommendations:**
> 1. **(b)** — [Why, from a senior dev perspective. Reference AAA/production-grade reasoning.]
> 2. **(a)** — [Why this is the runner-up. What scenario would make this the better pick.]
>
> **Key tradeoff:** [The most important thing the user should weigh between the top 2.]
```

### Recommendation Perspective

All recommendations must come from the perspective of a **senior developer** who prioritizes:
- **AAA studio quality** — the kind of polish and robustness expected in professional game tools
- **Research quality** — well-reasoned, evidence-informed choices
- **Production grade** — handles edge cases, scales, is maintainable
- **Forward thinking** — won't need to be ripped out later; compatible with the project's roadmap
- **Stability** — prefers proven patterns over clever hacks

### Question Count

- The number of options per question is **dynamic** — use exactly as many as represent genuinely different approaches. Never pad with throwaway options.
- Always provide **exactly 2 top recommendations** (primary + runner-up) unless there is truly only one viable option, in which case explain why.

### User-Friendly Language

- Assume the user is **highly intelligent but may not know the jargon**. Define technical terms inline the first time they appear.
- Use concrete examples: "like how Photoshop does X" or "similar to how Discord handles Y".
- If a question is about something the user has likely never encountered, give a brief "what this means in practice" before the options table.

---

## 4. Conduct the Interview

### Delivery Rules

- **Default: present ALL questions at once** — do not batch unless there is a reason to.
- **Batch only when**:
  1. Later questions **depend on the answer** of earlier questions (e.g., "if you chose (a) for D1, then D2 changes"). In this case, present the dependent questions in a follow-up after the dependencies are answered.
  2. There are **20+ questions** total — split roughly in half for readability.
- Present via `notify_user` with `BlockedOnUser: true`.
- Message should include:
  - Section titles grouping the questions by topic
  - All questions for all sections (unless batching applies)
  - A note that the user can answer with just the option letters (e.g., "A1: b, A2: your rec, A3: a")
  - Remind the user they can ask for clarification on any question

### User Response Handling

The user may respond in various ways:
- **"your rec"** or **"your recommendation"** → use the primary recommendation
- **"a"**, **"b"**, etc. → lock that option
- **Custom answer** → the user may describe something not in the options. Incorporate it as a new option and lock it.
- **"skip"** or **"later"** → mark as deferred, move on
- **Questions back** → answer the user's question, then re-present the decision
- **Partial answers** → lock answered ones, re-present unanswered ones in the next batch

### Adaptive Follow-ups

If the user's answer reveals new information or preferences:
- Generate follow-up questions that drill deeper into that area.
- These follow-ups should be presented in the next batch.

---

## 5. Lock Decisions

As the user answers each question, convert it from interview format to locked format:

```markdown
**[ID]. [Question]** → **(b) [Chosen option summary]**
- [Final rationale — incorporate user's reasoning if they explained their choice]
```

Track locked vs. unlocked decisions. After each batch, report progress:
```
✅ Locked: A1, A2, A3, B1, B2
⬜ Remaining: C1, C2, C3
```

---

## 6. Update Source Documents

Once ALL decisions are locked:

### 6A. Update the interview target file(s)
- Replace open questions / placeholders with the locked decisions.
- If the file is a design-thoughts doc: update the "Open Discussion Points" section — remove answered items, add locked-in decisions to the relevant feature sections.
- If the file is a spec: convert all interview-format questions to the locked single-line format.
- If the file is a phase file or other doc: update any relevant sections with the decided values.

### 6B. Propagate to related files (if applicable)
- If a decision affects types, interfaces, or constants — note what code changes are implied (don't make the code changes, just document them).
- If a decision resolves an unfinished_business item — update the unfinished_business file to mark it addressed.
- If a decision creates NEW unfinished_business — add it to the appropriate tracker.

### 6C. Create an interview summary
- At the bottom of the target file (or as a separate section), append:

```markdown
## Interview Summary — [Date]

| ID | Decision | Locked Choice |
|----|----------|--------------|
| A1 | [Short title] | (b) [Choice] |
| A2 | [Short title] | (a) [Choice] |
[...all decisions]

Total: [N] decisions locked.
```

---

## 7. Present Final State

- Use `notify_user` with `PathsToReview` pointing to all updated files.
- Message should include:
  - Total decision count
  - Summary of the most impactful decisions
  - Any follow-up work implied by the decisions (e.g., "B3 means we'll need a new tool type in the next phase plan")
  - Next recommended workflow step (e.g., "Ready for `/create-spec`" or "Ready for `/create-phase-plan`")
