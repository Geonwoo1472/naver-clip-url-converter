<p align="center">
  <img src="icons/icon128.png" width="96" alt="네이버 클립 URL 변환기 아이콘" />
</p>

<h1 align="center">🎬 네이버 클립 URL 변환기</h1>

<p align="center">
  <strong>네이버 클립에서 복사한 iframe·figure 코드를 영상 URL로 변환하고,<br/>
  기사작성기의 기존 동영상 URL 입력 기능과 연결하는 Chrome 확장프로그램입니다.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/NAVER-Clip-03C75A?style=flat-square&logo=naver&logoColor=white" alt="NAVER Clip" />
  <img src="https://img.shields.io/badge/Version-1.0.0.0-08775D?style=flat-square" alt="Version 1.0.0.0" />
</p>

<p align="center">경기일보 플랫폼운영지원부 남건우 · 2026.10.14</p>

---

## 📋 목차

1. [프로그램 소개](#-프로그램-소개)
2. [주요 기능](#-주요-기능)
3. [처리 흐름](#️-처리-흐름)
4. [문제 해결 과정](#-문제-해결-과정)
5. [기술 스택](#️-기술-스택)
6. [디렉토리 구조](#-디렉토리-구조)
7. [다운로드](#-다운로드)
8. [설치 방법](#️-설치-방법)
9. [사용 방법](#-사용-방법)
10. [검증 및 적용 범위](#-검증-및-적용-범위)
11. [권한 및 데이터 처리](#-권한-및-데이터-처리)

---

## 💡 프로그램 소개

**네이버 클립 URL 변환기**는 기사에 영상을 넣는 과정에서 반복되는 HTML 소스 편집을 줄이기 위해 제작한 업무 도구입니다.

네이버 클립 공유 메뉴의 **HTML복사**로 받은 내용은 `<iframe>` 코드입니다. 이를 기존 기사작성기의 동영상 URL 입력란에 그대로 넣기 어려워, 영상 재생 주소를 추출하고 편집기가 요구하는 영상 정보를 브라우저에서 준비하도록 구현했습니다.

사용자는 복사한 내용을 붙여넣고 **URL 추출 및 복사**를 누른 다음, 기사작성기의 동영상 URL 입력란에 주소를 붙여넣으면 됩니다. 영상 미리보기 확인 후 기존 **가져오기** 버튼으로 삽입합니다.

---

## 🚀 주요 기능

- **iframe·figure → URL 변환**: 코드에서 iframe의 `src`를 추출하여 네이버 클립 영상 주소로 정리
- **HTML 문자 처리**: `&amp;`, HTML로 인코딩된 iframe, 따옴표 형식 등을 고려한 입력 분석
- **공유 링크 확인**: 네이버 단축 링크의 이동 결과나 페이지 내 영상 정보를 확인하여 URL 추출 시도
- **추출과 복사를 한 번에**: 클립보드 복사 완료 알림 제공, 자동 복사 실패 시 수동 복사 안내
- **숏폼·롱폼 구분**: 영상 유형을 유지하고 기본 크기를 각각 393 × 699 / 560 × 315로 준비
- **WCMS 작성기 자동 적용**: 일반 탭과 별도 작성기 창을 감지하여 호환 기능 적용
- **붙여넣기 감지 보완**: 키보드 입력뿐 아니라 마우스 붙여넣기와 입력값 변경 감지
- **영상 정보 재확인**: 사용자가 가져오기를 누르는 시점에 삽입 정보를 다시 준비
- **빈 영상 태그 방지**: 지원하는 클립 URL의 정보를 준비하지 못하면 빈 figure 삽입 차단

> 공유 링크 구조에 따라 추출에 실패할 수 있습니다. 이때는 영상 공유 메뉴의 **HTML복사** 내용을 사용합니다.

---

## 🏗️ 처리 흐름

```text
네이버 클립 공유 → HTML복사 / 링크 복사
                  ↓
        팝업에서 입력 형식·주소 검사
                  ↓
         영상 URL 추출 → 클립보드 복사
                  ↓
       WCMS 동영상 URL 입력란에 붙여넣기
                  ↓
    작성기 호환 모듈이 영상 정보와 iframe 준비
                  ↓
           미리보기 및 크기 설정
                  ↓
    사용자가 기존 가져오기 버튼으로 기사에 삽입
```

---

## 🔧 문제 해결 과정

### 1. URL 추출만으로 끝나지 않는 삽입 과정

초기에는 iframe에서 `src` 주소만 추출했습니다. 그러나 기존 작성기는 URL을 받은 뒤 별도로 영상 정보를 조회하여 미리보기와 삽입 데이터를 구성하는 방식이었습니다. 주소를 넣어도 이 정보가 채워지지 않으면 **내용이 없는 figure 태그**가 생성되는 문제가 있었습니다.

### 2. 기존 작성기가 사용하는 영상 정보 형식에 맞춰 연결

`wcms-compat-core.js`에서 지원하는 네이버 클립 URL을 검사하고 영상 유형·크기·iframe이 담긴 oEmbed 형식의 데이터를 구성했습니다. 기존 조회 호출에는 jQuery Deferred 방식으로 결과를 전달하여 기존 코드가 이어서 처리할 수 있도록 했습니다.

`wcms-video-bridge.js`는 작성기의 미리보기 템플릿과 `videoSearch.selected`에 필요한 정보를 연결합니다. 사용자가 **가져오기**를 누르면 기존 삽입 기능이 이 데이터를 사용해 `<figure><iframe …></iframe></figure>`를 구성합니다.

### 3. 별도 창과 붙여넣기 방식까지 보완

작성기가 새 창으로 열려 확장프로그램 아이콘을 누르기 어려운 상황을 고려해, 서비스 워커가 이미 열린 작성기와 새 작성기를 감지하도록 했습니다. 입력·변경·키보드 이벤트를 함께 감지하고 가져오기 직전에도 데이터를 확인하도록 보완했습니다.

### 4. 업무에 맞게 사용 동작 단순화

추출과 복사를 하나의 버튼으로 합치고 복사 완료 안내를 표시했습니다. HTML 입력을 문자열로 분석하고, 실제 영상 iframe은 허용한 재생 주소와 매개변수로 다시 구성합니다.

이 기능은 **브라우저에서 동작하는 임시 호환 보완**입니다. WCMS 서버의 정식 네이버 클립 지원을 구현한 것은 아니며, 다른 편집기에 적용하려면 해당 편집기의 입력·미리보기·삽입 구조에 맞춰 수정해야 합니다.

---

## 🛠️ 기술 스택

| 구분 | 기술 | 역할 |
| :--- | :--- | :--- |
| **플랫폼** | Chrome Extension / Manifest V3 | 팝업·서비스 워커·콘텐츠 스크립트 |
| **UI** | HTML5 / CSS3 | 고정 폭 팝업, 입력 및 완료 안내 |
| **변환** | JavaScript ES Modules / URL API | 코드 분석, 매개변수 검사 및 영상 URL 구성 |
| **링크 확인** | Fetch API / AbortController | 단축 링크 확인, 취소 및 시간 제한 |
| **복사** | Clipboard API | 추출한 영상 URL 복사 |
| **작성기 연동** | chrome.scripting / MAIN·ISOLATED world | 페이지 영상 정보 연결 및 상태 표시 |
| **기존 조회 호환** | jQuery Deferred | 기존 조회 콜백·완료 처리 형식 유지 |
| **검증** | Node.js 내장 테스트 러너 | 입력 검증, 요청 호환, 자동 적용, 복사 실패 처리 |

---

## 📂 디렉토리 구조

```text
naver-clip-url-converter/
├── manifest.json
├── popup.html
├── popup.css
├── popup.mjs                 # 추출·자동 복사 UI
├── converter.mjs             # 코드 및 공유 링크 → 영상 URL
├── background.js             # 작성기 탭·별도 창 감지
├── wcms-compat-core.js        # 영상 정보 및 조회 응답 구성
├── wcms-video-bridge.js       # 미리보기·삽입 정보 연결
├── wcms-compat.js             # 호환 모듈 초기화
├── wcms-status.js             # 작성기 호환 상태 표시
├── README.md
├── package.json
├── icons/
├── tests/
├── docs/
│   └── installation.md
└── release/
    └── naver-clip-url-converter.zip
```

---

## 📥 다운로드

- [확장프로그램 설치 ZIP 다운로드](https://github.com/Geonwoo1472/naver-clip-url-converter/raw/refs/heads/main/release/naver-clip-url-converter.zip)
- [전체 프로젝트 소스 다운로드](https://github.com/Geonwoo1472/naver-clip-url-converter/archive/refs/heads/main.zip)
- [설치 및 사용 안내](docs/installation.md)

---

## ⚙️ 설치 방법

Chrome 111 이상에서 사용할 수 있습니다.

| 단계 | 설명 |
| :---: | :--- |
| **1** | 설치 ZIP을 다운로드한 뒤 압축 해제 |
| **2** | Chrome 주소창에 `chrome://extensions/` 입력 |
| **3** | 우측 상단 **개발자 모드** 활성화 |
| **4** | **압축해제된 확장 프로그램 로드** 선택 |
| **5** | `manifest.json`이 들어 있는 `naver-clip-url-converter` 폴더 선택 |
| **6** | 필요한 사이트 접근을 허용하고, 퍼즐 메뉴에서 변환기 아이콘 고정 |

> **설치한 폴더는 계속 보관해 주세요.** 압축 해제 방식의 확장프로그램은 해당 폴더에서 파일을 읽습니다.

**참고 · 기존 설치본 업데이트**

기존 설치 폴더에 새 파일을 덮어쓴 뒤, 확장프로그램 화면에서 변환기 카드의 **둥근 화살표**를 누릅니다. 업데이트 전 입력한 주소는 다시 입력합니다.

---

## 📝 사용 방법

1. 네이버 클립 영상에서 **공유 → HTML복사**를 누릅니다.
2. 변환기를 열어 복사한 내용을 붙여넣고 **URL 추출 및 복사**를 누릅니다.
3. 복사 완료 알림에서 **확인**을 누릅니다.
4. WCMS 기사작성기의 **편집도구 → 동영상**을 엽니다.
5. URL 입력란에 붙여넣고 영상 미리보기를 확인합니다.
6. 필요하면 기존 작성기의 크기 설정을 조정한 뒤 **가져오기**를 누릅니다.

### 변환 예시

아래 영상 ID는 구조 설명을 위한 예시입니다.

**입력:**

```html
<figure>
  <iframe width="393" height="699" title="NAVER Clip"
    src="https://clip-viewer.naver.com/oembed/?seedMediaId=DEMO_VIDEO_ID&mediaType=SHORT_FORM&serviceType=CLIP"
    frameborder="0" allow="autoplay; clipboard-write; web-share"
    allowfullscreen></iframe>
</figure>
```

**복사되는 URL:**

```text
https://clip-viewer.naver.com/oembed/?seedMediaId=DEMO_VIDEO_ID&mediaType=SHORT_FORM&serviceType=CLIP
```

변환기는 HTML 코드 대신 URL을 복사합니다. 이후 작성기에서 실제로 영상을 가져올 때 호환 모듈이 삽입에 필요한 iframe 정보를 준비합니다.

---

## ✅ 검증 및 적용 범위

```bash
npm test
```

- 코드·URL 분석, HTML 문자 처리, 네이버 외 주소 거부 및 중복 iframe 검사
- 단축 링크 응답, 조회 실패 및 취소 처리
- 기존 oEmbed 호출 호환과 관련 없는 요청의 원래 처리 유지
- 별도 창·기존 작성기·권한 변경 시 자동 적용
- 추출 후 자동 복사, 복사 권한 거부 시 수동 복사 안내

**자동 테스트 39개 통과.** 2026년 10월 14일 실제 작성기에서 영상 미리보기 동작을 확인했으며, 사용자가 정상 동작을 확인했습니다. 여러 담당자의 실사용 검증과 기사 저장 후 공개 페이지 검증은 별도 확인 대상입니다.

WCMS 연동은 현재 코드에 지정된 작성기 도메인과 화면 구조에 한정됩니다. URL 추출 기능과 WCMS 호환 기능은 각각 별도의 모듈입니다.

---

## 🔒 권한 및 데이터 처리

- iframe·figure 코드의 직접 URL 추출은 브라우저에서 문자열을 분석하여 처리합니다.
- 단축 링크나 공유 페이지 확인에는 네이버 페이지에 대한 네트워크 요청이 필요합니다. 영상 재생도 네이버 플레이어 연결을 사용합니다.
- 원격 페이지 확인에는 `credentials: 'omit'`을 사용합니다. 쿠키를 전송하지 않는 설정으로 요청하지만, 일반 네트워크 요청 정보는 대상 서버에 전달됩니다.
- 별도 수집 서버·분석 스크립트·API 키를 사용하지 않습니다.
- `clipboardWrite`는 결과 복사에, `scripting`과 사이트 권한은 작성기 호환 모듈 적용 및 링크 확인에 사용합니다.
- 변환 입력을 스크립트로 실행하지 않으며, 영상 정보는 허용한 재생 주소와 매개변수로 다시 구성합니다.
- 작성기 연동은 영상 입력·미리보기·가져오기 준비에 한정합니다. 기사 저장·승인·발행을 자동 실행하지 않습니다.

---

**제작:** 경기일보 플랫폼운영지원부 남건우  
**버전:** 1.0.0.0
