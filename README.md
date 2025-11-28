# KETI_FAB_DT

Three.js 기반의 단일 페이지에서 FAB 장비 FBX 모델(2종)을 시각화합니다. `index.html`을 로컬 웹 서버로 열면 두 모델을 나란히 확인할 수 있습니다.

## 실행 방법
1. Node.js로 정적 서버 실행
   ```bash
   npm install   # 의존성 없음, 한 번만 실행
   npm start
   ```
   또는 Python 내장 서버를 사용할 수도 있습니다.
   ```bash
   python -m http.server 8000
   ```
2. 브라우저에서 `http://localhost:8000/index.html`을 열어 모델을 확인합니다.

모델 파일은 `3D_model/ThinFilmDepositionSystem_01.fbx`, `3D_model/ThinFilmDepositionSystem_02.fbx` 경로에 위치합니다.
