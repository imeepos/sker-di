import { EnvironmentInjector } from './environment-injector';
import { Injectable } from './injectable';
import { Inject } from './inject';
import { InjectionToken } from './injection-token';
import { InjectOptions } from './inject-options';

describe('高级注入选项', () => {
  describe('skipSelf 选项', () => {
    it('应该跳过当前注入器，从父注入器查找', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class ChildService {
        constructor(
          @Inject(TOKEN, { skipSelf: true }) public value: string
        ) {}
      }

      // 创建父注入器，提供令牌值
      const parentInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'parent-value' }
      ]);

      // 创建子注入器，也提供相同令牌（但不同的值）
      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ], parentInjector);

      // skipSelf 应该跳过子注入器中的值，使用父注入器的值
      const service = childInjector.get(ChildService);
      expect(service.value).toBe('parent-value'); // ❌ 这会失败，因为 skipSelf 未实现
    });

    it('当父注入器中没有提供者时，skipSelf 应该继续向上查找', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { skipSelf: true }) public value: string
        ) {}
      }

      // 创建祖父注入器
      const grandparentInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'grandparent-value' }
      ]);

      // 创建父注入器（没有提供TOKEN）
      const parentInjector = EnvironmentInjector.createWithAutoProviders([], grandparentInjector);

      // 创建子注入器，提供TOKEN
      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ], parentInjector);

      const service = childInjector.get(TestService);
      expect(service.value).toBe('grandparent-value'); // ❌ 应该跳过子注入器，找到祖父注入器的值
    });

    it('skipSelf 与 optional 结合使用', () => {
      const TOKEN = new InjectionToken<string>('MISSING_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { skipSelf: true, optional: true }) public value: string | null
        ) {}
      }

      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ]);

      const service = childInjector.get(TestService);
      expect(service.value).toBeNull(); // ❌ skipSelf + optional 应该跳过子注入器，找不到时返回null
    });
  });

  describe('self 选项', () => {
    it('应该只在当前注入器查找，不查找父注入器', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { self: true }) public value: string
        ) {}
      }

      // 父注入器提供令牌
      const parentInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'parent-value' }
      ]);

      // 子注入器不提供令牌
      const childInjector = EnvironmentInjector.createWithAutoProviders([], parentInjector);

      // self 选项应该只在子注入器查找，找不到应该抛出错误
      expect(() => childInjector.get(TestService))
        .toThrow(); // ❌ self 选项未实现，会从父注入器获取值
    });

    it('self 选项找到当前注入器的提供者', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { self: true }) public value: string
        ) {}
      }

      const parentInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'parent-value' }
      ]);

      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ], parentInjector);

      const service = childInjector.get(TestService);
      expect(service.value).toBe('child-value'); // ❌ 应该使用子注入器的值
    });

    it('self 与 optional 结合使用', () => {
      const TOKEN = new InjectionToken<string>('MISSING_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { self: true, optional: true }) public value: string | null
        ) {}
      }

      const parentInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'parent-value' }
      ]);

      const childInjector = EnvironmentInjector.createWithAutoProviders([], parentInjector);

      const service = childInjector.get(TestService);
      expect(service.value).toBeNull(); // ❌ self + optional 应该只在当前注入器查找，找不到返回null
    });
  });

  describe('host 选项', () => {
    it('应该在宿主注入器中查找依赖', () => {
      const TOKEN = new InjectionToken<string>('HOST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { host: true }) public value: string
        ) {}
      }

      // 创建宿主注入器
      const hostInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'host-value' }
      ]);

      // 创建子注入器
      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ], hostInjector);

      // 创建孙子注入器
      const grandchildInjector = EnvironmentInjector.createWithAutoProviders([], childInjector);

      // host 选项应该直接从宿主注入器（根注入器）查找
      const service = grandchildInjector.get(TestService);
      expect(service.value).toBe('host-value'); // ❌ host 选项未实现
    });

    it('host 与 optional 结合使用', () => {
      const TOKEN = new InjectionToken<string>('MISSING_HOST_TOKEN');

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { host: true, optional: true }) public value: string | null
        ) {}
      }

      const childInjector = EnvironmentInjector.createWithAutoProviders([
        { provide: TOKEN, useValue: 'child-value' }
      ]);

      const service = childInjector.get(TestService);
      expect(service.value).toBeNull(); // ❌ host + optional 应该在宿主注入器查找，找不到返回null
    });
  });

  describe('选项互斥验证', () => {
    it('self 和 skipSelf 不能同时使用', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      // 现在冲突检测在装饰器应用时就会抛出错误
      expect(() => {
        @Injectable({ providedIn: 'root' })
        class TestService {
          constructor(
            @Inject(TOKEN, { self: true, skipSelf: true }) public value: string
          ) {}
        }
      }).toThrow(/选项冲突/);
    });

    it('host 不能与 self 同时使用', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      // 现在冲突检测在装饰器应用时就会抛出错误
      expect(() => {
        @Injectable({ providedIn: 'root' })
        class TestService {
          constructor(
            @Inject(TOKEN, { host: true, self: true }) public value: string
          ) {}
        }
      }).toThrow(/选项冲突/);
    });

    it('host 不能与 skipSelf 同时使用', () => {
      const TOKEN = new InjectionToken<string>('TEST_TOKEN');

      // host + skipSelf 组合会给出警告但不会抛出错误
      // 这个组合在技术上是可行的，但不推荐
      const warningSpy = jest.spyOn(console, 'warn').mockImplementation();

      @Injectable({ providedIn: 'root' })
      class TestService {
        constructor(
          @Inject(TOKEN, { host: true, skipSelf: true }) public value: string
        ) {}
      }

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipSelf" 和 "host"')
      );

      warningSpy.mockRestore();
    });
  });
});