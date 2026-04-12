'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, PlusCircle, LogOut, Wallet, FileImage, Download } from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/budgets/new', label: 'New Budget', Icon: PlusCircle },
  { href: '/receipts',    label: 'Receipts',   Icon: FileImage },
  { href: '/export',      label: 'Export',     Icon: Download },
]

export default function NavBar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">BudgetApp</span>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV_LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
