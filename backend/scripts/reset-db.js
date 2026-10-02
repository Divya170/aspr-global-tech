// Deletes the SQLite database so the next boot recreates the schema and re-seeds content.
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', process.env.DB_PATH || '../database/app.sqlite');
for (const f of [file, file + '-wal', file + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
console.log('Removed', file, '— start the API to recreate and seed it.');
