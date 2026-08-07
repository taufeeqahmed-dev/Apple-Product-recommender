import { readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scanRoots = ["js", "tests", "scripts"];
const rootFiles = ["playwright.config.js"];

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJavaScriptFiles(path)));
    } else if ([".js", ".mjs"].includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const discovered = (
  await Promise.all(scanRoots.map((directory) => findJavaScriptFiles(join(repositoryRoot, directory))))
).flat();
const files = [
  ...discovered,
  ...rootFiles.map((file) => join(repositoryRoot, file)),
].sort((left, right) => left.localeCompare(right));

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failures.push(relative(repositoryRoot, file));
}

console.log(`Checked ${files.length} JavaScript files; failures: ${failures.length}`);
if (failures.length > 0) {
  failures.forEach((file) => console.error(`- ${file}`));
  process.exitCode = 1;
}
