import React, { useState, useEffect } from "react";
import { Search, RefreshCw, X, ChevronLeft, ChevronRight, Folder } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { config } from "../../shared/api/config";
import { SummaryGrid } from "../../shared/ui/SummaryGrid";

// --- Types ---
interface Project {
    project_id: string;
    display_name: string;
    description: string;
}

export function ProjectsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialQ = queryParams.get("q") || "";

    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialQ);
    const [pageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Note: Backend currently returns a flat list for projects, so we handle pagination locally.

    const fetchProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const url = `${config.BASE_URL}/lineage-manager/api/v1/projects/`;

            const response = await fetch(url, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Failed to fetch projects");
            const data = await response.json();

            let fetchedProjects: Project[] = [];
            if (Array.isArray(data)) {
                fetchedProjects = data;
            } else if (data && Array.isArray(data.items)) {
                fetchedProjects = data.items;
            }

            setProjects(fetchedProjects);
            filterAndPaginate(fetchedProjects, initialQ, 1);
        } catch (err: any) {
            console.error("Error fetching projects:", err);
            setProjects([]);
            setFilteredProjects([]);
            setTotal(0);
            if (err.name === "AbortError") {
                setError("Failed to get projects (Timeout)");
            } else {
                setError("Failed to get projects");
            }
        } finally {
            setLoading(false);
        }
    };

    const filterAndPaginate = (allProjects: Project[], query: string, page: number) => {
        let filtered = allProjects;
        if (query) {
            const qLower = query.toLowerCase();
            filtered = allProjects.filter(
                (p) =>
                    p.display_name.toLowerCase().includes(qLower) ||
                    p.project_id.toLowerCase().includes(qLower) ||
                    p.description?.toLowerCase().includes(qLower)
            );
        }
        setTotal(filtered.length);
        const offset = (page - 1) * pageSize;
        setFilteredProjects(filtered.slice(offset, offset + pageSize));
    };

    useEffect(() => {
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        filterAndPaginate(projects, searchQuery, currentPage);
    }, [searchQuery, currentPage, projects]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setCurrentPage(1);
        filterAndPaginate(projects, searchQuery, 1);
    };

    // Dummy metrics
    const activeProjectsCount = Math.floor(total * 0.8);
    const dummyMetrics: any[] = [
        {
            type: "total_projects",
            value: total,
            label: "Total Projects",
            status: "success",
        },
        {
            type: "active_projects",
            value: activeProjectsCount,
            label: "Active Projects",
            status: "normal",
        },
        {
            type: "dummy_metric_1",
            value: "N/A",
            label: "Dummy Metrics",
            status: "warning",
        },
        {
            type: "dummy_metric_2",
            value: "N/A",
            label: "Dummy Metrics",
            status: "warning",
        },
    ];

    return (
        <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
                    <p className="text-muted-foreground mt-1 text-sm text-gray-500">
                        View and manage all data projects
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            fetchProjects();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <SummaryGrid cols={4} metrics={dummyMetrics} />

            {/* Projects Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">All Projects</h3>
                        <p className="text-sm text-gray-500">{total} projects found</p>
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Search
                        </button>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCurrentPage(1);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Project Name</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Number of Users</th>
                                <th className="px-6 py-4">Number of Jobs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && projects.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                                            <span className="text-gray-500 font-medium">Loading projects...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-red-500 bg-red-50/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <X className="h-8 w-8" />
                                            <span className="font-medium">{error}</span>
                                            <button
                                                onClick={() => fetchProjects()}
                                                className="mt-2 text-sm text-blue-600 underline"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-gray-400">
                                        No projects matching your search
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.project_id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div
                                                className="flex items-center gap-3 cursor-pointer"
                                                onClick={() => navigate(`/projects/${encodeURIComponent(project.project_id)}`)}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Folder className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {project.display_name || project.project_id}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{project.project_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600">{project.description || "-"}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            - {/* Dummy User Count */}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            - {/* Dummy Job Count */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && !error && total > pageSize && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                        <p className="text-sm text-gray-500">
                            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                            <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{" "}
                            <span className="font-medium">{total}</span> projects
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                disabled={currentPage * pageSize >= total}
                                onClick={() => setCurrentPage((p) => p + 1)}
                                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
