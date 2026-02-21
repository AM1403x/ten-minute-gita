export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
};

export async function getRandomBytesAsync(size: number) {
  // Deterministic bytes for tests.
  return new Uint8Array(size).fill(7);
}

export async function digestStringAsync() {
  return 'mock-hashed-nonce';
}
