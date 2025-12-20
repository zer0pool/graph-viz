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
    downloadLineageExcel(data, rootName = "Unknown", metadataCache = {}) {
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

            let html = `<tr><td colspan="9" class="title" style="border:none; font-weight:bold; font-size:14px;">${title}</td></tr>`;
            html += `
                <tr>
                    <th colspan="2" style="background-color:#e2e8f0; text-align:center;">Identity</th>
                    <th colspan="2" style="background-color:#cffafe; text-align:center;">Table Section</th>
                    <th colspan="5" style="background-color:#ffedd5; text-align:center;">Job Section</th>
                </tr>
                <tr>
                    <th>Table Name</th>
                    <th>Depth</th>
                    <th>Storage</th>
                    <th>Write Mode</th>
                    <th>Job ID</th>
                    <th>Owner</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Lifecycle</th>
                </tr>
            `;

            tableItems.forEach(item => {
                const logicalDepth = Math.floor(item.depth / 2);
                let indent = "";
                for (let i = 0; i < logicalDepth; i++) indent += "    ";
                if (logicalDepth > 0) indent += "└ ";

                const displayName = item.id;
                const rowStyle = (item.depth === 0) ? 'style="background-color:#f8fafc;"' : '';

                // Get Enriched Data
                const details = metadataCache[item.id] || {};
                const tInfo = details.table_info || item.properties || {};
                const jInfo = details.job_info || {};

                html += `
                    <tr ${rowStyle}>
                        <td>${indent}${displayName}</td>
                        <td style="text-align:center;">${logicalDepth}</td>
                        <td>${(tInfo.storage_type || "-").toLowerCase()}</td>
                        <td>${(tInfo.write_mode || "-").toLowerCase()}</td>
                        <td>${jInfo.job_id || "-"}</td>
                        <td>${jInfo.owner || tInfo.owner || "-"}</td>
                        <td>${jInfo.cron || "-"}</td>
                        <td>${jInfo.status || "-"}</td>
                        <td>${jInfo.lifecycle_status || "-"}</td>
                    </tr>
                `;
            });

            html += `<tr><td colspan="9" style="border:none;"></td></tr>`; // Spacer
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
