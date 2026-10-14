(() => {
  if (location.origin !== 'https://wcms.kyeonggi.com' || !/^\/editor\/?$/.test(location.pathname)) return;
  const key = Symbol.for('gyeonggi.clip.status.1');
  if (globalThis[key]) return;
  globalThis[key] = true;
  const labels = {
    ready:'네이버 클립 URL · 자동 호환 준비 완료',
    video:'네이버 클립 URL · 영상 정보 준비 완료',
    waiting:'네이버 클립 URL · 작성기 로딩 후 URL을 다시 붙여넣어 주세요.',
    error:'네이버 클립 URL · 영상 정보를 준비하지 못했습니다. 가져오기를 중단했습니다.'
  };
  function update() {
    const input = document.querySelector('#vidoeInputTextBox');
    if (!input) return;
    let note = document.getElementById('gyeonggi-clip-status');
    if (!note) {
      note = document.createElement('div');
      note.id = 'gyeonggi-clip-status';
      note.setAttribute('role','status');
      note.style.cssText = 'font-size:12px;line-height:1.5;padding:6px 8px;margin-top:6px;background:#edf6f1;color:#17644a;white-space:normal;';
      input.insertAdjacentElement('afterend',note);
    }
    const state = document.documentElement.getAttribute('data-gyeonggi-clip-state');
    const message = labels[state] || '네이버 클립 URL · 호환 연결 안 됨 — 확장프로그램 오류를 확인해 주세요.';
    if (note.textContent !== message) note.textContent = message;
  }
  new MutationObserver(update).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-gyeonggi-clip-state']});
  update();
})();
