// Convert a single Postgres INSERT-style SQL dump (pg_dump --inserts)
// into newline-delimited JSON suitable for `npx convex import`.
//
// Usage: node scripts/sql-to-jsonl.mjs <input.sql> <output.jsonl>
//
// Handles:
//  - "schema"."table" qualified names
//  - quoted column lists
//  - bare NULL / true / false / numeric literals
//  - 'string' values with '' escaping and embedded newlines/commas/parens
//  - multi-row VALUES (...), (...), ...;
//
// Behavior:
//  - SQL NULL -> field is omitted from the output object (Convex prefers
//    optional fields over explicit nulls).
//  - Numeric literals that are bare (unquoted) -> JSON number.
//  - Quoted numeric-looking values stay strings, preserving leading zeros
//    (account_number '007770107927' must not become 7770107927).

import fs from "node:fs";
import path from "node:path";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error("usage: sql-to-jsonl.mjs <input.sql> <output.jsonl>");
  process.exit(2);
}

const sql = fs.readFileSync(inFile, "utf8");

const headerRe =
  /INSERT\s+INTO\s+(?:"[^"]+"\.)?"([^"]+)"\s*\(([^)]+)\)\s*VALUES\s*/i;
const m = sql.match(headerRe);
if (!m) {
  console.error(`No INSERT INTO header found in ${inFile}`);
  process.exit(1);
}
const table = m[1];
const cols = m[2]
  .split(",")
  .map((c) => c.trim().replace(/^"|"$/g, ""));

let i = m.index + m[0].length;
const rows = [];

const skipWs = () => {
  while (i < sql.length && /\s/.test(sql[i])) i++;
};

const NULL = Symbol("null");

const readString = () => {
  // assumes sql[i] === "'"
  i++;
  let s = "";
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'") {
      if (sql[i + 1] === "'") {
        s += "'";
        i += 2;
        continue;
      }
      i++;
      return s;
    }
    s += c;
    i++;
  }
  throw new Error(`Unterminated string starting near char ${i}`);
};

const readBareword = () => {
  let s = "";
  while (i < sql.length && sql[i] !== "," && sql[i] !== ")") {
    s += sql[i];
    i++;
  }
  s = s.trim();
  if (/^null$/i.test(s)) return NULL;
  if (/^true$/i.test(s)) return true;
  if (/^false$/i.test(s)) return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  // unknown bareword (shouldn't happen in our dumps); keep raw
  return s;
};

while (i < sql.length) {
  skipWs();
  if (sql[i] === ";" || i >= sql.length) break;
  if (sql[i] !== "(") {
    throw new Error(
      `Expected '(' at ${i}, got: ${JSON.stringify(sql.slice(i, i + 60))}`,
    );
  }
  i++; // consume (
  const vals = [];
  while (true) {
    skipWs();
    let v;
    if (sql[i] === "'") v = readString();
    else v = readBareword();
    vals.push(v);
    skipWs();
    if (sql[i] === ",") {
      i++;
      continue;
    }
    if (sql[i] === ")") {
      i++;
      break;
    }
    throw new Error(
      `Expected ',' or ')' at ${i}, got: ${JSON.stringify(sql.slice(i, i + 60))}`,
    );
  }
  if (vals.length !== cols.length) {
    throw new Error(
      `Row has ${vals.length} values but table has ${cols.length} columns near char ${i}`,
    );
  }
  const obj = {};
  for (let k = 0; k < cols.length; k++) {
    if (vals[k] === NULL) continue;
    obj[cols[k]] = vals[k];
  }
  rows.push(obj);
  skipWs();
  if (sql[i] === ",") {
    i++;
    continue;
  }
  if (sql[i] === ";" || i >= sql.length) break;
}

// Type stats so we can build the Convex schema accurately.
const types = {};
for (const r of rows) {
  for (const [k, v] of Object.entries(r)) {
    const t = typeof v;
    types[k] ??= new Set();
    types[k].add(t);
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(
  outFile,
  rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
);

console.log(
  JSON.stringify(
    {
      table,
      rows: rows.length,
      columns: cols,
      types: Object.fromEntries(
        Object.entries(types).map(([k, v]) => [k, [...v].sort()]),
      ),
    },
    null,
    2,
  ),
);
