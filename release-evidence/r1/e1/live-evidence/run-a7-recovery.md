schema: reclose-r1-controlled-evidence-v3
reality: SYNTHETIC controlled demonstration; this fixture describes an isolated recovery-validation test.
target_id: reclose-target-r1-final-a7
provider: Provider A
root_incident_id: reclose-target-r1-final-a7:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
recovery_probe_ref: reclose-r1-a7-recovery-probe-001
scenario: post-remediation recovery checks for the exact root incident above.
observations:
  incident_binding: the recovery record names the exact A7 root incident.
  provider_a_readiness: the exact Provider A probe reference is fulfilled with a non-zero payment.
  provider_b_continuity: Provider B handled the continuity request while the target remained in RECOVERY.
  target_reconciliation: the governed target is eligible for the final bounded reconciliation to NORMAL.
  authority_check: the assurance controller remains the Reclose Kernel and no owner revocation is present.
