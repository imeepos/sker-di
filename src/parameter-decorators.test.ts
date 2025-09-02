import { Optional, Self, SkipSelf, Host } from './parameter-decorators';
import { Injectable } from './injectable';
import { EnvironmentInjector } from './environment-injector';
import { InjectionToken } from './injection-token';

describe('参数装饰器测试', () => {
  describe('@Optional 装饰器', () => {
    it('应该标记参数为可选的', () => {
      const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable()
      class TestService {
        constructor(
          @Optional(TEST_TOKEN) public value: string
        ) {}
      }

      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: TestService, useClass: TestService }
      ]);

      const instance = injector.get(TestService);
      expect(instance.value).toBeNull();
    });
  });

  describe('@Self 装饰器', () => {
    it('应该只在当前注入器中查找', () => {
      const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable()
      class TestService {
        constructor(
          @Self(TEST_TOKEN) public value: string
        ) {}
      }

      const parent = EnvironmentInjector.createWithAutoProviders([
        { provide: TEST_TOKEN, useValue: 'parent-value' }
      ]);

      const child = EnvironmentInjector.createWithAutoProviders([
        { provide: TestService, useClass: TestService }
      ], parent);

      expect(() => child.get(TestService)).toThrow();
    });
  });

  describe('@SkipSelf 装饰器', () => {
    it('应该跳过当前注入器', () => {
      const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable()
      class TestService {
        constructor(
          @SkipSelf(TEST_TOKEN) public value: string
        ) {}
      }

      const parent = EnvironmentInjector.createWithAutoProviders([
        { provide: TEST_TOKEN, useValue: 'parent-value' }
      ]);

      const child = EnvironmentInjector.createWithAutoProviders([
        { provide: TestService, useClass: TestService },
        { provide: TEST_TOKEN, useValue: 'child-value' }
      ], parent);

      const instance = child.get(TestService);
      expect(instance.value).toBe('parent-value');
    });
  });

  describe('@Host 装饰器', () => {
    it('应该在宿主注入器中查找', () => {
      const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable()
      class TestService {
        constructor(
          @Host(TEST_TOKEN) public value: string
        ) {}
      }

      const parent = EnvironmentInjector.createWithAutoProviders([
        { provide: TEST_TOKEN, useValue: 'host-value' }
      ]);

      const child = EnvironmentInjector.createWithAutoProviders([
        { provide: TestService, useClass: TestService }
      ], parent);

      const instance = child.get(TestService);
      expect(instance.value).toBe('host-value');
    });
  });
});