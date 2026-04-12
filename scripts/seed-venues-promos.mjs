import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Venues from the JotForm + additional popular Seattle venues
const venues = [
  { name: "A&K Alder Farm", city: "Renton", state: "WA" },
  { name: "EUROPA EVENTS @ Court In The Square", address: "320 2nd Ave S", city: "Seattle", state: "WA", zip: "98104" },
  { name: "Court in the Square", address: "320 2nd Ave S", city: "Seattle", state: "WA", zip: "98104" },
  { name: "DairyLand", city: "Snohomish", state: "WA" },
  { name: "Evergreen Gardens", address: "21727 Snag Island Dr E", city: "Lake Tapps", state: "WA", zip: "98391" },
  { name: "Fall City Farms", city: "Fall City", state: "WA" },
  { name: "Falling Water Gardens", address: "3811 152nd St E", city: "Tacoma", state: "WA", zip: "98446" },
  { name: "Carnation Farms", address: "28901 NE Carnation Farm Rd", city: "Carnation", state: "WA", zip: "98014" },
  { name: "Jardin Del Sol", address: "34912 SE Fall City Snoqualmie Rd", city: "Fall City", state: "WA", zip: "98024" },
  { name: "Lake Wilderness Lodge", address: "22500 SE 248th St", city: "Maple Valley", state: "WA", zip: "98038" },
  { name: "Maroni Meadows", address: "9217 164th Ave SE", city: "Snohomish", state: "WA", zip: "98290" },
  { name: "Mount Peak Farm", city: "Enumclaw", state: "WA" },
  { name: "Orting Manor", city: "Orting", state: "WA" },
  { name: "Pemberton Farm", city: "Snohomish", state: "WA" },
  { name: "Pretty Bird Weddings and Events", city: "Snohomish", state: "WA" },
  { name: "Sadie Lake Events", city: "Bonney Lake", state: "WA" },
  { name: "Thornewood Castle Inn & Gardens", address: "8601 N Thorne Ln SW", city: "Lakewood", state: "WA", zip: "98498" },
  { name: "The 101", city: "Seattle", state: "WA" },
  { name: "The Bannan House Farm", city: "Snohomish", state: "WA" },
  { name: "The Carey Gardens Wedding Venue", city: "Kent", state: "WA" },
  { name: "Terra Valley Farms", city: "Graham", state: "WA" },
  { name: "Trillium Nursery Farm", city: "Langley", state: "WA" },
  { name: "Trinity Tree Farm", address: "14505 Issaquah Hobart Rd SE", city: "Issaquah", state: "WA", zip: "98027" },
  { name: "Wisteria Hall", city: "Seattle", state: "WA" },
  { name: "Woodinville Lavender", address: "14725 148th Ave NE", city: "Woodinville", state: "WA", zip: "98072" },
];

// Promo codes from the JotForm
const promoCodes = [
  { code: "KNOT0525", discount_percent: 5, description: "The Knot partnership discount" },
  { code: "SUNHB15", discount_percent: 15, description: "Sunday event discount" },
  { code: "FRIHB10", discount_percent: 10, description: "Friday event discount" },
];

try {
  // Insert venues (skip if already exist by name)
  let venueCount = 0;
  for (const v of venues) {
    const { rows } = await client.query('SELECT id FROM venues WHERE name = $1', [v.name]);
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO venues (name, address, city, state, zip, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [v.name, v.address || null, v.city || null, v.state || null, v.zip || null]
      );
      venueCount++;
    }
  }
  console.log(`✓ Inserted ${venueCount} venues (${venues.length - venueCount} already existed)`);

  // Insert promo codes (skip if already exist by code)
  let promoCount = 0;
  for (const p of promoCodes) {
    const { rows } = await client.query('SELECT id FROM promo_codes WHERE code = $1', [p.code]);
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO promo_codes (code, discount_percent, description, is_active) VALUES ($1, $2, $3, TRUE)`,
        [p.code, p.discount_percent, p.description]
      );
      promoCount++;
    }
  }
  console.log(`✓ Inserted ${promoCount} promo codes (${promoCodes.length - promoCount} already existed)`);

} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
