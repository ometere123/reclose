schema: reclose-r1-controlled-evidence-v3
reality: SYNTHETIC controlled demonstration; this fixture describes an isolated corrective-action test.
target_id: reclose-target-r1-final-a7
provider: Provider A
root_incident_id: reclose-target-r1-final-a7:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
scenario: corrective checks for the compromised Provider A credential are evaluated against the exact root incident above.
observations:
  incident_binding: the remediation record names the exact root incident and this target namespace.
  credential_check: the compromised credential is rejected after the corrective change.
  replacement_scope_check: the replacement credential is accepted only for the intended Provider A audience.
  authorization_check: the compromised Provider A authorization is no longer valid for the governed target.
  governance_check: the Reclose controller and active policy remain the authority for the target response.
  continuity_check: Provider B remains available as the governed fallback while remediation is evaluated.
