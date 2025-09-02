import { Inject } from './inject';
import { InjectionTokenType } from './injector';

/**
 * @Optional 参数装饰器
 * 标记参数为可选的，注入失败时返回 null 而不是抛出错误
 * 
 * @param token 注入令牌
 * @returns 参数装饰器函数
 */
export function Optional<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 使用 @Inject 装饰器注册令牌，并设置 optional: true 选项
    return Inject(token, { optional: true })(target, propertyKey, parameterIndex);
  };
}

/**
 * @Self 参数装饰器
 * 只在当前注入器中查找依赖，不向上查找父级注入器
 * 
 * @param token 注入令牌
 * @returns 参数装饰器函数
 */
export function Self<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 使用 @Inject 装饰器注册令牌，并设置 self: true 选项
    return Inject(token, { self: true })(target, propertyKey, parameterIndex);
  };
}

/**
 * @SkipSelf 参数装饰器
 * 跳过当前注入器，从父级注入器开始查找依赖
 * 
 * @param token 注入令牌
 * @returns 参数装饰器函数
 */
export function SkipSelf<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 使用 @Inject 装饰器注册令牌，并设置 skipSelf: true 选项
    return Inject(token, { skipSelf: true })(target, propertyKey, parameterIndex);
  };
}

/**
 * @Host 参数装饰器
 * 在宿主注入器中查找依赖
 * 
 * @param token 注入令牌
 * @returns 参数装饰器函数
 */
export function Host<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 使用 @Inject 装饰器注册令牌，并设置 host: true 选项
    return Inject(token, { host: true })(target, propertyKey, parameterIndex);
  };
}