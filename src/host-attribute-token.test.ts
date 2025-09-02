import { HostAttributeToken } from './host-attribute-token';
import { Injectable } from './injectable';
import { EnvironmentInjector } from './environment-injector';

describe('HostAttributeToken 测试', () => {
  describe('HostAttributeToken 基本功能', () => {
    it('应该创建宿主属性令牌', () => {
      const token = new HostAttributeToken<string>('data-value');
      
      expect(token.toString()).toBe('HostAttributeToken(data-value)');
      expect(token.attribute).toBe('data-value');
    });

    it('应该支持类型参数', () => {
      const stringToken = new HostAttributeToken<string>('data-text');
      const numberToken = new HostAttributeToken<number>('data-count');
      const booleanToken = new HostAttributeToken<boolean>('data-enabled');
      
      expect(stringToken.attribute).toBe('data-text');
      expect(numberToken.attribute).toBe('data-count');
      expect(booleanToken.attribute).toBe('data-enabled');
    });
  });

  describe('HostAttributeToken 注入功能', () => {
    it('应该从宿主属性中注入字符串值', () => {
      const DATA_ATTR = new HostAttributeToken<string>('data-value');

      // 直接通过值提供者提供 HostAttributeToken 的值
      const injector = EnvironmentInjector.createWithAutoProviders([
        { provide: DATA_ATTR, useValue: 'host-attribute-value' }
      ]);

      const value = injector.get(DATA_ATTR);
      expect(value).toBe('host-attribute-value');
    });

    it('应该支持可选的宿主属性', () => {
      const OPTIONAL_ATTR = new HostAttributeToken<string>('data-optional');

      const injector = EnvironmentInjector.createWithAutoProviders([]);

      expect(() => injector.get(OPTIONAL_ATTR)).toThrow();
    });

    it('应该支持默认值工厂函数', () => {
      const ATTR_WITH_DEFAULT = new HostAttributeToken<string>('data-default', 'default-value');

      const injector = EnvironmentInjector.createWithAutoProviders([
        { 
          provide: ATTR_WITH_DEFAULT, 
          useFactory: () => ATTR_WITH_DEFAULT.defaultValue || 'factory-default',
          deps: []
        }
      ]);

      const value = injector.get(ATTR_WITH_DEFAULT);
      expect(value).toBe('default-value');
    });
  });

  describe('HostAttributeToken 工厂函数', () => {
    it('应该支持使用工厂函数创建令牌', () => {
      function createHostAttributeToken<T>(attribute: string, defaultValue?: T): HostAttributeToken<T> {
        return new HostAttributeToken<T>(attribute, defaultValue);
      }

      const token = createHostAttributeToken<string>('data-test', 'default');
      
      expect(token.attribute).toBe('data-test');
      expect(token.defaultValue).toBe('default');
    });
  });

  describe('HostAttributeToken 工具函数', () => {
    it('应该正确检测 HostAttributeToken 类型', () => {
      const { isHostAttributeToken } = require('./host-attribute-token');
      
      const token = new HostAttributeToken<string>('data-test');
      const notToken = { attribute: 'data-test' };
      
      expect(isHostAttributeToken(token)).toBe(true);
      expect(isHostAttributeToken(notToken)).toBe(false);
      expect(isHostAttributeToken(null)).toBe(false);
      expect(isHostAttributeToken(undefined)).toBe(false);
      expect(isHostAttributeToken('string')).toBe(false);
    });

    it('应该正确使用 createHostAttributeToken 工厂函数', () => {
      const { createHostAttributeToken } = require('./host-attribute-token');
      
      const token = createHostAttributeToken('data-factory', 'factory-default');
      
      expect(token).toBeInstanceOf(HostAttributeToken);
      expect(token.attribute).toBe('data-factory');
      expect(token.defaultValue).toBe('factory-default');
    });

    it('应该正确处理 equals 方法', () => {
      const token1 = new HostAttributeToken<string>('data-same');
      const token2 = new HostAttributeToken<string>('data-same');
      const token3 = new HostAttributeToken<string>('data-different');
      
      expect(token1.equals(token2)).toBe(true);
      expect(token1.equals(token3)).toBe(false);
      expect(token1.equals(null)).toBe(false);
      expect(token1.equals(undefined)).toBe(false);
      expect(token1.equals('data-same')).toBe(false);
    });
  });
});