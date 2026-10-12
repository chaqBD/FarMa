// Small, flat, hand-authored SVG icons (viewBox 0 0 48 48) for crops, soils
// and markets. Kept as inline markup rather than image files so they're
// crisp at any size, themeable via the palette below, and ship as plain
// code — no binary assets to manage.

const ICONS = {
  maize: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#fdf1d6"/>
      <path d="M24 8c-5 0-8 9-8 18s3 14 8 14 8-5 8-14-3-18-8-18z" fill="#f4c542"/>
      <g fill="#dba52a">
        <circle cx="20" cy="16" r="1.6"/><circle cx="24" cy="16" r="1.6"/><circle cx="28" cy="16" r="1.6"/>
        <circle cx="19" cy="21" r="1.6"/><circle cx="24" cy="21" r="1.6"/><circle cx="29" cy="21" r="1.6"/>
        <circle cx="19" cy="26" r="1.6"/><circle cx="24" cy="26" r="1.6"/><circle cx="29" cy="26" r="1.6"/>
        <circle cx="20" cy="31" r="1.6"/><circle cx="24" cy="31" r="1.6"/><circle cx="28" cy="31" r="1.6"/>
      </g>
      <path d="M16 14c-5-3-9-1-10 3 4 1 7 0 10-3z" fill="#4f8a3d"/>
      <path d="M32 14c5-3 9-1 10 3-4 1-7 0-10-3z" fill="#4f8a3d"/>
    </svg>`,

  cassava: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#f3e6d6"/>
      <path d="M17 14c3-4 10-5 14-1s4 12 0 18-13 7-18 3c6-1 9-5 10-10-5 2-9 0-11-4 3 1 6 0 8-2-4-1-6-2-3-4z" fill="#a9703f"/>
      <path d="M19 10c2-3 6-3 7 0-2 2-5 2-7 0z" fill="#4f8a3d"/>
    </svg>`,

  tomato: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#fde4df"/>
      <circle cx="24" cy="27" r="13" fill="#d9472b"/>
      <ellipse cx="19" cy="22" rx="4" ry="2.6" fill="#f0836b" opacity="0.7"/>
      <path d="M24 14l-3-4h6l-3 4z" fill="#4f8a3d"/>
      <path d="M16 15c2-2 5-3 8-2-1 2-4 3-8 2z" fill="#4f8a3d"/>
      <path d="M32 15c-2-2-5-3-8-2 1 2 4 3 8 2z" fill="#4f8a3d"/>
    </svg>`,

  pepper: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#fde9db"/>
      <path d="M22 10c1 3-1 5-3 7-5 5-6 12-1 17 4 4 11 3 14-2 4-6 1-15-6-19-2-1-4-2-4-3z" fill="#e3622c"/>
      <path d="M21 9c1-2 4-2 5 0-1 2-4 2-5 0z" fill="#4f8a3d"/>
      <ellipse cx="20" cy="18" rx="2.4" ry="4" fill="#f29a6b" opacity="0.6"/>
    </svg>`,

  yam: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#ece0cf"/>
      <ellipse cx="24" cy="25" rx="13" ry="16" fill="#8a6239"/>
      <path d="M15 18c4 2 14 2 18 0M14 25c5 2 15 2 20 0M15 32c4 2 14 2 18 0" stroke="#6f4e2c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M21 9c2-2 5-2 6 0-2 2-4 2-6 0z" fill="#4f8a3d"/>
    </svg>`,

  loamy: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#6b4423"/>
      <g fill="#8a6239"><circle cx="15" cy="18" r="2.5"/><circle cx="26" cy="14" r="2"/><circle cx="33" cy="22" r="2.5"/><circle cx="18" cy="29" r="2"/><circle cx="30" cy="33" r="2.5"/><circle cx="13" cy="34" r="1.8"/></g>
    </svg>`,

  sandy: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#e2c48f"/>
      <g fill="#c9a865"><circle cx="14" cy="16" r="1.4"/><circle cx="22" cy="13" r="1.4"/><circle cx="30" cy="17" r="1.4"/><circle cx="37" cy="12" r="1.4"/><circle cx="12" cy="25" r="1.4"/><circle cx="20" cy="23" r="1.4"/><circle cx="28" cy="26" r="1.4"/><circle cx="36" cy="22" r="1.4"/><circle cx="16" cy="34" r="1.4"/><circle cx="25" cy="33" r="1.4"/><circle cx="33" cy="35" r="1.4"/></g>
    </svg>`,

  clay: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#b5602f"/>
      <path d="M8 16l8 6-6 8M24 10l6 9-7 7M32 20l9 4-5 10M14 32l7 6" stroke="#8c441c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  fadama: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#4a7a6b"/>
      <path d="M6 16c4-3 8-3 12 0s8 3 12 0 8-3 12 0" stroke="#bfe3d6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M6 26c4-3 8-3 12 0s8 3 12 0 8-3 12 0" stroke="#bfe3d6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M6 36c4-3 8-3 12 0s8 3 12 0 8-3 12 0" stroke="#bfe3d6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </svg>`,

  farm_gate: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#e7efe2"/>
      <rect x="10" y="12" width="4" height="26" rx="1.5" fill="#6b4423"/>
      <rect x="34" y="12" width="4" height="26" rx="1.5" fill="#6b4423"/>
      <rect x="10" y="18" width="28" height="3.4" rx="1.5" fill="#8a6239"/>
      <rect x="10" y="27" width="28" height="3.4" rx="1.5" fill="#8a6239"/>
      <path d="M14 38h20" stroke="#4f8a3d" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  village_market: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#fdf1d6"/>
      <path d="M8 20L24 9l16 11z" fill="#d9472b"/>
      <rect x="12" y="20" width="24" height="3" fill="#b23b3b"/>
      <rect x="14" y="23" width="4" height="15" fill="#8a6239"/>
      <rect x="30" y="23" width="4" height="15" fill="#8a6239"/>
      <rect x="18" y="29" width="12" height="9" fill="#f4c542"/>
    </svg>`,

  mile12: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#e2e9f0"/>
      <rect x="8" y="22" width="8" height="16" fill="#6b7f8f"/>
      <rect x="18" y="14" width="9" height="24" fill="#4f6577"/>
      <rect x="29" y="19" width="8" height="19" fill="#6b7f8f"/>
      <rect x="20" y="18" width="2" height="2" fill="#fdf1d6"/>
      <rect x="24" y="18" width="2" height="2" fill="#fdf1d6"/>
      <rect x="20" y="23" width="2" height="2" fill="#fdf1d6"/>
      <rect x="24" y="23" width="2" height="2" fill="#fdf1d6"/>
    </svg>`,

  logo: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#2f5d3a"/>
      <path d="M24 34c-7 0-12-6-12-13 7 0 12 3 14 8 1-6 6-10 13-10 0 8-6 15-15 15z" fill="#f4c542"/>
      <path d="M24 34v-9" stroke="#1f3d27" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
};

export function iconHtml(name) {
  return ICONS[name] || ICONS.logo;
}
