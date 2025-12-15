/**
 * ExcelExportService
 * 
 * Responsible for generating styled Excel exports from lineage data.
 */

import { LineageTreeUtils } from "../utils/lineageTreeUtils.js";

/**
 * ExcelExportService
 * 
 * Responsible for generating styled Excel exports from lineage data.
 */

export const ExcelExportService = {
    /**
     * Generate and download Excel file from lineage data
     * 
     * @param {Object} data - Full lineage data (upstream/downstream)
     * @param {String} rootName - Name of the root table
     */
    downloadLineageExcel(data, rootName = "Unknown") {
        const dateStr = new Date().toISOString().split('T')[0];

        // Define Styles for Excel (HTML approach)
        const styles = `
            <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; }
                th { border: 1px solid #000; background-color: #f0f0f0; font-weight: bold; padding: 5px; text-align: left; }
                td { border: 1px solid #000; padding: 5px; vertical-align: top; }
                .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                .root-row { background-color: #d9d9d9; font-weight: bold; }
                .note { font-style: italic; color: #555; margin-top: 10px; }
            </style>
        `;

        // Helper to build table HTML
        const buildTableHtml = (title, jobColHeader, items) => {
            if (!items || items.length === 0) return "";

            // Use LineageTreeUtils to get the correct hierarchical order (same as UI)
            // This returns a flat list with 'depth' and 'treePrefix' calculated
            // It automatically filters/processes structure, but let's confirm it includes everything we need.
            const tableItems = LineageTreeUtils.buildFlatTree(items);

            let html = `<tr><td colspan="5" class="title" style="border:none; font-weight:bold; font-size:14px;">${title}</td></tr>`;
            html += `
                <tr>
                    <th>Table Name</th>
                    <th>${jobColHeader}</th>
                    <th>Depth</th>
                    <th>Owner</th>
                    <th>Info</th>
                </tr>
            `;

            tableItems.forEach(item => {
                // Logical depth for Tables (matches UI)
                const logicalDepth = Math.floor(item.depth / 2);

                // Indentation (Excel friendly usage of clean spaces/indent)
                let indent = "";
                for (let i = 0; i < logicalDepth; i++) indent += "    ";
                if (logicalDepth > 0) indent += "└ ";

                let jobName = "-";
                let jobStatus = "-";

                // Look up parent job info (same as UI)
                if (item.parent) {
                    const parentNode = items.find(p => p.id === item.parent || p.name === item.parent);
                    if (parentNode && parentNode.type && parentNode.type.toLowerCase() === "job") {
                        jobName = parentNode.name;
                        const jProps = parentNode.properties || {};
                        jobStatus = jProps.status || jProps.run_status || "unknown";
                    }
                }

                const tProps = item.properties || {};
                const owner = tProps.owner || "-";
                const info = tProps.description || tProps.table_type || "-";

                // Use FULL NAME (item.id)
                const displayName = item.id;

                // Style for Root
                const rowStyle = (item.depth === 0) ? 'style="background-color:#d9d9d9; font-weight:bold;"' : '';

                html += `
                    <tr ${rowStyle}>
                        <td>${indent}${displayName}</td>
                        <td>${jobName} (${jobStatus})</td>
                        <td>${logicalDepth}</td>
                        <td>${owner}</td>
                        <td>${info}</td>
                    </tr>
                `;
            });

            html += `<tr><td colspan="5" style="border:none;"></td></tr>`; // Spacer
            return html;
        };

        let bodyContent = "<table>";

        // Upstream
        if (data.upstream && data.upstream.length > 0) {
            bodyContent += buildTableHtml(`Table 1. Upstream Lineage for ${rootName}`, "Created By Job", data.upstream);
        }

        // Downstream
        if (data.downstream && data.downstream.length > 0) {
            bodyContent += buildTableHtml(`Table 2. Downstream Lineage for ${rootName}`, "Used By Job", data.downstream);
        }

        bodyContent += `
            <tr>
                <td colspan="5" style="border:none; font-style:italic;">
                    Note. Lineage Information from analysis. Created at ${dateStr}.
                </td>
            </tr>
        `;
        bodyContent += "</table>";

        const fullHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                <x:Name>Lineage Report</x:Name>
                <x:WorksheetOptions>
                <x:DisplayGridlines/>
                </x:WorksheetOptions>
                </x:ExcelWorksheet>
                </x:ExcelWorksheets>
                </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                ${styles}
            </head>
            <body>
                ${bodyContent}
            </body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `lineage_export_${rootName}_${Date.now()}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
