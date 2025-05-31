import { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function NoteEditor() {
  const [text, setText] = useState("");

  const saveNote = async () => {
    if (text.trim() === "") return;
    await addDoc(collection(db, "notes"), {
      content: text,
      created: new Date(),
    });
    setText("");
  };

  return (
    <div className="p-4">
      <textarea
        className="w-full h-40 p-2 border rounded"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="메모를 입력하세요..."
      />
      <button
        onClick={saveNote}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        저장
      </button>
    </div>
  );
}
