import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { loadEnv } from './env';

// Load environment variables (.env.local, .env)
loadEnv();

// Isolate and configure userData path for ScaleERP
if (app) {
  app.name = 'scaleerp';
  if (typeof app.setName === 'function') {
    app.setName('scaleerp');
  }

  try {
    const appDataPath = app.getPath('appData');
    const scaleErpUserData = path.join(appDataPath, 'scaleerp');
    app.setPath('userData', scaleErpUserData);

    if (!fs.existsSync(scaleErpUserData)) {
      fs.mkdirSync(scaleErpUserData, { recursive: true });
    }

    // Auto-migrate database & license if scaleerp is empty
    const targetDb = path.join(scaleErpUserData, 'inventory.db');
    if (!fs.existsSync(targetDb)) {
      const electronUserData = path.join(appDataPath, 'Electron');
      const ouroUserData = path.join(appDataPath, 'ourofeeds');
      const sourceUserData = fs.existsSync(path.join(electronUserData, 'inventory.db'))
        ? electronUserData
        : (fs.existsSync(path.join(ouroUserData, 'inventory.db')) ? ouroUserData : null);

      if (sourceUserData) {
        const filesToMigrate = [
          'inventory.db',
          'inventory.db-wal',
          'inventory.db-shm',
          'license.lic',
          'auth-session.enc',
          'auth-session.key'
        ];
        for (const file of filesToMigrate) {
          const src = path.join(sourceUserData, file);
          const dest = path.join(scaleErpUserData, file);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            try {
              fs.copyFileSync(src, dest);
            } catch (e) {
              // ignore copy error
            }
          }
        }
        const srcAssets = path.join(sourceUserData, 'assets');
        const destAssets = path.join(scaleErpUserData, 'assets');
        if (fs.existsSync(srcAssets) && !fs.existsSync(destAssets)) {
          try {
            fs.cpSync(srcAssets, destAssets, { recursive: true });
          } catch (e) {
            // ignore copy error
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to configure ScaleERP userData path:', err);
  }
}
