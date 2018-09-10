import "jest";
import { applyRule, Rule, applyRules } from "./rules";
import { Application, Context } from "probot";
import { GitHubAPI } from "probot/lib/github";

describe("My Probot app", () => {
  let context: Context;

  const github: GitHubAPI = jest.genMockFromModule("@octokit/rest");

  beforeEach(() => {
    const app = new Application();
    context = new Context(
      {
        name: "issues",
        payload: {}
      },
      github,
      app.log
    );
  });

  describe("applyRule", () => {
    test("when a rule's test does not match", () => {
      context.payload.foo = true;

      const rule: Rule = {
        context: "foo",
        level: "error",
        labelOnError: [],
        test: "$not(foo)",
        message: "Error message here"
      };

      expect(applyRule(context, rule)).toEqual({ rule: rule });
    });

    test("when a rule's test matches", () => {
      context.payload.foo = true;
      context.payload.bar = true;

      const rule: Rule = {
        context: "foo",
        level: "error",
        labelOnError: [],
        test: "foo and bar",
        message: "Error message here"
      };

      expect(applyRule(context, rule)).toEqual({
        rule: rule,
        error: {
          context: "foo",
          level: "error",
          message: "Error message here"
        }
      });
    });
  });

  describe("applyRules", () => {
    test("when only some rules with labelOnError match", () => {
      context.payload.foo = true;
      context.payload.bar = false;

      const rules: Rule[] = [
        {
          context: "foo",
          level: "error",
          labelOnError: ["foo1", "foo2"],
          test: "foo",
          message: "foo error 1"
        },
        {
          context: "foo",
          level: "error",
          labelOnError: ["foo1", "foo2"],
          test: "foo",
          message: "foo error 2"
        },
        {
          context: "foo",
          level: "error",
          labelOnError: ["bar1", "bar2"],
          test: "foo and bar",
          message: "foo error"
        },
        {
          context: "foo",
          level: "error",
          labelOnError: ["foo3"],
          test: "foo",
          message: "foo error 3"
        }
      ];

      const result = applyRules(context, rules);
      expect(result.labelsToAdd).toEqual(["foo1", "foo2", "foo3"]);
      expect(result.labelsToRemove).toEqual(["bar1", "bar2"]);
    });

    test("when rules match", () => {
      context.payload.foo = true;

      const rules: Rule[] = [
        {
          context: "foo",
          level: "error",
          labelOnError: [],
          test: "foo",
          message: "foo error"
        }
      ];

      expect(applyRules(context, rules)).toEqual({
        labelsToAdd: [],
        labelsToRemove: [],
        statuses: [],
        errors: [{ context: "foo", level: "error", message: "foo error" }]
      });
    });

    test("when some rules match for a pull request", () => {
      context.payload.pull_request = {
        html_url: "https://example.com/1234"
      };
      context.payload.foo = true;
      context.payload.bar = false;

      const rules: Rule[] = [
        {
          context: "foo",
          level: "error",
          labelOnError: [],
          test: "foo",
          message: "foo error 1"
        },
        {
          context: "bar",
          level: "error",
          labelOnError: [],
          test: "bar",
          message: "bar error"
        },
        {
          context: "foo",
          level: "error",
          labelOnError: [],
          test: "foo",
          message: "foo error 2"
        },
        {
          context: "foo",
          level: "error",
          labelOnError: [],
          test: "foo and bar",
          message: "foo error 3"
        }
      ];

      expect(applyRules(context, rules)).toEqual({
        labelsToAdd: [],
        labelsToRemove: [],
        statuses: [
          {
            context: "foo",
            state: "failure",
            description: "foo error 1, foo error 2",
            target_url: "https://example.com/1234#"
          },
          {
            context: "bar",
            state: "success",
            description: "Success",
            target_url: ""
          }
        ],
        errors: [
          { context: "foo", level: "error", message: "foo error 1" },
          { context: "foo", level: "error", message: "foo error 2" }
        ]
      });
    });
  });
});
