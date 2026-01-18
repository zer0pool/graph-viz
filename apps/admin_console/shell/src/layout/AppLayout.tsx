import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { cn } from "../lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onSelectGraphNode: (node: any) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onSelectGraphNode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <Navbar
        onSelectGraphNode={onSelectGraphNode}
        onToggleSidebar={toggleSidebar}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={isCollapsed} />
        <main className="flex-1 overflow-y-auto relative p-4 pb-12">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
};
