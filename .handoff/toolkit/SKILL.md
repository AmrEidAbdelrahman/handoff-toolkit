---
name: handoff-toolkit
description: AI-guided project handover toolkit — produces structured documentation that lives in the repo and links to actual code
compatibility: Requires Claude Code or compatible AI agent with file read/write access
metadata:
  version: 1.0.0
  schema_version: 1
---

# Handoff Toolkit

Handoff is an AI-guided project handover toolkit. When a developer (the "giver") is leaving a project, they run a guided session that scans the codebase, drafts technical context for each logical section, and asks focused WHY questions to capture business rationale, decisions, and gotchas. The output is a set of structured Markdown files committed to the repository that a receiver can browse without any tooling — or with the Handoff VS Code extension for a navigable, code-linked experience.

The toolkit is a folder of instruction files for an AI agent. There is no runtime, no server, and no build step.

---

## Available Commands

- `/handoff-start` — Start or resume a guided handover session. The AI scans the project, proposes sections, drafts technical context for each, asks WHY questions, and saves validated nodes to `.handoff/output/`.
- `/handoff-validate` — Validate a single node file against the schema before saving. Pass the file path as the argument: `/handoff-validate .handoff/output/nodes/my-node.md`.

---

## Folder Structure

```
.handoff/
├── .gitignore              # Automatically excludes toolkit/ and session.json from git
├── session.json            # Session state cache (gitignored — local only)
│
├── output/                 # COMMITTED — the handover deliverables
│   ├── index.json          # Master manifest of all nodes
│   └── nodes/
│       └── <id>.md         # One file per documented section
│
└── toolkit/                # GITIGNORED — the AI instruction files (not deliverables)
    ├── SKILL.md            # This file — toolkit overview and entry point
    ├── CLAUDE-snippet.md   # The CLAUDE.md block givers paste to wire up the toolkit
    ├── rules/
    │   ├── output-schema.md      # Validation rules for node files
    │   └── session-protocol.md   # Session state management rules
    └── skills/
        ├── handoff-start/
        │   └── SKILL.md    # The main guided session skill
        └── handoff-validate/
            └── SKILL.md    # The node validation skill
```

---

## Installation

1. Copy the `.handoff/` folder from the Handoff repository into the project root.
2. Open the project's `CLAUDE.md` file (create one if it does not exist).
3. Paste the contents of `.handoff/toolkit/CLAUDE-snippet.md` into `CLAUDE.md`.
4. Save `CLAUDE.md`. The toolkit is now active — Claude Code will load it on next open.

The `.handoff/.gitignore` file automatically excludes the toolkit folder and the session cache from version control. The `.handoff/output/` folder is tracked by git. No additional gitignore setup is required.

---

## Note on Gitignore

The `.handoff/.gitignore` excludes `toolkit/` and `session.json`. This means:
- In the Handoff **source repository** (this repo), toolkit files require `git add -f` to commit.
- In a **giver's project**, toolkit files are excluded automatically after drop-in. The giver only commits `.handoff/output/`.

This is intentional: givers ship their handover output, not the generation tools.
