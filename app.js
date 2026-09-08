const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL="https://fldzumhbfqajbdfezxyn.supabase.co", SUPABASE_KEY="sb_publishable_AlY10RZnStR3aKzEsLnJuw_ZLHKvP0b";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null, profile=null, tracks=[], playlists=[], queue=[], idx=-1,currentId=null,currentMedia=null,objUrl=null,coverUrl=null;
const OFFLINE_CACHE='nigun-user-media-v1';
const snapKey=()=>`nigun-snapshot:${currentUser?.id||'guest'}`;
const offlineReq=path=>new Request(new URL(`__offline__/${encodeURIComponent(path)}`,location.href).href);
async function cachePath(path){if(!path||!navigator.onLine)return false;const url=await signed(path);if(!url||url==='icon-512.png')return false;const res=await fetch(url);if(!res.ok)return false;const c=await caches.open(OFFLINE_CACHE);await c.put(offlineReq(path),res.clone());return true}
async function offlineUrl(path,fallback='icon-512.png'){if(!path)return fallback;const c=await caches.open(OFFLINE_CACHE),r=await c.match(offlineReq(path));if(r){const b=await r.blob();return URL.createObjectURL(b)}if(navigator.onLine){const u=await signed(path);cachePath(path).catch(()=>{});return u}return fallback}
function saveSnapshot(){if(!currentUser)return;try{localStorage.setItem(snapKey(),JSON.stringify({profile,tracks,playlists,at:Date.now()}))}catch(e){}}
function loadSnapshot(){try{return JSON.parse(localStorage.getItem(snapKey())||'null')}catch(e){return null}}
async function updateOfflineStatus(){const e=$('#offlineStatus');if(!e)return;const c=await caches.open(OFFLINE_CACHE);const ks=await c.keys();let n=0;for(const k of ks)if(k.url.includes('/__offline__/'))n++;e.textContent=n?`${n} קבצים זמינים במכשיר גם בלי אינטרנט`:'עדיין אין קבצים שהורדו לאופליין'}
async function downloadAllOffline(){if(!navigator.onLine)return toast('צריך אינטרנט פעם אחת כדי להוריד את הספרייה');const paths=[];tracks.forEach(t=>{if(t.file_path)paths.push(t.file_path);if(t.cover_path)paths.push(t.cover_path)});if(profile?.avatar_url)paths.push(profile.avatar_url);if(!paths.length)return toast('אין עדיין קבצים להורדה');let done=0;for(const path of [...new Set(paths)]){try{await cachePath(path);done++;$('#offlineStatus').textContent=`מוריד לאופליין… ${done}/${[...new Set(paths)].length}`}catch(e){}}await updateOfflineStatus();toast('הספרייה זמינה עכשיו גם במצב טיסה')}
async function clearOffline(){await caches.delete(OFFLINE_CACHE);await updateOfflineStatus();toast('ההורדות הלא־מקוונות נמחקו')}

const audio=$('#audioEl'),video=$('#videoEl');
const COLORS=['#6d28d9','#7c3aed','#9333ea','#c026d3','#db2777','#e11d48','#dc2626','#ea580c','#d97706','#65a30d','#16a34a','#059669','#0d9488','#0891b2','#0284c7','#2563eb','#4f46e5','#475569','#111827','#7c2d12'];
function mixWithWhite(hex,amount=.20){const n=parseInt(hex.replace('#',''),16);const r=(n>>16)&255,g=(n>>8)&255,b=n&255;const m=x=>Math.round(x+(255-x)*amount);return '#'+[m(r),m(g),m(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function dynamicIconSvg(c){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${c}"/><circle cx="256" cy="256" r="144" fill="rgba(255,255,255,.17)"/><path fill="white" d="M292 122c0-19 15-34 34-34h89c19 0 34 15 34 34v215a78 78 0 1 1-38-66V176H330v219a78 78 0 1 1-38-66V122Z"/></svg>`}
function updateBrandMeta(c){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=c;const fav=$('#dynamicFavicon');if(fav)fav.href='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dynamicIconSvg(c));localStorage.setItem('nigun-accent',c)}
function hideSplash(delay=650){setTimeout(()=>$('#splash')?.classList.add('hide'),delay)}
function replaySplash(){const s=$('#splash');if(!s)return;s.classList.remove('hide');setTimeout(()=>s.classList.add('hide'),900)}

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fmt(s){if(!isFinite(s))return'0:00';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function phoneEmail(p){return `${String(p).replace(/\D/g,'')}@nigun.local`}
function setTab(n){$$('.section').forEach(x=>x.classList.toggle('active',x.id===n));$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===n));scrollTo({top:0,behavior:'smooth'})}
function applyTheme(v){const d=v==='dark'||(v==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);document.body.classList.toggle('dark',d);$$('[data-theme]').forEach(x=>x.classList.toggle('active',x.dataset.theme===v))}
function applyColor(c){document.documentElement.style.setProperty('--accent',c);document.documentElement.style.setProperty('--accent2',mixWithWhite(c,.22));$$('.swatch').forEach(x=>x.classList.toggle('active',x.dataset.c===c));const cc=$('#customColor');if(cc)cc.value=c;updateBrandMeta(c)}
function renderPalette(){const p=$('#palette');p.innerHTML=COLORS.map(c=>`<button class="swatch" data-c="${c}" style="background:${c}"></button>`).join('');$$('.swatch').forEach(b=>b.onclick=async()=>{applyColor(b.dataset.c);await updateProfile({accent_color:b.dataset.c})})}

function setGreeting(name){const h=new Date().getHours();const g=h<5?'לילה טוב':h<12?'בוקר טוב':h<17?'צהריים טובים':h<21?'ערב טוב':'לילה טוב';const e=$('#headerGreeting strong');if(e)e.textContent=`${g}, ${name}`}
function updateClock(){const e=$('#clock');if(e)e.textContent=new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
async function uploadAvatar(){const f=$('#avatarFile')?.files?.[0];if(!f||!currentUser)return;toast('מעלה תמונת פרופיל…');const ext=(f.name.split('.').pop()||'jpg').toLowerCase();const path=`${currentUser.id}/avatar/profile-${Date.now()}.${ext}`;const {error}=await sb.storage.from('user-media').upload(path,f,{upsert:true,contentType:f.type});if(error){toast('לא ניתן להעלות את התמונה');return}await updateProfile({avatar_url:path});profile.avatar_url=path;const u=await signed(path);$('#profileBtn').style.backgroundImage=`url(${u})`;$('#profileBtn').textContent='';$('#bigAvatar').style.backgroundImage=`url(${u})`;$('#bigAvatar').textContent='';toast('תמונת הפרופיל עודכנה')}
async function updateProfile(patch){if(!currentUser)return;const {error}=await sb.from('profiles').update(patch).eq('id',currentUser.id);if(error)toast('לא ניתן לשמור הגדרה')}
async function signed(path){if(!path)return'icon-512.png';if(!navigator.onLine)return'icon-512.png';const {data,error}=await sb.storage.from('user-media').createSignedUrl(path,3600);return error?'icon-512.png':data.signedUrl}
async function renderCards(el,arr){
 if(!arr.length){el.innerHTML='<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--muted)">עדיין אין כאן קבצים</div>';return}
 const rows=await Promise.all(arr.map(async t=>{const c=await offlineUrl(t.cover_path);return `<article class="card"><img class="cover" src="${c}"><button class="playBtn" data-play="${t.id}">▶</button><div class="title">${esc(t.title)}</div><div class="meta">${esc(t.artist||'אמן לא ידוע')} · ${t.media_type==='video'?'וידאו':'שמע'}${t.restricted?' · מוגבל':''}</div></article>`}));
 el.innerHTML=rows.join('');
}
function filterTracks(){const q=$('#search').value.trim().toLowerCase();return tracks.filter(t=>!q||[t.title,t.artist,t.album,t.genre].some(v=>(v||'').toLowerCase().includes(q)))}
async function render(){
 await renderCards($('#libraryGrid'),filterTracks());
 await renderCards($('#recentGrid'),tracks.filter(t=>t.last_played_at).sort((a,b)=>new Date(b.last_played_at)-new Date(a.last_played_at)).slice(0,8));
 $('#playlistList').innerHTML=playlists.length?playlists.map(p=>`<div class="settingRow row"><div class="grow"><strong>${esc(p.name)}</strong></div><button class="secondary" data-pl="${p.id}">פתח</button><button class="secondary" data-delpl="${p.id}">מחק</button></div>`).join(''):'<div class="sub">אין פלייליסטים עדיין</div>';
}
async function loadData(){
 let tr={data:null,error:null},pl={data:null,error:null},pr={data:null,error:null};
 if(navigator.onLine){
  [tr,pl,pr]=await Promise.all([sb.from('tracks').select('*').order('created_at',{ascending:false}),sb.from('playlists').select('*').order('created_at',{ascending:false}),sb.from('profiles').select('*').eq('id',currentUser.id).single()]);
 }
 if(!navigator.onLine||tr.error||pr.error){const snap=loadSnapshot();if(snap){tracks=snap.tracks||[];playlists=snap.playlists||[];profile=snap.profile||{};toast('מצב לא מקוון — נטענה הספרייה מהמכשיר')}else{tracks=[];playlists=[];profile={};toast('אין חיבור ואין עדיין ספרייה שמורה במכשיר')}}else{tracks=tr.data||[];playlists=pl.data||[];profile=pr.data||{};saveSnapshot()}
 const name=profile.name||currentUser.user_metadata?.name||'משתמש';
 const phone=profile.phone||currentUser.user_metadata?.phone||'';
 $('#profileName').textContent=name;$('#profilePhone').textContent=phone;setGreeting(name);
 const a=name[0]||'נ';$('#profileBtn').textContent=a;$('#bigAvatar').textContent=a;if(profile.avatar_url){const av=await offlineUrl(profile.avatar_url);$('#profileBtn').style.backgroundImage=`url(${av})`;$('#profileBtn').textContent='';$('#bigAvatar').style.backgroundImage=`url(${av})`;$('#bigAvatar').textContent=''}
 $('#kosherMode').checked=profile.kosher_mode!==false;applyTheme(profile.theme||'auto');applyColor(profile.accent_color||'#6d28d9');await render();await updateOfflineStatus();
}
function showApp(){ $('#authScreen').classList.add('hidden');$('#appScreen').classList.remove('hidden');replaySplash();loadData()}
function showAuth(){currentUser=null;profile=null;tracks=[];playlists=[];currentMedia?.pause();$('#appScreen').classList.add('hidden');$('#authScreen').classList.remove('hidden')}
async function register(){
 const name=$('#regName').value.trim(),phone=$('#regPhone').value.trim(),password=$('#regPassword').value;
 if(!name||!phone||password.length<6)return toast('מלא שם, טלפון וסיסמה של לפחות 6 תווים');
 const email=phoneEmail(phone);
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{name,phone}}});
 if(error)return toast(error.message.includes('already')?'המספר הזה כבר רשום':'לא ניתן ליצור חשבון');
 if(!data.session)return toast('החשבון נוצר. אם מופעל אישור אימייל ב-Supabase צריך לבטל אותו כדי להיכנס מיד.');
 currentUser=data.user;showApp();
}
async function login(){
 const phone=$('#loginPhone').value.trim(),password=$('#loginPassword').value;
 const {data,error}=await sb.auth.signInWithPassword({email:phoneEmail(phone),password});
 if(error)return toast('מספר טלפון או סיסמה לא נכונים');
 currentUser=data.user;showApp();
}
async function logout(){await sb.auth.signOut();showAuth()}
let uploadBatch=[];
function baseName(name){return String(name||'').replace(/\.[^.]+$/,'')}
function safeFileName(n){return String(n||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,120)||'file'}
function mediaKind(f){return (f.type||'').startsWith('video/')?'video':'audio'}
function filePreviewUrl(item){if(item.coverPreview)return item.coverPreview;if(item.kind==='video'&&item.mediaPreview)return item.mediaPreview;return ''}
function cleanupBatchUrls(){for(const x of uploadBatch){if(x.mediaPreview)URL.revokeObjectURL(x.mediaPreview);if(x.coverPreview)URL.revokeObjectURL(x.coverPreview)}}
function renderUploadBatch(){
 const area=$('#batchArea'),list=$('#batchList'),count=$('#batchCount');if(!area||!list)return;
 area.classList.toggle('hidden',!uploadBatch.length);count.textContent=uploadBatch.length?`${uploadBatch.length} קבצים`:'';
 list.innerHTML=uploadBatch.map((x,i)=>{const pv=filePreviewUrl(x);const thumb=pv?`<img src="${pv}" alt="">`:`<span>${x.kind==='video'?'וידאו':'♪'}</span>`;return `<div class="batchItem" data-batch-index="${i}"><div class="batchThumb">${thumb}</div><div><div class="batchFields"><input data-field="title" value="${esc(x.title)}" placeholder="שם השיר / הסרטון"><input data-field="description" value="${esc(x.description)}" placeholder="תיאור קצר / אמן"></div><div class="batchTools"><label class="tinyBtn">תמונת קאבר<input data-cover-index="${i}" type="file" accept="image/*" hidden></label><span class="sub">${esc(x.file.name)} · ${x.kind==='video'?'וידאו':'שמע'}</span><button class="tinyBtn tinyDanger" data-remove-index="${i}">הסר</button></div></div></div>`}).join('');
 list.querySelectorAll('[data-field]').forEach(inp=>inp.oninput=e=>{const box=e.target.closest('[data-batch-index]');const i=+box.dataset.batchIndex;uploadBatch[i][e.target.dataset.field]=e.target.value});
 list.querySelectorAll('[data-cover-index]').forEach(inp=>inp.onchange=e=>{const i=+e.target.dataset.coverIndex,f=e.target.files?.[0];if(!f)return;if(uploadBatch[i].coverPreview)URL.revokeObjectURL(uploadBatch[i].coverPreview);uploadBatch[i].cover=f;uploadBatch[i].coverPreview=URL.createObjectURL(f);renderUploadBatch()});
 list.querySelectorAll('[data-remove-index]').forEach(b=>b.onclick=()=>{const i=+b.dataset.removeIndex,x=uploadBatch[i];if(x.mediaPreview)URL.revokeObjectURL(x.mediaPreview);if(x.coverPreview)URL.revokeObjectURL(x.coverPreview);uploadBatch.splice(i,1);renderUploadBatch()});
}
function selectMediaFiles(e){
 const fs=[...(e.target.files||[])];if(!fs.length)return;
 for(const f of fs){const kind=mediaKind(f);uploadBatch.push({file:f,kind,title:baseName(f.name),description:'',cover:null,coverPreview:'',mediaPreview:kind==='video'?URL.createObjectURL(f):''})}
 e.target.value='';renderUploadBatch();toast(`${fs.length} קבצים נוספו`)
}
async function uploadOneBatchItem(item,index,total){
 const uid=currentUser.id,stamp=`${Date.now()}_${index}_${Math.random().toString(36).slice(2,8)}`;
 const mediaPath=`${uid}/media/${stamp}_${safeFileName(item.file.name)}`;
 const up=await sb.storage.from('user-media').upload(mediaPath,item.file,{upsert:false,contentType:item.file.type||undefined});
 if(up.error)throw new Error(`media:${item.file.name}`);
 let coverPath=null;
 try{
  if(item.cover){coverPath=`${uid}/covers/${stamp}_${safeFileName(item.cover.name)}`;const cu=await sb.storage.from('user-media').upload(coverPath,item.cover,{upsert:false,contentType:item.cover.type||undefined});if(cu.error)throw new Error(`cover:${item.file.name}`)}
  const row={user_id:uid,title:(item.title||baseName(item.file.name)).trim(),artist:(item.description||'').trim(),album:'',genre:'',media_type:item.kind,file_path:mediaPath,cover_path:coverPath,restricted:false};
  const ins=await sb.from('tracks').insert(row);if(ins.error)throw new Error(`db:${item.file.name}`);
 }catch(err){await sb.storage.from('user-media').remove([mediaPath,...(coverPath?[coverPath]:[])]).catch(()=>{});throw err}
}
async function uploadAllBatch(){
 if(!uploadBatch.length)return toast('בחר קודם שירים או סרטונים');if(!navigator.onLine)return toast('צריך חיבור לאינטרנט כדי להעלות קבצים');
 const btn=$('#uploadAll'),box=$('#batchProgress'),fill=$('#progressFill'),txt=$('#progressText');btn.disabled=true;box.classList.add('show');let ok=0,failed=[];const total=uploadBatch.length;
 for(let i=0;i<total;i++){
  txt.textContent=`מעלה ${i+1} מתוך ${total} — ${uploadBatch[i].title||uploadBatch[i].file.name}`;fill.style.width=`${Math.round(i/total*100)}%`;
  try{await uploadOneBatchItem(uploadBatch[i],i,total);ok++}catch(e){failed.push(uploadBatch[i].file.name)}
 }
 fill.style.width='100%';txt.textContent=failed.length?`הועלו ${ok} מתוך ${total}. ${failed.length} קבצים נכשלו.`:`הועלו ${ok} קבצים בהצלחה`;
 btn.disabled=false;
 if(!failed.length){cleanupBatchUrls();uploadBatch=[];renderUploadBatch();setTimeout(()=>box.classList.remove('show'),500);await loadData();toast(`${ok} קבצים נוספו לספרייה`);setTab('library')}else{toast(`הועלו ${ok}; ${failed.length} נכשלו`);await loadData()}
}

function lockRestricted(){
 currentMedia?.pause();$('#player').classList.remove('show');$('#mini').classList.remove('show');
 const k=`warn:${currentUser.id}`,n=+(localStorage.getItem(k)||0)+1;localStorage.setItem(k,n);
 $('#lockText').textContent=`הופעל קובץ שסומן כמוגבל. הנגן נעצר. זו אזהרה מספר ${n}.`;
 $('#lockScreen').classList.add('show');
}
async function playTrack(id,q=null){
 const t=tracks.find(x=>x.id===id);if(!t)return;if($('#kosherMode').checked&&t.restricted)return lockRestricted();
 queue=q||filterTracks().map(x=>x.id);idx=Math.max(0,queue.indexOf(id));currentId=id;
 const media=await offlineUrl(t.file_path,''),cover=await offlineUrl(t.cover_path);if(!media)return toast('השיר הזה לא הורד למכשיר. התחבר לאינטרנט או הורד אותו לאופליין.');
 audio.pause();video.pause();currentMedia=t.media_type==='video'?video:audio;
 if(t.media_type==='video'){video.src=media;video.style.display='block';$('#playerCover').style.display='none'}else{audio.src=media;video.style.display='none';$('#playerCover').style.display='block'}
 $('#playerCover').src=cover;$('#miniCover').src=cover;$('#miniTitle').textContent=$('#playerTitle').textContent=t.title;$('#miniArtist').textContent=$('#playerArtist').textContent=t.artist||'אמן לא ידוע';$('#mini').classList.add('show');$('#favBtn').textContent=t.favorite?'♥':'♡';
 if(navigator.onLine)await sb.from('tracks').update({last_played_at:new Date().toISOString()}).eq('id',id);t.last_played_at=new Date().toISOString();saveSnapshot();
 if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist||'',album:t.album||'',artwork:[{src:cover}]});navigator.mediaSession.setActionHandler('play',()=>currentMedia.play());navigator.mediaSession.setActionHandler('pause',()=>currentMedia.pause());navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('previoustrack',prev)}catch(e){}}
 try{await currentMedia.play()}catch(e){}sync();render();
}
function sync(){const p=currentMedia&&!currentMedia.paused;$('#play').textContent=$('#playMini').textContent=p?'❚❚':'▶'}
function toggle(){if(!currentMedia)return;currentMedia.paused?currentMedia.play():currentMedia.pause();sync()}
function next(){if(queue.length){idx=(idx+1)%queue.length;playTrack(queue[idx],queue)}}function prev(){if(queue.length){idx=(idx-1+queue.length)%queue.length;playTrack(queue[idx],queue)}}
function mediaEvents(m){m.addEventListener('timeupdate',()=>{if(m!==currentMedia)return;$('#seek').value=m.duration?Math.round(m.currentTime/m.duration*1000):0;$('#cur').textContent=fmt(m.currentTime);$('#dur').textContent=fmt(m.duration)});m.addEventListener('play',sync);m.addEventListener('pause',sync);m.addEventListener('ended',next)}

function setupInstallPrompt(){
 const banner=$('#installBanner'),action=$('#installAction'),close=$('#installClose'),sheet=$('#iosInstallSheet'),closeSheet=$('#closeInstallSheet');
 if(!banner||!action)return;
 const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 if(standalone){banner.classList.remove('show');return}
 let deferredPrompt=null;
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
 const isSafari=isIOS&&/safari/i.test(navigator.userAgent)&&!/crios|fxios|edgios/i.test(navigator.userAgent);
 const show=()=>{if(!((window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true))banner.classList.add('show')};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
 window.addEventListener('appinstalled',()=>{banner.classList.remove('show');deferredPrompt=null});
 action.onclick=async()=>{
   if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null;return}
   if(isSafari){sheet.classList.add('show');return}
   sheet.classList.add('show');
 };
 close.onclick=()=>banner.classList.remove('show');
 closeSheet.onclick=()=>sheet.classList.remove('show');
 sheet.onclick=e=>{if(e.target===sheet)sheet.classList.remove('show')};
 setTimeout(show,1200);
}

async function init(){
 const year=$('#copyrightYear');if(year)year.textContent=new Date().getFullYear();
 const legal={privacy:{title:'מדיניות פרטיות',body:'<p>ניגון שומר את הספרייה וההעדפות בחשבון האישי שלך. קבצים שהורדו למצב לא מקוון נשמרים גם במכשיר. אין לשתף סיסמה עם אחרים.</p><p>תמונת פרופיל, קבצי מדיה והגדרות משמשים להפעלת החשבון והאפליקציה.</p>'},terms:{title:'תנאי שימוש',body:'<p>השימוש בניגון מיועד לתוכן שיש לך הרשאה להעלות ולהשמיע. המשתמש אחראי לתוכן שהוא מעלה לחשבון שלו.</p><p>ייתכנו מגבלות זמינות, אחסון ותכונות בהתאם למכשיר ולחיבור.</p>'}};
 function openLegal(k){const x=legal[k];$('#legalTitle').textContent=x.title;$('#legalBody').innerHTML=x.body;$('#legalModal').classList.add('show')}
 $('#privacyLink').onclick=e=>{e.preventDefault();openLegal('privacy')};$('#termsLink').onclick=e=>{e.preventDefault();openLegal('terms')};$('#closeLegal').onclick=()=>$('#legalModal').classList.remove('show');$('#legalModal').onclick=e=>{if(e.target.id==='legalModal')$('#legalModal').classList.remove('show')};
 setupInstallPrompt();
 applyColor(localStorage.getItem('nigun-accent')||'#6d28d9');
 renderPalette();
 $('#loginTab').onclick=()=>{$('#loginForm').classList.remove('hidden');$('#registerForm').classList.add('hidden');$('#loginTab').classList.add('active');$('#registerTab').classList.remove('active')};
 $('#registerTab').onclick=()=>{$('#registerForm').classList.remove('hidden');$('#loginForm').classList.add('hidden');$('#registerTab').classList.add('active');$('#loginTab').classList.remove('active')};
 $('#loginBtn').onclick=login;$('#registerBtn').onclick=register;$('#logoutBtn').onclick=logout;$('#profileBtn').onclick=()=>setTab('settings');
 $('#mediaFile').onchange=selectMediaFiles;$('#uploadAll').onclick=uploadAllBatch;$('#clearBatch').onclick=()=>{cleanupBatchUrls();uploadBatch=[];renderUploadBatch()};
 $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $$('[data-theme]').forEach(b=>b.onclick=async()=>{applyTheme(b.dataset.theme);await updateProfile({theme:b.dataset.theme})});$('#avatarFile').onchange=uploadAvatar;$('#customColor').oninput=async e=>{applyColor(e.target.value);await updateProfile({accent_color:e.target.value})};updateClock();setInterval(updateClock,1000);
 $('#kosherMode').onchange=async e=>{profile.kosher_mode=e.target.checked;saveSnapshot();if(navigator.onLine)await updateProfile({kosher_mode:e.target.checked})};
 $('#downloadOffline').onclick=downloadAllOffline;$('#clearOffline').onclick=clearOffline;window.addEventListener('online',()=>{toast('חזרת לאינטרנט');loadData()});window.addEventListener('offline',()=>toast('מצב לא מקוון — Nigun ממשיך מהמכשיר')); 
 $('#search').oninput=render;
 $('#createPlaylist').onclick=async()=>{const n=$('#playlistName').value.trim();if(!n)return toast('כתוב שם לפלייליסט');const r=await sb.from('playlists').insert({user_id:currentUser.id,name:n});if(r.error)return toast('לא ניתן ליצור פלייליסט');$('#playlistName').value='';await loadData()};
 $('#shuffle').onclick=()=>{if(!tracks.length)return toast('אין שירים');const q=tracks.map(x=>x.id).sort(()=>Math.random()-.5);playTrack(q[0],q)};
 document.addEventListener('click',async e=>{const p=e.target.closest('[data-play]');if(p)return playTrack(p.dataset.play);const op=e.target.closest('[data-pl]');if(op){const {data}=await sb.from('playlist_tracks').select('track_id,position').eq('playlist_id',op.dataset.pl).order('position');const ids=(data||[]).map(x=>x.track_id).filter(id=>tracks.some(t=>t.id===id));if(!ids.length)return toast('הפלייליסט ריק');return playTrack(ids[0],ids)}const dp=e.target.closest('[data-delpl]');if(dp&&confirm('למחוק פלייליסט?')){await sb.from('playlists').delete().eq('id',dp.dataset.delpl);await loadData()}});
 $('#openPlayer').onclick=()=>$('#player').classList.add('show');$('#closePlayer').onclick=()=>$('#player').classList.remove('show');$('#play').onclick=$('#playMini').onclick=toggle;$('#next').onclick=$('#nextMini').onclick=next;$('#prev').onclick=$('#prevMini').onclick=prev;$('#seek').oninput=e=>{if(currentMedia?.duration)currentMedia.currentTime=(+e.target.value/1000)*currentMedia.duration};$('#unlockBtn').onclick=()=>$('#lockScreen').classList.remove('show');
 $('#favBtn').onclick=async()=>{const t=tracks.find(x=>x.id===currentId);if(!t)return;t.favorite=!t.favorite;await sb.from('tracks').update({favorite:t.favorite}).eq('id',t.id);$('#favBtn').textContent=t.favorite?'♥':'♡'};
 mediaEvents(audio);mediaEvents(video);
 let session=null;try{const r=await sb.auth.getSession();session=r.data.session}catch(e){}if(session){currentUser=session.user;showApp()}else showAuth();
 sb.auth.onAuthStateChange((event,session)=>{if(session&&!currentUser){currentUser=session.user;showApp()}else if(!session&&currentUser)showAuth()});
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 hideSplash(900);
}
init();