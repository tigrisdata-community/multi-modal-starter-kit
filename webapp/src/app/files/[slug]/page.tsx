export default async function Page({ params }: { params: { slug: string } }) {
  return (
    <body>
      <h3>Now playing video: {params.slug}</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src="https://tigris-mm-starter-kit-test.fly.storage.tigris.dev/city_lights_sample.mp4" type="video/mp4" />
      </video>
    </body>
  )
}
