import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { deserialize, serialize } from 'node:v8';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';

import { cert, initializeApp } from 'firebase-admin/app';
import { getRemoteConfig } from 'firebase-admin/remote-config';

const help = `example:
  node index.mjs checkout --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs validate --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs publish --json FIREBASE_CREDENTIALS_JSON_PATH
  node index.mjs publish --dryrun --json FIREBASE_CREDENTIALS_JSON_PATH
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
  publish: false,
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
    case "publish":
      command.validate = true;
      command.publish = true;
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

initializeApp({ credential: cert(credPath) });

const remoteConfig = getRemoteConfig();
const template = await remoteConfig.getTemplate();
if (values.debug) {
  console.log("Debug: current template json");
  console.log(JSON.stringify(template, null, 2));
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
          await writeFile(file, JSON.stringify(parameter, null, 2));
        } catch (error) {
          console.error(error)
          process.exit(1);
        }
      }
    }
};

const parametersDir = './parameters';
const parameterGroupsDir = './parameterGroups';
if (command.checkout) {
  if (!existsSync(parametersDir)) {
      try {
        await mkdir(parametersDir);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
  }
  makeFiles(parametersDir, template.parameters);

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

if (command.validate) {
  try {
    remoteConfig.validateTemplate(newTemplate)
  } catch (error) {
    console.error(error);
    process.exit(1);
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
