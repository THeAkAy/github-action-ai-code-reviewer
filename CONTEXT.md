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

**Review Skill**:
A named set of review rules for one concern, such as a language ("C# general"), a framework ("EF Core queries") or a kind of change ("public API changes"). The reviewed repo's team writes it, not the Action. A Review adds the Review Skills that apply to the Review Rubric. When none apply, the Review uses the Review Rubric plus the model's general knowledge of the language.
_Avoid_: Language Profile, skill (on its own), ruleset

**Skill Router**:
The step that decides which Review Skills apply to a pull request, based on what the Diff actually does rather than only on file extensions.
_Avoid_: Selector, classifier

**Severity**:
How serious a Review Comment's finding is: `blocker` (very likely a bug, or will break something), `major` (a design problem the Review Rubric pushes back on), or `minor` (worth fixing, not urgent). Style nitpicks have no Severity because they're never reported.
_Avoid_: Priority, level, nit
