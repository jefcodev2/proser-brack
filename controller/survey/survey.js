const { response } = require("express");
const { db_postgres } = require("../../database/config");

/**
 * Obtiene la lista de encuestas telefónicas desde la vista survey_telefonica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getSurveyTelefonica = async (req, res) => {
  try {
    const desde = Number(req.query.desde) || 0;
    const limit = Number(req.query.limit) || 10;
    const provincia = req.query.provincia || null;
    const tipo_encuesta = req.query.tipo_encuesta || null;
    const tamano_local = req.query.tamano_local || null;

    // Construir la consulta base
    let querySurvey = `SELECT * FROM survey_telefonica`;
    let querySurveyCount = `SELECT COUNT(*) FROM survey_telefonica`;
    let params = [];
    let paramCount = 0;

    // Agregar filtros si se proporcionan
    let whereConditions = [];
    let whereParams = [];
    
    if (provincia) {
      whereConditions.push(`provincia ILIKE $${whereParams.length + 1}`);
      whereParams.push(`%${provincia}%`);
    }
    
    if (tipo_encuesta) {
      whereConditions.push(`tipo_encuesta ILIKE $${whereParams.length + 1}`);
      whereParams.push(`%${tipo_encuesta}%`);
    }
    
    if (tamano_local) {
      whereConditions.push(`tamano_local ILIKE $${whereParams.length + 1}`);
      whereParams.push(`%${tamano_local}%`);
    }
    
    // Construir cláusula WHERE si hay filtros
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      querySurvey += whereClause;
      querySurveyCount += whereClause;
      params = [...whereParams];
    }

    // Agregar paginación
    paramCount = whereParams.length;
    querySurvey += ` OFFSET $${paramCount + 1} LIMIT $${paramCount + 2}`;
    params.push(desde, limit);

    // Promesas para obtener datos y total
    const [encuestas, total] = await Promise.all([
      db_postgres.query(querySurvey, params),
      db_postgres.one(querySurveyCount, whereParams),
    ]);

    const totalCount = total.count;

    res.json({
      ok: true,
      encuestas,
      total: totalCount,
      desde,
      limit,
      filtros: {
        provincia: provincia || 'Todas',
        tipo_encuesta: tipo_encuesta || 'Todos',
        tamano_local: tamano_local || 'Todos'
      }
    });
  } catch (error) {
    console.error('Error en getSurveyTelefonica:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener las encuestas telefónicas",
      error: error.message
    });
  }
};







const getSurveyTelefonicaById = async (req, res) => {
  try {
    const { id } = req.params;

    const encuesta = await db_postgres.oneOrNone(
      "SELECT * FROM survey_telefonica WHERE id = $1",
      [id]
    );

    if (!encuesta) {
      return res.status(404).json({
        ok: false,
        msg: "Encuesta telefónica no encontrada"
      });
    }

    res.json({
      ok: true,
      encuesta
    });
  } catch (error) {
    console.error('Error en getSurveyTelefonicaById:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener la encuesta telefónica",
      error: error.message
    });
  }
};





/**
 * Carga encuestas desde un archivo CSV y las inserta en la BD
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const uploadSurveyTelefonica = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        msg: "No se ha subido ningún archivo"
      });
    }

    const filePath = path.resolve(req.file.path);
    const results = [];

    // Leer y parsear el CSV
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("error", (error) => {
        console.error("Error al leer CSV:", error);
        return res.status(500).json({
          ok: false,
          msg: "Error al leer el archivo CSV",
          error: error.message,
        });
      })
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", async () => {
        try {
          // Inserción en sur_respondent (ejemplo básico)
          for (const row of results) {
            await db_postgres.none(
              `INSERT INTO sur_respondent 
              (code, name, business_type, survey_type, business_group,
               main_street, secondary_street, nomenclature, geo_area,
               latitud, longitud, province, canton, parish)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
              ON CONFLICT (code) DO NOTHING`,
              [
                row.codigo,
                row.nombre,
                row.tipo_negocio,
                row.tipo_encuesta,
                row.grupo_negocio,
                row.calle_principal,
                row.calle_secundaria,
                row.nomenclatura,
                row.area_geografica,
                row.latitud,
                row.longitud,
                row.provincia,
                row.canton,
                row.parroquia
              ]
            );
          }

          res.json({
            ok: true,
            msg: "Encuestas cargadas correctamente",
            total: results.length,
          });
        } catch (dbError) {
          console.error("Error al insertar en la BD:", dbError);
          res.status(500).json({
            ok: false,
            msg: "Error al insertar los datos en la base de datos",
            error: dbError.message,
          });
        } finally {
          // Limpieza: borrar archivo subido
          fs.unlinkSync(filePath);
        }
      });
  } catch (error) {
    console.error("Error en uploadSurveyTelefonica:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al subir encuestas telefónicas",
      error: error.message,
    });
  }
};

/**
 * Obtiene la lista de provincias disponibles en las encuestas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getProvincias = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT province 
      FROM survey_telefonica 
      WHERE province IS NOT NULL AND province != ''
      ORDER BY province ASC
    `;

    const provincias = await db_postgres.query(query);

    res.json({
      ok: true,
      provincias: provincias.map(p => p.province),
      total: provincias.length
    });
  } catch (error) {
    console.error('Error en getProvincias:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener las provincias",
      error: error.message
    });
  }
};

/**
 * Obtiene la lista de tipos de encuesta disponibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getTiposEncuesta = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tipo_encuesta 
      FROM survey_telefonica 
      WHERE tipo_encuesta IS NOT NULL AND tipo_encuesta != ''
      ORDER BY tipo_encuesta ASC
    `;

    const tiposEncuesta = await db_postgres.query(query);

    res.json({
      ok: true,
      tipos_encuesta: tiposEncuesta.map(t => t.tipo_encuesta),
      total: tiposEncuesta.length
    });
  } catch (error) {
    console.error('Error en getTiposEncuesta:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los tipos de encuesta",
      error: error.message
    });
  }
};

/**
 * Obtiene la lista de tamaños de local disponibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getTamanosLocal = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tamano_local 
      FROM survey_telefonica 
      WHERE tamano_local IS NOT NULL AND tamano_local != ''
      ORDER BY tamano_local ASC
    `;

    const tamanosLocal = await db_postgres.query(query);

    res.json({
      ok: true,
      tamanos_local: tamanosLocal.map(t => t.tamano_local),
      total: tamanosLocal.length
    });
  } catch (error) {
    console.error('Error en getTamanosLocal:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los tamaños de local",
      error: error.message
    });
  }
};

module.exports = {
  getSurveyTelefonica,
  getSurveyTelefonicaById,
  uploadSurveyTelefonica,
  getProvincias,
  getTiposEncuesta,
  getTamanosLocal
};

