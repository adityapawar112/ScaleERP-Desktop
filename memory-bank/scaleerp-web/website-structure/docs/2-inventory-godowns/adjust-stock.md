# Reviewing Stock History & Ledger Adjustments

In ScaleERP, stock quantities are updated automatically by your everyday transactions, ensuring your records are always accurate and matching your physical godown.

---

## 1. How Stock Updates Automatically
You do not need to manually type in stock changes after every transaction. The app updates quantities based on your entries:
* **Stock In (Additions):** When you log a truck delivery or wholesale purchase on the **Wholesale Purchases** page, ScaleERP automatically adds those bags to your inventory.
* **Stock Out (Deductions):** When you create a retail bill for a customer on the **Retail Billing** page, ScaleERP automatically subtracts those bags from your inventory.

---

## 2. Viewing the Transaction History of a Product
If you want to trace when stock was added, sold, or if there is a discrepancy with your physical count, you can view the complete history.

> 📸 **Screenshot Placement:** *[Transaction History modal popup showing current stock count and list-items of stock additions in green (+100) and sales in red (-5) with dates]*

1. Go to the **Products** page.
2. Find the product category card.
3. Click directly on any active **Manufacturer Card** inside the product (e.g., click on the *Suguna* card).
4. A window titled **Transaction History** will pop up.

---

## 3. Reading the Stock Log
Inside the **Transaction History** window, you will see:
* **Current Stock:** The exact number of bags currently recorded in the app.
* **The Log List:** A chronological list of every stock movement:
  * **Green Numbers (e.g., `+100 units`):** Stock that was added to the Godown. The detail line will show the date, time, and the broker/supplier's name (e.g., `100 units added from transaction Om Agro Industries (2026-05-17 14:30)`).
  * **Red Numbers (e.g., `-5 units`):** Stock that was sold. The detail line will show the customer's name or notes (e.g., `5 units removed - sold to Walk-in (2026-05-17 15:45)`).

Click the **Close** button at the bottom of the window to return to the product list.

---

## 4. What if the Physical Count in the Godown is Different?
If you count your physical stock and find it does not match the number in the app (due to bag damage, spoilage, or keyboard mistakes):
1. **Identify the Mistake:** Use the **Transaction History** log to find the incorrect transaction.
2. **Correct the Transaction:**
   - If a customer bill was entered wrong, go to the **Customer Ledgers** or past invoices and edit the transaction.
   - If a broker delivery was entered wrong, go to the **Wholesale Transactions** and edit the purchase log.
3. Once the incorrect transaction is edited or deleted, ScaleERP will instantly recalculate and fix your inventory counts.
*(Note: If a physical bag is damaged or lost due to mice or weather, you can log a quick "Deduction Note" or contact support to run a manual stock adjustment).*
