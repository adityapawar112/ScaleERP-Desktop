/**
 * scripts/validate-session-persistence.ts
 *
 * Validation script for Phase 5 session persistence across restarts.
 * - Mocks Electron app.getPath for Node execution
 * - Verifies session logic: login -> store -> restart -> check
 */

import fs from "fs";
import os from "os";
import path from "path";
import Module from "module";
import crypto from "crypto";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runValidation() {
  console.log("🚀 Starting Session Persistence Validation...");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaleerp-session-validate-"));
  const originalLoad = (Module as any)._load;

  // Mock electron.app.getPath
  (Module as any)._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
    if (request === "electron") {
      return {
        app: {
          getPath(name: string) {
            if (name === "userData") {
              return tempDir;
            }
            return tempDir;
          },
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { dbManager } = await import("../electron/database/manager");
    const userOperations = await import("../electron/database/userOperations");
    const licenseOperations = await import("../electron/database/licenseOperations");
    const { hashPassword } = await import("../electron/services/passwordHasher");
    const { AuthService } = await import("../electron/services/authService");
    const { LicenseManager } = await import("../electron/services/licenseManager");
    const { LicenseScheduler } = await import("../electron/services/licenseScheduler");
    const { signLicense, registerPublicKey } = await import("../electron/services/cryptoUtils");

    await dbManager.initialize();

    const username = `testuser_sess_${Date.now()}`;
    const password = "test-password-123";
    const licenseId = "lic_sess_validation_001";
    const keyId = "test_key_sess";

    // Generate keys for signed license blob
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    registerPublicKey(keyId, publicKey);

    const licensePayload = {
      license_id: licenseId,
      customer_id: "cust_sess_validation_001",
      edition: "Pro" as const,
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: "2027-01-01T00:00:00.000Z",
      maintenance_until: "2099-01-01T00:00:00.000Z",
    };
    const validBlob = signLicense(licensePayload, privateKey, keyId);

    console.log(`\n1. Seeding data: user=${username}, license=${licenseId}`);
    await licenseOperations.saveLicense({
      license_id: licenseId,
      customer_id: "cust_sess_validation_001",
      status: "active",
      edition: "Pro",
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: "2027-01-01T00:00:00.000Z",
      maintenance_until: "2099-01-01T00:00:00.000Z",
      license_blob: validBlob,
    });

    const hashedPassword = await hashPassword(password);
    await userOperations.createUser({
      user_id: `usr_sess_${Date.now()}`,
      username,
      password_hash: hashedPassword,
      license_id: licenseId,
    });
    console.log("✅ Seed data ready.");

    console.log("\n2. Initial Login - Creating session");
    const licenseManager = new LicenseManager({ keyId });
    await licenseManager.validateLicense(); // Populate manager state
    const auth1 = new AuthService();
    
    // Initialize scheduler to listen for auth events (mock browser window)
    const mockWindow = { webContents: { send: () => {} } } as any;
    const scheduler = new LicenseScheduler(licenseManager, auth1, mockWindow);
    scheduler.start();

    let loginEventFired = false;
    auth1.on('login', () => { loginEventFired = true; });

    const loginResult = await auth1.login(username, password);
    assert(loginResult.success === true, "login-failed");
    assert(loginEventFired === true, "login-event-not-fired");
    console.log("✅ Login successful, session created and persisted.");

    console.log("\n2.5. Verifying heartbeat metadata after login...");
    // Give a small delay for async heartbeat logging
    await new Promise(resolve => setTimeout(resolve, 500));

    const heartbeats = await licenseOperations.getRecentHeartbeats(1, licenseId);
    assert(heartbeats.length > 0, "heartbeat-not-logged");
    assert(heartbeats[0].reason === 'user_action', "heartbeat-reason-mismatch");
    assert(!!heartbeats[0].metadata, "heartbeat-metadata-missing");
    const metadata = JSON.parse(heartbeats[0].metadata!);
    assert(!!metadata.user_id, "heartbeat-metadata-userid-missing");
    console.log(`✅ Heartbeat metadata verified: ${heartbeats[0].metadata}`);

    // Verify files exist in tempDir
    const sessionFile = path.join(tempDir, 'auth-session.enc');
    const sessionKey = path.join(tempDir, 'auth-session.key');
    assert(fs.existsSync(sessionFile), "session-file-missing");
    assert(fs.existsSync(sessionKey), "session-key-missing");
    console.log("✅ Session files physically verified.");

    console.log("\n3. Simulating App Restart - Checking session persistence");
    // Create a new instance to simulate a fresh app start using the same tempDir
    const auth2 = new AuthService();
    const sessionStatus = await auth2.checkSession();

    assert(sessionStatus.authenticated === true, "restart-session-check-failed");
    assert(sessionStatus.user?.username === username, "restart-username-mismatch");
    assert(sessionStatus.user?.license_id === licenseId, "restart-license-id-mismatch");
    console.log("✅ Session persisted and verified after restart.");

    console.log("\n4. Logout - Verifying cleanup");
    let logoutEventFired = false;
    auth2.on('logout', () => { logoutEventFired = true; });
    
    await auth2.logout();
    assert(!fs.existsSync(sessionFile), "session-file-not-deleted");
    assert(logoutEventFired === true, "logout-event-not-fired");
    
    const finalCheck = await auth2.checkSession();
    assert(finalCheck.authenticated === false, "session-still-active-after-logout");
    console.log("✅ Logout and cleanup verified.");

    dbManager.close();
    console.log("\n🎉 Session Persistence Validation Passed!");
  } finally {
    (Module as any)._load = originalLoad;
    // Cleanup tempDir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runValidation().catch((error) => {
  console.error("\n❌ Validation Failed:", error);
  process.exit(1);
});