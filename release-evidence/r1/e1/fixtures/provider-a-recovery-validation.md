RECLOSE SYNTHETIC R1 DEMONSTRATION EVIDENCE — PROVIDER A RECOVERY VALIDATION
fixture_version: 1
fixture_id: r1-demo-provider-a-recovery-validation
reality: SYNTHETIC; this is not a real production recovery or a claim about a real security event.
provider: Provider A (controlled demo contract reclose-target-006)
scenario: In this controlled demo, Provider A passes the defined recovery checks after remediation: the replacement credential is accepted only for the intended audience, the revoked fixture-key-a-7 remains rejected, replayed SYNTH-A-001 and SYNTH-A-002 requests are rejected, and the demo health check returns healthy for the validation window.
condition: RECOVERY_VERIFIED
purpose: deterministic evidence input for the Reclose R1 demo only.
