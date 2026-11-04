const $ = (id) => document.getElementById(id);
const pages = {home:$("homePage"),game:$("gamePage"),report:$("reportPage")};

// Semua gambar tersimpan lokal di folder assets agar dapat digunakan tanpa koneksi internet.
const allObjects = [
  {id:"apple",name:"Apel",src:"assets/apple.jpg"},
  {id:"cat",name:"Kucing",src:"assets/cat.jpg"},
  {id:"soccer-ball",name:"Bola",src:"assets/soccer-ball.jpg"},
  {id:"sunflower",name:"Bunga matahari",src:"assets/sunflower.jpg"},
  {id:"car",name:"Mobil",src:"assets/car.jpg"},
  {id:"backpack",name:"Tas",src:"assets/backpack.jpg"},
  {id:"bananas",name:"Pisang",src:"assets/bananas.jpg"},
  {id:"alarm-clock",name:"Jam beker",src:"assets/alarm-clock.jpg"}
];
const stagePools = [
  ["apple","cat","soccer-ball","sunflower"],
  ["apple","cat","soccer-ball","sunflower","car","backpack"],
  ["apple","cat","soccer-ball","sunflower","car","backpack","bananas","alarm-clock"]
];
const state = {round:0,score:0,streak:0,correct:0,answers:[],current:null,phase:"memorize",timer:null,locked:false};
const durations=[5,5,5,5,5,4,4,4,4,4,3,3,3,3,3];
let responseStartedAt=0;
const getObject=id=>allObjects.find(o=>o.id===id);
function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function stageFor(index){return index<5?0:index<10?1:2}
function objectCount(index){return [4,6,8][stageFor(index)]}
function stageTitle(stage){return ["TAHAP 1 · 4 OBJEK","TAHAP 2 · 6 OBJEK","TAHAP 3 · 8 OBJEK"][stage]}
function showPage(name){
  Object.entries(pages).forEach(([key,el])=>el.classList.toggle("active",key===name));
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===name));
  if(name==="report")renderReport();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$("startBtn").addEventListener("click",startGame);
$("restartBtn").addEventListener("click",startGame);
$("playAgainBtn").addEventListener("click",startGame);
$("printBtn").addEventListener("click",()=>window.print());
$("soundToggle").addEventListener("click",()=>{
  const active=$("soundToggle").dataset.active!=="false";
  $("soundToggle").dataset.active=String(!active);
  $("soundToggle").textContent=active?"Suara mati":"Suara";
});
function startGame(){
  clearInterval(state.timer);
  Object.assign(state,{round:0,score:0,streak:0,correct:0,answers:[],current:null,phase:"memorize",locked:false});
  showPage("game");beginRound();
}
function beginRound(){
  clearInterval(state.timer);
  if(state.round>=15){finishGame();return}
  state.locked=false;
  const stage=stageFor(state.round),count=objectCount(state.round);
  const pool=stagePools[stage].map(getObject);
  const objects=shuffle(pool).slice(0,count);
  const missing=objects[Math.floor(Math.random()*objects.length)];
  const distractors=shuffle(allObjects.filter(o=>!objects.some(x=>x.id===o.id))).slice(0,Math.min(3,allObjects.length-count));
  state.current={objects,missing,choices:shuffle([missing,...distractors]),stage,count};
  state.phase="memorize";
  $("stageLabel").textContent=stageTitle(stage);
  $("phaseLabel").textContent="FASE 1 · AMATI";
  $("instruction").textContent="Perhatikan semua gambar berikut dan ingat baik-baik.";
  $("answerArea").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  $("feedback").textContent="";
  $("feedback").className="feedback";
  $("timerCaption").textContent="Waktu untuk mengamati";
  renderObjectGrid(objects);
  runTimer(durations[state.round],showQuestion);
}
function imageMarkup(obj,extra=""){
  return `<img src="${obj.src}" alt="${obj.name}" class="${extra}" draggable="false">`;
}
function renderObjectGrid(objects){
  $("objectGrid").innerHTML=objects.map(obj=>`<div class="object-tile">${imageMarkup(obj)}</div>`).join("");
}
function runTimer(seconds,done){
  clearInterval(state.timer);let remaining=seconds;
  $("timerNumber").textContent=remaining;
  state.timer=setInterval(()=>{
    remaining--; $("timerNumber").textContent=Math.max(0,remaining);
    if(remaining<=0){clearInterval(state.timer);done()}
  },1000);
}
function showQuestion(){
  responseStartedAt=performance.now();
  state.phase="guess";
  $("phaseLabel").textContent="FASE 2 · TEMUKAN";
  $("instruction").textContent="Satu benda menghilang. Benda mana yang tadi kamu lihat?";
  $("timerCaption").textContent="Pilih gambar yang hilang";
  $("timerNumber").textContent="?";
  $("objectGrid").innerHTML=state.current.objects.map(obj=>
    obj.id===state.current.missing.id
      ? '<div class="object-tile missing-tile">?</div>'
      : `<div class="object-tile">${imageMarkup(obj)}</div>`
  ).join("");
  $("answerArea").classList.remove("hidden");
  $("choiceGrid").innerHTML=state.current.choices.map(obj=>
    `<button class="choice-btn" data-choice="${obj.id}" aria-label="${obj.name}">${imageMarkup(obj)}</button>`
  ).join("");
  $("choiceGrid").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>checkAnswer(btn.dataset.choice,btn)));
}
function checkAnswer(choice,button){
  if(state.locked)return;
  state.locked=true;
  const elapsed=(performance.now()-responseStartedAt)/1000;
  const correct=choice===state.current.missing.id;
  $("choiceGrid").querySelectorAll("button").forEach(btn=>{
    btn.disabled=true;
    if(btn.dataset.choice===state.current.missing.id)btn.classList.add("correct");
  });
  if(correct){
    state.correct++;state.streak++;
    const points=100+(state.streak-1)*10;state.score+=points;
    $("feedback").textContent=`Tepat sekali! Kamu menemukan ${state.current.missing.name}. +${points} poin`;
    $("feedback").className="feedback good";
  }else{
    state.streak=0;button.classList.add("wrong");
    $("feedback").textContent=`Belum tepat. Benda yang hilang adalah ${state.current.missing.name}.`;
    $("feedback").className="feedback bad";
  }
  state.answers.push({round:state.round+1,stage:state.current.stage,correct,time:elapsed});
  $("nextBtn").classList.remove("hidden");
  $("nextBtn").textContent=state.round===14?"Lihat Rapor →":"Ronde Berikutnya →";
}
$("nextBtn").addEventListener("click",()=>{state.round++;beginRound()});
function finishGame(){clearInterval(state.timer);showPage("report")}
function renderReport(){
  const total=state.answers.length;
  const accuracy=total?Math.round(state.correct/total*100):0;
  $("finalScore").textContent=state.score;
  $("accuracy").textContent=total?`${accuracy}%`:"—";
  $("correctCount").textContent=total?`${state.correct}/${total}`:"—";
  $("avgTime").textContent=total?`${(state.answers.reduce((sum,a)=>sum+a.time,0)/total).toFixed(1)} dtk`:"—";
  $("reportTitle").textContent=total?"Kamu Hebat!":"Rapor Permainan";
  $("reportMessage").textContent=total?`Kamu menyelesaikan ${total} ronde. Terus berlatih dan tingkatkan kemampuanmu!`:"Selesaikan permainan untuk melihat hasilmu di sini.";
  if(!total){$("stageResults").innerHTML='<p class="empty-report">Belum ada data permainan. Mulai permainan untuk melihat laporan.</p>';return}
  $("stageResults").innerHTML=[0,1,2].map(stage=>{
    const items=state.answers.filter(a=>a.stage===stage),wins=items.filter(a=>a.correct).length;
    const pct=items.length?Math.round(wins/items.length*100):0;
    return `<article class="stage-result"><strong>${["Tahap 1 · 4 objek","Tahap 2 · 6 objek","Tahap 3 · 8 objek"][stage]}</strong><p>${wins} benar dari ${items.length} ronde · Akurasi ${pct}%</p></article>`;
  }).join("");
}
