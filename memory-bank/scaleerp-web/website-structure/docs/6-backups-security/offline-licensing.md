# Offline Licensing & Security Key Management

ScaleERP operates fully offline without requiring a permanent internet connection. However, it requires a valid license key bounded to your specific computer hardware.

To view your license status, click **License** in the left sidebar.

---

## 1. Locating Your Device Fingerprint
Every computer has a unique hardware identity code. To register your license, you must send this fingerprint code to ScaleERP support.

1. Under the **Device Fingerprint** section on the License page, locate the long grey code.
2. Click the **Copy** button.
3. Paste the code into an email or WhatsApp message and send it to your sales representative.

---

## 2. Importing Your License File
Once support receives your fingerprint, they will send you a license file (e.g., `license.json` or a text blob).

> 📸 **Screenshot Placement:** *[The License Activation screen showing the file selection drag-and-drop box and key text input box]*

1. Click **Import License** on the License screen, or navigate directly to the activation page.
2. Choose one of the two activation tabs:
   * **JSON File Tab:** Click and select the `license.json` file you downloaded.
   * **Key Text Tab:** Paste the long text key directly into the box.
3. Click the blue **Activate License** button.
4. The system will verify the file and show a green success message.

---

## 3. Understanding License Status
The top card displays your current subscription health:

* **Status Colors:**
  * **Green (Valid):** Subscription is active and secure.
  * **Orange (Grace Period):** License has expired, but the system allows a few extra days to renew before locking.
  * **Red (Expired/Invalid):** App functions are locked. Renew your key immediately.
* **Days Remaining:** Displays two counters:
  * **Maintenance Expiry:** Days remaining for software feature updates.
  * **License Renewal:** Days remaining before the application subscription ends.

---

## 4. Clock Tampering Safety Lockout
To prevent users from modifying system dates to bypass license expiry:

> 📸 **Screenshot Placement:** *[The large red System Clock Tamper alert banner at the top of the dashboard]*

* **How it triggers:** If you change your computer clock to a date in the past, ScaleERP detects this mismatch in its database logs.
* **What happens:** The app enters a safety lock mode. All database operations, customer billing, and wholesale logging are disabled. A red banner will display: `Security Alert: Clock Tampering Detected`.
* **How to fix it:**
  1. Open your computer's settings and set your clock to the correct, automatic internet time.
  2. Go to the **License** page in ScaleERP.
  3. Click the **Force Check** button.
  4. The system will verify the clock time. If corrected, the alert banner will disappear, and functions will restore. If it remains locked, contact support.
