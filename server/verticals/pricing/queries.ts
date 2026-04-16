import sql from 'mssql';

export const initializePricingTables = async () => {
  await sql.query`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tarifa' and xtype='U')
    CREATE TABLE Tarifa (
      Id INT IDENTITY(1,1) PRIMARY KEY, Nombre NVARCHAR(100) NOT NULL,
      Descripcion NVARCHAR(255), Activa BIT DEFAULT 1, FechaCreacion DATETIME DEFAULT GETDATE()
    )
  `;
  await sql.query`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PreciosTarifa' and xtype='U')
    CREATE TABLE PreciosTarifa (
      Id INT IDENTITY(1,1) PRIMARY KEY, TarifaId INT NOT NULL FOREIGN KEY REFERENCES Tarifa(Id) ON DELETE CASCADE,
      ProductoId NVARCHAR(50) NOT NULL, PrecioTarifa DECIMAL(18,2) NOT NULL,
      AjusteFijo DECIMAL(18,2) DEFAULT 0, AjustePorcentaje DECIMAL(5,2) DEFAULT 0,
      UltimaModificacion DATETIME DEFAULT GETDATE(), UNIQUE(TarifaId, ProductoId)
    )
  `;
};

export const getTarifasQuery = () =>
  sql.query`SELECT Id as id, Nombre as name, Descripcion as description, Activa as active FROM Tarifa ORDER BY Nombre`;

export const createTarifaQuery = (nombre: string, descripcion: string, activo: boolean) =>
  sql.query`INSERT INTO Tarifa (Nombre,Descripcion,Activa) OUTPUT INSERTED.Id as id, INSERTED.Nombre as name, INSERTED.Descripcion as description, INSERTED.Activa as active VALUES (${nombre},${descripcion},${activo?1:0})`;

export const updateTarifaQuery = (id: number, nombre: string, descripcion: string, activo: boolean) =>
  sql.query`UPDATE Tarifa SET Nombre=${nombre},Descripcion=${descripcion},Activa=${activo?1:0} OUTPUT INSERTED.Id as id, INSERTED.Nombre as name, INSERTED.Descripcion as description, INSERTED.Activa as active WHERE Id=${id}`;

export const deleteTarifaQuery = (id: number) => sql.query`DELETE FROM Tarifa WHERE Id=${id}`;

export const getPreciosTarifaQuery = (tarifaId?: number) => {
  if (tarifaId !== undefined) return sql.query`SELECT Id as id, TarifaId as tarifaId, ProductoId as productId, PrecioTarifa as precio FROM PreciosTarifa WHERE TarifaId=${tarifaId}`;
  return sql.query`SELECT Id as id, TarifaId as tarifaId, ProductoId as productId, PrecioTarifa as precio FROM PreciosTarifa`;
};

export const updatePrecioTarifaQuery = (tarifaId: number, productoId: string, precio: number) =>
  sql.query`
    MERGE PreciosTarifa AS target
    USING (SELECT ${tarifaId} AS TarifaId, ${productoId} AS ProductoId, ${precio} AS PrecioTarifa) AS source
    ON target.TarifaId=source.TarifaId AND target.ProductoId=source.ProductoId
    WHEN MATCHED THEN UPDATE SET PrecioTarifa=source.PrecioTarifa, UltimaModificacion=GETDATE()
    WHEN NOT MATCHED THEN INSERT (TarifaId,ProductoId,PrecioTarifa) VALUES (source.TarifaId,source.ProductoId,source.PrecioTarifa)
    OUTPUT INSERTED.Id as id, INSERTED.TarifaId as tarifaId, INSERTED.ProductoId as productId, INSERTED.PrecioTarifa as precio;
  `;

export const deletePrecioTarifaQuery = (id: number) => sql.query`DELETE FROM PreciosTarifa WHERE Id=${id}`;
