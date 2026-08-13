import { Doc, TableNames } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Convert a numeric-string field (e.g. "150.00") to a number, or null if absent.
export function toNum(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Convert maybe-number back to nullable string for storage.
export function fromNum(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

// Look up a row by its preserved Postgres-UUID `id`.
export async function findByUuid<T extends TableNames>(
  ctx: QueryCtx | MutationCtx,
  table: T,
  id: string,
): Promise<Doc<T> | null> {
  return await ctx.db
    .query(table)
    .withIndex("by_uuid", (q: any) => q.eq("id", id))
    .unique();
}

// Strip Convex-internal fields before returning to the client. Components
// were written for Supabase shapes and don't expect `_id`/`_creationTime`.
export function stripInternal<T extends Record<string, any>>(doc: T | null): any {
  if (!doc) return doc;
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

// Generate a fresh UUID for new rows. crypto.randomUUID is available in
// Convex's V8 isolate.
export function newId(): string {
  return crypto.randomUUID();
}

// Current ISO timestamp.
export function nowIso(): string {
  return new Date().toISOString();
}
