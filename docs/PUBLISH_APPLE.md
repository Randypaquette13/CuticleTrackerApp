# Publishing Cuticle Tracker to the Apple App Store

Follow these steps to ship your first (or next) iOS release.

---

## 1. Prerequisites

- **Apple Developer account** ($99/year). Sign up at [developer.apple.com](https://developer.apple.com).
- **Expo account**. Create one at [expo.dev](https://expo.dev) if needed.
- **EAS CLI** installed and logged in:
  ```bash
  npm install -g eas-cli
  eas login
  ```

---

## 2. Link the project to EAS (first time only)

From the project root:

```bash
eas build:configure
```

Choose the default options if prompted. This ensures `eas.json` and the project are linked to your Expo account.

---

## 3. Create the app in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**.
2. Choose **iOS**, then:
   - **Platforms**: iOS
   - **Name**: Cuticle Tracker
   - **Primary Language**: your choice (e.g. English)
   - **Bundle ID**: select the one that matches `com.cuticletracker.app` (create it under [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) if it doesn’t exist).
   - **SKU**: e.g. `cuticle-tracker-001`
3. After the app is created, get the **Apple ID** (numeric) to use with EAS Submit:
   - In App Store Connect, open **My Apps** → click **Cuticle Tracker**.
   - In the left sidebar, under **General**, click **App Information**.
   - At the top of the page you’ll see **Apple ID** — a number like `1234567890`. Copy it.

---

## 4. (Optional) Set App Store Connect App ID in EAS

To avoid being asked for it every time you submit, put that Apple ID in `eas.json`:

- Open **eas.json** in the project root.
- Under `submit.production.ios` you’ll see `"ascAppId": "REPLACE_WITH_APPLE_ID"`.
- Replace `REPLACE_WITH_APPLE_ID` with the numeric Apple ID you copied (e.g. `1234567890`), keeping the quotes.

---

## 5. Build the iOS app

From the project root:

```bash
npm run build:ios
```

Or:

```bash
eas build --platform ios --profile production
```

- EAS will run the build in the cloud.
- First time: you’ll be guided to create/sign in to an Apple Developer account and set up credentials (EAS can manage them).
- When the build finishes, you’ll get a link to the build page and a `.ipa` you can use for submit.

---

## 6. Submit the build to App Store Connect

After a build has completed:

```bash
npm run submit:ios
```

Or:

```bash
eas submit --platform ios --latest --profile production
```

- **Latest** uses the most recent production build. To pick a specific build: `eas submit --platform ios --id <build-id> --profile production`.
- The build is uploaded to **TestFlight** (and will appear in App Store Connect under TestFlight). It does **not** go live on the store until you complete the steps below.

---

## 7. Fill in store listing and submit for review

In [App Store Connect](https://appstoreconnect.apple.com) → your app:

1. **App Information**: Category (e.g. Health & Fitness or Lifestyle), privacy policy URL if required.
2. **Pricing and Availability**: Price (e.g. free) and countries.
3. **App Privacy**: Complete the privacy questionnaire (data collection, etc.).
4. **Prepare for Submission** (for the version that has your build):
   - **Screenshots**: At least one screenshot per required device size (e.g. 6.7", 6.5", 5.5" for iPhone). Use Simulator or a device.
   - **Description**, **Keywords**, **Support URL**, **Marketing URL** (optional).
   - **Version**: Must match `version` in `app.json` (e.g. `1.0.0`).
   - **Build**: Select the build you submitted with EAS.
5. **Submit for Review**.

Apple will review the app (often 24–48 hours). After approval, you can release it manually or set it to auto-release.

---

## 8. Future releases

1. Bump **version** in `app.json` for user-visible changes (e.g. `1.0.1`), and optionally **ios.buildNumber** (e.g. `"2"`) if you need a new build for the same version.
2. Build again: `npm run build:ios`.
3. Submit again: `npm run submit:ios`.
4. In App Store Connect, create a new version (or use the same version and select the new build), then submit for review.

---

## Quick reference

| Step              | Command / place          |
|-------------------|--------------------------|
| Build iOS         | `npm run build:ios`       |
| Submit latest iOS | `npm run submit:ios`     |
| App config        | `app.json` (version, bundleId, buildNumber) |
| Submit config     | `eas.json` → `submit.production.ios` (optional `ascAppId`) |

---

## Troubleshooting

- **Credentials**: Run `eas credentials --platform ios` to inspect or fix signing.
- **Build fails**: Check the build log on [expo.dev](https://expo.dev) and fix the reported error (often missing env or misconfigured plugin).
- **Submit asks for Apple ID**: Add `ascAppId` to `eas.json` as in step 4, or enter it when prompted.
- **Missing compliance / encryption**: In App Store Connect, answer the export compliance question (often “No” for no custom encryption). EAS/Expo builds typically don’t add custom encryption.
