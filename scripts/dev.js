import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const processes = [
  spawn(npm, ['run', 'dev', '--workspace', 'backend'], { stdio: 'inherit', shell: false }),
  spawn(npm, ['run', 'dev', '--workspace', 'frontend'], { stdio: 'inherit', shell: false }),
];

function shutdown(code = 0) {
  processes.forEach((child) => {
    if (!child.killed) child.kill(isWindows ? undefined : 'SIGTERM');
  });
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
processes.forEach((child) => child.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
}));
