// ============================================================
// 手写签名组件 - Canvas 实现
// ============================================================

window.SignaturePad = class {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.hasContent = false;
    this.penColor = options.penColor || '#000';
    this.penWidth = options.penWidth || 2;
    this._init();
  }

  _init() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * 2;
    this.canvas.height = rect.height * 2;
    this.ctx.scale(2, 2);
    this.ctx.strokeStyle = this.penColor;
    this.ctx.lineWidth = this.penWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // 鼠标事件
    this.canvas.addEventListener('mousedown', (e) => this._start(e));
    this.canvas.addEventListener('mousemove', (e) => this._move(e));
    this.canvas.addEventListener('mouseup', () => this._end());
    this.canvas.addEventListener('mouseleave', () => this._end());

    // 触摸事件
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this._start(e.touches[0]); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this._move(e.touches[0]); });
    this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this._end(); });
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  _start(e) {
    this.isDrawing = true;
    this.hasContent = true;
    const pos = this._getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  _move(e) {
    if (!this.isDrawing) return;
    const pos = this._getPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  _end() {
    this.isDrawing = false;
  }

  // 清空
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasContent = false;
  }

  // 是否有签名
  isEmpty() {
    return !this.hasContent;
  }

  // 导出为 base64 PNG
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
};
