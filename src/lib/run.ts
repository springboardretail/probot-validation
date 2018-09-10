import { Context } from "probot";
import { Config } from "./config";
import { apply } from "./rules";
import { addLabelsIfNotPresent, removeLabelsIfPresent } from "./labels";
import { updateStatuses } from "./statuses";
import { updateMessage } from "./message";

export const run = async (context: Context, config: Config) => {
  const result = apply(context, config);
  await addLabelsIfNotPresent(context, result.labelsToAdd);
  await removeLabelsIfPresent(context, result.labelsToRemove);
  await updateStatuses(context, result.statuses);
  await updateMessage(context, result);
};
