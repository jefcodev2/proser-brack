require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// rutas
app.use('/api/v1/login/', require('./routes/auth'));
app.use('/api/v1/usuarios', require('./routes/seguridad/usuarios'));
app.use('/api/v1/survey', require('./routes/survey/survey'));

// manejador de errores (al final)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});

// escucha local / contenedor; en Vercel no necesitas definir PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Servidor corriendo en puerto ' + port);
});
