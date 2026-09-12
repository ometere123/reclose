const NOW = "2026-09-12T05:45:00.000Z";

export const syntheticFixtureBanner = {
  mode: "mock",
  label: "Validated synthetic fixtures",
  note: "No value on this screen is represented as live chain truth unless live SDK mode is active."
};

export const targets = [
  {
    targetId: "reclose-target-004",
    targetAddress: "0x7B423D9787aeACC303467dE82A2D193D77155f0f",
    cachedOwner: "0x24fae7cd031ed702be63bdea8912141805b996bd",
    assuranceState: "SAFE_MODE",
    activePolicyKey: "policy-r1-004",
    policyGeneration: 4,
    authorityRevoked: false,
    humanOverrideEnabled: true,
    registeredAt: "2026-09-12T04:37:00.000Z",
    effectiveCapabilities: ["provider_b"],
    restrictions: [
      { incidentId: "reclose-target-004:0x24fae7cd031ed702be63bdea8912141805b996bd:11", actionType: "RESTRICT", resourceId: "provider_a" },
      { incidentId: "reclose-target-004:0x24fae7cd031ed702be63bdea8912141805b996bd:11", actionType: "ENTER_SAFE_MODE", resourceId: "" }
    ]
  },
  {
    targetId: "demo-payments",
    targetAddress: "0x0000000000000000000000000000000000000042",
    cachedOwner: "0x0000000000000000000000000000000000000043",
    assuranceState: "NORMAL",
    activePolicyKey: "policy-demo-1",
    policyGeneration: 1,
    authorityRevoked: false,
    humanOverrideEnabled: false,
    registeredAt: "2026-09-11T16:20:00.000Z",
    effectiveCapabilities: ["provider_a", "provider_b"],
    restrictions: []
  }
];

export const policies = {
  "reclose-target-004": {
    summary: {
      policyKey: "policy-r1-004",
      targetId: "reclose-target-004",
      version: 4,
      manifestHash: "0xf0f562c4d852c52469a911c207c66972a63d7a3a9db9cc60171b6916d44f22fd",
      sealed: true,
      active: true,
      superseded: false,
      ruleCount: 4,
      resourceCount: 2,
      effectCount: 4,
      humanOverrideEnabled: true
    },
    resources: ["provider_a", "provider_b"],
    rules: [
      { ruleId: "PROVIDER_COMPROMISE_V1", judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0", ruleKind: "INCIDENT", provisionalAllowed: true, reportBond: "0", confirmedBounty: "0", enabled: true },
      { ruleId: "SERVICE_FAILURE_V1", judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0", ruleKind: "INCIDENT", provisionalAllowed: true, reportBond: "0", confirmedBounty: "0", enabled: true },
      { ruleId: "REMEDIATION_CONFIRMED_V1", judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0", ruleKind: "REMEDIATION", provisionalAllowed: false, reportBond: "0", confirmedBounty: "0", enabled: true },
      { ruleId: "RECOVERY_VALIDATED_V1", judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0", ruleKind: "RECOVERY_VALIDATION", provisionalAllowed: false, reportBond: "0", confirmedBounty: "0", enabled: true }
    ],
    effects: [
      { actionType: "RESTRICT", resourceId: "provider_a", paramU256: "0", paramStr: "", releasePhase: "REMEDIATION_CONFIRMED", enabled: true },
      { actionType: "ENTER_SAFE_MODE", resourceId: "", paramU256: "0", paramStr: "", releasePhase: "REMEDIATION_CONFIRMED", enabled: true },
      { actionType: "ENTER_RECOVERY", resourceId: "", paramU256: "0", paramStr: "", releasePhase: "RECOVERY_VALIDATED", enabled: true },
      { actionType: "RESTORE", resourceId: "", paramU256: "0", paramStr: "", releasePhase: "RECOVERY_VALIDATED", enabled: true }
    ]
  },
  "demo-payments": {
    summary: { policyKey: "policy-demo-1", targetId: "demo-payments", version: 1, manifestHash: "0x" + "ab".repeat(32), sealed: true, active: true, superseded: false, ruleCount: 1, resourceCount: 2, effectCount: 1, humanOverrideEnabled: false },
    resources: ["provider_a", "provider_b"],
    rules: [{ ruleId: "SERVICE_FAILURE_V1", judge: "0x0000000000000000000000000000000000000099", ruleKind: "INCIDENT", provisionalAllowed: true, reportBond: "0", confirmedBounty: "0", enabled: true }],
    effects: [{ actionType: "MONITOR", resourceId: "", paramU256: "0", paramStr: "", releasePhase: "REMEDIATION_CONFIRMED", enabled: true }]
  }
};

const INCIDENT_A = "reclose-target-004:0x24fae7cd031ed702be63bdea8912141805b996bd:11";
const INCIDENT_B = "reclose-target-004:0x24fae7cd031ed702be63bdea8912141805b996bd:12";

export const incidents = [
  {
    incidentId: INCIDENT_A,
    targetId: "reclose-target-004",
    policyKey: "policy-r1-004",
    ruleId: "PROVIDER_COMPROMISE_V1",
    resourceId: "provider_a",
    reporter: "0x24fae7cd031ed702be63bdea8912141805b996bd",
    judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0",
    evidenceHash: "0x6ab9ba4f14b4b9d2f5329de90dbca90f748afcb2a0b854f0d965578307eca703",
    conditionCode: "CONFIRMED_CREDENTIAL_COMPROMISE",
    status: "FINAL_CONFIRMED",
    finalOutcome: "CONFIRMED",
    provisionalOutcome: "CONFIRMED",
    createdAt: "2026-09-12T05:00:00.000Z",
    closedAt: null,
    decisionStage: "FINAL",
    evidence: {
      subject: "Provider A credential compromise",
      sources: [
        { sourceId: "provider-a-status", url: "https://status.example.com/provider-a/incident-11", sourceClass: "AUTHORITATIVE_PUBLIC", availability: "AVAILABLE", contentHash: "0x" + "11".repeat(32) },
        { sourceId: "independent-monitor", url: "https://monitor.example.net/events/884", sourceClass: "INDEPENDENT_PUBLIC", availability: "AVAILABLE", contentHash: "0x" + "22".repeat(32) }
      ]
    },
    judgmentTx: {
      txId: "0x" + "31".repeat(32), rawStatus: "FINALIZED", rawResult: "MAJORITY_AGREE", protocolDecisionOutcome: "accepted", executionResult: "FINISHED_WITH_RETURN", derived: { isFinal: true, displayLabel: "Finalized" }
    },
    trace: [
      { role: "REPORT_SUBMISSION", txId: "0x" + "31".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_RETURN", finalStatus: "SUCCESS" },
      { role: "JUDGE_DECISION", txId: "0x" + "32".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_RETURN", finalStatus: "SUCCESS" },
      { role: "KERNEL_EFFECT", txId: "0x" + "33".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_RETURN", finalStatus: "SUCCESS" },
      { role: "TARGET_ACTION", txId: "0x" + "34".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_RETURN", finalStatus: "SUCCESS" }
    ],
    consequences: [
      { actionType: "RESTRICT", resourceId: "provider_a", stage: "PROVISIONAL", execution: "SUCCESS" },
      { actionType: "ENTER_SAFE_MODE", resourceId: "", stage: "PROVISIONAL", execution: "SUCCESS" }
    ],
    recovery: { remediationRequired: true, remediationSubmitted: false, remediationDecision: null, recoveryValidationRequired: true, recoveryValidated: false, remainingRestrictions: ["provider_a", "safe_mode"] }
  },
  {
    incidentId: INCIDENT_B,
    targetId: "reclose-target-004",
    policyKey: "policy-r1-004",
    ruleId: "SERVICE_FAILURE_V1",
    resourceId: "provider_b",
    reporter: "0x24fae7cd031ed702be63bdea8912141805b996bd",
    judge: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0",
    evidenceHash: "0x" + "55".repeat(32),
    conditionCode: "INSUFFICIENT_EVIDENCE",
    status: "CLOSED",
    finalOutcome: "UNDETERMINED",
    provisionalOutcome: null,
    createdAt: "2026-09-12T05:17:00.000Z",
    closedAt: "2026-09-12T05:26:00.000Z",
    decisionStage: "FINAL",
    evidence: { subject: "Possible Provider B outage", sources: [{ sourceId: "third-party-monitor", url: "https://monitor.example.net/provider-b", sourceClass: "INDEPENDENT_PUBLIC", availability: "VARIANT_CONTENT", contentHash: "0x" + "66".repeat(32) }] },
    judgmentTx: { txId: "0x" + "41".repeat(32), rawStatus: "FINALIZED", rawResult: "MAJORITY_AGREE", protocolDecisionOutcome: "accepted", executionResult: "FINISHED_WITH_RETURN", derived: { isFinal: true, displayLabel: "Finalized" } },
    trace: [
      { role: "REPORT_SUBMISSION", txId: "0x" + "41".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_RETURN", finalStatus: "SUCCESS" },
      { role: "JUDGE_DECISION", txId: "0x" + "42".repeat(32), rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_ERROR", finalStatus: "FAILURE", error: "fee no_matching_allocation # internal" }
    ],
    consequences: [],
    recovery: { remediationRequired: false, remediationSubmitted: false, remediationDecision: null, recoveryValidationRequired: false, recoveryValidated: false, remainingRestrictions: ["monitor_until_policy_replacement"] }
  }
];

export const deployment = {
  network: "studio-dev",
  chainId: 61997,
  commit: "6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5",
  contracts: {
    ProviderStubA: "0x088430851fBFD581DA329A262FD9C0aEd7b4AD2E",
    ProviderStubB: "0x4b55607312E045FcAd21b836702247F6d65844A8",
    AssuranceKernel: "0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621",
    ReferenceAgentProtocol: "0x7B423D9787aeACC303467dE82A2D193D77155f0f",
    IncidentJudgeV1: "0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0",
    IncentiveVault: "0xB3476a8881e8866a6d92c8252a840a08004d02c3"
  },
  liveLimitation: "Judge -> Kernel triggered child currently fails on Studio-dev with fee no_matching_allocation # internal. This is shown as an execution-layer failure, not a failed semantic judgment.",
  lastEvidenceAt: NOW
};

export const benchmark = {
  status: "IN_PROGRESS",
  required: 60,
  implemented: 52,
  passed: 52,
  failed: 0,
  blockedLive: 8,
  hardTargets: [
    ["unauthorized autonomous action successful", 0],
    ["duplicate economic effect", 0],
    ["autonomous authority expansion", 0],
    ["Kernel invariant violation", 0],
    ["cross-incident erroneous restoration", 0],
    ["stale-policy authority execution", 0]
  ]
};

export const policyDiff = {
  fromVersion: 3,
  toVersion: 4,
  authorityExpands: true,
  activationDelaySeconds: 60,
  changes: [
    { kind: "ACTION_ADDED", description: "RESTRICT provider_a added to PROVIDER_COMPROMISE_V1", isExpansion: true },
    { kind: "ACTION_ADDED", description: "ENTER_SAFE_MODE added as a bounded consequence", isExpansion: true },
    { kind: "RESOURCE_ADDED", description: "provider_b added as fallback protected resource", isExpansion: true },
    { kind: "BOUND_NARROWED", description: "safe-mode spend ceiling reduced", isExpansion: false }
  ]
};
