import { motion } from "framer-motion"
import Sidebar from "./sidebar"
import Header from "./header"
import { useDashboardTheme, themeStyles } from "./theme-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme } = useDashboardTheme()
  const styles = themeStyles[theme]

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${styles.bg} ${styles.text}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative z-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
        
        {/* Background Gradients/Effects */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          {theme === 'studio' && (
            <>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
