import chroma from "chroma-js";

// @ts-ignore
import kmeans from "ml-kmeans";

function clipHue(h: number) {
  return (h + 360) % 360;
}

function getAllPixels(ctx: CanvasRenderingContext2D) {
  const dp = window.devicePixelRatio;
  return ctx.getImageData(
    0,
    0,
    ctx.canvas.clientWidth * dp,
    ctx.canvas.clientHeight * dp
  );
}

function colorForCoord(x: number, y: number, radius: number) {
  const l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  const rad = Math.atan2(y, x);

  const hue = rad * (180 / Math.PI);
  let saturation = Math.sqrt(l / radius);
  const lightness = (l / radius) * (1 - 0.5) + 0.5;

  const [r, g, b] = chroma(
    clipHue(hue + 150),
    saturation,
    lightness,
    "hsv"
  ).rgb();

  return [r, g, b];
}

// function coordForColor(r, g, b) {
//   return [0, 0];
// }

export function renderWheel(
  imageCTX: CanvasRenderingContext2D,
  wheelCTX: CanvasRenderingContext2D,
  clusters: number
) {
  const dp = window.devicePixelRatio;

  const radius =
    Math.min(
      wheelCTX.canvas.clientWidth * dp,
      wheelCTX.canvas.clientHeight * dp
    ) / 2;

  const imageData = getAllPixels(imageCTX);
  const colorWheelData = getAllPixels(wheelCTX);

  for (let i = 0; i < colorWheelData.data.length; i += 4) {
    let pixel = i / 4;
    const x = (pixel % (radius * 2)) - radius;
    const y = Math.floor(pixel / (radius * 2)) - radius;

    // const [r, g, b] = colorForCoord(x, y, radius);

    const l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    // const rad = Math.atan2(y, x);

    if (l <= radius) {
      // const hue = rad * (180 / Math.PI);
      // let saturation = Math.sqrt(l / radius);
      // const lightness = (l / radius) * (1 - 0.5) + 0.5;

      // const [r, g, b] = chroma(
      //   clipHue(hue + 150),
      //   saturation,
      //   lightness,
      //   "hsv"
      // ).rgb();

      const [r, g, b] = colorForCoord(x, y, radius);

      colorWheelData.data[i + 0] = r;
      colorWheelData.data[i + 1] = g;
      colorWheelData.data[i + 2] = b;
      colorWheelData.data[i + 3] = 75;
    }
  }

  let vectors = new Set<string>();

  for (let i = 0; i < imageData.data.length; i += 4) {
    let [h, s] = chroma(
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2],
      "rgb"
    ).hsv();

    if (isNaN(h)) {
      h = 0;
    }

    const l = Math.pow(s, 2) * radius;
    const rads = (h - 150) / (180 / Math.PI);

    const x = Math.round(l * Math.cos(rads)) + radius;
    const y = Math.round(l * Math.sin(rads)) + radius;

    vectors.add(`${x},${y}`);

    const index = x + radius * 2 * y;

    colorWheelData.data[index * 4 + 3] = 255;
  }

  wheelCTX.putImageData(colorWheelData, 0, 0);

  const data = Array.from(vectors).map((x: string) =>
    x.split(",").map((z) => parseInt(z, 10))
  );

  let ans = kmeans(data, clusters, { initialization: "kmeans++" });

  console.log(ans);

  ans.centroids.forEach((c: any) => {
    wheelCTX.beginPath();
    wheelCTX.arc(c.centroid[0], c.centroid[1], 5, 0, Math.PI * 2);
    wheelCTX.fill();
  });

  return ans.centroids.map((c: any) => {
    return colorForCoord(
      c.centroid[0] - radius,
      c.centroid[1] - radius,
      radius
    );
  });
}

export default renderWheel;
