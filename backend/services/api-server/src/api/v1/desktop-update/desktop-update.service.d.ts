export declare class DesktopUpdateService {
    private readonly updateDir;
    constructor();
    getLatestYml(platform: string): {
        content: string;
        exists: boolean;
    };
    getUpdateFile(filename: string): {
        filePath: string;
        exists: boolean;
        size: number;
    };
    listUpdateFiles(): Array<{
        name: string;
        size: number;
        modified: string;
    }>;
    generateLatestYml(exeFilename: string, version: string): {
        success: boolean;
        message: string;
    };
    getUpdateDirPath(): string;
    checkVersion(clientVersion: string): {
        allowed: boolean;
        latestVersion: string;
        minimumVersion: string;
        message: string;
    };
    private getLatestVersionString;
    private compareVersions;
}
