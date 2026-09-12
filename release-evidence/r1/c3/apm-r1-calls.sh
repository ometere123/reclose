bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 begin_policy --args "reclose-target-003" "policy-r1-001" "0x103dd06b09596405f7f601827baffa4ca770fcc18dfdba4f527942043f0a635b"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_resource --args "policy-r1-001" "provider_a"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_resource --args "policy-r1-001" "provider_b"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_rule --args "policy-r1-001" "PROVIDER_COMPROMISE_V1" "0xe40CEA40bE5a6648C94c21d7824dE967CcAa4dAF" 1 1 true "0" "0"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_rule --args "policy-r1-001" "REMEDIATION_CONFIRMED_V1" "0xe40CEA40bE5a6648C94c21d7824dE967CcAa4dAF" 1 2 false "0" "0"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_rule --args "policy-r1-001" "RECOVERY_VALIDATED_V1" "0xe40CEA40bE5a6648C94c21d7824dE967CcAa4dAF" 1 3 false "0" "0"
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_effect --args "policy-r1-001" "PROVIDER_COMPROMISE_V1" 3 "provider_a" "0" "" 1
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_effect --args "policy-r1-001" "PROVIDER_COMPROMISE_V1" 7 "" "0" "" 1
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_effect --args "policy-r1-001" "REMEDIATION_CONFIRMED_V1" 9 "" "0" "" 1
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 add_policy_effect --args "policy-r1-001" "RECOVERY_VALIDATED_V1" 10 "" "0" "" 2
bash scripts/studio-dev-write.sh 0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621 seal_policy --args "policy-r1-001"
