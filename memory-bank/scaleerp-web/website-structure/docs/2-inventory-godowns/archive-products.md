# Archiving and Restoring Inventory Items

This guide explains how to hide feed bags and manufacturers that you no longer sell, and how to bring them back if you start selling them again.

---

## 1. Archiving vs. Deleting
In business, you must keep records of past sales. 
* **Why Deleting is Risky:** If you completely delete a product from the database, all past invoices, customer bills, and broker ledger sheets that sold that product will break.
* **Why ScaleERP Uses Archiving:** When you **Archive** an item, ScaleERP hides it from your active billing screens so you don't select it by accident. However, it preserves all historical sales records, invoices, and ledgers in the background.

---

## 2. Archiving a Product Category
If you stop selling a product category entirely (e.g., you no longer sell *Layer Mash*):

> 📸 **Screenshot Placement:** *[Product card header with the Archive button highlighted, and the confirmation pop-up modal]*

1. Go to the **Products** page.
2. Find the product category card.
3. Click the small cabinet archive icon (`FiArchive`) on the right side of the card header.
4. A window will pop up asking: *Are you sure you want to archive this product?*
5. Click the yellow **Archive Product** button to confirm.
   - The product card will disappear from your active product list.

---

## 3. Archiving a Specific Manufacturer
If you still sell a product category but stop buying it from a specific company (e.g., you sell *Starter Feed*, but you stopped carrying *Godrej* brand):

1. Find the product category card.
2. Inside that card, locate the card of the manufacturer you want to hide.
3. Click the small yellow folder archive icon (`FiArchive`) at the bottom of the manufacturer card.
4. A confirmation window will pop up. Click **Archive Product** to confirm.
   - *Note: The manufacturer's card will disappear from the product.*

> ⚠️ **The Last Manufacturer Warning:** If you archive the last remaining manufacturer of a product, ScaleERP will automatically archive the entire product category as well. This prevents empty categories from cluttering your screens.

---

## 4. Restoring Archived Products or Manufacturers
If you start carrying an archived brand or product category again, you can restore them easily.

> 📸 **Screenshot Placement:** *[The "View Archived" button highlighted in the upper right, and the archived list showing faded product cards with restore icons]*

1. Click the **View Archived** button in the upper-right corner of the Products page.
2. You will see a list of your archived products (they will look faded).
3. **To Restore a Product:** Click the circular arrow restore icon (`FiRotateCcw`) on the right side of the card header and click **Restore Product** in the confirmation box.
4. **To Restore a Manufacturer:** Find the manufacturer card inside the product, click the green circular arrow restore icon at the bottom of the card, and confirm.
5. Click **Active Products** at the top right to return to your normal inventory list.
   - The restored items will be active and ready to be used on billing forms again.
