// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./IClaimIssuer.sol";

contract ClaimIssuer is IClaimIssuer, Initializable {
    address public owner;
    mapping (bytes => bool) public revokedSignatures;
    mapping (bytes32 => bool) public signatureKeys;
    uint256[49] __gap;

    error NotAuthorized();
    error NotAcceptingEther();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, address signatureKey) public initializer {
        owner = _owner;
        bytes32 signKeyHash = keccak256(abi.encode(signatureKey));
        signatureKeys[signKeyHash] = true;
    }

    /**
     * @dev Recover the key that signed a message. Only supported ECDSA signatures.
     * @param signature the signature of the message
     * @param digest the hash of the signed message
     */
    function getRecoveredAddress(bytes memory signature, bytes32 digest)
    public
    pure
    returns (address signKey)
    {
        bytes32 ra;
        bytes32 sa;
        uint8 va;

        // Check the signature length
        if (signature.length != 65) {
            return address(0);
        }

        // Divide the signature in r, s and v variables
        assembly {
            ra := mload(add(signature, 32))
            sa := mload(add(signature, 64))
            va := byte(0, mload(add(signature, 96)))
        }

        if (va < 27) {
            va += 27;
        }

        address recoveredAddress = ecrecover(digest, va, ra, sa);

        return (recoveredAddress);
    }

    /**
     * @dev Returns revocation status of a claim.
     * @param signature the signature of the claim
     * @return signatureRevoked true if the claim is revoked and false otherwise
     */
    function isSignatureRevoked(bytes memory signature) public view returns(bool signatureRevoked) {
        return revokedSignatures[signature];
    }

    /**
     * @dev Check if a signature key (hashed) is allowed to sign claims.
     * @param keyHash the key to check
     */
    function isSignatureKeyAllowed(bytes32 keyHash) public view returns(bool signatureKeyAllowed) {
        return signatureKeys[keyHash];
    }

    /**
     * @dev Checks if a claim is valid. The method verified that the key used to sign the claim
     * is allowed to sign claims and that the signature is not revoked.
     * @param identity the address of the subject of the claim
     * @param claimTopic the claim topic of the claim
     * @param signature the signature of the claim
     * @param data the data field of the claim
     * @return claimIsValid true if the claim is valid, false otherwise
     */
    function isClaimValid(address identity, uint256 claimTopic, bytes calldata signature, bytes calldata data) public override view returns (bool claimIsValid) {
        bytes32 digest = keccak256(abi.encode(identity, claimTopic, data));
        // Use abi.encodePacked to concatenate the message prefix and the message to sign.
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));

        // Recover address of data signer
        address recovered = getRecoveredAddress(signature, prefixedHash);

        // Take hash of recovered signature key
        bytes32 signKeyHash = keccak256(abi.encode(recovered));

        if (isSignatureRevoked(signature) == true) {
            return false;
        }

        if (isSignatureKeyAllowed(signKeyHash) == false) {
            return false;
        }

        return true;
    }

    /**
     * @dev Revokes a signature (only as the owner).
     * @param signature the signature to revoke
     */
    function revokeSignature(bytes calldata signature) public {
        if (msg.sender != owner) {
            revert NotAuthorized();
        }

        revokedSignatures[signature] = true;
    }

    /**
     * @dev Add a signature key (only as the owner).
     * @param signatureKeyHash the hash of the key to add (keccak256(abi.encode(signatureKey)))
     */
    function addSignatureKey(bytes32 signatureKeyHash) public {
        if (msg.sender != owner) {
            revert NotAuthorized();
        }

        signatureKeys[signatureKeyHash] = true;
    }

    /**
     * @dev Remove a signature key (only as the owner).
     * @param signatureKeyHash the hash of the key to remove (keccak256(abi.encode(signatureKey)))
     */
    function removeSignatureKey(bytes32 signatureKeyHash) public {
        if (msg.sender != owner) {
            revert NotAuthorized();
        }

        signatureKeys[signatureKeyHash] = false;
    }

    receive() external payable {
        revert NotAcceptingEther();
    }
}
