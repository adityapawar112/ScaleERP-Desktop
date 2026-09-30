import { dbManager } from './manager';
import { generateId, generateBrokerInvoiceNumber, generateCustomerInvoiceNumber, runTransaction } from './operations';
import { logger } from '../services/logger';

// Helper to run SQL with params as a promise
function dbRun(db: any, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to get a single row as a promise
function dbGet(db: any, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function seedSampleData(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const db = dbManager.getDatabase();
    
    return await runTransaction(async () => {
      logger.info('Starting sample data generation...');

      // 1. Seed Manufacturers (just strings in this schema, but we'll use a pool)
      const manufacturerPool = [
        { id: 'man_1', name: 'General Manufacturer' },
        { id: 'man_2', name: 'Ioncurex Pharma' },
        { id: 'man_3', name: 'BioHealth Solutions' },
        { id: 'man_4', name: 'PharmaTech Inc.' },
        { id: 'man_5', name: 'EcoMed Lab' }
      ];

      // 2. Seed 20 Products
      const productNames = [
        "Paracetamol 500mg", "Amoxicillin 250mg", "Ibuprofen 400mg", "Cetirizine 10mg", "Metformin 500mg",
        "Atorvastatin 20mg", "Amlodipine 5mg", "Omeprazole 20mg", "Lisinopril 10mg", "Azithromycin 500mg",
        "Vitamin C 1000mg", "Calcium D3", "Multivitamin Gold", "Zinc 50mg", "Iron Complex",
        "Fish Oil 1000mg", "Probiotic Plus", "Cough Syrup 100ml", "Pain Relief Gel", "Antiseptic Liquid"
      ];

      const productIds: string[] = [];
      for (let i = 0; i < productNames.length; i++) {
        const id = generateId('p');
        productIds.push(id);
        await dbRun(db, 
          'INSERT INTO products (id, name, description, price, stock_quantity) VALUES (?, ?, ?, ?, ?)',
          [id, productNames[i], `${productNames[i]} description`, Math.floor(Math.random() * 500) + 50, 0]
        );

        // Add 3-5 manufacturers for each product
        const numMans = Math.floor(Math.random() * 3) + 3; // 3 to 5
        const shuffledMans = [...manufacturerPool].sort(() => 0.5 - Math.random());
        const selectedMans = shuffledMans.slice(0, numMans);

        for (const man of selectedMans) {
          await dbRun(db,
            'INSERT INTO product_manufacturers (id, product_id, manufacturer_id, manufacturer_name, quantity) VALUES (?, ?, ?, ?, ?)',
            [generateId('pm'), id, man.id, man.name, 0]
          );
        }
      }

      // 3. Seed 100 Brokers
      const brokerIds: string[] = [];
      for (let i = 1; i <= 100; i++) {
        const id = generateId('br');
        brokerIds.push(id);
        await dbRun(db,
          'INSERT INTO brokers (id, name, contact, address) VALUES (?, ?, ?, ?)',
          [id, `Broker ${i}`, `9876543${i.toString().padStart(3, '0')}`, `Broker Address ${i}, City`]
        );
      }

      // 4. Seed 500 Customers
      const customerIds: string[] = [];
      for (let i = 1; i <= 500; i++) {
        const id = generateId('cust');
        customerIds.push(id);
        await dbRun(db,
          'INSERT INTO customers (id, name, contact, address) VALUES (?, ?, ?, ?)',
          [id, `Customer ${i}`, `9123456${i.toString().padStart(3, '0')}`, `Customer Address ${i}, Street Name`]
        );
      }

      // 5. Helper for random dates in the last 6 months
      const getRandomDate = () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return {
          date: date.toISOString().split('T')[0],
          time: date.toTimeString().split(' ')[0]
        };
      };

      // 6. Seed 1000 Broker Transactions
      logger.info('Seeding 1000 broker transactions...');
      for (let i = 0; i < 1000; i++) {
        const brokerId = brokerIds[Math.floor(Math.random() * brokerIds.length)];
        const { date, time } = getRandomDate();
        const txId = generateId('bt');
        const invoiceNum = `PUR-${2025}-${(i + 1).toString().padStart(5, '0')}`;
        
        // Random 1-3 products per transaction
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const productsToInsert = [];
        let totalAmount = 0;
        let totalBrokerage = 0;
        
        for (let j = 0; j < numProducts; j++) {
          const productId = productIds[Math.floor(Math.random() * productIds.length)];
          const pm = await dbGet(db, 'SELECT manufacturer_id, manufacturer_name FROM product_manufacturers WHERE product_id = ? ORDER BY RANDOM() LIMIT 1', [productId]);
          
          if (!pm) continue;

          const units = Math.floor(Math.random() * 100) + 50;
          const rate = Math.floor(Math.random() * 100) + 10;
          const itemTotal = units * rate;
          const brokeragePerUnit = Math.floor(Math.random() * 4) + 2;
          const brokerage = units * brokeragePerUnit;
          totalAmount += itemTotal;
          totalBrokerage += brokerage;

          productsToInsert.push({
            productId,
            manufacturerId: pm.manufacturer_id,
            units,
            rate,
            brokeragePerUnit,
            brokerage,
            itemTotal
          });
        }

        // Insert PARENT first (broker_transactions)
        await dbRun(db,
          'INSERT INTO broker_transactions (id, broker_id, date, time, invoice_number, total_amount, total_brokerage, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [txId, brokerId, date, time, invoiceNum, totalAmount, totalBrokerage, Math.random() > 0.5 ? 'cash' : 'UPI']
        );

        // Now insert CHILDREN (broker_transaction_products)
        for (const item of productsToInsert) {
          await dbRun(db,
            'INSERT INTO broker_transaction_products (id, transaction_id, product_id, manufacturer_id, units, unit_type, rate, brokerage_per_unit, brokerage, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId('btp'), txId, item.productId, item.manufacturerId, item.units, 'units', item.rate, item.brokeragePerUnit, item.brokerage, item.itemTotal]
          );

          // Update stock
          await dbRun(db, 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.units, item.productId]);
          await dbRun(db, 'UPDATE product_manufacturers SET quantity = quantity + ? WHERE product_id = ? AND manufacturer_id = ?', [item.units, item.productId, item.manufacturerId]);
          
          // Stock history
          await dbRun(db,
            'INSERT INTO stock_history (id, product_id, date, time, type, quantity, notes, broker_id, manufacturer_id, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId('sh'), item.productId, date, time, 'in', item.units, `Sample Purchase ${invoiceNum}`, brokerId, item.manufacturerId, txId]
          );
        }

        // Add leisure record
        await dbRun(db,
          'INSERT INTO broker_leisures (id, broker_id, broker_name, type, amount, brokerage, transaction_id, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [generateId('bl'), brokerId, `Broker ${brokerIds.indexOf(brokerId) + 1}`, 'purchase', totalAmount, totalBrokerage, txId, date, time, `Purchase ${invoiceNum}`]
        );
      }

      // 7. Seed 5000 Customer Transactions
      logger.info('Seeding 5000 customer transactions...');
      for (let i = 0; i < 5000; i++) {
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const { date, time } = getRandomDate();
        const txId = generateId('ct');
        const invoiceNum = `SALE-${2025}-${(i + 1).toString().padStart(6, '0')}`;
        
        // Random 1-3 products per transaction
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const productsToInsert = [];
        let totalAmount = 0;
        
        for (let j = 0; j < numProducts; j++) {
          const productId = productIds[Math.floor(Math.random() * productIds.length)];
          const pm = await dbGet(db, 'SELECT manufacturer_id, manufacturer_name, quantity FROM product_manufacturers WHERE product_id = ? AND quantity > 0 ORDER BY RANDOM() LIMIT 1', [productId]);
          
          if (!pm) continue;

          const quantity = Math.min(pm.quantity, Math.floor(Math.random() * 10) + 1);
          if (quantity <= 0) continue;

          const price = Math.floor(Math.random() * 200) + 100;
          const itemTotal = quantity * price;
          totalAmount += itemTotal;

          productsToInsert.push({
            productId,
            manufacturerId: pm.manufacturer_id,
            quantity,
            price,
            itemTotal
          });
        }

        if (totalAmount === 0) continue;
        
        const labourCharge = Math.floor(Math.random() * 200) + 50;
        totalAmount += labourCharge;

        // Insert PARENT first (customer_transactions)
        await dbRun(db,
          'INSERT INTO customer_transactions (id, customer_id, date, time, invoice_number, total_amount, labour_charge, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [txId, customerId, date, time, invoiceNum, totalAmount, labourCharge, Math.random() > 0.5 ? 'cash' : 'UPI']
        );

        // Now insert CHILDREN (customer_transaction_products)
        for (const item of productsToInsert) {
          await dbRun(db,
            'INSERT INTO customer_transaction_products (id, transaction_id, product_id, manufacturer_id, quantity, unit_type, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId('ctp'), txId, item.productId, item.manufacturerId, item.quantity, 'units', item.price, item.itemTotal]
          );

          // Update stock
          await dbRun(db, 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.productId]);
          await dbRun(db, 'UPDATE product_manufacturers SET quantity = quantity - ? WHERE product_id = ? AND manufacturer_id = ?', [item.quantity, item.productId, item.manufacturerId]);
          
          // Stock history
          await dbRun(db,
            'INSERT INTO stock_history (id, product_id, date, time, type, quantity, notes, manufacturer_id, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId('sh'), item.productId, date, time, 'out', item.quantity, `Sample Sale ${invoiceNum}`, item.manufacturerId, txId]
          );
        }

        // Add leisure record
        await dbRun(db,
          'INSERT INTO customer_leisures (id, customer_id, customer_name, type, amount, transaction_id, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [generateId('cl'), customerId, `Customer ${customerIds.indexOf(customerId) + 1}`, 'sale', totalAmount, txId, date, time, `Sale ${invoiceNum}`]
        );
      }

      // 8. Update all Broker and Customer balances
      logger.info('Updating broker and customer balances...');
      
      // Update broker totals
      await dbRun(db, `
        UPDATE brokers 
        SET 
          total_pending = (SELECT COALESCE(SUM(amount), 0) FROM broker_leisures WHERE broker_id = brokers.id AND type = 'purchase') - 
                          (SELECT COALESCE(SUM(amount), 0) FROM broker_leisures WHERE broker_id = brokers.id AND type = 'payable'),
          total_paid = (SELECT COALESCE(SUM(amount), 0) FROM broker_leisures WHERE broker_id = brokers.id AND type = 'payable')
      `);

      // Update customer totals
      await dbRun(db, `
        UPDATE customers 
        SET 
          total_pending = (SELECT COALESCE(SUM(amount), 0) FROM customer_leisures WHERE customer_id = customers.id AND type = 'sale') - 
                          (SELECT COALESCE(SUM(amount), 0) FROM customer_leisures WHERE customer_id = customers.id AND type = 'receivable'),
          total_paid = (SELECT COALESCE(SUM(amount), 0) FROM customer_leisures WHERE customer_id = customers.id AND type = 'receivable')
      `);

      logger.info('Sample data generation completed successfully');
      return { success: true, message: 'Sample data generated successfully' };
    });
  } catch (error: any) {
    logger.error('Sample data generation failed:', error);
    return { success: false, message: 'Seeding failed', error: error.message };
  }
}
