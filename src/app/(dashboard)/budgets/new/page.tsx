import BudgetForm from '@/components/BudgetForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBudgetPage() {
  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">New Budget</h1>
        <p className="text-sm text-gray-400 mb-6">Create a monthly or project-based budget.</p>
        <BudgetForm />
      </div>
    </div>
  )
}
