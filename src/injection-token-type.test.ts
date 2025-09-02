import { Injector, Type, AbstractType, StringToken, SymbolToken, InjectionTokenType } from './injector';
import { InjectionToken } from './injection-token';

describe('InjectionTokenType', () => {
  class TestService {
    name = 'test';
  }

  abstract class AbstractService {
    abstract getName(): string;
  }

  const injectionToken = new InjectionToken<string>('测试令牌');
  const stringToken: StringToken<string> = 'string-token' as StringToken<string>;
  const symbolToken: SymbolToken<number> = Symbol('symbol-token') as SymbolToken<number>;

  it('应该支持 InjectionToken 类型', () => {
    const token: InjectionTokenType<string> = injectionToken;
    expect(token).toBe(injectionToken);
  });

  it('应该支持 Type 类型（构造函数）', () => {
    const token: InjectionTokenType<TestService> = TestService;
    expect(token).toBe(TestService);
  });

  it('应该支持 AbstractType 类型', () => {
    const token: InjectionTokenType<AbstractService> = AbstractService;
    expect(token).toBe(AbstractService);
  });

  it('应该支持 StringToken 类型', () => {
    const token: InjectionTokenType<string> = stringToken;
    expect(token).toBe(stringToken);
  });

  it('应该支持 SymbolToken 类型', () => {
    const token: InjectionTokenType<number> = symbolToken;
    expect(token).toBe(symbolToken);
  });

  it('应该支持普通 Function 类型', () => {
    const func = function testFunc() { return 'test'; };
    const token: InjectionTokenType<string> = func;
    expect(token).toBe(func);
  });
});