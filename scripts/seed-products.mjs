#!/usr/bin/env node
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CLOTHING_NAMES = [
  "Coton Organic Tee",
  "Relaxed Linen Shirt",
  "Classic Denim Jacket",
  "Pleated Midi Skirt",
  "Ribbed Knit Dress",
  "Oversized Hoodie",
  "Wool Blend Scarf",
  "Chino Straight Trousers",
  "Corduroy Shirt Jacket",
  "Poplin Button Blouse",
];

const GENERAL_NAMES = [
  "Ceramic Mug Set",
  "Canvas Tote Bag",
  "Scented Soy Candle",
  "Handwoven Basket",
  "Stainless Water Bottle",
  "Leather Journal",
  "Espresso Coffee Mug",
  "Olive Oil Bottle",
  "Copper Kitchen Timer",
  "Felt Storage Box",
];

const COLORS = [
  { name: "Noir", hex: "#1a1a1a" },
  { name: "Blanc", hex: "#f5f5f5" },
  { name: "Bordeaux", hex: "#6d1a2f" },
  { name: "Olive", hex: "#556b2f" },
  { name: "Beige", hex: "#d4c5a9" },
  { name: "Bleu Nuit", hex: "#1f3a5f" },
  { name: "Terracotta", hex: "#c1653b" },
  { name: "Gris Perle", hex: "#d0d4d9" },
];

const SIZES = ["S", "M", "L", "XL", "XXL"];

const TAG_SETS = [
  ["new", "bestseller"],
  ["summer", "sale"],
  ["collection", "limited"],
  ["handmade", "new"],
  ["sale", "limited"],
  ["bestseller", "handmade"],
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function loadDatabaseUrl() {
  const env =
    process.env.DATABASE_URL
      ? { DATABASE_URL: process.env.DATABASE_URL }
      : Object.assign(
          loadEnvFile(path.join(ROOT, ".env")),
          loadEnvFile(path.join(ROOT, ".env.local"))
        );
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL not found in .env/.env.local (or process env).");
    process.exit(1);
  }
  return env.DATABASE_URL;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randMoney(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randSuffix(length = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[randInt(0, chars.length - 1)];
  return out;
}

function kebab(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickTags(index) {
  const base = TAG_SETS[index % TAG_SETS.length].slice();
  if (Math.random() < 0.5) base.push("eco");
  if (Math.random() < 0.3) base.push("gift");
  return base.slice(0, 4);
}

function buildImageUrls(name) {
  const urls = [`https://placehold.co/600x600?text=${encodeURIComponent(name)}`];
  if (Math.random() < 0.5) {
    urls.push(`https://placehold.co/600x600?text=${encodeURIComponent(name + " 2")}`);
  }
  return urls;
}

function buildColorsAndSizes() {
  const colorCount = randInt(2, 4);
  const start = randInt(0, COLORS.length - colorCount);
  const colors = COLORS.slice(start, start + colorCount);
  const rows = [];
  let totalStock = 0;

  for (let i = 0; i < colors.length; i++) {
    const sizeCount = randInt(2, 4);
    const sizeStart = randInt(0, SIZES.length - sizeCount);
    const sizes = SIZES.slice(sizeStart, sizeStart + sizeCount);
    let colorStock = 0;
    const sizeRows = sizes.map((size, j) => {
      const stock = randInt(0, 30);
      colorStock += stock;
      return { size, stock, sortOrder: j };
    });
    totalStock += colorStock;
    rows.push({
      name: colors[i].name,
      hex: colors[i].hex,
      stock: colorStock,
      sortOrder: i,
      sizes: sizeRows,
    });
  }

  return { colors: rows, totalStock };
}

function buildVariants(slug, index) {
  const packSizes = [
    ["Pack 2", 0.9],
    ["Pack 4", 0.8],
    ["500 g", 0.55],
    ["1 kg", 0.95],
    ["Duo", 0.85],
    ["XL", 1.1],
  ];
  const variantCount = randInt(1, 2);
  const picks = [];
  for (let i = 0; i < variantCount; i++) {
    const pick = packSizes[randInt(0, packSizes.length - 1)];
    picks.push({
      name: pick[0],
      priceFactor: pick[1],
      stock: randInt(0, 60),
      sku: `${slug}-${randInt(100, 999)}`,
    });
  }
  return picks;
}

async function findStore(sql, slug) {
  const stores = await sql`
    SELECT id, name, slug
    FROM stores
    ORDER BY slug
  `;

  if (!slug) return stores[0] || null;

  const store = stores.find((s) => s.slug === slug) || null;
  if (!store) {
    const available = stores.map((s) => s.slug).join(", ") || "(no stores found)";
    console.error(`Store with slug "${slug}" not found.`);
    console.error(`Available store slugs: ${available}`);
    console.error(`Tip: run with --list to see all store slugs.`);
  }
  return store;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const count = Number.parseInt(args.count ?? "8", 10);
  if (!Number.isInteger(count) || count < 1) {
    console.error(`Invalid --count "${args.count}". Must be a positive integer.`);
    process.exitCode = 1;
    return;
  }

  const url = loadDatabaseUrl();
  const sql = postgres(url, { max: 2 });

  try {
    if (args.list) {
      const stores = await sql`
        SELECT slug, name, status
        FROM stores
        ORDER BY slug
      `;
      console.log("Stores in database:");
      for (const store of stores) {
        console.log(`  ${store.slug}  |  ${store.name} (status: ${store.status})`);
      }
      return;
    }

    const store = await findStore(sql, typeof args.slug === "string" ? args.slug : undefined);
    if (!store) {
      process.exitCode = 1;
      return;
    }

    const [existing] = await sql`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE store_id = ${store.id}
    `;

    if (existing.count >= count) {
      console.log(
        `Store already has ${existing.count} products (>= requested count ${count}); skipping. Use --count <bigger> to force-add more.`
      );
      return;
    }

    const clothingCount = Math.ceil(count / 2);
    const generalCount = count - clothingCount;
    const inserted = [];
    let failures = 0;

    for (let i = 0; i < count; i++) {
      const isClothing = i < clothingCount;
      const name = isClothing
        ? CLOTHING_NAMES[i % CLOTHING_NAMES.length]
        : GENERAL_NAMES[(i - clothingCount) % GENERAL_NAMES.length];
      const type = isClothing ? "CLOTHING" : "GENERAL";
      const baseSlug = `${kebab(name)}-${store.slug}-${i + 1}`;
      const price = randMoney(1200, 8500);
      const compareAtPrice = Math.random() < 0.4 ? null : (parseFloat(price) + parseFloat(randMoney(200, 3000))).toFixed(2);
      const tags = pickTags(i);

      try {
        await sql.begin(async (tx) => {
          let slug = `${baseSlug}-${randSuffix()}`;
          let guard = 0;
          while (guard++ < 5) {
            const [collision] = await tx`SELECT 1 AS found FROM products WHERE slug = ${slug}`;
            if (!collision) break;
            slug = `${baseSlug}-${randSuffix()}`;
          }

          const images = buildImageUrls(name);
          let stockQuantity = 0;
          let colors = [];

          if (isClothing) {
            const { colors: colorRows, totalStock } = buildColorsAndSizes();
            colors = colorRows;
            stockQuantity = totalStock;
          } else {
            stockQuantity = randInt(0, 120);
          }

          const [product] = await tx`
            INSERT INTO products (
              id, name, description, slug, type, price, compare_at_price,
              images, tags, stock_quantity, is_active, store_id
            )
            VALUES (
              ${crypto.randomUUID()}, ${name},
              ${`Premium ${type.toLowerCase()} item from ${store.name}. Quality materials, made to last.`},
              ${slug}, ${type}, ${price}, ${compareAtPrice},
              ${JSON.stringify(images)}, ${JSON.stringify(tags)},
              ${stockQuantity}, true, ${store.id}
            )
            RETURNING id
          `;

          let colorCount = 0;
          let sizeCount = 0;

          if (isClothing) {
            for (const color of colors) {
              const [colorRow] = await tx`
                INSERT INTO product_colors (id, product_id, name, hex_code, stock_quantity, sort_order)
                VALUES (${crypto.randomUUID()}, ${product.id}, ${color.name}, ${color.hex}, ${color.stock}, ${color.sortOrder})
                RETURNING id
              `;
              colorCount++;
              for (const size of color.sizes) {
                await tx`
                  INSERT INTO product_sizes (id, product_id, color_id, size_label, stock_quantity, sort_order)
                  VALUES (${crypto.randomUUID()}, ${product.id}, ${colorRow.id}, ${size.size}, ${size.stock}, ${size.sortOrder})
                `;
                sizeCount++;
              }
            }
          } else if (Math.random() < 0.75) {
            const variants = buildVariants(slug, i);
            for (const variant of variants) {
              await tx`
                INSERT INTO product_variants (id, product_id, name, price, stock_quantity, sku)
                VALUES (
                  ${crypto.randomUUID()}, ${product.id}, ${variant.name},
                  ${(parseFloat(price) * variant.priceFactor).toFixed(2)},
                  ${variant.stock}, ${variant.sku}
                )
              `;
            }
          }

          inserted.push({ name, slug, type, colors: colorCount, sizes: sizeCount });
        });
      } catch (err) {
        failures++;
        console.error(`[fail] Could not insert product "${name}" (${type}): ${err.message}`);
      }
    }

    const [total] = await sql`
      SELECT COUNT(*)::int AS count FROM products WHERE store_id = ${store.id}
    `;
    const [colorTotal] = await sql`
      SELECT COUNT(*)::int AS count
      FROM product_colors pc JOIN products p ON p.id = pc.product_id
      WHERE p.store_id = ${store.id}
    `;
    const [sizeTotal] = await sql`
      SELECT COUNT(*)::int AS count
      FROM product_sizes ps JOIN products p ON p.id = ps.product_id
      WHERE p.store_id = ${store.id}
    `;
    const [variantTotal] = await sql`
      SELECT COUNT(*)::int AS count
      FROM product_variants pv JOIN products p ON p.id = pv.product_id
      WHERE p.store_id = ${store.id}
    `;

    console.log(`\nSeeded ${inserted.length} products into store "${store.name}" (${store.slug}):`);
    console.log(`  - CLOTHING: ${clothingCount} requested | GENERAL: ${generalCount} requested`);
    for (const product of inserted) {
      console.log(
        `  ${product.type.padEnd(8)} ${product.name} -> /products/${product.slug} (${product.colors} colors, ${product.sizes} sizes)`
      );
    }
    if (failures > 0) {
      console.error(`\n${failures} product(s) failed and were rolled back individually.`);
    }

    console.log(`\nVerification (SELECT counts for store "${store.slug}"):`);
    console.log(`  products.total       = ${total.count}`);
    console.log(`  product_colors.total = ${colorTotal.count}`);
    console.log(`  product_sizes.total  = ${sizeTotal.count}`);
    console.log(`  product_variants.total = ${variantTotal.count}`);

    console.log(`\nStorefront URLs:`);
    console.log(`  Local:  http://localhost:3000/s/${store.slug}`);
    console.log(`  Live:   https://${store.slug}.commercecraft.app`);
  } catch (err) {
    console.error(`Database error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await sql.end().catch(() => {});
  }
}

main();
