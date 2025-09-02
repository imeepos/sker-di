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
});