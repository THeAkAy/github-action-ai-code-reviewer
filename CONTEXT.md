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

**Review Rubric**:
The standards every Review applies whatever the language — a strict maintainability bar (adapted from Cursor's thermo-nuclear code quality review) plus obvious correctness bugs.
_Avoid_: Prompt, checklist

**Language Profile**:
The rules specific to one programming language (e.g. C# nullable reference types, `async void`) that a Review adds to the Review Rubric for files in that language. It comes from the Action's built-in rules and the reviewed repo's own configuration, with the repo's rules winning.
_Avoid_: Language pack, ruleset
