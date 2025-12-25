import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the PhantomArchive address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const archive = await deployments.get("PhantomArchive");

  console.log("PhantomArchive address is " + archive.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:add-file --name "demo.txt"
 *   - npx hardhat --network sepolia task:add-file --name "demo.txt"
 */
task("task:add-file", "Stores a file record in PhantomArchive")
  .addOptionalParam("address", "Optionally specify the PhantomArchive contract address")
  .addOptionalParam("name", "File name to store", "demo.txt")
  .addOptionalParam("hash", "Encrypted IPFS hash to store", "ciphertext:demo")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const archiveDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("PhantomArchive");
    console.log(`PhantomArchive: ${archiveDeployment.address}`);

    const signers = await ethers.getSigners();
    const archiveContract = await ethers.getContractAt("PhantomArchive", archiveDeployment.address);

    const randomWallet = ethers.Wallet.createRandom();
    const addressKey = randomWallet.address;

    const encryptedInput = await fhevm
      .createEncryptedInput(archiveDeployment.address, signers[0].address)
      .addAddress(addressKey)
      .encrypt();

    const tx = await archiveContract
      .connect(signers[0])
      .addFile(taskArguments.name, taskArguments.hash, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`Stored file "${taskArguments.name}" with address key ${addressKey}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-address --user 0xabc... --index 0
 *   - npx hardhat --network sepolia task:decrypt-address --user 0xabc... --index 0
 */
task("task:decrypt-address", "Decrypts the address key for a file record")
  .addOptionalParam("address", "Optionally specify the PhantomArchive contract address")
  .addParam("user", "User address that owns the file record")
  .addOptionalParam("index", "File index", "0")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const archiveDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("PhantomArchive");
    console.log(`PhantomArchive: ${archiveDeployment.address}`);

    const signers = await ethers.getSigners();
    const archiveContract = await ethers.getContractAt("PhantomArchive", archiveDeployment.address);

    const index = parseInt(taskArguments.index);
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Argument --index must be a non-negative integer`);
    }

    const record = await archiveContract.getUserFile(taskArguments.user, index);
    const decryptedAddress = await fhevm.userDecryptEaddress(
      FhevmType.eaddress,
      record[2],
      archiveDeployment.address,
      signers[0],
    );

    console.log(`Decrypted address key: ${decryptedAddress}`);
  });
