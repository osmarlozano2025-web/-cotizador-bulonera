-- IVA por producto.
--
-- Casi todo lleva 21%, pero un grupo de artículos tiene 10.5%. Se guarda por
-- producto (no es un dato del pedido) y se congela en el renglón al cotizar,
-- igual que el resto del desglose: si el producto cambia de alícuota después,
-- las proformas viejas siguen mostrando la que tenían el día que se armaron.
--
-- Arranca todo en 21% porque, como dijo el que carga la lista, "el resto es
-- veintiuno". Los que van al 10.5% se marcan aparte cuando llegue esa lista.

ALTER TABLE productos ADD COLUMN ivaPorcentaje DECIMAL(5,2) NOT NULL DEFAULT 21.00;
ALTER TABLE aprobaciones_items ADD COLUMN ivaPorcentaje DECIMAL(5,2) NOT NULL DEFAULT 21.00;
