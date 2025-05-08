let video;
let bodyPose;
let poses = [];
let items = [];
let particles = [];
let score = 0;
let hitSoundLeftHand, hitSoundRightHand, hitSoundLeftFoot, hitSoundRightFoot, specialSound;
let smoothedHands = {};
let smoothedFeet = {};

// Fixed sizes for hands and feet bounding boxes
const HAND_BOX_SIZE = 50;
const FOOT_BOX_SIZE = 80;
const SPECIAL_ITEM_CHANCE = 0.2;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

function preload() {
  bodyPose = ml5.bodyPose("BlazePose");
  hitSoundLeftHand = loadSound("left_hand.wav");
  hitSoundRightHand = loadSound("right_hand.wav");
  hitSoundLeftFoot = loadSound("left_foot.wav");
  hitSoundRightFoot = loadSound("right_foot.wav");
  specialSound = loadSound("special.wav");
}

function setup() {
  createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  video = createCapture({ video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT }, audio: false });
  video.size(VIDEO_WIDTH, VIDEO_HEIGHT);
  video.hide();

  bodyPose.detectStart(video, (results) => {
    poses = results;
  });

  window.addEventListener("focus", startSpawningItems);
  window.addEventListener("blur", stopSpawningItems);
  startSpawningItems();
}

function draw() {
  background(0);
  if (video.loadedmetadata) {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();
  }
  drawItems();
  drawHandsAndFeet();
  drawParticles();
}

function startSpawningItems() {
  if (!this.spawnInterval) {
    this.spawnInterval = setInterval(spawnItem, 1000);
  }
}

function stopSpawningItems() {
  clearInterval(this.spawnInterval);
  this.spawnInterval = null;
}

function spawnItem() {
  const isSpecial = random() < SPECIAL_ITEM_CHANCE;
  items.push({
    x: random(width),
    y: -50,
    size: isSpecial ? 20 : 30 + random(20),
    speed: isSpecial ? 5 + random(3) : 2 + random(3),
    hit: false,
    special: isSpecial,
  });
}

function drawItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += item.speed;
    fill(item.special ? color(0, 150, 255) : color(255, 204, 0));
    noStroke();
    ellipse(item.x, item.y, item.size);

    if (item.y > height) {
      items.splice(i, 1);
      continue;
    }

    checkItemCollision(item, i);
  }
}

function drawHandsAndFeet() {
  for (const pose of poses) {
    const points = ["left", "right"].flatMap((side) => [getSmoothedHand(pose, side), getSmoothedFoot(pose, side)]);

    for (const point of points) {
      if (point && point.confidence > 0.8) {
        const boxSize = point.type === "hand" ? HAND_BOX_SIZE : FOOT_BOX_SIZE;
        fill(0, 255, 0, 100);
        noStroke();
        ellipse(width - point.x, point.y, boxSize, boxSize);
      }
    }
  }
}

function checkItemCollision(item, index) {
  for (const pose of poses) {
    const points = ["left", "right"].flatMap((side) => [getSmoothedHand(pose, side), getSmoothedFoot(pose, side)]);

    for (const point of points) {
      if (point && point.confidence > 0.9) {
        const boxSize = point.type === "hand" ? HAND_BOX_SIZE : FOOT_BOX_SIZE;
        if (!item.hit && dist(width - point.x, point.y, item.x, item.y) < item.size / 2 + boxSize / 2) {
          handleItemHit(item, point);
          items.splice(index, 1);
          return;
        }
      }
    }
  }
}

function handleItemHit(item, point) {
  item.hit = true;
  score += item.special ? 5 : 1;
  document.getElementById("score").textContent = `Score: ${score}`;

  if (item.special) specialSound.play();
  else if (point.type === "hand") (point.side === "left" ? hitSoundLeftHand : hitSoundRightHand).play();
  else if (point.type === "foot") (point.side === "left" ? hitSoundLeftFoot : hitSoundRightFoot).play();

  spawnParticles(item.x, item.y, item.special);
}

function spawnParticles(x, y, special) {
  const color = special ? [0, 150, 255] : [0, 255, 0];
  for (let i = 0; i < 15; i++) {
    particles.push({ x, y, vx: random(-2, 2), vy: random(-2, -5), life: 60, color });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    fill(...p.color);
    noStroke();
    ellipse(p.x, p.y, 5);
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    if (--p.life <= 0) particles.splice(i, 1);
  }
}

function getSmoothedHand(pose, side) {
  return getSmoothedPoint(pose, side, `${side}_wrist`, `${side}_index`, `${side}_pinky`, smoothedHands, "hand");
}

function getSmoothedFoot(pose, side) {
  return getSmoothedPoint(pose, side, `${side}_ankle`, `${side}_heel`, `${side}_foot_index`, smoothedFeet, "foot");
}

function getSmoothedPoint(pose, side, pointAName, pointBName, pointCName, smoothedPoints, type) {
  const pointA = getKeypoint(pose, pointAName);
  const pointB = getKeypoint(pose, pointBName);
  const pointC = getKeypoint(pose, pointCName);

  if (pointA && pointB && pointC) {
    const centerX = (pointA.x + pointB.x + pointC.x) / 3;
    const centerY = (pointA.y + pointB.y + pointC.y) / 3;
    smoothedPoints[side] = smoothedPoints[side] || { x: centerX, y: centerY, type, side };
    smoothedPoints[side].x = lerp(smoothedPoints[side].x, centerX, 0.2);
    smoothedPoints[side].y = lerp(smoothedPoints[side].y, centerY, 0.2);
    return { ...smoothedPoints[side], confidence: pointA.confidence };
  }
  return null;
}

function getKeypoint(pose, partName) {
  return pose.keypoints.find((k) => k.name === partName);
}
