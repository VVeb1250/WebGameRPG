const scene = document.getElementById("scene");
const menu = document.getElementById("menu");
const statusBox = document.getElementById("statusBox");

const logBox = document.getElementById("logBox");
const logSound = document.getElementById("log-sound");

let activeSideQuest = null;
let sideQuestStep = 0;
let sideQuests = {};
let activeSideQuests = []; // เก็บหลายเควสต์

const questLog = document.getElementById("quest-log");

let player = {};
let enemies = [];
let events = [];

async function loadData() {
  const [eventRes, monsterRes, playerRes, sideRes] = await Promise.all([
    fetch("data/events.json"),
    fetch("data/monsters.json"),
    fetch("data/player.json"),
    fetch("data/sidequests.json")
  ]);

  events = await eventRes.json();
  enemies = await monsterRes.json();
  player = await playerRes.json();
  sideQuests = await sideRes.json();
} 

let currentEnemy = null;

function startBattle() {
  currentEnemy = JSON.parse(JSON.stringify(randomEnemy())); // copy
  renderScene();
  renderMenu();
}

function randomEnemy() {
  return enemies[Math.floor(Math.random() * enemies.length)];
}

function renderScene() {
  scene.innerHTML = `${player.emoji} ⚔️ ${currentEnemy.emoji}`;
  statusBox.innerHTML = `
    <p>${player.name} ❤️ ${player.hp} / ${player.maxHp}</p>
    <p>${currentEnemy.name} ❤️ ${currentEnemy.hp}</p>
  `;
}

function renderMenu() {
  menu.innerHTML = `
    <button class="button" onclick="attack()">🗡 โจมตี</button>
    <button class="button" onclick="defend()">🛡 ป้องกัน</button>
  `;
}

function attack() {
  const dmg = Math.floor(Math.random() * player.attack);
  currentEnemy.hp -= dmg;
  log(`คุณโจมตี ${currentEnemy.name} ได้ ${dmg} ดาเมจ`);

  if (currentEnemy.hp <= 0) {
    log(`${currentEnemy.name} ถูกปราบ! 🎉`);
    menu.innerHTML = `<button class="button" onclick="nextEvent()">▶ เดินทางต่อ</button>`;
    return;
  }

  enemyTurn();
}

function defend() {
  log(`คุณตั้งรับ ลดดาเมจครึ่งหนึ่งในเทิร์นนี้`);
  enemyTurn(true);
}

function enemyTurn(playerDefending = false) {
  setTimeout(() => {
    let dmg = Math.floor(Math.random() * currentEnemy.attack);
    if (playerDefending) dmg = Math.floor(dmg / 2);

    player.hp -= dmg;
    log(`${currentEnemy.name} โจมตีคุณ ได้ ${dmg} ดาเมจ`);

    if (player.hp <= 0) {
      log(`คุณพ่ายแพ้... 💀`);
      menu.innerHTML = `<button class="button" onclick="restart()">🔁 เริ่มใหม่</button>`;
    } else {
      renderScene();
    }
  }, 800);
}

function nextEvent() {
    const event = events[Math.floor(Math.random() * events.length)];
    scene.innerHTML = `${event.emoji}`;
    statusBox.innerHTML = `<p>${event.text}</p>`;
    menu.innerHTML = "";
  
    // ถ้ามีตัวเลือก
    if (event.choices) {
      event.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "button";
        btn.textContent = choice.text;
        btn.onclick = () => handleEffect(choice.effect);
        menu.appendChild(btn);
      });
    } else {
      handleEffect(event.effect);
    }
  }

function handleEffect(effect) {
    if (effect?.startsWith("sidequest-")) {
    const questName = effect.replace("sidequest-", "");
    startSideQuest(questName);
    return;
    }

    switch (effect) {
    case "boost": player.attack += 5; log("พลังโจมตีเพิ่มขึ้น! 💪 (+5)"); break;
    case "trap":  player.hp -= 10; log("คุณโดนกับดัก! -10 HP"); break;
    case "loot":  log("คุณได้ Potion! 🎁"); break;
    case "fight": log("ศัตรูโผล่มา! เตรียมสู้"); setTimeout(startBattle, 1000); return;
    case "reward": log("คุณได้รับ 50 Gold และค่าชื่อเสียง! 🏆"); break;
    case "none":
    default:
        log("คุณเดินทางต่อไป...");
        break;
    }

    if (effect !== "fight") {
    menu.innerHTML = `<button class="button" onclick="nextEvent()">▶ เดินทางต่อ</button>`;
    }
}

function updateQuestLog() {
    const questBox = document.getElementById("quest-log-content");
    if (!questBox) return;
  
    if (activeSideQuests.length === 0) {
      questBox.innerHTML = "- ไม่มีเควสต์ -";
      return;
    }
  
    questBox.innerHTML = activeSideQuests.map(q => {
      const step = sideQuests[q.name][q.step];
      return `<strong>${q.name}</strong><br>${step.text}`;
    }).join("<hr>");
  }
function hasQuest(name) {
    return activeSideQuests.some(q => q.name === name);
  }
function clearQuest() {
    activeSideQuest = null;
    sideQuestStep = 0;
    updateQuestLog();
  }
function removeQuest(name) {
    activeSideQuests = activeSideQuests.filter(q => q.name !== name);
    updateQuestLog();
  }

async function loadSideQuests() {
    const res = await fetch("data/sidequests.json");
    const sideQuests = await res.json();
    return sideQuests;
  }
// ฟังก์ชันสำหรับเล่นเควสต์
function startSideQuest(name) {
    if (!sideQuests[name]) {
      console.warn(`ไม่พบเควสต์ชื่อ ${name}`);
      return;
    }
  
    const existing = activeSideQuests.find(q => q.name === name);
    if (existing) {
      log(`คุณรับเควสต์ "${name}" ไปแล้ว!`);
      return;
    }
  
    activeSideQuests.push({
      name,
      step: 0
    });
  
    log(`🆕 คุณได้รับเควสต์ใหม่: ${name}`);
    updateQuestLog();
    playSideQuestStep(name);
}
  
function playSideQuestStep(name) {
    const quest = sideQuests[name];
    const questState = activeSideQuests.find(q => q.name === name);
    const step = quest[questState.step];

    // เงื่อนไขเปลี่ยนข้อความ
    if (step.condition && eval(step.condition)) {
        if (step.textAlt) step.text = step.textAlt;
    }
  
    scene.innerHTML = step.emoji;
    statusBox.innerHTML = `<p>${step.text}</p>`;
    menu.innerHTML = "";
  
    updateQuestLog();
  
    if (step.choices) {
      step.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "button";
        btn.textContent = choice.text;
        btn.onclick = () => {
          if (choice.effect === "next") {
            questState.step++;
            playSideQuestStep(name);
          } else if (choice.effect === "exit") {
            log(`คุณยกเลิกเควสต์ "${name}"`);
            removeQuest(name);
            nextEvent();
          } else {
            handleEffect(choice.effect);
          }
        };
        menu.appendChild(btn);
      });
    } else {
      handleEffect(step.effect);
      questState.step++;
      if (questState.step < quest.length) {
        menu.innerHTML = `<button class="button" onclick="playSideQuestStep('${name}')">▶ ดำเนินต่อ</button>`;
      } else {
        log(`✅ เควสต์ "${name}" สำเร็จ!`);
        removeQuest(name);
        menu.innerHTML = `<button class="button" onclick="nextEvent()">▶ เดินทางต่อ</button>`;
      }
    }
  }

function restart() {
    player.hp = player.maxHp;
    startBattle();
}

function log(text) {
    const p = document.createElement("p");
    p.textContent = text;
    p.classList.add("log-entry"); // for animation
    logBox.insertBefore(p, logBox.firstChild);
  
    if (logSound) {
        logSound.currentTime = 0;
        logSound.play().catch(() => {}); // ป้องกัน warning จาก autoplay
      }
  
    // Limit to 10 lines
    while (logBox.childNodes.length > 10) {
      logBox.removeChild(logBox.lastChild);
    }
  
    logBox.scrollTop = 0;
  }
  

window.onload = async () => {
    await loadData();
    showIntro();
  };
  
function showIntro() {
    scene.innerHTML = `🌄`;
    statusBox.innerHTML = `
    <p>คุณคือนักผจญภัยธรรมดาคนหนึ่ง ที่ออกเดินทางจากหมู่บ้านเล็ก ๆ เพื่อค้นหาชื่อเสียงและความกล้าในโลกกว้างใหญ่...</p>
    <p>เส้นทางข้างหน้าเต็มไปด้วยอันตราย ความลึกลับ และโอกาสที่ไม่อาจคาดเดา</p>
    `;
    menu.innerHTML = `<button class="button" onclick="startJourney()">▶ เริ่มการเดินทาง</button>`;
}
  
function startJourney() {
    player.hp = player.maxHp;
    nextEvent(); // เดินทางสู่เหตุการณ์แรก
}
  
