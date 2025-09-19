CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

drop table if exists USERS cascade;
drop table if exists sur_surveys cascade;
drop table if exists data_types cascade;
drop table if exists sur_questions cascade;
drop table if exists sur_respondent cascade;
drop table if exists sur_answer cascade;


-------------------------------------------
-- CREATE TABLAS SURVEY
-------------------------------------------

create table users (
 id UUID primary key default  uuid_generate_v4(),
 username varchar(20) not null, 
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN email varchar(200) ,
ADD COLUMN password varchar(200);

create table sur_surveys (
 id UUID primary key default  uuid_generate_v4(),
 name varchar(255) not null,
 description varchar (255),
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

create table data_types (
 id UUID primary key default  uuid_generate_v4(),
 code varchar (255),
 label varchar (255),
 description varchar (255),
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

create table sur_questions (
 id UUID primary key default  uuid_generate_v4(),
 text varchar(255) not null,
 display_order int , 
 required boolean, 
 type_id  uuid not null,
 survey_id uuid not null,
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);



create table sur_respondent (
 id UUID primary key default  uuid_generate_v4(),
 code varchar (20),
 name varchar (100),
 business_type varchar(255),
 survey_type varchar (100),
 business_group varchar (50),
 main_street varchar(255),
 secondary_street varchar(255),
 nomenclature varchar(255),
 geo_area varchar(255),
 latitud varchar(255),
 longitud varchar(255),
 province varchar(255),
 canton varchar(255),
 parish varchar(255),
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

create table sur_answer (
 id UUID primary key default  uuid_generate_v4(),
 question_id uuid not null,
 respondent_id uuid not null,
 user_id uuid not null,
 answer jsonb not null,
 created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
 updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);



-- 1) Agregar FKs a sur_questions
ALTER TABLE sur_questions
  -- Cada pregunta apunta a una encuesta existente
  ADD CONSTRAINT fk_sur_questions_surveys
    FOREIGN KEY (survey_id)
    REFERENCES sur_surveys(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  -- Cada pregunta debe tener un tipo válido
  ADD CONSTRAINT fk_sur_questions_datatypes
    FOREIGN KEY (type_id)
    REFERENCES data_types(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

-- 2) Agregar FKs a sur_answer
ALTER TABLE sur_answer
  -- Cada respuesta al menos debe vincularse a una pregunta válida
  ADD CONSTRAINT fk_sur_answer_questions
    FOREIGN KEY (question_id)
    REFERENCES sur_questions(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  -- Cada respuesta debe venir de un respondente registrado
  ADD CONSTRAINT fk_sur_answer_respondents
    FOREIGN KEY (respondent_id)
    REFERENCES sur_respondent(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  -- Y haber sido registrada por un usuario del sistema
  ADD CONSTRAINT fk_sur_answer_users
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;


----------------------------------------
-- INGRESO DE PREGUNTAS ENCUESTA
----------------------------------------


-- 1) Insertar el usuario que registrará las respuestas
INSERT INTO users (username)
VALUES ('encuestador1');


-- 2) Insertar la encuesta
INSERT INTO sur_surveys (name, description)
VALUES ('Encuesta General de Tiendas', 'Encuesta para evaluar chips y recargas');


-- 3) Insertar los tipos de respuesta
INSERT INTO data_types (code, label, description)
VALUES
  ('decimal',      'Decimal',            'Valores numéricos con decimales'),
  ('url',          'URL (imagen)',       'Enlace a imagen'),
  ('select',       'Selección única',    'Lista desplegable o radio'),
  ('multi select', 'Selección múltiple', 'Checkboxes'),
  ('txt',          'Texto libre',        'Campo de texto');


-- 4) Se insertan las preguntas
INSERT INTO sur_questions (text, display_order, required, type_id, survey_id)
SELECT
  vals.text,
  vals.display_order,
  vals.required,
  dt.id,                               -- corresponde a data_types.code = vals.code
  s.id                                 -- corresponde a sur_surveys.name
FROM (
  VALUES
    ('¿Vende Chips?',                                            1, TRUE,  'select'),
    ('¿De qué operadora vende chips?',                            2, TRUE,  'select'),
    ('¿A qué valor compra usted la simcard de Movistar?',        3, TRUE,  'decimal'),
    ('¿A qué valor vende la simcard de Movistar?',               4, TRUE,  'decimal'),
    ('¿A qué valor compra usted la simcard de Tuenti?',          5, TRUE,  'decimal'),
    ('¿A qué valor vende la simcard de Tuenti?',                 6, TRUE,  'decimal'),
    ('¿A qué valor compra usted la simcard de Claro?',           7, TRUE,  'decimal'),
    ('¿A qué valor vende la simcard de Claro?',                  8, TRUE,  'decimal'),
    ('¿A qué valor compra usted la simcard de CNT?',             9, TRUE,  'decimal'),
    ('¿A qué valor vende la simcard de CNT?',                    10, TRUE,  'decimal'),
    ('¿De 10 chips que usted vende en su negocio, cuántos son Movistar?', 11, TRUE, 'decimal'),
    ('¿De 10 chips que usted vende en su negocio, cuántos son Tuenti?',   12, TRUE, 'decimal'),
    ('¿Al momento de la encuesta, cuántos chips de Movistar dispone?',   13, TRUE, 'decimal'),
    ('¿Al momento de la encuesta, cuántos chips de Tuenti dispone?',     14, TRUE, 'decimal'),
    ('¿Vende recargas?',                                           15, TRUE,  'select'),
    ('¿De qué operadora vende recargas?',                         16, TRUE,  'select'),
    ('¿Qué elementos tiene la tienda al momento de la visita?',   17, FALSE, 'multi select'),
    ('¿Qué elementos se colocaron durante la visita?',           18, FALSE, 'multi select'),
    ('Elementos colocados',                                      19, FALSE, 'select'),
    ('Inserte imagen antes',                                      20, FALSE, 'url'),
    ('Inserte imagen después',                                    21, FALSE, 'url')
) AS vals(text, display_order, required, code)
JOIN data_types dt ON dt.code = vals.code
JOIN sur_surveys s  ON s.name = 'Encuesta General de Tiendas';



ALTER TABLE sur_respondent
ADD COLUMN business_size varchar(255);


-------------------------------------------
-- CREATE VIEW TELEFONICA
-------------------------------------------


CREATE VIEW survey_telefonica AS
SELECT
  r.code             AS codigo,
  r.name             AS nombre,
  r.business_type    AS tipo_negocio,
  r.survey_type      AS tipo_encuesta,
  r.business_size    AS tamano_local,
  r.business_group   AS grupo_negocio,
  r.main_street      AS calle_principal,
  r.secondary_street AS calle_secundaria,
  r.nomenclature     AS nomenclatura,
  r.geo_area         AS area_geografica,
  r.latitud          AS latitud,
  r.longitud         AS longitud,
  r.province         AS provincia,
  r.canton           AS canton,
  r.parish           AS parroquia,
  MAX(CASE WHEN q.display_order =  1 THEN a.answer::text END)  AS vende_chips,
  MAX(CASE WHEN q.display_order =  2 THEN a.answer::text END)  AS de_que_operadora_vende_chips,
  MAX(CASE WHEN q.display_order =  3 THEN a.answer::text END)  AS valor_compra_simcard_movistar,
  MAX(CASE WHEN q.display_order =  4 THEN a.answer::text END)  AS valor_venta_simcard_movistar,
  MAX(CASE WHEN q.display_order =  5 THEN a.answer::text END)  AS valor_compra_simcard_tuenti,
  MAX(CASE WHEN q.display_order =  6 THEN a.answer::text END)  AS valor_venta_simcard_tuenti,
  MAX(CASE WHEN q.display_order =  7 THEN a.answer::text END)  AS valor_compra_simcard_claro,
  MAX(CASE WHEN q.display_order =  8 THEN a.answer::text END)  AS valor_venta_simcard_claro,
  MAX(CASE WHEN q.display_order =  9 THEN a.answer::text END)  AS valor_compra_simcard_cnt,
  MAX(CASE WHEN q.display_order = 10 THEN a.answer::text END)  AS valor_venta_simcard_cnt,
  MAX(CASE WHEN q.display_order = 11 THEN a.answer::text END)  AS proporcion_chips_movistar,
  MAX(CASE WHEN q.display_order = 12 THEN a.answer::text END)  AS proporcion_chips_tuenti,
  MAX(CASE WHEN q.display_order = 13 THEN a.answer::text END)  AS stock_actual_movistar,
  MAX(CASE WHEN q.display_order = 14 THEN a.answer::text END)  AS stock_actual_tuenti,
  MAX(CASE WHEN q.display_order = 15 THEN a.answer::text END)  AS vende_recargas,
  MAX(CASE WHEN q.display_order = 16 THEN a.answer::text END)  AS de_que_operadora_vende_recargas,
  MAX(CASE WHEN q.display_order = 17 THEN a.answer::text END)  AS elementos_actualmente_en_tienda,
  MAX(CASE WHEN q.display_order = 18 THEN a.answer::text END)  AS elementos_colocados_en_visita,
  MAX(CASE WHEN q.display_order = 19 THEN a.answer::text END)  AS elemento_colocado,
  MAX(CASE WHEN q.display_order = 20 THEN a.answer::text END)  AS imagen_antes,
  MAX(CASE WHEN q.display_order = 21 THEN a.answer::text END)  AS imagen_despues,
  r.created_at  AS fecha
FROM sur_respondent r
JOIN sur_answer    a ON a.respondent_id = r.id
JOIN sur_questions q ON q.id            = a.question_id
GROUP BY r.id
ORDER BY r.code;




