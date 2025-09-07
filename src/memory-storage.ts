import { Injectable } from './injectable';
import { Storage, Application } from './storage';

/**
 * 基于内存的存储实现
 */
@Injectable({ providedIn: 'platform' })
export class MemoryStorage extends Storage {
  private data = new Map<string, any>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

/**
 * 基于内存的平台存储实现
 */
@Injectable({ providedIn: 'platform' })
export class MemoryPlatformStorage extends MemoryStorage {
  private applications = new Map<string, Application>();
  private applicationStorages = new Map<string, MemoryStorage>();

  async clear(): Promise<void> {
    await super.clear();
    this.applications.clear();
    this.applicationStorages.clear();
  }

  async loadApplication(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async installApplication(application: Application): Promise<void> {
    this.applications.set(application.id, application);
  }

  async unInstallApplication(id: string): Promise<void> {
    this.applications.delete(id);
    this.applicationStorages.delete(id);
  }

  async upgradeApplication(id: string, application: Application): Promise<void> {
    this.applications.set(id, application);
    // 保留现有的应用存储数据
  }

  async createApplicationStorage(id: string): Promise<Storage> {
    let storage = this.applicationStorages.get(id);
    if (!storage) {
      storage = new MemoryStorage();
      this.applicationStorages.set(id, storage);
    }
    return storage;
  }
}
