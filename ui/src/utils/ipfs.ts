const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const generateFakeIpfsHash = () => {
  const randomBytes = new Uint8Array(18);
  crypto.getRandomValues(randomBytes);
  return `bafy${toHex(randomBytes)}`;
};

export const pseudoIpfsUpload = async (file: File, onStatus?: (status: string) => void) => {
  if (onStatus) onStatus(`Preparing ${file.name}...`);
  await delay(500);
  if (onStatus) onStatus('Generating pseudo IPFS hash...');
  await delay(700);
  if (onStatus) onStatus('Sealing metadata...');
  await delay(400);
  return generateFakeIpfsHash();
};
