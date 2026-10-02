# Environments as code from GitHub Actions (recommended setup)

This is the recommended way to run a Fractal Cloud environment tree as code. The
setup has one management environment and operational environments, each in its
own AWS account, deployed from the default branch with **GitHub OIDC**. It uses no
static AWS keys.

```
guides/github-actions/
├── src/environments.ts                   the tree (management + prod + dev)
├── src/deploy.ts                         deploy, per-environment credentials
├── src/plan.ts                           PR preview via environments.list()/get()
└── workflows/
    ├── environments-deploy.yml           main → assume one role per account → deploy
    └── environments-plan.yml             pull_request → typecheck + preview, no AWS
```

Copy `src/` and `workflows/` (into `.github/workflows/`) into your landing-zone
repository, then replace the account ids, organization id and region.

## 1. A deployer role in every target account

The environment initializer works **with the caller's credentials, directly in the
target account**. It assumes no role of its own. It creates VPCs, IAM roles, ECR
repositories, an ECS cluster, Aurora and an ALB, so the role the workflow hands
over needs `AdministratorAccess`. Create the role in the management account **and**
in every operational account. These examples call it `FractalLandingZoneDeployer`.

The role has three properties:

| | |
|---|---|
| Trust | GitHub's OIDC provider, `StringEquals` on `aud = sts.amazonaws.com` and `sub = <subject prefix>:ref:refs/heads/main` |
| `MaxSessionDuration` | `7200`. An initialization can take ~55 minutes, and the credentials must outlive it |
| Policy | `arn:aws:iam::aws:policy/AdministratorAccess` |

**Get the subject from GitHub; do not type it.** A repository with immutable
subjects is identified as `repo:<owner>@<owner-id>/<name>@<repo-id>`, not
`repo:<owner>/<name>`. A trust written for the second form never matches, and
`AssumeRoleWithWebIdentity` fails with "Not authorized". Read the prefix the
repository actually sends:

```bash
PREFIX=$(gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix)
SUBJECT="${PREFIX}:ref:refs/heads/main"
```

Then, per account (with an admin profile for it):

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
PROVIDER="arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

# Once per account, if the GitHub OIDC provider does not exist yet.
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

cat > trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "${PROVIDER}"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {"StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "${SUBJECT}"
    }}
  }]
}
JSON

aws iam create-role --role-name FractalLandingZoneDeployer \
  --assume-role-policy-document file://trust.json \
  --max-session-duration 7200
aws iam attach-role-policy --role-name FractalLandingZoneDeployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

When re-running against an existing role, use `aws iam update-assume-role-policy` and
`aws iam update-role --max-session-duration 7200` instead of `create-role`. The Fractal
landing-zones repository keeps an idempotent version of these steps as
`scripts/bootstrap-deployer-role.sh`.

## 2. The deploy workflow

[`workflows/environments-deploy.yml`](workflows/environments-deploy.yml) is built
from these parts:

- **`permissions: id-token: write, contents: read`.** These let the job mint the
  OIDC token, and nothing more.
- **One `aws-actions/configure-aws-credentials` step per account**, each with a
  distinct `id`, `output-credentials: true` and `role-duration-seconds: 7200`. Each
  step exposes `aws-access-key-id`, `aws-secret-access-key` and `aws-session-token`
  as step outputs. The workflow passes those to the script as
  `<PREFIX>_AWS_*` variables.
- **Per-environment credentials.**
  [`src/deploy.ts`](src/deploy.ts) passes a function as `providerCredentials`.
  The SDK calls it once per environment, right before that environment's agent is
  initialized, and the function returns that account's three values. **All three are
  required**: the API uses AWS credentials as inline credentials only when the
  session token is present too. Without it they are ignored, and the SDK logs a
  `WARN`.
- **`agentInit: 'wait'`.** The control plane refuses an operational
  initialization until the management one has Completed. `wait` initializes
  management, waits for it to complete, and only then does the operational
  environments, all in one run.
- **Fractal service account** comes from repository secrets `SERVICE_ACCOUNT_ID` /
  `SERVICE_ACCOUNT_SECRET`, and the owner id from the repository variable
  `FRACTAL_OWNER_ID`.
- **`concurrency: environments-deploy`, `cancel-in-progress: false`.** Two deploys
  never overlap. A second push queues behind a running initialization instead of
  racing it or cancelling it halfway.
- **`timeout-minutes: 110`.** This leaves headroom for a full initialization while
  staying inside the 2-hour session.

## 3. The pull-request workflow

[`workflows/environments-plan.yml`](workflows/environments-plan.yml) gets **no AWS
credentials**: it has no `id-token` permission, and the roles trust only `main`
anyway. It typechecks the tree. It then runs [`src/plan.ts`](src/plan.ts), which
validates the tree with `resolveEnvironment` and reads the current state with
`cloud.environments.list()` / `get()`. It prints what a deploy would create or
change, computing parameter changes with `mergeEnvironmentParameters`, which is
exactly what a deploy writes. It needs only the Fractal service account, and it
skips the preview for pull requests from forks, which receive no secrets.

## Security notes

- **No static AWS keys anywhere.** Not in secrets, not in the repository. Every AWS
  credential is a short-lived session minted from the job's OIDC token.
- **Trust only the default branch.** The `sub` condition pins
  `:ref:refs/heads/main`, so a pull request, another branch or a fork cannot
  assume the role. Use `StringEquals`, not `StringLike` with wildcards.
- **Credentials live only for the run.** They expire after at most two hours. The
  SDK redacts them from every error it throws, including errors from requests that
  never carried them.
- **The role ARN is not a secret.** It is safe to commit in the workflow. Without a
  token that matches the trust policy it grants nothing.
- The Fractal service-account secret is the one long-lived credential. Keep it in
  repository (or environment) secrets, and protect `main` so that only reviewed
  changes deploy.
