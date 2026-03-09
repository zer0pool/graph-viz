import React from "react";
import { config } from "../../shared/api/config";
import { BookOpen, Database, ExternalLink } from "lucide-react";

export const ApiDocsPage: React.FC = () => {
    const docs = [
        {
            title: "REST API Documentation",
            description: "Swagger UI for interactive REST API exploration and testing.",
            url: config.REST_API_DOCS_URL,
            icon: <BookOpen className="w-8 h-8 text-blue-500 mb-4" />,
            color: "border-blue-200 hover:border-blue-400 bg-blue-50",
            buttonColor: "bg-blue-600 hover:bg-blue-700",
        },
        {
            title: "GraphQL API Documentation",
            description: "Apollo Studio or GraphiQL for interactive GraphQL querying and mutation testing.",
            url: config.GRAPHQL_API_DOCS_URL,
            icon: <Database className="w-8 h-8 text-purple-500 mb-4" />,
            color: "border-purple-200 hover:border-purple-400 bg-purple-50",
            buttonColor: "bg-purple-600 hover:bg-purple-700",
        },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
                <p className="mt-2 text-gray-600">
                    Access interactive documentation and testing interfaces for the backend services.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {docs.map((doc, index) => (
                    <div
                        key={index}
                        className={`border rounded-2xl p-6 transition-all duration-200 ${doc.color} flex flex-col`}
                    >
                        {doc.icon}
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{doc.title}</h2>
                        <p className="text-gray-600 mb-6 flex-grow">{doc.description}</p>
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center gap-2 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 ${doc.buttonColor}`}
                        >
                            Open Documentation
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};
