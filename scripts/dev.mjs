import { spawn } from "node:child_process";

const commands = [
  ["api", ["run", "dev", "--workspace", "@app/api"]],
  ["web", ["run", "dev", "--workspace", "@app/web"]],
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.stderr.write(`[${name}] exited with signal ${signal}\n`);
    } else if (code && code !== 0) {
      process.stderr.write(`[${name}] exited with code ${code}\n`);
    }

    shutdown(code ?? 0);
  });

  return child;
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
