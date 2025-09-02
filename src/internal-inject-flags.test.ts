import { 
  InternalInjectFlags, 
  combineInjectFlags, 
  hasFlag, 
  convertInjectOptionsToFlags,
  convertFlagsToInjectOptions,
  flagsToString
} from './internal-inject-flags';
import { InjectOptions } from './inject-options';

describe('InternalInjectFlags 位标志系统测试', () => {
  describe('InternalInjectFlags 枚举', () => {
    it('应该定义正确的位标志值', () => {
      expect(InternalInjectFlags.Default).toBe(0);
      expect(InternalInjectFlags.Optional).toBe(1);
      expect(InternalInjectFlags.SkipSelf).toBe(2);
      expect(InternalInjectFlags.Self).toBe(4);
      expect(InternalInjectFlags.Host).toBe(8);
    });

    it('位标志应该是2的幂', () => {
      const flags = [
        InternalInjectFlags.Default,
        InternalInjectFlags.Optional,
        InternalInjectFlags.SkipSelf,
        InternalInjectFlags.Self,
        InternalInjectFlags.Host
      ];

      for (let i = 0; i < flags.length; i++) {
        if (i === 0) {
          expect(flags[i]).toBe(0); // Default 是 0
        } else {
          expect(flags[i] & (flags[i] - 1)).toBe(0); // 检查是否为2的幂
        }
      }
    });
  });

  describe('combineInjectFlags 函数', () => {
    it('应该正确组合多个标志', () => {
      const combined = combineInjectFlags(
        InternalInjectFlags.Optional,
        InternalInjectFlags.SkipSelf
      );
      
      expect(combined).toBe(InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf);
      expect(combined).toBe(3); // 1 | 2 = 3
    });

    it('应该支持组合所有标志', () => {
      const allFlags = combineInjectFlags(
        InternalInjectFlags.Optional,
        InternalInjectFlags.SkipSelf,
        InternalInjectFlags.Self,
        InternalInjectFlags.Host
      );
      
      expect(allFlags).toBe(15); // 1 | 2 | 4 | 8 = 15
    });

    it('应该处理重复标志', () => {
      const combined = combineInjectFlags(
        InternalInjectFlags.Optional,
        InternalInjectFlags.Optional
      );
      
      expect(combined).toBe(InternalInjectFlags.Optional);
    });
  });

  describe('hasFlag 函数', () => {
    it('应该正确检测单个标志', () => {
      const flags = InternalInjectFlags.Optional;
      
      expect(hasFlag(flags, InternalInjectFlags.Optional)).toBe(true);
      expect(hasFlag(flags, InternalInjectFlags.SkipSelf)).toBe(false);
    });

    it('应该正确检测组合标志', () => {
      const flags = InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf;
      
      expect(hasFlag(flags, InternalInjectFlags.Optional)).toBe(true);
      expect(hasFlag(flags, InternalInjectFlags.SkipSelf)).toBe(true);
      expect(hasFlag(flags, InternalInjectFlags.Self)).toBe(false);
    });

    it('应该处理默认标志', () => {
      const flags = InternalInjectFlags.Default;
      
      expect(hasFlag(flags, InternalInjectFlags.Default)).toBe(true);
      expect(hasFlag(flags, InternalInjectFlags.Optional)).toBe(false);
    });
  });

  describe('convertInjectOptionsToFlags 函数', () => {
    it('应该正确转换基本选项', () => {
      const options: InjectOptions = { optional: true };
      const flags = convertInjectOptionsToFlags(options);
      
      expect(flags).toBe(InternalInjectFlags.Optional);
    });

    it('应该正确转换多个选项', () => {
      const options: InjectOptions = { 
        optional: true, 
        skipSelf: true 
      };
      const flags = convertInjectOptionsToFlags(options);
      
      expect(flags).toBe(InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf);
    });

    it('应该正确转换所有选项', () => {
      const options: InjectOptions = { 
        optional: true, 
        skipSelf: true,
        self: true,
        host: true
      };
      const flags = convertInjectOptionsToFlags(options);
      
      expect(flags).toBe(
        InternalInjectFlags.Optional | 
        InternalInjectFlags.SkipSelf | 
        InternalInjectFlags.Self | 
        InternalInjectFlags.Host
      );
    });

    it('应该处理空选项', () => {
      const options: InjectOptions = {};
      const flags = convertInjectOptionsToFlags(options);
      
      expect(flags).toBe(InternalInjectFlags.Default);
    });

    it('应该处理undefined选项', () => {
      const flags = convertInjectOptionsToFlags(undefined);
      
      expect(flags).toBe(InternalInjectFlags.Default);
    });

    it('应该处理false值', () => {
      const options: InjectOptions = { 
        optional: false, 
        skipSelf: false,
        self: false,
        host: false
      };
      const flags = convertInjectOptionsToFlags(options);
      
      expect(flags).toBe(InternalInjectFlags.Default);
    });
  });

  describe('convertFlagsToInjectOptions 函数', () => {
    it('应该正确转换单个标志回选项', () => {
      const flags = InternalInjectFlags.Optional;
      const options = convertFlagsToInjectOptions(flags);
      
      expect(options).toEqual({ optional: true });
    });

    it('应该正确转换组合标志回选项', () => {
      const flags = InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf;
      const options = convertFlagsToInjectOptions(flags);
      
      expect(options).toEqual({ optional: true, skipSelf: true });
    });

    it('应该正确转换所有标志回选项', () => {
      const flags = InternalInjectFlags.Optional | 
                   InternalInjectFlags.SkipSelf | 
                   InternalInjectFlags.Self | 
                   InternalInjectFlags.Host;
      const options = convertFlagsToInjectOptions(flags);
      
      expect(options).toEqual({ 
        optional: true, 
        skipSelf: true, 
        self: true, 
        host: true 
      });
    });

    it('应该处理默认标志', () => {
      const flags = InternalInjectFlags.Default;
      const options = convertFlagsToInjectOptions(flags);
      
      expect(options).toEqual({});
    });
  });

  describe('flagsToString 函数', () => {
    it('应该正确格式化默认标志', () => {
      const flags = InternalInjectFlags.Default;
      const str = flagsToString(flags);
      
      expect(str).toBe('Default');
    });

    it('应该正确格式化单个标志', () => {
      const flags = InternalInjectFlags.Optional;
      const str = flagsToString(flags);
      
      expect(str).toBe('Optional');
    });

    it('应该正确格式化组合标志', () => {
      const flags = InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf;
      const str = flagsToString(flags);
      
      expect(str).toBe('Optional | SkipSelf');
    });

    it('应该正确格式化所有标志', () => {
      const flags = InternalInjectFlags.Optional | 
                   InternalInjectFlags.SkipSelf | 
                   InternalInjectFlags.Self | 
                   InternalInjectFlags.Host;
      const str = flagsToString(flags);
      
      expect(str).toBe('Optional | SkipSelf | Self | Host');
    });
  });

  describe('双向转换测试', () => {
    it('InjectOptions 和 InternalInjectFlags 应该可以双向转换', () => {
      const originalOptions: InjectOptions = { 
        optional: true, 
        skipSelf: true 
      };
      
      const flags = convertInjectOptionsToFlags(originalOptions);
      const convertedOptions = convertFlagsToInjectOptions(flags);
      
      expect(convertedOptions).toEqual(originalOptions);
    });

    it('所有选项组合都应该支持双向转换', () => {
      const testCases: InjectOptions[] = [
        {},
        { optional: true },
        { skipSelf: true },
        { self: true },
        { host: true },
        { optional: true, skipSelf: true },
        { optional: true, self: true },
        { optional: true, host: true },
        { skipSelf: true, self: true },
        { skipSelf: true, host: true },
        { self: true, host: true },
        { optional: true, skipSelf: true, self: true, host: true }
      ];

      testCases.forEach(originalOptions => {
        const flags = convertInjectOptionsToFlags(originalOptions);
        const convertedOptions = convertFlagsToInjectOptions(flags);
        
        expect(convertedOptions).toEqual(originalOptions);
      });
    });
  });

  describe('性能优化测试', () => {
    it('位运算应该比对象属性检查更快', () => {
      const flags = InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf;
      const options = { optional: true, skipSelf: true };
      
      // 测试位运算的正确性
      expect(hasFlag(flags, InternalInjectFlags.Optional)).toBe(true);
      expect(hasFlag(flags, InternalInjectFlags.SkipSelf)).toBe(true);
      
      // 验证等价性
      expect(hasFlag(flags, InternalInjectFlags.Optional)).toBe(!!options.optional);
      expect(hasFlag(flags, InternalInjectFlags.SkipSelf)).toBe(!!options.skipSelf);
    });
  });
});