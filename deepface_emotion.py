import sys
from deepface import DeepFace

img_path = sys.argv[1]
result = DeepFace.analyze(img_path, actions=['emotion'], enforce_detection=False)

if isinstance(result, list):
    print(result[0]['dominant_emotion'])
else:
    print(result['dominant_emotion'])