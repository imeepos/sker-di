import { 
  validateInjectOptionsConflicts,
  convertInjectOptionsToFlags,
  InternalInjectFlags
} from './internal-inject-flags';
import { 
  Optional, 
  Self, 
  SkipSelf, 
  Host 
} from './parameter-decorators';
import { 
  Inject,
  getInjectMetadata,
  getInjectOptionsMetadata,
  getUnifiedInjectMetadata,
  InjectMetadata
} from './inject';
import { InjectOptions } from './inject-options';

describe('注入系统改进测试', () => {
  describe('选项冲突检测', () => {
    it('应该检测 self 和 skipSelf 的冲突', () => {
      const conflictOptions: InjectOptions = {
        self: true,
        skipSelf: true
      };

      expect(() => {
        validateInjectOptionsConflicts(conflictOptions);
      }).toThrow(/选项冲突/);
    });

    it('应该检测 self 和 host 的冲突', () => {
      const conflictOptions: InjectOptions = {
        self: true,
        host: true
      };

      expect(() => {
        validateInjectOptionsConflicts(conflictOptions);
      }).toThrow(/选项冲突/);
    });

    it('应该允许 optional 与其他选项组合', () => {
      const validOptions: InjectOptions[] = [
        { optional: true, self: true },
        { optional: true, skipSelf: true },
        { optional: true, host: true }
      ];

      validOptions.forEach(options => {
        expect(() => {
          convertInjectOptionsToFlags(options);
        }).not.toThrow();
      });
    });

    it('应该对 skipSelf 和 host 组合给出警告', () => {
      const warningSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const options: InjectOptions = {
        skipSelf: true,
        host: true
      };

      expect(() => {
        validateInjectOptionsConflicts(options);
      }).not.toThrow();

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipSelf" 和 "host"')
      );

      warningSpy.mockRestore();
    });

    it('应该在 convertInjectOptionsToFlags 中自动检测冲突', () => {
      const conflictOptions: InjectOptions = {
        self: true,
        skipSelf: true
      };

      expect(() => {
        convertInjectOptionsToFlags(conflictOptions);
      }).toThrow(/选项冲突/);
    });
  });

  describe('参数装饰器类型安全性', () => {
    it('应该验证无效的令牌', () => {
      class TestService {}

      expect(() => {
        const decorator = Optional(null as any);
        decorator(TestService, undefined, 0);
      }).toThrow(/注入令牌不能为 null/);

      expect(() => {
        const decorator = Self(undefined as any);
        decorator(TestService, undefined, 0);
      }).toThrow(/注入令牌不能为 null/);
    });

    it('应该验证参数索引', () => {
      class TestService {}

      // 模拟无效的参数索引调用
      expect(() => {
        const decorator = SkipSelf(TestService);
        decorator(TestService, undefined, -1);
      }).toThrow(/无效的参数索引/);

      expect(() => {
        const decorator = Host(TestService);
        decorator(TestService, undefined, 1.5);
      }).toThrow(/无效的参数索引/);
    });

    it('应该验证装饰器只能用于构造函数参数', () => {
      class TestService {}

      expect(() => {
        const decorator = Optional(TestService);
        decorator(TestService, 'methodName', 0);
      }).toThrow(/只能用于构造函数参数/);
    });

    it('应该验证目标对象', () => {
      class TestService {}

      expect(() => {
        const decorator = Self(TestService);
        decorator(null as any, undefined, 0);
      }).toThrow(/无效的目标对象/);
    });
  });

  describe('统一元数据存储', () => {
    it('应该使用统一的元数据结构存储', () => {
      class TestToken {}

      class TestService {
        constructor(private token: TestToken) {}
      }

      // 手动应用装饰器
      const decorator = Inject(TestToken, { optional: true, self: true });
      decorator(TestService, undefined, 0);

      const unifiedMetadata = getUnifiedInjectMetadata(TestService);

      expect(unifiedMetadata).toBeDefined();
      expect(unifiedMetadata!.length).toBe(1);
      expect(unifiedMetadata![0].token).toBe(TestToken);
      expect(unifiedMetadata![0].flags).toBe(
        InternalInjectFlags.Optional | InternalInjectFlags.Self
      );
    });

    it('应该保持向后兼容性', () => {
      class TestToken {}

      class TestService {
        constructor(private token: TestToken) {}
      }

      // 手动应用装饰器
      const decorator = Inject(TestToken, { optional: true });
      decorator(TestService, undefined, 0);

      // 新API应该工作
      const unifiedMetadata = getUnifiedInjectMetadata(TestService);
      expect(unifiedMetadata).toBeDefined();

      // 旧API也应该工作
      const tokens = getInjectMetadata(TestService);
      const options = getInjectOptionsMetadata(TestService);

      expect(tokens).toEqual([TestToken]);
      expect(options).toEqual([{ optional: true }]);
    });

    it('应该正确处理参数装饰器', () => {
      class ServiceA {}
      class ServiceB {}
      class ServiceC {}
      class ServiceD {}

      class TestService {
        constructor(a: ServiceA, b: ServiceB, c: ServiceC, d: ServiceD) {}
      }

      // 手动应用装饰器
      Optional(ServiceA)(TestService, undefined, 0);
      Self(ServiceB)(TestService, undefined, 1);
      SkipSelf(ServiceC)(TestService, undefined, 2);
      Host(ServiceD)(TestService, undefined, 3);

      const unifiedMetadata = getUnifiedInjectMetadata(TestService);

      expect(unifiedMetadata).toBeDefined();
      expect(unifiedMetadata!.length).toBe(4);

      // 验证每个参数的元数据
      expect(unifiedMetadata![0]).toEqual({
        token: ServiceA,
        flags: InternalInjectFlags.Optional
      });

      expect(unifiedMetadata![1]).toEqual({
        token: ServiceB,
        flags: InternalInjectFlags.Self
      });

      expect(unifiedMetadata![2]).toEqual({
        token: ServiceC,
        flags: InternalInjectFlags.SkipSelf
      });

      expect(unifiedMetadata![3]).toEqual({
        token: ServiceD,
        flags: InternalInjectFlags.Host
      });
    });

    it('应该正确转换标志位回选项对象', () => {
      class TestToken {}

      class TestService {
        constructor(private token: TestToken) {}
      }

      // 手动应用装饰器
      const decorator = Inject(TestToken, { optional: true, skipSelf: true });
      decorator(TestService, undefined, 0);

      const options = getInjectOptionsMetadata(TestService);

      expect(options).toBeDefined();
      expect(options![0]).toEqual({
        optional: true,
        skipSelf: true
      });
    });
  });

  describe('性能优化验证', () => {
    it('应该使用位运算提高性能', () => {
      const options: InjectOptions = {
        optional: true,
        skipSelf: true
      };

      const flags = convertInjectOptionsToFlags(options);
      
      // 验证位运算结果
      expect(flags).toBe(InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf);
      expect(flags).toBe(3); // 1 | 2 = 3
      
      // 验证位运算检查
      expect(flags & InternalInjectFlags.Optional).toBeTruthy();
      expect(flags & InternalInjectFlags.SkipSelf).toBeTruthy();
      expect(flags & InternalInjectFlags.Self).toBeFalsy();
      expect(flags & InternalInjectFlags.Host).toBeFalsy();
    });
  });
});
