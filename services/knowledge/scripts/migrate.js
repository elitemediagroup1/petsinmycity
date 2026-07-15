#!/usr/bin/env node
'use strict';
/** Apply pending migrations to a database file. Usage: node scripts/migrate.js [dbFile] */
const path = require('path');
const { openDatabase, migrate } = require('../src/db');

function main() {
  const dbFile = process.argv[2] || path.join(__dirname, '..', 'data', 'knowledge.db');
  const db = openDatabase(dbFile);
  const ran = migrate(db);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ db: dbFile, applied: ran }, null, 2));
  db.close();
}
if (require.main === module) main();
