const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = applySigningConfig(config.modResults.contents);
    }
    return config;
  });
};

function applySigningConfig(buildGradle) {
  // Check if already patched
  if (buildGradle.includes('MYAPP_UPLOAD_STORE_FILE')) {
    return buildGradle;
  }

  // 1. Add "release" block to signingConfigs so it's available
  // We use the properties directly (no "if check") because we know CI sets them.
  const releaseConfigBlock = `
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }`;

  // Insert release block inside signingConfigs { ... }
  // This adds 'release { ... }' right after 'signingConfigs {'
  buildGradle = buildGradle.replace(/signingConfigs\s*\{/, `signingConfigs {${releaseConfigBlock}`);

  // 2. Force the release buildType to use this new signing config
  // We look for 'buildTypes { ... release { ... }' and replace its signingConfig
  const releaseBuildTypeMatch =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)(signingConfig\s+signingConfigs\.[a-zA-Z]+)/;

  if (releaseBuildTypeMatch.test(buildGradle)) {
    // Replace existing signingConfig line
    buildGradle = buildGradle.replace(releaseBuildTypeMatch, (match, p1, p2) =>
      match.replace(p2, `signingConfig signingConfigs.release`)
    );
  } else {
    // If no signingConfig line exists in release buildType, insert it
    buildGradle = buildGradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
      `$1\n            signingConfig signingConfigs.release`
    );
  }

  return buildGradle;
}
