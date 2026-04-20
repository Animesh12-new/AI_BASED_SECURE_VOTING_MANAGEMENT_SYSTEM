from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "AI Facial Recognition Server is Running!"}

@app.post("/verify")
async def verify_faces(
    webcam_image: UploadFile = File(...), 
    id_image: UploadFile = File(...)
):
    try:
        webcam_bytes = await webcam_image.read()
        id_bytes = await id_image.read()

        webcam_np = cv2.imdecode(np.frombuffer(webcam_bytes, np.uint8), cv2.IMREAD_COLOR)
        id_np = cv2.imdecode(np.frombuffer(id_bytes, np.uint8), cv2.IMREAD_COLOR)

        # SECURITY FIX: enforce_detection is now True. 
        # DeepFace will strictly look for a face. If it fails, it throws a ValueError.
        result = DeepFace.verify(
            img1_path=webcam_np, 
            img2_path=id_np, 
            model_name="Facenet",
            enforce_detection=True 
        )

        return {
            "success": True,
            "is_match": bool(result["verified"]),
            "distance": float(result["distance"]) 
        }

    except ValueError as ve:
        # If DeepFace cannot find a face (e.g., hand covering camera), it triggers this block
        print("Security Alert: No face detected in image.")
        return {
            "success": False,
            "is_match": False,
            "error_type": "NO_FACE_FOUND",
            "message": "Could not detect a clear human face in one or both images."
        }

    except Exception as e:
        print("AI Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))