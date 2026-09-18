schema: reclose-r1-controlled-evidence-v6
reality: SYNTHETIC controlled demonstration evidence; no production claim.
target_id: reclose-target-r1-final-a10
provider: Provider A
scenario: recovery validation is evaluated for the exact root incident below after remediation.
root_incident_id: reclose-target-r1-final-a10:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0
observations:
- the referenced root incident is the exact Provider A compromise incident for this target
- the target is expected to be in RECOVERY when the recovery decision is evaluated
- remediation was accepted for this exact root incident
- Provider B continuity remains available during RECOVERY
- a fresh Provider A readiness probe is required and must be independently bound to this recovery submission
- the deterministic Kernel recovery reconciliation is RESTORE action type 10 with resource_id empty and param_u256 0
- the target should return to NORMAL only after the successful Kernel and Target reconciliation children