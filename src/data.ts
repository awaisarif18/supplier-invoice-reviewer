import fixtures from './fixtures.json';
import type { Rate, Sample } from './types';

export const samples: Sample[] = fixtures.cases;
export const rates: Rate[] = fixtures.rates;
export const oldRate = samples[0];

export const reviewPath = (id: string) => `/review/${id}/`;
export const money = (cents: number | null) => cents === null ? 'Unavailable' : currency.format(cents / 100);
export const date = (iso: string) => dates.format(new Date(`${iso}T00:00:00Z`));

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dates = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
