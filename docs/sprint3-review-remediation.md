# Sprint 3 review and branch-protection remediation

## Required workflow

The Sprint 3 specification, page 2, requires a pull request, at least one approving teammate review, and passing CI before changes reach `main`. Direct pushes are prohibited, including by the repository owner. The reviewed-PR requirement applies to Sprint 3 work starting October 13.

Use feature branches. Before merging, a teammate other than the PR author must inspect the changes and submit **Review changes → Approve** in GitHub. The `backend`, `frontend`, and `e2e` checks must pass for the current revision. If changes are pushed after approval, ask the teammate to review the new changes before merging. Do not bypass the process as repository owner.

The PR template is a reminder, not a technical enforcement mechanism. CI success, comments, and AI-assisted reviews do not constitute teammate approval.

## Verified oversight

On October 19, 2026 (America/Chicago), these PRs were merged through GitHub after successful checks, but without recorded formal approving reviews:

| PR | Work | Merge commit |
| --- | --- | --- |
| [#7](https://github.com/hamayunrz/Pub-Order/pull/7) | Expanded tests and release configuration | `330d304cfc3b698daf653d87701d250f2567ef81` |
| [#9](https://github.com/hamayunrz/Pub-Order/pull/9) | US3 orders and order retry/confirmation fixes | `14e101bbd3dae56b4b266ddda7eab18f5e097119` |

Both PRs were authored by BrinkW. The merge operations and fix commits were made using the repository owner's account with AI assistance. Adjustment comments were posted, but no formal teammate approvals were recorded when the review endpoints were checked. These were PR merges, not direct pushes to `main`; nevertheless, they did not satisfy the required pre-merge approval step.

Do not describe these PRs as approved before merge or rewrite their history to imply that approval occurred.

## Remaining remediation

- [ ] A teammate other than the original author reviews the changes in #7 and #9 retrospectively, with findings dated when the review actually occurs. Record any fixes in new PRs.
- [ ] Ask the instructor whether that retrospective review is acceptable remediation. It cannot retroactively satisfy the original pre-merge requirement.
- [ ] Obtain a genuine non-author approval on this workflow-remediation PR before merging it.
- [x] Enable and verify enforceable branch protection. After the owner explicitly authorized public visibility, protection was enabled on October 19, 2026 (America/Chicago).
- [ ] Capture the required branch-settings, green-main, and real red-then-green PR evidence for the report. An ordinary CI failure alone is not proof that GitHub blocked merging.

No retrospective review or instructor acceptance of the earlier oversight is claimed by this document. The completed protection setup is documented below.

## Protection now enabled

The owner subsequently authorized making the repository public. On October 19, 2026 (America/Chicago), visibility was changed to public and classic branch protection was applied to `main` on GitHub Free. The previous private-repository plan restriction is resolved for the repository's current visibility. The team should confirm with the instructor that public visibility is acceptable; authorization to change visibility is not evidence of course permission.

Verified through the GitHub API:

- `main` is protected.
- A PR requires at least one approving review; GitHub does not allow the author to approve their own PR.
- Required GitHub Actions checks are `backend`, `frontend`, and `e2e`.
- The branch must be up to date before merging.
- New commits dismiss stale approvals.
- Protection is enforced for administrators, including the owner; direct pushes do not bypass the PR requirement.
- Force pushes and branch deletion are disabled.

PR #11 was verified as `BLOCKED` / `REVIEW_REQUIRED` with all three checks passing and no approvals. This demonstrates the review gate, not the rubric's separate red-CI-then-green evidence requirement. Further commits require fresh checks and a teammate's review.

Before making the repository public, Gitleaks scanned fetched branch/PR history and issue/PR discussion text. The history scan flagged four occurrences of a fixed test UUID used as an order retry key; inspection confirmed these were test fixtures rather than credentials. The discussion scan returned no findings. This is a scoped scan result, not a guarantee that all possible sensitive data has been detected.

[GitHub's documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) confirms that protected branches are available for public repositories on Free. If the repository must become private again, arrange an eligible plan or school-provided repository and reverify protection; do not assume the current protections remain enforceable under private Free.

## Applied settings

`main-protection.json` is the classic branch-protection request body applied to this personal repository. Administrator enforcement is enabled. Organization-only bypass allowances are omitted because GitHub rejects them on personal repositories.

Do not require the `deliver` job for PR merges: delivery runs on pushes to `main`, not PRs.

## AI assistance record for this change

The repository owner requested remediation of the missing formal reviews and clarification of whether Sprint 3 could be completed without Pro, then confirmed that the repository must remain private. Codex inspected the rubric, GitHub approval records, CI check names, administrator permissions, and protection API responses, and prepared this document, the PR checklist, and the settings file. The owner later explicitly authorized public visibility; Codex scanned for secrets, changed visibility, applied protection, and verified the review gate. A human teammate must review this contribution. Include this interaction in the team's continued course AI prompt log; this short record does not replace that log.
