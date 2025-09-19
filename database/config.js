const pgPromise = require("pg-promise");
require('dotenv').config();

// Configuración usando DATABASE_URL
const config = {
    //host: process.env.DB_HOST,
    //port: process.env.DB_PORT,
    //database: process.env.DB_NAME,
    //user: process.env.DB_USER,
    //password: process.env.DB_PASSWORD
    connectionString: process.env.DATABASE_URL
};

//console.log(`Conectando a la base de datos:`);
//console.log(`Host: ${config.host}, Puerto: ${config.port}, Base de datos: ${config.database}`);
//console.log(`DATABASE_URL: ${config.connectionString}`);

const pgp = pgPromise({});
const db_postgres = pgp(config);

db_postgres
    .connect()
    .then(() => console.log("DB Conectado!"))
    .catch((err) => console.error("Error al conectar con la base de datos", err));

exports.db_postgres = db_postgres;
