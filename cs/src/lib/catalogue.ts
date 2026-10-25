import raw from "../data/catalogue.json";
import type { Dataset, Player, PlayerPhoto, PeriodKey } from "../types";
export const data = raw as Dataset;
export const playersById = new Map(data.players.map((p) => [p.id, p]));
export const teamsById = new Map(data.teams.map((p) => [p.id, p]));
export const photosById = new Map(data.photos.map((p) => [p.id, p]));
export const periods: Record<PeriodKey, { label: string; range: string }> = {
  debut: { label: "19 岁及以下", range: "19 岁及以下" },
  young: { label: "20–23 岁", range: "20–23 岁" },
  prime: { label: "24–27 岁", range: "24–27 岁" },
  veteran: { label: "28–31 岁", range: "28–31 岁" },
  legend: { label: "32 岁及以上", range: "32 岁及以上" },
  undated: { label: "年龄未核实", range: "仅有年份或未公开日期，不推算年龄" },
};
export const periodOrder: PeriodKey[] = [
  "debut",
  "young",
  "prime",
  "veteran",
  "legend",
  "undated",
];
export function playerPhotos(p: Player) {
  return p.photoIds
    .map((id) => photosById.get(id))
    .filter((p): p is PlayerPhoto => !!p)
    .sort(
      (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.id.localeCompare(b.id),
    );
}
export function representative(p: Player, selected: Record<string, string>) {
  const chosen = photosById.get(selected[p.id]);
  if (chosen?.playerId === p.id) return chosen;
  const all = playerPhotos(p);
  const portraits = all.filter(ph => ph.framing !== "full-frame");
  const latestDefault = (photos: PlayerPhoto[]) => photos.filter(ph => ph.isDefault).sort((a,b) => (b.year ?? 0) - (a.year ?? 0))[0];
  return portraits.find(ph => ph.isPrimary) || latestDefault(portraits) || portraits.at(-1) || latestDefault(all) || all.at(-1);
}

declare global {
  interface Window {
    __OFFLINE_IMAGES__?: Record<string, string>;
  }
}
export function asset(path: string) {
  return window.__OFFLINE_IMAGES__?.[path] ?? `./${path}`;
}
export function flag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)))
    : "◌";
}
export const teamName = (p: Player) =>
  p.teamId ? (teamsById.get(p.teamId)?.name ?? "队伍待核实") : "历史名将档案";
export function mean(values: number[]) {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}
