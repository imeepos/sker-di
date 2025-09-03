import 'reflect-metadata';
import { 
  convertInjectOptionsToFlags, 
  InternalInjectFlags, 
  flagsToString 
} from './internal-inject-flags';

describe('InternalInjectFlags 覆盖率测试', () => {
  describe('convertInjectOptionsToFlags 方法', () => {
    it('应该覆盖skipSelf和host组合的警告分支 (第126行)', () => {
      // 模拟console.warn
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      try {
        // 使用skipSelf和host的组合
        const flags = convertInjectOptionsToFlags({
          skipSelf: true,
          host: true
        });

        // 应该包含两个标志
        expect(flags & InternalInjectFlags.SkipSelf).toBeTruthy();
        expect(flags & InternalInjectFlags.Host).toBeTruthy();

        // 应该触发警告
        expect(mockWarn).toHaveBeenCalledWith(
          expect.stringContaining('InjectOptions 警告: 同时使用 "skipSelf" 和 "host" 可能不是预期的行为')
        );
      } finally {
        // 恢复原始的console.warn
        console.warn = originalWarn;
      }
    });

    it('应该覆盖console不存在的情况', () => {
      // 临时删除console
      const originalConsole = global.console;
      // @ts-ignore
      delete global.console;

      try {
        // 这应该不会抛出错误，即使console不存在
        const flags = convertInjectOptionsToFlags({
          skipSelf: true,
          host: true
        });

        expect(flags & InternalInjectFlags.SkipSelf).toBeTruthy();
        expect(flags & InternalInjectFlags.Host).toBeTruthy();
      } finally {
        // 恢复console
        global.console = originalConsole;
      }
    });

    it('应该覆盖console.warn不存在的情况', () => {
      // 临时删除console.warn
      const originalWarn = console.warn;
      // @ts-ignore
      delete console.warn;

      try {
        // 这应该不会抛出错误，即使console.warn不存在
        const flags = convertInjectOptionsToFlags({
          skipSelf: true,
          host: true
        });

        expect(flags & InternalInjectFlags.SkipSelf).toBeTruthy();
        expect(flags & InternalInjectFlags.Host).toBeTruthy();
      } finally {
        // 恢复console.warn
        console.warn = originalWarn;
      }
    });
  });

  describe('flagsToString 方法', () => {
    it('应该覆盖Optional标志的分支 (第190行)', () => {
      const flags = InternalInjectFlags.Optional;
      const result = flagsToString(flags);
      expect(result).toBe('Optional');
    });

    it('应该覆盖多个标志的组合', () => {
      const flags = InternalInjectFlags.Optional | InternalInjectFlags.SkipSelf;
      const result = flagsToString(flags);
      expect(result).toBe('Optional | SkipSelf');
    });

    it('应该覆盖所有标志的组合', () => {
      const flags = InternalInjectFlags.Optional | 
                   InternalInjectFlags.SkipSelf | 
                   InternalInjectFlags.Self | 
                   InternalInjectFlags.Host;
      const result = flagsToString(flags);
      expect(result).toBe('Optional | SkipSelf | Self | Host');
    });

    it('应该覆盖默认标志（无标志）的情况', () => {
      const flags = InternalInjectFlags.Default;
      const result = flagsToString(flags);
      expect(result).toBe('Default');
    });
  });
});
