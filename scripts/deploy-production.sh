#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${TMUX_SESSION:-openmaic}"
PORT="${PORT:-3000}"
LOG_DIR="${ROOT_DIR}/logs"
LOG_FILE="${LOG_DIR}/production.log"

cd "${ROOT_DIR}"

echo "Building OpenMAIC for production..."
pnpm exec next build --webpack

mkdir -p "${LOG_DIR}"

if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  echo "Stopping tmux session: ${SESSION_NAME}"
  tmux kill-session -t "${SESSION_NAME}"
fi

echo "Starting production server in tmux session: ${SESSION_NAME}"
tmux new-session -d -s "${SESSION_NAME}" \
  "cd '${ROOT_DIR}' && exec pnpm exec next start -H 0.0.0.0 -p '${PORT}' >> '${LOG_FILE}' 2>&1"

echo "Production server started on port ${PORT}"
echo "Log file: ${LOG_FILE}"
