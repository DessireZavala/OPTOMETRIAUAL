# config.py
import os

class Config:
    # Clave secreta PARA DESARROLLO - en producción usar variable de entorno
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'clave_super_secreta_para_desarrollo_2025_optometria_ual'
    
    # Configuración de la base de datos MySQL
    #SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/ual_optometria'
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuración de sesión CRÍTICA
    SESSION_COOKIE_SECURE = False  # False para desarrollo (HTTP)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hora en segundos
    REMEMBER_COOKIE_DURATION = 3600
    
    # Gabinetes disponibles
    GABINETES = [
        {'id': 1, 'nombre': 'Gabinete 1'},
        {'id': 2, 'nombre': 'Gabinete 2'},
        {'id': 3, 'nombre': 'Gabinete 3'},
        {'id': 4, 'nombre': 'Gabinete 4'},
        {'id': 5, 'nombre': 'Gabinete 5'},
        {'id': 6, 'nombre': 'Gabinete 6'},
    ]

    # Tipos de citas
    MOTIVOS_CITA = [
        {'id': 1, 'descripcion': 'Lentes graduados de armazón'},
        {'id': 2, 'descripcion': 'Lentes de contacto'},
    ]

    # Horarios de atención
    HORARIOS_ATENCION = [
        '12:30:00', '13:30:00', '14:30:00', '15:30:00'
    ]

MOTIVOS_CITA = [
    {'id': 1, 'descripcion': 'Lentes graduados de armazón'},
    {'id': 2, 'descripcion': 'Lentes de contacto'},
    {'id': 3, 'descripcion': 'Terapia visual'},  # NUEVO SERVICIO
]