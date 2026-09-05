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
    invalidHotkeySame: '飛ばす・読み上げ待ち捨て・固定枠待ち捨てのキーは別にしてください',
    invalidPinSec: '固定枠の表示時間は 1〜120 秒で指定してください',
    hotkeyTitle: 'ショートカット',
    hotkeySkipLabel: '読み上げを飛ばすキー',
    hotkeyClearLabel: '読み上げの待ちを捨てるキー',
    hotkeyClearPinLabel: '固定枠の待ちを捨てるキー',
    skipSpeechButton: '読み上げを飛ばす',
    clearSpeechButton: '読み上げの待ちを捨てる',
    clearPinButton: '固定枠の待ちを捨てる',
    hotkeyPress: 'キーを押す',
    hotkeyUnset: '消す',
    hotkeyHint:
      'ボタンを押してから、使いたいキーを押します。Shift や Ctrl も一緒に押せます。消すとキーは効かなくなり、コメント画面のボタンだけ使えます。入力欄にいるときは効きません。',
    saveOk: '設定を保存しました',
    saveFailed: '保存に失敗しました',
    resetConfigLabel: '設定を初期化する',
    resetConfigHint:
      '文言・見た目・読み上げ・フィルタなどを最初の状態に戻します。TikTok ID と配信画面用のポートは残します。',
    resetConfigTitle: '設定を初期化しますか？',
    resetConfigConfirm: '初期化する',
    resetConfigCancel: 'やめる',
    resetConfigOk: '設定を初期化しました',
    resetConfigFailed: '設定の初期化に失敗しました',
    exportConfigLabel: '設定を書き出す',
    importConfigLabel: '設定を読み込む',
    transferConfigHint:
      'ファイルに書き出して、別のPCや再インストール後に戻せます。VOICEVOXの場所は別のPCだと直してください。',
    exportConfigTitle: '設定の書き出し',
    exportConfigOk: '設定を書き出しました',
    exportConfigFailed: '設定の書き出しに失敗しました',
    importConfigTitle: '設定の読み込み',
    importConfigConfirmTitle: '設定を読み込みますか？',
    importConfigConfirm:
      '今の設定を上書きします。TikTok ID と配信画面用のポートもファイルの内容になります。VOICEVOXの場所は別のPCだと直してください。',
    importConfigOk: '設定を読み込みました',
    importConfigFailed: '設定の読み込みに失敗しました',
    importConfigInvalid: 'このファイルはコメ読みちゃんの設定ではありません',
    importConfigFilter: '設定ファイル',
    copied: 'LIVE Studio用URLをコピーしました。このアドレスを貼ってください',
    copiedStudio: '別のURLをコピーしました',
    copiedObs: 'OBS用URLをコピーしました。ブラウザソースに貼ってください',
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
      'ギフト一覧を取得できませんでした。一度配信したあとなら取りやすいです',
    giftsNeedId: 'TikTok ID を入力してから再取得してください',
    giftsCached: '取得できませんでした。前回保存した一覧を使います',
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
    eventDisplayLabel: '配信ソース',
    viewerFontSizeLabel: 'コメント画面の文字サイズ',
    overlayMotionLabel: '動き',
    overlayMotionHint:
      'コメントと固定枠が出るときと消えるときの動きです。次に出る行から効きます。プレビューは選ぶと再生されます。',
    overlayMotionSpeedLabel: '速さ',
    overlayMotionReplay: '動きを見る',
    settingsTabLook: '配信の見た目',
    lookTabHint:
      'ここは視聴者の画面（配信ソース）の見た目です。コメント画面の文字サイズや欄は、コメント画面の上で変えます。',
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
      'ギフトなどはコメント列のすぐ上に1件ずつ出します。来た順です。コメント画面には出ません。',
    overlayPinEnabledLabel: '固定枠を使う',
    overlayPinEnabledHint: 'オフにすると、今までどおり全部下から流れます。',
    overlayPinSecLabel: '固定枠の表示時間（秒）',
    overlayPinHoldLabel: '次が無いときは出したまま',
    overlayPinHoldHint:
      'オンのとき、待ちが無ければ枠を消しません。次が来たら今の秒数のあと切り替わります。',
    overlayPinTypesLabel: '固定枠に出す種類',
    overlayPinTypesHint: 'オフにすると、その種類はコメントと一緒に流れます。初期はコメント以外が全部固定枠です。',
    overlayPinPreviewLabel: 'プレビューも固定枠で見る',
    overlayPinPreviewHint:
      'オフにすると、プレビューだけ今までどおり全部流れます。オンのときは固定枠の種類を表示時間ごとに順に切り替えます。配信ソースは常に上の設定です。',
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
    viewerPreviewSamples: 'コメント画面にサンプル',
    overlayPreviewSamples: '配信ソースにサンプル',
    overlayClearChat: '配信ソースを消す',
    viewerSaveLog: 'ログを保存',
    viewerClearLog: 'コメント画面を消す',
    viewerSaveLogTitle: 'コメントログの保存',
    viewerLogSaved: 'コメントログを保存しました',
    viewerLogEmpty: '保存する行がまだありません',
    viewerLogFailed: 'コメントログの保存に失敗しました',
    viewerFocusOn: '同じ人の行を強調しています。もう一度クリックで解除します',
    speakFanSubOnlyLabel: 'メンレベとスーパーファンのコメントだけ読む',
    speakFanSubOnlyHint:
      'オフのときは全員読みます。オンのときだけ下の条件が効きます。ギフトやフォローはそのままです。',
    speakFanMinLevelLabel: 'メンレベは何以上を読む',
    speakSubscriberCommentsLabel: 'スーパーファンは読む',
    speakSubscriberCommentsHint: 'メンレベ未加入でもスーパーファンなら読みます。',
    fanLevelLookLabel: 'メンレベの色',
    fanLevelLookHint:
      'このレベ以上で印の色が変わります。印はファンクラブ名＋レベ、取れないときはメンレベ＋数字です。',
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
    hotkeyTitle: string;
    hotkeySkipLabel: string;
    hotkeyClearLabel: string;
    hotkeyClearPinLabel: string;
    skipSpeechButton: string;
    clearSpeechButton: string;
    clearPinButton: string;
    hotkeyPress: string;
    hotkeyUnset: string;
    hotkeyHint: string;
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
  viewerFocusOn: string;
  speakFanSubOnlyLabel: string;
  speakFanSubOnlyHint: string;
  speakFanMinLevelLabel: string;
  speakSubscriberCommentsLabel: string;
  speakSubscriberCommentsHint: string;
  fanLevelLookLabel: string;
  fanLevelLookHint: string;
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
    hotkeyTitle: MSG.ui.hotkeyTitle,
    hotkeySkipLabel: MSG.ui.hotkeySkipLabel,
    hotkeyClearLabel: MSG.ui.hotkeyClearLabel,
    hotkeyClearPinLabel: MSG.ui.hotkeyClearPinLabel,
    skipSpeechButton: MSG.ui.skipSpeechButton,
    clearSpeechButton: MSG.ui.clearSpeechButton,
    clearPinButton: MSG.ui.clearPinButton,
    hotkeyPress: MSG.ui.hotkeyPress,
    hotkeyUnset: MSG.ui.hotkeyUnset,
    hotkeyHint: MSG.ui.hotkeyHint,
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
    viewerFocusOn: MSG.ui.viewerFocusOn,
    speakFanSubOnlyLabel: MSG.ui.speakFanSubOnlyLabel,
    speakFanSubOnlyHint: MSG.ui.speakFanSubOnlyHint,
    speakFanMinLevelLabel: MSG.ui.speakFanMinLevelLabel,
    speakSubscriberCommentsLabel: MSG.ui.speakSubscriberCommentsLabel,
    speakSubscriberCommentsHint: MSG.ui.speakSubscriberCommentsHint,
    fanLevelLookLabel: MSG.ui.fanLevelLookLabel,
    fanLevelLookHint: MSG.ui.fanLevelLookHint,
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
