import { type CreateHeaders } from "../../verify";
import { type Money } from "./money";
import { type Resource } from "./resource";
import { type PaymentRequirements } from "../verify";

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
