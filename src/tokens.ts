import { InjectionToken } from "./injection-token";
export interface Inititation {
    (): Promise<void>;
}
/**
 * 平台初始化
 */
export const PLATFORM_INITITATION = new InjectionToken<Inititation[]>(`PLATFORM_INITITATION`)
/**
 * 应用初始化
 */
export const APPLICATION_INITITATION = new InjectionToken<Inititation[]>(`APPLICATION_INITITATION`)
