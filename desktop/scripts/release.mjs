// Builds the installer with updater signatures and publishes it to GitHub Releases.
//
//   npm run release          build, then publish `<tag>-v<version>` and refresh `<tag>-feed`
//   npm run release:dry      build and write release/ without publishing
//
// Bump "version" in package.json first. The updater signing key is read from
// TAURI_SIGNING_PRIVATE_KEY or ~/.tauri/stratalace-desktop.key.
//
// Windows code signing turns on when AZURE_SIGNING_ENDPOINT, AZURE_SIGNING_ACCOUNT, and
// AZURE_SIGNING_PROFILE are set, along with AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and
// AZURE_TENANT_ID for artifact-signing-cli. See CODE-SIGNING.md.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const conf = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const { repo, tag } = pkg.release;
const { version } = pkg;
const product = conf.productName;
const releaseTag = `${tag}-v${version}`;
const feedTag = `${tag}-feed`;
const outDir = join(root, "release");
mkdirSync(outDir, { recursive: true });

function signingKey() {
  if (process.env.TAURI_SIGNING_PRIVATE_KEY) return process.env.TAURI_SIGNING_PRIVATE_KEY;
  const path = join(homedir(), ".tauri", "stratalace-desktop.key");
  if (!existsSync(path)) throw new Error(`No updater signing key. Set TAURI_SIGNING_PRIVATE_KEY or create ${path}.`);
  return readFileSync(path, "utf8");
}

function codeSigningConfig() {
  const { AZURE_SIGNING_ENDPOINT: endpoint, AZURE_SIGNING_ACCOUNT: account, AZURE_SIGNING_PROFILE: profile } = process.env;
  if (!endpoint || !account || !profile) {
    console.warn("Code signing is off. See CODE-SIGNING.md.");
    return null;
  }
  const path = join(outDir, "tauri.signing.conf.json");
  const signCommand = {
    cmd: "artifact-signing-cli",
    args: ["-e", endpoint, "-a", account, "-c", profile, "-d", product, "%1"],
  };
  writeFileSync(path, JSON.stringify({ bundle: { windows: { signCommand } } }, null, 2));
  return path;
}

function gh(args, options = {}) {
  return execFileSync("gh", [...args, "--repo", repo], { encoding: "utf8", ...options });
}

const tauriCli = join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
const configs = [join(root, "src-tauri", "tauri.release.conf.json"), codeSigningConfig()].filter(Boolean);
const build = spawnSync(process.execPath, [tauriCli, "build", ...configs.flatMap((path) => ["--config", path])], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: signingKey(),
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "",
  },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const targetDir = process.env.CARGO_TARGET_DIR ?? join(root, "src-tauri", "target");
const built = join(targetDir, "release", "bundle", "nsis", `${product}_${version}_x64-setup.exe`);
const asset = `${product.replace(/\s+/g, "-")}_${version}_x64-setup.exe`;
const installer = join(outDir, asset);
copyFileSync(built, installer);

const feed = {
  version,
  notes: `https://github.com/${repo}/releases/tag/${releaseTag}`,
  pub_date: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(`${built}.sig`, "utf8").trim(),
      url: `https://github.com/${repo}/releases/download/${releaseTag}/${asset}`,
    },
  },
};
const feedPath = join(outDir, "latest.json");
writeFileSync(feedPath, JSON.stringify(feed, null, 2));
console.log(`Wrote ${installer}\nWrote ${feedPath}`);

if (dryRun) process.exit(0);

gh(["release", "create", releaseTag, installer, "--title", `${product} ${version}`, "--latest=false", "--notes",
  `Download ${asset} and run it. Installed copies update themselves on next launch.`], { stdio: "inherit" });

const feedExists = spawnSync("gh", ["release", "view", feedTag, "--repo", repo], { stdio: "ignore" }).status === 0;
if (!feedExists) {
  gh(["release", "create", feedTag, "--title", `${product} update feed`, "--latest=false", "--notes",
    `Holds latest.json, which installed copies of ${product} check for updates.`], { stdio: "inherit" });
}
gh(["release", "upload", feedTag, feedPath, "--clobber"], { stdio: "inherit" });
console.log(`Published ${product} ${version}`);
