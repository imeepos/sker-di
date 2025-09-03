import 'reflect-metadata';
import { Optional, Self, SkipSelf, Host } from './parameter-decorators';

/**
 * 专门用于提高parameter-decorators.ts覆盖率的测试
 * 主要测试参数验证的边界情况
 */
describe('Parameter Decorators 覆盖率测试', () => {
  // 模拟console.warn来捕获警告
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('参数索引验证测试', () => {
    it('应该对参数索引超出构造函数参数范围给出警告', () => {
      class TestToken {}
      
      // 创建一个只有1个参数的构造函数
      class TestService {
        constructor(token: TestToken) {}
      }

      // 尝试在索引2处应用装饰器（超出范围）- 覆盖第54行
      const decorator = Optional(TestToken);
      decorator(TestService, undefined, 2);

      // 验证警告被调用 - 这会覆盖第54-57行
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('参数索引 2 可能超出构造函数参数范围 (1)')
      );
    });

    it('应该对无参构造函数的参数索引给出警告', () => {
      class TestToken {}
      
      // 创建一个无参构造函数
      class TestService {
        constructor() {}
      }

      // 尝试在索引0处应用装饰器（超出范围）
      const decorator = Self(TestToken);
      decorator(TestService, undefined, 0);

      // 验证警告被调用
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('参数索引 0 可能超出构造函数参数范围 (0)')
      );
    });

    it('应该对所有装饰器类型都进行参数索引验证', () => {
      class TestToken {}
      
      class TestService {
        constructor(token: TestToken) {}
      }

      // 测试所有装饰器类型的参数索引验证
      const decorators = [
        Optional(TestToken),
        Self(TestToken),
        SkipSelf(TestToken),
        Host(TestToken)
      ];

      decorators.forEach((decorator, index) => {
        // 清除之前的调用
        warnSpy.mockClear();
        
        // 使用超出范围的索引
        decorator(TestService, undefined, 5);
        
        // 验证每个装饰器都会给出警告
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('参数索引 5 可能超出构造函数参数范围 (1)')
        );
      });
    });

    it('应该在参数索引正常时不给出警告', () => {
      class TestToken {}
      
      class TestService {
        constructor(token: TestToken, other: string) {}
      }

      // 使用正常的参数索引
      const decorator = Optional(TestToken);
      decorator(TestService, undefined, 0);

      // 验证没有警告
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('应该处理构造函数length属性为undefined的情况', () => {
      class TestToken {}
      
      // 创建一个模拟的目标对象，没有length属性
      const mockTarget = {};
      
      const decorator = Optional(TestToken);
      
      // 这应该不会抛出错误，也不会给出警告
      expect(() => {
        decorator(mockTarget, undefined, 0);
      }).not.toThrow();

      // 验证没有警告（因为target.length是undefined）
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理参数索引等于构造函数参数数量的情况', () => {
      class TestToken {}
      
      class TestService {
        constructor(token: TestToken) {}
      }

      // 参数索引等于参数数量（刚好超出范围）
      const decorator = Host(TestToken);
      decorator(TestService, undefined, 1);

      // 验证警告被调用
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('参数索引 1 可能超出构造函数参数范围 (1)')
      );
    });

    it('应该处理大型构造函数的参数索引验证', () => {
      class TestToken {}
      
      class TestService {
        constructor(
          a: any, b: any, c: any, d: any, e: any,
          f: any, g: any, h: any, i: any, j: any
        ) {}
      }

      // 使用超出范围的大索引
      const decorator = SkipSelf(TestToken);
      decorator(TestService, undefined, 15);

      // 验证警告被调用
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('参数索引 15 可能超出构造函数参数范围 (10)')
      );
    });
  });

  describe('装饰器名称测试', () => {
    it('应该在警告消息中包含正确的装饰器名称', () => {
      class TestToken {}
      
      class TestService {
        constructor() {}
      }

      // 测试每个装饰器的名称
      const testCases = [
        { decorator: Optional(TestToken), name: 'Optional' },
        { decorator: Self(TestToken), name: 'Self' },
        { decorator: SkipSelf(TestToken), name: 'SkipSelf' },
        { decorator: Host(TestToken), name: 'Host' }
      ];

      testCases.forEach(({ decorator, name }) => {
        warnSpy.mockClear();
        
        decorator(TestService, undefined, 0);
        
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`@${name}:`)
        );
      });
    });
  });

  describe('性能测试', () => {
    it('应该快速处理参数验证', () => {
      class TestToken {}
      
      class TestService {
        constructor(token: TestToken) {}
      }

      const decorator = Optional(TestToken);
      
      // 测试大量调用的性能
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        decorator(TestService, undefined, 5); // 会触发警告
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 验证性能合理（应该在100ms内完成1000次调用）
      expect(duration).toBeLessThan(100);
      
      // 验证警告被调用了1000次
      expect(warnSpy).toHaveBeenCalledTimes(1000);
    });
  });
});
