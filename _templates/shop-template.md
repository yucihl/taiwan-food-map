---
# 每個欄位都是選填：不知道就整行刪掉，或保留空白。
# 檔名就是 slug：_shops/<縣市英文>-<區英文>-<店名英文或拼音>.md

name:                          # 店名
branch:                        # 分店名
status: open                   # open 營業中｜temp-closed 暫停營業｜closed 已歇業（省略 = open）

# —— 位置 ——（city / district 可省略，會從地址自動判斷）
address:                       # 例：臺北市中正區八德路一段48號
zip:                           # 郵遞區號，例："100"
city:                          # 例：臺北市
district:                      # 例：中正區
lat:                           # 緯度，小數點後 5 位
lng:                           # 經度
coords_approx:                 # 座標是估計值就填 true

# —— 價位與評分 ——
price_level:                   # 1 $ ≤150｜2 $$ 151–300｜3 $$$ 301–600｜4 $$$$ >600（每人一餐）
price_note:                    # 例："每人約 NT$250"
rating:                        # 1–5 整數

# —— 標籤 ——（第一個 = 主標籤；新標籤要登記到 _data/tags.json）
tags: []

# —— 營業時間 ——（"11:00-14:00, 17:00-21:00"｜"18:00-02:00"｜"公休"｜"未知"）
hours:
  mon:
  tue:
  wed:
  thu:
  fri:
  sat:
  sun:
  note:
hours_checked:                 # YYYY-MM-DD

# —— 推薦餐點 ——
dishes:
  # - name: 招牌拉麵
  #   price: 280
  #   note: 一句話

# —— 照片 ——（放在 assets/images/shops/<slug>/）
photos:
  # - file: 01.webp
  #   alt: 招牌拉麵特寫

# —— 紀錄 ——
visited:                       # 第一次去的日期 YYYY-MM-DD
updated:                       # 最後修改日期 YYYY-MM-DD
links:
  # - label: Google 地圖
  #   url: https://...
---

（這裡寫心得，可以留空）
