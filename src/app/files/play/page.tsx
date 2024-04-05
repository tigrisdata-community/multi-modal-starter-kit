"use client";

import {
  InferencePlatform,
  fetchAndPlayTextToSpeech,
  getInferencePlatform,
  listModels,
} from "@/app/actions";
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
  const [inferencePlatform, setInferencePlatform] =
    useState<InferencePlatform>("Ollama");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement>();
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>();

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
        await queueAudio(tmp.message.split("COLLAGE_URL:")[0]);
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
    switch (inferencePlatform) {
      case "Ollama":
        const fetchOllamaList = async () => {
          const models = await listModels();

          const modelList = models.models
            .filter(
              (m) => m.details.families && m.details.families.includes("clip")
            )
            .map((model) => model.name);

          setModels(modelList);
        };

        fetchOllamaList();
        const intervaId = setInterval(fetchOllamaList, 5000);
        return () => clearInterval(intervaId);
      case "fal":
        const falModels = ["moondream"];
        setModels(falModels);
        setSelectedModel(falModels[0]);
      case "OpenAI": // TODO
      case "replicate": // TODO
    }
  }, [inferencePlatform]);

  useEffect(() => {
    if (currentAudio) {
      window.addEventListener("keydown", (event) => {
        if (event.code == "KeyV") {
          if (currentAudio && currentAudio.paused) {
            console.log("Playing voice");
            currentAudio.play();
          } else {
            console.log("Muting voice");
            currentAudio.pause();
          }
        }
      });
    }
  }, [currentAudio]);

  useEffect(() => {
    (async () => {
      await getInferencePlatform();
      setInferencePlatform(await getInferencePlatform());
    })();
  });

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
    let audio = new Audio(url);
    setCurrentAudio(audio);

    await audio
      .play()
      .catch((error) => console.error("Error playing audio:", error));

    audio.onended = () => {
      setIsAudioPlaying(false);
    };
  }

  const queueAudio = async (narration: string) => {
    if (narration.length !== 0) {
      const response = await fetchAndPlayTextToSpeech(
        narration,
        searchParams.name || "Unknown"
      );
      if (response) {
        setAudioQueue((currentQueue: any) => {
          const updatedQueue = [...currentQueue, response];
          return updatedQueue;
        });
      }
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
        modelName: selectedModel,
        inferencePlatform: inferencePlatform,
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
      setShowSpinner(true);
      vidRef.current.pause();
      const context = canRef.current.getContext("2d")!;
      const currentTime = vidRef.current.currentTime;
      const captureTimes = calculateCaptureTimes(currentTime, 10, 5, 0);
      console.log("captureTimes", captureTimes);
      let dataURLs: string[] = [];
      for (const time of captureTimes) {
        vidRef.current.currentTime = time;
        await new Promise((resolve) => {
          vidRef.current!.addEventListener("seeked", function onSeeked() {
            context.drawImage(vidRef.current!, 0, 0, 640, 400);
            const dataURL = canRef.current!.toDataURL("image/jpeg", 1);
            dataURLs.push(dataURL);
            vidRef.current!.removeEventListener("seeked", onSeeked);
            resolve("done");
          });
        });
      }

      fetch(`/api/describe/`, {
        method: "POST",
        body: JSON.stringify({
          frames: dataURLs,
          modelName: selectedModel,
          inferencePlatform: inferencePlatform,
        }),
      }).then(async (response) => {
        setShowSpinner(false);
        vidRef.current!.play();
        const restext = await response.text();
        setNarration([restext]);
        await queueAudio(restext.split("COLLAGE_URL:")[0]);
      });
    }
  }

  return (
    <>
      <section className="flex min-h-screen justify-center items-center w-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">
                Multi-modal Starter Kit
              </h1>
              <p className="max-w-[900px] text-white md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                AI video understanding & narration
              </p>
            </div>
            <ul className="grid gap-2 py-4 grid-cols-1 lg:grid-cols-1">
              <div
                key="1"
                className="flex flex-col items-center justify-center p-8 bg-white"
              >
                <div className="w-full max-w-2xl">
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

                  <div className="flex justify-center space-x-4 my-4">
                    <select
                      className="justify-left"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {models.map((model) => {
                        return (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        );
                      })}
                    </select>

                    <Button
                      className="bg-black text-white"
                      onClick={captureFrame}
                      disabled={showSpinner}
                    >
                      Capture
                    </Button>
                    <Button
                      className="bg-black text-white"
                      onClick={describeVideo}
                      disabled={showSpinner}
                    >
                      Describe Video
                    </Button>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mt-6 max-w-prose space-y-2 mb-10 ml-0 max-h-64">
                      <p className="text-md font-semibold text-left">
                        🎥 Video & Image Hosting:{" "}
                        <a
                          href="https://www.tigrisdata.com/"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Tigris
                        </a>
                      </p>
                      <p className="text-md font-semibold text-left">
                        🧠 Model:{" "}
                        <a
                          href={
                            inferencePlatform.startsWith("Ollama")
                              ? "https://ollama.com/library/llava"
                              : "https://openai.com/"
                          }
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {inferencePlatform}
                        </a>
                      </p>
                      <p className="text-md font-semibold text-left">
                        🎙️ Narration:{" "}
                        <a
                          href="https://elevenlabs.io/"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ElevenLabs
                        </a>
                      </p>
                    </div>

                    <div className="text-gray-600 text-left overflow-auto max-h-96">
                      {narration.map((r, idx) => {
                        const splitText = r.split("COLLAGE_URL:");
                        const content = splitText[0];
                        const collageUrl = splitText[1];

                        return (
                          <React.Fragment key={idx}>
                            <span className="flex items-center gap-2">
                              {content}{" "}
                            </span>{" "}
                            <a
                              href={collageUrl}
                              target="_blank"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              What AI sees
                            </a>
                            <br />
                            <br />
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {showSpinner && (
                      <div className="lds-ellipsis">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    )}
                  </div>

                  <canvas
                    ref={canRef}
                    width="640"
                    height="480"
                    style={{ display: "none" }}
                  ></canvas>
                </div>
              </div>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
