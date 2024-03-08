'use client'
import { useEffect, useRef, useState } from "react";
import { Context } from "vm";

export default function Page({ searchParams }: {
  searchParams: {
    name: string;
  }
}) {

  const host = 'localhost:3000'
  const videoUrl: string = `https://${process.env.BUCKET_NAME}.fly.storage.tigris.dev/${searchParams.name}`
  const [narration, setNarration] = useState("");
  const [eachNar, setEachNar] = useState("");

  useEffect(() => {
    const res = fetch(`http://${host}/api/describe/`, {
      method: 'POST',
      body: JSON.stringify({
        'url': videoUrl
      })
    }).then(async (response) => {
      const result = await response.json();
      setNarration(result.data);
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



  const vidRef = useRef(null);
  const canRef = useRef(null);
  
  const handlePlayVideo = () => {
    if(vidRef.current != null){
      vidRef.current.play();
    }
  }
  

  function captureFrame() {     

    if(canRef.current && vidRef.current){
      const context = canRef.current.getContext('2d');
      context.drawImage(vidRef.current, 0, 0, 110, 120);
      const dataURL = canRef.current.toDataURL('image/jpeg', 0.5);
      console.log(dataURL);
    }

}


  return (
    <>
      <h3>Playing video from Tigris:</h3>
    
      <video ref={vidRef} width="640" height="480" controls preload="auto" data-setup="{}">
        <source src='/city_lights_sample.mp4' type="video/mp4" />
      </video>
      <button onClick={handlePlayVideo}>
            Play
          </button>
      <button onClick={captureFrame}>
            Capture
        </button>
      <h3>Narration using GPT 4 vision:</h3>
      <h4>{eachNar}</h4>
      
      <canvas ref={canRef} width="200" height="200" style={{overflow:'auto'}}></canvas>
      </>
  )
}
