Firebase Remote Config を管理する

# Requirement

- Node.js v18.x 以上

# Setup

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

TBD

# Usage

## Common options

- `--json` (required) firebase credentials json file path
- `--path` root path of parameters directory (default: "./")
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
    - Download default files to `default.xml` and `default.plist` .


## Examples

```bash
frc checkout --json FIREBASE_CREDENTIALS_JSON_PATH
frc validate --json FIREBASE_CREDENTIALS_JSON_PATH
frc diff --json FIREBASE_CREDENTIALS_JSON_PATH
frc publish --json FIREBASE_CREDENTIALS_JSON_PATH
frc publish -f --json FIREBASE_CREDENTIALS_JSON_PATH
frc download --json FIREBASE_CREDENTIALS_JSON_PATH
```
