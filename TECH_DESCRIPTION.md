# 项目技术描述

## 项目名称
基于视觉基础模型的图像匹配与三维重建系统

## 项目时间
2025.2.27完成

## 项目背景
独立设计并实现的毕业设计项目，针对大规模无序图像集的自动分类与三维重建问题。

## 项目灵感
Kaggle 比赛 Image Matching Challenge 2025

## 实验数据集
Kaggle 比赛 Image Matching Challenge 2025中图片数据

## 技术实现

### 1. 图像语义聚类模块
- 使用 DINOv2-large 模型提取 1024 维语义特征向量
- 计算图像间余弦相似度，阈值设为 0.65
- 基于相似度构建无向图，使用 NetworkX 的连通分量算法完成场景分组
- 过滤小于 3 张图片的噪声组，确保聚类质量

### 2. 场景识别模块
- 集成 OpenAI GPT-4o、Anthropic Claude、Google Gemini 三类大语言模型
- 实现多样本投票机制：每组随机抽取 3 张图片进行识别
- 投票策略：3 票一致直接采用（置信度 95%），2-1 分歧继续投票直到领先 2 票
- 最多 6 次 API 调用，支持自定义 API 中转站

### 3. 三维重建模块
**特征提取与匹配**
- ALIKED 局部特征检测器，1280px 分辨率，提取 4096 个关键点
- LightGlue 特征匹配器，基于 Transformer 架构的轻量级匹配
- USAC-MAGSAC 几何验证，阈值 4 像素，置信度 0.9999，过滤误匹配

**相机标定**
- 读取图像 EXIF 数据提取焦距信息作为相机先验
- 根据图像缩放比例调整焦距到当前分辨率
- 每张图片独立相机模型（SIMPLE_PINHOLE）

**图像对筛选**
- 大规模数据集（>30 张图片）使用全局描述符相似度筛选
- 计算每张图片的全局描述符（关键点描述符均值）
- Top-k 对选择替代 O(n²) 全配对，显著降低计算复杂度

**增量式 SfM**
- pycolmap 增量式结构恢复运动算法
- 参数优化：min_model_size=3，支持多子模型输出
- 选择注册图片数最多的模型作为最终结果

**点云导出**
- 稀疏点云 PLY 格式导出
- 可选稠密重建（需要 COLMAP CLI + CUDA 支持）

### 4. 前端可视化
- React 18 + TypeScript 构建单页应用
- Three.js + PLYLoader 实现浏览器内点云渲染
- 支持 360° 旋转、缩放、平移、点大小调节
- 响应式设计，Tailwind CSS v4 样式系统

### 5. 后端架构
- FastAPI 异步框架，RESTful API 设计
- SQLite 数据库 + SQLAlchemy ORM
- JWT 令牌认证，8 小时有效期
- 多用户数据隔离，项目级权限控制

### 6. 工程优化
**显存管理**
- 针对 RTX 3070 Ti 8GB 显存限制优化
- 批处理推理 + 动态显存清理
- 切片模式支持高分辨率图像（2×2 网格）

**路径兼容**
- pycolmap 不支持中文路径，使用临时 ASCII 目录
- 自动创建临时工作目录，完成后复制结果

**性能优化**
- 前端懒加载图片，分批渲染
- 后台任务异步执行，进度回调
- ZIP 文件缓存加速下载

## 技术栈总结
**语言**: Python, TypeScript, JavaScript
**框架**: FastAPI, React, Three.js
**深度学习**: PyTorch, DINOv2, ALIKED, LightGlue
**计算机视觉**: OpenCV, pycolmap, COLMAP
**数据库**: SQLite, SQLAlchemy
**前端**: Vite, Tailwind CSS, React Router
**AI 接入**: OpenAI API, Anthropic API, Google Gemini API

## 项目成果
- 完整的 Web 端三维重建平台
- 支持无序图像集自动分类与重建
- 浏览器内交互式点云展示
- 多用户系统，项目管理功能
- 代码托管于 GitHub，作为作品展示

## 技术亮点
1. 结合语义特征（DINOv2）和局部特征（ALIKED）的混合方法
2. 多 LLM 投票机制提高场景识别准确率
3. 几何验证 + Top-k 筛选优化大规模数据集处理
4. 端到端 Web 应用，从上传到可视化全流程
5. 工程化实践：显存优化、路径兼容、异步任务


