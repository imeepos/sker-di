import { InjectionTokenType } from './injector';
import { InjectOptions } from './inject-options';

/**
 * 注入元数据存储键
 */
const INJECT_METADATA_KEY = Symbol('inject');

/**
 * 注入选项元数据存储键
 */
const INJECT_OPTIONS_METADATA_KEY = Symbol('inject-options');

/**
 * 参数类型元数据存储键（TypeScript 自动生成）
 */
const PARAM_TYPES_KEY = 'design:paramtypes';

/**
 * @Inject 参数装饰器
 * 用于指定构造函数参数的注入令牌
 * 
 * @param token 注入令牌
 * @param options 注入选项
 * @returns 参数装饰器函数
 */
export function Inject<T>(token: InjectionTokenType<T>, options?: InjectOptions): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 获取现有的注入令牌数组
    const existingTokens: any[] = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    
    // 确保数组足够大以容纳当前参数索引
    while (existingTokens.length <= parameterIndex) {
      existingTokens.push(undefined);
    }
    
    // 设置当前参数的注入令牌
    existingTokens[parameterIndex] = token;
    
    // 存储更新后的令牌数组
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
    
    // 如果提供了选项，也存储选项
    if (options) {
      const existingOptions: InjectOptions[] = Reflect.getMetadata(INJECT_OPTIONS_METADATA_KEY, target) || [];
      
      // 确保数组足够大
      while (existingOptions.length <= parameterIndex) {
        existingOptions.push({});
      }
      
      existingOptions[parameterIndex] = options;
      Reflect.defineMetadata(INJECT_OPTIONS_METADATA_KEY, existingOptions, target);
    }
  };
}

/**
 * 获取类构造函数的注入元数据
 * 结合 @Inject 装饰器的令牌和 TypeScript 的类型信息
 * 
 * @param target 目标类
 * @returns 注入令牌数组，每个元素对应构造函数的一个参数
 */
export function getInjectMetadata(target: any): any[] | undefined {
  // 获取显式的注入令牌
  const injectTokens: any[] | undefined = Reflect.getMetadata(INJECT_METADATA_KEY, target);
  
  // 获取 TypeScript 推断的参数类型
  const paramTypes: any[] | undefined = Reflect.getMetadata(PARAM_TYPES_KEY, target);
  
  // 如果没有任何元数据，返回 undefined
  if (!injectTokens && !paramTypes) {
    return undefined;
  }
  
  // 确定结果数组的长度
  const maxLength = Math.max(
    injectTokens?.length || 0,
    paramTypes?.length || 0
  );
  
  if (maxLength === 0) {
    return undefined;
  }
  
  // 构建结果数组
  const result: any[] = [];
  for (let i = 0; i < maxLength; i++) {
    // 优先使用 @Inject 装饰器指定的令牌
    if (injectTokens && injectTokens[i] !== undefined) {
      result[i] = injectTokens[i];
    } else if (paramTypes && paramTypes[i] !== undefined) {
      // 否则使用 TypeScript 推断的类型
      result[i] = paramTypes[i];
    } else {
      result[i] = undefined;
    }
  }
  
  return result;
}

/**
 * 获取注入选项元数据
 * 
 * @param target 目标类
 * @returns 注入选项数组
 */
export function getInjectOptionsMetadata(target: any): InjectOptions[] | undefined {
  return Reflect.getMetadata(INJECT_OPTIONS_METADATA_KEY, target);
}

/**
 * 检查类是否有注入元数据
 * 
 * @param target 目标类
 * @returns 是否有注入元数据
 */
export function hasInjectMetadata(target: any): boolean {
  return Reflect.hasMetadata(INJECT_METADATA_KEY, target) || 
         Reflect.hasMetadata(PARAM_TYPES_KEY, target);
}