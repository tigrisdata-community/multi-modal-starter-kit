export default async function Page() {
  const res = await fetch("http://localhost:3000/api/files/", {
    method: "GET",
    cache: 'no-store'
  });
  const fileList: Array<any> = await res.json();
  console.log(fileList);
  return (
    <ul>
      {fileList.map((f) => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  )
}
