"""
图片分类服务 - 基于 step1_coarse_cluster.py 的逻辑
使用 DINOv2 进行语义聚类 + AI Location Agent 进行场景命名
"""
import os
import sys
import shutil
import torch
import torch.nn.functional as F
import networkx as nx
from PIL import Image
from transformers import AutoImageProcessor, AutoModel
from typing import List, Dict, Optional
import glob

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.location_agent import get_location_agent

class ImageClassifier:
    def __init__(self, device="cuda" if torch.cuda.is_available() else "cpu", api_samples=1):
        self.device = device
        print(f"🚀 Loading DINOv2 on {self.device}...")
        self.processor = AutoImageProcessor.from_pretrained('facebook/dinov2-large')
        self.model = AutoModel.from_pretrained('facebook/dinov2-large').to(self.device)
        self.model.eval()

        # 配置参数
        self.img_size = 512
        self.batch_size = 4
        self.sim_threshold = 0.65
        self.min_cluster_size = 3

        # API 调用策略配置
        # 1 = 省钱模式 (每组 1 次 API)
        # 2 = 平衡模式 (每组最多 2 次 API)
        # 3 = 准确模式 (每组最多 3 次 API)
        self.api_samples = api_samples
        print(f"💰 API Strategy: {'Economy' if api_samples==1 else 'Balanced' if api_samples==2 else 'Accurate'} mode ({api_samples} samples per group)")

    def extract_features(self, image_paths: List[str]):
        """提取图像特征"""
        all_embeddings = []
        valid_paths = []

        for i in range(0, len(image_paths), self.batch_size):
            batch_paths = image_paths[i : i + self.batch_size]
            images = []
            curr_paths = []

            for p in batch_paths:
                try:
                    img = Image.open(p).convert("RGB")
                    images.append(img)
                    curr_paths.append(p)
                except:
                    continue

            if not images:
                continue

            inputs = self.processor(images=images, return_tensors="pt").to(self.device)
            with torch.no_grad():
                emb = self.model(**inputs).last_hidden_state[:, 0, :]
                emb = F.normalize(emb, p=2, dim=1)
                all_embeddings.append(emb.cpu())
                valid_paths.extend(curr_paths)

        if not all_embeddings:
            return None, None
        return torch.cat(all_embeddings, dim=0), valid_paths

    def classify_images(self, project_path: str, api_key: Optional[str] = None, model: Optional[str] = None, provider: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, any]:
        """
        对项目中的图片进行分类
        返回格式: {
            "groups": {"Saranda Kolones Castle": [...], "古城墙": [...], "discarded": [...]},
            "metadata": {"Saranda Kolones Castle": {...location_info...}, ...}
        }
        """
        # 获取所有图片
        image_paths = []
        for ext in ['*.jpg', '*.png', '*.jpeg', '*.JPG', '*.PNG', '*.JPEG']:
            image_paths.extend(glob.glob(os.path.join(project_path, "uploads", ext)))

        if not image_paths:
            return {"groups": {"discarded": []}, "metadata": {}}

        print(f"📸 Found {len(image_paths)} images")

        # 提取特征
        embeddings, valid_paths = self.extract_features(image_paths)
        if embeddings is None:
            return {"groups": {"discarded": [os.path.basename(p) for p in image_paths]}, "metadata": {}}

        # 构建相似度图
        sim_matrix = torch.mm(embeddings, embeddings.t())
        G = nx.Graph()
        for i in range(len(valid_paths)):
            G.add_node(i)

        # 添加边
        rows, cols = torch.triu(sim_matrix > self.sim_threshold, diagonal=1).nonzero(as_tuple=True)
        for r, c in zip(rows, cols):
            G.add_edge(r.item(), c.item())

        # 聚类
        clusters = list(nx.connected_components(G))

        # 加载 AI Location Agent
        print("[Classifier] Loading AI Location Agent...")
        location_agent = get_location_agent(api_key=api_key, model=model, provider=provider, base_url=base_url)

        # 组织结果
        groups = {}
        metadata = {}
        discarded = []

        # 创建分类文件夹
        classified_dir = os.path.join(project_path, "classified")
        os.makedirs(classified_dir, exist_ok=True)

        # 用于避免重名
        used_names = set()

        for nodes in clusters:
            if len(nodes) >= self.min_cluster_size:
                # 获取该聚类的图片路径
                cluster_paths = [valid_paths[idx] for idx in nodes]

                # 使用 AI Location Agent 识别场景
                print(f"[AI Agent] Analyzing scene with {len(cluster_paths)} images...")
                location_info = location_agent.identify_scene_batch(
                    cluster_paths,
                    max_api_calls=self.api_samples
                )

                # 获取场景名称
                scene_name = location_info.get("landmark_name", "未分类场景")

                # 只在网络错误时使用"未知场景"
                if scene_name == "network_error":
                    scene_name = "未知场景"
                elif scene_name in ["unknown", ""]:
                    scene_name = "未分类场景"

                scene_name = location_agent.sanitize_name(scene_name)

                # 处理重名（使用数字标号，如：房子1、房子2）
                original_name = scene_name
                counter = 1
                while scene_name in used_names:
                    scene_name = f"{original_name}{counter}"
                    counter += 1
                used_names.add(scene_name)

                scene_dir = os.path.join(classified_dir, scene_name)
                os.makedirs(scene_dir, exist_ok=True)

                scene_images = []
                for idx in nodes:
                    src_path = valid_paths[idx]
                    filename = os.path.basename(src_path)
                    dst_path = os.path.join(scene_dir, filename)
                    try:
                        # 确保目标目录存在
                        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                        shutil.copy2(src_path, dst_path)
                        scene_images.append(filename)
                    except Exception as e:
                        print(f"[Classifier] Failed to copy {filename}: {e}")
                        continue

                groups[scene_name] = scene_images
                metadata[scene_name] = location_info
            else:
                # 小于最小聚类大小的图片
                for idx in nodes:
                    discarded.append(os.path.basename(valid_paths[idx]))

        # 保存被丢弃的图片
        if discarded:
            discard_dir = os.path.join(classified_dir, "discarded")
            os.makedirs(discard_dir, exist_ok=True)
            for filename in discarded:
                src_path = os.path.join(project_path, "uploads", filename)
                if os.path.exists(src_path):
                    try:
                        shutil.copy2(src_path, os.path.join(discard_dir, filename))
                    except Exception as e:
                        print(f"[Classifier] Failed to copy discarded {filename}: {e}")
                        continue
            groups["discarded"] = discarded
            metadata["discarded"] = {
                "location_identified": False,
                "landmark_name": "discarded",
                "country": "unknown",
                "city": "unknown",
                "coordinates": "unknown",
                "historical_background": "图片数量不足，无法形成聚类",
                "confidence_score": 0.0
            }

        print(f"✅ Classification complete: {len(groups)} groups")
        return {"groups": groups, "metadata": metadata}

# 全局实例（避免重复加载模型）
_classifier_instance = None

def get_classifier():
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = ImageClassifier()
    return _classifier_instance
