/**
 * scripts/validate-password-reset.ts
 *
 * Validation script for Phase 5 offline password reset flow.
 * - Mocks Electron app.getPath for Node execution
 * - Verifies challenge -> vendor-signed code -> apply reset path
 */

import fs from "fs";
import os from "os";
import path from "path";
import Module from "module";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runValidation() {
  console.log("🚀 Starting Password Reset Flow Validation...");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaleerp-reset-validate-"));
  const originalLoad = (Module as any)._load;

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
    const { hashPassword, verifyPassword } = await import("../electron/services/passwordHasher");
    const { PasswordResetService } = await import("../electron/services/passwordReset");

    await dbManager.initialize();

    const username = `testuser_reset_${Date.now()}`;
    const userId = `usr_reset_${Date.now()}`;
    const initialPassword = "initial-password-123";
    const newPassword = "new-secure-password-456";

    console.log(`\n1. Seeding active license + user: ${username}`);
    await licenseOperations.saveLicense({
      license_id: "lic_reset_validation_001",
      customer_id: "cust_reset_validation_001",
      status: "active",
      edition: "Pro",
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: "2027-01-01T00:00:00.000Z",
      maintenance_until: "2099-01-01T00:00:00.000Z",
      license_blob: "reset-validation-license-blob",
    });

    const hashedInitial = await hashPassword(initialPassword);
    await userOperations.createUser({
      user_id: userId,
      username,
      password_hash: hashedInitial,
      license_id: "lic_reset_validation_001",
    });
    console.log("✅ Seed data ready.");

    const resetService = new PasswordResetService();

    console.log("\n2. Generating challenge blob...");
    const requestBlob = await resetService.generateResetChallenge(username);
    assert(typeof requestBlob === "string" && requestBlob.includes(":"), "challenge-blob-invalid");
    console.log("✅ Challenge generated.");

    console.log("\n3. Simulating vendor reset code generation...");
    const challengePayload = await resetService.verifyResetChallengeBlob(requestBlob);
    const resetCode = await resetService.generateSignedResetCode(challengePayload);
    assert(typeof resetCode === "string" && resetCode.includes(":"), "reset-code-invalid");
    console.log("✅ Reset code generated.");

    console.log("\n4. Verifying reset code before apply...");
    const verificationResult = await resetService.verifyResetCode(resetCode);
    assert(verificationResult.success === true, "reset-code-verify-success-false");
    assert(verificationResult.valid === true, "reset-code-verify-valid-false");
    assert(verificationResult.userId === userId, "reset-code-verify-userid-mismatch");
    console.log("✅ Reset code verified.");

    console.log("\n5. Applying password reset...");
    await resetService.verifyAndApplyResetCode(resetCode, newPassword);
    console.log("✅ Password reset applied.");

    console.log("\n6. Verifying new password hash...");
    const updatedUser = await userOperations.getUserByUsername(username);
    assert(!!updatedUser, "updated-user-not-found");
    const isPasswordValid = await verifyPassword(newPassword, updatedUser!.password_hash);
    assert(isPasswordValid, "new-password-verification-failed");
    console.log("✅ New password verified.");

    console.log("\n7. Verifying single-use protection via post-apply verification...");
    const postApplyVerification = await resetService.verifyResetCode(resetCode);
    assert(postApplyVerification.success === false, "post-apply-verify-should-fail");
    assert(postApplyVerification.valid === false, "post-apply-code-should-be-invalid");
    console.log("✅ Single-use protection verified.");

    dbManager.close();
    console.log("\n🎉 Password Reset Flow Validation Passed!");
  } finally {
    (Module as any)._load = originalLoad;
  }
}

runValidation().catch((error) => {
  console.error("\n❌ Validation Failed:", error);
  process.exit(1);
});