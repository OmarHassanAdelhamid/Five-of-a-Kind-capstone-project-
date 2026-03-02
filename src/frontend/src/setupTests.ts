import '@testing-library/jest-dom';

// Mock canvas 2d context for Layer2DGrid (jsdom does not implement getContext('2d'))
const noop = () => {};
const mockCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  setLineDash: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  closePath: noop,
  stroke: noop,
  fill: noop,
  fillRect: noop,
  strokeRect: noop,
  getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
  putImageData: noop,
  clearRect: noop,
};
(HTMLCanvasElement.prototype as unknown as { getContext: (id: string) => unknown }).getContext = function (id: string) {
  return id === '2d' ? mockCtx : null;
};

// jsdom does not provide URL.createObjectURL/revokeObjectURL
if (typeof globalThis.URL !== 'undefined') {
  if (!('createObjectURL' in globalThis.URL)) {
    (globalThis.URL as unknown as { createObjectURL: (obj: Blob) => string }).createObjectURL = () => 'blob:mock';
  }
  if (!('revokeObjectURL' in globalThis.URL)) {
    (globalThis.URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = () => {};
  }
}
