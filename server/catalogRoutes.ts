// Catalog API — serves appetizer/dessert/equipment items for the public
// inquiry form, and admin CRUD for editing those items + the pricing_config
// single-row table. Public routes are unauthenticated; admin routes require
// an authenticated session (admin role).
import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  appetizerCategories,
  appetizerItems,
  dessertItems,
  equipmentCategories,
  equipmentItemsTable,
  pricingConfig,
  insertAppetizerCategorySchema,
  insertAppetizerItemSchema,
  insertDessertItemSchema,
  insertEquipmentCategorySchema,
  insertEquipmentItemSchema,
  insertPricingConfigSchema,
} from "@shared/schema";
import { asc, eq } from "drizzle-orm";
import { hasWriteAccess } from "./middleware/permissions";

const catalogRouter = Router();

// Local auth guard — mirrors the pattern used in other route files.
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) return next();
  return res.status(401).json({ message: "Not authenticated" });
}

// ---------------------------------------------------------------------------
// PUBLIC — /api/catalog/appetizers, /desserts, /equipment
// Shape matches what client/src/pages/Inquire.tsx consumes (dollars, not cents).
// ---------------------------------------------------------------------------

catalogRouter.get("/appetizers", async (_req, res) => {
  try {
    const cats = await db
      .select()
      .from(appetizerCategories)
      .where(eq(appetizerCategories.isActive, true))
      .orderBy(asc(appetizerCategories.displayOrder));
    const items = await db
      .select()
      .from(appetizerItems)
      .where(eq(appetizerItems.isActive, true))
      .orderBy(asc(appetizerItems.displayOrder));

    const byCat = new Map<number, typeof items>();
    for (const it of items) {
      const list = byCat.get(it.categoryId) || [];
      list.push(it);
      byCat.set(it.categoryId, list);
    }

    const result = cats.map((c) => ({
      label: c.label,
      perPerson: c.perPerson || undefined,
      servingPack: c.servingPack
        ? {
            pricePerServing: c.servingPack.pricePerServingCents / 100,
            flavorsToPick: c.servingPack.flavorsToPick,
            description: c.servingPack.description,
          }
        : undefined,
      items: (byCat.get(c.id) || []).map((it) => ({
        name: it.name,
        price: it.priceCents / 100,
        unit: it.unit === "per_person" ? "per person" : it.unit === "per_piece" ? "per piece" : it.unit,
      })),
    }));
    res.json(result);
  } catch (err) {
    console.error("GET /api/catalog/appetizers failed:", err);
    res.status(500).json({ message: "Failed to fetch appetizers" });
  }
});

catalogRouter.get("/desserts", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(dessertItems)
      .where(eq(dessertItems.isActive, true))
      .orderBy(asc(dessertItems.displayOrder));
    res.json(
      items.map((it) => ({
        name: it.name,
        price: it.priceCents / 100,
        unit: it.unit === "per_piece" ? "per piece" : it.unit,
      }))
    );
  } catch (err) {
    console.error("GET /api/catalog/desserts failed:", err);
    res.status(500).json({ message: "Failed to fetch desserts" });
  }
});

catalogRouter.get("/equipment", async (_req, res) => {
  try {
    const cats = await db
      .select()
      .from(equipmentCategories)
      .where(eq(equipmentCategories.isActive, true))
      .orderBy(asc(equipmentCategories.displayOrder));
    const items = await db
      .select()
      .from(equipmentItemsTable)
      .where(eq(equipmentItemsTable.isActive, true))
      .orderBy(asc(equipmentItemsTable.displayOrder));

    const byCat = new Map<number, typeof items>();
    for (const it of items) {
      const list = byCat.get(it.categoryId) || [];
      list.push(it);
      byCat.set(it.categoryId, list);
    }

    const result = cats.map((c) => ({
      label: c.label,
      items: (byCat.get(c.id) || []).map((it) => ({
        name: it.name,
        price: it.priceCents / 100,
        unit: it.unit === "per_person" ? "per person" : it.unit,
      })),
    }));
    res.json(result);
  } catch (err) {
    console.error("GET /api/catalog/equipment failed:", err);
    res.status(500).json({ message: "Failed to fetch equipment" });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — pricing config (single row)
// ---------------------------------------------------------------------------

catalogRouter.get("/pricing-config", isAuthenticated, async (_req, res) => {
  try {
    const [row] = await db.select().from(pricingConfig).limit(1);
    if (!row) {
      return res.status(404).json({ message: "Pricing config not seeded" });
    }
    res.json(row);
  } catch (err) {
    console.error("GET /api/catalog/pricing-config failed:", err);
    res.status(500).json({ message: "Failed to fetch pricing config" });
  }
});

catalogRouter.patch("/pricing-config", isAuthenticated, hasWriteAccess, async (req, res) => {
  try {
    const parsed = insertPricingConfigSchema.partial().parse(req.body);
    const [existing] = await db.select().from(pricingConfig).limit(1);
    if (!existing) {
      const [created] = await db.insert(pricingConfig).values(parsed as any).returning();
      return res.json(created);
    }
    const [updated] = await db
      .update(pricingConfig)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(pricingConfig.id, existing.id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/catalog/pricing-config failed:", err);
    res.status(400).json({ message: err.message || "Invalid pricing config" });
  }
});

// ---------------------------------------------------------------------------
// ADMIN — generic CRUD for the catalog tables
// ---------------------------------------------------------------------------

type AdminCrudConfig<TableT> = {
  path: string;
  table: TableT;
  insertSchema: any;
  defaultOrder?: any;
};

// Tiny factory so we don't copy/paste 5 CRUD blocks.
function registerCrud<T>(
  cfg: AdminCrudConfig<T>,
) {
  const { path, table, insertSchema, defaultOrder } = cfg;
  const t = table as any;

  catalogRouter.get(`/admin/${path}`, isAuthenticated, async (_req, res) => {
    try {
      const q: any = db.select().from(t);
      const rows: any[] = defaultOrder ? await q.orderBy(defaultOrder) : await q;
      res.json(rows);
    } catch (err) {
      console.error(`GET /api/catalog/admin/${path} failed:`, err);
      res.status(500).json({ message: "Failed to list" });
    }
  });

  catalogRouter.post(`/admin/${path}`, isAuthenticated, hasWriteAccess, async (req, res) => {
    try {
      const parsed = insertSchema.parse(req.body);
      const rows = (await db.insert(t).values(parsed).returning()) as any[];
      res.status(201).json(rows[0]);
    } catch (err: any) {
      console.error(`POST /api/catalog/admin/${path} failed:`, err);
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  catalogRouter.patch(`/admin/${path}/:id`, isAuthenticated, hasWriteAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertSchema.partial().parse(req.body);
      const rows = (await db
        .update(t)
        .set({ ...parsed, updatedAt: new Date() })
        .where(eq(t.id, id))
        .returning()) as any[];
      if (!rows[0]) return res.status(404).json({ message: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      console.error(`PATCH /api/catalog/admin/${path} failed:`, err);
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  catalogRouter.delete(`/admin/${path}/:id`, isAuthenticated, hasWriteAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(t).where(eq(t.id, id));
      res.status(204).send();
    } catch (err: any) {
      console.error(`DELETE /api/catalog/admin/${path} failed:`, err);
      res.status(500).json({ message: "Failed to delete" });
    }
  });
}

registerCrud({
  path: "appetizer-categories",
  table: appetizerCategories,
  insertSchema: insertAppetizerCategorySchema,
  defaultOrder: asc(appetizerCategories.displayOrder),
});
registerCrud({
  path: "appetizer-items",
  table: appetizerItems,
  insertSchema: insertAppetizerItemSchema,
  defaultOrder: asc(appetizerItems.displayOrder),
});
registerCrud({
  path: "dessert-items",
  table: dessertItems,
  insertSchema: insertDessertItemSchema,
  defaultOrder: asc(dessertItems.displayOrder),
});
registerCrud({
  path: "equipment-categories",
  table: equipmentCategories,
  insertSchema: insertEquipmentCategorySchema,
  defaultOrder: asc(equipmentCategories.displayOrder),
});
registerCrud({
  path: "equipment-items",
  table: equipmentItemsTable,
  insertSchema: insertEquipmentItemSchema,
  defaultOrder: asc(equipmentItemsTable.displayOrder),
});

export default catalogRouter;
