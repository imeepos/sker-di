/**
 * OnDestroy 生命周期接口
 * 实现此接口的服务会在注入器销毁时被调用 ngOnDestroy 方法
 */
export interface OnDestroy {
  /**
   * 在实例销毁时调用的清理方法
   */
  ngOnDestroy(): void;
}

export function isOnDestroy(obj: any): obj is OnDestroy {
  if (!obj) return false;
  return typeof obj.ngOnDestroy === 'function';
}


export interface OnInit {
  ngOnInit(): Promise<void>;
}

export function isOnInit(obj: any): obj is OnInit {
  if (!obj) return false;
  return typeof obj.ngOnInit === 'function';
}

export interface OnInstall {
  ngOnInstall(): Promise<void>;
}

export function isOnInstall(obj: any): obj is OnInstall {
  if (!obj) return false;
  return typeof obj.ngOnInstall === 'function';
}

export interface OnUnInstall {
  ngOnUnInstall(): Promise<void>;
}

export function isOnUnInstall(obj: any): obj is OnUnInstall {
  if (!obj) return false;
  return typeof obj.ngOnUnInstall === 'function';
}

export interface OnUpgrade {
  ngOnUpgrade(): Promise<void>;
}

export function isOnUpgrade(obj: any): obj is OnUpgrade {
  if (!obj) return false;
  return typeof obj.ngOnUpgrade === 'function';
}
