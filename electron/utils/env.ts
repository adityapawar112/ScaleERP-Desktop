import * as path from 'path';
import * as fs from 'fs';

let envLoaded = false;

/**
 * Loads key-value pairs from .env.local and .env into process.env if not already set.
 */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].trim();
              let value = match[2].trim();
              if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
              ) {
                value = value.slice(1, -1);
              }
              if (!process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        });
      } catch (err) {
        console.error(`Failed to load ${envFile}:`, err);
      }
    }
  }
}

// Automatically load on import
loadEnv();
