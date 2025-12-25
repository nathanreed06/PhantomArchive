import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PhantomArchive, PhantomArchive__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PhantomArchive")) as PhantomArchive__factory;
  const archiveContract = (await factory.deploy()) as PhantomArchive;
  const archiveContractAddress = await archiveContract.getAddress();

  return { archiveContract, archiveContractAddress };
}

describe("PhantomArchive", function () {
  let signers: Signers;
  let archiveContract: PhantomArchive;
  let archiveContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ archiveContract, archiveContractAddress } = await deployFixture());
  });

  it("starts empty for new users", async function () {
    const count = await archiveContract.getUserFileCount(signers.alice.address);
    expect(count).to.eq(0);
  });

  it("stores and decrypts a file record", async function () {
    const fileName = "report.pdf";
    const encryptedHash = "ciphertext:demo";
    const randomAddressKey = ethers.Wallet.createRandom().address;

    const encryptedInput = await fhevm
      .createEncryptedInput(archiveContractAddress, signers.alice.address)
      .addAddress(randomAddressKey)
      .encrypt();

    const tx = await archiveContract
      .connect(signers.alice)
      .addFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const count = await archiveContract.getUserFileCount(signers.alice.address);
    expect(count).to.eq(1);

    const record = await archiveContract.getUserFile(signers.alice.address, 0);
    expect(record[0]).to.eq(fileName);
    expect(record[1]).to.eq(encryptedHash);
    expect(record[3]).to.be.greaterThan(0n);

    const decryptedAddress = await fhevm.userDecryptEaddress(
      FhevmType.eaddress,
      record[2],
      archiveContractAddress,
      signers.alice,
    );

    expect(decryptedAddress).to.eq(randomAddressKey);
  });
});
