"use client";

import { useEffect, useRef, useState } from "react";

export default function Page({
  searchParams,
}: {
  searchParams: {
    name: string;
  };
}) {
  const videoUrl: string = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.fly.storage.tigris.dev/${searchParams.name}`;
  const [narration, setNarration] = useState("");
  const [eachNar, setEachNar] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (narration != "") {
      let incre = 0;
      const timeoutId = setInterval(() => {
        setEachNar(narration);
        incre++;
        if (incre >= narration.length) {
          clearTimeout(timeoutId);
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [narration]);

  const vidRef = useRef<HTMLVideoElement>(null);
  const canRef = useRef<HTMLCanvasElement>(null);

  const handlePlayVideo = () => {
    if (vidRef.current != null) {
      vidRef.current.play();
    }
  };

  async function describeVideo() {
    setShowSpinner(true);
    await fetch(`/api/describeVideo/`, {
      method: "POST",
      body: JSON.stringify({
        url: videoUrl,
        key: searchParams.name,
      }),
    }).then(async (response) => {
      setShowSpinner(false);
      console.log(response);
      setNarration(await response.json());
    });
  }

  function calculateCaptureTimes(
    currentTime: number,
    interval: number,
    countBefore: number, // # of frames before current time
    countAfter: number // # of frames after current time
  ): number[] {
    const times = [];
    const startTime = Math.max(currentTime - countBefore * interval, 0); // start time should not be negative

    for (let i = 0; i < countBefore + countAfter + 1; i++) {
      const time = startTime + i * interval;
      if (time >= currentTime - countBefore * interval) {
        times.push(time);
      }
    }

    return times;
  }

  async function captureFrame() {
    if (canRef.current && vidRef.current) {
      vidRef.current.pause();
      const context = canRef.current.getContext("2d")!;
      const currentTime = vidRef.current.currentTime;
      const captureTimes = calculateCaptureTimes(currentTime, 10, 5, 0);
      console.log("captureTimes", captureTimes);
      for (const time of captureTimes) {
        vidRef.current.currentTime = time;
        await new Promise((resolve) => setTimeout(resolve, 100));
        context.drawImage(vidRef.current, 0, 0, 640, 400);
        const dataURL = canRef.current.toDataURL("image/jpeg", 1);
        console.log("dataurl", time, dataURL);
      }

      context.drawImage(vidRef.current, 0, 0, 640, 400);
      const dataURL = canRef.current.toDataURL("image/jpeg", 1);
      setShowSpinner(true);
      fetch(`/api/describe/`, {
        method: "POST",
        body: JSON.stringify({
          frame: dataURL,
        }),
      }).then(async (response) => {
        setShowSpinner(false);
        vidRef.current!.play();
        const result = await response.text();
        setNarration(result);
      });
    }
  }

  return (
    <>
      <div className="playerContainer">
        <h3>Playing video from Tigris:</h3>
        <p>{videoUrl}</p>

        <video
          ref={vidRef}
          crossOrigin=""
          width="640"
          height="400"
          controls
          preload="auto"
          data-setup="{}"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>

        <div>
          <button
            className="button-53"
            onClick={handlePlayVideo}
            style={{ marginRight: 20 }}
          >
            Play
          </button>
          <button style={{ marginRight: 20 }} onClick={captureFrame}>
            Capture
          </button>
          <button onClick={describeVideo}>Describe Video</button>
        </div>

        <h3>Narration using GPT 4 vision:</h3>
        <p>{eachNar}</p>

        {showSpinner && (
          <div className="lds-ellipsis">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        )}

        <canvas
          ref={canRef}
          width="640"
          height="480"
          style={{ display: "none" }}
        ></canvas>
      </div>
    </>
  );
}
