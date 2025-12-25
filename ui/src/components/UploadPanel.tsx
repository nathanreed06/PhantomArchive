import { useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract, Wallet } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { pseudoIpfsUpload } from '../utils/ipfs';
import { encryptWithAddress } from '../utils/crypto';
import '../styles/UploadPanel.css';

interface UploadPanelProps {
  onStored?: () => void;
}

export function UploadPanel({ onStored }: UploadPanelProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, error: zamaError } = useZamaInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [encryptedHash, setEncryptedHash] = useState('');
  const [addressKey, setAddressKey] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isContractConfigured = true

  const resetForm = () => {
    setSelectedFile(null);
    setIpfsHash('');
    setEncryptedHash('');
    setAddressKey('');
    setUploadStatus('');
    setSuccess(false);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setIpfsHash('');
    setEncryptedHash('');
    setAddressKey('');
    setUploadStatus('');
    setSuccess(false);
    setErrorMessage('');
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Select a file before generating the IPFS hash.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    try {
      const hash = await pseudoIpfsUpload(selectedFile, setUploadStatus);
      setIpfsHash(hash);
      setUploadStatus('IPFS hash generated.');
    } catch (error) {
      console.error('IPFS generation failed:', error);
      setUploadStatus('');
      setErrorMessage('Failed to generate the IPFS hash.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStore = async () => {
    if (!selectedFile || !ipfsHash) {
      setErrorMessage('Generate the IPFS hash before storing.');
      return;
    }

    if (!address || !instance || !signerPromise) {
      setErrorMessage('Connect your wallet and wait for encryption services.');
      return;
    }

    if (!isContractConfigured) {
      setErrorMessage('Set the PhantomArchive contract address before storing.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setUploadStatus('Encrypting IPFS hash...');

    try {
      const randomWallet = Wallet.createRandom();
      const addressKeyValue = randomWallet.address;
      setAddressKey(addressKeyValue);

      const encryptedHashValue = await encryptWithAddress(addressKeyValue, ipfsHash);
      setEncryptedHash(encryptedHashValue);

      setUploadStatus('Encrypting address key with Zama...');
      const encryptedInput = await instance
        .createEncryptedInput(CONTRACT_ADDRESS, address)
        .addAddress(addressKeyValue)
        .encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available');
      }

      const archiveContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setUploadStatus('Submitting on-chain transaction...');

      const tx = await archiveContract.addFile(
        selectedFile.name,
        encryptedHashValue,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
      );
      await tx.wait();

      setUploadStatus('Stored on-chain.');
      setSuccess(true);
      if (onStored) {
        onStored();
      }
    } catch (error) {
      console.error('Store failed:', error);
      setErrorMessage('Failed to store the file metadata. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (success) {
    return (
      <div className="upload-card">
        <div className="success-card">
          <span className="success-icon">✓</span>
          <h2>Encrypted record stored</h2>
          <p>
            Your file metadata is now on-chain. You can decrypt the address key anytime to reveal the IPFS hash.
          </p>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            Store another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-card">
      <div className="upload-header">
        <div>
          <h2>Upload & encrypt</h2>
          <p>
            Pick a local file, generate its pseudo IPFS hash, and seal it with a fresh address key.
          </p>
        </div>
        {!isContractConfigured && (
          <span className="pill">Contract address missing</span>
        )}
      </div>

      {!address && (
        <div className="status-banner warning">
          Connect your wallet to start encrypting and storing files.
        </div>
      )}
      {address && !instance && !zamaError && (
        <div className="status-banner warning">
          Initializing encryption service...
        </div>
      )}
      {zamaError && (
        <div className="status-banner error">
          {zamaError}
        </div>
      )}

      <div className="upload-grid">
        <div className="upload-section">
          <h3>Local file</h3>
          <label className="file-input">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
            />
            <span>{selectedFile ? 'Replace file' : 'Select file'}</span>
          </label>
          {selectedFile && (
            <div className="file-meta">
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-size mono">{formatFileSize(selectedFile.size)}</p>
            </div>
          )}

          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Generating...' : 'Generate IPFS hash'}
            </button>
          </div>

          {uploadStatus && <p className="status-text">{uploadStatus}</p>}
          {ipfsHash && (
            <div className="hash-card">
              <p className="hash-label">Pseudo IPFS hash</p>
              <p className="mono hash-value">{ipfsHash}</p>
            </div>
          )}
        </div>

        <div className="upload-section">
          <h3>Encrypt + store</h3>
          <p className="section-text">
            A random address key encrypts the IPFS hash locally. The key is then encrypted by Zama and stored on-chain.
          </p>

          <div className="encryption-card">
            <p className="hash-label">Address key</p>
            <p className="mono hash-value">
              {addressKey ? addressKey : 'Generated on save'}
            </p>
            <p className="hash-label">Encrypted hash</p>
            <p className="mono hash-value">
              {encryptedHash ? encryptedHash.slice(0, 44) + '...' : 'Generated on save'}
            </p>
          </div>

          <div className="button-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStore}
              disabled={isSaving || !ipfsHash || !address || !instance || !isContractConfigured}
            >
              {isSaving ? 'Storing...' : 'Store on-chain'}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="status-banner error">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
