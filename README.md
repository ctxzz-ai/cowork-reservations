# 大学コワーキング施設 利用登録デモ

大学内コワーキング施設（定員3名）の予約・利用状況をブラウザローカルで管理する React + Vite 製デモアプリです。外部サーバーや認証を伴わず、`localStorage` のみでデータを永続化します。

## 主な機能

- 月/週/日ビューを切り替えられる 30 分刻みのカレンダー
- スロットごとの在室人数バッジ表示（満席アラートあり）
- 匿名化された予約詳細ポップオーバーと直近予約の編集・削除
- 氏名・所属・利用時間を入力する予約作成/編集ダイアログ
- 予約データの JSON エクスポート/インポートと全件削除
- Asia/Tokyo タイムゾーンに合わせた日付計算

## 技術スタック

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [dayjs](https://day.js.org/)
- [tweakcn](https://github.com/jnsahaj/tweakcn)

## 開発手順

> **注意:** このリポジトリはデモ環境向けに作成されており、`npm install` が制限される場合があります。

1. 依存パッケージをインストール

   ```bash
   npm install
   ```

2. 開発サーバーを起動

   ```bash
   npm run dev
   ```

3. ビルド（GitHub Pages などで配信する場合）

   ```bash
   npm run build
   ```

4. ビルド成果物のプレビュー

   ```bash
   npm run preview
   ```

## データ仕様

`localStorage` の `cowork-reservations` キーに以下の形式で保存されます。

```json
{
  "version": 1,
  "data": [
    {
      "id": "uuid",
      "name": "氏名",
      "affiliation": "所属",
      "start": "2025-09-26T10:00:00+09:00",
      "end": "2025-09-26T11:30:00+09:00",
      "createdAt": "2025-09-26T09:10:00+09:00",
      "updatedAt": "2025-09-26T09:10:00+09:00"
    }
  ]
}
```

## ライセンス

このリポジトリはデモ用途のため、特にライセンスを定めていません。必要に応じて適宜追記してください。
