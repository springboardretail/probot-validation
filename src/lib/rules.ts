import { Context } from "probot";
import jsonata from "jsonata";
import { Config } from "./config";
import { Status } from "./statuses";

export type Level = "warn" | "info" | "error";

export interface Group {
  filter?: string;
  rules: Rule[];
}

export interface Rule {
  context: string;
  labelOnError: string[];
  test: string;
  message: string;
  level: Level;
}

export interface ValidationResult {
  labelsToAdd: string[];
  labelsToRemove: string[];
  statuses: Status[];
  errors: ValidationError[];
}

export interface ValidationError {
  level: Level;
  context: string;
  message: string;
}

interface RuleResult {
  rule: Rule;
  error?: ValidationError;
}

export const apply = (context: Context, config: Config) =>
  applyGroups(context, config.groups);

export const applyGroups = (
  context: Context,
  groups: Group[]
): ValidationResult => {
  const rules: Rule[] = [];
  groups.forEach(group => {
    if (
      group.filter === undefined ||
      jsonata(group.filter).evaluate(context.payload)
    ) {
      console.debug("matched group with filter: ", group.filter);
      rules.push(...group.rules);
    }
  });
  return applyRules(context, rules);
};

export const applyRule = (context: Context, rule: Rule): RuleResult => {
  const expr = jsonata(rule.test);

  if (expr.evaluate(context.payload)) {
    return {
      rule: rule,
      error: {
        context: rule.context,
        level: rule.level,
        message: rule.message
      }
    };
  }

  return { rule: rule };
};

export const applyRules = (
  context: Context,
  rules: Rule[]
): ValidationResult => {
  const results: RuleResult[] = rules.map(applyRule.bind(null, context));

  const errors = results
    .filter(r => r.error !== undefined)
    .map(r => r.error) as ValidationError[];

  return {
    ...getLabelChanges(results),
    statuses: getStatuses(context, results),
    errors: errors
  };
};

const getLabelChanges = (
  results: RuleResult[]
): { labelsToAdd: string[]; labelsToRemove: string[] } => {
  const controlledLabels = new Set<string>();
  const labelsWithError = new Set<string>();
  results.forEach(result => {
    const labelOnError = result.rule.labelOnError;
    labelOnError.forEach(l => controlledLabels.add(l));
    if (result.error) {
      labelOnError.forEach(l => labelsWithError.add(l));
    }
  });
  return {
    labelsToAdd: [...labelsWithError],
    labelsToRemove: [...controlledLabels].filter(l => !labelsWithError.has(l))
  };
};

const getStatuses = (context: Context, results: RuleResult[]): Status[] => {
  const pr = context.payload.pull_request;
  if (pr == null) {
    return [];
  }
  const targetUrl = `${pr.html_url}#`;
  const contextStatuses = new Map<string, Status>();
  results.forEach(result => {
    const context = result.rule.context;
    if (!contextStatuses.has(context)) {
      contextStatuses.set(context, {
        context,
        description: "Success",
        state: "success",
        target_url: ""
      });
    }

    if (result.error) {
      const currentStatus = contextStatuses.get(context)!;
      let description = result.error.message;
      if (currentStatus.state == "failure") {
        description = `${currentStatus.description}, ${description}`;
      }
      contextStatuses.set(context, {
        context,
        description,
        state: "failure",
        target_url: targetUrl
      });
    }
  });
  return [...contextStatuses.values()];
};
