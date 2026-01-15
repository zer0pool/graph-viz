import { useNavigate } from "react-router-dom";
import { config } from "../config";
import { SearchBox } from "../components/SearchBox";
import { UserMenu } from "../components/UserMenu";
import "../styles/layout/Navbar.css";

export const Navbar: React.FC<{
  onSelectGraphNode: (node: any) => void;
}> = ({ onSelectGraphNode }) => {
  const navigate = useNavigate();

  const handleSelectSuggestion = (suggestion: any) => {
    // Navigate to lineage page
    onSelectGraphNode({ type: suggestion.type, id: suggestion.id });
    navigate("/lineage");
  };

  return (
    <div id="navbar">
      {/* Logo & Brand */}
      <a href={config.BASE_URL || "/"} className="nav-brand">
        <img
          src={`${config.BASE_URL}/images/logo.png`}
          alt="Pipeline Ops Console"
          className="nav-logo"
        />
      </a>

      {/* Search Bar - Extracted */}
      <SearchBox onSelectSuggestion={handleSelectSuggestion} />

      {/* User Controls - Extracted */}
      <UserMenu />
    </div>
  );
};
