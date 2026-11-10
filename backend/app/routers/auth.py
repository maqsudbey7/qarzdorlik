from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..i18n import http_error
from ..models import User
from ..schemas import LoginIn, ProfileIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.phone == data.phone)):
        raise http_error(status.HTTP_409_CONFLICT, "phone_taken")
    user = User(name=data.name.strip(), phone=data.phone, shop_name=data.shop_name.strip(),
                password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.phone == data.phone))
    if not user or not verify_password(data.password, user.password_hash):
        raise http_error(status.HTTP_401_UNAUTHORIZED, "bad_credentials")
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.name, user.shop_name = data.name.strip(), data.shop_name.strip()
    db.commit()
    return user
