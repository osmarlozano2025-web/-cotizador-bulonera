const fs = require('fs');
const path = require('path');

const tipos = [
  { codigo: 'A', nombre: 'Minorista',    porcentaje: 5  },
  { codigo: 'B', nombre: 'Mayorista',    porcentaje: 10 },
  { codigo: 'C', nombre: 'Distribuidor', porcentaje: 15 },
  { codigo: 'D', nombre: 'Especial',     porcentaje: 20 },
];

const empresas = [
  // Tipo A – Minorista (5%) — 13 empresas
  { nombre: 'Ferretería El Tornillo',        razonSocial: 'García Juan Carlos',           cuit: '20-18234567-9', telefono: '351 423-1122', email: 'garcia@eltornillo.com.ar',    localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'A' },
  { nombre: 'Casa del Constructor',          razonSocial: 'Rodríguez Hnos. S.C.',         cuit: '30-61234501-2', telefono: '341 452-8800', email: 'ventas@casaconstr.com.ar',    localidad: 'Rosario',           provincia: 'Santa Fe',     tipo: 'A' },
  { nombre: 'Ferretería Rivadavia',          razonSocial: 'López Norberto',               cuit: '20-22345678-3', telefono: '261 430-0011', email: 'nlopez@rivadavia.com.ar',     localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'A' },
  { nombre: 'El Perno de Oro',               razonSocial: 'Martínez Pedro Alberto',       cuit: '20-25678901-5', telefono: '387 422-7788', email: 'ventas@pernodeoro.com.ar',    localidad: 'Salta Capital',     provincia: 'Salta',        tipo: 'A' },
  { nombre: 'Ferretería San Martín',         razonSocial: 'Gómez Luis María',             cuit: '20-27890123-7', telefono: '353 456-3311', email: 'ferre.sanmartin@gmail.com',   localidad: 'Villa María',       provincia: 'Córdoba',      tipo: 'A' },
  { nombre: 'Hierros y Materiales Don Pepe', razonSocial: 'Fernández José',               cuit: '20-19012345-1', telefono: '299 442-5566', email: 'donpepe@hierros.com.ar',      localidad: 'Neuquén Capital',   provincia: 'Neuquén',      tipo: 'A' },
  { nombre: 'Ferretería El Clavo',           razonSocial: 'Suárez Roberto Daniel',        cuit: '20-31234567-8', telefono: '351 451-9900', email: 'elclavo@gmail.com',           localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'A' },
  { nombre: 'Materiales Chascomús',          razonSocial: 'Álvarez Héctor',               cuit: '20-14567890-4', telefono: '2241 42-1100', email: 'materiales@chasco.com.ar',    localidad: 'Chascomús',         provincia: 'Buenos Aires', tipo: 'A' },
  { nombre: 'Ferretería El Galpón',          razonSocial: 'Torres Mirta Susana',          cuit: '27-28901234-6', telefono: '376 442-0033', email: 'elgalpon@ferreteria.com.ar',  localidad: 'Posadas',           provincia: 'Misiones',     tipo: 'A' },
  { nombre: 'Herramientas Barrientos',       razonSocial: 'Barrientos Claudio',           cuit: '20-23456789-0', telefono: '221 452-7744', email: 'barrien@herram.com.ar',       localidad: 'La Plata',          provincia: 'Buenos Aires', tipo: 'A' },
  { nombre: 'Ferretería La Unión',           razonSocial: 'Morales Graciela',             cuit: '27-17890123-5', telefono: '388 422-6655', email: 'launion@ferreteria.com.ar',   localidad: 'San Salvador de Jujuy', provincia: 'Jujuy',    tipo: 'A' },
  { nombre: 'Construcciones Norte S.R.L.',   razonSocial: 'Construcciones Norte S.R.L.',  cuit: '30-70123456-3', telefono: '362 431-5577', email: 'norte@construcciones.com.ar', localidad: 'Resistencia',       provincia: 'Chaco',        tipo: 'A' },
  { nombre: 'Ferretería Mitre',              razonSocial: 'Pereyra Daniel Osvaldo',       cuit: '20-29012345-2', telefono: '266 442-1100', email: 'ferremitre@hotmail.com',      localidad: 'San Luis Capital',  provincia: 'San Luis',     tipo: 'A' },

  // Tipo B – Mayorista (10%) — 12 empresas
  { nombre: 'Bulonera del Centro S.R.L.',    razonSocial: 'Bulonera del Centro S.R.L.',   cuit: '30-62345678-4', telefono: '351 461-0022', email: 'ventas@buloneradelcentro.com.ar', localidad: 'Córdoba Capital', provincia: 'Córdoba',   tipo: 'B' },
  { nombre: 'Distribuidora Metálica S.A.',   razonSocial: 'Distribuidora Metálica S.A.',  cuit: '30-59123456-7', telefono: '11 4522-8800', email: 'ventas@distmetalica.com.ar',  localidad: 'CABA',              provincia: 'CABA',         tipo: 'B' },
  { nombre: 'Ferrimax S.A.',                 razonSocial: 'Ferrimax S.A.',                cuit: '30-71234567-1', telefono: '351 471-3344', email: 'info@ferrimax.com.ar',         localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'B' },
  { nombre: 'FIMAQ S.R.L.',                  razonSocial: 'FIMAQ S.R.L.',                 cuit: '30-68901234-9', telefono: '261 421-6677', email: 'fimaq@fimaq.com.ar',           localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'B' },
  { nombre: 'Bulonería Bevilacqua',          razonSocial: 'Bevilacqua Hnos. S.R.L.',      cuit: '30-60234567-5', telefono: '261 431-9900', email: 'ventas@bevilacqua.com.ar',    localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'B' },
  { nombre: 'Aceros del Sur S.A.',           razonSocial: 'Aceros del Sur S.A.',          cuit: '30-64123456-2', telefono: '341 412-5544', email: 'acerosdelsur@gmail.com',      localidad: 'Rosario',           provincia: 'Santa Fe',     tipo: 'B' },
  { nombre: 'Distribuidora Rovi',            razonSocial: 'Bulonera Rovi S.C.',           cuit: '30-69012345-6', telefono: '351 441-2211', email: 'rovi@bulonera.com.ar',        localidad: 'Villa Carlos Paz',  provincia: 'Córdoba',      tipo: 'B' },
  { nombre: 'Herrajes y Bulones Agostinelli',razonSocial: 'Agostinelli S.A.',             cuit: '30-55678901-8', telefono: '341 432-8877', email: 'agostinelli@herrajes.com.ar', localidad: 'Rosario',           provincia: 'Santa Fe',     tipo: 'B' },
  { nombre: 'Clabutor S.C.',                 razonSocial: 'Clabutor S.C.',                cuit: '30-63456789-0', telefono: '351 451-4433', email: 'clabutor@clabutor.com.ar',    localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'B' },
  { nombre: 'Ferretería Industrial del NOA', razonSocial: 'NOA Fer S.R.L.',              cuit: '30-72345678-4', telefono: '387 431-7766', email: 'ferrenoa@gmail.com',          localidad: 'Salta Capital',     provincia: 'Salta',        tipo: 'B' },
  { nombre: 'Hierros Patagónica S.A.',       razonSocial: 'Hierros Patagónica S.A.',      cuit: '30-65234567-3', telefono: '297 422-5544', email: 'patagonica@hierros.com.ar',   localidad: 'Comodoro Rivadavia',provincia: 'Chubut',       tipo: 'B' },
  { nombre: 'Ferretería y Herramientas JJ',  razonSocial: 'Jaikin Hebe Nora',            cuit: '27-16789012-4', telefono: '341 443-3322', email: 'jaikin@jj-ferreteria.com.ar', localidad: 'Rosario',           provincia: 'Santa Fe',     tipo: 'B' },

  // Tipo C – Distribuidor (15%) — 13 empresas
  { nombre: 'Bulonería La Plata S.A.',       razonSocial: 'Bulonería La Plata S.A.',      cuit: '30-66345678-7', telefono: '221 461-9988', email: 'laplata@buloneria.com.ar',    localidad: 'La Plata',          provincia: 'Buenos Aires', tipo: 'C' },
  { nombre: 'La Casa del Bulón S.J.',        razonSocial: 'La Casa del Bulón S.J.',       cuit: '30-67456789-1', telefono: '264 422-7766', email: 'lacasa@bulon.com.ar',         localidad: 'San Juan Capital',  provincia: 'San Juan',     tipo: 'C' },
  { nombre: 'FER-PET S.R.L.',               razonSocial: 'FER-PET S.R.L.',               cuit: '30-70234567-8', telefono: '261 412-4455', email: 'ferpet@ferpet.com.ar',        localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'C' },
  { nombre: 'Piro S.A.',                     razonSocial: 'Piro S.A.',                    cuit: '30-61345678-6', telefono: '351 421-3300', email: 'piro@pirosa.com.ar',           localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'C' },
  { nombre: 'Distribuidora Wacker',          razonSocial: 'Wacker Osvaldo Roberto',       cuit: '20-20123456-8', telefono: '341 462-0011', email: 'wacker@distribuidora.com.ar', localidad: 'Rosario',           provincia: 'Santa Fe',     tipo: 'C' },
  { nombre: 'Bulones y Ferretería Cuyana',   razonSocial: 'Cuyana Fer S.A.',              cuit: '30-73456789-5', telefono: '261 401-8866', email: 'cuyana@bulonesferre.com.ar',  localidad: 'San Rafael',        provincia: 'Mendoza',      tipo: 'C' },
  { nombre: 'Guidarelli y Guidarelli',       razonSocial: 'Guidarelli y Guidarelli S.R.L.',cuit: '30-74567890-9', telefono: '261 441-5544', email: 'guidarelli@ferreteria.com.ar',localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'C' },
  { nombre: 'Distribuidora Córdoba Center',  razonSocial: 'CBA Center S.A.',              cuit: '30-75678901-3', telefono: '351 491-7722', email: 'cbacenter@distribuidora.com.ar',localidad: 'Córdoba Capital', provincia: 'Córdoba',      tipo: 'C' },
  { nombre: 'Mas Sirerol e Hijos',           razonSocial: 'Mas Sirerol Rodolfo e Hijos',  cuit: '30-76789012-7', telefono: '264 431-6655', email: 'massirerol@ferreteria.com.ar',localidad: 'San Juan Capital',  provincia: 'San Juan',     tipo: 'C' },
  { nombre: 'SUR ARGENTINO Bulones',         razonSocial: 'Sur Argentino S.R.L.',         cuit: '30-77890123-1', telefono: '2954 42-3344', email: 'surargentino@bulones.com.ar', localidad: 'Santa Rosa',        provincia: 'La Pampa',     tipo: 'C' },
  { nombre: 'Piriz y Cía. San Juan',         razonSocial: 'Piriz y Cía. S.R.L.',          cuit: '30-78901234-5', telefono: '264 451-2211', email: 'piriz@pirizcia.com.ar',        localidad: 'San Juan Capital',  provincia: 'San Juan',     tipo: 'C' },
  { nombre: 'Tosi María Distribuciones',     razonSocial: 'Tosi María Mercedes',          cuit: '27-32109876-3', telefono: '261 412-9900', email: 'tosi@distribuciones.com.ar',  localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'C' },
  { nombre: 'Bulonería Cuyo Norte',          razonSocial: 'Cuyo Norte S.A.',              cuit: '30-79012345-9', telefono: '388 441-4433', email: 'cuyonorte@buloneria.com.ar',  localidad: 'San Salvador de Jujuy', provincia: 'Jujuy',    tipo: 'C' },

  // Tipo D – Especial (20%) — 12 empresas
  { nombre: 'Bulonera del Oeste S.A.',       razonSocial: 'Bulonera del Oeste S.A.',      cuit: '30-58901234-0', telefono: '261 401-0099', email: 'buenosaires@bulonera.com.ar', localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'D' },
  { nombre: 'Borasio Leonardo & Asoc.',      razonSocial: 'Borasio Leonardo Oscar',       cuit: '20-26789012-9', telefono: '2954 43-7788', email: 'borasio@asoc.com.ar',         localidad: 'Santa Rosa',        provincia: 'La Pampa',     tipo: 'D' },
  { nombre: 'Bulonería Rosario S.A.',        razonSocial: 'Bulonería y Ferretería Rosario S.A.', cuit: '30-57890123-4', telefono: '341 401-2233', email: 'rosario@buloneria.com.ar', localidad: 'Rosario', provincia: 'Santa Fe',     tipo: 'D' },
  { nombre: 'Rengipo & Cía.',                razonSocial: 'Rengipo Ruben Ceferino',       cuit: '20-21234567-6', telefono: '261 421-8877', email: 'rengipo@cia.com.ar',          localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'D' },
  { nombre: 'Davi Hermanos S.R.L.',          razonSocial: 'Davi Hnos. S.R.L.',            cuit: '30-56789012-8', telefono: '261 491-6655', email: 'davi@davihnos.com.ar',        localidad: 'Mendoza Capital',   provincia: 'Mendoza',      tipo: 'D' },
  { nombre: 'Pereira Lucio & Nelva',         razonSocial: 'Pereira Lucio y Nelva S.R.L.', cuit: '30-54678901-5', telefono: '358 441-4422', email: 'pereira@lyrn.com.ar',         localidad: 'Río Cuarto',        provincia: 'Córdoba',      tipo: 'D' },
  { nombre: 'Industrial Jujuy Fer S.A.',     razonSocial: 'Industrial Jujuy Fer S.A.',    cuit: '30-80123456-6', telefono: '388 421-3311', email: 'jujuyfer@industrial.com.ar',  localidad: 'San Salvador de Jujuy', provincia: 'Jujuy',    tipo: 'D' },
  { nombre: 'Meyneil S.R.L.',                razonSocial: 'Meyneil S.R.L.',               cuit: '30-81234567-0', telefono: '264 411-2200', email: 'meyneil@meyneil.com.ar',      localidad: 'San Juan Capital',  provincia: 'San Juan',     tipo: 'D' },
  { nombre: 'Rodríguez Ros Bulones',         razonSocial: 'Rodríguez Ros Gerard',         cuit: '20-33210987-7', telefono: '264 461-5566', email: 'rrbulones@gmail.com',         localidad: 'San Juan Capital',  provincia: 'San Juan',     tipo: 'D' },
  { nombre: 'Ferretería Córdoba Express',    razonSocial: 'CBA Express S.R.L.',           cuit: '30-82345678-4', telefono: '351 501-8899', email: 'express@ferretera.com.ar',    localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'D' },
  { nombre: 'Corvalan Centanaro S.R.L.',     razonSocial: 'Corvalan Centanaro Luis',      cuit: '20-24567890-2', telefono: '351 441-7711', email: 'corvalan@centanaro.com.ar',   localidad: 'Córdoba Capital',   provincia: 'Córdoba',      tipo: 'D' },
  { nombre: 'Bulones y Herr. Patagonia',     razonSocial: 'Patagonia Bulones S.A.',       cuit: '30-83456789-8', telefono: '297 401-4433', email: 'patagonia@bulones.com.ar',    localidad: 'Comodoro Rivadavia',provincia: 'Chubut',       tipo: 'D' },
];

const tipoMap = { A: 5, B: 10, C: 15, D: 20 };

const clientes = empresas.map((e, i) => ({
  id: String(1000 + i),
  nombre: e.nombre,
  razonSocial: e.razonSocial,
  cuit: e.cuit,
  telefono: e.telefono,
  email: e.email,
  localidad: e.localidad,
  provincia: e.provincia,
  tipoDescuento: e.tipo,
  descuento: tipoMap[e.tipo],
}));

const salida = path.join(__dirname, '../data/clientes.json');
fs.writeFileSync(salida, JSON.stringify(clientes, null, 2));
console.log(`✅ ${clientes.length} clientes generados → clientes.json`);
clientes.forEach(c => console.log(`  [Tipo ${c.tipoDescuento} ${c.descuento}%] ${c.nombre} — ${c.localidad}`));
