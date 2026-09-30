# Common Errors & How to Solve Them

This guide lists the common alerts and warnings you might see in ScaleERP and how to solve them easily.

---

## 1. Alert: "Duplicate Customer/Broker Found!"
* **What you see:** A warning popup says `Duplicate customer found!` or `Duplicate broker found!` when saving a profile.
* **Why it happens:** You are trying to add a profile with the exact same Name and Contact Number as an existing entry.
* **How to solve it:**
  1. Click **OK** to close the popup.
  2. Use the search bar in the customer/broker directory to see if they are already registered.
  3. If they are not in the list, verify the spelling or phone number. Change the number or add a differentiator (e.g., *“John Doe (Senior)”*) to make it unique.

---

## 2. Warning: "Low Stock Alert"
* **What you see:** A red alert banner in the left sidebar showing `Low Stock Alerts`.
* **Why it happens:** The stock level of one or more manufacturer feeds has dropped below 10 bags/tonnes.
* **How to solve it:**
  1. Click the sidebar warning to see the list of low stock items.
  2. Replenish your warehouse by logging a wholesale purchase under **Broker Transactions**.
  3. The warning banner will disappear automatically once the stock quantity goes back above 10.

---

## 3. Popup: "Unsaved Changes"
* **What you see:** A warning window saying `You have unsaved changes in your settings` when you click on a different sidebar tab.
* **Why it happens:** You modified the business name, address, or print styles under the Settings page, but did not click save.
* **How to solve it:**
  1. Click **Stay** to return to the settings form.
  2. Scroll to the bottom and click the green **Save All Business Settings** button.
  3. You can now navigate away safely. Alternatively, click **Leave** to discard the changes.

---

## 4. Message: "WhatsApp Desktop app not found..."
* **What you see:** A small status toast or message when sending a receipt, followed by your web browser opening.
* **Why it happens:** ScaleERP tried to open the WhatsApp Desktop application, but it is not installed on your computer.
* **How to solve it:**
  * **No action needed!** The app automatically switches to the browser-based **WhatsApp Web (wa.me)** to send your message. Simply scan the QR code in the browser to sign in.

---

## 5. Alert: "Clock Tampering Detected"
* **What you see:** A large red banner saying `Security Alert: Clock Tampering Detected. Data operations disabled.`
* **Why it happens:** The computer's system clock was changed to a past date. This locks the database to prevent trial bypasses or date tampering.
* **How to solve it:**
  1. Close ScaleERP.
  2. Right-click the clock in your Windows taskbar and select **Adjust date and time**.
  3. Toggle **Set time automatically** to ON.
  4. Open ScaleERP, go to the **License** page, and click **Force Check**.
  5. The lockout will clear once the system verifies the time is correct.

---

## 6. Error: "Database File Locked"
* **What you see:** A database error popup when saving transactions.
* **Why it happens:** The SQLite database is locked by another task (usually from closing the app abruptly during a save).
* **How to solve it:**
  * Close the application and open it again. ScaleERP runs on WAL (Write-Ahead Logging) database mode, which automatically cleans and unlocks database files when restarted.
