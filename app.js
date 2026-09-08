const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL="https://fldzumhbfqajbdfezxyn.supabase.co", SUPABASE_KEY="sb_publishable_AlY10RZnStR3aKzEsLnJuw_ZLHKvP0b";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null, profile=null, tracks=[], playlists=[], queue=[], idx=-1,currentId=null,currentMedia=null,objUrl=null,coverUrl=null;
const audio=$('#audioEl'),video=$('#videoEl');
const COLORS=['#6d28d9','#7c3aed','#9333ea','#c026d3','#db2777','#e11d48','#dc2626','#ea580c','#d97706','#65a30d','#16a34a','#059669','#0d9488','#0891b2','#0284c7','#2563eb','#4f46e5','#475569','#111827','#7c2d12'];

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fmt(s){if(!isFinite(s))return'0:00';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function phoneEmail(p){return `${String(p).replace(/\D/g,'')}@nigun.local`}
function setTab(n){$$('.section').forEach(x=>x.classList.toggle('active',x.id===n));$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===n));scrollTo({top:0,behavior:'smooth'})}
function applyTheme(v){const d=v==='dark'||(v==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);document.body.classList.toggle('dark',d);$$('[data-theme]').forEach(x=>x.classList.toggle('active',x.dataset.theme===v))}
function applyColor(c){document.documentElement.style.setProperty('--accent',c);$$('.swatch').forEach(x=>x.classList.toggle('active',x.dataset.c===c))}
function renderPalette(){const p=$('#palette');p.innerHTML=COLORS.map(c=>`<button class="swatch" data-c="${c}" style="background:${c}"></button>`).join('');$$('.swatch').forEach(b=>b.onclick=async()=>{applyColor(b.dataset.c);await updateProfile({accent_color:b.dataset.c})})}
async function updateProfile(patch){if(!currentUser)return;const {error}=await sb.from('profiles').update(patch).eq('id',currentUser.id);if(error)toast('לא ניתן לשמור הגדרה')}
async function signed(path){if(!path)return'icon-512.png';const {data,error}=await sb.storage.from('user-media').createSignedUrl(path,3600);return error?'icon-512.png':data.signedUrl}
async function renderCards(el,arr){
 if(!arr.length){el.innerHTML='<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--muted)">עדיין אין כאן קבצים</div>';return}
 const rows=await Promise.all(arr.map(async t=>{const c=await signed(t.cover_path);return `<article class="card"><img class="cover" src="${c}"><button class="playBtn" data-play="${t.id}">▶</button><div class="title">${esc(t.title)}</div><div class="meta">${esc(t.artist||'אמן לא ידוע')} · ${t.media_type==='video'?'וידאו':'שמע'}${t.restricted?' · מוגבל':''}</div></article>`}));
 el.innerHTML=rows.join('');
}
function filterTracks(){const q=$('#search').value.trim().toLowerCase();return tracks.filter(t=>!q||[t.title,t.artist,t.album,t.genre].some(v=>(v||'').toLowerCase().includes(q)))}
async function render(){
 await renderCards($('#libraryGrid'),filterTracks());
 await renderCards($('#recentGrid'),tracks.filter(t=>t.last_played_at).sort((a,b)=>new Date(b.last_played_at)-new Date(a.last_played_at)).slice(0,8));
 $('#playlistList').innerHTML=playlists.length?playlists.map(p=>`<div class="settingRow row"><div class="grow"><strong>${esc(p.name)}</strong></div><button class="secondary" data-pl="${p.id}">פתח</button><button class="secondary" data-delpl="${p.id}">מחק</button></div>`).join(''):'<div class="sub">אין פלייליסטים עדיין</div>';
}
async function loadData(){
 const [tr,pl,pr]=await Promise.all([
   sb.from('tracks').select('*').order('created_at',{ascending:false}),
   sb.from('playlists').select('*').order('created_at',{ascending:false}),
   sb.from('profiles').select('*').eq('id',currentUser.id).single()
 ]);
 if(tr.error)toast('שגיאה בטעינת הספרייה'); tracks=tr.data||[];
 playlists=pl.data||[]; profile=pr.data||{};
 const name=profile.name||currentUser.user_metadata?.name||'משתמש';
 const phone=profile.phone||currentUser.user_metadata?.phone||'';
 $('#profileName').textContent=name;$('#profilePhone').textContent=phone;$('#helloTitle').textContent=`שלום ${name} 👋`;
 const a=name[0]||'נ';$('#profileBtn').textContent=a;$('#bigAvatar').textContent=a;
 $('#kosherMode').checked=profile.kosher_mode!==false;applyTheme(profile.theme||'auto');applyColor(profile.accent_color||'#6d28d9');await render();
}
function showApp(){ $('#authScreen').classList.add('hidden');$('#appScreen').classList.remove('hidden');loadData()}
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
async function saveTrack(){
 const f=$('#mediaFile').files[0];if(!f)return toast('בחר קובץ');
 const cover=$('#coverFile').files[0]||null, uid=currentUser.id, stamp=Date.now();
 const safe=n=>n.replace(/[^\w.\-]+/g,'_');
 const mediaPath=`${uid}/media/${stamp}_${safe(f.name)}`;
 let up=await sb.storage.from('user-media').upload(mediaPath,f,{upsert:false,contentType:f.type});
 if(up.error)return toast('העלאת הקובץ נכשלה');
 let coverPath=null;
 if(cover){coverPath=`${uid}/covers/${stamp}_${safe(cover.name)}`;let cu=await sb.storage.from('user-media').upload(coverPath,cover,{upsert:false,contentType:cover.type});if(cu.error){await sb.storage.from('user-media').remove([mediaPath]);return toast('העלאת הקאבר נכשלה')}}
 const row={user_id:uid,title:$('#trackTitle').value.trim()||f.name.replace(/\.[^.]+$/,''),artist:$('#trackArtist').value.trim(),album:$('#trackAlbum').value.trim(),genre:$('#trackGenre').value.trim(),media_type:f.type.startsWith('video/')?'video':'audio',file_path:mediaPath,cover_path:coverPath,restricted:$('#restricted').checked};
 const ins=await sb.from('tracks').insert(row);
 if(ins.error){await sb.storage.from('user-media').remove([mediaPath,...(coverPath?[coverPath]:[])]);return toast('שמירת השיר נכשלה')}
 ['#trackTitle','#trackArtist','#trackAlbum','#trackGenre'].forEach(s=>$(s).value='');$('#mediaFile').value='';$('#coverFile').value='';$('#restricted').checked=false;await loadData();toast('נשמר באזור האישי שלך');setTab('library');
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
 const media=await signed(t.file_path),cover=await signed(t.cover_path);
 audio.pause();video.pause();currentMedia=t.media_type==='video'?video:audio;
 if(t.media_type==='video'){video.src=media;video.style.display='block';$('#playerCover').style.display='none'}else{audio.src=media;video.style.display='none';$('#playerCover').style.display='block'}
 $('#playerCover').src=cover;$('#miniCover').src=cover;$('#miniTitle').textContent=$('#playerTitle').textContent=t.title;$('#miniArtist').textContent=$('#playerArtist').textContent=t.artist||'אמן לא ידוע';$('#mini').classList.add('show');$('#favBtn').textContent=t.favorite?'♥':'♡';
 await sb.from('tracks').update({last_played_at:new Date().toISOString()}).eq('id',id);t.last_played_at=new Date().toISOString();
 if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist||'',album:t.album||'',artwork:[{src:cover}]});navigator.mediaSession.setActionHandler('play',()=>currentMedia.play());navigator.mediaSession.setActionHandler('pause',()=>currentMedia.pause());navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('previoustrack',prev)}catch(e){}}
 try{await currentMedia.play()}catch(e){}sync();render();
}
function sync(){const p=currentMedia&&!currentMedia.paused;$('#play').textContent=$('#playMini').textContent=p?'❚❚':'▶'}
function toggle(){if(!currentMedia)return;currentMedia.paused?currentMedia.play():currentMedia.pause();sync()}
function next(){if(queue.length){idx=(idx+1)%queue.length;playTrack(queue[idx],queue)}}function prev(){if(queue.length){idx=(idx-1+queue.length)%queue.length;playTrack(queue[idx],queue)}}
function mediaEvents(m){m.addEventListener('timeupdate',()=>{if(m!==currentMedia)return;$('#seek').value=m.duration?Math.round(m.currentTime/m.duration*1000):0;$('#cur').textContent=fmt(m.currentTime);$('#dur').textContent=fmt(m.duration)});m.addEventListener('play',sync);m.addEventListener('pause',sync);m.addEventListener('ended',next)}
async function init(){
 renderPalette();
 $('#loginTab').onclick=()=>{$('#loginForm').classList.remove('hidden');$('#registerForm').classList.add('hidden');$('#loginTab').classList.add('active');$('#registerTab').classList.remove('active')};
 $('#registerTab').onclick=()=>{$('#registerForm').classList.remove('hidden');$('#loginForm').classList.add('hidden');$('#registerTab').classList.add('active');$('#loginTab').classList.remove('active')};
 $('#loginBtn').onclick=login;$('#registerBtn').onclick=register;$('#logoutBtn').onclick=logout;$('#saveTrack').onclick=saveTrack;$('#profileBtn').onclick=()=>setTab('settings');
 $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $$('[data-theme]').forEach(b=>b.onclick=async()=>{applyTheme(b.dataset.theme);await updateProfile({theme:b.dataset.theme})});
 $('#kosherMode').onchange=async e=>await updateProfile({kosher_mode:e.target.checked});
 $('#search').oninput=render;
 $('#createPlaylist').onclick=async()=>{const n=$('#playlistName').value.trim();if(!n)return toast('כתוב שם לפלייליסט');const r=await sb.from('playlists').insert({user_id:currentUser.id,name:n});if(r.error)return toast('לא ניתן ליצור פלייליסט');$('#playlistName').value='';await loadData()};
 $('#shuffle').onclick=()=>{if(!tracks.length)return toast('אין שירים');const q=tracks.map(x=>x.id).sort(()=>Math.random()-.5);playTrack(q[0],q)};
 document.addEventListener('click',async e=>{const p=e.target.closest('[data-play]');if(p)return playTrack(p.dataset.play);const op=e.target.closest('[data-pl]');if(op){const {data}=await sb.from('playlist_tracks').select('track_id,position').eq('playlist_id',op.dataset.pl).order('position');const ids=(data||[]).map(x=>x.track_id).filter(id=>tracks.some(t=>t.id===id));if(!ids.length)return toast('הפלייליסט ריק');return playTrack(ids[0],ids)}const dp=e.target.closest('[data-delpl]');if(dp&&confirm('למחוק פלייליסט?')){await sb.from('playlists').delete().eq('id',dp.dataset.delpl);await loadData()}});
 $('#openPlayer').onclick=()=>$('#player').classList.add('show');$('#closePlayer').onclick=()=>$('#player').classList.remove('show');$('#play').onclick=$('#playMini').onclick=toggle;$('#next').onclick=$('#nextMini').onclick=next;$('#prev').onclick=$('#prevMini').onclick=prev;$('#seek').oninput=e=>{if(currentMedia?.duration)currentMedia.currentTime=(+e.target.value/1000)*currentMedia.duration};$('#unlockBtn').onclick=()=>$('#lockScreen').classList.remove('show');
 $('#favBtn').onclick=async()=>{const t=tracks.find(x=>x.id===currentId);if(!t)return;t.favorite=!t.favorite;await sb.from('tracks').update({favorite:t.favorite}).eq('id',t.id);$('#favBtn').textContent=t.favorite?'♥':'♡'};
 mediaEvents(audio);mediaEvents(video);
 const {data:{session}}=await sb.auth.getSession();if(session){currentUser=session.user;showApp()}else showAuth();
 sb.auth.onAuthStateChange((event,session)=>{if(session&&!currentUser){currentUser=session.user;showApp()}else if(!session&&currentUser)showAuth()});
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init();