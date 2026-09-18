schema: reclose-r1-controlled-evidence-v6
reality: SYNTHETIC controlled demonstration evidence; no production claim.
target_id: reclose-target-r1-final-a10
provider: Provider A
scenario: remediation is evaluated for the exact root incident below.
root_incident_id: reclose-target-r1-final-a10:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
observations:
- the referenced root incident is the Provider A compromise incident for this exact target
- the root incident was accepted as CREDENTIAL_COMPROMISE
- the target was contained in SAFE_MODE and Provider B continuity was available before remediation
- remediation is evaluated against the active policy's REMEDIATION_CONFIRMED_V1 rule
- the deterministic Kernel remediation reconciliation is RESTORE action type 10 with resource_id empty and param_u256 5
- the reconciliation is expected to move the target into RECOVERY after the confirmed remediation decision