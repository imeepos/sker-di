import { 
  Provider, 
  ValueProvider, 
  ClassProvider, 
  FactoryProvider, 
  ExistingProvider, 
  ConstructorProvider 
} from './provider';
import { InjectionToken } from './injection-token';

describe('Provider', () => {
  class TestService {
    constructor(public name: string = 'test') {}
  }

  const testToken = new InjectionToken<string>('测试令牌');

  describe('ValueProvider', () => {
    it('应该支持直接提供值', () => {
      const provider: ValueProvider<string> = {
        provide: testToken,
        useValue: '直接值'
      };
      
      expect(provider.provide).toBe(testToken);
      expect(provider.useValue).toBe('直接值');
    });
  });

  describe('ClassProvider', () => {
    it('应该支持提供类实例', () => {
      const provider: ClassProvider<TestService> = {
        provide: TestService,
        useClass: TestService
      };
      
      expect(provider.provide).toBe(TestService);
      expect(provider.useClass).toBe(TestService);
    });
  });

  describe('FactoryProvider', () => {
    it('应该支持通过工厂函数创建实例', () => {
      const factory = () => new TestService('工厂创建');
      const provider: FactoryProvider<TestService> = {
        provide: TestService,
        useFactory: factory,
        deps: []
      };
      
      expect(provider.provide).toBe(TestService);
      expect(provider.useFactory).toBe(factory);
      expect(provider.deps).toEqual([]);
    });
  });

  describe('ExistingProvider', () => {
    it('应该支持别名提供者', () => {
      const aliasToken = new InjectionToken<string>('别名令牌');
      const provider: ExistingProvider<string> = {
        provide: testToken,
        useExisting: aliasToken
      };
      
      expect(provider.provide).toBe(testToken);
      expect(provider.useExisting).toBe(aliasToken);
    });
  });

  describe('ConstructorProvider', () => {
    it('应该支持构造函数提供者', () => {
      const provider: ConstructorProvider<TestService> = {
        provide: TestService
      };
      
      expect(provider.provide).toBe(TestService);
    });
  });

  describe('Multi provider', () => {
    it('应该支持多值注入标志', () => {
      const provider: ValueProvider<string> = {
        provide: testToken,
        useValue: '值1',
        multi: true
      };
      
      expect(provider.multi).toBe(true);
    });
  });
});