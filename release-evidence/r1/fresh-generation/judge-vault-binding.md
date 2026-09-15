# Fresh generation Judge/Vault binding evidence

Network: Studio Next / Studio-dev, chain 61997.

- IncidentJudgeV1: `0x19b63c9C743862CdDA35eE932293B33E33DF05C8`
- IncentiveVault: `0xc010c956311E72cd2930065501D19Db57A12CcED`
- Binding method: `IncidentJudgeV1.set_vault`
- Transaction: `0x3f985e0f2a9a2f571d836bddd1448bca52e142eff375f56ab5dddfeacd12aa7f`
- Receipt: FINALIZED, MAJORITY_AGREE, execution_result SUCCESS.

Authoritative readbacks:

- Judge `get_kernel()` = `0x6eccfb2b150f12a1a96b9baa7b762d1f15dcffd3`
- Judge `get_vault()` = `0xc010c956311e72cd2930065501d19db57a12cced`
- Judge `get_module_version()` = `1`
- Judge `get_source_registry_hash()` = `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`
- Vault `get_kernel()` = `0x6eccfb2b150f12a1a96b9baa7b762d1f15dcffd3`
- Vault `get_judge()` = `0x19b63c9c743862cdda35ee932293b33e33df05c8`

The one-time binding was executed once; no second `set_vault` attempt was made.
