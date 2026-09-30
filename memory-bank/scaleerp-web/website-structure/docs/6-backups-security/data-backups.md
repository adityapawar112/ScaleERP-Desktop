# Database Backups & Cloud Sync

To prevent data loss from computer crashes, virus infections, or hardware damage, ScaleERP features automated backups, cloud syncing, and manual restoration tools.

To open this screen, click **Backups** in the left sidebar.

---

## 1. Connecting Google Drive Cloud Backup
Google Drive integration automatically uploads your encrypted database backups to your personal Google Cloud storage:

> 📸 **Screenshot Placement:** *[The Cloud Backup settings card showing the connected status badge, Google account email, and "Sync Now" / "Disconnect" buttons]*

1. In the **Google Drive Cloud Backup** section at the top:
   - Click the green **Connect Google Drive** button.
   - *Note: This requires your computer's security keyring (like Windows SafeStorage) to be active. If safety keys are missing, the button will be disabled for account protection.*
2. Your default internet browser will open. Sign in to your Google Account and approve the permissions.
3. Once connected, your email address will appear in the card, and your backup status will show a green **Connected** badge.
4. All cloud backups are stored in a dedicated folder in your Drive named **`ScaleERP Backups`**.
5. **Sync Now:** If you make many changes and want to force an upload immediately, click the blue **Sync Now** button.

---

## 2. Automatic Daily Backups
* ScaleERP runs an automatic database backup in the background **every day at 2:00 AM** (or when the app starts if it was closed during that time).
* **Storage Space Safeguards:** To save disk space, the system automatically tidies the backup directory. It will keep only:
  - The last 3 Daily backups.
  - The last 3 Weekly backups.
  - The last 3 Monthly backups.
  - All Yearly backups.

---

## 3. Creating a Manual Checkpoint
If you are about to do a major cleanup or want to save a checkpoint before changing settings:

1. Click the blue **Create Manual Backup** button.
2. A progress bar will show the status.
3. Once completed, a new checkpoint file will appear in the table below.
4. **Open Backup Folder:** Click this button to open the hidden storage directory on your computer where the `.db` backup files are stored.

---

## 4. Integrity Verification & Status Icons
The history table lists all backups stored on this device. Each backup goes through an automatic security check:

* **Integrity Status (Verified Secure):** A green badge means the file has been tested and is safe to use. A red badge means the file is corrupted and cannot be restored.
* **Cloud Sync Status Icons:**
  - **Green Cloud Done:** The backup is safely uploaded to Google Drive.
  - **Blue Syncing Circle:** The file is currently uploading.
  - **Yellow Cloud Queue:** The backup is in line to upload.
  - **Red Sync Error:** The upload failed (verify internet connection).
  - **Gray Cloud Off:** Google Drive is disconnected. Click the **Refresh** icon in the Actions column to force-sync it.

---

## 5. Restoring the System from a Backup
> ⚠️ **CRITICAL WARNING:** Reverting the system to a past backup will overwrite all current data. All transactions, sales, and edits made after that backup's timestamp will be permanently deleted.

> 📸 **Screenshot Placement:** *[The Critical Restore Warning modal showing the date of restore and the red "Accept Data Loss & Restore" action button]*

1. Find the backup checkpoint in the history table.
2. Click the red **Restore System** button.
3. A modal will pop up displaying the backup date and a red warning.
4. If you understand the risk, click **Accept Data Loss & Restore**.
5. ScaleERP will lock the database, apply the restoration, and automatically restart the application to reload the restored data. Do not close the window while the progress bar is running.
