const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'electron', 'database', 'inventory.db');
const db = new Database(dbPath);

// Recalculate broker totals
console.log('Recalculating broker totals...');
const brokers = db.prepare('SELECT id FROM brokers').all();
for (const broker of brokers) {
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'toBePaid' THEN amount ELSE 0 END), 0) as total_toBePaid,
      COALESCE(SUM(CASE WHEN type = 'paid' THEN amount ELSE 0 END), 0) as total_paid
    FROM broker_leisures
    WHERE broker_id = ?
  `).get(broker.id);

  const totalPending = result.total_paid - result.total_toBePaid;

  db.prepare('UPDATE brokers SET total_pending = ?, total_paid = ? WHERE id = ?')
    .run(totalPending, result.total_paid, broker.id);

  console.log(`Updated broker ${broker.id}: pending=${totalPending}, paid=${result.total_paid}`);
}

// Recalculate customer totals
console.log('Recalculating customer totals...');
const customers = db.prepare('SELECT id FROM customers').all();
for (const customer of customers) {
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'toBePaid' THEN amount ELSE 0 END), 0) as total_toBePaid,
      COALESCE(SUM(CASE WHEN type = 'paid' THEN amount ELSE 0 END), 0) as total_paid
    FROM customer_leisures
    WHERE customer_id = ?
  `).get(customer.id);

  const totalPending = result.total_paid - result.total_toBePaid;

  db.prepare('UPDATE customers SET total_pending = ?, total_paid = ? WHERE id = ?')
    .run(totalPending, result.total_paid, customer.id);

  console.log(`Updated customer ${customer.id}: pending=${totalPending}, paid=${result.total_paid}`);
}

db.close();
console.log('All totals recalculated successfully!');
