import { useState } from 'react';
import { Header } from './Header';
import { UploadPanel } from './UploadPanel';
import { ArchiveList } from './ArchiveList';
import '../styles/ArchiveApp.css';

export function ArchiveApp() {
  const [activeTab, setActiveTab] = useState<'upload' | 'archive'>('upload');
  const [refreshToken, setRefreshToken] = useState(0);

  const handleStored = () => {
    setRefreshToken((prev) => prev + 1);
  };

  return (
    <div className="archive-app">
      <Header />
      <main className="archive-main">
        <section className="archive-hero fade-in">
          <div className="hero-card">
            <span className="pill">Encrypted workflow</span>
            <h2 className="hero-title">Keep file hashes sealed, yet always retrievable.</h2>
            <p className="hero-text">
              Phantom Archive stores your file metadata on-chain while keeping the IPFS hash protected.
              A fresh address key encrypts the hash locally, and Zama FHE keeps that key private on-chain.
            </p>
          </div>
          <div className="hero-card hero-flow">
            <h3 className="hero-subtitle">Flow</h3>
            <div className="flow-step">
              <span className="flow-index mono">01</span>
              <div>
                <p className="flow-title">Select a local file</p>
                <p className="flow-text">Generate a pseudo IPFS hash and lock it client-side.</p>
              </div>
            </div>
            <div className="flow-step">
              <span className="flow-index mono">02</span>
              <div>
                <p className="flow-title">Mint a random address key</p>
                <p className="flow-text">Encrypt the hash with the address, then seal the key with Zama.</p>
              </div>
            </div>
            <div className="flow-step">
              <span className="flow-index mono">03</span>
              <div>
                <p className="flow-title">Store on-chain</p>
                <p className="flow-text">Retrieve metadata and decrypt whenever you need the hash.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="archive-panel fade-in">
          <div className="panel-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            >
              Upload + Encrypt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
            >
              My Archive
            </button>
          </div>
          <div className="panel-content">
            {activeTab === 'upload' ? (
              <UploadPanel onStored={handleStored} />
            ) : (
              <ArchiveList refreshToken={refreshToken} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
