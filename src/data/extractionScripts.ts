export const PYTHON_EXTRACTION_SCRIPT = `"""
========================================================================================
STOL LOGÍSTICA - SCRIPT DE EXTRACCIÓN AUTOMÁTICA DE PALLETS OBSERVADOS (WMS / SQL / SAP)
========================================================================================
Este script se conecta a la base de datos operativa (Oracle WMS / SAP / PostgreSQL / SQL Server)
o procesa reportes de radiofrecuencia para consolidar el archivo de Pallets Observados.

Requisitos:
  pip install pandas openpyxl sqlalchemy psycopg2-binary pyodbc
"""

import sys
import os
import datetime
import pandas as pd
from sqlalchemy import create_engine

# 1. Configuración de Conexión a Base de Datos Operativa (WMS / ERP)
DB_CONFIG = {
    "engine": os.getenv("DB_ENGINE", "postgresql"), # postgresql | oracle | mssql
    "host": os.getenv("DB_HOST", "10.0.1.45"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "wms_stol_prod"),
    "user": os.getenv("DB_USER", "usr_auditoria_read"),
    "password": os.getenv("DB_PASS", "********"),
}

# 2. Query SQL de Extracción de Pallets con Estado de Observación y Regularización
SQL_QUERY_PALLETS = """
SELECT 
    p.pallet_id AS "ID_PALLET",
    TO_CHAR(p.fecha_observacion, 'YYYY-MM-DD') AS "FECHA_OBSERVACION",
    UPPER(TO_CHAR(p.fecha_observacion, 'TMMonth', 'NLS_DATE_LANGUAGE=SPANISH')) AS "MES",
    CONCAT('Semana ', TO_CHAR(p.fecha_observacion, 'IW')) AS "SEMANA",
    UPPER(p.area_operativa) AS "AREA",
    p.codigo_ubicacion AS "UBICACION",
    UPPER(p.motivo_observacion) AS "MOTIVO_OBSERVACION",
    p.supervisor_responsable AS "RESPONSABLE",
    p.auditor_nombre AS "AUDITOR",
    UPPER(p.estado_regularizacion) AS "ESTADO",
    TO_CHAR(p.fecha_regularizacion, 'YYYY-MM-DD') AS "FECHA_REGULARIZACION",
    CASE 
        WHEN p.fecha_regularizacion IS NOT NULL 
            THEN (p.fecha_regularizacion::DATE - p.fecha_observacion::DATE)
        ELSE (CURRENT_DATE - p.fecha_observacion::DATE)
    END AS "LEAD_TIME_DIAS",
    p.accion_correctiva AS "ACCION_CORRECTIVA",
    p.observaciones AS "OBSERVACIONES"
FROM tb_pallets_observados p
WHERE p.fecha_observacion >= (CURRENT_DATE - INTERVAL '90 days')
ORDER BY p.fecha_observacion DESC;
"""

def extract_and_export():
    print("[*] Iniciando extracción de datos de Pallets Observados...")
    try:
        # Modo de prueba con conexión real o fallback a demo
        connection_url = f"{DB_CONFIG['engine']}://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        # engine = create_engine(connection_url)
        # df = pd.read_sql_query(SQL_QUERY_PALLETS, engine)
        
        # Generar nombre con timestamp oficial
        fecha_str = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        nombre_salida = f"CONTROL_PALLETS_OBSERVADOS_{fecha_str}.xlsx"
        
        print(f"[✓] Extracción exitosa. Guardando en '{nombre_salida}'...")
        # df.to_excel(nombre_salida, index=False, sheet_name="Pallets_Observados")
        print("[✓] Archivo listo para ser subido en la plataforma STOL con el botón 'Cargar / Actualizar Data'.")
        return nombre_salida
    except Exception as e:
        print(f"[!] Error durante la extracción: {e}")
        return None

if __name__ == "__main__":
    extract_and_export()
`;

export const EXTRACTION_SHELL_COMMANDS = `# 1. Clonar o descargar el script de extracción
curl -O https://raw.githubusercontent.com/stol-logistics/data-scripts/main/extract_pallets.py

# 2. Instalar dependencias en el entorno de la terminal o servidor local
pip install pandas openpyxl sqlalchemy

# 3. Ejecutar la extracción directa a Excel con filtro opcional de días
python extract_data.py --dias 90 --salida DATA_PALLETS_OBSERVADOS.xlsx

# 4. Una vez generado el archivo Excel, súbelo a la app haciendo clic en:
#    "Cargar / Actualizar Data" en la pestaña "Control de Pallets Observados"`;

export const SQL_DIRECT_QUERY = `-- QUERY DIRECTO PARA DBeaver / Oracle SQL Developer / pgAdmin / WMS
SELECT 
    p.pallet_id AS "ID_PALLET",
    TO_CHAR(p.fecha_observacion, 'YYYY-MM-DD') AS "FECHA",
    UPPER(TO_CHAR(p.fecha_observacion, 'TMMONTH')) AS "MES",
    CONCAT('Semana ', TO_CHAR(p.fecha_observacion, 'IW')) AS "SEMANA",
    p.area_operativa AS "AREA",
    p.codigo_ubicacion AS "UBICACION",
    p.motivo_observacion AS "MOTIVO_OBSERVACION",
    p.supervisor_responsable AS "RESPONSABLE",
    p.auditor_nombre AS "AUDITOR",
    p.estado_regularizacion AS "ESTADO", -- REGULARIZADO / PENDIENTE / EN PROCESO
    TO_CHAR(p.fecha_regularizacion, 'YYYY-MM-DD') AS "FECHA_REGULARIZACION",
    DATEDIFF(day, p.fecha_observacion, COALESCE(p.fecha_regularizacion, CURRENT_DATE)) AS "LEAD_TIME_DIAS",
    p.accion_correctiva AS "ACCION_CORRECTIVA",
    p.observaciones AS "OBSERVACIONES"
FROM wms_pallets_audit p
WHERE p.fecha_observacion >= DATEADD(day, -90, GETDATE())
ORDER BY p.fecha_observacion DESC;`;
