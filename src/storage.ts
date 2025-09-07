export abstract class Storage {
    abstract get<T>(key: string): Promise<T | undefined>;
    abstract set<T>(key: string, value: T): Promise<void>;
    abstract remove(key: string): Promise<void>;
    abstract clear(): Promise<void>;
}
export abstract class Application {
    abstract get id(): string;
    abstract get version(): string;
    abstract get main(): string;
    abstract get name(): string;
    abstract get title(): string;
    abstract get description(): string;
    abstract get plugins(): string[];
}
export abstract class PlatformStorage extends Storage {
    abstract loadApplication(): Promise<Application[]>;
    abstract installApplication(application: Application): Promise<void>;
    abstract unInstallApplication(id: string): Promise<void>;
    abstract upgradeApplication(id: string, application: Application): Promise<void>;
    abstract createApplicationStorage(id: string): Promise<Storage>;
}
