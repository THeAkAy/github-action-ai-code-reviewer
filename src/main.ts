import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseHunkHeader } from "./diff.js";

export async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("openrouter-api-key", { required: true });
    core.setSecret(apiKey);

    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed("This Action only runs on pull_request events.");
      return;
    }

    const githubToken = core.getInput("github-token", { required: true });

    const octokit = github.getOctokit(githubToken);
    core.info(`Reviewing PR #${pr.number} in ${github.context.repo.owner}/${github.context.repo.repo}`);

    const { data } = await octokit.rest.pulls.get({
      ...github.context.repo,
      pull_number: pr.number,
      mediaType: {
        format: "diff",
      },
    });

    const diff: unknown = data;
    if (typeof diff !== "string") {
      throw new Error(`Expected the PR Diff from GitHub as text, got ${typeof diff}`);
    }

    core.info(diff);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
