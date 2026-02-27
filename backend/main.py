from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import os
import shutil
import zipfile
import json

# 配置
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

DATABASE_URL = "sqlite:///./reconstruction.db"

# 数据库设置
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 数据库模型
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, nullable=False)
    status = Column(String, default="created")  # created, uploaded, classified
    image_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ImageGroup(Base):
    __tablename__ = "image_groups"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    group_name = Column(String, nullable=False)  # scene_0, scene_1, discarded
    image_list = Column(String, nullable=False)  # JSON string of image filenames
    image_count = Column(Integer, default=0)
    location_metadata = Column(String, nullable=True)  # JSON string of location metadata
    created_at = Column(DateTime, default=datetime.utcnow)

class AIConfig(Base):
    __tablename__ = "ai_config"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True)
    provider = Column(String, default="anthropic")  # gemini, openai, or anthropic
    model = Column(String, default="claude-sonnet-4-5")
    api_key = Column(String, nullable=False)
    base_url = Column(String, nullable=True)  # 自定义 API 地址（用于中转站）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 创建表
Base.metadata.create_all(bind=engine)

# Pydantic 模型
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ProjectCreate(BaseModel):
    name: str

class ProjectResponse(BaseModel):
    id: int
    name: str
    user_id: int
    status: str
    image_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AIConfigCreate(BaseModel):
    provider: str  # gemini, openai, or anthropic
    model: str
    api_key: str
    base_url: Optional[str] = None  # 自定义 API 地址

class AIConfigResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    model: str
    api_key: str
    base_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReconstructionRequest(BaseModel):
    group_name: str
    img_size: int = 1280
    enable_tiling: bool = False
    top_k: int = 4096
    enable_dense: bool = False

# 重建任务状态追踪
reconstruction_tasks: dict = {}  # key: "{project_id}_{group_name}" -> status dict

# FastAPI 应用
app = FastAPI(title="3D Reconstruction Platform API")

# CORS 配置 - 允许所有来源（用于 cpolar 内网穿透）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 依赖项
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 工具函数
def verify_password(plain_password, hashed_password):
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# API 路由
@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 检查用户名是否存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # 检查邮箱是否存在
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 验证用户
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建 token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
def root():
    return {"message": "3D Reconstruction Platform API"}

# 项目管理 API
@app.post("/api/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # 验证 token 并获取用户
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 创建项目
    db_project = Project(name=project.name, user_id=user.id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    # 创建项目文件夹
    project_dir = f"./projects/{user.id}/{db_project.id}"
    os.makedirs(os.path.join(project_dir, "uploads"), exist_ok=True)

    return db_project

@app.get("/api/projects", response_model=List[ProjectResponse])
def list_projects(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    projects = db.query(Project).filter(Project.user_id == user.id).order_by(Project.created_at.desc()).all()
    return projects

@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# 删除项目 API
@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 删除数据库中的分类记录
    db.query(ImageGroup).filter(ImageGroup.project_id == project_id).delete()

    # 删除项目记录
    db.delete(project)
    db.commit()

    # 删除项目文件夹
    project_dir = f"./projects/{user.id}/{project_id}"
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)

    return {"message": "Project deleted successfully"}

# 图片上传 API
@app.post("/api/projects/{project_id}/upload")
async def upload_images(
    project_id: int,
    files: List[UploadFile] = File(...),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 保存图片
    project_dir = f"./projects/{user.id}/{project_id}/uploads"
    os.makedirs(project_dir, exist_ok=True)

    uploaded_files = []
    for file in files:
        file_path = os.path.join(project_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        uploaded_files.append(file.filename)

    # 更新项目状态
    project.image_count = len(uploaded_files)
    project.status = "uploaded"
    db.commit()

    return {"message": f"Uploaded {len(uploaded_files)} images", "files": uploaded_files}

# 图片分类 API
@app.post("/api/projects/{project_id}/classify")
def classify_project_images(
    project_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 删除旧的分类结果（如果存在）
    classified_dir = f"./projects/{user.id}/{project_id}/classified"
    if os.path.exists(classified_dir):
        shutil.rmtree(classified_dir)

    # 删除数据库中的旧分类记录
    db.query(ImageGroup).filter(ImageGroup.project_id == project_id).delete()
    db.commit()

    # 执行分类
    project_dir = f"./projects/{user.id}/{project_id}"
    from classifier import get_classifier
    classifier = get_classifier()

    # 获取用户的 AI 配置
    ai_config = db.query(AIConfig).filter(AIConfig.user_id == user.id).first()
    if ai_config:
        result = classifier.classify_images(
            project_dir,
            api_key=ai_config.api_key,
            model=ai_config.model,
            provider=ai_config.provider,
            base_url=ai_config.base_url
        )
    else:
        result = classifier.classify_images(project_dir)

    # 保存分类结果到数据库
    for group_name, images in result["groups"].items():
        image_group = ImageGroup(
            project_id=project_id,
            group_name=group_name,
            image_list=json.dumps(images),
            image_count=len(images),
            location_metadata=json.dumps(result["metadata"].get(group_name, {}))
        )
        db.add(image_group)

    # 更新项目状态
    project.status = "classified"
    db.commit()

    return {"message": "Classification complete", "groups": result["groups"], "metadata": result["metadata"]}

# 获取分类结果 API
@app.get("/api/projects/{project_id}/groups")
def get_classification_results(
    project_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 从数据库获取分类结果
    groups = db.query(ImageGroup).filter(ImageGroup.project_id == project_id).all()

    result_groups = {}
    result_metadata = {}
    for group in groups:
        result_groups[group.group_name] = json.loads(group.image_list)
        if group.location_metadata:
            result_metadata[group.group_name] = json.loads(group.location_metadata)

    return {"groups": result_groups, "metadata": result_metadata}

# 图片预览 API
@app.get("/api/projects/{project_id}/images/{group_name}/{filename}")
def get_image(
    project_id: int,
    group_name: str,
    filename: str,
    token: str,
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 返回图片文件
    image_path = f"./projects/{user.id}/{project_id}/classified/{group_name}/{filename}"
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(image_path, media_type="image/jpeg")

# 下载分类结果 API
@app.get("/api/projects/{project_id}/download/{group_name}")
def download_group(
    project_id: int,
    group_name: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户和项目
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    group_dir = f"./projects/{user.id}/{project_id}/classified/{group_name}"
    if not os.path.exists(group_dir):
        raise HTTPException(status_code=404, detail="Group not found")

    zip_path = f"./projects/{user.id}/{project_id}/{group_name}.zip"

    # 如果 ZIP 已存在且是最新的，直接返回
    if os.path.exists(zip_path):
        zip_mtime = os.path.getmtime(zip_path)
        dir_mtime = max(os.path.getmtime(os.path.join(group_dir, f)) for f in os.listdir(group_dir))
        if zip_mtime > dir_mtime:
            return FileResponse(zip_path, media_type='application/zip', filename=f"{group_name}.zip")

    # 快速打包（使用 ZIP_STORED 不压缩，速度更快）
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
        for file in os.listdir(group_dir):
            file_path = os.path.join(group_dir, file)
            if os.path.isfile(file_path):
                zipf.write(file_path, file)

    return FileResponse(zip_path, media_type='application/zip', filename=f"{group_name}.zip")

# AI 配置管理 API
@app.post("/api/ai-config", response_model=AIConfigResponse)
def create_or_update_ai_config(
    config: AIConfigCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 检查是否已有配置
    existing_config = db.query(AIConfig).filter(AIConfig.user_id == user.id).first()

    if existing_config:
        # 更新现有配置
        existing_config.provider = config.provider
        existing_config.model = config.model
        existing_config.api_key = config.api_key
        existing_config.base_url = config.base_url
        existing_config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_config)
        return existing_config
    else:
        # 创建新配置
        new_config = AIConfig(
            user_id=user.id,
            provider=config.provider,
            model=config.model,
            api_key=config.api_key,
            base_url=config.base_url
        )
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config

@app.get("/api/ai-config", response_model=AIConfigResponse)
def get_ai_config(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 验证用户
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 获取配置
    config = db.query(AIConfig).filter(AIConfig.user_id == user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="AI config not found")

    return config

# 3D 重建 API
def run_reconstruction_task(task_key: str, image_dir: str, output_dir: str,
                            img_size: int, enable_tiling: bool, top_k: int,
                            enable_dense: bool):
    """后台执行重建任务"""
    try:
        reconstruction_tasks[task_key] = {
            "status": "running", "stage": "init", "progress": 0,
            "message": "初始化重建引擎..."
        }

        from reconstructor import ReconstructionConfig, Reconstructor
        config = ReconstructionConfig(
            img_size=img_size,
            enable_tiling=enable_tiling,
            top_k=top_k,
            enable_dense=enable_dense
        )

        def progress_cb(stage, progress, message):
            reconstruction_tasks[task_key].update({
                "stage": stage, "progress": progress, "message": message
            })

        reconstructor = Reconstructor(config)
        result = reconstructor.reconstruct(image_dir, output_dir, progress_callback=progress_cb)

        if result["success"]:
            reconstruction_tasks[task_key].update({
                "status": "completed", "stage": "done", "progress": 100,
                "message": f"完成! {result['num_images']} 张图片, {result['num_points']} 个3D点",
                "result": result
            })
        else:
            reconstruction_tasks[task_key].update({
                "status": "failed", "stage": "error", "progress": 0,
                "message": result.get("error", "未知错误")
            })
    except Exception as e:
        reconstruction_tasks[task_key].update({
            "status": "failed", "stage": "error", "progress": 0,
            "message": str(e)
        })


@app.post("/api/projects/{project_id}/reconstruct")
def start_reconstruction(
    project_id: int,
    req: ReconstructionRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 图片目录
    image_dir = f"./projects/{user.id}/{project_id}/classified/{req.group_name}"
    if not os.path.exists(image_dir):
        raise HTTPException(status_code=404, detail="Group not found")

    # 输出目录
    output_dir = f"./projects/{user.id}/{project_id}/reconstruction/{req.group_name}"
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    task_key = f"{project_id}_{req.group_name}"

    # 检查是否已有运行中的任务
    if task_key in reconstruction_tasks and reconstruction_tasks[task_key]["status"] == "running":
        raise HTTPException(status_code=409, detail="该组已有重建任务在运行中")

    background_tasks.add_task(
        run_reconstruction_task, task_key, image_dir, output_dir,
        req.img_size, req.enable_tiling, req.top_k, req.enable_dense
    )

    reconstruction_tasks[task_key] = {
        "status": "running", "stage": "init", "progress": 0,
        "message": "任务已提交..."
    }

    return {"message": "重建任务已启动", "task_key": task_key}


@app.get("/api/projects/{project_id}/reconstruct/{group_name}/status")
def get_reconstruction_status(
    project_id: int,
    group_name: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    task_key = f"{project_id}_{group_name}"
    if task_key not in reconstruction_tasks:
        # 检查是否已有完成的重建结果
        ply_path = f"./projects/{user.id}/{project_id}/reconstruction/{group_name}/point_cloud.ply"
        if os.path.exists(ply_path):
            return {"status": "completed", "stage": "done", "progress": 100,
                    "message": "重建已完成"}
        return {"status": "none", "message": "没有重建任务"}

    return reconstruction_tasks[task_key]


@app.get("/api/projects/{project_id}/reconstruct/{group_name}/model")
def get_reconstruction_model(
    project_id: int,
    group_name: str,
    token: str,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    ply_path = f"./projects/{user.id}/{project_id}/reconstruction/{group_name}/point_cloud.ply"
    if not os.path.exists(ply_path):
        raise HTTPException(status_code=404, detail="Model not found")

    # 读取文件内容并直接返回（避免中文路径问题）
    try:
        with open(ply_path, 'rb') as f:
            content = f.read()
        from fastapi.responses import Response
        return Response(content=content, media_type="application/octet-stream",
                       headers={"Content-Disposition": "attachment; filename=point_cloud.ply"})
    except Exception as e:
        print(f"[API] Failed to read PLY file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read model file: {str(e)}")


@app.get("/api/projects/{project_id}/reconstruct/{group_name}/download-colmap")
def download_colmap_files(
    project_id: int,
    group_name: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """打包下载 COLMAP 重建文件（sparse + database + images），用户可用 COLMAP GUI 查看"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    recon_dir = f"./projects/{user.id}/{project_id}/reconstruction/{group_name}"
    if not os.path.exists(recon_dir):
        raise HTTPException(status_code=404, detail="Reconstruction not found")

    zip_path = f"./projects/{user.id}/{project_id}/reconstruction/{group_name}_colmap.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
        for root, dirs, files in os.walk(recon_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, recon_dir)
                zipf.write(file_path, arcname)

    return FileResponse(zip_path, media_type='application/zip',
                        filename=f"{group_name}_colmap.zip")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
