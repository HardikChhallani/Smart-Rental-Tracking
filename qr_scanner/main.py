from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np

app = FastAPI(title="QR Code Reader (OpenCV)")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/read_qr")
async def read_qr():
    # Simulated rich QR data payload
    payload = {
        "equipment_id": "EQ001",
        "type": "Excavator",
        "manufacturer": "Caterpillar",
        "model": "320D2",
        "serial_number": "CAT0320D2ABC12345",
        "year": 2022,
        "hours_total": 3120,
        "site_id": "SITE-ALPHA",
        "status": "Active",
        "check_out_date": "2025-08-20",
        "expected_return_date": "2025-08-28",
        "check_in_date": None,
        "operator_id": "OP-7782",
        "rental_rate_per_day": 450,
        "last_service_date": "2025-07-10",
        "warranty_expiration": "2026-12-31",
        "qr_tag_id": "QR-ALPHA-001",
        "location_coordinates": "37.7749,-122.4194",
        "notes": "Assigned to trenching project",
        "meta": {
            "scanned_at": "2025-08-29T12:34:56Z",
            "source": "demo",
            "reader": "opencv-zbar"
        }
    }
    return JSONResponse(content=payload)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8081)