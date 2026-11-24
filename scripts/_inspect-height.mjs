import fs from "fs";
const s = fs.readFileSync("node_modules/grapesjs/dist/css/grapes.min.css", "utf8");
for (const pat of [".gjs-editor{", ".gjs-one-bg", ".gjs-cv-canvas__canvas"]) {
  const idx = s.indexOf(pat);
  console.log(`\n=== ${pat} (first @${idx}) ===`);
  if (idx >= 0) console.log(s.slice(idx, idx + 260));
}
