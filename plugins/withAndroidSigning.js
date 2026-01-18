const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidSigning(config) {
    return withAppBuildGradle(config, (config) => {
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

    // 1. Add 'release' to signingConfigs
    const releaseConfigBlock = `
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`;

    // Insert release block inside signingConfigs
    buildGradle = buildGradle.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {${releaseConfigBlock}`
    );

    // 2. Set the signingConfig for release buildType
    const releaseBuildTypeMatch = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)(signingConfig\s+signingConfigs\.debug)/;

    if (releaseBuildTypeMatch.test(buildGradle)) {
        buildGradle = buildGradle.replace(
            releaseBuildTypeMatch,
            (match, p1, p2) => match.replace(p2, `signingConfig project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`)
        );
    }

    return buildGradle;
}
