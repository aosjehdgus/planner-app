import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import ReactMarkdown from "react-markdown";

export default function NoteList() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotes(data);
    });
    return () => unsub();
  }, []);

  const removeNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
  };

  return (
    <div className="p-4">
      {notes.map((note: any) => (
        <div key={note.id} className="mb-4 p-2 border rounded bg-white">
          <ReactMarkdown>{note.content}</ReactMarkdown>
          <button
            onClick={() => removeNote(note.id)}
            className="text-red-500 mt-1 text-sm"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}
