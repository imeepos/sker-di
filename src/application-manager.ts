import { Injector, Type } from './injector';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { Application } from './storage';
import { EnvironmentInjector } from './environment-injector';
import { OnInit } from './lifecycle';
import { APPLICATION_INITITATION } from './tokens';

/**
 * 默认应用引用实现
 */
@Injectable({ providedIn: 'application' })
export class ApplicationRef<T = any> implements OnInit {
  private files: Map<string, Type<any>> = new Map();
  private injectors: Map<Type<any>, Injector> = new Map();
  constructor(private type: Type<T>, @Inject(Injector) public inejctor: Injector) { }
  get instance() {
    return this.inejctor.get(this.type) as Application;
  }
  async load(): Promise<void> {
    this.instance.plugins.map(async plugin => {
      const type = await import(plugin).then(res => res.default)
      if (type) {
        const injector = EnvironmentInjector.createWithAutoProviders([type], this.inejctor, 'feature')
        this.injectors.set(type, injector)
      }
    })
  }
  async reload(): Promise<void> {
    this.destroy();
    await this.load();
  }
  get<T>(type: Type<T>): T | undefined {
    const injector = this.injectors.get(type)
    return injector?.get(type)
  }
  destroy(): void {
    this.files.clear()
    this.injectors.clear();
  }
  async ngOnInit(): Promise<void> {
    const inits = this._getInits()
    await Promise.all(inits.map(init => init()))
    await this.load()
  }

  private _getInits() {
    try {
      return this.inejctor.get(APPLICATION_INITITATION)
    } catch (e) {
      return []
    }
  }
}