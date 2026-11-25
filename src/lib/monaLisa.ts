/**
 * Generates a high-contrast monochrome portrait inspired by Leonardo da Vinci's
 * Mona Lisa directly onto an HTMLCanvasElement (zero external URLs, zero CORS taint).
 */
export function createMonaLisaCanvas(width = 640, height = 820): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base dark background
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, width, height);

  // Misty renaissance landscape backdrop (horizon + winding river + distant ridges)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.56);
  skyGrad.addColorStop(0, "#1c1c1c");
  skyGrad.addColorStop(0.55, "#595959");
  skyGrad.addColorStop(1, "#2a2a2a");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.56);

  // Distant mountain ridges
  ctx.fillStyle = "#202020";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.38);
  ctx.lineTo(width * 0.14, height * 0.27);
  ctx.lineTo(width * 0.28, height * 0.35);
  ctx.lineTo(width * 0.72, height * 0.33);
  ctx.lineTo(width * 0.87, height * 0.24);
  ctx.lineTo(width, height * 0.37);
  ctx.lineTo(width, height * 0.55);
  ctx.lineTo(0, height * 0.55);
  ctx.closePath();
  ctx.fill();

  // Winding river highlight on left & right
  ctx.strokeStyle = "#7a7a7a";
  ctx.lineWidth = Math.max(3, width * 0.014);
  ctx.beginPath();
  ctx.moveTo(width * 0.05, height * 0.44);
  ctx.quadraticCurveTo(width * 0.2, height * 0.4, width * 0.12, height * 0.5);
  ctx.stroke();

  // Parapet / loggia ledge at mid-lower edge
  ctx.fillStyle = "#161616";
  ctx.fillRect(0, height * 0.54, width, height * 0.46);
  ctx.fillStyle = "#3b3b3b";
  ctx.fillRect(0, height * 0.54, width, height * 0.015);

  const cx = width * 0.51;
  const headCy = height * 0.285;
  const headRx = width * 0.155;
  const headRy = height * 0.195;

  // Flowing dark hair & veil silhouette behind head
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(cx, headCy + height * 0.03, headRx * 1.48, headRy * 1.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draped dark renaissance dress / torso
  const torsoGrad = ctx.createLinearGradient(cx - width * 0.3, height * 0.48, cx + width * 0.3, height);
  torsoGrad.addColorStop(0, "#242424");
  torsoGrad.addColorStop(0.5, "#141414");
  torsoGrad.addColorStop(1, "#050505");
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.14, height * 0.46);
  ctx.quadraticCurveTo(cx - width * 0.36, height * 0.62, cx - width * 0.4, height);
  ctx.lineTo(cx + width * 0.38, height);
  ctx.quadraticCurveTo(cx + width * 0.34, height * 0.62, cx + width * 0.14, height * 0.46);
  ctx.closePath();
  ctx.fill();

  // Sleeve folds
  ctx.strokeStyle = "#4c4c4c";
  ctx.lineWidth = Math.max(4, width * 0.015);
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.25, height * 0.63);
  ctx.quadraticCurveTo(cx - width * 0.18, height * 0.77, cx - width * 0.04, height * 0.8);
  ctx.stroke();

  // Neck & decolletage sfumato glow
  const neckGrad = ctx.createRadialGradient(
    cx - width * 0.01,
    height * 0.49,
    width * 0.02,
    cx,
    height * 0.51,
    width * 0.18
  );
  neckGrad.addColorStop(0, "#ededed");
  neckGrad.addColorStop(0.55, "#9c9c9c");
  neckGrad.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.078, height * 0.4);
  ctx.lineTo(cx + width * 0.072, height * 0.4);
  ctx.quadraticCurveTo(cx + width * 0.17, height * 0.52, cx + width * 0.12, height * 0.58);
  ctx.quadraticCurveTo(cx, height * 0.61, cx - width * 0.13, height * 0.57);
  ctx.quadraticCurveTo(cx - width * 0.16, height * 0.51, cx - width * 0.078, height * 0.4);
  ctx.closePath();
  ctx.fill();

  // Face oval with classical sfumato lighting (bright forehead, cheekbone, chin)
  const faceGrad = ctx.createRadialGradient(
    cx - width * 0.025,
    headCy - height * 0.03,
    width * 0.02,
    cx + width * 0.01,
    headCy + height * 0.01,
    headRy * 1.05
  );
  faceGrad.addColorStop(0, "#ffffff");
  faceGrad.addColorStop(0.45, "#cccccc");
  faceGrad.addColorStop(0.8, "#6e6e6e");
  faceGrad.addColorStop(1, "#1e1e1e");

  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Center-parted hair & translucent veil framing the face
  ctx.fillStyle = "#0b0b0b";
  ctx.beginPath();
  ctx.moveTo(cx, headCy - headRy * 1.04);
  ctx.quadraticCurveTo(cx - headRx * 1.28, headCy - headRy * 0.85, cx - headRx * 1.05, headCy + headRy * 0.9);
  ctx.lineTo(cx - headRx * 0.82, headCy + headRy * 0.25);
  ctx.quadraticCurveTo(cx - headRx * 0.92, headCy - headRy * 0.55, cx, headCy - headRy * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, headCy - headRy * 1.04);
  ctx.quadraticCurveTo(cx + headRx * 1.28, headCy - headRy * 0.85, cx + headRx * 1.05, headCy + headRy * 0.9);
  ctx.lineTo(cx + headRx * 0.82, headCy + headRy * 0.25);
  ctx.quadraticCurveTo(cx + headRx * 0.92, headCy - headRy * 0.55, cx, headCy - headRy * 0.72);
  ctx.closePath();
  ctx.fill();

  // Subtle brow shadow
  ctx.fillStyle = "rgba(20, 20, 20, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.048, headCy - height * 0.022, width * 0.036, height * 0.018, 0.06, 0, Math.PI * 2);
  ctx.ellipse(cx + width * 0.044, headCy - height * 0.022, width * 0.034, height * 0.018, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (almond-shaped + dark irises + tiny specular catchlight)
  const drawEye = (ex: number, ey: number, rx: number) => {
    ctx.fillStyle = "#d8d8d8";
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, rx * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(ex - rx * 0.08, ey, rx * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ex - rx * 0.2, ey - rx * 0.16, Math.max(2, width * 0.005), Math.max(2, width * 0.005));

    // Upper eyelid crease
    ctx.strokeStyle = "#181818";
    ctx.lineWidth = Math.max(2, width * 0.005);
    ctx.beginPath();
    ctx.ellipse(ex, ey - rx * 0.08, rx * 1.05, rx * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  };

  drawEye(cx - width * 0.046, headCy - height * 0.018, width * 0.025);
  drawEye(cx + width * 0.042, headCy - height * 0.018, width * 0.023);

  // Nose bridge highlight & shadow
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = Math.max(3, width * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.008, headCy - height * 0.02);
  ctx.lineTo(cx - width * 0.012, headCy + height * 0.055);
  ctx.stroke();

  ctx.fillStyle = "rgba(25, 25, 25, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.002, headCy + height * 0.068, width * 0.022, height * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  // Enigmatic smile (soft upturned corners + shadowed philtrum & lower lip)
  ctx.strokeStyle = "#1d1d1d";
  ctx.lineWidth = Math.max(2, width * 0.0065);
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.042, headCy + height * 0.1);
  ctx.quadraticCurveTo(cx - width * 0.004, headCy + height * 0.114, cx + width * 0.036, headCy + height * 0.098);
  ctx.stroke();

  // Subtle lower lip highlight
  ctx.strokeStyle = "#dcdcdc";
  ctx.lineWidth = Math.max(2, width * 0.007);
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.024, headCy + height * 0.118);
  ctx.quadraticCurveTo(cx, headCy + height * 0.125, cx + width * 0.02, headCy + height * 0.117);
  ctx.stroke();

  // Crossed hands resting at bottom-center
  const handGrad = ctx.createRadialGradient(
    cx - width * 0.03,
    height * 0.81,
    width * 0.02,
    cx,
    height * 0.83,
    width * 0.2
  );
  handGrad.addColorStop(0, "#efefef");
  handGrad.addColorStop(0.55, "#8b8b8b");
  handGrad.addColorStop(1, "#151515");

  ctx.fillStyle = handGrad;
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.03, height * 0.825, width * 0.145, height * 0.055, -0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + width * 0.05, height * 0.855, width * 0.12, height * 0.042, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Subtle finger separation shadows
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = Math.max(2, width * 0.004);
  for (let i = -1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + width * 0.02 + i * width * 0.02, height * 0.805);
    ctx.lineTo(cx + width * 0.06 + i * width * 0.02, height * 0.835);
    ctx.stroke();
  }

  return canvas;
}
