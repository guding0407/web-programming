// main-menu와 난이도 메뉴 전환
$("#btn-start").click(function () {
  $("#main-menu").hide();
  $("#difficulty-menu").show();
});

// 난이도 버튼 클릭
$(".btn-difficulty").click(function () {
  const level = $(this).data("level");
  startGame(level); // 여기서 level(1/2/3)만 넘기면 됨
});

// 뒤로가기
$("#btn-difficulty-back").click(function () {
  $("#difficulty-menu").hide();
  $("#main-menu").show();
});

// 게임 시작 시 오디오 로드
$(document).ready(function () {
  loadSettings();
});

// 난이도별 게임 설정값 객체는 그대로 사용
const GAME_LEVELS = {
  1: {
    ballSpeed: 2,
    paddleWidth: 150,
    brickRows: 3,
    brickCols: 7,
    brickHp: 1,
    borderRadius: 8,
  },
  2: {
    ballSpeed: 4,
    paddleWidth: 100,
    brickRows: 4,
    brickCols: 9,
    brickHp: 2,
    borderRadius: 8,
  },
  3: {
    ballSpeed: 6,
    paddleWidth: 70,
    brickRows: 5,
    brickCols: 12,
    brickHp: 3,
    borderRadius: 8,
  },
};

// 게임 기능 구현
// 전역 변수
let score = 0;
let timer = null;
let timeLeft = 300; // 5분 = 300초
let lives = 100; // 목숨
let bgmAudio = new Audio("bgm.mp3");
let volume = parseInt(localStorage.getItem("setting_volume") || "100") / 100;
bgmAudio.volume = volume;
bgmAudio.loop = true;
let sfxEnabled = true;
let itemEnabled = true;
let isPaddleWidened = false;
let paddleEffect = null; // 현재 적용 중인 아이템 이름
let paddleEffectTimeout = null;
let paddleWidenTimeout = null;

function startGame(level) {
  const config = GAME_LEVELS[level];
  score = 0;
  timeLeft = 300;
  lives = 100;
  $("#difficulty-menu, #main-menu, #hall-of-fame").hide();
  $("#game-screen").show();
  $("#lives").remove(); // 이전 표시 제거
  $("#game-screen > div").append(
    '<span id="lives">목숨: <b>' + lives + "</b></span>"
  );
  initGame(config, level); // 여기서 게임 본체 세팅
  startTimer();
}

function initGame(config, level) {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  // 게임 오브젝트(공, 패들, 벽돌)
  let paddle = {
    width: config.paddleWidth,
    height: 16,
    x: (canvas.width - config.paddleWidth) / 2,
    speed: 8,
    borderRadius: config.borderRadius,
  };

  let ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    radius: 10,
    dx: config.ballSpeed,
    dy: -config.ballSpeed,
  };

  // 벽돌 배열 만들기
  let bricks = [];
  let brickWidth = (canvas.width - 40) / config.brickCols; // 40px은 여유 padding
  let brickHeight = 32;
  for (let r = 0; r < config.brickRows; r++) {
    for (let c = 0; c < config.brickCols; c++) {
      bricks.push({
        x: 20 + c * brickWidth,
        y: 40 + r * brickHeight,
        width: brickWidth - 4,
        height: brickHeight - 4,
        hp: config.brickHp,
      });
    }
  }

  // 아이템 객체 구조 정의
  let items = []; // 화면 위에 떨어지는 아이템들을 담을 배열

  // 아이템 생성 함수
  function spawnItem(type, x, y) {
    items.push({
      type: type,
      x: x,
      y: y,
      width: 24,
      height: 24,
      dy: 2,
      active: true,
    });
  }

  // 키보드 입력
  let rightPressed = false,
    leftPressed = false;
  $(document).off("keydown keyup"); // 이전 이벤트 제거
  $(document)
    .on("keydown", function (e) {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
      if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    })
    .on("keyup", function (e) {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
      if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    });

  // 게임 루프
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 벽돌 그리기
    for (let b of bricks) {
      if (b.hp > 0) {
        switch (b.hp) {
          case 1:
            ctx.fillStyle = "white";
            break;
          case 2:
            ctx.fillStyle = "green";
            break;
          case 3:
            ctx.fillStyle = "skyblue";
            break;
          default:
            ctx.fillStyle = "#ffad42";
        }
        ctx.fillRect(b.x, b.y, b.width, b.height);
      }
    }

    // 패들
    if (paddleEffect === "paddle-widen") {
      ctx.fillStyle = "#3df4fa";
      ctx.shadowColor = "#3df4fa";
      ctx.shadowBlur = 20;
    } else if (paddleEffect === "ball-slow") {
      ctx.fillStyle = "#88cffa";
      ctx.shadowColor = "#88cffa";
      ctx.shadowBlur = 16;
    } else if (paddleEffect === "ball-fast") {
      ctx.fillStyle = "#ff5a36";
      ctx.shadowColor = "#ff5a36";
      ctx.shadowBlur = 18;
    } else if (paddleEffect === "reverse-control") {
      ctx.fillStyle = "#f0f";
      ctx.shadowColor = "#f0f";
      ctx.shadowBlur = 16;
    } else {
      ctx.fillStyle = "#0095DD";
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // 패들 둥근 모서리 그리기
    const px = paddle.x;
    const py = canvas.height - paddle.height - 8;
    const pr = paddle.borderRadius;
    const pw = paddle.width;
    const ph = paddle.height;

    ctx.beginPath();
    ctx.moveTo(px + pr, py);
    ctx.lineTo(px + pw - pr, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + pr);
    ctx.lineTo(px + pw, py + ph - pr);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - pr, py + ph);
    ctx.lineTo(px + pr, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - pr);
    ctx.lineTo(px, py + pr);
    ctx.quadraticCurveTo(px, py, px + pr, py);
    ctx.closePath();
    ctx.fill();

    if (paddleEffect) {
      ctx.font = "bold 18px Pretendard, Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(
        getEffectLabel(paddleEffect),
        paddle.x + paddle.width / 2,
        canvas.height - paddle.height - 16
      );
    }

    // 공
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.closePath();

    // 점수, 타이머 표시
    $("#score").text("점수: " + score);

    // 패들 이동
    if (rightPressed && paddle.x < canvas.width - paddle.width)
      paddle.x += paddle.speed;
    if (leftPressed && paddle.x > 0) paddle.x -= paddle.speed;

    // 공 이동
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 벽 반사
    if (ball.x < ball.radius || ball.x > canvas.width - ball.radius)
      ball.dx = -ball.dx;
    if (ball.y < ball.radius) ball.dy = -ball.dy;

    // 패들 반사
    let paddleY = canvas.height - paddle.height - 8;
    if (
      ball.y + ball.radius >= paddleY &&
      ball.y + ball.radius <= paddleY + paddle.height &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      ball.dy = -Math.abs(ball.dy);
      // 각도 변화 주기(고급)
      let hit = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.dx += hit;
    }

    // 바닥에 떨어짐(실패)
    if (ball.y > canvas.height + ball.radius) {
      lives--;
      $("#lives").html("목숨: <b>" + lives + "</b>");
      if (lives > 0) {
        // 공과 패들을 다시 시작 위치로 이동
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 30;
        ball.dx = config.ballSpeed;
        ball.dy = -config.ballSpeed;
        paddle.x = (canvas.width - config.paddleWidth) / 2;
        // 다음 라이프로 계속 진행
        animId = requestAnimationFrame(draw);
        return;
      } else {
        cancelAnimationFrame(animId);
        gameOver(false);
        return;
      }
    }

    // 벽돌 충돌 체크
    for (let b of bricks) {
      if (
        b.hp > 0 &&
        ball.x > b.x &&
        ball.x < b.x + b.width &&
        ball.y - ball.radius < b.y + b.height &&
        ball.y + ball.radius > b.y
      ) {
        switch (b.hp) {
          case 1:
            ctx.fillStyle = "white";
            break;
          case 2:
            ctx.fillStyle = "green";
            break;
          case 3:
            ctx.fillStyle = "skyblue";
            break;
        }
        b.hp--;
        score += 100;
        ball.dy = -ball.dy;

        if (itemEnabled && Math.random() < 0.2) {
          spawnItem("paddle-widen", b.x + b.width / 2, b.y + b.height);
        }

        break;
      }
    }

    // 아이템 드로우 및 충돌 처리
    for (let item of items) {
      if (!item.active) continue;

      // 아이템 이동
      item.y += item.dy;

      // 그리기
      ctx.fillStyle = "#3df4fa";
      ctx.fillRect(item.x, item.y, item.width, item.height);

      // 패들과 충돌 감지
      if (
        item.y + item.height >= paddleY &&
        item.x + item.width > paddle.x &&
        item.x < paddle.x + paddle.width
      ) {
        item.active = false;

        // 패들 확장 효과 적용
        if (item.type === "paddle-widen") {
          if (!isPaddleWidened) {
            paddle.width *= 1.5;
            isPaddleWidened = true;
          }

          if (paddleWidenTimeout) clearTimeout(paddleWidenTimeout);
          paddleWidenTimeout = setTimeout(() => {
            paddle.width = config.paddleWidth;
            isPaddleWidened = false;
          }, 15000);

          paddleEffect = "paddle-widen";
          if (paddleEffectTimeout) clearTimeout(paddleEffectTimeout);
          paddleEffectTimeout = setTimeout(() => {
            paddleEffect = null;
          }, 15000);
        }
      }
    }

    // 남은 벽돌이 없으면 클리어
    if (bricks.every((b) => b.hp <= 0)) {
      cancelAnimationFrame(animId);
      clearInterval(timer);
      let bonus = 0;
      switch (level) {
        case 1:
          bonus = timeLeft * 100;
          break;
        case 2:
          bonus = timeLeft * 150;
          break;
        case 3:
          bonus = timeLeft * 200;
          break;
      }
      score += bonus;
      let clearTime = 300 - timeLeft;
      let clearTimeMin = Math.floor(clearTime / 60);
      let clearTimeSec = Math.floor(clearTime % 60);
      let timeLeftMin = Math.floor(timeLeft / 60);
      let timeLeftSec = Math.floor(timeLeft % 60);
      let str =
        "클리어 시간 : " +
        clearTimeMin +
        "분 " +
        clearTimeSec +
        "초" +
        "<br>" +
        "남은 시간 : " +
        timeLeftMin +
        "분 " +
        timeLeftSec +
        "초" +
        "<br>" +
        "최종 점수: " +
        score +
        "점";
      // 게임 클리어 모달 띄우기
      $("#game-clear-modal").show();
      $("#clear-score-text").text("최종 점수: " + score + "점");
      return;
    }

    animId = requestAnimationFrame(draw);
  }

  let animId = requestAnimationFrame(draw);
  window.animId = animId;
}
// 타이머 시작/갱신
function startTimer() {
  $("#timer").text(formatTime(timeLeft));
  timer = setInterval(function () {
    timeLeft--;
    $("#timer").text(formatTime(timeLeft));
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameOver(false); // 실패
    }
  }, 1000);
}

// 벽돌 깨기 시
function onBrickBroken() {
  score += 100;
  // 벽돌 남은 수 체크
  if (allBricksBroken()) {
    clearInterval(timer);
    const bonus = timeLeft * 150;
    score += bonus;
    showRegisterScoreModal(); // 이니셜 입력받기
  }
}

// 아이템 문구 코드
function getEffectLabel(effect) {
  switch (effect) {
    case "paddle-widen":
      return "패들 확장!";
    case "ball-slow":
      return "공 느려짐!";
    case "ball-fast":
      return "공 빨라짐!";
    case "reverse-control":
      return "조작 반전!";
    default:
      return "";
  }
}

// 설정값 저장 및 반영 구현
function loadSettings() {
  const bgm = localStorage.getItem("setting_bgm");
  const sfx = localStorage.getItem("setting_sfx");
  const vol = parseInt(localStorage.getItem("setting_volume") || "100");
  const item = localStorage.getItem("setting_item");

  $("#volume-range").val(vol);
  volume = vol / 100;
  bgmAudio.volume = volume;

  $("#bgm-toggle").prop("checked", bgm !== "false");
  $("#sfx-toggle").prop("checked", sfx !== "false");
  $("#item-toggle").prop("checked", item !== "false");

  if (bgm !== "false") {
    bgmAudio.play();
  } else {
    bgmAudio.pause();
  }

  sfxEnabled = sfx !== "false";
  itemEnabled = item !== "false";
}

// 체크박스 이벤트 연결
$("#bgm-toggle").change(function () {
  const enabled = $(this).is(":checked");
  localStorage.setItem("setting_bgm", enabled);
  if (enabled) bgmAudio.play();
  else bgmAudio.pause();
});

$("#sfx-toggle").change(function () {
  const enabled = $(this).is(":checked");
  localStorage.setItem("setting_sfx", enabled);
  sfxEnabled = enabled;
});

$("#item-toggle").change(function () {
  const enabled = $(this).is(":checked");
  localStorage.setItem("setting_item", enabled);
  itemEnabled = enabled;
});

// 음향 조절 슬라이더 이벤트로 볼륨 반영
$("#volume-range").on("input", function () {
  const vol = parseInt($(this).val()) / 100;
  localStorage.setItem("setting_volume", Math.floor(vol * 100));
  volume = vol;
  bgmAudio.volume = volume;
});

// 게임 클리어 시 명예의 전당에 등록하지 않을 때
$("#btn-clear-no").click(function () {
  // 게임 클리어 모달 숨기고, 메뉴로 복귀 + 게임/타이머 강제 종료
  $("#game-clear-modal, #game-screen, #register-score-modal").hide();
  $("#main-menu").show();
  if (window.animId) cancelAnimationFrame(window.animId);
  if (timer) clearInterval(timer);
});

// 명예의 전당 등록
function registerScore(initials) {
  // 기존 기록 로드
  let hall = JSON.parse(localStorage.getItem("hallOfFame") || "[]");
  // 추가
  hall.push({ name: initials, score });
  // 점수 순으로 정렬 후 상위 10개만 저장 (예시)
  hall = hall.sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem("hallOfFame", JSON.stringify(hall));
  showHallOfFame();
}

// 실패 시
function gameOver(isClear) {
  if (!isClear) {
    // 게임 종료 안내, 메뉴로 복귀 버튼 노출
    $("#game-over-modal").show();
  }
}

// 시간 포맷
function formatTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// 명예의 전당 표시
function showHallOfFame() {
  $("#main-menu, #difficulty-menu, #game-screen, #register-score-modal").hide();
  $("#hall-of-fame").show();
  // 데이터 표시
  let hall = JSON.parse(localStorage.getItem("hallOfFame") || "[]");
  let html = hall
    .map((r) => `<tr><td>${r.name}</td><td>${r.score}</td></tr>`)
    .join("");
  $("#hall-of-fame-table tbody").html(html);
}

// 게임오버/명예의전당에서 메뉴로 복귀
$("#btn-gameover-menu, #btn-hall-back").click(function () {
  $(
    "#game-over-modal, #hall-of-fame, #game-screen, #register-score-modal"
  ).hide();
  $("#main-menu").show();
  // 게임 루프, 타이머 강제 종료
  if (window.animId) cancelAnimationFrame(window.animId);
  if (timer) clearInterval(timer);
});

// 게임 설정 버튼 동작 추가
$("#btn-option").click(function () {
  $("#main-menu").hide();
  $("#option-menu").show();
});

// 뒤로가기 버튼 처리
$("#btn-option-back").click(function () {
  $("#option-menu").hide();
  $("#main-menu").show();
});

// 게임 설명
$("#btn-howtoplay").click(function () {
  $("#main-menu").hide();
  $("#howtoplay-menu").show();
});
$("#btn-howtoplay-back").click(function () {
  $("#howtoplay-menu").hide();
  $("#main-menu").show();
});
