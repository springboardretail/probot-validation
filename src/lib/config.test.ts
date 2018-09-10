import "jest";
import { parseConfig } from "./config";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";

const loadFixtureYAML = (fixturePath: string) =>
  yaml.safeLoad(
    fs
      .readFileSync(path.resolve(__dirname, "./__fixtures__", fixturePath))
      .toString()
  );

describe("parseConfig", () => {
  test("when given an invalid top-level type", () => {
    expect(() => {
      parseConfig("foo");
    }).toThrowError("Top-level configuration must be an object");
  });

  test("when missing groups", () => {
    expect(() => {
      parseConfig({});
    }).toThrowError("Top-level 'groups' config must be an array");
  });

  test("when given an invalid group", () => {
    expect(() => {
      parseConfig({ groups: ["foo", "bar"] });
    }).toThrowError('Expected group configuration to be an object, got: "foo"');
  });

  test("when given a valid configuration", () => {
    expect(parseConfig(loadFixtureYAML("valid-config.yaml"))).toMatchSnapshot();
  });
});
