import { execa } from "execa";

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

const STG_BRANCH_SUFFIX = "-stg";

/** Strips trailing `-stg` so deploy/ephemeral uses the base feature branch (same convention as preview URL). */
export function stripStgBranchSuffix(branch: string): string {
  return branch.endsWith(STG_BRANCH_SUFFIX)
    ? branch.slice(0, -STG_BRANCH_SUFFIX.length)
    : branch;
}

export async function branchExists(branch: string): Promise<boolean> {
  const result = await execa("git", ["rev-parse", "--verify", branch], {
    reject: false,
  });
  return !result.failed;
}

export async function hasUncommittedChanges(): Promise<boolean> {
  const { stdout } = await execa("git", ["status", "--porcelain"]);
  return stdout.trim().length > 0;
}

/** Checks if branch exists on remote server (not just local refs, which can be stale). */
export async function branchExistsOnRemote(remote: string, branch: string): Promise<boolean> {
  const result = await execa("git", ["ls-remote", "--heads", remote, branch], {
    reject: false,
  });
  if (result.failed) return false;
  return (result.stdout?.trim().length ?? 0) > 0;
}

/** Pushes the given branch to origin. */
export async function pushBranch(branch: string, remote = "origin"): Promise<void> {
  await execa("git", ["push", "-u", remote, branch]);
}

/** Switches to an existing branch. */
export async function checkoutBranch(branch: string): Promise<void> {
  await execa("git", ["checkout", branch]);
}

/** Creates a new branch and switches to it. */
export async function createAndCheckoutBranch(branch: string): Promise<void> {
  await execa("git", ["checkout", "-b", branch]);
}

