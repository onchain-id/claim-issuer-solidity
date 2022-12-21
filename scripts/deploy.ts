import {ethers, upgrades} from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const signatureKeyWallet = await ethers.Wallet.createRandom();

  const ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
  const claimIssuer = await upgrades.deployProxy(ClaimIssuer, [owner.address, signatureKeyWallet.address]);

  await claimIssuer.deployed();

  console.log(`ClaimIssuer deployed to ${claimIssuer.address} with owner ${owner.address} and signature key ${signatureKeyWallet.address} (private key: ${signatureKeyWallet.privateKey})`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
