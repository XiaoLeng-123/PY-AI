"""
用户认证路由蓝图
提供注册、登录、Token刷新、用户信息管理等功能
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, create_access_token, create_refresh_token,
    get_jwt_identity, get_jwt
)
from app.models.models import db, User
from datetime import datetime
from functools import wraps
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Token黑名单（生产环境建议用Redis）
token_blacklist = set()


def admin_required(fn):
    """管理员权限装饰器 - 必须在 @jwt_required() 之后使用"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': '需要管理员权限', 'code': 'admin_required'}), 403
        return fn(*args, **kwargs)
    return wrapper


@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    nickname = data.get('nickname', '').strip()
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return jsonify({'error': '用户名需3-20位，仅支持字母、数字和下划线'}), 400
    if len(password) < 6:
        return jsonify({'error': '密码长度至少6位'}), 400
    if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'error': '邮箱格式不正确'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 409
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': '邮箱已被注册'}), 409
    
    user = User(username=username, email=email or None, nickname=nickname or username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': '注册成功', 'user': user.to_dict(),
        'access_token': access_token, 'refresh_token': refresh_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if not user or not user.check_password(password):
        return jsonify({'error': '用户名或密码错误'}), 401
    if not user.is_active:
        return jsonify({'error': '账号已被禁用，请联系管理员'}), 403
    
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': '登录成功', 'user': user.to_dict(),
        'access_token': access_token, 'refresh_token': refresh_token
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """刷新Access Token"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_active:
        return jsonify({'error': '用户不存在或已被禁用'}), 401
    access_token = create_access_token(identity=current_user_id)
    return jsonify({'access_token': access_token, 'user': user.to_dict()})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """获取当前用户信息"""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """更新用户信息"""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    data = request.json
    if 'nickname' in data:
        user.nickname = data['nickname'].strip() or user.username
    if 'email' in data:
        new_email = data['email'].strip()
        if new_email and new_email != user.email:
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', new_email):
                return jsonify({'error': '邮箱格式不正确'}), 400
            if User.query.filter(User.email == new_email, User.id != user.id).first():
                return jsonify({'error': '邮箱已被其他用户使用'}), 409
            user.email = new_email
    if 'avatar' in data:
        user.avatar = data['avatar']
    db.session.commit()
    return jsonify({'message': '更新成功', 'user': user.to_dict()})


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """修改密码"""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    data = request.json
    if not user.check_password(data.get('old_password', '')):
        return jsonify({'error': '旧密码错误'}), 401
    if len(data.get('new_password', '')) < 6:
        return jsonify({'error': '新密码长度至少6位'}), 400
    user.set_password(data['new_password'])
    db.session.commit()
    token_blacklist.add(get_jwt()['jti'])
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        'message': '密码修改成功', 'access_token': access_token, 'refresh_token': refresh_token
    })


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """退出登录"""
    token_blacklist.add(get_jwt()['jti'])
    return jsonify({'message': '已退出登录'})


# ==================== 管理员接口 ====================

@auth_bp.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_users():
    """管理员：获取所有用户列表"""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]})


@auth_bp.route('/admin/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_user_role(user_id):
    """管理员：修改用户角色"""
    user = User.query.get_or_404(user_id)
    data = request.json
    new_role = data.get('role', 'user')
    if new_role not in ('admin', 'user'):
        return jsonify({'error': '无效的角色，只支持 admin/user'}), 400
    user.role = new_role
    db.session.commit()
    return jsonify({'message': f'用户 {user.username} 角色已更新为 {new_role}', 'user': user.to_dict()})


@auth_bp.route('/admin/users/<int:user_id>/toggle-active', methods=['PUT'])
@jwt_required()
@admin_required
def admin_toggle_user_active(user_id):
    """管理员：启用/禁用用户"""
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    status = '启用' if user.is_active else '禁用'
    return jsonify({'message': f'用户 {user.username} 已{status}', 'user': user.to_dict()})
