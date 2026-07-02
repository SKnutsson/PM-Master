import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useAppMode } from '@/contexts/AppModeContext';
import { ModeSwitcher } from './ModeSwitcher';
import alfingLogo from '@/assets/alfing-seating-logo-green.png';
import alfingDarkLogo from '@/assets/alfing-logo-dark.png.asset.json';

import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  CalendarDays,
  HardHat,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  UserCircle,
  ListChecks,
  TrendingUp,
  Wrench,
  FileSpreadsheet,
  FileText,
  Users,
  PieChart } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type View =
  | 'dashboard' | 'projects' | 'forecast' | 'timeline' | 'resources'
  | 'resources-analytics' | 'documentation' | 'profile' | 'my-tasks'
  | 'services' | 'ata'
  | 'crm-dashboard' | 'crm-quotes' | 'crm-customers' | 'crm-stats'
  | 'production';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const pmTopItems = [{ id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard }];
const pmMainItems = [
  { id: 'projects' as View, label: 'Projekt', icon: FolderKanban },
  { id: 'my-tasks' as View, label: 'Mina uppgifter', icon: ListChecks },
  { id: 'timeline' as View, label: 'Ganttschema', icon: CalendarDays },
  { id: 'resources' as View, label: 'Resursplanering', icon: HardHat },
  { id: 'documentation' as View, label: 'Dokumentationsplan', icon: ClipboardList },
  { id: 'resources-analytics' as View, label: 'Uppföljning', icon: TrendingUp },
  { id: 'ata' as View, label: 'ÄTA', icon: FileSpreadsheet },
];

const crmTopItems = [{ id: 'crm-dashboard' as View, label: 'Dashboard', icon: LayoutDashboard }];
const crmMainItems = [
  { id: 'crm-quotes' as View, label: 'Alla offerter', icon: FileText },
  { id: 'crm-customers' as View, label: 'Kunder', icon: Users },
  { id: 'forecast' as View, label: 'Försäljningsbudget', icon: BarChart3 },
  { id: 'services' as View, label: 'Servicar', icon: Wrench },
  { id: 'crm-stats' as View, label: 'Statistik', icon: PieChart },
];

const productionTopItems = [{ id: 'production' as View, label: 'Flödeskarta', icon: LayoutDashboard }];
const productionMainItems: { id: View; label: string; icon: any }[] = [];

const bottomNavItems = [{ id: 'profile' as View, label: 'Profil', icon: UserCircle }];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { mode } = useAppMode();
  const isDark = theme === 'dark';

  const topItems = mode === 'crm' ? crmTopItems : mode === 'production' ? productionTopItems : pmTopItems;
  const mainItems = mode === 'crm' ? crmMainItems : mode === 'production' ? productionMainItems : pmMainItems;

  const renderNavItem = (item: { id: View; label: string; icon: any }) => {
    const isActive = currentView === item.id;
    const NavButton = (
      <Button
        key={item.id}
        variant="ghost"
        onClick={() => onViewChange(item.id)}
        className={cn(
          'w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground transition-all',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50',
          isCollapsed && 'justify-center px-2'
        )}>
        <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {!isCollapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
            {item.label}
          </motion.span>
        )}
      </Button>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{NavButton}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return NavButton;
  };

  const renderNavItems = (items: { id: View; label: string; icon: any }[]) => items.map(renderNavItem);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar">

      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <img
          src={alfingLogo}
          alt="Alfing Seating"
          className={cn("shrink-0 rounded object-cover", isCollapsed ? "h-9 w-9" : "h-9 w-auto max-w-[140px]")} />
      </div>

      {/* Mode switcher */}
      <div className="px-3 pt-3">
        <ModeSwitcher collapsed={isCollapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {renderNavItems(topItems)}

        <div className="py-1.5"><div className="h-px bg-sidebar-border" /></div>

        {renderNavItems(mainItems)}

        <div className="py-1.5"><div className="h-px bg-sidebar-border" /></div>

        {renderNavItems(bottomNavItems)}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground">
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Theme + logout */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all',
                isCollapsed && 'justify-center px-2'
              )}>
              <div className="relative h-5 w-5 shrink-0">
                <Sun className={cn('absolute inset-0 h-5 w-5 transition-all duration-300', isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100')} />
                <Moon className={cn('absolute inset-0 h-5 w-5 transition-all duration-300', isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50')} />
              </div>
              {!isCollapsed && <span className="text-sm">{isDark ? 'Mörkt läge' : 'Ljust läge'}</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right" className="font-medium">{isDark ? 'Byt till ljust' : 'Byt till mörkt'}</TooltipContent>}
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                isCollapsed && 'justify-center px-2'
              )}>
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Logga ut</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right" className="font-medium">Logga ut</TooltipContent>}
        </Tooltip>
      </div>

      {!isCollapsed && <p className="px-4 pb-3 text-[10px] select-none text-slate-400">Developed by S. Knutsson</p>}
    </motion.aside>);
}
