// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PhantomArchive
/// @notice Stores encrypted file metadata with a Zama-encrypted address key.
contract PhantomArchive is ZamaEthereumConfig {
    struct FileRecord {
        string fileName;
        string encryptedIpfsHash;
        eaddress encryptedAddress;
        uint64 createdAt;
    }

    mapping(address => FileRecord[]) private userFiles;

    event FileStored(address indexed user, uint256 indexed index, string fileName, uint64 createdAt);

    /// @notice Store file metadata and the encrypted address key.
    /// @param fileName The original file name.
    /// @param encryptedIpfsHash The IPFS hash encrypted with the generated address.
    /// @param encryptedAddress The Zama-encrypted address key.
    /// @param inputProof The Zama input proof.
    function addFile(
        string calldata fileName,
        string calldata encryptedIpfsHash,
        externalEaddress encryptedAddress,
        bytes calldata inputProof
    ) external {
        eaddress validatedAddress = FHE.fromExternal(encryptedAddress, inputProof);

        userFiles[msg.sender].push(
            FileRecord({
                fileName: fileName,
                encryptedIpfsHash: encryptedIpfsHash,
                encryptedAddress: validatedAddress,
                createdAt: uint64(block.timestamp)
            })
        );

        FHE.allowThis(validatedAddress);
        FHE.allow(validatedAddress, msg.sender);

        emit FileStored(msg.sender, userFiles[msg.sender].length - 1, fileName, uint64(block.timestamp));
    }

    /// @notice Returns the number of files stored by a user.
    /// @param user The user address.
    function getUserFileCount(address user) external view returns (uint256) {
        return userFiles[user].length;
    }

    /// @notice Returns a stored file record by index.
    /// @param user The user address.
    /// @param index The index of the file record.
    function getUserFile(
        address user,
        uint256 index
    )
        external
        view
        returns (string memory fileName, string memory encryptedIpfsHash, eaddress encryptedAddress, uint64 createdAt)
    {
        require(index < userFiles[user].length, "Index out of bounds");

        FileRecord storage record = userFiles[user][index];
        return (record.fileName, record.encryptedIpfsHash, record.encryptedAddress, record.createdAt);
    }
}
