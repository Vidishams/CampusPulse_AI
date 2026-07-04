"""
Creates (or promotes) the first admin account.

Run this once, from the backend/ folder, with your virtualenv active:

    python scripts/create_admin.py

This is intentionally a command-line script, not an API endpoint --
admin creation should never be reachable over HTTP with no gate in front
of it. Every admin after this one is created by an *existing* admin
using PATCH /api/users/{id}/role from the Admin > Manage Users screen.
"""
import asyncio
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database.db import users_collection  # noqa: E402
from auth.security import hash_password  # noqa: E402


async def main():
    print("=== CampusPulse: create/promote an admin account ===\n")
    email = input("Email: ").strip().lower()

    existing = await users_collection.find_one({"email": email})
    if existing:
        if existing["role"] == "admin":
            print(f"\n{email} is already an admin. Nothing to do.")
            return
        confirm = input(f"An account for {email} already exists as '{existing['role']}'. Promote to admin? [y/N] ")
        if confirm.lower() != "y":
            print("Cancelled.")
            return
        await users_collection.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
        print(f"\n{email} is now an admin.")
        return

    name = input("Full name: ").strip()
    password = getpass.getpass("Password (min 6 characters): ")
    if len(password) < 6:
        print("Password must be at least 6 characters. Aborting.")
        return

    await users_collection.insert_one({
        "name": name,
        "email": email,
        "password": hash_password(password),
        "role": "admin",
        "department": None,
        "semester": None,
        "interests": [],
        "clubs": [],
        "isVerified": True,
    })
    print(f"\nAdmin account created for {email}. You can now log in on the website.")


if __name__ == "__main__":
    asyncio.run(main())
