export type PeriodKey =
  "debut" | "young" | "prime" | "veteran" | "legend" | "undated";
export interface Source {
  url: string;
  checkedAt: string;
  kind: string;
}
export interface Player {
  id: string;
  hltvId: number;
  nickname: string;
  realName: string;
  country: string;
  countryCode: string;
  profileUrl: string;
  teamId: string | null;
  collection: "current" | "legacy";
  birthDate: string | null;
  legend: boolean;
  sources: Source[];
  photoIds: string[];
  missingReason?: string;
}
export interface Team {
  id: string;
  hltvId: number;
  name: string;
  rank: number | null;
  points: number | null;
  snapshotDate: string;
  sourceUrl: string;
  playerIds: string[];
  rosterVerified: boolean;
  note?: string;
}
export interface TeamMembership {
  playerId: string;
  teamId: string;
  observedAt: string;
  sourceUrl: string;
  kind: "ranking-snapshot" | "profile-observation";
}
export interface PlayerPhoto {
  id: string;
  playerId: string;
  year: number | null;
  capturedAt: string | null;
  datePrecision: "day" | "year" | "unknown";
  dateNote?: string;
  age: number | null;
  framing?: "full-frame" | "portrait";
  ageRange?: [number, number];
  periodBasis?: "year-range";
  periodEvidence?: string;
  period: PeriodKey;
  teamAtTime: string | null;
  sourceUrl: string;
  originalUrl: string;
  title: string;
  photographer: string;
  license: string;
  licenseUrl: string;
  licenseStatus?: "open-license" | "user-declared";
  sourcePlatform?: "Wikimedia Commons" | "HLTV";
  sourceCheckedAt?: string;
  isPrimary?: boolean;
  identityVerified: boolean;
  identityEvidence: string;
  reviewStatus: "reviewed";
  localPath: string;
  cardPath: string;
  isDefault: boolean;
  sha256: string;
  width: number;
  height: number;
  alterations: string;
  originalSha1: string;
}
export interface AlbumPhoto {
  id: string;
  sourcePhotoId: string;
  playerIds: string[];
  year: number;
  datePrecision: "year";
  yearEvidence: string;
  dateNote: string;
  title: string;
  event: string;
  caption?: string;
  kind: "group" | "scene";
  sourceUrl: string;
  originalUrl: string;
  photographer: string;
  license: string;
  licenseUrl: string;
  licenseStatus: "open-license" | "user-declared";
  sourcePlatform: "HLTV" | "Wikimedia Commons";
  subjectEvidence: string;
  subjectScope: string;
  localPath: string;
  cardPath: string;
  width: number;
  height: number;
  sha256: string;
  originalSha1: string;
  reviewStatus: "reviewed";
  sourceCheckedAt: string;
  reviewedAt: string;
  alterations: string;
}
export interface Dataset {
  version: string;
  snapshotDate: string;
  collectedAt: string;
  rankingSource: string;
  players: Player[];
  teams: Team[];
  memberships: TeamMembership[];
  photos: PlayerPhoto[];
  album: AlbumPhoto[];
  notes: string[];
}
export interface Rating {
  playerId: string;
  mode: "overall" | "period";
  period?: PeriodKey;
  value: 1 | 2 | 3 | 4 | 5;
  photoId?: string;
  updatedAt: string;
}
export interface Filters {
  query: string;
  team: string;
  country: string;
  collection: string;
  rank: string;
  photoOnly: boolean;
  unratedOnly: boolean;
}
export interface UserSettings {
  theme: "light" | "dark" | "system";
  blind: boolean;
  mode: "overall" | "period";
  filters: Filters;
  sort: "featured" | "name" | "rating" | "shuffle";
  shuffleSeed: number;
}
export interface UserData {
  schemaVersion: 1;
  ratings: Rating[];
  representatives: Record<string, string>;
  periodRepresentatives: Record<string, string>;
  settings: UserSettings;
  updatedAt: string;
}
