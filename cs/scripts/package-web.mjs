import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
function walk(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(root, e.name))
        : [path.join(root, e.name)],
    );
}
const files = walk("dist").filter(
  (p) => !["sw.js", "404.html", "_headers"].includes(path.basename(p)),
);
const name =
  "frame-cs-" +
  crypto
    .createHash("sha256")
    .update("online-lazy-cache-v2")
    .update(
      files
        .map(
          (p) =>
            p +
            crypto
              .createHash("sha256")
              .update(fs.readFileSync(p))
              .digest("hex"),
        )
        .join(""),
    )
    .digest("hex")
    .slice(0, 12);
// Online first: install only the application shell. Photographs are cached
// after they are viewed, avoiding a 35 MB first-visit background download.
const precache = files.filter(p => p === "dist/index.html" || p === "dist/favicon.svg" || p.startsWith("dist/assets/")).map((p) => "./" + p.replace(/^dist\//, ""));
const sw = `const CACHE=${JSON.stringify(name)},FILES=${JSON.stringify(precache)};
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);try{await c.addAll(FILES);await self.skipWaiting()}catch(error){await caches.delete(CACHE);throw error}})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('frame-cs-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();for(const c of await self.clients.matchAll())c.postMessage('frame-offline-ready')})()));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url),base=new URL('./',self.location);if(e.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;e.respondWith((async()=>{const c=await caches.open(CACHE);if(e.request.mode==='navigate'){try{const response=await fetch(e.request);if(response.ok)return response;throw Error('Navigation failed')}catch{return await c.match(new URL('./index.html',self.location).href)||Response.error()}}const cached=await c.match(e.request,{ignoreVary:true});if(cached)return cached;const response=await fetch(e.request);if(response.ok){const copy=response.clone();e.waitUntil(c.put(e.request,copy).catch(()=>{}))}return response})())});`;
fs.writeFileSync("dist/sw.js", sw);
fs.copyFileSync("dist/index.html", "dist/404.html");
fs.writeFileSync("dist/.nojekyll", "");
fs.writeFileSync(
  "dist/_headers",
  "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/sw.js\n  Cache-Control: no-cache\n",
);
fs.mkdirSync("delivery", { recursive: true });
const output = path.resolve("delivery/CS选手图鉴-网站部署包.zip");
fs.rmSync(output, { force: true });
execFileSync("/usr/bin/zip", ["-qr", output, "."], {
  cwd: path.resolve("dist"),
});
console.log({
  websiteFiles: files.length,
  websiteZIP: output,
  offlinePackaging: "paused",
  precachedShellFiles: precache.length,
  photographCaching: "on demand",
});
