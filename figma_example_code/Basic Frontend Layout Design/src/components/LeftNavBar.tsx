import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Briefcase,
  Table2,
  GitBranch,
  Shield,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from './ui/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  children?: { label: string; href?: string }[];
}

interface LeftNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: 'Dashboard',
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    label: 'Jobs',
  },
  {
    icon: <Table2 className="h-5 w-5" />,
    label: 'Tables',
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    label: 'Data Lineage',
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: 'Users',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    label: 'Audit/Events',
  },
  {
    icon: <Settings className="h-5 w-5" />,
    label: 'Settings',
  },
];

export function LeftNavBar({ currentPage, onNavigate }: LeftNavBarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div className="w-64 border-r bg-sidebar h-full flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            <button
              onClick={() => {
                if (item.children) {
                  toggleExpand(item.label);
                } else {
                  onNavigate(item.label);
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                currentPage === item.label && !item.children
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {item.badge}
                </span>
              )}
              {item.children && (
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expandedItems.includes(item.label) && 'rotate-90'
                  )}
                />
              )}
            </button>
            {item.children && expandedItems.includes(item.label) && (
              <div className="ml-11 mt-1 space-y-1">
                {item.children.map((child) => (
                  <button
                    key={child.label}
                    onClick={() => onNavigate(child.label)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      currentPage === child.label
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}