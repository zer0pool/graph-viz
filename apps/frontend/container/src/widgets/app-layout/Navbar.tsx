import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { config } from "../../shared/api/config";
import { SearchBox } from "../search/GlobalSearch";
import { UserMenu } from "../../features/auth/UserMenu";
import "../../styles/layout/Navbar.css";

export const Navbar: React.FC<{
  onSelectGraphNode: (node: any) => void;
  onToggleSidebar: () => void;
}> = ({ onSelectGraphNode, onToggleSidebar }) => {
  const navigate = useNavigate();

  const handleSelectSuggestion = (suggestion: any) => {
    if (suggestion.type === "table") {
      navigate(`/tables/${encodeURIComponent(suggestion.id)}`);
    } else if (suggestion.type === "job") {
      navigate(`/jobs/${encodeURIComponent(suggestion.id)}`);
    } else if (suggestion.type === "owner") {
      navigate(`/users/${encodeURIComponent(suggestion.id)}`);
    } else {
      // Fallback or other types (navigate to lineage as before if needed)
      onSelectGraphNode({ type: suggestion.type, id: suggestion.id });
      navigate("/lineage");
    }
  };

  const handleSearch = (query: string) => {
    // Navigate to users page with the search query as owner search
    navigate(`/users?q=${encodeURIComponent(query)}`);
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
        <a
          href={`${config.BASE_URL}/`}
          className="flex items-center gap-3 no-underline text-inherit select-none"
        >
          <img
            src={`${config.BASE_URL}/images/control-tower.png`}
            alt="OPS Console"
            className="h-10 w-10 object-contain"
          />
          <span className="font-medium text-lg whitespace-nowrap tracking-tight">OPS Console</span>
        </a>
      </div>

      {/* Search Bar - Extracted */}
      <SearchBox onSelectSuggestion={handleSelectSuggestion} onSearch={handleSearch} />

      {/* User Controls - Extracted */}
      <UserMenu />
    </header>
  );
};
