# Creating and Managing Customer Profiles

ScaleERP tracks all your customers' details, outstanding balances, and payment histories. This guide will show you how to add, edit, and delete customer profiles.

To open this screen, click **Customers** in the left sidebar.

---

## 1. Navigating the Customers Directory
The main Customers screen lists all registered buyers in a table.

> 📸 **Screenshot Placement:** *[The Customer screen showing the Search bar, the "Add New Customer" button, and the customer table with columns like Name, Contact, Address, Pending, Paid, and Actions]*

* **Clickable Names:** Clicking on any customer's name will open their personal ledger screen, showing their full billing history.
* **Pending & Paid Columns:** 
  * **Total Pending (Red):** The money the customer currently owes your shop.
  * **Total Paid (Green):** The total money this customer has paid you since they were registered.
* **Search Bar:** Type a name, phone number, or address to filter the customer list instantly.

---

## 2. Adding a New Customer Profile
When a new customer visits your shop:

1. Click the blue **Add New Customer** button at the top of the page.
2. A window will pop up with three text boxes:
   - **Customer Name:** Enter the full name.
   - **Contact:** Enter their phone number.
   - **Address:** Enter their home address or village name.
3. Click the blue **Add Customer** button at the bottom of the popup.

### Duplicate Customer Protection
To prevent confusion, ScaleERP will check if a customer with the exact same name and contact number already exists:
* If a duplicate is found, the app will show a warning: `Duplicate customer found!` and will block you from creating it. Click **OK** to close the warning and double-check your entry.

---

## 3. Editing Customer Details
If a customer changes their phone number or address:

> 📸 **Screenshot Placement:** *[Edit Customer Modal showing the editable text fields alongside the read-only Pending and Paid boxes]*

1. Locate the customer in the table and click the blue **Edit** button in the Actions column.
2. Modify the Name, Contact, or Address.
3. *Note: Under the form, you will see their **Total Pending** and **Total Paid** amounts. These are read-only and cannot be manually typed in (they are calculated automatically from transactions).*
4. Click the blue **Update Customer** button to save.

---

## 4. Deleting a Customer Profile
> ⚠️ **CRITICAL WARNING:** Deleting a customer is a permanent action. It will delete the customer profile, all their past invoices, and all their ledger sheets. Use this ONLY if you made a major mistake.

1. Locate the customer and click the red **Delete** button in the table.
2. A custom safety window will pop up.
3. ScaleERP will show a loading spinner saying `"Analyzing Deletion Impact..."` while it checks how many invoices and records are linked to this customer.
4. Review the details showing what will be deleted.
5. If you are certain, click **Confirm Delete**.
6. The app will show a loading bar for 2 seconds to safely complete the database cleanup. Once done, a green success toast will appear, and the app will automatically reload to refresh your data.
