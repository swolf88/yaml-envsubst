#!/usr/bin/env node
const { program } = require("commander");
const { version, description } = require("../package.json");
const YAML = require("yaml");
const process = require("process");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const _ = require("lodash");

const envVarRegEx = /\$\{([a-zA-Z][a-zA-Z0-9_]+)\}/gm;
const envVarKeysRegEx = /^\$\{([a-zA-Z][a-zA-Z0-9_]+)\}$/gm;

function getEnv(envVarName, ignoreUnexisting) {
  let result = process.env[envVarName];
  if (typeof result === "undefined") {
    if (!ignoreUnexisting)
      throw new Error(`Environment variable ${envVarName} is not defined`);
    else {
      console.warn(
        `[warn] Environment variable ${envVarName} is not defined, using empty value instead.`
      );
      result = "";
    }
  }
  return result;
}

function substituteDeep(obj, ignoreUnexisting) {
  if (Array.isArray(obj)) {
    return obj.map((item) => substituteDeep(item, ignoreUnexisting));
  } else if (typeof obj === "string") {
    return obj.replace(envVarRegEx, (match, envVarName) =>
      substituteDeep(getEnv(envVarName, ignoreUnexisting), ignoreUnexisting)
    );
  } else if (typeof obj === "object") {
    const keys = _.keys(obj);
    let result = {};
    for (const key of keys) {
      const matchKey = envVarKeysRegEx.exec(key);
      if (matchKey) {
        //key refers to env var, which is a peace of yaml
        const yamlEnvVar = getEnv(matchKey[1], ignoreUnexisting);
        const additionalYaml = substituteDeep(
          YAML.parse(yamlEnvVar),
          ignoreUnexisting
        );
        result = _.merge(additionalYaml, result);
      } else {
        //key is a normal key
        result[key] = substituteDeep(obj[key], ignoreUnexisting);
      }
    }
    return result;
  } else return obj;
}

async function main(inputFileName, outputFileName, ignoreUnexisting) {
  try {
    let fileText = "";
    if (!inputFileName || !existsSync(inputFileName)) {
      if (!ignoreUnexisting) throw new Error("Input file does not exists");
    } else {
      fileText = await fs.readFile(inputFileName, { encoding: "utf8" });
    }
    if (!outputFileName) {
      throw new Error("Output file arguments is not specified");
    }
    if (existsSync(outputFileName)) await fs.rm(outputFileName);
    const blocks = fileText.split("\n---\n");
    let isFirstBlock = true;
    for (const block of blocks) {
      const data = YAML.parse(block);
      const newData = substituteDeep(data, ignoreUnexisting);
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

program
  .name("yaml-envsubst")
  .version(version)
  .description(description)
  .argument("<input file>", "Input yaml file")
  .argument("<output file>", "Output yaml file")
  .option("--ignore", "Ignore missing environment variables");

program.parse();

main(program.args[0], program.args[1], program.opts().ignore);
