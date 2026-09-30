# WhatsApp Reminders & Custom Presets

ScaleERP allows you to send personalized payment reminders, balance warnings, and greetings directly to your customers and brokers over WhatsApp without retyping their details.

To open this screen, click **WhatsApp Manager** in the left sidebar.

---

## 1. Selecting the Message Recipient
Before you can send a message, you must choose who will receive it:

> 📸 **Screenshot Placement:** *[The WhatsApp Manager layout showing the contact list on the left side and message templates list on the right]*

1. Under the **Customer/Broker Selection** panel on the left:
   - Click the **Customers** button to see retail buyers.
   - Click the **Brokers** button to see wholesale suppliers.
2. Search for the contact by typing their name or phone number in the search bar.
3. Click the blue **Select** button in their table row.
4. Once selected:
   - The contact's row will turn green.
   - A green confirmation card will appear at the top showing their name, phone number, and outstanding balance.

---

## 2. Using System Presets (English & Marathi)
ScaleERP includes pre-translated system templates that cannot be edited or deleted. These are designed for quick collections:

* **Payment Reminder (EN / MR):** Reminds the recipient of their specific pending balance.
* **Payment Due in 1 Month (EN / MR):** A polite notice for upcoming dues.
* **Visit Us Again (EN / MR):** A customer relations follow-up.
* **Festival Greetings (Diwali / New Year EN / MR):** Greetings to maintain business relationships.

---

## 3. Creating Custom Presets
To write your own templates:

> 📸 **Screenshot Placement:** *[The Add Preset modal showing the title field, placeholder buttons (+ Name, + Pending Amount, etc.), and the text area]*

1. Click the blue **Add Preset** button at the top right of the screen.
2. In the popup window:
   - **Title:** Enter a short name for the template (e.g., *“Weekend Clearance”*).
   - **Message:** Type your message text.
3. **Dynamic Placeholder Buttons:** Instead of typing names or amounts, click the placeholder buttons above the text box to insert code tags:
   - Click **+ Name** to insert `{contactName}`.
   - Click **+ Pending Amount` to insert `{totalPending}`.
   - Click **+ Business Name** to insert `{businessName}`.
   - Click **+ Date** to insert `{date}`.
4. Click **Save**.

*Example Custom Message:*
> `Hello {contactName}, this is to inform you that a balance of ₹{totalPending} is due on {date} at {businessName}. Thank you!`

---

## 4. Sending the Message
Once a recipient is selected (highlighted in green):

1. Find the template you want to send on the right side of the screen.
2. Click the green **Send (paper plane)** button in that row.
3. **How the connection works:**
   - ScaleERP will first try to open the official **WhatsApp Desktop App** on your computer.
   - If the desktop app is not installed or fails to open, the software will automatically launch your default internet browser and open **WhatsApp Web (wa.me)** to send the message.
4. You will see the contact's chat open with your message already typed in the input box. Simply review it and click the WhatsApp send button.

---

## 5. Security & Account Safety
ScaleERP uses a safe "Click-to-Send" system:
* It does not use unauthorized background bots to send messages automatically.
* Since you review and send each message manually, there is **zero risk** of WhatsApp flagging or banning your business phone number for automated spamming.
