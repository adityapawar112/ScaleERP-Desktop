# Creating & Managing Wholesale Transactions

When you purchase bulk feed stock from a supplier or broker to fill your warehouse, you must log a wholesale transaction. This updates your stock quantities, records the broker's commission, and adds the cost to your ledger.

To open this screen, click **Broker Transactions** in the left sidebar.

---

## 1. Entering Wholesale Purchase Details
Click the blue **Add New Transaction** button at the top of the page.

> 📸 **Screenshot Placement:** *[The Add Wholesale Transaction modal showing the searchable broker select dropdown, date/time inputs, and product rows]*

### Step 1: Select the Broker
1. Click the **Broker** box. You can type their name or contact number to search.
2. Select the broker from the list.
3. The **Previous Balance** box on the right will instantly show what you currently owe this broker (in red) or if you are cleared (in green).

### Step 2: Date & Time
* The app automatically sets these to today's current date and time. Leave them as they are unless you are logging a past purchase.

---

## 2. Adding Feed Stock and Commission
1. Under the products section, click the **Add Product** button to add a new line.
2. For each product line, fill in the following:
   - **Product:** Select the feed category (e.g., *Broiler Starter*).
   - **Manufacturer:** Select the brand. *Note: This dropdown is disabled until you pick a product category, and it only lists active brands.*
   - **Unit Type:** Select **Units** (bags) or **Tonnes**.
   - **Units:** Enter the quantity of bags or tonnes you purchased.
   - **Rate:** Enter the purchase rate per bag/tonne.
   - **Brokerage/Unit:** Enter the commission fee you pay the broker per unit.
   - **Brokerage:** Calculates automatically (Units × Brokerage/Unit).
   - **Total:** Calculates automatically (Units × Rate).
3. **Remove Items:** If you add a row by mistake, click the red cross (**×**) in the upper right of that card to delete it.

---

## 3. Completing the Transaction
1. At the bottom of the popup, review:
   - **Payment Method:** Choose Cash or UPI.
   - **Total Brokerage:** Shows the sum of all commissions.
   - **Total Amount:** Shows the final bill sum (Product cost + Brokerage).
2. Click **Add Transaction** to submit.

### Input Validation
* If you leave a product card empty, or if you select a product but enter a quantity of `0` or less, the app will show a red warning banner: `Please enter a quantity greater than 0 for all selected products`. Correct the entry to continue.

---

## 4. Post-Submit: Logging the Payment (Leisure Modal)
As soon as you click **Add Transaction**, a window titled **Add Payment Details** will pop up automatically. This is where you log how much money you paid the supplier upfront.

> 📸 **Screenshot Placement:** *[The Add Payment Details popup modal showing the paid amount input, payment method, date/time, notes, and the action buttons]*

1. **Paid Amount:** Type the exact amount of money you paid the broker.
   - *Example:* If you paid the full amount, enter the total.
   - *Example:* If you bought it on credit and will pay later, enter `0`.
2. **Payment Method:** Choose Cash or UPI.
3. **Notes:** (Optional) Add a reference note.
4. Choose one of the three action buttons:
   * **Save Payment:** Saves the paid amount, updates your outstanding dues, and closes the window.
   * **Send Bill on WhatsApp:** Opens WhatsApp Web with the full text invoice pre-filled so you can send it to their phone.
   * **Skip:** Saves the transaction without logging a payment, meaning the entire invoice total is added to your outstanding credit (payables).

---

## 5. Viewing & Deleting Past Transactions
The table at the bottom of the page logs all past wholesale purchases.

* **Search & Filter:** Type a broker’s name, phone number, date, or invoice number in the search bar, or select a broker from the dropdown to filter the list.
* **Actions:**
  - **View:** Opens a read-only detailed panel of transaction details, products list, and totals.
  - **Invoice:** Opens the print-ready invoice card. Click **Print Invoice** at the top of the modal to print it.
  - **Delete:** Triggers a deletion analysis warning. Deleting a transaction will automatically subtract the purchased stock from your godowns and adjust your outstanding balance with the broker.
* **Excel Export:** Click the green **Download Excel** button at the top of the page to download your entire purchase history as a spreadsheet.
