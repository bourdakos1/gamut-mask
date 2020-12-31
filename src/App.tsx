import React, { useCallback, useEffect, useRef, useState } from "react";

import { renderWheel } from "./render";
import useImage from "./useImage";

import { createStyles, makeStyles } from "@material-ui/core";
import { useDropzone } from "react-dropzone";

import "./index.css";

const useStyles = makeStyles(() =>
  createStyles({
    dropzone: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      outline: "none"
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
      opacity: 1
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
      transition: "visibility 0.2s, opacity 0.2s;"
    },
    dropOutline: {
      border: "6px #606060 dashed",
      backgroundColor: "rgba(141, 155, 165, 0.15)",
      borderRadius: 5,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    dropText: {
      fontSize: 24,
      fontWeight: 600
    }
  })
);

export default function App() {
  const classes = useStyles();
  const imageRef = useRef<HTMLCanvasElement>(null);
  const colorWheelRef = useRef<HTMLCanvasElement>(null);

  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    const skip = Math.floor(Math.random() * 200);
    const dep = Math.floor(Math.random() * 3);
    // const skip = 0;

    const departments = [
      // "African Art", // 0
      "American Painting and Sculpture", // 205
      // "Art of the Americas", // 4
      // "Chinese Art", // 546
      // "Contemporary Art", // 0
      // "Decorative Art and Design", // 0
      // "Drawings", // 0
      // "Egyptian and Ancient Near Eastern Art", // 3
      "European Painting and Sculpture", // 305
      // "Greek and Roman Art", // 1
      // "Indian and South East Asian Art", // 0
      // "Islamic Art", // 0
      // "Japanese Art", // 578
      // "Korean Art", // 50
      // "Medieval Art", // 94
      "Modern European Painting and Sculpture" // 281
      // "Oceania", // 0
      // "Performing Arts, Music, & Film", // 0
      // "Photography", // 0
      // "Prints", // 1
      // "Textiles" // 0
    ];

    fetch(
      `https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&has_image=1&limit=1&cc0=1&department=${departments[dep]}&skip=${skip}`
    )
      .then((r) => r.json())
      .then((r) => {
        console.log(r);
        setUrl(
          "https://cors-anywhere.herokuapp.com/" + r.data[0].images.web.url
        );
        setImage(r.data[0].images.web.url);
      });
  }, []);

  const { status } = useImage(imageRef, url);

  useEffect(() => {
    if (status !== "success") {
      return;
    }
    if (imageRef.current === null) {
      return;
    }
    const ctx = imageRef.current.getContext("2d");
    if (ctx === null) {
      return;
    }

    if (colorWheelRef.current === null) {
      return;
    }
    const ctx2 = colorWheelRef.current.getContext("2d");
    if (ctx2 === null) {
      return;
    }

    const dp = window.devicePixelRatio;
    const width = 300;
    const height = 300;

    colorWheelRef.current.width = width * dp;
    colorWheelRef.current.height = height * dp;

    colorWheelRef.current.style.width = width + "px";
    colorWheelRef.current.style.height = height + "px";

    ctx2.clearRect(
      0,
      0,
      colorWheelRef.current.width,
      colorWheelRef.current.height
    );

    renderWheel(ctx, ctx2);
  }, [status]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const url = URL.createObjectURL(acceptedFiles[0]);
      setUrl(url);
      setImage(url);
    }
  }, []);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    accept: "image/*",
    multiple: false
  });

  return (
    <div className={classes.dropzone} {...getRootProps()}>
      <div className={isDragActive ? classes.dropActive : classes.drop}>
        <div className={classes.dropOutline}>
          <div className={classes.dropText}>Drop to upload your image</div>
        </div>
      </div>
      <canvas ref={imageRef} style={{ opacity: 0, position: "absolute" }} />
      <div
        style={{
          // marginLeft: "auto",
          // marginRight: "auto",
          // maxWidth: "1200px",
          // height: "100%",
          paddingTop: "4rem",
          paddingBottom: "4rem",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <div style={{ marginLeft: "2rem", marginRight: "2rem" }}>
          <img
            src={image}
            alt=""
            style={{
              // maxWidth: "100%",
              width: "100%",
              height: "auto",
              // maxHeight: "80%",
              borderRadius: "8px",
              boxShadow:
                "0 13px 27px -5px hsla(240, 30.1%, 28%, 0.25), 0 8px 16px -8px hsla(0, 0%, 0%, 0.3), 0 -6px 16px -6px hsla(0, 0%, 0%, 0.03)"
            }}
          />
        </div>

        <div
          style={{
            marginLeft: "2rem",
            marginRight: "2rem",
            width: "310px",
            height: "310px",
            flexShrink: 0
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
              )`
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
                background: `white`
              }}
            />
            <canvas
              ref={colorWheelRef}
              style={{ position: "absolute", top: "5px", left: "5px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
