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


  } catch (err) {
    console.error('Failed to configure ScaleERP userData path:', err);
  }
}
