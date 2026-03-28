---
description: Workflow for generating a comprehensive design thoughts document from raw user inputs.
---

# Create Design Thoughts Workflow

This workflow instructs the AI on how to process raw user ideas and turn them into a structured, chronological Design Thoughts document.

## 1. Input Collection
- Read all provided inputs from the user, including the active prompt text, chat history, and any relevant active documents or code snippets referenced.
- Treat the user's raw input as the absolute source of truth for the desired features and mechanics.

## 2. Processing Rules
- **DO NOT compress or omit details.** Every single feature, mechanic, and constraint mentioned in the user's input must be clearly stated in the resulting document.
- **Organize logically.** Group related ideas together (e.g., File System, UI/UX, Data Structures, Workflows).
- **Maintain chronology.** If the user explains a step-by-step process, preserve that order.
- **Identify gaps.** If the user's input has obvious technical gaps, formulate them as open questions or "areas for further discussion" within the document, rather than guessing the implementation.

## 3. Document Structure
Produce a Markdown document with the following structure:
- **Title & Overview:** A high-level summary of what the feature/system is.
- **Context:** Why we are building this (e.g., moving from prototype to local storage).
- **Core Feature Specifications:** Detailed breakdown of all mechanics requested by the user, organized by sub-topics.
- **Architecture/Technical Summary:** A decoupled view of how the system components interact.

## 4. File Naming and Location
Save the resulting file in the appropriate chunk directory based on the user's current project phase.

**Directory Structure Convention:**
The root folders use `nn` as literal strings, while the deepest folder uses actual numbers for the chunk.

```text
agent_user_bin\ver_nn_chunk_nn_phased_development\ver_01_chunk_nn_phased_development\ver_01_chunk_01_phased_development_[descriptor]\
```
*(Note: The 'nn' in the parent folder names are string literals. The `[descriptor]` is a slug like `asset_lib`.)*

**Filename Convention:**
```text
ver_{mm}_chunk_{nn}_design_thoughts_{ii}_[descriptor].md
```
*(Note: `{ii}` represents the iteration number, e.g., `01`)*

**Example Output Directory:**
If working on chunk 01 for the asset library (iteration 01):
`agent_user_bin\ver_nn_chunk_nn_phased_development\ver_01_chunk_nn_phased_development\ver_01_chunk_01_phased_development_asset_lib\ver_01_chunk_01_design_thoughts_01_asset_lib.md`

## 5. Finalization
- After writing the file, present it to the user.
- Offer to move on to the `/interview` workflow to lock in any remaining technical decisions.
