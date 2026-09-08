const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL="https://fldzumhbfqajbdfezxyn.supabase.co", SUPABASE_KEY="sb_publishable_AlY10RZnStR3aKzEsLnJuw_ZLHKvP0b";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null, profile=null, tracks=[], playlists=[], queue=[], idx=-1,currentId=null,currentMedia=null,objUrl=null,coverUrl=null;
const OFFLINE_CACHE='nigun-user-media-v1';
let listenStats={tracks:{},days:{}},statLastMediaTime=0,statDirty=0,currentArtistName='';
let trackSelectMode=false, selectedTracks=new Set(), actionTrackId=null, pairedMode='';
const listenKey=()=>`nigun-listen:${currentUser?.id||'guest'}`;
const artistPicsKey=()=>`nigun-artist-pics:${currentUser?.id||'guest'}`;
const radioKey=()=>`nigun-radio:${currentUser?.id||'guest'}`;
function loadListenStats(){try{listenStats=JSON.parse(localStorage.getItem(listenKey())||'{"tracks":{},"days":{}}')||{tracks:{},days:{}}}catch(e){listenStats={tracks:{},days:{}}}listenStats.tracks||={};listenStats.days||={}}
function saveListenStats(force=false){statDirty++;if(!force&&statDirty<8)return;statDirty=0;try{localStorage.setItem(listenKey(),JSON.stringify(listenStats))}catch(e){}}
function dayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function statForTrack(t){const k=String(t.id);return listenStats.tracks[k]||(listenStats.tracks[k]={plays:0,seconds:0,title:t.title||'',artist:t.artist||'אמן לא ידוע'})}
function recordPlayStart(t){const st=statForTrack(t);st.plays=(st.plays||0)+1;st.title=t.title||st.title;st.artist=t.artist||'אמן לא ידוע';st.last=Date.now();statLastMediaTime=0;saveListenStats(true);renderListeningStats()}
function recordListenSeconds(t,sec){if(!t||!Number.isFinite(sec)||sec<=0||sec>5)return;const st=statForTrack(t);st.seconds=(st.seconds||0)+sec;const d=dayKey();listenStats.days[d]=(listenStats.days[d]||0)+sec;saveListenStats(false)}
const snapKey=()=>`nigun-snapshot:${currentUser?.id||'guest'}`;
const offlineReq=path=>new Request(new URL(`__offline__/${encodeURIComponent(path)}`,location.href).href);
async function cachePath(path){if(!path||!navigator.onLine)return false;const url=await signed(path);if(!url||url==='icon-512.png')return false;const res=await fetch(url);if(!res.ok)return false;const c=await caches.open(OFFLINE_CACHE);await c.put(offlineReq(path),res.clone());return true}
function defaultCover(){const c=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#6d28d9';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dynamicIconSvg(c))}
async function offlineUrl(path,fallback=null){fallback=fallback||defaultCover();if(!path)return fallback;const c=await caches.open(OFFLINE_CACHE),r=await c.match(offlineReq(path));if(r){const b=await r.blob();return URL.createObjectURL(b)}if(navigator.onLine){const u=await signed(path);cachePath(path).catch(()=>{});return u}return fallback}
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
function applyColor(c){document.documentElement.style.setProperty('--accent',c);document.documentElement.style.setProperty('--accent2',mixWithWhite(c,.22));$$('.swatch').forEach(x=>x.classList.toggle('active',x.dataset.c===c));const cc=$('#customColor');if(cc)cc.value=c;updateBrandMeta(c);refreshDynamicCovers()}
function refreshDynamicCovers(){const d=defaultCover();$$('.cover,.artistPic').forEach(img=>{if(!img.dataset.realCover&&(img.src.includes('icon-512')||img.src.startsWith('data:image/svg+xml')))img.src=d});if($('#miniCover')&&(!currentId||!tracks.find(x=>x.id===currentId)?.cover_path))$('#miniCover').src=d}
function renderPalette(){const p=$('#palette');p.innerHTML=COLORS.map(c=>`<button class="swatch" data-c="${c}" style="background:${c}"></button>`).join('');$$('.swatch').forEach(b=>b.onclick=async()=>{applyColor(b.dataset.c);await updateProfile({accent_color:b.dataset.c})})}

function setGreeting(name){const h=new Date().getHours();const g=h<5?'לילה טוב':h<12?'בוקר טוב':h<17?'צהריים טובים':h<21?'ערב טוב':'לילה טוב';const e=$('#headerGreeting strong');if(e)e.textContent=`${g}, ${name}`}
function updateClock(){const e=$('#clock');if(e)e.textContent=new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
async function uploadAvatar(){const f=$('#avatarFile')?.files?.[0];if(!f||!currentUser)return;toast('מעלה תמונת פרופיל…');const ext=(f.name.split('.').pop()||'jpg').toLowerCase();const path=`${currentUser.id}/avatar/profile-${Date.now()}.${ext}`;const {error}=await sb.storage.from('user-media').upload(path,f,{upsert:true,contentType:f.type});if(error){toast('לא ניתן להעלות את התמונה');return}await updateProfile({avatar_url:path});profile.avatar_url=path;const u=await signed(path);$('#profileBtn').style.backgroundImage=`url(${u})`;$('#profileBtn').textContent='';$('#bigAvatar').style.backgroundImage=`url(${u})`;$('#bigAvatar').textContent='';toast('תמונת הפרופיל עודכנה')}
async function updateProfile(patch){if(!currentUser)return;const {error}=await sb.from('profiles').update(patch).eq('id',currentUser.id);if(error)toast('לא ניתן לשמור הגדרה')}
async function signed(path){if(!path)return defaultCover();if(!navigator.onLine)return defaultCover();const {data,error}=await sb.storage.from('user-media').createSignedUrl(path,3600);return error?defaultCover():data.signedUrl}
async function renderCards(el,arr,emptyText='עדיין אין כאן שירים'){
 if(!el)return;
 if(!arr.length){el.innerHTML=`<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--muted)">${esc(emptyText)}</div>`;return}
 const rows=await Promise.all(arr.map(async t=>{const c=await offlineUrl(t.cover_path);const sel=selectedTracks.has(String(t.id));return `<article class="card ${sel?'selected':''}">${trackSelectMode?`<input class="cardSelect" type="checkbox" data-track-select="${t.id}" ${sel?'checked':''}>`:''}<img class="cover" ${t.cover_path?'data-real-cover="1"':''} src="${c}"><button class="playBtn" data-play="${t.id}">▶</button>${!trackSelectMode?`<button class="trackMenuBtn" data-track-menu="${t.id}" aria-label="אפשרויות">⋯</button>`:''}<div class="title">${esc(t.title)}</div><div class="meta">${esc(t.artist||'אמן לא ידוע')} · ${t.media_type==='video'?'וידאו':'שמע'}${t.album?` · ${esc(t.album)}`:''}${t.restricted?' · מוגבל':''}</div></article>`}));
 el.innerHTML=rows.join('');
}
function filterTracks(){const q=($('#search')?.value||'').trim().toLowerCase();return tracks.filter(t=>!q||[t.title,t.artist,t.album,t.genre].some(v=>(v||'').toLowerCase().includes(q)))}
function artistGroups(){const m=new Map();for(const t of tracks){const a=(t.artist||'אמן לא ידוע').trim()||'אמן לא ידוע';if(!m.has(a))m.set(a,[]);m.get(a).push(t)}return [...m.entries()].sort((a,b)=>b[1].length-a[1].length)}
function getArtistPics(){try{return JSON.parse(localStorage.getItem(artistPicsKey())||'{}')||{}}catch(e){return{}}}
function setArtistPic(name,path){const x=getArtistPics();x[name]=path;localStorage.setItem(artistPicsKey(),JSON.stringify(x))}
async function artistPicture(name,list){const custom=getArtistPics()[name];if(custom)return offlineUrl(custom);const c=list.find(t=>t.cover_path)?.cover_path;return c?offlineUrl(c):defaultCover()}
async function renderArtists(){const el=$('#artistGrid');if(!el)return;const groups=artistGroups();if(!groups.length){el.innerHTML='<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--muted)">אחרי שתעלה שירים, האמנים יופיעו כאן אוטומטית</div>';return}const html=await Promise.all(groups.map(async([name,list])=>`<button class="artistCard" data-artist="${encodeURIComponent(name)}"><img class="artistPic" src="${await artistPicture(name,list)}"><div class="artistName">${esc(name)}</div><div class="artistCount">${list.length} ${list.length===1?'שיר':'שירים'}</div></button>`));el.innerHTML=html.join('')}
function aggregateStats(){const vals=Object.values(listenStats.tracks||{}),artist={};for(const st of vals){const a=st.artist||'אמן לא ידוע';artist[a]=(artist[a]||0)+(st.seconds||0)+(st.plays||0)*30}const topArtist=Object.entries(artist).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';const topSong=vals.sort((a,b)=>((b.seconds||0)+(b.plays||0)*30)-((a.seconds||0)+(a.plays||0)*30))[0]?.title||'—';const now=new Date(),today=dayKey(now);let week=0,month=0;for(const [d,sec] of Object.entries(listenStats.days||{})){const dt=new Date(d+'T12:00:00');const diff=(now-dt)/86400000;if(diff>=-1&&diff<7)week+=sec;if(dt.getFullYear()===now.getFullYear()&&dt.getMonth()===now.getMonth())month+=sec}return{topArtist,topSong,today:listenStats.days?.[today]||0,week,month}}
function mins(sec){return `${Math.round((sec||0)/60)} דק׳`}
function renderListeningStats(){const x=aggregateStats();if($('#topArtistStat'))$('#topArtistStat').textContent=x.topArtist;if($('#topSongStat'))$('#topSongStat').textContent=x.topSong;if($('#todayStat'))$('#todayStat').textContent=mins(x.today);if($('#monthStat'))$('#monthStat').textContent=mins(x.month);if($('#weekStat'))$('#weekStat').textContent=`השבוע: ${mins(x.week)}`}
async function render(){
 await renderCards($('#libraryGrid'),filterTracks(),'אין שירים בספרייה עדיין');
 await renderCards($('#recentGrid'),tracks.filter(t=>t.last_played_at).sort((a,b)=>new Date(b.last_played_at)-new Date(a.last_played_at)).slice(0,8),'עדיין לא ניגנת שירים');
 $('#libraryStatus').textContent=tracks.length?`${tracks.length} שירים וסרטונים`:'';
 await renderArtists();renderListeningStats();renderRadioStations();
 $('#playlistList').innerHTML=playlists.length?playlists.map(p=>`<div class="settingRow row"><div class="grow"><strong>${esc(p.name)}</strong></div><button class="secondary" data-pl="${p.id}">פתח</button><button class="secondary" data-delpl="${p.id}">מחק</button></div>`).join(''):'<div class="sub">אין פלייליסטים עדיין</div>';
}
async function loadData(){
 const snap=loadSnapshot()||{};let tr={data:null,error:{message:'offline'}},pl={data:null,error:{message:'offline'}},pr={data:null,error:{message:'offline'}};
 if(navigator.onLine){
  [tr,pl,pr]=await Promise.all([sb.from('tracks').select('*').order('created_at',{ascending:false}),sb.from('playlists').select('*').order('created_at',{ascending:false}),sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle()]);
 }
 // Each dataset falls back independently. A missing profile must never hide successfully uploaded songs.
 tracks=(!tr.error&&Array.isArray(tr.data))?tr.data:(snap.tracks||tracks||[]);
 playlists=(!pl.error&&Array.isArray(pl.data))?pl.data:(snap.playlists||playlists||[]);
 profile=(!pr.error&&pr.data)?pr.data:(snap.profile||profile||{});
 if(navigator.onLine&&!tr.error)saveSnapshot();else if(!navigator.onLine&&snap.tracks)toast('מצב לא מקוון — נטענה הספרייה מהמכשיר');
 const name=profile.name||currentUser.user_metadata?.name||'משתמש';
 const phone=profile.phone||currentUser.user_metadata?.phone||'';
 $('#profileName').textContent=name;$('#profilePhone').textContent=phone;setGreeting(name);
 const a=name[0]||'נ';$('#profileBtn').textContent=a;$('#bigAvatar').textContent=a;$('#profileBtn').style.backgroundImage='';$('#bigAvatar').style.backgroundImage='';if(profile.avatar_url){const av=await offlineUrl(profile.avatar_url);$('#profileBtn').style.backgroundImage=`url(${av})`;$('#profileBtn').textContent='';$('#bigAvatar').style.backgroundImage=`url(${av})`;$('#bigAvatar').textContent=''}
 $('#kosherMode').checked=profile.kosher_mode!==false;applyTheme(profile.theme||'auto');applyColor(profile.accent_color||'#6d28d9');loadListenStats();await render();await updateOfflineStatus();
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
async function logout(){saveListenStats(true);await sb.auth.signOut();showAuth()}
let uploadBatch=[];
function baseName(name){return String(name||'').replace(/\.[^.]+$/,'')}
function safeFileName(n){return String(n||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,120)||'file'}
function mediaKind(f){return (f.type||'').startsWith('video/')?'video':'audio'}
function isMediaFile(f){return /^(audio|video)\//.test(f.type||'')||/\.(mp3|m4a|aac|wav|flac|ogg|mp4|mov|m4v|webm)$/i.test(f.name||'')}
function filePreviewUrl(item){if(item.coverPreview)return item.coverPreview;if(item.kind==='video'&&item.mediaPreview)return item.mediaPreview;return ''}
function cleanupBatchUrls(){for(const x of uploadBatch){if(x.mediaPreview)URL.revokeObjectURL(x.mediaPreview);if(x.coverPreview)URL.revokeObjectURL(x.coverPreview)}}
function extForMime(type){return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[type]||'jpg')}
function pictureToFile(pic,title){
 if(!pic?.data?.length)return null;
 try{const blob=new Blob([new Uint8Array(pic.data)],{type:pic.format||'image/jpeg'});return new File([blob],`${safeFileName(title||'cover')}.${extForMime(pic.format)}`,{type:blob.type})}catch(e){return null}
}
function readAudioMetadata(file){return new Promise(resolve=>{
 if(!window.jsmediatags?.read)return resolve(null);
 try{window.jsmediatags.read(file,{onSuccess:r=>resolve(r?.tags||null),onError:()=>resolve(null)})}catch(e){resolve(null)}
})}
function videoThumbnail(file){return new Promise(resolve=>{
 const u=URL.createObjectURL(file),v=document.createElement('video');let done=false;
 const finish=x=>{if(done)return;done=true;URL.revokeObjectURL(u);v.removeAttribute('src');v.load();resolve(x||null)};
 const timer=setTimeout(()=>finish(null),5500);v.preload='metadata';v.muted=true;v.playsInline=true;
 v.onloadedmetadata=()=>{try{v.currentTime=Math.min(.35,Math.max(0,(v.duration||1)/20))}catch(e){finish(null)}};
 v.onseeked=()=>{try{const max=720,scale=Math.min(1,max/(v.videoWidth||max)),c=document.createElement('canvas');c.width=Math.max(1,Math.round((v.videoWidth||640)*scale));c.height=Math.max(1,Math.round((v.videoHeight||360)*scale));c.getContext('2d').drawImage(v,0,0,c.width,c.height);c.toBlob(b=>{clearTimeout(timer);if(!b)return finish(null);finish(new File([b],`${safeFileName(baseName(file.name))}-thumb.jpg`,{type:'image/jpeg'}))},'image/jpeg',.82)}catch(e){clearTimeout(timer);finish(null)}};
 v.onerror=()=>{clearTimeout(timer);finish(null)};v.src=u;
})}
async function enrichBatchItem(item){
 item.metaState='reading';renderUploadBatch();
 try{
  if(item.kind==='audio'){
   const tags=await readAudioMetadata(item.file);
   if(tags){item.title=(tags.title||item.title||baseName(item.file.name)).trim();item.artist=(tags.artist||item.artist||'').trim();item.album=(tags.album||item.album||'').trim();item.genre=(Array.isArray(tags.genre)?tags.genre.join(', '):(tags.genre||item.genre||'')).trim();const cover=pictureToFile(tags.picture,item.title);if(cover){item.cover=cover;item.coverPreview=URL.createObjectURL(cover)}}
  }else{
   const thumb=await videoThumbnail(item.file);if(thumb){item.cover=thumb;item.coverPreview=URL.createObjectURL(thumb)}
  }
 }catch(e){}
 item.metaState='done';renderUploadBatch();
}
function renderUploadBatch(){
 const area=$('#batchArea'),list=$('#batchList'),count=$('#batchCount');if(!area||!list)return;
 area.classList.toggle('hidden',!uploadBatch.length);count.textContent=uploadBatch.length?`${uploadBatch.length} קבצים`:'';
 list.innerHTML=uploadBatch.map((x,i)=>{const pv=filePreviewUrl(x);const thumb=pv?`<img src="${pv}" alt="">`:`<span>${x.kind==='video'?'וידאו':'♪'}</span>`;const state=x.metaState==='reading'?'קורא פרטי קובץ…':x.metaState==='done'?'הפרטים נקלטו אוטומטית':'';return `<div class="batchItem" data-batch-index="${i}"><div class="batchThumb">${thumb}</div><div><div class="batchFields"><input data-field="title" value="${esc(x.title)}" placeholder="שם השיר / הסרטון"><input data-field="artist" value="${esc(x.artist)}" placeholder="אמן / תיאור קצר"><input data-field="album" value="${esc(x.album)}" placeholder="אלבום"><input data-field="genre" value="${esc(x.genre)}" placeholder="ז׳אנר"></div><div class="batchTools"><label class="tinyBtn">החלף תמונת קאבר<input data-cover-index="${i}" type="file" accept="image/*" hidden></label><span class="sub">${esc(x.file.name)} · ${x.kind==='video'?'וידאו':'שמע'}</span><button class="tinyBtn tinyDanger" data-remove-index="${i}">הסר</button></div>${state?`<div class="metaState ${x.metaState==='done'?'ok':''}">${state}</div>`:''}</div></div>`}).join('');
 list.querySelectorAll('[data-field]').forEach(inp=>inp.oninput=e=>{const box=e.target.closest('[data-batch-index]');const i=+box.dataset.batchIndex;uploadBatch[i][e.target.dataset.field]=e.target.value});
 list.querySelectorAll('[data-cover-index]').forEach(inp=>inp.onchange=e=>{const i=+e.target.dataset.coverIndex,f=e.target.files?.[0];if(!f)return;if(uploadBatch[i].coverPreview)URL.revokeObjectURL(uploadBatch[i].coverPreview);uploadBatch[i].cover=f;uploadBatch[i].coverPreview=URL.createObjectURL(f);renderUploadBatch()});
 list.querySelectorAll('[data-remove-index]').forEach(b=>b.onclick=()=>{const i=+b.dataset.removeIndex,x=uploadBatch[i];if(x.mediaPreview)URL.revokeObjectURL(x.mediaPreview);if(x.coverPreview)URL.revokeObjectURL(x.coverPreview);uploadBatch.splice(i,1);renderUploadBatch()});
}
async function processMetadataQueue(items,limit=4){let next=0;async function worker(){while(next<items.length){const i=next++,item=items[i];if(!item.metaPromise)item.metaPromise=enrichBatchItem(item);await item.metaPromise}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker))}
function selectMediaFiles(e){
 const fs=[...(e.target.files||[])].filter(isMediaFile);if(!fs.length)return toast('לא נמצאו קובצי שמע או וידאו');
 const added=[];for(const f of fs){const kind=mediaKind(f),item={file:f,kind,title:baseName(f.name),artist:'',album:'',genre:'',cover:null,coverPreview:'',mediaPreview:kind==='video'?URL.createObjectURL(f):'',metaState:'waiting',metaPromise:null};uploadBatch.push(item);added.push(item)}
 e.target.value='';renderUploadBatch();toast(`${fs.length} קבצים נוספו — קורא תמונות ופרטים`);processMetadataQueue(added).catch(()=>{});
}
async function uploadMediaAndCover(item,index){
 const uid=currentUser.id,stamp=`${Date.now()}_${index}_${Math.random().toString(36).slice(2,8)}`,mediaPath=`${uid}/media/${stamp}_${safeFileName(item.file.name)}`;
 const coverPath=item.cover?`${uid}/covers/${stamp}_${safeFileName(item.cover.name||'cover.jpg')}`:null;
 const jobs=[sb.storage.from('user-media').upload(mediaPath,item.file,{upsert:false,contentType:item.file.type||undefined})];
 if(item.cover)jobs.push(sb.storage.from('user-media').upload(coverPath,item.cover,{upsert:false,contentType:item.cover.type||undefined}));
 const results=await Promise.all(jobs);if(results.some(r=>r.error)){await sb.storage.from('user-media').remove([mediaPath,...(coverPath?[coverPath]:[])]).catch(()=>{});throw new Error(item.file.name)}
 return {row:{user_id:uid,title:(item.title||baseName(item.file.name)).trim(),artist:(item.artist||'').trim(),album:(item.album||'').trim(),genre:(item.genre||'').trim(),media_type:item.kind,file_path:mediaPath,cover_path:coverPath,restricted:false},paths:[mediaPath,...(coverPath?[coverPath]:[])]};
}
async function uploadAllBatch(){
 if(!uploadBatch.length)return toast('בחר קודם שירים או סרטונים');if(!navigator.onLine)return toast('צריך חיבור לאינטרנט כדי להעלות קבצים');
 const btn=$('#uploadAll'),box=$('#batchProgress'),fill=$('#progressFill'),txt=$('#progressText');btn.disabled=true;box.classList.add('show');const total=uploadBatch.length;let done=0,failed=[];const successes=[];let next=0;
 txt.textContent='מסיים לקרוא שמות ותמונות מהקבצים…';
 try{await processMetadataQueue(uploadBatch,4)}catch(e){}
 const conn=navigator.connection?.effectiveType||'';const concurrency=Math.min(total,conn.includes('2g')?3:((navigator.hardwareConcurrency||4)>=8?8:6));
 txt.textContent=`מתחיל העלאה מהירה של ${total} קבצים…`;
 async function worker(){while(next<total){const i=next++,item=uploadBatch[i];try{const r=await uploadMediaAndCover(item,i);successes.push(r)}catch(e){failed.push(item.file.name)}finally{done++;fill.style.width=`${Math.round(done/total*100)}%`;txt.textContent=`מעלה במקביל — ${done} מתוך ${total}`}}}
 await Promise.all(Array.from({length:concurrency},worker));
 let inserted=[];
 if(successes.length){const ins=await sb.from('tracks').insert(successes.map(x=>x.row)).select('*');if(ins.error){console.error('tracks insert failed',ins.error);failed.push(...successes.map(x=>x.row.title));await sb.storage.from('user-media').remove(successes.flatMap(x=>x.paths)).catch(()=>{});successes.length=0}else inserted=ins.data||[]}
 // Show the songs immediately, even before a fresh server reload completes.
 if(inserted.length){const ids=new Set(inserted.map(x=>x.id));tracks=[...inserted,...tracks.filter(x=>!ids.has(x.id))];saveSnapshot();await render()}
 fill.style.width='100%';txt.textContent=failed.length?`הועלו ${successes.length} מתוך ${total}. ${failed.length} נכשלו.`:`הועלו ${successes.length} קבצים בהצלחה`;
 btn.disabled=false;
 if(!failed.length){cleanupBatchUrls();uploadBatch=[];renderUploadBatch();setTimeout(()=>box.classList.remove('show'),650);toast(`${successes.length} שירים נוספו לספריית השירים`);setTab('library');setTimeout(()=>loadData().catch(()=>{}),500)}else{toast(`הועלו ${successes.length}; ${failed.length} נכשלו`);await loadData()}
}

function lockRestricted(){
 currentMedia?.pause();$('#player').classList.remove('show');$('#mini').classList.remove('show');
 const k=`warn:${currentUser.id}`,n=+(localStorage.getItem(k)||0)+1;localStorage.setItem(k,n);
 $('#lockText').textContent=`הופעל קובץ שסומן כמוגבל. הנגן נעצר. זו אזהרה מספר ${n}.`;
 $('#lockScreen').classList.add('show');
}
async function playTrack(id,q=null){
 const t=tracks.find(x=>x.id===id);if(!t)return;if($('#kosherMode').checked&&t.restricted)return lockRestricted();
 recordPlayStart(t);
 queue=q||filterTracks().map(x=>x.id);idx=Math.max(0,queue.indexOf(id));currentId=id;
 const media=await offlineUrl(t.file_path,''),cover=await offlineUrl(t.cover_path);if(!media)return toast('השיר הזה לא הורד למכשיר. התחבר לאינטרנט או הורד אותו לאופליין.');
 audio.pause();video.pause();currentMedia=t.media_type==='video'?video:audio;
 if(t.media_type==='video'){video.src=media;video.style.display='block';$('#playerCover').style.display='none'}else{audio.src=media;video.style.display='none';$('#playerCover').style.display='block'}
 $('#playerCover').src=cover;$('#miniCover').src=cover;updateMediaSwitch(t);$('#miniTitle').textContent=$('#playerTitle').textContent=t.title;$('#miniArtist').textContent=$('#playerArtist').textContent=t.artist||'אמן לא ידוע';$('#mini').classList.add('show');$('#favBtn').textContent=t.favorite?'♥':'♡';
 if(navigator.onLine)await sb.from('tracks').update({last_played_at:new Date().toISOString()}).eq('id',id);t.last_played_at=new Date().toISOString();saveSnapshot();
 if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist||'',album:t.album||'',artwork:[{src:cover}]});navigator.mediaSession.setActionHandler('play',()=>currentMedia.play());navigator.mediaSession.setActionHandler('pause',()=>currentMedia.pause());navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('previoustrack',prev)}catch(e){}}
 try{await currentMedia.play()}catch(e){}sync();render();
}
function sync(){const p=currentMedia&&!currentMedia.paused;$('#play').textContent=$('#playMini').textContent=p?'❚❚':'▶'}
function toggle(){if(!currentMedia)return;currentMedia.paused?currentMedia.play():currentMedia.pause();sync()}
function next(){if(queue.length){idx=(idx+1)%queue.length;playTrack(queue[idx],queue)}}function prev(){if(queue.length){idx=(idx-1+queue.length)%queue.length;playTrack(queue[idx],queue)}}
function mediaEvents(m){m.addEventListener('timeupdate',()=>{if(m!==currentMedia)return;$('#seek').value=m.duration?Math.round(m.currentTime/m.duration*1000):0;$('#cur').textContent=fmt(m.currentTime);$('#dur').textContent=fmt(m.duration);if(!m.paused&&currentId){const now=m.currentTime,delta=statLastMediaTime?now-statLastMediaTime:0;statLastMediaTime=now;if(delta>0&&delta<5){const t=tracks.find(x=>x.id===currentId);recordListenSeconds(t,delta)}}});m.addEventListener('play',()=>{statLastMediaTime=m.currentTime||0;sync()});m.addEventListener('pause',()=>{saveListenStats(true);renderListeningStats();sync()});m.addEventListener('ended',()=>{saveListenStats(true);renderListeningStats();next()})}


function toggleTrackSelect(){trackSelectMode=!trackSelectMode;if(!trackSelectMode)selectedTracks.clear();$('#selectTracks').textContent=trackSelectMode?'סיום':'בחירה';$('#selectionActions').classList.toggle('hidden',!trackSelectMode);render()}
async function deleteSelectedTracks(){const ids=[...selectedTracks].map(String);if(!ids.length)return toast('בחר שירים למחיקה');if(!confirm(`למחוק ${ids.length} שירים מהספרייה?`))return;const doomed=tracks.filter(t=>ids.includes(String(t.id)));if(navigator.onLine){const {error}=await sb.from('tracks').delete().in('id',ids);if(error)return toast('לא ניתן למחוק את השירים');const paths=doomed.flatMap(t=>[t.file_path,t.cover_path]).filter(Boolean);if(paths.length)await sb.storage.from('user-media').remove(paths).catch(()=>{});}tracks=tracks.filter(t=>!ids.includes(String(t.id)));selectedTracks.clear();trackSelectMode=false;$('#selectTracks').textContent='בחירה';$('#selectionActions').classList.add('hidden');saveSnapshot();await render();toast(`${ids.length} שירים נמחקו`)}
function stopPlayback(){if(currentMedia){currentMedia.pause();try{currentMedia.currentTime=0}catch(e){} try{currentMedia.removeAttribute('src');currentMedia.load()}catch(e){}} currentMedia=null;currentId=null;queue=[];$('#mini').classList.remove('show');$('#player').classList.remove('show');sync()}


function normPair(t){return `${String(t.title||'').toLowerCase().replace(/\b(official|video|audio|קליפ|וידאו|אודיו)\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}|${String(t.artist||'').toLowerCase().trim()}`}
function pairedTrack(t){if(!t)return null;return tracks.find(x=>String(x.id)!==String(t.id)&&x.media_type!==t.media_type&&normPair(x)===normPair(t))||null}
function updateMediaSwitch(t){const pair=pairedTrack(t),box=$('#mediaSwitch');if(!box)return;if(!pair){box.classList.add('hidden');return}box.classList.remove('hidden');$('#showAudio').classList.toggle('active',t.media_type==='audio');$('#showVideo').classList.toggle('active',t.media_type==='video')}
async function switchPaired(kind){const t=tracks.find(x=>String(x.id)===String(currentId));if(!t)return;const target=t.media_type===kind?t:pairedTrack(t);if(!target||target.media_type!==kind)return toast(kind==='video'?'אין סרטון תואם לשיר הזה':'אין קובץ שמע תואם');const at=currentMedia?.currentTime||0,wasPlaying=currentMedia&&!currentMedia.paused;await playTrack(target.id,queue);try{currentMedia.currentTime=Math.min(at,Math.max(0,(currentMedia.duration||at)-.1))}catch(e){}if(!wasPlaying)currentMedia.pause();sync()}
function chosenIds(){return [...selectedTracks].map(String)}
async function addIdsToPlaylist(ids){if(!ids.length)return toast('בחר שירים');if(!playlists.length)return toast('צור קודם פלייליסט');const names=playlists.map((p,i)=>`${i+1}. ${p.name}`).join('\n');const n=prompt(`לאיזה פלייליסט?\n${names}`);const p=playlists[Number(n)-1];if(!p)return;const {data}=await sb.from('playlist_tracks').select('position').eq('playlist_id',p.id).order('position',{ascending:false}).limit(1);let pos=(data?.[0]?.position||0)+1;const rows=ids.map(id=>({playlist_id:p.id,track_id:id,position:pos++}));const r=await sb.from('playlist_tracks').upsert(rows,{onConflict:'playlist_id,track_id'});if(r.error)return toast('לא ניתן להוסיף לפלייליסט');toast(`${ids.length} נוספו ל-${p.name}`)}
async function setAlbumForIds(ids){if(!ids.length)return toast('בחר שירים');const album=prompt('שם האלבום:');if(album===null)return;const r=await sb.from('tracks').update({album:album.trim()}).in('id',ids);if(r.error)return toast('לא ניתן לעדכן אלבום');tracks.forEach(t=>{if(ids.includes(String(t.id)))t.album=album.trim()});saveSnapshot();await render();toast('האלבום עודכן')}
async function deleteIds(ids){if(!ids.length)return;if(!confirm(`למחוק ${ids.length} שירים?`))return;const doomed=tracks.filter(t=>ids.includes(String(t.id)));const r=await sb.from('tracks').delete().in('id',ids);if(r.error)return toast('לא ניתן למחוק');const paths=doomed.flatMap(t=>[t.file_path,t.cover_path]).filter(Boolean);if(paths.length)await sb.storage.from('user-media').remove(paths).catch(()=>{});tracks=tracks.filter(t=>!ids.includes(String(t.id)));selectedTracks.clear();saveSnapshot();await render();toast('נמחק בהצלחה')}
function openTrackActions(id){const t=tracks.find(x=>String(x.id)===String(id));if(!t)return;actionTrackId=String(t.id);$('#actionTrackTitle').textContent=t.title||'אפשרויות שיר';$('#trackActionSheet').classList.add('show')}

async function openArtist(name){currentArtistName=name;const list=tracks.filter(t=>(t.artist||'אמן לא ידוע')===name);if(!list.length)return;$('#artistModalName').textContent=name;$('#artistModalMeta').textContent=`${list.length} ${list.length===1?'שיר':'שירים'} בספרייה`;$('#artistModalPic').src=await artistPicture(name,list);const ranked=list.map(t=>({t,st:listenStats.tracks[String(t.id)]||{}})).sort((a,b)=>((b.st.seconds||0)+(b.st.plays||0)*30)-((a.st.seconds||0)+(a.st.plays||0)*30));$('#artistTopSong').textContent=ranked[0]?.st?.plays?`השיר שאתה שומע הכי הרבה: ${ranked[0].t.title}`:'עדיין אין מספיק נתוני האזנה לאמן הזה';await renderCards($('#artistSongsGrid'),list);$('#artistModal').classList.add('show')}
async function uploadArtistPicture(){const f=$('#artistPicFile')?.files?.[0];if(!f||!currentArtistName||!currentUser)return;toast('מעדכן תמונת אמן…');const ext=(f.name.split('.').pop()||'jpg').toLowerCase();const path=`${currentUser.id}/artists/${encodeURIComponent(currentArtistName).replace(/%/g,'_')}-${Date.now()}.${ext}`;const {error}=await sb.storage.from('user-media').upload(path,f,{upsert:false,contentType:f.type||undefined});if(error)return toast('לא ניתן להעלות את תמונת האמן');setArtistPic(currentArtistName,path);$('#artistModalPic').src=await offlineUrl(path);await renderArtists();toast('תמונת האמן עודכנה')}
function getRadioStations(){try{return JSON.parse(localStorage.getItem(radioKey())||'[]')||[]}catch(e){return[]}}
function saveRadioStations(x){localStorage.setItem(radioKey(),JSON.stringify(x))}
function renderRadioStations(){const el=$('#radioList');if(!el)return;const a=getRadioStations();el.innerHTML=a.length?a.map((r,i)=>`<div class="radioRow"><div class="radioDot">R</div><div class="grow"><strong>${esc(r.name)}</strong><div class="sub radioFreq">${r.freq?esc(r.freq)+' FM · ':''}רדיו חי</div></div><button class="secondary" data-radio-play="${i}">נגן</button><button class="tinyBtn tinyDanger" data-radio-del="${i}">מחק</button></div>`).join(''):'<div class="sub">אין תחנות שמורות עדיין.</div>'}
function addRadio(){const name=$('#radioName').value.trim(),freq=$('#radioFreq').value.trim(),url=$('#radioUrl').value.trim();if(!name||!/^https?:\/\//i.test(url))return toast('כתוב שם תחנה וכתובת סטרים תקינה');const a=getRadioStations();a.push({name,freq,url});saveRadioStations(a);$('#radioName').value='';$('#radioFreq').value='';$('#radioUrl').value='';renderRadioStations();toast('התחנה נוספה')}
async function playRadio(i){const r=getRadioStations()[i];if(!r)return;video.pause();audio.pause();currentMedia=audio;currentId=null;queue=[];audio.src=r.url;$('#miniCover').src=defaultCover();$('#miniTitle').textContent=r.name;$('#miniArtist').textContent=r.freq?`${r.freq} FM · רדיו חי`:'רדיו חי';$('#mini').classList.add('show');try{await audio.play()}catch(e){toast('התחנה לא הצליחה להתחיל. בדוק שכתובת הסטרים ישירה ותומכת בדפדפן.')}sync()}
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
 $('#mediaFile').onchange=selectMediaFiles;$('#folderFile').onchange=selectMediaFiles;$('#uploadAll').onclick=uploadAllBatch;$('#clearBatch').onclick=()=>{cleanupBatchUrls();uploadBatch=[];renderUploadBatch()};
 $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $$('[data-theme]').forEach(b=>b.onclick=async()=>{applyTheme(b.dataset.theme);await updateProfile({theme:b.dataset.theme})});$('#avatarFile').onchange=uploadAvatar;$('#customColor').oninput=async e=>{applyColor(e.target.value);await updateProfile({accent_color:e.target.value})};updateClock();setInterval(updateClock,1000);
 $('#kosherMode').onchange=async e=>{profile.kosher_mode=e.target.checked;saveSnapshot();if(navigator.onLine)await updateProfile({kosher_mode:e.target.checked})};
 $('#downloadOffline').onclick=downloadAllOffline;$('#clearOffline').onclick=clearOffline;window.addEventListener('online',()=>{toast('חזרת לאינטרנט');loadData()});window.addEventListener('offline',()=>toast('מצב לא מקוון — Nigun ממשיך מהמכשיר')); 
 $('#search').oninput=render;$('#searchBtn').onclick=()=>{setTab('library');render();$('#search').focus()};$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){setTab('library');render()}});
 $('#selectTracks').onclick=toggleTrackSelect;$('#deleteSelected').onclick=deleteSelectedTracks;$('#selectAllTracks').onclick=()=>{tracks.forEach(t=>selectedTracks.add(String(t.id)));render()};$('#addSelectedPlaylist').onclick=()=>addIdsToPlaylist(chosenIds());$('#setSelectedAlbum').onclick=()=>setAlbumForIds(chosenIds());$('#deleteAllTracks').onclick=()=>deleteIds(tracks.map(t=>String(t.id)));$('#showAudio').onclick=()=>switchPaired('audio');$('#showVideo').onclick=()=>switchPaired('video');$('#currentTrackMenu').onclick=()=>currentId&&openTrackActions(currentId);$('#closeTrackActions').onclick=()=>$('#trackActionSheet').classList.remove('show');$('#actionAddPlaylist').onclick=()=>addIdsToPlaylist([actionTrackId]);$('#actionSetAlbum').onclick=()=>setAlbumForIds([actionTrackId]);$('#actionDeleteTrack').onclick=async()=>{await deleteIds([actionTrackId]);$('#trackActionSheet').classList.remove('show')};$('#actionPlayArtist').onclick=()=>{const t=tracks.find(x=>String(x.id)===actionTrackId);if(t){$('#trackActionSheet').classList.remove('show');openArtist(t.artist||'אמן לא ידוע')}};$('#closeArtist').onclick=()=>$('#artistModal').classList.remove('show');$('#artistModal').onclick=e=>{if(e.target.id==='artistModal')$('#artistModal').classList.remove('show')};$('#artistPicFile').onchange=uploadArtistPicture;$('#addRadio').onclick=addRadio;
 $('#createPlaylist').onclick=async()=>{const n=$('#playlistName').value.trim();if(!n)return toast('כתוב שם לפלייליסט');const r=await sb.from('playlists').insert({user_id:currentUser.id,name:n});if(r.error)return toast('לא ניתן ליצור פלייליסט');$('#playlistName').value='';await loadData()};
 $('#shuffle').onclick=()=>{if(!tracks.length)return toast('אין שירים');const q=tracks.map(x=>x.id).sort(()=>Math.random()-.5);playTrack(q[0],q)};
 document.addEventListener('click',async e=>{const ts=e.target.closest('[data-track-select]');if(ts){const id=String(ts.dataset.trackSelect);ts.checked?selectedTracks.add(id):selectedTracks.delete(id);ts.closest('.card')?.classList.toggle('selected',ts.checked);return}if(trackSelectMode){const card=e.target.closest('.card');const cb=card?.querySelector('[data-track-select]');if(card&&cb&&!e.target.closest('button')){cb.checked=!cb.checked;const id=String(cb.dataset.trackSelect);cb.checked?selectedTracks.add(id):selectedTracks.delete(id);card.classList.toggle('selected',cb.checked);return}}const tm=e.target.closest('[data-track-menu]');if(tm)return openTrackActions(tm.dataset.trackMenu);const ar=e.target.closest('[data-artist]');if(ar)return openArtist(decodeURIComponent(ar.dataset.artist));const rp=e.target.closest('[data-radio-play]');if(rp)return playRadio(+rp.dataset.radioPlay);const rd=e.target.closest('[data-radio-del]');if(rd){const a=getRadioStations();a.splice(+rd.dataset.radioDel,1);saveRadioStations(a);renderRadioStations();return}const p=e.target.closest('[data-play]');if(p)return playTrack(p.dataset.play);const op=e.target.closest('[data-pl]');if(op){const {data}=await sb.from('playlist_tracks').select('track_id,position').eq('playlist_id',op.dataset.pl).order('position');const ids=(data||[]).map(x=>x.track_id).filter(id=>tracks.some(t=>t.id===id));if(!ids.length)return toast('הפלייליסט ריק');return playTrack(ids[0],ids)}const dp=e.target.closest('[data-delpl]');if(dp&&confirm('למחוק פלייליסט?')){await sb.from('playlists').delete().eq('id',dp.dataset.delpl);await loadData()}});
 $('#openPlayer').onclick=()=>$('#player').classList.add('show');$('#closePlayer').onclick=()=>$('#player').classList.remove('show');$('#play').onclick=$('#playMini').onclick=toggle;$('#stopMini').onclick=stopPlayback;$('#next').onclick=$('#nextMini').onclick=next;$('#prev').onclick=$('#prevMini').onclick=prev;$('#seek').oninput=e=>{if(currentMedia?.duration)currentMedia.currentTime=(+e.target.value/1000)*currentMedia.duration};$('#unlockBtn').onclick=()=>$('#lockScreen').classList.remove('show');
 $('#favBtn').onclick=async()=>{const t=tracks.find(x=>x.id===currentId);if(!t)return;t.favorite=!t.favorite;await sb.from('tracks').update({favorite:t.favorite}).eq('id',t.id);$('#favBtn').textContent=t.favorite?'♥':'♡'};
 mediaEvents(audio);mediaEvents(video);
 let session=null;try{const r=await sb.auth.getSession();session=r.data.session}catch(e){}if(session){currentUser=session.user;showApp()}else showAuth();
 sb.auth.onAuthStateChange((event,session)=>{if(session&&!currentUser){currentUser=session.user;showApp()}else if(!session&&currentUser)showAuth()});
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 hideSplash(900);
}
init();