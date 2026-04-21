import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, actions }: DashboardLayoutProps) => {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#0c1220] transition-colors duration-200">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        <header className="bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-[#1e2d45] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 lg:gap-4 ml-10 lg:ml-0 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {actions}
            <button
              onClick={toggle}
              aria-label={isDark ? "Mode clair" : "Mode sombre"}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <div className="flex-1 p-3 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
