# A3 Attempt 2 - Known Limitations

1. A3-H07, A3-H08, A3-H09 are not closed this pass; A3-H02 is only partially closed (target
   registration is real, policy activation is still a stub) - see `findings-closure.md`.
2. A3-H04's live trace reconstruction attempts the Judge parent + one child; the Kernel -> Target
   second hop is not yet wired into the live adapter (the fixture-mode Incident Explorer shows the
   full four-hop trace only because the synthetic fixture data supplies it directly).
3. A3-H12's incident-identity persistence is post-hoc (persists whatever a writer returns); the
   deterministic pre-resolution derivation described in FINAL_REMEDIATION.md Section 13 is not
   implemented.
4. No live-wallet writer was connected during the browser evidence pass - the wrong-network
   blocking behavior (A3-H03) is proven by unit test, not by an in-situ browser screenshot of the
   blocked-signing banner.
5. No automated axe-core/Lighthouse accessibility scan was run against this exact SHA.
6. No full manual screen-reader pass was performed.
7. A2-C01 (Studio-dev Judge -> Kernel `fee no_matching_allocation # internal`) remains open and
   independently blocks E1/R1 closure - unchanged by this A3 remediation pass, and honestly
   visible in the browser evidence itself (the UNDETERMINED/child-failure Incident Explorer case).
8. E1/H1-live/A4/R1/S1 work was not attempted in this pass, per FINAL_REMEDIATION.md Section 17's
   explicit sequencing ("E1 remains NOT COMPLETE until A3 passes").
