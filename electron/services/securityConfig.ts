/**
 * securityConfig.ts
 * 
 * Centralized security configuration for the application.
 * This file contains the master DEVELOPER_SECRET used to access internal tools.
 * 
 * IMPORTANT: In a production environment, this secret should be changed
 * before the final build and kept secure.
 */

export const DEVELOPER_SECRET = 'scaleerp-dev-2026';

/**
 * Validates a provided secret against the master developer secret.
 * This is called from the main process to keep the logic out of the renderer.
 */
export function validateDeveloperSecret(input: string): boolean {
  if (!input) return false;
  return input === DEVELOPER_SECRET;
}
