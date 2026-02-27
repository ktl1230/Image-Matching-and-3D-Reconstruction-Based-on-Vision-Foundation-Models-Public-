# Image Matching and 3D Reconstruction System

A web-based platform for automatic image classification and 3D reconstruction from unordered image collections.

## Overview

This system provides an end-to-end pipeline for processing large-scale image datasets:

1. **Semantic Clustering**: Groups images by scene using DINOv2 visual features
2. **Scene Recognition**: Identifies landmarks and locations using multi-LLM voting
3. **3D Reconstruction**: Generates sparse point clouds via Structure-from-Motion
4. **Interactive Visualization**: Displays 3D models in browser with Three.js

## Technical Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **3D Rendering**: Three.js with PLYLoader
- **Routing**: React Router v6

### Backend
- **API**: FastAPI with async support
- **Database**: SQLite + SQLAlchemy ORM
- **Authentication**: JWT tokens (8-hour expiry)

### Computer Vision
- **Feature Extraction**: DINOv2-large (1024-dim semantic features)
- **Local Features**: ALIKED detector (1280px, 4096 keypoints)
- **Feature Matching**: LightGlue + USAC-MAGSAC geometric verification
- **SfM**: pycolmap incremental reconstruction

### AI Integration
- **Providers**: OpenAI GPT-4o, Anthropic Claude, Google Gemini
- **Strategy**: Multi-sample voting mechanism (3 samples, max 6 API calls)

## Core Algorithms

### Image Classification Pipeline

1. **Feature Extraction**
   - Load images in batches (batch_size=4)
   - Extract 1024-dim embeddings using DINOv2-large
   - L2 normalization for cosine similarity

2. **Graph Construction**
   - Compute pairwise cosine similarity
   - Build graph with edges where similarity > 0.65
   - Use NetworkX for connected components

3. **Clustering**
   - Extract connected components as scene groups
   - Filter groups with < 3 images
   - Assign unique scene names via LLM voting

### 3D Reconstruction Pipeline

1. **Feature Detection**
   - ALIKED extracts keypoints at 1280px resolution
   - Top-k selection (4096 keypoints per image)
   - Optional 2×2 tiling for large images

2. **Feature Matching**
   - LightGlue matches descriptors between image pairs
   - USAC-MAGSAC filters outliers (threshold: 4px, confidence: 0.9999)
   - Top-k pair selection for large datasets (>30 images)

3. **Camera Calibration**
   - Read EXIF focal length as prior
   - Scale focal length to current resolution
   - Per-image camera model (SIMPLE_PINHOLE)

4. **Structure-from-Motion**
   - pycolmap incremental reconstruction
   - min_model_size=3, multiple_models=True
   - Select best model by registered image count

5. **Export**
   - Sparse point cloud in PLY format
   - Optional dense reconstruction (requires COLMAP CLI + CUDA)

## Installation

### Requirements
- Python 3.10+
- Node.js 18+
- CUDA 11.8+ (recommended for GPU acceleration)
- 8GB+ GPU memory

### Setup

```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Start backend (localhost:8000)
cd backend && python main.py

# Install and start frontend (localhost:5173)
cd frontend && npm install && npm run dev
```

Windows users can run `START_ALL.bat` for one-click startup.

## Usage

1. Register/login to create an account
2. Configure AI provider in Settings (OpenAI/Claude/Gemini + API key)
3. Create a new project and upload images
4. Run classification to group images by scene
5. Navigate to 3D Viewer, select a group, and start reconstruction
6. View and download the generated point cloud

## Reconstruction Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Resolution | 1280px | Feature extraction resolution |
| Keypoints | 4096 | ALIKED top-k selection |
| Tiling | Off | 2×2 grid tiling for large images |
| RANSAC | On | Geometric verification for outlier filtering |
| EXIF Focal | On | Use camera focal length as prior |

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI routes and API endpoints
│   ├── classifier.py        # DINOv2 clustering + AI scene recognition
│   └── reconstructor.py     # ALIKED + LightGlue + pycolmap pipeline
├── frontend/
│   └── src/
│       ├── components/      # 3D Viewer, Dashboard components
│       └── pages/           # Login, Projects, Settings pages
├── agents/
│   └── location_agent.py    # Multi-LLM voting agent
├── nets/                    # ALIKED model definition
├── models/                  # Pre-trained weights
└── START_ALL.bat            # One-click startup script
```

## Performance Optimizations

- **Memory Management**: Dynamic GPU memory cleanup between operations
- **Batch Processing**: Efficient feature extraction with batching
- **Top-k Selection**: Reduces O(n²) matching to manageable pairs for large datasets
- **Chinese Path Support**: Temporary ASCII directories for pycolmap compatibility

## References

- DINOv2: Learning Robust Visual Features without Supervision (Meta AI, 2023)
- ALIKED: A Lighter Keypoint and Descriptor Extraction Network (2023)
- LightGlue: Local Feature Matching at Light Speed (ETH Zurich, 2023)
- COLMAP: Structure-from-Motion Revisited (Schönberger & Frahm, 2016)

