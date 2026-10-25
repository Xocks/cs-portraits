import { useState } from "react";
import {
  Check,
  Database,
  ExternalLink,
  ImageOff,
  ShieldCheck,
  HardDrive,
  Download,
  FileJson,
  FileSpreadsheet,
  Upload,
  Search,
} from "lucide-react";
import { data, playerPhotos, teamName } from "../lib/catalogue";
import type { StorageStatus } from "../lib/storage";
export function DataPanel({
  storage,
  onExport,
  onImport,
}: {
  storage: StorageStatus;
  onExport: (type: "json" | "csv") => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const missing = data.players.filter((p) => !p.photoIds.length);
  const multi = data.players.filter(
    (p) =>
      new Set(
        playerPhotos(p)
          .filter((ph) => ph.period !== "undated")
          .map((ph) => ph.period),
      ).size >= 2,
  );
  return (
    <section className="page-section data-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">HONEST DATA. REAL PEOPLE.</span>
          <h1>资料与照片来源</h1>
          <p>
            {data.players.length}{" "}
            位选手身份均已核对。照片年份与人物身份分别记录。
          </p>
        </div>
        <div className="round-icon">
          <ShieldCheck size={28} />
        </div>
      </div>
      <div className="data-stats">
        {[
          [data.players.length, "独立人物档案"],
          [
            data.teams.filter((t) => (t.rank ?? 99) <= 20).length + "/20",
            "Top 20 队伍",
          ],
          [
            new Set([
              ...data.photos.map((p) => p.id),
              ...data.album.map((p) => p.sourcePhotoId),
            ]).size,
            "不同原始照片",
          ],
          [multi.length, "跨年龄时期选手"],
        ].map(([n, l]) => (
          <div key={l}>
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="data-columns">
        <article className="info-panel">
          <Database size={21} />
          <h3>固定快照，可追溯的阵容</h3>
          <p>
            排名快照：{data.snapshotDate}。资料采集：{data.collectedAt}。使用
            HLTV Player ID 去重；历史名将标签不等于已退役。
          </p>
          <p>
            前 20 队{" "}
            {data.teams
              .filter((t) => (t.rank ?? 99) <= 20)
              .reduce((n, t) => n + t.playerIds.length, 0)}{" "}
            个阵容位置。中国选手{" "}
            {data.players.filter((p) => p.countryCode === "CN").length} 位。
          </p>
          <a href={data.rankingSource} rel="noreferrer" target="_blank">
            查看 HLTV 排名快照 <ExternalLink size={13} />
          </a>
        </article>
        <article className="info-panel">
          <ShieldCheck size={21} />
          <h3>来源与许可，随照片保留</h3>
          <p>
            照片通过来源与人物档案关联核对。Commons 素材保留公开许可；HLTV
            素材按项目所有者的使用权限声明纳入，未标记为取得平台官方授权。原始链接、作者与裁切记录可在详情查看。
          </p>
          <p>
            {data.album.length} 张完整赛事照片均标注年份，包含{" "}
            {data.album.filter((p) => p.kind === "group").length}{" "}
            张合照与队友画面。档案头像未公开拍摄日期时明确标注，不把采集日期当作拍摄年份；精确日期用于计算年龄；仅有赛事年份时显示年龄范围，只有整个范围落在同一年龄段时才分类。
          </p>
        </article>
        <article className="info-panel">
          <HardDrive size={21} />
          <h3>没有网络，也能继续</h3>
          <p>
            字体、脚本和图片均随成品打包，无需远程
            API。首次访问只缓存页面与程序，照片按需加载并缓存；看过的照片可离线继续浏览，不会预先下载整个相册。
          </p>
          <p>
            当前存储：
            <b>
              {storage === "indexeddb"
                ? "IndexedDB"
                : storage === "localStorage"
                  ? "localStorage（兼容模式）"
                  : "临时内存（请及时导出）"}
            </b>
            。移动文件路径、切换域名或清除浏览器数据可能影响保存，请定期导出。
          </p>
        </article>
        <article className="info-panel export-panel">
          <Download size={21} />
          <h3>把你的审美，随身带走</h3>
          <p>
            JSON
            可恢复整体与时期评分、代表照和设置；导入时按时间合并评分，保留当前界面设置。CSV
            便于查看和比较。
          </p>
          <div>
            <button onClick={() => onExport("json")}>
              <FileJson size={15} />
              JSON 备份
            </button>
            <button onClick={() => onExport("csv")}>
              <FileSpreadsheet size={15} />
              CSV 导出
            </button>
            <button onClick={onImport}>
              <Upload size={15} />
              恢复评分
            </button>
          </div>
        </article>
      </div>
      <div className="coverage-notes">
        <h3>
          <Check size={18} />
          数据边界与待补充事项
        </h3>
        {data.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
      <div className="missing-heading">
        <div>
          <h2>
            <ImageOff size={21} />
            暂无可靠照片的档案 <span>{missing.length}</span>
          </h2>
          <p>这些人物仍可搜索和查看资料。未以其他人的照片替代。</p>
        </div>
        <label className="compact-search">
          <Search size={16} />
          <input
            placeholder="搜索缺图选手"
            aria-label="搜索缺图选手"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="missing-list">
        {missing
          .filter((p) =>
            (p.nickname + " " + p.realName + " " + teamName(p))
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((p) => (
            <div key={p.id}>
              <strong>{p.nickname}</strong>
              <span>{teamName(p)}</span>
              <small>
                {p.missingReason ||
                  "未找到身份、拍摄信息及许可均可确认的适用人像"}
              </small>
            </div>
          ))}
      </div>
    </section>
  );
}
