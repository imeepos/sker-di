import { EnvironmentInjectorUtils } from './environment-injector-utils';
import { Provider } from './provider';

describe('EnvironmentInjectorUtils', () => {
  describe('🔴 红阶段：测试未覆盖的分支', () => {
    describe('generateProvidersDebugInfo', () => {
      it('应该测试默认参数分支 - 不传递getTokenName和getTokenType', () => {
        const providers = new Map<any, Provider[]>();
        const testToken = 'test-token';
        const testProvider: Provider = { provide: testToken, useValue: 'test-value' };
        
        providers.set(testToken, [testProvider]);
        
        // 🔴 测试默认参数分支 - 不传递自定义函数
        const result = EnvironmentInjectorUtils.generateProvidersDebugInfo(providers);
        
        expect(result).toHaveLength(1);
        expect(result[0].token).toBe('test-token');
        expect(result[0].tokenType).toBe('string');
        expect(result[0].providerType).toBe('ValueProvider');
      });

      it('应该测试只传递getTokenName参数的分支', () => {
        const providers = new Map<any, Provider[]>();
        const testToken = Symbol('test');
        const testProvider: Provider = { provide: testToken, useValue: 'test-value' };
        
        providers.set(testToken, [testProvider]);
        
        // 🔴 测试只传递第一个自定义函数的分支
        const customGetTokenName = (token: any) => `custom-${token.toString()}`;
        const result = EnvironmentInjectorUtils.generateProvidersDebugInfo(
          providers,
          customGetTokenName
          // 不传递 getTokenType，使用默认值
        );
        
        expect(result).toHaveLength(1);
        expect(result[0].token).toContain('custom-Symbol(test)');
        expect(result[0].tokenType).toBe('symbol'); // 使用默认的getTokenType
      });

      it('应该测试传递所有自定义参数的分支', () => {
        const providers = new Map<any, Provider[]>();
        const testToken = { name: 'custom-token', toString: () => 'custom-token' };
        const testProvider: Provider = { provide: testToken as any, useValue: 'test-value' };

        providers.set(testToken, [testProvider]);
        
        // 🔴 测试传递所有自定义函数的分支
        const customGetTokenName = (token: any) => `name-${token.name}`;
        const customGetTokenType = (token: any) => 'custom-type';
        
        const result = EnvironmentInjectorUtils.generateProvidersDebugInfo(
          providers,
          customGetTokenName,
          customGetTokenType
        );
        
        expect(result).toHaveLength(1);
        expect(result[0].token).toBe('name-custom-token');
        expect(result[0].tokenType).toBe('custom-type');
      });
    });

    describe('generateInstancesDebugInfo', () => {
      it('应该测试默认参数分支 - 不传递getTokenName', () => {
        const instances = new Map<any, any>();
        const testToken = 'test-instance';
        const testInstance = { value: 'test' };
        
        instances.set(testToken, testInstance);
        
        // 🔴 测试默认参数分支
        const result = EnvironmentInjectorUtils.generateInstancesDebugInfo(instances);
        
        expect(result).toHaveLength(1);
        expect(result[0].token).toBe('test-instance');
        expect(result[0].tokenName).toBe('test-instance');
        expect(result[0].instanceType).toBe('Object');
      });

      it('应该测试自定义getTokenName参数的分支', () => {
        const instances = new Map<any, any>();
        const testToken = { id: 123, toString: () => 'token-123' };
        const testInstance = { value: 'test' };

        instances.set(testToken, testInstance);
        
        // 🔴 测试自定义getTokenName分支
        const customGetTokenName = (token: any) => `id-${token.id}`;
        const result = EnvironmentInjectorUtils.generateInstancesDebugInfo(
          instances,
          customGetTokenName
        );
        
        expect(result).toHaveLength(1);
        expect(result[0].token).toBe('id-123');
        expect(result[0].tokenName).toBe('id-123');
      });

      it('应该测试实例没有constructor的分支', () => {
        const instances = new Map<any, any>();
        const testToken = 'null-instance';
        const testInstance = null;
        
        instances.set(testToken, testInstance);
        
        const result = EnvironmentInjectorUtils.generateInstancesDebugInfo(instances);
        
        expect(result).toHaveLength(1);
        expect(result[0].instanceType).toBe('unknown');
      });

      it('应该测试实例constructor没有name的分支', () => {
        const instances = new Map<any, any>();
        const testToken = 'anonymous-instance';
        
        // 创建一个没有name的constructor的对象
        const testInstance = Object.create({});
        Object.defineProperty(testInstance, 'constructor', {
          value: function() {},
          writable: true
        });
        delete testInstance.constructor.name;
        
        instances.set(testToken, testInstance);
        
        const result = EnvironmentInjectorUtils.generateInstancesDebugInfo(instances);
        
        expect(result).toHaveLength(1);
        expect(result[0].instanceType).toBe('unknown');
      });
    });

    describe('generateCircularDependencyError', () => {
      it('应该测试默认参数分支 - 不传递getTokenName', () => {
        const currentToken = 'current';
        const dependencyPath = ['dep1', 'dep2'];
        
        // 🔴 测试默认参数分支
        const error = EnvironmentInjectorUtils.generateCircularDependencyError(
          currentToken,
          dependencyPath
        );
        
        expect(error.message).toBe('检测到循环依赖: dep1 -> dep2 -> current');
      });

      it('应该测试自定义getTokenName参数的分支', () => {
        const currentToken = { name: 'current', toString: () => 'current' };
        const dependencyPath = [
          { name: 'dep1', toString: () => 'dep1' },
          { name: 'dep2', toString: () => 'dep2' }
        ];

        // 🔴 测试自定义getTokenName分支
        const customGetTokenName = (token: any) => `[${token.name}]`;
        const error = EnvironmentInjectorUtils.generateCircularDependencyError(
          currentToken,
          dependencyPath,
          customGetTokenName
        );

        expect(error.message).toBe('检测到循环依赖: [dep1] -> [dep2] -> [current]');
      });
    });
  });

  describe('🟢 绿阶段：基础功能测试', () => {
    describe('getTokenName', () => {
      it('应该正确处理各种token类型', () => {
        expect(EnvironmentInjectorUtils.getTokenName('string')).toBe('string');
        expect(EnvironmentInjectorUtils.getTokenName(Symbol('test'))).toContain('Symbol(test)');
        
        const namedFunction = function testFunc() {};
        expect(EnvironmentInjectorUtils.getTokenName(namedFunction)).toBe('testFunc');
        
        const anonymousFunction = function() {};
        Object.defineProperty(anonymousFunction, 'name', { value: '' });
        expect(EnvironmentInjectorUtils.getTokenName(anonymousFunction)).toBe('anonymous');
        
        const objectWithToString = { toString: () => 'custom-object' };
        expect(EnvironmentInjectorUtils.getTokenName(objectWithToString)).toBe('custom-object');
        
        expect(EnvironmentInjectorUtils.getTokenName(123)).toBe('123');
      });
    });

    describe('getTokenType', () => {
      it('应该正确识别token类型', () => {
        expect(EnvironmentInjectorUtils.getTokenType('string')).toBe('string');
        expect(EnvironmentInjectorUtils.getTokenType(Symbol('test'))).toBe('symbol');
        expect(EnvironmentInjectorUtils.getTokenType(function() {})).toBe('class');
        expect(EnvironmentInjectorUtils.getTokenType({ toString: () => 'test' })).toBe('InjectionToken');
        expect(EnvironmentInjectorUtils.getTokenType(123)).toBe('unknown');
      });
    });

    describe('getProviderType', () => {
      it('应该正确识别提供者类型', () => {
        expect(EnvironmentInjectorUtils.getProviderType({ provide: 'test', useValue: 'value' })).toBe('ValueProvider');
        expect(EnvironmentInjectorUtils.getProviderType({ provide: 'test', useClass: String })).toBe('ClassProvider');
        expect(EnvironmentInjectorUtils.getProviderType({ provide: 'test', useFactory: () => 'test' })).toBe('FactoryProvider');
        expect(EnvironmentInjectorUtils.getProviderType({ provide: 'test', useExisting: 'other' })).toBe('ExistingProvider');
        expect(EnvironmentInjectorUtils.getProviderType({ provide: String })).toBe('ConstructorProvider');
      });
    });

    describe('isMultiProvider', () => {
      it('应该正确检测多值提供者', () => {
        expect(EnvironmentInjectorUtils.isMultiProvider([{ provide: 'test', useValue: 'value' }])).toBe(false);
        expect(EnvironmentInjectorUtils.isMultiProvider([{ provide: 'test', useValue: 'value', multi: true }])).toBe(true);
        expect(EnvironmentInjectorUtils.isMultiProvider([
          { provide: 'test', useValue: 'value1' },
          { provide: 'test', useValue: 'value2', multi: true }
        ])).toBe(true);
      });
    });

    describe('validateInjectOptions', () => {
      it('应该验证注入选项', () => {
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ self: true, skipSelf: true }))
          .toThrow('InjectOptions: self 和 skipSelf 选项不能同时使用');
        
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ host: true, self: true }))
          .toThrow('InjectOptions: host 选项不能与 self 或 skipSelf 同时使用');
        
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ host: true, skipSelf: true }))
          .toThrow('InjectOptions: host 选项不能与 self 或 skipSelf 同时使用');
        
        // 正常情况不应该抛出错误
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ optional: true })).not.toThrow();
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ self: true })).not.toThrow();
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ skipSelf: true })).not.toThrow();
        expect(() => EnvironmentInjectorUtils.validateInjectOptions({ host: true })).not.toThrow();
      });
    });

    describe('generateInjectorId', () => {
      it('应该生成唯一的注入器ID', () => {
        const id1 = EnvironmentInjectorUtils.generateInjectorId();
        const id2 = EnvironmentInjectorUtils.generateInjectorId();
        
        expect(id1).toMatch(/^injector_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^injector_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });
  });
});
