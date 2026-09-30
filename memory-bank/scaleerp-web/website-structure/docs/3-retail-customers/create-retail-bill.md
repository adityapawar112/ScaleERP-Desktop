# Creating a Retail Bill (New Sale)

When a customer comes to purchase feed bags from your shop, you can log the sale and generate their invoice.

To open the billing form, click the **New Sale** button on the Dashboard or go to the **Retail Sales** page and click **Add New Sale**.

---

## 1. Entering Sale Details
The billing modal is designed to work quickly under busy checkout conditions.

> 📸 **Screenshot Placement:** *[The New Sale modal showing the searchable customer dropdown, previous balance display, date, and multiple product rows]*

### Step 1: Select the Customer
1. Click the **Customer** box. You can type their name or phone number to filter the list.
2. Select the customer from the list.
3. Once selected, look at the **Previous Balance** box on the right. It will instantly show if this customer owes you money (in red) or has no dues (in green).

### Step 2: Set Date and Time
* The app automatically sets these fields to today's current date and time. Leave them as they are unless you are logging a past sale.

---

## 2. Adding Feed Items to the Bill
You can add multiple different feed bags to a single invoice.

1. Under the products section, click the **Add Product** button to add a new line.
2. For each product line, fill in the following:
   - **Product:** Select the feed category (e.g., *Broiler Finisher*).
   - **Manufacturer:** Select the brand (e.g., *Suguna*). *Note: This dropdown is disabled until you pick a product category, and it only lists active brands.*
   - **Unit Type:** Select **Units** (for bags) or **Tonnes** (for wholesale weight).
   - **Price:** Enter the selling price per bag/tonne.
   - **Quantity:** Enter how many bags or tonnes are being purchased.
3. The **Total** box on the right of the row will calculate automatically (Price × Quantity).
4. **Remove Items:** If you add a row by mistake, click the red cross (**×**) in the upper right of that card to delete it.

---

## 3. Adding Labour and Completing the Bill
1. **Labour Charge:** If you pay loaders to lift the bags into the customer's truck, enter the labor fee in the **Labour Charge** box. This is added to the final bill total.
2. **Payment Method:** Select how the customer is paying: **Cash** or **UPI** (online/mobile).
3. **Total Amount:** The app automatically shows the total sum of all products + labor charges at the bottom right.
4. Click the blue **Add Sale** button to submit.

### Input Validation
* If you leave a product card empty, or if you select a product but enter a quantity of `0` or less, the app will show a red warning banner: `Please enter a quantity greater than 0 for all selected products`. Correct the entry to continue.

---

## 4. Post-Submit: Logging the Payment (Leisure Modal)
As soon as you click **Add Sale**, a window titled **Add Payment Details** will pop up automatically. This is where you log how much money the customer actually handed you.

> 📸 **Screenshot Placement:** *[The Add Payment Details popup modal showing the paid amount input, payment method, date/time, notes, and the action buttons]*

1. **Paid Amount:** Type the exact amount of money you collected from the customer.
   - *Example:* If the bill total is ₹5,000 and they paid full cash, enter `5000`.
   - *Example:* If they bought on credit (khata) and paid nothing, enter `0`.
2. **Payment Method:** Choose Cash or UPI.
3. **Notes:** (Optional) Add a note like *“Paid by check”* or *“Remaining dues next week”*.
4. Choose one of the three action buttons:
   * **Save Payment:** Saves the paid amount, updates the customer's outstanding dues, and closes the window.
   * **Send Bill on WhatsApp:** Opens WhatsApp Web with the full text invoice pre-filled so you can send it to their phone.
   * **Skip:** Saves the transaction without logging a cash payment, meaning the entire invoice total is added to their outstanding credit (receivables).
