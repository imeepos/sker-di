import { Inject, getInjectMetadata } from './inject';
import { InjectionToken } from './injection-token';

describe('@Inject 装饰器', () => {
  const testToken = new InjectionToken<string>('测试令牌');
  const numberToken = new InjectionToken<number>('数字令牌');

  it('应该能够装饰构造函数参数并存储令牌元数据', () => {
    class TestService {
      constructor(
        @Inject(testToken) public value: string
      ) {}
    }

    const metadata = getInjectMetadata(TestService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(1);
    expect(metadata?.[0]).toBe(testToken);
  });

  it('应该支持多个参数的注入令牌', () => {
    class MultiService {
      constructor(
        @Inject(testToken) public stringValue: string,
        @Inject(numberToken) public numberValue: number
      ) {}
    }

    const metadata = getInjectMetadata(MultiService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(2);
    expect(metadata?.[0]).toBe(testToken);
    expect(metadata?.[1]).toBe(numberToken);
  });

  it('应该支持混合注入令牌和类型推断', () => {
    class MixedService {
      constructor(
        @Inject(testToken) public tokenValue: string,
        public normalParam: string  // 没有装饰器，应该使用类型推断
      ) {}
    }

    const metadata = getInjectMetadata(MixedService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(2);
    expect(metadata?.[0]).toBe(testToken);
    expect(metadata?.[1]).toBe(String); // TypeScript 推断的类型
  });

  it('应该支持字符串令牌注入', () => {
    class StringTokenService {
      constructor(
        @Inject('CONFIG_URL') public configUrl: string
      ) {}
    }

    const metadata = getInjectMetadata(StringTokenService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(1);
    expect(metadata?.[0]).toBe('CONFIG_URL');
  });

  it('应该支持符号令牌注入', () => {
    const symbolToken = Symbol('symbol-token');

    class SymbolTokenService {
      constructor(
        @Inject(symbolToken) public value: any
      ) {}
    }

    const metadata = getInjectMetadata(SymbolTokenService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(1);
    expect(metadata?.[0]).toBe(symbolToken);
  });

  it('没有装饰器的类应该返回 undefined 元数据', () => {
    class PlainService {
      constructor(public value: string) {}
    }

    const metadata = getInjectMetadata(PlainService);
    expect(metadata).toBeUndefined();
  });

  describe('🔴 红阶段：未覆盖分支测试', () => {
    it('应该测试带有注入选项的装饰器', () => {
      // 🔴 测试options分支
      const { getInjectOptionsMetadata } = require('./inject');
      
      class ServiceWithOptions {
        constructor(
          @Inject(testToken, { optional: true }) public value: string
        ) {}
      }

      const options = getInjectOptionsMetadata(ServiceWithOptions);
      expect(options).toBeDefined();
      expect(options?.[0]).toEqual({ optional: true });
    });

    it('应该测试hasInjectMetadata函数', () => {
      // 🔴 测试hasInjectMetadata的不同分支
      const { hasInjectMetadata } = require('./inject');
      
      class ServiceWithInject {
        constructor(@Inject(testToken) public value: string) {}
      }
      
      // 创建一个没有任何元数据的普通对象
      const plainObject = {};
      
      expect(hasInjectMetadata(ServiceWithInject)).toBe(true);
      expect(hasInjectMetadata(plainObject)).toBe(false); // 没有任何元数据
    });

    it('应该测试getInjectMetadata的边界情况', () => {
      // 🔴 测试maxLength为0的情况
      const mockTarget = {};
      
      // 模拟没有元数据的情况
      jest.spyOn(Reflect, 'getMetadata').mockImplementation(() => undefined);
      
      const metadata = getInjectMetadata(mockTarget);
      expect(metadata).toBeUndefined();
      
      // 恢复原始实现
      jest.restoreAllMocks();
    });

    it('应该测试参数索引超出现有数组长度的情况', () => {
      // 🔴 测试while循环扩展数组的分支
      class ServiceWithGaps {
        constructor(
          public param0: string,
          public param1: string,
          @Inject(testToken) public param2: string
        ) {}
      }

      const metadata = getInjectMetadata(ServiceWithGaps);
      expect(metadata).toBeDefined();
      expect(metadata?.length).toBe(3);
      expect(metadata?.[2]).toBe(testToken);
    });

    it('应该测试只有paramTypes没有injectTokens的情况', () => {
      // 🔴 测试只有TypeScript类型推断的分支
      const mockTarget = {};
      
      // 模拟只有paramTypes的情况
      jest.spyOn(Reflect, 'getMetadata').mockImplementation((key, target) => {
        if (key === 'design:paramtypes') {
          return [String, Number];
        }
        return undefined;
      });

      const metadata = getInjectMetadata(mockTarget);
      expect(metadata).toBeDefined();
      expect(metadata?.[0]).toBe(String);
      expect(metadata?.[1]).toBe(Number);
      
      // 恢复原始实现
      jest.restoreAllMocks();
    });

    it('应该测试getInjectMetadata的undefined分支', () => {
      class TestClass {
        constructor(param1: any, param2: any) {}
      }

      // 模拟paramTypes长度小于实际参数的情况
      const originalParamTypes = Reflect.getMetadata('design:paramtypes', TestClass);
      Reflect.defineMetadata('design:paramtypes', [String], TestClass); // 只定义一个类型

      const metadata = getInjectMetadata(TestClass);

      // 🔴 测试第二个参数返回undefined的分支
      expect(metadata).toEqual([String, undefined]);

      // 恢复原始元数据
      if (originalParamTypes) {
        Reflect.defineMetadata('design:paramtypes', originalParamTypes, TestClass);
      }
    });

    it('应该测试没有paramTypes元数据的情况', () => {
      class TestClassNoMetadata {
        constructor() {}
      }

      // 确保没有paramTypes元数据
      Reflect.deleteMetadata('design:paramtypes', TestClassNoMetadata);

      const metadata = getInjectMetadata(TestClassNoMetadata);
      expect(metadata).toBeUndefined();
    });
  });
});