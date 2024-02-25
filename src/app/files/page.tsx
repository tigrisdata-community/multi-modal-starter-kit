import { FilesResponse } from '@/app/api/files/route'
import { headers } from 'next/headers'

export default async function Page() {
  const host = headers().get("host");
  const res = await fetch(`http://${host}/api/files/`, {
    method: "GET",
    cache: 'no-store'
  });
  const files: FilesResponse = await res.json();
  console.log(files);
  return (
    <ul>
      {files.map((f, index) => (
        <li key={f.key}>{index+1}. {f.displayName}</li>
      ))}
    </ul>
  )
}
