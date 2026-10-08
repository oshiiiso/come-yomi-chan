/**
 * 同梱アラートテンプレは手置きの GIF（ui/overlay/alert-templates/）。
 * 種類 → ファイル名の正は src/shared/event-alert.ts の
 * EVENT_ALERT_TEMPLATE_FILES と resolveEventAlertTemplateFileName。
 * このスクリプトは不足ファイルの確認だけ行う。
 */
const fs = require('fs');
const path = require('path');

const dir = path.join('ui', 'overlay', 'alert-templates');
const required = [
  'gift.gif',
  'follow.gif',
  'share.gif',
  'superfan.gif',
  'superfan_box.gif',
  'chest.gif',
  'portal.gif',
  'portal_door.gif',
  'heart.gif',
  'door.gif',
];

let missing = 0;
for (const name of required) {
  const full = path.join(dir, name);
  if (!fs.existsSync(full)) {
    console.error('missing', full);
    missing += 1;
  } else {
    console.log('ok', name);
  }
}
if (missing) {
  process.exit(1);
}
