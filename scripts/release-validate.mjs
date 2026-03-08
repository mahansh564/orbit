import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const requireVsix = process.argv.includes('--require-vsix');

const errors = [];

const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

if (!existsSync(packageJsonPath)) {
  errors.push('Missing package.json in repository root.');
}

if (!existsSync(changelogPath)) {
  errors.push('Missing CHANGELOG.md in repository root.');
}

if (errors.length === 0) {
  const packageJsonRaw = readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw);
  const extensionName = String(packageJson.name ?? '');
  const extensionVersion = String(packageJson.version ?? '');

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(extensionVersion)) {
    errors.push(
      `package.json version "${extensionVersion}" is not a supported semver format.`,
    );
  }

  const changelog = readFileSync(changelogPath, 'utf8');
  const versionHeadings = Array.from(changelog.matchAll(/^##\s+([^\n]+)\s*$/gm)).map(
    (match) => match[1].trim(),
  );

  if (versionHeadings.length === 0) {
    errors.push('CHANGELOG.md has no "## <version>" entries.');
  } else {
    if (!versionHeadings.includes(extensionVersion)) {
      errors.push(
        `CHANGELOG.md is missing a section for version ${extensionVersion}.`,
      );
    }

    const latestChangelogVersion = versionHeadings[0];
    if (latestChangelogVersion !== extensionVersion) {
      errors.push(
        `Latest changelog version (${latestChangelogVersion}) does not match package.json version (${extensionVersion}).`,
      );
    }
  }

  if (requireVsix) {
    const expectedVsixName = `${extensionName}-${extensionVersion}.vsix`;
    const expectedVsixPath = path.join(rootDir, expectedVsixName);

    if (!existsSync(expectedVsixPath)) {
      const availableVsixFiles = readdirSync(rootDir)
        .filter((entry) => entry.endsWith('.vsix'))
        .sort();
      const availableLabel =
        availableVsixFiles.length > 0 ? availableVsixFiles.join(', ') : 'none';

      errors.push(
        `Expected packaged extension ${expectedVsixName} was not found. Available VSIX files: ${availableLabel}.`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`release-validate: ${error}`);
  }
  process.exit(1);
}

console.log('release-validate: OK');
