"""
AI Location Agent - 使用云端大模型识别图片地理位置
支持 Google Gemini 2.5 Flash API 和 OpenAI GPT-4o Vision API
"""
import os
import base64
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class LocationAgent:
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-sonnet-4-5", provider: str = "anthropic", base_url: Optional[str] = None):
        """
        初始化 Location Agent

        Args:
            api_key: API Key (如果不提供，从环境变量读取)
            model: 使用的模型，默认 claude-sonnet-4-5
            provider: API 提供商，"gemini"、"openai" 或 "anthropic"
            base_url: 自定义 API 地址（用于中转站），如果不提供则使用官方地址
        """
        self.provider = provider
        self.model = model

        if provider == "gemini":
            self.api_key = api_key or os.getenv("GEMINI_API_KEY")
            if not self.api_key:
                raise ValueError("未找到 GEMINI_API_KEY，请在 .env 文件或数据库中配置")
            if base_url:
                base_url = base_url.rstrip('/')
                if '/models/' in base_url:
                    # 如果已经包含完整路径，直接使用
                    self.api_url = f"{base_url}?key={self.api_key}"
                elif base_url.endswith('/v1beta'):
                    self.api_url = f"{base_url}/models/{model}:generateContent?key={self.api_key}"
                else:
                    self.api_url = f"{base_url}/v1beta/models/{model}:generateContent?key={self.api_key}"
            else:
                self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        elif provider == "anthropic":
            self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not self.api_key:
                raise ValueError("未找到 ANTHROPIC_API_KEY，请在 .env 文件或数据库中配置")
            if base_url:
                base_url = base_url.rstrip('/')
                if base_url.endswith('/v1/messages'):
                    self.api_url = base_url
                elif base_url.endswith('/v1'):
                    self.api_url = f"{base_url}/messages"
                else:
                    self.api_url = f"{base_url}/v1/messages"
            else:
                self.api_url = "https://api.anthropic.com/v1/messages"
        else:  # openai
            self.api_key = api_key or os.getenv("OPENAI_API_KEY")
            if not self.api_key:
                raise ValueError("未找到 OPENAI_API_KEY，请在 .env 文件或数据库中配置")
            if base_url:
                base_url = base_url.rstrip('/')
                if base_url.endswith('/v1/chat/completions'):
                    self.api_url = base_url
                elif base_url.endswith('/chat/completions'):
                    self.api_url = base_url
                elif base_url.endswith('/v1'):
                    self.api_url = f"{base_url}/chat/completions"
                else:
                    self.api_url = f"{base_url}/v1/chat/completions"
            else:
                self.api_url = "https://api.openai.com/v1/chat/completions"

        # 系统提示词
        self.system_prompt = """你是一个专业的地理位置和场景识别专家。请仔细分析图片并识别其地理位置或场景类型。

**识别优先级：**
1. 首先尝试识别具体地标（建筑物、景点、纪念碑等）
2. 如果无法识别具体地标，识别场景类型（建筑风格、自然景观、城市/乡村等）
3. 注意图片中的文字、标志、建筑风格、自然特征等线索

**场景分类指南：**
- 建筑类：古城墙、教堂、清真寺、寺庙、城堡、宫殿、现代建筑、住宅区、商业街
- 自然类：海滩、山脉、森林、湖泊、沙漠、草原、峡谷、瀑布
- 城市类：广场、街道、公园、桥梁、车站、机场
- 乡村类：农场、田野、村庄、牧场
- 遗址类：古罗马遗址、希腊神庙、考古遗址、历史遗迹

**重要规则：**
1. 如果能识别具体地标，返回详细信息：具体名称、城市、国家、坐标、历史背景
2. 如果无法识别具体地标，返回最匹配的场景类型（从上述分类中选择）
3. **绝对不要返回 "unknown" 或 "未知"**，必须给出一个具体的场景描述
4. 必须用中文回答
5. 坐标格式：纬度, 经度（如：34.757, 32.410）
6. 如果同一组图片包含多个不同场景，选择最主要/最常见的场景

返回格式（JSON）：
{
    "location_identified": true/false,
    "landmark_name": "具体地标名称或场景类型（如：古罗马剧场、地中海海滩、欧式教堂等）",
    "country": "国家名或 unknown",
    "city": "城市/地区或 unknown",
    "coordinates": "纬度, 经度 或 unknown",
    "historical_background": "简要的历史和结构描述或场景描述",
    "confidence_score": 0.0-1.0
}"""

    def encode_image(self, image_path: str) -> str:
        """将图片编码为 base64"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def identify_location(self, image_path: str, timeout: int = 120) -> Dict:
        """
        识别图片的地理位置

        Args:
            image_path: 图片路径
            timeout: 请求超时时间（秒），默认 120 秒

        Returns:
            包含位置信息的字典
        """
        try:
            # 编码图片
            base64_image = self.encode_image(image_path)

            if self.provider == "gemini":
                # Gemini API 请求
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": self.system_prompt + "\n\n请识别这张图片的地理位置，并按照JSON格式返回结果。"},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": base64_image
                                }
                            }
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 500
                    }
                }

                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                response.raise_for_status()

                # 解析 Gemini 响应
                result = response.json()
                content = result['candidates'][0]['content']['parts'][0]['text']

            elif self.provider == "anthropic":
                # Anthropic API 请求
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01"
                }

                payload = {
                    "model": self.model,
                    "max_tokens": 500,
                    "temperature": 0.3,
                    "system": self.system_prompt,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/jpeg",
                                        "data": base64_image
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": "请识别这张图片的地理位置，并按照JSON格式返回结果。"
                                }
                            ]
                        }
                    ]
                }

                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                response.raise_for_status()

                # 解析 Anthropic 响应
                result = response.json()
                content = result['content'][0]['text']

            else:  # OpenAI
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }

                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": self.system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "请识别这张图片的地理位置，并按照JSON格式返回结果。"},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                                }
                            ]
                        }
                    ],
                    "max_tokens": 500,
                    "temperature": 0.3
                }

                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                response.raise_for_status()

                result = response.json()
                content = result['choices'][0]['message']['content']

            # 尝试解析 JSON
            import json
            try:
                # 提取 JSON 部分（可能包含在 markdown 代码块中）
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()

                location_info = json.loads(content)

                # 确保 landmark_name 不是 "unknown"
                if location_info.get("landmark_name") == "unknown":
                    location_info["landmark_name"] = "未分类场景"
                    location_info["location_identified"] = False

                return location_info
            except:
                # 如果解析失败，尝试从文本中提取有用信息
                return {
                    "location_identified": False,
                    "landmark_name": "未分类场景",
                    "country": "unknown",
                    "city": "unknown",
                    "coordinates": "unknown",
                    "historical_background": content[:100] if content else "无法解析响应",
                    "confidence_score": 0.0
                }

        except requests.exceptions.Timeout:
            print(f"[Location Agent] 请求超时: {image_path}")
            return self._fallback_response("网络超时", is_network_error=True)
        except requests.exceptions.RequestException as e:
            print(f"[Location Agent] 网络错误: {e}")
            return self._fallback_response("网络错误", is_network_error=True)
        except Exception as e:
            print(f"[Location Agent] 识别失败: {e}")
            return self._fallback_response("识别失败", is_network_error=False)

    def identify_scene_batch(self, image_paths: List[str], max_api_calls: int = 6) -> Dict:
        """
        为一组图片识别场景（使用投票机制提高准确性）

        Args:
            image_paths: 图片路径列表
            max_api_calls: 最多调用 API 次数（默认6次）

        Returns:
            包含完整位置信息的字典

        投票策略:
        1. 随机抽3张图片进行识别
        2. 如果3个结果一致 → 直接返回（confidence=0.95）
        3. 如果2个一致 → 继续投票直到某方领先2票（confidence基于投票比例）
        4. 如果3个都不同 → 重新抽3张再试一次
        5. 最多调用 max_api_calls 次 API
        """
        import random

        if not image_paths:
            return self._fallback_response("无图片", is_network_error=False)

        # 投票记录：{landmark_name: [result_dict, vote_count]}
        votes = {}
        api_call_count = 0

        # 第一轮：随机抽3张
        initial_samples = random.sample(image_paths, min(3, len(image_paths)))

        print(f"[AI Agent] Starting voting with {len(initial_samples)} initial samples")

        for i, img_path in enumerate(initial_samples):
            if api_call_count >= max_api_calls:
                break

            print(f"[AI Agent] Vote round 1, sample {i+1}/3")
            result = self.identify_location(img_path)
            api_call_count += 1

            landmark = result.get("landmark_name", "unknown")

            # 跳过网络错误的结果
            if landmark == "network_error":
                continue

            if landmark not in votes:
                votes[landmark] = {"result": result, "count": 1}
            else:
                votes[landmark]["count"] += 1

        # 检查第一轮结果
        if not votes:
            return self._fallback_response("网络错误", is_network_error=True)

        sorted_votes = sorted(votes.items(), key=lambda x: x[1]["count"], reverse=True)

        # 情况1：3票一致
        if len(sorted_votes) == 1 and sorted_votes[0][1]["count"] == 3:
            result = sorted_votes[0][1]["result"]
            result["confidence_score"] = 0.95
            print(f"[AI Agent] Unanimous vote (3/3): {sorted_votes[0][0]}")
            return result

        # 情况2：2票一致
        if len(sorted_votes) >= 2 and sorted_votes[0][1]["count"] == 2:
            print(f"[AI Agent] Split vote (2-1), continuing...")

            # 继续投票直到领先2票或达到API上限
            remaining_images = [img for img in image_paths if img not in initial_samples]

            while api_call_count < max_api_calls and remaining_images:
                # 检查是否已有明确胜者（领先2票）
                sorted_votes = sorted(votes.items(), key=lambda x: x[1]["count"], reverse=True)
                if len(sorted_votes) >= 2:
                    lead = sorted_votes[0][1]["count"] - sorted_votes[1][1]["count"]
                    if lead >= 2:
                        break
                elif len(sorted_votes) == 1:
                    break

                # 随机抽一张继续投票
                img_path = random.choice(remaining_images)
                remaining_images.remove(img_path)

                print(f"[AI Agent] Additional vote {api_call_count+1}/{max_api_calls}")
                result = self.identify_location(img_path)
                api_call_count += 1

                landmark = result.get("landmark_name", "unknown")
                if landmark == "network_error":
                    continue

                if landmark not in votes:
                    votes[landmark] = {"result": result, "count": 1}
                else:
                    votes[landmark]["count"] += 1

            # 返回得票最多的结果
            sorted_votes = sorted(votes.items(), key=lambda x: x[1]["count"], reverse=True)
            winner = sorted_votes[0]
            total_votes = sum(v["count"] for v in votes.values())

            result = winner[1]["result"]
            result["confidence_score"] = min(0.95, winner[1]["count"] / total_votes)
            print(f"[AI Agent] Winner: {winner[0]} ({winner[1]['count']}/{total_votes} votes)")
            return result

        # 情况3：3个都不同，重新抽3张
        if len(sorted_votes) == 3 and api_call_count < max_api_calls:
            print(f"[AI Agent] All different, resampling...")

            remaining_images = [img for img in image_paths if img not in initial_samples]
            if len(remaining_images) >= 3:
                new_samples = random.sample(remaining_images, 3)

                for i, img_path in enumerate(new_samples):
                    if api_call_count >= max_api_calls:
                        break

                    print(f"[AI Agent] Resample {i+1}/3")
                    result = self.identify_location(img_path)
                    api_call_count += 1

                    landmark = result.get("landmark_name", "unknown")
                    if landmark == "network_error":
                        continue

                    if landmark not in votes:
                        votes[landmark] = {"result": result, "count": 1}
                    else:
                        votes[landmark]["count"] += 1

        # 最终返回得票最多的
        sorted_votes = sorted(votes.items(), key=lambda x: x[1]["count"], reverse=True)
        winner = sorted_votes[0]
        total_votes = sum(v["count"] for v in votes.values())

        result = winner[1]["result"]
        result["confidence_score"] = min(0.90, winner[1]["count"] / total_votes)
        print(f"[AI Agent] Final result: {winner[0]} ({winner[1]['count']}/{total_votes} votes, confidence={result['confidence_score']:.2f})")
        return result

    def _fallback_response(self, reason: str, is_network_error: bool = False) -> Dict:
        """降级响应

        Args:
            reason: 失败原因
            is_network_error: 是否是网络错误（True=网络问题，False=识别问题）
        """
        if is_network_error:
            # 网络错误时返回 "network_error" 标记
            return {
                "location_identified": False,
                "landmark_name": "network_error",
                "country": "unknown",
                "city": "unknown",
                "coordinates": "unknown",
                "historical_background": f"网络连接失败 ({reason})",
                "confidence_score": 0.0
            }
        else:
            # 非网络错误时返回通用场景
            return {
                "location_identified": False,
                "landmark_name": "未分类场景",
                "country": "unknown",
                "city": "unknown",
                "coordinates": "unknown",
                "historical_background": f"无法识别 ({reason})",
                "confidence_score": 0.0
            }

    @staticmethod
    def sanitize_name(name: str) -> str:
        """清理文件名，移除不合法字符"""
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            name = name.replace(char, '_')
        return name.strip()


# 全局实例
_agent_instance = None

def get_location_agent(api_key: Optional[str] = None, model: Optional[str] = None, provider: Optional[str] = None, base_url: Optional[str] = None):
    """获取全局 Location Agent 实例"""
    global _agent_instance
    # 如果提供了新的配置，重新创建实例
    if api_key or model or provider or base_url:
        _agent_instance = LocationAgent(
            api_key=api_key,
            model=model or "claude-sonnet-4-5",
            provider=provider or "anthropic",
            base_url=base_url
        )
    elif _agent_instance is None:
        _agent_instance = LocationAgent()
    return _agent_instance
