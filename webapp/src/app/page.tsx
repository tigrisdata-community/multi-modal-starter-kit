import styles from './page.module.css'
import Link from 'next/link'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>

        {/* <Link href={"/files"}> Click here to start browsing the videos</Link> */}

        {/* Testing videos on diff servers */}

       <div className='flex-box'>
        <span className='bt-space'>
          <p>https://file-examples.com/storage/fe7b7e0dc465e22bc9e6da8/2017/04/file_example_MP4_640_3MG.mp4</p>
            <video id="vid1" width="640" height="360" controls preload="auto" data-setup="{}">
            <source src='https://file-examples.com/storage/fe7b7e0dc465e22bc9e6da8/2017/04/file_example_MP4_640_3MG.mp4' type="video/mp4" />
            </video>
          </span>
          <span className='bt-space'>
            <p>https://tigris-mm-starter-kit-test.fly.storage.tigris.dev/dolby-atmos-trailer_amaze_1080.mp4</p>
            <video id="vid2" width="640" height="380" controls preload="auto" data-setup="{}">
            <source src='https://tigris-mm-starter-kit-test.fly.storage.tigris.dev/dolby-atmos-trailer_amaze_1080.mp4' type="video/mp4" />
            </video>
          </span>
          <span className='bt-space'>
            <p>https://tk-testy.s3.amazonaws.com/file_example_MP4_640_3MG.mp4</p>
            <video id="vid3" width="640" height="380" controls preload="auto" data-setup="{}">
            <source src='https://tk-testy.s3.amazonaws.com/file_example_MP4_640_3MG.mp4' type="video/mp4" />
            </video>

          </span>
          <span  className='bt-space'>
            <p>https://tk-testy.s3.amazonaws.com/dolby-atmos_trailer_amaze_1080.mp4</p>
            <video id="vid3" width="640" height="380" controls preload="auto" data-setup="{}">
            <source src='https://tk-testy.s3.amazonaws.com/dolby-atmos_trailer_amaze_1080.mp4' type="video/mp4" />
            </video>
          </span>
        </div>

      </div>
    </main>
  );
}
