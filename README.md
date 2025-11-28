# KETI_FAB_DT

Three.js 기반의 단일 페이지에서 FAB 장비 FBX 모델(2종)을 시각화합니다. `/public/index.html`을 로컬 웹 서버로 열면 두 모델을 나란히 확인할 수 있습니다.

## 실행 방법
1. Node.js로 정적 서버 실행
  ```bash
  npm install   # three.js 의존성 설치 (최초 1회)
  npm start
  ```
   또는 Python 내장 서버를 사용할 수도 있습니다.
   ```bash
   python -m http.server 8000
   ```
2. 브라우저에서 `http://localhost:8000/public/index.html`(Node 서버를 사용할 경우 루트 `/`)을 열어 모델을 확인합니다.

### 특정 IP로 접근하고 싶다면?
- 서버 바인딩 IP를 바꾸고 싶다면 `HOST` 환경 변수를 지정해 실행하세요. 예시: `HOST=192.168.0.10 npm start`
- 같은 네트워크의 다른 장치에서 접속할 때는 브라우저 주소창에 `http://<서버 IP>:8000/public/index.html`(또는 Node 서버는 루트 `/`)을 입력합니다.

모델 파일은 `public/3D_model/ThinFilmDepositionSystem_01.fbx`, `public/3D_model/ThinFilmDepositionSystem_02.fbx` 경로에 위치합니다.
