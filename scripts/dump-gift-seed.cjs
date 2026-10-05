/**
 * 取れるギフト一覧を同梱シードへ書き出す。
 * 使い方: node scripts/dump-gift-seed.cjs [uniqueId]
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), '.env'), quiet: true });

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(body) {
  return Boolean(body.limit_label || body.limit_details || body.code === 429);
}

async function fetchCatalogPage(list, pageSize, page) {
  let response;
  try {
    response = await list(pageSize, page);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const err = new Error(message);
    err.code = /rate|limit|429|configuration/i.test(message) ? 'RATE_LIMIT' : 'FETCH';
    throw err;
  }
  const body = asRecord(response?.data ?? response);
  if (isRateLimited(body)) {
    const detail =
      typeof body.message === 'string' && body.message
        ? body.message
        : String(body.limit_label || body.code || 'rate limited');
    const err = new Error(`カタログ制限: ${detail}`);
    err.code = 'RATE_LIMIT';
    throw err;
  }
  return {
    gifts: Array.isArray(body.gifts) ? body.gifts : [],
    totalPages:
      typeof body.totalPages === 'number' && Number.isFinite(body.totalPages)
        ? body.totalPages
        : page,
  };
}

async function fetchCatalogGifts(connection) {
  const giftsApi = connection.apiClient?.gifts;
  if (!giftsApi || typeof giftsApi.listWebcastGifts !== 'function') {
    return [];
  }
  const pageSize = 100;
  const maxPages = 30;
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    let lastError = null;
    let pageResult = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        pageResult = await fetchCatalogPage(
          (size, pageNumber) => giftsApi.listWebcastGifts(size, pageNumber),
          pageSize,
          page,
        );
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (error && error.code === 'RATE_LIMIT') {
          console.log(`待機中 (page ${page}, try ${attempt}): ${error.message}`);
          await sleep(2500 * attempt);
          continue;
        }
        throw error;
      }
    }
    if (lastError) {
      if (all.length > 0) {
        console.log(`page ${page} で打ち切り（取得済み ${all.length} 件）: ${lastError.message}`);
        break;
      }
      throw lastError;
    }
    all.push(...pageResult.gifts);
    console.log(`page ${page}: +${pageResult.gifts.length} (累計 ${all.length})`);
    if (
      pageResult.gifts.length === 0 ||
      page >= pageResult.totalPages
    ) {
      break;
    }
    await sleep(1500);
  }
  return all;
}

async function iconsReachable(gifts) {
  const keep = [];
  let dropped = 0;
  for (const gift of gifts) {
    try {
      const response = await fetch(gift.imageUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
      });
      if (response.status === 200 || response.status === 206) {
        keep.push(gift);
      } else {
        dropped += 1;
      }
    } catch {
      dropped += 1;
    }
  }
  return { keep, dropped };
}

async function main() {
  const uniqueId = String(process.argv[2] || 'oshiso123')
    .replace(/^@/, '')
    .trim();
  if (!uniqueId) {
    throw new Error('TikTok ID が空です');
  }

  const key =
    process.env.EULER_API_KEY?.trim() || process.env.TIKTOK_SIGN_API_KEY?.trim() || '';
  if (!key) {
    throw new Error('EULER_API_KEY が空です。.env を確認してください');
  }

  const { TikTokLiveConnection } = require('tiktok-live-connector');
  const { catalogGiftsFromList, catalogGiftsWithIcons } = require('../dist/tiktok/gift-fields');
  const {
    dedupeAndSortCatalogGifts,
    finalizeCatalogGifts,
  } = require('../dist/shared/permanent-gifts');

  const connection = new TikTokLiveConnection(uniqueId, {
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false,
    signApiKey: key,
  });

  try {
    const rawGifts = await fetchCatalogGifts(connection);
    const parsed = catalogGiftsFromList({ gifts: rawGifts }, { limit: 0 });
    const finalized = finalizeCatalogGifts(parsed);
    const withIcons = catalogGiftsWithIcons(finalized);
    console.log(`アイコンURL確認中（${withIcons.length}件）...`);
    const { keep, dropped } = await iconsReachable(withIcons);
    if (keep.length === 0) {
      throw new Error('ギフトを取得できませんでした（到達できるアイコンが0件）');
    }
    const gifts = dedupeAndSortCatalogGifts(keep);

    const outPath = path.join(
      process.cwd(),
      'src',
      'shared',
      'permanent-gifts.seed.json',
    );
    const payload = {
      meta: {
        sourceUniqueId: uniqueId,
        fetchedAt: new Date().toISOString(),
        fetchedCount: finalized.length,
        withIconCount: gifts.length,
        iconCheckDropped: dropped,
        imageHost: 'p16-webcast.tiktokcdn.com',
      },
      gifts,
    };
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(
      `seed 更新: 取得 ${finalized.length} / アイコン到達 ${keep.length} → 重複除去 ${gifts.length}（除外 ${dropped}）`,
    );
  } finally {
    try {
      await connection.disconnect();
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
