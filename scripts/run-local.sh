#!/usr/bin/env bash
# Runs the bundled Action locally against a pull request, the way GitHub would.
# Usage: npm run local [-- <owner/repo> <pr-number>]
set -euo pipefail

repo="${1:-THeAkAy/ai-review-prototype-scratch}"
pr="${2:-1}"

event_file="$(mktemp)"
trap 'rm -f "$event_file"' EXIT
printf '{"pull_request":{"number":%s}}\n' "$pr" > "$event_file"

env \
  "INPUT_OPENROUTER-API-KEY=${OPENROUTER_API_KEY:-dummy}" \
  "INPUT_GITHUB-TOKEN=$(gh auth token)" \
  "GITHUB_REPOSITORY=$repo" \
  "GITHUB_EVENT_NAME=pull_request" \
  "GITHUB_EVENT_PATH=$event_file" \
  node dist/index.js
