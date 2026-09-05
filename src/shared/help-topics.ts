export const HELP_HEADING_ID = {
  index: 'help-index',
  setup: 'help-setup',
  first: 'help-first',
  viewerLayout: 'help-viewer-layout',
  viewerBadge: 'help-viewer-badge',
  viewerDisplay: 'help-viewer-display',
  viewerMenu: 'help-viewer-menu',
  viewerLog: 'help-viewer-log',
  liveStudio: 'help-live-studio',
  obs: 'help-obs',
  template: 'help-template',
  like: 'help-like',
  portal: 'help-portal',
  voicevoxSetup: 'help-voicevox-setup',
  look: 'help-look',
  tester: 'help-tester',
  faq: 'help-faq',
  commentsMissing: 'help-comments-missing',
  speech: 'help-speech',
  liveStudioUrl: 'help-live-studio-url',
  overlayAudio: 'help-overlay-audio',
  doubleAudio: 'help-double-audio',
  connect: 'help-connect',
  overlay: 'help-overlay',
  englishVoice: 'help-english-voice',
  voicevox: 'help-voicevox',
  port: 'help-port',
  contact: 'help-contact',
  caution: 'help-caution',
} as const;

export type HelpTopicId = (typeof HELP_HEADING_ID)[keyof typeof HELP_HEADING_ID];

export const HELP_HEADING_IDS: Record<string, HelpTopicId> = {
  索引: HELP_HEADING_ID.index,
  準備: HELP_HEADING_ID.setup,
  初期設定: HELP_HEADING_ID.first,
  コメント画面のレイアウト: HELP_HEADING_ID.viewerLayout,
  コメント画面の印: HELP_HEADING_ID.viewerBadge,
  コメント画面の表示と検索: HELP_HEADING_ID.viewerDisplay,
  コメント画面の右クリック: HELP_HEADING_ID.viewerMenu,
  コメント画面のログ: HELP_HEADING_ID.viewerLog,
  'TikTok LIVE Studio': HELP_HEADING_ID.liveStudio,
  'OBS（録画）': HELP_HEADING_ID.obs,
  テンプレート: HELP_HEADING_ID.template,
  いいね: HELP_HEADING_ID.like,
  ポータル: HELP_HEADING_ID.portal,
  VOICEVOX: HELP_HEADING_ID.voicevoxSetup,
  配信の見た目: HELP_HEADING_ID.look,
  テスター: HELP_HEADING_ID.tester,
  よくある質問: HELP_HEADING_ID.faq,
  アプリに出ない人がいる: HELP_HEADING_ID.commentsMissing,
  読み上げが止まらない: HELP_HEADING_ID.speech,
  'LIVE Studio の URL': HELP_HEADING_ID.liveStudioUrl,
  読み上げが配信に乗らない: HELP_HEADING_ID.overlayAudio,
  声が二重に聞こえる: HELP_HEADING_ID.doubleAudio,
  接続できない: HELP_HEADING_ID.connect,
  配信ソースに出ない: HELP_HEADING_ID.overlay,
  英語の声で無音: HELP_HEADING_ID.englishVoice,
  'VOICEVOX に繋がらない': HELP_HEADING_ID.voicevox,
  ポートが使えない: HELP_HEADING_ID.port,
  問い合わせ: HELP_HEADING_ID.contact,
  注意: HELP_HEADING_ID.caution,
};

const HELP_TOPIC_IDS = new Set<string>(Object.values(HELP_HEADING_ID));

export function isHelpTopicId(value: unknown): value is HelpTopicId {
  return typeof value === 'string' && HELP_TOPIC_IDS.has(value);
}

export function helpIdForHeading(text: unknown): string {
  const heading = String(text ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return HELP_HEADING_IDS[heading] ?? fallbackHelpId(heading);
}

export function applyHelpHeadingIds(html: string): string {
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/gi, (_all, depth: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return `<h${depth} id="${helpIdForHeading(text)}">${inner}</h${depth}>`;
  });
}

function fallbackHelpId(heading: string): string {
  const compact = heading.replace(/[^\p{L}\p{N}]+/gu, '');
  return compact ? `help-${compact}` : 'help-section';
}
