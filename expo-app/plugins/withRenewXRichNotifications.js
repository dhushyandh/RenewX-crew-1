const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'withRenewXRichNotifications';
const PACKAGE_NAME = 'com.renewx.mobile';

/**
 * Expo Config Plugin to inject native Android RemoteViews, Drawables,
 * and RenewXMessagingService for custom rich notifications.
 */
function withRenewXRichNotifications(config) {
  // 1. Copy native Android files into the generated project during prebuild
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;

      const sourceNativeDir = path.join(projectRoot, 'plugins', 'native');
      const targetResDir = path.join(platformRoot, 'app', 'src', 'main', 'res');
      const targetPackageDir = path.join(
        platformRoot,
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE_NAME.split('.')
      );

      // Ensure target folders exist
      fs.mkdirSync(path.join(targetResDir, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(targetResDir, 'drawable'), { recursive: true });
      fs.mkdirSync(targetPackageDir, { recursive: true });

      // Copy layout files
      const layoutSrcDir = path.join(sourceNativeDir, 'res', 'layout');
      if (fs.existsSync(layoutSrcDir)) {
        for (const file of fs.readdirSync(layoutSrcDir)) {
          fs.copyFileSync(
            path.join(layoutSrcDir, file),
            path.join(targetResDir, 'layout', file)
          );
        }
      }

      // Copy drawable files
      const drawableSrcDir = path.join(sourceNativeDir, 'res', 'drawable');
      if (fs.existsSync(drawableSrcDir)) {
        for (const file of fs.readdirSync(drawableSrcDir)) {
          fs.copyFileSync(
            path.join(drawableSrcDir, file),
            path.join(targetResDir, 'drawable', file)
          );
        }
      }

      // Copy Kotlin service
      const kotlinServiceSrc = path.join(sourceNativeDir, 'RenewXMessagingService.kt');
      if (fs.existsSync(kotlinServiceSrc)) {
        fs.copyFileSync(
          kotlinServiceSrc,
          path.join(targetPackageDir, 'RenewXMessagingService.kt')
        );
      }

      return cfg;
    },
  ]);

  // 2. Modify AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = cfg.modResults.manifest.application?.[0];
    if (!mainApplication) return cfg;

    // Ensure permissions
    if (!cfg.modResults.manifest['uses-permission']) {
      cfg.modResults.manifest['uses-permission'] = [];
    }
    const permissions = cfg.modResults.manifest['uses-permission'];
    const hasPostNotif = permissions.some(
      (p) => p.$?.['android:name'] === 'android.permission.POST_NOTIFICATIONS'
    );
    if (!hasPostNotif) {
      permissions.push({
        $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' },
      });
    }

    // Register RenewXMessagingService
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const serviceName = `${PACKAGE_NAME}.RenewXMessagingService`;
    const existingServiceIdx = mainApplication.service.findIndex(
      (s) => s.$?.['android:name'] === serviceName || s.$?.['android:name'] === '.RenewXMessagingService'
    );

    const serviceObj = {
      $: {
        'android:name': '.RenewXMessagingService',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          $: {
            'android:priority': '1000',
          },
          action: [
            {
              $: {
                'android:name': 'com.google.firebase.MESSAGING_EVENT',
              },
            },
          ],
        },
      ],
    };

    if (existingServiceIdx >= 0) {
      mainApplication.service[existingServiceIdx] = serviceObj;
    } else {
      mainApplication.service.push(serviceObj);
    }

    return cfg;
  });

  // 3. Add Coroutines and Firebase Messaging to app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    let buildGradle = cfg.modResults.contents;

    if (!buildGradle.includes('kotlinx-coroutines-android')) {
      const depBlock = `
    // RenewX Native Rich Notifications dependencies
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
`;
      buildGradle = buildGradle.replace(
        /dependencies\s*\{/,
        `dependencies {${depBlock}`
      );
      cfg.modResults.contents = buildGradle;
    }

    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withRenewXRichNotifications,
  PLUGIN_NAME,
  '1.0.0'
);
