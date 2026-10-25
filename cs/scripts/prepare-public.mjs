import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("src/data/catalogue.json", "utf8"));
fs.mkdirSync("public/data", { recursive: true });
for (const name of ["players", "teams", "photos", "memberships", "album"])
  fs.writeFileSync(
    `public/data/${name}.json`,
    JSON.stringify(d[name], null, 2),
  );
const used = new Set(
  [...d.photos, ...d.album].flatMap((p) => [
    p.localPath.replace("photos/", ""),
    p.cardPath.replace("photos/", ""),
  ]),
);
for (const file of fs.readdirSync("public/photos"))
  if (!used.has(file)) fs.rmSync("public/photos/" + file);
fs.copyFileSync("edgeone.json", "public/edgeone.json");
let text =
  "# 照片来源、署名与版权状态\n\n代码的 MIT 许可不覆盖照片。所有人像均来自真实原始照片；本项目仅裁切、缩放与 WebP 转换。\n\nHLTV 素材按项目所有者在 2026-10-21 声明其符合使用要求后纳入；此记录不是 HLTV 或摄影者出具的授权。版权归原权利人，原始来源和使用状态逐图保留。Commons 素材按来源文件的公开许可记录。两类状态不混淆，也不表示人物为本项目背书。\n\nCC BY-SA 照片的裁切版本继续采用对应相同许可，其他图片遵循各自标注条款。请保留来源和署名。\n\n";
for (const p of d.photos) {
  const player = d.players.find((x) => x.id === p.playerId);
  text += `## ${player.nickname} · ${p.year ?? "年份未核实"} · ${p.id}\n\n- 原文件：${p.title}\n- 作者 / 来源平台：${p.photographer}\n- 来源：[${p.sourcePlatform === "HLTV" ? "HLTV 来源页面" : "Wikimedia Commons 文件说明"}](${p.sourceUrl})\n- 版权 / 许可：[${p.license}](${p.licenseUrl})\n- 使用依据：${p.licenseStatus === "user-declared" ? "项目所有者声明；未独立核验官方授权" : "来源公开许可记录"}\n- 拍摄记录：${p.capturedAt ?? "未知"}；年龄：${p.age ?? "不作推断"}\n- 核验：${p.identityEvidence}\n- 修改：${p.alterations}\n- 本地文件：${p.localPath} / ${p.cardPath}\n- SHA-256：${p.sha256}\n\n`;
}
for (const p of d.album) {
  text += `## ${p.title} · ${p.year} · ${p.id}\n\n- 平台：${p.sourcePlatform}\n- 摄影 / 署名：${p.photographer}\n- 来源：${p.sourceUrl}\n- 年份依据：${p.yearEvidence}\n- 时间说明：${p.dateNote}\n- 许可：${p.license} (${p.licenseUrl})\n- 人物关联：${p.subjectEvidence}\n- 关联范围：${p.subjectScope}\n- 修改：${p.alterations}\n- 原片 ID：${p.sourcePhotoId}（与个人裁切版不重复计作新原片）\n- 文件：${p.localPath} / ${p.cardPath}\n- SHA-256：${p.sha256}\n\n`;
}
fs.writeFileSync("docs/照片署名与许可.md", text);
fs.writeFileSync("public/照片署名与许可.md", text);
fs.copyFileSync("docs/使用说明.md", "public/使用说明.md");
fs.copyFileSync("docs/国内免费部署.md", "public/国内免费部署.md");
for (const name of [
  "GitHub免费部署研究.md",
  "在线版进展.md",
  "交付与覆盖报告.md",
  "缺图选手.md",
  "缺图选手.json",
  "选手清单.csv",
  "照片清单.csv",
  "HLTV照片来源与授权记录.md",
  "data-audit.json",
  "相册扩充与批量采集.md",
  "赛事相册清单.csv",
  "Top20逐年照片覆盖.csv",
  "Top20照片补充进展.md",
  "top20-photo-coverage.json",
])
  if (fs.existsSync("docs/" + name))
    fs.copyFileSync("docs/" + name, "public/" + name);
console.log({ packagedPhotos: d.photos.length, unusedFilesRemoved: true });
