import { LineageItem, LineageTreeUtils } from "./LineageTreeUtils";

export const ExportUtils = {
  exportToExcel: (
    data: {
      upstream?: LineageItem[];
      downstream?: LineageItem[];
    },
    rootName: string
  ) => {
    const upstream = data.upstream || [];
    const downstream = data.downstream || [];
    if (upstream.length === 0 && downstream.length === 0) return;

    const dateStr = new Date().toISOString().split("T")[0];

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
    const buildTableHtml = (title: string, list: LineageItem[]) => {
      if (!list || list.length === 0) return "";
      const flatList = LineageTreeUtils.buildFlatTree(list);

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

      flatList.forEach((item) => {
        const logicalDepth = Math.floor(item.depth / 2);
        let indent = "";
        for (let i = 0; i < logicalDepth; i++) indent += "    ";
        if (logicalDepth > 0) indent += "└ ";

        const displayName = item.id;
        const rowStyle = item.depth === 0 ? 'style="background-color:#f8fafc;"' : "";

        const props = item.properties || {};
        const job = item.viaJob;
        const jobProps = job?.properties || {};

        html += `
                    <tr ${rowStyle}>
                        <td>${indent}${displayName}</td>
                        <td style="text-align:center;">${logicalDepth}</td>
                        <td>${(props.storage || "-").toLowerCase()}</td>
                        <td>${(props.write_mode || "-").toLowerCase()}</td>
                        <td>${job ? job.name : "-"}</td>
                        <td>${jobProps.owner || props.owner || "-"}</td>
                        <td>${jobProps.schedule || "-"}</td>
                        <td>${jobProps.status || "-"}</td>
                        <td>${props.lifecycle || "-"}</td>
                    </tr>
                `;
      });

      html += `<tr><td colspan="9" style="border:none; height:20px;"></td></tr>`; // Spacer
      return html;
    };

    let bodyContent = "<table>";
    // Section 1: Upstream
    bodyContent += buildTableHtml(`Table 1. Upstream Lineage for ${rootName}`, upstream);

    // Section 2: Downstream
    bodyContent += buildTableHtml(`Table 2. Downstream Lineage for ${rootName}`, downstream);

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
    URL.revokeObjectURL(url);
  },
};
