import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  orderBy,
  deleteDoc,
  onSnapshot as onSnapshotList,
} from "firebase/firestore";

const docId = "shared_note";

export default function SharedNote() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedNotes, setSavedNotes] = useState<
    { id: string; content: string; created?: Date }[]
  >([]);

  // 실시간 공유 메모 구독
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "notes", docId), (docSnap) => {
      if (docSnap.exists()) {
        setText(docSnap.data().content);
      } else {
        setText("");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 저장된 메모 리스트 구독
  useEffect(() => {
    const q = query(collection(db, "notes_list"), orderBy("created", "desc"));
    const unsub = onSnapshotList(q, (snapshot) => {
      const notes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content ?? "",
          created: data.created?.toDate ? data.created.toDate() : data.created,
        };
      });
      setSavedNotes(notes);
    });
    return () => unsub();
  }, []);

  const onChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    await setDoc(doc(db, "notes", docId), {
      content: newText,
      updatedAt: serverTimestamp(),
    });
  };

  const saveNote = async () => {
    if (text.trim() === "") return;
    await addDoc(collection(db, "notes_list"), {
      content: text,
      created: new Date(),
    });
    setText("");
    await setDoc(doc(db, "notes", docId), {
      content: "",
      updatedAt: serverTimestamp(),
    });
  };

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, "notes_list", id));
  };

  if (loading) return <div>불러오는 중...</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Input Area */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            ✍️ 메모 작성
          </label>
          <textarea
            value={text}
            onChange={onChange}
            className="w-full h-40 p-2 border rounded resize-none"
            placeholder="공동으로 작성 중인 메모"
          />
          <button
            onClick={saveNote}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            저장
          </button>
        </div>

        {/* Right: Realtime Preview */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            📝 실시간 미리보기
          </label>
          <div className="w-full h-40 p-2 border rounded bg-gray-50 overflow-y-auto whitespace-pre-wrap">
            {text || <span className="text-gray-400">내용 없음</span>}
          </div>
        </div>
      </div>

      <hr className="my-6" />

      {/* 저장된 메모 목록 */}
      <h2 className="text-lg font-bold mb-2">📚 저장된 메모들</h2>
      {savedNotes.length === 0 ? (
        <p className="text-gray-500">아직 저장된 메모가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {savedNotes.map((note) => (
            <li
              key={note.id}
              className="p-3 border rounded bg-white flex justify-between items-start"
            >
              <pre className="whitespace-pre-wrap w-full">{note.content}</pre>
              <button
                onClick={() => deleteNote(note.id)}
                className="ml-4 text-red-500 text-sm hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
