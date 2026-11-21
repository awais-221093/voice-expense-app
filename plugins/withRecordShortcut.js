// Config plugin (IDEAS I10): a static Android launcher shortcut "Record a note".
// Long-press the app icon → the shortcut opens voiceexpenseapp://record, which starts recording.
// Lighter than a widget or quick-settings tile: no native code, only resources + a manifest entry.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require('expo/config-plugins');

const SHORTCUT_URL = 'voiceexpenseapp://record';

/** res/xml/shortcuts.xml for `pkg` (exported for testing). */
function shortcutsXml(pkg) {
  return `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="record"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_record_short"
    android:shortcutLongLabel="@string/shortcut_record_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:data="${SHORTCUT_URL}"
      android:targetPackage="${pkg}"
      android:targetClass="${pkg}.MainActivity" />
  </shortcut>
</shortcuts>
`;
}

const withShortcutStrings = (config) =>
  withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [
        { $: { name: 'shortcut_record_short' }, _: 'Record a note' },
        { $: { name: 'shortcut_record_long' }, _: 'Record a money note' },
      ],
      c.modResults,
    );
    return c;
  });

const withShortcutMeta = (config) =>
  withAndroidManifest(config, (c) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(c.modResults);
    activity['meta-data'] = (activity['meta-data'] ?? []).filter(
      (m) => m.$['android:name'] !== 'android.app.shortcuts',
    );
    activity['meta-data'].push({
      $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' },
    });
    return c;
  });

const withShortcutXml = (config) =>
  withDangerousMod(config, [
    'android',
    async (c) => {
      const dir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'shortcuts.xml'), shortcutsXml(c.android.package));
      return c;
    },
  ]);

const withRecordShortcut = (config) => withShortcutXml(withShortcutMeta(withShortcutStrings(config)));

module.exports = withRecordShortcut;
module.exports.shortcutsXml = shortcutsXml;
