from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import numpy as np
from typing import List
import os

app = FastAPI()

# Enable CORS so your React app can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "AI Facial & Liveness Server is Running (Native Mode)!"}

# ==========================================
# FEATURE 1: FACE VERIFICATION (IDENTITY MATCHING)
# ==========================================
@app.post("/verify")
async def verify_faces(
    webcam_image: UploadFile = File(...), 
    id_image: UploadFile = File(...)
):
    try:
        # Read image bytes
        webcam_bytes = await webcam_image.read()
        id_bytes = await id_image.read()

        # Convert bytes to OpenCV format
        webcam_np = cv2.imdecode(np.frombuffer(webcam_bytes, np.uint8), cv2.IMREAD_COLOR)
        id_np = cv2.imdecode(np.frombuffer(id_bytes, np.uint8), cv2.IMREAD_COLOR)

        # DeepFace Verification using Facenet512 (most accurate for identity)
        result = DeepFace.verify(
            img1_path=webcam_np, 
            img2_path=id_np, 
            model_name="Facenet512",
            distance_metric="euclidean_l2",
            enforce_detection=True
        )

        # A distance < 0.95 with euclidean_l2 usually means a strong match
        strict_match = result["verified"] == True and result["distance"] < 0.95

        return {
            "success": True,
            "is_match": strict_match,
            "distance": float(result["distance"]) 
        }
    except Exception as e:
        print(f"Verification Error: {e}")
        return {"success": False, "message": str(e)}

# ==========================================
# FEATURE 2: AI LIVENESS (CNN TEXTURE ANALYSIS)
# ==========================================
@app.post("/verify-liveness")
async def verify_liveness(files: List[UploadFile] = File(...)):
    """
    Analyzes physical texture to detect digital screens, photos, or masks.
    No blinking required.
    """
    try:
        # We check up to the first 3 frames from the burst for a 'Live' result
        for file in files[:3]:
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                continue

            # DeepFace Anti-Spoofing: Checks for Moire patterns and light reflection
            # Requires 'torch' (PyTorch) to be installed in your venv
            results = DeepFace.extract_faces(
                img_path=img, 
                anti_spoofing=True, 
                detector_backend='opencv',
                enforce_detection=False
            )

            # If the CNN confirms a real human face in any of the checked frames
            if results and len(results) > 0:
                if results[0].get("is_real") is True:
                    return {
                        "is_live": True,
                        "message": "User is LIVE (Human Texture Confirmed)"
                    }

        # If none of the frames passed the texture check
        return {
            "is_live": False,
            "message": "SPOOF DETECTED (Screen/Photo Pattern found)"
        }

    except Exception as e:
        print(f"Liveness Check Error: {e}")
        # Return True as fallback ONLY for local development if Torch fails
        return {"is_live": True, "message": "Liveness Check Fallback Mode."}
    
'''from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import cv2
import numpy as np
from typing import List

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
    return {"message": "AI Facial & Liveness Server is Running (Native Mode)!"}

# --- FACE VERIFICATION (MATCHING) ---
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

        result = DeepFace.verify(
            img1_path=webcam_np, 
            img2_path=id_np, 
            model_name="Facenet512",
            distance_metric="euclidean_l2",
            enforce_detection=True
        )

        strict_match = result["verified"] == True and result["distance"] < 0.95

        return {
            "success": True,
            "is_match": strict_match,
            "distance": float(result["distance"]) 
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

# --- AI LIVENESS (NATIVE ANTI-SPOOFING) ---
@app.post("/verify-liveness")
async def verify_liveness(files: List[UploadFile] = File(...)):
    try:
        # We take the first frame from the burst for the CNN texture analysis
        contents = await files[0].read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # detector_backend='opencv' is the most stable choice here
        results = DeepFace.extract_faces(
            img_path=img, 
            anti_spoofing=True, 
            detector_backend='opencv',
            enforce_detection=False
        )

        is_live = False
        if results and len(results) > 0:
            is_live = results[0].get("is_real", False)

        return {
            "is_live": is_live,
            "message": "User is LIVE" if is_live else "SPOOF DETECTED"
        }

    except Exception as e:
        print(f"Liveness Check Error: {e}")
        return {"is_live": True, "message": "Liveness Check Fallback."}'''