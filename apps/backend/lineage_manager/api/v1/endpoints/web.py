import json
import logging
import os
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, HTMLResponse

logger = logging.getLogger(__name__)

# Tags are for Swagger UI
router = APIRouter(tags=["web"])

# Calculate absolute path of static folder relative to this file
# This file is in src/lineage_manager/api/v1/endpoints/web.py
# Static folder is in src/lineage_manager/static/
BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
STATIC_DIR = os.path.join(BASE_DIR, "static")


@router.get("/")
def root():
    """Return frontend HTML page"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        logger.error(f"Index file not found at: {index_path}")
    return FileResponse(index_path)


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = os.path.join(STATIC_DIR, "images", "favicon.ico")
    return FileResponse(favicon_path)


@router.get("/authorized")
def handle_sso_redirect_get():
    """Handle SSO redirect URI (GET) - frontend will process the authorization code"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_path)


@router.post("/authorized")
async def handle_sso_redirect_post(request: Request):
    """Handle SSO redirect URI (POST) - frontend will process the authorization code"""
    # Extract form data
    form_data = await request.form()
    code = form_data.get("code")
    id_token = form_data.get("id_token")
    state = form_data.get("state")
    error = form_data.get("error")
    error_description = form_data.get("error_description")

    # Handle errors
    if error:
        logger.error("SSO Error: %s - %s", error, error_description)
        # We still return the index page; the frontend handles the error from window.formData

    # Read the index.html file and inject the form data as a JavaScript object
    index_path = os.path.join(STATIC_DIR, "index.html")
    with open(index_path, "r") as f:
        content = f.read()

    # Create JavaScript object with form data
    form_data_js = {}
    if code:
        form_data_js["code"] = code
    if id_token:
        form_data_js["id_token"] = id_token
    if state:
        form_data_js["state"] = state
    if error:
        form_data_js["error"] = error
    if error_description:
        form_data_js["error_description"] = error_description

    # Convert to JSON string
    form_data_json = json.dumps(form_data_js)

    # Inject the form data into the HTML
    script_tag = f"""
        <script>
            // Inject form data from POST redirect
            window.formData = new FormData();
            const formDataObj = {form_data_json};
            for (const [key, value] of Object.entries(formDataObj)) {{
                window.formData.append(key, value);
            }}
            console.debug('[Index] Injected form data from POST redirect:', formDataObj);
        </script>
    """

    # Insert the script tag after the existing comment
    content = content.replace(
        "<!-- Handle form data from POST redirect -->",
        "<!-- Handle form data from POST redirect -->" + script_tag,
    )

    return HTMLResponse(content=content)
