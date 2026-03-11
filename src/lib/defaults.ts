export const DEFAULTS = {
  linear: {
    statusInProgress: "In Progress",
    statusDevTesting: "DEV Testing",
    statusInReview: "Ready for QA",
  },
  github: {
    deployWorkflow: "deploy-ephemeral.yml",
    destroyWorkflow: "destroy-ephemeral.yml",
  },
  slack: {
    channel: "#pr",
  },
  claudeCode: {
    command: "claude run test-info",
  },
} as const;
