import * as XLSX from 'xlsx'

export function exportarExcel(pedido, cliente) {
  const wb = XLSX.utils.book_new()
  const descuento = cliente?.descuento || 0

  const familias = pedido.items.reduce((acc, item) => {
    const fam = item.familia || 'general'
    if (!acc[fam]) acc[fam] = []
    acc[fam].push(item)
    return acc
  }, {})

  for (const [familia, items] of Object.entries(familias)) {
    const calcSub = (i) =>
      i.cantidad * (i.precioGranel || i.precio || 0) * (1 - descuento / 100)

    const filas = [
      ['CÓRDOBA BULONES'],
      ['Cotización de Productos'],
      [],
      ['Fecha:',     new Date().toLocaleDateString('es-AR')],
      ['Cliente:',   cliente?.nombre || 'Sin especificar'],
      ['Descuento:', descuento ? `${descuento}%` : '0%'],
      [],
      ['Código', 'Descripción', 'Medida', 'Cantidad', 'Precio Unit.', 'Dto.', 'Subtotal'],
      ...items.map(i => [
        i.codigo || '',
        i.descripcion,
        i.medida || '',
        Number(i.cantidad),
        Number(i.precioGranel || i.precio || 0),
        `${descuento}%`,
        Number(calcSub(i).toFixed(2)),
      ]),
      [],
      ['', '', '', '', '', 'TOTAL',
        Number(items.reduce((s, i) => s + calcSub(i), 0).toFixed(2))],
    ]

    const ws = XLSX.utils.aoa_to_sheet(filas)

    // Anchos de columna
    ws['!cols'] = [{ wch: 12 }, { wch: 46 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 14 }]

    XLSX.utils.book_append_sheet(wb, ws, familia.toUpperCase())
  }

  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `cotizacion_${(cliente?.nombre || 'sin_cliente').replace(/\s+/g, '_')}_${fecha}.xlsx`
  XLSX.writeFile(wb, nombre)
}
