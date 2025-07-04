'use strict';

const db = require('../db');
const crypto = require('crypto');

//--------------------------------------------------------------------------
// Get user by ID
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Users WHERE id = ?';
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      } else {
        const user = {
          id: row.id,
          username: row.username,
          totp_secret: row.totp_secret
        };
        resolve(user);
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get user by username and password
exports.getUser = (username, password) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      } else {
        const user = {
          id: row.id,
          username: row.username,
          totp_secret: row.totp_secret
        };

        // Check password
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) reject(err);
          if (!crypto.timingSafeEqual(Buffer.from(row.password_hash, 'hex'), hashedPassword)) {
            resolve(false);
          } else {
            resolve(user);
          }
        });
      }
    });
  });
};

//--------------------------------------------------------------------------
// Get TOTP secret for user
exports.getTotpSecret = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT totp_secret FROM Users WHERE id = ?';
    db.get(sql, [userId], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(null);
      } else {
        resolve(row.totp_secret);
      }
    });
  });
};
