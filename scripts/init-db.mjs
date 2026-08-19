import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "rides.db");
const schemaPath = path.join(root, "scripts", "schema.sql");

fs.mkdirSync(dataDir, { recursive: true });

const schema = fs.readFileSync(schemaPath, "utf8");
const db = new Database(dbPath);

try {
  db.exec(schema);

  console.log(`Database initialised at ${dbPath}`);
} finally {
  db.close();
}