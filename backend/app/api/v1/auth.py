from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import auth_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegister, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    try:
        user = auth_service.register_user(
            db=db,
            name=req.name,
            email=req.email,
            password=req.password,
            ip_address=client_ip
        )
        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at,
            has_keypair=bool(user.keys)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    try:
        user, token, expires_at = auth_service.authenticate_user(
            db=db,
            email=req.email,
            password=req.password,
            ip_address=client_ip
        )
        return TokenResponse(
            token=token,
            expires_at=expires_at,
            user=UserResponse(
                id=user.id,
                name=user.name,
                email=user.email,
                created_at=user.created_at,
                has_keypair=bool(user.keys)
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split()[1] if " " in auth_header else ""
    if token:
        auth_service.revoke_session(db, token)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at,
        has_keypair=bool(current_user.keys)
    )
