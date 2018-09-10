import { Group, Rule } from "./rules";

export interface Config {
  groups: Group[];
}

const mergeLabelOnError = (...inputs: any[]): string[] => {
  const labels = new Set<string>();
  inputs.forEach(input => {
    if (input instanceof Array) {
      input.forEach(label => labels.add(label));
    } else if (typeof input === "string") {
      labels.add(input);
    } else if (input != null) {
      throw new Error(`Unexpected value for 'labelOnError': ${input}`);
    }
  });
  return [...labels];
};

export const parseConfig = (configInput: any): Config => {
  const config: Config = { groups: [] };
  if (typeof configInput !== "object") {
    throw new Error("Top-level configuration must be an object");
  }

  if (!(configInput.groups instanceof Array)) {
    throw new Error("Top-level 'groups' config must be an array");
  }

  configInput.groups.forEach((groupConfig: any) => {
    if (typeof groupConfig != "object") {
      throw new Error(
        `Expected group configuration to be an object, got: ${JSON.stringify(
          groupConfig
        )}`
      );
    }

    let { context, filter, rules } = groupConfig;

    if (typeof context != "string") {
      throw new Error("'context' must be present and a string");
    }

    if (!(rules instanceof Array)) {
      throw new Error("'rules' must be present and an array");
    }

    rules = rules.map(
      (ruleInput): Rule => {
        if (ruleInput.labelOnError instanceof Array) {
        }

        return {
          context,
          labelOnError: mergeLabelOnError(
            groupConfig.labelOnError,
            ruleInput.labelOnError
          ),
          test: ruleInput.test as string,
          message: ruleInput.message as string,
          level: ruleInput.level || "error"
        };
      }
    );

    config.groups.push({
      filter,
      rules
    });
  });

  return config;
};
