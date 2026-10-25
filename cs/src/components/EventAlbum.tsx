import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Search,
  X,
} from "lucide-react";
import { asset, data, playersById } from "../lib/catalogue";
import type { AlbumPhoto, Player } from "../types";

export function EventAlbum({
  initialPlayer = "all",
  onPlayer,
  blind = false,
}: {
  initialPlayer?: string;
  onPlayer: (p: Player) => void;
  blind?: boolean;
}) {
  const [player, setPlayer] = useState(initialPlayer);
  const [year, setYear] = useState("all");
  const [kind, setKind] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const years = [...new Set(data.album.map((p) => p.year))].sort(
    (a, b) => b - a,
  );
  const people = data.players
    .filter((p) => data.album.some((ph) => ph.playerIds.includes(p.id)))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
  const photos = useMemo(
    () =>
      data.album
        .filter(
          (p) =>
            (player === "all" || p.playerIds.includes(player)) &&
            (year === "all" || p.year === Number(year)) &&
            (kind === "all" || p.kind === kind) &&
            (source === "all" || p.sourcePlatform === source) &&
            (!query.trim() ||
              [
                p.title,
                p.event,
                p.photographer,
                ...p.playerIds.map((id) => playersById.get(id)?.nickname || ""),
              ]
                .join(" ")
                .toLowerCase()
                .includes(query.trim().toLowerCase())),
        )
        .sort(
          (a, b) =>
            b.year - a.year ||
            Number(b.kind === "group") - Number(a.kind === "group") ||
            a.id.localeCompare(b.id),
        ),
    [player, year, kind, source, query],
  );
  const current = photos.find((p) => p.id === selected);
  const index = current ? photos.indexOf(current) : -1;
  const hero = data.album.find((p) => p.id === "album-commons-80892713")!;
  useEffect(() => {
    setLimit(24);
  }, [player, year, kind, source, query]);
  useEffect(() => {
    if (!current) return;
    trigger.current = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      document.body.style.overflow = old;
      trigger.current?.focus();
    };
  }, [!!current]);
  useEffect(() => {
    if (!current) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected(
          photos[
            (index + (e.key === "ArrowRight" ? 1 : -1) + photos.length) %
              photos.length
          ].id,
        );
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [current, index, photos]);
  function open(ph: AlbumPhoto) {
    setSelected(ph.id);
  }
  return (
    <section className="page-section album-page">
      <div className="page-heading album-heading">
        <div>
          <span className="eyebrow">THE MOMENTS BETWEEN ROUNDS</span>
          <h1>赛事相册</h1>
          <p>按年份查看现场照片、战队合照和赛事记录。</p>
        </div>
        <div className="album-total">
          <strong>{data.album.length}</strong>
          <span>
            张完整构图 · {years.at(-1)}—{years[0]}
          </span>
        </div>
      </div>
      <button
        className="album-cover"
        onClick={() => {
          setPlayer("all");
          setYear("2019");
          setKind("all");
          setSource("all");
          setQuery("");
          open(hero);
        }}
        aria-label="打开 Team Liquid 2019 夺冠合照"
      >
        <img
          src={asset(hero.localPath)}
          alt={
            blind ? "2019 年夺冠合影" : "Team Liquid 在 IEM Chicago 2019 捧杯"
          }
          fetchPriority="high"
        />
        <span className="album-cover-shade" />
        <span className="album-cover-label">
          FROM THE ARCHIVE <i /> 2019
        </span>
        <span className="album-cover-copy">
          <small>FIVE PLAYERS. ONE MOMENT.</small>
          <strong>{blind ? "战队合照" : "Team Liquid · 2019"}</strong>
          <span>
            {blind ? "2019 · 冠军合影" : "Team Liquid · IEM Chicago 2019"}
          </span>
        </span>
        <span className="album-cover-open">
          <ArrowUpRight size={24} />
        </span>
      </button>
      <div className="album-toolbar">
        <label className="album-search">
          <Search size={17} />
          <input
            aria-label="搜索赛事相册"
            placeholder="搜索选手、赛事、摄影者"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="相册按选手筛选"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        >
          <option value="all">全部选手</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {blind ? `选手 ${p.hltvId}` : p.nickname}
            </option>
          ))}
        </select>
        <select
          aria-label="相册按画面筛选"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">全部画面</option>
          <option value="group">合照与队友</option>
          <option value="scene">个人与现场</option>
        </select>
        <select
          aria-label="相册按来源筛选"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">全部来源</option>
          <option value="HLTV">HLTV</option>
          <option value="Wikimedia Commons">Commons</option>
        </select>
      </div>
      <div className="album-years" aria-label="相册年份">
        <button
          className={year === "all" ? "active" : ""}
          onClick={() => setYear("all")}
        >
          所有年份
        </button>
        {years.map((y) => (
          <button
            key={y}
            className={year === String(y) ? "active" : ""}
            onClick={() => setYear(String(y))}
          >
            {y}
          </button>
        ))}
      </div>
      <div className="album-result">
        <span>
          <Images size={15} /> {photos.length} 张照片
          {player !== "all" && !blind
            ? ` · ${playersById.get(player)?.nickname}`
            : ""}
        </span>
        <small>完整画面 · 年份取自赛事或原始拍摄记录</small>
      </div>
      <div className="album-grid">
        {photos.slice(0, limit).map((ph, i) => (
          <motion.article
            className="album-card"
            key={ph.id}
            data-album-id={ph.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: Math.min((i % 24) * 0.025, 0.2),
            }}
          >
            <button
              className="album-picture"
              onClick={() => open(ph)}
              aria-label={`打开 ${ph.year} ${blind ? "赛事照片" : ph.title}`}
            >
              <img
                src={asset(ph.cardPath)}
                alt={blind ? `${ph.year} 年赛事照片` : ph.title}
                loading="lazy"
                width={ph.width}
                height={ph.height}
              />
              <span className="album-year">{ph.year}</span>
              <span className="album-picture-open">
                <ArrowUpRight size={18} />
              </span>
            </button>
            <div className="album-caption">
              <span>
                {ph.sourcePlatform === "HLTV" ? "HLTV" : "COMMONS"} /{" "}
                {ph.kind === "group" ? "TOGETHER" : "ON & OFF STAGE"}
              </span>
              <h3>{blind ? "赛场的另一面" : ph.title}</h3>
              <p>
                {blind
                  ? "盲评期间隐藏姓名"
                  : ph.playerIds
                      .map((id) => playersById.get(id)?.nickname)
                      .join(" · ")}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
      {!photos.length && (
        <div className="empty-state">
          <Camera size={30} />
          <h3>这个组合暂时没有照片</h3>
          <button
            onClick={() => {
              setPlayer("all");
              setYear("all");
              setKind("all");
              setSource("all");
              setQuery("");
            }}
          >
            清除相册筛选
          </button>
        </div>
      )}
      {photos.length > limit && (
        <div className="load-more">
          <button onClick={() => setLimit((n) => n + 24)}>
            再翻 24 张 <ArrowDown size={15} />
          </button>
          <span>
            {Math.min(limit, photos.length)} / {photos.length}
          </span>
        </div>
      )}
      <p className="album-footnote">
        合照保留完整构图，人物标签来自原始来源记录；不自动识别或命名背景中的每一个人。个人评分仍在选手图鉴中进行。
      </p>
      {current && (
        <dialog
          ref={dialog}
          className="album-dialog"
          aria-label="赛事照片大图"
          onCancel={(e) => {
            e.preventDefault();
            setSelected(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <motion.div
            className="album-lightbox"
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="album-lightbox-top">
              <span>
                {current.year} <i /> {index + 1} / {photos.length}
              </span>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="关闭赛事照片"
              >
                <X size={22} />
              </button>
            </div>
            <div className="album-lightbox-image">
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={current.id}
                  src={asset(current.localPath)}
                  alt={blind ? "赛事完整照片" : current.title}
                  initial={{ opacity: 0, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
              {photos.length > 1 && (
                <>
                  <button
                    className="album-prev"
                    onClick={() =>
                      setSelected(
                        photos[(index - 1 + photos.length) % photos.length].id,
                      )
                    }
                    aria-label="上一张赛事照片"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="album-next"
                    onClick={() =>
                      setSelected(photos[(index + 1) % photos.length].id)
                    }
                    aria-label="下一张赛事照片"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>
            <div className="album-lightbox-info">
              <div>
                <span className="eyebrow">
                  {current.sourcePlatform} · {current.year}
                </span>
                <h2>{blind ? "赛场的另一面" : current.title}</h2>
                {!blind && current.caption && <p>{current.caption}</p>}
                <p>{current.dateNote}</p>
              </div>
              {!blind && (
                <div className="album-people">
                  {current.playerIds.map((id) => {
                    const p = playersById.get(id);
                    return (
                      p && (
                        <button
                          key={id}
                          onClick={() => {
                            setSelected(null);
                            onPlayer(p);
                          }}
                        >
                          {p.nickname}
                          <ArrowUpRight size={13} />
                        </button>
                      )
                    );
                  })}
                </div>
              )}
            </div>
            {!blind && (
              <details className="album-source">
                <summary>摄影、来源与人物关联</summary>
                <p>摄影 / 署名：{current.photographer}</p>
                <p>{current.subjectEvidence}</p>
                <p>{current.subjectScope}</p>
                <p>{current.alterations}</p>
                <p>{current.license}</p>
                <a href={current.sourceUrl} target="_blank" rel="noreferrer">
                  原始照片页面 <ExternalLink size={12} />
                </a>
                <a href={current.yearEvidence} target="_blank" rel="noreferrer">
                  年份依据 <ExternalLink size={12} />
                </a>
              </details>
            )}
          </motion.div>
        </dialog>
      )}
    </section>
  );
}
