#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { deserialize, serialize } from 'node:v8';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';

import { cert, initializeApp } from 'firebase-admin/app';
import { getRemoteConfig } from 'firebase-admin/remote-config';

import { diffJson } from 'diff';
import YAML from 'js-yaml'

const help = `example:
  node index.mjs checkout --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs validate --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs publish --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs publish --dryrun --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs download --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs diff --json FIREBASE_CREDENTIALS_JSON_PATH
`;

function parse() {

  const options = {
    json: {
      type: 'string',
    },
    debug: {
      type: 'boolean',
      default: false,
    },
    force: {
      type: 'boolean',
      short: 'f',
      default: false,
    },
    dryrun: {
      type: 'boolean',
      default: false,
    },
    path: {
      type: 'string',
      default: "./",
    },
    format: {
      type: 'string',
      default: "yaml",
    }
  };

  try {
    return parseArgs({ options, allowPositionals: true });
  } catch(error) {
    console.error(error.message);
    console.error();
    console.error(help);
    process.exit(1);
  }
}

const { values, positionals } = parse()

const command = {
  checkout: false,
  validate: false,
  diff: false,
  publish: false,
  download: false,
};
if (positionals.length != 1) {
  console.error(`Error: Required one command`);
  console.error();
  console.error(help);
  process.exit(1);
} else {
  switch(positionals[0]) {
    case "checkout":
      command.checkout = true;
      break;
    case "validate":
      command.validate = true;
      break;
    case "diff":
      command.diff = true;
      break;
    case "publish":
      command.validate = true;
      command.publish = true;
      break;
    case "download":
      command.download = true;
      break;
    default:
      console.error(`Error: Unknown command '${positionals[0]}'`);
      console.error();
      console.error(help);
      process.exit(1);
      break;
  }
}

const credPath = values.json
if (!credPath) {
  console.error('Error: --json option is not set');
  process.exit(1);
}

if (values.path == "") {
  values.path = "./";
}
if (!existsSync(values.path)) {
  console.error(`Error: directory ${values.path} is not exist`);
  process.exit(1);
}
if (values.path.slice(-1) !== "/") {
  values.path = values.path + "/";
}

initializeApp({ credential: cert(credPath) });

const remoteConfig = getRemoteConfig();
const template = await remoteConfig.getTemplate();
if (values.debug) {
  console.log("Debug: current template json");
  console.log(JSON.stringify(template, null, 2));
}

const makeReadableJsonValue = (parameter) => {
  if (parameter["valueType"] === "JSON") {
    if (parameter["defaultValue"]["value"]) {
      parameter["defaultValue"]["value"] = JSON.stringify(JSON.parse(parameter["defaultValue"]["value"]), null, 2);
    }
    if (parameter["conditionalValues"]) {
      for (const [key, value] of Object.entries(parameter["conditionalValues"])) {
        if (parameter["conditionalValues"][key]["value"]) {
          parameter["conditionalValues"][key]["value"] = JSON.stringify(JSON.parse(value["value"]), null, 2);
        }
      }
    }
  }

  return parameter;
}

// Output JSON at first
const makeFiles = async (dir, parameters) => {
    for (const [key, parameter] of Object.entries(parameters)) {
      const file = `${dir}/${key}`;
      if (values.debug) {
        console.log(`Debug: checkout ${file}`);
      }
      if (!values.dryrun) {
        try {
          if (values.format == "yaml") {
            makeReadableJsonValue(parameter);
            await writeFile(file, YAML.dump(parameter));
          } else {
            await writeFile(file, JSON.stringify(parameter, null, 2));
          }
        } catch (error) {
          console.error(error)
          process.exit(1);
        }
      }
    }
};

const parametersDir = `${values.path}parameters`;
const parameterGroupsDir = `${values.path}parameterGroups`;
if (command.checkout) {
  if (!existsSync(parametersDir)) {
      try {
        await mkdir(parametersDir);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
  }
  await makeFiles(parametersDir, template.parameters);

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

    await makeFiles(groupDir, template.parameterGroups[key].parameters);
  }
}

// Read parameters
const newTemplate = {
  etag: template.etag,
  parameters: {},
  parameterGroups: {},
  conditions: template.conditions,
  version: template.version,
}

const makeMinifyJsonValue = (parameter) => {
  if (parameter["valueType"] === "JSON") {
    if (parameter["defaultValue"]["value"]) {
      parameter["defaultValue"]["value"] = JSON.stringify(JSON.parse(parameter["defaultValue"]["value"]));
    }
    if (parameter["conditionalValues"]) {
      for (const [key, value] of Object.entries(parameter["conditionalValues"])) {
        if (parameter["conditionalValues"][key]["value"]) {
          parameter["conditionalValues"][key]["value"] = JSON.stringify(JSON.parse(value["value"]));
        }
      }
    }
  }

  return parameter;
}

const files = readdirSync(parametersDir);
for (const file of files) {
  try {
    const body = await readFile(`${parametersDir}/${file}`);
    let parameter = YAML.load(body.toString(), { json: true });
    if (values.format == "yaml") {
      parameter = makeMinifyJsonValue(parameter);
    }
    newTemplate.parameters[file] = parameter;
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
      let parameter = YAML.load(body.toString(), { json: true });
      if (values.format == "yaml") {
        parameter = makeMinifyJsonValue(parameter);
      }
      newTemplate.parameterGroups[group].parameters[file] = parameter;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

// Validate new template
if (command.validate) {
  try {
    remoteConfig.validateTemplate(newTemplate)
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// Show diff
if (command.diff) {
  if (values.debug) {
    console.log("--- show diff ---------");
  }

  let results = diffJson(template, newTemplate);
  if (results.filter((result) => result.added || result.removed) == 0) {
    console.log("no difference");
  } else {
    for (const result of results) {
      let prefix = " ";
      if (result.added) {
        prefix = "+";
      } else if (result.removed) {
        prefix = "-";
      }
      console.log(result.value.split("\n").map((s) => s.replace(/^/, prefix)).join("\n"));
    }
  }
  if (values.debug) {
    console.log("------------------------");
  }
}

// Update remote config
if (command.publish && values.debug) {
  console.log("[Debug] created template json");
  console.log(JSON.stringify(newTemplate, null, 2));
}
if (command.publish && !values.dryrun) {
  let s = "y";
  if (!values.force) {
    const ri = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    s = await ri.question("publish? [y]: ");
    ri.close();
  }
  if (s == "y") {
    console.log("publishing...");
    try {
      const result = await remoteConfig.publishTemplate(newTemplate);
      console.log(`complete! (version ${result.version.versionNumber})`);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

// Download defaults XML and plit files
if (command.download) {
  if (values.debug) {
    console.log("[Debug] download default file");
  }

  if (!values.dryrun) {
    await remoteConfig.client.getUrl().then((url) => {
        const request = {
          method: 'GET',
          url: `${url}/remoteConfig:downloadDefaults?format=XML`,
        };
        return remoteConfig.client.httpClient.send(request);
      }).then((resp) => {
        const file = `${values.path}default.xml`
        return writeFile(file, resp.text);
      }).catch((err) => {
        console.error(err);
        process.exit(1);
      });

    await remoteConfig.client.getUrl().then((url) => {
        const request = {
          method: 'GET',
          url: `${url}/remoteConfig:downloadDefaults?format=PLIST`,
        };
        return remoteConfig.client.httpClient.send(request);
      }).then((resp) => {
        const file = `${values.path}default.plist`
        return writeFile(file, resp.text);
      }).catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
