/*
    Ruta: /api/survey
*/
const { Router } = require('express');
const { validarJWT } = require('../../middlewares/validar-jwt');
const { validarPermisos } = require('../../middlewares/validar-permisos');

const { 
  getSurveyTelefonica, 
  getSurveyTelefonicaById,
  uploadMasiveSurveyFromExcel,
  getProvincias,
  getTiposEncuesta,
  getTamanosLocal,
  getTiposNegocio,
  getElementosColocadosEnVisita,
  getAreasGeograficas,
  getElementosColocados,
  getMesesDisponibles
} = require('../../controller/survey/survey');

const multer = require('multer');
const path = require('path');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Asegurar que la carpeta uploads existe
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Solo permitir archivos Excel
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

const router = Router();

// Obtener lista de encuestas telefónicas con paginación
router.get('/telefonica', getSurveyTelefonica);

// Obtener encuesta telefónica por ID
router.get('/telefonica/:id', getSurveyTelefonicaById);

// Carga masiva desde archivo Excel
router.post('/upload-masivo-excel', upload.single('excel'), uploadMasiveSurveyFromExcel);

// Rutas para obtener opciones de filtros
router.get('/provincias', getProvincias);
router.get('/tipos-encuesta', getTiposEncuesta);
router.get('/tamanos-local', getTamanosLocal);
router.get('/tipos-negocio', getTiposNegocio);
router.get('/elementos-colocados-en-visita', getElementosColocadosEnVisita);
router.get('/areas-geograficas', getAreasGeograficas);
router.get('/elementos-colocados', getElementosColocados);
router.get('/meses-disponibles', getMesesDisponibles);

module.exports = router;
