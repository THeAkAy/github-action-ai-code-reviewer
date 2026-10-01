import * as core from "@actions/core";
import * as github from "@actions/github";

export async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("openrouter-api-key", { required: true });
    core.setSecret(apiKey);

    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed("This Action only runs on pull_request events.");
      return;
    }

    core.info(`Reviewing PR #${pr.number} in ${github.context.repo.owner}/${github.context.repo.repo}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
