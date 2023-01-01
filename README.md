Firebase Remote Config を管理する

# Requirement

- Node.js v16.x 以上

# Setup

## 1. install node modules

```bash
npm install
```

## 2. get firebase service account credential json file

TBD

# Usage

```bash
$ env FIREBASE_CREDENTIALS=Setup手順2で取得したJSONファイルのパス index.mjs
```

DEBUG (only print log, not publish)

```bash
# set DEBUG environment variable
$ env DEBUG=true FIREBASE_CREDENTIALS=Setup手順2で取得したJSONファイルのパス index.mjs
```
