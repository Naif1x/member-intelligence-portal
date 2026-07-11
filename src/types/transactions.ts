import type { ChannelName } from './index';

export interface TransactionHeader {
  unified_id: string;
  channel: ChannelName;
  transaction_id: string;
  transaction_ref: string;
  date: string;
  outlet: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export interface TransactionItem {
  unified_id: string;
  channel: ChannelName;
  transaction_id: string;
  date: string;
  item_id: string;
  item_name: string;
  category: string;
  quantity: number;
  line_amount: number;
  line_tax: number;
}

export interface TransactionData {
  generatedAt: string;
  dateRange: { min: string; max: string };
  headers: TransactionHeader[];
  items: TransactionItem[];
}
