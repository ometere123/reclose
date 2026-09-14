# Known limitations

- The old `on="accepted"` failure is superseded. A typed-address, read-only `emit_decided` simulation passed on Studio-dev chain 61997 with the saved allocation (`transactionSubmitted: false`; fee is an estimate, not a charge). This proves only isolated message emission. The active policy's deployed Kernel/Judge source commit predates the `decided` fix, so live signing is fail-closed pending a source-matched deployment. No full incident lifecycle or recovery is verified; E1 A/B, H1, and final live fee coverage remain incomplete.
- The deployed Studio version is recorded as `v0.123.0-rc.6`; the service does not expose an exact backend source SHA.
- The 78-scenario corpus has not completed H1 execution; performance/security rates are not claimed.
- Requirements (156 rows) and threats (82 rows) are not fully reconciled to implementation, tests, evidence and commits.
- A3/A4 are not externally approved. Audit status is awaiting external review under the owner execution override.
- Studio-dev/61997 is a demonstration environment. Production execution, cross-chain routes and production integrations are outside R1 evidence.
- The user-provided funding screenshot's transaction ID is truncated; treasury balance is read back as 0.20 GEN, and no funding hash is invented.
