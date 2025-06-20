import { type CreateHeaders } from "../../verify/index.js";
import { type Money } from "./money.js";
import { type Resource } from "./resource.js";
import { type PaymentRequirements } from "../verify/index.js";

export type FacilitatorConfig = {
  url: Resource;
  createAuthHeaders?: CreateHeaders;
};

export interface ERC20TokenAmount {
  amount: string;
  asset: {
    address: `0x${string}`;
    decimals: number;
    eip712: {
      name: string;
      version: string;
    };
  };
}

export type Price = Money | ERC20TokenAmount;

export type RouteConfig = {
  paymentRequirements: PaymentRequirements[];
};

export type MiddlewareConfig = {
  routes: Record<string, RouteConfig>;
  facilitatorUrl?: string;
};

export type RoutesConfig = Record<string, Price | RouteConfig>;

export interface RoutePattern {
  verb: string;
  pattern: RegExp;
  config: RouteConfig;
}
