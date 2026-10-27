/** 常設ギフトの英名 → 日本語名。diamonds があるときは一致するときだけ変換する。 */

type GiftNameRule = {
	ja: string;
	/** 指定時はダイヤ数が一致するギフトだけ変換・常設扱いする */
	diamonds?: readonly number[];
	/** 同じ英名でもコイン数で日本語名が違うとき。無いコインは ja を使う */
	namesByDiamond?: Readonly<Record<number, string>>;
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
	// カタログ上の綴りは Suprised（Surprised ではない）
	"suprised fish": { ja: "びっくりした魚", diamonds: [1] },
	"surprised fish": { ja: "びっくりした魚", diamonds: [1] },
	"udon nou": { ja: "うどん脳", diamonds: [10] },
	fukkachan: { ja: "ふっかちゃん", diamonds: [10] },
	nebaarukun: { ja: "ねば〜る君", diamonds: [10] },
	"paper crane": { ja: "折り鶴", diamonds: [99] },
	"first time": { ja: "初見です", diamonds: [1] },
	"first time here": { ja: "初見です", diamonds: [1] },
	"nice to meet you": { ja: "初見です", diamonds: [1] },
	"cat paw": { ja: "猫の足", diamonds: [1] },
	"cat paws": { ja: "猫の足", diamonds: [1] },
	baseball: { ja: "野球", diamonds: [1] },
	"love letter": { ja: "ラブレター", diamonds: [1] },
	chestnut: { ja: "栗", diamonds: [1] },
	"heart me": { ja: "ハートミー", diamonds: [1] },
	"love you": { ja: "愛してる", diamonds: [199] },
	"love you so much": { ja: "大好き", diamonds: [1] },
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
	"cute cat": { ja: "ニャオ", diamonds: [5] },
	amulet: { ja: "おまもり", diamonds: [5] },
	"new year protection": { ja: "おまもり", diamonds: [5] },
	serious: { ja: "本気", diamonds: [5] },
	// カタログ上の綴りは Seriously
	seriously: { ja: "本気", diamonds: [5] },
	"go popular": { ja: "人気アップ", diamonds: [1] },
	"popular vote": { ja: "人気UP", diamonds: [1] },
	ganbare: { ja: "がんばれ！", diamonds: [9, 20] },
	"ganbare!": { ja: "がんばれ！", diamonds: [9, 20] },
	"go for it": { ja: "がんばれ！", diamonds: [9, 20] },
	"go for it!": { ja: "がんばれ！", diamonds: [9, 20] },
	heart: { ja: "ハート", diamonds: [1, 10, 25] },
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
	"disco ball": { ja: "ミラーボール", diamonds: [1000] },
	galaxy: { ja: "銀河", diamonds: [1000] },
	"sports car": { ja: "スポーツカー", diamonds: [1500, 4999, 7000] },
	"mystery fireworks": { ja: "不思議な花火", diamonds: [1999] },
	"mystery firework": { ja: "不思議な花火", diamonds: [1999] },
	"boxing gloves": {
		ja: "ボクシンググローブ",
		diamonds: [299, 1999],
		namesByDiamond: { 299: "進撃グローブ" },
	},
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
	"tiktok stars": { ja: "TikTok Stars", diamonds: [39999] },
	// 日本のギフト画面で、アイコンとコイン数が一致したもの
	"rust vs world": { ja: "眠れる戦士 vs 世界", diamonds: [18999] },
	"rust reforged": { ja: "眠れる戦士の復活", diamonds: [6000] },
	"party on&on": { ja: "パーティーは続く", diamonds: [15000] },
	"lili the leopard": { ja: "ヒョウのリリー", diamonds: [6599] },
	"strong finish": { ja: "華麗なフィニッシュ", diamonds: [6000] },
	"flying jets": { ja: "空飛ぶジェット機", diamonds: [5000] },
	"dragon flame": { ja: "ドラゴンの炎", diamonds: [26999] },
	"leon and lion": { ja: "レオンとライオン", diamonds: [34000] },
	phoenix: { ja: "フェニックス", diamonds: [25999] },
	"your concert": { ja: "あなたのコンサート", diamonds: [4500] },
	"hip hop hen": { ja: "ヒップホップのニワトリ", diamonds: [3200] },
	"blow rosie kisses": { ja: "ロージーの投げキス", diamonds: [2199] },
	"rocky's punch": { ja: "ロッキーのパンチ", diamonds: [2199] },
	"jollie's heartland": { ja: "ジョリーのハートランド", diamonds: [2199] },
	"ignition check": { ja: "点火チェック", diamonds: [1500] },
	"future encounter": { ja: "未来との遭遇", diamonds: [1500] },
	"racing debut": { ja: "レースデビュー", diamonds: [1500] },
	"chasing the dream": { ja: "夢を追いかける", diamonds: [1500] },
	"greeting card": { ja: "メッセージカード", diamonds: [1500] },
	"wild mic": { ja: "ワイルドライク", diamonds: [1500] },
	"under control": { ja: "すべてOK", diamonds: [1500] },
	"love in sunset": { ja: "夕日のラブストーリー", diamonds: [2999] },
	// 日本のギフト画面。アイコンとコイン数が一致したもの
	"cake slice": { ja: "ケーキ一切れ", diamonds: [1] },
	"clap clap": { ja: "拍手", diamonds: [1] },
	fan: { ja: "うちわ", diamonds: [1] },
	freestyle: { ja: "フリースタイル", diamonds: [1] },
	"mate melody": { ja: "マテ茶のメロディー", diamonds: [1] },
	"mirwas beat": { ja: "ミルワスのビート", diamonds: [1] },
	oldies: { ja: "オールディーズ", diamonds: [1] },
	pop: { ja: "ポップ", diamonds: [1] },
	"welcome dallah": { ja: "ウェルカムダッラ", diamonds: [1] },
	"wink wink": { ja: "ウインク", diamonds: [1] },
	"good job": { ja: "よくできました", diamonds: [1] },
	"a shard of hope": { ja: "希望のかけら", diamonds: [1] },
	"glow stick": { ja: "ペンライト", diamonds: [1] },
	"encore ticket": { ja: "アンコールチケット", diamonds: [5] },
	"love in scent": { ja: "愛の香り", diamonds: [5] },
	"name shoutout": { ja: "名前の呼びかけ", diamonds: [5] },
	overreact: { ja: "オーバーなリアクション", diamonds: [5] },
	saury: { ja: "さんまくん", diamonds: [5] },
	"spinning soccer": { ja: "サッカー", diamonds: [5] },
	support: { ja: "エール", diamonds: [5] },
	"divine fingers": { ja: "神の指", diamonds: [6] },
	"friendship necklace": { ja: "友情ネックレス", diamonds: [10] },
	"mind blown": { ja: "衝撃的すぎ", diamonds: [10] },
	"slow motion": { ja: "スローモーション", diamonds: [10] },
	intimacy: { ja: "深い関係", diamonds: [10] },
	"bravo!": { ja: "ブラボー", diamonds: [15] },
	"kudos for my star": { ja: "推しへの称賛", diamonds: [15] },
	"lyric mail": { ja: "歌詞メール", diamonds: [15] },
	"ao oni": {
		ja: "青鬼",
		diamonds: [20, 900],
		namesByDiamond: { 900: "ランダム青鬼" },
	},
	"g.o.a.t. busker": { ja: "G.O.A.T.バスカー", diamonds: [20] },
	"gift star": { ja: "ギフトスター", diamonds: [25] },
	"fiesta accordion": { ja: "フィエスタアコーディオン", diamonds: [99] },
	"groove guitar": { ja: "グルーヴギター", diamonds: [99] },
	"hat and mustache": { ja: "帽子と口ひげ", diamonds: [99] },
	"healing sape": { ja: "癒しのサベ", diamonds: [99] },
	"live on air": { ja: "ライブなう", diamonds: [99] },
	"pad master": { ja: "バッド・マスター", diamonds: [99] },
	"pearl chime": { ja: "パールチャイム", diamonds: [99] },
	"singing mushroom": { ja: "歌うキノコ", diamonds: [99] },
	"bloom melody": { ja: "フラワーメロディ", diamonds: [99] },
	"breeze quena": { ja: "ケーナのさわやかな音色", diamonds: [99] },
	"mishka bear": { ja: "ミシカベア", diamonds: [100] },
	mp3: { ja: "音楽プレーヤー", diamonds: [100] },
	seahorse: { ja: "タツノオトシゴさん", diamonds: [100] },
	"groove clarinet": { ja: "グルーブラリネット", diamonds: [149] },
	"love glasses": { ja: "恋のメガネ", diamonds: [149] },
	"mystic ney": { ja: "神秘的なネイ", diamonds: [149] },
	"tempo flute": { ja: "テンポフルート", diamonds: [149] },
	"mystic panpipes": { ja: "神秘のパンパイプ", diamonds: [199] },
	"rhythm bot": { ja: "リズムボット", diamonds: [199] },
	baglama: { ja: "バグラマ", diamonds: [200] },
	ramune: { ja: "ラムネ", diamonds: [200] },
	semsemia: { ja: "セムセミア", diamonds: [200] },
	"blast drum": { ja: "ブラストドラム", diamonds: [249] },
	"dreamy strings": { ja: "夢のような音色", diamonds: [249] },
	"amped up": { ja: "ボリュームアップ", diamonds: [249] },
	"poetry score": { ja: "詩の楽譜", diamonds: [249] },
	"singing frog": { ja: "歌うカエル", diamonds: [249] },
	"tiny diny float": { ja: "サマー恐竜", diamonds: [250] },
	"cello romance": { ja: "チェロロマンス", diamonds: [299] },
	"cheering towel": { ja: "応援タオル", diamonds: [299] },
	"come on!": { ja: "頑張れ！", diamonds: [299] },
	corgi: { ja: "コーギー", diamonds: [299] },
	"floral lute": { ja: "フローラルリュート", diamonds: [299] },
	"fruit friends": { ja: "フルーツの友達", diamonds: [299] },
	"music mate": { ja: "音楽の友", diamonds: [299] },
	"piano bow": { ja: "ピアノリボン", diamonds: [299] },
	"rhythm crown": { ja: "リズムクラウン", diamonds: [299] },
	"swing cello": { ja: "スイングチェロ", diamonds: [299] },
	"united heart": { ja: "団結", diamonds: [299] },
	"chopin in the rain": { ja: "雨の中のショパン", diamonds: [349] },
	"djembe master": { ja: "ジェンベマスター", diamonds: [349] },
	"electro vibes": { ja: "エレクトロバイブス", diamonds: [349] },
	"retro headset": { ja: "レトロヘッドセット", diamonds: [349] },
	"rocking shroom": { ja: "ロックなマッシュルーム", diamonds: [349] },
	"ukulele player": { ja: "ウクレレ演奏者", diamonds: [349] },
	"retro melody": { ja: "レトロメロディ", diamonds: [349] },
	"cactus shuffle": { ja: "カクタス・シャッフル", diamonds: [399] },
	"cotton the seal": { ja: "アザラシちゃん", diamonds: [399] },
	"dj set": {
		ja: "DJセット",
		diamonds: [20, 399],
		namesByDiamond: { 20: "ビートドロップ" },
	},
	"floral serenade": { ja: "フローラルセレナーデ", diamonds: [399] },
	"jollie the joy bean": { ja: "楽しいビーンのジョリー", diamonds: [399] },
	"melody headset": { ja: "メロディヘッドセット", diamonds: [399] },
	"rocky the rock bean": { ja: "ロックビーンのロッキー", diamonds: [399] },
	"rosie the rose bean": { ja: "バラのビーンのロージー", diamonds: [399] },
	"sage the smart bean": { ja: "スマートビーンのセージ", diamonds: [399] },
	"sing in sync": { ja: "シンクロして歌う", diamonds: [399] },
	"singing mic": { ja: "歌用マイク", diamonds: [399] },
	"singing sax": { ja: "歌うサックス", diamonds: [399] },
	"wind on kemenche": { ja: "ケメンチェの風", diamonds: [399] },
	"beat wings": { ja: "ビートウィング", diamonds: [399] },
	"dj wave": { ja: "DJウェーブ", diamonds: [400] },
	"heartbeat keys": { ja: "ハートビートキー", diamonds: [400] },
	"magic accordion": { ja: "マジックアコーディオン", diamonds: [400] },
	"neon rockstar": { ja: "ネオンロックスター", diamonds: [400] },
	"pop parrot": { ja: "ポップなオウム", diamonds: [400] },
	"rock cats": { ja: "ロックキャッツ", diamonds: [400] },
	"rock idol": { ja: "ロックアイドル", diamonds: [400] },
	"siren's echo": { ja: "セイレーンのエコー", diamonds: [400] },
	"clown boogie": { ja: "クラウン・ブギー", diamonds: [449] },
	"cyber strings": { ja: "サイバーストリングス", diamonds: [449] },
	"lightning look": { ja: "ライトニングルック", diamonds: [449] },
	"pirate's treasure": { ja: "海賊の宝", diamonds: [449] },
	"city pop": { ja: "シティポップ", diamonds: [450] },
	"cupid koala": { ja: "キューピッドのコアラ", diamonds: [450] },
	"cupid's bow": { ja: "キューピッドの矢", diamonds: [99] },
	"cupid’s bow": { ja: "キューピッドの矢", diamonds: [99] },
	"glow chant": { ja: "光る応援", diamonds: [450] },
	"pink cowboy": { ja: "ピンクカウボーイ", diamonds: [450] },
	"fuzzy drum": { ja: "ファジードラム", diamonds: [499] },
	"im just a hamster": { ja: "ただのハムスターだよ", diamonds: [499] },
	"key master": { ja: "キーマスター", diamonds: [499] },
	"surfing penguin": { ja: "波乗りペンギン", diamonds: [249, 499] },
	"dj glasses": { ja: "DJメガネ", diamonds: [500] },
	"drum genius": { ja: "ドラムの天才", diamonds: [500] },
	"drum pop": { ja: "ドラムポップ", diamonds: [500] },
	"heart guitar": { ja: "ハートのギター", diamonds: [500] },
	"honey strummer": { ja: "ミツバチとギターを鳴らす", diamonds: [500] },
	"lost in your music": { ja: "あなたの音楽に夢中", diamonds: [500] },
	manifesting: { ja: "Manifesting", diamonds: [500] },
	"match master": { ja: "Matchマスター", diamonds: [500] },
	"sound spell": { ja: "呪文のサウンド", diamonds: [500] },
	"you're amazing": { ja: "すばらしい！", diamonds: [500] },
	"you’re amazing": { ja: "すばらしい！", diamonds: [500] },
	"drum hamster": { ja: "ドラム・ハムスター", diamonds: [549] },
	"purrfect pitch": { ja: "ニャンダブルなピッチ", diamonds: [550] },
	"sakura flute": { ja: "桜フルート", diamonds: [600] },
	"sakura style dj": { ja: "桜スタイルDJ", diamonds: [600] },
	"seahorse pop": { ja: "タツノオトシゴのポップ", diamonds: [649] },
	"epic pianist": { ja: "最高のピアニスト", diamonds: [800] },
	"stage wiggle": { ja: "ステージでくねくねする", diamonds: [899] },
	"lucky airdrop box": { ja: "空中投下ラッキーボックス", diamonds: [999] },
	"rising dragon": { ja: "のぼり竜", diamonds: [999] },
	"travel with you": { ja: "travel with me", diamonds: [999] },
	"glowing jellyfish": { ja: "光るクラゲ", diamonds: [1000] },
	"feather flock": { ja: "羽根", diamonds: [1000] },
	"watermelon party": { ja: "スイカバーティー", diamonds: [1000] },
	"exclusive spark": { ja: "幕開けの花火", diamonds: [1099] },
	"bunny dj": { ja: "バニーDJ", diamonds: [1200] },
	"starlight sceptre": { ja: "マスターズの杖", diamonds: [1200] },
	"frozen magic": { ja: "雪の魔法", diamonds: [1299] },
	"party laser": { ja: "パーティーレーザー", diamonds: [1300] },
	penlight: { ja: "ペンライト", diamonds: [1599] },
	"hug it better": { ja: "はぎゅっ", diamonds: [1600] },
	"lovely ride": { ja: "好きになった", diamonds: [1600] },
	"cooper flies home": { ja: "クーパー、飛んで帰る", diamonds: [1999] },
	spooktacular: { ja: "ハロウィンマジック", diamonds: [1999] },
	"baby dragon": { ja: "ベビードラゴン", diamonds: [2000] },
	"sage's coinbot": { ja: "セージのコインボット", diamonds: [2199] },
	"wave lights": { ja: "ウェーブライト", diamonds: [2200] },
	unicorn: { ja: "ユニコーン", diamonds: [2499] },
	"celebration tape": { ja: "お祝いテープ", diamonds: [2800] },
	"stroke me": { ja: "なでられ待ち", diamonds: [2800] },
	motorcycle: { ja: "オートバイ", diamonds: [2988] },
	"match maniac": { ja: "Matchマニアック", diamonds: [2999] },
	"old famous car": { ja: "クラシックカー", diamonds: [2999] },
	"ray serenade": { ja: "エイのセレナーデ", diamonds: [2999] },
	"leon the kitten": { ja: "子猫のレオン", diamonds: [4888] },
	"private jet": { ja: "プライベートジェット", diamonds: [4888] },
	"guardian's pledge": { ja: "ガーディアンの誓い", diamonds: [4999] },
	"unicorn fantasy": { ja: "幻のユニコーン", diamonds: [5000] },
	"last riff roar": { ja: "終盤のギターリフの轟音", diamonds: [6999] },
	"blueberry monster": { ja: "ブルーベリー色の怪異", diamonds: [7000] },
	"summer fuji mountain": { ja: "富士花火", diamonds: [7999] },
	"leon and lili": { ja: "レオンとリリー", diamonds: [9699] },
	interstellar: { ja: "星から星へ", diamonds: [10000] },
	"sunset speedway": { ja: "夕暮れを背に", diamonds: [10000] },
	"future journey": { ja: "未来への旅", diamonds: [15000] },
	"bran castle": { ja: "暗が潜む館", diamonds: [15000] },
	stadium: { ja: "熱狂スタジアム", diamonds: [15999] },
	"tiktok shuttle": { ja: "TikTokシャトル", diamonds: [20000] },
	"siren's aria": { ja: "セイレーンのアリア", diamonds: [22500] },
	"rose carriage": { ja: "バラの馬車", diamonds: [25000] },
	"adam's dream": { ja: "アダムの夢", diamonds: [25999] },
	"adam’s dream": { ja: "アダムの夢", diamonds: [25999] },
	// インタラクティブなどのタブ。アイコンとコイン数が一致したもの
	"super popular": { ja: "スーパー人気", diamonds: [9] },
	"bubble gum": { ja: "風船ガム", diamonds: [99] },
	"little crown": { ja: "小さな王冠", diamonds: [99] },
	"love painting": { ja: "ラブペインティング", diamonds: [99] },
	"cow napping": { ja: "牛の誘拐", diamonds: [99] },
	"mark of love": { ja: "愛の印", diamonds: [99] },
	"sundae bowl": { ja: "ミニパフェ", diamonds: [99] },
	"club victory": { ja: "クラブ勝利", diamonds: [99] },
	bowknot: { ja: "蝶結び", diamonds: [149] },
	"feather tiara": { ja: "羽のティアラ", diamonds: [149] },
	"frog conductor": { ja: "カエルの指揮者", diamonds: [149] },
	"chatting popcorn": { ja: "おしゃべりポップコーン", diamonds: [149] },
	"fairy hide": { ja: "妖精のかくれんぼ", diamonds: [149] },
	"caterpillar chaos": { ja: "イモムシのカオス", diamonds: [149] },
	"big shout out": { ja: "ビッグな叫び", diamonds: [149] },
	catrina: { ja: "カトリーナ", diamonds: [149] },
	"raving snail": { ja: "踊りまくるカタツムリ", diamonds: [149] },
	"cheering crab": { ja: "応援するカニ", diamonds: [199] },
	"coconut juice": { ja: "ココナッツジュース", diamonds: [199] },
	"coffee magic": { ja: "コーヒーマジック", diamonds: [199] },
	"fan cat": { ja: "ファン猫", diamonds: [199] },
	"floating octopus": { ja: "流れるタコ", diamonds: [199] },
	"flower headband": { ja: "花のカチューシャ", diamonds: [199] },
	"heart hood": { ja: "ハートのフード", diamonds: [199] },
	"joker ball": { ja: "ジョーカーのボール", diamonds: [199] },
	"party pony": { ja: "パーティーポニー", diamonds: [199] },
	"smile latte": { ja: "スマイルラテ", diamonds: [199] },
	"sunny side up": { ja: "目玉焼き", diamonds: [199] },
	"chirpy kisses": { ja: "小鳥のキス", diamonds: [199] },
	"candy bouquet": { ja: "キャンディーのブーケ", diamonds: [249, 349] },
	"cheer mic": { ja: "応援マイク", diamonds: [249] },
	"face pulling": { ja: "顔をつねる", diamonds: [249] },
	"forest elf": { ja: "森の小人", diamonds: [249] },
	"ice cream mic": { ja: "アイスクリームのマイク", diamonds: [249] },
	"melodic birds": { ja: "鳥のさえずり", diamonds: [249] },
	"palm breeze": { ja: "ヤシの木とそよ風", diamonds: [249] },
	"party blossom": { ja: "パーティー満開", diamonds: [249] },
	"snow bloom": { ja: "雪の花", diamonds: [249] },
	"star goggles": { ja: "スターメガネ", diamonds: [249] },
	"sweet flutter": { ja: "スイートな蝶", diamonds: [249] },
	"treasured voice": { ja: "大切にされている声", diamonds: [249] },
	"approaching ao oni": { ja: "迫り来る青鬼", diamonds: [299] },
	"bat headwear": { ja: "コウモリの帽子", diamonds: [299] },
	"brazilian vibe cap": { ja: "ブラジルっぽいキャップ", diamonds: [299] },
	"butterfly for you": { ja: "あなたのための蝶", diamonds: [299] },
	"go hamster": { ja: "ハムスターに変身", diamonds: [299] },
	"kicker challenge": { ja: "サッカーチャレンジ", diamonds: [299] },
	"labor power": { ja: "労働パワー", diamonds: [299] },
	"love call": { ja: "ラブコール", diamonds: [299] },
	"melody glasses": { ja: "メロディグラス", diamonds: [299] },
	"naughty chicken": { ja: "いたずら好きな鶏", diamonds: [299] },
	"penguin snowpal": { ja: "ペンギンと雪だるま", diamonds: [299] },
	"pony lantern": { ja: "ポニーのランタン", diamonds: [299] },
	"puppy kisses": { ja: "子犬のキス", diamonds: [299] },
	"rock star": { ja: "ロックスター", diamonds: [299] },
	"sax groove": { ja: "サックスグルーヴ", diamonds: [299] },
	"spring sprout": { ja: "春の芽吹き", diamonds: [299] },
	"tropical mask": { ja: "トロピカル仮面", diamonds: [299] },
	"budding heart": { ja: "ハートの誕生", diamonds: [299] },
	"play for you": { ja: "あなたに演奏", diamonds: [299] },
	"wakey mallow": { ja: "お目覚めマロウ", diamonds: [299] },
	"feather mask": { ja: "羽根のマスク", diamonds: [300] },
	"batwing hat": { ja: "コウモリ帽子", diamonds: [349] },
	"beach maracas": { ja: "ビーチマラカス", diamonds: [349] },
	"become kitten": { ja: "子猫になる", diamonds: [349] },
	"butterfly vibe": { ja: "バタフライバイブ", diamonds: [349] },
	"gingerbread man": { ja: "ジンジャーブレッドマン", diamonds: [349] },
	"juicy cap": { ja: "ジュースを飲むキャップ", diamonds: [349] },
	"mom's bonnet": { ja: "ママの帽子", diamonds: [349] },
	"spring bouquet": { ja: "春のブーケ", diamonds: [349] },
	"vintage flight": { ja: "ヴィンテージフライト", diamonds: [349] },
	"starry seal": { ja: "星がきらめくアザラシ", diamonds: [349] },
	"alien buddy": { ja: "エイリアンの仲間", diamonds: [399] },
	"aurora groove": { ja: "オーロラグルーヴ", diamonds: [399] },
	"blossom fairy": { ja: "花の妖精", diamonds: [399] },
	"confetti bear": { ja: "クラッカーベア", diamonds: [399] },
	"dreamy hat": { ja: "ドリーミーハット", diamonds: [399] },
	"echo mom": { ja: "エコーママ", diamonds: [399] },
	"kitten kneading": { ja: "ふみふみする子猫", diamonds: [399] },
	"let butterfly dances": { ja: "蝶が踊る", diamonds: [399] },
	"panda snap": { ja: "パンダのスナップ", diamonds: [399] },
	"papa capybara": { ja: "パパカピバラ", diamonds: [399] },
	"relaxed goose": { ja: "リラックスグース", diamonds: [399] },
	"shoot the apple": { ja: "リンゴを撃つ", diamonds: [399] },
	"tiger lift": { ja: "タイガーの筋トレ", diamonds: [399] },
	"tom's hug": { ja: "トムのハグ", diamonds: [399] },
	"bounce speakers": { ja: "跳ねるスピーカー", diamonds: [400] },
	"cheeky pup": { ja: "いたずらな子犬", diamonds: [400] },
	"crystal dreams": { ja: "クリスタルドリーム", diamonds: [400] },
	"glorious chef": { ja: "優れたシェフ", diamonds: [400] },
	"mic champ": { ja: "マイクチャンピオン", diamonds: [400] },
	"punch cuddle": { ja: "パンチ君のハグ", diamonds: [400] },
	"reindeer milk": { ja: "トナカイのミルク", diamonds: [400] },
	"super dad": { ja: "スーパーパパ", diamonds: [400] },
	"wishing cake": { ja: "お祝いケーキ", diamonds: [400] },
	"batting cutie": { ja: "キュートなバッター", diamonds: [449] },
	"beating heart": { ja: "鼓動するハート", diamonds: [449] },
	"candy loot": { ja: "キャンディーをゲット", diamonds: [449] },
	"captured vocals": { ja: "録音した音", diamonds: [449] },
	"encore clap": { ja: "アンコールの拍手", diamonds: [449] },
	"space love": { ja: "宇宙の愛", diamonds: [449] },
	"terminator face": { ja: "ターミネーターフェイス", diamonds: [449] },
	"xmas tree hat": { ja: "クリスマスツリーの帽子", diamonds: [449] },
	"celebration hat": { ja: "お祝いのハット", diamonds: [450] },
	"clover hat": { ja: "クローバーハット", diamonds: [450] },
	"halloween fun hat": { ja: "ハロウィンファンハット", diamonds: [450] },
	"hat of joy": { ja: "楽しい帽子", diamonds: [450] },
	"music conductor": { ja: "音楽指揮者", diamonds: [450] },
	"office penguin": { ja: "オフィスペンギン", diamonds: [450] },
	"paw call": { ja: "肉球電話", diamonds: [450] },
	"powerful mind": { ja: "パワフルマインド", diamonds: [450] },
	"sloth peek": { ja: "ナマケモノのちら見", diamonds: [450] },
	superwoman: { ja: "スーパーウーマン", diamonds: [450] },
	"rose soundwave": { ja: "ローズサウンドウェーブ", diamonds: [499] },
	"dragon crown": { ja: "ドラゴンの冠", diamonds: [500] },
	"gem gun": { ja: "宝石銃", diamonds: [500] },
	"mystery box": { ja: "ミステリーボックス", diamonds: [500] },
	"racing helmet": { ja: "レーシングヘルメット", diamonds: [500] },
	"roo mother": { ja: "ママカンガルー", diamonds: [500] },
	"starry fluff": { ja: "星付きふわふわ帽子", diamonds: [500] },
	"colorful wings": { ja: "カラフルな翼", diamonds: [700] },
	"fairy wings": { ja: "妖精の羽", diamonds: [1000] },
	"flamingo groove": { ja: "フラミンゴリズム", diamonds: [1000] },
	"shiny air balloon": { ja: "ゆめ気球", diamonds: [1000] },
	"level ship": { ja: "レベルシップ", diamonds: [1500] },
	"blooming heart": { ja: "花咲くハート", diamonds: [1599] },
	"fox legend": { ja: "尻尾が9本あるキツネ", diamonds: [1800] },
	"umbrella of love": { ja: "ラブシェルター", diamonds: [1200] },
	"vibrant stage": { ja: "活気あふれるステージ", diamonds: [1400] },
	"hive escape": { ja: "巣からお出かけ", diamonds: [549] },
	"animal band": { ja: "アニマルバンド", diamonds: [2500] },
	"fiery dragon": { ja: "ファイアードラゴン", diamonds: [4888] },
	"signature jet": { ja: "サイン付きジェット機", diamonds: [4888] },
	"fly love": { ja: "飛ぶ愛", diamonds: [19999] },
	"infinite heart": { ja: "永遠のハート", diamonds: [23999] },
	"thunder falcon": { ja: "サンダーバード", diamonds: [39999] },
	"fire phoenix": { ja: "ファイアフェニックス", diamonds: [41999] },
	pegasus: { ja: "ホワイトペガサス", diamonds: [42999] },
	"heart it out": { ja: "マイクに想いをのせよう", diamonds: [500] },
	"premium shuttle": { ja: "プレミアムロケット", diamonds: [20000] },
	"music bubbles": {
		ja: "音色のしずく",
		diamonds: [100, 249],
		namesByDiamond: { 249: "シャボン玉のヘッドホン" },
	},
	"autumn dog camp": { ja: "紅葉キャンプ", diamonds: [500] },
	"pinch face": { ja: "顔をつねる", diamonds: [249] },
	"vr goggles": { ja: "タイムゴーグル", diamonds: [500] },
	"vocal bear": { ja: "マイクベア", diamonds: [399] },
	"tiny diny mic": { ja: "一曲どうぞ", diamonds: [5] },
	"journey pass": { ja: "ジャーニーバス", diamonds: [10] },
	"club power": { ja: "団結クラブ", diamonds: [9] },
	"charmer bow": { ja: "ハートハンターの矢", diamonds: [99] },
	"heart my earthling": { ja: "すきすきビーム", diamonds: [100] },
	masquerade: { ja: "ミステリーマスク", diamonds: [149] },
	"garland headpiece": { ja: "花冠", diamonds: [199] },
	"hi! rosie!": { ja: "ロージーのスタイル", diamonds: [299] },
	"backing monkey": { ja: "シンバルの猿", diamonds: [349] },
	"sparkle pony": { ja: "ポニーと花火", diamonds: [349] },
	"fairy locket": { ja: "妖精ロケット", diamonds: [399] },
	"rocket game": { ja: "ミッションチャレンジ", diamonds: [399] },
	"rosie's concert": { ja: "ロージーのサックス", diamonds: [399] },
	"shell of a warrior": { ja: "ヘッドギア", diamonds: [500] },
	"star map polaris": { ja: "星まつり", diamonds: [500] },
	symphony: { ja: "黄金の旋律", diamonds: [500] },
	"centre stage": { ja: "ステージマイク", diamonds: [700] },
	"funky hatter": { ja: "ファンキーハッター", diamonds: [900] },
	"trending figure": { ja: "スポットライト", diamonds: [999] },
	"blooming ribbons": { ja: "金の紙吹雪", diamonds: [1000] },
	"party bus": { ja: "パーティーバス", diamonds: [2999] },
	"enjoy music": { ja: "メロディポップ", diamonds: [1] },
	"midsummer hair": { ja: "女神の花冠", diamonds: [249] },
	"level up sparks": { ja: "ファンケーキ", diamonds: [99] },
	"dream team": { ja: "団結", diamonds: [299] },
	"galaxy's bestest": { ja: "きゅんジェット", diamonds: [300] },
	"autumn leaves": { ja: "紅葉", diamonds: [500] },
	"forever rosa": { ja: "永遠のバラ", diamonds: [399] },
	"autumn picnic": { ja: "秋のピクニック", diamonds: [1300] },
	"ice cream truck": { ja: "アイスクリームトラック", diamonds: [2988] },
	"devoted heart": { ja: "ハートの絆", diamonds: [5999] },
	"balloon crown": { ja: "ハートの風船", diamonds: [149] },
	"marked with love": { ja: "カラフルな軌跡", diamonds: [349] },
	"join butterflies": { ja: "輝く翼", diamonds: [600] },
	"future city": { ja: "未来からの抱擁", diamonds: [6000] },
	"groove straw": { ja: "グルーヴハット", diamonds: [450] },
	"talking heartbeat": { ja: "思いを伝えるビート", diamonds: [199] },
	"spin seal": { ja: "DJアザラシ", diamonds: [349] },
};

export function normalizeGiftNameKey(name: string): string {
	return String(name || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

/** 配信の説明文 "sent ギフト名" から動詞だけ外す。 */
export function stripLeadingSentGiftName(name: string): string {
	return String(name || "")
		.trim()
		.replace(/^sent\s+/i, "")
		.trim();
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
	const raw = stripLeadingSentGiftName(name);
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
	const raw = stripLeadingSentGiftName(englishOrAny);
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
	if (rule.namesByDiamond && typeof diamondCount === "number" && Number.isFinite(diamondCount)) {
		const named = rule.namesByDiamond[Math.max(0, Math.trunc(diamondCount))];
		if (named) {
			return named;
		}
	}
	return rule.ja;
}

export function applyKnownJapaneseGiftNames<
	T extends { name: string; diamondCount?: number; sourceName?: string },
>(gifts: T[]): T[] {
	return gifts.map((gift) => {
		if (String(gift.sourceName || "").trim()) {
			return gift;
		}
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
