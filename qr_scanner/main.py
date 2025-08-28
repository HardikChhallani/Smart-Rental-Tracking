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
    return JSONResponse(content={"qr_data": "EQ001"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8081)