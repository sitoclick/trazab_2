import sql from 'mssql';

export const getProductionDataQuery = () => sql.query`
  SELECT TOP 50
    MS.Fecha as FechaRegistro, MS.OrigenMovimiento as Tipo, MS.CodigoArticulo as Codigo,
    A.DescripcionArticulo as Descripcion, MS.Partida, MS.Serie, MS.Unidades, MS.Unidades2_ as Peso
  FROM MovimientoStock MS WITH (NOLOCK)
  LEFT JOIN Articulos A WITH (NOLOCK) ON MS.CodigoArticulo = A.CodigoArticulo
  WHERE MS.OrigenMovimiento = 'F'
  ORDER BY MS.Fecha DESC, MS.FechaRegistro DESC
`;

export const getSchemaQuery = () => sql.query`
  SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME NOT LIKE 'sys%' AND TABLE_NAME NOT LIKE 'MS%'
`;

export const getPesadasQuery = (ejercicioPedido: number, seriePedido: string, numeroPedido: number) =>
  sql.query`
    SELECT NumeroCaja, OrdenBulto_, CodigoArticulo, Unidades, Peso, Partida, NumeroSerieLc, FechaRegistro
    FROM USR_Pesospedidocliente
    WHERE ejerciciopedido = ${ejercicioPedido}
      AND seriepedido = ${seriePedido}
      AND NumeroPedido = ${numeroPedido}
    ORDER BY FechaRegistro
  `;

export const getOrderLinesQuery = (ejercicioPedido: number, seriePedido: string, numeroPedido: number) =>
  sql.query`
    SELECT L.LineasPosicion, CASE WHEN L.Estado<>2 then 'Pend.' else 'Serv.' end as Estado, L.Orden,
    case when L.StatusCerradoExpediciones=0 then 'NO' else 'SI' end Cerrado,
    L.CodigoArticulo as Codigo, L.DescripcionArticulo + ' ' + L.Descripcion2Articulo as Articulo, L.Partida,
    (select SUM(Unidades) from USR_PesosPedidoCliente with(nolock) where LineaPedido=L.LineasPosicion) as UnidadesPesadas,
    (select SUM(Peso) from USR_PesosPedidoCliente with(nolock) where LineaPedido=L.LineasPosicion) as Unidades2_Pesadas,
    L.Precio, a.TratamientoPartidas, a.TrataNumerosSerieLc, L.Descripcion2Articulo, L.Comentario, L.DescripcionLinea,
    L.Observaciones, A.usrPiezasKilosBascula,
    CASE WHEN C.StatusCerradoExpediciones=0 THEN 'NO' ELSE 'SI' END as StatusCerradoCabecera,
    L.usrBultosBascula as BultosBascula, L.UnidadesPedidas
    FROM LineasPedidoCliente L with(nolock)
    LEFT JOIN CabeceraPedidoCliente C with(nolock) ON(L.CodigoEmpresa=C.CodigoEmpresa AND L.EjercicioPedido=C.EjercicioPedido AND L.SeriePedido=C.SeriePedido AND L.NumeroPedido=C.NumeroPedido)
    LEFT JOIN Articulos A with(nolock) ON(A.CodigoEmpresa=1 and L.CodigoArticulo=A.CodigoArticulo)
    LEFT JOIN Clientes Cl with(nolock) ON (Cl.CodigoEmpresa=1 AND C.CodigoCliente=Cl.CodigoCliente)
    left join Rutas_ R with(nolock) on(C.CodigoEmpresa=R.CodigoEMpresa and c.codigoruta_=R.codigoruta_)
    left join Transportistas T on(C.CodigoEmpresa=T.CodigoEMpresa and c.CodigoTransportistaEnvios=T.CodigoTransportista)
    WHERE C.Codigoempresa=1 and A.TipoArticulo NOT IN ('C')
      and C.EjercicioPedido=${ejercicioPedido} and C.SeriePedido=${seriePedido} and C.NumeroPedido=${numeroPedido}
    order by L.Orden
  `;

export const getPesadasLineaQuery = (ejercicioPedido: number, seriePedido: string, numeroPedido: number, codigoArticulo: string) =>
  sql.query`
    SELECT NumeroCaja, OrdenBulto_, Unidades, Peso, Partida, NumeroSerieLc, FechaRegistro
    FROM USR_Pesospedidocliente
    WHERE ejerciciopedido = ${ejercicioPedido}
      AND seriepedido = ${seriePedido}
      AND NumeroPedido = ${numeroPedido}
      AND CodigoArticulo = ${codigoArticulo}
    ORDER BY FechaRegistro
  `;

export const getCalicerQuery = (year: number) => sql.query`
  WITH DatosLimpios AS (
    SELECT MONTH(p.FechaRegistro) AS MesNumero, DATENAME(month, p.FechaRegistro) AS MesNombre,
      LOWER(LTRIM(RTRIM(a.TipoArticuloEscandallo))) AS TipoArticulo,
      UPPER(LTRIM(RTRIM(cap.Raza))) AS Raza, UPPER(LTRIM(RTRIM(cap.Alimentacion))) AS Alimentacion,
      CAST(1 AS INT) AS Cantidad
    FROM USR_PesosPedidoCliente AS p WITH (NOLOCK)
    INNER JOIN ARticulos AS a WITH (NOLOCK) ON p.CodigoArticulo = a.codigoArticulo
    INNER JOIN Movimientoarticuloserie AS mas WITH (NOLOCK)
      ON p.NumeroserielC = mas.numeroserielc AND mas.Origendocumento = 0
    INNER JOIN CabeceraAlbaranproveedor AS cap WITH (NOLOCK)
      ON mas.Codigoempresa = cap.Codigoempresa AND mas.EjercicioDocumento = cap.EjercicioAlbaran
      AND mas.seriedocumento = cap.SerieAlbaran AND mas.Documento = cap.Numeroalbaran
    WHERE p.EjercicioPedido = ${year}
      AND p.SeriePedido not in ('PTR26','DI26')
      AND p.NumeroSerieLc IS NOT NULL AND p.NumeroSerieLc != '' AND p.NumeroSerieLc != '9'
      AND LOWER(LTRIM(RTRIM(a.TipoArticuloEscandallo))) IN ('jamón', 'paleta')
    UNION ALL
    SELECT MONTH(p.FechaRegistro) AS MesNumero, DATENAME(month, p.FechaRegistro) AS MesNombre,
      LOWER(LTRIM(RTRIM(a.TipoArticuloEscandallo))) AS TipoArticulo,
      UPPER(LTRIM(RTRIM(cap.Raza))) AS Raza, UPPER(LTRIM(RTRIM(cap.Alimentacion))) AS Alimentacion,
      CAST(p.Unidades AS INT) AS Cantidad
    FROM USR_PesosPedidoCliente AS p WITH (NOLOCK)
    INNER JOIN ARticulos AS a WITH (NOLOCK) ON p.CodigoArticulo = a.codigoArticulo
    INNER JOIN CabeceraAlbaranProveedor AS cap WITH (NOLOCK) ON p.Partida = cap.Partida
    WHERE p.EjercicioPedido = ${year}
      AND p.SeriePedido not in ('PTR26','DI26')
      AND LOWER(LTRIM(RTRIM(a.TipoArticuloEscandallo))) = 'lomo'
      AND p.CodigoArticulo NOT IN ('P-EM-LOM-BE-COPP','P-EM-LOM-BE-MITO')
  )
  SELECT MesNumero, UPPER(MesNombre) AS MES,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Cebo_50,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Cebo_75,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Cebo_100,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO DE CAMPO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_CCampo_50,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO DE CAMPO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_CCampo_75,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='CEBO DE CAMPO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_CCampo_100,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='BELLOTA' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Bellota_50,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='BELLOTA' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Bellota_75,
    SUM(CASE WHEN TipoArticulo='jamón' AND Alimentacion='BELLOTA' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Jamon_Bellota_100,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Cebo_50,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Cebo_75,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Cebo_100,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO DE CAMPO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_CCampo_50,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO DE CAMPO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_CCampo_75,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='CEBO DE CAMPO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_CCampo_100,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='BELLOTA' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Bellota_50,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='BELLOTA' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Bellota_75,
    SUM(CASE WHEN TipoArticulo='paleta' AND Alimentacion='BELLOTA' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Paleta_Bellota_100,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Cebo_50,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Cebo_75,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Cebo_100,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO DE CAMPO' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_CCampo_50,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO DE CAMPO' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_CCampo_75,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='CEBO DE CAMPO' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_CCampo_100,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='BELLOTA' AND Raza='50% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Bellota_50,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='BELLOTA' AND Raza='75% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Bellota_75,
    SUM(CASE WHEN TipoArticulo='lomo' AND Alimentacion='BELLOTA' AND Raza='100% IBERICO' THEN Cantidad ELSE 0 END) AS Lomo_Bellota_100
  FROM DatosLimpios
  GROUP BY MesNumero, MesNombre
  ORDER BY MesNumero ASC
`;

export const getClearOrdersQuery = () => sql.query`
  UPDATE CabeceraPedidoCliente SET Estado = 2
  WHERE Estado != 2 AND codigocliente != '69b036936005caa'
`;

export const getPendingOrdersQuery = (sent = false, year = 2026) => {
  if (sent) {
    return sql.query`
      SELECT C.CodigoCliente, C.FechaPedido as [F.Pedido],
        case when c.StatusCerradoExpediciones=0 then 'NO' else 'SI' end as Cerrado,
        C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido,
        C.RazonSocial + '-' + C.Nombre + isnull(char(13)+char(10)+'Ruta:'+R.Ruta_,'') as [Razon Social],
        isnull(T.Transportista,'') as Transportista, c.usrBultosEnvio as BultosEnvio, C.Estado
      FROM CabeceraPedidoCliente C with(nolock)
      left join Transportistas T with(nolock) on(C.CodigoEmpresa=T.CodigoEMpresa and c.CodigoTransportistaEnvios=T.CodigoTransportista)
      left join Rutas_ R with(nolock) on(C.CodigoEmpresa=R.CodigoEMpresa and c.CodigoRuta_=R.CodigoRuta_)
      WHERE C.Codigoempresa=1 AND C.Estado=2 AND C.EjercicioPedido=${year}
      ORDER BY C.FechaPedido desc, C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido
    `;
  }
  return sql.query`
    SELECT C.CodigoCliente, C.FechaPedido as [F.Pedido],
      case when c.StatusCerradoExpediciones=0 then 'NO' else 'SI' end as Cerrado,
      C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido,
      C.RazonSocial + '-' + C.Nombre + isnull(char(13)+char(10)+'Ruta:'+R.Ruta_,'') as [Razon Social],
      isnull(T.Transportista,'') as Transportista, c.usrBultosEnvio as BultosEnvio, C.Estado
    FROM CabeceraPedidoCliente C with(nolock)
    left join Transportistas T with(nolock) on(C.CodigoEmpresa=T.CodigoEMpresa and c.CodigoTransportistaEnvios=T.CodigoTransportista)
    left join Rutas_ R with(nolock) on(C.CodigoEmpresa=R.CodigoEMpresa and c.CodigoRuta_=R.CodigoRuta_)
    WHERE C.Codigoempresa=1 AND C.Estado<>2 AND C.EjercicioPedido=${year}
      AND C.FechaNecesaria <= GETDATE()
    ORDER BY C.FechaPedido desc, C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido
  `;
};

export const getReservasQuery = () => sql.query`
  SELECT C.CodigoCliente, C.FechaPedido as [F.Pedido],
    case when c.StatusCerradoExpediciones=0 then 'NO' else 'SI' end as Cerrado,
    C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido,
    C.RazonSocial + '-' + C.Nombre + isnull(char(13)+char(10)+'Ruta:'+R.Ruta_,'') as [Razon Social],
    isnull(T.Transportista,'') as Transportista, c.usrBultosEnvio as BultosEnvio
  FROM CabeceraPedidoCliente C with(nolock)
  left join Transportistas T with(nolock) on(C.CodigoEmpresa=T.CodigoEMpresa and c.CodigoTransportistaEnvios=T.CodigoTransportista)
  left join Rutas_ R with(nolock) on(C.CodigoEmpresa=R.CodigoEMpresa and c.CodigoRuta_=R.CodigoRuta_)
  WHERE C.Codigoempresa=1 AND (C.SeriePedido like 'RS%' OR C.SeriePedido like 'DP%')
  ORDER BY C.FechaPedido desc, C.CodigoEmpresa, C.EjercicioPedido, C.SeriePedido, C.NumeroPedido
`;

export const updateSelectedOrdersQuery = async (orders: { CodigoEmpresa: number; EjercicioPedido: number; SeriePedido: string; NumeroPedido: number }[]) => {
  const request = new sql.Request();
  const queryParts: string[] = [];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    request.input(`empresa_${i}`, sql.Int, o.CodigoEmpresa);
    request.input(`ejercicio_${i}`, sql.Int, o.EjercicioPedido);
    request.input(`serie_${i}`, sql.VarChar, o.SeriePedido);
    request.input(`numero_${i}`, sql.Int, o.NumeroPedido);
    queryParts.push(`(CodigoEmpresa=@empresa_${i} AND EjercicioPedido=@ejercicio_${i} AND SeriePedido=@serie_${i} AND NumeroPedido=@numero_${i})`);
  }
  if (queryParts.length === 0) return { rowsAffected: [0] };
  return request.query(`UPDATE CabeceraPedidoCliente SET Estado=2 WHERE ${queryParts.join(' OR ')}`);
};

export const closeAndPrintSelectedOrdersQuery = async (orders: { CodigoEmpresa: number; EjercicioPedido: number; SeriePedido: string; NumeroPedido: number }[]) => {
  const request = new sql.Request();
  const queryParts: string[] = [];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    request.input(`empresa_${i}`, sql.Int, o.CodigoEmpresa);
    request.input(`ejercicio_${i}`, sql.Int, o.EjercicioPedido);
    request.input(`serie_${i}`, sql.VarChar, o.SeriePedido);
    request.input(`numero_${i}`, sql.Int, o.NumeroPedido);
    queryParts.push(`(CodigoEmpresa=@empresa_${i} AND EjercicioPedido=@ejercicio_${i} AND SeriePedido=@serie_${i} AND NumeroPedido=@numero_${i})`);
  }
  if (queryParts.length === 0) return { rowsAffected: [0] };
  return request.query(`UPDATE [dbo].[CabeceraPedidoCliente] SET StatusCerradoExpediciones=-1 WHERE StatusCerradoExpediciones<>-1 AND (${queryParts.join(' OR ')})`);
};

export const forceCloseOrderQuery = (empresa: number, ejercicio: number, serie: string, numero: number) =>
  sql.query`
    EXEC sp_set_session_context N'BypassTrigger', 1;
    UPDATE [dbo].[CabeceraPedidoCliente]
    SET StatusCerradoExpediciones=-1
    WHERE StatusCerradoExpediciones<>-1
      AND CodigoEmpresa=${empresa} AND EjercicioPedido=${ejercicio} AND SeriePedido=${serie} AND NumeroPedido=${numero};
    EXEC sp_set_session_context N'BypassTrigger', 0;
  `;

export const revertOrderToPendingQuery = (empresa: number, ejercicio: number, serie: string, numero: number) =>
  sql.query`
    UPDATE CabeceraPedidoCliente SET Estado=1
    WHERE CodigoEmpresa=${empresa} AND EjercicioPedido=${ejercicio} AND SeriePedido=${serie} AND NumeroPedido=${numero}
  `;

export const reopenOrderQuery = (empresa: number, ejercicio: number, serie: string, numero: number) =>
  sql.query`
    EXEC sp_set_session_context N'BypassTrigger', 1;
    UPDATE [dbo].[CabeceraPedidoCliente]
    SET StatusCerradoExpediciones=0
    WHERE CodigoEmpresa=${empresa} AND EjercicioPedido=${ejercicio} AND SeriePedido=${serie} AND NumeroPedido=${numero};
    EXEC sp_set_session_context N'BypassTrigger', 0;
  `;

export const getAsiciQuery = (cliente: string, fechaDesde: string, fechaHasta: string) =>
  sql.query`
    SELECT NumeroserieLC as 'PRECINTO_DESDE', '' as 'PRECINTO_HASTA'
    FROM USR_PesosPedidoCliente as p
    LEFT OUTER JOIN CabeceraPedidoCliente as cac
      ON p.EjercicioPedido=cac.ejerciciopedido AND p.Seriepedido=cac.Seriepedido AND p.Numeropedido=cac.numeropedido
    WHERE cac.codigocliente=${cliente} AND cac.FechaPedido>=${fechaDesde} AND cac.fechapedido<=${fechaHasta}
  `;

export const cambiarPesadasPedido = async (
  ejercicioOrigen: number, serieOrigen: string, numeroOrigen: number, lineaOrigen: string, codigoArticulo: string,
  ejercicioDestino: number, serieDestino: string, numeroDestino: number
) => {
  const destLineResult = await sql.query`
    SELECT TOP 1 LineasPosicion FROM LineasPedidoCliente
    WHERE EjercicioPedido=${ejercicioDestino} AND SeriePedido=${serieDestino} AND NumeroPedido=${numeroDestino} AND CodigoArticulo=${codigoArticulo}
  `;
  if (destLineResult.recordset.length === 0) throw new Error('No se encontró el artículo en el pedido de destino.');
  const lineaDestino = destLineResult.recordset[0].LineasPosicion;
  await sql.query`
    UPDATE USR_PesosPedidoCliente
    SET EjercicioPedido=${ejercicioDestino}, SeriePedido=${serieDestino}, NumeroPedido=${numeroDestino}, LineaPedido=${lineaDestino}
    WHERE EjercicioPedido=${ejercicioOrigen} AND SeriePedido=${serieOrigen} AND NumeroPedido=${numeroOrigen}
      AND LineaPedido=${lineaOrigen} AND CodigoArticulo=${codigoArticulo}
  `;
};
