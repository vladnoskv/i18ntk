export const ALGORITHM: 'aes-256-gcm';
export interface EncryptedPayload { encrypted: string; iv: string; authTag: string; }
export function generateEncryptionKey(): string;
export function encryptData(value: unknown, key: string): Promise<EncryptedPayload>;
export function decryptData(payload: EncryptedPayload, key: string): Promise<string>;
