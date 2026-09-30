# AI Code Reviewer

A GitHub Action that reads a pull request's diff, asks an LLM to review it, and posts the review back to the pull request as comments.

## Language

**Review**:
One run of the reviewer against one pull request: the diff goes in and a set of Review Comments comes out.
_Avoid_: Scan, analysis

**Review Comment**:
A single finding the reviewer posts on a pull request.
_Avoid_: Issue, finding (ambiguous with tracker issues)

**Diff**:
The set of changes a pull request introduces, as GitHub reports them. It is the only input a Review is required to have.
_Avoid_: Patch, changeset
