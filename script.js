let video;
let bodyPose;
let poses = [];
let items = [];
let particles = [];
let score = 0;
let hitSoundLeftHand, hitSoundRightHand, hitSoundLeftFoot, hitSoundRightFoot, specialSound;
let smoothedHands = {};
let smoothedFeet = {};

// Fixed size for hands and feet bounding boxes
const HAND_BOX_SIZE = 50;
const FOOT_BOX_SIZE = 80;
const SPECIAL_ITEM_CHANCE = 0.2;
const ASPECT_RATIO = 16 / 9; // Default aspect ratio

let spawnInterval;

function preload() {
  bodyPose = ml5.bodyPose("BlazePose");
  hitSoundLeftHand = loadSound("left_hand.wav");
  hitSoundRightHand = loadSound("right_hand.wav");
  hitSoundLeftFoot = loadSound("left_foot.wav");
  hitSoundRightFoot = loadSound("right_foot.wav");
  specialSound = loadSound("special.wav");
}

function setup() {
  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user",
    },
  };

  createCanvas(windowWidth, windowHeight);

  video = createCapture(constraints, (stream) => {
    // Update aspect ratio based on actual video dimensions
    aspectRatio = stream.width / stream.height;
    resizeCanvasToFit();
  });

  video.size(windowWidth, windowHeight / ASPECT_RATIO);
  video.hide();

  bodyPose.detectStart(video, (results) => {
    poses = results;
  });

  window.addEventListener("focus", startSpawningItems);
  window.addEventListener("blur", stopSpawningItems);
  startSpawningItems();
}

function startSpawningItems() {
  if (!spawnInterval) {
    spawnInterval = setInterval(spawnItem, 1000);
  }
}

function stopSpawningItems() {
  clearInterval(spawnInterval);
  spawnInterval = null;
}

function draw() {
  background(0);
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  drawItems();
  drawHandsAndFeet();
  drawParticles();
}

function drawHandsAndFeet() {
  for (let pose of poses) {
    let points = ["left", "right"].flatMap((side) => [getSmoothedHand(pose, side), getSmoothedFoot(pose, side)]);

    for (let point of points) {
      if (point && point.confidence > 0.8) {
        let boxSize = point.type === "hand" ? HAND_BOX_SIZE : FOOT_BOX_SIZE;
        fill(0, 255, 0, 100);
        noStroke();
        ellipse(width - point.x, point.y, boxSize, boxSize);
      }
    }
  }
}

function spawnItem() {
  let isSpecial = random() < SPECIAL_ITEM_CHANCE;
  let item = {
    x: random(width),
    y: -50,
    size: isSpecial ? 20 : 30 + random(20),
    speed: isSpecial ? 5 + random(3) : 2 + random(3),
    hit: false,
    special: isSpecial,
  };
  items.push(item);
}

function drawItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.y += item.speed;
    fill(item.special ? color(0, 150, 255) : color(255, 204, 0));
    noStroke();
    ellipse(item.x, item.y, item.size);

    if (item.y > height) {
      items.splice(i, 1);
      continue;
    }

    for (let pose of poses) {
      let points = ["left", "right"].flatMap((side) => [getSmoothedHand(pose, side), getSmoothedFoot(pose, side)]);

      for (let point of points) {
        if (point && point.confidence > 0.9) {
          let boxSize = point.type === "hand" ? HAND_BOX_SIZE : FOOT_BOX_SIZE;

          if (!item.hit && dist(width - point.x, point.y, item.x, item.y) < item.size / 2 + boxSize / 2) {
            item.hit = true;
            score += item.special ? 5 : 1;
            document.getElementById("score").textContent = `Score: ${score}`;

            // Play the appropriate sound
            if (item.special) {
              specialSound.play();
            } else if (point.type === "hand") {
              if (point.side === "left") hitSoundLeftHand.play();
              else hitSoundRightHand.play();
            } else if (point.type === "foot") {
              if (point.side === "left") hitSoundLeftFoot.play();
              else hitSoundRightFoot.play();
            }

            spawnParticles(item.x, item.y, item.special);
            items.splice(i, 1); // Remove item immediately on hit
            break;
          }
        }
      }
    }
  }
}

function spawnParticles(x, y, special) {
  let particleColor = special ? color(0, 150, 255) : color(0, 255, 0);
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-2, 2),
      vy: random(-2, -5),
      life: 60,
      color: particleColor,
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    fill(p.color);
    noStroke();
    ellipse(p.x, p.y, 5);
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function getSmoothedHand(pose, side) {
  const wristName = side === "left" ? "left_wrist" : "right_wrist";
  const indexBaseName = side === "left" ? "left_index" : "right_index";
  const pinkyBaseName = side === "left" ? "left_pinky" : "right_pinky";
  return getSmoothedPoint(pose, side, wristName, indexBaseName, pinkyBaseName, smoothedHands, "hand");
}

function getSmoothedFoot(pose, side) {
  const ankleName = side === "left" ? "left_ankle" : "right_ankle";
  const heelName = side === "left" ? "left_heel" : "right_heel";
  const toeName = side === "left" ? "left_foot_index" : "right_foot_index";
  return getSmoothedPoint(pose, side, ankleName, heelName, toeName, smoothedFeet, "foot");
}

function getSmoothedPoint(pose, side, pointAName, pointBName, pointCName, smoothedPoints, type) {
  const pointA = getKeypoint(pose, pointAName);
  const pointB = getKeypoint(pose, pointBName);
  const pointC = getKeypoint(pose, pointCName);

  if (pointA && pointB && pointC) {
    const centerX = (pointA.x + pointB.x + pointC.x) / 3;
    const centerY = (pointA.y + pointB.y + pointC.y) / 3;

    if (!smoothedPoints[side]) smoothedPoints[side] = { x: centerX, y: centerY, type: type, side: side };
    smoothedPoints[side].x = lerp(smoothedPoints[side].x, centerX, 0.2);
    smoothedPoints[side].y = lerp(smoothedPoints[side].y, centerY, 0.2);

    return {
      x: smoothedPoints[side].x,
      y: smoothedPoints[side].y,
      type: smoothedPoints[side].type,
      side: side,
      confidence: pointA.confidence,
    };
  }
  return null;
}

function getKeypoint(pose, partName) {
  return pose.keypoints.find((k) => k.name === partName);
}
