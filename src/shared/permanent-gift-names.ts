/** 常設ギフトの英名 → 日本語名。diamonds があるときは一致するときだけ変換する。 */

type GiftNameRule = {
	ja: string;
	/** 指定時はダイヤ数が一致するギフトだけ変換・常設扱いする */
	diamonds?: readonly number[];
};

/**
 * 常設・定番の英名 → 日本語名。
 * 日本語名の目安は日本向け解説一覧（koukoku.jp 2026/1月版）と既存運用。
 * diamonds は一致するときだけ変換する。
 */
const EN_TO_JA: Record<string, GiftNameRule> = {
	rose: { ja: "バラ", diamonds: [1] },
	gg: { ja: "GG", diamonds: [1] },
	"shocked fish": { ja: "びっくりした魚", diamonds: [1] },
	"first time": { ja: "初見です", diamonds: [1] },
	"first time here": { ja: "初見です", diamonds: [1] },
	"cat paw": { ja: "猫の足", diamonds: [1] },
	"cat paws": { ja: "猫の足", diamonds: [1] },
	baseball: { ja: "野球", diamonds: [1] },
	"love letter": { ja: "ラブレター", diamonds: [1] },
	chestnut: { ja: "栗", diamonds: [1] },
	"heart me": { ja: "ハートミー", diamonds: [1] },
	"love you": { ja: "大好き", diamonds: [1] },
	"ice cream cone": { ja: "ソフトクリーム", diamonds: [1] },
	"autumn heart": { ja: "秋のハート", diamonds: [1] },
	"music on stage": { ja: "Music on Stage", diamonds: [1] },
	"gimme the heat": { ja: "Gimme the Heat", diamonds: [1] },
	"you're awesome": { ja: "素晴らしい", diamonds: [1] },
	"you are awesome": { ja: "素晴らしい", diamonds: [1] },
	volleyball: { ja: "バレーボール", diamonds: [1] },
	tiktok: { ja: "TikTok", diamonds: [1] },
	hi: { ja: "こんにちは", diamonds: [5] },
	"finger heart": { ja: "フィンガーハート", diamonds: [5] },
	meow: { ja: "ニャオ", diamonds: [5] },
	"Cute Cat": { ja: "ニャオ", diamonds: [5] },
	amulet: { ja: "おまもり", diamonds: [5] },
	serious: { ja: "本気", diamonds: [5] },
	ganbare: { ja: "がんばれ！", diamonds: [9, 20] },
	"ganbare!": { ja: "がんばれ！", diamonds: [9, 20] },
	"go for it": { ja: "がんばれ！", diamonds: [9, 20] },
	"go for it!": { ja: "がんばれ！", diamonds: [9, 20] },
	heart: { ja: "ハート", diamonds: [10, 25] },
	rosa: { ja: "ローザ", diamonds: [10] },
	gamepad: { ja: "ゲームパッド", diamonds: [10] },
	"game pad": { ja: "ゲームパッド", diamonds: [10] },
	microphone: { ja: "マイク", diamonds: [10] },
	panda: { ja: "パンダ", diamonds: [5, 10] },
	"ice lolly": { ja: "アイスバー", diamonds: [10] },
	"shaved ice": { ja: "かき氷", diamonds: [10] },
	travel: { ja: "ジャーニーパス", diamonds: [10] },
	perfume: { ja: "香水", diamonds: [20] },
	"coffee time": { ja: "コーヒータイム", diamonds: [15] },
	doughnut: { ja: "ドーナッツ", diamonds: [30] },
	donut: { ja: "ドーナッツ", diamonds: [30] },
	lollipop: { ja: "ペロペロキャンディ", diamonds: [10, 30] },
	clap: { ja: "拍手", diamonds: [50] },
	genius: { ja: "天才", diamonds: [50] },
	star: { ja: "スター", diamonds: [99] },
	"gimme the mic": { ja: "Gimme the Mic", diamonds: [99] },
	// 記事表記はハンドハート
	"hand hearts": { ja: "ハンドハート", diamonds: [100] },
	"hand heart": { ja: "ハンドハート", diamonds: [100] },
	"game controller": { ja: "ゲームコントローラー", diamonds: [100] },
	sunflower: { ja: "ひまわり", diamonds: [100] },
	confetti: { ja: "紙吹雪", diamonds: [100] },
	bouquet: { ja: "花束", diamonds: [100] },
	cap: { ja: "キャップ", diamonds: [99] },
	harp: { ja: "ハープ", diamonds: [150] },
	cake: { ja: "ケーキ", diamonds: [150] },
	hearts: { ja: "ハート（大）", diamonds: [199] },
	"big heart": { ja: "ハート（大）", diamonds: [199] },
	sunglasses: { ja: "サングラス", diamonds: [199] },
	"flower crown": { ja: "花冠", diamonds: [199] },
	"rose hand": { ja: "ローズハンド", diamonds: [199] },
	headphones: { ja: "ヘッドフォン", diamonds: [200] },
	butterfly: { ja: "蝶々", diamonds: [169, 299] },
	"rock 'n' roll": { ja: "ロックンロール", diamonds: [299, 449] },
	"rock n roll": { ja: "ロックンロール", diamonds: [299, 449] },
	"rock and roll": { ja: "ロックンロール", diamonds: [299, 449] },
	ring: { ja: "指輪", diamonds: [300] },
	coffee: { ja: "コーヒー", diamonds: [499] },
	coral: { ja: "サンゴ", diamonds: [499, 888] },
	"money rain": { ja: "マネーレイン", diamonds: [500] },
	"money gun": { ja: "マネーガン", diamonds: [500] },
	"love balloon": { ja: "ラブバルーン", diamonds: [500] },
	concert: { ja: "コンサート", diamonds: [500] },
	"treasure box": { ja: "宝箱", diamonds: [600] },
	swan: { ja: "白鳥", diamonds: [699, 999] },
	train: { ja: "列車", diamonds: [899] },
	fireworks: { ja: "花火", diamonds: [1088] },
	"diamond tree": { ja: "ダイヤモンドツリー", diamonds: [1088] },
	"ferris wheel": { ja: "観覧車", diamonds: [1000, 3000] },
	"disco ball": { ja: "ディスコボール", diamonds: [1000] },
	galaxy: { ja: "銀河", diamonds: [1000] },
	"sports car": { ja: "スポーツカー", diamonds: [1500, 4999, 7000] },
	"mystery fireworks": { ja: "不思議な花火", diamonds: [1999] },
	"boxing gloves": { ja: "ボクシンググローブ", diamonds: [1999] },
	"whale diving": { ja: "クジラのダイビング", diamonds: [2150] },
	"rhythmic bear": { ja: "リズミカルなクマ", diamonds: [2999] },
	bull: { ja: "雄牛", diamonds: [2999] },
	yacht: { ja: "ヨット", diamonds: [4999, 9888, 20000] },
	submarine: { ja: "潜水艦", diamonds: [5199] },
	airplane: { ja: "飛行機", diamonds: [6000] },
	aeroplane: { ja: "飛行機", diamonds: [6000] },
	airship: { ja: "飛行船", diamonds: [7000] },
	// 記事は3000表記もあるが既存運用の8888も残す
	"meteor shower": { ja: "流星群", diamonds: [3000, 8888] },
	falcon: { ja: "ハヤブサ", diamonds: [10999] },
	"white wolf": { ja: "ホワイトウルフ", diamonds: [12000] },
	"rosa nebula": { ja: "ローザの星雲", diamonds: [15000] },
	"amusement park": { ja: "遊園地", diamonds: [17000] },
	"dream castle": { ja: "夢のお城", diamonds: [20000] },
	castle: { ja: "キャッスル", diamonds: [20000] },
	"cruise ship": { ja: "クルーズ船", diamonds: [20000] },
	lion: { ja: "ライオン", diamonds: [29999] },
	"tiktok universe": { ja: "TikTok Universe", diamonds: [34999, 44999] },
	"tiktok universe+": { ja: "TikTok Universe+", diamonds: [34999] },
};

export function normalizeGiftNameKey(name: string): string {
	return String(name || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

function looksJapaneseGiftName(name: string): boolean {
	return /[\u3040-\u30ff\u3400-\u9fff]/.test(name);
}

/** 安いダイヤ → 日本語50音 → 英語アルファベット。 */
export function compareCatalogGiftOrder(left: { name: string; diamondCount: number }, right: { name: string; diamondCount: number }): number {
	if (left.diamondCount !== right.diamondCount) {
		return left.diamondCount - right.diamondCount;
	}
	const scriptLeft = looksJapaneseGiftName(left.name) ? 0 : 1;
	const scriptRight = looksJapaneseGiftName(right.name) ? 0 : 1;
	if (scriptLeft !== scriptRight) {
		return scriptLeft - scriptRight;
	}
	return left.name.localeCompare(right.name, "ja");
}

function ruleMatchesDiamonds(rule: GiftNameRule, diamondCount?: number): boolean {
	if (!rule.diamonds || rule.diamonds.length === 0) {
		return true;
	}
	if (typeof diamondCount !== "number" || !Number.isFinite(diamondCount)) {
		return false;
	}
	return rule.diamonds.includes(Math.max(0, Math.trunc(diamondCount)));
}

function lookupPermanentRule(name: string): GiftNameRule | null {
	const raw = String(name || "").trim();
	if (!raw || /[\u3040-\u30ff\u3400-\u9fff]/.test(raw)) {
		return null;
	}
	return EN_TO_JA[normalizeGiftNameKey(raw)] ?? null;
}

/** 英名＋ダイヤが常設辞書に一致するか（日本語名では判定しない）。 */
export function matchesPermanentEnglishName(name: string, diamondCount?: number): boolean {
	const rule = lookupPermanentRule(name);
	return Boolean(rule && ruleMatchesDiamonds(rule, diamondCount));
}

export function japaneseNameForGift(englishOrAny: string, diamondCount?: number): string {
	const raw = String(englishOrAny || "").trim();
	if (!raw) {
		return "";
	}
	if (/[\u3040-\u30ff\u3400-\u9fff]/.test(raw)) {
		return raw;
	}
	const rule = lookupPermanentRule(raw);
	if (!rule || !ruleMatchesDiamonds(rule, diamondCount)) {
		return raw;
	}
	return rule.ja;
}

export function applyKnownJapaneseGiftNames<T extends { name: string; diamondCount?: number }>(gifts: T[]): T[] {
	return gifts.map((gift) => {
		const next = japaneseNameForGift(gift.name, gift.diamondCount);
		return next === gift.name ? gift : { ...gift, name: next };
	});
}

/** 英名が常設辞書に合うものを優先し、残りは安い順で上限まで残す。 */
export function preferPermanentCatalogGifts<T extends { id: string; name: string; diamondCount: number }>(gifts: T[], limit = 500): T[] {
	const cap = Math.max(0, Math.trunc(limit));
	if (cap === 0 || gifts.length === 0) {
		return [];
	}

	const preferredIds = new Set<string>();
	for (const gift of gifts) {
		if (matchesPermanentEnglishName(gift.name, gift.diamondCount)) {
			preferredIds.add(String(gift.id));
		}
	}

	const named = applyKnownJapaneseGiftNames(gifts);
	const seen = new Set<string>();
	const preferred: T[] = [];
	const rest: T[] = [];
	for (const gift of named) {
		const id = String(gift.id || "").trim();
		if (!id || seen.has(id)) {
			continue;
		}
		seen.add(id);
		if (preferredIds.has(id)) {
			preferred.push(gift);
		} else {
			rest.push(gift);
		}
	}

	preferred.sort(compareCatalogGiftOrder);
	rest.sort(compareCatalogGiftOrder);
	// 常設優先で枠を決めたあと、表示は安いダイヤ・日本語・英語の順に揃える
	return [...preferred, ...rest].slice(0, cap).sort(compareCatalogGiftOrder);
}
