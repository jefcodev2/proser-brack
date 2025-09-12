const pgPromise = require("pg-promise");
require('dotenv').config();

// Función para obtener la configuración según el entorno
const getConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    
    // Para Vercel y otros servicios de despliegue, usar DATABASE_URL si está disponible
    if (process.env.DATABASE_URL) {
        console.log('Usando DATABASE_URL para la conexión');
        return process.env.DATABASE_URL;
    }
    
    switch (env) {
        case 'development':
            return {
                host: process.env.DB_HOST_DEV,
                port: process.env.DB_PORT_DEV,
                database: process.env.DB_NAME_DEV,
                user: process.env.DB_USER_DEV,
                password: process.env.DB_PASSWORD_DEV
            };
        
        case 'test':
            return {
                host: process.env.DB_HOST_TEST,
                port: process.env.DB_PORT_TEST,
                database: process.env.DB_NAME_TEST,
                user: process.env.DB_USER_TEST,
                password: process.env.DB_PASSWORD_TEST
            };
        
        case 'production':
            // Si no hay DATABASE_URL, usar variables individuales
            if (process.env.DB_HOST_PROD) {
                return {
                    host: process.env.DB_HOST_PROD,
                    port: process.env.DB_PORT_PROD,
                    database: process.env.DB_NAME_PROD,
                    user: process.env.DB_USER_PROD,
                    password: process.env.DB_PASSWORD_PROD
                };
            }
            // Fallback a DATABASE_URL si está disponible
            if (process.env.DATABASE_URL) {
                return process.env.DATABASE_URL;
            }
            throw new Error('No se encontró configuración de base de datos para producción');
        
        default:
            console.warn(`Entorno no reconocido: ${env}. Usando configuración de desarrollo.`);
            return {
                host: process.env.DB_HOST_DEV,
                port: process.env.DB_PORT_DEV,
                database: process.env.DB_NAME_DEV,
                user: process.env.DB_USER_DEV,
                password: process.env.DB_PASSWORD_DEV
            };
    }
};

const config = getConfig();

if (process.env.NODE_ENV === 'development') {
    console.log(`Conectando a la base de datos en entorno: ${process.env.NODE_ENV}`);
    if (typeof config === 'string') {
        console.log('Usando DATABASE_URL');
    } else {
        console.log(`Host: ${config.host}, Puerto: ${config.port}, Base de datos: ${config.database}`);
    }
}

// Configuración de pg-promise con opciones adicionales para producción
const pgpOptions = {
    // Configuración para entornos de producción
    ...(process.env.NODE_ENV === 'production' && {
        // Configuración de pool de conexiones para producción
        max: 20, // máximo de conexiones en el pool
        idleTimeoutMillis: 30000, // tiempo de inactividad antes de cerrar conexión
        connectionTimeoutMillis: 2000, // tiempo de espera para nueva conexión
    })
};

const pgp = pgPromise(pgpOptions);
const db_postgres = pgp(config);

// Función para verificar la conexión
const testConnection = async () => {
    try {
        await db_postgres.connect();
        console.log("✅ Base de datos conectada exitosamente!");
        return true;
    } catch (err) {
        console.error("❌ Error al conectar con la base de datos:", err.message);
        return false;
    }
};

// Verificar conexión al inicializar
testConnection();

exports.db_postgres = db_postgres;
exports.testConnection = testConnection;
