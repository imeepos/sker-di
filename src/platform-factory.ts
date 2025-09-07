import { ApplicationRef } from './application-manager';
import { EnvironmentInjector } from './environment-injector';
import { Provider, Type } from './provider';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { Injector } from './injector';
import { ModuleResolver } from './module-system';
import { rootInjector } from './root';
import { PLATFORM_INITITATION } from './tokens';
import { isOnInit, isOnInstall, isOnUnInstall, isOnUpgrade } from './lifecycle';
import { PlatformStorage } from './storage';
import { MemoryPlatformStorage } from './memory-storage';

/**
 * 具体的平台实现
 */
@Injectable({ providedIn: 'platform' })
export class PlatformRef {
  private _applications: Map<string, ApplicationRef> = new Map();
  constructor(
    @Inject(Injector) public readonly platformInjector: Injector
  ) { }
  async bootstrap() {
    const inits = this._getInits();
    await Promise.all(inits.map(it => it()));
    // 加载已安装应用
    const storage = this.platformInjector.get(PlatformStorage)
    const applications = await storage.loadApplication()
    await Promise.all(applications.map(async app => {
      const type = await import(app.main).then(res => res.default).catch(e => {
        console.warn(`Failed to load application: ${app.main}`, e);
        return null;
      })
      if (type) this.register(app.id, type)
    }))
    const promisies: Promise<any>[] = [];
    this._applications.forEach(app => {
      if (isOnInit(app)) {
        promisies.push(app.ngOnInit())
      }
    })
    await Promise.all(promisies)
  }
  // 安装应用
  async install<T>(id: string, type: Type<T>) {
    const ref = this.register(id, type)
    if (isOnInstall(ref)) {
      await ref.ngOnInstall()
    }
    const storage = this.platformInjector.get(PlatformStorage)
    await storage.installApplication(ref.instance)
    return ref;
  }
  // 卸载应用
  async unInstall(id: string) {
    const ref = this._applications.get(id)
    if (ref) {
      if (isOnUnInstall(ref)) {
        await ref.ngOnUnInstall();
      }
      this._applications.delete(id)
    }
    const storage = this.platformInjector.get(PlatformStorage)
    await storage.unInstallApplication(id)
  }
  // 更新应用
  async onUpgrade<T>(id: string, type: Type<T>) {
    const ref = this._applications.get(id)
    if (ref) {
      const updateRef = this.register(id, type)
      if (isOnUpgrade(updateRef)) {
        await updateRef.ngOnUpgrade();
      }
      const storage = this.platformInjector.get(PlatformStorage)
      await storage.upgradeApplication(id, updateRef.instance)
    }
  }

  private register(id: string, type: Type<any>) {
    const resolver = this.platformInjector.get(ModuleResolver)
    const resolvedModule = resolver.resolve(type)
    const providers = resolvedModule.providers
    const injector = EnvironmentInjector.createWithAutoProviders([
      { provide: type, useClass: type },
      {
        provide: ApplicationRef, useFactory: (injector: Injector) => {
          return new ApplicationRef(type, injector)
        }, deps: [Injector]
      },
      {
        provide: Storage, useFactory: (storage: PlatformStorage) => {
          return storage.createApplicationStorage(id)
        },
        deps: [PlatformStorage]
      },
      ...providers,
    ], this.platformInjector, 'application')
    const ref = injector.get(ApplicationRef)
    this._applications.set(id, ref)
    return ref;
  }

  private _getInits() {
    try {
      return this.platformInjector.get(PLATFORM_INITITATION)
    } catch (e) {
      return []
    }
  }
}

export type PlatformFactory = (extraProviders?: Provider[]) => PlatformRef;
export function createPlatformFactory<T>(
  parentFactory: PlatformFactory | null,
  module: Type<T>
): PlatformFactory {
  return function platformFactory(extraProviders: Provider[] = []): PlatformRef {
    const resolver = rootInjector.get(ModuleResolver)
    const moduleResolver = resolver.resolve(module)
    const providers = [...extraProviders, ...moduleResolver.providers]
    if (parentFactory) {
      return parentFactory(providers)
    } else {
      const platformInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: PlatformRef, useClass: PlatformRef },
        { provide: PlatformStorage, useClass: MemoryPlatformStorage },
        ...providers,
      ], rootInjector, 'platform')
      return platformInjector.get(PlatformRef)
    }
  };
}
