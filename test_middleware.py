from fastapi import FastAPI
from starlette.requests import Request

class DynamicRootPathMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            if b"x-forwarded-prefix" in headers:
                scope["root_path"] = headers[b"x-forwarded-prefix"].decode()
        return await self.app(scope, receive, send)

app = FastAPI()
app.add_middleware(DynamicRootPathMiddleware)

@app.get("/")
def read_root(request: Request):
    return {"root_path": request.scope.get("root_path")}
