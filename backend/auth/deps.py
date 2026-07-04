"""
Reusable FastAPI dependencies.

get_current_user: decodes the bearer token and fetches the user document.
require_role(...): a dependency *factory* -- call it with the roles allowed
on a given route, e.g. Depends(require_role("faculty", "admin")). This
keeps role checks declarative at the route signature instead of scattered
if-checks inside every handler body.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from auth.security import decode_access_token
from database.db import users_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = await users_collection.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def require_role(*allowed_roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return user
    return checker
