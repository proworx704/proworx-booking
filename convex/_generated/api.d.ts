/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ViktorSpacesEmail from "../ViktorSpacesEmail.js";
import type * as adSync from "../adSync.js";
import type * as agreements from "../agreements.js";
import type * as aiAssistant from "../aiAssistant.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as availability from "../availability.js";
import type * as bookings from "../bookings.js";
import type * as calendarEvents from "../calendarEvents.js";
import type * as catalog from "../catalog.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as debugAuth from "../debugAuth.js";
import type * as emailCampaigns from "../emailCampaigns.js";
import type * as employeePortal from "../employeePortal.js";
import type * as http from "../http.js";
import type * as loyalty from "../loyalty.js";
import type * as maintenanceMembers from "../maintenanceMembers.js";
import type * as marketing from "../marketing.js";
import type * as migrations_addTouchUpPaint from "../migrations/addTouchUpPaint.js";
import type * as migrations_updateTo90PerHour from "../migrations/updateTo90PerHour.js";
import type * as notifications from "../notifications.js";
import type * as payrollPayouts from "../payrollPayouts.js";
import type * as payrollTaxSettings from "../payrollTaxSettings.js";
import type * as payrollTimeEntries from "../payrollTimeEntries.js";
import type * as payrollWorkers from "../payrollWorkers.js";
import type * as recurringBlocks from "../recurringBlocks.js";
import type * as repriceServices from "../repriceServices.js";
import type * as seedCameronSchedule from "../seedCameronSchedule.js";
import type * as seedSquareBookings from "../seedSquareBookings.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as serviceFreeze from "../serviceFreeze.js";
import type * as services from "../services.js";
import type * as siteConfig from "../siteConfig.js";
import type * as sitePages from "../sitePages.js";
import type * as sitePhotos from "../sitePhotos.js";
import type * as squareBookingSync from "../squareBookingSync.js";
import type * as squareCustomerSync from "../squareCustomerSync.js";
import type * as squareImport from "../squareImport.js";
import type * as squarePayments from "../squarePayments.js";
import type * as staff from "../staff.js";
import type * as staffAvailability from "../staffAvailability.js";
import type * as support from "../support.js";
import type * as systemSettings from "../systemSettings.js";
import type * as tempSquareSync from "../tempSquareSync.js";
import type * as testAuth from "../testAuth.js";
import type * as updateMemberships from "../updateMemberships.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";
import type * as viktorTools from "../viktorTools.js";
import type * as websiteSync from "../websiteSync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ViktorSpacesEmail: typeof ViktorSpacesEmail;
  adSync: typeof adSync;
  agreements: typeof agreements;
  aiAssistant: typeof aiAssistant;
  analytics: typeof analytics;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  availability: typeof availability;
  bookings: typeof bookings;
  calendarEvents: typeof calendarEvents;
  catalog: typeof catalog;
  constants: typeof constants;
  crons: typeof crons;
  customers: typeof customers;
  debugAuth: typeof debugAuth;
  emailCampaigns: typeof emailCampaigns;
  employeePortal: typeof employeePortal;
  http: typeof http;
  loyalty: typeof loyalty;
  maintenanceMembers: typeof maintenanceMembers;
  marketing: typeof marketing;
  "migrations/addTouchUpPaint": typeof migrations_addTouchUpPaint;
  "migrations/updateTo90PerHour": typeof migrations_updateTo90PerHour;
  notifications: typeof notifications;
  payrollPayouts: typeof payrollPayouts;
  payrollTaxSettings: typeof payrollTaxSettings;
  payrollTimeEntries: typeof payrollTimeEntries;
  payrollWorkers: typeof payrollWorkers;
  recurringBlocks: typeof recurringBlocks;
  repriceServices: typeof repriceServices;
  seedCameronSchedule: typeof seedCameronSchedule;
  seedSquareBookings: typeof seedSquareBookings;
  seedTestUser: typeof seedTestUser;
  serviceFreeze: typeof serviceFreeze;
  services: typeof services;
  siteConfig: typeof siteConfig;
  sitePages: typeof sitePages;
  sitePhotos: typeof sitePhotos;
  squareBookingSync: typeof squareBookingSync;
  squareCustomerSync: typeof squareCustomerSync;
  squareImport: typeof squareImport;
  squarePayments: typeof squarePayments;
  staff: typeof staff;
  staffAvailability: typeof staffAvailability;
  support: typeof support;
  systemSettings: typeof systemSettings;
  tempSquareSync: typeof tempSquareSync;
  testAuth: typeof testAuth;
  updateMemberships: typeof updateMemberships;
  userProfiles: typeof userProfiles;
  users: typeof users;
  viktorTools: typeof viktorTools;
  websiteSync: typeof websiteSync;
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
