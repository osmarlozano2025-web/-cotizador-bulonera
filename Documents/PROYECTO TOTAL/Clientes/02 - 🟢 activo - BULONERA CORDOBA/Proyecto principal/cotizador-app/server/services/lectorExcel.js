const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function redondear(n) {
  const num = parseFloat(n);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

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

function leerBuloneria(archivoPath) {
  const wb = XLSX.readFile(archivoPath);
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

function leerMechas(archivoPath) {
  const wb = XLSX.readFile(archivoPath);
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

function leerTolsen(archivoPath) {
  const wb = XLSX.readFile(archivoPath);
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

function importarTodo() {
  const cotizadoresDir = path.join(__dirname, '../../cotizadores');
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const tareas = [
    { archivo: 'COTIZADOR_BULONERIA.xls', fn: leerBuloneria, salida: 'buloneria.json' },
    { archivo: 'COTIZADOR_MECHAS.xls',    fn: leerMechas,    salida: 'mechas.json' },
    { archivo: 'COTIZADOR_TOLSEN.xlsm',   fn: leerTolsen,    salida: 'tolsen.json' },
  ];

  for (const { archivo, fn, salida } of tareas) {
    const filePath = path.join(cotizadoresDir, archivo);
    if (!fs.existsSync(filePath)) { console.log(`⚠️  No encontrado: ${archivo}`); continue; }
    try {
      const productos = fn(filePath);
      fs.writeFileSync(path.join(dataDir, salida), JSON.stringify(productos, null, 2));
      console.log(`✅ ${salida}: ${productos.length} productos`);
    } catch (e) {
      console.error(`❌ Error en ${archivo}: ${e.message}`);
    }
  }
}

module.exports = { importarTodo, leerBuloneria, leerMechas, leerTolsen };

if (require.main === module) importarTodo();
