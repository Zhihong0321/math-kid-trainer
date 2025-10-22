#!/bin/sh
set -eu

PORT="${PORT:-8080}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting simple HTTP server on port ${PORT}"
exec python3 -m http.server "${PORT}"
