export const dynamic = 'force-dynamic'

import NavBar from '@/components/NavBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-gray-100 bg-white px-4 py-6 sticky top-0 h-screen">
        <NavBar />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-6 py-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
