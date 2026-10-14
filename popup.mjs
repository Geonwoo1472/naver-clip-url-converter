import { convert } from './converter.mjs';

const form = document.querySelector('#converterForm');
const input = document.querySelector('#input');
const output = document.querySelector('#output');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const convertButton = document.querySelector('#convertButton');
let controller;
let requestId = 0;

function message(text, type = '') {
  status.textContent = text;
  status.className = type;
}
function clearResult() {
  output.value = '';
  result.hidden = true;
}

input.addEventListener('input', () => {
  requestId++;
  controller?.abort();
  convertButton.disabled = false;
  convertButton.textContent = 'URL 추출 및 복사';
  clearResult();
  message('붙여넣은 뒤 버튼을 눌러 주세요.');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  controller?.abort();
  controller = new AbortController();
  const thisController = controller;
  const thisId = ++requestId;
  const timer = setTimeout(() => thisController.abort(), 18000);
  clearResult();
  convertButton.disabled = true;
  convertButton.textContent = '변환 중…';
  message('영상 주소를 확인하고 있습니다.');
  try {
    const converted = await convert(input.value, { signal: thisController.signal });
    if (thisId !== requestId) return;
    output.value = converted.videoUrl;
    document.querySelector('#typeBadge').textContent = 'NAVER Clip';
    try {
      await navigator.clipboard.writeText(converted.videoUrl);
      if (thisId !== requestId) return;
      message('복사 완료! WCMS에 붙여넣으세요.', 'success');
      alert('영상 URL이 복사되었습니다.\nWCMS 동영상 URL 입력란에 붙여넣어 주세요.');
    } catch {
      if (thisId !== requestId) return;
      result.hidden = false;
      output.focus();
      output.select();
      message('자동 복사가 되지 않았습니다. 아래 선택된 주소를 Ctrl+C로 복사해 주세요.', 'error');
    }
  } catch (error) {
    if (thisId !== requestId) return;
    const text = error.name === 'AbortError'
      ? '확인 시간이 초과되었습니다. 다시 시도하거나 iframe 코드를 사용해 주세요.'
      : error instanceof TypeError
        ? '링크 연결에 실패했습니다. 인터넷 연결을 확인하거나 iframe 코드를 사용해 주세요.'
        : error.message;
    message(text, 'error');
  } finally {
    clearTimeout(timer);
    if (thisId === requestId) {
      convertButton.disabled = false;
      convertButton.textContent = 'URL 추출 및 복사';
    }
  }
});

document.querySelector('#clearButton').addEventListener('click', () => {
  input.value = '';
  input.dispatchEvent(new Event('input'));
  input.focus();
});

input.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    form.requestSubmit();
  }
});

input.focus();


