export default async function Page({ params }: { params: { slug: string } }) {
  return (
    <body>
      <h3>Video from Tigris: {params.slug}</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src="https://tigris-mm-starter-kit-test.fly.storage.tigris.dev/city_lights_sample.mp4" type="video/mp4" />
      </video>

      <h3>Random file from internet with Content-Type video/mp4</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src="https://file-examples.com/storage/fe7b7e0dc465e22bc9e6da8/2017/04/file_example_MP4_640_3MG.mp4" type="video/mp4" />
      </video>

      <h3>Random file from internet with Content-Type video/mp4</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src="https://tigris-mm-starter-kit-test.fly.storage.tigris.dev/earth_sphere_640.mp4" type="video/mp4" />
      </video>
    </body>
  )
}
