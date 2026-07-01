(function () {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx    = canvas.getContext("2d");
  const W = canvas.width;   // 900
  const H = canvas.height;  // 600

  /* AUDIO */
  let audioCtx = null;
  function getAC() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function tone(freq, type, dur, vol, detune) {
    vol = vol || 0.18; detune = detune || 0;
    if (!settings.sound) return;
    try {
      const ac = getAC();
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  function unlockAudio() {
  try {
    const ac = getAC();
    if (ac.state === "suspended") {
      ac.resume();
    }
  } catch (e) {}
}

  const sfx = {
    hit:      function() { tone(220,"square",  0.06,0.20); },
    brickLow: function() { tone(330,"square",  0.07,0.16); },
    brickMid: function() { tone(460,"square",  0.08,0.18); },
    brickHrd: function() { tone(260,"sawtooth",0.09,0.14); },
    powerup:  function() { tone(660,"sine",    0.25,0.22); },
    death:    function() { tone(110,"sawtooth",0.40,0.20); },
    laser:    function() { tone(880,"sawtooth",0.08,0.12,1200); },
    win:      function() { tone(523,"sine",.15,.2); setTimeout(function(){tone(659,"sine",.15,.2);},160); setTimeout(function(){tone(784,"sine",.25,.2);},320); },
    over:     function() { tone(200,"sawtooth",.3,.18); setTimeout(function(){tone(150,"sawtooth",.4,.18);},320); },
  };

  /* SETTINGS */
  var settings = { sound: true, particles: true };

  /* SAVE */
  var SAVE_KEY = "bytebreaker_v3";
  function loadSave()  { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch(e){ return {}; } }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch(e){} }
  var saveData = loadSave();
    if(!saveData.skins){
      saveData.skins = ["classic"];
  }
    if(!saveData.equippedSkin){
      saveData.equippedSkin = "classic";
  }
  function unlockedSet()  { return new Set(saveData.unlocked || [0]); }
  function unlockLevel(i) { var s=unlockedSet(); s.add(i); saveData.unlocked=Array.from(s); writeSave(); }
  function getHigh(i)     { return (saveData.scores && saveData.scores[i]) || 0; }
  function setHigh(i,sc)  { if(!saveData.scores)saveData.scores={}; if(sc>(saveData.scores[i]||0)){saveData.scores[i]=sc;writeSave();} }
  function unlockSkinForLevel(level){
    var unlocks = {
        4:"gold",
        7:"ice",
        11:"lava",
        14:"plasma",
        17:"galaxy"
    };
    var id = unlocks[level];
    if(!id) return;
    if(saveData.skins.indexOf(id)!==-1)
        return;
    saveData.skins.push(id);
    writeSave();
}

  /* PALLETE */
  var C = {
    cyan:    "#00eaff",
    magenta: "#f704ba",
    yellow:  "#ffe000",
    green:   "#00ff88",
    orange:  "#ff6600",
    red:     "#ff2244",
    white:   "#ffffff",
    grey:    "#445566",
    purple:  "#aa44ff",
    black:   "#000000",
    gradient:"radial-gradient( #00b9de, #006aff, #003cff, #001eff, #070089, #030033)",
    rarityCommon:"#bfc6d4",
    rarityUncommon:"#2dff6c",
    rarityRare:"#4ba3ff",
    rarityEpic:"#b15cff",
    rarityLegendary:"#ff9830",
    rarityMythic:"#ff44ff",
  };

  /* PADDLE SHAPES */
  var PADDLE_SHAPES = ["flat","convex","concave","wedge","diamond","fork","blade","omega","omega","wedge","flat","diamond","concave","blade","convex","circle","fork","omega","circle","diamond", "flat"];

  /* LEVELS */
  var LEVELS = [
    { name:"Boot Sector", ballSpeed:10.5, bricks:[
      "1 1 1 1 1 1 1 1 1",
      "1 1 1 1 1 1 1 1 1",
      "2 2 2 2 2 2 2 2 2",
      "2 P 2 2 2 2 2 P 2",
    ]},
    { name:"Kernel Panic", ballSpeed:6.0, bricks:[
      "1 2 1 2 1 2 1 2 1",
      "2 3 2 3 2 3 2 3 2",
      "1 2 P 2 1 2 P 2 1",
      "3 3 3 X 3 X 3 3 3",
      "2 2 2 2 2 2 2 2 2",
    ]},
    { name:"Stack Overflow", ballSpeed:6.5, bricks:[
      "X 1 1 1 1 1 1 1 X",
      "1 2 2 2 2 2 2 2 1",
      "1 2 3 3 P 3 3 2 1",
      "1 2 3 4 4 4 3 2 1",
      "1 2 3 3 3 3 3 2 1",
      "1 2 2 2 2 2 2 2 1",
      "X 1 1 1 1 1 1 1 X",
    ]},
    { name:"Buffer Zone", ballSpeed:7.0, bricks:[
      "3 0 3 0 3 0 3 0 3",
      "0 2 0 2 0 2 0 2 0",
      "3 0 P 0 3 0 P 0 3",
      "0 2 0 X 0 X 0 2 0",
      "3 0 3 0 3 0 3 0 3",
      "2 L 2 2 2 2 2 L 2",
    ]},
    { name:"Memory Leak", ballSpeed:7.5, bricks:[
      "X X X 1 1 1 X X X",
      "X 4 4 4 4 4 4 4 X",
      "X 4 3 3 P 3 3 4 X",
      "X 4 3 2 L 2 3 4 X",
      "X 4 3 3 3 3 3 4 X",
      "X 4 4 4 4 4 4 4 X",
      "X X X X X X X X X",
    ]},
    { name:"Root Access", ballSpeed:8.0, bricks:[
      "4 4 4 4 4 4 4 4 4",
      "4 X 3 3 3 3 3 X 4",
      "4 3 2 2 P 2 2 3 4",
      "4 3 2 X L X 2 3 4",
      "4 3 2 2 2 2 2 3 4",
      "4 X 3 3 3 3 3 X 4",
      "4 4 4 4 4 4 4 4 4",
    ]},
    { name:"Kernel Root", ballSpeed:8.5, bricks:[
      "X 1 2 3 4 3 2 1 X",
      "1 2 3 4 X 4 3 2 1",
      "2 3 4 X P X 4 3 2",
      "3 4 X P L P X 4 3",
      "2 3 4 X P X 4 3 2",
      "1 2 3 4 X 4 3 2 1",
      "X 1 2 3 4 3 2 1 X",
    ]},
    { name:"Byte Breaker", ballSpeed:9.0, bricks:[
      "X X X X 4 X X X X",
      "X 4 4 4 4 4 4 4 X",
      "X 4 X 3 P 3 X 4 X",
      "X 4 3 L 4 L 3 4 X",
      "X 4 X 3 P 3 X 4 X",
      "X 4 4 4 4 4 4 4 X",
      "X X X X X X X X X",
    ]},
    { name:"Data Corruption", ballSpeed:9.2, bricks:[
      "4 4 4 4 4 4 4 4 4",
      "3 3 3 3 3 3 3 3 3",
      "2 2 P 2 2 2 P 2 2",
      "3 3 3 X L X 3 3 3",
      "4 4 4 4 4 4 4 4 4",
    ]},
    { name:"Runtime Error", ballSpeed:9.4, bricks:[
      "X 4 X 4 X 4 X 4 X",
      "4 3 4 3 4 3 4 3 4",
      "3 2 3 P 3 P 3 2 3",
      "4 3 X 2 L 2 X 3 4",
      "3 2 3 3 3 3 3 2 3",
      "4 3 4 3 4 3 4 3 4",
    ]},
    { name:"Segmentation Fault", ballSpeed:9.6, bricks:[
      "4 X 4 X 4 X 4 X 4",
      "X 4 3 3 3 3 3 4 X",
      "4 3 X P 3 P X 3 4",
      "X 3 2 X L X 2 3 X",
      "4 3 X P 3 P X 3 4",
      "X 4 3 3 3 3 3 4 X",
      "4 X 4 X 4 X 4 X 4",
    ]},
    { name:"Packet Storm", ballSpeed:9.8, bricks:[
      "4 4 X 4 X 4 X 4 4",
      "4 3 4 3 4 3 4 3 4",
      "X 4 P X P X P 4 X",
      "4 3 X 4 L 4 X 3 4",
      "X 4 P X P X P 4 X",
      "4 3 4 3 4 3 4 3 4",
      "4 4 X 4 X 4 X 4 4",
    ]},
    { name:"Logic Bomb", ballSpeed:10.0, bricks:[
      "4 X 4 X 4 X 4 X 4",
      "X 4 X 4 X 4 X 4 X",
      "4 X P X 4 X P X 4",
      "X 4 X L X L X 4 X",
      "4 X P X 4 X P X 4",
      "X 4 X 4 X 4 X 4 X",
      "4 X 4 X 4 X 4 X 4",
    ]},
    { name:"Privilege Escalation", ballSpeed:10.2, bricks:[
      "4 4 4 X 4 X 4 4 4",
      "4 X 4 4 4 4 4 X 4",
      "4 4 X P 4 P X 4 4",
      "X 4 4 X L X 4 4 X",
      "4 4 X P 4 P X 4 4",
      "4 X 4 4 4 4 4 X 4",
      "4 4 4 X 4 X 4 4 4",
    ]},
    { name:"Firewall Breach", ballSpeed: 9.5, bricks:[
      "X 4 4 4 4 4 4 4 X",
      "4 X 4 4 4 4 4 X 4",
      "4 4 X 4 4 4 X 4 4",
      "4 4 X X L X X 4 4",
      "4 X 4 4 X 4 4 X 4",
      "X 4 4 4 4 4 4 4 X"
    ]},
    { name:"Flitcroft's Special", ballSpeed: 10.0, bricks:[
      "X X X 4 4 4 X X X",
      "X 1 X X 4 X X 2 X",
      "X 3 2 X 1 3 4 L X",
      "X 4 X 2 2 X 4 2 X",
      "X 3 2 3 X 4 X P X",
      "X 2 X X 4 4 4 4 X",
      "X X X X X X X X X",
    ]},
    { name:"Zero-Day", ballSpeed:10.5, bricks:[
      "X 4 X 4 X 4 X 4 X",
      "4 X 4 X 4 X 4 X 4",
      "X 4 X P X P X 4 X",
      "4 X L X X X L X 4",
      "X 4 X P X P X 4 X",
      "4 X 4 X 4 X 4 X 4",
      "X 4 X 4 X 4 X 4 X",
    ]},
    { name:"Kernel Collapse", ballSpeed:10.8, bricks:[
      "X X X X 4 X X X X",
      "X 4 4 4 4 4 4 4 X",
      "X 4 X X P X X 4 X",
      "4 4 X 4 L 4 X 4 4",
      "X 4 X X P X X 4 X",
      "X 4 4 4 4 4 4 4 X",
      "X X X X X X X X X",
    ]},
    { name:"System Failure", ballSpeed:11.2, bricks:[
      "4 X 4 X 4 X 4 X 4",
      "X 4 X 4 X 4 X 4 X",
      "4 X 4 X P X 4 X 4",
      "X 4 X L X L X 4 X",
      "4 X 4 X P X 4 X 4",
      "X 4 X 4 X 4 X 4 X",
      "4 X 4 X 4 X 4 X 4",
    ]},
    { name:"Singularity Protocol", ballSpeed:13.1, bricks:[
      "X X 4 X 4 X 4 X X",
      "X 4 4 4 4 4 X 4 X",
      "4 4 X X P X 4 X 4",
      "X X X L 4 L X 4 X",
      "4 4 4 X P X 4 4 4",
      "X 4 X 4 X 4 X 4 X",
      "X X 5 5 5 5 5 X X",
    ]},
    { name:"Impossible", ballSpeed:14.0, startLives:5, bricks:[
      "X X I X I X I X X",
      "X 4 I 4 I 4 I 4 X",
      "I 4 X X X X X 4 I",
      "X 4 4 4 L 4 4 4 X",
      "X X X X X X X X X",
      "I I I I I I I I I",
      "5 5 5 5 5 5 5 5 5",
    ]},
  ];

  /* BRICK CONFIG */
  var BRICK_W=80, BRICK_H=28, BRICK_GAP=6, COLS=9;
  var BOFF_X = (W - (COLS*(BRICK_W+BRICK_GAP)-BRICK_GAP)) / 2;
  var BOFF_Y = 68;
  var BCFG = {
    "1":{ hp:1, maxHp:1, color:C.white,   pts:10 },
    "2":{ hp:2, maxHp:2, color:C.cyan,    pts:20 },
    "3":{ hp:3, maxHp:3, color:C.magenta, pts:40 },
    "4":{ hp:4, maxHp:4, color:C.orange,  pts:80 },
    "5":{ hp:5, maxHp:5, color:C.red,     pts:120 },
    "I":{ hp:10, maxHp:10, color:C.gradient, pts:500 },
    "X":{ hp:-1, maxHp:-1, color:C.grey,  pts:0,  indestructible:true },
    "P":{ hp:1,  maxHp:1,  color:C.green, pts:50, powerup:true },
    "L":{ hp:1,  maxHp:1,  color:C.green, pts:50, powerup:true, laserDrop:true },
  };

  /* POWER UP TYPES */
  var PTYPES = [
    { id:"wide",  label:"WIDE PADDLE", color:C.green,   duration:10000 },
    { id:"slow",  label:"SLOW BALL",   color:C.cyan,    duration:6500  },
    { id:"multi", label:"MULTI-BALL",  color:C.magenta, duration:null  },
    { id:"laser", label:"LASER",       color:C.yellow,  duration:12000 },
    { id:"life",  label:"+1 LIFE",     color:C.red,     duration:null  },
  ];

/* PADDLE SKINS */

var SKINS = [
    {
        id: "classic",
        name: "Classic",
        color: "#00eaff",
        glow: "#00eaff",
        unlock: "Default",
        rarity: "common"
    },
    {
        id: "gold",
        name: "Gold",
        color: "#ffd700",
        glow: "#ffd700",
        unlock: "Beat Level 5",
        rarity: "rare"
    },
    {
        id: "ice",
        name: "Ice",
        color: "#8eefff",
        glow: "#bdf7ff",
        unlock: "Beat Level 8",
        rarity: "uncommon"
    },
    {
        id: "lava",
        name: "Lava",
        color: "#ff4a00",
        glow: "#ff9900",
        unlock: "Beat Level 12",
        rarity: "legendary"
    },
    {
        id: "plasma",
        name: "Plasma",
        color: "#ff00ff",
        glow: "#ff66ff",
        unlock: "Beat Level 15",
        rarity: "epic"
    },
    {
        id: "galaxy",
        name: "Galaxy",
        color: "#8855ff",
        glow: "#00ffff",
        unlock: "Beat Level 18",
        rarity: "mythic"
    }
];

var selectedSkin = saveData.equippedSkin || "classic";

  /* GAME STATES */
  var state = "menu";
  var lvlIdx = 0, score = 0, lives = 3, combo = 0, comboTimer = 0;
  var activePU = {}, puTimers = {};
  var nextLevelTimer = null;

  var PADDLE_BASE_W = 110;
  var paddle = { x:0, y:H-45, w:PADDLE_BASE_W, h:14, speed:9, shape:"flat" };

  var balls=[], bricks=[], particles=[], falling=[], lasers=[];
  var scanlineOffset=0;
  var bgStars = [];
  for(var _s=0;_s<70;_s++) bgStars.push({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.8+0.2, b:Math.random() });

  var announceTimer=0, announceText="", announceSub="";

  /* INPUT */
  var keys = {};
  document.addEventListener("keydown", function(e) {
    keys[e.code] = true;
    if ((e.code==="Escape"||e.code==="KeyP") && state==="playing")  { pauseGame(); return; }
    if ((e.code==="Escape"||e.code==="KeyP") && state==="paused")   { resumeGame(); return; }
    if (e.code==="Space" && state==="playing") {
      // SPACE: launch ball if waiting, otherwise fire laser — never both
      if (balls.some(function(b){return b.waiting;})) {
        launchWaiting();
      } else {
        fireLaser();
      }
    }
  });
  document.addEventListener("keyup", function(e) { delete keys[e.code]; });
  canvas.addEventListener("mousemove", function(e) {
    if (state!=="playing") return;
    var r = canvas.getBoundingClientRect();
    paddle.x = (e.clientX - r.left) * (W / r.width) - paddle.w / 2;
    clampPaddle();
  });
  canvas.addEventListener("click", function() {
    if (state!=="playing") return;
    if (balls.some(function(b){return b.waiting;})) {
      launchWaiting();
    } else {
      fireLaser();
    }
  });

  /* UI REPS */
  var $start    = document.getElementById("start-screen");
  var $levels   = document.getElementById("level-screen");
  var $settings = document.getElementById("settings-screen");
  var $skins    = document.getElementById("skins-screen");
  var $gameUI   = document.getElementById("game-ui");
  var $pause    = document.getElementById("pause-screen");
  var $gameover = document.getElementById("game-over");
  var $puUI     = document.getElementById("powerup-ui");
  var $score    = document.getElementById("score");
  var $lives    = document.getElementById("lives");
  var $lvlName  = document.getElementById("level-name");
  var $final    = document.getElementById("final-score");
  var $lvlList  = document.getElementById("level-list");

  // Sidebar extra elements
  var $sbScore    = document.getElementById("score");
  var $sbBest     = document.getElementById("high-score");
  var $sbLives    = document.getElementById("lives");
  var $sbLevelNum = document.getElementById("level-num");
  var $sbLvlName  = document.getElementById("level-name");
  var $sbBricks   = document.getElementById("sb-bricks");
  var $sbPowerups = document.getElementById("sb-powerups");
  var $sbCombo    = document.getElementById("sb-combo");

  document.getElementById("play-btn").addEventListener("click", function(){
    unlockAudio();
    startLevel(0);
  });
  document.getElementById("levels-btn").addEventListener("click",      showLevels);
  document.getElementById("skins-btn").addEventListener("click",       showSkins);
  document.getElementById("settings-btn").addEventListener("click",    showSettings);
  document.getElementById("back-to-menu").addEventListener("click",    showMenu);
  document.getElementById("settings-back").addEventListener("click",   showMenu);
  document.getElementById("skins-back").addEventListener("click",      showMenu);
  document.getElementById("equip-skin-btn").addEventListener("click", function(){
    var skin = SKINS.find(function(s){
        return s.id === selectedSkin;
    });
    if(!skin) return;
    if(saveData.skins.indexOf(skin.id) === -1){
        return;
    }
    saveData.equippedSkin = skin.id;
    writeSave();
    updateSkinPreview();
    showSkins();
});
  document.getElementById("resume-btn").addEventListener("click",      resumeGame);
  document.getElementById("pause-menu-btn").addEventListener("click",  function(){resumeGame();showMenu();});
  document.getElementById("retry-btn").addEventListener("click",       function(){startLevel(lvlIdx);});
  document.getElementById("gameover-menu-btn").addEventListener("click",showMenu);
  document.getElementById("sound-toggle").addEventListener("change",   function(e){settings.sound=e.target.checked;});
  document.getElementById("particles-toggle").addEventListener("change",function(e){settings.particles=e.target.checked;});

  //* SCREEN HELPERS */
  function hideAll() {
    // Hide all overlay screens, show canvas
    [$start,$levels,$settings,$skins,$pause,$gameover].forEach(function(el){
      el.classList.add("hidden");
    });
    $gameUI.classList.add("hidden");
    $puUI.classList.add("hidden");
    canvas.classList.remove("hidden"); // always make canvas visible
  }

  function showMenu() {
    // cancel any pending level transition before going to menu
    if (nextLevelTimer) { clearTimeout(nextLevelTimer); nextLevelTimer=null; }
    state="menu";
    clearAllPU();
    hideAll();
    canvas.classList.add("hidden");
    $start.classList.remove("hidden");
  }

  function showLevels() {
    state="levels";
    hideAll();
    canvas.classList.add("hidden");
    $lvlList.innerHTML="";
    var ul = unlockedSet();
    LEVELS.forEach(function(lv,i){
      var btn=document.createElement("button");
      var hs=getHigh(i);
      btn.innerHTML=
        "<div style='font-size:11px;opacity:.45;letter-spacing:2px'>LV"+(i+1)+"</div>"+
        "<div style='font-size:14px;margin:3px 0'>"+lv.name+"</div>"+
        "<div style='font-size:10px;color:"+C.cyan+"'>"+( hs?"Best: "+hs:"")+"</div>"+
        "<div style='font-size:9px;opacity:.35;margin-top:2px'>▬ "+(PADDLE_SHAPES[i]||"flat").toUpperCase()+"</div>";
      if (!ul.has(i)) {
        btn.disabled=true; btn.style.opacity="0.28"; btn.style.cursor="not-allowed";
        btn.style.borderColor="#333";
      } else {
        btn.addEventListener("click", (function(idx){return function(){startLevel(idx);};})(i));
      }
      $lvlList.appendChild(btn);
    });
    $levels.classList.remove("hidden");
  }

  function showSettings() {
    state="settings";
    hideAll();
    canvas.classList.add("hidden");
    $settings.classList.remove("hidden");
  }

  function showSkins() {
    state = "skins";
    hideAll();
    canvas.classList.add("hidden");
    $skins.classList.remove("hidden");
    var grid = document.getElementById("skin-grid");
    grid.innerHTML = "";

    SKINS.forEach(function(skin){

    var unlocked = saveData.skins.includes(skin.id);
    var equipped = saveData.equippedSkin === skin.id;
    var selected = selectedSkin === skin.id;

    var card = document.createElement("div");
    card.className = "skin-card";

    if(selected) card.classList.add("selected");

    if(!unlocked) card.classList.add("locked");
    card.dataset.rarity = skin.rarity;
    var status = "";
    if(equipped){
        status = "✓ Equipped";
    }else if(unlocked){
        status = "Click to Select";
    }else{
        status = "Locked";
    }
    card.innerHTML =
        "<div class='skin-rarity'>" +
            skin.rarity.toUpperCase() +
        "</div>" +
        "<div class='skin-preview-mini'>" +
            "<div class='mini-paddle' style='" +
                "background:"+skin.color+";" +
                "box-shadow:0 0 12px "+skin.glow+";" +
            "'></div>" +
        "</div>" +
        "<div class='skin-name'>" +
            skin.name.toUpperCase() +
        "</div>" +
        "<div class='skin-unlock'>" +
            skin.unlock +
        "</div>" +
        "<div class='skin-status'>" +
            status +
        "</div>";

    card.onclick = function(){
        selectedSkin = skin.id;
        updateSkinPreview();
        if (unlocked) {
            showSkins();
        }
    };
    grid.appendChild(card);
});
    updateSkinPreview();
  }

  function updateSkinPreview() {

    var skin = SKINS.find(function(s){
        return s.id === selectedSkin;
    });
    if (!skin) return;
    document.getElementById("preview-name").textContent =
        skin.name.toUpperCase();
    document.getElementById("preview-unlock").textContent =
        skin.unlock;
    var status = document.getElementById("preview-status");

    if (saveData.equippedSkin === skin.id) {
        status.textContent = "✓ Equipped";
        status.style.color = "#00ff88";
    } else {
        status.textContent = "Selected";
        status.style.color = "#ffe000";
    }

    var paddle = document.getElementById("preview-paddle");
    paddle.style.background = skin.color;
    paddle.style.boxShadow =
        "0 0 10px " + skin.glow +
        ",0 0 22px " + skin.glow;

    setPreviewTheme(skin.id);
}

  function setPreviewTheme(id){
      var fx = document.getElementById("preview-effects");
      fx.className = "";
      fx.classList.add("theme-" + id);
  }

  /* START LEVEL */
  function startLevel(i) {
    // cancel any stale pending nextLevel call from a previous level
    if (nextLevelTimer) { clearTimeout(nextLevelTimer); nextLevelTimer=null; }

    lvlIdx=i; score=0; lives = LEVELS[i].startLives || 3; combo=0; comboTimer=0;
    particles=[]; falling=[]; lasers=[];
    clearAllPU();       // clears pu timers, resets paddle.w
    buildBricks(i);     // fresh bricks
    resetPaddle();      // sets shape, position, width
    spawnBall(true);    // one ball waiting on paddle
    state="playing";
    hideAll();                          // makes canvas visible, hides all overlays
    $gameUI.classList.remove("hidden"); // show score/lives/levelname
    updateHUD();
    doAnnounce("LEVEL "+(i+1), LEVELS[i].name + "  ·  " + PADDLE_SHAPES[i].toUpperCase()+" PADDLE");
  }

  /* NEXT LEVEL */
  function nextLevel() {
    nextLevelTimer = null; // we've now fired
    var next = lvlIdx+1;
    unlockSkinForLevel(lvlIdx);
    setHigh(lvlIdx, score);
    if (next < LEVELS.length) unlockLevel(next);

    if (next >= LEVELS.length) {
      state="win"; showWinScreen(); return;
    }

    lvlIdx=next; score=0; combo=0; comboTimer=0;
    particles=[]; falling=[]; lasers=[];
    Object.keys(puTimers).forEach(function(k){clearTimeout(puTimers[k]);});
    puTimers={}; activePU={};
    paddle.w=PADDLE_BASE_W;

    buildBricks(lvlIdx);
    resetPaddle();
    spawnBall(true);
    state="playing";
    hideAll();                           // Ensures canvas visible, ALL overlays hidden
    $gameUI.classList.remove("hidden");  // show HUD
    updateHUD();
    doAnnounce("LEVEL "+(lvlIdx+1), LEVELS[lvlIdx].name + "  ·  " + PADDLE_SHAPES[lvlIdx].toUpperCase()+" PADDLE");
  }

  /* BRICKS */
  function buildBricks(i) {
    bricks=[];
    LEVELS[i].bricks.forEach(function(row,r){
      row.trim().split(/\s+/).forEach(function(code,c){
        if (code==="0") return;
        var cfg=BCFG[code]; if(!cfg) return;
        bricks.push({
          x: BOFF_X + c*(BRICK_W+BRICK_GAP),
          y: BOFF_Y + r*(BRICK_H+BRICK_GAP),
          w: BRICK_W, h: BRICK_H,
          hp: cfg.hp, maxHp: cfg.maxHp,
          color: cfg.color, pts: cfg.pts,
          powerup: !!cfg.powerup,
          laserDrop: !!cfg.laserDrop,
          indestructible: !!cfg.indestructible,
          shake: 0,
        });
      });
    });
  }

  /* PADDLE */
  function resetPaddle() {
    paddle.w     = PADDLE_BASE_W;
    paddle.x     = W/2 - paddle.w/2;
    paddle.y     = H-45;
    paddle.shape = PADDLE_SHAPES[lvlIdx] || "flat";
  }
  function clampPaddle() {
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  }

  /* BALL */
  function makeBall(waiting) {
    var sp  = LEVELS[lvlIdx].ballSpeed;
    var ang = -Math.PI/2 + (Math.random()-0.5)*0.6;
    return {
      x: paddle.x + paddle.w/2,
      y: paddle.y - 10,
      vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp,
      r: 8, waiting: waiting, trail: [], spawnGrace: 0,
    };
  }
  function spawnBall(waiting) { balls=[makeBall(!!waiting)]; }
  function launchWaiting()    { balls.forEach(function(b){ if(b.waiting){ b.waiting=false; b.spawnGrace=6; } }); }

  /* LASERS */
  function fireLaser() {
    if (!activePU["laser"]) return;
    lasers.push({x:paddle.x+paddle.w*.25, y:paddle.y, vy:-16, w:4, h:22});
    lasers.push({x:paddle.x+paddle.w*.75, y:paddle.y, vy:-16, w:4, h:22});
    sfx.laser();
  }

  /* POWERUPS */
  function clearAllPU() {
    Object.keys(puTimers).forEach(function(k){clearTimeout(puTimers[k]);});
    puTimers={}; activePU={};
    paddle.w = PADDLE_BASE_W;
    // shape is set by resetPaddle
  }
  function dropPU(br) {
    var pool = br.laserDrop ? PTYPES.filter(function(p){return p.id==="laser"||p.id==="multi";}) : PTYPES;
    var type = pool[Math.floor(Math.random()*pool.length)];
    falling.push({ x:br.x+br.w/2-50, y:br.y, w:100, h:24, vy:2.5, type:type });
  }
  function applyPU(type) {
    sfx.powerup(); showPUBanner(type.label, type.color);
    if (type.id==="wide") {
      paddle.w = PADDLE_BASE_W*1.7; clampPaddle();
      activateTimed("wide", type.duration, function(){paddle.w=PADDLE_BASE_W; clampPaddle();});
    }
    if (type.id==="slow") {
      balls.forEach(function(b){
        var s=Math.hypot(b.vx,b.vy), t=Math.max(3,s*.55);
        b.vx*=t/s; b.vy*=t/s;
      });
      activateTimed("slow", type.duration, function(){
        balls.forEach(function(b){
          var s=Math.hypot(b.vx,b.vy), t=LEVELS[lvlIdx].ballSpeed;
          if(s>0){b.vx*=t/s; b.vy*=t/s;}
        });
      });
    }
    if (type.id==="multi") {
      var cl=[];
      balls.forEach(function(b){
        if(!b.waiting){
          cl.push({x:b.x,y:b.y,vx:-b.vx+0.5,vy:b.vy,r:b.r,waiting:false,trail:[]});
          cl.push({x:b.x,y:b.y,vx:b.vx,vy:-b.vy+0.5,r:b.r,waiting:false,trail:[]});
        }
      });
      balls = balls.concat(cl);
    }
    if (type.id==="laser") { activateTimed("laser", type.duration, null); }
    if (type.id==="life")  { lives=Math.min(lives+1,5); updateHUD(); }
  }
  function activateTimed(id, dur, onExp) {
    if (puTimers[id]) clearTimeout(puTimers[id]);
    activePU[id] = Date.now()+dur;
    puTimers[id] = setTimeout(function(){ delete activePU[id]; if(onExp)onExp(); }, dur);
  }
  var puBannerTimer=null;
  function showPUBanner(label, color) {
    $puUI.textContent="⚡ "+label;
    $puUI.style.color=color;
    $puUI.style.textShadow="0 0 20px "+color;
    $puUI.classList.remove("hidden");
    $puUI.style.animation="none";
    void $puUI.offsetWidth;
    $puUI.style.animation="";
    if(puBannerTimer) clearTimeout(puBannerTimer);
    puBannerTimer=setTimeout(function(){$puUI.classList.add("hidden");},1900);
  }

  /* WIN */
  function showWinScreen() {
    hideAll(); // make canvas visible but then we need game-over overlay
    document.querySelector("#game-over h2").textContent="YOU WIN! \uD83C\uDFC6";
    $final.textContent="Final Score: "+score;
    var rb=document.getElementById("retry-btn");
    rb.textContent="Play Again";
    rb.onclick=function(){
      document.querySelector("#game-over h2").textContent="Game Over";
      rb.textContent="Retry";
      rb.onclick=function(){startLevel(lvlIdx);};
      startLevel(0);
    };
    $gameover.classList.remove("hidden");
  }

  // HUD */
  function updateHUD() {
    if ($sbScore)    $sbScore.textContent    = score;
    if ($sbBest)     $sbBest.textContent     = getHigh(lvlIdx);
    if ($sbLevelNum) $sbLevelNum.textContent = lvlIdx + 1;
    if ($sbLvlName)  $sbLvlName.textContent  = LEVELS[lvlIdx].name;
    if ($sbLives) {
      var dots = "";
      for(var i=0;i<5;i++) dots += i<lives ? "●" : '<span style="opacity:.2">●</span>';
      $sbLives.innerHTML = dots;
    }
    updateSidebarBricks();
    updateSidebarCombo();
  }

  function updateSidebarBricks() {
    if (!$sbBricks) return;
    var count = 0;
    for(var i=0;i<bricks.length;i++) { if(!bricks[i].indestructible) count++; }
    $sbBricks.textContent = count > 0 ? count : "✓";
  }

  function updateSidebarCombo() {
    if (!$sbCombo) return;
    if (combo > 1 && comboTimer > 0) {
      $sbCombo.textContent = combo + "x";
      $sbCombo.className = "sb-value sb-combo-val";
    } else {
      $sbCombo.textContent = "—";
      $sbCombo.className = "sb-value sb-combo-val inactive";
    }
  }

  function updateSidebarPU() {
    if (!$sbPowerups) return;
    var keys = Object.keys(activePU);
    if (keys.length === 0) {
      $sbPowerups.innerHTML = '<div class="sb-pu-empty">none active</div>';
      return;
    }
    var html = '<div class="sb-pu-row">';
    keys.forEach(function(id) {
      var tp = null;
      for(var i=0;i<PTYPES.length;i++){if(PTYPES[i].id===id){tp=PTYPES[i];break;}}
      if (!tp || !tp.duration) return;
      var rem = Math.max(0, (activePU[id] - Date.now()) / tp.duration);
      var pct = Math.round(rem * 100);
      html += '<div class="sb-pu-item">' +
        '<div class="sb-pu-name" style="color:'+tp.color+';text-shadow:0 0 8px '+tp.color+'">'+tp.label+'</div>' +
        '<div class="sb-pu-bar-track">' +
          '<div class="sb-pu-bar-fill" style="width:'+pct+'%;background:'+tp.color+';box-shadow:0 0 6px '+tp.color+'"></div>' +
        '</div></div>';
    });
    html += '</div>';
    $sbPowerups.innerHTML = html;
  }

  /* ANNOUNCE */
  function doAnnounce(title, sub) {
    announceText=title; announceSub=sub; announceTimer=2400;
  }

  /* MAIN LOOP */
  var lastT=0;
  function loop(ts) {
    var dt = Math.min((ts-lastT)/16.67, 3); lastT=ts;
    scanlineOffset=(scanlineOffset+0.5)%4;
    if (state==="playing") update(dt);
    draw();
    if (state==="playing" || state==="paused") {
      updateSidebarPU();
      updateSidebarCombo();
      updateSidebarBricks();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* UPDATE */
  function update(dt) {
    // keyboard paddle
    if (keys["ArrowLeft"] ||keys["KeyA"]) { paddle.x-=paddle.speed*dt; clampPaddle(); }
    if (keys["ArrowRight"]||keys["KeyD"]) { paddle.x+=paddle.speed*dt; clampPaddle(); }

    // waiting ball tracks paddle center
    balls.forEach(function(b){ if(b.waiting){ b.x=paddle.x+paddle.w/2; b.y=paddle.y-b.r-1; } });

    if(comboTimer>0){comboTimer-=dt*16.67; if(comboTimer<=0)combo=0;}
    if(announceTimer>0) announceTimer-=dt*16.67;

    moveBalls(dt);
    moveLasers(dt);
    moveFalling(dt);
    updateParticles(dt);
    bricks.forEach(function(b){if(b.shake>0)b.shake-=dt*2.5;});

    // BUG FIX: guard with state==="playing" so this only triggers once
    // and only while actually playing (not during levelcomplete)
    if (state==="playing") {
      var hasDestructible = false;
      for(var i=0;i<bricks.length;i++){
        if(!bricks[i].indestructible){hasDestructible=true;break;}
      }
      if (!hasDestructible) {
        sfx.win();
        state="levelcomplete"; // changed immediately — prevents re-entry
        // BUG FIX: store the timeout handle so startLevel() can cancel it
        nextLevelTimer = setTimeout(nextLevel, 800);
      }
    }
  }

  /* BALL PHYSICS */
  function moveBalls(dt) {
    var dead=[];
    balls.forEach(function(ball, bi){
      if(ball.waiting) return;
      ball.trail.push({x:ball.x, y:ball.y});
      if(ball.trail.length>10) ball.trail.shift();

      var steps=Math.max(1,Math.ceil((Math.abs(ball.vx)+Math.abs(ball.vy))*dt/ball.r));
      var sx=ball.vx*dt/steps, sy=ball.vy*dt/steps;

      for(var s=0; s<steps; s++){
        ball.x+=sx; ball.y+=sy;

        // wall bounces
        if(ball.x-ball.r<0)  {ball.x=ball.r;    ball.vx=Math.abs(ball.vx);  sfx.hit();}
        if(ball.x+ball.r>W)  {ball.x=W-ball.r;  ball.vx=-Math.abs(ball.vx); sfx.hit();}
        if(ball.y-ball.r<0)  {ball.y=ball.r;    ball.vy=Math.abs(ball.vy);  sfx.hit();}

        // paddle hit — per-shape hitbox
        if (ball.vy>0
          && ball.x+ball.r>=paddle.x
          && ball.x-ball.r<=paddle.x+paddle.w
          && ball.y+ball.r>=paddle.y
          && ball.y-ball.r<=paddle.y+paddle.h) {
          var hitSurface = paddleHitSurface(ball, paddle);
          if (hitSurface !== null) {
            ball.y = hitSurface - ball.r;
            ball.vy = -Math.abs(ball.vy);
            var rel=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
            var spd=Math.hypot(ball.vx,ball.vy);
            var ang=rel*(Math.PI/3);
            ball.vx=Math.sin(ang)*spd;
            ball.vy=-Math.cos(ang)*spd;
            sfx.hit();
            spawnParts(ball.x,hitSurface,6,C.cyan);
          }
        }

        // brick collisions
        var collided=false;
        for(var bi2=bricks.length-1; bi2>=0; bi2--){
          if(ball._lastBrick === bi2) continue;
          if(rectCircle(bricks[bi2],ball)){
            hitBrick(bi2,ball);
            ball._lastBrick = bi2;
            collided=true;
            break;
          }
        }
        if(!collided) ball._lastBrick = null;

        // lost ball
        if(ball.y-ball.r>H){ dead.push(bi); break; }
      }
    });

    // remove dead (deduplicated, reverse order to preserve indices)
    var seen={};
    dead.forEach(function(i){seen[i]=true;});
    Object.keys(seen).map(Number).sort(function(a,b){return b-a;}).forEach(function(i){balls.splice(i,1);});

    if(balls.length===0){
      lives--;
      updateHUD();
      if(lives<=0){
        sfx.over(); setHigh(lvlIdx,score);
        state="gameover";
        $final.textContent="Score: "+score+"  ·  Level: "+(lvlIdx+1);
        $gameover.classList.remove("hidden");
      } else {
        sfx.death();
        spawnBall(true);   // fresh ball waiting on paddle
        // clear powerups but DON'T reset score/lives (already decremented)
        Object.keys(puTimers).forEach(function(k){clearTimeout(puTimers[k]);});
        puTimers={}; activePU={};
        paddle.w=PADDLE_BASE_W;
        resetPaddle();     // re-centres paddle with correct shape
      }
    }
  }

  function rectCircle(br, ball) {
    var cx=Math.max(br.x,Math.min(br.x+br.w,ball.x));
    var cy=Math.max(br.y,Math.min(br.y+br.h,ball.y));
    return (cx-ball.x)*(cx-ball.x)+(cy-ball.y)*(cy-ball.y) < ball.r*ball.r;
  }

  function hitBrick(idx, ball) {
    var br=bricks[idx];
    if(br.indestructible){ bounceOff(br,ball); sfx.brickHrd(); br.shake=6; return; }
    br.hp--;
    br.shake=9;
    if(br.hp<=0){
      combo++; comboTimer=140;
      score += br.pts + (combo>1?combo*5:0);
      spawnParts(br.x+br.w/2, br.y+br.h/2, 18, br.color);
      if(br.powerup) dropPU(br);
      bricks.splice(idx,1);
      sfx.brickMid();
    } else {
      score += Math.floor(br.pts/4);
      spawnParts(br.x+br.w/2, br.y+br.h/2, 5, br.color);
      sfx.brickLow();
    }
    updateHUD();
    bounceOff(br,ball);
  }

  function bounceOff(br, ball) {
    var cx=Math.max(br.x, Math.min(br.x+br.w, ball.x));
    var cy=Math.max(br.y, Math.min(br.y+br.h, ball.y));
    var dx=ball.x-cx, dy=ball.y-cy;
    var dist=Math.sqrt(dx*dx + dy*dy);
    var nx=0, ny=0;

    if(dist === 0) {
      var ol=(ball.x+ball.r)-br.x, or2=(br.x+br.w)-(ball.x-ball.r);
      var ot=(ball.y+ball.r)-br.y, ob=(br.y+br.h)-(ball.y-ball.r);
      if(Math.min(ol,or2) < Math.min(ot,ob)) {
        if (ol < or2) {
          nx = -1; ny = 0;
          ball.x = br.x - ball.r - 1;
        } else {
          nx = 1; ny = 0;
          ball.x = br.x + br.w + ball.r + 1;
        }
        ball.vx = -ball.vx;
      } else {
        if (ot < ob) {
          nx = 0; ny = -1;
          ball.y = br.y - ball.r - 1;
        } else {
          nx = 0; ny = 1;
          ball.y = br.y + br.h + ball.r + 1;
        }
        ball.vy = -ball.vy;
      }
    } else {
      nx = dx / dist; ny = dy / dist;
      var overlap = ball.r - dist + 0.5;
      if (overlap > 0) {
        ball.x += nx * overlap;
        ball.y += ny * overlap;
      }
      var dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
    }

    // extra safety: if the ball is still colliding, push it out along the collision normal
    for(var i=0;i<8 && rectCircle(br, ball); i++){
      ball.x += nx * 1.5;
      ball.y += ny * 1.5;
    }
  }

  // Returns the y coordinate of the paddle surface at ball.x for the current shape,
  // or null if the ball is not actually over a solid part of the paddle.
  function paddleHitSurface(ball, p) {
    var x=ball.x, px=p.x, py=p.y, pw=p.w, ph=p.h;
    var t=(x-px)/pw; // normalised 0..1 position across paddle

    switch(p.shape){

      case "convex": {
        // top bows upward: quadratic arc from (px,py+ph*0.5) through (px+pw/2,py-8) to (px+pw,py+ph*0.5)
        // parametric: surfaceY = py+ph*0.5 - 4*( py+ph*0.5-(py-8) )*t*(1-t)
        //                      = py+ph*0.5 - 4*(ph*0.5+8)*t*(1-t)
        if(t<0||t>1) return null;
        var surfY = py + ph*0.5 - 4*(ph*0.5+8)*t*(1-t);
        return surfY;
      }

      case "concave": {
        // top edge is flat (straight line from (px,py) to (px+pw,py))
        if(t<0||t>1) return null;
        return py; // flat top; the inward bow is on the bottom
      }

      case "wedge": {
        // left edge at py+ph*0.6, right edge at py  → linear interpolation
        if(t<0||t>1) return null;
        return (py + ph*0.6) + t*(py - (py + ph*0.6));
        // simplifies to: py + ph*0.6*(1-t)
      }

      case "diamond": {
        // V-peak at centre (py-8), base corners at py+ph*0.5
        // left half: linear from (0, py+ph*0.5) to (0.5, py-8)
        // right half: linear from (0.5, py-8) to (1, py+ph*0.5)
        if(t<0||t>1) return null;
        if(t<=0.5) return (py+ph*0.5) + t*2*((py-8)-(py+ph*0.5));
        else       return (py-8) + (t-0.5)*2*((py+ph*0.5)-(py-8));
      }

      case "fork": {
        // Two parabolic bumps.  Left bump centred at t=0.18, right at t=0.82, valleys at t=0 (side), t=0.5 (middle), t=1 (side).
        // Approximate: for each bump use the same quadratic formula as convex but offset.
        // Left bump: t in [0, 0.35], peak at t=0.175 → surfY = py+ph*0.5 - 4*(ph*0.5+4) * t/0.35 * (1-t/0.35)
        // Right bump: t in [0.65, 1], peak at t=0.825
        // Middle gap: t in [0.35, 0.65] → no hit (gap between tines)
        if(t<0||t>1) return null;
        if(t<=0.35){
          var lt=t/0.35;
          return py+ph*0.5 - 4*(ph*0.5+4)*lt*(1-lt);
        }
        if(t>=0.65){
          var rt=(t-0.65)/0.35;
          return py+ph*0.5 - 4*(ph*0.5+4)*rt*(1-rt);
        }
        return null; // gap between tines — miss
      }

      case "blade": {
        // Trapezoid: pointed ends, flat top surface between x+6 and x+w-6 at y+3
        // Outside those points it slopes to y+h at the very edges.
        if(x < px+6 || x > px+pw-6) return null; // outside blade width
        return py+3; // flat blade top
      }

      case "omega": {
        // U-channel: two raised walls (x to x+7 and x+w-7 to x+w) at py,
        // flat centre channel floor at py+ph-6.
        // Ball can land on either wall top or the channel floor.
        if(t<0||t>1) return null;
        var leftWall  = x <= px+7;
        var rightWall = x >= px+pw-7;
        if(leftWall || rightWall){
          return py; // top of the raised wall
        } else {
          return py+ph-6; // channel floor
        }
      }
      case "circle": {
        // Elliptical top surface — ball rides the curved top of the disc.
        // Ellipse: centre at (px+pw/2, py+ph/2), rx=pw/2, ry=ph/2+2
        // At horizontal position x, the top of the ellipse is:
        //   surfY = cy - ry * sqrt(1 - ((x-cx)/rx)^2)
        if(t<0||t>1) return null;
        var cx2 = px+pw/2, cy2 = py+ph/2+2, rx2 = pw/2, ry2 = ph/2+2;
        var dx2 = (x-cx2)/rx2;
        if(Math.abs(dx2)>1) return null;
        return cy2 - ry2 * Math.sqrt(1 - dx2*dx2);
      }

      default: // flat
        if(t<0||t>1) return null;
        return py;
    }
  }

  /* LASERS */
  function moveLasers(dt) {
    for(var i=lasers.length-1; i>=0; i--){
      lasers[i].y+=lasers[i].vy*dt;
      if(lasers[i].y+lasers[i].h<0){lasers.splice(i,1);continue;}
      var hit=false;
      for(var bi=bricks.length-1; bi>=0; bi--){
        var l=lasers[i]; if(!l) break;
        var br=bricks[bi];
        if(l.x<br.x+br.w && l.x+l.w>br.x && l.y<br.y+br.h && l.y+l.h>br.y){
          if(!br.indestructible){
            br.hp--; br.shake=9;
            if(br.hp<=0){score+=br.pts; spawnParts(br.x+br.w/2,br.y+br.h/2,14,br.color); if(br.powerup)dropPU(br); bricks.splice(bi,1);}
            else spawnParts(br.x+br.w/2,br.y+br.h/2,4,br.color);
          } else spawnParts(br.x+br.w/2,br.y+br.h/2,3,C.grey);
          updateHUD();
          lasers.splice(i,1);
          hit=true; break;
        }
      }
    }
  }

  /* FALLING POWERUPS */
  function moveFalling(dt) {
    for(var i=falling.length-1; i>=0; i--){
      var fp=falling[i]; fp.y+=fp.vy*dt;
      if(fp.y+fp.h>=paddle.y && fp.y<=paddle.y+paddle.h && fp.x<paddle.x+paddle.w && fp.x+fp.w>paddle.x){
        applyPU(fp.type); falling.splice(i,1); continue;
      }
      if(fp.y>H) falling.splice(i,1);
    }
  }

  /* PARTICLES */
  function spawnParts(x,y,n,color){
    if(!settings.particles) return;
    var baseColor = getBaseColor(color, C.white);
    for(var i=0;i<n;i++){
      var ang=Math.random()*Math.PI*2, spd=1.5+Math.random()*5;
      particles.push({x:x,y:y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:1,decay:.026+Math.random()*.04,r:2+Math.random()*3.5,color:baseColor});
    }
  }
  function updateParticles(dt){
    for(var i=particles.length-1;i>=0;i--){
      var p=particles[i];
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=.1*dt;
      p.life-=p.decay*dt;
      if(p.life<=0) particles.splice(i,1);
    }
  }

  /* PAUSE */
  function pauseGame()  { state="paused";  $pause.classList.remove("hidden"); }
  function resumeGame() { state="playing"; $pause.classList.add("hidden");    }

  /* DRAW */
  function draw() {
    ctx.clearRect(0,0,W,H);
    drawBG();
    if(state==="playing"||state==="paused"||state==="levelcomplete"){
      drawBricks();
      drawPaddle();
      drawBalls();
      drawLasers();
      drawFalling();
      drawParticles();
      // drawPUTimers and drawCombo moved to HTML sidebar
      if(announceTimer>0) drawAnnounce();
    }
    drawScanlines();
  }

  /* BACKGROUND */
  function drawBG() {
    var now=Date.now();
    // void gradient
    var bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#010408"); bg.addColorStop(1,"#060118");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // pulsing cyan grid
    var gp=0.035+Math.sin(now*0.0007)*0.018;
    ctx.save(); ctx.lineWidth=1;
    ctx.strokeStyle="rgba(0,234,255,"+gp+")";
    for(var x=0;x<=W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(var y=0;y<=H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // magenta diagonal accents
    ctx.strokeStyle="rgba(247,4,186,"+(gp*0.35)+")";
    for(var d=-H;d<W+H;d+=110){ctx.beginPath();ctx.moveTo(d,0);ctx.lineTo(d+H,H);ctx.stroke();}
    ctx.restore();

    // animated stars
    bgStars.forEach(function(s){
      s.b+=0.004; if(s.b>1)s.b=0;
      var a=Math.abs(Math.sin(s.b*Math.PI))*0.75;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=s.r>1.2?"rgba(190,240,255,"+a+")":"rgba(255,160,255,"+(a*0.55)+")";
      ctx.fill();
    });

    // radial vignette
    var vig=ctx.createRadialGradient(W/2,H/2,H*.22,W/2,H/2,H*.85);
    vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,18,0.7)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    // pulsing edge glow
    var ep=0.45+Math.sin(now*0.0018)*0.3;
    ctx.save();
    ctx.strokeStyle="rgba(0,234,255,"+(ep*0.4)+")";
    ctx.lineWidth=2; ctx.shadowColor=C.cyan; ctx.shadowBlur=14*ep;
    ctx.strokeRect(1,1,W-2,H-2);
    ctx.restore();
  }

  function drawScanlines() {
    ctx.save(); ctx.globalAlpha=0.06; ctx.fillStyle="#000";
    for(var y=scanlineOffset;y<H;y+=4) ctx.fillRect(0,y,W,2);
    ctx.restore();
  }

  function getBaseColor(color, fallback) {
    if (!color) return fallback || C.white;
    if (typeof color !== "string") return fallback || C.white;
    if (/^(linear|radial)-gradient\(/i.test(color)) {
      var matches = color.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+/g);
      if (matches && matches.length) return matches[0];
    }
    return color;
  }

  function createBrickGradient(ctx, br) {
    var color = br.color;
    if (typeof color === "string" && /^(linear|radial)-gradient\(/i.test(color)) {
      var isRadial = /^radial-gradient/i.test(color);
      var stops = color.replace(/^(linear|radial)-gradient\(\s*/i, "").replace(/\)\s*$/, "").split(",");
      stops = stops.map(function(stop){ return stop.trim(); }).filter(Boolean);
      if (stops.length > 0) {
        var g = isRadial
          ? ctx.createRadialGradient(br.x + br.w/2, br.y + br.h/2, 1, br.x + br.w/2, br.y + br.h/2, Math.max(br.w, br.h))
          : ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
        stops.forEach(function(stop, idx){
          var pos = stops.length === 1 ? 0 : idx / (stops.length - 1);
          g.addColorStop(pos, stop);
        });
        return g;
      }
    }

    var hpr = br.indestructible ? 1 : br.hp/br.maxHp;
    var g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
    g.addColorStop(0, rgba(getBaseColor(color, C.white), .62*hpr+.07));
    g.addColorStop(1, rgba(getBaseColor(color, C.white), .22*hpr+.03));
    return g;
  }

  function createBrickOutlineColor(br) {
    var hpr = br.indestructible ? 1 : br.hp/br.maxHp;
    return rgba(getBaseColor(br.color, C.white), .7+.3*hpr);
  }

  /* BRICKS */
  function drawBricks() {
    bricks.forEach(function(br){
      ctx.save();
      if(br.shake>0) ctx.translate((Math.random()-0.5)*br.shake,0);

      var hpr = br.indestructible ? 1 : br.hp/br.maxHp;

      // fill gradient
      ctx.fillStyle = createBrickGradient(ctx, br); rrect(br.x,br.y,br.w,br.h,4); ctx.fill();

      // glowing border
      ctx.strokeStyle = createBrickOutlineColor(br); ctx.lineWidth=1.5;
      rrect(br.x,br.y,br.w,br.h,4); ctx.stroke();

      // top sheen
      ctx.strokeStyle="rgba(255,255,255,"+(.18*hpr)+")"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(br.x+5,br.y+2); ctx.lineTo(br.x+br.w-5,br.y+2); ctx.stroke();

      // hp pips
      if(!br.indestructible && br.maxHp>1){
        var ps=3.6, gap=4.5, tot=br.maxHp, sx=br.x+br.w/2-(tot*(ps+gap)-gap)/2, pipY=br.y+br.h-6;
        for(var p=0;p<tot;p++){
          var px=sx+p*(ps+gap)+ps/2;
          ctx.beginPath(); ctx.arc(px, pipY, ps/2, 0, Math.PI*2);
          ctx.fillStyle=p<br.hp?getBaseColor(br.color, C.white):"rgba(255,255,255,0.22)";
          ctx.globalAlpha = p<br.hp ? 1 : 0.22;
          ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=0.8;
          ctx.fill(); ctx.stroke();
        }
      }

      // indestructible hatch
      if(br.indestructible){
        ctx.save(); rrect(br.x,br.y,br.w,br.h,4); ctx.clip();
        ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1;
        for(var dd=-br.h;dd<br.w+br.h;dd+=10){
          ctx.beginPath();ctx.moveTo(br.x+dd,br.y);ctx.lineTo(br.x+dd+br.h,br.y+br.h);ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }

    function getCurrentSkin(){
      return SKINS.find(function(s){
          return s.id===saveData.equippedSkin;
      }) || SKINS[0];
  }

  /* PADDLE */
  function drawPaddle() {
    var px=paddle.x, py=paddle.y, pw=paddle.w, ph=paddle.h, shape=paddle.shape;
    var laserOn=!!activePU["laser"];
    var skin=getCurrentSkin();
    var col=laserOn ? C.yellow : skin.color;    ctx.save();
    ctx.shadowColor=laserOn ? C.yellow : skin.glow; ctx.shadowBlur=18;

    // draw shape
    ctx.beginPath();
    switch(shape){
      case "convex":  drawPaddleConvex(px,py,pw,ph);  break;
      case "concave": drawPaddleConcave(px,py,pw,ph); break;
      case "wedge":   drawPaddleWedge(px,py,pw,ph);   break;
      case "diamond": drawPaddleDiamond(px,py,pw,ph); break;
      case "fork":    drawPaddleFork(px,py,pw,ph);    break;
      case "blade":   drawPaddleBlade(px,py,pw,ph);   break;
      case "omega":   drawPaddleOmega(px,py,pw,ph);   break;
      case "circle":  drawPaddleCircle(px,py,pw,ph);  break;
      default:        drawPaddleFlat(px,py,pw,ph);    break; // flat
    }

    var g=ctx.createLinearGradient(px,py,px+pw,py+ph);
    g.addColorStop(0,rgba(col,.22));
    g.addColorStop(.25,rgba(col,.55));
    g.addColorStop(.5,rgba(col,1));
    g.addColorStop(.75,rgba(col,.55));
    g.addColorStop(1,rgba(col,.22));
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();

    // top sheen strip
    ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,.28)";
    ctx.fillRect(px+10, py+2, pw-20, 3);

    // laser cannon dots
    if(laserOn){
      [px+pw*.22, px+pw*.78].forEach(function(cx){
        ctx.shadowColor=C.yellow; ctx.shadowBlur=18;
        ctx.fillStyle=C.yellow;
        ctx.beginPath(); ctx.arc(cx,py,6,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.restore();
  }

  // Paddle shape path builders (all use ctx.beginPath was already called)
  function drawPaddleFlat(x,y,w,h) {
    ctx.moveTo(x+6,y);
    ctx.lineTo(x+w-6,y); ctx.quadraticCurveTo(x+w,y,x+w,y+6);
    ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+6);
    ctx.quadraticCurveTo(x,y,x+6,y); ctx.closePath();
  }
  function drawPaddleConvex(x,y,w,h) {
    // top surface bows upward — wider catch, friendlier
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y+h*0.5);
    ctx.quadraticCurveTo(x+w*0.5, y-8, x+w, y+h*0.5);
    ctx.lineTo(x+w,y+h); ctx.closePath();
  }
  function drawPaddleConcave(x,y,w,h) {
    // top surface bows inward — ball tends to slide to sides
    ctx.moveTo(x,y);
    ctx.lineTo(x+w,y);
    ctx.lineTo(x+w,y+h);
    ctx.quadraticCurveTo(x+w*0.5, y+h+10, x, y+h);
    ctx.closePath();
  }
  function drawPaddleWedge(x,y,w,h) {
    // left low, right high — creates asymmetric bounces
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y+h*0.6);
    ctx.lineTo(x+w, y);
    ctx.lineTo(x+w,y+h); ctx.closePath();
  }
  function drawPaddleDiamond(x,y,w,h) {
    // sharp peak in centre — extreme angle control
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y+h*0.5);
    ctx.lineTo(x+w*0.5, y-8);
    ctx.lineTo(x+w, y+h*0.5);
    ctx.lineTo(x+w,y+h); ctx.closePath();
  }
  function drawPaddleFork(x,y,w,h) {
    // two bumps — chaotic bounces
    ctx.moveTo(x,y+h);
    ctx.lineTo(x,y+h*0.5);
    ctx.quadraticCurveTo(x+w*0.18, y-4, x+w*0.35, y+h*0.5);
    ctx.lineTo(x+w*0.65, y+h*0.5);
    ctx.quadraticCurveTo(x+w*0.82, y-4, x+w, y+h*0.5);
    ctx.lineTo(x+w,y+h); ctx.closePath();
  }
  function drawPaddleBlade(x,y,w,h) {
    // razor thin, pointed ends — precision required
    ctx.moveTo(x,y+h);
    ctx.lineTo(x+6, y+3);
    ctx.lineTo(x+w-6, y+3);
    ctx.lineTo(x+w,y+h); ctx.closePath();
  }
  function drawPaddleOmega(x,y,w,h) {
    // U-channel with raised side walls — ball gets guided in centre
    ctx.moveTo(x,y);
    ctx.lineTo(x,y+h);
    ctx.lineTo(x+w,y+h);
    ctx.lineTo(x+w,y);
    ctx.lineTo(x+w-7,y);
    ctx.lineTo(x+w-7,y+h-6);
    ctx.lineTo(x+7,y+h-6);
    ctx.lineTo(x+7,y);
    ctx.closePath();
  }

  function drawPaddleCircle(x,y,w,h) {
    // Draws a flat disc — circular top surface, slightly domed
    var cx = x + w/2, cy = y + h/2, rx = w/2, ry = h/2 + 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  }

  /* BALLS */
  function drawBalls() {
    balls.forEach(function(ball){
      // glow trail
      ball.trail.forEach(function(pt,i){
        var a=(i/ball.trail.length)*0.5, r=ball.r*(i/ball.trail.length)*0.8;
        if(r<0.5) return;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
        ctx.fillStyle="rgba(0,234,255,"+a+")"; ctx.fill();
      });
      // ball body
      ctx.save();
      ctx.shadowColor=C.cyan; ctx.shadowBlur=28;
      var g=ctx.createRadialGradient(ball.x-2,ball.y-2,1,ball.x,ball.y,ball.r);
      g.addColorStop(0,"#fff");
      g.addColorStop(0.4,C.cyan);
      g.addColorStop(1,"#001a33");
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
      ctx.restore();

      if(ball.waiting){
        ctx.save();
        ctx.fillStyle="rgba(0,234,255,0.7)"; ctx.font="13px Segoe UI";
        ctx.textAlign="center"; ctx.shadowColor=C.cyan; ctx.shadowBlur=12;
        ctx.fillText("CLICK or SPACE to launch", W/2, paddle.y-28);
        ctx.restore();
      }
    });
  }

  /* LASERS */
  function drawLasers() {
    lasers.forEach(function(l){
      ctx.save(); ctx.shadowColor=C.yellow; ctx.shadowBlur=20;
      ctx.fillStyle=C.yellow;
      ctx.fillRect(l.x-l.w/2, l.y, l.w, l.h);
      ctx.restore();
    });
  }

  /* FALLING POWERUPS */
  function drawFalling() {
    falling.forEach(function(fp){
      ctx.save();
      ctx.shadowColor=fp.type.color; ctx.shadowBlur=20;
      ctx.strokeStyle=fp.type.color; ctx.lineWidth=2;
      rrect(fp.x,fp.y,fp.w,fp.h,6); ctx.stroke();
      var g=ctx.createLinearGradient(fp.x,fp.y,fp.x+fp.w,fp.y+fp.h);
      g.addColorStop(0,rgba(fp.type.color,.3));
      g.addColorStop(1,rgba(fp.type.color,.07));
      ctx.fillStyle=g; rrect(fp.x,fp.y,fp.w,fp.h,6); ctx.fill();
      ctx.fillStyle=fp.type.color; ctx.font="bold 13px Segoe UI";
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.shadowBlur=10;
      ctx.fillText(fp.type.label, fp.x+fp.w/2, fp.y+fp.h/2);
      ctx.restore();
    });
  }

  /* PARTICLES */
  function drawParticles() {
    particles.forEach(function(p){
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  /* POWERUP TIMERS */
  function drawPUTimers() {
    var y=H-32;
    Object.keys(activePU).forEach(function(id){
      var exp=activePU[id];
      var tp=null;
      for(var i=0;i<PTYPES.length;i++){if(PTYPES[i].id===id){tp=PTYPES[i];break;}}
      if(!tp||!tp.duration) return;
      var rem=Math.max(0,(exp-Date.now())/tp.duration);
      var bw=120, bx=W-bw-16;
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,0.55)"; rrect(bx,y-13,bw,10,3); ctx.fill();
      ctx.fillStyle=tp.color;
      rrect(bx,y-13,bw*rem,10,3); ctx.fill();
      ctx.fillStyle=tp.color; ctx.font="10px Segoe UI";
      ctx.textAlign="right";
      ctx.fillText(tp.label, bx-6, y);
      ctx.restore();
      y-=20;
    });
  }

  /* COMBO */
  function drawCombo() {
    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,comboTimer/80));
    var sz=Math.min(36,16+combo*2);
    ctx.font="bold "+sz+"px Segoe UI";
    ctx.textAlign="center";
    ctx.fillStyle=C.yellow; ctx.shadowColor=C.yellow; ctx.shadowBlur=28;
    ctx.fillText(combo+"x COMBO!", W/2, H/2-50);
    ctx.restore();
  }

  /* ANNOUNCE (level title flash) */
  function drawAnnounce() {
    var t=announceTimer;
    // fade in first 300ms, hold, fade out last 400ms
    var a = t>400 ? Math.min(1,(2400-t)/300) : t/400;
    if(a<=0) return;
    var pulse=1+Math.sin(Date.now()*0.006)*0.02;
    ctx.save(); ctx.globalAlpha=Math.max(0,a); ctx.textAlign="center";
    ctx.font="bold "+Math.floor(54*pulse)+"px Segoe UI";
    ctx.fillStyle=C.cyan; ctx.shadowColor=C.cyan; ctx.shadowBlur=44;
    ctx.fillText(announceText, W/2, H/2-12);
    ctx.font="bold 21px Segoe UI";
    ctx.fillStyle=C.magenta; ctx.shadowColor=C.magenta; ctx.shadowBlur=22;
    ctx.fillText(announceSub, W/2, H/2+26);
    ctx.restore();
  }

  /* UTILS */
  function rrect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }
  // pre-parsed colour components cache
  var _colCache={};
  function rgba(hex,a){
    if(!_colCache[hex]){
      _colCache[hex]=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
    }
    var c=_colCache[hex];
    return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")";
  }

  /* MENU PARTICLE SYSTEM */
  // Runs on its own canvas behind the HTML menus.
  (function() {
    var mc = document.getElementById("menuCanvas");
    var mx = mc.getContext("2d");

    // size canvas to window
    function resizeMC() { mc.width=window.innerWidth; mc.height=window.innerHeight; }
    resizeMC();
    window.addEventListener("resize", resizeMC);

    var MENU_STATES = {
    menu:1, 
    levels:1,
    settings:1, 
    skins:1
    };

    var COLORS = [
    "#00eaff",
    "#f704ba",
    "#ffe000",
    "#00ff88",
    "#aa44ff",
    "#ff6600"
    ];

    // Each particle: x, y, vy, vx, r, alpha, color, pulse, pulseSpeed
    var mps = [];
    var MAX_P = 90;

    function spawnMP() {
      var W=mc.width, H=mc.height;
      mps.push({
        x: Math.random()*W,
        y: H + 10,
        vy: -(0.4 + Math.random()*1.1),   // rises
        vx: (Math.random()-0.5)*0.3,       // slight drift
        r:  1.2 + Math.random()*3.5,
        alpha: 0,
        maxAlpha: 0.3 + Math.random()*0.55,
        color: COLORS[Math.floor(Math.random()*COLORS.length)],
        pulse: Math.random()*Math.PI*2,
        pulseSpd: 0.02 + Math.random()*0.03,
        fadeIn: true,
      });
    }

    // pre-fill
    for(var i=0;i<MAX_P;i++){
      spawnMP();
      // scatter initial y so they don't all start at bottom
      mps[i].y = Math.random()*mc.height;
      mps[i].alpha = mps[i].maxAlpha * Math.random();
      mps[i].fadeIn = false;
    }

    var mlast=0;
    function menuLoop(ts) {
      requestAnimationFrame(menuLoop);
      var dt=Math.min((ts-mlast)/16.67,3); mlast=ts;

      var W=mc.width, H=mc.height;
      mx.clearRect(0,0,W,H);

      // only draw when on a menu screen
      if (!MENU_STATES[state]) return;

      // spawn to keep pool full
      if (mps.length < MAX_P && Math.random()<0.35) spawnMP();

      for(var i=mps.length-1;i>=0;i--){
        var p=mps[i];
        p.y  += p.vy*dt;
        p.x  += p.vx*dt;
        p.pulse += p.pulseSpd*dt;

        if(p.fadeIn) {
          p.alpha += 0.008*dt;
          if(p.alpha>=p.maxAlpha){ p.alpha=p.maxAlpha; p.fadeIn=false; }
        }

        // fade out near top, remove when gone
        if(p.y < H*0.25) p.alpha -= 0.006*dt;
        if(p.alpha<=0||p.y<-20) { mps.splice(i,1); continue; }

        // pulse radius
        var pr = p.r * (0.85 + Math.sin(p.pulse)*0.15);

        // glow
        mx.save();
        mx.globalAlpha = p.alpha;
        mx.shadowColor = p.color;
        mx.shadowBlur  = pr * 5;
        mx.fillStyle   = p.color;
        mx.beginPath();
        mx.arc(p.x, p.y, pr, 0, Math.PI*2);
        mx.fill();

        // inner bright core
        mx.globalAlpha = p.alpha * 0.9;
        mx.shadowBlur  = 0;
        mx.fillStyle   = "#ffffff";
        mx.beginPath();
        mx.arc(p.x, p.y, pr*0.35, 0, Math.PI*2);
        mx.fill();
        mx.restore();
      }
    }
    requestAnimationFrame(menuLoop);
  })();

  /* INIT */
  unlockLevel(0);
  showMenu();

})();