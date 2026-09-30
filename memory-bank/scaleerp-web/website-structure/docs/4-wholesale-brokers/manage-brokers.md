# Creating and Managing Broker Profiles

Brokers are the suppliers or distributors from whom you purchase bulk feed stock. ScaleERP helps you track what you owe them and what commission (brokerage) they earn.

To open this screen, click **Brokers** in the left sidebar.

---

## 1. Navigating the Brokers Directory
The main Brokers screen lists all wholesale agents in a table.

> 📸 **Screenshot Placement:** *[The Broker list screen showing search controls, the "Add New Broker" button, and columns like Name, Contact, Address, Pending, Paid, and Actions]*

* **Clickable Names:** Clicking on any broker's name will navigate to their personal ledger sheet, showing their full ledger and total brokerage records.
* **Pending & Paid Columns:** 
  * **Total Pending (Red):** The money you currently owe this broker for purchases.
  * **Total Paid (Green):** The total money you have paid to this broker since registration.
* **Search Bar:** Quickly search by typing a broker’s name, phone number, or city name.

---

## 2. Adding a New Broker Profile
When you start working with a new feed distributor:

1. Click the blue **Add New Broker** button at the top of the page.
2. A window will pop up with three text boxes:
   - **Broker Name:** Enter the full name of the broker or company.
   - **Contact:** Enter their phone number.
   - **Address:** Enter their office or warehouse address.
3. Click the blue **Add Broker** button at the bottom of the popup.

### Duplicate Broker Protection
To prevent duplicate records:
* ScaleERP will check if a broker with the exact same name and contact number already exists in your database.
* If a duplicate is found, the app will show a warning: `Duplicate broker found!` and will block you from creating it. Click **OK** to close the warning and double-check your entry.

---

## 3. Editing Broker Details
To update contact details or addresses:

> 📸 **Screenshot Placement:** *[Edit Broker Modal showing editable fields with the read-only Pending and Paid boxes]*

1. Locate the broker and click the blue **Edit** button in the Actions column.
2. Modify the Name, Contact, or Address.
3. *Note: Under the form, you will see their **Total Pending** and **Total Paid** amounts. These are calculated automatically from purchases and payments and cannot be edited here.*
4. Click the blue **Update Broker** button to save.

---

## 4. Deleting a Broker Profile
> ⚠️ **CRITICAL WARNING:** Deleting a broker is a permanent action. It will delete the broker's profile, all their wholesale purchase invoices, and all their ledger sheets. Use this ONLY if you made a major mistake.

1. Locate the broker and click the red **Delete** button in the table.
2. A safety window will check the ledger impact of deleting this broker.
3. ScaleERP will show a loading spinner saying `"Analyzing Deletion Impact..."` while it checks how many invoices and records are linked to this broker.
4. Review the details showing what will be deleted.
5. If you are certain, click **Confirm Delete**.
6. The app will show a loading spinner for 2 seconds to safely complete the database cleanup. Once done, a green success toast will appear, and the app will automatically reload to refresh your data.
