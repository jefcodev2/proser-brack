const { response } = require("express");
const { db_postgres } = require("../../database/config");
const xlsx = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const tipo_negocio = req.query.tipo_negocio || null;
    const elementos_colocados_en_visita = req.query.elementos_colocados_en_visita || null;

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
    
    if (tipo_negocio) {
      whereConditions.push(`tipo_negocio ILIKE $${whereParams.length + 1}`);
      whereParams.push(`%${tipo_negocio}%`);
    }
    
    if (elementos_colocados_en_visita) {
      // Convertir a array si es una cadena JSON
      let elementosArray;
      try {
        elementosArray = Array.isArray(elementos_colocados_en_visita) 
          ? elementos_colocados_en_visita 
          : JSON.parse(elementos_colocados_en_visita);
      } catch (error) {
        // Si no es JSON válido, tratarlo como una cadena simple
        elementosArray = [elementos_colocados_en_visita];
      }
      
      // Crear condiciones para cada elemento en el array (lógica AND)
      // Cada elemento debe estar presente en el array de elementos_colocados_en_visita
      const elementosConditions = elementosArray.map((elemento, index) => {
        whereParams.push(`%${elemento}%`);
        return `elementos_colocados_en_visita::text ILIKE $${whereParams.length}`;
      });
      
      if (elementosConditions.length > 0) {
        // Cambiar OR por AND para que se cumplan TODOS los elementos
        whereConditions.push(`(${elementosConditions.join(' AND ')})`);
      }
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
        tamano_local: tamano_local || 'Todos',
        tipo_negocio: tipo_negocio || 'Todos',
        elementos_colocados_en_visita: elementos_colocados_en_visita || 'Todos'
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

/**
 * Obtiene la lista de tipos de negocio disponibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getTiposNegocio = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tipo_negocio 
      FROM survey_telefonica 
      WHERE tipo_negocio IS NOT NULL AND tipo_negocio != ''
      ORDER BY tipo_negocio ASC
    `;

    const tiposNegocio = await db_postgres.query(query);

    res.json({
      ok: true,
      tipos_negocio: tiposNegocio.map(t => t.tipo_negocio),
      total: tiposNegocio.length
    });
  } catch (error) {
    console.error('Error en getTiposNegocio:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los tipos de negocio",
      error: error.message
    });
  }
};

/**
 * Obtiene la lista de elementos únicos colocados en visita
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getElementosColocadosEnVisita = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT unnest(elementos_colocados_en_visita) as elemento
      FROM survey_telefonica 
      WHERE elementos_colocados_en_visita IS NOT NULL 
        AND array_length(elementos_colocados_en_visita, 1) > 0
      ORDER BY elemento ASC
    `;

    const elementos = await db_postgres.query(query);

    res.json({
      ok: true,
      elementos_colocados_en_visita: elementos.map(e => e.elemento),
      total: elementos.length
    });
  } catch (error) {
    console.error('Error en getElementosColocadosEnVisita:', error);
    res.status(500).json({
      ok: false,
      msg: "Error al obtener los elementos colocados en visita",
      error: error.message
    });
  }
};

/**
 * Carga masiva de datos desde un archivo Excel
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const uploadMasiveSurveyFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        msg: "No se ha subido ningún archivo Excel"
      });
    }

    const filePath = path.resolve(req.file.path);
    let resultados = {
      respondentes_insertados: 0,
      respuestas_insertadas: 0,
      errores: []
    };

    try {
      // Leer el archivo Excel
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        return res.status(400).json({
          ok: false,
          msg: "El archivo Excel está vacío o no tiene datos válidos"
        });
      }

      // Verificar y crear restricción única si no existe
      try {
        await db_postgres.none(`
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 
                  FROM information_schema.table_constraints 
                  WHERE constraint_name = 'sur_respondent_code_unique' 
                  AND table_name = 'sur_respondent'
              ) THEN
                  ALTER TABLE sur_respondent 
                  ADD CONSTRAINT sur_respondent_code_unique UNIQUE (code);
              END IF;
          END
          $$;
        `);
      } catch (constraintError) {
        console.log('Info: No se pudo agregar restricción única (puede que ya exista):', constraintError.message);
      }

      // Obtener IDs necesarios de la base de datos
      const usuario = await db_postgres.oneOrNone(
        "SELECT id FROM users WHERE username = $1",
        ['encuestador1']
      );

      if (!usuario) {
        return res.status(400).json({
          ok: false,
          msg: "Usuario 'encuestador1' no encontrado. Debe existir para registrar las respuestas."
        });
      }

      const encuesta = await db_postgres.oneOrNone(
        "SELECT id FROM sur_surveys WHERE name = $1",
        ['Encuesta General de Tiendas']
      );

      if (!encuesta) {
        return res.status(400).json({
          ok: false,
          msg: "Encuesta 'Encuesta General de Tiendas' no encontrada."
        });
      }

      // Obtener las preguntas de la encuesta
      const preguntas = await db_postgres.query(
        "SELECT id, display_order FROM sur_questions WHERE survey_id = $1 ORDER BY display_order",
        [encuesta.id]
      );

      if (preguntas.length === 0) {
        return res.status(400).json({
          ok: false,
          msg: "No se encontraron preguntas para la encuesta."
        });
      }

      // Procesar cada fila del Excel
      for (let i = 0; i < data.length; i++) {
        const fila = data[i];
        
        try {
          // Mapear columnas del Excel a campos de la BD
          const respondente = {
            codigo: fila.codigo || fila.CODIGO || `EST${String(i + 1).padStart(3, '0')}`,
            nombre: fila.nombre || fila.NOMBRE || 'Sin nombre',
            tipo_negocio: fila.tipo_negocio || fila.TIPO_NEGOCIO || 'Tienda',
            tipo_encuesta: fila.tipo_encuesta || fila.TIPO_ENCUESTA || 'General',
            tamano_local: fila.tamano_local || fila.TAMANO_LOCAL || '',
            grupo_negocio: fila.grupo_negocio || fila.GRUPO_NEGOCIO || 'Grupo A',
            calle_principal: fila.calle_principal || fila.CALLE_PRINCIPAL || '',
            calle_secundaria: fila.calle_secundaria || fila.CALLE_SECUNDARIA || '',
            nomenclatura: fila.nomenclatura || fila.NOMENCLATURA || '',
            area_geografica: fila.area_geografica || fila.AREA_GEOGRAFICA || '',
            latitud: String(fila.latitud || fila.LATITUD || ''),
            longitud: String(fila.longitud || fila.LONGITUD || ''),
            provincia: fila.provincia || fila.PROVINCIA || '',
            canton: fila.canton || fila.CANTON || '',
            parroquia: fila.parroquia || fila.PARROQUIA || ''
          };

          // Insertar o actualizar respondente
          // Primero verificar si ya existe
          const existingRespondent = await db_postgres.oneOrNone(
            "SELECT id FROM sur_respondent WHERE code = $1",
            [respondente.codigo]
          );

          let respondentResult;
          if (existingRespondent) {
            // Actualizar registro existente
            respondentResult = await db_postgres.one(
              `UPDATE sur_respondent SET 
                name = $2,
                business_type = $3,
                survey_type = $4,
                business_size = $5,
                business_group = $6,
                main_street = $7,
                secondary_street = $8,
                nomenclature = $9,
                geo_area = $10,
                latitud = $11,
                longitud = $12,
                province = $13,
                canton = $14,
                parish = $15,
                updated_at = NOW()
              WHERE code = $1
              RETURNING id`,
              [
                respondente.codigo, respondente.nombre, respondente.tipo_negocio,
                respondente.tipo_encuesta, respondente.tamano_local, respondente.grupo_negocio,
                respondente.calle_principal, respondente.calle_secundaria,
                respondente.nomenclatura, respondente.area_geografica,
                respondente.latitud, respondente.longitud, respondente.provincia,
                respondente.canton, respondente.parroquia
              ]
            );
          } else {
            // Insertar nuevo registro
            respondentResult = await db_postgres.one(
              `INSERT INTO sur_respondent (
                code, name, business_type, survey_type, business_size, business_group,
                main_street, secondary_street, nomenclature, geo_area,
                latitud, longitud, province, canton, parish
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
              RETURNING id`,
              [
                respondente.codigo, respondente.nombre, respondente.tipo_negocio,
                respondente.tipo_encuesta, respondente.tamano_local, respondente.grupo_negocio,
                respondente.calle_principal, respondente.calle_secundaria,
                respondente.nomenclatura, respondente.area_geografica,
                respondente.latitud, respondente.longitud, respondente.provincia,
                respondente.canton, respondente.parroquia
              ]
            );
          }

          resultados.respondentes_insertados++;

          // Función para limpiar y procesar valores numéricos
          const limpiarValorNumerico = (valor) => {
            if (valor === undefined || valor === null || valor === '') return null;
            
            // Convertir a string y limpiar caracteres especiales
            let valorLimpio = String(valor)
              .replace(/["'\t\n\r]/g, '') 
              .trim(); 
            
            if (valorLimpio === '') return null;
            
            if (!isNaN(valorLimpio) && !isNaN(parseFloat(valorLimpio))) {
              return parseFloat(valorLimpio);
            }
            
            return valorLimpio;
          };

          // Preparar respuestas basadas en las columnas del Excel
          const respuestas = [
            { display_order: 1, respuesta: fila.vende_chips || fila.VENDE_CHIPS },
            { display_order: 2, respuesta: fila.de_que_operadora_vende_chips || fila.DE_QUE_OPERADORA_VENDE_CHIPS },
            { display_order: 3, respuesta: limpiarValorNumerico(fila.valor_compra_simcard_movistar || fila.VALOR_COMPRA_SIMCARD_MOVISTAR) },
            { display_order: 4, respuesta: limpiarValorNumerico(fila.valor_venta_simcard_movistar || fila.VALOR_VENTA_SIMCARD_MOVISTAR) },
            { display_order: 5, respuesta: limpiarValorNumerico(fila.valor_compra_simcard_tuenti || fila.VALOR_COMPRA_SIMCARD_TUENTI) },
            { display_order: 6, respuesta: limpiarValorNumerico(fila.valor_venta_simcard_tuenti || fila.VALOR_VENTA_SIMCARD_TUENTI) },
            { display_order: 7, respuesta: limpiarValorNumerico(fila.valor_compra_simcard_claro || fila.VALOR_COMPRA_SIMCARD_CLARO) },
            { display_order: 8, respuesta: limpiarValorNumerico(fila.valor_venta_simcard_claro || fila.VALOR_VENTA_SIMCARD_CLARO) },
            { display_order: 9, respuesta: limpiarValorNumerico(fila.valor_compra_simcard_cnt || fila.VALOR_COMPRA_SIMCARD_CNT) },
            { display_order: 10, respuesta: limpiarValorNumerico(fila.valor_venta_simcard_cnt || fila.VALOR_VENTA_SIMCARD_CNT) },
            { display_order: 11, respuesta: limpiarValorNumerico(fila.proporcion_chips_movistar || fila.PROPORCION_CHIPS_MOVISTAR) },
            { display_order: 12, respuesta: limpiarValorNumerico(fila.proporcion_chips_tuenti || fila.PROPORCION_CHIPS_TUENTI) },
            { display_order: 13, respuesta: limpiarValorNumerico(fila.stock_actual_movistar || fila.STOCK_ACTUAL_MOVISTAR) },
            { display_order: 14, respuesta: limpiarValorNumerico(fila.stock_actual_tuenti || fila.STOCK_ACTUAL_TUENTI) },
            { display_order: 15, respuesta: fila.vende_recargas || fila.VENDE_RECARGAS },
            { display_order: 16, respuesta: fila.de_que_operadora_vende_recargas || fila.DE_QUE_OPERADORA_VENDE_RECARGAS },
            { display_order: 17, respuesta: fila.elementos_actualmente_en_tienda || fila.ELEMENTOS_ACTUALMENTE_EN_TIENDA },
            { display_order: 18, respuesta: fila.elementos_colocados_en_visita || fila.ELEMENTOS_COLOCADOS_EN_VISITA },
            { display_order: 19, respuesta: fila.elemento_colocado || fila.ELEMENTO_COLOCADO },
            { display_order: 20, respuesta: fila.imagen_antes || fila.IMAGEN_ANTES },
            { display_order: 21, respuesta: fila.imagen_despues || fila.IMAGEN_DESPUES }
          ];

          // Eliminar respuestas existentes para este respondente
          await db_postgres.none(
            "DELETE FROM sur_answer WHERE respondent_id = $1",
            [respondentResult.id]
          );

          // Insertar nuevas respuestas
          for (const respuesta of respuestas) {
            if (respuesta.respuesta !== undefined && respuesta.respuesta !== null && respuesta.respuesta !== '') {
              const pregunta = preguntas.find(p => p.display_order === respuesta.display_order);
              
              if (pregunta) {
                let answerValue;
                
                // Formatear la respuesta según el tipo
                if (Array.isArray(respuesta.respuesta)) {
                  answerValue = JSON.stringify(respuesta.respuesta);
                } else if (typeof respuesta.respuesta === 'string' && 
                          (respuesta.respuesta.startsWith('[') || respuesta.respuesta.startsWith('{'))) {
                  // Ya es JSON
                  answerValue = respuesta.respuesta;
                } else if (typeof respuesta.respuesta === 'number') {
                  answerValue = String(respuesta.respuesta);
                } else {
                  // Para strings simples, envolver en comillas para JSON
                  answerValue = JSON.stringify(respuesta.respuesta);
                }

                await db_postgres.none(
                  `INSERT INTO sur_answer (question_id, respondent_id, user_id, answer)
                   VALUES ($1, $2, $3, $4::jsonb)`,
                  [pregunta.id, respondentResult.id, usuario.id, answerValue]
                );

                resultados.respuestas_insertadas++;
              }
            }
          }

        } catch (filaError) {
          console.error(`Error procesando fila ${i + 1}:`, filaError);
          resultados.errores.push({
            fila: i + 1,
            codigo: fila.codigo || fila.CODIGO || 'Sin código',
            error: filaError.message
          });
        }
      }

      res.json({
        ok: true,
        msg: "Carga masiva completada",
        resultados: {
          total_filas_procesadas: data.length,
          respondentes_insertados: resultados.respondentes_insertados,
          respuestas_insertadas: resultados.respuestas_insertadas,
          errores_encontrados: resultados.errores.length,
          errores: resultados.errores
        }
      });

    } catch (excelError) {
      console.error('Error procesando archivo Excel:', excelError);
      res.status(500).json({
        ok: false,
        msg: "Error al procesar el archivo Excel",
        error: excelError.message
      });
    } finally {
      // Limpiar archivo temporal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

  } catch (error) {
    console.error('Error en uploadMasiveSurveyFromExcel:', error);
    res.status(500).json({
      ok: false,
      msg: "Error en la carga masiva de encuestas",
      error: error.message
    });
  }
};

module.exports = {
  getSurveyTelefonica,
  getSurveyTelefonicaById,
  uploadSurveyTelefonica,
  uploadMasiveSurveyFromExcel,
  getProvincias,
  getTiposEncuesta,
  getTamanosLocal,
  getTiposNegocio,
  getElementosColocadosEnVisita
};

