import { api } from './api';
import type { MarketCode } from './jobs';

export type SubMarket = {
  id: string;
  parent_market: MarketCode;
  handler: string;
  display_name: string;
  region_code: string | null;
  operational_status:
    | 'active'
    | 'blocked'
    | 'limited'
    | 'tribal_only'
    | 'volatile'
    | 'inactive';
  regulatory_body: string | null;
  min_age: number | null;
  currency: string | null;
};

export function listSubMarkets(market?: MarketCode) {
  const qs = market ? `?market=${market}` : '';
  return api<SubMarket[]>(`/v1/sub-markets${qs}`);
}
