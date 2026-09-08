"""Package only portable Android sources; never include local config/signing files."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
native = root / "native-android"
out = native / "releases"
out.mkdir(exist_ok=True)
version = "2.3.0"
allowed_files = ["build.gradle.kts", "settings.gradle.kts", "gradle.properties", "gradlew", "gradlew.bat", "app/build.gradle.kts", "app/proguard-rules.pro", "PRODUCT.md", "DESIGN.md"]
files = [native / name for name in allowed_files]
files += list((native / "app/src").rglob("*"))
files += list((native / "gradle/wrapper").rglob("*"))
files = sorted(p for p in files if p.is_file())
forbidden = {"google-services.json", "local.properties", "key.properties"}
assert all(p.name not in forbidden and p.suffix.lower() not in {".jks", ".keystore", ".p12", ".pem"} for p in files)
manifest = {str(p.relative_to(native)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
instructions = """# Build paymatrix 2.3.0

This archive is the complete native source checkpoint for the APK, separate from the web-only Git repository. Synthetic instrumentation fixtures are test-only and are absent from release APKs.

Requirements: Android Studio JDK 21, Android SDK 36 and the Gradle wrapper. Place your authorized Firebase Android configuration at app/google-services.json for com.paymatrix.app. Configure your local Android SDK through Android Studio or local.properties. Those machine/account-specific files are intentionally excluded.

For a debug build: gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
For UI tests on a dedicated emulator: gradlew.bat :app:connectedDebugAndroidTest
For release: provide key.properties locally with storeFile, storePassword, keyAlias, keyPassword using the EXISTING release key; then gradlew.bat :app:assembleRelease :app:bundleRelease. Never commit signing files. Changing the key prevents an in-place upgrade.

The widget is a privacy-safe RemoteViews quick-access widget. Local reminders use WorkManager and do not need FCM or a network constraint. Android controls execution timing. Item splitting preserves the existing itemized/dishPaise wire format; it allocates final receipt totals and is not a tax-rate calculator.
"""
archive = out / f"paymatrix-{version}-native-source.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, "native-android/" + p.relative_to(native).as_posix())
    z.writestr("native-android/SOURCE_MANIFEST.json", json.dumps(manifest, indent=2))
    z.writestr("native-android/BUILDING.md", instructions)
    z.write(root / "docs/ANDROID_EXPERIENCE_PLAN_2026-09-08.md", "docs/ANDROID_EXPERIENCE_PLAN_2026-09-08.md")
print(f"Packaged {len(files)} source files: {archive.name}")
