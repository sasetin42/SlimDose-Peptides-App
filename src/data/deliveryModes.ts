export interface DeliveryMode {
  id: string;
  name: string;
  desc: string;
  fee: number;
}

export const DELIVERY_MODES: DeliveryMode[] = [
  { id: 'JT_LUZON', name: 'J&T — Luzon', desc: 'Provincial Luzon courier (2–3 days)', fee: 120 },
  { id: 'JT_VISAYAS', name: 'J&T — Visayas', desc: 'Regional Visayas courier (3–4 days)', fee: 150 },
  { id: 'JT_MINDANAO', name: 'J&T — Mindanao', desc: 'Regional Mindanao courier (3–5 days)', fee: 90 },
  { id: 'MAXIM_DAVAO', name: 'Maxim — Davao City', desc: 'Same-day express (Davao City only)', fee: 0 },
  { id: 'LALAMOVE_MM', name: 'Lalamove — Metro Manila', desc: 'Same-day courier (NCR / Metro Manila)', fee: 0 },
];
