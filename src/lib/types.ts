export type BudgetType = 'monthly' | 'project'

export interface Budget {
  id: string
  user_id: string
  name: string
  type: BudgetType
  month?: number | null
  year?: number | null
  start_date?: string | null
  end_date?: string | null
  total_amount: number
  created_at: string
}

export interface Bucket {
  id: string
  budget_id: string
  name: string
  allocated_amount: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  budget_id: string
  bucket_id: string | null
  date: string
  vendor: string
  amount: number
  notes: string | null
  receipt_url: string | null
  receipt_base64: string | null
  created_at: string
}

// Extended types with joined/computed data
export interface BucketWithStats extends Bucket {
  spent: number
  remaining: number
  transaction_count: number
}

export interface TransactionWithBucket extends Transaction {
  bucket: Bucket | null
}

export interface BudgetWithStats extends Budget {
  spent: number
  remaining: number
  bucket_count: number
  transaction_count: number
}
