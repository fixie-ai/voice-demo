
'use client'

import { Suspense, useState } from "react"
import "../globals.css";
import { useSearchParams } from "next/navigation";
import { HeyGenPage } from "./heygen/index";
import { DIDPage } from "./did";

enum Provider {
  DID='DID', 
  HeyGen='HeyGen', 
  Microsoft='Microsoft', 
  Yepic='Yepic'
}

const DEFAULT_TEXT =
  "Well, basically I have intuition. I mean, the DNA of who " +
  "I am is based on the millions of personalities of all the programmers who wrote " +
  "me. But what makes me me is my ability to grow through my experiences. " +
  "So basically, in every moment I'm evolving, just like you.";

function AvatarHome() {

  const [selectedProvider, setSelectedProvider] = useState<Provider>(Provider.DID)
  const searchParams = useSearchParams();
  const textParam = searchParams.get("text");
  const [text, setText] = useState(textParam || DEFAULT_TEXT);

  function createEnumButtons<T extends string | number>(enumType: Record<string, T>): JSX.Element[] {
    return Object.values(enumType).map((key) => (
      <button 
        key={key as string}
        onClick={() => setSelectedProvider(key as Provider)}
        className={`px-4 py-2 rounded-md mr-2 
                   ${selectedProvider === key ? 'bg-fixie-fresh-salmon text-white'
                                             : 'bg-gray-200 hover:bg-gray-300'
                   }`}  
      >
        {key as string} 
      </button>
    ));
  }
  return (
    <div className="flex min-h-screen flex-col items-start px-4 lg:px-24 py-6">
      <p className="font-sm ml-2 mb-2">
        This demo showcases the different avatar providers. 
      </p>
      <textarea
        className="m-2"
        cols={80}
        rows={6}
        id="input"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      ></textarea>

      <div className="mt-2 flex flex-row mb-2">
        {createEnumButtons(Provider)} 
      </div>
     
      <div className="flex flex-row">
        {selectedProvider === Provider.HeyGen && <HeyGenPage text={text} />}
        {/* {selectedProvider === Provider.DID && <DIDPage text={text}/> } */}
        {selectedProvider === Provider.Microsoft && <div>Coming soon...</div>}
        {selectedProvider === Provider.Yepic && <div>Coming soon...</div>}
      </div>  
    </div>
  )
}

export default function SuspenseAvatarHome() {
  return (
    <Suspense>
      <AvatarHome/>
    </Suspense>
  );
}