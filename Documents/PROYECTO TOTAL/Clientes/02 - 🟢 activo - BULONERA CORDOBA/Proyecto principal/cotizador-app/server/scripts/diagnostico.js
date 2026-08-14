const XLSX = require('xlsx');
const path = require('path');

const archivos = [
  { file: '../../cotizadores/COTIZADOR_BULONERIA.xls',  familia: 'buloneria' },
  { file: '../../cotizadores/COTIZADOR_MECHAS.xls',     familia: 'mechas' },
  { file: '../../cotizadores/COTIZADOR_TOLSEN.xlsm',    familia: 'tolsen' },
];

for (const { file, familia } of archivos) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ARCHIVO: ${familia}`);
  const wb = XLSX.readFile(path.join(__dirname, file));

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n  Hoja: "${sheetName}" — ${rows.length} filas`);

    // Mostrar primeras 25 filas que tengan algún contenido
    let mostradas = 0;
    for (let i = 0; i < rows.length && mostradas < 25; i++) {
      const fila = rows[i];
      const contenido = fila.filter(c => c !== '' && c !== null && c !== undefined);
      if (contenido.length === 0) continue;
      const preview = fila.map(c => String(c).slice(0, 20).padEnd(22)).join(' | ').slice(0, 120);
      console.log(`    fila ${String(i+1).padStart(3)}: ${preview}`);
      mostradas++;
    }
  }
}
