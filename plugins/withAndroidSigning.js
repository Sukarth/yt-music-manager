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

  // 1. Replace the release signingConfigs block to always use properties (no conditional)
  buildGradle = buildGradle.replace(
    /release\s*\{[\s\S]*?\}/,
    `release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }`
  );

  return buildGradle;
}
