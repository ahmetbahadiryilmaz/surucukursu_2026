"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const shared_1 = require("../../../../shared/src");
class TextEncryptor {
    static encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    static decrypt(encryptedText) {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    static mebbisUsernameEncrypt(username) {
        return this.encrypt(username);
    }
    static mebbisPasswordEncrypt(password) {
        return this.encrypt(password);
    }
    static mebbisUsernameDecrypt(encryptedUsername) {
        return this.decrypt(encryptedUsername);
    }
    static mebbisPasswordDecrypt(encryptedPassword) {
        return this.decrypt(encryptedPassword);
    }
    static userPasswordEncrypt(password) {
        return this.encrypt(password);
    }
    static userPasswordDecrypt(encryptedPassword) {
        return this.decrypt(encryptedPassword);
    }
}
TextEncryptor.ENCRYPTION_KEY = shared_1.env.jwt.encryptionKey;
TextEncryptor.ALGORITHM = 'aes-256-cbc';
exports.default = TextEncryptor;
//# sourceMappingURL=textEncryptor.js.map