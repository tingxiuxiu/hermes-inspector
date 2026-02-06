import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        workers=1,
        host="127.0.0.1",
        port=13710,
        reload=True,
        reload_excludes=["src/tests"],
    )
