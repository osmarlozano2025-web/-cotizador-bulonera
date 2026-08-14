const XLSX = require('xlsx');
const path = require('path');

// Para cada cotizador, mostrar TODAS las columnas de la hoja de precios
const hojas = [
  { file: '../../cotizadores/COTIZADOR_BULONERIA.xls', hoja: 'LISTA DE PRECIOS 2026', headerRow: 5 },
  { file: '../../cotizadores/COTIZADOR_MECHAS.xls',    hoja: 'LISTA DE PRECIOS 2025',  headerRow: 5 },
  { file: '../../cotizadores/COTIZADOR_TOLSEN.xlsm',   hoja: 'TOLSEN',                 headerRow: 6 },
];

for (const { file, hoja, headerRow } of hojas) {
  const wb = XLSX.readFile(path.join(__dirname, file));
  const sheet = wb.Sheets[hoja];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log(`\n=== ${hoja} ===`);
  console.log('Cabeceras completas:');
  const headers = rows[headerRow];
  headers.forEach((h, i) => {
    if (h !== '') console.log(`  col[${i}]: "${h}"`);
  });

  console.log('\nPrimeras 3 filas de datos:');
  for (let r = headerRow + 1; r <= headerRow + 3 && r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    headers.forEach((h, i) => { if (h && row[i] !== '') obj[h] = row[i]; });
    console.log(' ', JSON.stringify(obj));
  }
}
