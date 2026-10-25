import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import sharp from "sharp";
import { top20Coverage } from "./top20-coverage.mjs";
const d = JSON.parse(fs.readFileSync("src/data/catalogue.json", "utf8"));
const failures = [],
  warnings = [];
const check = (test, msg) => {
  if (!test) failures.push(msg);
};
check(d.players.length >= 150, "少于 150 名选手");
const ids = d.players.map((p) => p.id);
check(new Set(ids).size === ids.length, "人物 ID 重复");
check(
  new Set(d.players.map((p) => p.hltvId)).size === ids.length,
  "HLTV ID 重复",
);
check(
  new Set(d.players.map((p) => p.realName.toLowerCase())).size === ids.length,
  "真实姓名重复，需核对同人档案",
);
const byId = new Map(d.players.map((p) => [p.id, p]));
const photosById = new Map(d.photos.map((p) => [p.id, p]));
check(photosById.size === d.photos.length, "照片 ID 重复");
const top = d.teams.filter((t) => t.rank <= 20);
check(top.length === 20, "Top 20 不完整");
for (let n = 1; n <= 20; n++)
  check(
    top.some((t) => t.rank === n),
    "缺少排名 " + n,
  );
check(
  top.reduce((n, t) => n + t.playerIds.length, 0) >= 100,
  "Top 20 少于 100 个位置",
);
const topPlayers = top.flatMap((t) => t.playerIds);
check(new Set(topPlayers).size === topPlayers.length, "Top 20 队籍冲突");
for (const t of d.teams) {
  check(t.playerIds.length === 5, "队伍不满 5 人 " + t.name);
  check(t.rosterVerified, "队伍资料页未匹配 " + t.name);
  for (const id of t.playerIds) {
    check(byId.has(id), "队伍引用不存在选手 " + id);
    check(byId.get(id)?.teamId === t.id, "队籍映射不一致 " + id);
  }
}
const seen = new Map();
let bytes = 0;
for (const ph of d.photos) {
  check(byId.has(ph.playerId), "照片未关联人物 " + ph.id);
  check(
    ph.identityVerified && ph.reviewStatus === "reviewed",
    "照片未审核 " + ph.id,
  );
  check(
    !!ph.sourceUrl && !!ph.photographer && !!ph.license && !!ph.licenseUrl,
    "来源许可缺失 " + ph.id,
  );
  check(
    ph.age === null || ph.datePrecision === "day",
    "年龄使用不可靠日期 " + ph.id,
  );
  check(ph.year === null || ph.year <= 2026, "未来拍摄年份 " + ph.id);
  if (ph.ageRange) {
    const birthYear = Number(byId.get(ph.playerId)?.birthDate?.slice(0,4));
    check(ph.ageRange[0] === ph.year - birthYear - 1 && ph.ageRange[1] === ph.year - birthYear, "年龄区间计算错误 " + ph.id);
    check(ph.age === null && ph.datePrecision === "year" && !!ph.periodEvidence, "年龄区间缺少年份依据 " + ph.id);
  }
  if (ph.age !== null) {
    const b = new Date(byId.get(ph.playerId).birthDate),
      p = new Date(ph.capturedAt);
    const age =
      p.getUTCFullYear() -
      b.getUTCFullYear() -
      (p.getUTCMonth() < b.getUTCMonth() ||
      (p.getUTCMonth() === b.getUTCMonth() && p.getUTCDate() < b.getUTCDate())
        ? 1
        : 0);
    check(age === ph.age, "年龄计算错误 " + ph.id);
  }
  for (const key of ["localPath", "cardPath"]) {
    const f = "public/" + ph[key];
    check(fs.existsSync(f), "缺少照片 " + f);
    if (!fs.existsSync(f)) continue;
    const stat = fs.statSync(f);
    bytes += stat.size;
    check(stat.size > 500, "空图或异常小文件 " + f);
    const meta = await sharp(f).metadata();
    check(meta.format === "webp", "非 WebP " + f);
    check(meta.width > 100 && meta.height > 100, "异常尺寸 " + f);
  }
  const file = "public/" + ph.localPath;
  if (fs.existsSync(file)) {
    const sha = crypto
      .createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    check(sha === ph.sha256, "文件校验不匹配 " + ph.id);
    check(!seen.has(sha), "照片完全重复 " + ph.id);
    seen.set(sha, ph.id);
  }
}
for (const p of d.players)
  for (const id of p.photoIds)
    check(photosById.get(id)?.playerId === p.id, "照片引用错人 " + p.id);
const periodSet = (p) =>
  new Set(
    p.photoIds
      .map((id) => photosById.get(id)?.period)
      .filter((k) => k && k !== "undated"),
  );
const missing = d.players.filter((p) => !p.photoIds.length);
const albumIds = new Set();
for (const ph of d.album || []) {
  check(!albumIds.has(ph.id), "相册 ID 重复 " + ph.id);
  albumIds.add(ph.id);
  check(ph.reviewStatus === "reviewed", "相册未审查 " + ph.id);
  check(
    ph.year >= 1999 &&
      ph.year <= 2026 &&
      !!ph.yearEvidence &&
      ph.datePrecision === "year",
    "相册年份依据缺失 " + ph.id,
  );
  check(
    ph.playerIds.length > 0 && ph.playerIds.every((id) => byId.has(id)),
    "相册人物引用错误 " + ph.id,
  );
  check(
    !!ph.sourceUrl && !!ph.photographer && !!ph.license && !!ph.subjectEvidence,
    "相册来源缺失 " + ph.id,
  );
  for (const key of ["localPath", "cardPath"]) {
    const f = "public/" + ph[key];
    check(fs.existsSync(f), "相册文件缺失 " + f);
    if (!fs.existsSync(f)) continue;
    const meta = await sharp(f).metadata();
    check(
      meta.format === "webp" && meta.width > 100 && meta.height > 100,
      "相册格式或尺寸错误 " + f,
    );
    bytes += fs.statSync(f).size;
  }
  if (fs.existsSync("public/" + ph.localPath)) {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync("public/" + ph.localPath))
      .digest("hex");
    check(hash === ph.sha256, "相册哈希错误 " + ph.id);
    check(!seen.has(hash), "相册完整文件重复 " + ph.id);
    seen.set(hash, ph.id);
  }
}
if (d.photos.length < 300)
  warnings.push("照片数量未达到 300–500 目标，可靠素材不足");
if (missing.length) warnings.push(`${missing.length} 位暂无可靠照片`);
const report = {
  checkedAt: new Date().toISOString(),
  passed: failures.length === 0,
  checkScope:
    "Structural data integrity; not a declaration that all photo coverage targets are met.",
  photoCoverageTargetMet: top20Coverage(d, JSON.parse(fs.readFileSync(fs.existsSync("research/top20-gallery-indices.json") ? "research/top20-gallery-indices.json" : "research/top20-year-sources.json"))).targetMet,
  basicPortraitCountTargetMet: d.photos.length >= 300,
  statistics: {
    players: d.players.length,
    teams: d.teams.length,
    top20Teams: top.length,
    top20Players: new Set(topPlayers).size,
    chinesePlayers: d.players.filter((p) => p.countryCode === "CN").length,
    photos: d.photos.length,
    albumPhotos: (d.album || []).length,
    groupPhotos: (d.album || []).filter((p) => p.kind === "group").length,
    uniqueSourcePhotos: new Set([
      ...d.photos.map((p) => p.id),
      ...(d.album || []).map((p) => p.sourcePhotoId),
    ]).size,
    playersWithPhotos: d.players.length - missing.length,
    multiPeriodPlayers: d.players.filter((p) => periodSet(p).size >= 2).length,
    photoBytes: bytes,
  },
  failures,
  warnings,
};
fs.writeFileSync("docs/data-audit.json", JSON.stringify(report, null, 2));
fs.writeFileSync(
  "docs/缺图选手.json",
  JSON.stringify(
    missing.map(({ id, nickname, realName, country, missingReason }) => ({
      id,
      nickname,
      realName,
      country,
      reason: missingReason,
    })),
    null,
    2,
  ),
);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
