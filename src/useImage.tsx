import React, { useEffect, useState } from "react";

type ImageStatus = "idle" | "loading" | "success" | "failed";

function useImage(ref: React.RefObject<HTMLCanvasElement>, url: string) {
  const [status, setStatus] = useState<ImageStatus>("idle");

  useEffect(() => {
    setStatus("loading");
    const img = new Image();

    img.onload = () => {
      if (ref.current === null) {
        setStatus("failed");
        return;
      }

      const maxWidth = 600;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

      ref.current.width = img.width * ratio;
      ref.current.height = img.height * ratio;

      const ctx = ref.current.getContext("2d");
      if (ctx === null) {
        setStatus("failed");
        return;
      }

      ctx.drawImage(img, 0, 0, ref.current.width, ref.current.height);

      setStatus("success");
    };

    img.onerror = () => {
      setStatus("failed");
    };

    img.crossOrigin = "Anonymous";
    img.src = url;
  }, [ref, url]);

  return { status };
}

export default useImage;
