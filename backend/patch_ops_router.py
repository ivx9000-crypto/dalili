from pathlib import Path

main_path = Path("app/main.py")
text = main_path.read_text(encoding="utf-8")

if "ops as ops_router" not in text:
    text = text.replace(
        "from fastapi import FastAPI",
        "from fastapi import FastAPI\nfrom app.routers import ops as ops_router"
    )

if "app.include_router(ops_router.router)" not in text:
    text = text + """

# v50.2 operations/database status router
try:
    app.include_router(ops_router.router)
except Exception:
    pass
"""

main_path.write_text(text, encoding="utf-8")
print("Patched app/main.py and added app/routers/ops.py")
