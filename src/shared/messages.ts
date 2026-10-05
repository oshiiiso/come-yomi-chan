import { HELP_HEADING_ID } from './help-topics';

export const MSG = {
  app: {
    starting: 'アプリ起動',
    startingPackaged: 'アプリ起動（ビルド版）',
    startingDev: 'アプリ起動（開発版）',
    quitting: 'アプリ終了',
  },
  connection: {
    disconnected: '未接続',
    connecting: '接続中...',
    waitingLive: '配信開始を待っています',
    live: '配信に接続しました',
    reconnecting: (seconds: number) => `${seconds}秒後に再接続します`,
    uniqueIdRequired: 'TikTok IDを入力してください',
    overlayReady: (url: string) => `オーバーレイ: ${url}`,
    overlayFailed: 'オーバーレイサーバーを起動できませんでした',
    connectFailed: '配信への接続に失敗しました',
    connectTimeout: '配信への接続が時間切れになりました',
    notLive: '配信が始まっていません。開始を待っています',
    userNotFound: 'TikTok ID が見つかりません。設定を確認してください',
    networkFailed: '配信に繋がりませんでした。再試行します',
    signFailed:
      'コメント取得の接続処理が拒否されました。時間をおいて再試行します',
    retrying: (detail: string, seconds: number) =>
      `${detail}（${seconds}秒後に再試行）`,
    disconnectedFromLive: '配信から切断されました',
    streamEnded: '配信が終了したので切断しました',
    alreadyConnected: 'すでに接続しています',
    confirmUser: 'このアカウントに接続しますか？',
    lookupFailed: 'アカウントを確認できませんでした。TikTok ID を見直してください',
    lookingUp: 'アカウントを確認しています…',
    idChangedNeedConfirm:
      'TikTok ID を変えたので切断しました。接続する前に、相手のアイコンと名前を確認してください',
    needConfirmOnce:
      '起動時の接続は、一度アイコンと名前を確認したIDだけ使います。「接続」を押してください',
  },
  tts: {
    engineMissing: '読み上げエンジンが見つかりません',
    voiceMissing: '指定した声が見つかりません。既定の声を使います',
    synthesizeFailed: '読み上げ音声の生成に失敗しました',
    windowsOnly: '内蔵TTSはWindowsでのみ利用できます',
    previewFailed: '読み上げのテストに失敗しました',
    workerFailed: '読み上げ用プロセスを起動できませんでした',
    voicevoxNotRunning:
      'VOICEVOXに接続できません。「VOICEVOXを起動」を押すか、VOICEVOX本体を起動してください',
    voicevoxReady: 'VOICEVOXに接続しました',
    windowsReady: 'Windows 内蔵TTSを使います',
    fallbackWindows: 'VOICEVOXに繋がらないので、Windows内蔵TTSで読み上げます',
    voicevoxAlreadyRunning: 'VOICEVOXはすでに起動しています',
    voicevoxLaunching: 'VOICEVOXを起動しています…',
    voicevoxLaunched: 'VOICEVOXを起動しました',
    voicevoxExeMissing:
      'VOICEVOX.exe が見つかりません。参照で場所を指定してください',
    voicevoxExeInvalid: 'VOICEVOXの実行ファイル（.exe）を指定してください',
    voicevoxLaunchFailed: 'VOICEVOXを起動できませんでした',
    voicevoxLaunchTimeout:
      'VOICEVOXを起動しましたが、まだ応答がありません。少し待ってから声を再取得してください',
    voicevoxPickTitle: 'VOICEVOX.exe を選択',
    voicevoxDescription: (credit: string) =>
      `この配信のコメント読み上げに ${credit} を使用しています。`,
  },
  ui: {
    initFailed: 'アプリの初期化に失敗しました',
    helpOpenLabel: 'ヘルプ',
    invalidPort: 'ポートは 1024〜65535 で指定してください',
    invalidLikeMilestone: 'いいねの区切りは 1 以上の整数にしてください',
    invalidDisplaySec: '表示時間は 1〜120 秒で指定してください',
    invalidDisplayChars: '表示の文字数上限は 10〜400 にしてください',
    invalidSpeechChars: '読み上げの文字数上限は 10〜400 にしてください',
    invalidMaxQueue: '待ちの上限は 1〜100 にしてください',
    invalidHotkeySame:
      '飛ばす・読み上げ待ち捨て・固定枠待ち捨て・一時停止・新着音ミュートのキーは別にしてください',
    invalidPinSec: '固定枠の表示時間は 1〜120 秒で指定してください',
    invalidEventAlertSec: 'イベントアラートの表示時間は 1〜120 秒で指定してください',
    eventAlertLabel: 'イベントアラート',
    eventAlertHint:
      '別の配信ソース（イベントアラート用URL）に出します。初期は種類ごとの簡易テンプレです。画像を選ぶと差し替えできます。',
    eventAlertMediaAuto: '自動',
    eventAlertMediaTemplate: 'テンプレ',
    eventAlertMediaFile: 'ファイル',
    eventAlertMediaNone: 'なし',
    eventAlertMediaAutoHint:
      '初期は種類ごとの簡易テンプレです。画像を選ぶと差し替え、テンプレに戻すで初期化できます。',
    eventAlertTemplateNames: {
      gift: 'ギフト用テンプレ',
      follow: 'フォロー用テンプレ',
      share: 'シェア用テンプレ',
      superFan: 'スパファン用テンプレ',
      envelope: '宝箱用テンプレ',
      portal: 'ポータル用テンプレ',
      like: 'いいね用テンプレ',
      member: '入室用テンプレ',
    },
    eventAlertPickMedia: '画像を選ぶ',
    eventAlertResetTemplate: 'テンプレに戻す',
    eventAlertSecLabel: '表示時間',
    eventAlertChatUrlTitle: 'コメント列（固定枠あり）',
    eventAlertAlertsUrlTitle: 'イベントアラート',
    eventAlertAlertsUrlHint:
      '中央に画像や GIF を出す用です。コメント列とは別に、配信ソフトへソースを追加してこの URL を貼ってください。',
    pickAlertMediaTitle: 'アラート用の画像・GIFを選ぶ',
    pickAlertMediaFilter: '画像',
    pickAlertMediaFailed: 'アラート画像の取り込みに失敗しました',
    invalidGiftChimeBandOverlap: 'ダイヤ数の帯が重なっています。範囲を直してください',
    invalidGiftChimeBandRange: 'ダイヤ数の帯は下限≦上限にしてください',
    invalidGiftChimeBandValue: 'ダイヤ数の帯は 0 以上の整数にしてください',
    giftChimeDestinationHint:
      'サウンドモードでは、アプリ本体だけ音が鳴ります（配信ソースには鳴りません）。配信に載せたいときは、OBS などでアプリの音声をキャプチャしてください。',
    giftChimeMatchGift: 'ギフトの種類',
    giftChimeMatchDiamond: 'ダイヤ数',
    giftSpeakSearchLabel: '検索',
    giftSpeakSearchPlaceholder: '名前・ダイヤ',
    giftSpeakSearchEmpty: '一致するギフトがありません',
    giftSpeakEnableAll: '全選択',
    giftSpeakEnableNone: '全外し',
    giftSpeakBulkGroupLabel: '有効の一括操作',
    giftTestHint:
      '空のときは仮のバラになります。配信中に届いたギフトは一覧へ足されて保存されます。',
    giftCatalogReloadHint:
      '普段は押さなくて大丈夫です。最初からよくあるギフトが入っていて、配信中に来た分は自動で足されます。まとめて取り直したいときだけ使ってください。',
    giftCatalogReloadButton: '一覧を再取得',
    giftChimeColEnable: '有効',
    giftChimeColGift: 'ギフト',
    giftChimeColSound: 'サウンド',
    giftChimeColVolume: '音量',
    giftChimeSelectSound: '選択',
    giftChimeVolumeLabel: '音量',
    giftChimeCommonVolumeLabel: '共通の音量',
    giftChimeCommonVolumeHint:
      'テンプレ音（個別音を選んでいないギフト）の音量です。一覧の音量バーは個別ファイル音のときだけ変えられます。',
    giftChimeTestButton: '再生',
    giftChimeStopButton: '停止',
    giftChimeTestFailed: '効果音のテストに失敗しました',
    giftChimeDiamondBandsHint:
      '上限を空にすると、それ以上のダイヤもその帯に含めます。\n\nどの帯にも入らないダイヤは鳴りません。帯が重なると保存できません。',
    giftChimeDiamondMinPlaceholder: '下限',
    giftChimeDiamondMaxPlaceholder: '上限（空可）',
    giftChimeDiamondBandAdd: '帯を追加',
    giftChimeDiamondBandMaxReached: 'ダイヤ数の帯は 30 個までです',
    giftChimeDiamondBandTest: 'テスト送信',
    giftChimeDiamondBandRemove: '削除',
    nicknameAddNeedBoth: 'TikTok ID と呼び方の両方を入れてください',
    listAlreadyExists: 'すでにあります',
    listEmpty: 'まだありません',
    soundResetTemplate: 'テンプレに戻す',
    giftChimeSoundResetHint: '右クリックでテンプレ音に戻します',
    hotkeyTitle: 'ショートカット',
    hotkeySkipLabel: '読み上げを飛ばすキー',
    hotkeyClearLabel: '読み上げの待ちを捨てるキー',
    hotkeyClearPinLabel: '固定枠の待ちを捨てるキー',
    hotkeyPauseLabel: '読み上げを一時停止するキー',
    hotkeyMuteCommentSoundLabel: '新着音をミュートするキー',
    skipSpeechButton: '読み上げを飛ばす',
    clearSpeechButton: '読み上げの待ちを捨てる',
    clearPinButton: '固定枠の待ちを捨てる',
    pauseSpeechButton: '読み上げを一時停止',
    resumeSpeechButton: '読み上げを再開',
    muteCommentSoundButton: '新着音をミュート',
    unmuteCommentSoundButton: '新着音ミュート解除',
    operationsMenu: '操作',
    speechPaused: '読み上げを一時停止しました',
    speechResumed: '読み上げを再開しました',
    commentSoundMuted: 'コメント新着音を一時ミュートしました',
    commentSoundUnmuted: 'コメント新着音のミュートを解除しました',
    hotkeyPress: 'キーを押す',
    hotkeyUnset: '消す',
    hotkeyHint:
      'ボタンを押してから、使いたいキーを押します。Shift や Ctrl も一緒に使えます。\n\n消すとキーは効かなくなり、画面上のボタンだけ使えます。入力欄にフォーカスがあるときは効きません。',
    saveOk: '設定を保存しました',
    saveFailed: '保存に失敗しました',
    resetConfigLabel: '設定を初期化する',
    resetConfigHint:
      '文言・見た目・読み上げ・フィルタなどを最初の状態に戻します。\n\nTikTok ID と配信画面用のポートは残します。',
    resetConfigTitle: '設定を初期化しますか？',
    resetConfigConfirm: '初期化する',
    resetConfigCancel: 'やめる',
    resetConfigOk: '設定を初期化しました',
    resetConfigFailed: '設定の初期化に失敗しました',
    exportConfigLabel: 'プロファイルを書き出す',
    importConfigLabel: 'プロファイルを読み込む',
    transferConfigHint:
      'プロファイルをファイルに書き出して、別の PC や再インストール後に戻せます。TikTok ID とポートは含みません。\n\n以前の「設定書き出し」ファイルも読み込めます。VOICEVOX の場所は別の PC だと直してください。',
    exportProfileTitle: 'プロファイルの書き出し',
    exportProfileOk: 'プロファイルを書き出しました',
    exportProfileFailed: 'プロファイルの書き出しに失敗しました',
    importProfileTitle: 'プロファイルの読み込み',
    importProfileConfirmTitle: 'プロファイルを読み込みますか？',
    importProfileConfirm:
      '今の設定（TikTok ID とポート以外）を、ファイルの内容で上書きします。VOICEVOXの場所は別のPCだと直してください。',
    importProfileOk: 'プロファイルを読み込みました',
    importProfileFailed: 'プロファイルの読み込みに失敗しました',
    importProfileInvalid: 'このファイルはコメ読みちゃんのプロファイルではありません',
    importProfileFilter: 'プロファイル',
    importProfileLabel: '読み込む',
    profileNeedDisconnect: '配信に接続中はプロファイルを切り替えられません。切断してください',
    profileHint:
      '見た目・読み上げ・フィルタなどを名前付きで保存し、切断中だけ切り替えられます。\n\nTikTok ID とポートは変わりません。',
    profileNameLabel: 'プロファイル名',
    profileNamePlaceholder: '例: 配信用',
    profileSelectLabel: '保存済み',
    profileNameRequired: 'プロファイル名を入力してください',
    profileSaveOk: 'プロファイルを保存しました',
    profileSaveButton: '今の設定を保存',
    profileApplyButton: '適用',
    profileDeleteButton: '削除',
    pickSoundTitle: '効果音ファイルを選ぶ',
    pickSoundFilter: '音声',
    pickSoundFailed: '効果音の取り込みに失敗しました',
    nicknameRename: '呼び方を変える',
    nicknameClear: '呼び方を消す',
    nicknamePrompt: '読み上げと画面に出す名前',
    copied: 'LIVE Studio用URLをコピーしました。このアドレスを貼ってください',
    copiedStudio: '別のURLをコピーしました',
    copiedObs: 'OBS用URLをコピーしました。ブラウザソースに貼ってください',
    copiedAlerts: 'イベントアラート用URLをコピーしました。このアドレスを貼ってください',
    copyObsLabel: 'OBS用をコピー',
    copyFailed: 'コピーに失敗しました',
    creditCopied: 'クレジットをコピーしました。配信の概要欄などに貼ってください',
    creditNotNeeded: 'Windows 内蔵TTSのときはクレジットは不要です',
    creditMissing: 'VOICEVOXの声を選んで保存すると、クレジット文が作れます',
    trayShow: 'メイン画面を表示',
    trayQuit: '終了',
    trayHint:
      '×ボタンで終了します。配信中はトレイに残したい場合、設定の「×ボタンでトレイに最小化」をオンにしてください。',
    testerSent: 'テストをコメント画面とオーバーレイに送りました',
    testerFailed: 'テストの送信に失敗しました',
    giftsLoaded: (count: number) => `${count}件のギフトを読み込みました`,
    giftsEmpty: 'ギフト一覧が空です。TikTok ID を確認して再取得してください',
    giftsFailed:
      'ギフト一覧を取得できませんでした。配信に接続中に「一覧を再取得」すると取りやすいです',
    giftsNeedId: 'TikTok ID を入力してから再取得してください',
    giftsNeedApiKey:
      '一覧の再取得には署名用 API キーが必要なことがあります。配信中に届いたギフトは自動で一覧へ足されます',
    giftsNeedBusinessPlan:
      '無料では一覧を取得できませんでした。Euler の Business プランがあるとフル一覧（日本語）を取りやすいです。配信中に届いたギフトは一覧へ足されます',
    giftsNeedLive:
      '配信が終わっていると部屋IDが取れず、一覧を更新できません。配信に接続中に再取得するか、保存済みの一覧を使ってください',
    giftsCached: '今は更新できませんでした。前回保存した一覧を使います',
    overlayNotConnected:
      '配信ソースに繋がっていません。LIVE Studio用URLを貼り、ソースを更新してください',
    overlayServerDown:
      '配信ソースのサーバーが止まっています。前のコメ読みちゃんを閉じるか、ポート番号を変えてください',
    overlayClientsWaiting:
      '配信ソースのサーバーは起動中です。LIVE StudioにURLを貼ってソースを更新してください',
    overlayClientsConnected: '配信ソース {n}件接続',
    styleApplied: '見た目を反映しました',
    previewShown: 'コメント画面にサンプルを表示しました',
    overlayPreviewShown: '配信ソースにサンプルを表示しました',
    previewCleared: '配信ソースの表示を消しました',
    ttsTestSent: '読み上げテストを送りました',
    speechSkipped: '今の読み上げを飛ばしました',
    speechQueueCleared: '待ちの読み上げを捨てました',
    pinQueueCleared: '固定枠の表示と待ちを捨てました',
    speechQueueFull: '読み上げの待ちが上限に達したので、新しいコメントは読み上げませんでした',
    viewerEmpty: '接続するとコメントがここに出ます',
    viewerCleared: 'コメント画面を消しました',
    viewerStatusConnected: '配信に接続しました',
    viewerStatusDisconnected: '切断しました',
    viewerStatusDisconnectedFromLive: '配信から切断しました',
    viewerRoomCount: '同時視聴者数 {count}人',
    viewerRoomTopLabel: '上位ギフト',
    viewerRoomTopCoins: '{coin}ダイヤ',
    viewerPaneComments: 'コメント',
    viewerPaneEvents: 'ギフト・フォローなど',
    viewerEmptyComments: 'まだコメントはありません',
    viewerEmptyEvents: 'ギフトやフォローが来るとここに出ます',
    viewerSplitLabel: 'コメントとイベントの幅',
    viewerLayoutLabel: 'コメント画面のレイアウト',
    viewerLayoutCombined: 'まとめる',
    viewerLayoutSplit: '分ける',
    viewerLayoutCustom: '自由配置',
    viewerLayoutCustomHint:
      '欄の見出しを他の欄の端へドラッグすると分割できます。種類を中央へドロップすると移せます。',
    viewerDisplayLabel: 'コメント画面に出すもの',
    viewerDisplayShort: 'この画面',
    eventDisplayLabel: '配信ソースに表示',
    eventSpeakLabel: '音を出す',
    previewZoomLabel: 'プレビューの拡大',
    giftSpeakListHint:
      '初期一覧にないギフトは、配信中に投げられると自動で足されます。\n\n鳴らしたいギフトだけ有効にしてください。読み上げモードの TTS には効きません。',
    viewerFontSizeLabel: 'コメント画面の文字サイズ',
    overlayMotionLabel: '動き',
    overlayMotionHint:
      'コメントと固定枠の入退場の動きです。変更は次に出る行から反映されます。\n\nプレビューは選ぶとその場で再生されます。',
    overlayMotionSpeedLabel: '速さ',
    overlayMotionReplay: '動きを見る',
    settingsTabLook: '配信の見た目',
    lookTabHint:
      '視聴者向けの配信ソースの見た目をここで調整します。\n\nコメント画面の文字サイズや欄の幅は、コメント画面上のコントロールで変えます。',
    lookChatTitle: 'コメント列',
    overlayMotionFuwatto: 'ふわっと',
    overlayMotionFade: 'フェード',
    overlayMotionSlideUp: '下から',
    overlayMotionSlideDown: '上から',
    overlayMotionSlideLeft: '左から',
    overlayMotionSlideRight: '右から',
    overlayMotionZoom: '拡大',
    overlayMotionBounce: 'バウンス',
    overlayMotionBlur: 'ぼかし',
    overlayMotionFlip: '裏返り',
    overlayMotionNone: 'なし',
    overlayMotionSpeed1: 'とても遅い',
    overlayMotionSpeed2: '遅い',
    overlayMotionSpeed3: 'ふつう',
    overlayMotionSpeed4: '速い',
    overlayMotionSpeed5: 'とても速い',
    overlayPinTitle: '固定枠',
    overlayPinHint:
      'ギフトなどをコメント列の直上に1件ずつ出します。来た順に切り替わります。\n\n表示時間は、入場から退場が終わるまでです。コメント画面には出ません。',
    overlayPinEnabledLabel: '固定枠を使う',
    overlayPinEnabledHint: 'オフにすると、今までどおり全部下から流れます。',
    overlayPinSecLabel: '固定枠の表示時間（秒）',
    overlayPinHoldLabel: '次が無いときは出したまま',
    overlayPinHoldHint:
      'オンのとき、待ちが無ければ枠を消しません。\n\n次のイベントが来たら、表示時間のあと切り替わります。',
    overlayPinTypesLabel: '固定枠に出す種類',
    overlayPinTypesHint:
      'オフにした種類は、コメント列と一緒に流れます。\n\n初期値では、コメント以外はすべて固定枠です。',
    overlayPinPreviewLabel: 'プレビューも固定枠で見る',
    overlayPinPreviewHint:
      'オフのとき、プレビューだけ従来どおり全部が下から流れます。\n\nオンのとき、固定枠の種類を表示時間ごとに順に切り替えます。プレビューでは音は鳴りません。配信ソースは上の設定どおりです。',
    overlayPinTypeSecPlaceholder: '共通',
    overlayPinTypeSecHint: '秒 (空=共通)',
    overlayNameColorTitle: '名前の色',
    overlayNameColorEnabledLabel: '配信ソースで名前に色をつける',
    overlayNameColorEnabledHint:
      '同じユーザーは常に同じ色になります。固定枠やイベントアラートにも付きます。初期のパレットのままなら、かんたん見た目のプリセットに合わせた色へ自動で変わります。自分で変えた色はそのままです。',
    overlayNameColorPaletteLabel: '色のパレット（5色）',
    guideNeedIdTitle: '最初にやること',
    guideNeedIdExtra: '自分の TikTok ID（先頭の @ は不要）を入れると、接続できます。',
    guideNeedIdButton: '設定で ID を入れる',
    guideNeedConnectTitle: '次は接続です',
    guideNeedConnectExtra:
      '「接続」を押すと、アイコンと名前が出ます。自分か確認してからつなぎます。',
    guideNeedConnectButton: '接続する',
    guideWaitingTitle: '配信の開始を待っています',
    guideWaitingExtra:
      'いつものように TikTok で配信を開始してください。LIVE Studio でもスマホでも大丈夫です。',
    guideLiveTitle: '接続できました',
    guideLiveExtra:
      'コメントが来るとここに出ます。視聴者の画面にも出すときは、配信ソフトに URL を貼ります。',
    guideLiveButton: '配信画面用URLをコピー',
    guideStepId: '設定で TikTok ID を入れる',
    guideStepConnect: '「接続」を押して相手を確認する',
    guideStepLive: 'TikTok で配信を開始する',
    guideSamplesButton: 'サンプルを見る',
    guideClearSamplesButton: 'サンプルを消す',
    emoteComment: '絵文字',
    mysteryGift: 'お楽しみ袋',
    giftBox: 'ギフトボックス',
    genericGift: 'ギフト',
    treasureBox: '宝箱',
    portalGift: 'ポータル',
    superFanBox: 'スーパーファンボックス',
    viewerUnknownUser: '名前なし',
    viewerBadgeFan: 'メンレベ',
    viewerBadgeSuperFan: 'スパファン',
    viewerBadgeMod: 'モデ',
    viewerBadgeAnchor: '配信者',
    viewerSearchLabel: '検索',
    viewerSearchPlaceholder: '名前・ID・本文',
    viewerSearchEmpty: '一致する行がありません',
    menuView: '窓',
    menuLog: 'サンプル',
    alwaysOnTopMenu: '手前に置く',
    compactMenu: 'コンパクトな窓',
    minimizeWindow: '最小化',
    maximizeWindow: '最大化',
    restoreWindow: '元のサイズに戻す',
    closeWindow: '閉じる',
    viewerPreviewSamples: 'コメント画面にサンプル',
    overlayPreviewSamples: '配信ソースにサンプル',
    overlayClearChat: '配信ソースを消す',
    viewerSaveLog: 'ログを保存',
    viewerClearLog: 'ログを消す',
    viewerSaveLogTitle: 'コメントログの保存',
    viewerLogSaved: 'コメントログを保存しました',
    viewerLogEmpty: '保存する行がまだありません',
    viewerLogFailed: 'コメントログの保存に失敗しました',
    viewerLogClearTitle: 'コメントログを消しますか？',
    viewerLogClearConfirmOk: '消す',
    viewerLogClearOk: 'コメントログを消しました',
    viewerPaneClearTitle: 'この窓の行を消しますか？',
    viewerPaneClearLabel: 'この窓を消す',
    viewerLogRestoreFailed: 'コメントログの復元に失敗しました',
    viewerLogMaxRowsLabel: 'コメント画面の最大行数',
    viewerLogMaxRowsHint: '接続中に追加されたログの保持件数です（全パネル合計）。起動時に前回のログを復元します。設定を減らしても今の行はすぐ消えません。',
    speechReplaceTitle: '読み替え辞書',
    speechReplaceHint: 'コメント本文の読み上げだけ置き換えます。ギフト名・フォローなどは変わりません。ユーザー名の変更は「呼び方」を使ってください。',
    speechReplaceFormatHint:
      '1行が「変換前」と「変換後」です。区切りはタブまたはカンマ（スペースは区切りにしません）。例: w[タブ]わら または w,わら',
    speechReplaceFormatExample: '例: w[タブ]わら または w,わら',
    speechReplaceCounter: (n: number, max: number) => `${n}/${max}件`,
    speechReplaceOverLimit: `辞書の上限（2000件）に達しました。追加と読み込みはできません`,
    speechReplaceExportTitle: '読み替え辞書を書き出す',
    speechReplaceExportFilter: 'テキスト',
    speechReplaceExportOk: '読み替え辞書を書き出しました',
    speechReplaceExportFailed: '書き出しに失敗しました',
    speechReplaceImportTitle: '読み替え辞書を読み込む',
    speechReplaceImportFilter: 'テキスト',
    speechReplaceImportConfirmTitle: '読み替え辞書を読み込みますか？',
    speechReplaceImportConfirm: '今の辞書を上書きします。',
    speechReplaceImportOk: '読み替え辞書を読み込みました',
    speechReplaceImportFailed: '読み込みに失敗しました',
    speechReplaceImportSkipped: (lines: string) => `不正な形式のため読み飛ばした行: ${lines}`,
    speechReplaceImportOverLimit: `上限（2000件）を超えているため読み込めませんでした`,
    speechReplaceClearAllTitle: '読み替え辞書を全部消しますか？',
    speechReplaceClearAllOk: '全部消す',
    nicknameMapHint: 'コメント画面と読み上げの表示名を差し替えます（読み替え辞書とは別）。右クリックからも変えられます。次回起動後も残ります。',
    viewerFocusOn: '同じ人の行を強調しています。もう一度クリックで解除します',
    speakFanSubOnlyLabel: '条件を満たすコメントだけ読む',
    speakFanSubOnlyHint:
      'オフのときは全員のコメントを読みます。\n\nオンのときだけ下の条件が効きます。ギフトやフォローは対象外です。',
    speakFanMinLevelLabel: 'メンレベは何以上を読む',
    speakFanClubCommentsLabel: 'メンレベも読む',
    speakFanClubCommentsHint: 'オフにするとメンレベは読まず、スーパーファン条件だけ使えます。',
    speakSubscriberCommentsLabel: 'スーパーファンは読む',
    speakSubscriberCommentsHint: 'メンレベ未加入でもスーパーファンなら読みます。',
    invalidSpeakFanSubEmpty:
      '「条件を満たすコメントだけ読む」をオンにするときは、メンレベかスーパーファンのどちらかをオンにしてください',
    fanLevelLookLabel: 'メンレベの色',
    fanLevelLookHint:
      'このレベ以上でバッジの色が変わります。\n\nバッジはファンクラブ名とレベル、取れないときはメンレベと数字です。',
    commentBadgeTitle: 'バッジ',
    commentSoundHint:
      '読み上げの代わりにアプリ本体で鳴らします（配信ソースには鳴りません）。',
    commentNotifyModeLabel: 'コメントの出し方',
    commentNotifySpeak: '読み上げ',
    commentNotifySound: '新着音',
    eventNotifySpeak: '読み上げ',
    eventNotifySound: 'サウンド',
    eventSoundHint:
      '読み上げの代わりにアプリ本体で鳴らします（配信ソースには鳴りません）。',
    skipRepeatSpeechLabel: '同じ人の連投は読み上げない',
    skipRepeatSpeechHint:
      '短い間隔で同じ人が続けてコメントしたとき、表示はして読み上げだけ飛ばします。',
    repeatSpeechSecLabel: '連投とみなす間隔',
    viewerTypeComment: 'コメント',
    viewerTypeGift: 'ギフト',
    viewerTypeFollow: 'フォロー',
    viewerTypeShare: 'シェア',
    viewerTypeSubscribe: 'スパファン',
    viewerTypeSuperFan: 'スパファン',
    viewerTypeEnvelope: '宝箱',
    viewerTypePortal: 'ポータル',
    viewerTypeLike: 'いいね',
    viewerTypeMember: '入室',
    confirmUserTitle: 'このアカウントに接続しますか？',
    confirmUserHint: '違う人ならやめて、TikTok ID を直してください。',
    confirmUserButton: 'この人で接続',
    confirmUserCancel: 'やめる',
    viewerMuteUser: 'ミュート（読み上げしない）',
    viewerUnmuteUser: 'ミュート解除',
    viewerBlockUser: 'ブロック（表示も読み上げもしない）',
    viewerUnblockUser: 'ブロック解除',
    viewerCopyComment: 'コメントをコピー',
    viewerCopyId: 'IDをコピー',
    viewerCopyNickname: 'ニックネームをコピー',
    viewerUserMissing: 'この行からユーザーを特定できません',
    viewerCommentCopied: 'コメントをコピーしました',
    viewerIdCopied: 'IDをコピーしました',
    viewerNicknameCopied: 'ニックネームをコピーしました',
    viewerCommentCopyFailed: 'コピーできませんでした',
    viewerCommentEmpty: 'コピーする文言がありません',
    viewerIdEmpty: 'IDがありません',
    viewerNicknameEmpty: 'ニックネームがありません',
    viewerUserMuted: '{user} をミュートしました。読み上げしません',
    viewerUserUnmuted: '{user} のミュートを解除しました',
    viewerUserBlocked: '{user} をブロックしました。表示も読み上げもしません',
    viewerUserUnblocked: '{user} のブロックを解除しました',
  },
  template: {
    commentDisplayDefault: '{user}: {comment}',
    commentSpeechDefault: '{user}.{comment}',
    giftDisplayDefault: '{user}さんから{gift}{count}',
    giftSpeechDefault: '{user}さんから{gift}{count}',
    followDisplayDefault: '{user}さんがフォローしました',
    followSpeechDefault: '{user}さんがフォローしました',
    shareDisplayDefault: '{user}さんがシェアしました',
    shareSpeechDefault: '{user}さんがシェアしました',
    subscribeDisplayDefault: '{user}さんがメンバーになりました',
    subscribeSpeechDefault: '{user}さんがメンバーになりました',
    superFanDisplayDefault: '{user}さんがスーパーファンになりました',
    superFanSpeechDefault: '{user}さんがスーパーファンになりました',
    superFanBoxDisplayDefault: '{user}さんが{gift}を投げたよ',
    superFanBoxSpeechDefault: '{user}さんが{gift}を投げたよ',
    envelopeDisplayDefault: '{user}さんが宝箱を投げたよ',
    envelopeSpeechDefault: '{user}さんが宝箱を投げたよ',
    portalDisplayDefault: '{user}さんがポータルを投げたよ',
    portalSpeechDefault: '{user}さんがポータルを投げたよ',
    portalJoinDisplayDefault: 'ポータルから{user}さんが入室しました',
    portalJoinSpeechDefault: 'ポータルから{user}さんが入室しました',
    likeDisplayDefault: '{user}さんが{likes}いいね',
    likeSpeechDefault: '{user}さんが{likes}いいね',
    memberDisplayDefault: '{user}さんが入室しました',
    memberSpeechDefault: '{user}さんが入室しました',
  },
  tester: {
    user: 'テストユーザー',
    comment: 'テストコメントです',
    commentFan: 'ファンクラブのテストです',
    commentSuperFan: 'スーパーファンのテストです',
    commentFanSuper: 'ファンでスパのテストです',
    gift: 'バラ',
    speechDefault: 'テストコメントです',
  },
  menu: {
    help: 'ヘルプ',
    version: (v: string) => `バージョン ${v}`,
  },
  errors: {
    helpNotFound: '利用ガイドが見つかりません',
    overlayPortBusy: 'オーバーレイ用ポートを使えません。設定のポート番号を変更してください。',
  },
} as const;

function helpTopicByMessage(): Record<string, string> {
  return {
    [MSG.ui.invalidPort]: HELP_HEADING_ID.port,
    [MSG.errors.overlayPortBusy]: HELP_HEADING_ID.port,
    [MSG.connection.overlayFailed]: HELP_HEADING_ID.port,
    [MSG.connection.uniqueIdRequired]: HELP_HEADING_ID.connect,
    [MSG.connection.userNotFound]: HELP_HEADING_ID.connect,
    [MSG.connection.lookupFailed]: HELP_HEADING_ID.connect,
    [MSG.connection.connectFailed]: HELP_HEADING_ID.connect,
    [MSG.connection.networkFailed]: HELP_HEADING_ID.connect,
    [MSG.connection.signFailed]: HELP_HEADING_ID.connect,
    [MSG.ui.giftsNeedId]: HELP_HEADING_ID.connect,
    [MSG.tts.voicevoxNotRunning]: HELP_HEADING_ID.voicevox,
    [MSG.tts.voicevoxExeMissing]: HELP_HEADING_ID.voicevox,
    [MSG.tts.voicevoxExeInvalid]: HELP_HEADING_ID.voicevox,
    [MSG.tts.voicevoxLaunchFailed]: HELP_HEADING_ID.voicevox,
    [MSG.tts.voicevoxLaunchTimeout]: HELP_HEADING_ID.voicevox,
    [MSG.tts.fallbackWindows]: HELP_HEADING_ID.voicevox,
    [MSG.ui.overlayNotConnected]: HELP_HEADING_ID.overlay,
    [MSG.ui.speechQueueFull]: HELP_HEADING_ID.speech,
  };
}

export function getRendererCopy(): {
  helpOpenLabel: string;
  helpTopics: Record<string, string>;
  invalidPort: string;
  invalidLikeMilestone: string;
  invalidDisplaySec: string;
  invalidDisplayChars: string;
  invalidSpeechChars: string;
    invalidMaxQueue: string;
    invalidHotkeySame: string;
    invalidPinSec: string;
    invalidEventAlertSec: string;
    eventAlertLabel: string;
    eventAlertHint: string;
    eventAlertMediaAuto: string;
    eventAlertMediaTemplate: string;
    eventAlertMediaFile: string;
    eventAlertMediaNone: string;
    eventAlertMediaAutoHint: string;
    eventAlertTemplateNames: Record<string, string>;
    eventAlertPickMedia: string;
    eventAlertResetTemplate: string;
    eventAlertSecLabel: string;
    eventAlertChatUrlTitle: string;
    eventAlertAlertsUrlTitle: string;
    eventAlertAlertsUrlHint: string;
    pickAlertMediaTitle: string;
    pickAlertMediaFilter: string;
    pickAlertMediaFailed: string;
    invalidGiftChimeBandOverlap: string;
    invalidGiftChimeBandRange: string;
    invalidGiftChimeBandValue: string;
    giftChimeDestinationHint: string;
    giftChimeMatchGift: string;
    giftChimeMatchDiamond: string;
    giftSpeakSearchLabel: string;
    giftSpeakSearchPlaceholder: string;
    giftSpeakSearchEmpty: string;
    giftSpeakEnableAll: string;
    giftSpeakEnableNone: string;
    giftSpeakBulkGroupLabel: string;
    giftTestHint: string;
    giftCatalogReloadHint: string;
    giftCatalogReloadButton: string;
    giftChimeColEnable: string;
    giftChimeColGift: string;
    giftChimeColSound: string;
    giftChimeColVolume: string;
    giftChimeSelectSound: string;
    giftChimeVolumeLabel: string;
    giftChimeCommonVolumeLabel: string;
    giftChimeCommonVolumeHint: string;
    giftChimeTestButton: string;
    giftChimeStopButton: string;
    giftChimeTestFailed: string;
    giftChimeDiamondBandsHint: string;
    giftChimeDiamondMinPlaceholder: string;
    giftChimeDiamondMaxPlaceholder: string;
    giftChimeDiamondBandAdd: string;
    giftChimeDiamondBandMaxReached: string;
    giftChimeDiamondBandTest: string;
    giftChimeDiamondBandRemove: string;
    nicknameAddNeedBoth: string;
    listAlreadyExists: string;
    listEmpty: string;
    soundResetTemplate: string;
    giftChimeSoundResetHint: string;
    hotkeyTitle: string;
    hotkeySkipLabel: string;
    hotkeyClearLabel: string;
    hotkeyClearPinLabel: string;
    hotkeyPauseLabel: string;
    hotkeyMuteCommentSoundLabel: string;
    skipSpeechButton: string;
    clearSpeechButton: string;
    clearPinButton: string;
    pauseSpeechButton: string;
    resumeSpeechButton: string;
    muteCommentSoundButton: string;
    unmuteCommentSoundButton: string;
    operationsMenu: string;
    speechPaused: string;
    speechResumed: string;
    commentSoundMuted: string;
    commentSoundUnmuted: string;
    hotkeyPress: string;
    hotkeyUnset: string;
    hotkeyHint: string;
    nicknameRename: string;
    nicknameClear: string;
    nicknamePrompt: string;
    profileNeedDisconnect: string;
    profileHint: string;
    profileNameLabel: string;
    profileNamePlaceholder: string;
    profileSelectLabel: string;
    profileNameRequired: string;
    profileSaveOk: string;
    profileSaveButton: string;
    profileApplyButton: string;
    profileDeleteButton: string;
    pickSoundFailed: string;
    saveOk: string;
    saveFailed: string;
    voicevoxLaunching: string;
  viewerEmpty: string;
  viewerCleared: string;
  viewerStatusConnected: string;
  viewerStatusDisconnected: string;
  viewerStatusDisconnectedFromLive: string;
  viewerRoomCount: string;
  viewerRoomTopLabel: string;
  viewerRoomTopCoins: string;
  viewerPaneComments: string;
  viewerPaneEvents: string;
  viewerEmptyComments: string;
  viewerEmptyEvents: string;
  viewerSplitLabel: string;
  viewerLayoutLabel: string;
  viewerLayoutCombined: string;
  viewerLayoutSplit: string;
  viewerLayoutCustom: string;
  viewerLayoutCustomHint: string;
  viewerDisplayLabel: string;
  viewerDisplayShort: string;
  eventDisplayLabel: string;
  eventSpeakLabel: string;
  previewZoomLabel: string;
  giftSpeakListHint: string;
  viewerFontSizeLabel: string;
  overlayMotionLabel: string;
  overlayMotionHint: string;
  overlayMotionSpeedLabel: string;
  overlayMotionReplay: string;
  settingsTabLook: string;
  lookTabHint: string;
  lookChatTitle: string;
  copyObsLabel: string;
  overlayMotionFuwatto: string;
  overlayMotionFade: string;
  overlayMotionSlideUp: string;
  overlayMotionSlideDown: string;
  overlayMotionSlideLeft: string;
  overlayMotionSlideRight: string;
  overlayMotionZoom: string;
  overlayMotionBounce: string;
  overlayMotionBlur: string;
  overlayMotionFlip: string;
  overlayMotionNone: string;
  overlayMotionSpeed1: string;
  overlayMotionSpeed2: string;
  overlayMotionSpeed3: string;
  overlayMotionSpeed4: string;
  overlayMotionSpeed5: string;
  overlayPinTitle: string;
  overlayPinHint: string;
  overlayPinEnabledLabel: string;
  overlayPinEnabledHint: string;
  overlayPinSecLabel: string;
  overlayPinHoldLabel: string;
  overlayPinHoldHint: string;
  overlayPinTypesLabel: string;
  overlayPinTypesHint: string;
  overlayPinPreviewLabel: string;
  overlayPinPreviewHint: string;
  overlayPinTypeSecPlaceholder: string;
  overlayPinTypeSecHint: string;
  overlayNameColorTitle: string;
  overlayNameColorEnabledLabel: string;
  overlayNameColorEnabledHint: string;
  overlayNameColorPaletteLabel: string;
  viewerUnknownUser: string;
  viewerBadgeFan: string;
  viewerBadgeSuperFan: string;
  viewerBadgeMod: string;
  viewerBadgeAnchor: string;
  viewerSearchLabel: string;
  viewerSearchPlaceholder: string;
  viewerSearchEmpty: string;
  menuView: string;
  menuLog: string;
  alwaysOnTopMenu: string;
  compactMenu: string;
  minimizeWindow: string;
  maximizeWindow: string;
  restoreWindow: string;
  closeWindow: string;
  viewerPreviewSamples: string;
  overlayPreviewSamples: string;
  overlayClearChat: string;
  overlayNotConnected: string;
  overlayServerDown: string;
  overlayClientsWaiting: string;
  overlayClientsConnected: string;
  viewerSaveLog: string;
  viewerClearLog: string;
  viewerLogSaved: string;
  viewerLogEmpty: string;
  viewerLogFailed: string;
  viewerLogClearTitle: string;
  viewerLogClearConfirmOk: string;
  viewerLogClearOk: string;
  viewerPaneClearTitle: string;
  viewerPaneClearLabel: string;
  viewerLogRestoreFailed: string;
  viewerLogMaxRowsLabel: string;
  viewerLogMaxRowsHint: string;
  speechReplaceTitle: string;
  speechReplaceHint: string;
  speechReplaceFormatHint: string;
  speechReplaceFormatExample: string;
  speechReplaceOverLimit: string;
  speechReplaceExportTitle: string;
  speechReplaceExportFilter: string;
  speechReplaceExportOk: string;
  speechReplaceExportFailed: string;
  speechReplaceImportTitle: string;
  speechReplaceImportFilter: string;
  speechReplaceImportConfirmTitle: string;
  speechReplaceImportConfirm: string;
  speechReplaceImportOk: string;
  speechReplaceImportFailed: string;
  speechReplaceImportOverLimit: string;
  speechReplaceClearAllTitle: string;
  speechReplaceClearAllOk: string;
  nicknameMapHint: string;
  viewerFocusOn: string;
  speakFanSubOnlyLabel: string;
  speakFanSubOnlyHint: string;
  speakFanMinLevelLabel: string;
  speakFanClubCommentsLabel: string;
  speakFanClubCommentsHint: string;
  speakSubscriberCommentsLabel: string;
  speakSubscriberCommentsHint: string;
  invalidSpeakFanSubEmpty: string;
  fanLevelLookLabel: string;
  fanLevelLookHint: string;
  commentBadgeTitle: string;
  commentSoundHint: string;
  commentNotifyModeLabel: string;
  commentNotifySpeak: string;
  commentNotifySound: string;
  eventNotifySpeak: string;
  eventNotifySound: string;
  eventSoundHint: string;
  skipRepeatSpeechLabel: string;
  skipRepeatSpeechHint: string;
  repeatSpeechSecLabel: string;
  uniqueIdRequired: string;
  lookingUp: string;
  alreadyConnected: string;
  resetConfigLabel: string;
  resetConfigHint: string;
  exportConfigLabel: string;
  importConfigLabel: string;
  transferConfigHint: string;
  confirmUserTitle: string;
  confirmUserHint: string;
  confirmUserButton: string;
  confirmUserCancel: string;
  viewerMuteUser: string;
  viewerUnmuteUser: string;
  viewerBlockUser: string;
  viewerUnblockUser: string;
  viewerCopyComment: string;
  viewerCopyId: string;
  viewerCopyNickname: string;
  viewerUserMissing: string;
  viewerCommentCopied: string;
  viewerIdCopied: string;
  viewerNicknameCopied: string;
  viewerCommentCopyFailed: string;
  viewerCommentEmpty: string;
  viewerIdEmpty: string;
  viewerNicknameEmpty: string;
  viewerUserMuted: string;
  viewerUserUnmuted: string;
  viewerUserBlocked: string;
  viewerUserUnblocked: string;
  guideNeedIdTitle: string;
  guideNeedIdExtra: string;
  guideNeedIdButton: string;
  guideNeedConnectTitle: string;
  guideNeedConnectExtra: string;
  guideNeedConnectButton: string;
  guideWaitingTitle: string;
  guideWaitingExtra: string;
  guideLiveTitle: string;
  guideLiveExtra: string;
  guideLiveButton: string;
  guideStepId: string;
  guideStepConnect: string;
  guideStepLive: string;
  guideSamplesButton: string;
  guideClearSamplesButton: string;
  viewerTypes: Record<string, string>;
} {
  return {
    helpOpenLabel: MSG.ui.helpOpenLabel,
    helpTopics: helpTopicByMessage(),
    invalidPort: MSG.ui.invalidPort,
    invalidLikeMilestone: MSG.ui.invalidLikeMilestone,
    invalidDisplaySec: MSG.ui.invalidDisplaySec,
    invalidDisplayChars: MSG.ui.invalidDisplayChars,
    invalidSpeechChars: MSG.ui.invalidSpeechChars,
    invalidMaxQueue: MSG.ui.invalidMaxQueue,
    invalidHotkeySame: MSG.ui.invalidHotkeySame,
    invalidPinSec: MSG.ui.invalidPinSec,
    invalidEventAlertSec: MSG.ui.invalidEventAlertSec,
    eventAlertLabel: MSG.ui.eventAlertLabel,
    eventAlertHint: MSG.ui.eventAlertHint,
    eventAlertMediaAuto: MSG.ui.eventAlertMediaAuto,
    eventAlertMediaTemplate: MSG.ui.eventAlertMediaTemplate,
    eventAlertMediaFile: MSG.ui.eventAlertMediaFile,
    eventAlertMediaNone: MSG.ui.eventAlertMediaNone,
    eventAlertMediaAutoHint: MSG.ui.eventAlertMediaAutoHint,
    eventAlertTemplateNames: { ...MSG.ui.eventAlertTemplateNames },
    eventAlertPickMedia: MSG.ui.eventAlertPickMedia,
    eventAlertResetTemplate: MSG.ui.eventAlertResetTemplate,
    eventAlertSecLabel: MSG.ui.eventAlertSecLabel,
    eventAlertChatUrlTitle: MSG.ui.eventAlertChatUrlTitle,
    eventAlertAlertsUrlTitle: MSG.ui.eventAlertAlertsUrlTitle,
    eventAlertAlertsUrlHint: MSG.ui.eventAlertAlertsUrlHint,
    pickAlertMediaTitle: MSG.ui.pickAlertMediaTitle,
    pickAlertMediaFilter: MSG.ui.pickAlertMediaFilter,
    pickAlertMediaFailed: MSG.ui.pickAlertMediaFailed,
    invalidGiftChimeBandOverlap: MSG.ui.invalidGiftChimeBandOverlap,
    invalidGiftChimeBandRange: MSG.ui.invalidGiftChimeBandRange,
    invalidGiftChimeBandValue: MSG.ui.invalidGiftChimeBandValue,
    giftChimeDestinationHint: MSG.ui.giftChimeDestinationHint,
    giftChimeMatchGift: MSG.ui.giftChimeMatchGift,
    giftChimeMatchDiamond: MSG.ui.giftChimeMatchDiamond,
    giftSpeakSearchLabel: MSG.ui.giftSpeakSearchLabel,
    giftSpeakSearchPlaceholder: MSG.ui.giftSpeakSearchPlaceholder,
    giftSpeakSearchEmpty: MSG.ui.giftSpeakSearchEmpty,
    giftSpeakEnableAll: MSG.ui.giftSpeakEnableAll,
    giftSpeakEnableNone: MSG.ui.giftSpeakEnableNone,
    giftSpeakBulkGroupLabel: MSG.ui.giftSpeakBulkGroupLabel,
    giftTestHint: MSG.ui.giftTestHint,
    giftCatalogReloadHint: MSG.ui.giftCatalogReloadHint,
    giftCatalogReloadButton: MSG.ui.giftCatalogReloadButton,
    giftChimeColEnable: MSG.ui.giftChimeColEnable,
    giftChimeColGift: MSG.ui.giftChimeColGift,
    giftChimeColSound: MSG.ui.giftChimeColSound,
    giftChimeColVolume: MSG.ui.giftChimeColVolume,
    giftChimeSelectSound: MSG.ui.giftChimeSelectSound,
    giftChimeVolumeLabel: MSG.ui.giftChimeVolumeLabel,
    giftChimeCommonVolumeLabel: MSG.ui.giftChimeCommonVolumeLabel,
    giftChimeCommonVolumeHint: MSG.ui.giftChimeCommonVolumeHint,
    giftChimeTestButton: MSG.ui.giftChimeTestButton,
    giftChimeStopButton: MSG.ui.giftChimeStopButton,
    giftChimeTestFailed: MSG.ui.giftChimeTestFailed,
    giftChimeDiamondBandsHint: MSG.ui.giftChimeDiamondBandsHint,
    giftChimeDiamondMinPlaceholder: MSG.ui.giftChimeDiamondMinPlaceholder,
    giftChimeDiamondMaxPlaceholder: MSG.ui.giftChimeDiamondMaxPlaceholder,
    giftChimeDiamondBandAdd: MSG.ui.giftChimeDiamondBandAdd,
    giftChimeDiamondBandMaxReached: MSG.ui.giftChimeDiamondBandMaxReached,
    giftChimeDiamondBandTest: MSG.ui.giftChimeDiamondBandTest,
    giftChimeDiamondBandRemove: MSG.ui.giftChimeDiamondBandRemove,
    nicknameAddNeedBoth: MSG.ui.nicknameAddNeedBoth,
    listAlreadyExists: MSG.ui.listAlreadyExists,
    listEmpty: MSG.ui.listEmpty,
    soundResetTemplate: MSG.ui.soundResetTemplate,
    giftChimeSoundResetHint: MSG.ui.giftChimeSoundResetHint,
    hotkeyTitle: MSG.ui.hotkeyTitle,
    hotkeySkipLabel: MSG.ui.hotkeySkipLabel,
    hotkeyClearLabel: MSG.ui.hotkeyClearLabel,
    hotkeyClearPinLabel: MSG.ui.hotkeyClearPinLabel,
    hotkeyPauseLabel: MSG.ui.hotkeyPauseLabel,
    hotkeyMuteCommentSoundLabel: MSG.ui.hotkeyMuteCommentSoundLabel,
    skipSpeechButton: MSG.ui.skipSpeechButton,
    clearSpeechButton: MSG.ui.clearSpeechButton,
    clearPinButton: MSG.ui.clearPinButton,
    pauseSpeechButton: MSG.ui.pauseSpeechButton,
    resumeSpeechButton: MSG.ui.resumeSpeechButton,
    muteCommentSoundButton: MSG.ui.muteCommentSoundButton,
    unmuteCommentSoundButton: MSG.ui.unmuteCommentSoundButton,
    operationsMenu: MSG.ui.operationsMenu,
    speechPaused: MSG.ui.speechPaused,
    speechResumed: MSG.ui.speechResumed,
    commentSoundMuted: MSG.ui.commentSoundMuted,
    commentSoundUnmuted: MSG.ui.commentSoundUnmuted,
    hotkeyPress: MSG.ui.hotkeyPress,
    hotkeyUnset: MSG.ui.hotkeyUnset,
    hotkeyHint: MSG.ui.hotkeyHint,
    nicknameRename: MSG.ui.nicknameRename,
    nicknameClear: MSG.ui.nicknameClear,
    nicknamePrompt: MSG.ui.nicknamePrompt,
    profileNeedDisconnect: MSG.ui.profileNeedDisconnect,
    profileHint: MSG.ui.profileHint,
    profileNameLabel: MSG.ui.profileNameLabel,
    profileNamePlaceholder: MSG.ui.profileNamePlaceholder,
    profileSelectLabel: MSG.ui.profileSelectLabel,
    profileNameRequired: MSG.ui.profileNameRequired,
    profileSaveOk: MSG.ui.profileSaveOk,
    profileSaveButton: MSG.ui.profileSaveButton,
    profileApplyButton: MSG.ui.profileApplyButton,
    profileDeleteButton: MSG.ui.profileDeleteButton,
    pickSoundFailed: MSG.ui.pickSoundFailed,
    saveOk: MSG.ui.saveOk,
    saveFailed: MSG.ui.saveFailed,
    voicevoxLaunching: MSG.tts.voicevoxLaunching,
    viewerEmpty: MSG.ui.viewerEmpty,
    viewerCleared: MSG.ui.viewerCleared,
    viewerStatusConnected: MSG.ui.viewerStatusConnected,
    viewerStatusDisconnected: MSG.ui.viewerStatusDisconnected,
    viewerStatusDisconnectedFromLive: MSG.ui.viewerStatusDisconnectedFromLive,
    viewerRoomCount: MSG.ui.viewerRoomCount,
    viewerRoomTopLabel: MSG.ui.viewerRoomTopLabel,
    viewerRoomTopCoins: MSG.ui.viewerRoomTopCoins,
    viewerPaneComments: MSG.ui.viewerPaneComments,
    viewerPaneEvents: MSG.ui.viewerPaneEvents,
    viewerEmptyComments: MSG.ui.viewerEmptyComments,
    viewerEmptyEvents: MSG.ui.viewerEmptyEvents,
    viewerSplitLabel: MSG.ui.viewerSplitLabel,
    viewerLayoutLabel: MSG.ui.viewerLayoutLabel,
    viewerLayoutCombined: MSG.ui.viewerLayoutCombined,
    viewerLayoutSplit: MSG.ui.viewerLayoutSplit,
    viewerLayoutCustom: MSG.ui.viewerLayoutCustom,
    viewerLayoutCustomHint: MSG.ui.viewerLayoutCustomHint,
    viewerDisplayLabel: MSG.ui.viewerDisplayLabel,
    viewerDisplayShort: MSG.ui.viewerDisplayShort,
    eventDisplayLabel: MSG.ui.eventDisplayLabel,
    eventSpeakLabel: MSG.ui.eventSpeakLabel,
    previewZoomLabel: MSG.ui.previewZoomLabel,
    giftSpeakListHint: MSG.ui.giftSpeakListHint,
    viewerFontSizeLabel: MSG.ui.viewerFontSizeLabel,
    overlayMotionLabel: MSG.ui.overlayMotionLabel,
    overlayMotionHint: MSG.ui.overlayMotionHint,
    overlayMotionSpeedLabel: MSG.ui.overlayMotionSpeedLabel,
    overlayMotionReplay: MSG.ui.overlayMotionReplay,
    settingsTabLook: MSG.ui.settingsTabLook,
    lookTabHint: MSG.ui.lookTabHint,
    lookChatTitle: MSG.ui.lookChatTitle,
    copyObsLabel: MSG.ui.copyObsLabel,
    overlayMotionFuwatto: MSG.ui.overlayMotionFuwatto,
    overlayMotionFade: MSG.ui.overlayMotionFade,
    overlayMotionSlideUp: MSG.ui.overlayMotionSlideUp,
    overlayMotionSlideDown: MSG.ui.overlayMotionSlideDown,
    overlayMotionSlideLeft: MSG.ui.overlayMotionSlideLeft,
    overlayMotionSlideRight: MSG.ui.overlayMotionSlideRight,
    overlayMotionZoom: MSG.ui.overlayMotionZoom,
    overlayMotionBounce: MSG.ui.overlayMotionBounce,
    overlayMotionBlur: MSG.ui.overlayMotionBlur,
    overlayMotionFlip: MSG.ui.overlayMotionFlip,
    overlayMotionNone: MSG.ui.overlayMotionNone,
    overlayMotionSpeed1: MSG.ui.overlayMotionSpeed1,
    overlayMotionSpeed2: MSG.ui.overlayMotionSpeed2,
    overlayMotionSpeed3: MSG.ui.overlayMotionSpeed3,
    overlayMotionSpeed4: MSG.ui.overlayMotionSpeed4,
    overlayMotionSpeed5: MSG.ui.overlayMotionSpeed5,
    overlayPinTitle: MSG.ui.overlayPinTitle,
    overlayPinHint: MSG.ui.overlayPinHint,
    overlayPinEnabledLabel: MSG.ui.overlayPinEnabledLabel,
    overlayPinEnabledHint: MSG.ui.overlayPinEnabledHint,
    overlayPinSecLabel: MSG.ui.overlayPinSecLabel,
    overlayPinHoldLabel: MSG.ui.overlayPinHoldLabel,
    overlayPinHoldHint: MSG.ui.overlayPinHoldHint,
    overlayPinTypesLabel: MSG.ui.overlayPinTypesLabel,
    overlayPinTypesHint: MSG.ui.overlayPinTypesHint,
    overlayPinPreviewLabel: MSG.ui.overlayPinPreviewLabel,
    overlayPinPreviewHint: MSG.ui.overlayPinPreviewHint,
    overlayPinTypeSecPlaceholder: MSG.ui.overlayPinTypeSecPlaceholder,
    overlayPinTypeSecHint: MSG.ui.overlayPinTypeSecHint,
    overlayNameColorTitle: MSG.ui.overlayNameColorTitle,
    overlayNameColorEnabledLabel: MSG.ui.overlayNameColorEnabledLabel,
    overlayNameColorEnabledHint: MSG.ui.overlayNameColorEnabledHint,
    overlayNameColorPaletteLabel: MSG.ui.overlayNameColorPaletteLabel,
    viewerUnknownUser: MSG.ui.viewerUnknownUser,
    viewerBadgeFan: MSG.ui.viewerBadgeFan,
    viewerBadgeSuperFan: MSG.ui.viewerBadgeSuperFan,
    viewerBadgeMod: MSG.ui.viewerBadgeMod,
    viewerBadgeAnchor: MSG.ui.viewerBadgeAnchor,
    viewerSearchLabel: MSG.ui.viewerSearchLabel,
    viewerSearchPlaceholder: MSG.ui.viewerSearchPlaceholder,
    viewerSearchEmpty: MSG.ui.viewerSearchEmpty,
    menuView: MSG.ui.menuView,
    menuLog: MSG.ui.menuLog,
    alwaysOnTopMenu: MSG.ui.alwaysOnTopMenu,
    compactMenu: MSG.ui.compactMenu,
    minimizeWindow: MSG.ui.minimizeWindow,
    maximizeWindow: MSG.ui.maximizeWindow,
    restoreWindow: MSG.ui.restoreWindow,
    closeWindow: MSG.ui.closeWindow,
    viewerPreviewSamples: MSG.ui.viewerPreviewSamples,
    overlayPreviewSamples: MSG.ui.overlayPreviewSamples,
    overlayClearChat: MSG.ui.overlayClearChat,
    overlayNotConnected: MSG.ui.overlayNotConnected,
    overlayServerDown: MSG.ui.overlayServerDown,
    overlayClientsWaiting: MSG.ui.overlayClientsWaiting,
    overlayClientsConnected: MSG.ui.overlayClientsConnected,
    viewerSaveLog: MSG.ui.viewerSaveLog,
    viewerClearLog: MSG.ui.viewerClearLog,
    viewerLogSaved: MSG.ui.viewerLogSaved,
    viewerLogEmpty: MSG.ui.viewerLogEmpty,
    viewerLogFailed: MSG.ui.viewerLogFailed,
    viewerLogClearTitle: MSG.ui.viewerLogClearTitle,
    viewerLogClearConfirmOk: MSG.ui.viewerLogClearConfirmOk,
    viewerLogClearOk: MSG.ui.viewerLogClearOk,
    viewerPaneClearTitle: MSG.ui.viewerPaneClearTitle,
    viewerPaneClearLabel: MSG.ui.viewerPaneClearLabel,
    viewerLogRestoreFailed: MSG.ui.viewerLogRestoreFailed,
    viewerLogMaxRowsLabel: MSG.ui.viewerLogMaxRowsLabel,
    viewerLogMaxRowsHint: MSG.ui.viewerLogMaxRowsHint,
    speechReplaceTitle: MSG.ui.speechReplaceTitle,
    speechReplaceHint: MSG.ui.speechReplaceHint,
    speechReplaceFormatHint: MSG.ui.speechReplaceFormatHint,
    speechReplaceFormatExample: MSG.ui.speechReplaceFormatExample,
    speechReplaceOverLimit: MSG.ui.speechReplaceOverLimit,
    speechReplaceExportTitle: MSG.ui.speechReplaceExportTitle,
    speechReplaceExportFilter: MSG.ui.speechReplaceExportFilter,
    speechReplaceExportOk: MSG.ui.speechReplaceExportOk,
    speechReplaceExportFailed: MSG.ui.speechReplaceExportFailed,
    speechReplaceImportTitle: MSG.ui.speechReplaceImportTitle,
    speechReplaceImportFilter: MSG.ui.speechReplaceImportFilter,
    speechReplaceImportConfirmTitle: MSG.ui.speechReplaceImportConfirmTitle,
    speechReplaceImportConfirm: MSG.ui.speechReplaceImportConfirm,
    speechReplaceImportOk: MSG.ui.speechReplaceImportOk,
    speechReplaceImportFailed: MSG.ui.speechReplaceImportFailed,
    speechReplaceImportOverLimit: MSG.ui.speechReplaceImportOverLimit,
    speechReplaceClearAllTitle: MSG.ui.speechReplaceClearAllTitle,
    speechReplaceClearAllOk: MSG.ui.speechReplaceClearAllOk,
    nicknameMapHint: MSG.ui.nicknameMapHint,
    viewerFocusOn: MSG.ui.viewerFocusOn,
    speakFanSubOnlyLabel: MSG.ui.speakFanSubOnlyLabel,
    speakFanSubOnlyHint: MSG.ui.speakFanSubOnlyHint,
    speakFanMinLevelLabel: MSG.ui.speakFanMinLevelLabel,
    speakFanClubCommentsLabel: MSG.ui.speakFanClubCommentsLabel,
    speakFanClubCommentsHint: MSG.ui.speakFanClubCommentsHint,
    speakSubscriberCommentsLabel: MSG.ui.speakSubscriberCommentsLabel,
    speakSubscriberCommentsHint: MSG.ui.speakSubscriberCommentsHint,
    invalidSpeakFanSubEmpty: MSG.ui.invalidSpeakFanSubEmpty,
    fanLevelLookLabel: MSG.ui.fanLevelLookLabel,
    fanLevelLookHint: MSG.ui.fanLevelLookHint,
    commentBadgeTitle: MSG.ui.commentBadgeTitle,
    commentSoundHint: MSG.ui.commentSoundHint,
    commentNotifyModeLabel: MSG.ui.commentNotifyModeLabel,
    commentNotifySpeak: MSG.ui.commentNotifySpeak,
    commentNotifySound: MSG.ui.commentNotifySound,
    eventNotifySpeak: MSG.ui.eventNotifySpeak,
    eventNotifySound: MSG.ui.eventNotifySound,
    eventSoundHint: MSG.ui.eventSoundHint,
    skipRepeatSpeechLabel: MSG.ui.skipRepeatSpeechLabel,
    skipRepeatSpeechHint: MSG.ui.skipRepeatSpeechHint,
    repeatSpeechSecLabel: MSG.ui.repeatSpeechSecLabel,
    uniqueIdRequired: MSG.connection.uniqueIdRequired,
    lookingUp: MSG.connection.lookingUp,
    alreadyConnected: MSG.connection.alreadyConnected,
    resetConfigLabel: MSG.ui.resetConfigLabel,
    resetConfigHint: MSG.ui.resetConfigHint,
    exportConfigLabel: MSG.ui.exportConfigLabel,
    importConfigLabel: MSG.ui.importConfigLabel,
    transferConfigHint: MSG.ui.transferConfigHint,
    confirmUserTitle: MSG.ui.confirmUserTitle,
    confirmUserHint: MSG.ui.confirmUserHint,
    confirmUserButton: MSG.ui.confirmUserButton,
    confirmUserCancel: MSG.ui.confirmUserCancel,
    viewerMuteUser: MSG.ui.viewerMuteUser,
    viewerUnmuteUser: MSG.ui.viewerUnmuteUser,
    viewerBlockUser: MSG.ui.viewerBlockUser,
    viewerUnblockUser: MSG.ui.viewerUnblockUser,
    viewerCopyComment: MSG.ui.viewerCopyComment,
    viewerCopyId: MSG.ui.viewerCopyId,
    viewerCopyNickname: MSG.ui.viewerCopyNickname,
    viewerUserMissing: MSG.ui.viewerUserMissing,
    viewerCommentCopied: MSG.ui.viewerCommentCopied,
    viewerIdCopied: MSG.ui.viewerIdCopied,
    viewerNicknameCopied: MSG.ui.viewerNicknameCopied,
    viewerCommentCopyFailed: MSG.ui.viewerCommentCopyFailed,
    viewerCommentEmpty: MSG.ui.viewerCommentEmpty,
    viewerIdEmpty: MSG.ui.viewerIdEmpty,
    viewerNicknameEmpty: MSG.ui.viewerNicknameEmpty,
    viewerUserMuted: MSG.ui.viewerUserMuted,
    viewerUserUnmuted: MSG.ui.viewerUserUnmuted,
    viewerUserBlocked: MSG.ui.viewerUserBlocked,
    viewerUserUnblocked: MSG.ui.viewerUserUnblocked,
    guideNeedIdTitle: MSG.ui.guideNeedIdTitle,
    guideNeedIdExtra: MSG.ui.guideNeedIdExtra,
    guideNeedIdButton: MSG.ui.guideNeedIdButton,
    guideNeedConnectTitle: MSG.ui.guideNeedConnectTitle,
    guideNeedConnectExtra: MSG.ui.guideNeedConnectExtra,
    guideNeedConnectButton: MSG.ui.guideNeedConnectButton,
    guideWaitingTitle: MSG.ui.guideWaitingTitle,
    guideWaitingExtra: MSG.ui.guideWaitingExtra,
    guideLiveTitle: MSG.ui.guideLiveTitle,
    guideLiveExtra: MSG.ui.guideLiveExtra,
    guideLiveButton: MSG.ui.guideLiveButton,
    guideStepId: MSG.ui.guideStepId,
    guideStepConnect: MSG.ui.guideStepConnect,
    guideStepLive: MSG.ui.guideStepLive,
    guideSamplesButton: MSG.ui.guideSamplesButton,
    guideClearSamplesButton: MSG.ui.guideClearSamplesButton,
    viewerTypes: {
      comment: MSG.ui.viewerTypeComment,
      gift: MSG.ui.viewerTypeGift,
      follow: MSG.ui.viewerTypeFollow,
      share: MSG.ui.viewerTypeShare,
      subscribe: MSG.ui.viewerTypeSubscribe,
      superFan: MSG.ui.viewerTypeSuperFan,
      envelope: MSG.ui.viewerTypeEnvelope,
      portal: MSG.ui.viewerTypePortal,
      like: MSG.ui.viewerTypeLike,
      member: MSG.ui.viewerTypeMember,
    },
  };
}
