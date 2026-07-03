// Tipos mínimos da Enable Banking API (só os campos que usamos)

export interface EbAspsp {
  name: string;
  country: string;
  logo?: string;
  maximum_consent_validity?: number; // segundos
}

export interface EbAccountId {
  iban?: string;
  other?: { identification?: string };
}

export interface EbAccount {
  uid: string;
  name?: string;
  product?: string;
  currency?: string;
  account_id?: EbAccountId;
  identification_hash?: string;
}

export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  aspsp: { name: string; country: string };
  access: { valid_until: string };
  psu_type?: string;
}

export interface EbBalance {
  name?: string;
  balance_type?: string; // CLBD (contabilístico), ITAV (disponível), XPCD...
  balance_amount: { currency: string; amount: string };
}

export interface EbTransaction {
  entry_reference?: string;
  transaction_amount: { currency: string; amount: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  status?: string;
  booking_date?: string;
  value_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
  [key: string]: unknown;
}
