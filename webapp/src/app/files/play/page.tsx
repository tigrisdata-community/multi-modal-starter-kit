"use client";

import { fetchAndPlayTextToSpeech } from "@/app/actions";
import { url } from "inspector";
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Page({
  searchParams,
}: {
  searchParams: {
    name: string;
  };
}) {
  const videoUrl: string = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.fly.storage.tigris.dev/${searchParams.name}`;
  const [narration, setNarration] = useState<string[]>([]);
  const [showSpinner, setShowSpinner] = useState(false);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const [eventSource, setEventSource] = useState<any>(null);
  const initialized = useRef(false);

  const connectToStream = useCallback(() => {
    const eventSource = new EventSource("/api/stream");
    console.log("ready state: ", eventSource.readyState);

    eventSource.addEventListener("message", (event) => {
      (async (event) => {
        const tmp = JSON.parse(event.data);
        if (tmp.message === "END") {
          setShowSpinner(false);
          return;
        }

        setNarration((currentNarration) => [...currentNarration, tmp.message]);
        await queueAudio(tmp.message);
      })(event);
    });

    eventSource.addEventListener("error", (e: any) => {
      console.error("event error", e);
      eventSource.close();
      setTimeout(connectToStream, 1);
    });
    // As soon as SSE API source is closed, attempt to reconnect
    eventSource.addEventListener("close", () => {
      console.log("event close");
      setTimeout(connectToStream, 1);
    });
    return eventSource;
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      const es = connectToStream();
      setEventSource(es);
      initialized.current = true;
    }
    console.log("audioQueue:", audioQueue);
    console.log("isAudioPlaying: ", isAudioPlaying);
    if (!isAudioPlaying && audioQueue.length > 0) {
      console.log("playing audio...");
      const audioUrl = audioQueue[0];
      setAudioQueue(audioQueue.slice(1));
      (async (audioUrl) => {
        console.log("play");
        await pAudio(audioUrl);
      })(audioUrl);
    }
  }, [narration, eventSource, audioQueue, isAudioPlaying, connectToStream]);

  const vidRef = useRef<HTMLVideoElement>(null);
  const canRef = useRef<HTMLCanvasElement>(null);

  // Play audio from post response from 11 labs
  async function pAudio(url: string) {
    setIsAudioPlaying(true);
    const audio = new Audio(url);

    await audio
      .play()
      .catch((error) => console.error("Error playing audio:", error));

    audio.onended = () => {
      setIsAudioPlaying(false);
    };
  }

  const queueAudio = async (narration: string) => {
    if (narration.length !== 0) {
      const response = await fetchAndPlayTextToSpeech(narration);
      if (response) {
        setAudioQueue((currentQueue) => {
          const updatedQueue = [...currentQueue, response];
          return updatedQueue;
        });
      }
    }
  };

  const handlePlayVideo = () => {
    if (vidRef.current != null) {
      vidRef.current.play();
    }
  };

  async function describeVideo() {
    setShowSpinner(true);
    setNarration([]);
    await fetch(`/api/describeVideo/`, {
      method: "POST",
      body: JSON.stringify({
        url: videoUrl,
        key: searchParams.name,
      }),
    });
  }

  function calculateCaptureTimes(
    currentTime: number,
    interval: number,
    countBefore: number, // # of frames before current time
    countAfter: number // # of frames after current time
  ): number[] {
    const times = [];
    if (currentTime < interval) {
      // reset interval to be a reasonable slice if currentTime is too small
      interval = currentTime / Math.ceil(countBefore + countAfter + 1);
    }

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
      const captureTimes = calculateCaptureTimes(currentTime, 5, 5, 0);
      console.log("captureTimes", captureTimes);
      let dataURLs: string[] = [];
      for (const time of captureTimes) {
        vidRef.current.currentTime = time;
        await new Promise((resolve) => setTimeout(resolve, 300));
        context.drawImage(vidRef.current, 0, 0, 640, 400);
        const dataURL = canRef.current.toDataURL("image/jpeg", 1);
        dataURLs.push(dataURL);
      }

      setShowSpinner(true);
      fetch(`/api/describe/`, {
        method: "POST",
        body: JSON.stringify({
          frames: dataURLs,
        }),
      }).then(async (response) => {
        setShowSpinner(false);
        vidRef.current!.play();
        const restext = await response.text();
        const newNarration = [...narration, restext];
        setNarration(newNarration);
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
        <p>
          {narration.map((r, idx) => {
            return (
              <React.Fragment key={idx}>
                {r} <br />
                <br />
              </React.Fragment>
            );
          })}
        </p>

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
