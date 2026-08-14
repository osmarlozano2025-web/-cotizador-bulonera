const ExcelJS = require('exceljs');

async function generarExcel(pedido, cliente) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Córdoba Bulones';
  workbook.created = new Date();

  const familias = pedido.items.reduce((acc, item) => {
    const fam = item.familia || 'general';
    if (!acc[fam]) acc[fam] = [];
    acc[fam].push(item);
    return acc;
  }, {});

  for (const [familia, items] of Object.entries(familias)) {
    const sheet = workbook.addWorksheet(familia.toUpperCase());

    // Encabezado
    sheet.mergeCells('A1:G1');
    const h1 = sheet.getCell('A1');
    h1.value = 'CÓRDOBA BULONES';
    h1.font = { bold: true, size: 16 };
    h1.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:G2');
    const h2 = sheet.getCell('A2');
    h2.value = 'Cotización de Productos';
    h2.font = { size: 11, italic: true };
    h2.alignment = { horizontal: 'center' };

    sheet.getCell('A4').value = 'Fecha:';
    sheet.getCell('B4').value = new Date().toLocaleDateString('es-AR');
    sheet.getCell('A5').value = 'Cliente:';
    sheet.getCell('B5').value = cliente?.nombre || 'Sin especificar';
    sheet.getCell('A6').value = 'Descuento:';
    sheet.getCell('B6').value = cliente?.descuento ? `${cliente.descuento}%` : '0%';

    // Cabecera de tabla
    const HEADER_ROW = 8;
    const headers = ['Código', 'Descripción', 'Medida', 'Cantidad', 'Precio Unit.', 'Descuento', 'Subtotal'];
    headers.forEach((h, i) => {
      const cell = sheet.getRow(HEADER_ROW).getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.alignment = { horizontal: 'center' };
    });

    sheet.columns = [
      { width: 14 },
      { width: 46 },
      { width: 12 },
      { width: 11 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
    ];

    const descuento = cliente?.descuento || 0;
    let rowNum = HEADER_ROW + 1;

    for (const item of items) {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = item.codigo || '';
      row.getCell(2).value = item.descripcion;
      row.getCell(3).value = item.medida || '';
      row.getCell(4).value = Number(item.cantidad) || 1;
      row.getCell(5).value = Number(item.precioGranel || item.precio || 0);
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).value = descuento / 100;
      row.getCell(6).numFmt = '0%';
      row.getCell(7).value = { formula: `D${rowNum}*E${rowNum}*(1-F${rowNum})` };
      row.getCell(7).numFmt = '"$"#,##0.00';

      if (rowNum % 2 === 0) {
        for (let c = 1; c <= 7; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF3FF' } };
        }
      }
      rowNum++;
    }

    // Fila total
    const totalRow = rowNum + 1;
    sheet.mergeCells(`A${totalRow}:F${totalRow}`);
    const totalLabel = sheet.getCell(`A${totalRow}`);
    totalLabel.value = 'TOTAL';
    totalLabel.font = { bold: true };
    totalLabel.alignment = { horizontal: 'right' };
    const totalCell = sheet.getCell(`G${totalRow}`);
    totalCell.value = { formula: `SUM(G${HEADER_ROW + 1}:G${rowNum - 1})` };
    totalCell.numFmt = '"$"#,##0.00';
    totalCell.font = { bold: true };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { generarExcel };
