import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { deserialize, serialize } from 'node:v8';

import { cert, initializeApp } from 'firebase-admin/app';
import { getRemoteConfig } from 'firebase-admin/remote-config';

const credPath =
  process.env['FIREBASE_CREDENTIALS'];

if (!credPath) {
  console.error('Error: FIREBASE_CREDENTIALS env is not set');
  process.exit(1);
}

initializeApp({ credential: cert(credPath) });

const remoteConfig = getRemoteConfig();
const template = await remoteConfig.getTemplate();
if (process.env["DEBUG"]) {
  console.log("[current template json]");
  console.log(JSON.stringify(template, null, 2));
}

// Output JSON at first
const makeFiles = async (dir, parameters) => {
    for (const [key, parameter] of Object.entries(parameters)) {
      const file = `${dir}/${key}`;
      console.log(key, parameter, ` => ${file}`);
      try {
        await writeFile(file, JSON.stringify(parameter, null, 2));
      } catch (error) {
        console.error(error)
        process.exit(1);
      }
    }

};

const parametersDir = './parameters';
if (!existsSync(parametersDir)) {
    try {
      await mkdir(parametersDir);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }

  makeFiles(parametersDir, template.parameters);
}

const parameterGroupsDir = './parameterGroups';
if (!existsSync(parameterGroupsDir)) {
  for (const [key, parameterGroup] of Object.entries(template.parameterGroups)) {
    const groupDir = `${parameterGroupsDir}/${key}`;
    if (!existsSync(groupDir)) {
      try {
        await mkdir(groupDir, { recursive: true });
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }

    makeFiles(groupDir, template.parameterGroups[key].parameters);
  }
}

// Read parameters
const newTemplate = {
  etag: template.etag,
  parameters: {},
  parameterGroups: {},
  conditions: template.conditions,
}

const files = readdirSync(parametersDir);
for (const file of files) {
  try {
    const body = await readFile(`${parametersDir}/${file}`);
    newTemplate.parameters[file] = JSON.parse(body.toString());
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

const groups = readdirSync(parameterGroupsDir);
for (const group of groups) {
  newTemplate.parameterGroups[group] = { parameters: { } };

  const files = readdirSync(`${parameterGroupsDir}/${group}`);
  for (const file of files) {
    try {
      const body = await readFile(`${parameterGroupsDir}/${group}/${file}`);
      newTemplate.parameterGroups[group].parameters[file] = JSON.parse(body.toString());
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

try {
  remoteConfig.validateTemplate(newTemplate)
} catch (error) {
  console.error(error);
  process.exit(1);
}

// Update remote config
if (process.env['DEBUG']) {
  console.log("");
  console.log("[created template json]");
  console.log(JSON.stringify(newTemplate, null, 2));
} else {
  try {
    const result = await remoteConfig.publishTemplate(newTemplate)
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
