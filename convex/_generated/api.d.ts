/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib from "../_lib.js";
import type * as analytics from "../analytics.js";
import type * as categories from "../categories.js";
import type * as coaReports from "../coaReports.js";
import type * as faqs from "../faqs.js";
import type * as globalDiscounts from "../globalDiscounts.js";
import type * as guideTopics from "../guideTopics.js";
import type * as orders from "../orders.js";
import type * as paymentMethods from "../paymentMethods.js";
import type * as productVariations from "../productVariations.js";
import type * as products from "../products.js";
import type * as promoCodes from "../promoCodes.js";
import type * as shippingLocations from "../shippingLocations.js";
import type * as siteSettings from "../siteSettings.js";
import type * as storage from "../storage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _lib: typeof _lib;
  analytics: typeof analytics;
  categories: typeof categories;
  coaReports: typeof coaReports;
  faqs: typeof faqs;
  globalDiscounts: typeof globalDiscounts;
  guideTopics: typeof guideTopics;
  orders: typeof orders;
  paymentMethods: typeof paymentMethods;
  productVariations: typeof productVariations;
  products: typeof products;
  promoCodes: typeof promoCodes;
  shippingLocations: typeof shippingLocations;
  siteSettings: typeof siteSettings;
  storage: typeof storage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
