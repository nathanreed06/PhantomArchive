import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { PhantomArchive } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("PhantomArchiveSepolia", function () {
  let signers: Signers;
  let archiveContract: PhantomArchive;
  let archiveContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const archiveDeployment = await deployments.get("PhantomArchive");
      archiveContractAddress = archiveDeployment.address;
      archiveContract = await ethers.getContractAt("PhantomArchive", archiveDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("stores and decrypts a file record", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    const fileName = "sepolia-demo.txt";
    const encryptedHash = "ciphertext:sepolia-demo";
    const randomAddressKey = ethers.Wallet.createRandom().address;

    progress("Encrypting address key...");
    const encryptedInput = await fhevm
      .createEncryptedInput(archiveContractAddress, signers.alice.address)
      .addAddress(randomAddressKey)
      .encrypt();

    progress("Submitting addFile()...");
    const tx = await archiveContract
      .connect(signers.alice)
      .addFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    progress("Fetching record count...");
    const count = await archiveContract.getUserFileCount(signers.alice.address);
    expect(count).to.be.greaterThan(0);

    progress("Fetching record...");
    const record = await archiveContract.getUserFile(signers.alice.address, count - 1n);
    expect(record[0]).to.eq(fileName);

    progress("Decrypting address key...");
    const decryptedAddress = await fhevm.userDecryptEaddress(
      FhevmType.eaddress,
      record[2],
      archiveContractAddress,
      signers.alice,
    );
    progress(`Decrypted address key: ${decryptedAddress}`);

    expect(decryptedAddress).to.eq(randomAddressKey);
  });
});
