import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";

function encodeSignatureKey(address: string): string {
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address"], [address]));
}

describe('ClaimIssuer', () => {
    async function deployClaimIssuerFixture() {
        const [, owner] = await ethers.getSigners();
        const signatureKeyWallet = await ethers.Wallet.createRandom();

        const ClaimIssuer = await ethers.getContractFactory('ClaimIssuer');
        const claimIssuer = await upgrades.deployProxy(ClaimIssuer, [owner.address, signatureKeyWallet.address]);

        return { claimIssuer, owner, signatureKeyWallet };
    }

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            const { claimIssuer, owner } = await loadFixture(deployClaimIssuerFixture);

            expect(await claimIssuer.owner()).to.equal(owner.address);
        });

        it('Should set the given key as a signature key', async () => {
            const { claimIssuer, signatureKeyWallet } = await loadFixture(deployClaimIssuerFixture);

            expect(await claimIssuer.isSignatureKeyAllowed(encodeSignatureKey(signatureKeyWallet.address))).to.be.true;
        });
    });

    describe('Managing signature keys', () => {
        describe('When not calling as owner', () => {
            it('Should revert addSignatureKey for NotAuthorized', async () => {
                const { claimIssuer } = await loadFixture(deployClaimIssuerFixture);

                const [, , otherAccount] = await ethers.getSigners();

                const newSignatureKey = await ethers.Wallet.createRandom();

                await expect(claimIssuer.connect(otherAccount).addSignatureKey(encodeSignatureKey(newSignatureKey.address))).to.be.revertedWithCustomError(claimIssuer, 'NotAuthorized');
                await expect(claimIssuer.isSignatureKeyAllowed(encodeSignatureKey(newSignatureKey.address))).to.be.eventually.false;
            });

            it('Should revert removeSignatureKey for NotAuthorized', async () => {
                const { claimIssuer, signatureKeyWallet } = await loadFixture(deployClaimIssuerFixture);

                const [, , otherAccount] = await ethers.getSigners();

                await expect(claimIssuer.connect(otherAccount).removeSignatureKey(encodeSignatureKey(signatureKeyWallet.address))).to.be.revertedWithCustomError(claimIssuer, 'NotAuthorized');
                await expect(claimIssuer.isSignatureKeyAllowed(encodeSignatureKey(signatureKeyWallet.address))).to.be.eventually.true;
            });
        });

        describe('When calling as owner', () => {
            it('Should add the new signature key', async () => {
                const { claimIssuer, owner } = await loadFixture(deployClaimIssuerFixture);

                const newSignatureKey = await ethers.Wallet.createRandom();

                await expect(claimIssuer.connect(owner).addSignatureKey(encodeSignatureKey(newSignatureKey.address))).to.be.eventually.fulfilled;
                await expect(claimIssuer.isSignatureKeyAllowed(encodeSignatureKey(newSignatureKey.address))).to.be.eventually.true;
            });

            it('Should remove the signature key', async () => {
                const { claimIssuer, owner, signatureKeyWallet } = await loadFixture(deployClaimIssuerFixture);

                await expect(claimIssuer.connect(owner).removeSignatureKey(encodeSignatureKey(signatureKeyWallet.address))).to.be.eventually.fulfilled;
                await expect(claimIssuer.isSignatureKeyAllowed(encodeSignatureKey(signatureKeyWallet.address))).to.be.eventually.false;
            });
        });
    });

    describe('Managing signature', () => {
       describe('When not calling as owner', () => {
          it('Should revert for NotAuthorized', async () => {
              const { claimIssuer } = await loadFixture(deployClaimIssuerFixture);

              const [, , otherAccount] = await ethers.getSigners();

              await expect(claimIssuer.connect(otherAccount).revokeSignature('0x0010')).to.be.revertedWithCustomError(claimIssuer, 'NotAuthorized');
              await expect(claimIssuer.isSignatureRevoked('0x0010')).to.be.eventually.false;
          });
       });

       describe('When calling as owner', () => {
           it('Should set the signature as revoked', async () => {
               const { claimIssuer, owner } = await loadFixture(deployClaimIssuerFixture);

               await expect(claimIssuer.connect(owner).revokeSignature('0x0010')).to.be.eventually.fulfilled;
               await expect(claimIssuer.isSignatureRevoked('0x0010')).to.be.eventually.true;
           });
       });
    });

    describe('Checking claim validity', () => {
       describe('When input claim params are incorrect', () => {
           it('Should return false because the signature is not correct length (65)', async () => {
                const { claimIssuer } = await loadFixture(deployClaimIssuerFixture);

                const identity = await ethers.Wallet.createRandom();

                await expect(claimIssuer.isClaimValid(
                    identity.address,
                    42,
                    '0x0010', // invalid signature length
                    '0x',
                )).to.be.eventually.false;
           });
       });

       describe('When input claim params are correct but the signature is not from a signature key', () => {
           it('Should return false because the signature was signed by a non authorized key', async () => {
               const { claimIssuer } = await loadFixture(deployClaimIssuerFixture);

               const identity = await ethers.Wallet.createRandom();
               const unknownSignatureKey = await ethers.Wallet.createRandom();

               const signature = await unknownSignatureKey.signMessage('0x0000');

               await expect(claimIssuer.isClaimValid(
                   identity.address,
                   42,
                   signature,
                   '0x',
               )).to.be.eventually.false;
           });
       });

        describe('When input claim params are correct but the claim was revoked', () => {
            it('Should return false because the claim was revoked', async () => {
                const { claimIssuer, owner, signatureKeyWallet } = await loadFixture(deployClaimIssuerFixture);

                const identity = await ethers.Wallet.createRandom();

                const claim = {
                    subject: identity.address,
                    topic: 42,
                    data: '0x0010402304',
                };

                const signature = await signatureKeyWallet.signMessage(
                    ethers.utils.keccak256(
                        ethers.utils.defaultAbiCoder.encode(
                            ['address', 'uint256', 'bytes'],
                            [claim.subject, claim.topic, claim.data],
                        )
                    )
                );

                await claimIssuer.connect(owner).revokeSignature(signature);

                await expect(claimIssuer.isClaimValid(
                    claim.subject,
                    claim.topic,
                    signature,
                    claim.data,
                )).to.be.eventually.false;
            });
        });

        describe('When the claim is valid', () => {
            it('Should return true', async () => {
                const { claimIssuer, signatureKeyWallet } = await loadFixture(deployClaimIssuerFixture);

                const identity = await ethers.Wallet.createRandom();

                const claim = {
                    subject: identity.address,
                    topic: 42,
                    data: '0x0010402304',
                };

                const signature = await signatureKeyWallet.signMessage(
                    ethers.utils.arrayify(
                        ethers.utils.keccak256(
                            ethers.utils.defaultAbiCoder.encode(
                                ['address', 'uint256', 'bytes'],
                                [claim.subject, claim.topic, claim.data],
                            )
                        )
                    )
                );

                await expect(claimIssuer.isClaimValid(
                    claim.subject,
                    claim.topic,
                    signature,
                    claim.data,
                )).to.be.eventually.true;
            });
        });
    });
});
