import { execa } from "execa";

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
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

