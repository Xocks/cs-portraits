# CS 选手图鉴 · CS 在线版

React + TypeScript + Vite 静态网站。当前优先在线版本；单机版与离线打包已按用户要求暂停，F1 未更改。

## 开发和构建

Node.js 22+：

```sh
npm ci
npm run prepare:assets
npm run dev
npm run check:data
npm test
npm run build:web
npm run test:web
```

`npm run build` 等同于 `build:web`，输出 `dist/` 和 `delivery/CS选手图鉴-网站部署包.zip`，不生成或更新旧离线文件。构建不联网采集素材。

网站可部署到根目录或 GitHub Pages 的仓库子路径。仓库根目录 `.github/workflows/pages.yml` 已准备自动构建配置；已发布至 https://xocks.github.io/cs-portraits/ 。详见 [GitHub 免费部署研究](docs/GitHub免费部署研究.md)。

## 功能

224 张按年份浏览的完整赛事相册（含合照）、大幅人像、浅深色、响应式布局与动画；队伍/排名/国籍/现役与历史筛选、搜索、随机与盲评；不同年份和时期的照片候选、代表照；整体与分时期 1–5 分独立存储；个人/战队/时期/中国榜单；IndexedDB、JSON 备份恢复、CSV 导出。

当前评分属于每位访问者自己的浏览器，没有在线公共数据库或跨用户总榜。

## 数据和素材

- `src/types.ts` / `src/data/catalogue.json`：人物、队伍、快照关系、照片、评分和配置。
- `public/photos/`：实际审核纳入的本地 WebP，卡片/大图两规格；运行时不热链 HLTV。
- `research/hltv-photo-sources.json`：HLTV Player ID、个人页与头像的直接映射。
- `research/hltv-usage-declaration.json`：用户确认其符合使用要求的声明，不能当成 HLTV 官方授权。
- `scripts/build-catalogue.mjs`：来源与审核记录生成发布数据。
- `scripts/process-hltv-online.mjs`：身份键核对、人脸定位、裁切和压缩；人脸检测不单独证明身份。
- `scripts/audit.mjs`：唯一 ID、队籍、文件引用、格式、哈希、年龄验证。
- `scripts/package-web.mjs`：网站压缩包、缓存与 Pages `.nojekyll`。
- `tests/e2e/online.spec.ts`：实际 HTTP 浏览器交互和仓库子路径资源验证。

HLTV 头像若没有可靠拍摄日期，日期和年龄留空；资料页采集日期不能冒充拍摄日期。图库照片仅按真实来源证据保留年份，身份、拍摄日期、版权状态分别记录。Commons 的公开许可与 HLTV 的用户声明使用状态不混淆。

原始下载、未审核参考图、旧离线成品、node_modules 等已列入忽略项。只把正式照片和数据随网站发布。采集模块接受浏览器 Page 与项目路径参数，按 Player ID 和赛事年份建立候选，正式发布必须人工审核；普通网站构建不依赖它们。

代码 MIT，照片保留原版权/各自许可，见 [照片来源与版权状态](docs/照片署名与许可.md)。实际覆盖和测试记录见 [在线版进展](docs/在线版进展.md)。

本地质量审核器：`npm run review:photos`。质量评分文件保存在 research/top20-quality-ratings.json，已忽略，不随网站发布。Top20 逐年覆盖见 docs/Top20照片补充进展.md。
