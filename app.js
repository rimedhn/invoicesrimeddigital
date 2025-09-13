// URLs Opensheet por hoja
const URL_ARTICULOS = "https://opensheet.elk.sh/1IAD2MyZz8DMvVJlsQq4AgNRIUGhdqwPHVJolVYDVOH4/Articulos";
const URL_CLIENTES = "https://opensheet.elk.sh/1CddpnxmFgUUY-dM57Mw0TkUAJLpRdZJwtJVzn-Gc-Pw/Clientes";
const URL_FACTURA = "https://opensheet.elk.sh/1q9z92BMUAxjsiO5AnACeur6wJhVpfIUkqT62erIUUOA/Factura";
const URL_VENTAS = "https://opensheet.elk.sh/1q9z92BMUAxjsiO5AnACeur6wJhVpfIUkqT62erIUUOA/Ventas";

// Estado de carrito, cliente y venta
let carrito = [];
let clienteSeleccionado = null;
let ventaID = null;
let prefijoFactura = "";
let numeroFactura = "";
let datosFactura = {};

function fetchJSON(url) {
  return fetch(url).then(r => r.json());
}

// 1. Buscar productos
document.getElementById('search-product').addEventListener('input', async (e) => {
  const term = e.target.value.trim().toLowerCase();
  const productos = await fetchJSON(URL_ARTICULOS);
  const resultados = productos.filter(p =>
    (p.Descripcion && p.Descripcion.toLowerCase().includes(term)) ||
    (p["Codigo Barra"] && p["Codigo Barra"].toLowerCase().includes(term))
  );
  mostrarProductos(resultados);
});

// 2. Mostrar productos con input de cantidad
function mostrarProductos(productos) {
  const container = document.getElementById('products-list');
  container.innerHTML = '';
  productos.forEach(prod => {
    const div = document.createElement('div');
    div.innerHTML = `
      <b>${prod.Descripcion}</b> (Código: ${prod.Codigo})<br>
      <img src="${prod.Imagen}" alt="${prod.Descripcion}" width="50" />
      <span>Precio: L ${prod["Precio Und"]}</span>
      <input type="number" min="1" value="1" id="cantidad-${prod.Codigo}" style="width:50px;" />
      <button onclick="agregarAlCarrito('${prod.Codigo}')">Agregar</button>
    `;
    container.appendChild(div);
  });
}

// 3. Agregar producto al carrito
window.agregarAlCarrito = function(codigo) {
  fetchJSON(URL_ARTICULOS).then(productos => {
    const prod = productos.find(p => p.Codigo === codigo);
    if (!prod) return;
    const cantidad = parseInt(document.getElementById(`cantidad-${codigo}`).value) || 1;
    // Si ya existe, suma cantidad
    let item = carrito.find(i => i.Codigo === codigo);
    if (item) item.Cantidad += cantidad;
    else carrito.push({...prod, Cantidad: cantidad});
    renderCarrito();
  });
}

function renderCarrito() {
  const cartDiv = document.getElementById('cart');
  cartDiv.innerHTML = '';
  carrito.forEach((item, idx) => {
    cartDiv.innerHTML += `
      <div>
        ${item.Descripcion} x ${item.Cantidad} - L ${item["Precio Und"]} = <b>L ${(item.Cantidad * item["Precio Und"]).toFixed(2)}</b>
        <button onclick="quitarDelCarrito(${idx})">Quitar</button>
      </div>
    `;
  });
}

// 4. Quitar item
window.quitarDelCarrito = function(idx) {
  carrito.splice(idx, 1);
  renderCarrito();
}

// 5. Buscar clientes
document.getElementById('search-client').addEventListener('input', async (e) => {
  const term = e.target.value.trim().toLowerCase();
  const clientes = await fetchJSON(URL_CLIENTES);
  const resultados = clientes.filter(c =>
    (c.Nombre && c.Nombre.toLowerCase().includes(term)) ||
    (c.Telefono && c.Telefono.toLowerCase().includes(term)) ||
    (c.RTN && c.RTN.toLowerCase().includes(term))
  );
  mostrarClientes(resultados);
});

function mostrarClientes(clientes) {
  const container = document.getElementById('clients-list');
  container.innerHTML = '';
  clientes.forEach(cli => {
    const div = document.createElement('div');
    div.innerHTML = `
      <b>${cli.Nombre}</b> (Tel: ${cli.Telefono}, RTN: ${cli.RTN})
      <button onclick="seleccionarCliente('${cli.Codigo}')">Seleccionar</button>
    `;
    container.appendChild(div);
  });
}

// 6. Seleccionar cliente
window.seleccionarCliente = function(codigo) {
  fetchJSON(URL_CLIENTES).then(clientes => {
    clienteSeleccionado = clientes.find(c => c.Codigo === codigo);
    document.getElementById('clients-list').innerHTML = `<b>Cliente Seleccionado:</b> ${clienteSeleccionado.Nombre}`;
  });
}

// 7. Agregar nuevo cliente
document.getElementById('add-client').onclick = () => {
  document.getElementById('new-client-form').style.display = 'block';
};

document.getElementById('save-new-client').onclick = async () => {
  const nombre = document.getElementById('new-client-nombre').value;
  const telefono = document.getElementById('new-client-telefono').value;
  const idUnico = generarIdUnico();
  // Envío a Apps Script (implementa endpoint en backend.gs)
  await fetch('https://script.google.com/macros/s/AKfycbwZ3jfUvN1zYwGpCnnOEtltrlhNN3tcxebm3Nv9J3-Y_AtCsQ_3RNMzn4KhsQ6y3hAo/exec', {
    method: 'POST',
    body: JSON.stringify({
      Codigo: idUnico,
      Nombre: nombre,
      Telefono: telefono,
      FechaCreacion: obtenerFechaActual(),
      Usuario: 'Usuario',
      Estatus: 'Estatus',
      Direccion: 'Direccion',
      Categoria: 'Categoria',
      Ruta: 'Ruta',
      RTN: 'RTN',
      TipoCliente: 'Tipo cliente',
      DiasCredito: 'Dias de credito',
      LimiteCredito: 'Limite de credito',
      Email: 'Email'
    })
  });
  clienteSeleccionado = {Codigo: idUnico, Nombre: nombre, Telefono: telefono};
  document.getElementById('new-client-form').style.display = 'none';
  document.getElementById('clients-list').innerHTML = `<b>Cliente Seleccionado:</b> ${clienteSeleccionado.Nombre}`;
}

// 8. Confirmar venta
document.getElementById('confirm-sale').onclick = async () => {
  const caja = document.getElementById('caja').value;
  const idVenta = generarIdUnico();
  // Consulta datos factura para caja
  const facturas = await fetchJSON(URL_FACTURA);
  const datosCaja = facturas.find(f => f.Caja === caja) || {};
  prefijoFactura = (datosCaja.prefijo || "000-000-00-");
  // Consulta ventas para obtener último correlativo
  const ventas = await fetchJSON(URL_VENTAS);
  const ventasCaja = ventas.filter(v => v.Caja === caja && v.CAI === datosCaja.CAI);
  let ultimoFact = Math.max(...ventasCaja.map(v => parseInt((v.Factura || "").split('-').pop())), 0);
  numeroFactura = prefijoFactura + padFactura(ultimoFact + 1);
  // Venta principal
  const venta = {
    Fecha: obtenerFechaActual(),
    NoVenta: idVenta,
    Vendedor: 'Vendedor',
    Cliente: clienteSeleccionado ? clienteSeleccionado.Codigo : 'Cliente',
    FormaPago: 'Forma de pago',
    Estado: 'Estado',
    Abono: 'Abono',
    EfectivoRecibido: 'Efectivo recibido',
    FechaHora: obtenerFechaHoraActual(),
    Tipo: 'Tipo',
    Observacion: 'Observacion',
    Ticket: 'Ticket',
    Hora: obtenerHoraActual(),
    Comisionista: 'Comisionista',
    Pagada: 'Pagada',
    Folio1: 'Folio 1',
    Folio2: 'Folio 2',
    Factura: numeroFactura,
    CAI: datosCaja.CAI || '',
    Vencimiento: datosCaja.Vencimiento || '',
    RangoInicial: datosCaja.CorrelativoInicial || '',
    RangoFinal: datosCaja.CorrelativoFinal || '',
    Ruta: clienteSeleccionado ? clienteSeleccionado.Ruta : '',
    RTN: clienteSeleccionado ? clienteSeleccionado.RTN : '',
    Estatus: 'Estatus',
    Fact: 'Fact',
    BoletaEntrega: 'Boleta de entrega',
    MedioPago: 'Medio de pago',
    Impuesto: 'Impuesto',
    NoOCExt: 'No. O.C Ext.',
    NoRegExon: 'No. Reg. Exon.',
    NoRegSAG: 'No. Reg. SAG.',
    Sucursal: 'Sucursal',
    Caja: caja,
    DescuentoPorc: 'Descuento %',
    Documento: 'Documento',
    Tasa: 'Tasa',
    Plazo: 'Plazo',
    TipoInteres: 'Tipo interes',
    Firma: 'Firma',
    ContadorCuota: 'ContadorCuota',
    cajacai: caja // Nuevo campo
  };
  // Enviar venta
  await fetch('https://script.google.com/macros/s/AKfycbwZ3jfUvN1zYwGpCnnOEtltrlhNN3tcxebm3Nv9J3-Y_AtCsQ_3RNMzn4KhsQ6y3hAo/exec', {
    method: 'POST',
    body: JSON.stringify(venta)
  });
  // Detalle
  for (let i = 0; i < carrito.length; i++) {
    const detalle = {
      NoVenta: idVenta,
      Producto: carrito[i].Codigo,
      Descripcion: carrito[i].Descripcion,
      Cantidad: carrito[i].Cantidad,
      Precio: carrito[i]["Precio Und"],
      NoLinea: idVenta + (i + 1),
      Fecha: obtenerFechaActual(),
      Vendedor: 'Vendedor',
      Isv: carrito[i].Isv || '',
      Cliente: clienteSeleccionado ? clienteSeleccionado.Codigo : '',
      Ruta: clienteSeleccionado ? clienteSeleccionado.Ruta : '',
      Tipo: 'Tipo',
      Pedido: 'Pedido',
      Enviado: 'Enviado',
      Estado: 'Estado',
      DescuentoPorc: 'Descuento %',
      DescuentoLps: 'Descuento Lps',
      TipoDescuento: 'Tipo descuento',
      EstadoCarrito: 'Estado carrito'
    };
    await fetch('https://script.google.com/macros/s/AKfycbwZ3jfUvN1zYwGpCnnOEtltrlhNN3tcxebm3Nv9J3-Y_AtCsQ_3RNMzn4KhsQ6y3hAo/exec', {
      method: 'POST',
      body: JSON.stringify(detalle)
    });
  }
  document.getElementById('sale-result').innerHTML =
    `<a href="URL_FACTURA_FORMATO?no_venta=${idVenta}" target="_blank">Ver factura</a>`;
}

// Helpers
function generarIdUnico() {
  const d = new Date();
  return (
    pad(d.getDate()) +
    pad(d.getMonth() + 1) +
    d.getFullYear() +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
function pad(n, z = 2) { return ('00' + n).slice(-z); }
function padFactura(n) { return ('00000000' + n).slice(-8); }
function obtenerFechaActual() { const d = new Date(); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
function obtenerHoraActual() { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
function obtenerFechaHoraActual() { return obtenerFechaActual() + ' ' + obtenerHoraActual(); }
