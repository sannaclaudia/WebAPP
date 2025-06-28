'use strict';

const sqlite = require('sqlite3');

// Open the database
const db = new sqlite.Database('./Database/restaurant.sqlite', (err) => {
  if (err) throw err;
});

module.exports = db;
