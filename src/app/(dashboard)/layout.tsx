export const dynamic = 'force-dynamic'

import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { LayoutDashboard, PlusCircle, FileImage, Download } from 'lucide-react'

const MOBILE_NAV = [
  { href: '/dashboard',   label: 'Home',     Icon: LayoutDashboard },
  { href: '/budgets/new', label: 'New',      Icon: PlusCircle },
  { href: '/receipts',    label: 'Receipts', Icon: FileImage },
  { href: '/export',      label: 'Export',   Icon: Download },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-gray-100 bg-white px-4 py-6 sticky top-0 h-screen">
        <NavBar />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 flex items-center justify-around px-2 py-2 safe-b">
        {MOBILE_NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
