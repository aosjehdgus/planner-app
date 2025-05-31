import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import ReactMarkdown from "react-markdown";

export default function NoteList() {
  const [notes, setNotes] = useState<
    { id: string; content: string; created?: Date }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          content: docData.content ?? "",
          created: docData.created
            ? new Date(
                docData.created.seconds
                  ? docData.created.seconds * 1000
                  : docData.created
              )
            : undefined,
        };
      });
      setNotes(data);
    });
    return () => unsub();
  }, []);

  const removeNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
  };

  return (
    <div className="p-4">
      {notes.map((note: { id: string; content: string; created?: Date }) => (
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
