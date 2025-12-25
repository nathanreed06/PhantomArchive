const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const addressToBytes = (address: string) => {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  if (normalized.length !== 40) {
    throw new Error('Invalid address length');
  }

  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i += 1) {
    const byte = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('Invalid address format');
    }
    bytes[i] = byte;
  }
  return bytes;
};

const deriveKey = async (address: string) => {
  const addressBytes = addressToBytes(address);
  const digest = await crypto.subtle.digest('SHA-256', addressBytes);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const encryptWithAddress = async (address: string, plaintext: string) => {
  const key = await deriveKey(address);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext),
  );

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
};

export const decryptWithAddress = async (address: string, payload: string) => {
  const [ivPart, dataPart] = payload.split(':');
  if (!ivPart || !dataPart) {
    throw new Error('Invalid ciphertext format');
  }

  const key = await deriveKey(address);
  const iv = base64ToBytes(ivPart);
  const data = base64ToBytes(dataPart);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return textDecoder.decode(plaintext);
};
