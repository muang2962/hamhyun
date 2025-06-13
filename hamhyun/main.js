const TOTAL_STUDENTS = 30;
let students = [];
let history = {};
const PAIR_COUNT = 15;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("txt/student.txt");
    if (!res.ok) throw new Error("학생 정보 파일(txt/student.txt)을 찾을 수 없습니다.");
    const text = await res.text();
    students = text.trim().split("\n").map(line => {
      const [num, name] = line.trim().split(/\s+/, 2);
      return { num, name };
    });
    if (students.length !== TOTAL_STUDENTS) {
      alert("학생 수가 30명이 아닙니다. (현재 " + students.length + "명)");
      return;
    }
    document.getElementById("assignBtn").disabled = false;
  } catch (e) {
    alert(e.message);
  }
});

document.getElementById("loadHistoryBtn").addEventListener("click", () => {
  document.getElementById("historyFile").click();
});

document.getElementById("historyFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.trim().split("\n");
    history = {};
    lines.forEach(line => {
      if (line.startsWith("#") || !line.includes(",")) return;
      const [num, pairID] = line.trim().split(",", 2);
      if (!history[num]) history[num] = new Set();
      history[num].add(pairID);
    });
    alert("이전 자리 기록 업로드 완료!");
  };
  reader.readAsText(file);
});

document.getElementById("assignBtn").addEventListener("click", async () => {
  await startCountdown();
  assignSeats();
  saveScreenshot();
});

function startCountdown() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("countdownOverlay");
    let countdown = 5;
    overlay.style.display = 'flex';

    const interval = setInterval(() => {
      overlay.innerHTML = `<span>${countdown}</span>`;
      countdown--;

      if (countdown < 0) {
        clearInterval(interval);
        overlay.innerHTML = `<span>5</span>`;
        overlay.style.display = 'none';
        resolve();
      }
    }, 1000);
  });
}

function assignSeats() {
  const pairIDs = [];
  for (let i = 1; i <= PAIR_COUNT; i++) {
    pairIDs.push(`P${i}`);
  }

  let bestAssignment = null;
  let minConflict = Infinity;

  for (let attempt = 0; attempt < 3000; attempt++) {
    const stu6 = students.find(s => s.num === "6");
    const stu11 = students.find(s => s.num === "11");
    if (!stu6 || !stu11) continue;

    const rest = students.filter(s => s.num !== "6" && s.num !== "11");
    const shuffledRest = [...rest].sort(() => Math.random() - 0.5);
    const shuffledPairIDs = [...pairIDs].sort(() => Math.random() - 0.5);

    const assignment = {};
    assignment[stu6.num] = shuffledPairIDs[0];
    assignment[stu11.num] = shuffledPairIDs[0];

    let idx = 0;
    for (let i = 1; i < PAIR_COUNT; i++) {
      const pairID = shuffledPairIDs[i];
      const s1 = shuffledRest[idx++];
      const s2 = shuffledRest[idx++];
      assignment[s1.num] = pairID;
      assignment[s2.num] = pairID;
    }

    let conflict = 0;
    for (let num in assignment) {
      if (history[num]?.has(assignment[num])) conflict++;
    }

    if (conflict === 0) {
      bestAssignment = assignment;
      break;
    }
    if (conflict < minConflict) {
      minConflict = conflict;
      bestAssignment = assignment;
    }
  }

  if (!bestAssignment) {
    alert("자리 배정에 실패했습니다.");
    return;
  }
  showSeats(bestAssignment);
  generateDownload(bestAssignment);
}

function showSeats(assignment) {
  const container = document.getElementById("seatContainer");
  container.innerHTML = '<div class="desk">📚 교탁</div>';
  
  const pairToStudents = {};
  Object.entries(assignment).forEach(([stuNum, pairID]) => {
    if (!pairToStudents[pairID]) {
      pairToStudents[pairID] = [];
    }
    const stu = students.find(s => s.num === stuNum);
    pairToStudents[pairID].push(`${stu.num} ${stu.name}`);
  });

  const sortedPairIDs = Object.keys(pairToStudents).sort((a, b) => {
    return parseInt(a.substring(1)) - parseInt(b.substring(1));
  });
  
  sortedPairIDs.forEach(pairID => {
    const names = pairToStudents[pairID];
    const div = document.createElement("div");
    div.className = "seat";
    div.innerHTML = `<span>${names[0] || ""}</span> <span>${names[1] || ""}</span>`;
    container.appendChild(div);
  });
}

function generateDownload(assignment) {
  let content = `# 배정시간: ${new Date().toLocaleString()}\n`;
  for (const [num, pairID] of Object.entries(assignment)) {
    content += `${num},${pairID}\n`;
    if (!history[num]) history[num] = new Set();
    history[num].add(pairID);
  }
  content += "\n";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById("downloadLink");
  link.href = url;
  link.style.display = "inline-block";
  link.innerText = "📥 새 seating_history.txt 다운로드";
}

function saveScreenshot() {
  const seatContainer = document.getElementById("seatContainer");
  seatContainer.querySelectorAll('.seat span').forEach(el => el.classList.add('rotate-seat'));
  seatContainer.querySelectorAll('.desk').forEach(el => el.classList.add('rotate-seat'));
  html2canvas(seatContainer).then(canvas => {
    seatContainer.querySelectorAll('.seat span').forEach(el => el.classList.remove('rotate-seat'));
    seatContainer.querySelectorAll('.desk').forEach(el => el.classList.remove('rotate-seat'));
    const link = document.createElement("a");
    link.download = `seating_chart_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }).catch(err => {
    seatContainer.querySelectorAll('.seat span').forEach(el => el.classList.remove('rotate-seat'));
    seatContainer.querySelectorAll('.desk').forEach(el => el.classList.remove('rotate-seat'));
    console.error("화면 캡처에 실패했습니다:", err);
  });
}
