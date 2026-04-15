import { DesktopUpdateService } from './desktop-update.service';
export declare class DesktopUpdateController {
    private readonly service;
    constructor(service: DesktopUpdateService);
    getLatestYmlWindows(res: any): any;
    getLatestYmlMac(res: any): any;
    getLatestYmlLinux(res: any): any;
    downloadFile(filename: string, res: any): any;
    checkVersion(version: string): {
        allowed: boolean;
        latestVersion: string;
        minimumVersion: string;
        message: string;
    };
    listFiles(): {
        directory: string;
        files: {
            name: string;
            size: number;
            modified: string;
        }[];
    };
    generateYml(body: {
        filename: string;
        version: string;
    }): {
        success: boolean;
        message: string;
    };
    private getLatestYmlForPlatform;
}
