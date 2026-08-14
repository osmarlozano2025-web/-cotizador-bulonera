const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function redondear(n) {
  const num = parseFloat(n);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

// Lee una hoja usando header:1 y convierte a objetos con los nombres de columna correctos
function leerHoja(wb, sheetName, headerRowIndex) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Hoja "${sheetName}" no encontrada`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = rows[headerRowIndex].map(h => String(h).trim());
  return rows.slice(headerRowIndex + 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
    return obj;
  });
}

function leerBuloneria() {
  const wb = XLSX.readFile(path.join(__dirname, '../../cotizadores/COTIZADOR_BULONERIA.xls'));
  // "LISTA DE PRECIOS 2026": cabecera en fila 6 (índice 5)
  return leerHoja(wb, 'LISTA DE PRECIOS 2026', 5)
    .filter(r => r['CODIGO INTERNO'] && r['PRODUCTO'])
    .map(r => ({
      codigo:         String(r['CODIGO INTERNO']).trim(),
      descripcion:    String(r['PRODUCTO']).trim(),
      medida:         String(r['DESCRIPCION ADICIONAL']).trim(),
      marca:          String(r['MARCA'] || 'CORDOBABULONES').trim(),
      familia:        'buloneria',
      unidadGranel:   Number(r['UNIDAD CAJA GRANEL']) || 0,
      unidadFraccion: Number(r['UNIDAD CAJA FRACCION']) || 0,
      precioLista:    redondear(r['PRECIO DE LISTA UNITARIO']),
      precioGranel:   redondear(r['PRECIO DE LISTA NETO UNITARIO']),
    }));
}

function leerMechas() {
  const wb = XLSX.readFile(path.join(__dirname, '../../cotizadores/COTIZADOR_MECHAS.xls'));
  // "LISTA DE PRECIOS 2025": cabecera en fila 6 (índice 5)
  return leerHoja(wb, 'LISTA DE PRECIOS 2025', 5)
    .filter(r => r['CODIGO INTERNO'] && r['PRODUCTO'])
    .map(r => ({
      codigo:         String(r['CODIGO INTERNO']).trim(),
      descripcion:    String(r['PRODUCTO']).trim(),
      medida:         String(r['DESCRIPCION ADICIONAL']).trim(),
      marca:          String(r['MARCA'] || 'PANTTHOR').trim(),
      familia:        'mechas',
      unidadGranel:   Number(r['GRANEL']) || 0,
      unidadFraccion: Number(r['FRACCION']) || 0,
      precioLista:    redondear(r['PRECIO DE LISTA UNITARIO']),
      precioGranel:   redondear(r['PRECIO DE LISTA NETO UNITARIO']),
    }));
}

function leerTolsen() {
  const wb = XLSX.readFile(path.join(__dirname, '../../cotizadores/COTIZADOR_TOLSEN.xlsm'));
  // "TOLSEN": cabecera en fila 7 (índice 6)
  return leerHoja(wb, 'TOLSEN', 6)
    .filter(r => r['COD'] && r['PRODUCTO'])
    .map(r => ({
      codigo:         String(r['COD']).trim(),
      descripcion:    String(r['PRODUCTO']).trim(),
      medida:         String(r['DESCRIPCION ADICIONAL']).trim(),
      marca:          'TOLSEN',
      familia:        'tolsen',
      subfamilia:     String(r['FAMILIA']).trim(),
      unidadGranel:   Number(r['Caja Granel (COINCIDE CON CATALOGO)']) || 0,
      unidadFraccion: Number(r['Caja Chica (A VERIFICAR CON DEPOSITO)']) || 0,
      precioLista:    redondear(r['$']),
      precioGranel:   redondear(r['$']),
      stock:          Number(r['STOCK']) || 0,
    }));
}

// --- MAIN ---
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const buloneria = leerBuloneria();
const mechas    = leerMechas();
const tolsen    = leerTolsen();

console.log(`Buloneria: ${buloneria.length} productos | precioGranel muestra: $${buloneria[0]?.precioGranel}`);
console.log(`Mechas:    ${mechas.length} productos | precioGranel muestra: $${mechas[0]?.precioGranel}`);
console.log(`Tolsen:    ${tolsen.length} productos | precioGranel muestra: $${tolsen[0]?.precioGranel}`);

fs.writeFileSync(path.join(dataDir, 'buloneria.json'), JSON.stringify(buloneria, null, 2));
fs.writeFileSync(path.join(dataDir, 'mechas.json'),    JSON.stringify(mechas, null, 2));
fs.writeFileSync(path.join(dataDir, 'tolsen.json'),    JSON.stringify(tolsen, null, 2));

const muestra = [
  ...buloneria.slice(0, 100),
  ...mechas.slice(0, 100),
  ...tolsen.slice(0, 100),
];

fs.writeFileSync(
  path.join(dataDir, 'catalogo_muestra.json'),
  JSON.stringify(muestra, null, 2)
);

console.log(`\n✅ catalogo_muestra.json — ${muestra.length} productos (100 por familia)`);
