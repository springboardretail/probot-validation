import { Context } from "probot";

export interface Status {
  state: "success" | "failure" | "pending";
  target_url: string;
  description: string;
  context: string;
}

export const updateStatuses = async (context: Context, statuses: Status[]) => {
  const { pull_request: pr } = context.payload;

  if (statuses.length == 0) {
    return;
  }

  if (pr == null) {
    throw new Error(
      `Can't set statuses without a pull request: ${context.payload}`
    );
  }

  const { data: currentStatuses } = await context.github.repos.getStatuses(
    context.repo({
      ref: context.payload.pull_request.head.sha
    })
  );

  for (const status of statuses) {
    const currentStatus = currentStatuses.find(
      s => s.context == status.context
    );

    if (
      currentStatus &&
      currentStatus.state == status.state &&
      currentStatus.description == status.description &&
      currentStatus.target_url == status.target_url
    ) {
      continue;
    }

    await context.github.repos.createStatus({
      ...context.repo(),
      ...status,
      sha: context.payload.pull_request.head.sha as string
    });
  }
};
