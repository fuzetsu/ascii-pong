/* jshint esnext:true */
/* global localStorage */
const settings = {
  size: {
    width: 70,
    height: 35
  },
  bindings: {
    R_DOWN: 40,
    R_UP: 38,
    L_DOWN: 83,
    L_UP: 87,
    RESET: 32
  },
  showFps: false,
  numPlayers: 1
};

{
  let popupButtonClick = e => {
    e.preventDefault();
    let target = document.querySelector(`#${e.target.dataset.target}`);
    target.classList.toggle('hidden');
    game.PAUSE = !target.classList.contains('hidden');
  };
  [].forEach.call(document.querySelectorAll('.popup-button'), button => button.onclick = popupButtonClick);

  let keybindingKeyDown = e => {
    e.preventDefault();
    e.target.value = e.keyCode;
  };
  [].forEach.call(document.querySelectorAll('.keybinding'), keybinding => keybinding.onkeydown = keybindingKeyDown);

  let lupbox = document.querySelector('#settings-key-lup');
  let ldownbox = document.querySelector('#settings-key-ldown');
  let rupbox = document.querySelector('#settings-key-rup');
  let rdownbox = document.querySelector('#settings-key-rdown');
  let settingsDiv = document.querySelector('#settings-div');
  let chkShowFps = document.querySelector('#settings-showfps');
  let selPlayers = document.querySelector('#settings-players');

  window.loadLocalStorage = () => {
    lupbox.value = localStorage.lup || settings.bindings.L_UP;
    ldownbox.value = localStorage.ldown || settings.bindings.L_DOWN;
    rupbox.value = localStorage.rup || settings.bindings.R_UP;
    rdownbox.value = localStorage.rdown || settings.bindings.R_DOWN;
    chkShowFps.checked = localStorage.showFps !== undefined ? localStorage.showFps === 'true' : settings.showFps;
    selPlayers.selectedIndex = localStorage.numPlayers !== undefined ? parseInt(localStorage.numPlayers) : settings.numPlayers;
  };

  window.saveLocalStorage = (game) => {
    localStorage.lup = game.bindings.L_UP = parseInt(lupbox.value);
    localStorage.ldown = game.bindings.L_DOWN = parseInt(ldownbox.value);
    localStorage.rup = game.bindings.R_UP = parseInt(rupbox.value);
    localStorage.rdown = game.bindings.R_DOWN = parseInt(rdownbox.value);
    localStorage.showFps = game.showFps = chkShowFps.checked;
    localStorage.numPlayers = game.numPlayers = selPlayers.selectedIndex;

    game.genBindings();
  };

  document.querySelector('#settings-save').onclick = e => {
    e.preventDefault();
    game.PAUSE = false;
    window.saveLocalStorage(game);
    settingsDiv.classList.add('hidden');
  };
  document.querySelector('#settings-cancel').onclick = e => {
    e.preventDefault();
    game.PAUSE = false;
    settingsDiv.classList.add('hidden');
    window.loadLocalStorage();
  };

  window.loadLocalStorage();
}

class Game {

  constructor(container, width, height) {
    this.container = container;
    this.canvas = [];
    this.height = height;
    this.width = width;
    this.pressed = {};
    this.bindings = Object.create(settings.bindings);
    this.STOP = false;
    this.PAUSE = false;
    this.board = new GameBoard('X');
    this.lPaddle = new Paddle(1, height * 0.5, 'L', ']');
    this.rPaddle = new Paddle(width - 2, height * 0.5, 'R', '[');
    this.ball = new Ball(width / 2, 4);
    this.setAsParent(this.board, this.lPaddle, this.rPaddle, this.ball);
    this.lastUpdate = 0;
    this.numPlayers = 1;
    this.showFps = false;
    this.genBindings();
    this.bindEvents();
    this.clearCanvas();
    window.saveLocalStorage(this); // this shouldn't be here :(
  }
  setAsParent(...children) {
    children.forEach(child => child.parent = this);
  }
  genBindings() {
    this._bindings = {};
    for (let key in this.bindings) {
      this._bindings[this.bindings[key]] = key;
    }
  }
  bindEvents() {
    window.onkeydown = e => {
      let key = this._bindings[e.keyCode];
      if (!key) return;
      e.preventDefault();
      this.pressed[key] = true;
      if (this.pressed.RESET) {
        this.STOP = true;
        game = new Game(pong, this.width, this.height);
        game.countdownToStart();
      }
    };
    window.onkeyup = e => {
      let key = this._bindings[e.keyCode];
      if (!key) return;
      e.preventDefault();
      this.pressed[key] = false;
    };
    //     this.container.onblur = () => {
    //       this.PAUSE = true;
    //     };
    //     this.container.onfocus = () => {
    //       this.PAUSE = false;
    //     };
  }
  start() {
    this.lastUpdate = Date.now();
    let fpsUp = 5;
    let fps = '';
    let last = Date.now();
    let frame = () => {
      if (this.STOP) {
        game.drawText('GAME OVER');
        game.drawText('(PRESS SPACE)', null, Math.floor((this.height - 1) / 2) + 1);
        game.drawCanvas();
        return;
      }
      let now = Date.now();
      let delta = now - this.lastUpdate;
      if (!this.PAUSE) {
        this.update(delta);
        this.draw();
        if (this.showFps) {
          if (now - last > 1000 / fpsUp) {
            fps = (1000 / delta).toFixed(2);
            last = now;
          }
          this.drawText(fps, this.width - fps.length - 1, 2);
          this.drawCanvas();
        }
      }
      this.lastUpdate = now;
      window.requestAnimationFrame(frame);
    };
    frame();
  }
  countdownToStart(count = 3, startMsg = 'STARTING') {
    this.draw();
    this.drawText(startMsg);
    this.drawCanvas();
    let id = setInterval(() => {
      if (count > 0) {
        this.draw();
        this.drawText(count);
        this.drawCanvas();
        count -= 1;
      }
      else {
        clearInterval(id);
        this.start();
      }
    }, 1000);
  }
  update(delta) {
    ['lPaddle', 'rPaddle', 'ball'].map(prop => this[prop].update(delta));
  }
  draw() {
    this.clearCanvas();
    ['board', 'lPaddle', 'rPaddle', 'ball'].map(prop => this[prop].draw());
    this.drawCanvas();
  }
  drawText(text, x, y) {
    text = text.toString();
    if (!y && y !== 0) y = Math.floor((this.height - 1) / 2);
    let row = this.canvas[y];
    if (!x && x !== 0) x = Math.floor((row.length - text.length) / 2);
    for (let i = 0; i < text.length; i++) {
      row[x + i] = text[i];
    }
  }
  drawCanvas() {
    let output = this.canvas.map(line => line.join('')).join('\n');
    if (output !== this.lastOutput) {
      this.container.textContent = output;
      this.lastOutput = output;
    }
  }
  clearCanvas() {
    let canvas = [];
    for (let row = 0; row < this.height; row++) {
      canvas[row] = [];
      for (let col = 0; col < this.width; col++) {
        canvas[row].push(' ');
      }
    }
    this.canvas = canvas;
  }
}

class GameBoard {
  constructor(filler = '0') {
    this.filler = filler;
  }
  draw() {
    let canvas = this.parent.canvas;
    canvas[0] = canvas[0].map(cell => this.filler);
    canvas[canvas.length - 1] = canvas[canvas.length - 1].map(cell => this.filler);
  }
}

class Ball {
  get x() {
    return Math.round(this._x);
  }
  get y() {
    return Math.round(this._y);
  }
  constructor(x, y) {
    this._x = x;
    this._y = y;
    this.dx = 0.025;
    this.dy = 0.02;
  }
  update(delta) {
    this._x += this.dx * delta;
    this._y += this.dy * delta;

    let height = this.parent.height;
    let width = this.parent.width;

    if (this._x < 0 || this._x > width) {
      this.parent.STOP = true;
    }
    if (this._y < 1) {
      this._y = 1;
      this.dy = -this.dy;
    }
    else if (this._y > height - 2) {
      this._y = height - 2;
      this.dy = -this.dy;
    }

    let lPaddle = this.parent.lPaddle;
    let rPaddle = this.parent.rPaddle;

    if (lPaddle.doesCollide(this.x, this.y) && this.dx < 0) {
      this._x = lPaddle.x + 1;
      this.dx = -this.dx;
      this.dy = this._y - (lPaddle._y + lPaddle.height / 2);
      this.dy /= 100;
    }
    else if (rPaddle.doesCollide(this.x, this.y) && this.dx > 0) {
      this._x = rPaddle.x - 1;
      this.dx = -this.dx;
      this.dy = this._y - (rPaddle._y + rPaddle.height / 2);
      this.dy /= 100;
    }
  }
  draw() {
    this.parent.canvas[this.y][this.x] = '*';
  }
}

class Paddle {
  get x() {
    return Math.round(this._x);
  }
  get y() {
    return Math.round(this._y);
  }
  constructor(x, y, pos, filler = '|', height = 4) {
    this._x = x;
    this._y = y;
    this.dy = 0.02;
    this.pos = pos;
    this.height = height;
    this.filler = filler;
    this.upkey = pos === 'L' ? 'L_UP' : 'R_UP';
    this.downkey = pos === 'L' ? 'L_DOWN' : 'R_DOWN';
  }
  update(delta) {
    // decide whether we're moving up and/or down
    let down, up;
    if ((this.parent.numPlayers === 0) || (this.parent.numPlayers === 1 && this.pos === 'R')) {
      if ((this.pos === 'R' && this.parent.ball.x > this.parent.width * 0.3) ||
        (this.pos === 'L' && this.parent.ball.x < this.parent.width * 0.8)) {
        if (this.parent.ball._y > this._y + (this.height * 0.2)) {
          down = true;
        }
        else if (this.parent.ball._y < this._y - (this.height * 0.1)) {
          up = true;
        }
      }
    }
    else {
      down = this.parent.pressed[this.downkey];
      up = this.parent.pressed[this.upkey];
    }
    // move
    let move = this.dy * delta;
    this._y += (down ? move : 0) + (up ? -move : 0);
    if (this._y > this.parent.height - this.height - 1) {
      this._y = this.parent.height - this.height - 1;
    }
    else if (this.y < 1) {
      this._y = 1;
    }
  }
  doesCollide(x, y) {
    return x === this.x + (this.pos === 'L' ? 1 : -1) && y >= this.y && y <= this.y + this.height;
  }
  draw() {
    let canvas = this.parent.canvas;
    for (var i = 0; i < this.height; i++) {
      canvas[this.y + i][this.x > this.parent.width - 1 ? this.parent.width - 1 : this.x] = this.filler;
    }
  }
}

let pong = document.getElementById('pong');
let game = new Game(pong, settings.size.width, settings.size.height);
game.countdownToStart();