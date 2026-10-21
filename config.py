# config.py
# Configuración para desarrollo local.
# Los datos sensibles (clave secreta, conexión a la base de datos y contraseñas
# de los usuarios iniciales) se leen del archivo .env, que NO se sube al repositorio.
# Usa .env.example como plantilla.
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')

    # Base de datos MySQL local (ver DATABASE_URL en .env)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 'mysql+pymysql://root:@localhost/ual_optometria'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Contraseñas de los usuarios que se crean al inicializar la base de datos
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
    COORDINADOR_PASSWORD = os.environ.get('COORDINADOR_PASSWORD')
    OPTOMETRISTA_PASSWORD = os.environ.get('OPTOMETRISTA_PASSWORD')

    # Sesión: SESSION_COOKIE_SECURE va en False porque en local se usa HTTP
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
