/* FOLIO V6 editor
 * A transparent browser-local drafting layer. No passwords or GitHub tokens are
 * used in this public static page. PUBLIC publishing remains via Pages CMS.
 */
(() => {
  'use strict';
  const KEY='folio:browser-editor:v6';
  const SELECT_KEY='folio:editor-selection:v6';
  const base = window.FOLIO_DATA || {site:{},characters:[]};
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const esc = (v='') => String(v??'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = v => String(v||'').trim();
  const splitLines = v => String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const splitTags = v => String(v||'').split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
  let draft = clone(base), select = 'char:'+ (base.site.featuredId||base.characters[0]?.id||''), unsaved=false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved && validData(saved)) draft=saved;
    select = sessionStorage.getItem(SELECT_KEY)||select;
  } catch(e) {/* private browsers can disable storage */}
  window.FOLIO_DATA=draft;

  function validData(data){
    if(!data||typeof data!=='object'||!data.site||typeof data.site!=='object'||!Array.isArray(data.characters)||data.characters.length>300)return false;
    const ids=new Set();
    return data.characters.every(c=>{
      if(!c||typeof c!=='object'||typeof c.name!=='string'||!c.name.trim()||typeof c.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(c.id)||ids.has(c.id))return false;
      ids.add(c.id);return true;
    });
  }
  function syncSelection(){try{sessionStorage.setItem(SELECT_KEY,select)}catch(e){}}
  function saveLocal(){
    try{
      const data=JSON.stringify(draft);
      if(data.length>3_600_000){alert('이미지 용량이 너무 커서 브라우저에 저장할 수 없어요. 이미지를 더 작게 조정하거나 Pages CMS에서 업로드해 주세요.');return false}
      localStorage.setItem(KEY,data);
      unsaved=false;
      return true;
    }catch(err){alert('브라우저 저장에 실패했어요. 저장 공간·개인정보 보호 설정을 확인하거나 먼저 JSON 백업을 내려받아 주세요.');return false}
  }
  function reload(nextHash){syncSelection(); if(nextHash)location.hash=nextHash;location.reload()}
  function field(key,label,val='',type='text',wide=false,tip='',extras=''){
    const cls='editor-field'+(wide?' wide':'');
    const control=type==='textarea'?`<textarea name="${esc(key)}" rows="4" ${extras}>${esc(val)}</textarea>`:
      type==='checkbox'?`<label class="editor-checkrow"><input type="checkbox" name="${esc(key)}" ${val?'checked':''}> ${esc(label)}</label>`:
      type==='number'?`<input name="${esc(key)}" type="number" value="${esc(val)}" ${extras}>`:
      type==='readonly'?`<input name="${esc(key)}" type="text" value="${esc(val)}" readonly>`:
      `<input name="${esc(key)}" type="text" value="${esc(val)}" ${extras}>`;
    return `<div class="${cls}">${type==='checkbox'?'':`<label for="">${esc(label)}</label>`}${control}${tip?`<span class="hint">${esc(tip)}</span>`:''}</div>`;
  }
  function selField(key,label,value,options){
    return `<div class="editor-field"><label>${esc(label)}</label><select name="${esc(key)}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(value)===v?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
  }
  function imagePath(value){
    const path=norm(value);
    if(/^data:image\/(png|jpeg|gif|webp);base64,/i.test(path))return path;
    if(/^https:\/\//i.test(path))return path;
    const cleaned=path.replace(/^\/+/, '').replace(/^\.\//,'');
    if(cleaned.startsWith('assets/')&&!cleaned.split('/').includes('..'))return './'+cleaned.split('/').map(encodeURIComponent).join('/');
    return '';
  }
  function navButton(key,label,extra=''){
    return `<button type="button" data-select="${esc(key)}" class="${select===key?'active':''}"><span>${esc(label)}</span><span class="editor-mini-label">${esc(extra)}</span></button>`;
  }
  function render(main){
    if(!select || (select.startsWith('char:')&&!draft.characters.some(c=>c.id===select.slice(5))))select='char:'+(draft.characters[0]?.id||'');
    const sorted=[...draft.characters].sort((a,b)=>Number(a.order||999)-Number(b.order||999));
    main.innerHTML=`<section class="folio-editor"><div class="editor-heading"><div><span class="editor-eyebrow">FOLIO / EDITOR</span><h1>아카이브 편집</h1><p>캐릭터 도감을 직접 고치고 현재 브라우저에서 미리 확인할 수 있어요.</p></div><a class="editor-button" href="#/">← 홈페이지 돌아가기</a></div>
      <div class="editor-warning"><strong>저장은 이 브라우저에서만 적용돼요.</strong>이 편집 화면은 로그인 없는 개인 미리보기 도구예요. 다른 방문자의 사이트나 GitHub 파일은 바뀌지 않아요. <a href="https://app.pagescms.org" target="_blank" rel="noopener noreferrer">공개 홈페이지 변경은 Pages CMS에서 로그인 후 저장 ↗</a></div>
      <div class="editor-layout"><aside class="editor-side"><div class="editor-side-title">CHARACTERS / ${draft.characters.length}</div><div class="editor-character-list">${sorted.map(c=>navButton('char:'+c.id,c.name,c.published?'공개':'미공개')).join('')}${navButton('new','＋ 캐릭터 추가')}</div><div class="editor-side-title">ARCHIVE SETTINGS</div><div class="editor-character-list">${navButton('site','홈페이지 설정')}${navButton('backup','백업 · 복원 · 게시')}</div></aside><div class="editor-pane" id="editor-pane"></div></div></section>`;
    main.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>{
      if(unsaved&&!confirm('저장하지 않은 수정 내용이 있어요. 이동할까요?'))return;
      select=b.dataset.select;unsaved=false;syncSelection();render(main);
    }));
    const pane=main.querySelector('#editor-pane');
    if(select==='site')renderSite(pane);
    else if(select==='backup')renderBackup(pane);
    else if(select==='new')renderCharacter(pane,null);
    else renderCharacter(pane,draft.characters.find(c=>c.id===select.slice(5))||null);
  }
  function addDirty(form){form.addEventListener('input',()=>{unsaved=true});form.addEventListener('change',()=>{unsaved=true});}
  function renderCharacter(pane,c){
    const isNew=!c;
    c = c||{id:'',name:'',order:draft.characters.length+1,published:true,status:'draft',tags:[],gallery:[],relatedIds:[]};
    const image = imagePath(c.art);
    pane.innerHTML=`<div class="editor-name-row"><div><span class="editor-eyebrow">${isNew?'NEW CHARACTER':'CHARACTER / '+esc(c.id)}</span><h2>${esc(isNew?'새 캐릭터 등록':c.name)}</h2></div>${isNew?'':`<button id="remove-character" class="editor-button small danger" type="button">삭제</button>`}</div>
      <p class="editor-subheading">바꾸고 싶은 부분만 수정한 뒤 맨 아래 저장을 눌러주세요. 기본 정보는 언제든 변경할 수 있어요.</p>
      <form id="editor-char-form" class="editor-form">
      <div class="editor-section-label">01 / 기본 정보</div>
      ${field('id','URL 식별자',c.id,isNew?'text':'readonly',false,'영문 소문자·숫자·하이픈만 사용. 저장 후 변경할 수 없어요.',isNew?'required pattern="[a-z0-9-]+"':'')}
      ${field('name','캐릭터 이름',c.name,'text',false,'','required')}
      ${field('hanja','한자 표기',c.hanja)}${field('roman','영문 표기',c.roman)}
      ${field('realName','다른 이름',c.realName)}${field('world','세계관',c.world)}
      ${field('age','나이',c.age)}${field('affiliation','소속',c.affiliation)}
      ${field('role','분류·직업',c.role)}${field('order','정렬 순서',c.order,'number')}
      ${selField('status','프로필 상태',c.status||'draft',[['draft','작성 중'],['complete','정리 완료']])}
      ${field('published','사이트에서 보이기',c.published,'checkbox',false,'끄면 브라우저 미리보기 목록에서 감춰져요. 공개 GitHub에서는 데이터 보호가 되지 않습니다.')}
      <div class="editor-section-label">02 / 설명과 이야기</div>
      ${field('summary','한 줄 소개',c.summary,'textarea',true)}
      ${field('blurb','프로필 상단 설명',c.blurb,'textarea',true)}
      ${field('publicStory','공개 서사',c.publicStory,'textarea',true)}
      ${field('spoilerStory','펼쳐 보는 이야기',c.spoilerStory,'textarea',true,'비밀 보관소가 아니에요. 웹 공개해도 되는 내용만 입력하세요.')}
      ${field('quote','대표 대사',c.quote,'textarea',true)}
      ${field('tags','키워드',Array.isArray(c.tags)?c.tags.join(', '):'','text',true,'쉼표로 구분: 구류문, 가면, 피영극')}
      ${field('relatedIds','관계 캐릭터 식별자',Array.isArray(c.relatedIds)?c.relatedIds.join(', '):'','text',true,'다른 캐릭터의 URL 식별자를 쉼표로 구분해 입력하세요.')}
      <div class="editor-section-label">03 / 이미지 · 음악</div>
      ${field('art','대표 이미지 경로 또는 HTTPS 이미지 주소',c.art,'text',true,'브라우저에만 저장할 이미지는 아래 업로드에서 선택하세요. 공개 홈페이지의 이미지는 Pages CMS에서 업로드하세요.')}
      <div class="editor-field wide"><label>내 PC에서 이미지 고르기 (브라우저 미리보기용)</label><div class="editor-upload-controls"><input id="editor-art-upload" type="file" accept="image/jpeg,image/png,image/webp"/><span class="editor-media-note">이미지 자동 축소 후 이 기기에만 저장</span></div><div id="editor-art-preview">${image?`<img class="editor-image-preview" src="${esc(image)}" alt="현재 대표 이미지">`:''}</div></div>
      ${field('gallery','갤러리 이미지 경로 (한 줄에 하나)',Array.isArray(c.gallery)?c.gallery.join('\n'):'','textarea',true,'/assets/images/그림.jpg 또는 HTTPS 이미지 주소. 실제 파일 업로드는 Pages CMS에서 지원해요.')}
      ${field('youtubeUrl','유튜브 테마곡 URL',c.youtubeUrl,'text',true,'영우처럼 https://youtu.be/AMEv4ncoQxg 형태로 입력하면 이름 옆 200×200 재생 영역이 나타나요.')}
      ${field('trackTitle','음악 제목',c.trackTitle)}${field('trackType','음악 부제',c.trackType)}
      ${field('bgm','MP3 파일 경로 (YouTube를 비워 두었을 때)',c.bgm,'text',true,'/assets/audio/파일명.mp3 형식. 음악 파일 자체는 Pages CMS에서 업로드하세요.')}
      <div class="editor-form-actions"><button class="editor-button primary" type="submit" data-action="save">브라우저에 저장</button><button class="editor-button" type="submit" data-action="preview">저장하고 프로필 보기 ↗</button><span class="editor-feedback" role="status" id="editor-feedback"></span></div>
      </form>`;
    const f=pane.querySelector('#editor-char-form');addDirty(f);
    const uploader=pane.querySelector('#editor-art-upload');
    uploader.addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)){alert('JPG, PNG, WEBP 이미지만 선택해 주세요.');return}
      if(file.size>10_000_000){alert('원본 이미지가 너무 커요. 10MB 이하로 선택해 주세요.');return}
      try{
        const data=await shrinkImage(file);
        f.elements.namedItem('art').value=data;
        pane.querySelector('#editor-art-preview').innerHTML=`<img class="editor-image-preview" src="${esc(data)}" alt="업로드한 이미지 미리보기">`;
        unsaved=true;
      }catch(err){alert('이미지를 읽지 못했어요. 다른 이미지로 다시 시도해 주세요.');}
    });
    f.elements.namedItem('art').addEventListener('change',e=>{
      const url=imagePath(e.target.value);
      pane.querySelector('#editor-art-preview').innerHTML=url?`<img class="editor-image-preview" src="${esc(url)}" alt="대표 이미지 미리보기">`:'';
    });
    f.addEventListener('submit',e=>{
      e.preventDefault(); const fd=new FormData(f);
      const id=norm(fd.get('id')).toLowerCase(),name=norm(fd.get('name'));
      if(!/^[a-z0-9-]{1,64}$/.test(id)){alert('식별자는 영문 소문자·숫자·하이픈만 입력해 주세요.');return}
      if(!name){alert('캐릭터 이름을 입력해 주세요.');return}
      if(isNew&&draft.characters.some(v=>v.id===id)){alert('이미 사용 중인 식별자예요.');return}
      const fields=['name','hanja','roman','realName','world','age','affiliation','role','summary','blurb','publicStory','spoilerStory','quote','art','youtubeUrl','trackTitle','trackType','bgm'];
      const updated={...c,id};fields.forEach(key=>updated[key]=String(fd.get(key)||'').trim());
      updated.order=Number(fd.get('order')||0)||draft.characters.length+1;
      updated.status=String(fd.get('status')||'draft');updated.published=fd.get('published')==='on';
      updated.tags=splitTags(fd.get('tags')); updated.relatedIds=splitTags(fd.get('relatedIds')).filter(v=>v!==id);
      updated.gallery=splitLines(fd.get('gallery'));
      if(isNew)draft.characters.push(updated); else draft.characters=draft.characters.map(v=>v.id===id?updated:v);
      if(!draft.site.featuredId)draft.site.featuredId=id;
      select='char:'+id;
      if(!saveLocal())return;
      const action=e.submitter?.dataset.action||'save';
      reload(action==='preview' ? '#/character/'+encodeURIComponent(id) : '#/edit');
    });
    pane.querySelector('#remove-character')?.addEventListener('click',()=>{
      if(!confirm('이 브라우저에 저장된 '+c.name+'의 기록을 삭제할까요? 공개된 GitHub 저장소의 자료에는 영향을 주지 않아요.'))return;
      draft.characters=draft.characters.filter(v=>v.id!==c.id);
      if(draft.site.featuredId===c.id)draft.site.featuredId=draft.characters[0]?.id||'';
      select='char:'+(draft.characters[0]?.id||'');
      if(saveLocal())reload('#/edit');
    });
  }
  function shrinkImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();img.onerror=reject;
        img.onload=()=>{
          const scale=Math.min(1,850/img.width,1050/img.height);
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          let result=canvas.toDataURL('image/webp',.70);
          if(!result.startsWith('data:image/webp'))result=canvas.toDataURL('image/jpeg',.68);
          if(result.length>1_100_000){reject(new Error('too big'));return}
          resolve(result);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function renderSite(pane){
    const d=draft.site||{};
    pane.innerHTML=`<span class="editor-eyebrow">SITE SETTINGS</span><h2>홈페이지 설정</h2><p class="editor-subheading">첫 화면 문구, 대표 캐릭터, 사이트 설명을 변경해 보세요.</p><form class="editor-form" id="editor-site-form">
      ${field('brand','로고 이름',d.brand)}${field('siteTitle','브라우저 제목',d.siteTitle)}
      ${field('siteDescription','검색 결과 소개',d.siteDescription,'textarea',true)}
      ${field('introEyebrow','메인 위 작은 문구',d.introEyebrow)}${field('introTitle','메인 제목 첫 줄',d.introTitle)}
      ${field('introAccent','메인 제목 둘째 줄',d.introAccent)}${field('introText','메인 소개 문구',d.introText,'textarea',true)}
      <div class="editor-field wide"><label>첫 화면 대표 캐릭터</label><select name="featuredId">${draft.characters.map(c=>`<option value="${esc(c.id)}" ${d.featuredId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
      ${field('aboutTitle','About 제목',d.aboutTitle)}${field('footerCredit','하단 저작권 문구',d.footerCredit)}
      ${field('aboutText','About 소개글',d.aboutText,'textarea',true)}
      <div class="editor-form-actions"><button class="editor-button primary" type="submit">브라우저에 저장</button><button class="editor-button" type="submit" data-action="preview">저장하고 첫 화면 보기 ↗</button></div></form>`;
    const f=pane.querySelector('#editor-site-form');addDirty(f);
    f.addEventListener('submit',e=>{
      e.preventDefault();const fd=new FormData(f);const keys=['brand','siteTitle','siteDescription','introEyebrow','introTitle','introAccent','introText','aboutTitle','aboutText','footerCredit','featuredId'];
      const next={...draft.site}; keys.forEach(k=>next[k]=String(fd.get(k)||'').trim());draft.site=next;
      if(saveLocal())reload(e.submitter?.dataset.action==='preview'?'#/':'#/edit');
    });
  }
  function exportJSON(){
    const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='folio-browser-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function renderBackup(pane){
    pane.innerHTML=`<span class="editor-eyebrow">MANAGE / EXPORT</span><h2>백업 · 복원 · 게시</h2><p class="editor-subheading">브라우저에 저장한 내용을 보관하거나 실제 웹사이트로 게시할 때 사용해요.</p>
    <div class="editor-utility"><div class="editor-utility-card"><span class="editor-badge">1 / LOCAL</span><h3>이 브라우저 편집본 백업</h3><p>내가 고친 정보와 미리보기 이미지를 JSON 파일로 내려받아요. 컴퓨터를 바꾸거나 저장 기록이 지워졌을 때 다시 불러올 수 있어요.</p><div class="editor-buttons"><button id="editor-export" class="editor-button primary" type="button">JSON 백업 내려받기 ↓</button></div><label class="editor-field" style="margin-top:16px"><strong style="font-size:12px">저장해 둔 JSON 파일 복원</strong><input class="editor-file-input" type="file" id="editor-import" accept=".json,application/json"></label></div>
    <div class="editor-utility-card"><span class="editor-badge">2 / PUBLISH</span><h3>공개 홈페이지에도 반영하기</h3><p>현재 페이지의 브라우저 저장은 다른 사람에게 보이지 않아요. 실제 사이트를 바꾸려면 Pages CMS에서 GitHub 로그인 후 동일한 내용을 수정하고 저장하세요. 이미지·MP3도 Pages CMS에서 파일을 업로드해야 공개 사이트에 반영돼요.</p><div class="editor-buttons"><a class="editor-button primary" href="https://app.pagescms.org" target="_blank" rel="noopener noreferrer">Pages CMS에서 공개 편집 ↗</a></div></div>
    <div class="editor-utility-card"><span class="editor-badge">3 / RESET</span><h3>기본 상태로 되돌리기</h3><p>이 브라우저의 모든 편집 내역을 삭제하고, 마지막으로 배포된 기본 홈페이지 데이터로 돌아가요. 되돌리기 전에 백업 파일을 내려받는 걸 추천해요.</p><button id="editor-reset" class="editor-button danger" type="button">브라우저 편집본 초기화</button></div></div>`;
    pane.querySelector('#editor-export').addEventListener('click',exportJSON);
    pane.querySelector('#editor-import').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>5_000_000){alert('5MB 이하의 FOLIO 백업 JSON만 불러올 수 있어요.');return}
      try{const data=JSON.parse(await file.text());if(!validData(data))throw new Error('invalid');
        if(!confirm('현재 브라우저 편집 내역을 이 백업 내용으로 교체할까요?'))return;
        draft=data;if(saveLocal())reload('#/edit');
      }catch(err){alert('FOLIO 백업 파일을 읽지 못했어요. JSON 형식과 파일 내용을 확인해 주세요.');}
    });
    pane.querySelector('#editor-reset').addEventListener('click',()=>{
      if(!confirm('이 브라우저에서 편집한 모든 기록을 초기화할까요? 되돌릴 수 없어요.'))return;
      try{localStorage.removeItem(KEY);sessionStorage.removeItem(SELECT_KEY);location.hash='#/';location.reload()}catch(e){alert('브라우저 저장소 접근이 차단되어 있어요.')}
    });
  }
  window.FOLIO_EDITOR={render,hasDraft:()=>{try{return !!localStorage.getItem(KEY)}catch(e){return false}}};
})();
