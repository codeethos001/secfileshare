from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.files import router as files_router
from app.api.v1.shares import router as shares_router
from app.api.v1.keys import router as keys_router
from app.api.v1.audit import router as audit_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(uploads_router)
api_router.include_router(files_router)
api_router.include_router(shares_router)
api_router.include_router(keys_router)
api_router.include_router(audit_router)
