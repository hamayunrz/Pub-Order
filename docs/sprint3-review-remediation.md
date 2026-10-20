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
- [ ] Enable and verify enforceable branch protection once a supported private-repository plan is available, or obtain an explicit course exception.
- [ ] Capture the required branch-settings, green-main, and real red-then-green PR evidence for the report. An ordinary CI failure alone is not proof that GitHub blocked merging.

No retrospective review, instructor exception, or completed protection setup is claimed by this document.

## Current protection blocker

The repository must remain private. GitHub returned HTTP 403 for both rulesets and classic branch-protection endpoints, with the message: “Upgrade to GitHub Pro or make this repository public to enable this feature.” The authenticated user has repository administrator permission, so the reported blocker is plan availability.

[GitHub's documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) says protected branches are available for public repositories on Free and private repositories on eligible paid plans. [GitHub Education](https://github.com/education/students) offers free Pro to verified students. A school-provided repository on an eligible plan is another option, subject to instructor approval and institutional access.

If the repository remains on its current private Free plan, the team can follow the review procedure voluntarily, but must not claim that branch protection is enforced or that the requirement is fully satisfied. CI scripts, local Git hooks, and a checklist do not prevent the repository owner from bypassing them.

## Prepared settings

`main-protection.json` is a prepared classic branch-protection request body, not an applied configuration. After protection becomes available, an administrator can apply it to `main` and verify the returned settings. It requires one approving review, the GitHub Actions `backend`, `frontend`, and `e2e` checks, and enforcement for administrators, with no PR bypass allowances. It also requires the branch to be up to date, dismisses stale approvals, and disables force pushes and deletion.

Do not require the `deliver` job for PR merges: delivery runs on pushes to `main`, not PRs.

## AI assistance record for this change

The repository owner requested remediation of the missing formal reviews and clarification of whether Sprint 3 could be completed without Pro, then confirmed that the repository must remain private. Codex inspected the rubric, GitHub approval records, CI check names, administrator permissions, and protection API responses, and prepared this document, the PR checklist, and the unapplied settings file. A human teammate must review this contribution. Include this interaction in the team's continued course AI prompt log; this short record does not replace that log.
