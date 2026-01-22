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

  // Add signing config that checks for gradle properties
  const signingConfigCode = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }`;

  // Find android { block and add signingConfigs
  buildGradle = buildGradle.replace(
    /(android\s*\{)/,
    `$1\n${signingConfigCode}\n`
  );

  // Find buildTypes.release and add signing config reference
  buildGradle = buildGradle.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
    `$1\n            signingConfig signingConfigs.release`
  );

  return buildGradle;
}
