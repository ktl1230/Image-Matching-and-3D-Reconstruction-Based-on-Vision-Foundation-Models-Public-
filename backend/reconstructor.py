"""
3D Reconstruction Engine
Feature extraction: ALIKED
Feature matching: LightGlue + RANSAC geometric verification
Structure-from-Motion: pycolmap incremental reconstruction
"""
import os
import sys
import gc
import shutil
import tempfile
import subprocess
import numpy as np
import torch
import cv2
import sqlite3
import pycolmap
import kornia.feature as KF
from typing import Dict, Optional, Tuple
from tqdm import tqdm

# 添加项目根目录到路径（用于导入 nets.aliked）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Memory optimization for GPU inference
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True,max_split_size_mb:128"


def get_focal_from_exif(image_path: str) -> Optional[float]:
    """从 EXIF 读取焦距信息，返回像素焦距"""
    try:
        from PIL import Image as PILImage
        from PIL.ExifTags import Base as ExifBase
        img = PILImage.open(image_path)
        exif = img._getexif()
        if exif is None:
            return None

        # 尝试读取 FocalLengthIn35mmFilm (tag 41989)
        focal_35mm = exif.get(41989)
        if focal_35mm and focal_35mm > 0:
            w, h = img.size
            # 35mm 传感器对角线 ~43.27mm，将 35mm 等效焦距转换为像素焦距
            pixel_focal = focal_35mm * max(w, h) / 36.0
            return pixel_focal

        # 尝试读取 FocalLength (tag 37386) + SensorWidth
        focal_length = exif.get(37386)
        if focal_length:
            if hasattr(focal_length, 'numerator'):
                focal_length = float(focal_length.numerator) / float(focal_length.denominator)
            else:
                focal_length = float(focal_length)
            if focal_length > 0:
                w, h = img.size
                # 假设 sensor width ~6.17mm (常见手机)，粗略估计
                pixel_focal = focal_length * max(w, h) / 6.17
                return pixel_focal
    except Exception:
        pass
    return None


class ReconstructionConfig:
    """Reconstruction configuration"""
    def __init__(self,
                 img_size: int = 1280,
                 enable_tiling: bool = False,
                 tile_grid: tuple = (2, 2),
                 tile_overlap: float = 0.1,
                 top_k: int = 4096,
                 score_th: float = 0.2,
                 min_inliers: int = 15,
                 min_cluster_size: int = 3,
                 enable_dense: bool = False,
                 use_ransac: bool = True,
                 ransac_threshold: float = 4.0,
                 use_exif_focal: bool = True,
                 max_pairs_per_image: int = 50):
        self.img_size = img_size
        self.enable_tiling = enable_tiling
        self.tile_grid = tile_grid
        self.tile_overlap = tile_overlap
        self.top_k = top_k
        self.score_th = score_th
        self.min_inliers = min_inliers
        self.min_cluster_size = min_cluster_size
        self.enable_dense = enable_dense
        self.use_ransac = use_ransac
        self.ransac_threshold = ransac_threshold
        self.use_exif_focal = use_exif_focal
        self.max_pairs_per_image = max_pairs_per_image
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Reduce top_k when tiling is enabled to avoid OOM
        if self.enable_tiling and self.top_k > 2048:
            self.top_k = 2048


class COLMAPDatabase:
    """COLMAP 数据库操作"""
    def __init__(self, path):
        self.path = path
        db_dir = os.path.dirname(path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass
        self.conn = sqlite3.connect(path)
        self.cursor = self.conn.cursor()
        self.create_tables()
        self.image_name_to_id = {}

    def create_tables(self):
        self.cursor.executescript("""
            CREATE TABLE IF NOT EXISTS cameras (
                camera_id INTEGER PRIMARY KEY AUTOINCREMENT, model INTEGER,
                width INTEGER, height INTEGER, params BLOB, prior_focal_length INTEGER);
            CREATE TABLE IF NOT EXISTS images (
                image_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,
                camera_id INTEGER, prior_qw REAL, prior_qx REAL, prior_qy REAL, prior_qz REAL,
                prior_tx REAL, prior_ty REAL, prior_tz REAL);
            CREATE TABLE IF NOT EXISTS keypoints (
                image_id INTEGER, rows INTEGER, cols INTEGER, data BLOB);
            CREATE TABLE IF NOT EXISTS descriptors (
                image_id INTEGER, rows INTEGER, cols INTEGER, data BLOB);
            CREATE TABLE IF NOT EXISTS matches (
                pair_id INTEGER PRIMARY KEY, rows INTEGER, cols INTEGER, data BLOB);
            CREATE TABLE IF NOT EXISTS two_view_geometries (
                pair_id INTEGER PRIMARY KEY, rows INTEGER, cols INTEGER, data BLOB,
                config INTEGER, F BLOB, E BLOB, H BLOB, qvec BLOB, tvec BLOB);
        """)
        self.conn.commit()

    def add_camera(self, width, height, focal_length=None):
        """添加相机，支持 EXIF 焦距"""
        if focal_length and focal_length > 0:
            focal = focal_length
            prior = 1  # 有先验焦距
        else:
            focal = max(width, height) * 1.2
            prior = 0  # 无先验，让 COLMAP 自己估计
        params = np.array([focal, width / 2, height / 2, 0.0], dtype=np.float64)
        self.cursor.execute(
            "INSERT INTO cameras VALUES (?, ?, ?, ?, ?, ?)",
            (None, 2, width, height, params.tobytes(), prior))
        return self.cursor.lastrowid

    def add_image(self, name, camera_id):
        if name in self.image_name_to_id:
            return self.image_name_to_id[name]
        self.cursor.execute(
            "INSERT INTO images VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (None, name, camera_id, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0))
        img_id = self.cursor.lastrowid
        self.image_name_to_id[name] = img_id
        return img_id

    def add_keypoints(self, image_id, keypoints):
        if len(keypoints) == 0:
            return
        data = keypoints.astype(np.float32).tobytes()
        self.cursor.execute(
            "INSERT INTO keypoints VALUES (?, ?, ?, ?)",
            (image_id, keypoints.shape[0], keypoints.shape[1], data))

    def add_matches(self, img_id1, img_id2, matches):
        if len(matches) == 0:
            return
        if img_id1 > img_id2:
            img_id1, img_id2 = img_id2, img_id1
            matches = matches[:, ::-1]
        pair_id = img_id1 * 2147483647 + img_id2
        data = matches.astype(np.uint32).tobytes()
        try:
            self.cursor.execute(
                "INSERT OR REPLACE INTO matches VALUES (?, ?, ?, ?)",
                (pair_id, matches.shape[0], matches.shape[1], data))
            self.conn.commit()
        except Exception as e:
            print(f"  Warning: Failed to add matches: {e}")

    def add_two_view_geometry(self, img_id1, img_id2, matches):
        """添加 two_view_geometries（pycolmap 需要）"""
        if len(matches) == 0:
            return
        if img_id1 > img_id2:
            img_id1, img_id2 = img_id2, img_id1
            matches = matches[:, ::-1]
        pair_id = img_id1 * 2147483647 + img_id2
        data = matches.astype(np.uint32).tobytes()
        F = np.eye(3, dtype=np.float64).tobytes()
        E = np.eye(3, dtype=np.float64).tobytes()
        H = np.eye(3, dtype=np.float64).tobytes()
        try:
            self.cursor.execute(
                "INSERT OR REPLACE INTO two_view_geometries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (pair_id, matches.shape[0], matches.shape[1], data, 2, F, E, H, None, None))
            self.conn.commit()
        except Exception as e:
            print(f"  Warning: Failed to add two_view_geometry: {e}")

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.commit()
        self.conn.close()


class Reconstructor:
    """3D 重建引擎"""
    def __init__(self, config: ReconstructionConfig = None):
        self.config = config or ReconstructionConfig()
        self.extractor = None
        self.matcher = None
        self._colmap_path = self._find_colmap()
        self._init_models()

    @staticmethod
    def _find_colmap():
        """查找 COLMAP 可执行文件"""
        # 1. 已知安装路径
        known_paths = [
            r"E:\KTL\Desktop\colmap-x64-windows-cuda\bin\colmap.exe",
        ]
        for p in known_paths:
            if os.path.exists(p):
                return p
        # 2. 项目内置的 colmap
        project_dir = os.path.dirname(os.path.dirname(__file__))
        for name in ["colmap.bat", "colmap.exe"]:
            p = os.path.join(project_dir, "colmap", "bin", name)
            if os.path.exists(p):
                return p
        # 3. 系统 PATH
        import shutil as _shutil
        colmap_in_path = _shutil.which("colmap")
        if colmap_in_path:
            return colmap_in_path
        return None

    def _init_models(self):
        """初始化特征提取和匹配模型"""
        print(f"[Reconstructor] Initializing on {self.config.device}...")
        print(f"[Reconstructor] CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"[Reconstructor] CUDA device: {torch.cuda.get_device_name(0)}")
            print(f"[Reconstructor] CUDA memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")

        try:
            from nets.aliked import ALIKED
            self.extractor = ALIKED(
                model_name='aliked-n16',
                device=self.config.device,
                top_k=self.config.top_k,
                scores_th=self.config.score_th
            )
            print(f"[Reconstructor] ALIKED loaded with top_k={self.config.top_k}")
        except ImportError:
            raise RuntimeError("ALIKED not found. Ensure 'nets' folder is in project root.")

        self.matcher = KF.LightGlue(features="aliked").to(self.config.device).eval()
        print("[Reconstructor] LightGlue loaded.")
        print("[Reconstructor] Models ready.")

    def _load_and_resize(self, path):
        """加载并缩放图片（兼容中文路径）"""
        img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return None, None
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        scale = self.config.img_size / max(h, w)
        if scale < 1.0:
            new_size = (int(w * scale), int(h * scale))
            img = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
        return img, (h, w)

    def _extract_features(self, img):
        """提取特征（支持切片模式）"""
        H, W = img.shape[:2]

        if not self.config.enable_tiling:
            # 普通模式：直接提取
            print(f"[Reconstructor] Extracting features from {W}x{H} image on {self.config.device}...")
            with torch.inference_mode():
                feats = self.extractor.run(img)
            print(f"[Reconstructor] Extracted {len(feats['keypoints'])} keypoints")
            return feats if len(feats['keypoints']) > 0 else None

        # 切片模式
        tiles = []
        resize_scale = self.config.img_size / max(H, W)
        new_size = (int(W * resize_scale), int(H * resize_scale))
        img_resized = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
        tiles.append((img_resized, 1.0 / resize_scale, 0, 0))

        gh, gw = self.config.tile_grid
        sh, sw = H // gh, W // gw
        for i in range(gh):
            for j in range(gw):
                y, x = i * sh, j * sw
                y_start = max(0, int(y - sh * self.config.tile_overlap))
                x_start = max(0, int(x - sw * self.config.tile_overlap))
                y_end = min(H, y + sh + int(sh * self.config.tile_overlap))
                x_end = min(W, x + sw + int(sw * self.config.tile_overlap))
                tile = img[y_start:y_end, x_start:x_end]
                if tile.shape[0] > 64 and tile.shape[1] > 64:
                    tiles.append((tile, 1.0, x_start, y_start))

        all_kpts, all_desc = [], []
        for tile_img, scale, off_x, off_y in tiles:
            with torch.inference_mode():
                feats = self.extractor.run(tile_img)
            kpts = feats['keypoints']
            desc = feats['descriptors']
            if len(kpts) == 0:
                continue
            kpts = kpts * scale
            kpts[:, 0] += off_x
            kpts[:, 1] += off_y
            all_kpts.append(kpts)
            all_desc.append(desc)

        if not all_kpts:
            return None
        return {
            'keypoints': np.concatenate(all_kpts, axis=0),
            'descriptors': np.concatenate(all_desc, axis=0),
            'shape': (H, W)
        }

    def _match_pair(self, feats1, feats2):
        """匹配一对图片的特征，支持 RANSAC 几何验证"""
        gc.collect()
        torch.cuda.empty_cache()

        kpts0 = torch.from_numpy(feats1['keypoints']).float().to(self.config.device).unsqueeze(0)
        desc0 = torch.from_numpy(feats1['descriptors']).float().to(self.config.device).unsqueeze(0)
        kpts1 = torch.from_numpy(feats2['keypoints']).float().to(self.config.device).unsqueeze(0)
        desc1 = torch.from_numpy(feats2['descriptors']).float().to(self.config.device).unsqueeze(0)

        h0, w0 = feats1.get('shape', feats1['keypoints'].max(axis=0).astype(int) + 1)
        h1, w1 = feats2.get('shape', feats2['keypoints'].max(axis=0).astype(int) + 1)
        size0 = torch.tensor([w0, h0], device=self.config.device).unsqueeze(0)
        size1 = torch.tensor([w1, h1], device=self.config.device).unsqueeze(0)

        try:
            with torch.inference_mode():
                input_dict = {
                    "image0": {"keypoints": kpts0, "descriptors": desc0, "image_size": size0},
                    "image1": {"keypoints": kpts1, "descriptors": desc1, "image_size": size1}
                }
                out = self.matcher(input_dict)
                matches_idx = out['matches0'][0]
                valid = matches_idx > -1
                m_idx0 = torch.arange(len(matches_idx), device=self.config.device)[valid]
                m_idx1 = matches_idx[valid]
                matches = torch.stack([m_idx0, m_idx1], dim=1).cpu().numpy()

            # RANSAC 几何验证：过滤误匹配
            if self.config.use_ransac and len(matches) >= 8:
                mkpts0 = feats1['keypoints'][matches[:, 0]]
                mkpts1 = feats2['keypoints'][matches[:, 1]]
                try:
                    F, inlier_mask = cv2.findFundamentalMat(
                        mkpts0, mkpts1,
                        cv2.USAC_MAGSAC,
                        ransacReprojThreshold=self.config.ransac_threshold,
                        confidence=0.9999,
                        maxIters=10000
                    )
                    if inlier_mask is not None:
                        inlier_mask = inlier_mask.ravel().astype(bool)
                        n_before = len(matches)
                        matches = matches[inlier_mask]
                        n_after = len(matches)
                        if n_before != n_after:
                            print(f"  RANSAC: {n_before} -> {n_after} matches ({n_before - n_after} outliers removed)")
                except Exception:
                    pass  # RANSAC 失败时保留原始匹配

            return matches
        except RuntimeError as e:
            if "out of memory" in str(e):
                print(f"  OOM during matching, skipping pair")
                torch.cuda.empty_cache()
                return np.array([]).reshape(0, 2)
            raise

    def _select_topk_pairs(self, image_data, paths_list):
        """使用特征描述符的全局统计选择 top-k 最相似的图片对
        避免大量图片时的 O(n^2) 全配对匹配"""
        n = len(paths_list)
        k = min(self.config.max_pairs_per_image, n - 1)

        # 计算每张图片的全局描述符（取所有关键点描述符的均值）
        global_descs = []
        for path in paths_list:
            _, feats, _ = image_data[path]
            desc = feats['descriptors']
            if len(desc) > 0:
                global_desc = desc.mean(axis=0)
                global_desc = global_desc / (np.linalg.norm(global_desc) + 1e-8)
            else:
                global_desc = np.zeros(desc.shape[1] if len(desc.shape) > 1 else 128)
            global_descs.append(global_desc)

        global_descs = np.stack(global_descs)

        # 计算余弦相似度矩阵
        sim_matrix = global_descs @ global_descs.T

        # 为每张图片选择 top-k 最相似的
        pairs = set()
        for i in range(n):
            sims = sim_matrix[i].copy()
            sims[i] = -1  # 排除自身
            topk_indices = np.argsort(-sims)[:k]
            for j in topk_indices:
                pair = (min(i, j), max(i, j))
                pairs.add(pair)

        return sorted(list(pairs))

    def reconstruct(self, image_dir: str, output_dir: str,
                    progress_callback=None) -> Dict:
        """
        执行三维重建
        image_dir: 包含图片的文件夹
        output_dir: 输出目录
        progress_callback: 进度回调 fn(stage, progress, message)
        返回: {"success": bool, "ply_path": str, "num_points": int, ...}
        """
        # 转换为绝对路径
        image_dir = os.path.abspath(image_dir)
        output_dir = os.path.abspath(output_dir)
        os.makedirs(output_dir, exist_ok=True)

        # 创建临时ASCII路径工作目录（避免pycolmap中文路径问题）
        temp_dir = tempfile.mkdtemp(prefix="colmap_")
        print(f"[Reconstructor] Using temp dir: {temp_dir}")

        try:
            return self._reconstruct_internal(image_dir, output_dir, temp_dir, progress_callback)
        finally:
            # 清理临时目录
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

    def _reconstruct_internal(self, image_dir: str, output_dir: str, temp_dir: str,
                              progress_callback=None) -> Dict:
        """Internal reconstruction pipeline"""
        # 收集图片（兼容中文路径）
        image_paths = []
        valid_exts = {'.jpg', '.jpeg', '.png'}
        for f in os.listdir(image_dir):
            if os.path.splitext(f)[1].lower() in valid_exts:
                image_paths.append(os.path.join(image_dir, f))

        if len(image_paths) < 3:
            return {"success": False, "error": "至少需要 3 张图片进行三维重建"}

        if progress_callback:
            progress_callback("extract", 0, f"开始处理 {len(image_paths)} 张图片...")

        # 1. 特征提取（使用临时目录）
        db_path = os.path.join(temp_dir, "database.db")
        db = COLMAPDatabase(db_path)
        image_data = {}  # path -> (img_id, feats, fname)

        for i, path in enumerate(image_paths):
            img, orig_size = self._load_and_resize(path)
            if img is None:
                print(f"[Reconstructor] Failed to load image: {path}")
                continue
            feats = self._extract_features(img)
            if feats is None:
                print(f"[Reconstructor] Failed to extract features: {path}")
                continue

            H, W = img.shape[:2]
            if 'shape' not in feats:
                feats['shape'] = (H, W)

            # EXIF 焦距读取
            focal_length = None
            if self.config.use_exif_focal:
                focal_length = get_focal_from_exif(path)
                if focal_length:
                    # 缩放焦距到当前分辨率
                    orig_h, orig_w = orig_size
                    scale = max(H, W) / max(orig_h, orig_w)
                    focal_length = focal_length * scale
                    print(f"[Reconstructor] EXIF focal: {focal_length:.1f}px for {os.path.basename(path)}")

            # 使用简单的ASCII文件名
            fname = f"img_{i:04d}.jpg"
            cam_id = db.add_camera(W, H, focal_length)
            img_id = db.add_image(fname, cam_id)
            db.add_keypoints(img_id, feats['keypoints'])
            image_data[path] = (img_id, feats, fname)

            print(f"[Reconstructor] Processed {i+1}/{len(image_paths)}: {fname}, {len(feats['keypoints'])} keypoints")

            if progress_callback:
                progress_callback("extract", (i + 1) / len(image_paths) * 50,
                                  f"特征提取: {i+1}/{len(image_paths)}")

        db.commit()

        if len(image_data) < 3:
            db.close()
            return {"success": False, "error": "有效图片不足 3 张"}

        # 2. 特征匹配（支持 top-k pair selection）
        import itertools
        paths_list = list(image_data.keys())
        n_images = len(paths_list)

        # 当图片数量较多时，使用 top-k pair selection 减少匹配次数
        if n_images > 30 and self.config.max_pairs_per_image < n_images - 1:
            pairs = self._select_topk_pairs(image_data, paths_list)
            print(f"[Reconstructor] Top-k pair selection: {len(pairs)} pairs (vs {n_images*(n_images-1)//2} all-pairs)")
        else:
            pairs = list(itertools.combinations(range(n_images), 2))

        if progress_callback:
            progress_callback("match", 50, f"开始匹配 {len(pairs)} 对图片...")

        match_count = 0
        for pi, (i, j) in enumerate(pairs):
            p1, p2 = paths_list[i], paths_list[j]
            id1, feats1, _ = image_data[p1]
            id2, feats2, _ = image_data[p2]

            matches = self._match_pair(feats1, feats2)

            if len(matches) >= self.config.min_inliers:
                db.add_matches(id1, id2, matches)
                db.add_two_view_geometry(id1, id2, matches)
                match_count += 1

            if progress_callback:
                progress_callback("match", 50 + (pi + 1) / len(pairs) * 30,
                                  f"匹配: {pi+1}/{len(pairs)} ({match_count} valid)")

        db.close()

        if match_count == 0:
            return {"success": False, "error": "没有找到足够的匹配对"}

        # 验证数据库文件存在
        if not os.path.exists(db_path):
            return {"success": False, "error": f"数据库文件创建失败: {db_path}"}

        db_size = os.path.getsize(db_path)
        print(f"[Reconstructor] Database size: {db_size / 1024:.2f} KB")

        # Free GPU memory for COLMAP
        del self.extractor
        del self.matcher
        self.extractor = None
        self.matcher = None
        gc.collect()
        torch.cuda.empty_cache()

        # 3. 复制图片到临时images目录（使用ASCII文件名）
        images_dir = os.path.join(temp_dir, "images")
        os.makedirs(images_dir, exist_ok=True)
        for path, (_, _, fname) in image_data.items():
            dst = os.path.join(images_dir, fname)
            shutil.copy2(path, dst)

        # 4. pycolmap 增量重建
        if progress_callback:
            progress_callback("reconstruct", 80, "运行 COLMAP 增量重建...")

        sparse_dir = os.path.join(temp_dir, "sparse")
        os.makedirs(sparse_dir, exist_ok=True)

        # 打印调试信息
        print(f"[Reconstructor] Database path: {db_path}")
        print(f"[Reconstructor] Database exists: {os.path.exists(db_path)}")
        print(f"[Reconstructor] Images dir: {images_dir}")
        print(f"[Reconstructor] Images count: {len(os.listdir(images_dir))}")
        print(f"[Reconstructor] Sparse dir: {sparse_dir}")

        try:
            mapper_options = pycolmap.IncrementalPipelineOptions()
            mapper_options.min_num_matches = self.config.min_inliers
            # Optimized COLMAP parameters for better reconstruction
            mapper_options.num_threads = 1
            mapper_options.min_model_size = 3  # 默认10太高，3张图就可以建模
            mapper_options.multiple_models = True  # 允许多模型重建
            mapper_options.max_num_models = 5
            maps = pycolmap.incremental_mapping(
                database_path=db_path,
                image_path=images_dir,
                output_path=sparse_dir,
                options=mapper_options
            )
        except Exception as e:
            print(f"[Reconstructor] pycolmap error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": f"COLMAP 重建失败: {str(e)}"}

        if not maps or len(maps) == 0:
            return {"success": False, "error": "COLMAP 未能重建任何模型"}

        # 5. 导出 PLY（先导出到临时目录）
        if progress_callback:
            progress_callback("export", 90, "导出点云...")

        # 使用最大的重建结果（注册图片最多的）
        best_idx = max(maps.keys(), key=lambda k: maps[k].num_reg_images())
        reconstruction = maps[best_idx]

        # 打印所有重建结果的信息
        for idx, rec in maps.items():
            marker = " <-- best" if idx == best_idx else ""
            print(f"[Reconstructor] Model {idx}: {rec.num_reg_images()} images, {rec.num_points3D()} points{marker}")

        # 先导出到临时目录（ASCII路径）
        temp_ply_path = os.path.join(temp_dir, "point_cloud.ply")
        reconstruction.export_PLY(temp_ply_path)

        num_images = reconstruction.num_reg_images()
        num_points = reconstruction.num_points3D()

        # 复制所有结果到输出目录
        output_sparse = os.path.join(output_dir, "sparse")
        if os.path.exists(output_sparse):
            shutil.rmtree(output_sparse)
        shutil.copytree(sparse_dir, output_sparse)

        output_db = os.path.join(output_dir, "database.db")
        shutil.copy2(db_path, output_db)

        output_images = os.path.join(output_dir, "images")
        if os.path.exists(output_images):
            shutil.rmtree(output_images)
        shutil.copytree(images_dir, output_images)

        # 复制PLY文件（稀疏）
        sparse_ply_path = os.path.join(output_dir, "point_cloud.ply")
        shutil.copy2(temp_ply_path, sparse_ply_path)

        # 6. 稠密重建（如果启用）
        dense_ply_path = None
        if self.config.enable_dense:
            dense_ply_path = self._run_dense_reconstruction(
                temp_dir, images_dir, sparse_dir, best_idx, output_dir, progress_callback
            )

        # 最终 PLY 路径：优先使用稠密结果
        ply_path = dense_ply_path if dense_ply_path else sparse_ply_path

        if progress_callback:
            progress_callback("done", 100,
                              f"完成! {num_images} 张图片, {num_points} 个3D点")

        # 重新初始化模型（供后续使用）
        self._init_models()

        return {
            "success": True,
            "ply_path": ply_path,
            "num_images": num_images,
            "num_points": num_points,
            "num_cameras": reconstruction.num_cameras(),
            "is_dense": dense_ply_path is not None,
        }

    def _run_dense_reconstruction(self, temp_dir, images_dir, sparse_dir, best_idx,
                                    output_dir, progress_callback=None):
        """使用 COLMAP CLI 执行稠密重建"""
        if not self._colmap_path:
            print("[Reconstructor] COLMAP CLI not found, skipping dense reconstruction")
            if progress_callback:
                progress_callback("dense", 85, "未找到 COLMAP，跳过稠密重建")
            return None

        print(f"[Reconstructor] Starting dense reconstruction with COLMAP: {self._colmap_path}")
        if progress_callback:
            progress_callback("dense", 85, "开始稠密重建 - 图像去畸变...")

        try:
            # Step 1: Image undistortion
            dense_dir = os.path.join(temp_dir, "dense")
            os.makedirs(dense_dir, exist_ok=True)

            sparse_model_dir = os.path.join(sparse_dir, str(best_idx))
            if not os.path.exists(sparse_model_dir):
                # pycolmap 可能直接输出到 sparse_dir
                sparse_model_dir = sparse_dir

            cmd_undistort = [
                self._colmap_path, "image_undistorter",
                "--image_path", images_dir,
                "--input_path", sparse_model_dir,
                "--output_path", dense_dir,
                "--output_type", "COLMAP",
            ]
            print(f"[Reconstructor] Running: {' '.join(cmd_undistort)}")
            result = subprocess.run(cmd_undistort, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                print(f"[Reconstructor] Undistort failed: {result.stderr}")
                return None

            # Step 2: Patch Match Stereo (需要 CUDA)
            if progress_callback:
                progress_callback("dense", 88, "稠密重建 - PatchMatch 深度估计...")

            cmd_patchmatch = [
                self._colmap_path, "patch_match_stereo",
                "--workspace_path", dense_dir,
                "--workspace_format", "COLMAP",
                "--PatchMatchStereo.geom_consistency", "true",
            ]
            print(f"[Reconstructor] Running: {' '.join(cmd_patchmatch)}")
            result = subprocess.run(cmd_patchmatch, capture_output=True, text=True, timeout=1800)
            if result.returncode != 0:
                print(f"[Reconstructor] PatchMatch failed: {result.stderr}")
                if progress_callback:
                    progress_callback("dense", 90, "PatchMatch 失败，使用稀疏结果")
                return None

            # Step 3: Stereo Fusion
            if progress_callback:
                progress_callback("dense", 93, "稠密重建 - 点云融合...")

            dense_ply = os.path.join(dense_dir, "fused.ply")
            cmd_fusion = [
                self._colmap_path, "stereo_fusion",
                "--workspace_path", dense_dir,
                "--workspace_format", "COLMAP",
                "--input_type", "geometric",
                "--output_path", dense_ply,
            ]
            print(f"[Reconstructor] Running: {' '.join(cmd_fusion)}")
            result = subprocess.run(cmd_fusion, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                print(f"[Reconstructor] Fusion failed: {result.stderr}")
                return None

            if not os.path.exists(dense_ply):
                print("[Reconstructor] Dense PLY not generated")
                return None

            # 复制稠密结果到输出目录，保留稀疏版本备份
            output_dense_ply = os.path.join(output_dir, "point_cloud.ply")
            sparse_ply_backup = os.path.join(output_dir, "point_cloud_sparse.ply")
            if os.path.exists(output_dense_ply) and not os.path.exists(sparse_ply_backup):
                shutil.copy2(output_dense_ply, sparse_ply_backup)
            shutil.copy2(dense_ply, output_dense_ply)

            print(f"[Reconstructor] Dense reconstruction complete: {output_dense_ply}")
            return output_dense_ply

        except subprocess.TimeoutExpired:
            print("[Reconstructor] Dense reconstruction timed out")
            if progress_callback:
                progress_callback("dense", 90, "稠密重建超时，使用稀疏结果")
            return None
        except Exception as e:
            print(f"[Reconstructor] Dense reconstruction error: {e}")
            import traceback
            traceback.print_exc()
            return None


# 全局实例
_reconstructor_instance = None

def get_reconstructor(config: ReconstructionConfig = None) -> Reconstructor:
    global _reconstructor_instance
    if _reconstructor_instance is None or config is not None:
        _reconstructor_instance = Reconstructor(config)
    return _reconstructor_instance
