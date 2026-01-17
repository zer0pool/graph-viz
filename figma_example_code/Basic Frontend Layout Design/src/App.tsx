import { useState } from 'react';
import { TopGNB } from './components/TopGNB';
import { LeftNavBar } from './components/LeftNavBar';
import { DashboardPage } from './components/pages/DashboardPage';
import { JobsPage } from './components/pages/JobsPage';
import { TablesPage } from './components/pages/TablesPage';
import { DetailPanel } from './components/DetailPanel';
import { Button } from './components/ui/button';
import { Menu, PanelRight } from 'lucide-react';
import { Sheet, SheetContent } from './components/ui/sheet';

export default function App() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Jobs':
        return <JobsPage />;
      case 'Tables':
        return <TablesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top GNB */}
      <TopGNB />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed left-4 top-20 z-50 bg-card border shadow-sm"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop LNB */}
        <div className="hidden md:block">
          <LeftNavBar 
            currentPage={currentPage}
            onNavigate={setCurrentPage}
          />
        </div>

        {/* Mobile LNB (Sheet) */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <LeftNavBar 
              currentPage={currentPage}
              onNavigate={(page) => {
                setCurrentPage(page);
                setIsMobileSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {renderPage()}

          {/* Detail Panel Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex fixed right-4 top-20 z-40 bg-card border shadow-sm"
            onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
          >
            <PanelRight className="h-5 w-5" />
          </Button>

          {/* Detail Panel */}
          <div className="hidden lg:block">
            <DetailPanel 
              isOpen={isDetailPanelOpen} 
              onClose={() => setIsDetailPanelOpen(false)} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}