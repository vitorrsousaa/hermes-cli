export const DEFAULTS = {
  linear: {
    statusInProgress: "In Progress",
    statusDevTesting: "DEV Testing",
    statusInReview: "Ready for QA",
  },
  github: {
    deployWorkflow: "deploy-ephemeral.yml",
    buildOrReuseWorkflow: "build-or-reuse.yaml",
    buildOrReuseWorkflowId: "175140367", // Build or Reuse Images for Feature Env
    deployFeatureWorkflowId: "172365310", // Deploy Feature Environment
    cleanupWorkflow: "delete-dynamic-env.yaml", // Cleanup Stale FE Namespaces
  },
  slack: {
    channel: "#pr",
  },
  claudeCode: {
    command: "claude run test-info",
  },
} as const;

/** Ordered list of workflow statuses for `hermes task move` (single source for inquirer choices). */
export const LINEAR_WORKFLOW_STATUSES: readonly string[] = [
  DEFAULTS.linear.statusInProgress,
  DEFAULTS.linear.statusDevTesting,
  DEFAULTS.linear.statusInReview,
];
