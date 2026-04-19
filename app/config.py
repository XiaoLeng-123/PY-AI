"""
应用配置模块
"""
import os
import sys
from dotenv import load_dotenv

# 加载 .env 环境变量
load_dotenv()


def get_base_path():
    """获取程序运行的基础路径"""
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
        internal_path = os.path.join(base, '_internal')
        if os.path.exists(internal_path):
            return internal_path
        return base
    else:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


BASE_PATH = get_base_path()

# 静态文件路径
if getattr(sys, 'frozen', False):
    STATIC_PATH = os.path.join(BASE_PATH, 'static')
else:
    STATIC_PATH = os.path.join(BASE_PATH, 'static')


class Config:
    """应用配置类"""
    
    # Flask 配置
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'xiaoma_analysis_secret_key_2026')
    
    # JWT 配置
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_xiaoma_secret_key_2026_super_secure')
    JWT_ACCESS_TOKEN_EXPIRES = 1800  # Access Token 30分钟过期
    JWT_REFRESH_TOKEN_EXPIRES = 604800  # Refresh Token 7天过期
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # 数据库配置 - MySQL
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@127.0.0.1:3306/stock_analysis?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True
    }
    
    # AI 配置 - 阿里云百炼
    AI_API_KEY = os.getenv('ALIYUN_API_KEY', 'sk-dac7de24ee3a4f6ea4bd557197e98972')
    AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    
    # 豆包API配置
    DOUBAO_API_KEY = os.getenv('DOUBAO_API_KEY', '276abc6a-4c29-4789-811e-33c559616804')
    DOUBAO_MODEL = 'deepseek-v3-2-251201'
    DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
    
    # 密码安全配置
    BCRYPT_LOG_ROUNDS = 12
    
    # 文件上传配置
    UPLOAD_FOLDER = os.path.join(BASE_PATH, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
