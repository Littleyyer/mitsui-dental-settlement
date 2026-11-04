# 三井牙醫・三井美學牙醫｜資金與財產結算

單頁 HTML，使用 Supabase 做即時共用儲存。

## 網站
啟用 GitHub Pages 後網址為：https://Littleyyer.github.io/mitsui-dental-settlement/

## 如何修改內容
1. 用 Claude 修改 `index.html`
2. 把新版 `index.html` 推到這個 repo（取代舊檔案）
3. GitHub Pages 會自動更新，約 1–2 分鐘生效

## Supabase 資料表
```sql
CREATE TABLE IF NOT EXISTS clinic_items (
  clinic_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinic_id, item_key)
);
ALTER TABLE clinic_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_read" ON clinic_items FOR SELECT USING (true);
CREATE POLICY "pub_ins"  ON clinic_items FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_upd"  ON clinic_items FOR UPDATE USING (true);
CREATE POLICY "pub_del"  ON clinic_items FOR DELETE USING (true);
```
