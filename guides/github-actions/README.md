# Environments as code from GitHub Actions (recommended setup)

This is the recommended way to run a Fractal Cloud environment tree as code. The
setup has one management environment and operational environments, each in its
own AWS account, deployed from the default branch with **GitHub OIDC**. It uses no
static AWS keys.

```
guides/github-actions/
├── src/environments.ts                   the tree (management + prod + dev), per target
├── src/deploy.ts                         deploy one target with its own credentials
├── src/plan.ts                           PR preview via environments.list()/get()
└── workflows/
    ├── environments-deploy.yml           main → one job per account, each assuming its role
    └── environments-plan.yml             pull_request → typecheck + preview, no AWS
```

Copy `src/` and `workflows/` (into `.github/workflows/`) into your landing-zone
repository, then replace the account ids, organization id and region. The
consumer repository needs `@fractal_cloud/sdk`, `typescript` and `tsx`. The samples
are typechecked against this SDK in its own CI (`tsconfig.guides.json`).

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
[ -n "$PREFIX" ] || { echo "no sub_claim_prefix returned; do not guess it" >&2; exit 1; }
SUBJECT="${PREFIX}:ref:refs/heads/main"
```

`:ref:refs/heads/main` is the suffix of the default subject template for a job
that runs on a push to `main` and has no `environment:`. If the repository
customizes `include_claim_keys`, or the job declares an `environment:`, the subject
has a different shape. In case of doubt, print the `sub` of a real token from a
throwaway workflow run on `main` and trust exactly that value.

Then, per account (with an admin profile for it):

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
PROVIDER="arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

# Once per account, if the GitHub OIDC provider does not exist yet.
aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER" >/dev/null 2>&1 ||
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
from these parts.

**Why one job per environment.** The initializer keeps using the credentials it
was handed until that environment's initialization finishes, which can take up to
the SDK's 55-minute wait. Credentials minted at the start of one job that
initializes management, then prod, then dev in sequence would have to last up to
about 2 h 45 min. The role's 2-hour session would expire partway through. So the
workflow runs:

1. a `check` job that installs and typechecks with **no** `id-token` permission;
2. a `management` job that assumes the management account's role and deploys the
   management environment alone, waiting for its initialization;
3. an `operational` job (a matrix, one entry per account, needing `management`). Each
   entry assumes **its own** account's role when it starts and deploys the
   management environment plus that one operational environment.

Each job's single `aws-actions/configure-aws-credentials` step has a distinct `id`,
`output-credentials: true` and `role-duration-seconds: 7200`. That gives every
account its own step and keeps every session ahead of the one initialization it
serves. In the `operational` jobs the management environment is already Completed,
so the SDK never asks for its credentials there. Deploying a subset of the tree
never touches environments the subset does not declare.

Other parts:

- **`permissions:`** — `contents: read` for the workflow. `id-token: write` only
  on the two deploy jobs, so they can mint the OIDC token the roles trust.
- **Per-environment credentials.** [`src/deploy.ts`](src/deploy.ts) passes a
  function as `providerCredentials`. The SDK calls it right before an
  environment's agent is initialized, and the function returns the job's three
  values (`accessKeyId`, `secretAccessKey`, `sessionToken`). **All three are
  required**: the API uses AWS credentials as inline credentials only when the
  session token is present too. Without it they are ignored, and the SDK logs a
  `WARN`. If the function is asked about an environment the job holds no
  credentials for, it fails naming the job to run first.
- **`agentInit: 'wait'`.** The control plane refuses an operational
  initialization until the management one has Completed. `wait` makes each job end
  only once its initialization has, which is what makes `needs: management` a real
  ordering guarantee.
- **Fractal service account** comes from repository secrets `SERVICE_ACCOUNT_ID` /
  `SERVICE_ACCOUNT_SECRET`, and the owner id from the repository variable
  `FRACTAL_OWNER_ID`.
- **`concurrency: environments-deploy`, `cancel-in-progress: false`.** A running
  deploy is never overlapped or cancelled. The newest pending push waits behind it,
  and an older pending one is superseded.
- **`timeout-minutes: 100`** per deploy job: one initialization plus headroom,
  inside the 2-hour session.
- **`npm ci --ignore-scripts`** and actions pinned to commit SHAs. This limits
  which third-party code runs in a job that can assume an `AdministratorAccess`
  role. Confirm once that your toolchain runs without install scripts (`tsx`, via
  esbuild, does in current versions).
- A `workflow_dispatch` from any branch other than `main` cannot assume the
  roles. That is intended.

## 3. The pull-request workflow

[`workflows/environments-plan.yml`](workflows/environments-plan.yml) gets **no AWS
credentials**: it has no `id-token` permission, and the roles trust only `main`
anyway. It typechecks the tree, then runs [`src/plan.ts`](src/plan.ts). That script
validates the tree with `resolveEnvironment`, reads the current state with
`cloud.environments.list()` / `get()`, and prints `+ create`, `~ update <fields>` or
`=` per environment. The preview follows deploy's own decisions:

- it creates when an environment is absent or Deleted;
- it updates when the name, the resource groups, or the parameters after
  `mergeEnvironmentParameters` differ, compared key-order-insensitively;
- it reports, and fails on, an operational `networkTier` that the management
  environment's stored tier would override.

Cloud-agent initialization, secrets and CI/CD profiles are not previewed. The preview step is skipped for
pull requests from forks and from Dependabot, which do not receive repository
secrets.

## Security notes

- **No static AWS keys anywhere.** Not in secrets, not in the repository. Every AWS
  credential is a short-lived session minted from the job's OIDC token.
- **Trust only the default branch**, with `StringEquals` (no wildcards) on `aud` and
  `sub`. A pull request, another branch or a fork cannot assume the roles. Note
  that the trust is on the *branch*, not on this workflow file: any workflow merged
  to `main` can assume them. Protect `main` (required reviews) and require
  code-owner review for `.github/workflows/`.
- **Credentials live only for the run.** They expire after at most two hours. The
  SDK redacts them from the errors it raises, including errors from requests that
  never carried them. An error thrown by your own credentials resolver is passed
  through with its message as written.
- **The role ARN is not a secret.** It is safe to commit in the workflow. Without a
  token that matches the trust policy it grants nothing.
- **The Fractal service-account secret is the one long-lived credential, and the
  plan job exposes it to pull-request code.** A same-repository pull request runs
  its own `plan.ts` (and could change the workflow itself) with that secret in the
  environment. That secret can create and update environments. Anyone with write
  access can therefore use it. If your Fractal organization supports one, give the
  plan job a separate, least-privileged service account (the workflow prefers
  `SERVICE_ACCOUNT_PLAN_ID` / `SERVICE_ACCOUNT_PLAN_SECRET` when they are set).
  Otherwise put the plan job behind a GitHub Environment with required reviewers,
  or drop the preview step and keep only the typecheck.
