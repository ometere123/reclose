schema: reclose-r1-controlled-evidence-v4
reality: SYNTHETIC controlled demonstration; this snapshot records post-remediation Run A8 observations.
target_id: reclose-target-r1-final-a8
provider: Provider A
root_incident_id: reclose-target-r1-final-a8:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
recovery_probe_ref: reclose-r1-run-a8-recovery-probe-001
scenario: post-remediation recovery observations for the exact Run A8 root incident above.
observations:
  incident_binding: the recovery record names the exact root incident.
  provider_a_readiness: the exact Provider A probe reference is fulfilled with a non-zero payment.
  provider_b_continuity: Provider B handled the continuity request while the target remained in RECOVERY.
  target_reconciliation: the governed target completed the bounded reconciliation to NORMAL.
  authority_check: the assurance controller remains the Run A8 Kernel and no owner revocation is present.

