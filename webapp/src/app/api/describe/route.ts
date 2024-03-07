import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const videoUrl = (await req.json())["url"];
  const outFilePrefix = "./frame";


  // const iter = makeIterator();
  // const stream = iteratorToStream(iter);
  return Response.json({
    "data": ["one-t", "two-t", "three-t"]
  });
}

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

const encoder = new TextEncoder()

async function* makeIterator() {
  yield encoder.encode('<p>One</p>')
  await sleep(2000)
  yield encoder.encode('<p>Two</p>')
  await sleep(2000)
  yield encoder.encode('<p>Three</p>')
}

// next steps
// 1. Create a iterator stream from next js 
// example and be able to update text on the front end from it
// 2. Once text is updating look into the logic of reading 
// video frames from URL and return frame by frame response to iterator