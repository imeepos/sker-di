import { DIDebugger } from "./debug";
import { diDebugger, DIInspector, diInspector } from "./debug-inspector";
import { EnvironmentInjector } from "./environment-injector";
import { NullInjector } from "./null-injector";
export const rootInjector = EnvironmentInjector.createWithAutoProviders([
    { provide: DIDebugger, useValue: diDebugger },
    { provide: DIInspector, useValue: diInspector }
], new NullInjector(), `root`);