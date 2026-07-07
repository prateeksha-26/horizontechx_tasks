import CryptoJS from 'crypto-js';

const getKey = () => process.env.ENCRYPTION_KEY || 'default-key-change-in-production!';

export function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), getKey()).toString();
}

export function decryptData(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getKey());
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

export function encryptBuffer(buffer) {
  const base64 = buffer.toString('base64');
  return CryptoJS.AES.encrypt(base64, getKey()).toString();
}

export function decryptToBuffer(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getKey());
  const base64 = bytes.toString(CryptoJS.enc.Utf8);
  return Buffer.from(base64, 'base64');
}
