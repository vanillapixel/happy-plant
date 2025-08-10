// copy table as CSV
function tableToCSV() {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.map(r => Array.from(r.querySelectorAll('th,td')).map(cell => '"' + cell.innerText.replace(/\"/g, '""') + '"').join(',')).join('\n');
}
document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(tableToCSV());
        document.getElementById('copyBtn').textContent = 'Copied!';
        setTimeout(() => document.getElementById('copyBtn').textContent = 'Copy table (CSV)', 1500);
    } catch (e) { alert('Unable to copy. You can manually select and copy the table.'); }
});

// save as html file
document.getElementById('saveBtn').addEventListener('click', () => {
    const html = '<!doctype html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plant-needs-quick-reference.html';
    a.click();
    URL.revokeObjectURL(a.href);
});