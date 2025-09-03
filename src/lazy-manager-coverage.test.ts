import 'reflect-metadata';
import { LazyManager } from './lazy-manager';
import { InjectionToken } from './injection-token';

describe('LazyManager 覆盖率测试', () => {
  let lazyManager: LazyManager;

  beforeEach(() => {
    lazyManager = new LazyManager();
  });

  describe('getLazyInstance 方法', () => {
    it('应该覆盖多值提供者中未初始化实例的分支 (第70行)', () => {
      const token = new InjectionToken<string>('multi-token');
      let factoryCallCount = 0;

      // 注册多个延迟提供者
      lazyManager.registerLazyProvider(token, () => {
        factoryCallCount++;
        return `instance-${factoryCallCount}`;
      }, true); // isMulti = true

      lazyManager.registerLazyProvider(token, () => {
        factoryCallCount++;
        return `instance-${factoryCallCount}`;
      }, true); // isMulti = true

      // 第一次调用应该初始化所有实例
      const result = lazyManager.getLazyInstance(token);
      expect(result).toEqual(['instance-1', 'instance-2']);
      expect(factoryCallCount).toBe(2);

      // 第二次调用应该返回缓存的实例，不再调用工厂函数
      const result2 = lazyManager.getLazyInstance(token);
      expect(result2).toEqual(['instance-1', 'instance-2']);
      expect(factoryCallCount).toBe(2); // 工厂函数不应该再被调用
    });

    it('应该覆盖单值提供者中未初始化实例的分支', () => {
      const token = new InjectionToken<string>('single-token');
      let factoryCallCount = 0;

      // 注册单个延迟提供者
      lazyManager.registerLazyProvider(token, () => {
        factoryCallCount++;
        return `single-instance-${factoryCallCount}`;
      }, false); // isMulti = false

      // 第一次调用应该初始化实例
      const result = lazyManager.getLazyInstance(token);
      expect(result).toBe('single-instance-1');
      expect(factoryCallCount).toBe(1);

      // 第二次调用应该返回缓存的实例
      const result2 = lazyManager.getLazyInstance(token);
      expect(result2).toBe('single-instance-1');
      expect(factoryCallCount).toBe(1); // 工厂函数不应该再被调用
    });

    it('应该覆盖混合初始化状态的多值提供者', () => {
      const token = new InjectionToken<string>('mixed-token');
      let factoryCallCount = 0;

      // 注册第一个延迟提供者
      lazyManager.registerLazyProvider(token, () => {
        factoryCallCount++;
        return `first-${factoryCallCount}`;
      }, true);

      // 先获取一次，初始化第一个实例
      const firstResult = lazyManager.getLazyInstance(token);
      expect(firstResult).toEqual(['first-1']);
      expect(factoryCallCount).toBe(1);

      // 注册第二个延迟提供者
      lazyManager.registerLazyProvider(token, () => {
        factoryCallCount++;
        return `second-${factoryCallCount}`;
      }, true);

      // 再次获取，应该初始化第二个实例，但第一个已经初始化了
      const secondResult = lazyManager.getLazyInstance(token);
      expect(secondResult).toEqual(['first-1', 'second-2']);
      expect(factoryCallCount).toBe(2);
    });
  });
});
