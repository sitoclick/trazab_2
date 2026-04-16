import sql from 'mssql';
import crypto from 'crypto';

export const getDEPCQuery = (ejercicioPedido: number, seriePedido: string, numeroPedido: number) =>
  sql.query`
    SELECT M.CodigoEmpresa, M.Comentario, M.NumeroSerieLc, C.EjercicioAlbaran, C.SerieAlbaran, C.NumeroAlbaran,
      A.CodigoArticulo, A.DescripcionArticulo, V.Unidades, V.Peso, V.FechaRegistro, V.Partida,
      C.RazonSocial AS proveedor, C.Finca, C.ExplotacionGanadera, C.CodigoEntidadInspeccion, C.NroCertificado,
      C.LoteExplotacion, C.ReferenciaAnimales, C.NroAnimales, C.Raza, C.LoteSacrificio, C.FechaEntradaMatadero,
      C.FechaSacrificio, C.CodigoEntidadAnalitica, C.NroAnalitica, C.Calidad, C.TipoCerdos, C.PiezasCerdos,
      C.EntidadInspeccion, C.Matadero, C.EntidadAnalitica, C.Alimentacion, TR.FechaSalazon,
      CP.EjercicioPedido, CP.SeriePedido, CP.NumeroPedido, Cp.FechaPedido, CP.Codigocliente,
      CP.RazonSocial, CP.Domicilio, CP.Municipio, CP.CodigoPostal, CP.Provincia,
      CP.RazonSocialEnvios, CP.RazonSocial2Envios, CP.DomicilioEnvios, CP.MunicipioEnvios,
      CP.CodigoPostalEnvios, CP.ProvinciaEnvios, CP.ObservacionesPedido
    FROM dbo.Usr_pesospedidocliente AS V
    INNER JOIN dbo.MovimientoArticuloSerie AS M ON M.CodigoEmpresa=V.CodigoEmpresa AND M.NumeroSerieLc=V.NumeroSerieLc
    INNER JOIN dbo.CabeceraAlbaranProveedor AS C ON M.CodigoEmpresa=C.CodigoEmpresa
      AND M.EjercicioDocumento=C.EjercicioAlbaran AND M.SerieDocumento=C.SerieAlbaran AND M.Documento=C.NumeroAlbaran
    INNER JOIN dbo.USR_TrazabPartidas AS TR ON M.MovPosicionOrigen=TR.LineasPosicion
    INNER JOIN dbo.Articulos as A on M.CodigoArticulo=A.CodigoArticulo and M.CodigoEmpresa=A.CodigoEmpresa
    INNER JOIN dbo.CabeceraPedidoCliente as CP on CP.CodigoEmpresa=V.CodigoEmpresa
      and CP.EjercicioPedido=V.EjercicioPedido and CP.SeriePedido=V.SeriePedido AND V.NumeroPedido=CP.NumeroPedido
    WHERE (M.OrigenDocumento=0)
      and V.EjercicioPedido=${ejercicioPedido}
      and CP.SeriePedido=${seriePedido} and CP.NumeroPedido=${numeroPedido}
    order by cp.FechaPedido desc
  `;

export const corregirPrecintoLote = async (lote: string, tipo: string, precinto: string) => {
  const prefix = tipo === 'Jamon' ? '1' : '2';
  const result = await sql.query`
    SELECT TOP 1 * FROM MovimientoArticuloSerie
    WHERE Partida=${lote} AND OrigenDocumento=0 AND NumeroSerieLc LIKE ${prefix + '%'}
  `;
  if (result.recordset.length === 0) throw new Error('Lote erróneo o no se encontró una pieza de ese tipo en el lote de entrada.');
  const row = result.recordset[0];
  const newMovPosicionSerie = crypto.randomUUID().toUpperCase();
  await sql.query`
    INSERT INTO MovimientoArticuloSerie (
      CodigoEmpresa, CodigoArticulo, NumeroSerieLc, MovPosicion, Fecha, FechaRegistro,
      StatusAcumulado, OrigenDocumento, EjercicioDocumento, SerieDocumento, Documento,
      MovPosicionOrigen, CodigoColor_, CodigoTalla01_, CodigoAlmacen, Ubicacion, Partida,
      UnidadMedida1_, UnidadesSerie, NumeroSerieFabricante, EmpresaOrigen, CodigoCliente,
      CodigoProveedor, MovPosicionSerie, Comentario, Peso
    ) VALUES (
      ${row.CodigoEmpresa}, ${row.CodigoArticulo}, ${precinto}, ${row.MovPosicion}, ${row.Fecha}, GETDATE(),
      ${row.StatusAcumulado}, ${row.OrigenDocumento}, ${row.EjercicioDocumento}, ${row.SerieDocumento}, ${row.Documento},
      ${row.MovPosicionOrigen}, ${row.CodigoColor_}, ${row.CodigoTalla01_}, ${row.CodigoAlmacen}, ${row.Ubicacion}, ${row.Partida},
      ${row.UnidadMedida1_}, ${row.UnidadesSerie}, ${precinto}, ${row.EmpresaOrigen}, ${row.CodigoCliente},
      ${row.CodigoProveedor}, ${newMovPosicionSerie}, ${row.Comentario}, ${row.Peso}
    )
  `;
  return { success: true, message: 'Precinto corregido y añadido correctamente.' };
};
