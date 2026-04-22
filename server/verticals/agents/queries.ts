import sql from 'mssql';

export const initializeTables = async () => {
  try {
    try {
      await sql.query`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Comisiones') AND name='ClientId')
        BEGIN
          ALTER TABLE Comisiones ADD ClientId NVARCHAR(50);
          ALTER TABLE Comisiones ADD ClientName NVARCHAR(255);
        END
      `;
    } catch (err) { console.error('Error altering Comisiones table:', err); }

    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Agentes' and xtype='U')
      CREATE TABLE Agentes (
        Id INT IDENTITY(1,1) PRIMARY KEY, Nombre NVARCHAR(100) NOT NULL,
        Email NVARCHAR(100), Telefono NVARCHAR(20), Activo BIT DEFAULT 1, FechaAlta DATETIME DEFAULT GETDATE()
      )
    `;
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ReglasComision' and xtype='U')
      CREATE TABLE ReglasComision (
        Id INT IDENTITY(1,1) PRIMARY KEY, AgenteId INT FOREIGN KEY REFERENCES Agentes(Id),
        Categoria NVARCHAR(255), Formato NVARCHAR(255), Porcentaje DECIMAL(5,2) NOT NULL,
        FechaInicio DATE, FechaFin DATE, Descripcion NVARCHAR(500),
        ClientId NVARCHAR(50), ClientName NVARCHAR(255), FechaCreacion DATETIME DEFAULT GETDATE()
      )
    `;
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ComisionesCalculadas' and xtype='U')
      CREATE TABLE ComisionesCalculadas (
        Id INT IDENTITY(1,1) PRIMARY KEY, AgenteId INT FOREIGN KEY REFERENCES Agentes(Id),
        Trimestre NVARCHAR(10) NOT NULL, Anio INT NOT NULL, TotalComision DECIMAL(18,2) NOT NULL,
        DetallesJson NVARCHAR(MAX) NOT NULL, FechaCalculo DATETIME DEFAULT GETDATE(),
        UNIQUE(AgenteId, Trimestre, Anio)
      )
    `;
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ComisionesOverrides' and xtype='U')
      CREATE TABLE ComisionesOverrides (
        Id INT IDENTITY(1,1) PRIMARY KEY, InvoiceId NVARCHAR(50) NOT NULL,
        AgentId INT FOREIGN KEY REFERENCES Agentes(Id), Removed BIT DEFAULT 0, LinesData NVARCHAR(MAX),
        FechaModificacion DATETIME DEFAULT GETDATE(), UNIQUE(InvoiceId, AgentId)
      )
    `;
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ComisionesAdjustments' and xtype='U')
      CREATE TABLE ComisionesAdjustments (
        Id INT IDENTITY(1,1) PRIMARY KEY, AgentId INT FOREIGN KEY REFERENCES Agentes(Id),
        Year INT NOT NULL, Quarter NVARCHAR(10) NOT NULL, Amount DECIMAL(10,2) NOT NULL,
        Description NVARCHAR(255) NOT NULL, CreatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    console.log('Tables initialized successfully');
  } catch (err) { console.error('Error initializing tables:', err); }
};

export const getAgentesQuery = () => sql.query`SELECT Id as id, Nombre as name, Email as email, Telefono as phone, Activo as active FROM Agentes ORDER BY Nombre`;
export const createAgenteQuery = (nombre: string, email: string, telefono: string, activo: boolean) =>
  sql.query`INSERT INTO Agentes (Nombre,Email,Telefono,Activo) OUTPUT INSERTED.Id as id, INSERTED.Nombre as name, INSERTED.Email as email, INSERTED.Telefono as phone, INSERTED.Activo as active VALUES (${nombre},${email},${telefono},${activo?1:0})`;
export const updateAgenteQuery = (id: number, nombre: string, email: string, telefono: string, activo: boolean) =>
  sql.query`UPDATE Agentes SET Nombre=${nombre},Email=${email},Telefono=${telefono},Activo=${activo?1:0} OUTPUT INSERTED.Id as id, INSERTED.Nombre as name, INSERTED.Email as email, INSERTED.Telefono as phone, INSERTED.Activo as active WHERE Id=${id}`;
export const deleteAgenteQuery = (id: number) => sql.query`DELETE FROM Agentes WHERE Id=${id}`;

export const getReglasComisionQuery = () => sql.query`
  SELECT r.Id as id, r.AgenteId as agentId, a.Nombre as agentName, r.Categoria as category, r.Formato as format,
    r.Porcentaje as rate, CONVERT(varchar,r.FechaInicio,23) as startDate, CONVERT(varchar,r.FechaFin,23) as endDate,
    r.Descripcion as description, r.ClientId as clientId, r.ClientName as clientName
  FROM ReglasComision r JOIN Agentes a ON r.AgenteId=a.Id ORDER BY r.FechaCreacion DESC
`;

export const createReglaComisionQuery = (agenteId: number, categoria: string, formato: string, porcentaje: number, fechaInicio: string, fechaFin: string, descripcion: string, clientId?: string, clientName?: string) =>
  sql.query`
    DECLARE @Salida TABLE(Id INT,AgenteId INT,Categoria NVARCHAR(MAX),Formato NVARCHAR(MAX),Porcentaje DECIMAL(18,2),FechaInicio DATE,FechaFin DATE,Descripcion NVARCHAR(MAX),ClientId NVARCHAR(50),ClientName NVARCHAR(255));
    INSERT INTO ReglasComision (AgenteId,Categoria,Formato,Porcentaje,FechaInicio,FechaFin,Descripcion,ClientId,ClientName)
    OUTPUT INSERTED.Id,INSERTED.AgenteId,INSERTED.Categoria,INSERTED.Formato,INSERTED.Porcentaje,INSERTED.FechaInicio,INSERTED.FechaFin,INSERTED.Descripcion,INSERTED.ClientId,INSERTED.ClientName INTO @Salida
    VALUES (${agenteId},${categoria},${formato},${porcentaje},${fechaInicio||null},${fechaFin||null},${descripcion},${clientId||null},${clientName||null});
    SELECT s.Id as id,s.AgenteId as agentId,a.Nombre as agentName,s.Categoria as category,s.Formato as format,s.Porcentaje as rate,CONVERT(varchar,s.FechaInicio,23) as startDate,CONVERT(varchar,s.FechaFin,23) as endDate,s.Descripcion as description,s.ClientId as clientId,s.ClientName as clientName FROM @Salida s LEFT JOIN Agentes a ON s.AgenteId=a.Id;
  `;

export const updateReglaComisionQuery = (id: number, agenteId: number, categoria: string, formato: string, porcentaje: number, fechaInicio: string, fechaFin: string, descripcion: string, clientId?: string, clientName?: string) =>
  sql.query`
    DECLARE @Salida TABLE(Id INT,AgenteId INT,Categoria NVARCHAR(MAX),Formato NVARCHAR(MAX),Porcentaje DECIMAL(18,2),FechaInicio DATE,FechaFin DATE,Descripcion NVARCHAR(MAX),ClientId NVARCHAR(50),ClientName NVARCHAR(255));
    UPDATE ReglasComision SET AgenteId=${agenteId},Categoria=${categoria},Formato=${formato},Porcentaje=${porcentaje},FechaInicio=${fechaInicio||null},FechaFin=${fechaFin||null},Descripcion=${descripcion},ClientId=${clientId||null},ClientName=${clientName||null}
    OUTPUT INSERTED.Id,INSERTED.AgenteId,INSERTED.Categoria,INSERTED.Formato,INSERTED.Porcentaje,INSERTED.FechaInicio,INSERTED.FechaFin,INSERTED.Descripcion,INSERTED.ClientId,INSERTED.ClientName INTO @Salida WHERE Id=${id};
    SELECT s.Id as id,s.AgenteId as agentId,a.Nombre as agentName,s.Categoria as category,s.Formato as format,s.Porcentaje as rate,CONVERT(varchar,s.FechaInicio,23) as startDate,CONVERT(varchar,s.FechaFin,23) as endDate,s.Descripcion as description,s.ClientId as clientId,s.ClientName as clientName FROM @Salida s LEFT JOIN Agentes a ON s.AgenteId=a.Id;
  `;

export const deleteReglaComisionQuery = (id: number) => sql.query`DELETE FROM ReglasComision WHERE Id=${id}`;

export const syncReglasComisionQuery = async (rules: any[]) => {
  const transaction = new sql.Transaction();
  await transaction.begin();
  try {
    const request = new sql.Request(transaction);
    await request.query('DELETE FROM ReglasComision');
    for (const rule of rules) {
      const catStr = Array.isArray(rule.category) ? rule.category.join(',') : (rule.category || '');
      const formStr = Array.isArray(rule.formats) ? rule.formats.join(',') : (rule.formats || '');
      let agentId = rule.agentId;
      if (!agentId && rule.agentName) {
        const agentReq = new sql.Request(transaction);
        agentReq.input('agentName', sql.NVarChar, rule.agentName);
        const agentRes = await agentReq.query('SELECT Id FROM Agentes WHERE Nombre=@agentName');
        if (agentRes.recordset.length > 0) agentId = agentRes.recordset[0].Id;
      }
      if (agentId) {
        const insertReq = new sql.Request(transaction);
        insertReq.input('agentId', sql.Int, agentId);
        insertReq.input('category', sql.NVarChar, catStr);
        insertReq.input('format', sql.NVarChar, formStr);
        insertReq.input('rate', sql.Decimal(5,2), rule.rate||0);
        insertReq.input('startDate', sql.Date, rule.startDate||null);
        insertReq.input('endDate', sql.Date, rule.endDate||null);
        insertReq.input('description', sql.NVarChar, rule.description||'');
        await insertReq.query('INSERT INTO ReglasComision (AgenteId,Categoria,Formato,Porcentaje,FechaInicio,FechaFin,Descripcion) VALUES (@agentId,@category,@format,@rate,@startDate,@endDate,@description)');
      }
    }
    await transaction.commit();
    return { success: true };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const getComisionesOverridesQuery = (agentId: number) =>
  sql.query`SELECT InvoiceId as invoiceId, Removed as removed, LinesData as linesData FROM ComisionesOverrides WHERE AgentId=${agentId}`;
export const getComisionesAdjustmentsQuery = (agentId: number, year: number) =>
  sql.query`SELECT Id as id, Quarter as quarter, Amount as amount, Description as description FROM ComisionesAdjustments WHERE AgentId=${agentId} AND Year=${year}`;
export const createComisionesAdjustmentQuery = (agentId: number, year: number, quarter: string, amount: number, description: string) =>
  sql.query`INSERT INTO ComisionesAdjustments (AgentId,Year,Quarter,Amount,Description) VALUES (${agentId},${year},${quarter},${amount},${description})`;
export const deleteComisionesAdjustmentQuery = (id: number) => sql.query`DELETE FROM ComisionesAdjustments WHERE Id=${id}`;
export const upsertComisionesOverrideQuery = (invoiceId: string, agentId: number, removed: boolean, linesData: string | null) =>
  sql.query`
    IF EXISTS (SELECT 1 FROM ComisionesOverrides WHERE InvoiceId=${invoiceId} AND AgentId=${agentId})
      UPDATE ComisionesOverrides SET Removed=${removed},LinesData=${linesData},FechaModificacion=GETDATE() WHERE InvoiceId=${invoiceId} AND AgentId=${agentId}
    ELSE
      INSERT INTO ComisionesOverrides (InvoiceId,AgentId,Removed,LinesData) VALUES (${invoiceId},${agentId},${removed},${linesData})
  `;
export const deleteComisionesOverrideQuery = (invoiceId: string, agentId: number) =>
  sql.query`DELETE FROM ComisionesOverrides WHERE InvoiceId=${invoiceId} AND AgentId=${agentId}`;
export const deleteAllComisionesOverridesQuery = (agentId: number) =>
  sql.query`DELETE FROM ComisionesOverrides WHERE AgentId=${agentId}`;
