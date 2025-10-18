// src/lib/textEncryptor.ts
import * as crypto from 'crypto';

class TextEncryptor {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  private static readonly ALGORITHM = 'aes-256-cbc';

  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  private static decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static mebbisUsernameEncrypt(username: string): string {
    return this.encrypt(username);
  }

  static mebbisPasswordEncrypt(password: string): string {
    return this.encrypt(password);
  }

  static mebbisUsernameDecrypt(encryptedUsername: string): string {
    return this.decrypt(encryptedUsername);
  }

  static mebbisPasswordDecrypt(encryptedPassword: string): string {
    return this.decrypt(encryptedPassword);
  }



  static userPasswordEncrypt(password: string): string {
    return this.encrypt(password);
  }

  static userPasswordDecrypt(encryptedPassword: string): string {
    return this.decrypt(encryptedPassword);
  }

}

export default TextEncryptor;