//based on https://github.com/Gaweph/p5-typescript-starter

// GLOBAL VARS & TYPES
let VIEW_PORT_WIDTH = 800;
let VIEW_PORT_HEIGHT = 500;

const PARTICLE_WIDTH = 10;
const REFRESH_RATE = 60;

let particles: Particle[] = [];
let currId = 0;

// P5 WILL AUTOMATICALLY USE GLOBAL MODE IF A DRAW() FUNCTION IS DEFINED
function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER).noFill().frameRate(REFRESH_RATE);
}

// p5 WILL AUTO RUN THIS FUNCTION IF THE BROWSER WINDOW SIZE CHANGES
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// p5 WILL HANDLE REQUESTING ANIMATION FRAMES FROM THE BROWSER AND WIL RUN DRAW() EACH ANIMATION FROME
function draw() {
  VIEW_PORT_WIDTH = windowWidth;
  VIEW_PORT_HEIGHT = windowHeight;
  // CLEAR BACKGROUND
  background("#fff");
  let quadTree = new QuadTree(
    new Rectangle(
      windowWidth / 2,
      windowHeight / 2,
      windowWidth / 2,
      windowHeight / 2
    ),
    2
  );
  particles.forEach((p) => {
    quadTree.insert(p);
  });
  particles = updateParticles(quadTree, particles);
  let quadTreeRects = quadTree.getRenderingData();
  quadTreeRects.forEach((r) => {
    stroke(0);
    strokeWeight(1);
    noFill();
    smooth();
    rect(r.x, r.y, r.dimX * 2, r.dimY * 2);
  });
  particles.forEach((p) => {
    fill(color(p.c));
    noStroke();
    smooth();
    circle(p.x, p.y, p.r * 2);
  });
}

function mouseClicked(): void {
  const newParticle: Particle = {
    id: currId,
    x: mouseX, // Takes the pixel number to convert to number
    y: mouseY,
    dx: 5 * (0.5 - Math.random()),
    dy: 5 * (0.5 - Math.random()),
    c: "red",
    r: PARTICLE_WIDTH,
  };
  currId++;
  particles.push(newParticle);
}

/**
 * Particle Utilities
 */

type Particle = {
  id: number;
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  c: string;
};

function getParticleBounds(p: Particle): Rectangle {
  return new Rectangle(p.x, p.y, p.r, p.r);
}

function particlesHaveCollided(p1: Particle, p2: Particle) {
  const INTERSECTION_DIST = p1.r + p2.r;
  const ACTUAL_DIST = getParticleDistance(p1, p2);
  return ACTUAL_DIST <= INTERSECTION_DIST;
}

function getParticleDistance(p1: Particle, p2: Particle): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Update Utils
 * */

/**
 *  Get's the next x position and dx value based on velocity/position on screen
 * @param p
 * @returns
 */
function getNextX(p: Particle): { x: number; dx: number } {
  const returnVal = { x: p.x + p.dx, dx: p.dx };
  if (p.dx < 0 && p.x + p.dx - p.r < 0) {
    returnVal.x = p.r;
    returnVal.dx = -returnVal.dx;
  } else if (p.dx > 0 && p.x + p.dx + p.r > VIEW_PORT_WIDTH) {
    returnVal.x = VIEW_PORT_WIDTH - p.r;
    returnVal.dx = -returnVal.dx;
  }
  return returnVal;
}

/**
 *  Get's the next y position and dy value based on velocity/position on screen
 * @param p
 * @returns
 */
function getNextY(p: Particle): { y: number; dy: number } {
  const returnVal = { y: p.y + p.dy, dy: p.dy };
  if (p.dy < 0 && p.y + p.dy - p.r < 0) {
    returnVal.y = p.r;
    returnVal.dy = -returnVal.dy;
  } else if (p.dy > 0 && p.y + p.dy + p.r > VIEW_PORT_HEIGHT) {
    returnVal.y = VIEW_PORT_HEIGHT - p.r;
    returnVal.dy = -returnVal.dy;
  }
  return returnVal;
}

/**
 * Loops through particles, checks if they collide, if they have update color/apply collision logic
 * @param p
 * @param quad
 * @returns
 */
function checkParticleCollisions(p: Particle, quad: QuadTree): Particle {
  const collidedParticles: Particle[] = <Particle[]>(
    quad.query(getParticleBounds(p))
  );
  let hasCollided = false;
  for (let i = 0; i < collidedParticles.length; i++) {
    const colP = collidedParticles[i];
    if (colP.id !== p.id && particlesHaveCollided(p, colP)) {
      hasCollided = true;
      collideParticles(p, colP);
    }
  }

  return {
    ...p,
    c: hasCollided ? "blue" : "red",
  };
}

/**
 * Applies collision effects to 2 particles
 * @param p1
 * @param p2
 * @returns
 */
function collideParticles(p1: Particle, p2: Particle): void {
  //logic taken from https://spicyyoghurt.com/tutorials/html5-javascript-game-development/collision-detection-physics
  const vCollision = { x: p1.x - p2.x, y: p1.y - p2.y };
  const dist = getParticleDistance(p1, p2);
  const vCollisionNorm = { x: vCollision.x / dist, y: vCollision.y / dist };
  const vRelativeVelocity = { x: p1.dx - p2.dx, y: p1.dy - p2.dy };
  const speed =
    vRelativeVelocity.x * vCollisionNorm.x +
    vRelativeVelocity.y * vCollisionNorm.y;

  if (speed > 0) return;
  p1.dx -= speed * vCollisionNorm.x;
  p1.dy -= speed * vCollisionNorm.y;
  p2.dx += speed * vCollisionNorm.x;
  p2.dy += speed * vCollisionNorm.y;
}

/**
 * Particle update logic, first checks collisions/changes velocities, then updates particle position
 * @param quad
 * @param particles
 * @returns
 */
function updateParticles(quad: QuadTree, particles: Particle[]): Particle[] {
  const updatedParticles = particles
    .map((p) => checkParticleCollisions(p, quad))
    .map((p) => {
      return {
        ...p,
        ...getNextX(p),
        ...getNextY(p),
      };
    });

  return updatedParticles;
}

/**
 *  Rectangle utility class, has methods to detect intersections and sub-divide itself
 */
class Rectangle {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly dimX: number,
    public readonly dimY: number
  ) {}

  /**
   * Splits the rectangle into squadrants
   * @returns a list of bounding rects for NW, NE, SE, SW quads respectively
   */
  public returnQuadrants(): Rectangle[] {
    const NEW_X_DIM: number = this.dimX / 2;
    const NEW_Y_DIM: number = this.dimY / 2;
    const newPos = [
      { x: this.x - NEW_X_DIM, y: this.y - NEW_Y_DIM },
      { x: this.x + NEW_X_DIM, y: this.y - NEW_Y_DIM },
      { x: this.x + NEW_X_DIM, y: this.y + NEW_Y_DIM },
      { x: this.x - NEW_X_DIM, y: this.y + NEW_Y_DIM },
    ];
    return newPos.map((pos) => {
      return new Rectangle(pos.x, pos.y, NEW_X_DIM, NEW_Y_DIM);
    });
  }

  public get leftEdge(): number {
    return this.x - this.dimX;
  }

  public get rightEdge(): number {
    return this.x + this.dimX;
  }

  public get topEdge(): number {
    return this.y - this.dimY;
  }

  public get bottomEdge(): number {
    return this.y + this.dimY;
  }

  /**
   * Get's the edges of the rect
   */
  public get edges(): number[] {
    return [this.topEdge, this.rightEdge, this.bottomEdge, this.leftEdge];
  }

  /**
   * Checks if a point is inside the rectangle
   * @param p
   * @returns
   */
  public includes(p: Point): boolean {
    const [top, right, bot, left] = this.edges;
    return p.x >= left && p.x <= right && p.y >= top && p.y <= bot;
  }

  /**
   * Returns true if this rectangle overlaps with another
   * @param rect
   */
  public overlaps(rect: Rectangle): boolean {
    const [top, right, bot, left] = this.edges;
    const [oTop, oRight, oBot, oLeft] = rect.edges;
    return !(oBot < top || oTop > oBot || oLeft > right || oRight < oLeft);
  }
}

/**
 * Quad tree code
 */

/**
 * Basic point representable in 2d space
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Quadtree, data structure for spcial data, allows us to optimize our hit detection by only comparing a given particle to other particles in it's quadrant
 */
class QuadTree {
  private _points: Point[] = [];
  private _quadrants: QuadTree[] = [];

  /**
   *
   * @param _bound  bounding rect of this quad tree
   * @param _capacity # of particles this quad tree can hold before it divides
   */
  constructor(private _bound: Rectangle, private _capacity: number) {}

  /**
   * Inserts point into the quad tree, splitting it into quadrants if necessary
   * @param p
   */
  public insert(p: Point): void {
    if (this._points.length < this._capacity && this._quadrants.length == 0) {
      this._points.push(p);
    } else {
      if (this._quadrants.length == 0) {
        this.split();
      }
      const [nwQ, neQ, seQ, swQ] = this._quadrants;
      if (nwQ.includes(p)) {
        nwQ.insert(p);
      } else if (neQ.includes(p)) {
        neQ.insert(p);
      } else if (seQ.includes(p)) {
        seQ.insert(p);
      } else if (swQ.includes(p)) {
        swQ.insert(p);
      }
    }
  }

  /**
   * Query the quad tree with a bounding rect, will return any points located in quadrants that intersect with the rect
   * @param bounds
   * @returns
   */
  public query(bounds: Rectangle): Point[] {
    let foundPoints: Set<Point> = new Set([]);

    if (this._bound.overlaps(bounds)) {
      if (this._quadrants.length == 0) {
        return this._points;
      } else {
        this._quadrants.forEach((quad) => {
          foundPoints = new Set<Point>([
            ...Array.from(quad.query(bounds)),
            ...Array.from(foundPoints),
          ]);
        });
      }
    }
    return Array.from(foundPoints);
  }

  /**
   * Splits the current quadrant into quadrants, off loads the quadrants points into the new quadrants
   */
  public split(): void {
    this._quadrants = this._bound.returnQuadrants().map((rect) => {
      return new QuadTree(rect, this._capacity);
    });
    this._points.forEach((p) => {
      this.insert(p);
    });
    this._points = [];
  }

  /**
   * Detects whether or not the point's poistion falls within the quad-tree's area
   * @param p
   * @returns
   */
  public includes(p: Point): boolean {
    return this._bound.includes(p);
  }

  /**
   * Returns all the bounding rectangles for the quad tree
   * @param returnData
   * @returns
   */
  public getRenderingData(returnData: Rectangle[] = []): Rectangle[] {
    returnData.push(this._bound);

    this._quadrants.forEach((quad: QuadTree) => {
      quad.getRenderingData(returnData);
    });

    return returnData;
  }
}
