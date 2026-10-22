# FOLIO 공개 발행 가이드 — 2026-10-22

## 1) GitHub 저장소 생성

1. https://github.com/new 에 로그인합니다.
2. 저장소 이름을 `folio-archive` 로 지정합니다.
3. **Public**을 선택하세요. GitHub Free 개인 계정에서 공개 저장소 Pages 배포가 가능합니다.
4. Readme/License/.gitignore 자동 생성은 체크하지 않아도 됩니다. 저장소 생성합니다.

> 주의: 공개 저장소입니다. 민감한 캐릭터 비밀 설정·권리 없는 음악 파일 등을 업로드하지 마세요.

## 2) 배포용 ZIP을 업로드

1. `FOLIO_PUBLISH_READY.zip`을 **압축 해제**합니다. ZIP 자체를 올리면 동작하지 않습니다.
2. GitHub 저장소의 `Add file → Upload files` 를 엽니다.
3. **압축 해제한 폴더 안의 파일과 폴더**를 드래그해서 올립니다. `index.html`, `.pages.yml`, `.github/workflows/deploy.yml`, `scripts/build.mjs`가 저장소 최상단 위치에 있어야 합니다.
4. `Commit changes` 또는 `Propose changes`로 반영합니다. 
5. 저장소의 `Actions` 탭에서 `Publish FOLIO website`가 실행되는지 확인합니다.

## 3) GitHub Pages 켜기

1. GitHub 저장소 `Settings → Pages`로 이동합니다.
2. `Build and deployment → Source`를 **GitHub Actions**로 설정합니다.
3. `Actions` 탭에서 `Publish FOLIO website` 실행이 초록색 체크로 완료되는지 확인합니다. 자동 실행이 없었다면 workflow를 수동 실행하세요(`Run workflow`, `main`).
4. `Settings → Pages → Visit site`를 눌러 주소를 확인합니다.
5. 주소는 보통 `https://<GitHub계정>.github.io/folio-archive/` 입니다. 계정에 따라 실제 주소가 다르니 `Visit site`가 최종 기준입니다.

## 4) 진짜 유튜브 플레이어 테스트

1. **실제 GitHub Pages HTTPS** 사이트를 엽니다. 메인 → 우측 상단 캐릭터 목록 → 영우 프로필로 이동합니다.
2. `영우` 이름 오른쪽에 **200×200px 유튜브 플레이어**가 나타나는지 확인합니다.
3. 자동재생이 막히면 플레이어의 ▶ 버튼을 직접 누릅니다.
4. 별도 테스트: 공개 사이트 주소 뒤에 `youtube-test.html`을 붙인 URL을 엽니다. 테스트 버튼으로 플레이어를 다시 불러오고 재생해 보세요.
5. 오류 `153`은 보통 필요한 요청 출처(Referer)가 전달되지 않은 경우입니다. `101`/`150`은 영상 제공자가 삽입을 막은 경우일 수 있습니다. 원본 YouTube 링크의 재생과 홈페이지 내 임베드 재생은 서로 다릅니다.
6. 소리 있는 **자동재생은 브라우저 정책에 따라 제한**됩니다. 모든 방문자에게 반드시 자동재생되는 것은 보장할 수 없습니다.

## 5) 캐릭터 웹 관리

1. https://app.pagescms.org 로 이동해 GitHub 계정으로 로그인합니다.
2. Pages CMS GitHub App에 `folio-archive` 저장소 접근을 승인합니다.
3. FOLIO 저장소를 고릅니다. `.pages.yml`이 있으면 `캐릭터 관리`, `홈페이지 문구·대표 캐릭터`를 편집할 수 있습니다.
4. Pages CMS에서 저장하면 GitHub 파일에 반영되고, GitHub Actions가 실행되어 공개 사이트도 업데이트됩니다.

### 꼭 알아둘 차이

- 홈페이지의 `EDIT` 버튼은 **내 브라우저 안에 저장되는 임시 편집**입니다. 공용 홈페이지를 바꾸지는 않습니다.
- **실제 공개되는 편집은 Pages CMS에서 저장**해야 합니다.
- 공개 저장소에 올린 비밀 설정은 프로필에서 가려도 안전하지 않습니다.
- 유튜브 임베드 사용 가능 여부는 영상 소유자의 설정과 서비스 정책에 영향을 받습니다.

## 확인한 범위

- Node 22 기반 `npm run check`: JavaScript 문법·데이터 생성/빌드 통과.
- `dist/youtube-test.html` 자동 생성 확인.
- `content/characters/yeongu.json` 에 링크 `https://youtu.be/AMEv4ncoQxg?...` 설정됨.
- 실제 외부 유튜브 재생, GitHub Pages 원격 배포, CMS 로그인의 성공 여부는 계정 연결/게시 후 확인해야 합니다.
