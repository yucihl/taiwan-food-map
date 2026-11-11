# 🍙 我的台灣美食圖鑑

一個人吃遍台灣的美食筆記本。用地圖找到我吃過的店，可以依北中南東、縣市、鄉鎮市區篩選，也可以直接搜尋地名或店名。

- 🌐 網站：https://<你的帳號>.github.io/taiwan-food-map/
- 🤖 給 AI 的開發規則：[AGENTS.md](AGENTS.md)

## 新增一間店

在 `_shops/` 新增一個 Markdown 檔（可以複製 `_templates/shop-template.md`），所有欄位都是選填：

```markdown
---
name: 丸舢拉麵
address: 臺北市中正區八德路一段48號
tags: [拉麵]
rating: 4
---
這裡寫心得。
```

push 到 GitHub 之後，大約 1 分鐘網站就會更新。也可以在網站的「＋新增店家」頁面填表，產生內容後再交給 AI。

## 部署（GitHub Pages）

1. 建立 repo `taiwan-food-map`，並把專案 push 上去。如果用了別的 repo 名稱，記得修改 `_config.yml` 的 `baseurl`。
2. 到 repo 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main` / `(root)`，然後按 Save。

## 開發工具（選用，需要 Node）

```bash
npm install
npm run check     # 檢查店家檔格式
npm run preview   # 產生 preview/index.html，可以直接用瀏覽器打開預覽
```

## 授權與資料來源

- 地圖：[Leaflet](https://leafletjs.com/)、[OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者
- 行政區界線：[taiwan-atlas](https://github.com/dkaoster/taiwan-atlas)（MIT）
