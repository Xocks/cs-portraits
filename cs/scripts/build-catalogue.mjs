import fs from "node:fs";
import { classifyEventYear } from "./photo-periods.mjs";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const seed = read("research/seed-players.json");
const profiles = new Map(
  read("research/profiles.json").map((p) => [p.hltvId, p]),
);
const seedTeams = read("research/seed-teams.json");
const rosterChecks = fs.existsSync("research/roster-checks.json")
  ? read("research/roster-checks.json")
  : [];
const priorities =
  "s1mple device NiKo ZywOo donk m0NESY coldzera FalleN fer fnx olofmeister GeT_RiGhT f0rest friberg kennyS GuardiaN shox ScreaM shroud Stewie2K tarik EliGE Twistzz rain karrigan electroNic Perfecto Boombl4 flamie Edward Zeus markeloff dupreeh gla1ve Xyp9x Magisk KRIMZ flusha JW pashaBiceps NEO TaZ Snax jks Hiko n0thing Skadoodle autimatic NBK- Happy SmithZz Ex6TenZ pronax TACO boltz allu xseveN sergej AdreN Dosia dennis BnTeT Attacker DD somebody captainMo kaze advent zhokiNg aumaN Summer MAJ3R Calyx byali Xizt Fifflaren"
    .split(" ")
    .map((n) => n.toLowerCase());
const players = seed.map((p) => {
  const profile = profiles.get(p.hltvId);
  if (
    !profile?.nickname ||
    profile.nickname.toLowerCase().replace(/-/g, "") !==
      p.nickname.toLowerCase().replace(/-/g, "")
  )
    throw Error(
      `Identity mismatch ${p.nickname} ${p.hltvId} ${profile?.nickname}`,
    );
  const birth = profile.birthDate
    ? new Date(Date.parse(profile.birthDate + " UTC"))
        .toISOString()
        .slice(0, 10)
    : null;
  return {
    ...p,
    nickname: profile.nickname,
    realName: profile.realName,
    country: profile.country || p.country,
    countryCode: profile.countryCode || p.countryCode,
    profileUrl: profile.canonical || p.profileUrl,
    birthDate: birth,
    legend: priorities.includes(profile.nickname.toLowerCase()),
    sources: [
      ...p.sources,
      {
        url: profile.canonical || p.profileUrl,
        checkedAt: "2026-10-21",
        kind: "player-profile-name-and-birthdate",
      },
    ],
    photoIds: [],
  };
});
const byId = new Map(players.map((p) => [p.id, p]));
const teams = seedTeams.map((t) => {
  const id = +t.url.split("/")[4];
  const ids = t.players.map((p) => `hltv-${p.url.split("/")[4]}`);
  const check = rosterChecks.find((c) => c.url === t.url);
  const matches =
    check?.roster?.length === 5 &&
    check.roster.every((p) => ids.includes(`hltv-${p.id}`));
  return {
    id: `hltv-team-${id}`,
    hltvId: id,
    name: t.name,
    rank: t.rank,
    points: t.points,
    snapshotDate: "2026-10-19",
    sourceUrl: t.url,
    playerIds: ids,
    rosterVerified: !!matches,
    ...(!matches
      ? { note: "排名阵容与 2026-10-21 队伍资料页存在差异，保留排名快照" }
      : {}),
  };
});
let processed = fs.existsSync("research/processed-photos.json")
  ? read("research/processed-photos.json")
  : [];
const approvals = fs.existsSync("research/photo-review.json")
  ? read("research/photo-review.json")
  : { approved: [], rejected: {} };
processed = processed.filter((ph) => approvals.approved.includes(ph.id));
function dateInfo(ph, p) {
  let raw = ph.metadata.DateTimeOriginal || "";
  let capturedAt = null,
    precision = "unknown",
    year = null,
    age = null;
  const clean = raw.replace(/<[^>]*>/g, "").trim();
  const iso = clean.match(/^(20\d{2}|19\d{2})-(\d{2})-(\d{2})/);
  if (iso) {
    capturedAt = iso[0];
    precision = "day";
    year = +iso[1];
  } else {
    const yrs =
      clean.match(/\b(19\d\d|20\d\d)\b/) ||
      ph.title.match(/\b(19\d\d|20\d\d)\b/);
    if (yrs) {
      year = +yrs[1];
      precision = "year";
      capturedAt = String(year);
    }
  }
  if (year !== null && (year > 2026 || year < 1970)) return null;
  const video =
    /Media from YouTube|Still images of YouTube|youtube\.com|youtu\.be/i.test(
      (ph.metadata.Categories || "") + " " + (ph.metadata.Credit || ""),
    );
  if (video && year !== null) {
    precision = "year";
    capturedAt = null;
  }
  if (precision === "day" && p.birthDate) {
    const d = new Date(capturedAt + "T00:00:00Z"),
      b = new Date(p.birthDate + "T00:00:00Z");
    age =
      d.getUTCFullYear() -
      b.getUTCFullYear() -
      (d.getUTCMonth() < b.getUTCMonth() ||
      (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())
        ? 1
        : 0);
    if (age < 12 || age > 65) return null;
  }
  const period =
    age === null
      ? "undated"
      : age < 20
        ? "debut"
        : age < 24
          ? "young"
          : age < 28
            ? "prime"
            : age < 32
              ? "veteran"
              : "legend";
  return {
    capturedAt,
    datePrecision: precision,
    year,
    age,
    period,
    dateNote: video
      ? "年份来自源视频发布或赛事说明；无法确认精确拍摄日期，未推算年龄。"
      : precision === "day"
        ? "拍摄日期来自原文件的时间与来源记录。"
        : "仅核实年份，未推算拍摄年龄。",
  };
}
const photos = [];
const seen = new Set();
for (const ph of processed) {
  const p = byId.get(ph.playerId);
  if (!p) continue;
  const dt = dateInfo(ph, p);
  if (!dt) continue;
  const dup = `${p.id}-${ph.info.sha1}`;
  if (seen.has(dup)) continue;
  seen.add(dup);
  const meta = ph.metadata;
  const cats = meta.Categories || "";
  let teamAtTime = null;
  const matched = cats.match(
    /(?:^|\|)([^|]+) at (?:Intel Extreme Masters|DreamHack|World Cyber Games)/i,
  );
  if (matched) teamAtTime = matched[1];
  photos.push({
    id: ph.id,
    playerId: p.id,
    ...dt,
    teamAtTime,
    sourceUrl:
      ph.info.descriptionurl ||
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(ph.title.replace(/ /g, "_"))}`,
    originalUrl: ph.info.url,
    title: ph.title,
    photographer: meta.Artist,
    license: meta.LicenseShortName,
    licenseUrl: meta.LicenseUrl || "https://creativecommons.org/licenses/",
    identityVerified: true,
    identityEvidence:
      ph.identityEvidence + "；已人工检查缩略图中的单一主体与裁切",
    reviewStatus: "reviewed",
    localPath: ph.localPath,
    cardPath: ph.cardPath,
    isDefault: false,
    sha256: ph.sha256,
    width: ph.width,
    height: ph.height,
    alterations:
      "仅使用原始照片裁切、按比例缩放并转换为 WebP；未生成或重塑五官。裁切框 " +
      JSON.stringify(ph.crop),
    originalSha1: ph.info.sha1,
  });
}
if (fs.existsSync("research/hltv-approved-photos.json"))
  photos.push(...read("research/hltv-approved-photos.json"));
if (fs.existsSync("research/hltv-gallery-approved-photos.json"))
  photos.push(...read("research/hltv-gallery-approved-photos.json"));
if (fs.existsSync("research/hltv-priority-approved-portraits.json"))
  photos.push(...read("research/hltv-priority-approved-portraits.json"));
if (fs.existsSync("research/top20-approved-portraits.json"))
  photos.push(...read("research/top20-approved-portraits.json"));
if (fs.existsSync("research/reframed-photos.json")) {
  const framing = new Map(read("research/reframed-photos.json").map(ph => [ph.id, ph]));
  for (const ph of photos) if (framing.has(ph.id)) Object.assign(ph, framing.get(ph.id));
}
// A known event year gives an age interval, never a fabricated capture day.
// Assign an age group only when both ends of that interval fall in the same group.
for (const ph of photos) {
  const birth = byId.get(ph.playerId)?.birthDate;
  if (ph.age !== null || !ph.year || ph.sourcePlatform !== "HLTV" || !ph.sourceUrl.includes("/gallery/view/")) continue;
  const classification = classifyEventYear(ph.year, birth);
  if (classification) Object.assign(ph, classification);
}
const editorialPrimaries = new Set(fs.existsSync('research/hltv-priority-review.json')
  ? read('research/hltv-priority-review.json').primaryPortraits?.map(id=>'hltv-gallery-'+id) || [] : []);
for (const p of players) {
  const ps = photos
    .filter((ph) => ph.playerId === p.id)
    .sort((a, b) => (b.year || 0) - (a.year || 0));
  p.photoIds = ps.map((ph) => ph.id);
  const editorialPrimary=ps.find(ph=>editorialPrimaries.has(ph.id));
  if(editorialPrimary) for(const ph of ps) ph.isPrimary=ph.id===editorialPrimary.id;
  const periods = new Set();
  for (const ph of ps) {
    if (!periods.has(ph.period)) {
      ph.isDefault = true;
      periods.add(ph.period);
    }
  }
  if (!ps.length)
    p.missingReason =
      "尚未取得通过个人档案身份映射与人脸清晰度检查的照片；不使用相似人物补位。";
}
// First candidate in the latest verified period is the initial card representative; users can change it.
const notes = [
  `收录 ${players.length} 位独立选手、${teams.length} 支快照队伍；Top 20 的 100 个位置均以 2026-10-19 排名和 2026-10-21 队伍资料页交叉核对。`,
  `当前个人照片 ${photos.length} 张，覆盖 ${players.filter((p) => p.photoIds.length).length} 位选手。Top20 逐年覆盖以专门的缺口报告为准，不把头像覆盖当作历年素材齐全。`,
  `照片来源包括 HLTV 个人档案与 Wikimedia Commons。HLTV 素材按项目所有者的使用权限声明纳入，保留版权，未声称取得平台官方授权。Commons 照片保留各自公开许可。`,
  `HLTV 档案核对日期不是拍摄日期，无法核实拍摄日期的头像不推算年龄。某些采访截图仅有发表年份，此类素材按已知年份浏览，年龄未核实的单独标注。`,
  `“现役阵容快照”表示属于本次收录的排名阵容；“历史补充档案”包含退役、转型及不在所收录阵容中的选手，不对其当前职业状态作推断。`,
  `照片身份依据 Commons 专属人物分类 / 文件标题与 HLTV 档案映射，并逐张检查可见主体。人脸检测仅用于裁切，不能证明身份。`,
  `3DMAX 的原核心选手目前以 Envy 名义出现在排名快照中；Eternal Fire 同时保留当前阵容与原土耳其核心人物，不沿用旧队籍。`,
];
const catalogue = {
  version: "1.4.0-web",
  snapshotDate: "2026-10-19",
  collectedAt: "2026-10-21",
  rankingSource: "https://www.hltv.org/ranking/teams/2026/october/19",
  players,
  teams,
  memberships: teams.flatMap((t) =>
    t.playerIds.map((playerId) => ({
      playerId,
      teamId: t.id,
      observedAt: "2026-10-19",
      sourceUrl: "https://www.hltv.org/ranking/teams/2026/october/19",
      kind: "ranking-snapshot",
    })),
  ),
  photos,
  album: [...(fs.existsSync('research/album-approved.json') ? read('research/album-approved.json') : []),...(fs.existsSync('research/hltv-priority-approved-album.json') ? read('research/hltv-priority-approved-album.json') : [])],
  notes,
};
fs.writeFileSync("src/data/catalogue.json", JSON.stringify(catalogue, null, 2));
fs.mkdirSync("public/data", { recursive: true });
for (const [name, value] of Object.entries({
  players,
  teams,
  photos,
  memberships: catalogue.memberships,
}))
  fs.writeFileSync(`public/data/${name}.json`, JSON.stringify(value, null, 2));
console.log({
  players: players.length,
  teams: teams.length,
  top20: teams.filter((t) => t.rank <= 20).length,
  rosterVerified: teams.filter((t) => t.rosterVerified).length,
  chinese: players.filter((p) => p.countryCode === "CN").length,
  photos: photos.length,
  withPhotos: players.filter((p) => p.photoIds.length).length,
});
