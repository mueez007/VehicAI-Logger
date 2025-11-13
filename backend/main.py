import os
import uvicorn
from google.adk.cli.fast_api import get_fast_api_app
from services.service import Service
from routers import vehicle_service_logs, mechanics, file_upload
from repos.repo import Repo
from constants import DB_NAME
from routers import vehicle_service_logs, mechanics, file_upload, voice

repo = Repo(DB_NAME)
service = Service(repo)

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Configure allowed origins for CORS - Add your domains here
ALLOWED_ORIGINS = [
    "*"  # Only use this for development - remove for production
]

# Set web=True if you intend to serve a web interface, False otherwise
SERVE_WEB_INTERFACE = True

# Call the function to get the FastAPI app instance
app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Consistent router prefixes
app.include_router(vehicle_service_logs.router, prefix="/vehicle_service_logs", tags=["VehicleServiceLogs"])
app.include_router(mechanics.router, prefix="/vehicle_service_logs/api/mechanics", tags=["mechanics"])
app.include_router(file_upload.router, prefix="/vehicle_service_logs/api/files", tags=["files"])
app.include_router(voice.router, prefix="/vehicle_service_logs/api/voice", tags=["voice"])

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))