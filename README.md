# ONCHAINID Claim Issuer contracts

This repository contains the source code for the ONCHAINID Claim Issuer contracts.

Usage of contracts there is recommended for claim issuer rather than using the base contracts
of the main [https://github.com/onchain-id/solidity](https://github.com/onchain-id/solidity) repository.

## Deploy and upgrade contracts

When deploying and upgrading contracts, it is recommended that you store the content of the
[./openzeppelin](./.openzeppelin) folder, as it contains the addresses of the deployed contracts, their proxies
and all checks related to the upgradeability.

> **Note:**
> The [./openzeppelin](./.openzeppelin) folder is not tracked by git by default, you might want to remove the exclusion
> from the [.gitignore](./.gitignore) file or store its content elsewhere.

### Deploy a new claim issuer

Deploying a new claim issuer contract is done using the [./scripts/deploy.ts](./scripts/deploy.ts) script.

```bash
npx hardhat run --network <network> scripts/deploy.ts
```

> **Note:**
> `<network>` must match a network defined in [./hardhat.config.ts](./hardhat.config.ts).

### Update an existing claim issuer

Updating an existing claim issuer contract is done using the [./scripts/upgrade.ts](./scripts/upgrade.ts) script.

The address of the contract to upgrade must be specified in the [./scripts/upgrade.ts](./scripts/upgrade.ts) file
(replace `<ClaimIssuerAddress>`).

By default, this will upgrade the contract to the latest version of the Claim Issuer on the revision that is checkout.
Upgrade checks will be runned, provided the address of the claim issuer is tracked in
the [./openzeppelin](./.openzeppelin) folder. If when the contract was initially deployed the content of this folder
was saved, then all checks will be performed correctly.

Otherwise, you might want to write the content of the file and run the upgrade script anyway by forcing the upgrade.

```bash
npx hardhat run --network <network> scripts/upgrade.ts
```

> **Note:**
> `<network>` must match a network defined in [./hardhat.config.ts](./hardhat.config.ts).
