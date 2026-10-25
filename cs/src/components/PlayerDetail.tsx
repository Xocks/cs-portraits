import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  CalendarDays,
  Camera,
  Images,
  ArrowRight,
  Trash2,
} from "lucide-react";
import type { Player, PlayerPhoto, UserData, PeriodKey } from "../types";
import {
  asset,
  data,
  flag,
  periods,
  periodOrder,
  playerPhotos,
  representative,
  teamName,
} from "../lib/catalogue";
import { Stars } from "./Stars";
import { Portrait } from "./Portrait";
export function PlayerDetail({
  player: p,
  user,
  onClose,
  onSelect,
  onRate,
  onClear,
  onMode,
  onAlbum,
}: {
  player: Player;
  user: UserData;
  onClose: () => void;
  onSelect: (photo: PlayerPhoto) => void;
  onRate: (v: 1 | 2 | 3 | 4 | 5, photo?: PlayerPhoto) => void;
  onClear: (period?: PeriodKey) => void;
  onMode: (mode: "overall" | "period") => void;
  onAlbum: () => void;
}) {
  const all = playerPhotos(p);
  const chosen = representative(p, user.representatives);
  const [photoId, setPhotoId] = useState(chosen?.id);
  const [direction, setDirection] = useState(1);
  const [grouping, setGrouping] = useState<"year" | "period">("year");
  const box = useRef<HTMLDivElement>(null);
  const current = all.find((ph) => ph.id === photoId) || all[0];
  const available = periodOrder.filter((k) =>
    all.some((ph) => ph.period === k),
  );
  const years = [...new Set(all.map((ph) => ph.year))].sort((a, b) => (a ?? 9999) - (b ?? 9999));
  const candidates = all.filter((ph) => grouping === "year" ? ph.year === current?.year : ph.period === current?.period);
  const value = user.ratings.find(
    (r) =>
      r.playerId === p.id &&
      r.mode === user.settings.mode &&
      (r.mode === "overall" || r.period === current?.period),
  )?.value;
  const blind = user.settings.blind;
  const albumCount = data.album.filter((ph) =>
    ph.playerIds.includes(p.id),
  ).length;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box.current) {
        const els = [
          ...box.current.querySelectorAll<HTMLElement>(
            'button,a[href],input,select,[tabindex="0"]',
          ),
        ].filter(
          (x) => !x.hasAttribute("disabled") && x.getClientRects().length > 0,
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  function select(ph: PlayerPhoto) {
    setDirection(all.indexOf(ph) > all.indexOf(current) ? 1 : -1);
    setPhotoId(ph.id);
  }
  function adjacent(diff: number) {
    if (!all.length) return;
    const i = all.indexOf(current);
    select(all[(i + diff + all.length) % all.length]);
  }
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={box}
        tabIndex={-1}
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={blind ? "匿名选手照片详情" : `${p.nickname} 照片详情`}
        initial={{ opacity: 0, y: 36, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        <button
          className="detail-close icon-button"
          onClick={onClose}
          aria-label="关闭选手详情"
        >
          <X size={21} />
        </button>
        <div className="detail-photo">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              className="detail-image"
              key={current?.id || "missing"}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30, scale: 1.025 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 20 }}
              transition={{ duration: 0.38 }}
            >
              <Portrait
                photo={current}
                large
                alt={
                  blind
                    ? "匿名选手人像"
                    : `${p.nickname} ${current?.year || ""}`
                }
                eager
              />
            </motion.div>
          </AnimatePresence>
          <div className="detail-photo-gradient" />
          <span className="detail-edition">
            THE PORTRAIT ARCHIVE /{" "}
            {String(all.indexOf(current) + 1).padStart(2, "0")}
          </span>
          {all.length > 1 && (
            <div className="photo-arrows">
              <button onClick={() => adjacent(-1)} aria-label="上一张照片">
                <ChevronLeft />
              </button>
              <span>
                {all.indexOf(current) + 1} / {all.length}
              </span>
              <button onClick={() => adjacent(1)} aria-label="下一张照片">
                <ChevronRight />
              </button>
            </div>
          )}
          {current && (
            <div className="detail-photo-info">
              <span>{current.year ?? "HLTV 档案头像"}</span>
              <strong>{current.age !== null ? `${current.age} 岁` : current.ageRange ? `约 ${current.ageRange[0]}–${current.ageRange[1]} 岁` : current.year ? "" : "拍摄年份未知"}</strong>
            </div>
          )}
        </div>
        <div className="detail-body">
          <span className="eyebrow">A FACE, THROUGH TIME</span>
          <div className="detail-name">
            <h2>{blind ? "匿名选手" : p.nickname}</h2>
            {!blind && <span>{flag(p.countryCode)}</span>}
          </div>
          <p className="detail-realname">
            {blind
              ? "姓名与队伍已隐藏，请按照片评分。"
              : `${p.realName} · ${p.country} · ${teamName(p)}`}
          </p>
          {albumCount > 0 && (
            <button className="related-album" onClick={onAlbum}>
              <Images size={17} />
              <span>
                查看完整赛事相册
                <small>{albumCount} 张现场照与合照 · 按年份浏览</small>
              </span>
              <ArrowRight size={16} />
            </button>
          )}
          <div className="detail-section">
            <div className="section-label">
              <span>历年照片</span>
              <small>{all.length} 张个人照片</small>
            </div>
            <div className="photo-grouping" aria-label="照片分类方式">
              <button className={grouping === "year" ? "active" : ""} onClick={() => setGrouping("year")}>按年份</button>
              <button className={grouping === "period" ? "active" : ""} onClick={() => setGrouping("period")}>按年龄时期</button>
            </div>
            {grouping === "year" ? (
              <div className="photo-years" aria-label="按照片年份快速切换">
                {years.map((year) => (
                  <button key={year ?? "unknown"} aria-label={year === null ? "年份未知" : String(year)} className={current?.year === year ? "active" : ""}
                    onClick={() => select(all.find((ph) => ph.year === year)!)}>
                    {year ?? "年份未知"}<small>{all.filter((ph) => ph.year === year).length} 张</small>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="timeline" aria-label="按年龄时期浏览">
                  {available.map((k) => (
                    <button key={k} className={current?.period === k ? "active" : ""}
                      onClick={() => select(all.find((ph) => ph.period === k && ph.id === user.periodRepresentatives?.[`${p.id}:${k}`]) || all.find((ph) => ph.period === k)!)}>
                      <i /><strong>{periods[k].label}</strong>
                      <span>{[...new Set(all.filter((ph) => ph.period === k).map((ph) => ph.year).filter(Boolean))].sort((a,b) => a!-b!).join(" / ") || "拍摄年份未知"}</span>
                    </button>
                  ))}
                </div>
                <p className="photo-date-note">按拍摄日期或赛事年份对应的年龄范围分组；范围跨越边界的照片列入“年龄未核实”。旧版未分类评分仍保留在该组。</p>
              </>
            )}
          </div>
          {current && (
            <>
              <div className="candidate-row">
                {candidates.map((ph) => (
                  <button
                    key={ph.id}
                    className={current.id === ph.id ? "selected" : ""}
                    onClick={() => select(ph)}
                    aria-label={`切换至 ${ph.year ? `${ph.year} 年` : "年份未知"}候选照片 ${candidates.indexOf(ph) + 1}`}
                  >
                    <img className={ph.framing === "full-frame" ? "portrait-full-frame" : undefined} src={asset(ph.cardPath)} alt={blind ? "匿名选手候选照片" : `${p.nickname} · ${ph.year ?? "年份未知"}`} />
                    <span>{ph.year || "档案头像"}</span>
                    {current.id === ph.id && <Check size={13} />}
                  </button>
                ))}
              </div>
              <button
                className={`representative-button ${chosen?.id === current.id ? "selected" : ""}`}
                onClick={() => onSelect(current)}
              >
                {chosen?.id === current.id ? (
                  <Check size={17} />
                ) : (
                  <Bookmark size={17} />
                )}{" "}
                {chosen?.id === current.id
                  ? "已设为代表照"
                  : "设为代表照"}
                <span>{current.period === "undated" ? "自动保存选择" : "同时保存本年龄段首选"}</span>
              </button>
            </>
          )}
          <div className="detail-rating">
            <div className="mode-toggle">
              <button
                onClick={() => onMode("overall")}
                className={user.settings.mode === "overall" ? "active" : ""}
              >
                整体评分
              </button>
              <button
                onClick={() => onMode("period")}
                className={user.settings.mode === "period" ? "active" : ""}
              >
                分时期评分
              </button>
            </div>
            <div className="rating-prompt">
              <span>
                {user.settings.mode === "overall"
                  ? "为这位选手评分"
                  : current
                    ? `只为「${periods[current.period].label}」留下分数`
                    : "暂无可评分时期"}
              </span>
              <strong>{value ? `${value}.0` : "—"}</strong>
            </div>
            {(user.settings.mode === "overall" || current) && (
              <Stars
                large
                value={value}
                onChange={(v) => onRate(v, current)}
                label={
                  user.settings.mode === "overall"
                    ? "详情整体评分"
                    : `详情${periods[current.period].label}评分`
                }
              />
            )}
            <div className="rating-foot">
              <small>1 分 → 5 分 · 仅代表你的个人偏好</small>
              <button
                onClick={() => {
                  if (value)
                    onClear(
                      user.settings.mode === "period"
                        ? current?.period
                        : undefined,
                    );
                  else onClose();
                }}
              >
                {value ? (
                  <>
                    <Trash2 size={12} />
                    撤销本次评分
                  </>
                ) : (
                  <>
                    暂时跳过
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
            {user.settings.mode === "period" && available.length > 0 && (
              <div className="period-scores">
                {available.map((k) => (
                  <span key={k}>
                    {periods[k].label}
                    <b>
                      {user.ratings.find(
                        (r) =>
                          r.playerId === p.id &&
                          r.mode === "period" &&
                          r.period === k,
                      )?.value ?? "—"}
                    </b>
                  </span>
                ))}
              </div>
            )}
          </div>
          {current && (
            <details className="photo-provenance">
              <summary>
                <ShieldCheck size={14} />
                照片信息与来源
              </summary>
              {blind ? (
                <p>盲评期间隐藏含姓名的来源信息。</p>
              ) : (
                <>
                  <p>
                    <Camera size={13} />
                    {current.photographer} · {current.license}
                  </p>
                  {current.licenseStatus === "user-declared" && (
                    <p>
                      使用权限依据项目所有者声明，未取得或独立核验 HLTV
                      官方授权。版权归原权利人。
                    </p>
                  )}
                  <p>
                    <CalendarDays size={13} />
                    {current.capturedAt ?? "拍摄时间未核实"}
                    {current.teamAtTime
                      ? ` · ${current.teamAtTime}`
                      : " · 当时战队未核实"}
                  </p>
                  <p>{current.identityEvidence}</p>
                  {current.periodEvidence && <p>{current.periodEvidence}</p>}
                  {current.dateNote && <p>{current.dateNote}</p>}
                  <p>{current.alterations}</p>
                  <a href={current.sourceUrl} target="_blank" rel="noreferrer">
                    查看照片来源 <ExternalLink size={12} />
                  </a>
                  <a href={current.licenseUrl} target="_blank" rel="noreferrer">
                    阅读许可条款 <ExternalLink size={12} />
                  </a>
                </>
              )}
            </details>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
