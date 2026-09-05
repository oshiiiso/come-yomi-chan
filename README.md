# コメ読みちゃん（come-yomi-chan）

TikTok LIVE のコメント画面と読み上げ（Electron + TypeScript）

個人・身内利用向けです。ソースは公開しています。**不特定多数向けの配布は想定していません**が、ソースの使い方は基本的に自由です。

- リポジトリ: https://github.com/oshiiiso/come-yomi-chan
- 不具合・要望: [Issues](https://github.com/oshiiiso/come-yomi-chan/issues)
- 使い方: [docs/USER.md](docs/USER.md)
- テスト: [docs/TEST.md](docs/TEST.md)

## 機能概要

- 自分の TikTok LIVE のコメント／ギフト／フォロー等を、アプリのコメント画面と配信コメント列の両方に出す
- コメント画面はコメントとギフト／フォロー等を左右に分けられ、まとめるにも切り替えられる。常に手前／コンパクト窓、読み上げのショートカット（初期 F8／F9。Shift／Ctrl との組み合わせ可。消すとキーだけ無効）もある
- ローカル URL を TikTok LIVE Studio（リンクソース）と OBS（ブラウザソース）に貼る
- Windows 内蔵 TTS または VOICEVOX で wav を作り、オーバーレイ内で再生する（ソース音声に乗る）
- VOICEVOX 本体はアプリから起動でき、起動時に連動させることもできる
- コメントとギフトで表示・読み上げテンプレートを分けて編集できる
- 見た目はプリセットとスライダーで調整できる（カスタム CSS も可）
- アプリ本体の明るさは PCの設定／ダーク／ライトから選べる
- 読み上げテンプレートの半角 `.` は無音の拍

## ディレクトリ構成

```
src/main/            # Electron メインプロセス
src/app/             # 接続・読み上げ・配信の進行
src/tiktok/          # TikTok LIVE 接続
src/tts/             # TTS エンジン（Windows 内蔵 / VOICEVOX）
src/template/        # 表示・読み上げテンプレート
src/overlay-server/  # オーバーレイ HTTP / WebSocket
src/shared/          # 型・設定・文言・ログ
src/test/            # 自動テスト（領域ごとに分割）
ui/                  # 設定画面・オーバーレイ HTML（bundler なし）
ui/js/               # 画面スクリプト。shared の複製は個別ファイル
scripts/             # Windows TTS ワーカー、preload 確認
docs/USER.md         # 使い方ガイド
docs/TEST.md         # テストの範囲と配置
data/                # 開発時の設定（.gitignore）
logs/                # 開発時のログ（.gitignore）
release/             # ビルド出力（.gitignore）
```

## 開発環境セットアップ

```powershell
npm install
copy .env.example .env
npm test
npm start
```

開発時は `.env.dist` の設定が読み込まれ、`.env` で上書きできます。設定・ログはプロジェクトルートの `data/` / `logs/` に保存されます。

### 環境変数（`.env`）

| 変数 | 説明 | デフォルト |
|---|---|---|
| `LOG_LEVEL` | DEBUG / INFO / WARNING / ERROR | `INFO` |
| `LOG_RETENTION_DAYS` | ログ保持日数 | `30` |
| `APP_NAME` | アプリ名 | `コメ読みちゃん` |
| `OVERLAY_HOST` | オーバーレイの待ち受け | `127.0.0.1` |
| `OVERLAY_PUBLIC_HOST` | LIVE Studio に貼るホスト名 | `lvh.me` |
| `OVERLAY_STUDIO_HOST` | 別アドレス（OBS など） | `overlay.localhost` |
| `OVERLAY_PORT` | オーバーレイのポート | `8787` |
| `BEAT_MS` | 読み上げの 1 拍（ミリ秒） | `300` |
| `TTS_AUDIO_TTL_MS` | 読み上げ wav の保持時間（ミリ秒） | `30000` |
| `VOICEVOX_HOST` | VOICEVOX の待ち受け | `127.0.0.1` |
| `VOICEVOX_PORT` | VOICEVOX のポート | `50021` |
| `WINDOW_BACKGROUND` | ウィンドウ背景色 | `#141517` |
| `TRAY_ICON_PATH` | トレイアイコン。空なら `assets/tray-icon.png` | `assets/tray-icon.png` |
| `ISSUES_URL` | 問い合わせ先 Issue URL | GitHub Issues |
| `GITHUB_OWNER` | `ISSUES_URL` が空のとき Issue 先を組み立てる | `oshiiiso` |
| `GITHUB_REPO` | `ISSUES_URL` が空のとき Issue 先を組み立てる | `come-yomi-chan` |
| `USER_GUIDE_PATH` | ヘルプ表示用 Markdown | `docs/USER.md` |
| `EULER_API_KEY` | 任意。ギフト一覧取得用 | （空） |
| `TIKTOK_SIGN_API_KEY` | 旧名。`EULER_API_KEY` が空のときだけ見る | （空） |
| `TIKTOK_SESSION_ID` | 任意。配信者 TikTok の `sessionid` cookie | （空） |
| `TIKTOK_TARGET_IDC` | 任意。配信者 TikTok の `tt-target-idc` cookie | （空） |
| `TIKTOK_AUTHENTICATE_WS` | `1` で WebSocket も認証（署名サービスに cookie が渡る） | （空＝オフ） |

`.env` は Git に含めません。

## テスト

自動テストは `src/test/`。範囲と配置は [docs/TEST.md](docs/TEST.md)。本物の TikTok LIVE にはつながない。配信接続は手動。

## ビルド（身内に渡す ZIP）

```powershell
npm run dist
```

出力: `release/コメ読みちゃん-x.x.x-win.zip`

| コマンド | 出力 |
|---|---|
| `npm run pack` | `release/win-unpacked/`（動作確認用） |
| `npm run dist` | ポータブル ZIP |

ZIP には `.portable` と `.env.dist`（→ `.env` として同梱）が含まれます。exe のファイル名は `コメ読みちゃん.exe` です。デスクトップのショートカットだけ Electron の絵になるときは、Windows がアプリ ID のアイコンを見ています。一度起動するとスタートメニュー側に正しい絵を登録し、既存のデスクトップショートカットも直します。まだ Electron ならショートカットを作り直してください。

### 未署名 exe について

`npm run dist` で作る exe は**コード署名されていません**。Windows 11 で Smart App Control がオンだと起動できないことがあります。

## アーキテクチャ（概要）

1. `src/main/index.ts` が Electron を起動し、オーバーレイ HTTP を立てる
2. TikTok LIVE のイベントを正規化し、テンプレートで表示文・読み上げ文を作る
3. Windows TTS または VOICEVOX が wav を返し、オーバーレイが `<audio>` で再生する
4. 設定は `electron-store`（`src/shared/config-store.ts`）

TTS エンジンは `src/tts/tts-engine.ts` のインタフェースで差し替えできます。実装は Windows 内蔵と VOICEVOX です。

## ブランチ運用

| ブランチ | 用途 |
|---------|------|
| **develop** | 日常の開発 |
| **main** | 確定版（develop からマージ。タグ `v*` で版を管理） |

## 注意事項

- TikTok の非公式 Webcast に依存しています。利用規約・障害・仕様変更のリスクは自己責任でください。
- TikFinity と同時起動すると、同じ配信へ接続が 2 本立ちます。
- 本アプリは個人利用向けです。公開サービスとしての提供は想定していません。

## ライセンス

MIT License — Copyright (c) 2026 oshiiiso

TikTok 接続に `tiktok-live-connector` を使っています。当該ライブラリのライセンスも確認してください。

詳細は [LICENSE](LICENSE) を参照。
