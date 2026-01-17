import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { config } from "../config";
import { SearchBox } from "../components/SearchBox";
import { UserMenu } from "../components/UserMenu";
import "../styles/layout/Navbar.css";

export const Navbar: React.FC<{
  onSelectGraphNode: (node: any) => void;
  onToggleSidebar: () => void;
}> = ({ onSelectGraphNode, onToggleSidebar }) => {
  const navigate = useNavigate();

  const handleSelectSuggestion = (suggestion: any) => {
    // Navigate to lineage page
    onSelectGraphNode({ type: suggestion.type, id: suggestion.id });
    navigate("/lineage");
  };

  return (
    <header className="h-navbar flex items-center justify-between px-[18px] bg-white border-b border-border shadow-sm z-[100] gap-[18px] shrink-0">
      <div className="flex items-center gap-4">
        {/* Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Logo & Brand */}
        <a href="./" className="flex items-center no-underline text-inherit">
          <img
            src="images/logo.png"
            alt="Pipeline Ops Console"
            className="h-9 object-contain"
          />
        </a>
      </div>

      {/* Search Bar - Extracted */}
      <SearchBox onSelectSuggestion={handleSelectSuggestion} />

      {/* User Controls - Extracted */}
      <UserMenu />
    </header>
  );
};
