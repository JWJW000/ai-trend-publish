import db from "@src/db/db.ts";
import { config } from "@src/db/schema.ts";
import { eq } from "npm:drizzle-orm/expressions";

export class ConfigService {
  static async get(key: string): Promise<string | null> {
    const rows = await db.select().from(config).where(eq(config.key, key)).limit(
      1,
    );
    if (!rows || rows.length === 0) return null;
    return rows[0].value ?? null;
  }

  static async set(key: string, value: string): Promise<void> {
    const rows = await db.select().from(config).where(eq(config.key, key))
      .limit(1);
    if (!rows || rows.length === 0) {
      await db.insert(config).values({ key, value });
    } else {
      await db.update(config).set({ value }).where(eq(config.key, key));
    }
  }
}

