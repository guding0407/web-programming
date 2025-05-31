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
    ballSpeed: 4,
    paddleWidth: 120,
    brickRows: 3,
    brickCols: 7,
    brickHp: 1,
    borderRadius: 8,
  },
  2: {
    ballSpeed: 6,
    paddleWidth: 90,
    brickRows: 4,
    brickCols: 9,
    brickHp: 2,
    borderRadius: 8,
  },
  3: {
    ballSpeed: 10,
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
let lives = 5; // 목숨
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
let paddles = [];
let balls = [];
let bricks = [];
let items = [];
let isPaused = false;
let MAX_BALLS = 3; //공의 최대 개수
let canvas = null;
let context = null

// 이미지는 배열로 관리
const imageAssets = {
  ball: new Image(),
  paddle: [new Image(), new Image()],
  // 패들 이미지 배열로 변경 (플레이어 1, 2용)
  blocks: [new Image(), new Image(), new Image()],
};

imageAssets.ball.src = "assets/ball_64bit.png";
imageAssets.paddle[0].src = "assets/paddle_64bit_1.png";
imageAssets.paddle[1].src = "assets/paddle_64bit_2.png";
imageAssets.blocks[0].src = "assets/level_1_block_64bit.png";
imageAssets.blocks[1].src = "assets/level_2_block_64bit.png";
imageAssets.blocks[2].src = "assets/level_3_block_64bit.png";

function startGame(level) {
  const config = GAME_LEVELS[level];
  score = 0;
  timeLeft = 300;
  lives = 5;
  $("#difficulty-menu, #main-menu, #hall-of-fame").hide();
  $("#game-screen").show();
  $("#lives").remove(); // 이전 표시 제거
  $("#game-screen > div").append(
    '<span id="lives">목숨: <b>' + lives + "</b></span>"
  );

  const twoPlayerMode = $("#two-player-toggle").is(":checked");

  initGame(config, level, twoPlayerMode); // 여기서 게임 본체 세팅
  startTimer();
}

function initGame(config, level, twoPlayerMode) {
  canvas = document.getElementById("game-canvas");
  context = canvas.getContext("2d");

  // 게임 오브젝트(공, 패들, 벽돌)
  paddles = [];

  // 플레이어 1 패들
  paddles.push({
    width: config.paddleWidth,
    isControlReversed: false,
    height: 16,
    x: (canvas.width - config.paddleWidth) / 2,
    y: canvas.height - 24,
    speed: 8,
    borderRadius: config.borderRadius ?? 0,
    effect: null,
    effectTimeout: null,
    revertFn: null,
    isWidened: false,
  });

  // 플레이어 2 패들 (옵션)
  if (twoPlayerMode) {
    paddles.push({
      width: config.paddleWidth,
      isControlReversed: false,
      height: 16,
      x: (canvas.width - config.paddleWidth) / 2,
      y: canvas.height - 60,
      speed: 8,
      borderRadius: config.borderRadius,
      effect: null,
      effectTimeout: null,
      revertFn: null,
      isWidened: false,
    });
  }

  balls = [
    {
      x: canvas.width / 2 - 30,
      y: canvas.height - 60,
      radius: 10,
      dx: config.ballSpeed,
      dy: -config.ballSpeed,
    },
  ];

  if (twoPlayerMode) {
    balls.push({
      x: canvas.width / 2 + 30,
      y: canvas.height - 100,
      radius: 10,
      dx: -config.ballSpeed,
      dy: -config.ballSpeed,
    });
  }

  // 벽돌 배열 만들기
  bricks = [];
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
        maxHp: config.brickHp,
      });
    }
  }

  // 아이템 객체 구조 정의
  items = []; // 화면 위에 떨어지는 아이템들을 담을 배열

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

  let aPressed = false,
    dPressed = false;
  $(document).off("keydown keyup"); // 이전 이벤트 제거
  $(document)
    .on("keydown", function (e) {
      if (e.key === "Escape") {
        if (!isPaused) pauseGame();
      }
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
      if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;

      if (e.key === "a" || e.key === "A" || e.key === "ㅁ") aPressed = true;
      if (e.key === "d" || e.key === "D" || e.key === "ㅇ") dPressed = true;
    })
    .on("keyup", function (e) {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
      if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;

      if (e.key === "a" || e.key === "A" || e.key === "ㅁ") aPressed = false;
      if (e.key === "d" || e.key === "D" || e.key === "ㅇ") dPressed = false;
    });

  // 게임 루프
  window.draw = function() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (isPaused) return;

    for (let b of bricks) {
      if (b.hp > 0) {
        let imageIndex = Math.max(
          0,
          Math.min(b.hp - 1, imageAssets.blocks.length - 1)
        );
        const blockImage = imageAssets.blocks[imageIndex];
        context.drawImage(blockImage, b.x, b.y, b.width, b.height);
      }
    }

    paddles.forEach((paddle, idx) => {
      context.drawImage(
        imageAssets.paddle[idx],
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
      );
      if (paddle.effect) {
        context.font = "bold 16px Pretendard";
        context.fillStyle = "#fff";
        context.textAlign = "center";
        context.fillText(
          getEffectLabel(paddle.effect),
          paddle.x + paddle.width / 2,
          paddle.y - 10
        );
      }
    });

    if (paddleEffect) {
      context.font = "bold 18px Pretendard, Arial";
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.fillText(
        getEffectLabel(paddleEffect),
        paddle.x + paddle.width / 2,
        canvas.height - paddle.height - 16
      );
    }

    // 점수, 타이머 표시
    $("#score-value").text(score);

    // 패들 이동
    // 플레이어 1 이동
    const paddle = paddles[0];
    const dir = paddle.isControlReversed ? -1 : 1;
    const nextXRight = paddle.x + dir * paddle.speed;
    const nextXLeft = paddle.x - dir * paddle.speed;

    if (
      rightPressed &&
      nextXRight >= 0 &&
      nextXRight <= canvas.width - paddle.width
    )
      paddle.x += dir * paddle.speed;

    if (
      leftPressed &&
      nextXLeft >= 0 &&
      nextXLeft <= canvas.width - paddle.width
    )
      paddle.x -= dir * paddle.speed;

    // 플레이어 2 이동
    // 2P 패들 이동(존재할 때만)
    if (paddles.length > 1) {
      const paddle2 = paddles[1];
      const dir2 = paddle2.isControlReversed ? -1 : 1;
      const nextX2Right = paddle2.x + dir2 * paddle2.speed;
      const nextX2Left = paddle2.x - dir2 * paddle2.speed;

      if (
        dPressed &&
        nextX2Right >= 0 &&
        nextX2Right <= canvas.width - paddle2.width
      )
        paddle2.x += dir2 * paddle2.speed;

      if (
        aPressed &&
        nextX2Left >= 0 &&
        nextX2Left <= canvas.width - paddle2.width
      )
        paddle2.x -= dir2 * paddle2.speed;
    }

    balls.forEach((ball) => {
      context.drawImage(
        imageAssets.ball,
        ball.x - ball.radius,
        ball.y - ball.radius,
        ball.radius * 2,
        ball.radius * 2
      );
      ball.x += ball.dx;
      ball.y += ball.dy;

      // 벽 반사
      if (ball.x < ball.radius || ball.x > canvas.width - ball.radius)
        ball.dx = -ball.dx;
      if (ball.y < ball.radius) ball.dy = -ball.dy;

      // 패들 충돌
      paddles.forEach((paddle) => {
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y + ball.radius <= paddle.y + paddle.height &&
          ball.x > paddle.x &&
          ball.x < paddle.x + paddle.width
        ) {
          ball.dy = -Math.abs(ball.dy);
          let hit =
            (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
          ball.dx += hit;
        }
      });

      // 바닥에 떨어졌을 때
      if (ball.y > canvas.height + ball.radius) {
        const index = balls.indexOf(ball);
        balls.splice(index, 1);

        if (balls.length === 0) {
          lives--;
          $("#lives").html("목숨: <b>" + lives + "</b>");

          if (lives <= 0) {
            cancelAnimationFrame(window.animId);
            clearInterval(timer);
            gameOver(false);
            return;
          }

          // 기본 공 재생성
          balls.push({
            x: canvas.width / 2,
            y: canvas.height - 30,
            radius: 10,
            dx: config.ballSpeed,
            dy: -config.ballSpeed,
          });
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
          b.hp--;
          score += 100;
          ball.dy = -ball.dy;

          // 충돌 후 벽돌 이미지 변경: draw 루프에서 b.hp에 따라 자동 적용됨

          if (itemEnabled && Math.random() < 0.9) {
            // 20% 확률로 아이템 생성
            const types = [
              "paddle-widen",
              "ball-slow",
              "reverse-control",
              "ball-count-up",
              "life-up",
            ];
            const type = types[Math.floor(Math.random() * types.length)];
            spawnItem(type, b.x + b.width / 2, b.y + b.height);
          }
          break;
        }
      }
    });

    // 아이템 드로우 및 충돌 처리
    for (let item of items) {
      if (!item.active) continue;

      // 아이템 이동
      item.y += item.dy;

      /*// 🎯 바닥 아래로 내려갔다면 비활성화
      if (item.y > canvas.height) {
        item.active = false;
        continue;
      }*/

      // 그리기
      if (item.type === "ball-count-up") {
        context.fillStyle = "#f7d84a"; // 노란색 같은 걸로
      } else {
        context.fillStyle = "#3df4fa";
      }
      context.fillRect(item.x, item.y, item.width, item.height);

      // 패들과 충돌 감지
      paddles.forEach((paddle) => {
        if (
          item.y + item.height >= paddle.y &&
          item.x + item.width > paddle.x &&
          item.x < paddle.x + paddle.width
        ) {
          item.active = false;

          if (
            ["paddle-widen", "ball-slow", "reverse-control"].includes(item.type)
          ) {
            const dur = item.type === "paddle-widen" ? 6000 : 3000;
            applyEffect(paddle, item.type, dur);
          } else if (item.type === "ball-count-up") {
            if (balls.length < MAX_BALLS) {
              balls.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                radius: 10,
                dx: (Math.random() < 0.5 ? -1 : 1) * config.ballSpeed,
                dy: -config.ballSpeed,
                isExtra: true, // 추가된 공인지 구분용
              });
              paddle.effect = "ball-count-up";
              setTimeout(() => {
                if (paddle.effect === "ball-count-up") paddle.effect = null;
              }, 5000);
            }
          } else if (item.type === "life-up") {
            // 목숨 증가
            if (lives < 9) lives++;
            $("#lives").html("목숨: <b>" + lives + "</b>");
            paddle.effect = "life-up";
            setTimeout(() => {
              if (paddle.effect === "life-up") paddle.effect = null;
            }, 3000);
          }
        }
      });
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
  window.animId = requestAnimationFrame(draw);
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

// 벽돌 색상
function getBrickColor(b) {
  const ratio = b.hp / b.maxHp;
  if (ratio > 0.66) return "#ffc542";
  else if (ratio > 0.33) return "#ff9442";
  return "#ff5555";
}

// 단일 효 적용 유틸
function applyEffect(paddle, type, duration) {
  // 1) 이전 효과 제거
  if (paddle.revertFn) paddle.revertFn();
  if (paddle.effectTimeout) clearTimeout(paddle.effectTimeout);

  // 2) 새 효과 적용과 해제 함수 정의
  switch (type) {
    case "paddle-widen": {
      const orgWidth = paddle.width;
      paddle.width *= 1.5;

      // 패들이 오른쪽 벽을 넘지 않도록 보정
      if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
      }

      paddle.revertFn = () => {
        paddle.width = orgWidth;
        // 되돌릴 때도 오른쪽 벗어나지 않도록 보정
        if (paddle.x + paddle.width > canvas.width) {
          paddle.x = canvas.width - paddle.width;
        }
      };
      break;
    }
    case "reverse-control": {
      paddle.isControlReversed = true;
      paddle.revertFn = () => {
        paddle.isControlReversed = false;
      };
      break;
    }
    case "ball-slow": {
      balls.forEach((b) => {
        b.dx = Math.sign(b.dx) * Math.abs(b.dx * 0.5);
        b.dy = Math.sign(b.dy) * Math.abs(b.dy * 0.5);
      });
      paddle.revertFn = () => {
        balls.forEach((b) => {
          b.dx = Math.sign(b.dx) * Math.abs(b.dx * 2);
          b.dy = Math.sign(b.dy) * Math.abs(b.dy * 2);
        });
      };
      break;
    }
    /*case "ball-slow": {
      // 모든 공 속도 절반
      const saved = balls.map((b) => ({ b, dx: b.dx, dy: b.dy }));
      balls.forEach((b) => {
        b.dx *= 0.5;
        b.dy *= 0.5;
      });
      paddle.revertFn = () =>
        saved.forEach(({ b, dx, dy }) => {
          b.dx = dx;
          b.dy = dy;
        });
      break;
    }*/

  }

  // 3) 메타데이터 업데이트
  paddle.effect = type;
  paddle.effectTimeout = setTimeout(() => {
    if (paddle.revertFn) paddle.revertFn();
    paddle.effect = null;
    paddle.revertFn = null;
  }, duration);
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
    case "ball-count-up":
      return "공 +1!";
    case "life-up":
      return "목숨 +1!";
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

  const twoPlayer = localStorage.getItem("setting_two_player");
  $("#two-player-toggle").prop("checked", twoPlayer === "true");

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

$("#two-player-toggle").change(function () {
  const enabled = $(this).is(":checked");
  localStorage.setItem("setting_two_player", enabled);
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

// 일지중단 기능
function pauseGame() {
  isPaused = true;
  cancelAnimationFrame(window.animId);
  clearInterval(timer);
  $("#pause-modal").show();
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

// 일시중단
$("#btn-resume").click(function () {
  isPaused = false;
  $("#pause-modal").hide();
  startTimer();
  window.animId = requestAnimationFrame(draw);
});

$("#btn-exit").click(function () {
  isPaused = false;
  $("#pause-modal").hide();
  $("#game-screen").hide();
  $("#main-menu").show();
  if (window.animId) cancelAnimationFrame(window.animId);
  if (timer) clearInterval(timer);
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

// 시나리오 설명 열기
$("#btn-scenario").click(function () {
  $("#main-menu").hide();
  $("#scenario-menu").show();
});

// 시나리오 설명 → 메뉴로 돌아가기
$("#btn-scenario-back").click(function () {
  $("#scenario-menu").hide();
  $("#main-menu").show();
});
