# Installation Instructions

After running `install.sh`, add the block below to your project's `CLAUDE.md` file (created at the project root). The install script does this automatically if `CLAUDE.md` is already present — you only need to paste manually if you skipped auto-wiring.

---

```markdown
# Handoff Toolkit

This project has the Handoff toolkit installed.
Read .handoff/toolkit/SKILL.md for the toolkit overview and available commands.

Available commands:
- /handoff-start    — autonomously document the project (no questions asked)
- /handoff-review   — interactively review AI-inferred content after /handoff-start
- /handoff-validate — validate a node file: /handoff-validate .handoff/output/nodes/<id>.md
```

---

After saving `CLAUDE.md`, the toolkit is active. Run `/handoff-start` in Claude Code to begin.
