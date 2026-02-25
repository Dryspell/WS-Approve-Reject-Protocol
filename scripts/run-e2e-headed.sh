#!/usr/bin/env bash
set -euo pipefail

# Full E2E Game Simulation Runner
# Starts all services, runs headed Playwright tests, and captures logs.
#
# Usage:
#   ./scripts/run-e2e-headed.sh              # Run all simulation tests
#   ./scripts/run-e2e-headed.sh --quick      # Skip service startup (assumes already running)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/test-logs"

mkdir -p "$LOG_DIR"

SKIP_SERVICES=false
if [[ "${1:-}" == "--quick" ]]; then
  SKIP_SERVICES=true
fi

echo "=================================="
echo "  Vote Exchange E2E Simulation"
echo "=================================="
echo ""

if [[ "$SKIP_SERVICES" == false ]]; then
  # Start SpacetimeDB if not running
  if ! pgrep -f "spacetime" > /dev/null 2>&1; then
    echo "[1/4] Starting SpacetimeDB..."
    spacetime start > "$LOG_DIR/spacetimedb-server.log" 2>&1 &
    STDB_PID=$!
    sleep 3
    echo "  SpacetimeDB started (PID: $STDB_PID)"
    echo "  Logs: $LOG_DIR/spacetimedb-server.log"
  else
    echo "[1/4] SpacetimeDB already running"
  fi

  # Publish the module
  echo "[2/4] Publishing server module..."
  cd "$PROJECT_DIR/server"
  spacetime publish --server local --project-path . game > "$LOG_DIR/publish.log" 2>&1 || {
    echo "  WARNING: Publish failed (module may already exist). See $LOG_DIR/publish.log"
  }
  cd "$PROJECT_DIR"
  echo "  Module published"

  # Start dev server if not running
  if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "[3/4] Starting dev server..."
    pnpm dev > "$LOG_DIR/dev-server.log" 2>&1 &
    DEV_PID=$!
    echo "  Waiting for dev server..."
    for i in $(seq 1 30); do
      if curl -s http://localhost:3001 > /dev/null 2>&1; then
        break
      fi
      sleep 2
    done
    echo "  Dev server ready (PID: $DEV_PID)"
    echo "  Logs: $LOG_DIR/dev-server.log"
  else
    echo "[3/4] Dev server already running on :3001"
  fi
else
  echo "[SKIP] Assuming services are already running (--quick mode)"
fi

# Reset test data
echo "[4/4] Resetting test database..."
pnpm test:reset-db > "$LOG_DIR/reset-db.log" 2>&1 || echo "  Reset skipped (may not be available)"

echo ""
echo "Running headed simulation tests..."
echo "=================================="
echo ""

# Run the headed simulation
cd "$PROJECT_DIR"
npx playwright test e2e/full-game-simulation.spec.ts \
  --headed \
  --project=headed-simulation \
  --reporter=list \
  2>&1 | tee "$LOG_DIR/playwright-output.log"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "=================================="
echo "  Simulation Complete"
echo "=================================="
echo ""
echo "Log files:"
echo "  Playwright: $LOG_DIR/playwright-output.log"
echo "  Server:     $LOG_DIR/spacetimedb-server.log"
echo "  Dev:        $LOG_DIR/dev-server.log"
echo "  Player logs: $LOG_DIR/simulation-*.log"
echo "  Screenshots: $LOG_DIR/simulation-*.png"
echo "  Videos:      test-results/ (if recorded)"
echo ""

exit $EXIT_CODE
