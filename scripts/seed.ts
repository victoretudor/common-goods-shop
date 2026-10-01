import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { products } from "../src/db/schema";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

const seed = [
  {
    slug: "stoneware-mug",
    name: "Stoneware Mug",
    category: "Kitchen",
    description: "A hand-glazed 350ml stoneware mug with a speckled finish. Dishwasher and microwave safe.",
    priceCents: 1800,
    stock: 40,
  },
  {
    slug: "linen-tea-towel",
    name: "Linen Tea Towel",
    category: "Kitchen",
    description: "Stonewashed European linen that gets softer with every wash. 50 × 70 cm.",
    priceCents: 1400,
    stock: 60,
  },
  {
    slug: "oak-serving-board",
    name: "Oak Serving Board",
    category: "Kitchen",
    description: "Solid oak board finished with food-safe oil. Perfect for bread, cheese and everything between.",
    priceCents: 4500,
    stock: 15,
  },
  {
    slug: "wool-throw",
    name: "Merino Wool Throw",
    category: "Home",
    description: "A generous 130 × 180 cm throw woven from soft merino wool. Warm without the weight.",
    priceCents: 12000,
    stock: 8,
  },
  {
    slug: "soy-candle",
    name: "Cedar & Fig Candle",
    category: "Home",
    description: "Hand-poured soy wax candle with notes of cedarwood and ripe fig. ~45 hour burn time.",
    priceCents: 2600,
    stock: 50,
  },
  {
    slug: "canvas-tote",
    name: "Waxed Canvas Tote",
    category: "Accessories",
    description: "Water-resistant waxed canvas tote with leather handles and an inner pocket.",
    priceCents: 5800,
    stock: 20,
  },
  {
    slug: "leather-wallet",
    name: "Leather Card Wallet",
    category: "Accessories",
    description: "Slim vegetable-tanned leather wallet that holds up to six cards. Develops a rich patina over time.",
    priceCents: 3900,
    stock: 3,
  },
  {
    slug: "brass-pen",
    name: "Brass Pen",
    category: "Stationery",
    description: "A weighty machined brass pen that takes standard refills. Built to last a lifetime.",
    priceCents: 3200,
    stock: 25,
  },
].map((p) => ({ ...p, imageUrl: img(p.slug) }));

async function main() {
  await db
    .insert(products)
    .values(seed)
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        description: sql`excluded.description`,
        priceCents: sql`excluded.price_cents`,
        imageUrl: sql`excluded.image_url`,
        stock: sql`excluded.stock`,
      },
    });
  console.log(`Seeded ${seed.length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
