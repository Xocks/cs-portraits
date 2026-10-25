import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Medal,
  Sparkles,
  Star,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import type { UserData, Player, PeriodKey } from "../types";
import {
  data,
  playersById,
  teamsById,
  representative,
  photosById,
  periods,
  mean,
  flag,
  teamName,
  periodOrder,
} from "../lib/catalogue";
import { Portrait } from "./Portrait";
export function Rankings({
  user,
  onOpen,
  onStart,
}: {
  user: UserData;
  onOpen: (p: Player) => void;
  onStart: () => void;
}) {
  const [view, setView] = useState("overall");
  const [period, setPeriod] = useState<PeriodKey>("young");
  const [minSample, setMinSample] = useState(1);
  const overall = user.ratings.filter((r) => r.mode === "overall");
  const tabs = [
    ["overall", "选手排行"],
    ["teams", "战队均分"],
    ["period", "时期排行"],
    ["china", "中国选手"],
    ["compare", "现役与名将"],
    ["photos", "高分照片"],
  ];
  let list = (
    view === "period"
      ? user.ratings.filter((r) => r.mode === "period" && r.period === period)
      : overall
  )
    .map((r) => ({ p: playersById.get(r.playerId)!, r }))
    .filter(({ p }) => view !== "china" || p.countryCode === "CN")
    .sort(
      (a, b) =>
        b.r.value - a.r.value || a.p.nickname.localeCompare(b.p.nickname),
    );
  const teamScores = data.teams
    .map((t) => {
      const scores = overall.filter((r) => t.playerIds.includes(r.playerId));
      return { t, average: mean(scores.map((r) => r.value)), n: scores.length };
    })
    .filter((x) => x.n >= minSample)
    .sort((a, b) => b.average! - a.average! || b.n - a.n);
  return (
    <section className="rankings page-section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR OWN HALL OF FAME</span>
          <h1>我的评分榜单</h1>
          <p>按你的评分排序；未评分的选手不计入均分。</p>
        </div>
        <div className="round-icon">
          <BarChart3 size={28} />
        </div>
      </div>
      <div className="ranking-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "period" && (
        <div className="ranking-filter">
          <label>
            年龄时期{" "}
            <select
              aria-label="排行榜年龄时期"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            >
              {periodOrder.map((k) => (
                <option value={k} key={k}>
                  {periods[k].label} · {periods[k].range}
                </option>
              ))}
            </select>
          </label>
          <p>同一时期的候选照共用一个分数；不同模式互不覆盖。</p>
        </div>
      )}
      {view === "teams" && (
        <div className="ranking-filter">
          <label>
            至少已评{" "}
            <select
              aria-label="战队最少评分样本"
              value={minSample}
              onChange={(e) => setMinSample(+e.target.value)}
            >
              {[1, 3, 5].map((x) => (
                <option key={x} value={x}>
                  {x} 位选手
                </option>
              ))}
            </select>
          </label>
          <p>仅统计快照阵容。样本越完整，比较越有意义。</p>
        </div>
      )}
      {view === "compare" ? (
        <div className="comparison-grid">
          {[
            ["current", "快照阵容"],
            ["legacy", "历史补充档案"],
          ].map(([key, label]) => {
            const sample = overall.filter(
              (r) => playersById.get(r.playerId)?.collection === key,
            );
            const avg = mean(sample.map((r) => r.value));
            return (
              <div className="comparison-panel" key={key}>
                <span className="eyebrow">{label}</span>
                <h2>
                  {avg?.toFixed(2) ?? "—"}
                  <small>/ 5</small>
                </h2>
                <p>
                  {sample.length} 位已评分 /{" "}
                  {data.players.filter((p) => p.collection === key).length}{" "}
                  位收录
                </p>
                <div className="comparison-bar">
                  <i style={{ width: `${(avg ?? 0) * 20}%` }} />
                </div>
                <small>分组以是否属于收录阵容快照划分，不表示退役状态。</small>
              </div>
            );
          })}
          <div className="period-comparison">
            <h3>年龄时期 · 你的偏好曲线</h3>
            {periodOrder.map((k) => {
              const scores = user.ratings.filter(
                (r) => r.mode === "period" && r.period === k,
              );
              const avg = mean(scores.map((r) => r.value));
              return (
                <div className="period-bar-row" key={k}>
                  <span>{periods[k].label}</span>
                  <div>
                    <i style={{ width: `${(avg ?? 0) * 20}%` }} />
                  </div>
                  <b>{avg?.toFixed(2) ?? "—"}</b>
                  <small>{scores.length} 人</small>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "teams" ? (
        teamScores.length ? (
          <div className="ranking-list">
            {teamScores.map(({ t, average, n }, i) => (
              <div className="ranking-row" key={t.id}>
                <span className="rank-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="team-monogram">
                  {user.settings.blind ? "?" : t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="rank-person">
                  <h3>{user.settings.blind ? `战队 ${i + 1}` : t.name}</h3>
                  <p>
                    世界 #{t.rank} · 已评 {n} / {t.playerIds.length} 人
                  </p>
                </div>
                <div className="sample-dots" aria-label={`${n} 位已评`}>
                  {t.playerIds.map((id) => (
                    <i
                      key={id}
                      className={
                        overall.some((r) => r.playerId === id) ? "filled" : ""
                      }
                    />
                  ))}
                </div>
                <strong className="rank-score">
                  {average!.toFixed(2)}
                  <Star size={14} />
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty onStart={onStart} />
        )
      ) : view === "photos" ? (
        <div className="top-photo-grid">
          {[...user.ratings]
            .filter((r) => r.photoId && photosById.has(r.photoId))
            .sort((a, b) => b.value - a.value)
            .filter(
              (r, i, a) => a.findIndex((o) => o.photoId === r.photoId) === i,
            )
            .map((r) => {
              const p = playersById.get(r.playerId)!;
              const ph = photosById.get(r.photoId!)!;
              return (
                <button
                  className="top-photo"
                  key={ph.id}
                  onClick={() => onOpen(p)}
                >
                  <Portrait
                    photo={ph}
                    alt={user.settings.blind ? "匿名高分照片" : p.nickname}
                  />
                  <div>
                    <span>
                      {user.settings.blind ? "匿名选手" : p.nickname} ·{" "}
                      {ph.year}
                    </span>
                    <strong>
                      {r.value}.0 <Star size={13} />
                    </strong>
                  </div>
                </button>
              );
            })}
          {!user.ratings.some((r) => r.photoId) && <Empty onStart={onStart} />}
        </div>
      ) : list.length ? (
        <div className="ranking-list">
          {list.map(({ p, r }, i) => (
            <button
              className="ranking-row"
              onClick={() => onOpen(p)}
              key={p.id}
            >
              <span className={`rank-number ${i < 3 ? "podium" : ""}`}>
                {i === 0 ? <Medal size={24} /> : String(i + 1).padStart(2, "0")}
              </span>
              <div className="rank-portrait">
                <Portrait
                  photo={representative(p, user.representatives)}
                  alt={user.settings.blind ? "匿名人像" : p.nickname}
                />
              </div>
              <div className="rank-person">
                <h3>
                  {user.settings.blind
                    ? `选手 ${String(data.players.indexOf(p) + 1).padStart(3, "0")}`
                    : p.nickname}
                  {!user.settings.blind && <span>{flag(p.countryCode)}</span>}
                </h3>
                <p>
                  {user.settings.blind
                    ? "等待揭晓"
                    : `${p.realName} · ${teamName(p)}`}
                </p>
              </div>
              <span className="rank-mode">
                {r.mode === "period" ? periods[r.period!].label : "整体印象"}
              </span>
              <strong className="rank-score">
                {r.value.toFixed(1)}
                <Star size={14} />
              </strong>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <Empty onStart={onStart} />
      )}
      <div className="ranking-note">
        <Users size={15} />
        评分保存在当前浏览器中；不同朋友的评分可各自导出，不会自动汇总。
      </div>
    </section>
  );
}
function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="empty-state">
      <Sparkles size={30} strokeWidth={1.2} />
      <h3>第一份榜单，等你定义。</h3>
      <p>从一张人像开始，留下你的 1–5 分。</p>
      <button className="primary-button" onClick={onStart}>
        去选手图鉴 <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
