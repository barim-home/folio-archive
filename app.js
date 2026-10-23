/* FOLIO — 데이터는 여기서 변경할 수 있습니다. 실제 사이트 공개 전 설명과 이미지 사용 범위를 확인하세요. */
const SITE_DATA = window.FOLIO_DATA || {site:{},characters:[]};
const siteSettings = SITE_DATA.site || {};
// Assets uploaded in Pages CMS may start with /assets/. Rebase them for GitHub Pages project paths.
function assetUrl(value='') {
  const path=String(value||'').trim();
  if (!path) return '';
  if (/^https:\/\//i.test(path)) return path;
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(path)) return path;
  if (/^(?:data:|blob:|javascript:|\/\/)/i.test(path)) return '';
  let clean=path.replace(/^\.\//,'').replace(/^\/+/, '');
  if (!clean.startsWith('assets/')) return '';
  if (clean.split('/').includes('..')) return '';
  return './'+clean.split('/').map(encodeURIComponent).join('/');
}
const characters = (SITE_DATA.characters || []).filter(c => c && c.published===true && c.id && c.name)
  .sort((a,b)=>Number(a.order||999)-Number(b.order||999)||a.name.localeCompare(b.name,'ko'))
  .map((c,i)=>({...c,number:String(i+1).padStart(3,'0'),tags:Array.isArray(c.tags)?c.tags:[],gallery:Array.isArray(c.gallery)?c.gallery:[],relatedIds:Array.isArray(c.relatedIds)?c.relatedIds:[],art:assetUrl(c.art),bgm:assetUrl(c.bgm)}));
const countText=String(characters.length).padStart(2,'0');
function getFeatured() {return characters.find(c=>c.id===siteSettings.featuredId)||characters[0]}
function plainLines(v) {return escapeHtml(v||'').replace(/\n/g,'<br>')}

const app=document.getElementById('main');
let filter='all', searchQuery='', currentTab='profile', showSpoiler=false;
const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
// YouTube links are managed per character in Pages CMS. Keep only official embeds.
function youTubeVideoId(value='') {
  const raw=String(value||'').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url=new URL(raw);
    if (url.protocol!=='https:') return '';
    const host=url.hostname.toLowerCase();
    let id='';
    if (host==='youtu.be' || host==='www.youtu.be') id=url.pathname.split('/')[1]||'';
    else if (['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)) {
      if (url.pathname==='/watch') id=url.searchParams.get('v')||'';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id=url.pathname.split('/')[2]||'';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
  } catch(e) { return ''; }
}
function hasYouTube(char){return !!(char&&youTubeVideoId(char.youtubeUrl))}
function youtubeEmbedUrl(id){
  return 'https://www.youtube.com/embed/'+encodeURIComponent(id)
    +'?autoplay=1&playsinline=1&controls=1&enablejsapi=1&rel=0&loop=1&playlist='+encodeURIComponent(id)
    +(location.protocol==='https:'?'&origin='+encodeURIComponent(location.origin):'');
}
// V7.2: the YouTube iframe lives OUTSIDE #main. This function only allocates
// a visual slot beside the character's name; route changes never remove audio.
function youtubeProfilePlayer(char){
  const id=youTubeVideoId(char.youtubeUrl);
  if(!id)return '';
  return `<div class="profile-youtube youtube-slot" data-youtube-slot="${escapeHtml(id)}" aria-label="${escapeHtml(char.name)}의 테마곡 플레이어 위치"><span class="sr-only">독립 OST 패널의 유튜브 플레이어</span></div>`;
}
// This is a layout slot only. The iframe itself remains mounted once in the
// persistent player container outside <main>, preserving playback on SPA routes.
function ostSidePanel(char){
  if(!hasYouTube(char))return '';
  return `<aside class="ost-side-panel" aria-label="${escapeHtml(char.name)} 캐릭터 OST"><div class="ost-rail-header"><span class="ost-rail-eyebrow">LISTEN / 01</span><h3>SOUNDTRACK<span aria-hidden="true"> ↗</span></h3><p>${escapeHtml(char.name)}의 테마곡</p></div>${youtubeProfilePlayer(char)}</aside>`;
}
const permanentYouTube=document.getElementById('persistent-youtube');
let activeYTPlayer=null;
let activeYTVideoId='';
let ytPositionRequested=false;
function setYouTubeMessage(message){
  const el=document.getElementById('youtube-play-status');
  if(el)el.textContent=message;
}
function youtubePlayerMarkup(char,id){
  const url='https://www.youtube.com/watch?v='+encodeURIComponent(id);
  const preview=window.FOLIO_PREVIEW_MODE===true || location.protocol==='file:';
  const play=preview
    ? `<a class="yt-player yt-preview-placeholder" href="${url}" target="_blank" rel="noopener noreferrer" title="YouTube에서 듣기"><span class="yt-preview-play">▶</span><strong>YouTube 테마곡</strong><small>로컬 미리보기에서는 YouTube로 연결돼요</small></a>`
    : `<iframe id="profile-youtube-player" class="yt-player" width="200" height="200" src="${youtubeEmbedUrl(id)}" title="${escapeHtml(char.name)} · ${escapeHtml(char.trackTitle||'유튜브 테마곡')}" loading="eager" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  return `<div class="profile-youtube" aria-label="${escapeHtml(char.name)}의 유튜브 테마곡"><div class="yt-caption"><span class="yt-caption-icon">▶</span> CHARACTER OST <span class="yt-continuous">연속 재생</span></div>${play}<span class="yt-track-name">${escapeHtml(char.trackTitle||'YouTube 테마곡')}</span><p id="youtube-play-status" class="yt-note" role="status">${preview?'웹에 게시한 버전에서 재생 상태를 확인할 수 있어요.':'메인과 비밀 기록에서 같은 음악이 이어집니다.'}</p><button type="button" id="youtube-play-retry" class="yt-retry" aria-label="유튜브 음악 재생">▶ 음악 재생</button><a class="yt-open" href="${url}" target="_blank" rel="noopener noreferrer">YouTube에서 열기 ↗</a></div>`;
}
function initializeYouTubePlayer(){
  const iframe=document.getElementById('profile-youtube-player');
  if(!iframe || window.FOLIO_PREVIEW_MODE===true || location.protocol==='file:')return;
  const attachingFor=activeYTVideoId;
  const attach=()=>{
    if(!iframe.isConnected || activeYTVideoId!==attachingFor || !window.YT?.Player || activeYTPlayer)return;
    try{
      activeYTPlayer=new YT.Player(iframe,{
        events:{
          onReady:e=>{try{e.target.playVideo()}catch(_e){}},
          onStateChange:e=>{
            if(e.data===YT.PlayerState.PLAYING)setYouTubeMessage('♫ 재생 중 · 화면을 이동해도 이어집니다.');
            if(e.data===YT.PlayerState.PAUSED)setYouTubeMessage('일시정지 · ▶ 버튼으로 이어서 재생할 수 있어요.');
          },
          onAutoplayBlocked:()=>setYouTubeMessage('모바일 자동재생 제한: 영상 안의 ▶를 한 번 눌러주세요.'),
          onError:()=>setYouTubeMessage('이 영상은 외부 재생이 제한될 수 있어요. YouTube에서 열기를 이용해 주세요.')
        }
      });
    }catch(e){setYouTubeMessage('플레이어 오류: 영상 안의 ▶를 눌러주세요.');}
  };
  if(window.YT?.Player){attach();return;}
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{if(typeof previous==='function')previous();attach();};
  if(!document.querySelector('script[data-folio-yt-api]')){
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';
    script.async=true;
    script.dataset.folioYtApi='true';
    document.head.appendChild(script);
  }
}
function clearYouTubePlayer(){
  if(activeYTPlayer){try{activeYTPlayer.destroy()}catch(e){}activeYTPlayer=null;}
  activeYTVideoId='';
  permanentYouTube.replaceChildren();
  permanentYouTube.hidden=true;
  permanentYouTube.classList.remove('yt-docked');
}
function positionPersistentYouTube(){
  if(permanentYouTube.hidden)return;
  const slot=document.querySelector('[data-youtube-slot]');
  if(slot && slot.dataset.youtubeSlot===activeYTVideoId){
    permanentYouTube.classList.remove('yt-docked');
    const r=slot.getBoundingClientRect();
    permanentYouTube.style.left=(r.left+window.scrollX)+'px';
    permanentYouTube.style.top=(r.top+window.scrollY)+'px';
  }else{
    // Always show the official, at-least-200x200 player rather than silently
    // leaving an invisible YouTube iframe on other archive pages.
    permanentYouTube.classList.add('yt-docked');
    permanentYouTube.style.left='';
    permanentYouTube.style.top='';
  }
}
function requestYouTubePosition(){
  if(ytPositionRequested)return;
  ytPositionRequested=true;
  requestAnimationFrame(()=>{ytPositionRequested=false;positionPersistentYouTube();});
}
window.addEventListener('resize',requestYouTubePosition);
window.addEventListener('scroll',requestYouTubePosition,{passive:true});
function keepYouTubePlayingFor(char){
  const id=youTubeVideoId(char?.youtubeUrl);
  if(!id)return;
  // CRITICAL: do not change src, destroy, or recreate iframe if same video.
  if(id!==activeYTVideoId){
    clearYouTubePlayer();
    activeYTVideoId=id;
    permanentYouTube.innerHTML=youtubePlayerMarkup(char,id);
    permanentYouTube.hidden=false;
    initializeYouTubePlayer();
  }
  positionPersistentYouTube();
}
function replayProfileYouTube(){
  if(!activeYTVideoId)return;
  setYouTubeMessage('♫ 재생 요청 중…');
  try{
    if(activeYTPlayer && typeof activeYTPlayer.playVideo==='function')activeYTPlayer.playVideo();
    else setYouTubeMessage('▶ 영상 재생 버튼을 눌러주세요. 시작 후에는 페이지 이동 중에도 이어집니다.');
  }catch(e){setYouTubeMessage('영상 안의 ▶를 눌러주세요.');}
}
permanentYouTube.addEventListener('click',e=>{
  if(e.target.closest('#youtube-play-retry'))replayProfileYouTube();
});
const iconArrow='↗';
function artwork(char, large=false){
  if(char.art) return `<img src="${escapeHtml(char.art)}" alt="${escapeHtml(char.name)} 캐릭터 일러스트" loading="${large?'eager':'lazy'}">`;
  return `<div class="symbol-visual" role="img" aria-label="${escapeHtml(char.name)}를 상징하는 글자 타이포그래피"><span class="hanzi">${escapeHtml((char.hanja||char.name).slice(0,1))}</span><span class="roman">${escapeHtml((char.roman||char.name).split('').join(' '))}</span><span class="decor-text">CHARACTER ARCHIVE · NO. ${char.number}</span></div>`;
}
function card(char){return `<article class="char-card"><a href="#/character/${encodeURIComponent(char.id)}" data-music-card="${char.id}" aria-label="${escapeHtml(char.name)} 프로필 열기. 인물 선택 시 테마곡 재생 시도"><div class="card-visual" data-track-trigger="${char.id}">${artwork(char)}<span class="card-number">NO. ${char.number}</span><span class="music-card-label" aria-hidden="true">♫ &nbsp; IMAGE · PLAY BGM</span><span class="card-open" aria-hidden="true">${iconArrow}</span></div><div class="card-copy"><div class="card-meta"><span>WHERE WINDS MEET</span><span>${char.status==='complete'?'PROFILE READY':'IN PROGRESS'}</span></div><div class="card-title-row"><h3>${escapeHtml(char.name)}</h3><em>${escapeHtml(char.roman)}</em></div><p class="card-desc">${escapeHtml(char.summary)}</p></div></a></article>`}
function home(){
  const featured=getFeatured();
  const worlds=new Set(characters.map(c=>c.world).filter(Boolean));
  // The public main page includes a separate right-hand soundtrack rail.
  // The YouTube iframe remains a single persistent player between routes.
  const homeSound=featured&&hasYouTube(featured);
  const feature=featured?`<section class="featured-record ${homeSound?'has-ost':''}" aria-label="대표 캐릭터"><div class="featured-copy"><span class="section-label">On the cover / No. ${featured.number}</span><div class="feature-rule"></div><span class="feature-label">FEATURED PERSON · VOL.01</span><div class="featured-name-with-music"><h2>기록의 첫 장,<br><span>${escapeHtml(featured.name)}</span></h2></div><p>${escapeHtml(featured.summary||'')}<br>${escapeHtml(featured.blurb||'')}</p><a class="feature-link" href="#/character/${encodeURIComponent(featured.id)}">프로필 열어보기 <span aria-hidden="true">↗</span></a><div class="feature-foot"><span>${escapeHtml(featured.roman||featured.name)}</span><span>ARCHIVED / ${featured.number}</span></div></div><button type="button" class="featured-art" data-track-trigger="${featured.id}" data-track-go="${featured.id}" aria-label="${escapeHtml(featured.name)} 이미지: 테마곡 재생하고 프로필 열기">${artwork(featured,true)}<span class="feature-play">♫ &nbsp; 프로필 열기 · 테마곡 재생 시도</span></button>${ostSidePanel(featured)}</section>`:'';
  app.innerHTML=`<section class="intro" aria-labelledby="home-title"><div><span class="section-label">${escapeHtml(siteSettings.introEyebrow||'A curated collection of fictional lives')}</span><h1 id="home-title">${escapeHtml(siteSettings.introTitle||'이름 너머의')}<br><span class="outline-word">${escapeHtml(siteSettings.introAccent||'이야기를 모으다.')}</span></h1><p>${plainLines(siteSettings.introText||'서로 다른 삶, 저마다의 기록.\n작은 세계에 남겨진 인물들을 한 장씩 펼쳐 봅니다.')}</p></div><aside class="intro-aside" aria-label="아카이브 통계"><div class="vertical-index">THE ARCHIVE / VOL. 01</div><div class="aside-small"><span>CHARACTERS</span><span>${countText}</span></div><div class="aside-small"><span>UNIVERSES</span><span>${String(worlds.size).padStart(2,'0')}</span></div><div class="aside-small"><span>COLLECTION</span><span>ONGOING</span></div></aside></section>
  ${feature}
  <section class="archive-guidance"><div><span class="section-label">How to explore</span><p>각 인물의 기록은 오른쪽 위 <strong>캐릭터 목록</strong>에서 선택할 수 있어요.</p></div><button class="open-directory" id="open-directory-home" type="button">캐릭터 목록 펼치기 <span aria-hidden="true">↗</span></button></section>
  <section class="bottom-message"><strong>한 사람의 이야기에는<br>언제나 다음 페이지가 있다.</strong><small>ARCHIVED WITH CARE / EST. 2026</small></section>`;
  const button=document.getElementById('open-directory-home');
  if(button)button.addEventListener('click',e=>{e.stopPropagation();openCharacterMenu(true)});
}
function profileTab(char){return `<div class="prose-card"><h3>ABOUT</h3><p>${plainLines(char.publicStory)}</p></div><div class="prose-card"><h3>KEYWORDS</h3><div>${char.tags.map(t=>`<span class="soft-pill">${escapeHtml(t)}</span>`).join('')}</div></div>${char.quote?`<div class="prose-card"><h3>VOICE</h3><p>“${escapeHtml(char.quote)}”</p></div>`:''}`}
function storyTab(char){
  const spoiler=String(char.spoilerStory||'').trim();
  return `<div class="prose-card"><h3>RECORD / 01</h3><p>${plainLines(char.publicStory)}</p></div><div class="prose-card"><h3>HIDDEN FILE</h3>${spoiler?`<button class="spoiler-button" id="spoiler-btn" aria-expanded="${showSpoiler}">${showSpoiler?'스포일러 접기 −':'스포일러 펼쳐보기 +'}</button>${showSpoiler?`<div class="spoiler-body"><strong>주의 · 공개 가능한 스포일러</strong><p>${plainLines(spoiler)}</p></div>`:''}`:'<p class="story-note">아직 공개된 스포일러 기록이 없습니다.</p>'}</div>`;
}
function related(char){return characters.filter(c=>c.id!==char.id && (char.relatedIds.includes(c.id)||c.relatedIds.includes(char.id)))}
function connectionTab(char){
 const others=related(char);
 return others.length?`<p class="story-note">이 인물과 연결된 인물들의 기록입니다.</p><div class="relation-mini-list">${others.map(other=>`<a class="relation-unit" href="#/character/${encodeURIComponent(other.id)}"><span>RELATED CHARACTER ↗</span><strong>${escapeHtml(other.name)}</strong></a>`).join('')}</div>`:'<p class="story-note">이 인물의 관계 기록은 아직 작성되지 않았습니다.</p>';
}
function galleryTab(char){
 const all=[...new Set([char.art,...char.gallery.map(assetUrl)].filter(Boolean))];
 return all.length?`<div class="folio-gallery">${all.map((path,i)=>`<button type="button" data-track-trigger="${char.id}" data-track-toggle="true" class="gallery-music-image" aria-label="${escapeHtml(char.name)} 갤러리 이미지 ${i+1}: 테마곡 재생 또는 일시정지"><img src="${escapeHtml(path)}" alt="${escapeHtml(char.name)} 갤러리 ${i+1}" loading="lazy"><span aria-hidden="true">♫ PLAY BGM</span></button>`).join('')}</div>`:'<p class="story-note">아직 등록된 이미지가 없습니다. Pages CMS에서 갤러리를 추가할 수 있어요.</p>';
}
function updateProfilePanel(char){const el=document.getElementById('profile-tab-panel'); if(!el)return;
 el.innerHTML=({profile:()=>profileTab(char),story:()=>storyTab(char),connections:()=>connectionTab(char),gallery:()=>galleryTab(char)})[currentTab]();
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===currentTab)));
 const spoiler=document.getElementById('spoiler-btn');if(spoiler)spoiler.addEventListener('click',()=>{showSpoiler=!showSpoiler;updateProfilePanel(char)});
}
function profile(id){const char=characters.find(c=>c.id===id);if(!char){notFound();return}
 currentTab='profile';showSpoiler=false;
 app.innerHTML=`<div class="page-top"><div class="crumb"><a href="#/">CHARACTER INDEX</a>　/　<b>NO. ${char.number}</b></div></div><article class="profile-hero ${hasYouTube(char)?'has-ost':''}"><button type="button" class="profile-art profile-music-image" data-track-trigger="${char.id}" data-track-toggle="true" aria-label="${escapeHtml(char.name)} 이미지: ${hasYouTube(char)?'유튜브 음악 재생 다시 시도':'테마곡 재생 또는 일시정지'}">${artwork(char,true)}<span class="profile-music-label" aria-hidden="true"><span>♫</span><span>${hasYouTube(char)?'음악이 안 들리면 누르기':'CLICK TO PLAY / PAUSE BGM'}</span></span></button><div class="profile-copy"><div class="small-no">CHARACTER FILE — ${char.number} / ${countText}</div><div class="profile-name-block"><h1>${escapeHtml(char.name)}</h1><div class="hanja">${escapeHtml(char.hanja||char.roman)}</div></div><p class="profile-blurb">${escapeHtml(char.blurb)}</p><dl class="profile-specs"><div><dt>세계관</dt><dd>${escapeHtml(char.world)}</dd></div><div><dt>나이</dt><dd>${escapeHtml(char.age)}</dd></div><div><dt>소속</dt><dd>${escapeHtml(char.affiliation)}</dd></div><div><dt>분류</dt><dd>${escapeHtml(char.role)}</dd></div>${char.realName?`<div><dt>다른 이름</dt><dd>${escapeHtml(char.realName)}</dd></div>`:''}</dl></div>${ostSidePanel(char)}</article>
 <section class="profile-bottom"><div class="tablist" role="tablist" aria-label="프로필 상세 정보"><button role="tab" data-tab="profile" aria-selected="true">Profile</button><button role="tab" data-tab="story" aria-selected="false">Story & Secrets</button><button role="tab" data-tab="connections" aria-selected="false">Relations</button><button role="tab" data-tab="gallery" aria-selected="false">Gallery</button></div><div class="tab-panel" id="profile-tab-panel" role="tabpanel"></div><a href="#/" class="back-link">← 캐릭터 목록으로 돌아가기</a></section>`;
 document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{currentTab=button.dataset.tab;updateProfilePanel(char)}));
 updateProfilePanel(char);
 requestYouTubePosition();
}
function relations(){
 const pairs=[];const seen=new Set();
 characters.forEach(c=>related(c).forEach(other=>{
   const key=[c.id,other.id].sort().join('|');if(seen.has(key))return;seen.add(key);pairs.push([c,other]);
 }));
 app.innerHTML=`<section class="page-heading"><span class="section-label">People are made of connections</span><h1>서로의 이야기 안에서.</h1><p>단독으로도 존재하지만, 누군가와 마주하며 달라지는 인물들의 기록.</p></section>${pairs.length?pairs.map(([a,b],i)=>`<section class="relation-layout"><span class="section-label">CONNECTED / ${String(i+1).padStart(3,'0')}</span><p class="relation-sub">RELATION ARCHIVE — ${escapeHtml(a.world||'CHARACTERS')}</p><div class="relation-line"><a class="relation-unit" href="#/character/${encodeURIComponent(a.id)}"><span>CHARACTER ${a.number} ↗</span><strong>${escapeHtml(a.name)}</strong></a><div class="relation-connector" aria-hidden="true"></div><a class="relation-unit" href="#/character/${encodeURIComponent(b.id)}"><span>CHARACTER ${b.number} ↗</span><strong>${escapeHtml(b.name)}</strong></a></div></section>`).join(''):'<div class="about-content"><p>아직 등록된 관계가 없습니다. Pages CMS의 캐릭터 편집 화면에서 연결 인물을 선택할 수 있어요.</p></div>'}`;
}
function about(){app.innerHTML=`<section class="page-heading"><span class="section-label">A note from the archive</span><h1>${escapeHtml(siteSettings.aboutTitle||'FOLIO에 대하여.')}</h1><p>이름을 붙이고, 기록하고, 다시 펼쳐 보는 작은 서가.</p></section><div class="about-content"><p>${plainLines(siteSettings.aboutText||'창작 캐릭터의 기본 정보와 서사, 관계, 일러스트를 한곳에 모으는 개인 아카이브입니다.')}</p><dl class="about-specs"><dt>ARCHIVE</dt><dd>${escapeHtml(siteSettings.siteTitle||'FOLIO — Character Archive')}</dd><dt>CHARACTERS</dt><dd>${countText}</dd><dt>FORMAT</dt><dd>인물 도감 / 관계 기록 / 이미지와 음악</dd><dt>STATUS</dt><dd>ONGOING</dd></dl></div>`}
function notFound(){app.innerHTML=`<section class="page-heading"><h1>페이지를 찾을 수 없어요.</h1><p>주소를 다시 확인하거나 목록으로 돌아가 주세요.</p><a href="#/" class="back-link">← 캐릭터 목록으로</a></section>`}
function route(){
  closeCharacterMenu();
  const path=decodeURIComponent(location.hash.replace(/^#/,''))||'/';
  document.querySelectorAll('[data-nav]').forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+(path.startsWith('/character/')?'/':path)));
  if(path==='/')home();
  else if(path.startsWith('/character/'))profile(path.split('/')[2]);
  else if(path==='/relations')relations();
  else if(path==='/about')about();
  else if(path==='/edit' && window.FOLIO_EDITOR)window.FOLIO_EDITOR.render(app);
  else notFound();
  const selected=path==='/'?getFeatured():(path.startsWith('/character/')?characters.find(c=>c.id===path.split('/')[2]):null);
  if(hasYouTube(selected)){
    if(currentMusicId)stopMusic();
    keepYouTubePlayingFor(selected);
  }else if(selected){
    // Moving to a different character with another soundtrack switches music.
    clearYouTubePlayer();
  }else{
    // Relations/About/Edit: retain previous soundtrack in visible 200x200 dock.
    positionPersistentYouTube();
  }
  window.scrollTo({top:0,behavior:'instant'});
  requestYouTubePosition();
}
window.addEventListener('hashchange',route);
// Crucial for mobile: route synchronously in the character-selection tap.
// The older version only rendered after the asynchronous hashchange event.
function navigateToCharacter(id){
  const next=`#/character/${encodeURIComponent(id)}`;
  if(location.hash!==next){
    history.pushState(null,'',next); // Does not fire hashchange; prevents a double iframe reload.
    route();                    // Create the visible 200x200 YouTube embed in this same tap.
  }else if(hasYouTube(characters.find(c=>c.id===id))){
    replayProfileYouTube();
  }
  const char=characters.find(c=>c.id===id);
  if(char && !hasYouTube(char))playCharacterMusic(id,false);
}
// All character links (name, relations, featured text) now make the same one-tap
// attempt. Respect Ctrl/Cmd-click, modified clicks and opening a new tab.
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#/character/"]');
  if(!link || e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)return;
  const id=decodeURIComponent(link.getAttribute('href').slice('#/character/'.length));
  if(!characters.some(c=>c.id===id))return;
  e.preventDefault();
  navigateToCharacter(id);
},true);
const themeButton=document.getElementById('theme-toggle');
try{const saved=localStorage.getItem('folio-theme');if(saved==='dark')document.documentElement.dataset.theme='dark'}catch(e){}
function updateThemeLabel(){themeButton.setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'밝은 화면으로 전환':'어두운 화면으로 전환')}
themeButton.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('folio-theme',document.documentElement.dataset.theme)}catch(e){}updateThemeLabel()});updateThemeLabel();
/* ===== TOP RIGHT CHARACTER DIRECTORY ===== */
const menuRoot=document.getElementById('character-menu');
const menuToggle=document.getElementById('character-menu-toggle');
const menuPanel=document.getElementById('character-menu-panel');
const menuList=document.getElementById('character-menu-list');
const menuSearch=document.getElementById('menu-search-input');
let menuQuery='';
function menuArtwork(char){
  return char.art ? `<img src="${escapeHtml(char.art)}" alt="" loading="lazy">` : `<span class="menu-portrait-hanzi" aria-hidden="true">${escapeHtml((char.hanja||char.name).slice(0,1)||'影')}</span>`;
}
function updateCharacterMenu(){
  const q=menuQuery.trim().toLowerCase();
  const matches=characters.filter(c=>[c.name,c.roman,c.hanja,c.world,...(c.tags||[])].join(' ').toLowerCase().includes(q));
  menuList.innerHTML=matches.length?matches.map(c=>`<div class="menu-character-row"><button type="button" class="menu-character-image" data-menu-music="${c.id}" title="${escapeHtml(c.name)} 음악 재생 후 프로필 열기" aria-label="${escapeHtml(c.name)} 이미지 클릭: 음악 재생하고 프로필 열기">${menuArtwork(c)}<span aria-hidden="true">♫</span></button><a href="#/character/${encodeURIComponent(c.id)}" class="menu-character-link" data-menu-link="${c.id}"><span class="menu-character-number">FILE ${c.number} · ${c.status==='complete'?'COMPLETE':'IN PROGRESS'}</span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.roman)}</small></a><span class="menu-row-arrow" aria-hidden="true">↗</span></div>`).join(''):'<p class="menu-no-results">검색된 캐릭터가 없어요.</p>';
}
function closeCharacterMenu(){
  if(!menuPanel)return;
  menuPanel.hidden=true;
  menuToggle.setAttribute('aria-expanded','false');
  menuRoot.classList.remove('menu-open');
}
function openCharacterMenu(focusSearch=false){
  menuPanel.hidden=false;
  menuToggle.setAttribute('aria-expanded','true');
  menuRoot.classList.add('menu-open');
  updateCharacterMenu();
  if(focusSearch)menuSearch.focus();
}
menuToggle.addEventListener('click',()=>menuPanel.hidden?openCharacterMenu():closeCharacterMenu());
menuSearch.addEventListener('input',e=>{menuQuery=e.target.value;updateCharacterMenu()});
menuPanel.addEventListener('click',e=>{
  const musicImage=e.target.closest('[data-menu-music]');
  if(musicImage){
    const id=musicImage.dataset.menuMusic;
    navigateToCharacter(id);
    closeCharacterMenu();
    return;
  }
  if(e.target.closest('[data-menu-link]'))closeCharacterMenu();
});
document.addEventListener('click',e=>{if(!menuRoot.contains(e.target))closeCharacterMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menuPanel.hidden){closeCharacterMenu();menuToggle.focus()}});
updateCharacterMenu();

document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('menu-count').textContent=countText;
document.getElementById('menu-panel-count').textContent=countText+' ENTRIES';
document.getElementById('footer-credit').textContent=(siteSettings.brand||'FOLIO')+'. '+(siteSettings.footerCredit||'AN ORIGINAL CHARACTER ARCHIVE.');
document.title=siteSettings.siteTitle||'FOLIO — Character Archive';
document.querySelector('meta[name="description"]').setAttribute('content',siteSettings.siteDescription||'FOLIO character archive');
document.querySelector('.brand > span:nth-child(2)').innerHTML=escapeHtml(siteSettings.brand||'FOLIO')+'<span class="brand-stop">.</span>';

/* ===== MUSIC / 캐릭터 이미지로 테마곡 재생 =====
   오디오 파일은 각 characters 항목의 bgm 필드에서 교체하세요.
   이미지 클릭은 브라우저가 인정하는 직접 사용자 동작이므로 자동재생 차단을 피합니다.
   저작권이 있는 음악은 사용 허락을 확인한 뒤 올리세요. */
const musicAudio=document.getElementById('folio-audio');
const musicDock=document.getElementById('music-dock');
const musicButton=document.getElementById('music-toggle');
const musicVolume=document.getElementById('music-volume');
const musicMute=document.getElementById('music-mute');
const musicTitle=document.getElementById('music-title');
const musicInfo=document.getElementById('music-info');
const musicStatus=document.getElementById('music-status');
let currentMusicId=null;
musicAudio.volume=Number(musicVolume.value);

function syncMusicUi(){
  const active=!!currentMusicId;
  const playing=active&&!musicAudio.paused;
  musicDock.hidden=!active;
  document.body.classList.toggle('music-active',active);
  musicDock.dataset.playing=String(playing);
  musicButton.textContent=playing?'Ⅱ':'▶';
  musicButton.setAttribute('aria-label',playing?'음악 일시정지':'음악 재생');
  musicButton.setAttribute('title',playing?'일시정지':'재생');
  musicMute.textContent=musicAudio.muted?'♫̸':'♫';
  musicMute.setAttribute('aria-label',musicAudio.muted?'음소거 해제':'음소거');
}
function playCharacterMusic(id,toggle=false){
  const char=characters.find(c=>c.id===id);
  if(!char)return;
  if(hasYouTube(char)) {
    stopMusic();
    if(location.hash==='#/character/'+encodeURIComponent(id))replayProfileYouTube();
    return;
  }
  if(!char.bgm)return;
  if(activeYTVideoId)clearYouTubePlayer();
  const same=currentMusicId===char.id;
  if(same && toggle && !musicAudio.paused){musicAudio.pause();return;}
  if(!same){
    musicAudio.pause();
    currentMusicId=char.id;
    musicAudio.src=char.bgm;
    musicTitle.textContent=char.trackTitle||`${char.name}의 테마곡`;
    musicInfo.textContent=char.trackType||`BGM · ${char.name}`;
    musicStatus.textContent=`${char.name}의 음악을 불러오는 중`;
  }
  syncMusicUi();
  // 반드시 클릭 이벤트 안에서 play()를 직접 호출해야 모바일에서도 재생됩니다.
  const attempt=musicAudio.play();
  if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{
    musicStatus.textContent='음악을 열 수 없어요. 파일 경로를 확인하거나 ▶ 버튼을 눌러주세요.';
    syncMusicUi();
  });
}
function stopMusic(){
  musicAudio.pause();
  musicAudio.removeAttribute('src');
  musicAudio.load();
  currentMusicId=null;
  syncMusicUi();
}
// 메인 목록 이미지, 상세 대표 이미지, 갤러리 이미지까지 공통으로 처리.
app.addEventListener('click', event=>{
  if(event.target.closest('#youtube-play-retry,[data-youtube-retry]')){
    replayProfileYouTube();
    return;
  }
  const trigger=event.target.closest('[data-track-trigger]');
  if(trigger){
    if(trigger.dataset.trackGo)navigateToCharacter(trigger.dataset.trackGo);
    else playCharacterMusic(trigger.dataset.trackTrigger,trigger.dataset.trackToggle==='true');
    return;
  }
  // 키보드로 카드를 선택해도 음악이 나옵니다. 일반 텍스트 클릭은 이동만 합니다.
  const card=event.target.closest('a[data-music-card]');
  if(card&&event.detail===0)playCharacterMusic(card.dataset.musicCard,false);
});
musicButton.addEventListener('click',()=>{
  if(!currentMusicId)return;
  if(musicAudio.paused)playCharacterMusic(currentMusicId,true);
  else musicAudio.pause();
});
musicVolume.addEventListener('input',()=>{
  musicAudio.volume=Number(musicVolume.value);
  if(musicAudio.volume>0&&musicAudio.muted)musicAudio.muted=false;
  syncMusicUi();
});
musicMute.addEventListener('click',()=>{musicAudio.muted=!musicAudio.muted;syncMusicUi()});
document.getElementById('music-stop').addEventListener('click',stopMusic);
musicAudio.addEventListener('play',()=>{musicStatus.textContent='재생 중 · 반복 재생';syncMusicUi()});
musicAudio.addEventListener('pause',()=>{if(currentMusicId)musicStatus.textContent='일시정지';syncMusicUi()});
musicAudio.addEventListener('error',()=>{
  if(currentMusicId)musicStatus.textContent='음악 파일을 불러오지 못했어요. 경로를 확인해주세요.';
  syncMusicUi();
});
syncMusicUi();
route();
