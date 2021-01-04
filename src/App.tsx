import React, { useCallback, useEffect, useRef, useState } from "react";

import * as tf from "@tensorflow/tfjs";
import { useDropzone } from "react-dropzone";

import {
  Button,
  createStyles,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) => {
  console.log(theme.breakpoints.up("md"));
  return createStyles({
    wrapper: {
      display: "flex",
      justifyContent: "center",
      flexDirection: "column",
      alignItems: "center",
      "@media (min-width:910px)": {
        alignItems: "flex-start",
        flexDirection: "row",
      },
    },
    dropzone: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      outline: "none",
    },
    dropActive: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      padding: 12,
      color: "rgba(255, 255, 255, 0.53)",
      background: `radial-gradient(
        ellipse at center,
        hsla(0, 0%, 0%, 1) 0%,
        hsla(0, 0%, 0%, 0.85) 65%,
        hsla(0, 0%, 0%, 0.85) 100%
      )`,
      transition: "visibility 0.2s, opacity 0.2s;",
      visibility: "visible",
      opacity: 1,
    },
    drop: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      padding: 12,
      color: "rgba(255, 255, 255, 0.53)",
      visibility: "hidden",
      background: `radial-gradient(
        ellipse at center,
        hsla(0, 0%, 0%, 1) 0%,
        hsla(0, 0%, 0%, 0.85) 65%,
        hsla(0, 0%, 0%, 0.85) 100%
      )`,
      opacity: 0,
      transition: "visibility 0.2s, opacity 0.2s;",
    },
    dropOutline: {
      border: "6px #606060 dashed",
      backgroundColor: "rgba(141, 155, 165, 0.15)",
      borderRadius: 5,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    dropText: {
      fontSize: 24,
      fontWeight: 600,
    },
  });
});

async function getRandomImage() {
  const skip = Math.floor(Math.random() * 200);
  const dep = Math.floor(Math.random() * 3);

  const departments = [
    "American Painting and Sculpture",
    "European Painting and Sculpture",
    "Modern European Painting and Sculpture",
  ];

  const { data } = await fetch(
    `https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&has_image=1&limit=1&cc0=1&department=${departments[dep]}&skip=${skip}`
  ).then((r) => r.json());

  return data[0].images.web.url;
}

const squareAndAddKernel = (inputShape: any[]) => ({
  variableNames: ["X"],
  outputShape: inputShape.slice(),
  userCode: `
    void main() {
        ivec3 coords = getOutputCoords();
        int x = coords[0];
        int y = coords[1];
        int z = coords[2];

        float r = getX(x, y, 0) / 255.0;
        float g = getX(x, y, 1) / 255.0;
        float b = getX(x, y, 2) / 255.0;

        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(b, g, K.wz), vec4(g, b, K.xy), step(b, g));
        vec4 q = mix(vec4(p.xyw, r), vec4(r, p.yzx), step(p.x, r));
    
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;

        vec3 res = vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);

        float l = res.y * res.y * ${150 * window.devicePixelRatio}.0;
        float rads = (res.x - 0.41666666666) * 2.0 * ${Math.PI};

        if (z == 0) {
          setOutput(l * cos(rads) + ${150 * window.devicePixelRatio}.0);
        } else if (z == 1) {
          setOutput(l * sin(rads) + ${150 * window.devicePixelRatio}.0);
        }
      }
  `,
});

const vsSource = `
 attribute vec4 aVertexPosition;

 void main(void) {
   gl_Position = aVertexPosition;
 }
`;

const fsSource = `
  precision mediump float;

  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main(void) {
    float x = (gl_FragCoord.x / 300.0) - 0.5;
    float y = (gl_FragCoord.y / 300.0) - 0.5;
    float l = sqrt((x * x) + (y * y)) / 0.5;
    float rad = atan(y, x);

    float hue = -(rad / (2.0 * ${Math.PI})) + 0.41666666666;
    float saturation = sqrt(l);
    float lightness = (l * 0.5) + 0.5;

    vec3 rgb = hsv2rgb(vec3(hue, saturation, lightness));

    gl_FragColor = vec4(rgb[0], rgb[1], rgb[2], 1);
  }
`;

function initBuffers(gl: WebGLRenderingContext) {
  const positions = [
    [-1.0, 1.0],
    [1.0, 1.0],
    [1.0, -1.0],
    [-1.0, -1.0],
  ];

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(positions.flat()),
    gl.STATIC_DRAW
  );

  return {
    position: positionBuffer,
    size: positions.length,
  };
}

function drawScene(gl: WebGLRenderingContext, programInfo: any, buffers: any) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  gl.useProgram(programInfo.program);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, buffers.size);
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    console.log("error creating shader");
    return null;
  }

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(
      "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vertexShader) {
    console.log("unable to load");
    return null;
  }
  if (!fragmentShader) {
    console.log("unable to load");
    return null;
  }

  const shaderProgram = gl.createProgram();
  if (!shaderProgram) {
    console.log("unable to create shader program");
    return null;
  }
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }

  return shaderProgram;
}

function App() {
  const classes = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl");
    if (!gl) {
      return;
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
      console.log("error init shader program");
      return;
    }

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
      },
    };

    const buffers = initBuffers(gl);

    drawScene(gl, programInfo, buffers);
  }, []);

  const canvasRef2 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef2.current?.getContext("2d");

    const img = new Image();
    img.onload = () => {
      const px = tf.browser.fromPixels(img).asType("float32");

      const program = squareAndAddKernel([px.shape[0], px.shape[1], 2]);

      tf.ready().then(async () => {
        if (!ctx) {
          return;
        }

        const data = await tf
          .backend()
          // @ts-ignore
          .compileAndRun(program, [px])
          .asType("int32")
          .array();

        const dp = window.devicePixelRatio;
        const width = 300;
        const height = 300;

        if (canvasRef2.current) {
          canvasRef2.current.width = width * dp;
          canvasRef2.current.height = height * dp;

          canvasRef2.current.style.width = width + "px";
          canvasRef2.current.style.height = height + "px";
        }

        ctx.clearRect(0, 0, 300, 300);
        ctx.beginPath();
        ctx.arc(
          (width / 2) * dp,
          (height / 2) * dp,
          (width / 2) * dp,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fill();
        const imageData = ctx.getImageData(0, 0, width * dp, height * dp);

        for (let cols of data) {
          for (let row of cols) {
            const index = row[0] + width * dp * row[1];
            imageData.data[index * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
      });
    };

    img.crossOrigin = "Anonymous";
    img.src = url;
  }, [url]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const url = URL.createObjectURL(acceptedFiles[0]);
      setUrl(url);
      setImage(url);
    }
  }, []);

  const { getRootProps, isDragActive, open, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    accept: "image/*",
    multiple: false,
  });

  useEffect(() => {
    getRandomImage().then((url) => {
      setUrl("https://cors-anywhere.herokuapp.com/" + url);
      setImage(url);
    });
  }, []);

  return (
    <div className={classes.dropzone} {...getRootProps()}>
      <input {...getInputProps()} />
      <div className={isDragActive ? classes.dropActive : classes.drop}>
        <div className={classes.dropOutline}>
          <div className={classes.dropText}>Drop to upload your image</div>
        </div>
      </div>

      <div style={{ margin: "2rem" }}>
        <Typography variant="h1" component="h1">
          Bleep Bloop
        </Typography>
        <Typography variant="body1" component="p">
          Blop bleep bloop blop blurp beep boop! Blop blip blurp blarp? Blup
          blep bleep.
        </Typography>
        <Button variant="contained" onClick={open}>
          Upload an image
        </Button>
        <Button
          variant="contained"
          onClick={async () => {
            const url = await getRandomImage();
            setUrl("https://cors-anywhere.herokuapp.com/" + url);
            setImage(url);
          }}
        >
          Try another demo image
        </Button>
      </div>

      <div className={classes.wrapper}>
        <div style={{ margin: "2rem" }}>
          <img
            src={image}
            alt=""
            style={{
              maxWidth: "600px",
              width: "100%",
              height: "auto",
              borderRadius: "8px",
              boxShadow:
                "0 13px 27px -5px hsla(240, 30.1%, 28%, 0.25), 0 8px 16px -8px hsla(0, 0%, 0%, 0.3), 0 -6px 16px -6px hsla(0, 0%, 0%, 0.03)",
            }}
          />
        </div>
        <div
          style={{
            margin: "2rem",
            width: "310px",
            height: "310px",
            flexShrink: 0,
          }}
        >
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                borderRadius: "310px",
                height: "310px",
                width: "310px",
                background: `conic-gradient(
                hsl(60, 100%, 50%),
                hsl(120, 100%, 50%),
                hsl(180, 100%, 50%),
                hsl(240, 100%, 50%),
                hsl(300, 100%, 50%),
                hsl(360, 100%, 50%),
                hsl(60, 100%, 50%)
              )`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "5px",
                left: "5px",
                borderRadius: "300px",
                height: "300px",
                width: "300px",
                background: `white`,
              }}
            />
            <canvas
              ref={canvasRef}
              width="300"
              height="300"
              style={{
                position: "absolute",
                top: "5px",
                left: "5px",
                borderRadius: "300px",
              }}
            />
            <canvas
              ref={canvasRef2}
              width="300"
              height="300"
              style={{ position: "absolute", top: "5px", left: "5px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
