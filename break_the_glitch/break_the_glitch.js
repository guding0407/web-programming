// 게임 시작 시 오디오 로드
$(document).ready(function () {
  loadSettings();
  $("#intro").show();
});

let volume = parseInt(localStorage.getItem("setting_volume") || "100") / 100;

const bgmAsset = new Audio("assets/audio/bgm.mp3");
bgmAsset.loop = true;
bgmAudio = bgmAsset; // 기본 배경음악 설정
bgmAudio.volume = volume; // 초기 볼륨 설정

function renderNumberWithImages(number, container) {
  // container: DOM 요소 객체 또는 id 문자열 둘 다 허용
  const elem = typeof container === "string" ? document.getElementById(container) : container;
  if (!elem) return;

  elem.innerHTML = ""; // 비우고 시작
  const str = number.toString();

  for (let i = 0; i < str.length; i++) {
    const digit = str[i];
    if (digit >= "0" && digit <= "9") {
      const img = document.createElement("img");
      img.src = `assets/img/${digit}_8bit.png`;
      img.className = "digit-img";
      img.alt = digit;
      elem.appendChild(img);
    }
  }
}


function renderTimeWithImages(sec, containerId) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  const timeStr = `${m}:${s}`;
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (let i = 0; i < timeStr.length; i++) {
    const ch = timeStr[i];
    if (ch === ":") {
      const span = document.createElement("span");
      span.textContent = ":";
      span.style.margin = "0 4px";
      span.style.color = "#f7d84a";
      span.style.fontWeight = "bold";
      container.appendChild(span);
    } else {
      const img = document.createElement("img");
      img.src = `assets/img/${ch}_8bit.png`;
      img.className = "digit-img";
      img.alt = ch;
      container.appendChild(img);
    }
  }
}

// 클릭 → 인트로 사라지고 스타트 시나리오 재생
$("#intro").on("click", function () {
  const $intro = $(this);
  $intro.fadeOut(800, () => {
    $("#start-story").fadeIn(400, playStartStory);
  });
});

// 스타트 시나리오
const START_STORY_SCENES = [
  {
    img: "assets/img/scenario_start/scene1.png",
    text:
      "2178년, 데이터 전송망 지하에서<br>" +
      "정체불명의 바이러스 감염이 시작되었다…",
  },
  {
    img: "assets/img/scenario_start/scene2.png",
    text: "도시는 멈췄고,<br>" + "단 한 명의 복구 요원이 호출되었다.",
  },
  {
    img: "assets/img/scenario_start/scene3.png",
    text:
      'AI 바이러스 <span style="color:#ff3040">"GLITCH"</span>를 격파하고<br>' +
      "시스템을 복구하라!",
  },
];

// 스토리 플레이이
function playStory(scenes, $overlay, onFinish) {
  const $img = $overlay.find("img");
  const $txt = $overlay.find("p");
  const $skip = $overlay.find(".skip-btn").show(); // 버튼 표시

  let idx = 0,
    fadeT = null,
    holdT = null;

  function next() {
    if (idx >= scenes.length) {
      $skip.hide(); // 버튼 숨김 (재사용 대비)
      $overlay.fadeOut(600, onFinish); // 다음 단계 콜백
      return;
    }
    // 현재 컷 세팅
    const s = scenes[idx++];
    $img.attr("src", s.img);
    $txt.html(s.text);

    $img.add($txt).addClass("fade-in");

    // [fade-in 0.8s] + [정지 1.9s] + [fade-out 0.8s]
    fadeT = setTimeout(() => {
      // 1.9s 뒤
      $img.add($txt).removeClass("fade-in").addClass("fade-out");
      holdT = setTimeout(() => {
        // fade-out 종료
        $img.add($txt).removeClass("fade-out"); // 클래스 리셋
        next(); // 다음 컷 재귀
      }, 800); // fade-out 시간
    }, 800 + 1900); // fade-in 0.8s + 정지 1.9s
  }

  /* Skip : 타이머 제거 → idx를 끝으로 → next() */
  $skip.one("click", () => {
    clearTimeout(fadeT);
    clearTimeout(holdT);
    idx = scenes.length;
    next();
  });

  /* overlay 켜고 재생 시작 */
  $overlay.fadeIn(400, next);
}

function playStartStory() {
  playStory(START_STORY_SCENES, $("#start-story"), () => {
    $("#main-menu").show();
    if (localStorage.getItem("setting_bgm") !== "false") bgmAudio.play();
  });
}

// main-menu와 난이도 메뉴 전환
$("#btn-start").click(function () {
  //bgm 에러 수정
  const bgm = localStorage.getItem("setting_bgm");
  if (bgm !== "false") {
    bgmAudio.play().catch((err) => {
      console.warn("BGM play error:", err);
    });
  } else {
    bgmAudio.pause();
  }

  $("#main-menu").hide();
  $("#difficulty-menu").show();
});

// 1. 시나리오 설명에서 사용할 함수
// 시나리오 이전 버튼
$("#prev_scenario").click(function () {
  const scenarios = $(".scenario-content");
  if (currentScenario < scenarios.length - 1) {
    currentScenario++;
    updateScenarioView();
  }
});
// 시나리오 다음 버튼
$("#next_scenario").click(function () {
  if (currentScenario > 0) {
    currentScenario--;
    updateScenarioView();
  }
});

// Stage 1 시나리오
const STAGE1_STORY_SCENES = [
  {
    img: "assets/img/scenario_level1/scene1.png",
    text:
      "데이터 전송망 하층부로 진입 중…<br>" +
      "전송률 0.2%. <strong>중앙 회선 손상</strong> 확인.",
  },
  {
    img: "assets/img/scenario_level1/scene2.png",
    text:
      "바이러스 잔류 파형 감지.<br>" +
      '<span style="color:#ff3a4a">GLITCH</span> 프래그먼트가 회로를 잠식 중…',
  },
  {
    img: "assets/img/scenario_level1/scene3.png",
    text:
      "COREBALL 부트 완료.<br>" +
      "벽돌(데이터 블록)을 파괴하여<br>전송 경로를 확보하라!",
  },
];

function playStage1Story(level) {
  playStory(STAGE1_STORY_SCENES, $("#stage1-story"), () => startGame(level));
}

// Stage 2 시나리오
const STAGE2_STORY_SCENES = [
  {
    img: "assets/img/scenario_level2/scene1.png",
    text:
      "중추 서버 코어 상태 이상 감지!<br>" +
      "전송률 14% - 데이터 흐름 불안정...",
  },
  {
    img: "assets/img/scenario_level2/scene2.png",
    text:
      "보안 모듈 감염 확산!<br>" +
      '<span style="color:#ff3a4a">GLITCH 분열체</span>가 방어 알고리즘을 재작성 중…',
  },
  {
    img: "assets/img/scenario_level2/scene3.png",
    text:
      "COREBALL 오버라이트 준비 완료.<br>" +
      "보안 장벽을 해제하고 데이터 흐름을 정상화하라!",
  },
];

function playStage2Story(level) {
  playStory(STAGE2_STORY_SCENES, $("#stage2-story"), () => startGame(level));
}

// Stage 3 시나리오
const STAGE3_STORY_SCENES = [
  {
    img: "assets/img/scenario_level3/scene1.png",
    text:
      "제어탑 최상층 도달!<br>시스템 루트 접근 승인..." +
      '<strong style="color:#ff3a4a">GLITCH CORE</strong> 검출.',
  },
  {
    img: "assets/img/scenario_level3/scene2.png",
    text:
      "<strong style='color:#ff3a4a'>GLITCH CORE</strong>가 <span style='color:#ff3a4a'>Self-Repair Loop</span> 가동 중!<br>" +
      "도시 전체 잠식까지 <span style='color:#ffe062'>00 : 59</span>",
  },
  {
    img: "assets/img/scenario_level3/scene3.png",
    text: "오버라이트 에너지 100 % 충전!<br><strong>COREBALL을 투척해 루프를 차단하라!</strong>",
  },
];

function playStage3Story(level) {
  playStory(STAGE3_STORY_SCENES, $("#stage3-story"), () => startGame(level));
}

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

// 시나리오 설명 -> 메뉴로 돌아가기
$("#btn-scenario-back").click(function () {
  $("#scenario-menu").hide();
  $("#main-menu").show();
});

// 시나리오 설명 -> 이전, 다음 버튼
let currentScenario = 0;

function updateScenarioView() {
  const scenarios = $(".scenario-content");
  scenarios.hide();
  $(scenarios[currentScenario]).show();

  $("#prev_scenario").prop(
    "disabled",
    currentScenario === scenarios.length - 1
  );
  $("#next_scenario").prop("disabled", currentScenario === 0);
}

// 난이도 버튼 클릭
$(".btn-difficulty")
  .off("click")
  .on("click", function () {
    score = 0;
    level = $(this).data("level"); // 1 · 2 · 3
    switch (level) {
      case 1:
        playStage1Story(level);
        break;
      case 2:
        playStage2Story(level);
        break;
      case 3:
      default:
        playStage3Story(level);
    }
  });

// 뒤로가기
$("#btn-difficulty-back").click(function () {
  $("#difficulty-menu").hide();
  $("#main-menu").show();
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
let context = null;
let isTwoPlayerMode = false;
let level = 1;

// 게임 화면 효과음은 객체로 관리
const audioAssets = {
  brickHit: new Audio("assets/audio/brick_hit.mp3"),
  itemSpawn: new Audio("assets/audio/item_spawn.mp3"),
  paddleBounce: new Audio("assets/audio/paddle_bounce.mp3"),
};

// 게임 화면 구성 이미지는 객체로 관리
const imageAssets = {
  ball: new Image(),
  paddle: [new Image(), new Image()],
  // 패들 이미지 배열로 변경 (플레이어 1, 2용)
  blocks: [new Image(), new Image(), new Image()],
};

imageAssets.ball.src = "assets/img/ball_64bit.png";
imageAssets.paddle[0].src = "assets/img/paddle_64bit_1.png";
imageAssets.paddle[1].src = "assets/img/paddle_64bit_2.png";
imageAssets.blocks[0].src = "assets/img/level_1_block_64bit.png";
imageAssets.blocks[1].src = "assets/img/level_2_block_64bit.png";
imageAssets.blocks[2].src = "assets/img/level_3_block_64bit.png";

// 게임 시작 함수
function startGame(level) {
  const config = GAME_LEVELS[level];
  isTwoPlayerMode = $("#two-player-toggle").is(":checked"); //2인 플레이 확인
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

// 게임 화면 구현 함수
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
        if ($("#game-screen").is(":visible")) {
          if (!isPaused) pauseGame();
        } else return;
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
  window.draw = function () {
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
    //$("#score-value").text(score); 이미지로 숫자 출력하면서 비활성화
    renderNumberWithImages(score, "score-value");
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
          audioAssets.paddleBounce.currentTime = 0;
          if (sfxEnabled) audioAssets.paddleBounce.play();
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
          audioAssets.brickHit.currentTime = 0;
          if (sfxEnabled) audioAssets.brickHit.play();
          score += 100;
          ball.dy = -ball.dy;

          // 충돌 후 벽돌 이미지 변경: draw 루프에서 b.hp에 따라 자동 적용됨

          if (itemEnabled && Math.random() < 0.2) {
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
            audioAssets.itemSpawn.currentTime = 0;
            if (sfxEnabled) audioAssets.itemSpawn.play();
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

      /*  바닥 아래로 내려갔다면 비활성화
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

      let bonusMultiplier = isTwoPlayerMode ? 0.85 : 1; // 2인 모드일 땐 15% 감소

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
      bonus = Math.floor(bonus * bonusMultiplier);
      score += bonus;

      goToNextStage();
      return;

    }

    animId = requestAnimationFrame(draw);
  };
  window.animId = requestAnimationFrame(draw);
}

// 타이머 시작/갱신
function startTimer() {
  //$("#timer").text(formatTime(timeLeft)); 이미지로 숫자 출력하면서 비활성화
  renderTimeWithImages(timeLeft, "timer");
  timer = setInterval(function () {
    timeLeft--;
    //$("#timer").text(formatTime(timeLeft)); 이미지로 숫자 출력하면서 비활성화
    renderTimeWithImages(timeLeft, "timer");
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

// 효과 적용 함수
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

// 3.게임 설정

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

  /*  if (bgm !== "false") {
    bgmAudio.play();
  } else {
    bgmAudio.pause();
  }*/

  sfxEnabled = sfx !== "false";
  itemEnabled = item !== "false";
}

// 뒤로가기 이벤트
$("#btn-option-back").click(function () {
  $("#option-menu").hide();
  $("#main-menu").show();
});

$("#btn-clear-yes").click(function () {
  $("#game-clear-modal").hide();
  $("#register-score-modal").show();
  $("#initials-input").val("").focus();
});

// 게임 클리어 시 명예의 전당에 등록하지 않을 때
$("#btn-clear-no").click(function () {
  // 게임 클리어 모달 숨기고, 메뉴로 복귀 + 게임/타이머 강제 종료
  $("#game-clear-modal, #game-screen, #register-score-modal").hide();
  $("#main-menu").show();
  if (window.animId) cancelAnimationFrame(window.animId);
  if (timer) clearInterval(timer);
});

$("#btn-over-yes").click(function () {
  $("#game-over-modal").hide();
  $("#register-score-modal").show();
  $("#initials-input").val("").focus();
});

// 게임 클리어 시 명예의 전당에 등록하지 않을 때
$("#btn-over-no").click(function () {
  // 게임 클리어 모달 숨기고, 메뉴로 복귀 + 게임/타이머 강제 종료
  $("#game-over-modal, #game-screen, #register-score-modal").hide();
  $("#main-menu").show();
  if (window.animId) cancelAnimationFrame(window.animId);
  if (timer) clearInterval(timer);
});

// 명예의 전당 등록
function registerScore(initials) {
  // 2인 플레이 모드 확인
  const key = isTwoPlayerMode ? "hallOfFame_2P" : "hallOfFame_1P";
  const mode = isTwoPlayerMode ? "2P" : "1P"; // 추가된 부분

  // 기존 기록 로드
  let hall = JSON.parse(localStorage.getItem(key) || "[]");
  // 추가
  hall.push({ name: initials, score });
  // 점수 순으로 정렬 후 상위 10개만 저장 (예시)
  hall = hall.sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(key, JSON.stringify(hall)); //기존 "hallOfFame_2P" -> key로 수정"
  showHallOfFame(mode);
}

// 실패 시
function gameOver(isClear) {
  if (!isClear) {
    // 게임 종료 안내, 메뉴로 복귀 버튼 노출
    let str = "최종 점수: " + score + "점";
    $("#game-over-modal").show();
    $("#over-score-text").empty();
    $("#over-score-text").append(str);
  }
}

// 일시중단 기능
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

function showHallOfFame(mode = "1P") {
  $("#main-menu, #difficulty-menu, #game-screen, #register-score-modal").hide();
  $("#hall-of-fame").show();

  const key = mode === "2P" ? "hallOfFame_2P" : "hallOfFame_1P";
  const hall = JSON.parse(localStorage.getItem(key) || "[]");

  const $tbody = $("#hall-of-fame-table tbody");
  $tbody.empty(); // 기존 내용 삭제

  hall.forEach((r) => {
    const $row = $("<tr></tr>");
    const $nameTd = $("<td></td>").text(r.name);
    const $scoreTd = $("<td></td>");
    const $scoreDiv = $("<div></div>").addClass("score-img-container");

    // 점수를 이미지로 출력
    renderNumberWithImages(r.score, $scoreDiv[0]);

    $scoreTd.append($scoreDiv);
    $row.append($nameTd).append($scoreTd);
    $tbody.append($row);
  });
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

// 2.6 일시정지 모달
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

/*$("#btn-hall").click(function () {
  showHallOfFame();
});
*/
$("#btn-hall").click(() => showHallOfFame("1P"));
$("#btn-hall-1p").click(() => showHallOfFame("1P"));
$("#btn-hall-2p").click(() => showHallOfFame("2P"));


$("#btn-register-score")
  .off("click")
  .on("click", function () {
    // 1) 입력값 정리
    const init = $("#initials-input").val().trim().toUpperCase();

    // 2) 유효성 검사 : 영문·숫자 3글자
    if (!/^[A-Z0-9]{3}$/.test(init)) {
      alert("이니셜은 영문/숫자 3글자로 입력하세요!");
      $("#initials-input").focus();
      return;
    }

    // 3) 점수 저장 → showHallOfFame() 호출
    registerScore(init);

    // 4) 입력창 / 모달 정리
    $("#initials-input").val("");
    $("#register-score-modal").hide();
  });

// 다음 단계 진입
function goToNextStage() {
  if (level === 1) {
    level = 2;
    playStage2Story(2);
  } else if (level === 2) {
    level = 3;
    playStage3Story(3);
  } else {
    showRegisterScoreModal(); // stage3 클리어
  }
}

function showRegisterScoreModal() {
  let clearTime = 300 - timeLeft;
  let clearTimeMin = Math.floor(clearTime / 60);
  let clearTimeSec = Math.floor(clearTime % 60);
  let timeLeftMin = Math.floor(timeLeft / 60);
  let timeLeftSec = Math.floor(timeLeft % 60);
  let str1 = "클리어 시간 : " + clearTimeMin + "분 " + clearTimeSec + "초";
  let str2 = "남은 시간 : " + timeLeftMin + "분 " + timeLeftSec + "초";
  let str3 = "최종 점수: " + score + "점";

  // 게임 클리어 모달 띄우기
  $("#game-clear-modal").show();
  $("#clear-score-text").empty();
  $("#clear-score-text").append(str1 + "<br>");
  $("#clear-score-text").append(str2 + "<br>");
  $("#clear-score-text").append(str3);
}
