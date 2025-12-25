# PhantomArchive

PhantomArchive is a privacy-first file metadata archive that keeps IPFS hashes encrypted while storing verifiable
records on-chain. It combines client-side encryption with Zama FHE so users can always recover their hashes without
revealing them publicly.

## Overview

PhantomArchive lets a user:
- Pick a local file and create a pseudo IPFS hash (no real upload in this demo flow).
- Generate a fresh EVM address as a one-time encryption key.
- Encrypt the IPFS hash locally using AES-GCM derived from that address.
- Encrypt the address key with Zama FHE (eaddress) and store everything on-chain.
- Later decrypt the address key through the Zama relayer and recover the IPFS hash.

## Goals

- Keep IPFS hashes confidential even when metadata is stored on-chain.
- Allow the original uploader to recover hashes without a centralized key server.
- Use verifiable on-chain storage for auditability and indexing.
- Keep the implementation small and easy to reason about.

## The Problem It Solves

Public blockchains and IPFS are transparent by default. A raw IPFS hash can reveal access patterns and, in some
contexts, the underlying content. Traditional approaches push key management off-chain or into trusted servers.
PhantomArchive keeps the record on-chain while keeping the hash confidential.

## Why It Is Useful

- Keeps IPFS hashes hidden while still allowing retrieval.
- Avoids centralized key storage by sealing keys with FHE.
- Offers deterministic recovery for the original uploader.
- Preserves simple, auditable on-chain records.

## Key Advantages

- **Privacy-first metadata**: only encrypted hashes and encrypted address keys are stored.
- **Self-custodied recovery**: users decrypt with their wallet through the Zama relayer.
- **No file contents on-chain**: the chain stores metadata only.
- **Clear audit trail**: each stored record is timestamped and indexed.

## What Gets Stored On-Chain

Each file record contains:
- `fileName` (plain text)
- `encryptedIpfsHash` (AES-GCM ciphertext)
- `encryptedAddress` (Zama FHE eaddress handle)
- `createdAt` (timestamp)

Event emitted: `FileStored(user, index, fileName, createdAt)`

## Detailed Encryption Flow

1. A pseudo IPFS hash is generated in the browser (mocked upload).
2. A random EVM address is created locally to act as the key source.
3. The address is normalized and hashed with SHA-256.
4. The SHA-256 digest is used as the AES-GCM key.
5. The IPFS hash is encrypted to the format `base64(iv):base64(ciphertext)`.
6. The address is encrypted with Zama FHE as an `eaddress` handle.
7. The contract stores the encrypted hash and encrypted address handle together.

## Detailed Decryption Flow

1. The UI generates a Zama keypair for a user decrypt request.
2. It builds an EIP-712 payload covering:
   - user public key
   - target contract address
   - a start timestamp and validity duration
3. The wallet signs the EIP-712 typed data.
4. The UI calls the relayer to decrypt the `eaddress` handle for the user.
5. The decrypted address is used to locally decrypt the IPFS hash.

## Architecture

- **Smart contract**: `contracts/PhantomArchive.sol`
  - Stores per-user file records in a mapping.
  - Validates Zama FHE input proofs (`FHE.fromExternal`).
  - Grants access with `FHE.allowThis` and `FHE.allow`.
- **Frontend**: `ui/` (React + Vite)
  - Read operations via wagmi/viem.
  - Write operations via ethers.
  - Zama relayer integration via `@zama-fhe/relayer-sdk`.
- **Encryption**:
  - AES-GCM for IPFS hash encryption.
  - Zama FHE `eaddress` for sealing the address key.

## Technology Stack

- **Contracts**: Solidity, Hardhat, hardhat-deploy, TypeChain
- **FHE**: Zama FHEVM, `@fhevm/solidity`, `@fhevm/hardhat-plugin`
- **Frontend**: React, Vite, wagmi, viem, RainbowKit, ethers
- **Relayer**: `@zama-fhe/relayer-sdk`
- **Testing**: Mocha, Chai

## Smart Contract Interface

- `addFile(fileName, encryptedIpfsHash, encryptedAddress, inputProof)`
  - Stores a new file record and sets FHE access permissions.
- `getUserFileCount(user)`
  - Returns the number of files stored for a user.
- `getUserFile(user, index)`
  - Returns the record data for a specific index.

## Repository Structure

```
contracts/            Smart contract source
deploy/               Deployment script
tasks/                Hardhat tasks
test/                 Contract tests
ui/                   Frontend application
```

## Development Setup

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

```bash
npm install
```

### Compile and Test

```bash
npm run compile
npm run test
```

### Deploy (Sepolia)

```bash
npm run deploy:sepolia
```

Requirements for Sepolia deployment:
- `.env` with `INFURA_API_KEY` and `PRIVATE_KEY`
- `PRIVATE_KEY` must be a single private key (no mnemonic)

### Run Sepolia Test Suite

```bash
npm run test:sepolia
```

### Useful Tasks

```bash
npx hardhat task:address --network sepolia
npx hardhat task:add-file --network sepolia --name "demo.txt" --hash "ciphertext:demo"
npx hardhat task:decrypt-address --network sepolia --user <WALLET_ADDRESS> --index 0
```

## Frontend Setup

1. Install frontend dependencies:

   ```bash
   cd ui
   npm install
   ```

2. Configure wallet connect:
   - Update the WalletConnect project id in `ui/src/config/wagmi.ts`.

3. Update the contract address and ABI:
   - Copy the ABI from `deployments/sepolia`.
   - Update `ui/src/config/contracts.ts` with the deployed address and ABI.

4. Start the UI:

   ```bash
   npm run dev
   ```

The frontend targets Sepolia and uses wallet-based authentication.

## Notes and Limitations

- The IPFS upload is intentionally mocked to generate a pseudo hash for demonstration.
- File contents are never uploaded or stored by this repo.
- File names are stored in plain text on-chain; do not use sensitive names.
- There is no on-chain deletion or record update in the current contract.
- Decryption relies on the Zama relayer and user signatures.

## Future Roadmap

- Real IPFS or pinning service integration.
- Optional file content encryption + client-side encryption of full files.
- Record sharing and delegated access policies.
- Tagging, search indexing, and metadata filters.
- On-chain pagination helpers for large archives.
- UI enhancements for batch uploads and bulk decrypt.

## License

BSD-3-Clause-Clear. See `LICENSE`.
