import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const api = spawn(process.execPath, ["server/index.mjs"], { cwd: root, stdio: "inherit" });
const web = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js")], {
  cwd: root,
  stdio: "inherit",
});

function stop() {
  api.kill();
  web.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("exit", (code) => {
  if (code) web.kill();
});
