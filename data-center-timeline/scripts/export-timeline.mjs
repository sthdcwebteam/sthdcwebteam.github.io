import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readFile, utils } from "xlsx";

const inputPath =
  process.argv[2] || "Data Center Timeline updated 040626.xlsx";
const outputPath = process.argv[3] || "data/timeline.json";
const sheetName = process.argv[4] || "Timeline no graph";

const workbook = readFile(inputPath, { cellDates: false });
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  const available = workbook.SheetNames.join(", ");
  throw new Error(`Sheet "${sheetName}" was not found. Available sheets: ${available}`);
}

const rows = utils.sheet_to_json(sheet, {
  header: 1,
  raw: true,
  blankrows: false,
});

const headerIndex = rows.findIndex((row) => {
  const labels = row.map((value) => String(value ?? "").trim().toUpperCase());
  return (
    labels.includes("DATE") &&
    labels.includes("MILESTONE") &&
    labels.includes("NOTES")
  );
});

if (headerIndex === -1) {
  throw new Error(`Could not find DATE, MILESTONE, and NOTES headers in ${sheetName}.`);
}

const headers = rows[headerIndex].map((value) => String(value ?? "").trim());
const normalizedHeaders = headers.map((value) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
);
const dateIndex = headers.findIndex((value) => value.toUpperCase() === "DATE");
const milestoneIndex = headers.findIndex(
  (value) => value.toUpperCase() === "MILESTONE",
);
const heightIndex = headers.findIndex((value) => value.toUpperCase() === "HEIGHT");
const notesIndex = headers.findIndex((value) => value.toUpperCase() === "NOTES");
const keyEventIndex = normalizedHeaders.findIndex((value) =>
  ["KEYEVENT", "ISKEYEVENT", "KEY"].includes(value),
);

function excelDateToIso(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "number") {
    const millis = Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000;
    return new Date(millis).toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseKeyEvent(value) {
  return ["true", "yes", "y", "1", "key", "starred"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

const events = rows
  .slice(headerIndex + 1)
  .map((row, index) => {
    const date = excelDateToIso(row[dateIndex]);
    const milestone = String(row[milestoneIndex] ?? "").trim();
    const notes = String(row[notesIndex] ?? "").trim();
    const heightValue = row[heightIndex];
    const height =
      heightValue === null || heightValue === undefined || heightValue === ""
        ? null
        : Number(heightValue);

    if (!date || !milestone) return null;

    return {
      id: `${date}-${slugify(milestone) || `event-${index + 1}`}`,
      date,
      milestone,
      height: Number.isFinite(height) ? height : null,
      isKeyEvent: keyEventIndex === -1 ? false : parseKeyEvent(row[keyEventIndex]),
      notes,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.date.localeCompare(b.date));

const payload = {
  generatedAt: new Date().toISOString(),
  sourceWorkbook: path.basename(inputPath),
  sourceSheet: sheetName,
  eventCount: events.length,
  events,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(payload, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(`Wrote ${events.length} events to ${outputPath}`);
