import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const host = process.env.NORTHSTAR_HOST ?? "127.0.0.1";
const port = Number(process.env.NORTHSTAR_PORT ?? 4173);
const publicDirectories = new Set(["assets", "css", "docs", "js"]);
const publicRootFiles = new Set(["index.html", "robots.txt", "sitemap.xml"]);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function resolvePublicPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const topLevel = relativePath.split("/")[0];
  if (!publicRootFiles.has(relativePath) && !publicDirectories.has(topLevel)) return null;

  const target = resolve(repositoryRoot, relativePath);
  const relativeTarget = relative(repositoryRoot, target);
  if (relativeTarget.startsWith(`..${sep}`) || relativeTarget === "..") return null;
  return target;
}

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405).end("Method not allowed");
    return;
  }

  const target = resolvePublicPath(request.url);
  if (!target) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const metadata = await stat(target);
    if (!metadata.isFile()) throw new Error("Not a file");
    const body = await readFile(target);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": body.byteLength,
      "Content-Type": contentTypes.get(extname(target).toLowerCase()) ?? "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Northstar preview available at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
