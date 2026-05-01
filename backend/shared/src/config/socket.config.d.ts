export declare const socketConfig: {
    port: number;
    cors: {
        origin: string;
        methods: string[];
        credentials: boolean;
    };
    options: {
        pingTimeout: number;
        pingInterval: number;
    };
};
