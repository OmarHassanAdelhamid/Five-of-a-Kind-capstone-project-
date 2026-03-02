function STLLoader() {}
STLLoader.prototype.load = function (url, onLoad) {
  if (onLoad) {
    onLoad({
      isBufferGeometry: true,
      computeBoundingSphere: function () {},
      computeBoundingBox: function () {},
      center: function () {},
      computeVertexNormals: function () {},
      boundingBox: {
        getCenter: function (target) {
          if (target) {
            target.x = 0;
            target.y = 0;
            target.z = 0;
          }
          return target;
        },
      },
    });
  }
  return {};
};
module.exports = { STLLoader };
