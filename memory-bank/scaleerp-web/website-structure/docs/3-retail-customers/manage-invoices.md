# Managing Invoices & Sales History

Every retail transaction is logged in your sales history. This guide will show you how to search past bills, print invoice copies, delete incorrect transactions, and export your history to Excel.

To open this page, click **Retail Sales** in the left sidebar.

---

## 1. Searching and Sorting Past Transactions
The Sales History list displays all completed sales.

> 📸 **Screenshot Placement:** *[The Sales History page showing the search bar, the customer filter dropdown, and the sales history table with sorting columns]*

* **How to Search:** Type a customer’s name, phone number, date, or invoice number in the search bar. The table updates instantly.
* **Customer Filter:** Use the **All Customers** dropdown in the upper right to display sales only for a specific customer.
* **Sorting Columns:** Click on any column header (Customer, Invoice No, Date/Time, Total Amount, etc.) to sort the list.
  - Clicking once sorts in ascending order (A to Z / lowest to highest `↑`).
  - Clicking again sorts in descending order (Z to A / highest to lowest `↓`).
  - Clicking a third time resets to normal.

---

## 2. Invoice Actions
Each line in the history table has three buttons in the **Actions** column:

### A. View Details
Click **View** to open a detailed, read-only summary of the sale. This lists:
- The unique transaction ID.
- Customer name, address, and contact details.
- A table of all products purchased, their brands, and rates.
- Financial summaries (labor fees, previous balances, payment method).

### B. Print/Reprint Invoice
Click **Invoice** to open the print-ready invoice layout.
- The layout reflects the styling, color accent, logo, and QR code you selected in the settings.
- Click **Print Invoice** at the top of the modal to send it to your printer.
- You can open this and reprint an invoice at any time.

### C. Delete/Void a Sale
If a customer cancels their order or you made a billing error:
1. Click the red **Delete** button next to the transaction.
2. A safety window will check the ledger impact of deleting this sale.
3. If confirmed, the transaction is removed. The stock that was sold is added back to your godown automatically, and the customer's ledger is corrected.

---

## 3. Downloading History to Excel
If you need to analyze your sales in Microsoft Excel:
1. Click the green **Download Excel** button at the top of the page.
2. The application will compile all sales logs, product lists, and prices into a formatted spreadsheet.
3. Save the file to your computer.

---

## 4. WhatsApp Sharing Format
When you click **Send Bill on WhatsApp** after creating a sale, ScaleERP formats your invoice text so it is clean and readable on mobile screens.

Here is how the formatted WhatsApp message looks:
```text
*Om Sai Feeds & Fertilizers*
123 Godown Road, Nagpur
Proprietor: Ramesh Pawar
Phone: 9876543210

Invoice No: CUST-INV-2026-1023
Date/Time: 17/05/2026 14:30

Customer Details:
Aditya Pawar
9822000000
Nagpur

Sr|Description|Qty|Rate|Labour|Amount
1|Broiler Finisher (Suguna)|10 units|₹1,500.00|₹0.00|₹15,000.00

Total: ₹15,000.00
Previous Balance: ₹2,500.00
Total Amount: ₹17,500.00
```
This text is copied to your WhatsApp window automatically so you can send it with a single tap.
