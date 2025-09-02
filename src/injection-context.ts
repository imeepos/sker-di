import { Injector } from './injector';

/**
 * 全局上下文存储，用于管理当前活跃的注入器
 * 使用栈结构支持嵌套上下文
 */
class InjectionContextStack {
  private stack: Injector[] = [];

  /**
   * 获取当前活跃的注入器上下文
   * @returns 当前注入器或 null（如果没有活跃上下文）
   */
  getCurrentContext(): Injector | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * 推入新的注入器上下文
   * @param injector 要推入的注入器
   */
  pushContext(injector: Injector): void {
    this.stack.push(injector);
  }

  /**
   * 弹出当前注入器上下文
   * @returns 被弹出的注入器
   */
  popContext(): Injector | null {
    return this.stack.pop() || null;
  }
}

/**
 * 全局上下文栈实例
 */
const contextStack = new InjectionContextStack();

/**
 * 在指定的注入器上下文中执行函数
 * 支持同步和异步函数，支持嵌套上下文，并确保上下文正确恢复
 * 
 * @param injector 要设置为当前上下文的注入器
 * @param fn 要在上下文中执行的函数
 * @returns 函数的返回值
 */
export function runInInjectionContext<T>(
  injector: Injector, 
  fn: () => T
): T {
  // 推入新的上下文
  contextStack.pushContext(injector);
  
  try {
    // 执行函数
    return fn();
  } finally {
    // 无论成功还是异常，都要恢复上下文
    contextStack.popContext();
  }
}

/**
 * 获取当前活跃的注入器上下文
 * @returns 当前注入器，如果没有活跃上下文则返回 null
 */
export function getCurrentInjectionContext(): Injector | null {
  return contextStack.getCurrentContext();
}

/**
 * 断言当前处于注入上下文中，如果不在则抛出错误
 * 主要用于 inject() 等函数中验证调用环境
 * 
 * @param errorMessage 可选的自定义错误消息
 * @returns 当前活跃的注入器
 * @throws Error 当没有活跃的注入上下文时
 */
export function assertInInjectionContext(
  errorMessage: string = 'inject() 必须在注入上下文中调用'
): Injector {
  const currentInjector = getCurrentInjectionContext();
  
  if (currentInjector === null) {
    throw new Error(errorMessage);
  }
  
  return currentInjector;
}