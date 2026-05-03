use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("Encryption failed: {0}")]
    Encrypt(String),
    #[error("Decryption failed: {0}")]
    Decrypt(String),
    #[error("Invalid key length")]
    InvalidKey,
}

pub type CryptoResult<T> = Result<T, CryptoError>;

const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 12;
const KEY_LENGTH: usize = 32;
const PBKDF2_ITERATIONS: u32 = 600_000;

/// Derive a 256-bit key from password + salt using PBKDF2-HMAC-SHA256
fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LENGTH] {
    let mut key = [0u8; KEY_LENGTH];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

/// Encrypt plaintext with AES-256-GCM
/// Format: [salt(16)] + [nonce(12)] + [ciphertext + auth_tag(16)]
pub fn encrypt(plaintext: &str, password: &str) -> CryptoResult<String> {
    if password.is_empty() {
        return Ok(plaintext.to_string());
    }

    // Generate random salt and nonce
    let salt: [u8; SALT_LENGTH] = rand::random();
    let nonce_bytes: [u8; NONCE_LENGTH] = rand::random();

    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CryptoError::Encrypt(e.to_string()))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| CryptoError::Encrypt(e.to_string()))?;

    // Concatenate: salt + nonce + ciphertext
    let mut result = Vec::with_capacity(SALT_LENGTH + NONCE_LENGTH + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &result))
}

/// Decrypt ciphertext with AES-256-GCM
pub fn decrypt(ciphertext_b64: &str, password: &str) -> CryptoResult<String> {
    if password.is_empty() {
        return Ok(ciphertext_b64.to_string());
    }

    let data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, ciphertext_b64)
        .map_err(|e| CryptoError::Decrypt(e.to_string()))?;

    if data.len() < SALT_LENGTH + NONCE_LENGTH + 16 {
        return Err(CryptoError::Decrypt("Ciphertext too short".to_string()));
    }

    let salt = &data[..SALT_LENGTH];
    let nonce_bytes = &data[SALT_LENGTH..SALT_LENGTH + NONCE_LENGTH];
    let ciphertext = &data[SALT_LENGTH + NONCE_LENGTH..];

    let key = derive_key(password, salt);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CryptoError::Decrypt(e.to_string()))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| CryptoError::Decrypt(e.to_string()))?;

    String::from_utf8(plaintext)
        .map_err(|e| CryptoError::Decrypt(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let password = "test-password-123";
        let plaintext = "sk-test-api-key-12345";

        let encrypted = encrypt(plaintext, password).unwrap();
        assert_ne!(encrypted, plaintext);

        let decrypted = decrypt(&encrypted, password).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_empty_password_pass_through() {
        let plaintext = "no-encryption-needed";
        let encrypted = encrypt(plaintext, "").unwrap();
        assert_eq!(encrypted, plaintext);

        let decrypted = decrypt(&encrypted, "").unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_unicode_content() {
        let password = "中文密码测试";
        let plaintext = "DeepSeek API Key: sk-中文测试-key";

        let encrypted = encrypt(plaintext, password).unwrap();
        let decrypted = decrypt(&encrypted, password).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
