import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Home className="h-4 w-4" />
      <span className="cursor-pointer hover:text-foreground">Home</span>
      {items.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          <span 
            className={
              index === items.length - 1 
                ? 'text-foreground font-medium' 
                : 'cursor-pointer hover:text-foreground'
            }
          >
            {item.label}
          </span>
        </Fragment>
      ))}
    </nav>
  );
}
