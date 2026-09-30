import { dbManager } from './manager';
import { logger } from '../services/logger';

/**
 * Database utility functions for common operations
 * Provides helper functions for the inventory system using sqlite3
 */

// Type definitions for database rows
interface BackupSettingsRow {
  id: number;
  auto_backup_enabled: number;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_location: string;
  updated_at: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generate a unique ID with timestamp
 */
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate invoice number for broker transactions
 */
export function generateBrokerInvoiceNumber(): Promise<string> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    const currentYear = new Date().getFullYear();

    db.all(
      `SELECT invoice_number FROM broker_transactions WHERE invoice_number LIKE ? ORDER BY invoice_number DESC`,
      [`INV-${currentYear}-%`],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        let nextNumber = 1;
        if (rows.length > 0) {
          const lastInvoice = rows[0].invoice_number;
          const match = lastInvoice.match(/INV-\d{4}-(\d{4})/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        resolve(`INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`);
      }
    );
  });
}

/**
 * Generate invoice number for customer transactions
 */
export function generateCustomerInvoiceNumber(): Promise<string> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    const currentYear = new Date().getFullYear();

    db.all(
      `SELECT invoice_number FROM customer_transactions WHERE invoice_number LIKE ? ORDER BY invoice_number DESC`,
      [`CUST-INV-${currentYear}-%`],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        let nextNumber = 1;
        if (rows.length > 0) {
          const lastInvoice = rows[0].invoice_number;
          const match = lastInvoice.match(/CUST-INV-\d{4}-(\d{4})/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        resolve(`CUST-INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`);
      }
    );
  });
}

/**
 * Run multiple operations in a transaction
 */
export function runTransaction<T>(operations: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        logger.error('Failed to start DB transaction', err);
        reject(err);
        return;
      }
      logger.info('DB Transaction started');

      operations()
        .then((result) => {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              logger.error('DB Transaction commit failed', commitErr);
              reject(commitErr);
            } else {
              logger.info('DB Transaction committed successfully');
              resolve(result);
            }
          });
        })
        .catch((error) => {
          db.run('ROLLBACK', () => {
            logger.warn('DB Transaction rolled back due to error', error);
            reject(error);
          });
        });
    });
  });
}

/**
 * Get daily sales total
 */
export function getDailySalesTotal(date: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.get(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM customer_transactions WHERE date = ?`,
      [date],
      (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row?.total ?? 0);
      }
    );
  });
}

/**
 * Get monthly sales total
 */
export function getMonthlySalesTotal(year: number, month: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    db.get(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM customer_transactions WHERE date BETWEEN ? AND ?`,
      [startDate, endDate],
      (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row?.total ?? 0);
      }
    );
  });
}

/**
 * Update broker totals based on leisures
 */
export function updateBrokerTotals(brokerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Calculate totals from leisures
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0) as total_purchase,
        COALESCE(SUM(CASE WHEN type = 'payable' THEN amount ELSE 0 END), 0) as total_payable
      FROM broker_leisures
      WHERE broker_id = ?
    `;

    db.get(query, [brokerId], (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }

      // Calculate total_pending as purchase - payable (net balance)
      const totalPending = row.total_purchase - row.total_payable;

      // Update broker totals
      db.run(
        'UPDATE brokers SET total_pending = ?, total_paid = ? WHERE id = ?',
        [totalPending, row.total_payable, brokerId],
        (updateErr) => {
          if (updateErr) {
            logger.error(`Failed to update broker totals for ${brokerId}`, updateErr);
            reject(updateErr);
          } else {
            logger.info(`Broker totals updated: ID ${brokerId}, Pending: ${totalPending}, Paid: ${row.total_payable}`);
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Update customer totals based on customer leisures
 */
export function updateCustomerTotals(customerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Calculate totals from customer leisures
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount ELSE 0 END), 0) as total_receivable,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as total_sale
      FROM customer_leisures
      WHERE customer_id = ?
    `;

    db.get(query, [customerId], (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }

      // Calculate total_pending as receivable - sale (net balance)
      const totalPending = row.total_receivable - row.total_sale;

      // Update customer totals
      db.run(
        'UPDATE customers SET total_pending = ?, total_paid = ? WHERE id = ?',
        [totalPending, row.total_sale, customerId],
        (updateErr) => {
          if (updateErr) {
            logger.error(`Failed to update customer totals for ${customerId}`, updateErr);
            reject(updateErr);
          } else {
            logger.info(`Customer totals updated: ID ${customerId}, Pending: ${totalPending}, Paid: ${row.total_sale}`);
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Reverse stock changes for a broker transaction deletion
 */
export function reverseBrokerTransactionStock(transactionId: string): Promise<void> {
  logger.info(`Reversing stock for broker transaction: ${transactionId}`);
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Get all stock history entries for this transaction using transaction_id
    db.all(
      'SELECT * FROM stock_history WHERE transaction_id = ?',
      [transactionId],
      (err, stockEntries: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (stockEntries.length === 0) {
          resolve();
          return;
        }

        // Process each stock entry to reverse it
        const processStockEntry = (index: number) => {
          if (index >= stockEntries.length) {
            resolve();
            return;
          }

          const entry = stockEntries[index];

          // Reverse the stock quantity change
          // For broker transactions (incoming), we added stock, so we need to subtract
          const reverseQuantity = -entry.quantity;

          db.run(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [reverseQuantity, entry.product_id],
            (updateErr) => {
              if (updateErr) {
                reject(updateErr);
                return;
              }

          // Reverse manufacturer stock (only update quantity, don't create records or change names)
              db.run(
                `UPDATE product_manufacturers SET quantity = quantity + ? WHERE product_id = ? AND manufacturer_id = ?`,
                [reverseQuantity, entry.product_id, entry.manufacturer_id],
                function(manufacturerErr: Error | null) {
                  if (manufacturerErr) {
                    reject(manufacturerErr);
                    return;
                  }

                  // Log warning if no manufacturer record was updated (data integrity issue)
                  if (this && this.changes === 0) {
                    logger.warn(`Data integrity warning: No manufacturer record found for product ${entry.product_id}, manufacturer ${entry.manufacturer_id} during transaction reversal`);
                  }

                  // Delete the original stock history entry
                  db.run(
                    'DELETE FROM stock_history WHERE id = ?',
                    [entry.id],
                    (deleteErr) => {
                      if (deleteErr) {
                        reject(deleteErr);
                        return;
                      }

                      processStockEntry(index + 1);
                    }
                  );
                }
              );
            }
          );
        };

        processStockEntry(0);
      }
    );
  });
}

/**
 * Reverse stock changes for a customer transaction deletion
 */
export function reverseCustomerTransactionStock(transactionId: string): Promise<void> {
  logger.info(`Reversing stock for customer transaction: ${transactionId}`);
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Get all stock history entries for this transaction using transaction_id
    db.all(
      'SELECT * FROM stock_history WHERE transaction_id = ?',
      [transactionId],
      (err, stockEntries: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (stockEntries.length === 0) {
          resolve();
          return;
        }

        // Process each stock entry to reverse it
        const processStockEntry = (index: number) => {
          if (index >= stockEntries.length) {
            resolve();
            return;
          }

          const entry = stockEntries[index];

          // Reverse the stock quantity change based on transaction type
          // For customer transactions (outgoing), we subtracted stock, so we need to add back
          // For broker transactions (incoming), we added stock, so we need to subtract
          const reverseQuantity = entry.type === 'out' ? entry.quantity : -entry.quantity;

          db.run(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [reverseQuantity, entry.product_id],
            (updateErr) => {
              if (updateErr) {
                reject(updateErr);
                return;
              }

              // Reverse manufacturer stock (only update quantity, don't create records or change names)
              db.run(
                `UPDATE product_manufacturers SET quantity = quantity + ? WHERE product_id = ? AND manufacturer_id = ?`,
                [reverseQuantity, entry.product_id, entry.manufacturer_id],
                function(manufacturerErr: Error | null) {
                  if (manufacturerErr) {
                    reject(manufacturerErr);
                    return;
                  }

                  // Log warning if no manufacturer record was updated (data integrity issue)
                  if (this && this.changes === 0) {
                    logger.warn(`Data integrity warning: No manufacturer record found for product ${entry.product_id}, manufacturer ${entry.manufacturer_id} during transaction reversal`);
                  }

                  // Delete the original stock history entry
                  db.run(
                    'DELETE FROM stock_history WHERE id = ?',
                    [entry.id],
                    (deleteErr) => {
                      if (deleteErr) {
                        reject(deleteErr);
                        return;
                      }

                      processStockEntry(index + 1);
                    }
                  );
                }
              );
            }
          );
        };

        processStockEntry(0);
      }
    );
  });
}

/**
 * Analyze deletion impact for broker transactions
 */
export function analyzeBrokerTransactionDeletion(transactionId: string): Promise<{
  affectedLeisures: number;
  affectedStockHistory: number;
  financialImpact: number;
  orphanedRecords: string[];
  willDeleteTransaction: boolean;
  willDeleteLeisure: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check related leisure records
    db.get(
      'SELECT COUNT(*) as count FROM broker_leisures WHERE transaction_id = ?',
      [transactionId],
      (err, leisureRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check stock history entries
        db.get(
          'SELECT COUNT(*) as count FROM stock_history WHERE transaction_id = ?',
          [transactionId],
          (err, stockRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Get transaction amount for financial impact
            db.get(
              'SELECT total_amount FROM broker_transactions WHERE id = ?',
              [transactionId],
              (err, transactionRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                const affectedLeisures = leisureRow?.count || 0;
                const affectedStockHistory = stockRow?.count || 0;
                const financialImpact = transactionRow?.total_amount || 0;

                const orphanedRecords = [];
                if (affectedLeisures > 0) orphanedRecords.push(`${affectedLeisures} leisure record(s)`);
                if (affectedStockHistory > 0) orphanedRecords.push(`${affectedStockHistory} stock history record(s)`);

                resolve({
                  affectedLeisures,
                  affectedStockHistory,
                  financialImpact,
                  orphanedRecords,
                  willDeleteTransaction: true,
                  willDeleteLeisure: affectedLeisures > 0
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Analyze deletion impact for customer transactions
 */
export function analyzeCustomerTransactionDeletion(transactionId: string): Promise<{
  affectedLeisures: number;
  affectedStockHistory: number;
  financialImpact: number;
  orphanedRecords: string[];
  willDeleteTransaction: boolean;
  willDeleteLeisure: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check related leisure records
    db.get(
      'SELECT COUNT(*) as count FROM customer_leisures WHERE transaction_id = ?',
      [transactionId],
      (err, leisureRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check stock history entries
        db.get(
          'SELECT COUNT(*) as count FROM stock_history WHERE transaction_id = ?',
          [transactionId],
          (err, stockRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Get transaction amount for financial impact
            db.get(
              'SELECT total_amount FROM customer_transactions WHERE id = ?',
              [transactionId],
              (err, transactionRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                const affectedLeisures = leisureRow?.count || 0;
                const affectedStockHistory = stockRow?.count || 0;
                const financialImpact = transactionRow?.total_amount || 0;

                const orphanedRecords = [];
                if (affectedLeisures > 0) orphanedRecords.push(`${affectedLeisures} leisure record(s)`);
                if (affectedStockHistory > 0) orphanedRecords.push(`${affectedStockHistory} stock history record(s)`);

                resolve({
                  affectedLeisures,
                  affectedStockHistory,
                  financialImpact,
                  orphanedRecords,
                  willDeleteTransaction: true,
                  willDeleteLeisure: affectedLeisures > 0
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Analyze deletion impact for broker leisures
 */
export function analyzeBrokerLeisureDeletion(leisureId: string): Promise<{
  financialImpact: number;
  affectsBrokerTotal: boolean;
  brokerName: string;
  willDeleteTransaction: boolean;
  willDeleteLeisure: boolean;
  transactionId?: string;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    db.get(
      `SELECT bl.amount, bl.broker_name, bl.type, bl.transaction_id, b.total_pending, b.total_paid
       FROM broker_leisures bl
       JOIN brokers b ON bl.broker_id = b.id
       WHERE bl.id = ?`,
      [leisureId],
      (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve({
            financialImpact: 0,
            affectsBrokerTotal: false,
            brokerName: '',
            willDeleteTransaction: false,
            willDeleteLeisure: false
          });
          return;
        }

        const willDeleteTransaction = row.type === 'purchase' && row.transaction_id;
        const willDeleteLeisure = true; // The leisure itself will always be deleted

        resolve({
          financialImpact: row.amount,
          affectsBrokerTotal: true,
          brokerName: row.broker_name,
          willDeleteTransaction,
          willDeleteLeisure,
          transactionId: row.transaction_id
        });
      }
    );
  });
}

/**
 * Analyze deletion impact for customer leisures
 */
export function analyzeCustomerLeisureDeletion(leisureId: string): Promise<{
  financialImpact: number;
  affectsCustomerTotal: boolean;
  customerName: string;
  willDeleteTransaction: boolean;
  willDeleteLeisure: boolean;
  transactionId?: string;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    db.get(
      `SELECT cl.amount, cl.customer_name, cl.type, cl.transaction_id, c.total_pending, c.total_paid
       FROM customer_leisures cl
       JOIN customers c ON cl.customer_id = c.id
       WHERE cl.id = ?`,
      [leisureId],
      (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve({
            financialImpact: 0,
            affectsCustomerTotal: false,
            customerName: '',
            willDeleteTransaction: false,
            willDeleteLeisure: false
          });
          return;
        }

        const willDeleteTransaction = row.type === 'receivable' && row.transaction_id;
        const willDeleteLeisure = true; // The leisure itself will always be deleted

        resolve({
          financialImpact: row.amount,
          affectsCustomerTotal: true,
          customerName: row.customer_name,
          willDeleteTransaction,
          willDeleteLeisure,
          transactionId: row.transaction_id
        });
      }
    );
  });
}

/**
 * Analyze deletion impact for products
 */
export function analyzeProductDeletion(productId: string): Promise<{
  affectedTransactions: number;
  affectedStockHistory: number;
  totalFinancialImpact: number;
  affectedEntities: string[];
  canDelete: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check broker transactions
    db.get(
      'SELECT COUNT(*) as count FROM broker_transaction_products WHERE product_id = ?',
      [productId],
      (err, brokerTxRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check customer transactions
        db.get(
          'SELECT COUNT(*) as count FROM customer_transaction_products WHERE product_id = ?',
          [productId],
          (err, customerTxRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Check stock history
            db.get(
              'SELECT COUNT(*) as count FROM stock_history WHERE product_id = ?',
              [productId],
              (err, stockRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                // Get financial impact from transactions
                db.get(
                  `SELECT
                    COALESCE(SUM(btp.total), 0) as broker_impact,
                    COALESCE(SUM(ctp.total), 0) as customer_impact
                   FROM products p
                   LEFT JOIN broker_transaction_products btp ON p.id = btp.product_id
                   LEFT JOIN customer_transaction_products ctp ON p.id = ctp.product_id
                   WHERE p.id = ?`,
                  [productId],
                  (err, financialRow: any) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    const affectedTransactions = (brokerTxRow?.count || 0) + (customerTxRow?.count || 0);
                    const affectedStockHistory = stockRow?.count || 0;
                    const totalFinancialImpact = (financialRow?.broker_impact || 0) + (financialRow?.customer_impact || 0);

                    const affectedEntities = [];
                    if (brokerTxRow?.count > 0) affectedEntities.push(`${brokerTxRow.count} broker transaction(s)`);
                    if (customerTxRow?.count > 0) affectedEntities.push(`${customerTxRow.count} customer transaction(s)`);
                    if (stockRow?.count > 0) affectedEntities.push(`${stockRow.count} stock history record(s)`);

                    resolve({
                      affectedTransactions,
                      affectedStockHistory,
                      totalFinancialImpact,
                      affectedEntities,
                      canDelete: affectedTransactions === 0 // Can only delete if no transactions reference it
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Analyze deletion impact for manufacturers
 */
export function analyzeManufacturerDeletion(manufacturerId: string): Promise<{
  affectedProducts: number;
  affectedTransactions: number;
  totalFinancialImpact: number;
  affectedEntities: string[];
  canDelete: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check product manufacturers
    db.get(
      'SELECT COUNT(*) as count FROM product_manufacturers WHERE manufacturer_id = ?',
      [manufacturerId],
      (err, productsRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check broker transactions
        db.get(
          'SELECT COUNT(*) as count FROM broker_transaction_products WHERE manufacturer_id = ?',
          [manufacturerId],
          (err, brokerTxRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Check customer transactions
            db.get(
              'SELECT COUNT(*) as count FROM customer_transaction_products WHERE manufacturer_id = ?',
              [manufacturerId],
              (err, customerTxRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                // Get financial impact from both broker and customer transactions
                db.get(
                  `SELECT
                    COALESCE((SELECT SUM(btp.total) FROM broker_transaction_products btp WHERE btp.manufacturer_id = ?), 0) as broker_impact,
                    COALESCE((SELECT SUM(ctp.total) FROM customer_transaction_products ctp WHERE ctp.manufacturer_id = ?), 0) as customer_impact`,
                  [manufacturerId, manufacturerId],
                  (err, financialRow: any) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    const affectedProducts = productsRow?.count || 0;
                    const affectedTransactions = (brokerTxRow?.count || 0) + (customerTxRow?.count || 0);
                    const totalFinancialImpact = financialRow ? (financialRow.broker_impact || 0) + (financialRow.customer_impact || 0) : 0;

                    const affectedEntities = [];
                    if (productsRow?.count > 0) affectedEntities.push(`${productsRow.count} product(s)`);
                    if (brokerTxRow?.count > 0) affectedEntities.push(`${brokerTxRow.count} broker transaction(s)`);
                    if (customerTxRow?.count > 0) affectedEntities.push(`${customerTxRow.count} customer transaction(s)`);

                    resolve({
                      affectedProducts,
                      affectedTransactions,
                      totalFinancialImpact,
                      affectedEntities,
                      canDelete: affectedTransactions === 0 // Can only delete if no transactions reference it
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Analyze deletion impact for brokers
 */
export function analyzeBrokerDeletion(brokerId: string): Promise<{
  affectedTransactions: number;
  affectedLeisures: number;
  totalFinancialImpact: number;
  affectedEntities: string[];
  canDelete: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check broker transactions
    db.get(
      'SELECT COUNT(*) as count FROM broker_transactions WHERE broker_id = ?',
      [brokerId],
      (err, transactionsRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check broker leisures
        db.get(
          'SELECT COUNT(*) as count FROM broker_leisures WHERE broker_id = ?',
          [brokerId],
          (err, leisuresRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Get financial impact from transactions and leisures
            db.get(
              `SELECT
                COALESCE(SUM(bt.total_amount), 0) as transactions_impact,
                COALESCE(SUM(bl.amount), 0) as leisures_impact
               FROM brokers b
               LEFT JOIN broker_transactions bt ON b.id = bt.broker_id
               LEFT JOIN broker_leisures bl ON b.id = bl.broker_id
               WHERE b.id = ?`,
              [brokerId],
              (err, financialRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                const affectedTransactions = transactionsRow?.count || 0;
                const affectedLeisures = leisuresRow?.count || 0;
                const totalFinancialImpact = (financialRow?.transactions_impact || 0) + (financialRow?.leisures_impact || 0);

                const affectedEntities = [];
                if (transactionsRow?.count > 0) affectedEntities.push(`${transactionsRow.count} transaction(s)`);
                if (leisuresRow?.count > 0) affectedEntities.push(`${leisuresRow.count} leisure record(s)`);

                resolve({
                  affectedTransactions,
                  affectedLeisures,
                  totalFinancialImpact,
                  affectedEntities,
                  canDelete: true // Brokers can always be deleted, but with impact warning
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Analyze deletion impact for customers
 */
export function analyzeCustomerDeletion(customerId: string): Promise<{
  affectedTransactions: number;
  affectedLeisures: number;
  totalFinancialImpact: number;
  affectedEntities: string[];
  canDelete: boolean;
}> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();

    // Check customer transactions
    db.get(
      'SELECT COUNT(*) as count FROM customer_transactions WHERE customer_id = ?',
      [customerId],
      (err, transactionsRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Check customer leisures
        db.get(
          'SELECT COUNT(*) as count FROM customer_leisures WHERE customer_id = ?',
          [customerId],
          (err, leisuresRow: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Get financial impact from transactions and leisures
            db.get(
              `SELECT
                COALESCE(SUM(ct.total_amount), 0) as transactions_impact,
                COALESCE(SUM(cl.amount), 0) as leisures_impact
               FROM customers c
               LEFT JOIN customer_transactions ct ON c.id = ct.customer_id
               LEFT JOIN customer_leisures cl ON c.id = cl.customer_id
               WHERE c.id = ?`,
              [customerId],
              (err, financialRow: any) => {
                if (err) {
                  reject(err);
                  return;
                }

                const affectedTransactions = transactionsRow?.count || 0;
                const affectedLeisures = leisuresRow?.count || 0;
                const totalFinancialImpact = (financialRow?.transactions_impact || 0) + (financialRow?.leisures_impact || 0);

                const affectedEntities = [];
                if (transactionsRow?.count > 0) affectedEntities.push(`${transactionsRow.count} transaction(s)`);
                if (leisuresRow?.count > 0) affectedEntities.push(`${leisuresRow.count} leisure record(s)`);

                resolve({
                  affectedTransactions,
                  affectedLeisures,
                  totalFinancialImpact,
                  affectedEntities,
                  canDelete: true // Customers can always be deleted, but with impact warning
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Get database statistics for all 17 tables
 */
export function getDatabaseStats(): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    const stats: any = {};

    // Use a counter to track completion of all queries
    let completed = 0;
    const total = 19;

    const checkComplete = () => {
      completed++;
      if (completed === total) {
        resolve(stats);
      }
    };

    // Core entities (8 tables)
    db.get('SELECT COUNT(*) as count FROM products', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.products = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM brokers', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokers = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customers', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customers = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM broker_transactions', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokerTransactions = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customer_transactions', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customerTransactions = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM broker_leisures', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokerLeisures = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customer_leisures', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customerLeisures = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM stock_history', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.stockHistory = row;
        checkComplete();
      }
    });

    // Transaction product tables (2 tables)
    db.get('SELECT COUNT(*) as count FROM broker_transaction_products', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokerTransactionProducts = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customer_transaction_products', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customerTransactionProducts = row;
        checkComplete();
      }
    });

    // Settings and configuration (1 table)
    db.get('SELECT COUNT(*) as count FROM business_settings', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.businessSettings = row;
        checkComplete();
      }
    });

    // Product manufacturers (1 table)
    db.get('SELECT COUNT(*) as count FROM product_manufacturers', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.productManufacturers = row;
        checkComplete();
      }
    });

    // Full-text search tables (4 tables)
    db.get('SELECT COUNT(*) as count FROM products_fts', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.productsFts = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM brokers_fts', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokersFts = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customers_fts', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customersFts = row;
        checkComplete();
      }
    });

    // Views (3 views - these are virtual tables)
    db.get('SELECT COUNT(*) as count FROM product_stock_summary', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.productStockSummary = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM broker_transaction_summary', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.brokerTransactionSummary = row;
        checkComplete();
      }
    });

    db.get('SELECT COUNT(*) as count FROM customer_transaction_summary', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.customerTransactionSummary = row;
        checkComplete();
      }
    });

    // Database size information
    db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()', (err, row: any) => {
      if (err) reject(err);
      else {
        stats.databaseSize = { size: row?.size || 0 };
        checkComplete();
      }
    });
  });
}

// ===========================================
// CRUD OPERATIONS
// ===========================================

// Products
export const products = {
  insert: (data: { id: string; name: string; description?: string; price?: number; stock_quantity?: number }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO products (id, name, description, price, stock_quantity) VALUES (?, ?, ?, ?, ?)`,
        [data.id, data.name, data.description || '', data.price || 0, data.stock_quantity || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{ name: string; description: string; price: number; stock_quantity: number }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }
      if (data.price !== undefined) {
        updates.push('price = ?');
        values.push(data.price);
      }
      if (data.stock_quantity !== undefined) {
        updates.push('stock_quantity = ?');
        values.push(data.stock_quantity);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  archive: (id: string) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Archive the product
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE products SET is_archived = 1 WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // CASCADE: Archive all manufacturers for this product
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE product_manufacturers SET is_archived = 1 WHERE product_id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      return { changes: 1 };
    });
  },

  unarchive: (id: string) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Unarchive the product
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE products SET is_archived = 0 WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // CASCADE: Unarchive all manufacturers for this product
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE product_manufacturers SET is_archived = 0 WHERE product_id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      return { changes: 1 };
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM products ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getArchived: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      // Get archived products with their manufacturer stocks
      const query = `
        SELECT
          p.*,
          p.stock_quantity as stockQuantity,
          json_group_array(
            json_object(
              'manufacturerId', pm.manufacturer_id,
              'manufacturerName', pm.manufacturer_name,
              'quantity', pm.quantity
            )
          ) as manufacturerStocksJson
        FROM products p
        LEFT JOIN product_manufacturers pm ON p.id = pm.product_id AND pm.is_archived = 1
        WHERE p.is_archived = 1
        GROUP BY p.id
        ORDER BY p.name
      `;

      db.all(query, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          // Transform the data to match the expected interface
          const transformedRows = rows.map(row => ({
            ...row,
            manufacturerStocks: row.manufacturerStocksJson && row.manufacturerStocksJson !== '[null]'
              ? JSON.parse(row.manufacturerStocksJson)
              : []
          }));
          // Remove the temporary JSON field
          transformedRows.forEach(row => delete row.manufacturerStocksJson);
          resolve(transformedRows);
        }
      });
    });
  }
};

// Brokers
export const brokers = {
  insert: (data: { id: string; name: string; contact?: string; address?: string; total_pending?: number; total_paid?: number }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO brokers (id, name, contact, address, total_pending, total_paid) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.id, data.name, data.contact || '', data.address || '', data.total_pending || 0, data.total_paid || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{ name: string; contact: string; address: string; total_pending: number; total_paid: number }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.contact !== undefined) {
        updates.push('contact = ?');
        values.push(data.contact);
      }
      if (data.address !== undefined) {
        updates.push('address = ?');
        values.push(data.address);
      }
      if (data.total_pending !== undefined) {
        updates.push('total_pending = ?');
        values.push(data.total_pending);
      }
      if (data.total_paid !== undefined) {
        updates.push('total_paid = ?');
        values.push(data.total_paid);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE brokers SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: async (id: string) => {
    const db = dbManager.getDatabase();

    // Get all broker transactions to delete them individually (triggers stock reversal)
    const brokerTransactionIds = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id FROM broker_transactions WHERE broker_id = ?', [id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Delete each transaction individually to trigger stock reversal
    // Each transaction deletion is already wrapped in its own transaction
    for (const transaction of brokerTransactionIds) {
      await brokerTransactions.delete(transaction.id);
    }

    // Delete broker (CASCADE will delete remaining leisures)
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM brokers WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    return { changes: 1 };
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM brokers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM brokers', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Customers
export const customers = {
  insert: (data: { id: string; name: string; contact?: string; address?: string; total_pending?: number; total_paid?: number }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO customers (id, name, contact, address, total_pending, total_paid) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.id, data.name, data.contact || '', data.address || '', data.total_pending || 0, data.total_paid || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{ name: string; contact: string; address: string; total_pending: number; total_paid: number }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.contact !== undefined) {
        updates.push('contact = ?');
        values.push(data.contact);
      }
      if (data.address !== undefined) {
        updates.push('address = ?');
        values.push(data.address);
      }
      if (data.total_pending !== undefined) {
        updates.push('total_pending = ?');
        values.push(data.total_pending);
      }
      if (data.total_paid !== undefined) {
        updates.push('total_paid = ?');
        values.push(data.total_paid);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: async (id: string) => {
    const db = dbManager.getDatabase();

    // Get all customer transactions to delete them individually (triggers stock reversal)
    const customerTransactionIds = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id FROM customer_transactions WHERE customer_id = ?', [id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Delete each transaction individually to trigger stock reversal
    // Each transaction deletion is already wrapped in its own transaction
    for (const transaction of customerTransactionIds) {
      await customerTransactions.delete(transaction.id);
    }

    // Delete customer (CASCADE will delete remaining leisures)
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    return { changes: 1 };
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM customers', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const backupSettingsOperations = {
  get: (): Promise<BackupSettingsRow | undefined> => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM backup_settings WHERE id = 1', (err, row: BackupSettingsRow | undefined) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  update: (data: Partial<{
    auto_backup_enabled: boolean;
    backup_frequency: string;
    backup_location: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();

      // Use INSERT OR REPLACE to ensure the row exists
      // First get current data, then merge with updates
      db.get('SELECT * FROM backup_settings WHERE id = 1', (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        const currentData = row || {
          id: 1,
          auto_backup_enabled: 1,
          backup_frequency: 'weekly',
          backup_location: ''
        };

        const updatedData = {
          id: 1,
          auto_backup_enabled: data.auto_backup_enabled !== undefined ? data.auto_backup_enabled : currentData.auto_backup_enabled,
          backup_frequency: data.backup_frequency !== undefined ? data.backup_frequency : currentData.backup_frequency,
          backup_location: data.backup_location !== undefined ? data.backup_location : currentData.backup_location
        };

        db.run(
          `INSERT OR REPLACE INTO backup_settings (id, auto_backup_enabled, backup_frequency, backup_location)
           VALUES (?, ?, ?, ?)`,
          [
            updatedData.id,
            updatedData.auto_backup_enabled ? 1 : 0,
            updatedData.backup_frequency,
            updatedData.backup_location
          ],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
    });
  }
};

// ===========================================
// FULL-TEXT SEARCH TABLES (READ-ONLY)
// ===========================================

// Broker Transactions
export const brokerTransactions = {
  insert: (data: {
    id: string;
    broker_id: string;
    date: string;
    time?: string;
    invoice_number?: string;
    total_amount: number;
    total_brokerage?: number;
    previous_balance?: number;
    payment_method?: string;
    notes?: string;
    products?: Array<{
      product_id: string;
      manufacturer_id: string;
      units: number;
      unit_type: string;
      rate: number;
      brokerage_per_unit?: number;
      brokerage?: number;
      total: number;
    }>;
  }) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Insert main transaction
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO broker_transactions (id, broker_id, date, time, invoice_number, total_amount, total_brokerage, previous_balance, payment_method, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.broker_id,
            data.date,
            data.time || null,
            data.invoice_number || null,
            data.total_amount,
            data.total_brokerage || 0,
            data.previous_balance || 0,
            data.payment_method || 'cash',
            data.notes || ''
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert transaction products and update stock
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          // Insert transaction product
          await new Promise<void>((resolve, reject) => {
            db.run(
              `INSERT INTO broker_transaction_products (id, transaction_id, product_id, manufacturer_id, units, unit_type, rate, brokerage_per_unit, brokerage, total)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('btp'),
                data.id,
                product.product_id,
                product.manufacturer_id,
                product.units,
                product.unit_type,
                product.rate,
                product.brokerage_per_unit || 0,
                product.brokerage || 0,
                product.total
              ],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Update product stock quantity (+ incoming stock)
          await new Promise<void>((resolve, reject) => {
            db.run(
              'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
              [product.units, product.product_id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Add stock history entry
          await new Promise<void>((resolve, reject) => {
            console.log('📝 Adding stock history for broker transaction:', {
              product_id: product.product_id,
              type: 'in',
              quantity: product.units,
              broker_id: data.broker_id,
              manufacturer_id: product.manufacturer_id,
              transaction_id: data.id
            });
            db.run(
              `INSERT INTO stock_history (id, product_id, date, time, type, quantity, notes, broker_id, manufacturer_id, transaction_id, leisure_created)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('sh'),
                product.product_id,
                data.date,
                data.time || null,
                'in',
                product.units,
                `Broker transaction ${data.invoice_number || data.id}`,
                data.broker_id,
                product.manufacturer_id,
                data.id,
                0
              ],
              function(err) {
                if (err) {
                  console.error('❌ Failed to insert stock history for broker transaction:', err);
                  reject(err);
                } else {
                  console.log('✅ Stock history inserted for broker transaction, id:', this.lastID);
                  resolve();
                }
              }
            );
          });

          // Update manufacturer stock (manufacturer records should already exist from Settings)
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE product_manufacturers SET quantity = quantity + ? WHERE product_id = ? AND manufacturer_id = ?`,
              [product.units, product.product_id, product.manufacturer_id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Create leisure record for the transaction amount
      if (data.broker_id) {
        // Get broker name
        const broker = await new Promise<any>((resolve, reject) => {
          db.get('SELECT name FROM brokers WHERE id = ?', [data.broker_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (broker) {
          await new Promise<void>((resolve, reject) => {
            // Map payment method to leisure table format
            const leisurePaymentMethod = data.payment_method === 'cash' ? 'Cash' : data.payment_method || 'Cash';
            db.run(
              `INSERT INTO broker_leisures (id, broker_id, broker_name, type, amount, brokerage, transaction_id, payment_method, date, time, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('bl'),
                data.broker_id,
                broker.name,
                'purchase',
                data.total_amount, // Use total_amount for leisure amount
                data.total_brokerage || 0,
                data.id,
                leisurePaymentMethod,
                data.date,
                data.time || null,
                `Payment pending for transaction ${data.invoice_number || data.id}`
              ],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Update broker totals after creating leisure record
          await updateBrokerTotals(data.broker_id);
        }
      }

      return { id: data.id };
    });
  },

  update: (id: string, data: Partial<{
    broker_id: string;
    date: string;
    time: string;
    invoice_number: string;
    total_amount: number;
    total_brokerage: number;
    previous_balance: number;
    payment_method: string;
    notes: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.broker_id !== undefined) {
        updates.push('broker_id = ?');
        values.push(data.broker_id);
      }
      if (data.date !== undefined) {
        updates.push('date = ?');
        values.push(data.date);
      }
      if (data.time !== undefined) {
        updates.push('time = ?');
        values.push(data.time);
      }
      if (data.invoice_number !== undefined) {
        updates.push('invoice_number = ?');
        values.push(data.invoice_number);
      }
      if (data.total_amount !== undefined) {
        updates.push('total_amount = ?');
        values.push(data.total_amount);
      }
      if (data.total_brokerage !== undefined) {
        updates.push('total_brokerage = ?');
        values.push(data.total_brokerage);
      }
      if (data.previous_balance !== undefined) {
        updates.push('previous_balance = ?');
        values.push(data.previous_balance);
      }
      if (data.payment_method !== undefined) {
        updates.push('payment_method = ?');
        values.push(data.payment_method);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE broker_transactions SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) { reject(err); return; }
          if (data.total_amount !== undefined || data.total_brokerage !== undefined) {
            const leisureUpdates: string[] = [];
            const leisureValues: any[] = [];
            if (data.total_amount !== undefined) {
              leisureUpdates.push('amount = ?');
              leisureValues.push(data.total_amount);
            }
            if (data.total_brokerage !== undefined) {
              leisureUpdates.push('brokerage = ?');
              leisureValues.push(data.total_brokerage);
            }
            leisureValues.push(id);
            leisureValues.push('purchase');
            db.run(`UPDATE broker_leisures SET ${leisureUpdates.join(', ')} WHERE transaction_id = ? AND type = ?`, leisureValues, () => {
              if (data.broker_id) {
                updateBrokerTotals(data.broker_id).then(() => resolve({ changes: 1 })).catch(() => resolve({ changes: 1 }));
              } else {
                resolve({ changes: 1 });
              }
            });
          } else {
            resolve({ changes: this.changes }); }
        }
      );
    });
  },

  delete: (id: string) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Get transaction details and associated "toBePaid" leisure
      const transaction = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM broker_transactions WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Find associated "purchase" leisure record
      const associatedLeisure = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM broker_leisures WHERE transaction_id = ? AND type = ?', [id, 'purchase'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Delete associated "purchase" leisure first (if exists)
      if (associatedLeisure) {
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM broker_leisures WHERE id = ?', [associatedLeisure.id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Reverse stock history changes
      await reverseBrokerTransactionStock(id);

      // Delete transaction (CASCADE deletes products)
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM broker_transactions WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Recalculate broker totals
      if (transaction.broker_id) {
        await updateBrokerTotals(transaction.broker_id);
      }

      return { changes: 1 };
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get(
        `SELECT bt.*,
                json_group_array(
                  json_object(
                    'product_id', btp.product_id,
                    'manufacturer_id', btp.manufacturer_id,
                    'units', btp.units,
                    'unit_type', btp.unit_type,
                    'rate', btp.rate,
                    'brokerage_per_unit', btp.brokerage_per_unit,
                    'brokerage', btp.brokerage,
                    'total', btp.total
                  )
                ) as products_json
         FROM broker_transactions bt
         LEFT JOIN broker_transaction_products btp ON bt.id = btp.transaction_id
         WHERE bt.id = ?
         GROUP BY bt.id`,
        [id],
        (err, row: any) => {
          if (err) reject(err);
          else if (row) {
            // Parse products JSON
            const products = row.products_json && row.products_json !== '[null]'
              ? JSON.parse(row.products_json)
              : [];
            resolve({ ...row, products });
          } else {
            resolve(null);
          }
        }
      );
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        `SELECT bt.*,
                json_group_array(
                  json_object(
                    'product_id', btp.product_id,
                    'manufacturer_id', btp.manufacturer_id,
                    'units', btp.units,
                    'unit_type', btp.unit_type,
                    'rate', btp.rate,
                    'brokerage_per_unit', btp.brokerage_per_unit,
                    'brokerage', btp.brokerage,
                    'total', btp.total
                  )
                ) as products_json
         FROM broker_transactions bt
         LEFT JOIN broker_transaction_products btp ON bt.id = btp.transaction_id
         GROUP BY bt.id
         ORDER BY bt.date DESC, bt.time DESC`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            // Parse products JSON for each row
            const transactions = rows.map(row => {
              const products = row.products_json && row.products_json !== '[null]'
                ? JSON.parse(row.products_json)
                : [];
              return { ...row, products };
            });
            resolve(transactions);
          }
        }
      );
    });
  },

  getByBrokerId: (brokerId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        `SELECT bt.*,
                json_group_array(
                  json_object(
                    'product_id', btp.product_id,
                    'manufacturer_id', btp.manufacturer_id,
                    'units', btp.units,
                    'unit_type', btp.unit_type,
                    'rate', btp.rate,
                    'brokerage_per_unit', btp.brokerage_per_unit,
                    'brokerage', btp.brokerage,
                    'total', btp.total
                  )
                ) as products_json
         FROM broker_transactions bt
         LEFT JOIN broker_transaction_products btp ON bt.id = btp.transaction_id
         WHERE bt.broker_id = ?
         GROUP BY bt.id
         ORDER BY bt.date DESC, bt.time DESC`,
        [brokerId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const transactions = rows.map(row => {
              const products = row.products_json && row.products_json !== '[null]'
                ? JSON.parse(row.products_json)
                : [];
              return { ...row, products };
            });
            resolve(transactions);
          }
        }
      );
    });
  }
};

// Customer Transactions
export const customerTransactions = {
  insert: (data: {
    id: string;
    customer_id?: string;
    date: string;
    time?: string;
    invoice_number?: string;
    total_amount: number;
    labour_charge?: number;
    previous_balance?: number;
    payment_method?: string;
    notes?: string;
    products?: Array<{
      product_id: string;
      manufacturer_id: string;
      quantity: number;
      unit_type: string;
      price: number;
      labour: number;
      total: number;
    }>;
  }) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Insert main transaction
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO customer_transactions (id, customer_id, date, time, invoice_number, total_amount, labour_charge, previous_balance, payment_method, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.customer_id || null,
            data.date,
            data.time || null,
            data.invoice_number || null,
            data.total_amount,
            data.labour_charge || 0,
            data.previous_balance || 0,
            data.payment_method || 'cash',
            data.notes || ''
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert transaction products and update stock
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          // Insert transaction product
          await new Promise<void>((resolve, reject) => {
            db.run(
              `INSERT INTO customer_transaction_products (id, transaction_id, product_id, manufacturer_id, quantity, unit_type, price, labour, total)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('ctp'),
                data.id,
                product.product_id,
                product.manufacturer_id,
                product.quantity,
                product.unit_type,
                product.price,
                product.labour,
                product.total
              ],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Update product stock quantity (- outgoing stock)
          await new Promise<void>((resolve, reject) => {
            db.run(
              'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
              [product.quantity, product.product_id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Add stock history entry
          await new Promise<void>((resolve, reject) => {
            console.log('📝 Adding stock history for customer transaction:', {
              product_id: product.product_id,
              type: 'out',
              quantity: product.quantity,
              customer_id: data.customer_id,
              manufacturer_id: product.manufacturer_id,
              transaction_id: data.id
            });
            db.run(
              `INSERT INTO stock_history (id, product_id, date, time, type, quantity, notes, broker_id, manufacturer_id, transaction_id, leisure_created)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('sh'),
                product.product_id,
                data.date,
                data.time || null,
                'out',
                product.quantity,
                `Customer transaction ${data.invoice_number || data.id}`,
                null, // No broker for customer transactions
                product.manufacturer_id,
                data.id,
                0
              ],
              function(err) {
                if (err) {
                  console.error('❌ Failed to insert stock history for customer transaction:', err);
                  reject(err);
                } else {
                  console.log('✅ Stock history inserted for customer transaction, id:', this.lastID);
                  resolve();
                }
              }
            );
          });

          // Update manufacturer stock (manufacturer records should already exist from Settings)
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE product_manufacturers SET quantity = quantity - ? WHERE product_id = ? AND manufacturer_id = ?`,
              [product.quantity, product.product_id, product.manufacturer_id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Create leisure record for the transaction amount
      if (data.customer_id) {
        // Get customer name
        const customer = await new Promise<any>((resolve, reject) => {
          db.get('SELECT name FROM customers WHERE id = ?', [data.customer_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (customer) {
          await new Promise<void>((resolve, reject) => {
            // Map payment method to leisure table format
            const leisurePaymentMethod = data.payment_method === 'cash' ? 'Cash' : data.payment_method || 'Cash';
            db.run(
              `INSERT INTO customer_leisures (id, customer_id, customer_name, type, amount, transaction_id, payment_method, date, time, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId('cl'),
                data.customer_id,
                customer.name,
                'receivable',
                data.total_amount, // Use total_amount for leisure amount
                data.id,
                leisurePaymentMethod,
                data.date,
                data.time || null,
                `Payment pending for transaction ${data.invoice_number || data.id}`
              ],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          // Update customer totals after creating leisure record
          await updateCustomerTotals(data.customer_id);
        }
      }

      return { id: data.id };
    });
  },

  update: (id: string, data: Partial<{
    customer_id: string;
    date: string;
    time: string;
    invoice_number: string;
    total_amount: number;
    labour_charge: number;
    previous_balance: number;
    payment_method: string;
    notes: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.customer_id !== undefined) {
        updates.push('customer_id = ?');
        values.push(data.customer_id);
      }
      if (data.date !== undefined) {
        updates.push('date = ?');
        values.push(data.date);
      }
      if (data.time !== undefined) {
        updates.push('time = ?');
        values.push(data.time);
      }
      if (data.invoice_number !== undefined) {
        updates.push('invoice_number = ?');
        values.push(data.invoice_number);
      }
      if (data.total_amount !== undefined) {
        updates.push('total_amount = ?');
        values.push(data.total_amount);
      }
      if (data.labour_charge !== undefined) {
        updates.push('labour_charge = ?');
        values.push(data.labour_charge);
      }
      if (data.previous_balance !== undefined) {
        updates.push('previous_balance = ?');
        values.push(data.previous_balance);
      }
      if (data.payment_method !== undefined) {
        updates.push('payment_method = ?');
        values.push(data.payment_method);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE customer_transactions SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // Get transaction details and associated "toBePaid" leisure
      const transaction = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM customer_transactions WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Find associated "receivable" leisure record
      const associatedLeisure = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM customer_leisures WHERE transaction_id = ? AND type = ?', [id, 'receivable'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Delete associated "receivable" leisure first (if exists)
      if (associatedLeisure) {
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM customer_leisures WHERE id = ?', [associatedLeisure.id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Reverse stock history changes
      await reverseCustomerTransactionStock(id);

      // Delete transaction (CASCADE deletes products)
      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM customer_transactions WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Recalculate customer totals
      if (transaction.customer_id) {
        await updateCustomerTotals(transaction.customer_id);
      }

      return { changes: 1 };
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get(
        `SELECT ct.*,
                json_group_array(
                  json_object(
                    'product_id', ctp.product_id,
                    'manufacturer_id', ctp.manufacturer_id,
                    'quantity', ctp.quantity,
                    'unit_type', ctp.unit_type,
                    'price', ctp.price,
                    'labour', ctp.labour,
                    'total', ctp.total
                  )
                ) as products_json
         FROM customer_transactions ct
         LEFT JOIN customer_transaction_products ctp ON ct.id = ctp.transaction_id
         WHERE ct.id = ?
         GROUP BY ct.id`,
        [id],
        (err, row: any) => {
          if (err) reject(err);
          else if (row) {
            const products = row.products_json && row.products_json !== '[null]'
              ? JSON.parse(row.products_json)
              : [];
            resolve({ ...row, products });
          } else {
            resolve(null);
          }
        }
      );
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        `SELECT ct.*,
                json_group_array(
                  json_object(
                    'product_id', ctp.product_id,
                    'manufacturer_id', ctp.manufacturer_id,
                    'quantity', ctp.quantity,
                    'unit_type', ctp.unit_type,
                    'price', ctp.price,
                    'labour', ctp.labour,
                    'total', ctp.total
                  )
                ) as products_json
         FROM customer_transactions ct
         LEFT JOIN customer_transaction_products ctp ON ct.id = ctp.transaction_id
         GROUP BY ct.id
         ORDER BY ct.date DESC, ct.time DESC`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const transactions = rows.map(row => {
              const products = row.products_json && row.products_json !== '[null]'
                ? JSON.parse(row.products_json)
                : [];
              return { ...row, products };
            });
            resolve(transactions);
          }
        }
      );
    });
  },

  getByCustomerId: (customerId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        `SELECT ct.*,
                json_group_array(
                  json_object(
                    'product_id', ctp.product_id,
                    'manufacturer_id', ctp.manufacturer_id,
                    'quantity', ctp.quantity,
                    'unit_type', ctp.unit_type,
                    'price', ctp.price,
                    'labour', ctp.labour,
                    'total', ctp.total
                  )
                ) as products_json
         FROM customer_transactions ct
         LEFT JOIN customer_transaction_products ctp ON ct.id = ctp.transaction_id
         WHERE ct.customer_id = ?
         GROUP BY ct.id
         ORDER BY ct.date DESC, ct.time DESC`,
        [customerId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const transactions = rows.map(row => {
              const products = row.products_json && row.products_json !== '[null]'
                ? JSON.parse(row.products_json)
                : [];
              return { ...row, products };
            });
            resolve(transactions);
          }
        }
      );
    });
  }
};

// ===========================================
// LEISURES (PAYMENTS)
// ===========================================

// Broker Leisures
export const brokerLeisures = {
  insert: (data: {
    id: string;
    broker_id: string;
    broker_name: string;
    type: 'purchase' | 'payable';
    amount: number;
    brokerage?: number;
    transaction_id?: string;
    payment_method?: string;
    date: string;
    time?: string;
    notes?: string;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO broker_leisures (id, broker_id, broker_name, type, amount, brokerage, transaction_id, payment_method, date, time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.broker_id,
          data.broker_name,
          data.type,
          data.amount,
          data.brokerage || 0,
          data.transaction_id || null,
          data.payment_method || null,
          data.date,
          data.time || null,
          data.notes || ''
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    broker_id: string;
    broker_name: string;
    type: 'purchase' | 'payable';
    amount: number;
    brokerage: number;
    transaction_id: string;
    payment_method: string;
    date: string;
    time: string;
    notes: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.broker_id !== undefined) {
        updates.push('broker_id = ?');
        values.push(data.broker_id);
      }
      if (data.broker_name !== undefined) {
        updates.push('broker_name = ?');
        values.push(data.broker_name);
      }
      if (data.type !== undefined) {
        updates.push('type = ?');
        values.push(data.type);
      }
      if (data.amount !== undefined) {
        updates.push('amount = ?');
        values.push(data.amount);
      }
      if (data.brokerage !== undefined) {
        updates.push('brokerage = ?');
        values.push(data.brokerage);
      }
      if (data.transaction_id !== undefined) {
        updates.push('transaction_id = ?');
        values.push(data.transaction_id);
      }
      if (data.payment_method !== undefined) {
        updates.push('payment_method = ?');
        values.push(data.payment_method);
      }
      if (data.date !== undefined) {
        updates.push('date = ?');
        values.push(data.date);
      }
      if (data.time !== undefined) {
        updates.push('time = ?');
        values.push(data.time);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE broker_leisures SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();

      // Get leisure details to check type and transaction_id
      db.get('SELECT * FROM broker_leisures WHERE id = ?', [id], (err, leisure: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!leisure) {
          reject(new Error('Leisure record not found'));
          return;
        }

        // If this is a "purchase" leisure with an associated transaction, delete the transaction
        if (leisure.type === 'purchase' && leisure.transaction_id) {
          // Delete the associated transaction (this will trigger transaction deletion logic)
          // Don't wrap in runTransaction here to avoid nested transactions
          brokerTransactions.delete(leisure.transaction_id)
            .then(() => {
              // Transaction deletion already handles leisure deletion and total recalculation
              resolve({ changes: 1 });
            })
            .catch(reject);
        } else {
          // Normal deletion for "payable" leisures or leisures without transaction_id
          runTransaction(async () => {
            await new Promise<void>((resolveTransaction, rejectTransaction) => {
              db.run('DELETE FROM broker_leisures WHERE id = ?', [id], function(err) {
                if (err) rejectTransaction(err);
                else resolveTransaction();
              });
            });

            // Recalculate broker totals
            if (leisure.broker_id) {
              await updateBrokerTotals(leisure.broker_id);
            }

            return { changes: 1 };
          })
            .then(result => resolve(result))
            .catch(reject);
        }
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM broker_leisures WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM broker_leisures ORDER BY date DESC, time DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getByBrokerId: (brokerId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        'SELECT * FROM broker_leisures WHERE broker_id = ? ORDER BY date DESC, time DESC',
        [brokerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
};

// Customer Leisures
export const customerLeisures = {
  insert: (data: {
    id: string;
    customer_id: string;
    customer_name: string;
    type: 'receivable' | 'sale';
    amount: number;
    transaction_id?: string;
    payment_method?: string;
    date: string;
    time?: string;
    notes?: string;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO customer_leisures (id, customer_id, customer_name, type, amount, transaction_id, payment_method, date, time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.customer_id,
          data.customer_name,
          data.type,
          data.amount,
          data.transaction_id || null,
          data.payment_method || null,
          data.date,
          data.time || null,
          data.notes || ''
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    customer_id: string;
    customer_name: string;
    type: 'receivable' | 'sale';
    amount: number;
    transaction_id: string;
    payment_method: string;
    date: string;
    time: string;
    notes: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.customer_id !== undefined) {
        updates.push('customer_id = ?');
        values.push(data.customer_id);
      }
      if (data.customer_name !== undefined) {
        updates.push('customer_name = ?');
        values.push(data.customer_name);
      }
      if (data.type !== undefined) {
        updates.push('type = ?');
        values.push(data.type);
      }
      if (data.amount !== undefined) {
        updates.push('amount = ?');
        values.push(data.amount);
      }
      if (data.transaction_id !== undefined) {
        updates.push('transaction_id = ?');
        values.push(data.transaction_id);
      }
      if (data.payment_method !== undefined) {
        updates.push('payment_method = ?');
        values.push(data.payment_method);
      }
      if (data.date !== undefined) {
        updates.push('date = ?');
        values.push(data.date);
      }
      if (data.time !== undefined) {
        updates.push('time = ?');
        values.push(data.time);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE customer_leisures SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();

      // Get leisure details to check type and transaction_id
      db.get('SELECT * FROM customer_leisures WHERE id = ?', [id], (err, leisure: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!leisure) {
          reject(new Error('Leisure record not found'));
          return;
        }

        // If this is a "receivable" leisure with an associated transaction, delete the transaction
        if (leisure.type === 'receivable' && leisure.transaction_id) {
          // Delete the associated transaction (this will trigger transaction deletion logic)
          // Don't wrap in runTransaction here to avoid nested transactions
          customerTransactions.delete(leisure.transaction_id)
            .then(() => {
              // Transaction deletion already handles leisure deletion and total recalculation
              resolve({ changes: 1 });
            })
            .catch(reject);
        } else {
          // Normal deletion for "sale" leisures or leisures without transaction_id
          runTransaction(async () => {
            await new Promise<void>((resolveTransaction, rejectTransaction) => {
              db.run('DELETE FROM customer_leisures WHERE id = ?', [id], function(err) {
                if (err) rejectTransaction(err);
                else resolveTransaction();
              });
            });

            // Recalculate customer totals
            if (leisure.customer_id) {
              await updateCustomerTotals(leisure.customer_id);
            }

            return { changes: 1 };
          })
            .then(result => resolve(result))
            .catch(reject);
        }
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM customer_leisures WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM customer_leisures ORDER BY date DESC, time DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getByCustomerId: (customerId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        'SELECT * FROM customer_leisures WHERE customer_id = ? ORDER BY date DESC, time DESC',
        [customerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
};

// ===========================================
// PRODUCT MANUFACTURERS
// ===========================================

export const productManufacturers = {
  insert: (data: {
    id: string;
    product_id: string;
    manufacturer_id: string;
    manufacturer_name: string;
    quantity: number;
  }) => {
    console.log('🆕 productManufacturers.insert called with:', data);
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      // Use INSERT OR REPLACE to handle updates
      db.run(
        `INSERT OR REPLACE INTO product_manufacturers (id, product_id, manufacturer_id, manufacturer_name, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.id,
          data.product_id,
          data.manufacturer_id,
          data.manufacturer_name,
          data.quantity
        ],
        function(err) {
          if (err) {
            console.error('❌ productManufacturers.insert failed:', err);
            reject(err);
          } else {
            console.log('✅ productManufacturers.insert succeeded, id:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    product_id: string;
    manufacturer_id: string;
    manufacturer_name: string;
    quantity: number;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.product_id !== undefined) {
        updates.push('product_id = ?');
        values.push(data.product_id);
      }
      if (data.manufacturer_id !== undefined) {
        updates.push('manufacturer_id = ?');
        values.push(data.manufacturer_id);
      }
      if (data.manufacturer_name !== undefined) {
        updates.push('manufacturer_name = ?');
        values.push(data.manufacturer_name);
      }
      if (data.quantity !== undefined) {
        updates.push('quantity = ?');
        values.push(data.quantity);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(id);

      db.run(
        `UPDATE product_manufacturers SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  archive: (id: string) => {
    return runTransaction(async () => {
      const db = dbManager.getDatabase();

      // First get the product_id for this manufacturer
      const manufacturer = await new Promise<any>((resolve, reject) => {
        db.get('SELECT product_id FROM product_manufacturers WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!manufacturer) {
        throw new Error('Manufacturer not found');
      }

      // Archive the manufacturer
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE product_manufacturers SET is_archived = 1 WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Check if this was the last active manufacturer for this product
      const activeCount = await new Promise<number>((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM product_manufacturers WHERE product_id = ? AND is_archived = 0',
          [manufacturer.product_id],
          (err, row: any) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      // If no active manufacturers remain, also archive the product
      if (activeCount === 0) {
        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE products SET is_archived = 1 WHERE id = ?', [manufacturer.product_id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      return { changes: 1 };
    });
  },

  unarchive: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();

      // First check if parent product is archived
      db.get(
        `SELECT pm.product_id, p.is_archived as product_archived, p.name as product_name, pm.manufacturer_name
         FROM product_manufacturers pm
         JOIN products p ON pm.product_id = p.id
         WHERE pm.id = ?`,
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            reject(new Error('Manufacturer not found'));
            return;
          }

          if (row.product_archived) {
            reject(new Error(`Cannot unarchive manufacturer "${row.manufacturer_name}" because its parent product "${row.product_name}" is still archived. Please unarchive the product first.`));
            return;
          }

          // Proceed with unarchiving
          db.run('UPDATE product_manufacturers SET is_archived = 0 WHERE id = ?', [id], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM product_manufacturers WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM product_manufacturers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM product_manufacturers ORDER BY product_id, manufacturer_name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getByProductId: (productId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        'SELECT * FROM product_manufacturers WHERE product_id = ? ORDER BY manufacturer_name',
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getArchived: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      // Get archived manufacturers with their product names
      const query = `
        SELECT
          pm.*,
          p.name as product_name
        FROM product_manufacturers pm
        JOIN products p ON pm.product_id = p.id
        WHERE pm.is_archived = 1
        ORDER BY pm.manufacturer_name
      `;

      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// ===========================================
// STOCK HISTORY
// ===========================================

export const stockHistory = {
  insert: (data: {
    product_id: string;
    date: string;
    time?: string;
    type: 'in' | 'out';
    quantity: number;
    notes?: string;
    broker_id?: string;
    manufacturer_id?: string;
    transaction_id?: string;
    leisure_created?: boolean;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO stock_history (product_id, date, time, type, quantity, notes, broker_id, manufacturer_id, transaction_id, leisure_created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.product_id,
          data.date,
          data.time || null,
          data.type,
          data.quantity,
          data.notes || '',
          data.broker_id || null,
          data.manufacturer_id || null,
          data.transaction_id || null,
          data.leisure_created ? 1 : 0
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    product_id: string;
    date: string;
    time: string;
    type: 'in' | 'out';
    quantity: number;
    notes: string;
    broker_id: string;
    manufacturer_id: string;
    leisure_created: boolean;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.product_id !== undefined) {
        updates.push('product_id = ?');
        values.push(data.product_id);
      }
      if (data.date !== undefined) {
        updates.push('date = ?');
        values.push(data.date);
      }
      if (data.time !== undefined) {
        updates.push('time = ?');
        values.push(data.time);
      }
      if (data.type !== undefined) {
        updates.push('type = ?');
        values.push(data.type);
      }
      if (data.quantity !== undefined) {
        updates.push('quantity = ?');
        values.push(data.quantity);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }
      if (data.broker_id !== undefined) {
        updates.push('broker_id = ?');
        values.push(data.broker_id);
      }
      if (data.manufacturer_id !== undefined) {
        updates.push('manufacturer_id = ?');
        values.push(data.manufacturer_id);
      }
      if (data.leisure_created !== undefined) {
        updates.push('leisure_created = ?');
        values.push(data.leisure_created ? 1 : 0);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('created_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE stock_history SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM stock_history WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM stock_history WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM stock_history ORDER BY date DESC, time DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getByProductId: (productId: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        'SELECT * FROM stock_history WHERE product_id = ? ORDER BY date DESC, time DESC',
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getByDateRange: (startDate: string, endDate: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all(
        'SELECT * FROM stock_history WHERE date BETWEEN ? AND ? ORDER BY date DESC, time DESC',
        [startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
};

// ===========================================
// TRANSACTION PRODUCTS
// ===========================================

export const brokerTransactionProducts = {
  insert: (data: {
    id: string;
    transaction_id: string;
    product_id: string;
    manufacturer_id: string;
    units: number;
    unit_type: string;
    rate: number;
    total: number;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO broker_transaction_products (id, transaction_id, product_id, manufacturer_id, units, unit_type, rate, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.transaction_id,
          data.product_id,
          data.manufacturer_id,
          data.units,
          data.unit_type,
          data.rate,
          data.total
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    transaction_id: string;
    product_id: string;
    manufacturer_id: string;
    units: number;
    unit_type: string;
    rate: number;
    total: number;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.transaction_id !== undefined) {
        updates.push('transaction_id = ?');
        values.push(data.transaction_id);
      }
      if (data.product_id !== undefined) {
        updates.push('product_id = ?');
        values.push(data.product_id);
      }
      if (data.manufacturer_id !== undefined) {
        updates.push('manufacturer_id = ?');
        values.push(data.manufacturer_id);
      }
      if (data.units !== undefined) {
        updates.push('units = ?');
        values.push(data.units);
      }
      if (data.unit_type !== undefined) {
        updates.push('unit_type = ?');
        values.push(data.unit_type);
      }
      if (data.rate !== undefined) {
        updates.push('rate = ?');
        values.push(data.rate);
      }
      if (data.total !== undefined) {
        updates.push('total = ?');
        values.push(data.total);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(id);

      db.run(
        `UPDATE broker_transaction_products SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM broker_transaction_products WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM broker_transaction_products WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM broker_transaction_products ORDER BY transaction_id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const customerTransactionProducts = {
  insert: (data: {
    id: string;
    transaction_id: string;
    product_id: string;
    manufacturer_id: string;
    quantity: number;
    unit_type: string;
    price: number;
    labour: number;
    total: number;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO customer_transaction_products (id, transaction_id, product_id, manufacturer_id, quantity, unit_type, price, labour, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.transaction_id,
          data.product_id,
          data.manufacturer_id,
          data.quantity,
          data.unit_type,
          data.price,
          data.labour,
          data.total
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    transaction_id: string;
    product_id: string;
    manufacturer_id: string;
    quantity: number;
    unit_type: string;
    price: number;
    labour: number;
    total: number;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.transaction_id !== undefined) {
        updates.push('transaction_id = ?');
        values.push(data.transaction_id);
      }
      if (data.product_id !== undefined) {
        updates.push('product_id = ?');
        values.push(data.product_id);
      }
      if (data.manufacturer_id !== undefined) {
        updates.push('manufacturer_id = ?');
        values.push(data.manufacturer_id);
      }
      if (data.quantity !== undefined) {
        updates.push('quantity = ?');
        values.push(data.quantity);
      }
      if (data.unit_type !== undefined) {
        updates.push('unit_type = ?');
        values.push(data.unit_type);
      }
      if (data.price !== undefined) {
        updates.push('price = ?');
        values.push(data.price);
      }
      if (data.labour !== undefined) {
        updates.push('labour = ?');
        values.push(data.labour);
      }
      if (data.total !== undefined) {
        updates.push('total = ?');
        values.push(data.total);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      values.push(id);

      db.run(
        `UPDATE customer_transaction_products SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM customer_transaction_products WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM customer_transaction_products WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM customer_transaction_products ORDER BY transaction_id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// ===========================================
// SETTINGS
// ===========================================

// Business settings operations
export const businessSettings = {
  insert: (data: {
    id?: number;
    business_name: string;
    address: string;
    proprietor_name: string;
    phone_numbers: string;
    invoice_whatsapp_template?: string;
    logo_path?: string;
    header_banner_path?: string;
    qr_code_path?: string;
    default_invoice_template?: string;
    invoice_accent_color?: string;
    print_copies?: number;
    print_layout_mode?: string;
    custom_footer_text?: string;
  }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      // Business settings table only allows id = 1
      const id = data.id || 1;
      const template = data.invoice_whatsapp_template || 'Tax Invoice for {partyName} dated {dateStr}';
      db.run(
        `INSERT OR REPLACE INTO business_settings (id, business_name, address, proprietor_name, phone_numbers, invoice_whatsapp_template, logo_path, header_banner_path, qr_code_path, default_invoice_template, invoice_accent_color, print_copies, print_layout_mode, custom_footer_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.business_name,
          data.address,
          data.proprietor_name,
          data.phone_numbers,
          template,
          data.logo_path || null,
          data.header_banner_path || null,
          data.qr_code_path || null,
          data.default_invoice_template || 'standard_a4',
          data.invoice_accent_color || '#2563eb',
          data.print_copies || 1,
          data.print_layout_mode || 'single',
          data.custom_footer_text || ''
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{
    business_name: string;
    address: string;
    proprietor_name: string;
    phone_numbers: string;
    invoice_whatsapp_template: string;
    logo_path: string | null;
    header_banner_path: string | null;
    qr_code_path: string | null;
    default_invoice_template: string;
    invoice_accent_color: string;
    print_copies: number;
    print_layout_mode: string;
    custom_footer_text: string;
  }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();

      // Use INSERT OR REPLACE to ensure the row exists
      // First get current data, then merge with updates
      db.get('SELECT * FROM business_settings WHERE id = ?', [id], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        const currentData = row || {
          id: parseInt(id),
          business_name: '',
          address: '',
          proprietor_name: '',
          phone_numbers: '[""]',
          invoice_whatsapp_template: 'Tax Invoice for {partyName} dated {dateStr}',
          logo_path: null,
          header_banner_path: null,
          qr_code_path: null,
          default_invoice_template: 'standard_a4',
          invoice_accent_color: '#2563eb',
          print_copies: 1,
          print_layout_mode: 'single',
          custom_footer_text: ''
        };

        const updatedData = {
          id: parseInt(id),
          business_name: data.business_name !== undefined ? data.business_name : currentData.business_name,
          address: data.address !== undefined ? data.address : currentData.address,
          proprietor_name: data.proprietor_name !== undefined ? data.proprietor_name : currentData.proprietor_name,
          phone_numbers: data.phone_numbers !== undefined ? data.phone_numbers : currentData.phone_numbers,
          invoice_whatsapp_template: data.invoice_whatsapp_template !== undefined ? data.invoice_whatsapp_template : currentData.invoice_whatsapp_template,
          logo_path: data.logo_path !== undefined ? data.logo_path : currentData.logo_path,
          header_banner_path: data.header_banner_path !== undefined ? data.header_banner_path : currentData.header_banner_path,
          qr_code_path: data.qr_code_path !== undefined ? data.qr_code_path : currentData.qr_code_path,
          default_invoice_template: data.default_invoice_template !== undefined ? data.default_invoice_template : currentData.default_invoice_template,
          invoice_accent_color: data.invoice_accent_color !== undefined ? data.invoice_accent_color : currentData.invoice_accent_color,
          print_copies: data.print_copies !== undefined ? data.print_copies : currentData.print_copies,
          print_layout_mode: data.print_layout_mode !== undefined ? data.print_layout_mode : currentData.print_layout_mode,
          custom_footer_text: data.custom_footer_text !== undefined ? data.custom_footer_text : currentData.custom_footer_text
        };

        db.run(
          `INSERT OR REPLACE INTO business_settings (id, business_name, address, proprietor_name, phone_numbers, invoice_whatsapp_template, logo_path, header_banner_path, qr_code_path, default_invoice_template, invoice_accent_color, print_copies, print_layout_mode, custom_footer_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            updatedData.id,
            updatedData.business_name,
            updatedData.address,
            updatedData.proprietor_name,
            updatedData.phone_numbers,
            updatedData.invoice_whatsapp_template,
            updatedData.logo_path,
            updatedData.header_banner_path,
            updatedData.qr_code_path,
            updatedData.default_invoice_template,
            updatedData.invoice_accent_color,
            updatedData.print_copies,
            updatedData.print_layout_mode,
            updatedData.custom_footer_text
          ],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM business_settings WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM business_settings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM business_settings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};



// ===========================================
// FULL-TEXT SEARCH TABLES (READ-ONLY)
// ===========================================

export const productsFts = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM products_fts ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const brokersFts = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM brokers_fts ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const customersFts = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM customers_fts ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// ===========================================
// DATABASE VIEWS (READ-ONLY)
// ===========================================

export const productStockSummary = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM product_stock_summary ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const brokerTransactionSummary = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM broker_transaction_summary ORDER BY date DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const customerTransactionSummary = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM customer_transaction_summary ORDER BY date DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// ===========================================
// WHATSAPP PRESETS
// ===========================================

export const whatsappPresets = {
  insert: (data: { id: string; title: string; message: string }) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO whatsapp_presets (id, title, message) VALUES (?, ?, ?)`,
        [data.id, data.title, data.message],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  update: (id: string, data: Partial<{ title: string; message: string }>) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      if (data.message !== undefined) {
        updates.push('message = ?');
        values.push(data.message);
      }

      if (updates.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.run(
        `UPDATE whatsapp_presets SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  delete: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.run('DELETE FROM whatsapp_presets WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getById: (id: string) => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.get('SELECT * FROM whatsapp_presets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const db = dbManager.getDatabase();
      db.all('SELECT * FROM whatsapp_presets ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};
