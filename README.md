# CS 选手图鉴

CS 职业选手人像与个人评分网站。在线版：230 位选手、896 张不同原片（含 224 张完整赛事相册），覆盖 2026-10-19 HLTV Top20 全部首发及 21 位中国选手。照片来源、年份和版权状态逐张记录。

在线体验：https://xocks.github.io/cs-portraits/

网站测试覆盖首页、图片规格、相册和评分；部署证据见 `cs/docs/deployment-verification.json`。

源码位于 `cs/`；`.github/workflows/pages.yml` 自动构建并发布。`photo-assets.zip`、`album-assets.zip` 和 `photo-update-20261023.zip` 保存本地图片资源，运行 `npm run prepare:assets` 会验证并解压到 `cs/public/photos/`，网站运行时使用独立 WebP 文件。

```sh
cd cs
npm ci
npm run prepare:assets
npm run check:data
npm test
npm run build:web
npm run dev
```

所有评分保存在每位访问者自己的浏览器，没有公共后端。支持整体/时期评分、照片选择、盲评、筛选、排行榜和 JSON/CSV 备份。

单机版与离线打包已暂停，本轮只更新在线版。F1 未改动。说明与覆盖边界见 `cs/docs/在线版进展.md`，跨年龄时期素材仍不完整，未核实的拍摄日期不会编造年龄。

代码 MIT；照片版权/各自许可另计。HLTV 使用状态依据项目所有者声明，未冒称平台官方授权。请保留来源、作者和版权状态。
