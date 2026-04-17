"""
小马分析系统 - 桌面版
打包脚本
"""
import os
import sys
import shutil
import subprocess

def build_frontend():
    """构建前端静态文件"""
    print("=" * 60)
    print("步骤1: 检查前端构建文件")
    print("=" * 60)
    
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    dist_dir = os.path.join(frontend_dir, 'dist')
    
    if os.path.exists(dist_dir) and os.listdir(dist_dir):
        print(f"✅ 前端构建文件已存在，跳过构建\n")
        return True
    
    print("前端文件不存在，开始构建...")
    print("提示：请确保已安装Node.js和npm")
    
    # 尝试查找npm
    npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
    
    try:
        result = subprocess.run([npm_cmd, 'run', 'build'], cwd=frontend_dir)
        if result.returncode != 0:
            print("⚠️  前端构建失败，但继续打包...")
            return False
        print("✅ 前端构建成功\n")
        return True
    except FileNotFoundError:
        print("⚠️  npm未找到，跳过前端构建")
        print("提示：如果已有dist目录，打包仍可进行\n")
        return False

def prepare_static_files():
    """将前端静态文件复制到后端"""
    print("=" * 60)
    print("步骤2: 准备静态文件")
    print("=" * 60)
    
    dist_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    
    if os.path.exists(static_dir):
        print("清理旧的静态文件...")
        shutil.rmtree(static_dir)
    
    print(f"复制前端文件到 {static_dir}...")
    shutil.copytree(dist_dir, static_dir)
    print("✅ 静态文件准备完成\n")

def create_windows_icon():
    """创建Windows图标（如果需要）"""
    print("=" * 60)
    print("步骤3: 准备应用图标")
    print("=" * 60)
    print("⚠️  提示：如需自定义图标，请在项目根目录放置 icon.ico 文件\n")

def install_dependencies():
    """安装打包所需的依赖"""
    print("=" * 60)
    print("步骤4: 安装打包依赖")
    print("=" * 60)
    
    required_packages = ['pyinstaller', 'flask', 'flask-cors', 'requests', 'sqlalchemy']
    
    print("检查并安装依赖包...")
    for package in required_packages:
        print(f"安装 {package}...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', package], 
                      capture_output=True)
    
    print("✅ 依赖安装完成\n")

def create_spec_file():
    """创建PyInstaller配置文件"""
    print("=" * 60)
    print("步骤5: 生成打包配置")
    print("=" * 60)
    
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('instance', 'instance'),
        ('frontend/dist', 'static'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'sqlalchemy',
        'requests',
        'financial_api',
        'models',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 创建一个带控制台的版本（调试用）
exe_debug = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='小马分析系统-调试版',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 显示控制台窗口（用于调试）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)

# 创建一个无控制台的版本（正式发布用）
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='小马分析系统',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # 不显示控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)
'''
    
    spec_path = os.path.join(os.path.dirname(__file__), 'stock_analysis.spec')
    with open(spec_path, 'w', encoding='utf-8') as f:
        f.write(spec_content)
    
    print("✅ 打包配置已生成\n")

def run_pyinstaller():
    """运行PyInstaller打包"""
    print("=" * 60)
    print("步骤6: 开始打包")
    print("=" * 60)
    
    # 直接使用pyinstaller命令打包，不使用spec文件
    # 这样可以更好地控制参数
    project_dir = os.path.dirname(__file__)
    
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=小马分析系统',
        '--noconfirm',
        '--onefile',  # 打包成单个exe
        '--windowed',  # 无控制台窗口
        '--add-data=static;static',  # Windows用分号
        '--add-data=instance;instance',
        '--hidden-import=flask',
        '--hidden-import=flask_cors',
        '--hidden-import=sqlalchemy',
        '--hidden-import=requests',
        '--hidden-import=financial_api',
        '--hidden-import=models',
        'app.py'
    ]
    
    print(f"执行命令: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=project_dir)
    if result.returncode != 0:
        print("打包失败！")
        sys.exit(1)
    
    print("✅ 打包成功\n")

def create_launcher():
    """创建启动脚本"""
    print("=" * 60)
    print("步骤7: 创建启动脚本")
    print("=" * 60)
    
    # 创建启动批处理文件
    bat_content = '''@echo off
chcp 65001 >nul
echo ============================================
echo    小马分析系统 - 启动中...
echo ============================================
echo.
echo 正在启动服务器...
echo 浏览器将自动打开 http://127.0.0.1:5000
echo.
echo 按 Ctrl+C 可以停止服务器
echo ============================================
echo.

start "" http://127.0.0.1:5000

"小马分析系统.exe"

pause
'''
    
    bat_path = os.path.join(os.path.dirname(__file__), '启动小马分析系统.bat')
    with open(bat_path, 'w', encoding='gbk') as f:
        f.write(bat_content)
    
    print("✅ 启动脚本已创建\n")

def cleanup():
    """清理临时文件"""
    print("=" * 60)
    print("步骤8: 清理临时文件")
    print("=" * 60)
    
    dirs_to_clean = ['build', '__pycache__']
    files_to_clean = ['debug_longhubang.py', 'test_longhubang.py']
    
    for dir_name in dirs_to_clean:
        dir_path = os.path.join(os.path.dirname(__file__), dir_name)
        if os.path.exists(dir_path):
            print(f"删除 {dir_name}/...")
            shutil.rmtree(dir_path)
    
    for file_name in files_to_clean:
        file_path = os.path.join(os.path.dirname(__file__), file_name)
        if os.path.exists(file_path):
            print(f"删除 {file_name}...")
            os.remove(file_path)
    
    print("✅ 清理完成\n")

def show_final_info():
    """显示最终信息"""
    print("\n" + "=" * 60)
    print("🎉 打包完成！")
    print("=" * 60)
    
    dist_path = os.path.join(os.path.dirname(__file__), 'dist', '小马分析系统.exe')
    
    if os.path.exists(dist_path):
        print(f"✅ 可执行文件位置: {dist_path}")
        print(f"📦 文件大小: {os.path.getsize(dist_path) / 1024 / 1024:.2f} MB")
    
    print("\n📋 使用说明:")
    print("  1. 运行 '启动小马分析系统.bat' 启动软件")
    print("  2. 浏览器会自动打开系统界面")
    print("  3. 关闭控制台窗口即可退出系统")
    
    print("\n📁 文件结构:")
    print("  dist/小马分析系统.exe  - 主程序（可单独运行）")
    print("  启动小马分析系统.bat   - 便捷启动脚本")
    print("  instance/stocks.db     - 数据库文件")
    
    print("\n🚀 如何分享给其他人:")
    print("  方式1: 直接发送 dist/小马分析系统.exe")
    print("  方式2: 打包整个 dist 文件夹为压缩包")
    print("  方式3: 使用 Inno Setup 创建安装程序")
    
    print("\n" + "=" * 60)

def main():
    """主流程"""
    print("\n" + "=" * 60)
    print("📦 小马分析系统 - 打包工具")
    print("=" * 60 + "\n")
    
    try:
        build_frontend()
        prepare_static_files()
        create_windows_icon()
        install_dependencies()
        create_spec_file()
        run_pyinstaller()
        create_launcher()
        cleanup()
        show_final_info()
    except Exception as e:
        print(f"\n❌ 打包失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
