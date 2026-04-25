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

        # SECURITY UPGRADE: 
        # 1. Facenet512 checks 512 facial points instead of 128.
        # 2. euclidean_l2 is a much stricter mathematical threshold.
        result = DeepFace.verify(
            img1_path=webcam_np, 
            img2_path=id_np, 
            model_name="Facenet512", # <-- Upgraded Brain
            distance_metric="euclidean_l2", # <-- Stricter Math
            enforce_detection=True,
            anti_spoofing=False 
        )

        # Optional Manual Override: 
        # DeepFace euclidean_l2 threshold for Facenet512 is usually around 1.04. 
        # We can force it to be even stricter (e.g., 0.90) to ensure zero false positives.
        strict_match = False
        if result["verified"] == True and result["distance"] < 0.95:
            strict_match = True

        return {
            "success": True,
            "is_match": strict_match, # Using our manual strict threshold
            "distance": float(result["distance"]) 
        }

    except ValueError as ve:
        print("Security Alert: No valid face detected in image.")
        return {
            "success": False,
            "is_match": False,
            "error_type": "SECURITY_CHECK_FAILED",
            "message": "Could not detect a clear human face. Please ensure good lighting and look directly at the camera."
        }

    except Exception as e:
        print("AI Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
'''second
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
    
'''
'''
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

        # SECURITY FIX: enforce_detection ensures a face exists.
        # anti_spoofing prevents presentation attacks (photos/screens).
        result = DeepFace.verify(
            img1_path=webcam_np, 
            img2_path=id_np, 
            model_name="Facenet",
            enforce_detection=True,
            anti_spoofing=True 
        )

        return {
            "success": True,
            "is_match": bool(result["verified"]),
            "distance": float(result["distance"]) 
        }

    except ValueError as ve:
        # If DeepFace cannot find a face or detects a spoofing attempt, it triggers this block
        print("Security Alert: No valid live face detected in image.")
        return {
            "success": False,
            "is_match": False,
            "error_type": "SECURITY_CHECK_FAILED",
            "message": "Could not detect a clear, live human face. Please ensure you are looking directly at the camera."
        }

    except Exception as e:
        print("AI Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))'''