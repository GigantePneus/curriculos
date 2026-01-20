
/**
 * Service to handle Google Sheets integration via export
 */

export const exportToGoogleSheets = async (data: any) => {
    // In a real scenario with backend, we would use Google Sheets API.
    // For this client-side architecture, we can either:
    // 1. Use a Google Apps Script Web App Endpoint (preferred for security/CORS).
    // 2. Download as CSV (simple fallback).

    // Implementation of CSV Download for now as immediate solution
    const headers = ['Nome', 'Cidade', 'Cargo', 'Data', 'Link Arquivo'];
    const row = [
        `"${data.nome}"`,
        `"${data.cidade}"`,
        `"${data.cargo}"`,
        `"${new Date().toISOString()}"`,
        `"${data.arquivo_url || ''}"`
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n" + row.join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `curriculo_${data.nome.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
};
