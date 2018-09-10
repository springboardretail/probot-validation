import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { Application } from "probot";
import { apply } from "./lib/rules";
import { parseConfig } from "./lib/config";
import { run } from "./lib/run";

const loadYAML = (file: string) =>
  yaml.safeLoad(
    fs.readFileSync(path.resolve(__dirname, "..", file)).toString()
  );

export = (app: Application) => {
  app.on(["issues", "pull_request"], async context => {
    const rawConfig =
      process.env.LOCAL_CONFIG_PATH == null
        ? await context.config("validation.yml", { groups: [] as Object[] })
        : loadYAML(process.env.LOCAL_CONFIG_PATH);

    app.log.debug(context.payload, "Payload");
    app.log.debug(rawConfig, "Raw config");

    const config = parseConfig(rawConfig);

    app.log.debug(config, "Parsed config");
    app.log.debug(apply(context, config), "Result");

    await run(context, config);
  });
};
