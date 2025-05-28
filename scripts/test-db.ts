import { spawn } from 'child_process';
import { join } from 'path';

const spacetimeProcess = spawn('spacetime', ['start'], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  spacetimeProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  spacetimeProcess.kill();
  process.exit();
});

console.log('SpacetimeDB test instance started. Press Ctrl+C to stop.'); 