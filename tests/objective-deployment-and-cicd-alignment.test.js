const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #101: Objective Deployment & CI/CD Alignment Suite', () => {
  const rootDir = path.join(__dirname, '..');
  const readmeEnPath = path.join(rootDir, 'README.md');
  const readmeViPath = path.join(rootDir, 'README.vi.md');
  const releaseYmlPath = path.join(rootDir, '.github/workflows/release.yml');
  const wrapperPropPath = path.join(rootDir, 'android/gradle/wrapper/gradle-wrapper.properties');
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const manifestJsonPath = path.join(rootDir, 'manifest.json');
  const appBuildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  const dockerfilePath = path.join(rootDir, 'Dockerfile');
  const userGuideEnPath = path.join(rootDir, 'docs/USER_GUIDE.md');
  const userGuideViPath = path.join(rootDir, 'docs/USER_GUIDE.vi.md');

  it('should verify README files frame containerization objectively for any host', () => {
    const readmeEn = fs.readFileSync(readmeEnPath, 'utf8');
    const readmeVi = fs.readFileSync(readmeViPath, 'utf8');

    assert.match(readmeEn, /Self-hosted & container-ready/, 'English README tagline must be objective');
    assert.match(readmeVi, /đóng gói container đa nền tảng/, 'Vietnamese README tagline must be objective');

    assert.match(readmeEn, /\|\s*\*\*Self-Hosted \/ Server\*\*\s*\|\s*Container/, 'English README table must use Self-Hosted / Server');
    assert.match(readmeVi, /\|\s*\*\*Máy chủ \/ Tự lưu trữ\*\*\s*\|\s*Container/, 'Vietnamese README table must use Máy chủ / Tự lưu trữ');
  });

  it('should verify container image tag in READMEs matches GHCR publication', () => {
    const readmeEn = fs.readFileSync(readmeEnPath, 'utf8');
    const readmeVi = fs.readFileSync(readmeViPath, 'utf8');

    assert.match(readmeEn, /ghcr\.io\/tamld\/tuneflow:2\.4\.2/, 'English README must use valid GHCR image tag 2.4.2');
    assert.match(readmeVi, /ghcr\.io\/tamld\/tuneflow:2\.4\.2/, 'Vietnamese README must use valid GHCR image tag 2.4.2');
  });

  it('should verify release.yml publishes both semver and v-prefixed container tags to GHCR', () => {
    const releaseYml = fs.readFileSync(releaseYmlPath, 'utf8');

    assert.match(releaseYml, /type=semver,pattern=\{\{version\}\}/, 'release.yml must publish semver tag without v');
    assert.match(releaseYml, /type=semver,pattern=v\{\{version\}\}/, 'release.yml must publish semver tag with v prefix');
  });

  it('should verify release.yml pins Gradle 8.6 for Android Gradle Plugin 8.2.2 compatibility', () => {
    const releaseYml = fs.readFileSync(releaseYmlPath, 'utf8');

    assert.match(releaseYml, /gradle-version:\s*['"]8\.6['"]/, 'setup-gradle must pin gradle-version 8.6');
  });

  it('should verify gradle-wrapper.properties exists and pins Gradle 8.6 distribution', () => {
    assert.strictEqual(fs.existsSync(wrapperPropPath), true, 'gradle-wrapper.properties must exist');
    const wrapper = fs.readFileSync(wrapperPropPath, 'utf8');
    assert.match(wrapper, /gradle-8\.6-bin\.zip/, 'gradle wrapper must reference gradle 8.6');
  });

  it('should verify version 2.4.2 synchronization across all project descriptors', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    const gradle = fs.readFileSync(appBuildGradlePath, 'utf8');

    assert.strictEqual(pkg.version, '2.4.2', 'package.json version must be 2.4.2');
    assert.strictEqual(manifest.version, '2.4.2', 'manifest.json version must be 2.4.2');
    assert.match(gradle, /versionName\s+["']2\.4\.2["']/, 'build.gradle versionName must be 2.4.2');
    assert.match(gradle, /versionCode\s+242/, 'build.gradle versionCode must be 242');
  });

  it('should verify Dockerfile uses least privilege security terminology', () => {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    assert.match(dockerfile, /least privilege principle/, 'Dockerfile must describe non-root user via least privilege principle');
  });

  it('should verify User Guides provide generic, non-stale container and APK instructions', () => {
    const guideEn = fs.readFileSync(userGuideEnPath, 'utf8');
    const guideVi = fs.readFileSync(userGuideViPath, 'utf8');

    assert.match(guideEn, /## 4\. Run TuneFlow via Docker \/ Container/, 'English guide section 4 must be generalized');
    assert.match(guideVi, /## 4\. Khởi chạy TuneFlow qua Docker \/ Container/, 'Vietnamese guide section 4 must be generalized');
    assert.match(guideEn, /tuneflow-mobile-\*\.apk/, 'English guide must use generic APK filename');
    assert.match(guideVi, /tuneflow-mobile-\*\.apk/, 'Vietnamese guide must use generic APK filename');
  });
});
