import type { StoreTheme } from "@/lib/store-theme";

export interface StorefrontProduct {
  id: string;
  name: string;
  price: string;
  image?: string | null;
  landingPageUrl?: string | null;
}

export interface StorefrontStoreInfo {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}

const FONT_STACKS: Record<StoreTheme["font"], string> = {
  Inter: "'Inter', system-ui, sans-serif",
  Geist: "'Geist', system-ui, sans-serif",
  "Bricolage Grotesque": "'Bricolage Grotesque', system-ui, sans-serif",
  "Schibsted Grotesk": "'Schibsted Grotesk', system-ui, sans-serif",
  "system-ui": "system-ui, sans-serif",
};

const DISPLAY_FONT = "'Bricolage Grotesque', system-ui, sans-serif";

const CATEGORIES = ["New Arrivals", "Best Sellers", "Limited Edition", "Sale"];

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "Products", href: "#products" },
  { label: "Contact", href: "#contact" },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toHex(color: string): string {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return "#b4401f";
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = toHex(hex).slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel + channel * amount)));
  return `#${[adjust(r), adjust(g), adjust(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

function buildNavbar(store: StorefrontStoreInfo, theme: StoreTheme, primary: string): string {
  const isLight = theme.navbarStyle === "light";
  const isDark = theme.navbarStyle === "dark";

  const background = isLight
    ? "background: var(--paper); border-bottom: 1px solid var(--line); box-shadow: 0 2px 16px rgba(43, 33, 24, 0.04);"
    : isDark
      ? "background: #211C18; border-bottom: 1px solid rgba(233, 226, 216, 0.1); box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);"
      : `background: linear-gradient(90deg, ${primary}, ${shade(primary, -0.25)}); border-bottom: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 2px 16px ${rgba(primary, 0.22)};`;

  const textColor = isLight ? "var(--ink)" : isDark ? "#F3EDE4" : "#FFFFFF";

  const logo = store.logoUrl
    ? `<img src="${escapeHtml(store.logoUrl)}" alt="${escapeHtml(store.name)}" class="h-9 rounded-lg object-contain" style="border: 1px solid var(--line); background: #fff" onerror="this.style.display='none'" />`
    : `<span class="font-display flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white" style="background: var(--primary)">${escapeHtml(
        (store.name.charAt(0) || "S").toUpperCase()
      )}</span>`;

  const links = NAV_LINKS.map(
    (link) =>
      `<a href="${link.href}" class="nav-link">${escapeHtml(link.label)}</a>`
  ).join("\n          ");

  return `    <header class="site-nav" style="${background}; color: ${textColor};">
      <div class="wrap nav-inner">
        <a href="#hero" class="brand">
          ${logo}
          <span class="brand-name">${escapeHtml(store.name)}</span>
        </a>
        <nav class="nav-links">
          ${links}
        </nav>
        <a href="#products" class="nav-shop">Shop</a>
      </div>
    </header>`;
}

function buildHero(
  store: StorefrontStoreInfo,
  theme: StoreTheme,
  primary: string,
  headline: string
): string {
  const hasMedia = Boolean(theme.hero.imageUrl);
  const media = hasMedia
    ? `<div class="hero-media">
        <img src="${escapeHtml(theme.hero.imageUrl)}" alt="${escapeHtml(
            headline
          )}" onerror="this.style.display='none'" />
      </div>`
    : "";

  const innerClass = hasMedia ? "hero-inner hero-inner--media" : "hero-inner hero-inner--centered";

  return `    <section id="hero" class="hero rise">
      <div class="wrap ${innerClass}">
        <div class="hero-copy">
          <p class="overline">Handcrafted &middot; Small batch</p>
          <h1 class="hero-title font-display">${escapeHtml(headline)}</h1>
          ${
            theme.hero.subtitle
              ? `<p class="hero-sub">${escapeHtml(theme.hero.subtitle)}</p>`
              : ""
          }
          <a href="#products" class="btn-pill">Browse products</a>
        </div>
        ${media}
      </div>
    </section>`;
}

function buildCategories(): string {
  const pills = CATEGORIES.map(
    (category, index) =>
      `<a href="#products" class="cat-pill${index === 0 ? " cat-pill-active" : ""}">${escapeHtml(
        category
      )}</a>`
  ).join("\n          ");

  return `    <section class="cat-section">
      <div class="wrap cat-row">
        ${pills}
      </div>
    </section>`;
}

function buildProductCard(product: StorefrontProduct, index: number): string {
  const media = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(
        product.name
      )}" onerror="this.style.display='none'" />`
    : `<div class="card-ph"><span>${escapeHtml(
        (product.name.charAt(0) || "P").toUpperCase()
      )}</span></div>`;

  const cta = product.landingPageUrl
    ? `<a href="${escapeHtml(product.landingPageUrl)}" class="card-cta">Order now</a>`
    : `<span class="card-cta card-cta-muted">Coming soon</span>`;

  return `          <article class="card rise" style="animation-delay: ${index * 60}ms">
            ${media}
            <div class="card-body">
              <h3 class="card-name clamp-1">${escapeHtml(product.name)}</h3>
              <p class="card-price">${escapeHtml(product.price)}</p>
              <div class="card-cta-wrap">${cta}</div>
            </div>
          </article>`;
}

function buildProductRow(product: StorefrontProduct, index: number): string {
  const media = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(
        product.name
      )}" onerror="this.style.display='none'" />`
    : `<div class="list-ph"><span>${escapeHtml(
        (product.name.charAt(0) || "P").toUpperCase()
      )}</span></div>`;

  const cta = product.landingPageUrl
    ? `<a href="${escapeHtml(product.landingPageUrl)}" class="card-cta">Order now</a>`
    : `<span class="card-cta card-cta-muted">Coming soon</span>`;

  return `          <article class="card-list rise" style="animation-delay: ${index * 60}ms">
            <div class="list-media">${media}</div>
            <div class="list-body">
              <h3 class="card-name">${escapeHtml(product.name)}</h3>
              <p class="card-price">${escapeHtml(product.price)}</p>
              <div class="card-cta-wrap">${cta}</div>
            </div>
          </article>`;
}

function buildProductSection(theme: StoreTheme, products: StorefrontProduct[]): string {
  const body =
    products.length > 0
      ? theme.layout === "list"
        ? products.map((product, index) => buildProductRow(product, index)).join("\n")
        : products.map((product, index) => buildProductCard(product, index)).join("\n")
      : `        <div class="empty-state rise">
            <p class="empty-title">No products yet</p>
            <p class="empty-sub">Check back soon &mdash; we are restocking.</p>
          </div>`;

  const gridClass =
    theme.layout === "list" ? "product-list" : `product-grid product-grid-${theme.gridColumns}`;

  return `    <section id="products" class="products">
      <div class="wrap">
        <header class="section-head rise">
          <p class="overline">The collection</p>
          <h2 class="section-title font-display">Our Products</h2>
        </header>
        ${
          products.length > 0
            ? `<div class="${gridClass}">
${body}
        </div>`
            : body
        }
      </div>
    </section>`;
}

function buildFooter(store: StorefrontStoreInfo): string {
  return `    <footer id="contact" class="footer">
      <div class="wrap footer-inner">
        <p class="footer-name font-display">${escapeHtml(store.name)}</p>
        <p class="footer-slug">/${escapeHtml(store.slug)}</p>
        <p class="footer-credit">Powered by <span>CommerceCraft</span></p>
      </div>
    </footer>`;
}

export function renderStorefrontHtml(params: {
  store: StorefrontStoreInfo;
  theme: StoreTheme;
  products: StorefrontProduct[];
}): string {
  const { store, theme, products } = params;
  const primary = toHex(theme.primaryColor);
  const fontStack = FONT_STACKS[theme.font] ?? FONT_STACKS.Inter;
  const heroHeadline = theme.hero.headline.trim() ? theme.hero.headline : store.name;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root {
        --primary: ${primary};
        --primary-dark: ${shade(primary, -0.22)};
        --primary-soft: ${rgba(primary, 0.12)};
        --ink: #2B2118;
        --muted: rgba(43, 33, 24, 0.62);
        --line: rgba(43, 33, 24, 0.12);
        --paper: #FAF6F0;
      }
      * { box-sizing: border-box; }
      html { -webkit-text-size-adjust: 100%; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: ${fontStack};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        line-height: 1.5;
      }
      img { display: block; }
      a { text-decoration: none; }
      .font-display { font-family: ${DISPLAY_FONT}; }
      .wrap { max-width: 76rem; margin-inline: auto; padding-inline: 1.5rem; }
      .clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .overline {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--primary-dark);
      }
      .overline::before {
        content: "";
        display: inline-block;
        width: 1.75rem;
        height: 1px;
        background: var(--primary);
        margin-right: 0.6rem;
        vertical-align: middle;
      }

      .site-nav { position: sticky; top: 0; z-index: 40; }
      .nav-inner { display: flex; height: 4.25rem; align-items: center; justify-content: space-between; }
      .brand { display: flex; align-items: center; gap: 0.65rem; color: inherit; }
      .brand-name {
        font-family: ${DISPLAY_FONT};
        font-weight: 700;
        letter-spacing: -0.01em;
        font-size: 1.15rem;
        line-height: 1;
      }
      .nav-links { display: flex; align-items: center; gap: 1.75rem; }
      .nav-link {
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: inherit;
        opacity: 0.75;
        transition: opacity 0.2s ease;
      }
      .nav-link:hover { opacity: 1; }
      .nav-shop {
        display: none;
        align-items: center;
        justify-content: center;
        background: var(--primary);
        color: #fff;
        border-radius: 999px;
        padding: 0.5rem 1.15rem;
        font-size: 0.85rem;
        font-weight: 600;
      }
      @media (max-width: 640px) {
        .nav-links { display: none; }
        .nav-shop { display: inline-flex; }
      }

      .hero {
        padding: 5.5rem 0 4.5rem;
        background: radial-gradient(58rem 26rem at 8% -12%, var(--primary-soft), transparent 62%), var(--paper);
      }
      .hero-inner { display: grid; gap: 3rem; align-items: center; }
      .hero-inner--media { grid-template-columns: 1.05fr 0.95fr; }
      .hero-inner--centered { max-width: 52rem; margin-inline: auto; text-align: center; }
      .hero-inner--centered .hero-sub { margin-inline: auto; }
      .hero-title {
        margin: 1.1rem 0 0;
        font-size: clamp(2.25rem, 5vw, 4rem);
        font-weight: 650;
        letter-spacing: -0.03em;
        line-height: 1.04;
        color: var(--ink);
      }
      .hero-sub {
        margin: 1.25rem 0 0;
        max-width: 62ch;
        color: var(--muted);
        font-size: 1.25rem;
        line-height: 1.6;
      }
      .btn-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 2rem;
        background: var(--primary);
        color: #fff;
        border-radius: 999px;
        padding: 0.9rem 2rem;
        font-weight: 600;
        font-size: 1rem;
        transition: background 0.25s ease, transform 0.25s ease;
      }
      .btn-pill:hover { background: var(--primary-dark); transform: translateY(-1px); }
      .hero-media img {
        width: 100%;
        max-height: 420px;
        object-fit: cover;
        border-radius: 1rem;
        border: 1px solid var(--line);
        box-shadow: 12px 12px 0 var(--primary-soft), 0 22px 44px -30px rgba(43, 33, 24, 0.45);
      }
      @media (max-width: 860px) {
        .hero-inner--media { grid-template-columns: 1fr; }
        .hero-media { order: -1; }
      }

      .cat-section { padding: 0.25rem 0 2.75rem; }
      .cat-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; }
      .cat-pill {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 0.5rem 1.1rem;
        font-size: 0.875rem;
        color: var(--muted);
        transition: color 0.2s ease, border-color 0.2s ease;
      }
      .cat-pill:hover { color: var(--ink); border-color: var(--primary-dark); }
      .cat-pill-active { background: var(--primary); color: #fff; border-color: transparent; }

      .products { padding: 3.5rem 0 5.5rem; }
      .section-head { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 2.75rem; }
      .section-title { margin: 0; font-size: 2rem; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); }

      .product-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
      @media (min-width: 900px) {
        .product-grid { grid-template-columns: repeat(${theme.gridColumns}, minmax(0, 1fr)); }
      }
      .product-list { display: flex; flex-direction: column; gap: 1.1rem; }

      .card {
        display: flex;
        flex-direction: column;
        background: #FFFDF9;
        border: 1px solid var(--line);
        border-radius: 1rem;
        overflow: hidden;
        transition: border-color 0.25s ease, transform 0.25s ease;
      }
      .card:hover { border-color: var(--primary); transform: translateY(-2px); }
      .card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
      .card-ph {
        width: 100%;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-soft);
        color: var(--primary);
        font-family: ${DISPLAY_FONT};
        font-weight: 700;
        font-size: 3rem;
      }
      .card-body { display: flex; flex: 1; flex-direction: column; gap: 0.4rem; padding: 1rem 1.1rem 1.15rem; }
      .card-name { margin: 0; font-size: 0.95rem; font-weight: 500; color: var(--ink); line-height: 1.35; }
      .card-price { margin: 0; font-weight: 600; font-size: 1.02rem; color: var(--primary-dark); }
      .card-cta-wrap { margin-top: auto; padding-top: 0.75rem; }
      .card-cta {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        background: var(--primary);
        color: #fff;
        border-radius: 999px;
        padding: 0.6rem 1rem;
        font-weight: 600;
        font-size: 0.95rem;
        transition: background 0.2s ease;
      }
      .card-cta:hover { background: var(--primary-dark); }
      .card-cta-muted { background: var(--primary-soft); color: var(--primary-dark); }

      .card-list {
        display: flex;
        align-items: center;
        gap: 1.75rem;
        background: #FFFDF9;
        border: 1px solid var(--line);
        border-radius: 1rem;
        padding: 1.1rem;
        transition: border-color 0.25s ease, transform 0.25s ease;
      }
      .card-list:hover { border-color: var(--primary); transform: translateY(-2px); }
      .list-media {
        width: 160px;
        height: 160px;
        border-radius: 0.8rem;
        overflow: hidden;
        flex-shrink: 0;
        background: var(--primary-soft);
      }
      .list-media img { width: 100%; height: 100%; object-fit: cover; }
      .list-ph {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ${DISPLAY_FONT};
        font-weight: 700;
        font-size: 3rem;
        color: var(--primary);
      }
      .list-body { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; }
      .card-list .card-cta-wrap { margin-top: 0.6rem; padding-top: 0; }
      .card-list .card-cta { width: auto; padding: 0.55rem 1.5rem; }
      @media (max-width: 640px) {
        .card-list { gap: 1rem; padding: 0.9rem; }
        .list-media { width: 120px; height: 120px; }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 4.5rem 1.5rem;
        border: 1.5px dashed var(--line);
        border-radius: 1.25rem;
        background: rgba(255, 253, 249, 0.55);
        text-align: center;
      }
      .empty-title { margin: 0; font-family: ${DISPLAY_FONT}; font-size: 1.35rem; font-weight: 600; color: var(--ink); }
      .empty-sub { margin: 0; color: var(--muted); font-size: 0.95rem; }

      .footer { background: #211C18; color: #E9E2D8; padding: 3rem 0; }
      .footer-inner { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; }
      .footer-name { margin: 0; font-size: 1.4rem; font-weight: 600; letter-spacing: -0.01em; color: #F3EDE4; }
      .footer-slug { margin: 0; font-size: 0.85rem; letter-spacing: 0.06em; color: rgba(233, 226, 216, 0.55); }
      .footer-credit { margin: 1.4rem 0 0; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(233, 226, 216, 0.5); }
      .footer-credit span { color: rgba(233, 226, 216, 0.85); font-weight: 600; }

      @keyframes rise {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: none; }
      }
      .rise { animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
      @media (prefers-reduced-motion: reduce) {
        .rise { animation: none; }
      }
    </style>
  </head>
  <body>
${buildNavbar(store, theme, primary)}
${buildHero(store, theme, primary, heroHeadline)}
${theme.showCategories ? buildCategories() : ""}
${buildProductSection(theme, products)}
${buildFooter(store)}
  </body>
</html>`;
}
