import type { VenuApiProvider } from "./provider";
import { MockApi } from "./mockApi";
import { RealApi } from "./realApi";

export const api: VenuApiProvider = import.meta.env.DEV ? new MockApi() : new RealApi();
export type { VenuApiProvider } from "./provider";
