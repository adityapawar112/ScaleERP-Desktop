#!/usr/bin/env node

/**
 * Database Health Check Script
 * Run this script to check database file existence and basic info
 * Usage: node scripts/check-db.cjs
 */

const path = require('path');
const fs = require('fs');

function checkDatabase() {
  try {
    console.log('🔍 Checking database health...\n');

    // Check if database directory exists
    const dbPath = path.join(process.env.APPDATA || process.env.HOME || '.', 'scaleerp', 'inventory.db');
    console.log(`📁 Database path: ${dbPath}`);

    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`✅ Database file exists (${(stats.size / 1024).toFixed(2)} KB)`);
      console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);

      // Try to open database with sqlite3 to check integrity
      try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            console.log('❌ Cannot open database:', err.message);
            return;
          }

          console.log('✅ Database can be opened');

          // Check if tables exist
          db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
              console.log('❌ Cannot query database:', err.message);
            } else {
              console.log(`📋 Found ${rows.length} tables:`, rows.map(r => r.name).join(', '));
            }
            db.close();
          });
        });
      } catch (sqliteError) {
        console.log('❌ SQLite check failed:', sqliteError.message);
      }

    } else {
      console.log('❌ Database file does not exist');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Run the check
checkDatabase();
