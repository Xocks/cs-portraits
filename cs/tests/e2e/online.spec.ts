import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";
import { execFileSync } from "node:child_process";
const catalogue = JSON.parse(
  fs.readFileSync("src/data/catalogue.json", "utf8"),
);
const offlineURL = "http://127.0.0.1:4173/cs-portraits/";
const singleURL = pathToFileURL(
  path.resolve("delivery/CS帧相-单文件离线版.html"),
).href;
async function ready(page: Page, url = offlineURL) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: /名字之外/ })).toBeVisible();
  await expect(page.locator(".save-status")).toContainText("已自动保存");
}
test("dated event album filters, full photographs and player links; mobile dialog", async ({
  page,
}) => {
  await ready(page);
  await expect(page).toHaveTitle(/CS 选手图鉴/);
  await page.getByRole("button", { name: "赛事相册", exact: true }).click();
  await expect(page.locator(".album-card")).toHaveCount(24);
  await page.getByLabel("相册按来源筛选").selectOption("HLTV");
  await expect(page.locator(".album-result")).toContainText(`${catalogue.album.filter((p:any)=>p.sourcePlatform==='HLTV').length} 张照片`);
  await page.getByLabel("相册按选手筛选").selectOption("hltv-11893");
  await expect(page.locator(".album-card")).toHaveCount(Math.min(24,catalogue.album.filter((p:any)=>p.sourcePlatform==='HLTV'&&p.playerIds.includes('hltv-11893')).length));
  await page
    .locator(".album-years")
    .getByRole("button", { name: "2022", exact: true })
    .click();
  await expect(page.locator(".album-card")).toHaveCount(2);
  await expect(page.locator(".album-year").first()).toHaveText("2022");
  await page.locator(".album-picture").first().click();
  const dialog = page.getByRole("dialog", { name: "赛事照片大图" });
  await expect(dialog).toBeVisible();
  const first = await dialog
    .locator(".album-lightbox-image img")
    .getAttribute("src");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".album-lightbox-image img")).not.toHaveAttribute(
    "src",
    first!,
  );
  await dialog.locator("summary").click();
  await expect(
    dialog.getByRole("link", { name: "年份依据", exact: true }),
  ).toHaveAttribute("href", /hltv.org\/gallery\//);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("相册按来源筛选").selectOption("all");
  await page.getByLabel("相册按选手筛选").selectOption("all");
  await page
    .locator(".album-years")
    .getByRole("button", { name: "所有年份", exact: true })
    .click();
  await page.getByLabel("相册按画面筛选").selectOption("group");
  await expect(page.locator(".album-result")).toContainText(`${catalogue.album.filter((p:any)=>p.kind==='group').length} 张照片`);
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".album-picture img")]
      .slice(0, 6)
      .every((i) => (i as HTMLImageElement).complete),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/album-desktop.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(
    page.getByRole("button", { name: "赛事相册", exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "docs/album-mobile.png", fullPage: false });
  await page.locator(".album-picture").first().click();
  await expect(dialog).toBeVisible();
  await dialog
    .locator(".album-lightbox-image img")
    .evaluate((el: HTMLImageElement) => el.decode());
  await expect(dialog.locator(".album-lightbox")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "docs/album-mobile-lightbox.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "选手图鉴", exact: true }).click();
  const card = await find(page, "ZywOo");
  await card.getByRole("button", { name: /查看 .* 的照片与时期/ }).click();
  await page.getByRole("button", { name: /查看完整赛事相册/ }).click();
  await expect(page.getByLabel("相册按选手筛选")).toHaveValue("hltv-11893");
});
async function visuallyReady(page: Page) {
  await page.waitForFunction(() => {
    const heading = document.querySelector(".hero h1");
    if (!heading || Number(getComputedStyle(heading).opacity) < 0.99)
      return false;
    for (let e: Element | null = heading; e; e = e.parentElement)
      if (Number(getComputedStyle(e).opacity) < 0.99) return false;
    return [...document.querySelectorAll(".hero img")].every(
      (image) =>
        (image as HTMLImageElement).complete &&
        (image as HTMLImageElement).naturalWidth > 0,
    );
  });
  await page.evaluate(() => document.fonts.ready);
}
test("new Chinese player photographs retain distinct sourced years and can be selected", async ({page}) => {
  await ready(page);
  const card=await find(page,"Moseyuh");
  await card.getByRole("button",{name:/查看 .* 的照片与时期/}).click();
  const dialog=page.getByRole("dialog");
  for(const year of [2023,2025,2026]) {
    await dialog.getByRole("button",{name:String(year),exact:true}).click();
    await expect(dialog.locator(".detail-photo-info")).toContainText(String(year));
    await expect(dialog.locator(".detail-photo-info")).not.toContainText("人物身份已核对");
  }
  await dialog.getByRole("button",{name:"2023",exact:true}).click();
  await dialog.locator(".representative-button").click();
  await dialog.locator("summary").click();
  await expect(dialog.getByRole("link",{name:"查看照片来源",exact:true})).toHaveAttribute("href","https://www.hltv.org/gallery/view/183622");
  await page.keyboard.press("Escape");
  await page.reload();
  await find(page,"Moseyuh");
  await expect(page.locator(".card-portrait img")).toHaveAttribute("src",/hltv-gallery-183622.*-card.webp/);
});
test("year navigation includes all photographs in chronological order and separates age browsing", async ({page}) => {
  await ready(page);
  await expect(page.getByRole("button", {name: "CS 选手图鉴首页"})).toBeVisible();
  const card = await find(page, "ZywOo");
  await card.getByRole("button", {name: /查看 .* 的照片与时期/}).click();
  const dialog = page.getByRole("dialog");
  const years = await dialog.locator(".photo-years button").allTextContents();
  const numeric = years.filter(x => /^20/.test(x)).map(x => Number(x.slice(0,4)));
  expect(numeric).toEqual([...new Set(numeric)].sort((a,b) => a-b));
  expect(years.at(-1)).toContain("年份未知");
  for (const year of numeric) {
    await dialog.locator(".photo-years button").filter({hasText: String(year)}).click();
    await expect(dialog.locator(".candidate-row button")).toHaveCount(catalogue.photos.filter((p:any) => p.playerId === "hltv-11893" && p.year === year).length);
  }
  await expect(dialog.locator(".detail-image img")).toHaveCount(1);
  await expect(dialog.locator(".detail-image img")).toHaveCSS("object-fit", "contain");
  await dialog.getByRole("button", {name: "按年龄时期",exact:true}).click();
  await expect(dialog.locator(".timeline")).toBeVisible();
  await expect(dialog.locator(".timeline")).not.toContainText("出道期");
  await expect(dialog.locator(".timeline")).not.toContainText("年份与头像");
});
async function find(page: Page, nick: string) {
  await page
    .getByRole("textbox", { name: "搜索选手 ID、真实姓名或队伍" })
    .fill(nick);
  await expect(page.locator(".player-card")).toHaveCount(1);
  return page.locator(".player-card").first();
}
async function allPhotos(page: Page) {
  const paths = [...catalogue.photos, ...catalogue.album].flatMap((p: any) => [
    p.cardPath,
    p.localPath,
  ]);
  return page.evaluate(async (paths) => {
    const failed: string[] = [];
    for (let i = 0; i < paths.length; i += 8)
      await Promise.all(
        paths.slice(i, i + 8).map(
          (src) =>
            new Promise<void>((resolve) => {
              const im = new Image();
              im.onload = () => {
                if (!im.naturalWidth) failed.push(src);
                resolve();
              };
              im.onerror = () => {
                failed.push(src);
                resolve();
              };
              im.src = new URL(src, location.href).href;
            }),
        ),
      );
    return failed;
  }, paths);
}
test("overall and period scores persist independently; representative photo persists", async ({
  page,
}) => {
  await ready(page);
  const card = await find(page, "ZywOo");
  await card.getByRole("button", { name: /查看 .* 的照片与时期/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "详情整体评分 5 分", exact: true })
    .click();
  await dialog.getByRole("button", { name: "分时期评分", exact: true }).click();
  await dialog.locator(".stars.large button").nth(2).click();
  await dialog.getByRole("button", { name: "按年龄时期", exact: true }).click();
  const timeline = dialog.locator(".timeline button");
  if ((await timeline.count()) > 1) await timeline.last().click();
  const next = dialog.getByRole("button", { name: "下一张照片" });
  if (await next.count()) await next.click();
  await dialog.locator(".representative-button").click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".save-status")).toContainText("已自动保存");
  await page.reload();
  await expect(page.locator(".save-status")).toContainText("已自动保存");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("frame-cs-v1")!),
  );
  expect(
    stored.ratings.find(
      (r: any) => r.playerId === "hltv-11893" && r.mode === "overall",
    )?.value,
  ).toBe(5);
  expect(
    stored.ratings.find(
      (r: any) => r.playerId === "hltv-11893" && r.mode === "period",
    )?.value,
  ).toBe(3);
  expect(stored.representatives["hltv-11893"]).toBeTruthy();
  const restored = await find(page, "ZywOo");
  const expected = catalogue.photos.find(
    (p: any) => p.id === stored.representatives["hltv-11893"],
  );
  expect(
    await restored.locator(".card-portrait img").getAttribute("src"),
  ).toContain(expected.cardPath);
});
test("JSON/CSV export and clean-context JSON restore; invalid data is rejected", async ({
  page,
  browser,
}) => {
  await ready(page);
  const card = await find(page, "ZywOo");
  await card
    .getByRole("button", { name: "ZywOo 整体评分 4 分", exact: true })
    .click();
  await page.locator(".backup-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 JSON 备份", exact: true })
    .click();
  const file = await downloadPromise;
  const filePath = await file.path();
  const backup = JSON.parse(
    fs.readFileSync(filePath!, "utf8").replace(/^\uFEFF/, ""),
  );
  expect(backup.ratings).toHaveLength(1);
  await page.locator(".backup-button").click();
  const csvPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 CSV 表格", exact: true })
    .click();
  const csv = await csvPromise;
  expect(fs.readFileSync((await csv.path())!, "utf8")).toContain(
    '"hltv-11893","ZywOo"',
  );
  const fresh = await browser.newContext();
  const restored = await fresh.newPage();
  await ready(restored);
  await restored.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(restored.getByRole("status")).toContainText("已合并 1 条评分");
  expect(
    await restored.evaluate(
      () => JSON.parse(localStorage.getItem("frame-cs-v1")!).ratings[0].value,
    ),
  ).toBe(4);
  await restored.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...backup,
        ratings: [{ ...backup.ratings[0], value: 9 }],
      }),
    ),
  });
  await expect(restored.getByRole("status")).toContainText("导入失败");
  expect(
    await restored.evaluate(
      () => JSON.parse(localStorage.getItem("frame-cs-v1")!).ratings[0].value,
    ),
  ).toBe(4);
  await fresh.close();
});
test("filter by real name, stable ID, country, rank, team; blind mode hides identities", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("仅显示有照片的选手").uncheck();
  await find(page, "Mathieu Herbaut");
  await find(page, "19230");
  await page
    .getByRole("textbox", { name: "搜索选手 ID、真实姓名或队伍" })
    .fill("");
  await page.getByRole("button", { name: "中国选手" }).click();
  await expect(page.locator(".player-card")).toHaveCount(21);
  await page.getByRole("button", { name: "全部选手", exact: true }).click();
  await page
    .getByRole("combobox", { name: "按战队筛选", exact: true })
    .selectOption("hltv-team-7020");
  await expect(page.locator(".player-card")).toHaveCount(5);
  await page
    .getByRole("combobox", { name: "按战队筛选", exact: true })
    .selectOption("all");
  await page
    .getByRole("combobox", { name: "按世界排名筛选", exact: true })
    .selectOption("5");
  await expect(page.locator(".collection-heading h2")).toContainText("25");
  await page.getByRole("button", { name: "盲评", exact: true }).click();
  await expect(page.locator(".player-card h3").first()).toContainText("选手");
  await expect(
    page.locator(".player-card h3").filter({ hasText: /donk|ZywOo|NiKo/ }),
  ).toHaveCount(0);
  const before = await page
    .locator(".player-card")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-player-id")));
  await page.getByRole("button", { name: "随机", exact: true }).click();
  const after = await page
    .locator(".player-card")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-player-id")));
  expect(after).not.toEqual(before);
});
test("ranking excludes missing scores; team average uses rated members only", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("仅显示有照片的选手").uncheck();
  for (const [nick, score] of [
    ["ZywOo", 5],
    ["apEX", 3],
  ] as const) {
    const card = await find(page, nick);
    await card
      .getByRole("button", {
        name: `${nick} 整体评分 ${score} 分`,
        exact: true,
      })
      .click();
  }
  await page.getByRole("button", { name: "我的榜单", exact: true }).click();
  await expect(page.locator(".ranking-row")).toHaveCount(2);
  await expect(page.locator(".ranking-row").first()).toContainText("ZywOo");
  await page.getByRole("button", { name: "战队均分", exact: true }).click();
  await expect(page.locator(".ranking-row")).toHaveCount(1);
  await expect(page.locator(".ranking-row")).toContainText("4.00");
  await expect(page.locator(".ranking-row")).toContainText("已评 2 / 5 人");
  await page
    .getByRole("combobox", { name: "战队最少评分样本" })
    .selectOption("3");
  await expect(page.locator(".ranking-row")).toHaveCount(0);
  await page.getByRole("button", { name: "时期排行", exact: true }).click();
  await expect(page.locator(".empty-state")).toBeVisible();
});
test("desktop/mobile layouts, dark mode, focus containment, reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await visuallyReady(page);
  await page.screenshot({ path: "docs/desktop.png", fullPage: false });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "切换浅色或深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "docs/desktop-dark.png", fullPage: false });
  await page.getByRole("button", { name: "切换浅色或深色模式" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/mobile.png", fullPage: false });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const card = await find(page, "ZywOo");
  await card.getByRole("button", { name: /查看 .* 的照片与时期/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await expect(dialog).toHaveCSS("opacity", "1");
  await page.waitForFunction(() => {
    const image = document.querySelector(
      '[role="dialog"] img',
    ) as HTMLImageElement | null;
    return image?.complete && image.naturalWidth > 0;
  });
  await page.screenshot({ path: "docs/mobile-detail.png" });
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "资料与备份", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("localStorage fallback is usable when IndexedDB is unavailable", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw Error("test unavailable");
      },
    });
  });
  const p = await ctx.newPage();
  await ready(p);
  const card = await find(p, "ZywOo");
  await card
    .getByRole("button", { name: "ZywOo 整体评分 2 分", exact: true })
    .click();
  await p.reload();
  await expect(p.locator(".save-status")).toContainText("已自动保存");
  await p.getByRole("button", { name: "资料与备份", exact: true }).click();
  await expect(
    p.locator(".info-panel").filter({ hasText: "没有网络，也能继续" }),
  ).toContainText("localStorage");
  await ctx.close();
});

test("all photo assets load from the project subpath with no external resource dependency", async ({
  page,
}) => {
  const remote: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:4173/")
    )
      remote.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  expect(await allPhotos(page)).toEqual([]);
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
  expect(catalogue.players.length).toBeGreaterThanOrEqual(150);
  expect(
    catalogue.teams
      .filter((t: any) => t.rank <= 20)
      .flatMap((t: any) => t.playerIds),
  ).toHaveLength(100);
});

test("website precaches only its shell; viewed album photos work without network", async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));
  });
  const shell = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find(k=>k.startsWith('frame-cs-'))!);
    return (await cache.keys()).map(r=>r.url);
  });
  expect(shell.filter(url=>url.includes('/photos/')).length).toBeLessThan(40);
  await page.getByRole('button',{name:'赛事相册',exact:true}).click();
  await page.getByRole('button',{name:'打开 Team Liquid 2019 夺冠合照'}).click();
  await page.locator('.album-lightbox-image img').evaluate((img:HTMLImageElement)=>img.decode());
  const source=await page.locator('.album-lightbox-image img').getAttribute('src');
  await page.waitForFunction(async (src)=>!!await caches.match(new URL(src!,location.href)),source);
  await page.keyboard.press('Escape');
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button',{name:'赛事相册',exact:true}).click();
  await page.getByRole('button',{name:'打开 Team Liquid 2019 夺冠合照'}).click();
  await page.locator('.album-lightbox-image img').evaluate((img:HTMLImageElement)=>img.decode());
  expect(await page.locator('.album-lightbox-image img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(500);
});
