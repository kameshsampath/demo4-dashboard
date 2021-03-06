import * as THREE from "three";
import { throttle } from "lodash";
import ScoredImageSource from "./ScoredImageSource.js";
import ParticleImageFactory from "./ParticleImageFactory.js";
import MovingParticleFactory from "./MovingParticleFactory.js";
import TrainingSimulation from "./TrainingSimulation.js";
import { makeLogger } from "../logging/Logger.js";
import andres from "../../images/andres.jpg";

const log = makeLogger("Stage");

export default class Stage {
  constructor({ container = document.body, data = {} } = {}) {
    log("created");
    this.actors = [];
    this.container = container;
    this.imageCount = 0;

    this._initMovingParticles = throttle(
      this._initMovingParticles.bind(this),
      500
    );

    this._init();

    // start the animation loop
    this._render();
  }
  hideUI() {
    document.body.classList.add("training");
  }
  startTraining() {
    this.pushLotsOfImages();
    TrainingSimulation.start(this, 0).then(() => {
      this.pushLotsOfImages();
      TrainingSimulation.start(this, 1).then(() => {
        this.pushLotsOfImages();
        TrainingSimulation.start(this, 2).then(() => {
          this.pushLotsOfImages();
          TrainingSimulation.start(this, 3);
          setTimeout(() => TrainingSimulation.start(this, 3, true), 5300);
        });
      });
    });
  }
  startStorm() {
    document.body.classList.add("storm");
  }
  stopStorm() {
    document.body.classList.remove("storm");
  }
  startDemoMode() {
    setInterval(() => this._pushImage(), 40);
    setInterval(
      () => this._initMovingParticles(Math.floor(8 * Math.random())),
      500
    );
  }
  pushLotsOfImages() {
    for (let i = 0; i < 200; ++i) setTimeout(() => this._pushImage(), 25);
  }
  _init() {
    this._initScene();
    this._initRenderer();
    this._initCamera();
    this._initImageSource();
  }
  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }
  _initImageSource() {
    this._initScoredImageSource();
  }
  _pushImage(src = andres) {
    this.imageCount++;

    if (window.leaderboard) {
      const imgModel = {
        src,
        id: this.imageCount,
        swooshClass: `secondary-image-${Math.ceil(9 * Math.random())}`
      };
      leaderboard.scoredImages.push(imgModel);
      setTimeout(() => {
        const i = leaderboard.scoredImages.indexOf(imgModel);
        leaderboard.scoredImages.splice(i, 1);
      }, 4000);
    }
  }
  _initScoredImageSource() {
    this.imageSource = new ScoredImageSource({
      stormCallback: data => {
        if (data.storm) {
          this.startStorm();
        } else {
          this.stopStorm();
        }
      }
    });
    this.imageSource.onImage((scoredImage, imgEl) => {
      this._pushImage(imgEl.src);

      const taskNames = {
        // adventure mode
        "a person": 0,
        "a teddy bear": 1,
        "a horse": 2,
        "an apple": 3,

        "a laptop": 4, // this and the next one are swapped as a quick fix because I traced the paths in the wrong order
        "a cell phone": 5, // this and the previous one are swapped as a quick fix because I traced the paths in the wrong order
        "a clock": 6,
        "a book": 7
      };

      this._initMovingParticles(taskNames[scoredImage.taskName]);
    });
  }
  _initMovingParticles(path = 0) {
    const mp = MovingParticleFactory.create(this, null, path);
    this._registerActor(mp);
    mp.onComplete(this._unregisterActor.bind(this));
  }
  _registerActor(actor) {
    log(`adding actor ${actor.name} to the stage`);
    this.actors.push(actor);
  }
  _unregisterActor(actor) {
    log(`removing actor ${actor.name} from the stage`);
    this.actors.splice(this.actors.indexOf(actor), 1);
    actor.destroy();
  }
  _initCamera() {
    // this._initOrthographicCamera();
    this._initPerspectiveCamera();
  }
  _initPerspectiveCamera() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    log(`res: ${w} x ${h}`);
    this.camera = new THREE.PerspectiveCamera(70, w / h, 1, 3000);
    this.camera.position.z = 100;
  }
  _initOrthographicCamera() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const f = 1000;

    this.camera = new THREE.OrthographicCamera(
      w / -2,
      w / 2,
      h / 2,
      h / -2,
      1,
      f
    );
    this.camera.position.z = 400;
  }
  _initScene() {
    this.scene = new THREE.Scene();
  }
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth / 4, window.innerHeight / 4);
    this.renderer.setClearColor(0, 0);
    this.container.appendChild(this.renderer.domElement);
  }
  _update() {
    this.actors.forEach(actor => actor.update(this));
  }
  _render() {
    requestAnimationFrame(() => this._render());
    this._update();
    this.renderer.render(this.scene, this.camera);
  }
}
