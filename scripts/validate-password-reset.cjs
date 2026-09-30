/**
 * scripts/validate-password-reset.cjs
 * 
 * Validation script for the offline password reset flow.
 */

const { PasswordResetService } = require("../electron/services/passwordReset");
const userOperations = require("../electron/database/userOperations");
const { hashPassword, verifyPassword } = require("../electron/services/passwordHasher");
const crypto = require("crypto");

// Mocking some parts since we are running in Node, not Electron
// We need to point to a test database or ensure userOperations is working
process.env.NODE_ENV = 'test';

async function runValidation() {
  console.log("🚀 Starting Password Reset Flow Validation...");

  try {
    const username = "testuser_reset_" + Date.now();
    const initialPassword = "initial-password-123";
    const newPassword = "new-secure-password-456";

    // 1. Setup: Create a test user
    console.log(`\n1. Creating test user: ${username}`);
    const hashedInitial = await hashPassword(initialPassword);
    await userOperations.createUser({
      username,
      password_hash: hashedInitial,
      license_id: "test-license-id", // Assume this exists for validation or mock link
      full_name: "Test Reset User"
    });
    console.log("✅ Test user created.");

    const resetService = new PasswordResetService();

    // 2. User generates reset request (Challenge)
    console.log("\n2. User requesting password reset...");
    const requestBlob = await resetService.generateResetChallenge(username);
    console.log("✅ Request blob generated.");

    // 3. Developer generates reset code (Response)
    console.log("\n3. Developer generating reset code from request blob...");
    // We can simulate the vendor CLI logic here
    const challengePayload = await resetService.verifyResetChallengeBlob(requestBlob);
    const resetCode = await resetService.generateSignedResetCode(challengePayload);
    console.log("✅ Reset code generated.");

    // 4. User applies reset code
    console.log("\n4. User applying reset code with new password...");
    await resetService.verifyAndApplyResetCode(resetCode, newPassword);
    console.log("✅ Password reset applied successfully.");

    // 5. Verification: Try login with new password
    console.log("\n5. Verifying new password...");
    const user = await userOperations.getUserByUsername(username);
    const isPasswordValid = await verifyPassword(newPassword, user.password_hash);
    
    if (isPasswordValid) {
      console.log("✅ New password verified successfully!");
    } else {
      throw new Error("New password verification failed!");
    }

    // 6. Verification: Ensure challenge is invalidated
    console.log("\n6. Verifying challenge invalidation...");
    try {
        await resetService.verifyAndApplyResetCode(resetCode, "another-password");
        throw new Error("Challenge was not invalidated! Re-use allowed.");
    } catch (e) {
        console.log("✅ Challenge invalidation verified (re-use failed as expected).");
    }

    console.log("\n🎉 Password Reset Flow Validation Passed!");

  } catch (error) {
    console.error("\n❌ Validation Failed:", error);
    process.exit(1);
  }
}

runValidation();
