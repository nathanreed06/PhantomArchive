import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { decryptWithAddress } from '../utils/crypto';
import '../styles/ArchiveList.css';

interface ArchiveListProps {
  refreshToken: number;
}

interface DecryptedEntry {
  addressKey: string;
  ipfsHash: string;
}

export function ArchiveList({ refreshToken }: ArchiveListProps) {
  const { address } = useAccount();
  const { instance, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [decryptingIndex, setDecryptingIndex] = useState<number | null>(null);
  const [decryptedEntries, setDecryptedEntries] = useState<Record<number, DecryptedEntry>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const isContractConfigured = true

  const {
    data: fileCount,
    isLoading: isCountLoading,
    refetch: refetchCount,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserFileCount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isContractConfigured,
    },
  });

  const count = useMemo(() => {
    if (!fileCount) return 0;
    if (typeof fileCount === 'bigint') return Number(fileCount);
    return Number(fileCount);
  }, [fileCount]);

  const fileContracts = useMemo(() => {
    if (!address || count === 0 || !isContractConfigured) return [];
    return Array.from({ length: count }, (_, index) => ({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getUserFile',
      args: [address, BigInt(index)],
    }));
  }, [address, count, isContractConfigured]);

  const {
    data: fileRecords,
    isLoading: isFilesLoading,
    refetch: refetchFiles,
  } = useReadContracts({
    contracts: fileContracts,
    query: {
      enabled: fileContracts.length > 0,
    },
  });

  useEffect(() => {
    if (refreshToken > 0) {
      refetchCount();
      refetchFiles();
    }
  }, [refreshToken, refetchCount, refetchFiles]);

  const entries = useMemo(() => {
    if (!fileRecords) return [];
    return fileRecords
      .map((record, index) => {
        const result = record.result as [string, string, string, bigint] | undefined;
        if (!result) return null;
        return {
          index,
          fileName: result[0],
          encryptedHash: result[1],
          encryptedAddress: result[2],
          createdAt: result[3],
        };
      })
      .filter(
        (entry): entry is { index: number; fileName: string; encryptedHash: string; encryptedAddress: string; createdAt: bigint } =>
          entry !== null,
      );
  }, [fileRecords]);

  const formatTimestamp = (value: bigint) => {
    const date = new Date(Number(value) * 1000);
    return date.toLocaleString();
  };

  const handleDecrypt = async (entry: {
    index: number;
    encryptedAddress: string;
    encryptedHash: string;
  }) => {
    if (!instance || !address || !signerPromise) {
      setErrorMessage('Connect your wallet and wait for encryption services.');
      return;
    }

    setDecryptingIndex(entry.index);
    setErrorMessage('');

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: entry.encryptedAddress,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedAddress = result[entry.encryptedAddress as string];
      if (!decryptedAddress) {
        throw new Error('Decryption failed');
      }

      const decryptedHash = await decryptWithAddress(decryptedAddress, entry.encryptedHash);
      setDecryptedEntries((prev) => ({
        ...prev,
        [entry.index]: {
          addressKey: decryptedAddress,
          ipfsHash: decryptedHash,
        },
      }));
    } catch (error) {
      console.error('Decryption failed:', error);
      setErrorMessage('Failed to decrypt the address key.');
    } finally {
      setDecryptingIndex(null);
    }
  };

  if (!address) {
    return (
      <div className="archive-card">
        <p className="empty-state">Connect your wallet to view your archive.</p>
      </div>
    );
  }

  if (!isContractConfigured) {
    return (
      <div className="archive-card">
        <p className="empty-state">Set the contract address to load your archive.</p>
      </div>
    );
  }

  return (
    <div className="archive-card">
      <div className="archive-header">
        <div>
          <h2>My archive</h2>
          <p>Encrypted file records stored with your wallet address.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => {
          refetchCount();
          refetchFiles();
        }}>
          Refresh
        </button>
      </div>

      {zamaError && <div className="status-banner error">{zamaError}</div>}
      {errorMessage && <div className="status-banner error">{errorMessage}</div>}

      {(isCountLoading || isFilesLoading) && <p className="status-text">Loading files...</p>}

      {!isCountLoading && count === 0 && (
        <p className="empty-state">No files stored yet. Upload one to get started.</p>
      )}

      <div className="archive-grid">
        {entries.map((entry) => {
          const decrypted = decryptedEntries[entry.index];
          return (
            <div
              key={entry.index}
              className="file-card fade-in"
              style={{ animationDelay: `${entry.index * 0.05}s` }}
            >
              <div className="file-card-header">
                <div>
                  <p className="file-title">{entry.fileName}</p>
                  <p className="file-date">Stored {formatTimestamp(entry.createdAt)}</p>
                </div>
                <span className="mono file-index">#{entry.index}</span>
              </div>

              <div className="file-details">
                <div>
                  <p className="hash-label">Encrypted IPFS hash</p>
                  <p className="mono hash-value">
                    {entry.encryptedHash.slice(0, 32)}...
                  </p>
                </div>
                <div>
                  <p className="hash-label">Encrypted address handle</p>
                  <p className="mono hash-value">
                    {entry.encryptedAddress.slice(0, 22)}...
                  </p>
                </div>
              </div>

              <div className="file-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDecrypt(entry)}
                  disabled={decryptingIndex === entry.index}
                >
                  {decryptingIndex === entry.index ? 'Decrypting...' : 'Decrypt IPFS hash'}
                </button>
              </div>

              {decrypted && (
                <div className="decrypt-result">
                  <p className="hash-label">Decrypted address key</p>
                  <p className="mono hash-value">{decrypted.addressKey}</p>
                  <p className="hash-label">Decrypted IPFS hash</p>
                  <p className="mono hash-value">{decrypted.ipfsHash}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
