# テスト

自動テストは `node --test`。本物の TikTok LIVE にはつながない。画面操作の E2E も無い。配信接続は手動で確認する。

```powershell
npm test
```

`tsc` のあと `dist/test/**/*.test.js` を走らせ、最後に Electron で preload が載るかを見る。新しいテストを足したら `package.json` の列挙は不要。

## 配置

テストは `src/test/` にだけ置く。本番コードと同じフォルダには置かない。領域の分け方は `src/` に合わせる。

```
src/test/app/              # 進行（いいね累計など）
src/test/overlay-server/   # オーバーレイ HTTP / WebSocket
src/test/shared/           # 判定・設定・文言・画面用の正規化
src/test/template/         # 表示・読み上げテンプレート
src/test/tiktok/           # Webcast イベントの読み取り
src/test/tts/              # 読み上げキューとエンジン周辺
scripts/verify-preload.js  # Electron で preload が載るか
```

新しい `*.test.ts` は上のどれかに足す。`package.json` のファイル列挙は不要（`node --test` が `dist/test/**/*.test.js` を拾う）。

## 見ているもの

### 進行（`src/test/app/`）

| ファイル | 見ていること |
|---|---|
| `like-tracker.test.ts` | ユーザーごとのいいね累計。区切りをまたいだときだけ通知。reset と人数上限 |

### オーバーレイ（`src/test/overlay-server/`）

| ファイル | 見ていること |
|---|---|
| `overlay-server.test.ts` | HTTP の配信、WebSocket のイベント／クリア／チャイム／読み上げ合図、wav の期限、プレビュー接続を本番に数えないこと、ポート変更失敗時に待ち受けが残ること |
| `gift-image-proxy.test.ts` | TikTok CDN だけ許可、ローカル画像はそのまま、キャッシュ上限 |

ローカル HTTP を立てる。本物の配信にはつながない。

### 判定・設定（`src/test/shared/`）

| ファイル | 見ていること |
|---|---|
| `event-pipeline.test.ts` | 表示する／読むの判定。ギフト扱い、最低ダイヤ、メンション、URL、連投、ミュート、配信者、テスト送信 |
| `comment-filters.test.ts` | NG ワード、メンション、絵文字コメント、URL 除去、ミュート／ブロック一覧 |
| `speech-filters.test.ts` | ファン最低レベ、スパファン、連投間隔 |
| `event-templates.test.ts` | 種別ごとの表示・読み上げテンプレ選択。旧 subscribe、ポータル投げ／経由 |
| `portal-event.test.ts` | 種別 `portal` は投げ、ギフト名つき入室は経由 |
| `super-fan-event.test.ts` | スパファンボックス判定、加入の短い重複捨て、高いギフトのチャイム |
| `viewer-event.test.ts` | コメント画面の左右と表示チェック。旧メンバー通知はスパファンに従う |
| `viewer-dock.test.ts` | コメント画面の窓配置。旧形式の寄せ、ポータル追加、表示オフ、ドッキング |
| `viewer-guide.test.ts` | 未接続／待ち／接続済みで出す案内。本番の行があるときだけ隠す |
| `viewer-layout.test.ts` | コメント画面の幅・レイアウト種別・文字サイズ |
| `viewer-status-line.test.ts` | 配信接続・切断の状態変化でコメント画面に出す行 |
| `viewer-room-stats.test.ts` | ROOM_USER から視聴者数と上位ギフトを正規化する |
| `settings-layout.test.ts` | 設定プレビュー幅 |
| `chat-display.test.ts` | コメント表示時間（0 は無制限、1〜120 秒） |
| `overlay-look.test.ts` | 見た目プリセットと壊れた設定の戻し |
| `overlay-motion.test.ts` | 配信ソースの動きテンプレートと速さの正規化 |
| `overlay-pin.test.ts` | 固定枠の秒数・種類・待ち上限。コメントは対象外、旧 subscribe はスパファン。種類を外した待ちと、固定枠オフ時の振り分け。出しっぱなしは枠が使えるときだけ |
| `overlay-url.test.ts` | LIVE Studio 向け URL と公開ホスト |
| `ui-theme.test.ts` | アプリの明るさ（system / dark / light） |
| `fan-club-name.test.ts` | ファンクラブ名の整形と配信で覚えた名前 |
| `fan-level-look.test.ts` | ファンレベの段階と色 |
| `gift-tier.test.ts` | ダイヤ数の帯（安い／中／高い／最高） |
| `help-topics.test.ts` | ヘルプ見出しの飛び先。USER.md の見出しと索引、エラーからの誘導 |
| `hotkeys.test.ts` | 読み上げショートカットの正規化、空（未設定）、修飾キー |
| `config-store.test.ts` | 初期化は TikTok ID とポートだけ残す |
| `config-transfer.test.ts` | 設定 JSON の書き出し／読み込み。別アプリと壊れた JSON は拒否 |
| `session-log.test.ts` | タブ区切りログ、行数上限、ファイル名 |
| `messages.test.ts` | レンダラ向け文言が IPC で渡せる形。`ui/js/renderer-copy.js` のキーと一致 |
| `preload-channels.test.ts` | preload は `electron` 以外を import しない。チャンネル名は `IpcChannels` と一致 |
| `error-utils.test.ts` | 例外から表示用メッセージを取る |
| `with-timeout.test.ts` | 制限時間つき待ちと close |

### テンプレート（`src/test/template/`）

| ファイル | 見ていること |
|---|---|
| `render-template.test.ts` | `{user}` `{comment}` `{gift}` `{count}` `{likes}` の展開。個数・省略・拍（半角 `.`） |

### TikTok イベント読み取り（`src/test/tiktok/`）

偽物の Webcast オブジェクトを渡す。接続ループは見ない。

| ファイル | 見ていること |
|---|---|
| `comment-fields.test.ts` | コメント本文。v3 / 旧形式、絵文字だけの代替文言 |
| `gift-fields.test.ts` | ギフト名と画像 URL。旧形式、一覧復元、危険なスキームは拒否 |
| `social-fields.test.ts` | フォロー／シェアの判定 |
| `envelope-fields.test.ts` | 宝箱・スパファンボックス、非表示、ダイヤ数 |
| `portal-fields.test.ts` | ポータル投げ（ギフト名）とポータル経由入室 |
| `event-user.test.ts` | ユーザーの ID・名前・アイコン・ファン印・配信者・モデ |
| `user-badges.test.ts` | ファンクラブ／スパファン／モデの印。名前だけでは加入にしない |
| `user-preview.test.ts` | 接続前の部屋情報から名前・アイコン・クラブ名 |
| `connection-error.test.ts` | 配信前／ID 誤り／通信失敗／署名拒否の文言と再試行 |
| `session-options.test.ts` | `.env` の TikTok セッション cookie と WebSocket 認証フラグ |

### 読み上げ（`src/test/tts/`）

| ファイル | 見ていること |
|---|---|
| `tts-queue.test.ts` | 待ち上限、待ち捨て、優先読み上げ。偽物エンジン |
| `fallback-tts-engine.test.ts` | 優先エンジンが使えない／失敗したとき内蔵 TTS へ |
| `wav-utils.test.ts` | 無音 WAV の生成と結合 |
| `windows-tts-worker.test.ts` | Windows 内蔵 TTS で実際に wav を書く（Windows 以外はスキップ。Zira が無いときは英語声の確認だけ飛ばす） |
| `voicevox-speakers.test.ts` | スピーカー一覧から声とクレジット名 |
| `voicevox-credit.test.ts` | 概要欄用クレジット文 |
| `voicevox-url.test.ts` | VOICEVOX の接続先はローカルだけ |
| `voicevox-launcher.test.ts` | 実行ファイルの許可、よくあるインストール先、起動しない条件 |

### preload（`scripts/verify-preload.js`）

隠れ窓で preload を読み、`window.liveTts` が付くかを見る。sandbox で相対 require が落ちていないかの確認。

## 見ていないもの

次は自動では見ていない。本物 LIVE は手動。

- 本物の TikTok LIVE への接続・再接続・切断
- 設定画面／コメント画面のクリック操作
- `SessionManager` の通し（接続 → 表示 → 読み上げ）
- トレイ、ショートカット登録、窓の表示
- VOICEVOX 本体を実際に起動して読むこと（パス判定と偽物応答だけ）

## 足し方

1. 対象の領域フォルダに `*.test.ts` を置く
2. `node:test` と `node:assert/strict` を使う
3. 本番コードは `../../<領域>/...` から import する
4. `npm test` で通す

画面や接続の通しを足すときは、本番の UI／機能を崩さないこと。本物 LIVE は手動のままにする。
