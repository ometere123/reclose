RECLOSE SYNTHETIC R1 DEMONSTRATION EVIDENCE — PROVIDER A REMEDIATION
fixture_version: 1
fixture_id: r1-demo-provider-a-remediation
reality: SYNTHETIC; this is not a real incident response, credential rotation, or production change.
provider: Provider A (controlled demo contract reclose-target-006)
scenario: In this controlled demo, the fictional credential fixture-key-a-7 is revoked and replaced with fixture-key-a-8. The old credential is rejected by the simulator; the replacement is restricted to the intended Provider A audience. The remediation check records the old-key rejection and the new-key scope check as successful.
condition: REMEDIATION_VERIFIED
purpose: deterministic evidence input for the Reclose R1 demo only.
