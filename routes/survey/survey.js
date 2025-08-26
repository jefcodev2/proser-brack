/*
    Ruta: /api/survey
*/
const { Router } = require('express');
const { validarJWT } = require('../../middlewares/validar-jwt');
const { validarPermisos } = require('../../middlewares/validar-permisos');

const { 
  getSurveyTelefonica, 
  getSurveyTelefonicaById,
} = require('../../controller/survey/survey');

const router = Router();

// Obtener lista de encuestas telefónicas con paginación
router.get('/telefonica', getSurveyTelefonica);

// Obtener encuesta telefónica por ID
router.get('/telefonica/:id', getSurveyTelefonicaById);

module.exports = router;
