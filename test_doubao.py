"""
豆包API调试脚本
"""
from openai import OpenAI

# 配置
API_KEY = '276abc6a-4c29-4789-811e-33c559616804'
BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

print("="*60)
print("豆包API调试")
print("="*60)

# 初始化客户端
print("\n1. 初始化客户端...")
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)
print("✓ 客户端初始化成功")

# 测试1：列出可用模型
print("\n2. 列出可用模型...")
try:
    models = client.models.list()
    print(f"✓ 成功获取模型列表，共 {len(models.data)} 个模型")
    print("\n可用模型:")
    for m in models.data:
        print(f"  - {m.id}")
except Exception as e:
    print(f"✗ 失败: {str(e)}")

# 测试2：尝试不同的模型ID
print("\n3. 尝试不同的模型ID...")
model_ids = [
    'deepseek-r1-distill-qwen-32b-250120',  # DeepSeek-R1（需开通）
    'deepseek-v3-250324',                   # DeepSeek-V3（显示已开通但404）
    'doubao-lite-32k-240428',               # 豆包Lite 32K（早期版本）
    'doubao-pro-4k-240515',                 # 豆包Pro 4K（2024年5月）
    'doubao-pro-32k-240515',                # 豆包Pro 32K（2024年5月）
    'doubao-lite-4k-240328',                # 豆包Lite 4K（最早版本）
]

for model_id in model_ids:
    print(f"\n  尝试: {model_id}")
    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {
                    'role': 'user',
                    'content': '你好'
                }
            ],
            max_tokens=50
        )
        print(f"  ✓ 成功: {response.choices[0].message.content}")
        print(f"\n  ⭐ 推荐使用此模型！")
        break
    except Exception as e:
        print(f"  ✗ 失败: {str(e)[:200]}")

print("\n" + "="*60)
print("提示：如果所有模型都404，请在火山方舟控制台点击「开通」")
print("或者使用阿里云AI（已配置好，功能完整）")
print("="*60)

print("\n" + "="*60)
print("调试完成")
print("="*60)
