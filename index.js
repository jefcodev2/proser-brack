require('dotenv').config()

const express = require('express')
const cors = require('cors')

// Crear servidor express
const app = express();

// Configuración cors
app.use(cors());

// Lectura y parseo del body
app.use(express.json());

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});

// Core
app.use('/api/v1/login/', require('./routes/auth'));
    
// users
app.use('/api/v1/usuarios', require('./routes/seguridad/usuarios'));

// survey
app.use('/api/v1/survey', require('./routes/survey/survey'));


app.listen(process.env.PORT, () => {
    console.log('Servidor corriendo en puerto ' + process.env.PORT)
})