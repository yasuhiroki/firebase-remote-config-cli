Firebase Remote Config を管理する

# Requirement

- Node.js v18.x 以上

# Setup

## 1. install node modules

```bash
npm install
```

## 2. get firebase service account credential json file

TBD

# Usage

## Common options

- `--json` (required) firebase credentials json file path
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


## Examples

```bash
node index.mjs checkout --json FIREBASE_CREDENTIALS_JSON_PATH
node index.mjs validate --json FIREBASE_CREDENTIALS_JSON_PATH
node index.mjs diff --json FIREBASE_CREDENTIALS_JSON_PATH
node index.mjs publish --json FIREBASE_CREDENTIALS_JSON_PATH
node index.mjs publish -f --json FIREBASE_CREDENTIALS_JSON_PATH
```
