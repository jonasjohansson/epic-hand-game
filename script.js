let video;
let bodyPose;
let poses = [];
let items = [];
let particles = [];
let score = 0;
let hitSound;

function preload() {
  bodyPose = ml5.bodyPose();
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
  image(video, 0, 0, width, height);
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
    if (item.hit) {
      fill(0, 255, 0); // Turn green if hit
    } else {
      fill(255, 204, 0); // Yellow by default
    }
    noStroke();
    ellipse(item.x, item.y, item.size);

    if (item.y > height) {
      items.splice(i, 1);
    }

    for (let pose of poses) {
      let leftWrist = pose.keypoints.find((p) => p.name === "left_wrist");
      let rightWrist = pose.keypoints.find((p) => p.name === "right_wrist");

      let hands = [leftWrist, rightWrist];

      for (let hand of hands) {
        if (hand && hand.confidence > 0.1) {
          let boxSize = 30;
          rectMode(CENTER);
          noFill();
          stroke(0, 255, 0);
          strokeWeight(2);
          rect(hand.x, hand.y, boxSize, boxSize);

          // Check for collision
          if (!item.hit && dist(hand.x, hand.y, item.x, item.y) < item.size / 2 + boxSize / 2) {
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
    let leftWrist = pose.keypoints.find((p) => p.name === "left_wrist");
    let rightWrist = pose.keypoints.find((p) => p.name === "right_wrist");

    let hands = [leftWrist, rightWrist];

    for (let hand of hands) {
      if (hand && hand.confidence > 0.5) {
        fill(0, 255, 0);
        noStroke();
        circle(hand.x, hand.y, 10);
      }
    }
  }
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
