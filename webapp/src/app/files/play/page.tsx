export default async function Page({searchParams}: {searchParams: {
  name: string;
}}) {
  const videoUrl: string = `https://${process.env.BUCKET_NAME}.fly.storage.tigris.dev/${searchParams.name}`
  return (
    <body>
      <h3>Playing video from Tigris:</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src={`${videoUrl}`} type="video/mp4" />
      </video>

      <h3>Random file from internet with Content-Type video/mp4</h3>
      <video id="vid1" width="640" height="480" controls preload="auto" data-setup="{}">
        <source src="https://file-examples.com/storage/fe7b7e0dc465e22bc9e6da8/2017/04/file_example_MP4_640_3MG.mp4" type="video/mp4" />
      </video>
    </body>
  )
}
