import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { createEditor, type Descendant } from "slate";
import { Slate, Editable, withReact } from "slate-react";

import {
  Container,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

type Note = {
  id: string;
  title: string;
  content: Descendant[];
};

type ParagraphElement = { type: "paragraph"; children: Descendant[] };

const initialContent: ParagraphElement[] = [
  { type: "paragraph", children: [{ text: "" }] },
];

export default function SharedNoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");

  const editor = useMemo(() => withReact(createEditor()), []);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const notesCollectionRef = collection(db, "notes");

  // 현재 선택된 노트 찾기
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  // 저장 함수 (디바운싱)

  const scheduleSave = useCallback((noteId: string, content: Descendant[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await setDoc(
        doc(db, "notes", noteId),
        {
          content,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setIsSaving(false);
    }, 1000);
  }, []);

  const onChange = useCallback(
    (newValue: Descendant[]) => {
      if (!selectedNoteId) return;

      console.log("Saving note:", selectedNoteId, newValue);

      // 편집 중인 content를 로컬 state에도 저장 (옵션)
      setNotes((prev) =>
        prev.map((note) =>
          note.id === selectedNoteId ? { ...note, content: newValue } : note
        )
      );

      scheduleSave(selectedNoteId, newValue);
    },
    [selectedNoteId, scheduleSave]
  );

  // 새 노트 추가

  // 노트 삭제
  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  const handleOpenDialog = () => {
    setNewNoteTitle("");
    setOpenDialog(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim()) return; // 빈값 무시

    // 같은 제목 있으면 숫자 붙이기 (선택사항)
    const count = notes.filter((note) =>
      note.title.startsWith(newNoteTitle)
    ).length;
    const finalTitle =
      count > 0 ? `${newNoteTitle} ${count + 1}` : newNoteTitle;

    const newDoc = await addDoc(notesCollectionRef, {
      title: finalTitle,
      content: initialContent,
      createdAt: serverTimestamp(),
    });

    setSelectedNoteId(newDoc.id);
    setOpenDialog(false);
  };

  // Load all notes realtime
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snapshot) => {
      const newNotes: Note[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title ?? "제목 없음",
        content: doc.data().content ?? initialContent,
      }));

      setNotes(newNotes);
      if (!selectedNoteId && newNotes.length > 0) {
        setSelectedNoteId(newNotes[0].id);
      }
      setLoading(false); // 이 부분 추가하기!
    });

    return () => unsub();
  }, [selectedNoteId]);

  return (
    <>
      <Container
        gap={2}
        component={Box}
        display={"flex"}
        flexDirection="row"
        width={"100%"}
        p={3}
        height="100vh"
      >
        {/* 좌측 노트 리스트 */}
        <Box
          width="300px"
          borderRight="1px solid #ddd"
          display="flex"
          flexDirection="column"
        >
          <Box
            p={1}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">노트 목록</Typography>
            <IconButton size="small" onClick={handleOpenDialog}>
              <AddIcon />
            </IconButton>
          </Box>
          {loading ? (
            <CircularProgress />
          ) : (
            <List sx={{ flexGrow: 1, overflowY: "auto" }}>
              {notes.map(({ id, title }) => (
                <ListItem
                  key={id}
                  sx={{
                    bgcolor:
                      id === selectedNoteId
                        ? "rgba(25, 118, 210, 0.08)"
                        : "transparent",
                    "&:hover": {
                      bgcolor:
                        id === selectedNoteId
                          ? "rgba(25, 118, 210, 0.15)"
                          : "rgba(0,0,0,0.04)",
                    },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => {
                        e.stopPropagation(); // 클릭 이벤트 버블링 막기
                        deleteNote(id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemButton
                    selected={id === selectedNoteId}
                    onClick={() => setSelectedNoteId(id)}
                  >
                    <ListItemText primary={title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* 우측 선택된 노트 편집기 */}
        <Box flex={1} p={2} display="flex" flexDirection="column">
          <Typography variant="h6" mb={1}>
            {selectedNote?.title || "노트를 선택하세요"}
          </Typography>
          {selectedNote ? (
            <Slate
              key={selectedNoteId}
              editor={editor}
              initialValue={selectedNote?.content || initialContent}
              onChange={onChange}
            >
              <Editable
                placeholder="여기에 노트를 작성하세요..."
                style={{
                  flexGrow: 1,
                  minHeight: "300px",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  outline: "none",
                  border: "none",
                  background: "transparent",
                  width: "100%",
                }}
              />
            </Slate>
          ) : (
            <Typography>노트를 선택해주세요.</Typography>
          )}
          {isSaving && (
            <Box mt={1} display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                저장 중입니다...
              </Typography>
              <CircularProgress size={16} thickness={4} color="info" />
            </Box>
          )}
        </Box>
      </Container>
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>새 노트 제목 입력</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="제목"
            variant="standard"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleAddNote} disabled={!newNoteTitle.trim()}>
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
