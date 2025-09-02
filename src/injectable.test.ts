import { Injectable, getInjectableMetadata } from './injectable';

describe('@Injectable 装饰器', () => {
  it('应该能够装饰类并存储元数据', () => {
    @Injectable()
    class TestService {
      name = 'test';
    }

    const metadata = getInjectableMetadata(TestService);
    expect(metadata).toBeDefined();
    expect(metadata?.providedIn).toBeUndefined();
  });

  it('应该支持 providedIn: "root" 选项', () => {
    @Injectable({ providedIn: 'root' })
    class RootService {
      name = 'root';
    }

    const metadata = getInjectableMetadata(RootService);
    expect(metadata).toBeDefined();
    expect(metadata?.providedIn).toBe('root');
  });

  it('应该支持 providedIn: "platform" 选项', () => {
    @Injectable({ providedIn: 'platform' })
    class PlatformService {
      name = 'platform';
    }

    const metadata = getInjectableMetadata(PlatformService);
    expect(metadata).toBeDefined();
    expect(metadata?.providedIn).toBe('platform');
  });

  it('应该支持 providedIn: null 选项', () => {
    @Injectable({ providedIn: null })
    class ManualService {
      name = 'manual';
    }

    const metadata = getInjectableMetadata(ManualService);
    expect(metadata).toBeDefined();
    expect(metadata?.providedIn).toBeNull();
  });

  it('没有装饰器的类应该返回 undefined 元数据', () => {
    class PlainService {
      name = 'plain';
    }

    const metadata = getInjectableMetadata(PlainService);
    expect(metadata).toBeUndefined();
  });

  it('应该支持工厂函数配置', () => {
    const factory = () => ({ value: 'factory-created' });

    @Injectable({ 
      providedIn: 'root',
      useFactory: factory
    })
    class FactoryService {}

    const metadata = getInjectableMetadata(FactoryService);
    expect(metadata).toBeDefined();
    expect(metadata?.useFactory).toBe(factory);
  });
});