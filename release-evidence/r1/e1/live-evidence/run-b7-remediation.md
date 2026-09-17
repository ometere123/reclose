schema: reclose-r1-controlled-evidence-v4
reality: SYNTHETIC controlled demonstration; this fixture is evidence for the isolated Run B7 namespace only.
target_id: reclose-target-r1-final-b7
provider: Provider A
root_incident_id: reclose-target-r1-final-b7:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
scenario: corrective remediation for the exact Run B7 root incident above, not for any other generation.
observations:
  incident_binding: the remediation record names the exact root incident and target namespace.
  credential_check: the compromised Provider A credential is rejected after the corrective change.
  replacement_scope: the corrective change is scoped to the governed Provider A audience.
  continuity_check: Provider B remains available while remediation is evaluated.
  reconciliation_context: the Kernel performs the bounded target-wide reconciliation into RECOVERY.

