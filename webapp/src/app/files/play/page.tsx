'use client'
import { useEffect, useState } from "react";

export default function Page({ searchParams }: {
  searchParams: {
    name: string;
  }
}) {

  // todo: fix me
  const host = 'localhost:3000'
  const videoUrl: string = `https://${process.env.BUCKET_NAME}.fly.storage.tigris.dev/${searchParams.name}`
  const [narration, setNarration] = useState("");
  const [eachNar, setEachNar] = useState("");

  useEffect(() => {
    const res = fetch(`http://${host}/api/describe/`, {
      method: 'POST',
      body: JSON.stringify({
        'frame': 'myFrame'
      })
    }).then(async (response) => {
      const result = await response.text();
      setNarration(result);
    });
  }, [videoUrl])


  useEffect(() => {
    if (narration != '') {
      let incre = 0;
      const timeoutId = setInterval(() => {
        setEachNar(narration[incre]);
        incre++;
        if (incre >= narration.length) {
          clearTimeout(timeoutId)
        }
      }, 1000)
      return () => clearTimeout(timeoutId);
    }
  }, [narration])

  return (
    <body>
      <h3>Playing video from Tigris:</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src={`${videoUrl}`} type="video/mp4" />
      </video>
      <h3>Narration using GPT 4 vision:</h3>
      <h4>{eachNar}</h4>
    </body>
  )
}
