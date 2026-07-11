// Converts the two source transaction CSVs (data/source/) into a single
// JSON artifact the app fetches at runtime (public/data/transactions.json),
// the same pattern already used for d360_datagraph_export.json. Re-run this
// with `npm run build:transactions` whenever the source CSVs change.
//
// member_name/member_email are dropped from the output — they're
// redundant with unified_id, which joins straight to the datagraph export.
import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const headerCsv = readFileSync(path.join(ROOT, 'data/source/unified_transactions_header.csv'), 'utf-8');
const itemCsv = readFileSync(path.join(ROOT, 'data/source/unified_transaction_items.csv'), 'utf-8');

const headerRows = parse(headerCsv, { columns: true, skip_empty_lines: true });
const itemRows = parse(itemCsv, { columns: true, skip_empty_lines: true });

const headers = headerRows.map((r) => ({
  unified_id: r.unified_id,
  channel: r.channel,
  transaction_id: r.transaction_id,
  transaction_ref: r.transaction_ref,
  date: r.date,
  outlet: r.outlet,
  subtotal: Number(r.subtotal),
  tax_amount: Number(r.tax_amount),
  total_amount: Number(r.total_amount),
  status: r.status,
}));

const items = itemRows.map((r) => ({
  unified_id: r.unified_id,
  channel: r.channel,
  transaction_id: r.transaction_id,
  date: r.date,
  item_id: r.item_id,
  item_name: r.item_name,
  category: r.category,
  quantity: Number(r.quantity),
  line_amount: Number(r.line_amount),
  line_tax: Number(r.line_tax),
}));

const dates = headers.map((h) => h.date).sort();

const output = {
  generatedAt: new Date().toISOString(),
  dateRange: { min: dates[0], max: dates[dates.length - 1] },
  headers,
  items,
};

// Sanity check the join before shipping it: line items must sum to the
// header subtotal for every transaction (verified 0 mismatches on the
// full dataset during investigation — this just guards against silent
// drift if the source CSVs are regenerated).
const itemSumByTxn = new Map();
for (const it of items) {
  itemSumByTxn.set(it.transaction_id, (itemSumByTxn.get(it.transaction_id) ?? 0) + it.line_amount);
}
let mismatches = 0;
for (const h of headers) {
  const sum = itemSumByTxn.get(h.transaction_id) ?? 0;
  if (Math.abs(sum - h.subtotal) > 0.02) mismatches++;
}
if (mismatches > 0) {
  console.warn(`WARNING: ${mismatches} transactions where item line_amount sum != header subtotal.`);
} else {
  console.log(`Verified: all ${headers.length} transactions reconcile to their line items exactly.`);
}

const outPath = path.join(ROOT, 'public/data/transactions.json');
writeFileSync(outPath, JSON.stringify(output));
console.log(`Wrote ${outPath} — ${headers.length} transactions, ${items.length} line items.`);
