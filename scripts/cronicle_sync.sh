#!/usr/bin/env bash
# ==============================================================================
# PROVISION — Cronicle Food Log Sync & Auto-Deploy
# Syncs Obsidian meal journal with Provision and auto-pushes updates to GitHub Pages
# ==============================================================================

set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Starting Provision Food Log Sync ==="

cd "$PROJECT_DIR"

# 1. Run python sync against Obsidian journal_meals.csv
echo "Syncing latest meal counts from Obsidian..."
python3 scripts/sync_food_log.py

# 2. Check if data.js was updated
if git diff --quiet data.js; then
    echo "✓ data.js is already up-to-date. No new meal log changes to publish."
else
    echo "Changes detected in data.js. Staging and committing..."
    git add data.js
    git commit -m "Auto-sync food log: $(date '+%Y-%m-%d %H:%M')"
    
    echo "Pushing updates to GitHub Pages (origin/master)..."
    git push origin master
    echo "✓ Successfully pushed to GitHub Pages! Live site will update in ~30 seconds."
fi

echo "=== Sync complete ==="
