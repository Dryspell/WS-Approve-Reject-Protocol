# Code signing the Windows installer

This folder's installer is unsigned for now. Windows shows "Windows protected your PC" and "Unknown publisher" when someone runs it. People get past that with **More info**, then **Run anyway**.

Signing puts the company name on the installer in place of "Unknown publisher". The SmartScreen warning won't disappear on day one: Microsoft builds trust for a certificate as signed files get downloaded without trouble, so the first signed releases can still warn. Sign every release with the same certificate so that trust carries over from release to release.

Code signing is separate from the update signature. Every release already gets an update signature from `~/.tauri/stratalace-desktop.key`, and installed apps check it before applying an update. Code signing doesn't replace that and needs nothing from it.

## What to set up: Azure Artifact Signing

Microsoft's Azure Artifact Signing service (formerly Azure Trusted Signing) holds the certificate in Azure. There's no USB token and no certificate file to keep safe. One account can sign all four Stratalace desktop apps. Check current pricing and eligibility on the Artifact Signing page in Azure before starting.

### One-time Azure setup

1. **Subscription.** Sign in to the [Azure portal](https://portal.azure.com) with an account that has a subscription. Open **Subscriptions**, pick it, then **Resource providers**, and register `Microsoft.CodeSigning`.
2. **Signing account.** Search the portal for "Artifact Signing" and create an account. Choose a region near you. On the account's **Overview** page, copy the **Account URI**, for example `https://eus.codesigning.azure.net`. That is the endpoint.
3. **Identity validation.** In the account, open **Identity validation** and start a **Public** validation for the organization (Stratalace's legal name, address, and a contact who can confirm). Microsoft reviews this by hand, and it can take several business days. Nothing below works until it's approved.
4. **Certificate profile.** Once validation is approved, open **Certificate profiles** and create a **Public Trust** profile that uses that validation. Note the profile name.
5. **App registration** (the login the release script uses). In **Microsoft Entra ID**, go to **App registrations**, then **New registration**, and name it `stratalace-desktop-signing`. From its overview, copy the **Application (client) ID** and the **Directory (tenant) ID**. Under **Certificates & secrets**, create a client secret and copy its **Value** right away, because it's shown only once. Set a reminder for when it expires.
6. **Permission.** Back on the signing account, open **Access control (IAM)**, then **Add role assignment**. Choose **Artifact Signing Certificate Profile Signer**, which older docs call "Trusted Signing Certificate Profile Signer", and assign it to `stratalace-desktop-signing`.

### One-time setup on the machine that builds releases

- .NET 8 runtime
- Windows 11 SDK 10.0.26100 or newer, which provides `signtool`
- The signing tool: `cargo install artifact-signing-cli`

### Values the release script reads

| Variable | Where it comes from |
| --- | --- |
| `AZURE_SIGNING_ENDPOINT` | Account URI from step 2 |
| `AZURE_SIGNING_ACCOUNT` | Signing account name from step 2 |
| `AZURE_SIGNING_PROFILE` | Certificate profile name from step 4 |
| `AZURE_CLIENT_ID` | Application (client) ID from step 5 |
| `AZURE_TENANT_ID` | Directory (tenant) ID from step 5 |
| `AZURE_CLIENT_SECRET` | Client secret value from step 5 |

Keep these out of every repo. Saving them as Windows user environment variables works. Run this once in PowerShell, then open a new terminal:

```powershell
[Environment]::SetEnvironmentVariable("AZURE_SIGNING_ENDPOINT", "https://eus.codesigning.azure.net", "User")
[Environment]::SetEnvironmentVariable("AZURE_SIGNING_ACCOUNT", "<account name>", "User")
[Environment]::SetEnvironmentVariable("AZURE_SIGNING_PROFILE", "<profile name>", "User")
[Environment]::SetEnvironmentVariable("AZURE_CLIENT_ID", "<client id>", "User")
[Environment]::SetEnvironmentVariable("AZURE_TENANT_ID", "<tenant id>", "User")
[Environment]::SetEnvironmentVariable("AZURE_CLIENT_SECRET", "<client secret>", "User")
```

## Releasing a signed build

Nothing in the app config changes. When the first three variables are set, `scripts/release.mjs` adds the signing step on its own. When they're missing, it builds unsigned and prints "Code signing is off."

1. Bump `version` in this folder's `package.json`.
2. Try a test build first: `npm run release:dry`. The build output should say it is signing the app and the installer.
3. Check the result. Right-click the installer in `release/`, open **Properties**, then **Digital Signatures**, and Stratalace should be listed. In PowerShell:

   ```powershell
   Get-AuthenticodeSignature .\release\*.exe | Format-List Status, SignerCertificate
   ```

   `Status` should read `Valid`.
4. Publish: `npm run release`.

## If signing fails

- **403 or "not authorized":** the role from step 6 is missing, or it was assigned on the wrong account. Role assignments can take a few minutes to apply.
- **"profile not found":** `AZURE_SIGNING_PROFILE` or `AZURE_SIGNING_ACCOUNT` doesn't match the portal exactly. Both are case-sensitive.
- **Authentication errors after months of working:** the client secret from step 5 expired. Create a new one and update `AZURE_CLIENT_SECRET`.
- **`artifact-signing-cli` not found:** run `cargo install artifact-signing-cli` again and make sure `~/.cargo/bin` is on `PATH`.
