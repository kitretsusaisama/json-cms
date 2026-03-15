import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('workflow script references', () => {
  it('ci-cd uses existing root script names and validator action', () => {
    const content = read('.github/workflows/ci-cd.yml');

    expect(content).toContain('uses: ./.github/actions/run-validated-npm-script');
    expect(content).toContain('script: typecheck');
    expect(content).not.toContain('npm run type-check');
  });

  it('seo workflow no longer uses removed apps/web working directory', () => {
    const content = read('.github/workflows/seo-health-check.yml');

    expect(content).toContain("- 'data/seo/**'");
    expect(content).toContain("- 'data/seoData/**'");
    expect(content).toContain("- 'src/lib/seo/**'");
    expect(content).not.toContain('working-directory: apps/web');
    expect(content).toContain('script: check:seo');
    expect(content).toContain('fs.existsSync(reportPath)');
  });


  it('validator action uses env-backed script execution helpers', () => {
    const content = read('.github/actions/run-validated-npm-script/action.yml');

    expect(content).toContain('validate-script.cjs');
    expect(content).toContain('run-script.cjs');
    expect(content).toContain('NPM_SCRIPT: ${{ inputs.script }}');
    expect(content).toContain('NPM_ARGS: ${{ inputs.args }}');
    expect(content).not.toContain('node -e');
  });

  it('release workflow validates scripts through reusable validator action', () => {
    const content = read('.github/workflows/release-packages.yml');

    expect(content).toContain('uses: ./.github/actions/run-validated-npm-script');
    expect(content).toContain('script: check:no-file-deps');
  });
});
