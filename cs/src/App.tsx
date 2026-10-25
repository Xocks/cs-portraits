import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Focus,
  Grid2X2,
  Image,
  Info,
  LoaderCircle,
  Moon,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  X,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  data,
  playersById,
  teamName,
  teamsById,
  representative,
  playerPhotos,
  flag,
  periods,
} from "./lib/catalogue";
import {
  initialData,
  readState,
  writeState,
  defaultSettings,
  type StorageStatus,
} from "./lib/storage";
import { csv, download, parseBackup, mergeBackup } from "./lib/transfer";
import type {
  Filters,
  Player,
  PlayerPhoto,
  PeriodKey,
  Rating,
  UserData,
  UserSettings,
} from "./types";
import { PlayerCard } from "./components/PlayerCard";
import { PlayerDetail } from "./components/PlayerDetail";
import { Portrait } from "./components/Portrait";
import { Rankings } from "./components/Rankings";
import { DataPanel } from "./components/DataPanel";
import { EventAlbum } from "./components/EventAlbum";
const featured = [
  "s1mple",
  "NiKo",
  "ZywOo",
  "device",
  "Twistzz",
  "kennyS",
  "donk",
  "m0NESY",
  "shroud",
  "f0rest",
  "FalleN",
  "olofmeister",
];
function hash(s: string, seed: number) {
  let h = seed;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}
export default function App() {
  const [offlineReady, setOfflineReady] = useState(
    location.protocol === "file:" || !!window.__OFFLINE_IMAGES__,
  );
  const [user, setUser] = useState<UserData>(initialData);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState<StorageStatus>("memory");
  const [saveState, setSaveState] = useState("正在读取");
  const [page, setPage] = useState<
    "collection" | "album" | "rankings" | "data"
  >("collection");
  const [selected, setSelected] = useState<Player | null>(null);
  const [albumPlayer, setAlbumPlayer] = useState("all");
  const [toast, setToast] = useState("");
  const [limit, setLimit] = useState(24);
  const [expanded, setExpanded] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const collectionRef = useRef<HTMLElement>(null);
  const importPending = useRef(false);
  const s = user.settings;
  const uniquePhotos = new Set([
    ...data.photos.map((p) => p.id),
    ...data.album.map((p) => p.sourcePhotoId),
  ]).size;
  const filters = s.filters;
  useEffect(() => {
    const ready = () => setOfflineReady(true);
    window.addEventListener("frame-offline-ready", ready);
    return () => window.removeEventListener("frame-offline-ready", ready);
  }, []);
  useEffect(() => {
    let mounted = true;
    readState().then((r) => {
      if (mounted) {
        setUser(r.data);
        setStorage(r.storage);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setSaveState("正在保存");
    let active = true;
    writeState(user).then((status) => {
      if (active) {
        setStorage(status);
        setSaveState(status === "memory" ? "请导出保存" : "已自动保存");
      }
    });
    return () => {
      active = false;
    };
  }, [user, ready]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        s.theme === "system" ? (media.matches ? "dark" : "light") : s.theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [s.theme]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    setLimit(24);
  }, [
    filters.query,
    filters.team,
    filters.country,
    filters.collection,
    filters.rank,
    filters.photoOnly,
    filters.unratedOnly,
    s.sort,
    s.shuffleSeed,
  ]);
  function update(fn: (u: UserData) => UserData) {
    setUser((u) => ({ ...fn(u), updatedAt: new Date().toISOString() }));
  }
  function setting(patch: Partial<UserSettings>) {
    update((u) => ({ ...u, settings: { ...u.settings, ...patch } }));
  }
  function filter(patch: Partial<Filters>) {
    update((u) => ({
      ...u,
      settings: { ...u.settings, filters: { ...u.settings.filters, ...patch } },
    }));
  }
  function rate(p: Player, value: 1 | 2 | 3 | 4 | 5, photo?: PlayerPhoto) {
    if (s.mode === "period" && !photo) {
      setToast("这位选手暂无可核实的照片时期");
      return;
    }
    const rating: Rating = {
      playerId: p.id,
      mode: s.mode,
      value,
      updatedAt: new Date().toISOString(),
      ...(s.mode === "period" ? { period: photo!.period } : {}),
      ...(photo ? { photoId: photo.id } : {}),
    };
    update((u) => ({
      ...u,
      ratings: [
        ...u.ratings.filter(
          (r) =>
            !(
              r.playerId === p.id &&
              r.mode === rating.mode &&
              (r.mode === "overall" || r.period === rating.period)
            ),
        ),
        rating,
      ],
    }));
    setToast(
      `${s.blind ? "匿名选手" : p.nickname} · ${s.mode === "period" ? periods[photo!.period].label : "整体印象"} ${value} 分，已记录`,
    );
  }
  function clear(p: Player, period?: PeriodKey) {
    update((u) => ({
      ...u,
      ratings: u.ratings.filter(
        (r) =>
          !(
            r.playerId === p.id &&
            r.mode === s.mode &&
            (r.mode === "overall" || r.period === period)
          ),
      ),
    }));
    setToast("已撤销，可随时重新评分");
  }
  function selectPhoto(p: Player, ph: PlayerPhoto) {
    update((u) => ({
      ...u,
      representatives: { ...u.representatives, [p.id]: ph.id },
      periodRepresentatives: {
        ...u.periodRepresentatives,
        [`${p.id}:${ph.period}`]: ph.id,
      },
    }));
    setToast("代表照已保存，图鉴卡片同步更新");
  }
  function exportData(type: "json" | "csv") {
    download(
      `CS选手图鉴-${new Date().toLocaleDateString("sv-SE")}.${type}`,
      type === "json"
        ? JSON.stringify(
            {
              ...user,
              datasetVersion: data.version,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          )
        : csv(user, data),
      type === "json" ? "application/json" : "text/csv;charset=utf-8",
    );
    setExportOpen(false);
    setToast(
      type === "json" ? "JSON 备份已导出，可用于恢复评分" : "CSV 已导出",
    );
  }
  async function importData(file?: File) {
    if (!file || importPending.current) return;
    importPending.current = true;
    try {
      if (file.size > 8e6) throw Error("备份文件过大，请选择小于 8 MB 的 JSON");
      const incoming = parseBackup(await file.text(), data);
      update((u) => mergeBackup(u, incoming));
      setToast(`已合并 ${incoming.ratings.length} 条评分和代表照`);
    } catch (e) {
      setToast(`导入失败：${e instanceof Error ? e.message : "文件无法读取"}`);
    } finally {
      if (importRef.current) importRef.current.value = "";
      importPending.current = false;
    }
  }
  function start(blind = false) {
    setPage("collection");
    if (blind) setting({ blind: true });
    requestAnimationFrame(() =>
      collectionRef.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }
  const ratedCount = new Set(
    user.ratings.filter((r) => r.mode === s.mode).map((r) => r.playerId),
  ).size;
  const totalPeriods = data.players.reduce(
    (n, p) => n + new Set(playerPhotos(p).map((ph) => ph.period)).size,
    0,
  );
  const ratingCount = user.ratings.filter((r) => r.mode === s.mode).length;
  const progressTotal =
    s.mode === "overall" ? data.players.length : totalPeriods;
  const progress = progressTotal ? (ratingCount / progressTotal) * 100 : 0;
  const countries = useMemo(
    () =>
      [
        ...new Map(
          data.players
            .filter((p) => p.countryCode)
            .map((p) => [p.countryCode, p.country]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [],
  );
  const filtered = useMemo(() => {
    const q = filters.query.toLowerCase().trim();
    const list = data.players.filter((p) => {
      const team = p.teamId ? teamsById.get(p.teamId) : null;
      const photo = representative(p, user.representatives);
      const rated = user.ratings.some(
        (r) =>
          r.playerId === p.id &&
          r.mode === s.mode &&
          (r.mode === "overall" || r.period === photo?.period),
      );
      return (
        (!q ||
          [p.nickname, p.realName, teamName(p), String(p.hltvId), p.id].some(
            (x) => x.toLowerCase().includes(q),
          )) &&
        (filters.team === "all" || p.teamId === filters.team) &&
        (filters.country === "all" || p.countryCode === filters.country) &&
        (filters.collection === "all" ||
          (filters.collection === "legend"
            ? p.legend
            : p.collection === filters.collection)) &&
        (filters.rank === "all" ||
          (filters.rank === "outside"
            ? !team?.rank || team.rank > 20
            : !!team?.rank && team.rank <= Number(filters.rank))) &&
        (!filters.photoOnly || !!p.photoIds.length) &&
        (!filters.unratedOnly || !rated)
      );
    });
    const scores = new Map(
      data.players.map((p) => [
        p.id,
        user.ratings.find(
          (r) =>
            r.playerId === p.id &&
            r.mode === s.mode &&
            (r.mode === "overall" ||
              r.period === representative(p, user.representatives)?.period),
        )?.value,
      ]),
    );
    return list.sort((a, b) => {
      if (s.sort === "name") return a.nickname.localeCompare(b.nickname);
      if (s.sort === "rating")
        return (
          (scores.get(b.id) ?? -1) - (scores.get(a.id) ?? -1) ||
          a.nickname.localeCompare(b.nickname)
        );
      if (s.sort === "shuffle")
        return hash(a.id, s.shuffleSeed) - hash(b.id, s.shuffleSeed);
      const ai = featured.indexOf(a.nickname),
        bi = featured.indexOf(b.nickname);
      return (
        (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) ||
        (teamsById.get(a.teamId || "")?.rank ?? 999) -
          (teamsById.get(b.teamId || "")?.rank ?? 999) ||
        a.nickname.localeCompare(b.nickname)
      );
    });
  }, [
    filters,
    s.sort,
    s.shuffleSeed,
    s.mode,
    user.ratings,
    user.representatives,
  ]);
  const heroPeople = ["NiKo", "s1mple", "ZywOo"]
    .map((n) => data.players.find((p) => p.nickname === n && p.photoIds.length))
    .filter((p): p is Player => !!p);
  const fallbackHero =
    heroPeople.length === 3
      ? heroPeople
      : data.players.filter((p) => p.photoIds.length).slice(0, 3);
  if (!ready)
    return (
      <div className="app-loading">
        <Focus size={40} />
        <span>CS 选手图鉴</span>
        <LoaderCircle className="spin" size={18} />
      </div>
    );
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <header className="site-header">
          <div className="header-inner">
            <button
              className="brand"
              onClick={() => {
                setPage("collection");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label="CS 选手图鉴首页"
            >
              <span className="brand-mark">
                <Focus size={25} strokeWidth={2.4} />
              </span>
              <strong>
                CS 选手图鉴<span>PLAYER ATLAS</span>
              </strong>
            </button>
            <span className="edition">
              <i />
              COUNTER-STRIKE ARCHIVE
            </span>
            <nav className="main-nav" aria-label="主导航">
              {(
                [
                  ["collection", "选手图鉴"],
                  ["album", "赛事相册"],
                  ["rankings", "我的榜单"],
                  ["data", "资料与备份"],
                ] as const
              ).map(([key, label]) => (
                <button
                  onClick={() => {
                    setPage(key);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  key={key}
                  className={page === key ? "active" : ""}
                >
                  {label}
                  {page === key && (
                    <motion.i
                      layoutId="nav-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>
            <div className="header-actions">
              <span className="save-status">
                <i className={storage === "memory" ? "warning" : ""} />
                {saveState}
              </span>
              <button
                className="icon-button theme-toggle"
                onClick={() =>
                  setting({
                    theme:
                      document.documentElement.dataset.theme === "dark"
                        ? "light"
                        : "dark",
                  })
                }
                aria-label="切换浅色或深色模式"
              >
                {document.documentElement.dataset.theme === "dark" ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>
              <div className="export-wrap">
                <button
                  className="backup-button"
                  onClick={() => setExportOpen(!exportOpen)}
                  aria-expanded={exportOpen}
                >
                  <ArrowDownToLine size={15} />
                  <span>备份</span>
                  <ChevronDown size={13} />
                </button>
                {exportOpen && (
                  <>
                    <button
                      className="menu-dismiss"
                      aria-label="关闭备份菜单"
                      onClick={() => setExportOpen(false)}
                    />
                    <div className="export-menu">
                      <button onClick={() => exportData("json")}>
                        <FileJson size={15} />
                        导出 JSON 备份
                      </button>
                      <button onClick={() => exportData("csv")}>
                        <FileSpreadsheet size={15} />
                        导出 CSV 表格
                      </button>
                      <button
                        onClick={() => {
                          setExportOpen(false);
                          importRef.current?.click();
                        }}
                      >
                        <Upload size={15} />
                        导入评分备份
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        <input
          type="file"
          accept=".json,application/json"
          ref={importRef}
          className="sr-only"
          aria-label="导入 JSON 评分文件"
          onChange={(e) => importData(e.target.files?.[0])}
        />
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              {page === "collection" ? (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="hero-label"
                      >
                        <span>THE FACE BEHIND THE GAME</span>
                        <i />
                        选手 · 年份 · 个人评分
                      </motion.div>
                      <motion.h1
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.6 }}
                      >
                        名字之外，
                        <br />
                        <span className="highlight-word">看看本人。</span>
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      >
                        按年份查看照片，
                        <br />
                        选择代表照，记录你的评分。
                      </motion.p>
                      <motion.div
                        className="hero-actions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 }}
                      >
                        <button
                          className="primary-button"
                          onClick={() => start()}
                        >
                          浏览选手 <ArrowUpRight size={17} />
                        </button>
                        <button
                          className="hero-blind"
                          onClick={() => start(true)}
                        >
                          <EyeOff size={16} />
                          匿名评分 <ArrowRight size={14} />
                        </button>
                      </motion.div>
                      <div className="hero-footnote">
                        <ShieldCheck size={13} />
                        照片附来源与年份 <span />
                        评分仅保存在你的浏览器
                      </div>
                    </div>
                    <div className="hero-art" aria-label="精选职业选手人像">
                      <div className="hero-orbit orbit-one" />
                      <div className="hero-orbit orbit-two" />
                      <span className="hero-coordinate top">
                        PORTRAITS / THROUGH THE YEARS
                      </span>
                      <div className="portrait-stack">
                        {fallbackHero.map((p, i) => {
                          const ph = representative(p, user.representatives);
                          return (
                            <motion.button
                              key={p.id}
                              className={`hero-portrait hero-portrait-${i}`}
                              onClick={() => setSelected(p)}
                              aria-label={
                                s.blind
                                  ? "查看精选匿名人像"
                                  : `查看 ${p.nickname}`
                              }
                              initial={{ opacity: 0, y: 50, rotate: 0 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                rotate: [-12, 3, 12][i],
                              }}
                              whileHover={{
                                y: -14,
                                rotate: 0,
                                scale: 1.035,
                                zIndex: 8,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 20,
                                delay: 0.18 + i * 0.1,
                              }}
                            >
                              <Portrait
                                photo={ph}
                                alt={s.blind ? "精选匿名人像" : p.nickname}
                                eager
                              />
                              <div className="hero-portrait-caption">
                                <span>{s.blind ? "匿名选手" : p.nickname}</span>
                                <small>
                                  {ph?.year ?? "—"}
                                  {ph?.age !== null && ph?.age !== undefined
                                    ? ` / ${ph.age} Y.O.`
                                    : ""}
                                </small>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                      <motion.span
                        className="hero-sticker"
                        initial={{ opacity: 0, scale: 0.7, rotate: 8 }}
                        animate={{ opacity: 1, scale: 1, rotate: -6 }}
                        transition={{ delay: 0.6, type: "spring" }}
                      >
                        <Sparkles size={15} />
                        历年选手照片
                      </motion.span>
                      <span className="hero-coordinate bottom">
                        100% REAL FACES <span>100% YOUR TASTE</span>
                      </span>
                    </div>
                  </section>
                  <section
                    className="archive-overview"
                    aria-label="档案覆盖统计"
                  >
                    <div>
                      <strong>{data.players.length}</strong>
                      <span>
                        职业选手
                        <span className="stats-detail">独立人物档案</span>
                      </span>
                    </div>
                    <div>
                      <strong>
                        20<span>/20</span>
                      </strong>
                      <span>
                        世界前二十
                        <span className="stats-detail">100 个阵容位置</span>
                      </span>
                    </div>
                    <div>
                      <strong>{uniquePhotos}</strong>
                      <span>
                        不同原片
                        <span className="stats-detail">
                          含 {data.album.length} 张完整赛事照
                        </span>
                      </span>
                    </div>
                    <div>
                      <strong className="snapshot-number">
                        10.19<span>2026</span>
                      </strong>
                      <span>
                        阵容快照
                        <span className="stats-detail">HLTV 世界排名</span>
                      </span>
                    </div>
                    <button onClick={() => setPage("data")}>
                      <span>关于这份图鉴</span>
                      <ArrowUpRight size={17} />
                    </button>
                  </section>
                  <section
                    className="collection-section"
                    ref={collectionRef}
                    id="collection"
                  >
                    <div className="collection-heading">
                      <div>
                        <div className="eyebrow">
                          <span className="tiny-squares">▦</span>THE COLLECTION
                        </div>
                        <h2>
                          全部选手<span>{filtered.length}</span>
                        </h2>
                      </div>
                      <div className="rating-mode-control">
                        <span>评分模式</span>
                        <div className="mode-toggle">
                          <button
                            className={s.mode === "overall" ? "active" : ""}
                            onClick={() => setting({ mode: "overall" })}
                          >
                            整体印象
                          </button>
                          <button
                            className={s.mode === "period" ? "active" : ""}
                            onClick={() => setting({ mode: "period" })}
                          >
                            分时期
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="collection-toolbar">
                      <div className="quick-filters">
                        <button
                          className={
                            filters.collection === "all" &&
                            filters.country === "all" &&
                            filters.rank === "all"
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            filter({
                              collection: "all",
                              country: "all",
                              rank: "all",
                              team: "all",
                            })
                          }
                        >
                          全部选手
                        </button>
                        <button
                          className={filters.rank === "20" ? "active" : ""}
                          onClick={() =>
                            filter({
                              rank: filters.rank === "20" ? "all" : "20",
                              collection: "all",
                              team: "all",
                            })
                          }
                        >
                          世界 TOP 20
                        </button>
                        <button
                          className={
                            filters.collection === "legend" ? "active" : ""
                          }
                          onClick={() =>
                            filter({
                              collection:
                                filters.collection === "legend"
                                  ? "all"
                                  : "legend",
                              rank: "all",
                              team: "all",
                            })
                          }
                        >
                          历史名将
                        </button>
                        <button
                          className={filters.country === "CN" ? "active" : ""}
                          onClick={() =>
                            filter({
                              country: filters.country === "CN" ? "all" : "CN",
                              rank: "all",
                              team: "all",
                            })
                          }
                        >
                          中国选手
                          <span className="china-dot" />
                        </button>
                      </div>
                      <label className="search-input">
                        <Search size={16} />
                        <input
                          aria-label="搜索选手 ID、真实姓名或队伍"
                          placeholder="搜索 ID、姓名、队伍…"
                          value={filters.query}
                          onChange={(e) => filter({ query: e.target.value })}
                        />
                        {filters.query && (
                          <button
                            onClick={() => filter({ query: "" })}
                            aria-label="清空搜索"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </label>
                    </div>
                    <div className="filter-row">
                      <div
                        className={`dropdown-filters ${expanded ? "expanded" : ""}`}
                      >
                        <label>
                          <span className="sr-only">按战队筛选</span>
                          <select
                            aria-label="按战队筛选"
                            value={filters.team}
                            onChange={(e) => filter({ team: e.target.value })}
                          >
                            <option value="all">所有战队</option>
                            {data.teams.map((t) => (
                              <option value={t.id} key={t.id}>
                                #{t.rank} {t.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <select
                            aria-label="按世界排名筛选"
                            value={filters.rank}
                            onChange={(e) => filter({ rank: e.target.value })}
                          >
                            <option value="all">世界排名</option>
                            <option value="5">Top 5</option>
                            <option value="10">Top 10</option>
                            <option value="20">Top 20</option>
                            <option value="outside">
                              Top 20 之外 / 无快照队伍
                            </option>
                          </select>
                        </label>
                        <label>
                          <select
                            aria-label="按国籍筛选"
                            value={filters.country}
                            onChange={(e) =>
                              filter({ country: e.target.value })
                            }
                          >
                            <option value="all">所有国籍</option>
                            {countries.map(([code, name]) => (
                              <option key={code} value={code}>
                                {flag(code)} {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <select
                            aria-label="按收录分组筛选"
                            value={filters.collection}
                            onChange={(e) =>
                              filter({ collection: e.target.value })
                            }
                          >
                            <option value="all">所有档案</option>
                            <option value="current">现役阵容快照</option>
                            <option value="legend">历史名将（含在役）</option>
                            <option value="legacy">历史补充档案</option>
                          </select>
                        </label>
                      </div>
                      <button
                        className="mobile-filter-button"
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                      >
                        <SlidersHorizontal size={15} />
                        筛选
                        <ChevronDown size={12} />
                      </button>
                      <div className="view-controls">
                        <button
                          className={`blind-button ${s.blind ? "enabled" : ""}`}
                          onClick={() => setting({ blind: !s.blind })}
                          aria-pressed={s.blind}
                        >
                          {s.blind ? <EyeOff size={15} /> : <Eye size={15} />}
                          <span>盲评</span>
                          <i />
                        </button>
                        <button
                          className="shuffle-button"
                          onClick={() => {
                            setting({
                              sort: "shuffle",
                              shuffleSeed: Math.floor(Math.random() * 1e8),
                            });
                            setToast("已随机排列选手");
                          }}
                        >
                          <Shuffle size={15} />
                          <span>随机</span>
                        </button>
                        <select
                          aria-label="选手排序"
                          value={s.sort}
                          onChange={(e) =>
                            setting({
                              sort: e.target.value as UserSettings["sort"],
                            })
                          }
                        >
                          <option value="featured">精选顺序</option>
                          <option value="name">按 ID 字母</option>
                          <option value="rating">按我的评分</option>
                          <option value="shuffle">随机顺序</option>
                        </select>
                      </div>
                    </div>
                    <div className="collection-info">
                      <div>
                        <label>
                          <input
                            type="checkbox"
                            checked={filters.photoOnly}
                            onChange={(e) =>
                              filter({ photoOnly: e.target.checked })
                            }
                          />
                          仅显示有照片的选手
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={filters.unratedOnly}
                            onChange={(e) =>
                              filter({ unratedOnly: e.target.checked })
                            }
                          />
                          只看未评分
                        </label>
                      </div>
                      <span>
                        {s.blind
                          ? "盲评已开启 · 姓名与队伍已隐藏"
                          : s.mode === "overall"
                            ? "查看照片，为选手评分"
                            : "卡片评分对应当前代表照所在时期"}
                      </span>
                    </div>
                    {filtered.length ? (
                      <>
                        <div className="player-grid">
                          {filtered.slice(0, limit).map((p, i) => {
                            const ph = representative(p, user.representatives);
                            return (
                              <PlayerCard
                                key={p.id}
                                index={data.players.indexOf(p)}
                                player={p}
                                photo={ph}
                                settings={s}
                                ratings={user.ratings}
                                onOpen={() => setSelected(p)}
                                onRate={(v) => rate(p, v, ph)}
                              />
                            );
                          })}
                        </div>
                        {limit < filtered.length ? (
                          <div className="load-more">
                            <button onClick={() => setLimit((l) => l + 24)}>
                              再看 24 位选手 <ArrowDown size={15} />
                            </button>
                            <span>
                              已展示 {Math.min(limit, filtered.length)} /{" "}
                              {filtered.length}
                            </span>
                          </div>
                        ) : (
                          <div className="end-of-collection">
                            <span />
                            已显示当前筛选结果
                            <span />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="empty-state">
                        <Search size={29} strokeWidth={1.2} />
                        <h3>这里还没有匹配的选手</h3>
                        <p>试试其他关键词，或关闭“仅显示有可靠照片”。</p>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            filter({
                              ...defaultSettings.filters,
                              photoOnly: false,
                            })
                          }
                        >
                          查看全部档案
                        </button>
                      </div>
                    )}
                  </section>
                </>
              ) : page === "album" ? (
                <EventAlbum
                  key={albumPlayer}
                  initialPlayer={albumPlayer}
                  onPlayer={setSelected}
                  blind={s.blind}
                />
              ) : page === "rankings" ? (
                <Rankings
                  user={user}
                  onOpen={setSelected}
                  onStart={() => start()}
                />
              ) : (
                <DataPanel
                  storage={storage}
                  onExport={exportData}
                  onImport={() => importRef.current?.click()}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="site-footer">
          <div className="footer-brand">
            <Focus size={19} />
            <strong>CS 选手图鉴</strong>
            <span>选手照片与个人评分</span>
          </div>
          <div>
            <button onClick={() => setPage("data")}>数据与照片来源</button>
            <span>个人审美 · 无关竞技实力</span>
            <span className="offline-label">
              <WifiOff size={12} />
              {offlineReady
                ? "页面已缓存 · 照片按需加载"
                : import.meta.env.DEV
                  ? "开发预览 · 本地资源"
                  : "本地资源 · 网站缓存中"}
            </span>
          </div>
        </footer>
        <div className="progress-dock">
          <div className="progress-symbol">
            <Focus size={19} />
          </div>
          <div className="progress-content">
            <div>
              <span>
                {s.mode === "overall" ? "已评分选手" : "已评分时期"}
              </span>
              <strong>
                {ratingCount}
                <span> / {progressTotal}</span>
              </strong>
            </div>
            <div className="progress-track">
              <motion.i
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ type: "spring", stiffness: 130, damping: 24 }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              setPage("rankings");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            查看榜单 <ArrowUpRight size={15} />
          </button>
        </div>
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              role="status"
              className="toast"
              key={toast}
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <Check size={16} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {selected && (
            <PlayerDetail
              key={selected.id}
              player={selected}
              user={user}
              onClose={() => setSelected(null)}
              onSelect={(ph) => selectPhoto(selected, ph)}
              onRate={(v, ph) => rate(selected, v, ph)}
              onClear={(period) => clear(selected, period)}
              onMode={(mode) => setting({ mode })}
              onAlbum={() => {
                setAlbumPlayer(selected.id);
                setSelected(null);
                setPage("album");
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
