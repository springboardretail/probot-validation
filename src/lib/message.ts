import { Context } from "probot";
import { Level, ValidationResult } from "./rules";

const startToken = "<!-- probot-validation:start -->";
const endToken = "<!-- probot-validation:end -->";

const levelEmoji = (level: Level): string => {
  switch (level) {
    case "info":
      return ":information_source:";
    case "warn":
      return ":warning:";
    case "error":
      return ":x:";
  }
};

const renderMessage = (result: ValidationResult) => {
  if (result.errors.length > 0) {
    return result.errors
      .map(error => `${levelEmoji(error.level)} ${error.message}`)
      .join("\n");
  } else {
    return ":robot: Happybot";
  }
};

export const updateMessage = async (
  context: Context,
  result: ValidationResult
) => {
  const currentBody = (context.payload.issue || context.payload.pull_request)
    .body;

  if (typeof currentBody !== "string") {
    throw new Error("Can't find existing issue or pull request body");
  }

  const originalBody = currentBody.replace(
    RegExp(`${startToken}.*${endToken}`, "s"),
    ""
  );

  const newBody =
    result.errors.length > 0
      ? originalBody +
        `${startToken}\n\n----\n${renderMessage(result)}${endToken}`
      : originalBody;

  if (newBody !== currentBody) {
    await context.github.issues.edit({
      ...context.issue(),
      body: newBody
    });
  }
};
