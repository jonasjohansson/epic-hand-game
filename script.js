let video;
let bodyPose;
let poses = [];
let items = [];
let particles = [];
let score = 0;
let hitSound;
let smoothedHands = {};

function preload() {
  bodyPose = ml5.bodyPose("BlazePose");
  hitSound = loadSound("Pickup 2.wav");
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  bodyPose.detectStart(video, gotPoses);

  setInterval(spawnItem, 1000);
}

function draw() {
  background(0);
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  drawItems();
  drawHands();
  drawParticles();
}

function spawnItem() {
  let item = {
    x: random(width),
    y: -50,
    size: 30 + random(20),
    speed: 2 + random(3),
    hit: false,
  };
  items.push(item);
}

function drawItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.y += item.speed;
    fill(item.hit ? color(0, 255, 0) : color(255, 204, 0));
    noStroke();
    ellipse(item.x, item.y, item.size);

    if (item.y > height) {
      items.splice(i, 1);
    }

    for (let pose of poses) {
      let leftHand = getSmoothedHand(pose, "left");
      let rightHand = getSmoothedHand(pose, "right");
      let hands = [leftHand, rightHand];

      for (let hand of hands) {
        if (hand && hand.confidence > 0.5) {
          let boxSize = hand.size;
          rectMode(CENTER);
          noFill();
          stroke(0, 255, 0);
          strokeWeight(2);
          rect(width - hand.x, hand.y, boxSize, boxSize);

          // Check for collision
          if (!item.hit && dist(width - hand.x, hand.y, item.x, item.y) < item.size / 2 + boxSize / 2) {
            item.hit = true;
            score += 1;
            document.getElementById("score").textContent = `Score: ${score}`;
            hitSound.play();
            spawnParticles(item.x, item.y);
            break;
          }
        }
      }
    }
  }
}

function drawHands() {
  for (let pose of poses) {
    let leftHand = getSmoothedHand(pose, "left");
    let rightHand = getSmoothedHand(pose, "right");
    let hands = [leftHand, rightHand];

    for (let hand of hands) {
      if (hand && hand.confidence > 0.5) {
        fill(0, 255, 0, 100);
        noStroke();
        ellipse(width - hand.x, hand.y, hand.size, hand.size);
      }
    }
  }
}

function getSmoothedHand(pose, side) {
  const wristName = side === "left" ? "left_wrist" : "right_wrist";
  const indexBaseName = side === "left" ? "left_index" : "right_index";
  const pinkyBaseName = side === "left" ? "left_pinky" : "right_pinky";
  const wrist = getKeypoint(pose, wristName);
  const indexBase = getKeypoint(pose, indexBaseName);
  const pinkyBase = getKeypoint(pose, pinkyBaseName);

  if (wrist && indexBase && pinkyBase) {
    const centerX = (wrist.x + indexBase.x + pinkyBase.x) / 3;
    const centerY = (wrist.y + indexBase.y + pinkyBase.y) / 3;
    const size = dist(indexBase.x, indexBase.y, pinkyBase.x, pinkyBase.y) * 2;

    // Smooth position and size
    if (!smoothedHands[side]) smoothedHands[side] = { x: centerX, y: centerY, size: size };
    smoothedHands[side].x = lerp(smoothedHands[side].x, centerX, 0.2);
    smoothedHands[side].y = lerp(smoothedHands[side].y, centerY, 0.2);
    smoothedHands[side].size = lerp(smoothedHands[side].size, size, 0.2);

    return { x: smoothedHands[side].x, y: smoothedHands[side].y, size: smoothedHands[side].size, confidence: wrist.confidence };
  }
  return null;
}

function getKeypoint(pose, partName) {
  return pose.keypoints.find((k) => k.name === partName);
}

function spawnParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-2, 2),
      vy: random(-2, -5),
      life: 60,
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    fill(0, 255, 0);
    noStroke();
    ellipse(p.x, p.y, 5);
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravity
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function gotPoses(results) {
  poses = results;
}
