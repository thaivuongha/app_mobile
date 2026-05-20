const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

/**
 * Override orientation restriction on third-party activities that are
 * still declared as `screenOrientation="portrait"` (e.g. ML Kit barcode scanner).
 * Starting with Android 16, Google Play warns about these restrictions because
 * the system ignores them on large-screen devices.
 */
const TARGET_ACTIVITIES = [
  "com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity",
];

const withAndroidOrientationFixes = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.activity = application.activity || [];

    for (const name of TARGET_ACTIVITIES) {
      const existing = application.activity.find(
        (a) => a.$ && a.$["android:name"] === name,
      );

      if (existing) {
        existing.$["android:screenOrientation"] = "unspecified";
        existing.$["tools:replace"] = mergeReplaceAttr(
          existing.$["tools:replace"],
          "android:screenOrientation",
        );
      } else {
        application.activity.push({
          $: {
            "android:name": name,
            "android:screenOrientation": "unspecified",
            "tools:replace": "android:screenOrientation",
          },
        });
      }
    }

    return config;
  });
};

function mergeReplaceAttr(existingValue, newAttr) {
  if (!existingValue) return newAttr;
  const parts = existingValue.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.includes(newAttr)) parts.push(newAttr);
  return parts.join(",");
}

module.exports = withAndroidOrientationFixes;
