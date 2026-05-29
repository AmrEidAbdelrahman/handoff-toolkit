#!/usr/bin/env bash
# Handoff Toolkit Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/AmrEidAbdelrahman/handoff-toolkit/master/install.sh | bash
# Or:    bash install.sh
#
# Installs the Handoff toolkit into .handoff/toolkit/ in the current directory.
# Run this from your project root.

set -euo pipefail

REPO="AmrEidAbdelrahman/handoff-toolkit"
BRANCH="master"
TARBALL_URL="https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz"
INSTALL_DIR=".handoff"
TOOLKIT_DIR="${INSTALL_DIR}/toolkit"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
info() { echo -e "${CYAN}→${RESET} $*"; }
warn() { echo -e "${YELLOW}!${RESET} $*"; }

echo ""
echo "  Handoff Toolkit Installer"
echo "  ─────────────────────────"
echo ""

# ── Pre-flight ────────────────────────────────────────────────────────────────
if [ ! -f "$(git rev-parse --show-toplevel 2>/dev/null)/." ] && [ ! -d ".git" ]; then
  warn "No .git directory found. Run this from your project root (git init first if needed)."
  warn "Continuing anyway — toolkit files will be placed in .handoff/toolkit/"
fi

if ! command -v curl &>/dev/null && ! command -v wget &>/dev/null; then
  echo "Error: curl or wget is required." >&2; exit 1
fi

if ! command -v tar &>/dev/null; then
  echo "Error: tar is required." >&2; exit 1
fi

# ── Download ──────────────────────────────────────────────────────────────────
info "Downloading toolkit from github.com/${REPO}..."

TMPDIR_PATH=$(mktemp -d)
trap 'rm -rf "$TMPDIR_PATH"' EXIT

if command -v curl &>/dev/null; then
  curl -fsSL "$TARBALL_URL" -o "${TMPDIR_PATH}/handoff.tar.gz"
else
  wget -qO "${TMPDIR_PATH}/handoff.tar.gz" "$TARBALL_URL"
fi

tar -xz -C "$TMPDIR_PATH" -f "${TMPDIR_PATH}/handoff.tar.gz"

EXTRACTED_DIR=$(find "$TMPDIR_PATH" -mindepth 1 -maxdepth 1 -type d | head -1)

if [ -z "$EXTRACTED_DIR" ] || [ ! -d "${EXTRACTED_DIR}/.handoff/toolkit" ]; then
  echo "Error: could not find toolkit files in downloaded archive." >&2
  exit 1
fi

# ── Install ───────────────────────────────────────────────────────────────────
if [ -d "$TOOLKIT_DIR" ]; then
  warn "Existing toolkit found at ${TOOLKIT_DIR}/ — updating."
else
  info "Creating ${TOOLKIT_DIR}/"
fi

mkdir -p "$INSTALL_DIR"
cp -r "${EXTRACTED_DIR}/.handoff/toolkit" "${INSTALL_DIR}/"

# Write .handoff/.gitignore (gitignore the toolkit itself and session state)
cat > "${INSTALL_DIR}/.gitignore" <<'GITIGNORE'
# Handoff Toolkit — AI instruction files, not project deliverables
toolkit/
session.json
GITIGNORE

ok "Toolkit installed to ${TOOLKIT_DIR}/"
ok ".handoff/.gitignore written (toolkit is gitignored — only output/ is committed)"

# ── Register Claude Code slash commands ───────────────────────────────────────
info "Registering Claude Code slash commands in .claude/commands/..."
mkdir -p ".claude/commands"

cat > ".claude/commands/handoff-start.md" <<'CMD'
Read `.handoff/toolkit/skills/handoff-start/SKILL.md` completely, then follow every instruction in it exactly.
CMD

cat > ".claude/commands/handoff-review.md" <<'CMD'
Read `.handoff/toolkit/skills/handoff-review/SKILL.md` completely, then follow every instruction in it exactly. $ARGUMENTS
CMD

cat > ".claude/commands/handoff-validate.md" <<'CMD'
Read `.handoff/toolkit/skills/handoff-validate/SKILL.md` completely, then follow every instruction in it exactly. The file to validate is: $ARGUMENTS
CMD

ok "Slash commands registered: /handoff-start, /handoff-review, /handoff-validate"

# ── CLAUDE.md wiring ──────────────────────────────────────────────────────────
echo ""
echo "  ─── Next step ────────────────────────────────────────────────────────"
echo ""
echo "  Add this block to your CLAUDE.md file (create it at your project root"
echo "  if it doesn't exist yet). This wires up the toolkit for Claude Code:"
echo ""
echo "  ┌─────────────────────────────────────────────────────────────────────"
cat <<'SNIPPET'
  │
  │  # Handoff Toolkit
  │
  │  This project has the Handoff toolkit installed.
  │  Read .handoff/toolkit/SKILL.md for the toolkit overview and available commands.
  │
  │  Available commands:
  │  - /handoff-start    — autonomously document the project (no questions asked)
  │  - /handoff-review   — interactively review AI-inferred content after /handoff-start
  │  - /handoff-validate — validate a node file: /handoff-validate .handoff/output/nodes/<id>.md
  │
SNIPPET
echo "  └─────────────────────────────────────────────────────────────────────"
echo ""

# ── Auto-append to CLAUDE.md if it already exists ─────────────────────────────
if [ -f "CLAUDE.md" ]; then
  if grep -q "handoff-start" "CLAUDE.md" 2>/dev/null; then
    warn "CLAUDE.md already contains Handoff wiring — skipping auto-append."
  else
    info "Appending Handoff block to existing CLAUDE.md..."
    cat >> "CLAUDE.md" <<'CLAUDEBLOCK'

# Handoff Toolkit

This project has the Handoff toolkit installed.
Read .handoff/toolkit/SKILL.md for the toolkit overview and available commands.

Available commands:
- /handoff-start    — autonomously document the project (no questions asked)
- /handoff-review   — interactively review AI-inferred content after /handoff-start
- /handoff-validate — validate a node file: /handoff-validate .handoff/output/nodes/<id>.md
CLAUDEBLOCK
    ok "CLAUDE.md updated."
  fi
else
  info "No CLAUDE.md found — creating one..."
  cat > "CLAUDE.md" <<'CLAUDEBLOCK'
# Handoff Toolkit

This project has the Handoff toolkit installed.
Read .handoff/toolkit/SKILL.md for the toolkit overview and available commands.

Available commands:
- /handoff-start    — autonomously document the project (no questions asked)
- /handoff-review   — interactively review AI-inferred content after /handoff-start
- /handoff-validate — validate a node file: /handoff-validate .handoff/output/nodes/<id>.md
CLAUDEBLOCK
  ok "CLAUDE.md created."
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
ok "Handoff toolkit is ready."
echo ""
echo "  Run \`/handoff-start\` in Claude Code to generate your first handover."
echo "  Output will appear in .handoff/output/ — commit that directory to share with receivers."
echo ""
