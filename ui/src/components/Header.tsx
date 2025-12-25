import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-mark mono">PA</div>
          <div>
            <h1 className="brand-title">Phantom Archive</h1>
            <p className="brand-subtitle">Encrypted file vault on FHEVM</p>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
