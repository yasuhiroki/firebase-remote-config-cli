# firebase-remote-config-cli

[Firebase Remote Config](https://firebase.google.com/docs/remote-config) Management Tool.
This tool enables synchronization of data between a local file and Firebase Remote Config.

# Features

- Synchronize Remote Config data between a local file and Firebase.
- Show diff between local file and Firebase.
- Download defaults files for Android and iOS.

# Requirement

- Node.js v18.x above

# Getting Started

## 1. install

Add dependencies this repository url.

```json
{
    "dependencies": {
        "firebase-remote-config-cli": "git@github.com:yasuhiroki/firebase-remote-config-cli.git"
    }
}
```

## 2. get firebase service account credential json file

https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments

## 3. checkout remote config values from firebase

```bash
$ frc checkout --json FIREBASE_CREDENTIALS_JSON_PATH
```

saved remote config values to `parameters` and `parameterGroups` directory.

## 4. publish remote config values of local files to firebase

```bash
$ frc publish --json FIREBASE_CREDENTIALS_JSON_PATH
```

# Options

## Common options

- `--json` (required) firebase credentials json file path
- `--path` root path of parameters directory (default: "./")
- `--format` checkout file format "yaml" or "json" (default: "yaml")
- `--debug` print debug log
- `--dryrun` do not run writing and publishing

## Commands

- checkout
    - Checkout parameters to local file from Firebase.
- validate
    - Validate local file parameters.
- diff
    - Show diff parameters between local file and Firebase.
- publish
    - Publish parameters to Firebase.
    - If use `-f` option, skip confirmation.
- download
    - Download default files to `default.xml` and `default.plist` on pwd.

## Examples

```bash
# checkout remote config values to ./output directory
frc checkout --json FIREBASE_CREDENTIALS_JSON_PATH --path ./output

# publish force
frc publish -f --json FIREBASE_CREDENTIALS_JSON_PATH

# download defaults file
frc download --json FIREBASE_CREDENTIALS_JSON_PATH
```
