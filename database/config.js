const pgPromise = require("pg-promise");
require('dotenv').config();

// Función para obtener la configuración según el entorno
const getConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'development':
            return {
                host: process.env.DB_HOST_DEV ,
                port: process.env.DB_PORT_DEV ,
                database: process.env.DB_NAME_DEV ,
                user: process.env.DB_USER_DEV ,
                password: process.env.DB_PASSWORD_DEV 
            };
        
        case 'test':
            return {
                host: process.env.DB_HOST_TEST ,
                port: process.env.DB_PORT_TEST ,
                database: process.env.DB_NAME_TEST ,
                user: process.env.DB_USER_TEST ,
                password: process.env.DB_PASSWORD_TEST 
            };
        
        case 'production':
            return {
                host: process.env.DB_HOST_PROD ,
                port: process.env.DB_PORT_PROD ,
                database: process.env.DB_NAME_PROD ,
                user: process.env.DB_USER_PROD ,
                password: process.env.DB_PASSWORD_PROD 
            };
        
        default:
            console.warn(`Entorno no reconocido: ${env}. Usando configuración de desarrollo.`);
            return {
                host: process.env.DB_HOST_DEV ,
                port: process.env.DB_PORT_DEV ,
                database: process.env.DB_NAME_DEV ,
                user: process.env.DB_USER_DEV ,
                password: process.env.DB_PASSWORD_DEV 
            };
    }
};

const config = getConfig();

if (process.env.NODE_ENV === 'development') {
    console.log(`Conectando a la base de datos en entorno: ${process.env.NODE_ENV}`);
    console.log(`Host: ${config.host}, Puerto: ${config.port}, Base de datos: ${config.database}`);
}

const pgp = pgPromise({});
const db_postgres = pgp(config);

db_postgres
    .connect()
    .then(() => console.log("DB Conectado!"))
    .catch((err) => console.error("Error al conectar con la base de datos", err));

exports.db_postgres = db_postgres;
