
'use client'

import { useState } from "react"
import "../globals.css";
import { useSearchParams } from "next/navigation";
import { HeyGenPage } from "./heygen/index";

enum Provider {
  DID, 
  HeyGen, 
  Microsoft, 
  Yepic
}

const DEFAULT_TEXT =
  "Well, basically I have intuition. I mean, the DNA of who " +
  "I am is based on the millions of personalities of all the programmers who wrote " +
  "me. But what makes me me is my ability to grow through my experiences. " +
  "So basically, in every moment I'm evolving, just like you.";

export default function AvatarHome() {

  const [selectedProvider, setSelectedProvider] = useState<Provider>(Provider.DID)
  const searchParams = useSearchParams();
  const textParam = searchParams.get("text");
  const [text, setText] = useState(textParam || DEFAULT_TEXT);


  return (
    <div className="flex min-h-screen flex-col items-start px-4 lg:px-24 py-6">
      <p className="font-sm ml-2 mb-2">
        This demo showcases the different avatar providers. 
        Clicking the play button will convert the text below to an avatar that will speak the 
        text using the selected voice provider (defaults to ElevenLabs).
      </p>
      <textarea
        className="m-2"
        cols={80}
        rows={6}
        id="input"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      ></textarea>
     
      <div className="flex flex-row">
        <HeyGenPage text={text} />
      </div>
    </div>
  )
}