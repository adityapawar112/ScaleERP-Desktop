// electron/services/deviceFingerprint.ts
import crypto from 'crypto';
import os from 'os';

function getStableMacAddress(): string | null {
  try {
    const interfaces = os.networkInterfaces();

    for (const entries of Object.values(interfaces)) {
      if (!entries) continue;

      const preferred = entries.find((entry) => entry.mac && entry.mac !== '00:00:00:00:00:00' && !entry.internal);
      if (preferred?.mac) {
        return preferred.mac;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getDeviceFingerprintComponents(): string[] {
  const cpuModel = os.cpus()[0]?.model || 'unknown-cpu';
  const macAddress = getStableMacAddress();

  return [
    os.hostname(),
    os.platform(),
    os.arch(),
    cpuModel,
    os.totalmem().toString(),
    macAddress || 'no-mac'
  ];
}

export function getDeviceFingerprint(): string {
  const rawFingerprint = getDeviceFingerprintComponents().join('|');
  return crypto.createHash('sha256').update(rawFingerprint).digest('hex');
}
