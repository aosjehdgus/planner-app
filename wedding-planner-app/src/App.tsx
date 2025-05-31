import NoteEditor from "./components/NoteEditor";
import NoteList from "./components/NoteList";

function App() {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">📝 나만의 메모장</h1>
      <NoteEditor />
      <NoteList />
    </div>
  );
}
export default App;
