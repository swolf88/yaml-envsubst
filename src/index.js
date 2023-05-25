const YAML = require("yaml");
const process = require("process");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const _ = require("lodash");

const envVarRegEx = /\$\{([a-zA-Z][a-zA-Z0-9_]+)\}/gm;
const envVarKeysRegEx = /^\$\{([a-zA-Z][a-zA-Z0-9_]+)\}$/gm;

function getEnv(envVarName) {
  const result = process.env[envVarName];
  if (typeof result === "undefined")
    throw new Error(`Envronment variable ${envVarName} is not defined`);
  return result;
}

function substituteDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => substituteDeep(item));
  } else if (typeof obj === "string") {
    return obj.replace(envVarRegEx, (match, envVarName) => substituteDeep(getEnv(envVarName)));
  } else if (typeof obj === "object") {
    const keys = _.keys(obj);
    let result = {};
    for (const key of keys) {
      const matchKey = envVarKeysRegEx.exec(key);
      if (matchKey) {
        //key referes to env var, which is a peace of yaml
        const yamlEnvVar = getEnv(matchKey[1]);
        const additionalYaml = substituteDeep(YAML.parse(yamlEnvVar));
        result = _.merge(additionalYaml, result);
      } else {
        //key is a normal key
        result[key] = substituteDeep(obj[key]);
      }
    }
    return result;
  } else return obj;
}

async function main(inputFileName, outputFileName) {
  try {
    if (!inputFileName || !existsSync(inputFileName)) {
      throw new Error("Input file does not exists");
    }
    if (!outputFileName) {
      throw new Error("Output file does not exists");
    }
    if (existsSync(outputFileName)) await fs.rm(outputFileName);
    const fileText = await fs.readFile(inputFileName, { encoding: "utf8" });
    const blocks = fileText.split("\n---\n");
    let isFirstBlock = true;
    for (const block of blocks) {
      const data = YAML.parse(block);
      const newData = substituteDeep(data);
      let lines = [...(isFirstBlock ? [] : ["---"]), YAML.stringify(newData)];
      await fs.appendFile(outputFileName, lines.join("\n"), {
        encoding: "utf8",
      });
      isFirstBlock = false;
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main(process.argv[2], process.argv[3]);
