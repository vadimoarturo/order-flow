export abstract class SystemSignals {
    abstract databaseReady(): Promise<void>;
    abstract scrape(): Promise<{ contentType: string; body: string }>;
}
