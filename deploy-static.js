const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");
const entries = ["index.html", "css", "js", "assets", "CNAME"];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  if (fs.statSync(source).isDirectory()) {
    copyDir(source, path.join(dist, entry));
  } else {
    fs.copyFileSync(source, path.join(dist, entry));
  }
}

console.log("Static build written to dist");
