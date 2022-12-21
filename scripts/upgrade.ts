import {ethers, upgrades} from "hardhat";

async function main() {
  const claimIssuerToUpgrade = '<ClaimIssuerAddress>';

  const ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
  const claimIssuer = await upgrades.upgradeProxy(claimIssuerToUpgrade, ClaimIssuer);

  console.log(`ClaimIssuer upgraded at ${claimIssuer.address}.`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
