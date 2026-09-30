<!-- vendor/README.md -->
# Vendor Licensing Assets

This directory is reserved for vendor-side licensing assets and utilities.

## Generate the initial RSA key pair

Run:

```bash
npm run generate-license-keys
```

This will create:

- `vendor/keys/private_key.pem`
- `vendor/keys/public_key.pem`

## Generate a signed license blob

After generating keys, you can create a license blob with:

```bash
npm run generate-license -- --customerId demo-customer --output vendor/keys/demo.lic
```

Optional arguments include:

- `--licenseId <uuid>`
- `--edition <Basic|Pro|Enterprise>`
- `--validFrom <iso-date>`
- `--validUntil <iso-date>`
- `--maintenanceUntil <iso-date>`
- `--deviceFingerprint <sha256-hex>`
- `--graceUntil <iso-date>`
- `--graceMode <view_only|admin_only>`
- `--features '{"inventory":true,"reports":true}'`
- `--input <json-file>` to provide the full payload from a JSON file

The command prints the base64 license blob and, if `--output` is provided, writes it to the specified file.

## Important rules

- **Never distribute `private_key.pem` with the client application.**
- The private key is for vendor-side signing only.
- The public key is the key that will later be embedded or registered in the client verification path.
- Regenerate keys only if you intentionally want a new trust chain.

## Phase 1 validation

After building Electron output and generating keys, run:

```bash
npm run build-electron
npm run validate-license-phase1
```

This validates:

- the licensing schema can be executed in SQLite
- the compiled `cryptoUtils` module can sign and verify a sample license
- the compiled `deviceFingerprint` module produces a valid SHA-256 hex fingerprint

## Phase 2 validation

After building Electron output, generating keys, and implementing Phase 2, run:

```bash
npm run build-electron
npm run validate-license-phase2
```

This validates:

- LicenseManager happy-path validation
- device fingerprint mismatch detection
- expired license handling
- tampered license rejection

## Git Bash note: avoid the previous shell error

The earlier Git Bash error:

```bash
bash: !verified.valid: event not found
```

was **not** caused by the licensing code. It happened because Git Bash treats `!` as history expansion inside inline commands like `node -e "..."`.

Examples that can trigger it:

```js
if (!verified.valid) {
```

To avoid that problem in future:

- prefer `npm run validate-license-phase1` instead of long `node -e` commands
- or disable Bash history expansion temporarily with `set +H`
- or avoid inline `!` expressions in double-quoted shell commands
