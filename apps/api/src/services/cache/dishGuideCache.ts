import type { Pool, PoolClient, QueryResultRow } from "pg";

import { pool } from "../../db/pool.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface DishGuideCacheRecord {
  normalizedDishName: string;
  englishName: string;
  guidePayload: JsonObject;
  mediaUrls: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDishGuideCacheInput {
  dishName: string;
  englishName: string;
  guidePayload: JsonObject;
  mediaUrls?: JsonObject;
}

interface DishGuideCacheRow extends QueryResultRow {
  normalized_dish_name: string;
  english_name: string;
  guide_payload: JsonObject;
  media_urls: JsonObject;
  created_at: Date;
  updated_at: Date;
}

type Queryable = Pick<Pool | PoolClient, "query">;

export function normalizeDishName(dishName: string) {
  return dishName.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export class DishGuideCacheRepository {
  constructor(private readonly db: Queryable = pool) {}

  async findByDishName(dishName: string) {
    return this.findByNormalizedName(normalizeDishName(dishName));
  }

  async findByNormalizedName(normalizedDishName: string) {
    const result = await this.db.query<DishGuideCacheRow>(
      `
        SELECT
          normalized_dish_name,
          english_name,
          guide_payload,
          media_urls,
          created_at,
          updated_at
        FROM dish_guides
        WHERE normalized_dish_name = $1
      `,
      [normalizedDishName],
    );

    return result.rows[0] ? mapDishGuideCacheRow(result.rows[0]) : null;
  }

  async upsert(input: UpsertDishGuideCacheInput) {
    const normalizedDishName = normalizeDishName(input.dishName);

    if (!normalizedDishName) {
      throw new Error("Dish name must not be blank");
    }

    const result = await this.db.query<DishGuideCacheRow>(
      `
        INSERT INTO dish_guides (
          normalized_dish_name,
          english_name,
          guide_payload,
          media_urls
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
        ON CONFLICT (normalized_dish_name)
        DO UPDATE SET
          english_name = EXCLUDED.english_name,
          guide_payload = EXCLUDED.guide_payload,
          media_urls = EXCLUDED.media_urls
        RETURNING
          normalized_dish_name,
          english_name,
          guide_payload,
          media_urls,
          created_at,
          updated_at
      `,
      [
        normalizedDishName,
        input.englishName,
        JSON.stringify(input.guidePayload),
        JSON.stringify(input.mediaUrls ?? {}),
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Upsert did not return a dish guide cache row");
    }

    return mapDishGuideCacheRow(row);
  }
}

function mapDishGuideCacheRow(row: DishGuideCacheRow): DishGuideCacheRecord {
  return {
    normalizedDishName: row.normalized_dish_name,
    englishName: row.english_name,
    guidePayload: row.guide_payload,
    mediaUrls: row.media_urls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
