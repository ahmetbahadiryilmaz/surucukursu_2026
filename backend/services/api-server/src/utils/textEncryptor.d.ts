declare class TextEncryptor {
    private static readonly ENCRYPTION_KEY;
    private static readonly ALGORITHM;
    private static encrypt;
    private static decrypt;
    static mebbisUsernameEncrypt(username: string): string;
    static mebbisPasswordEncrypt(password: string): string;
    static mebbisUsernameDecrypt(encryptedUsername: string): string;
    static mebbisPasswordDecrypt(encryptedPassword: string): string;
    static userPasswordEncrypt(password: string): string;
    static userPasswordDecrypt(encryptedPassword: string): string;
}
export default TextEncryptor;
