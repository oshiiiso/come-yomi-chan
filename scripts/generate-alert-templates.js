const fs = require('fs');
const path = require('path');

const dir = path.join('ui', 'overlay', 'alert-templates');
fs.mkdirSync(dir, { recursive: true });

const specs = {
  gift: { fill: '#fbbf24', label: 'ギフト', spark: true },
  follow: { fill: '#60a5fa', label: 'フォロー', heart: true },
  share: { fill: '#a78bfa', label: 'シェア', arrows: true },
  superFan: { fill: '#f472b6', label: 'スパファン', star: true },
  envelope: { fill: '#34d399', label: '宝箱', box: true },
  portal: { fill: '#38bdf8', label: 'ポータル', portal: true },
  like: { fill: '#fb7185', label: 'いいね', heart: true },
  member: { fill: '#94a3b8', label: '入室', door: true },
};

function svg(id, s) {
  const extras = [];
  if (s.rings) {
    extras.push(`<circle cx="160" cy="160" r="70" fill="none" stroke="${s.fill}" stroke-width="6" opacity="0.35">
      <animate attributeName="r" values="55;95;55" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.55;0;0.55" dur="1.6s" repeatCount="indefinite"/>
    </circle>`);
  }
  if (s.spark) {
    extras.push(`<g>
      <circle cx="90" cy="90" r="8" fill="#fff7ed"><animate attributeName="opacity" values="0;1;0" dur="1.1s" repeatCount="indefinite"/></circle>
      <circle cx="230" cy="100" r="6" fill="#fff7ed"><animate attributeName="opacity" values="0;1;0" dur="1.3s" begin="0.2s" repeatCount="indefinite"/></circle>
      <circle cx="210" cy="230" r="7" fill="#fff7ed"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="0.4s" repeatCount="indefinite"/></circle>
    </g>`);
  }
  if (s.heart) {
    extras.push(`<path d="M160 210 C120 180 100 150 120 125 C135 108 160 118 160 140 C160 118 185 108 200 125 C220 150 200 180 160 210Z" fill="#fff" opacity="0.9">
      <animateTransform attributeName="transform" type="scale" values="0.92;1.08;0.92" dur="1.1s" additive="sum" repeatCount="indefinite"/>
    </path>`);
  }
  if (s.arrows) {
    extras.push(`<g stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none">
      <path d="M110 160 H200">
        <animateTransform attributeName="transform" type="translate" values="-8 0;8 0;-8 0" dur="1.2s" repeatCount="indefinite"/>
      </path>
      <path d="M185 135 L210 160 L185 185"/>
    </g>`);
  }
  if (s.star) {
    extras.push(`<polygon points="160,95 175,140 222,140 184,168 198,214 160,186 122,214 136,168 98,140 145,140" fill="#fff" opacity="0.95">
      <animateTransform attributeName="transform" type="rotate" values="-8 160 160;8 160 160;-8 160 160" dur="1.4s" repeatCount="indefinite"/>
    </polygon>`);
  }
  if (s.box) {
    extras.push(`<g>
      <rect x="110" y="140" width="100" height="70" rx="8" fill="#fff" opacity="0.92"/>
      <rect x="105" y="120" width="110" height="28" rx="6" fill="#fff" opacity="0.75">
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="1.3s" repeatCount="indefinite"/>
      </rect>
    </g>`);
  }
  if (s.portal) {
    extras.push(`<ellipse cx="160" cy="160" rx="55" ry="80" fill="none" stroke="#fff" stroke-width="10" opacity="0.9">
      <animate attributeName="rx" values="40;65;40" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.55;1;0.55" dur="1.5s" repeatCount="indefinite"/>
    </ellipse>`);
  }
  if (s.door) {
    extras.push(`<g fill="#fff" opacity="0.92">
      <rect x="125" y="110" width="70" height="100" rx="6"/>
      <circle cx="180" cy="160" r="5" fill="${s.fill}"/>
      <animateTransform attributeName="transform" type="translate" values="0 6;0 -4;0 6" dur="1.4s" repeatCount="indefinite"/>
    </g>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <radialGradient id="bg-${id}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${s.fill}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${s.fill}" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="320" height="320" rx="48" fill="#0f172a" opacity="0.15"/>
  <circle cx="160" cy="160" r="110" fill="url(#bg-${id})">
    <animate attributeName="r" values="104;114;104" dur="1.8s" repeatCount="indefinite"/>
  </circle>
  ${extras.join('\n  ')}
  <text x="160" y="292" text-anchor="middle" font-family="Segoe UI, Hiragino Sans, sans-serif" font-size="22" font-weight="700" fill="#f8fafc">${s.label}</text>
</svg>
`;
}

for (const [id, spec] of Object.entries(specs)) {
  fs.writeFileSync(path.join(dir, `${id}.svg`), svg(id, spec), 'utf8');
  console.log('wrote', id);
}
